// Beast Clash presentation: the choreographer. Pure functions that turn the engine's battle record into
// what the arena shows. Nothing here touches the DOM, the engine or any randomness: every cue is built
// only from fields the log event already carries, so the arena can never show something that did not happen.
//
//   stateAt(result, i)   -> the arena state after event i (HP, shield, condition, knocked out, lineup order)
//   cuesFor(result)      -> one cue per event: who moves, how long, which tier, where the camera looks
//
// Tiers (owner's pacing rule): tick = tiny and quick; routine = quick and clear; power = windup, lunge,
// impact; major = the strongest presentation, reserved for the moments that deserve it.

export const SPEEDS = Object.freeze([1, 2, 4]);
/** Durations at 1x, in ms. Speed divides them; Skip plays none. */
export const DURATION = Object.freeze({ tick: 260, routine: 560, power: 950, major: 1500 });

/** How a named move of each element reaches its target (Phase 3). Basic strikes are always melee. */
export const DELIVERY = Object.freeze({ Fire: 'projectile', Water: 'projectile', Nature: 'projectile', Electric: 'arc', Earth: 'lob', Ice: 'projectile', Wind: 'projectile', Dark: 'projectile', Light: 'beam', Metal: 'melee', Psychic: 'wave', Dragon: 'melee' });

const ROUTINE_KINDS = new Set(['damage', 'heal', 'shield', 'shield_break', 'miss', 'swap_refused', 'condition', 'enter', 'bench', 'buff', 'debuff']);
const TICK_KINDS = new Set(['tick', 'bench_miss', 'bench_blocked', 'note', 'initiative', 'start', 'stalemate']);

/** The arena state after event index i, from the log alone. */
export function stateAt(result, i) {
  const S = { a: {}, b: {} };
  let order = { a: result.lines.a.map((x) => x.id), b: result.lines.b.map((x) => x.id) }; let ramp = 1, healMult = 1;
  for (const side of ['a', 'b']) for (const x of result.lines[side]) S[side][x.id] = { id: x.id, hp: x.maxHp, maxHp: x.maxHp, shield: 0, cond: null, paused: null, ko: false, name: x.name, species: x.species, archetype: x.archetype, type: x.type, combatant: x.combatant };
  const last = Math.min(i, result.log.length - 1);
  for (let k = 0; k <= last; k++) {
    const e = result.log[k]; if (e.order) order = e.order; if (e.ramp) ramp = e.ramp; if (e.healMult != null) healMult = e.healMult;
    const put = (id, s) => { if (!id || !s) return; const t = S[id[0]][id]; Object.assign(t, { hp: s.hp, shield: s.shield, cond: s.cond, paused: s.paused }); };
    // A monster leaves the field on its 'ko' event, not on the hit that emptied its HP: the knockout cue plays in between.
    put(e.actor, e.actorState); put(e.target, e.targetState);
    if (e.kind === 'ko' && e.target) S[e.target[0]][e.target].ko = true;
  }
  const front = { a: order.a.find((id) => !S.a[id].ko) || null, b: order.b.find((id) => !S.b[id].ko) || null };
  return { S, order, front, ramp, healMult, ex: result.log[last]?.ex ?? 0, i: last };
}

/** Is this damage event a once-per-battle or line-wide move? (the strongest tier) */
function isMajorMove(e, result) {
  if (!e.actor) return false;
  const side = e.actor[0]; const c = result.lines[side].find((x) => x.id === e.actor)?.combatant; if (!c) return false;
  const t = c.move.trigger.kind; const named = e.text.includes(c.move.name);
  return named && (t === 'once' || !!c.move.wholeLine || !!c.move.unanswered || !!c.move.blink);
}
const standingAfter = (result, k, side) => { const st = stateAt(result, k); return st.order[side].filter((id) => !st.S[side][id].ko).length; };

/** One cue per log event. */
export function cuesFor(result) {
  const log = result.log; const out = [];
  const byId = {}; for (const side of ['a', 'b']) for (const x of result.lines[side]) byId[x.id] = x;
  const elementOf = (id) => (id && byId[id] ? byId[id].type : null);
  for (let k = 0; k < log.length; k++) {
    const e = log[k];
    let tier = 'routine', move = null, camera = null, number = null, label = null, delivery = null, named = false;
    const sideOf = (id) => (id ? id[0] : null);
    switch (e.kind) {
      case 'damage': {
        const arrival = /arrival hit/.test(e.text), splash = /splashes/.test(e.text), ret = /erupts|thorns/.test(e.text);
        const triggered = (e.mult && e.mult !== 1) || arrival;
        tier = triggered ? 'power' : 'routine';
        if (isMajorMove(e, result)) tier = 'major';
        move = splash || ret ? 'burst' : triggered ? 'lunge-heavy' : 'lunge';
        const mv = e.actor && byId[e.actor]?.combatant?.move; named = !!(mv && e.text.includes(mv.name));
        delivery = ret ? 'retaliate' : splash ? 'splash' : named ? (DELIVERY[elementOf(e.actor)] || 'melee') : 'melee';
        number = { kind: 'damage', value: e.damage, absorbed: e.absorbed || 0 };
        camera = tier === 'routine' ? { focus: [e.actor, e.target], zoom: 1 } : tier === 'power' ? { focus: [e.actor, e.target], zoom: 1.08, shake: 4 } : { focus: [e.actor, e.target], zoom: 1.14, shake: 7, dim: true };
        // Flag the strike that ends the battle: the strongest presentation.
        const next = log[k + 1]; if (next && next.kind === 'ko' && log.slice(k + 1, k + 4).some((x) => x.kind === 'end')) { tier = 'major'; camera = { focus: [e.actor, e.target], zoom: 1.14, shake: 8, dim: true }; }
        break;
      }
      case 'heal': tier = 'routine'; move = 'mend'; number = { kind: 'heal', value: e.amount || 0 }; camera = { focus: [e.target], zoom: 1 }; break;
      case 'shield': tier = 'routine'; move = 'shield'; number = { kind: 'shield', value: e.amount || 0 }; camera = { focus: [e.target], zoom: 1 }; break;
      case 'shield_break': tier = 'routine'; move = 'shatter'; camera = { focus: [e.target], zoom: 1 }; break;
      case 'miss': tier = 'routine'; move = 'dodge'; label = 'miss'; camera = { focus: [e.actor, e.target], zoom: 1 }; break;
      case 'condition': {
        const landed = e.result === 'applied' || e.result === 'replaced';
        tier = landed ? (e.condition === 'shock' ? 'power' : 'routine') : 'tick';
        move = landed ? 'afflict' : e.result === 'expired' || e.result === 'cleared' ? 'clear' : 'resist';
        label = landed ? e.condition : e.result === 'missed' ? 'resisted' : e.result === 'expired' ? `${e.condition} ends` : e.result === 'cleared' ? 'cleared' : e.result === 'resisted_immune' ? 'immune' : e.result === 'resisted_same' ? 'no effect' : 'no effect';
        camera = { focus: [e.target], zoom: landed && e.condition === 'shock' ? 1.06 : 1 };
        break;
      }
      case 'tick': tier = 'tick'; move = 'burn-tick'; number = { kind: 'damage', value: e.damage, absorbed: 0 }; camera = { focus: [e.target], zoom: 1 }; break;
      case 'skip': tier = 'power'; move = 'skip'; label = /shocked/.test(e.text) ? 'Shocked!' : 'cannot act'; camera = { focus: [e.actor], zoom: 1.06 }; break;
      case 'swap': tier = e.forced ? 'power' : 'routine'; move = e.forced ? 'yank' : 'walk'; camera = { focus: [e.out, e.in], zoom: 1 }; break;
      case 'enter': tier = e.ex === 0 ? 'tick' : 'routine'; move = 'enter'; camera = { focus: [e.actor], zoom: 1 }; break;
      case 'bench': tier = 'tick'; move = 'walk-back'; break;
      case 'ko': {
        const side = sideOf(e.target); const left = standingAfter(result, k, side);
        tier = left <= 1 ? 'major' : 'power'; move = 'ko'; camera = { focus: [e.target], zoom: left <= 1 ? 1.14 : 1.08, shake: left <= 1 ? 6 : 3, dim: left <= 1 };
        break;
      }
      case 'sudden_death': tier = /begins/.test(e.text) ? 'major' : 'tick'; move = /begins/.test(e.text) ? 'sudden-death' : null; label = /begins/.test(e.text) ? 'Sudden death!' : null; camera = { focus: [], zoom: 1 }; break;
      case 'stalemate': tier = 'tick'; move = 'dim'; break;
      case 'cap': tier = 'major'; move = e.coin ? 'coin' : 'cap'; label = e.coin ? 'Coin flip' : 'Exchange cap'; camera = { focus: [], zoom: 1 }; break;
      case 'end': tier = 'major'; move = 'victory'; label = e.text; camera = { focus: [], zoom: 1 }; break;
      case 'initiative': tier = 'tick'; move = e.coin ? 'coin-small' : null; break;
      case 'buff': case 'debuff': tier = 'routine'; move = e.kind; camera = { focus: [e.target || e.actor], zoom: 1 }; break;
      case 'bench_miss': case 'bench_blocked': case 'note': case 'start': tier = 'tick'; move = e.kind === 'bench_miss' ? 'resist' : null; break;
      case 'swap_refused': tier = 'routine'; move = 'refused'; label = 'held'; break;
      default: tier = TICK_KINDS.has(e.kind) ? 'tick' : ROUTINE_KINDS.has(e.kind) ? 'routine' : 'tick';
    }
    out.push({ i: k, ex: e.ex, kind: e.kind, tier, duration: DURATION[tier], move, number, label, camera, actor: e.actor, target: e.target, text: e.text, event: e, element: elementOf(e.actor) || elementOf(e.target), delivery, named });
  }
  return out;
}

/** Index of the first event of the next exchange (or the last event). */
export function nextExchangeIndex(result, i) { const ex = result.log[Math.min(i, result.log.length - 1)].ex; let k = i; while (k < result.log.length - 1 && result.log[k].ex === ex) k++; return k; }
/** Total 1x play time of a whole battle, for the owner's pacing review. */
export function totalDuration(cues) { return cues.reduce((s, c) => s + c.duration, 0); }
