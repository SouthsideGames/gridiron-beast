// Beast Clash t8 (M4 S15, UI bridge, engine side): the four-phase checklist of a reviewer scenario (spec §25 "Both ability reviewers":
// trigger met -> ability activated -> effect resolved -> cleanup), evaluated from the engine's own events and nothing else. Each phase
// names the event (its `seq`, which is also its log index) that evidences it, so the reviewer ticks it when playback reaches that
// event. A scenario whose own checks fail, or whose phases lack evidence, is reported as a failure with the unmet condition or the
// error, never as a silent ordinary battle. Blocked scenarios (kind 'blocked') have their own four phases: the trigger is evaluated,
// the activation is refused or never happens, the battle continues as ordinary play, and the use or state is preserved.
// Pure: no DOM, no randomness, no writes.
import { runScenario, listScenarios } from './review.js';
import { abilityById, familyById } from '../../data/beast-dex.js';

export const PHASE_LABELS = Object.freeze({ trigger: 'Trigger met', activation: 'Ability activated', resolution: 'Effect resolved', cleanup: 'Cleanup' });
export const BLOCKED_LABELS = Object.freeze({ trigger: 'Trigger evaluated', activation: 'Blocked / not activated (as expected)', resolution: 'Battle continues as ordinary play', cleanup: 'Use or state preserved' });
const EFFECT_KINDS = new Set(['damage', 'heal', 'status', 'status_end', 'status_blocked', 'rotation', 'revive', 'hp_set', 'hp_cost', 'redirect', 'survive', 'intercepted', 'miss', 'status_freeze', 'signature_restricted', 'clock_adjust', 'team_action', 'delayed_launch', 'delayed_impact', 'raw_split', 'rotation_delayed', 'rotation_queued', 'afflicted', 'shield']);
const BLOCK_KINDS = new Set(['unmet', 'status_blocked', 'cleanse_refused', 'launch_cancelled', 'rotation_refused', 'rotation_unavailable', 'cancelled', 'hits_cancelled']);
const CLEANUP_KINDS = new Set(['cleanup', 'cancelled', 'status_end', 'clock_end', 'signature_restriction_end', 'hits_cancelled', 'rotation_cancelled']);

const evText = (e) => (e ? `#${e.seq} ex ${e.ex}: ${e.text}` : null);

/** The owner of the demonstrated ability in this run: the combatant whose contract it is (the first in lineup order). */
function ownerOf(result, abilityId) {
  return [...result.lines.a, ...result.lines.b].find((x) => x.abilityId === abilityId) || null;
}

/**
 * Evaluate the four phases over a scenario run (the object runScenario returns). Returns
 * { done, list: [{ id, label, ok, seq, evidence }], failure: { condition, detail } | null, blocked }.
 */
export function evaluateClashPhases(run, { kind } = {}) {
  const { result, meta } = run; const abilityId = meta.abilityId; const log = result.log;
  const mine = (e) => e.abilityId === abilityId;
  // A scenario in which the ability (by design) never acts is read with the blocked phase set, whatever its kind: "the ability did not
  // activate, as this scenario expects" is then the demonstrated behaviour, and the scenario's own checks say why.
  const blocked = (kind || meta.kind) === 'blocked' || !log.some(mine);
  const owner = ownerOf(result, abilityId); const ownerId = owner?.id ?? null;
  const first = (pred, from = 0) => { for (let i = Math.max(0, from); i < log.length; i++) if (pred(log[i], i)) return log[i]; return null; };
  const endEv = log.length ? log[log.length - 1] : null;
  const list = []; const labels = blocked ? BLOCKED_LABELS : PHASE_LABELS;
  const push = (id, e, why) => { list.push({ id, label: labels[id], ok: !!e, seq: e ? e.seq : null, evidence: e ? `${why ? why + ' · ' : ''}${evText(e)}` : null }); return e; };
  let t, a, r, c;
  if (!blocked) {
    t = first((e) => mine(e) && e.stage === 'trigger') || first((e) => e.kind === 'stage') || (() => { const m0 = first(mine); if (!m0) return null; let k = m0.seq; while (k > 0 && !(log[k].kind === 'turn_start' && log[k].actor === ownerId)) k--; return log[k].kind === 'turn_start' && log[k].actor === ownerId && m0.seq - k < 40 ? log[k] : m0; })();
    push('trigger', t, t && t.kind === 'turn_start' ? 'the owner\'s turn with the condition met' : t && t.kind === 'stage' ? 'staged prerequisite' : null);
    const from = t ? t.seq : 0;
    a = first((e) => mine(e) && e.kind === 'execution', from) || first((e) => mine(e) && e.stage === 'activation', from) || first((e) => mine(e) && (e.kind === 'ability' || e.kind === 'trigger'), from) || first((e) => mine(e) && e.kind !== 'unmet', from) || t;
    push('activation', a, a && a.kind === 'execution' ? 'execution recorded' : null);
    const afrom = a ? a.seq : from;
    r = first((e) => mine(e) && e.stage === 'resolution', afrom) || first((e) => mine(e) && EFFECT_KINDS.has(e.kind), afrom) || first((e) => mine(e) && e.kind === 'cleanup', afrom) || (a ? first((e) => e.hit != null && e.hit === a.hit && EFFECT_KINDS.has(e.kind), afrom) : null) || (a && ownerId ? first((e) => e.actor === ownerId && (e.kind === 'damage' || e.kind === 'heal' || e.kind === 'skip'), afrom) : null) || a;
    push('resolution', r, r === a ? 'the activation is its own resolution (state change)' : null);
    const rfrom = r ? r.seq : afrom;
    c = first((e) => mine(e) && (e.stage === 'cleanup' || CLEANUP_KINDS.has(e.kind)), rfrom) || (endEv && (endEv.kind === 'end' || result.pending) ? endEv : null);
    push('cleanup', c, c && c.kind === 'end' ? 'the battle ended: a standalone battle clears every status and lasting effect (D12)' : c && c.kind !== 'end' && !mine(c) ? 'the run stopped at its boundary' : null);
  } else {
    t = first((e) => mine(e) && e.stage === 'trigger') || first((e) => BLOCK_KINDS.has(e.kind) && (mine(e) || e.actor === ownerId || e.target === ownerId)) || first((e) => e.kind === 'stage') || first(mine) || (ownerId ? first((e) => e.kind === 'turn_start' && e.actor === ownerId) : null) || log[0];
    push('trigger', t, t && t.kind === 'turn_start' ? 'the owner\'s turn: the condition is checked' : t && t.kind === 'stage' ? 'staged condition' : null);
    const from = t ? t.seq : 0;
    const executed = first((e) => mine(e) && e.kind === 'execution');
    a = first((e) => BLOCK_KINDS.has(e.kind) && (mine(e) || e.actor === ownerId || e.target === ownerId), from)
      || (!executed && ownerId ? first((e) => e.actor === ownerId && (e.kind === 'damage' || e.kind === 'skip' || e.kind === 'turn_cancelled'), from) || first((e) => e.actor === ownerId && e.kind === 'turn_start', from) : null)
      || (executed && executed.seq >= from ? first((e) => mine(e) && e.stage === 'resolution', executed.seq) || executed : null) || endEv;
    push('activation', a, a && !BLOCK_KINDS.has(a.kind) ? (executed ? 'the activation happened but its blocked part is in the checks below' : 'no execution recorded: the ordinary action instead') : a ? 'refused with its reason' : null);
    const afrom = a ? a.seq : from;
    r = first((e) => (e.kind === 'damage' || e.kind === 'heal' || e.kind === 'skip' || e.kind === 'turn_cancelled') && (e.actor === ownerId || e.target === ownerId), afrom) || first((e) => e.kind === 'damage', afrom) || first((e) => e.kind === 'exchange_end', afrom) || endEv;
    push('resolution', r, r && r.kind === 'exchange_end' ? 'the exchange ends normally' : null);
    c = endEv && (endEv.kind === 'end' || result.pending) ? endEv : first((e) => mine(e) && CLEANUP_KINDS.has(e.kind), r ? r.seq : from) || endEv;
    push('cleanup', c, c && c.kind === 'end' ? `battle end; owner state ${owner?.ability ? JSON.stringify(owner.ability).slice(0, 80) : 'n/a'}` : null);
  }
  const missing = list.filter((p) => !p.ok);
  const badChecks = run.checks.filter((x) => !x.ok);
  let failure = null;
  if (badChecks.length) failure = { condition: `Scenario check failed: ${badChecks.map((x) => x.check).join('; ')}`, detail: badChecks.map((x) => (x.detail != null ? `${x.check}: ${typeof x.detail === 'string' ? x.detail : JSON.stringify(x.detail)}` : x.check)).join(' · '), unmet: run.unmet };
  else if (!run.checks.length) failure = { condition: 'The scenario made no checks', detail: 'expect() recorded nothing' };
  else if (missing.length) failure = { condition: `Not evidenced in the engine's events: ${missing.map((p) => p.label).join(', ')}`, detail: run.unmet.length ? `unmet reports: ${run.unmet.map((u) => u.unmet.map((x) => x.condition).join('/')).join('; ')}` : 'no unmet report either', unmet: run.unmet };
  return { done: !failure, list, failure, blocked };
}

/** The reviewer's explanation block, written before playback (§25 "Before playback, the reviewer explains the expected result and identifies the source and the affected targets"). */
export function explainClashRun(run) {
  const { result, meta } = run; const a = abilityById(meta.abilityId); const fam = familyById(a.familyId);
  const owner = ownerOf(result, meta.abilityId);
  const mine = result.log.filter((e) => e.abilityId === meta.abilityId);
  const targets = [...new Set(mine.map((e) => e.target).filter((id) => id && id !== owner?.id))].map((id) => { const x = [...result.lines.a, ...result.lines.b].find((l) => l.id === id); return x ? `${x.name} (${id})` : id; });
  const staging = (meta.stagedInputs || []).map((s) => `${s.id}${s.species ? ` ${s.species}` : ''}: ${[s.hp != null ? `HP ${s.hp}` : null, s.status ? `status ${s.status.id}${s.status.strength != null ? ` ${s.status.strength}` : ''}${s.status.duration != null ? ` for ${s.status.duration}` : ''}` : null, s.ability ? `ability state ${JSON.stringify(s.ability)}` : null, s.sparring ? 'sparring partner (passes its turns)' : null].filter(Boolean).join(', ')}`);
  const controlled = [];
  if (meta.controlled?.kind === 'seed selection') controlled.push(`${meta.controlled.failed ? 'Seed search did not find' : 'Seed selected for'} ${meta.controlled.why} (seed ${meta.controlled.seed}, ${meta.controlled.tried} tried)`);
  if (meta.controlled?.sparring) controlled.push(meta.controlled.sparringWhy);
  if (meta.controlled?.probes) controlled.push(meta.controlled.probesWhy);
  return {
    source: owner ? { id: owner.id, name: owner.name, side: owner.id[0], species: owner.species, form: owner.form, tier: owner.tier, archetype: owner.archetype, type: owner.type } : null,
    family: fam?.name || a.familyId, abilityName: a.name, kindRow: meta.kindRow || null,
    targets: targets.length ? targets.join(', ') : (mine.length ? 'the source itself / its side' : 'none recorded'),
    expected: run.explain || meta.title || '', title: meta.title, kind: meta.kind, staging, controlled,
    provisional: meta.provisional ? meta.label : null, seed: meta.seed, engine: result.engine,
    values: a.values ?? null, contract: a.mechanic || a.details || null,
  };
}

/** Run a scenario and evaluate it in one call (the reviewer's "▶ Scenario"). Never throws: an implementation error becomes the failure. */
export function reviewClashScenario(args) {
  try {
    const run = runScenario(args); const phases = evaluateClashPhases(run);
    return { ok: phases.done, run, phases: phases.list, failure: phases.failure, blocked: phases.blocked, explain: explainClashRun(run), error: null };
  } catch (err) {
    return { ok: false, run: null, phases: Object.keys(PHASE_LABELS).map((id) => ({ id, label: PHASE_LABELS[id], ok: false, seq: null, evidence: null })), failure: { condition: 'Implementation error', detail: String(err?.message || err) }, blocked: false, explain: null, error: { message: String(err?.message || err), stack: err?.stack || '' } };
  }
}

/** The variant list for one ability row: scenario kinds grouped as the reviewer shows them (main valid first, then blocked / failure / interaction). */
export function clashVariants(abilityId, stage, tier) {
  const scs = listScenarios(abilityId, stage, tier);
  const group = (s) => (s.kind === 'valid' ? 'main' : s.kind === 'blocked' || s.kind === 'miss' ? 'blocked' : s.kind === 'sourceKO' || s.kind === 'depletion' || s.kind === 'cleanup' ? 'failure' : 'interaction');
  return scs.map((s) => ({ id: s.id, kind: s.kind, group: group(s), label: `${s.kind}: ${s.title || s.id}${s.provisional ? ' [PROVISIONAL]' : ''}`, provisional: !!s.provisional, title: s.title || s.id })).sort((x, y) => (x.group === 'main' ? -1 : y.group === 'main' ? 1 : 0));
}
