// Beast Clash t8 (M4 S15, engine side; no UI): the Clash ability reviewer's scenario runner. Spec §13 and §25 ("Both ability
// reviewers"): every scenario is staged and seeded, establishes its prerequisites through the REAL engine (controlled prerequisite
// inputs are labelled; the ability's own result is never manufactured), runs the complete trigger -> activation -> resolution ->
// cleanup event stream over as many turns as the contract needs, and reports every unmet condition explicitly. Nothing here writes
// progression, saves or collections: the runner builds synthetic monsters from species data and a seed.
//
// A module's `review.scenarios` entries:
//   { id, kind, title, explain(ctx) -> string, provisional?: true (owner ruling 2026-11-09 rule 1: runs with config.provisional 'on',
//     labelled PROVISIONAL; never part of the acceptance set),
//     setup(ctx) -> { a: [spec...], b: [spec...], seed?, config?, probes?, stopAt?, seedSearch?: { until(result) -> bool, max? } },
//     expect(result, h) }            h: the check helpers below (h.check records a named pass / fail)
//   spec: { species, stage?, overall?, tier?, hp?, status?, ability?, sparring? }  (hp / status / ability are staged inputs, labelled;
//     sparring: CONTROLLED PREREQUISITE, the monster passes its normal turns so a multi-turn demonstration is not cut short; it never
//     touches the demonstrated ability's own result, and is listed in meta.controlled)
//   ctx: { abilityId, species, stage, tier, form }
// kinds: valid | blocked | miss | multiTarget | depletion | cleanup | sourceKO | rotation | interaction
import { createRng } from '../../core/rng.js';
import { generateMonster } from '../../data/monsters.js';
import { SPECIES_DEX } from '../../data/species.js';
import { abilityById, formsOf, familyById, formById, formId } from '../../data/beast-dex.js';
import { simulateClashT8, t8LogHash } from './engine.js';
import { clashContractById, registeredClashAbilities } from './registry.js';
import { kindOf } from './ability-kinds.js';

const SP = new Map(SPECIES_DEX.map((s) => [s.id, s]));
export const SCENARIO_KINDS = Object.freeze(['valid', 'blocked', 'miss', 'multiTarget', 'depletion', 'cleanup', 'sourceKO', 'rotation', 'interaction']);
export const TIERS = Object.freeze(['Developing', 'Practiced', 'Expert', 'Mastered']);

/** A synthetic monster for a scenario: species data plus a fixed seed; never a roster monster. */
export function reviewMonster({ species, stage = 0, overall = 75, tier = 0 }, seed) {
  const s = SP.get(species); if (!s) throw new Error(`Unknown species ${species}`);
  const m = generateMonster(createRng(seed), { species, position: s.position, quality: overall, type: s.element });
  m.fatigue = 0; m.stage = stage; m.name = formById(formId(species, stage))?.name || s.name; m.clashMasteryTier = tier; return m;
}
/** A manual-side decision plan: 'stay' at every legal rotation phase (1..30) except the exchanges given ({ 4: 'a1' }). */
export function decisionsPlan(plan = {}) { const d = {}; for (let e = 1; e <= 30; e++) d[e] = plan[e] ?? 'stay'; return d; }

/** Every (ability, form, tier) the reviewer must list (spec §13: "no silent missing entries"). */
export function reviewMatrix() {
  const rows = [];
  for (const id of registeredClashAbilities()) {
    const mod = clashContractById(id); const a = abilityById(id);
    for (const f of formsOf(a.familyId)) for (let tier = 0; tier < 4; tier++) rows.push({ abilityId: id, name: a.name, family: a.familyId, species: a.familyId, form: f.id, formName: f.name, stage: f.stage, tier, tierName: TIERS[tier], scenarios: (mod.review?.scenarios || []).filter((s) => applies(s, f.stage, tier)).map((s) => s.id) });
  }
  return rows;
}
const applies = (s, stage, tier) => (!s.stages || s.stages.includes(stage)) && (!s.tiers || s.tiers.includes(tier));
export function listScenarios(abilityId, stage = 0, tier = 0) { const mod = clashContractById(abilityId); if (!mod) throw new Error(`No Clash contract ${abilityId}`); return (mod.review?.scenarios || []).filter((s) => applies(s, stage, tier)); }

/**
 * Run one staged scenario on the real engine. Returns { ok, checks, result, controlled, unmet, stream, explain, meta }.
 * `stream` is the ability's own event sequence (trigger / activation / resolution / cleanup) for the reviewer's playback.
 */
export function runScenario({ abilityId, stage = 0, tier = 0, scenarioId, log = 'full', seedOffset = 0 }) {
  const mod = clashContractById(abilityId); if (!mod) throw new Error(`No Clash contract ${abilityId}`);
  const a = abilityById(abilityId); const fam = familyById(a.familyId);
  const sc = (mod.review?.scenarios || []).find((s) => s.id === scenarioId); if (!sc) throw new Error(`${abilityId} has no scenario ${scenarioId}`);
  if (!SCENARIO_KINDS.includes(sc.kind)) throw new Error(`${abilityId}/${scenarioId}: unknown scenario kind ${sc.kind}`);
  const form = formsOf(a.familyId)[Math.min(stage, formsOf(a.familyId).length - 1)];
  const ctx = { abilityId, species: a.familyId, stage: form.stage, tier, form: form.id, values: mod.values(form.id, tier), name: fam.name };
  const su = sc.setup(ctx);
  const seed0 = (su.seed ?? 1) + seedOffset;
  const build = (seed) => {
    const mk = (specs, side) => specs.map((sp, i) => reviewMonster({ species: sp.species, stage: sp.stage ?? (sp.species === a.familyId ? form.stage : 0), overall: sp.overall ?? 75, tier: sp.tier ?? (sp.species === a.familyId ? tier : 0) }, seed * 100 + (side === 'a' ? 0 : 50) + i));
    const stageIn = {};
    su.a.forEach((sp, i) => { const st = {}; if (sp.hp != null) st.hp = sp.hp; if (sp.status) st.status = sp.status; if (sp.ability) st.ability = sp.ability; if (Object.keys(st).length) stageIn[`a${i}`] = st; });
    su.b.forEach((sp, i) => { const st = {}; if (sp.hp != null) st.hp = sp.hp; if (sp.status) st.status = sp.status; if (sp.ability) st.ability = sp.ability; if (Object.keys(st).length) stageIn[`b${i}`] = st; });
    const sparring = [...su.a.map((sp, i) => (sp.sparring ? `a${i}` : null)), ...su.b.map((sp, i) => (sp.sparring ? `b${i}` : null))].filter(Boolean);
    const sparProbe = sparring.length ? [{ chooseAction: (v, id) => (sparring.includes(id) ? { kind: 'skip' } : null) }] : [];
    return { a: mk(su.a, 'a'), b: mk(su.b, 'b'), seed, config: { ruleset: 't8', policies: { a: 'none', b: 'none' }, ...(su.config || {}), ...(sc.provisional ? { provisional: 'on' } : {}) }, log, probes: [...(su.probes || []), ...sparProbe], stage: Object.keys(stageIn).length ? stageIn : null, ...(su.stopAt ? { stopAt: su.stopAt } : {}) };
  };
  // Controlled seed selection (labelled): a scenario whose demonstration needs a particular roll outcome searches forward from its seed
  // through the real engine until its stated prerequisite holds. The ability's own result is checked by `expect`, never forced.
  let result = null; let controlled = null;
  if (su.seedSearch) {
    const max = su.seedSearch.max ?? 64;
    // the search reads the full event log; the chosen seed is then replayed with the requested log mode (log off changes no draw)
    for (let i = 0; i < max; i++) { const args = { ...build(seed0 + i), log: 'full' }; const r = simulateClashT8(args); if (su.seedSearch.until(r)) { result = log === 'full' ? r : simulateClashT8(build(seed0 + i)); controlled = { kind: 'seed selection', seed: seed0 + i, tried: i + 1, why: su.seedSearch.why || 'the scenario\'s stated prerequisite' }; break; } }
    if (!result) { result = simulateClashT8(build(seed0)); controlled = { kind: 'seed selection', seed: seed0, tried: max, failed: true, why: su.seedSearch.why || 'the scenario\'s stated prerequisite' }; }
  } else result = simulateClashT8(build(seed0));
  const stagedInputs = [...su.a.map((sp, i) => ({ id: `a${i}`, ...sp })), ...su.b.map((sp, i) => ({ id: `b${i}`, ...sp }))].filter((sp) => sp.hp != null || sp.status || sp.ability || sp.sparring);
  const sparringIds = stagedInputs.filter((sp) => sp.sparring).map((sp) => sp.id);
  if (sparringIds.length) controlled = { ...(controlled || {}), sparring: sparringIds, sparringWhy: 'controlled prerequisite: these monsters pass their normal turns so the multi-turn sequence completes' };
  if (su.probes?.length) controlled = { ...(controlled || {}), probes: true, probesWhy: 'controlled prerequisite outcome supplied by a reviewer probe (named in the scenario explanation)' };
  const checks = []; const h = helpers(result, ctx, checks, abilityId);
  try { sc.expect(result, h); } catch (e) { checks.push({ check: 'expect() threw', ok: false, detail: String(e?.message || e) }); }
  const stream = result.log.filter((e) => e.abilityId === abilityId || (e.kind === 'unmet' && e.abilityId === abilityId));
  const unmetEvents = result.log.filter((e) => e.kind === 'unmet' && e.abilityId === abilityId).map((e) => ({ seq: e.seq, ex: e.ex, actor: e.actor, unmet: e.unmet, hook: e.hook }));
  const meta = { provisional: !!sc.provisional, label: sc.provisional ? 'PROVISIONAL reading (not approved; reviewer / provisional tests only)' : null, abilityId, name: a.name, family: a.familyId, form: form.id, formName: form.name, stage: form.stage, tier, tierName: TIERS[tier], scenarioId, kind: sc.kind, title: sc.title, kindRow: kindOf(abilityId), seed: result.seed, controlled, stagedInputs };
  return { ok: checks.every((c) => c.ok) && checks.length > 0, checks, result, controlled, unmet: unmetEvents, stream, explain: typeof sc.explain === 'function' ? sc.explain(ctx) : sc.explain || '', meta };
}

/** Determinism check for a scenario: the same inputs twice give the same log hash and state hash; log off gives the same state and draws. */
export function determinismCheck(args) {
  const r1 = runScenario(args).result, r2 = runScenario(args).result, r3 = runScenario({ ...args, log: 'none' }).result;
  return { same: t8LogHash(r1) === t8LogHash(r2) && r1.stateHash === r2.stateHash && r1.rngDraws === r2.rngDraws, logIndependent: r1.stateHash === r3.stateHash && r1.rngDraws === r3.rngDraws && r1.winner === r3.winner, hash: t8LogHash(r1), state: r1.stateHash };
}

function helpers(r, ctx, checks, abilityId) {
  const ev = (kind, f = () => true) => r.log.filter((e) => (kind == null || e.kind === kind) && f(e));
  const h = {
    r, ctx, values: ctx.values, abilityId,
    ev, has: (kind, f) => ev(kind, f).length > 0,
    ab: (kind, f = () => true) => ev(kind, (e) => e.abilityId === abilityId && f(e)),
    line: (id) => [...r.lines.a, ...r.lines.b].find((x) => x.id === id),
    state: (id) => h.line(id)?.ability ?? null,
    check: (name, ok, detail) => { checks.push({ check: name, ok: !!ok, ...(detail !== undefined ? { detail } : {}) }); return !!ok; },
    near: (x, y, tol = 1) => Math.abs(x - y) <= tol,
    /** The ability's stream has the given stages in order (trigger -> activation -> resolution -> cleanup where the scenario needs them). */
    stages: (...wanted) => { const st = r.log.filter((e) => e.abilityId === abilityId && e.stage).map((e) => e.stage); let i = 0; for (const s of st) if (s === wanted[i]) i++; return h.check(`event stream: ${wanted.join(' -> ')}`, i === wanted.length, st.join(',')); },
    executed: (n) => { const x = [...r.lines.a, ...r.lines.b].find((l) => l.abilityId === abilityId); return h.check(n == null ? 'a mastery execution is recorded' : `${n} mastery execution(s) recorded`, x && (n == null ? x.executions > 0 : x.executions === n), x?.executions); },
    unmetReported: (f = () => true) => h.check('the unmet condition is reported', ev('unmet', (e) => e.abilityId === abilityId && f(e)).length > 0),
    /** Normal gameplay: the ability reported `awaiting ruling` for this point (owner ruling 2026-11-09 rule 1). */
    awaiting: (point) => h.check(`awaiting ruling (${point}) is reported`, ev('unmet', (e) => e.abilityId === abilityId && e.unmet.some((u) => u.condition === 'awaiting ruling' && u.point === point)).length > 0),
    /** Provisional mode: the labelled reading was used. */
    provisionalUsed: (point) => h.check(`PROVISIONAL reading ${point} is labelled`, ev('provisional', (e) => e.abilityId === abilityId && e.point === point).length > 0),
  };
  return h;
}
