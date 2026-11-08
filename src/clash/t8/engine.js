// Beast Clash, ruleset 't8' (Task 8 M4 S1): the core model and the normal-turn clock. One pure, seeded function; the same lineups,
// seed and configuration give the same result and the same log on every device. No global random generator, no clock, no DOM,
// no storage. Nothing in the franchise or the UI uses this engine yet (S12 wires it in); the legacy rulesets stay on engine.js.
//
// What S1 contains (M4_PLAN.md §3-§4):
//   - one active fighter per side; reserves are inert (spec §1; R1 item 26; §20 "ordinary bench attacks are removed"). Only an
//     explicit reserve ability may act from reserve, and none is registered yet;
//   - the P6 exchange skeleton as corrected by B3: round start (reserve windows), initiative (interrupt tier, then priority tier,
//     then speed, then the seeded tie), each active monster's turn in initiative order, the rotation phase (a stub: no rotation
//     until S4), end of exchange (delayed impacts arrive in S5), and the end check;
//   - per-combatant normal-turn counters and the clocks they drive (clock.js): durations count the recipient's normal turns,
//     cooldowns the owner's;
//   - immediate knockout after the hit that causes it, with the replacement entering right after that hit (B3 rules 1, 2, 4, 6);
//     the replacement is the first living reserve in lineup order (PROVISIONAL, waits on D2);
//   - the no-contract action every monster uses until its contract lands (S6-S11): the ordinary attack plus archetype perks, with
//     the archetype from the Dex (R1 items 37-38);
//   - one seeded random stream whose draw order depends only on the battle, never on the log: the initiative tie coin, one damage
//     spread per ordinary attack, the double-knockout coin and the exact-tie coin at the cap.
//
// Turn (P6 step 3, B3): turn start -> (Stunned check, S2) -> choose the action -> launch -> damage -> knockout and replacement ->
// end of turn (the holder's clocks advance). Steps a later build fills in are marked with their step.
//
// `probes` (tests and the reviewer only; never part of a record): an array of plain objects with optional hooks
//   initiative(view, x) -> { interrupt?, priority? }   chooseAction(view, x) -> null | { kind: 'skip' }
//   roundStart(view)  turnStart(view, x)  endOfTurn(view, x)  rotationPhase(view)  endOfExchange(view)
// A probe sees a read-only view and may start clocks through view.addClock; it cannot draw from the random stream.
import { createRng } from '../../core/rng.js';
import { typeFactor, typeEdge } from '../types.js';
import { rampFor, rampModelFor } from '../engine.js';
import { T8_VALUES } from './values.js';
import { buildT8Combatant } from './combatant.js';
import { addClock, tickClocks, clearClocks } from './clock.js';

const V = T8_VALUES;
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };
/** Round half up (approved rounding, R1 item 18). Inputs here are never negative. */
export const roundHalfUp = (x) => Math.floor(x + 0.5);
const PROBE_HOOKS = ['initiative', 'chooseAction', 'roundStart', 'turnStart', 'endOfTurn', 'rotationPhase', 'endOfExchange'];

/** The t8 configuration: only the ruleset name exists in S1. Unknown keys and function values are refused. */
export function t8Config(config = {}) {
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === 'function') throw new Error(`Battle options cannot be functions (${k})`);
    if (k !== 'ruleset') throw new Error(`Unknown t8 battle option ${k}`);
  }
  if (config.ruleset != null && config.ruleset !== V.ruleset) throw new Error(`The t8 engine plays ruleset t8, not ${config.ruleset}`);
  return Object.freeze({ ruleset: V.ruleset });
}

/**
 * @param {object} args
 *  a, b: arrays of 1-5 monsters (never mutated)
 *  seed: integer
 *  config: { ruleset: 't8' }
 *  log: 'full' | 'none'
 *  probes: test / reviewer instrumentation (see the header)
 */
export function simulateClashT8({ a, b, seed = 1, config = {}, log: logMode = 'full', probes = [] }) {
  const cfg = t8Config(config);
  if (!a?.length || !b?.length || a.length > V.battle.maxPerSide || b.length > V.battle.maxPerSide) throw new Error('Each side needs 1-5 monsters');
  if (!Array.isArray(probes)) throw new Error('probes must be an array');
  for (const p of probes) for (const [k, v] of Object.entries(p)) if (!PROBE_HOOKS.includes(k) || typeof v !== 'function') throw new Error(`Unknown probe hook ${k}`);
  const perSide = Math.max(a.length, b.length);
  const model = rampModelFor(perSide); const sdFrom = V.suddenDeath[model].from;
  const C6 = V.stalemate;

  // ---- one seeded stream, counted (the draw count is part of the result for the B11 checkpoint in S13)
  const base = createRng(seed); let draws = 0;
  const rng = Object.freeze({ next: () => { draws += 1; return base.next(); }, chance: (p) => { draws += 1; return base.next() < p; } });

  const LOG = logMode !== 'none';
  const events = []; let ex = 0; let phase = 'opening'; let ramp = 1; let healMult = 1; let lastKO = 0; let koSeq = 0;
  const snap = (x) => (x ? { hp: x.hp, turns: x.turns, active: x.active, clocks: x.clocks.length } : null);
  const activeIds = () => ({ a: S.a.active?.c.id ?? null, b: S.b.active?.c.id ?? null });
  const log = (kind, actor, target, text, extra = {}) => { events.push({ ex, phase, kind, actor: actor?.c.id ?? null, target: target?.c.id ?? null, text, ...extra, actorState: snap(actor), targetState: snap(target), active: activeIds(), ramp }); };

  // ---- live records
  const mkSide = (key, monsters) => {
    const side = { key, line: [], active: null };
    side.line = monsters.map((m, i) => {
      const c = buildT8Combatant(m, { slot: i, side: key });
      return { c, side, slot: i, hp: c.hp, active: false, koed: false, koOrder: null, turns: 0, skips: 0, consecutiveSkips: 0, inTurn: false,
        entries: 0, entry: null, clocks: [], stats: { dealt: 0, taken: 0, kos: 0, attacks: 0 } };
    });
    return side;
  };
  const S = { a: mkSide('a', a), b: mkSide('b', b) };
  const other = (side) => (side === S.a ? S.b : S.a);
  const living = (side) => side.line.filter((x) => !x.koed);
  const byId = new Map([...S.a.line, ...S.b.line].map((x) => [x.c.id, x]));

  // ---- probes (read-only view; clocks are the one thing a probe may start)
  const view = () => Object.freeze({
    ex, phase,
    active: activeIds(),
    combatant: (id) => { const x = byId.get(id); return x ? Object.freeze({ id, hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, turns: x.turns, skips: x.skips, clocks: x.clocks.map((k) => ({ ...k })) }) : null; },
    addClock: (holderId, spec) => { const x = byId.get(holderId); if (!x || x.koed) throw new Error(`No living combatant ${holderId}`); const k = addClock(x, spec); if (LOG) log('clock_start', x, x, `${x.c.name}: ${k.kind} ${k.id} starts (${k.left} normal turn${k.left === 1 ? '' : 's'})`, { clock: k.id, clockKind: k.kind, left: k.left, excluded: k.excludeTurn === x.turns && x.inTurn }); return k.left; },
  });
  const probe = (hook, ...args) => { let out = null; for (const p of probes) if (p[hook]) { const r = p[hook](view(), ...args); if (r != null && out == null) out = r; } return out; };

  // ---- entry, knockout, replacement
  function enter(x, reason) {
    x.side.active = x; x.active = true; x.entries += 1; x.entry = { reason, ex };
    if (LOG) log('enter', x, null, `${x.c.name} ${reason === 'opening' ? 'starts as the active fighter' : 'enters'} (${x.c.archetype}, ${x.c.type})`, { reason, hp: x.hp, maxHp: x.c.maxHp, archetype: x.c.archetype, type: x.c.type, first: x.entries === 1 });
    // S4/S5: entry effects (onEntry hooks) run here.
  }
  function knockout(x, by) {
    if (x.koed) return;
    x.koed = true; x.active = false; x.hp = 0; koSeq += 1; x.koOrder = koSeq; lastKO = ex;
    if (x.side.active === x) x.side.active = null;
    if (by && by !== x) by.stats.kos += 1;
    const cleared = clearClocks(x, 'duration'); // spec §10: a KO clears the monster's status; B3 rule 2 (PROVISIONAL scope, see values.js)
    if (LOG) log('ko', by, x, `${x.c.name} is knocked out${by && by !== x ? ` by ${by.c.name}` : ''}`, { koOrder: x.koOrder, clearedClocks: cleared.map((k) => k.id) });
  }
  // B3 rule 4: the replacement enters right after the current hit finishes resolving. PROVISIONAL (D2): first living reserve in
  // lineup order. B3 rule 6: a side with no living monster loses once the hit's knockouts are settled.
  function settleHit() {
    for (const side of [S.a, S.b]) if (!side.active) { const next = living(side)[0]; if (next) enter(next, 'ko'); }
    return endCheck();
  }
  let winner = null, by = null;
  function endCheck() {
    if (winner) return true;
    const la = living(S.a).length, lb = living(S.b).length;
    if (la && lb) return false;
    by = 'knockout'; winner = la ? 'a' : lb ? 'b' : null;
    if (!winner) { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; } // a double knockout goes to the existing seeded coin
    return true;
  }

  // ---- the no-contract action: the ordinary attack plus archetype perks (R1 items 37-38)
  // 8a raw damage once: attacker power and outgoing modifiers (the sudden-death ramp; the damage spread). 8d the recipient's own
  // mitigation: type, then the Tank guard (active only; Disruptor pierce ignores it). Guarded and the shield arrive in S2/S3.
  // Rounded once, half up (PROVISIONAL, D9). The Striker shieldBreak perk has no shield to act on yet.
  function ordinaryAttack(x, t) {
    const spread = V.damage.spreadMin + rng.next() * (V.damage.spreadMax - V.damage.spreadMin);
    const raw = x.c.atk * ramp * spread;
    const type = typeFactor(x.c.type, t.c.type);
    const guard = t.active && t.c.perks.guard < 1 && !x.c.perks.pierce ? t.c.perks.guard : 1;
    const loss = roundHalfUp(raw * type * guard);
    const before = t.hp; t.hp = Math.max(0, t.hp - loss);
    x.stats.attacks += 1; x.stats.dealt += before - t.hp; t.stats.taken += before - t.hp;
    if (LOG) log('damage', x, t, `${x.c.name}'s attack: ${loss} damage${guard < 1 ? ' (Tank guard)' : ''}${type > 1 ? ' (type advantage)' : type < 1 ? ' (type disadvantage)' : ''}`,
      { tag: 'ordinary', damage: loss, raw: Math.round(raw * 100) / 100, hpBefore: before, hpAfter: t.hp, type: typeEdge(x.c.type, t.c.type), guard: guard < 1, pierce: x.c.perks.pierce && t.c.perks.guard < 1 });
    if (t.hp <= 0) knockout(t, x); // B3 rule 1: out at once
    return settleHit();
  }

  // ---- one normal turn (P6 step 3). Returns true when the battle is decided.
  function takeTurn(x) {
    x.turns += 1; x.inTurn = true; phase = 'turn';
    if (LOG) log('turn_start', x, null, `${x.c.name}'s turn ${x.turns}`, { turn: x.turns });
    probe('turnStart', x.c.id);
    // S2: the Stunned check (a skipped turn still counts as a normal turn).
    const choice = probe('chooseAction', x.c.id);
    let done = false;
    if (choice?.kind === 'skip') {
      x.skips += 1; x.consecutiveSkips += 1;
      if (LOG) log('skip', x, null, `${x.c.name}'s turn is skipped`, { turn: x.turns });
    } else {
      x.consecutiveSkips = 0;
      const foe = other(x.side).active;
      if (foe) done = ordinaryAttack(x, foe);
    }
    // End of turn (P6 step 3.14; B3 rule 5: a monster knocked out during its own turn has no end of turn).
    if (!x.koed) {
      phase = 'end_of_turn';
      for (const k of tickClocks(x)) if (LOG) log('clock_end', x, x, `${x.c.name}: ${k.kind} ${k.id} ends`, { clock: k.id, clockKind: k.kind, turn: x.turns });
      probe('endOfTurn', x.c.id);
    }
    x.inTurn = false;
    return done || endCheck();
  }

  function healMultiplier() { // values 1.1.0 C6, unchanged; nothing reads it in S1 (no heal or shield exists)
    if (ex < C6.from) return 1; const quiet = ex - lastKO;
    if (quiet >= C6.quarterAfter) return C6.quarter; if (quiet >= C6.halfAfter) return C6.half; return 1;
  }

  // ---- opening
  if (LOG) events.push({ ex: 0, phase, kind: 'start', text: `Beast Clash (t8): ${a.length} v ${b.length}. Sudden death Model ${model} from exchange ${sdFrom}.`, model, ruleset: V.ruleset });
  for (const side of [S.a, S.b]) enter(side.line[0], 'opening');

  // ---- the exchange loop (P6 "Beast Clash exchange", B3)
  while (ex < V.battle.exchangeCap && !winner) {
    ex += 1; ramp = rampFor(model, ex, sdFrom); healMult = healMultiplier();
    // 1. Round start: reserve start-of-round windows in stable ID order. Reserves are inert: only an explicit reserve ability acts
    //    here, and none is registered in S1.
    phase = 'round_start';
    if (LOG) { if (ramp > 1) log('sudden_death', null, null, `Sudden death: damage x${ramp.toFixed(2)}`, { ramp }); log('round_start', null, null, `Exchange ${ex}`, { reserves: { a: living(S.a).filter((x) => !x.active).map((x) => x.c.id), b: living(S.b).filter((x) => !x.active).map((x) => x.c.id) } }); }
    probe('roundStart');
    // 2. Initiative: explicit interrupts, then priority, then ordinary speed, then the seeded tie (approved band, see values.js).
    phase = 'initiative';
    const fa = S.a.active, fb = S.b.active;
    const tier = (x) => { const t = probe('initiative', x.c.id) || {}; return { interrupt: t.interrupt || 0, priority: t.priority || 0 }; };
    const ta = tier(fa), tb = tier(fb);
    let order, why;
    if (ta.interrupt !== tb.interrupt) { order = ta.interrupt > tb.interrupt ? [fa, fb] : [fb, fa]; why = 'interrupt'; }
    else if (ta.priority !== tb.priority) { order = ta.priority > tb.priority ? [fa, fb] : [fb, fa]; why = 'priority'; }
    else {
      const sa = fa.c.spd, sb = fb.c.spd; // S2: Slowed / Quickened change initiative speed here
      if (Math.abs(sa - sb) < V.damage.initiativeTie) { order = rng.chance(0.5) ? [fa, fb] : [fb, fa]; why = 'coin'; }
      else { order = sa > sb ? [fa, fb] : [fb, fa]; why = 'speed'; }
    }
    if (LOG) log('initiative', order[0], order[1], `${order[0].c.name} acts first (${why})`, { by: why, order: order.map((x) => x.c.id) });
    // 3. Each active monster's turn, in initiative order. A monster knocked out (or no longer active) before its turn loses it
    //    (B3 rule 2); its replacement does not take it.
    for (const x of order) {
      if (x.koed || !x.active) { phase = 'turn'; if (LOG) log('turn_cancelled', x, null, `${x.c.name}'s turn is cancelled (${x.koed ? 'knocked out' : 'no longer active'})`); continue; }
      if (takeTurn(x)) break;
    }
    if (winner) break;
    // 4. Rotation phase (P8): a stub until S4. No rotation happens.
    phase = 'rotation';
    if (LOG) log('rotation_phase', null, null, 'Rotation phase: no rotation (S4)');
    probe('rotationPhase');
    // 5. End of exchange: delayed impacts arrive here from S5.
    phase = 'end_of_exchange';
    probe('endOfExchange');
    if (LOG) log('exchange_end', null, null, `End of exchange ${ex}`);
    // 6. End check.
    phase = 'end_check';
    if (endCheck()) break;
  }

  // ---- the cap: HP share, then the seeded coin on an exact tie (approved)
  const hpShare = (side) => { const t = side.line.reduce((s, x) => s + x.c.maxHp, 0); return side.line.reduce((s, x) => s + x.hp, 0) / t; };
  const share = { a: hpShare(S.a), b: hpShare(S.b) };
  phase = 'end';
  if (!winner) {
    if (share.a !== share.b) { winner = share.a > share.b ? 'a' : 'b'; by = 'hp'; if (LOG) log('cap', null, null, `Exchange cap reached: side ${winner.toUpperCase()} has more of its starting HP left (${Math.round(share.a * 100)}% v ${Math.round(share.b * 100)}%)`, { share }); }
    else { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; if (LOG) log('cap', null, null, `Exchange cap reached with an exact HP tie: the seeded coin goes to side ${winner.toUpperCase()}`, { share, coin: true }); }
  }
  if (LOG) log('end', null, null, `Side ${winner.toUpperCase()} wins by ${by === 'knockout' ? 'knockout' : by === 'hp' ? 'HP share' : 'coin flip'} after ${ex} exchange${ex === 1 ? '' : 's'}`, { winner, by });

  const lineOut = (side) => side.line.map((x) => ({ id: x.c.id, monsterId: x.c.monsterId, species: x.c.species, name: x.c.name, archetype: x.c.archetype, type: x.c.type, basic: x.c.basic,
    hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, koOrder: x.koOrder, turns: x.turns, skips: x.skips, entries: x.entries, clocks: x.clocks.map((k) => ({ id: k.id, kind: k.kind, left: k.left })), stats: { ...x.stats }, combatant: x.c }));
  const lines = { a: lineOut(S.a), b: lineOut(S.b) };
  const result = {
    ruleset: V.ruleset, engine: V.engineVersion, winner, by, exchanges: ex, capped: !!(ex >= V.battle.exchangeCap && by !== 'knockout'), seed, model, config: cfg,
    hpShare: share, lines, log: events, rngDraws: draws, probed: probes.length > 0,
    stateHash: stateHash({ winner, by, ex, draws, lines }),
    replayKey: t8ReplayKey({ a, b, seed, config: cfg }),
  };
  return deepFreeze(result);
}

const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
/** Hash of the authoritative end state (never of the log), so log on and off can be compared. */
function stateHash({ winner, by, ex, draws, lines }) {
  const row = (x) => `${x.id}:${x.hp}:${x.koed ? 1 : 0}:${x.koOrder ?? '-'}:${x.turns}:${x.skips}:${x.entries}:${x.active ? 1 : 0}:${x.clocks.map((k) => `${k.id}/${k.left}`).join(',')}`;
  return fnv(`${winner}|${by}|${ex}|${draws}|${lines.a.map(row).join(';')}|${lines.b.map(row).join(';')}`);
}

/** One line that rebuilds this battle exactly: ruleset, engine version, seed, configuration and full lineup snapshots. */
export function t8ReplayKey({ a, b, seed, config }) {
  const snap = (m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, level: m.level, stage: m.stage || 0, fatigue: m.fatigue || 0, attributes: { ...m.attributes } });
  return JSON.stringify({ ruleset: V.ruleset, engine: V.engineVersion, seed, config, a: a.map(snap), b: b.map(snap) });
}
export function parseT8ReplayKey(line) {
  const k = JSON.parse(line);
  if (k.ruleset !== V.ruleset || k.engine !== V.engineVersion) throw new Error(`Replay key is for ${k.ruleset} / ${k.engine}; this build plays ${V.ruleset} / ${V.engineVersion}`);
  return { a: k.a, b: k.b, seed: k.seed, config: k.config };
}
/** Stable hash of a t8 battle log (same scheme as the legacy logHash), for golden-seed tests. */
export function t8LogHash(result) {
  return fnv(result.log.map((e) => `${e.ex}|${e.phase}|${e.kind}|${e.actor}|${e.target}|${e.text}`).join('\n') + `|${result.winner}|${result.by}|${result.exchanges}`);
}
