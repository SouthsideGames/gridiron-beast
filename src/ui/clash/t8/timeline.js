// Beast Clash t8 presentation (Task 8 fx pass, docs/task8/FX_CLASH_MATRIX.md): the timeline. Pure functions over the t8 engine's
// event stream (src/clash/t8/engine.js result.log: seq / ex / phase / turnIndex / stage tags, actor and target snapshots). Nothing
// here touches the DOM, the engine or any randomness; every value shown is a field the log already carries, so the arena can never
// show something that did not happen (visuals never read into the engine).
//
//   t8StateAt(result, i)  -> the arena state after event i: HP, the shared status slot (id, remaining, pool), knocked out, active,
//                            lineup order (a revive re-orders), turn order, running cooldowns, restriction, frozen countdown
//   t8CuesFor(result)     -> one cue per event: tier, duration, the arena move, camera, and the cue's start time `at` (seconds at 1x)
//
// Tiers (owner's pacing rule): tick = tiny and quick; routine = quick and clear; power = windup, lunge, impact; major = the strongest
// presentation, reserved for the moments that deserve it (a battle-ending strike, a knockout that empties a side, a revive).
import { DURATION } from '../choreographer.js';

export { DURATION };
export const STATUS_NAME = Object.freeze({ stunned: 'Stunned', slowed: 'Slowed', stumbled: 'Stumbled', knockedDown: 'Knocked Down', afflicted: 'Afflicted', weakened: 'Weakened', confused: 'Confused', healingReduced: 'Healing Reduced', shielded: 'Shielded', empowered: 'Empowered', quickened: 'Quickened', guarded: 'Guarded' });
export const HARMFUL = new Set(['stunned', 'slowed', 'stumbled', 'knockedDown', 'afflicted', 'weakened', 'confused', 'healingReduced']);

/** Events that are bookkeeping only (no visible beat of their own): they take a tick so the caption can be read while stepping. */
const SILENT = new Set(['start', 'execution', 'round_start', 'exchange_end', 'rotation_phase', 'turn_start', 'turn_cancelled', 'rotation_decision', 'rotation_prompt', 'entry_penalty', 'stage', 'diagnostic', 'clock_start', 'clock_end', 'status_tick', 'status_hold', 'rotation_queued', 'rotation_unavailable', 'team_action', 'confused_roll', 'roll', 'ability_progress', 'trigger', 'unmet', 'cleanup', 'provisional', 'sudden_death', 'initiative', 'status_carry', 'hits_cancelled', 'cancelled', 'launch_cancelled']);

/** The arena state after event index i, from the log alone. */
export function t8StateAt(result, i) {
  const S = {}; const order = { a: result.lines.a.map((x) => x.id), b: result.lines.b.map((x) => x.id) };
  for (const side of ['a', 'b']) result.lines[side].forEach((x, slot) => { S[x.id] = { id: x.id, side, slot, hp: x.maxHp, maxHp: x.maxHp, status: null, ko: false, active: slot === 0, name: x.name, species: x.species, type: x.type, archetype: x.archetype, stage: x.combatant?.stage || 0, monsterId: x.monsterId, abilityId: x.abilityId || null, restricted: null, frozen: 0, clocks: {} }; });
  let ex = 0, ramp = 1, turnOrder = null, pending = []; const turnsThisEx = new Set();
  const last = Math.min(i, result.log.length - 1);
  const put = (id, s) => { if (!id || !s || !S[id]) return; const t = S[id]; t.hp = s.hp; t.status = s.status ? { id: s.status.id, remaining: s.status.remaining, pool: s.status.pool ?? null } : null; };
  for (let k = 0; k <= last; k++) {
    const e = result.log[k]; if (e.ex != null) ex = e.ex; if (e.ramp) ramp = e.ramp;
    put(e.actor, e.actorState); put(e.target, e.targetState);
    if (e.active) for (const side of ['a', 'b']) for (const id of order[side]) S[id].active = e.active[side] === id;
    switch (e.kind) {
      case 'ko': if (e.target && S[e.target]) { S[e.target].ko = true; S[e.target].active = false; S[e.target].status = null; S[e.target].restricted = null; S[e.target].frozen = 0; S[e.target].clocks = {}; } break;
      case 'revive': if (e.target && S[e.target]) { S[e.target].ko = false; S[e.target].hp = e.hp; if (e.lineup) order[e.target[0]] = [...e.lineup]; } break;
      case 'round_start': turnOrder = null; turnsThisEx.clear(); break;
      case 'initiative': turnOrder = e.order ? [...e.order] : null; break;
      case 'turn_start': if (e.actor) { turnsThisEx.add(e.actor); if (S[e.actor] && S[e.actor].frozen > 0 && S[e.actor].frozenFrom !== e.seq) S[e.actor].frozen -= 1; } break;
      case 'rotation_phase': for (const id of turnsThisEx) { const c = S[id]; if (!c) continue; for (const key of Object.keys(c.clocks)) { const ck = c.clocks[key]; if (ck.skipFirst) ck.skipFirst = false; else ck.left -= 1; if (ck.left <= 0) delete c.clocks[key]; } } turnsThisEx.clear(); break;
      case 'clock_start': if (e.actor && S[e.actor]) S[e.actor].clocks[e.clock] = { id: e.clock, kind: e.clockKind, left: e.left, max: e.left, skipFirst: !!e.excluded, source: e.abilityId || null }; break;
      case 'clock_adjust': if (e.target && S[e.target]?.clocks[e.clock]) { S[e.target].clocks[e.clock].left = e.after; S[e.target].clocks[e.clock].max = Math.max(S[e.target].clocks[e.clock].max, e.after); if (e.after <= 0) delete S[e.target].clocks[e.clock]; } break;
      case 'clock_end': if (e.actor && S[e.actor]) delete S[e.actor].clocks[e.clock]; break;
      case 'signature_restricted': if (e.target && e.actor !== e.target && S[e.target]) S[e.target].restricted = { by: e.actor, abilityId: e.abilityId, left: e.turns }; break;
      case 'signature_restriction_end': if (e.target && S[e.target]) S[e.target].restricted = null; break;
      case 'status_freeze': if (e.target && S[e.target]) { S[e.target].frozen = e.freeze || 2; S[e.target].frozenFrom = e.seq; } break;
      case 'status_end': if (e.target && S[e.target]) { S[e.target].frozen = 0; } break;
      case 'delayed_launch': pending = [...pending, { id: e.delayedId, abilityId: e.abilityId, owner: e.actor, target: e.target, side: e.target ? e.target[0] : null, impactEx: e.impactEx, seq: e.seq }]; break;
      case 'delayed_impact': pending = pending.filter((d) => d.id !== e.delayedId); break;
      case 'end': case 'cap': pending = []; break;
      default: break;
    }
  }
  const active = { a: order.a.find((id) => S[id].active && !S[id].ko) || null, b: order.b.find((id) => S[id].active && !S[id].ko) || null };
  const front = { a: active.a || order.a.find((id) => !S[id].ko) || null, b: active.b || order.b.find((id) => !S[id].ko) || null };
  return { S, order, active, front, ramp, ex, i: last, turnOrder, pending, provisional: !!result.provisional };
}

/** Camera helper. */
const cam = (focus, zoom = 1, shake = 0, dim = false) => ({ focus: focus.filter(Boolean), zoom, shake, dim });

/** One cue per log event, with its start time `at` (seconds at 1x) and `end`. */
export function t8CuesFor(result) {
  const log = result.log; const out = []; let at = 0;
  const byId = {}; for (const side of ['a', 'b']) for (const x of result.lines[side]) byId[x.id] = x;
  const typeOf = (id) => (id && byId[id] ? byId[id].type : null);
  const endsBattle = (k) => log.slice(k + 1, k + 6).some((x) => x.kind === 'end');
  for (let k = 0; k < log.length; k++) {
    const e = log[k];
    let tier = 'routine', move = null, camera = null, number = null, label = null, delivery = null; const ability = e.abilityId || null;
    switch (e.kind) {
      case 'damage': {
        const extra = e.tag !== 'ordinary'; tier = extra || (e.mult && e.mult !== 1) ? 'power' : 'routine';
        move = e.tag === 'reaction' || e.tag === 'counter' || e.tag === 'followUp' || e.tag === 'delayed' ? 'burst' : 'lunge';
        if (e.redirected) move = 'self-hit';
        delivery = ability ? 'ability' : 'melee';
        number = { kind: 'damage', value: e.damage, absorbed: e.shield?.poolLoss || 0, bypassed: !!e.shield?.bypassed, broken: !!e.shield?.broken, capped: !!e.capped, prevented: e.prevented || 0 };
        camera = tier === 'routine' ? cam([e.actor, e.target]) : cam([e.actor, e.target], 1.08, 4);
        const next = log[k + 1]; if (next && next.kind === 'ko' && endsBattle(k)) { tier = 'major'; camera = cam([e.actor, e.target], 1.14, 8, true); }
        break;
      }
      case 'afflicted': tier = 'tick'; move = 'dot-tick'; number = { kind: 'damage', value: e.damage }; camera = cam([e.target]); break;
      case 'heal': tier = 'routine'; move = 'mend'; number = { kind: 'heal', value: e.amount || 0 }; camera = cam([e.target]); break;
      case 'hp_set': tier = 'routine'; move = 'hp-set'; number = { kind: e.delta >= 0 ? 'heal' : 'damage', value: Math.abs(e.delta || 0) }; camera = cam([e.target]); break;
      case 'hp_cost': tier = 'tick'; move = 'hp-cost'; number = { kind: 'cost', value: e.amount || 0 }; camera = cam([e.actor]); break;
      case 'status': tier = HARMFUL.has(e.status) && e.status === 'stunned' ? 'power' : 'routine'; move = 'afflict'; label = STATUS_NAME[e.status] || e.status; camera = cam([e.target], e.status === 'stunned' ? 1.06 : 1); break;
      case 'status_end': tier = 'routine'; move = 'clear'; label = e.reason === 'expired' ? `${STATUS_NAME[e.status] || e.status} ends` : e.reason === 'broken' ? 'shield broken' : e.reason === 'cleansed' ? 'cleansed' : e.reason === 'end of a standalone battle' ? null : e.reason; camera = cam([e.target]); if (e.reason === 'broken') move = 'shatter'; break;
      case 'status_blocked': case 'cleanse_refused': tier = 'tick'; move = 'resist'; label = e.kind === 'status_blocked' ? 'no effect' : 'nothing to cleanse'; camera = cam([e.target]); break;
      case 'status_freeze': tier = 'routine'; move = 'freeze'; label = 'countdown frozen'; camera = cam([e.target]); break;
      case 'miss': tier = 'routine'; move = 'dodge'; label = 'miss'; camera = cam([e.actor, e.target]); break;
      case 'intercepted': tier = 'power'; move = 'intercept'; label = 'intercepted'; camera = cam([e.actor, e.target], 1.06, 3); break;
      case 'redirect': tier = 'power'; move = 'cover'; label = 'covers'; camera = cam([e.actor, e.target], 1.06); break;
      case 'survive': tier = 'power'; move = 'survive'; label = 'holds on at 1 HP'; camera = cam([e.actor], 1.08, 3); break;
      case 'raw_split': tier = 'routine'; move = 'split'; label = `shares ${e.sourceShare}`; camera = cam([e.actor, e.target]); break;
      case 'skip': tier = 'power'; move = 'skip'; label = e.cause === 'stunned' ? 'Stunned!' : 'passes'; camera = cam([e.actor], e.cause === 'stunned' ? 1.06 : 1); if (e.cause !== 'stunned') tier = 'tick'; break;
      case 'stun_safeguard': tier = 'routine'; move = 'shake-off'; label = 'shakes it off'; camera = cam([e.actor]); break;
      case 'rotation': tier = e.forced ? 'power' : 'routine'; move = e.forced ? 'yank' : 'walk'; camera = cam([e.out, e.in]); break;
      case 'rotation_delayed': tier = 'routine'; move = 'held'; label = 'rotation delayed'; camera = cam([e.actor]); break;
      case 'rotation_refused': case 'rotation_cancelled': tier = 'tick'; move = 'resist'; label = 'no rotation'; break;
      case 'enter': tier = e.ex === 0 ? 'tick' : 'routine'; move = 'enter'; camera = cam([e.actor]); break;
      case 'depart': tier = 'tick'; move = 'walk-back'; break;
      case 'ko': { const side = e.target ? e.target[0] : 'a'; const st = t8StateAt(result, k); const left = st.order[side].filter((id) => !st.S[id].ko).length; tier = left <= 0 ? 'major' : 'power'; move = 'ko'; camera = cam([e.target], left <= 0 ? 1.14 : 1.08, left <= 0 ? 6 : 3, left <= 0); break; }
      case 'revive': tier = 'major'; move = 'revive'; camera = cam([e.target], 1.06); break;
      case 'ability': tier = 'power'; move = 'ability'; camera = cam([e.actor, e.target], 1.04); if (e.stage === 'resolution') tier = 'routine'; break;
      case 'delayed_launch': tier = 'power'; move = 'launch'; camera = cam([e.actor], 1.04); break;
      case 'delayed_impact': tier = 'major'; move = 'impact'; camera = cam([e.target], 1.1, 6, true); break;
      case 'signature_restricted': tier = e.actor === e.target || !e.target ? 'tick' : 'routine'; move = 'restrict'; label = 'restricted'; camera = cam([e.target]); break;
      case 'signature_restriction_end': tier = 'tick'; move = 'clear'; label = 'signature restored'; camera = cam([e.target]); break;
      case 'clock_adjust': tier = 'routine'; move = 'clock'; label = `${e.before} → ${e.after}`; camera = cam([e.target]); break;
      case 'sudden_death': tier = 'tick'; move = null; break;
      case 'cap': tier = 'major'; move = e.coin ? 'coin' : 'cap'; label = e.coin ? 'Coin flip' : 'Exchange cap'; camera = cam([]); break;
      case 'end': tier = 'major'; move = 'victory'; label = e.text; camera = cam([]); break;
      case 'initiative': tier = 'tick'; move = 'order'; break;
      case 'team_action': tier = 'tick'; move = null; break;
      default: tier = 'tick'; move = SILENT.has(e.kind) ? null : 'note';
    }
    const duration = DURATION[tier];
    out.push({ i: k, ex: e.ex, kind: e.kind, tier, duration, at, end: at + duration / 1000, move, number, label, camera, actor: e.actor, target: e.target, text: e.text, event: e, element: typeOf(e.actor) || typeOf(e.target), delivery, ability, stage: e.stage || null });
    at += duration / 1000;
  }
  return out;
}

/** Index of the first event of the next exchange (or the last event). */
export function t8NextExchangeIndex(result, i) { const ex = result.log[Math.min(i, result.log.length - 1)].ex; let k = i; while (k < result.log.length - 1 && result.log[k].ex === ex) k++; return k; }
/** The cue playing at time t (seconds, 1x). */
export function t8CueAt(cues, t) { let lo = 0; for (let k = 0; k < cues.length; k++) { if (cues[k].at <= t + 1e-9) lo = k; else break; } return cues[lo] || null; }
