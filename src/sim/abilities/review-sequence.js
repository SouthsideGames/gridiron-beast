// Task 8 Reviewer v2 (spec §25 "Both ability reviewers"): the football ability reviewer's complete-interaction run. Pure: no DOM, no
// franchise, no save, no progression. For one ability at one form and mastery tier (and one labelled variant: the main demonstration,
// a blocked activation, a failure or an important interaction), `reviewSequence` stages the scenario (review-scenarios.js) on the real
// rules.js game and engine, plays consecutive snaps until the subject's activation, then keeps playing follow-up snaps until the
// interaction's cleanup is observed (a cooldown back to ready, a field expired, a status cleared, an absence served and returned).
// Every play is recorded for playback (frames, events, fields, the subject's game-scope state, statuses and absences) and the four
// phases (trigger met -> ability activated -> effect resolved -> cleanup) are evaluated from those engine records only
// (review-phases.js). Nothing is scripted: the effect and its result are whatever the real contract code and engine produced.
//
// Controlled outcomes (spec §25: "may use controlled outcomes where needed to establish a rare prerequisite"): only through the
// engine's review-only symbol options (engine.js), set by a scenario's `options`, labelled in the result (`controls`), and never the
// ability's own result. A controlled demonstration does not establish activation frequency (the result says so).
//
// The run is deterministic: fixed seeds and calls; the first seed (in a fixed order) that reaches the activation is the one shown,
// and the result names how many earlier seeds were tried. If the activation never happens, or a phase is missing, the result
// carries the unmet condition (`failure`) with the readiness the engine reported at each snap; an exception is reported as an
// implementation error (`error`), never as a silent ordinary play.
import { FAMILIES, abilityById } from '../../data/beast-dex.js';
import { contractOf } from './registry.js';
import { SCENARIOS } from './review-scenarios.js';
import { stageScenario, REVIEW_ID } from './review.js';
import { phaseSpec, evaluatePhases, variantsOf, CONTROL_LABELS } from './review-phases.js';

export const MAX_FOLLOW_UPS = 14;
const ownFields = (t8) => ({
  list: (t8.fields?.list || []).map((f) => ({ id: f.id, type: f.type, ability: f.ability, owner: f.owner, remaining: f.remaining, own: f.owner === REVIEW_ID, yard: [...f.yard], lat: [...f.lat], holes: f.holes?.length || 0 })),
  pending: (t8.fields?.pending || []).filter((p) => p.owner === REVIEW_ID).map((p) => ({ type: p.type, ability: p.ability, lifetime: p.lifetime })),
});
const statuses = (t8, abilityId) => Object.entries(t8.status || {}).filter(([, s]) => s && (s.abilityId === abilityId || s.sourceId === REVIEW_ID)).map(([mid, s]) => ({ mid, id: s.id, remaining: s.remaining, restOfPlay: !!s.restOfPlay, strength: s.strength }));
const absences = (t8, abilityId) => (t8.absences || []).filter((a) => a.ability === abilityId).map((a) => ({ ...a }));
const nameOf = (teams, mid) => { for (const t of [teams.home, teams.away]) for (const u of ['offense', 'defense']) for (const [slot, p] of Object.entries(t[u] || {})) if (p?.id === mid) return { name: p.name, slot, team: t === teams.home ? 'home' : 'away', unit: u }; return null; };

/** The labelled variants of a family: main first, then its blocked / failure / interaction scenarios. */
export function sequenceVariants(family) { return [{ id: 'main', kind: 'main', label: 'Main demonstration' }, ...variantsOf(family).map((v) => ({ id: v.id, kind: v.kind, label: v.label }))]; }

/**
 * One complete-interaction run: `{ family, form, mastery, variant = 'main', override? }`. Returns { ok, family, abilityId, name, form, mastery,
 * variant, kind, label, controlled, controls, staging, explain: { source, targets, expect }, seed, seedsTried, plays: [record], activation,
 * phases: [{ id, label, ok, play, t, evidence }], failure, error, frequencyNote }.
 */
export function reviewSequence({ family, form = null, mastery = 0, variant = 'main', maxFollowUps = MAX_FOLLOW_UPS, override = null } = {}) {
  const fam = FAMILIES.find((f) => f.id === family); const abilityId = fam?.abilities?.football;
  const base = { ok: false, family, abilityId, form: form || `${family}:0`, mastery, variant, plays: [], phases: [], failure: null, error: null };
  if (!abilityId) return { ...base, failure: { condition: 'no football ability' } };
  const contract = contractOf(family); if (!contract) return { ...base, failure: { condition: 'no registered contract (legacy behaviour is not reviewed here)' } };
  const sc0 = SCENARIOS[family]; if (!sc0) return { ...base, failure: { condition: 'no scenario for this family' } };
  const v = variant === 'main' ? null : variantsOf(family).find((x) => x.id === variant);
  if (variant !== 'main' && !v) return { ...base, failure: { condition: `no variant ${variant}` } };
  const sc = { ...sc0, ...(v?.scenario || {}), ...(override || {}) }; const spec = phaseSpec(family, v); form ||= `${family}:0`; // override: diagnostics and tests only (e.g. fewer snaps)
  const ab = abilityById(abilityId) || {};
  const out = { ...base, form, name: ab.name || abilityId, kind: v?.kind || 'main', label: v?.label || 'Main demonstration', how: sc.how || '', staging: [], controls: [], controlled: false,
    explain: { source: null, targets: spec.targets, expect: typeof spec.expect === 'function' ? spec.expect(form, mastery) : spec.expect, trigger: spec.trigger, resolve: spec.resolve, cleanup: spec.cleanup } };
  const nSeeds = sc.seeds ?? 12; const nSnaps = sc.snaps ?? 12;
  try {
    // The first of the fixed seeds whose run shows every phase is the demonstration; the seeds tried before it are listed with what
    // they showed. Without a complete run, the first run that activated (else the first run) is shown with its unmet condition.
    let first = null; let firstAct = null; const tried = [];
    for (let g = 0; g < nSeeds; g++) {
      const seed = (typeof sc.seed0 === 'function' ? sc.seed0(form, mastery) : sc.seed0 ?? 1) + g; const run = playSeed({ sc, fam, contract, form, mastery, seed, spec, nSnaps, maxFollowUps, abilityId });
      if (!run) return { ...out, failure: { condition: `no slot for position ${fam.position}` } };
      first ||= run; if (run.act >= 0) firstAct ||= { run, g };
      if (run.done) return finish(out, run, g, sc, spec, form, mastery, tried);
      tried.push(`seed ${seed}: ${run.act < 0 ? 'no activation' : `activated on play ${run.act + 1}; ${run.phases.failure?.condition || 'incomplete'}`}`);
    }
    return firstAct ? finish(out, firstAct.run, firstAct.g, sc, spec, form, mastery, tried) : finish(out, first, 0, sc, spec, form, mastery, tried);
  } catch (err) {
    return { ...out, error: { message: String(err?.message || err), stack: String(err?.stack || '').split('\n').slice(0, 6).join('\n') }, failure: { condition: 'implementation error', detail: String(err?.message || err) } };
  }
}

function playSeed({ sc, fam, contract, form, mastery, seed, spec, nSnaps, maxFollowUps, abilityId }) {
  const G = stageScenario({ sc, fam, contract, form, mastery, seed }); if (!G.at) return null;
  const { state, teams, at } = G; const plays = []; let act = -1; let done = false; let phases = [];
  const source = { name: G.subject.name, slot: at.slot, unit: at.side, team: 'home' };
  const follow = sc.after ? { ...sc, ...sc.after } : sc;
  for (let k = 0; !state.finished; k++) {
    if (act < 0 && k >= nSnaps) break;
    if (act >= 0 && plays.length - 1 - act >= maxFollowUps) break;
    const t8 = state.t8; const fieldsBefore = ownFields(t8); const absBefore = absences(t8, abilityId);
    const isFollow = act >= 0; G.api.followUp = isFollow ? plays.length - act - 1 : null; const mark = state.log[state.log.length - 1]; const rec = G.snap(k, isFollow ? follow : sc);
    const gameLog = state.log.slice(state.log.lastIndexOf(mark) + 1).map((x) => ({ text: x.text, kind: x.kind, ...(x.ability ? { ability: x.ability } : {}) }));
    const fieldsAfter = ownFields(t8); const absAfter = absences(t8, abilityId);
    const frame0 = rec.sim?.frames?.[0] || null;
    const served = absBefore.filter((a) => !absAfter.some((b) => b.mid === a.mid && b.serveOn === a.serveOn)).map((a) => ({ ...a, who: nameOf(teams, a.mid) }));
    const p = { n: plays.length + 1, k, followUp: isFollow, ...rec, fieldsBefore, fieldsAfter, statuses: statuses(t8, abilityId), absencesBefore: absBefore, absencesAfter: absAfter, served,
      presence: frame0 ? { off: frame0.off.map((x) => x[0]), def: frame0.def.map((x) => x[0]) } : null,
      allEvents: rec.sim?.events || [], gameLog, score: { ...state.score } };
    plays.push(p);
    if (act < 0 && p.executed) act = plays.length - 1;
    if (spec.blocked) { phases = evaluatePhases({ plays, act, spec, sc, contract, source, teams, abilityId, form, mastery }); if (phases.done) { done = true; break; } continue; }
    if (act >= 0) { phases = evaluatePhases({ plays, act, spec, sc, contract, source, teams, abilityId, form, mastery }); if (phases.done) { done = true; break; } }
  }
  if (!done) phases = evaluatePhases({ plays, act, spec, sc, contract, source, teams, abilityId, form, mastery });
  return { seed, plays, act, done, phases, source, teams };
}

function finish(out, run, seedIndex, sc, spec, form, mastery, tried = []) {
  const controls = [...new Set(run.plays.flatMap((p) => p.controls || []))].map((c) => ({ id: c, label: CONTROL_LABELS[c] || c }));
  const staging = [];
  if (sc.prime) staging.push(`Primed game-scope state: ${JSON.stringify(sc.prime(form, mastery))}`);
  if (sc.how) staging.push(sc.how);
  if (sc.after) staging.push(`Follow-up snaps: ${sc.after.note || 'staged for the unit where the effect lives'}`);
  if (seedIndex > 0) staging.push(`Fixed seed order: seed ${run.seed} is the first of the fixed seeds whose run shows the complete interaction; earlier seeds (not shown): ${tried.slice(0, seedIndex).join('; ')}`);
  const ph = run.phases;
  const plays = run.plays.map(({ teams, ...p }) => p);
  return { ...out, ok: !!ph.done, seed: run.seed, seedsTried: seedIndex + 1, plays, activation: run.act >= 0 ? run.act : null, phases: ph.list, failure: ph.done ? null : ph.failure,
    controls, controlled: controls.length > 0, staging, explain: { ...out.explain, source: run.source, actualTargets: ph.targets || [] },
    frequencyNote: 'Staged demonstration (fixed seeds, staged calls' + (controls.length ? ', controlled prerequisite' : '') + '): it does not establish ordinary activation frequency. Use Natural game for that.' };
}

/** A compact digest of a sequence for determinism checks: every play's events, the subject's state and the phases. */
export function sequenceDigest(r) {
  return JSON.stringify({ ok: r.ok, seed: r.seed, act: r.activation, phases: r.phases.map((p) => [p.id, p.ok, p.play, p.t]), plays: r.plays.map((p) => [p.kind, p.text, p.executed, p.after, p.allEvents, p.fieldsAfter, p.statuses, p.absencesAfter, p.sim ? [p.sim.result, p.sim.yards, p.sim.frames.length] : null]) });
}
