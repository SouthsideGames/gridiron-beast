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
import { roundHalfUp } from './arith.js';
import { STATUS, applyClash, orderAttempts, endOfTurn as statusEndOfTurn, clashEffect, afflictedTick, absorb, cleanse as cleanseSlot, replaceWith, fromFootball, toFootball } from './status.js';

const V = T8_VALUES;
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };
export { roundHalfUp };
const PROBE_HOOKS = ['initiative', 'chooseAction', 'roundStart', 'turnStart', 'endOfTurn', 'rotationPhase', 'endOfExchange', 'statusIncoming', 'statusApplied'];
/** Battle contexts (spec §10, D12): a standalone (Tuesday) battle clears every status at its end; an opening or overtime Clash is part
 *  of a football game, so its statuses carry out (S12 connects that carry to the game state). */
export const T8_CONTEXTS = Object.freeze(['standalone', 'opening', 'overtime']);
const CONFIG_KEYS = ['ruleset', 'context'];

/** The t8 configuration. Unknown keys and function values are refused. */
export function t8Config(config = {}) {
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === 'function') throw new Error(`Battle options cannot be functions (${k})`);
    if (!CONFIG_KEYS.includes(k)) throw new Error(`Unknown t8 battle option ${k}`);
  }
  if (config.ruleset != null && config.ruleset !== V.ruleset) throw new Error(`The t8 engine plays ruleset t8, not ${config.ruleset}`);
  if (config.context != null && !T8_CONTEXTS.includes(config.context)) throw new Error(`Unknown t8 battle context ${config.context}`);
  // The S1 shape is kept for a standalone battle so existing replay keys stay byte-identical.
  return Object.freeze(config.context && config.context !== 'standalone' ? { ruleset: V.ruleset, context: config.context } : { ruleset: V.ruleset });
}

/**
 * @param {object} args
 *  a, b: arrays of 1-5 monsters (never mutated)
 *  seed: integer
 *  config: { ruleset: 't8' }
 *  log: 'full' | 'none'
 *  probes: test / reviewer instrumentation (see the header)
 *  stage: reviewer / test staging only: { [combatantId]: { hp?, status? } }. A staged status goes through the real Clash gate before
 *    the opening (it is an input, never a manufactured result); the result is marked `staged: true`.
 *  carryIn: opening / overtime only: { [monsterId]: football slot } carried into this Clash (spec §10; D10, D11). A standalone battle
 *    has no incoming carry (D12).
 */
export function simulateClashT8({ a, b, seed = 1, config = {}, log: logMode = 'full', probes = [], stage = null, carryIn = null }) {
  const cfg = t8Config(config); const context = cfg.context || 'standalone';
  if (carryIn && context === 'standalone') throw new Error('A standalone Clash has no incoming status carry (D12)');
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
  const snap = (x) => (x ? { hp: x.hp, turns: x.turns, active: x.active, clocks: x.clocks.length, status: x.status ? { id: x.status.id, remaining: x.status.remaining, applications: x.status.applications, ...(x.status.id === 'shielded' ? { pool: x.status.payload.remaining } : {}) } : null } : null);
  const activeIds = () => ({ a: S.a.active?.c.id ?? null, b: S.b.active?.c.id ?? null });
  const log = (kind, actor, target, text, extra = {}) => { events.push({ ex, phase, kind, actor: actor?.c.id ?? null, target: target?.c.id ?? null, text, ...extra, actorState: snap(actor), targetState: snap(target), active: activeIds(), ramp }); };

  // ---- live records
  const mkSide = (key, monsters) => {
    const side = { key, line: [], active: null };
    side.line = monsters.map((m, i) => {
      const c = buildT8Combatant(m, { slot: i, side: key });
      return { c, side, slot: i, hp: c.hp, active: false, koed: false, koOrder: null, turns: 0, skips: 0, consecutiveSkips: 0, inTurn: false,
        entries: 0, entry: null, clocks: [], status: null, stunProtected: false, stunnedSkips: 0, stats: { dealt: 0, taken: 0, kos: 0, attacks: 0 } };
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
    combatant: (id) => { const x = byId.get(id); return x ? Object.freeze({ id, hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, turns: x.turns, skips: x.skips, inTurn: x.inTurn, stunProtected: x.stunProtected, clocks: x.clocks.map((k) => ({ ...k })), status: x.status ? structuredClone(x.status) : null }) : null; },
    // The real Clash status gate, for stub contracts in tests and for reviewer staging. Every call is logged with provenance.
    applyStatus: (targetId, attempt) => { const x = byId.get(targetId); if (!x || x.koed) throw new Error(`No living combatant ${targetId}`); return applyStatus(x, { sourceId: 'probe', ...attempt }).accepted; },
    applyStatuses: (attempts) => applyStatusBatch(attempts.map((t) => ({ sourceId: 'probe', ...t }))),
    cleanse: (targetId) => cleanse(byId.get(targetId), 'probe'),
    replaceStatus: (targetId, attempt, opts) => replaceStatus(byId.get(targetId), { sourceId: 'probe', ...attempt }, opts),
    addClock: (holderId, spec) => { const x = byId.get(holderId); if (!x || x.koed) throw new Error(`No living combatant ${holderId}`); const k = addClock(x, spec); if (LOG) log('clock_start', x, x, `${x.c.name}: ${k.kind} ${k.id} starts (${k.left} normal turn${k.left === 1 ? '' : 's'})`, { clock: k.id, clockKind: k.kind, left: k.left, excluded: k.excludeTurn === x.turns && x.inTurn }); return k.left; },
  });
  const probe = (hook, ...args) => { let out = null; for (const p of probes) if (p[hook]) { const r = p[hook](view(), ...args); if (r != null && out == null) out = r; } return out; };

  // ---- the shared status slot in mode 'clash' (S2; spec §10, Appendix B; src/sim/t8/status.js through ./status.js)
  const NAME = { stunned: 'Stunned', slowed: 'Slowed', stumbled: 'Stumbled', knockedDown: 'Knocked Down', afflicted: 'Afflicted', weakened: 'Weakened', confused: 'Confused', healingReduced: 'Healing Reduced', shielded: 'Shielded', empowered: 'Empowered', quickened: 'Quickened', guarded: 'Guarded' };
  const slotView = (sl) => (sl ? { id: sl.id, strength: sl.strength, remaining: sl.remaining, applications: sl.applications, ...(sl.freeze ? { freeze: sl.freeze } : {}), ...(sl.id === 'shielded' ? { pool: sl.payload.pool, poolLeft: sl.payload.remaining } : {}) } : null);
  /** Attempt a status on `x` through the gate. A blocked attempt is logged with its unmet condition and never cancels anything else. */
  function applyStatus(x, attempt) {
    const src = attempt.sourceId != null ? byId.get(attempt.sourceId) || null : null;
    const veto = probe('statusIncoming', x.c.id, { ...attempt }); // hook point: Foresight-type vetoes before the slot check (S11)
    if (veto?.block) { if (LOG) log('status_blocked', src, x, `${x.c.name}: ${NAME[attempt.id]} is blocked (${veto.reason || 'blocked'})`, { status: attempt.id, reason: veto.reason || 'blocked', unmet: [{ condition: 'incoming veto', detail: veto.reason || 'blocked' }], sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null }); return { accepted: false, reason: veto.reason || 'blocked' }; }
    const before = x.status;
    const r = applyClash(x.status, attempt, { recipientInTurn: x.inTurn });
    if (!r.accepted) { if (LOG) log('status_blocked', src, x, `${x.c.name}: ${NAME[attempt.id]} is not applied (${r.reason})`, { status: attempt.id, reason: r.reason, unmet: [{ condition: 'shared status gate', detail: r.reason }], slot: slotView(before), sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null }); return r; }
    x.status = r.slot;
    if (LOG) log('status', src, x, `${x.c.name} is ${NAME[attempt.id]} (${r.reason}; ${x.status.remaining} turn${x.status.remaining === 1 ? '' : 's'}${x.status.id === 'shielded' ? `, ${x.status.payload.remaining} shield` : ''})`, { status: attempt.id, reason: r.reason, slot: slotView(x.status), excluded: x.inTurn, sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null });
    probe('statusApplied', x.c.id, slotView(x.status)); // hook point: Shell Renewal-type reactions to an accepted status (S7)
    return r;
  }
  /** Attempts at the same boundary: event order, then sourceID, then abilityID (§9); no random roll. Returns accepted flags in that order. */
  function applyStatusBatch(attempts) {
    return orderAttempts(attempts).map((t) => { const x = byId.get(t.targetId); if (!x || x.koed) throw new Error(`No living combatant ${t.targetId}`); const { targetId, order, ...rest } = t; return { targetId, sourceId: rest.sourceId, abilityId: rest.abilityId ?? null, accepted: applyStatus(x, rest).accepted }; });
  }
  function cleanse(x, sourceId) {
    if (!x) throw new Error('No such combatant');
    const r = cleanseSlot(x.status);
    if (LOG) log(r.removed ? 'status_end' : 'cleanse_refused', null, x, r.removed ? `${x.c.name}'s ${NAME[x.status.id]} is cleansed` : `${x.c.name}: cleanse has no effect (${r.reason})`, { reason: r.reason, status: x.status?.id ?? null, sourceId, ...(r.removed ? {} : { unmet: [{ condition: 'cleansable harmful status', detail: r.reason }] }) });
    x.status = r.slot; return r.removed;
  }
  function replaceStatus(x, attempt, opts = {}) {
    if (!x) throw new Error('No such combatant');
    const r = replaceWith(x.status, attempt, { recipientInTurn: x.inTurn, overridesUncleansable: !!opts.overridesUncleansable });
    if (!r.accepted) { if (LOG) log('status_blocked', null, x, `${x.c.name}: ${NAME[attempt.id]} replacement refused (${r.reason})`, { status: attempt.id, reason: r.reason, unmet: [{ condition: 'explicit replacement', detail: r.reason }] }); return false; }
    const old = x.status; x.status = r.slot;
    if (LOG) log('status', null, x, `${x.c.name}: ${old ? `${NAME[old.id]} is replaced; ` : ''}a fresh ${NAME[attempt.id]} episode begins`, { status: attempt.id, reason: 'explicit replacement', replaced: old?.id ?? null, slot: slotView(x.status), sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null });
    return true;
  }
  function clearStatus(x, reason) {
    if (!x.status) return null; const old = x.status; x.status = null;
    if (LOG) log('status_end', null, x, `${x.c.name}'s ${NAME[old.id]} ${reason === 'expired' ? 'ends' : `clears (${reason})`}`, { status: old.id, reason });
    return old;
  }

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
    const st = x.status; x.status = null; x.stunProtected = false; // spec §10: "Clash KO immediately clears that monster's status and episode"
    if (LOG) log('ko', by, x, `${x.c.name} is knocked out${by && by !== x ? ` by ${by.c.name}` : ''}`, { koOrder: x.koOrder, clearedClocks: cleared.map((k) => k.id), ...(st ? { clearedStatus: st.id } : {}) });
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
    // Launch: the Confused redirect roll (STA-07: 25% per eligible normal attack; the FULL intended attack goes to its own side, self
    // as primary target). One draw, and only while the attacker is Confused, so a battle without statuses draws exactly as in S1.
    const conf = clashEffect(x.status).confusedChance;
    if (conf > 0) {
      const redirected = rng.chance(conf);
      if (LOG) log('confused_roll', x, redirected ? x : t, `${x.c.name} is Confused: ${redirected ? 'the attack turns on itself' : 'it attacks normally'}`, { chance: conf, redirected, intended: t.c.id });
      if (redirected) t = x;
    }
    const spread = V.damage.spreadMin + rng.next() * (V.damage.spreadMax - V.damage.spreadMin);
    const out = clashEffect(x.status).outgoing; // Weakened / Empowered (STA-06, STA-10)
    const raw = x.c.atk * ramp * spread * out;
    const type = typeFactor(x.c.type, t.c.type);
    const guard = t.active && t.c.perks.guard < 1 && !x.c.perks.pierce ? t.c.perks.guard : 1;
    const guarded = clashEffect(t.status).incoming; // Guarded (STA-12)
    let exact = raw * type * guard * guarded;
    let shieldNote = '', absorbedPart = null;
    if (t.status?.id === 'shielded') { // STA-09: the pool absorbs before HP; Striker shield-break x2 on ordinary attacks (D5)
      const br = x.c.perks.shieldBreak || 1; const r = absorb(t.status, exact, br);
      t.status = r.slot; exact = r.toHp; absorbedPart = { poolLoss: r.poolLoss, broken: r.broken, breakMult: br };
      shieldNote = `, ${r.poolLoss} absorbed by the shield${r.broken ? ' (shield broken)' : ''}`;
    }
    const loss = roundHalfUp(exact);
    const before = t.hp; t.hp = Math.max(0, t.hp - loss);
    x.stats.attacks += 1; x.stats.dealt += before - t.hp; t.stats.taken += before - t.hp;
    if (LOG) log('damage', x, t, `${x.c.name}'s attack: ${loss} damage${shieldNote}${guard < 1 ? ' (Tank guard)' : ''}${guarded < 1 ? ' (Guarded)' : ''}${out !== 1 ? (out > 1 ? ' (Empowered)' : ' (Weakened)') : ''}${t === x ? ' (Confused: hits itself)' : ''}${type > 1 ? ' (type advantage)' : type < 1 ? ' (type disadvantage)' : ''}`,
      { tag: 'ordinary', damage: loss, raw: Math.round(raw * 100) / 100, hpBefore: before, hpAfter: t.hp, type: typeEdge(x.c.type, t.c.type), guard: guard < 1, pierce: x.c.perks.pierce && t.c.perks.guard < 1,
        ...(out !== 1 ? { outgoing: out } : {}), ...(guarded !== 1 ? { guarded } : {}), ...(absorbedPart ? { shield: absorbedPart } : {}), ...(t === x ? { redirected: true } : {}) });
    if (absorbedPart?.broken && LOG) log('status_end', x, t, `${t.c.name}'s Shielded ends (shield broken)`, { status: 'shielded', reason: 'broken' });
    if (t.hp <= 0) knockout(t, x); // B3 rule 1: out at once
    return settleHit();
  }

  // ---- one normal turn (P6 step 3). Returns true when the battle is decided.
  function takeTurn(x) {
    x.turns += 1; x.inTurn = true; phase = 'turn';
    if (LOG) log('turn_start', x, null, `${x.c.name}'s turn ${x.turns}`, { turn: x.turns });
    probe('turnStart', x.c.id);
    // The Stunned check (P6 step 3.2; STA-01; D4). A skipped turn still counts as a normal turn and consumes duration.
    // D4 (approved, §25 item 4): "A monster cannot skip two consecutive normal turns. After one Stunned skip, its next normal action
    // is protected from another Stunned skip. The remaining status duration is preserved."
    // Countdown handling (documented in M4_STATUS.md): the skipped turn counts down Stunned as usual. On the protected turn the monster
    // acts and Stunned's remaining duration is HELD: that turn does not decrement it (the "remaining duration is preserved" reading,
    // flagged because spec §10 otherwise counts every recipient normal turn). The protection is spent by that next normal turn
    // whatever happens on it. A Deep Winter freeze counter still counts the protected turn (it is a recipient normal turn).
    let hold = false; let stunnedSkip = false;
    if (clashEffect(x.status).stunned) {
      if (x.stunProtected) { hold = true; if (LOG) log('stun_safeguard', x, null, `${x.c.name} is Stunned but cannot lose two turns in a row: it acts (${x.status.remaining} turn${x.status.remaining === 1 ? '' : 's'} of Stunned kept)`, { turn: x.turns, remaining: x.status.remaining }); }
      else stunnedSkip = true;
    }
    x.stunProtected = false; // spent by this normal turn, whatever happens on it
    const choice = stunnedSkip ? { kind: 'skip', cause: 'stunned' } : probe('chooseAction', x.c.id);
    let done = false;
    if (choice?.kind === 'skip' && choice.cause === 'stunned') {
      x.skips += 1; x.consecutiveSkips += 1; x.stunnedSkips += 1; x.stunProtected = true;
      if (LOG) log('skip', x, null, `${x.c.name} is Stunned and skips its turn`, { turn: x.turns, cause: 'stunned', remaining: x.status.remaining });
    } else if (choice?.kind === 'skip') {
      x.skips += 1; x.consecutiveSkips += 1;
      if (LOG) log('skip', x, null, `${x.c.name}'s turn is skipped`, { turn: x.turns });
    } else {
      x.consecutiveSkips = 0;
      const foe = other(x.side).active;
      if (foe) done = ordinaryAttack(x, foe);
    }
    // End of turn (P6 step 3.14; B3 rule 5: a monster knocked out during its own turn has no end of turn).
    // Order: 1. Afflicted damage (not on the application turn); 2.-4. the countdowns (status, then the holder's clocks).
    if (!x.koed && !done) {
      phase = 'end_of_turn';
      const tick = x.status && !x.status.appliedThisUnit ? afflictedTick(x.status, x.c.maxHp) : 0;
      if (tick > 0) {
        const before = x.hp; x.hp = Math.max(0, x.hp - tick); x.stats.taken += before - x.hp;
        if (LOG) log('afflicted', null, x, `${x.c.name} suffers ${tick} from Afflicted`, { tag: 'dot', damage: tick, hpBefore: before, hpAfter: x.hp, sourceId: x.status.sourceId ?? null, abilityId: x.status.abilityId ?? null });
        if (x.hp <= 0) { knockout(x, null); done = settleHit(); } // B3 rule 5: KO at once, the replacement enters, the countdowns skip it
      }
    }
    if (!x.koed) {
      phase = 'end_of_turn';
      if (x.status) {
        const id = x.status.id; const r = statusEndOfTurn(x.status, { hold });
        if (r.held && LOG) log('status_hold', x, x, `${x.c.name}'s Stunned is held this turn (${x.status.remaining} left)`, { status: id, remaining: x.status.remaining, reason: 'D4 protected turn' });
        if (r.froze && LOG) log('status_freeze', x, x, `${x.c.name}'s ${NAME[id]} countdown is frozen (${r.slot.freeze} freeze turn${r.slot.freeze === 1 ? '' : 's'} left)`, { status: id, freeze: r.slot.freeze });
        if (r.slot) x.status = r.slot; else clearStatus(x, 'expired');
      }
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
  // Incoming carry (opening / overtime only; D10, D11): football slots converted through the Clash side of the gate. Unsupported
  // statuses (Stumbled, Knocked Down) clear rather than lie dormant (spec §10; STA-03, STA-04).
  if (carryIn) for (const [mid, slot] of Object.entries(carryIn)) {
    const x = [...S.a.line, ...S.b.line].find((y) => y.c.monsterId === mid); if (!x) throw new Error(`carryIn names ${mid}, who is not in this battle`);
    const t = slot ? fromFootball(slot, x.c.maxHp) : null; x.status = t;
    if (LOG) log(t ? 'status_carry' : 'status_end', null, x, t ? `${x.c.name} carries ${NAME[t.id]} into the Clash (${t.remaining} turn${t.remaining === 1 ? '' : 's'}${t.id === 'shielded' ? `, ${t.payload.remaining} shield` : ''})` : `${x.c.name}'s ${NAME[slot?.id] || 'status'} clears on entering the Clash`, { status: slot?.id ?? null, slot: slotView(t), reason: t ? 'carry in' : 'unsupported in Clash' });
  }
  // Reviewer / test staging (inputs only, through the real gate; never a manufactured result).
  if (stage) for (const [id, st] of Object.entries(stage)) {
    const x = byId.get(id); if (!x) throw new Error(`stage names ${id}, who is not in this battle`);
    for (const k of Object.keys(st)) if (!['hp', 'status'].includes(k)) throw new Error(`Unknown stage field ${k}`);
    if (st.hp != null) { if (!Number.isInteger(st.hp) || st.hp < 1 || st.hp > x.c.maxHp) throw new Error(`Staged HP for ${id} must be a whole number in 1..${x.c.maxHp}`); x.hp = st.hp; if (LOG) log('stage', null, x, `Staged: ${x.c.name} at ${st.hp} / ${x.c.maxHp} HP`, { staged: true, hp: st.hp }); }
    if (st.status) { const r = applyStatus(x, { sourceId: 'stage', ...st.status }); if (LOG) log('stage', null, x, `Staged: ${NAME[st.status.id]} ${r.accepted ? 'applied' : `refused (${r.reason})`}`, { staged: true, status: st.status.id, accepted: r.accepted }); }
  }
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
      const sa = fa.c.spd * clashEffect(fa.status).initiative, sb = fb.c.spd * clashEffect(fb.status).initiative; // Slowed / Quickened (D10)
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
  // Statuses at the end (D12, approved §25 item 12): a standalone battle clears every status at its actual end; an opening or
  // overtime Clash keeps its slots for the carry into football (spec §10), returned as `carryOut` (S12 applies it to the game).
  let carryOut = null;
  if (context === 'standalone') { for (const x of [...S.a.line, ...S.b.line]) if (x.status) clearStatus(x, 'end of a standalone battle'); }
  else { carryOut = {}; for (const x of [...S.a.line, ...S.b.line]) if (x.status) { const t = toFootball(x.status, x.c.maxHp); if (t) carryOut[x.c.monsterId] = t; } }
  if (LOG) log('end', null, null, `Side ${winner.toUpperCase()} wins by ${by === 'knockout' ? 'knockout' : by === 'hp' ? 'HP share' : 'coin flip'} after ${ex} exchange${ex === 1 ? '' : 's'}`, { winner, by });

  const lineOut = (side) => side.line.map((x) => ({ id: x.c.id, monsterId: x.c.monsterId, species: x.c.species, name: x.c.name, archetype: x.c.archetype, type: x.c.type, basic: x.c.basic,
    hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, koOrder: x.koOrder, turns: x.turns, skips: x.skips, stunnedSkips: x.stunnedSkips, entries: x.entries, status: x.status ? structuredClone(x.status) : null, clocks: x.clocks.map((k) => ({ id: k.id, kind: k.kind, left: k.left })), stats: { ...x.stats }, combatant: x.c }));
  const lines = { a: lineOut(S.a), b: lineOut(S.b) };
  const result = {
    ruleset: V.ruleset, engine: V.engineVersion, winner, by, exchanges: ex, capped: !!(ex >= V.battle.exchangeCap && by !== 'knockout'), seed, model, config: cfg,
    context, carryOut, hpShare: share, lines, log: events, rngDraws: draws, probed: probes.length > 0, staged: !!stage,
    stateHash: stateHash({ winner, by, ex, draws, lines }),
    replayKey: t8ReplayKey({ a, b, seed, config: cfg, carryIn }),
  };
  return deepFreeze(result);
}

const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
/** Hash of the authoritative end state (never of the log), so log on and off can be compared. */
function stateHash({ winner, by, ex, draws, lines }) {
  // A status is appended only when present, so an S1-shaped end state hashes exactly as before.
  const row = (x) => `${x.id}:${x.hp}:${x.koed ? 1 : 0}:${x.koOrder ?? '-'}:${x.turns}:${x.skips}:${x.entries}:${x.active ? 1 : 0}:${x.clocks.map((k) => `${k.id}/${k.left}`).join(',')}${x.status ? `:${x.status.id}/${x.status.remaining}/${x.status.applications}/${x.status.payload?.remaining ?? ''}/${x.status.freeze || 0}` : ''}`;
  return fnv(`${winner}|${by}|${ex}|${draws}|${lines.a.map(row).join(';')}|${lines.b.map(row).join(';')}`);
}

/** One line that rebuilds this battle exactly: ruleset, engine version, seed, configuration and full lineup snapshots. */
export function t8ReplayKey({ a, b, seed, config, carryIn = null }) {
  const snap = (m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, level: m.level, stage: m.stage || 0, fatigue: m.fatigue || 0, attributes: { ...m.attributes } });
  return JSON.stringify({ ruleset: V.ruleset, engine: V.engineVersion, seed, config, a: a.map(snap), b: b.map(snap), ...(carryIn ? { carryIn } : {}) });
}
export function parseT8ReplayKey(line) {
  const k = JSON.parse(line);
  if (k.ruleset !== V.ruleset || !V.keyCompatible.includes(k.engine)) throw new Error(`Replay key is for ${k.ruleset} / ${k.engine}; this build plays ${V.ruleset} / ${V.engineVersion}`);
  return { a: k.a, b: k.b, seed: k.seed, config: k.config, ...(k.carryIn ? { carryIn: k.carryIn } : {}) };
}
/** Stable hash of a t8 battle log (same scheme as the legacy logHash), for golden-seed tests. */
export function t8LogHash(result) {
  return fnv(result.log.map((e) => `${e.ex}|${e.phase}|${e.kind}|${e.actor}|${e.target}|${e.text}`).join('\n') + `|${result.winner}|${result.by}|${result.exchanges}`);
}
