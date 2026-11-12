// Beast Clash presentation, Task 8 M4 S12: the t8 engine's battle record as the arena reads it. The arena and the choreographer were
// written for the frozen legacy engine's event kinds (damage, heal, shield, condition, ko, swap, enter, end ...) and its per-event
// state snapshots ({ hp, shield, cond, paused }). This module is a pure translation of a t8 result into that shape, one arena event
// per t8 event at the SAME index (so an arena cursor, a step by event and the engine's `boundary.lastSeq` all name the same moment),
// with the original t8 event kept on each arena event as `t8`. Nothing here decides anything: every field comes from the engine's
// log, and the translation is deterministic.
//
// THE LOOKS HOOK (for the `task8-fx-clash` branch, src/ui/fx/clash*): the arena plays functional cues from these translated events.
// A looks module plugs in through `createArena(root, result, { looks })`: `looks(cue, api)` is called before every cue with the
// arena's cue (`cue.event.t8` is the untranslated t8 event with its full payload: abilityId, stage, tag, raw, shield, slot, unmet ...)
// and a small drawing api { chest(id), feet(id), fx, stage, speed(), reduced(), floatText, banner, anim, rig, body, applyState(st) }.
// It returns a Promise to take the cue over (the arena then skips its own default presentation for that event), or a falsy value
// to let the default cue play. The hook never changes the record, the cursor or the engine.
import { abilityById, abilitiesOf } from '../../data/beast-dex.js';
import { t as $t } from '../../text/index.js';

const STATUS_NAME = Object.freeze({ stunned: $t('clash.stunned'), slowed: $t('clash.slowed'), stumbled: $t('clash.stumbled'), knockedDown: $t('clash.knocked_down'), afflicted: $t('clash.afflicted'), weakened: $t('clash.weakened'), confused: $t('clash.confused'), healingReduced: $t('clash.healing_reduced'), shielded: $t('clash.shielded'), empowered: $t('clash.empowered'), quickened: $t('clash.quickened'), guarded: $t('clash.guarded') });
/** Shared-status glyphs (functional cues only; the badge pass is M6). */
export const T8_STATUS_ICON = Object.freeze({ stunned: '💫', slowed: '🐢', afflicted: '☠️', weakened: '🔻', confused: '❓', healingReduced: '🩹', shielded: '🛡', empowered: '🔺', quickened: '💨', guarded: '🧱', stumbled: '〰️', knockedDown: '⬇️' });
export const T8_STATUS_COLOR = Object.freeze({ stunned: '#e9a3ff', slowed: '#8ac6ff', afflicted: '#a3e635', weakened: '#f87171', confused: '#f0abfc', healingReduced: '#fb923c', shielded: '#93c5fd', empowered: '#fbbf24', quickened: '#5eead4', guarded: '#d6d3d1', stumbled: '#fde68a', knockedDown: '#fca5a5' });

export const isT8Result = (r) => !!r && r.ruleset === 't8' && Array.isArray(r.log);

/** The legacy-shaped per-event state the choreographer's stateAt reads, from a t8 snapshot ({ hp, active, status: { id, remaining, pool } }). */
function snapState(s) {
  if (!s) return null;
  const st = s.status || null; const shield = st?.id === 'shielded' ? st.pool ?? 0 : 0;
  const cond = st && st.id !== 'shielded' ? st.id : null;
  return { hp: s.hp, shield, cond: s.active ? cond : null, paused: !s.active ? cond : null, status: st ? { ...st } : null, active: !!s.active, turns: s.turns };
}

/**
 * Translate a t8 result into an arena record. The record keeps `lines` (each combatant gains a `move` description so the inspect
 * line and the named-move tiers work), `experiments: []`, `exchanges`, `seed`, `winner`, `by`, and `log` with one arena event per
 * t8 event. `rec.t8` is the untranslated result.
 */
export function toArenaRecord(result) {
  if (!isT8Result(result)) return result;
  const lines = { a: result.lines.a.map((x) => lineOut(x)), b: result.lines.b.map((x) => lineOut(x)) };
  const lineIds = { a: lines.a.map((x) => x.id), b: lines.b.map((x) => x.id) };
  const byId = Object.fromEntries([...lines.a, ...lines.b].map((x) => [x.id, x]));
  const log = []; let sdBegun = false; let lastOrder = null;
  for (const e of result.log) {
    const ev = translate(e, byId, lines);
    // Order: the active fighter first, then the rest in lineup order (the arena's front slot is order[0]); emitted when it changes.
    if (e.active) { const order = { a: orderOf(lineIds.a, e.active.a), b: orderOf(lineIds.b, e.active.b) }; const key = `${order.a.join()}|${order.b.join()}`; if (key !== lastOrder) { lastOrder = key; ev.order = order; } }
    if (ev.kind === 'sudden_death') { if (!sdBegun) { sdBegun = true; ev.text = `${$t('clash.sudden_death_begins_damage_x', { ramp: (e.ramp || 1).toFixed(2) })}`; } }
    ev.actorState = snapState(e.actorState); ev.targetState = snapState(e.targetState);
    log.push(ev);
  }
  return { ruleset: 't8', t8: result, engine: result.engine, winner: result.winner, by: result.by, exchanges: result.exchanges, seed: result.seed, pending: !!result.pending, boundary: result.boundary || null, experiments: [], lines, log, hpShare: result.hpShare, config: result.config, context: result.context };
}

function orderOf(ids, activeId) { return activeId && ids.includes(activeId) ? [activeId, ...ids.filter((id) => id !== activeId)] : ids.slice(); }

function lineOut(x) {
  const ab = x.abilityId ? abilityById(x.abilityId) : null; const fam = abilitiesOf(x.species);
  const move = ab ? { name: ab.name, text: ab.mechanic || ab.details || '', trigger: { kind: 'contract' } } : { name: $t('clash.strike'), text: `${$t('clash.ordinary_attack_with_the_perks', { archetype: x.archetype, basic: x.basic ? ' (Basic)' : '', fam: fam?.clash ? '' : '' })}`, trigger: { kind: 'normal' } };
  return { ...x, combatant: { ...x.combatant, move } };
}

const note = (e, extra = {}) => ({ kind: 'note', ...extra, text: e.text });
/** One arena event for one t8 event. Kinds the choreographer knows: damage heal shield shield_break miss condition tick skip swap enter bench ko sudden_death cap end initiative buff debuff note. */
function translate(e, byId) {
  const base = { ex: e.ex, seq: e.seq, phase: e.phase, turnIndex: e.turnIndex, hit: e.hit ?? null, t8: e, actor: e.actor ?? null, target: e.target ?? null, abilityId: e.abilityId ?? null, stage: e.stage ?? null };
  const A = (o) => ({ ...base, ...o, text: o.text ?? e.text });
  switch (e.kind) {
    case 'damage': return A({ kind: 'damage', damage: e.damage, absorbed: e.shield?.poolLoss || 0, mult: e.mult ?? (e.abilityId ? 1.001 : 1), tag: e.tag });
    case 'afflicted': return A({ kind: 'tick', damage: e.damage });
    case 'hp_cost': return A({ kind: 'tick', damage: Math.abs(e.amount ?? ((e.hpBefore ?? 0) - (e.hpAfter ?? 0))), target: e.target ?? e.actor });
    case 'heal': return A({ kind: 'heal', amount: e.amount ?? 0 });
    case 'hp_set': return A({ kind: 'buff', target: e.target ?? e.actor });
    case 'miss': return A({ kind: 'miss' });
    case 'status': case 'status_carry': {
      if (e.status === 'shielded') return A({ kind: 'shield', amount: e.slot?.poolLeft ?? e.slot?.pool ?? 0, target: e.target });
      return A({ kind: 'condition', condition: e.status, result: 'applied', target: e.target });
    }
    case 'status_end': {
      if (e.status === 'shielded' && e.reason === 'broken') return A({ kind: 'shield_break' });
      if (e.status === 'shielded') return A({ kind: 'condition', condition: 'shielded', result: e.reason === 'expired' ? 'expired' : 'cleared' });
      return A({ kind: 'condition', condition: e.status, result: e.reason === 'expired' ? 'expired' : 'cleared' });
    }
    case 'status_blocked': case 'cleanse_refused': return A({ kind: 'condition', condition: e.status || 'status', result: 'resisted_same', target: e.target });
    case 'status_tick': case 'status_hold': case 'status_freeze': return A({ kind: 'note' });
    case 'skip': return A({ kind: 'skip', text: e.text });
    case 'stun_safeguard': case 'entry_penalty': return A({ kind: 'note' });
    case 'rotation': return A({ kind: 'swap', forced: !!e.forced, out: e.out, in: e.in, actor: e.out, target: e.in });
    case 'enter': return A({ kind: 'enter', actor: e.actor, ex: e.ex, first: !!e.first });
    case 'depart': return A({ kind: 'bench', actor: e.actor });
    case 'ko': return A({ kind: 'ko' });
    case 'revive': return A({ kind: 'revive', actor: e.target ?? e.actor, target: e.target ?? e.actor, reviver: e.actor ?? null });
    case 'end': return A({ kind: 'end', winner: e.winner });
    case 'cap': return A({ kind: 'cap', coin: !!e.coin });
    case 'sudden_death': return A({ kind: 'sudden_death' });
    case 'initiative': return A({ kind: 'initiative', coin: e.by === 'coin' });
    case 'ability': case 'execution': case 'trigger': case 'team_action': case 'intercepted': case 'redirect': case 'survive': case 'delayed_launch': case 'delayed_impact': case 'raw_split': case 'signature_restricted': case 'signature_restriction_end': case 'ability_progress':
      return A({ kind: e.kind === 'execution' || e.kind === 'ability_progress' ? 'note' : 'buff', target: e.target ?? e.actor });
    case 'unmet': case 'cancelled': case 'cleanup': case 'hits_cancelled': case 'launch_cancelled': case 'provisional': case 'diagnostic': case 'stage':
      return A({ kind: 'note' });
    case 'rotation_prompt': return A({ kind: 'note', pending: true, options: e.options, side: e.side });
    case 'rotation_decision': case 'rotation_refused': case 'rotation_unavailable': case 'rotation_delayed': case 'rotation_queued': case 'rotation_cancelled':
      return A({ kind: e.kind === 'rotation_refused' || e.kind === 'rotation_unavailable' ? 'swap_refused' : 'note' });
    case 'turn_start': case 'turn_cancelled': case 'round_start': case 'rotation_phase': case 'exchange_end': case 'start': case 'clock_start': case 'clock_end': case 'clock_adjust': case 'roll': case 'confused_roll':
      return A({ kind: 'silent' });
    default: return A(note(e));
  }
}

/** The index of the next normal turn's start after `i` (or the last event): the reviewer's "step by turn". */
export function nextTurnIndex(rec, i) {
  const log = rec.log; for (let k = i + 1; k < log.length; k++) if ((log[k].t8 || log[k]).kind === 'turn_start') return k;
  return log.length - 1;
}
/** The index of the next exchange's first event after `i` (or the last event). */
export function nextExchangeStart(rec, i) {
  const log = rec.log; const ex = (log[Math.min(i, log.length - 1)].t8 || log[i]).ex; for (let k = i + 1; k < log.length; k++) if ((log[k].t8 || log[k]).ex > ex) return k;
  return log.length - 1;
}
export { STATUS_NAME as T8_STATUS_NAME };
