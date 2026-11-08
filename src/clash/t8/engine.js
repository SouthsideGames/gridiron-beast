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
import { roundHalfUp, resolveAmount, splitRaw } from './arith.js';
import { rotationEntryPenalty, ROTATION_CADENCE_EXCHANGES } from '../../data/approved-values.js';
import { chooseRotationAI, T8_POLICIES } from './ai.js';
import { STATUS, applyClash, orderAttempts, endOfTurn as statusEndOfTurn, clashEffect, afflictedTick, absorb, cleanse as cleanseSlot, replaceWith, fromFootball, toFootball } from './status.js';

const V = T8_VALUES;
const L_SWAPS = T8_VALUES.swaps;
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };
export { roundHalfUp };
const PROBE_HOOKS = ['initiative', 'chooseAction', 'roundStart', 'turnStart', 'endOfTurn', 'rotationPhase', 'endOfExchange', 'statusIncoming', 'statusApplied',
  // S3 damage-pipeline hook points (B3 step 8; P6 steps 3.4-3.12)
  'launch', 'intercept', 'missCheck', 'rawModifiers', 'lethalRedirect', 'rawSplit', 'mitigate', 'preKO', 'attached', 'reaction', 'afterWholeHit', 'followUp',
  // S4 rotation hook points (P8 resolution order; forced-rotation locks)
  'rotationLock', 'rotationDelay', 'pursuit', 'cashOut', 'onEntry', 'arrival'];
/**
 * B3 rule 3 (REMAINING_DECISIONS §B3, approved N7c): the ONLY effects that continue after their owner is knocked out. A hook item
 * naming any other exception is refused; an item naming none is cancelled when its owner is out (B3 rule 2).
 */
export const POST_KO_EXCEPTIONS = Object.freeze({
  'FIR-03-C': 'Falling Star impact, at the owner\'s last pre-KO strength',
  'FIR-06-C': 'Faultline impact, at the owner\'s last pre-KO strength',
  'FIR-04-C': 'Molten Brand lethal-hit eruption ("settle both knockouts before winner")',
  'WAT-02-C': 'Shared Burden: the current hit keeps its split; the link ends',
  'EAR-06-C': 'Mountain Shelter protection already granted',
  'WAT-06-C': 'Riptide Pursuit: ordinary replacement, then continue as written',
  'PSY-06-C': 'Astral Strike: ordinary replacement, then continue as written',
  'FIR-02-C': 'Cinder Clamp: the owner\'s KO releases the grip',
  'NAT-01-C': 'Second Spring revival on a later own turn',
});
/** Battle contexts (spec §10, D12): a standalone (Tuesday) battle clears every status at its end; an opening or overtime Clash is part
 *  of a football game, so its statuses carry out (S12 connects that carry to the game state). */
export const T8_CONTEXTS = Object.freeze(['standalone', 'opening', 'overtime']);
const CONFIG_KEYS = ['ruleset', 'context', 'policies', 'decisions'];

/** The t8 configuration. Unknown keys and function values are refused. */
export function t8Config(config = {}) {
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === 'function') throw new Error(`Battle options cannot be functions (${k})`);
    if (!CONFIG_KEYS.includes(k)) throw new Error(`Unknown t8 battle option ${k}`);
  }
  if (config.ruleset != null && config.ruleset !== V.ruleset) throw new Error(`The t8 engine plays ruleset t8, not ${config.ruleset}`);
  if (config.context != null && !T8_CONTEXTS.includes(config.context)) throw new Error(`Unknown t8 battle context ${config.context}`);
  // Rotation policies (D1, approved): 'ai' is the default, because Skip, headless play and staff use the AI policy; 'manual' is the
  // player's side in Watch; 'none' never rotates (tests and staged scenarios).
  const policies = { a: 'ai', b: 'ai', ...(config.policies || {}) };
  for (const [k, v] of Object.entries(policies)) { if (!['a', 'b'].includes(k)) throw new Error(`Unknown side ${k} in policies`); if (!T8_POLICIES.includes(v)) throw new Error(`Unknown t8 rotation policy ${v}`); }
  // Recorded decisions: decisions[side][exchange] = a reserve's combatant or monster id, 'stay', or 'auto' ("Auto for the rest").
  const decisions = {};
  for (const [k, v] of Object.entries(config.decisions || {})) {
    if (!['a', 'b'].includes(k)) throw new Error(`Unknown side ${k} in decisions`);
    decisions[k] = {}; for (const [e, d] of Object.entries(v || {})) { if (!/^\d+$/.test(e)) throw new Error(`Decision exchange ${e} is not a whole number`); if (typeof d !== 'string' || !d) throw new Error(`Decision ${k}/${e} must be an id, 'stay' or 'auto'`); decisions[k][e] = d; }
  }
  return deepFreeze({ ruleset: V.ruleset, ...(config.context && config.context !== 'standalone' ? { context: config.context } : {}), policies, ...(Object.keys(decisions).length ? { decisions } : {}) });
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
 *  stopAt: { exchange, turn? } stops after that exchange (or after its `turn`-th turn) and returns a boundary, for turn stepping and
 *    the B11 checkpoint (S13). A 'manual' side with no recorded decision stops the battle at its rotation phase the same way (D1).
 */
export function simulateClashT8({ a, b, seed = 1, config = {}, log: logMode = 'full', probes = [], stage = null, carryIn = null, stopAt = null }) {
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
  // Every event carries `seq` (its index, for event stepping), `turnIndex` (the battle's normal-turn count, for turn stepping) and
  // `hit` (the strike it belongs to, or null), so the reviewer can step trigger -> activation -> resolution -> cleanup (§25).
  let turnIndex = 0;
  const log = (kind, actor, target, text, extra = {}) => { events.push({ seq: events.length, ex, phase, turnIndex, hit: curHit?.id ?? null, kind, actor: actor?.c.id ?? null, target: target?.c.id ?? null, text, ...extra, actorState: snap(actor), targetState: snap(target), active: activeIds(), ramp }); };

  // ---- live records
  const mkSide = (key, monsters) => {
    const side = { key, line: [], active: null, policy: cfg.policies[key], lastVoluntary: -99, lastForced: -99, rotations: 0, forced: 0 };
    side.line = monsters.map((m, i) => {
      const c = buildT8Combatant(m, { slot: i, side: key });
      return { c, side, slot: i, hp: c.hp, active: false, koed: false, koOrder: null, turns: 0, skips: 0, consecutiveSkips: 0, inTurn: false,
        entries: 0, entry: null, clocks: [], status: null, stunProtected: false, stunnedSkips: 0, p8pending: false, p8: null, maxHitDealt: 0, stats: { dealt: 0, taken: 0, kos: 0, attacks: 0 } };
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
    side: (k) => { const sd = S[k]; return sd ? Object.freeze({ key: k, policy: sd.policy, lastVoluntary: sd.lastVoluntary, lastForced: sd.lastForced, active: sd.active?.c.id ?? null, line: sd.line.map((x) => x.c.id) }) : null; },
    combatant: (id) => { const x = byId.get(id); return x ? Object.freeze({ id, hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, turns: x.turns, skips: x.skips, inTurn: x.inTurn, stunProtected: x.stunProtected, entry: x.entry ? { ...x.entry } : null, entryPenalty: x.p8?.factor ?? (x.p8pending ? 'pending' : 1), clocks: x.clocks.map((k) => ({ ...k })), status: x.status ? structuredClone(x.status) : null }) : null; },
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
    // Entry effects run at full strength (P8: "entry effects ... are unchanged"), for every entry reason.
    if (probes.length) runDescriptors(hookList(probe('onEntry', x.c.id, { reason })), x.c.id, 'onEntry');
  }
  function depart(x, reason) {
    x.active = false; if (x.side.active === x) x.side.active = null;
    // PROVISIONAL 'p8-pending-cleared-on-departure': a penalty not yet spent belongs to that entry and ends with it.
    x.p8pending = false; x.p8 = null;
    if (LOG) log('depart', x, null, `${x.c.name} goes to reserve`, { reason, status: x.status?.id ?? null, ...(x.status ? { paused: true } : {}) });
  }
  function knockout(x, by) {
    if (x.koed) return;
    x.koed = true; x.active = false; x.hp = 0; koSeq += 1; x.koOrder = koSeq; lastKO = ex; x.p8pending = false; x.p8 = null;
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

  // ---- the no-contract action: the ordinary attack plus archetype perks (R1 items 37-38) is `ordinaryAttack` below.
  // ---- the damage pipeline (S3; B3 step 8 as corrected by REMAINING_DECISIONS §B3; P6 steps 3.4-3.13)
  // One strike = launch -> interception -> explicit misses -> 8a raw once -> 8b Emergency Cover -> 8c Shared Burden raw split ->
  // 8d each recipient's mitigation (type, Tank guard, Guarded, ability mitigation, shield) -> 8e pre-KO (Last Root) -> 8f HP and the
  // immediate KO -> attached effects -> reactions (no chains) -> after the whole hit -> the replacement (B3 rule 4) -> follow-ups.
  // Every step is a named hook point (PROBE_HOOKS) for the S5 registry; the engine never names an ability. With no hook registered
  // the strike draws and logs exactly as the S1/S2 ordinary attack, so plain battles are unchanged.
  //
  // Attack-kind tags: 'ordinary' (the plain or Basic normal attack), 'special' (a contract's normal-action attack), 'reaction',
  // 'counter', 'followUp', 'commanded', 'delayed'. D5 (approved): the Striker shield-break and Disruptor pierce apply to ORDINARY
  // attacks only; the Tank guard applies while the Tank is active (never in reserve, so never on redirected or transferred damage).
  // Explicit ability exceptions are preserved through `spec.exceptions` ({ shieldBreak, pierce, tankGuard }), set only by a contract.
  // D9 (approved): every modifier multiplies and the HP loss is rounded once, half up; the explicit floor (Shared Burden split) and
  // round-up exceptions keep their own rounding.
  let hitSeq = 0; let curHit = null;
  const isNormalAttack = (tag) => tag === 'ordinary' || tag === 'special';
  const noChain = (tag) => tag === 'reaction' || tag === 'counter';
  const label = (spec) => spec.label || (spec.tag === 'ordinary' ? 'attack' : spec.abilityId || spec.tag);
  /** P8 entry penalty factor for `x`'s numeric output on this normal turn (S4 sets it; 1 otherwise). */
  const penaltyOf = (x, spec) => (isNormalAttack(spec?.tag ?? 'ordinary') || spec?.support ? x.p8?.factor ?? 1 : 1);
  const hookList = (r) => (r == null ? [] : Array.isArray(r) ? r : [r]);
  /** Log an `unmet` report from a hook: the ability was considered but a stated condition failed (reviewer requirement, §25). */
  function reportUnmet(hook, ownerId, r) {
    if (!r?.unmet || !LOG) return;
    const o = byId.get(ownerId) || null;
    log('unmet', o, null, `${o ? o.c.name : 'Hook'}: ${r.abilityId || hook} does not activate (${r.unmet.map((u) => u.condition).join(', ')})`, { hook, stage: 'trigger', abilityId: r.abilityId ?? null, unmet: r.unmet });
  }
  /** Mitigation preview or application for one recipient (8d). Returns { exact, parts } with the shield applied when `commit`. */
  function mitigate(att, rec, raw, spec, commit) {
    const ordinary = spec.tag === 'ordinary'; const ex_ = spec.exceptions || {};
    const type = typeFactor(att.c.type, rec.c.type);
    const pierce = ex_.pierce ?? (ordinary && att.c.perks.pierce);
    const guardOn = ex_.tankGuard ?? true;
    const guard = guardOn && rec.active && rec.c.perks.guard < 1 && !pierce ? rec.c.perks.guard : 1;
    const guarded = clashEffect(rec.status).incoming;
    const ab = hookList(probe('mitigate', rec.c.id, { attacker: att.c.id, tag: spec.tag, raw })).reduce((k, m) => k * (m.factor ?? 1), 1);
    let exact = raw * type * guard * guarded * ab; let shield = null;
    if (rec.status?.id === 'shielded') {
      const br = ex_.shieldBreak ?? (ordinary ? att.c.perks.shieldBreak || 1 : 1);
      const r = absorb(rec.status, exact, br);
      shield = { poolLoss: r.poolLoss, broken: r.broken, breakMult: br };
      if (commit) rec.status = r.slot;
      exact = r.toHp;
    }
    return { exact, type, guard, guarded, ab, shield, pierce: !!pierce && rec.c.perks.guard < 1 };
  }
  /**
   * One strike from `att` aimed at `target`. spec: { tag, mult = 1, abilityId, label, hits = 1, undodgeable, exceptions, support,
   *   exception } — `exception` names the B3 rule 3 post-KO exception that lets a knocked-out owner's strike resolve.
   * Returns true when the battle is decided.
   */
  function strike(att, target, spec = { tag: 'ordinary' }) {
    const hits = spec.hits || 1;
    for (let h = 1; h <= hits; h++) {
      if (att.koed && !spec.exception) { if (LOG) log('hits_cancelled', att, target, `${att.c.name}'s remaining hits are cancelled (knocked out)`, { remaining: hits - h + 1, rule: 'B3 rule 2' }); return endCheck(); }
      if (h > 1 && (target.koed || !target.active)) { if (LOG) log('hits_cancelled', att, target, `${att.c.name}'s remaining hits are cancelled (target gone)`, { remaining: hits - h + 1, rule: 'multi-hit-target-ko (provisional)' }); return endCheck(); }
      if (oneHit(att, target, spec, h)) return true;
    }
    return false;
  }
  function oneHit(att, intended, spec, hitNo) {
    const prevHit = curHit; curHit = { id: ++hitSeq, tag: spec.tag, attacker: att.c.id, abilityId: spec.abilityId ?? null, hitNo };
    try {
      let t = intended;
      // 3.4 launch: costs, once-uses and target lock are contract hooks; then the Confused redirect (STA-07: eligible normal attacks
      // only, reactions and counters never roll); then launch accuracy (Snowbank Shot) as a hook.
      const launch = probe('launch', att.c.id, { target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null });
      reportUnmet('launch', att.c.id, launch);
      if (launch?.cancel) { if (LOG) log('launch_cancelled', att, t, `${att.c.name}'s ${label(spec)} does not launch (${launch.reason || 'cancelled'})`, { reason: launch.reason || 'cancelled', unmet: launch.unmet || [{ condition: 'launch', detail: launch.reason || 'cancelled' }] }); return false; }
      const conf = isNormalAttack(spec.tag) ? clashEffect(att.status).confusedChance : 0;
      if (conf > 0) {
        const redirected = rng.chance(conf);
        if (LOG) log('confused_roll', att, redirected ? att : t, `${att.c.name} is Confused: ${redirected ? 'the attack turns on itself' : 'it attacks normally'}`, { chance: conf, redirected, intended: t.c.id });
        if (redirected) t = att;
      }
      // 3.5 interception (Stone Divide)
      const icp = probe('intercept', t.c.id, { attacker: att.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null });
      reportUnmet('intercept', t.c.id, icp);
      if (icp?.intercepted) { if (LOG) log('intercepted', byId.get(icp.by) || null, att, `${att.c.name}'s ${label(spec)} is intercepted`, { stage: 'resolution', abilityId: icp.abilityId ?? null, by: icp.by ?? null }); return false; }
      // 3.6 explicit miss sources only (N7a, P10): no base evasion; undodgeable attacks bypass them without a roll
      if (!spec.undodgeable) {
        const miss = probe('missCheck', t.c.id, { attacker: att.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null });
        reportUnmet('missCheck', t.c.id, miss);
        if (miss?.miss) { if (LOG) log('miss', att, t, `${att.c.name}'s ${label(spec)} misses (${miss.source || 'explicit miss effect'})`, { source: miss.source ?? null, abilityId: miss.abilityId ?? null, stage: 'resolution' }); return afterHit(att, t, spec, [], true); }
      }
      // 8a raw damage once: attacker power and outgoing modifiers, before any recipient's type or defence
      const spread = V.damage.spreadMin + rng.next() * (V.damage.spreadMax - V.damage.spreadMin);
      const out = clashEffect(att.status).outgoing; // Weakened / Empowered (STA-06, STA-10)
      const p8 = penaltyOf(att, spec);
      const abRaw = hookList(probe('rawModifiers', att.c.id, { target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null })).reduce((k, m) => k * (m.factor ?? 1), 1);
      const raw = att.c.atk * (spec.mult ?? 1) * ramp * spread * out * p8 * abRaw;
      // 8b Emergency Cover: lethality predicted after the original target's defences (a mitigation preview that consults the 'mitigate'
      //    hook but changes nothing), before any survival ability is spent
      let recipients = [{ x: t, raw }];
      const predicted = roundHalfUp(mitigate(att, t, raw, spec, false).exact);
      const cover = probe('lethalRedirect', t.c.id, { attacker: att.c.id, raw, predicted, lethal: predicted >= t.hp, tag: spec.tag });
      reportUnmet('lethalRedirect', t.c.id, cover);
      if (cover?.to) { const r = byId.get(cover.to); if (!r || r.koed) throw new Error(`lethalRedirect to ${cover.to}: not a living combatant`); if (LOG) log('redirect', r, t, `${r.c.name} takes the hit for ${t.c.name}`, { stage: 'activation', abilityId: cover.abilityId ?? null, predicted }); recipients = [{ x: r, raw }]; }
      // 8c Shared Burden raw split: the budget is whole (round half up once), the source share floored, the target gets the rest (§9)
      const split = probe('rawSplit', recipients[0].x.c.id, { attacker: att.c.id, raw, tag: spec.tag });
      reportUnmet('rawSplit', recipients[0].x.c.id, split);
      if (split?.to) {
        const src = byId.get(split.to); if (!src || src.koed) throw new Error(`rawSplit to ${split.to}: not a living combatant`);
        const whole = roundHalfUp(raw); const sh = splitRaw(whole, split.pct);
        recipients = [{ x: recipients[0].x, raw: sh.target }, { x: src, raw: sh.source }];
        if (LOG) log('raw_split', src, recipients[0].x, `${src.c.name} shares ${sh.source} of ${whole}`, { stage: 'resolution', abilityId: split.abilityId ?? null, whole, source: sh.source, target: sh.target, pct: split.pct });
      }
      const order = [recipients[0], ...recipients.slice(1).sort((p, q) => p.x.c.id.localeCompare(q.x.c.id))];
      const landed = [];
      for (const { x: rec, raw: rr } of order) {
        // 8d mitigation, then one rounding (D9)
        const m = mitigate(att, rec, rr, spec, true);
        let loss = roundHalfUp(m.exact);
        // 8e pre-KO hook on every damage path (Last Root)
        if (loss >= rec.hp && rec.hp > 0) {
          const pk = probe('preKO', rec.c.id, { attacker: att.c.id, loss, tag: spec.tag });
          reportUnmet('preKO', rec.c.id, pk);
          if (pk?.survive) { if (LOG) log('survive', rec, att, `${rec.c.name} holds on at 1 HP`, { stage: 'activation', abilityId: pk.abilityId ?? null, prevented: loss - (rec.hp - 1) }); loss = rec.hp - 1; }
        }
        // 8f HP loss and the immediate KO (B3 rule 1)
        const before = rec.hp; rec.hp = Math.max(0, rec.hp - loss);
        if (spec.tag === 'ordinary' || spec.tag === 'special') att.stats.attacks += rec === order[0].x ? 1 : 0;
        att.stats.dealt += before - rec.hp; rec.stats.taken += before - rec.hp;
        if (rec.side !== att.side) att.maxHitDealt = Math.max(att.maxHitDealt, before - rec.hp); // public: the AI's "observed hit" (D2)
        if (LOG) {
          const sn = m.shield ? `, ${m.shield.poolLoss} absorbed by the shield${m.shield.broken ? ' (shield broken)' : ''}` : '';
          log('damage', att, rec, `${att.c.name}'s ${label(spec)}: ${loss} damage${sn}${m.guard < 1 ? ' (Tank guard)' : ''}${m.guarded < 1 ? ' (Guarded)' : ''}${out !== 1 ? (out > 1 ? ' (Empowered)' : ' (Weakened)') : ''}${p8 !== 1 ? ' (entry penalty)' : ''}${rec === att ? ' (Confused: hits itself)' : ''}${m.type > 1 ? ' (type advantage)' : m.type < 1 ? ' (type disadvantage)' : ''}`,
            { tag: spec.tag, damage: loss, raw: Math.round(rr * 100) / 100, hpBefore: before, hpAfter: rec.hp, type: typeEdge(att.c.type, rec.c.type), guard: m.guard < 1, pierce: m.pierce,
              ...(spec.abilityId ? { abilityId: spec.abilityId } : {}), ...(spec.mult != null && spec.mult !== 1 ? { mult: spec.mult } : {}), ...(out !== 1 ? { outgoing: out } : {}), ...(p8 !== 1 ? { penalty: p8 } : {}), ...(m.guarded !== 1 ? { guarded: m.guarded } : {}), ...(m.ab !== 1 ? { mitigation: m.ab } : {}), ...(m.shield ? { shield: m.shield } : {}), ...(rec === att ? { redirected: true } : {}), ...(hitNo > 1 ? { hitNo } : {}) });
          if (m.shield?.broken) log('status_end', att, rec, `${rec.c.name}'s Shielded ends (shield broken)`, { status: 'shielded', reason: 'broken' });
        }
        landed.push({ x: rec, loss });
        if (rec.hp <= 0) knockout(rec, att);
      }
      return afterHit(att, t, spec, landed, false);
    } finally { curHit = prevHit; }
  }
  /** Steps 3.9-3.12 after the damage: attached effects, reactions (no chains), after the whole hit, the replacement, follow-ups. */
  function afterHit(att, t, spec, landed, missed) {
    const info = { attacker: att.c.id, target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null, missed, landed: landed.map((l) => ({ id: l.x.c.id, loss: l.loss, koed: l.x.koed })) };
    // 3.9 attached effects through the shared gate (a blocked status never cancels the damage)
    if (!missed) runDescriptors(hookList(probe('attached', att.c.id, info)), att.c.id, 'attached');
    if (!noChain(spec.tag) && probes.length) {
      // 3.10 reactions and retaliation to that hit, by every living monster that has one; a reaction never triggers reactions
      for (const y of reactionOrder(landed, att)) runDescriptors(hookList(probe('reaction', y.c.id, info)), y.c.id, 'reaction');
      // 3.11 after the whole hit (Glacier Wall rebuild, Wing Shelter, Mirage Veil, Forge Swipe, Shadow Pounce counter, Rubble Reprisal)
      for (const y of reactionOrder(landed, att)) runDescriptors(hookList(probe('afterWholeHit', y.c.id, info)), y.c.id, 'afterWholeHit');
    }
    // B3 rule 4: the replacement enters now, after every living monster's reactions and before the next hit or follow-up.
    if (settleHit()) return true;
    if (!noChain(spec.tag) && probes.length) {
      // 3.12 follow-ups that need retaliation settled first (Twin Thunder bolts, Bank Shot ricochet)
      for (const y of reactionOrder(landed, att)) if (runDescriptors(hookList(probe('followUp', y.c.id, info)), y.c.id, 'followUp')) return true;
    }
    return endCheck();
  }
  /** Reactors in stable order: the hit's recipients first (in recipient order), then every other living monster by stable ID. */
  function reactionOrder(landed, att) {
    const first = landed.map((l) => l.x); const rest = [...S.a.line, ...S.b.line].filter((y) => !first.includes(y)).sort((p, q) => p.c.id.localeCompare(q.c.id));
    void att; return [...first, ...rest];
  }
  /**
   * Run what a hook returned. Each descriptor belongs to an owner. B3 rule 2: an owner knocked out before its item resolves has the
   * item cancelled, unless the item names one of the B3 rule 3 post-KO exceptions. Returns true when the battle is decided.
   * Descriptors: { kind: 'strike', target, mult, tag, abilityId, exceptions } | { kind: 'status', targetId, ...attempt }
   *   | { kind: 'heal', targetId, pctMaxHp, rounding } | { kind: 'shield', targetId, pctMaxHp, duration } | { unmet: [...] }.
   */
  function runDescriptors(list, ownerId, hook) {
    for (const d of list) {
      if (d.unmet) { reportUnmet(hook, d.owner ?? ownerId, d); continue; }
      const owner = byId.get(d.owner ?? ownerId);
      if (d.exception && !POST_KO_EXCEPTIONS[d.exception]) throw new Error(`${d.exception} is not an approved post-KO exception (B3 rule 3)`);
      if (owner.koed && !d.exception) { if (LOG) log('cancelled', owner, null, `${owner.c.name}'s ${d.abilityId || d.kind} is cancelled (knocked out)`, { hook, item: d.kind, abilityId: d.abilityId ?? null, rule: 'B3 rule 2', stage: 'cleanup' }); continue; }
      if (LOG && d.abilityId) log('ability', owner, null, `${owner.c.name}: ${d.abilityId} (${hook})`, { hook, abilityId: d.abilityId, stage: 'activation', ...(owner.koed ? { postKO: d.exception } : {}) });
      if (d.kind === 'strike') {
        const tgt = byId.get(d.target === 'attacker' ? curHit?.attacker : d.target);
        if (!tgt || tgt.koed) { if (LOG) log('cancelled', owner, tgt || null, `${owner.c.name}'s ${d.abilityId || 'strike'} has no target`, { hook, rule: 'no living target', stage: 'cleanup', unmet: [{ condition: 'living target' }] }); continue; }
        if (strike(owner, tgt, { tag: d.tag || (hook === 'reaction' ? 'reaction' : hook === 'followUp' ? 'followUp' : 'counter'), mult: d.mult ?? 1, abilityId: d.abilityId ?? null, exceptions: d.exceptions, undodgeable: d.undodgeable, label: d.label, exception: d.exception })) return true;
      } else if (d.kind === 'status') { const { kind, owner: _o, exception, targetId, ...attempt } = d; const x = byId.get(targetId); if (x && !x.koed) applyStatus(x, { sourceId: owner.c.id, ...attempt }); }
      else if (d.kind === 'heal') heal(owner, byId.get(d.targetId), d);
      else if (d.kind === 'shield') grantShield(owner, byId.get(d.targetId), d);
      else if (d.kind === 'forcedRotation') { const tgt = d.side === 'own' ? owner.side : other(owner.side); forcedRotation(owner, tgt, { incoming: d.incoming, abilityId: d.abilityId ?? null }); if (settleHit()) return true; }
      else throw new Error(`Unknown hook descriptor ${d.kind}`);
    }
    return false;
  }

  // ---- healing and shields (D9: P8 x C6 x Healing Reduced multiply, rounded once; explicit floor exceptions keep 'floor')
  /** Heal `t` by `pctMaxHp` of its max HP (or `base` HP). Capped at missing HP. D7: Afflicted never reduces healing. */
  function heal(src, t, { pctMaxHp, base, rounding = 'halfUp', abilityId = null, support = true } = {}) {
    if (!t || t.koed) return 0;
    const b = base ?? (t.c.maxHp * pctMaxHp) / 100;
    const factors = [{ id: 'entry-penalty', factor: penaltyOf(src, { support }) }, { id: 'stalemate-c6', factor: healMult }, { id: 'healing-reduced', factor: clashEffect(t.status).heal }].filter((f) => f.factor !== 1);
    const r = resolveAmount(b, factors, { rounding, max: t.c.maxHp - t.hp });
    const before = t.hp; t.hp += r.amount;
    if (LOG) log('heal', src, t, `${src.c.name} heals ${t.c.name} ${r.amount}${factors.length ? ` (${factors.map((f) => f.id).join(', ')})` : ''}`, { amount: r.amount, exact: r.exact, factors: r.factors, rounding, hpBefore: before, hpAfter: t.hp, abilityId, stage: 'resolution' });
    return r.amount;
  }
  /** Grant Shielded with a pool of `pctMaxHp` of the recipient's max HP (P8 and C6 multiply, one rounding), through the gate. */
  function grantShield(src, t, { pctMaxHp, duration, abilityId = null, support = true } = {}) {
    if (!t || t.koed) return false;
    const factors = [{ id: 'entry-penalty', factor: penaltyOf(src, { support }) }, { id: 'stalemate-c6', factor: healMult }].filter((f) => f.factor !== 1);
    const r = resolveAmount((t.c.maxHp * pctMaxHp) / 100, factors);
    if (r.amount < 1) { if (LOG) log('unmet', src, t, `${src.c.name}'s shield rounds to 0`, { unmet: [{ condition: 'positive shield pool', detail: r.exact }], abilityId }); return false; }
    return applyStatus(t, { id: 'shielded', strength: r.amount, duration, sourceId: src.c.id, abilityId }).accepted;
  }
  /** Damage-over-time on `x` (the Afflicted tick): direct HP loss, then the 8e pre-KO hook, then 8f. */
  function dotDamage(x, amount, extra) {
    let loss = amount;
    if (loss >= x.hp) { const pk = probe('preKO', x.c.id, { attacker: null, loss, tag: 'dot' }); reportUnmet('preKO', x.c.id, pk); if (pk?.survive) { if (LOG) log('survive', x, null, `${x.c.name} holds on at 1 HP`, { stage: 'activation', abilityId: pk.abilityId ?? null }); loss = x.hp - 1; } }
    const before = x.hp; x.hp = Math.max(0, x.hp - loss); x.stats.taken += before - x.hp;
    if (LOG) log('afflicted', null, x, `${x.c.name} suffers ${loss} from Afflicted`, { tag: 'dot', damage: loss, hpBefore: before, hpAfter: x.hp, ...extra });
    if (x.hp <= 0) { knockout(x, null); return true; }
    return false;
  }
  const ordinaryAttack = (x, t) => strike(x, t, { tag: 'ordinary' });

  // ---- rotation (S4; P8 approved N7b/N7c; R4, R5; D1, D2)
  const CADENCE = ROTATION_CADENCE_EXCHANGES; // approved: at most once per side every four exchanges (values 1.1.0 voluntaryEvery 4)
  const FORCED_EVERY = L_SWAPS.forcedEvery;   // approved: the existing side-wide forced-rotation pacing (values 1.1.0 forcedEvery 3)
  const reservesOf = (side) => side.line.filter((x) => !x.koed && !x.active);
  const stable = () => [...S.a.line, ...S.b.line].sort((p, q) => p.c.id.localeCompare(q.c.id));
  /** Locks on the active (Cinder Clamp-type holds, explicit immunity): a hook answer { locked, reason, abilityId }. */
  function lockOf(x, forced) {
    if (!probes.length) return null;
    for (const y of stable()) { const r = probe('rotationLock', y.c.id, { activeId: x.c.id, forced }); if (r?.locked) return { ...r, by: y.c.id }; }
    return null;
  }
  /** Is a voluntary rotation legal for `side` now? Returns { legal, unmet, lock }. */
  function voluntaryLegality(side) {
    const unmet = [];
    if (!side.active) unmet.push({ condition: 'active monster' });
    if (!reservesOf(side).length) unmet.push({ condition: 'living reserve' });
    if (ex - side.lastVoluntary < CADENCE) unmet.push({ condition: 'rotation cadence', need: CADENCE, have: ex - side.lastVoluntary });
    const lock = !unmet.length ? lockOf(side.active, false) : null;
    if (lock) unmet.push({ condition: 'rotation lock', detail: lock.reason || 'locked', abilityId: lock.abilityId ?? null, by: lock.by });
    return { legal: !unmet.length, unmet, lock };
  }
  const optionView = (x) => ({ id: x.c.id, monsterId: x.c.monsterId, name: x.c.name, hp: x.hp, maxHp: x.c.maxHp, type: x.c.type, archetype: x.c.archetype, status: x.status ? x.status.id : null });
  /** The side's request at the start of the phase: { incoming, by } | { pending } | null. */
  function rotationRequest(side) {
    if (side.policy === 'none') return null;
    const L = voluntaryLegality(side);
    if (!L.legal) { if (L.lock && LOG) log('rotation_unavailable', side.active, null, `${side.active.c.name} cannot rotate (${L.lock.reason || 'locked'})`, { side: side.key, unmet: L.unmet, stage: 'trigger' }); return null; }
    const reserves = reservesOf(side);
    if (side.policy === 'manual') {
      const d = cfg.decisions?.[side.key]?.[ex];
      if (d === undefined) return { pending: { kind: 'rotation', ex, side: side.key, activeId: side.active.c.id, options: ['stay', 'auto', ...reserves.map((x) => x.c.id)], reserves: reserves.map(optionView) } };
      if (d === 'auto') { side.policy = 'ai'; if (LOG) log('rotation_decision', side.active, null, `Auto for the rest of this battle: side ${side.key.toUpperCase()} hands rotation to the AI`, { side: side.key, decision: 'auto' }); }
      else if (d === 'stay') { if (LOG) log('rotation_decision', side.active, null, `${side.active.c.name} stays in (your call)`, { side: side.key, decision: 'stay' }); return null; }
      else {
        const pick = reserves.find((x) => x.c.id === d || x.c.monsterId === d);
        if (!pick) throw new Error(`Decision ${side.key}/${ex} names ${d}, which is not a living reserve`);
        if (LOG) log('rotation_decision', side.active, pick, `${side.active.c.name} rotates out for ${pick.c.name} (your call)`, { side: side.key, decision: pick.c.id });
        return { incoming: pick, by: 'manual' };
      }
    }
    const foe = other(side).active;
    const pick = chooseRotationAI({ active: side.active, reserves, foe, observedFoeHit: foe?.maxHitDealt ?? 0 });
    return pick ? { incoming: pick, by: 'ai' } : null;
  }
  /** Resolve one voluntary rotation in the P8 order. Returns true when the battle is decided. */
  function executeRotation(side, incoming, by) {
    const out = side.active; if (!out || out.koed || incoming.koed || incoming.active) return false;
    // 1. Cinder Clamp's delay check
    if (probes.length) for (const y of stable()) { const r = probe('rotationDelay', y.c.id, { side: side.key, out: out.c.id, in: incoming.c.id }); if (r?.delay) { if (LOG) log('rotation_delayed', out, incoming, `${out.c.name}'s rotation is delayed`, { abilityId: r.abilityId ?? null, by: y.c.id, stage: 'activation', unmet: [{ condition: 'not delayed', abilityId: r.abilityId ?? null }] }); return false; } }
    // 2. Riptide Pursuit's hit on the departing monster; 3. Shell Harvest cash-out
    if (probes.length) for (const hook of ['pursuit', 'cashOut']) for (const y of stable()) {
      if (runDescriptors(hookList(probe(hook, y.c.id, { side: side.key, out: out.c.id, in: incoming.c.id })), y.c.id, hook)) return true;
    }
    if (out.koed) { if (LOG) log('rotation_cancelled', out, incoming, `${out.c.name} is knocked out before it can rotate`, { rule: 'B3 rule 4: ordinary replacement' }); return settleHit(); }
    // 4. departure; 5. the entrant's entry effects (in enter); 6. Cold Welcome and Downdraft on the entrant
    side.lastVoluntary = ex; side.rotations += 1;
    if (LOG) log('rotation', out, incoming, `${by === 'manual' ? 'Your call' : 'AI'}: ${out.c.name} rotates out for ${incoming.c.name}`, { side: side.key, voluntary: true, out: out.c.id, in: incoming.c.id, by });
    depart(out, 'voluntary'); enter(incoming, 'voluntary'); incoming.p8pending = true;
    if (probes.length) for (const y of stable()) if (runDescriptors(hookList(probe('arrival', y.c.id, { side: side.key, in: incoming.c.id, reason: 'voluntary' })), y.c.id, 'arrival')) return true;
    return settleHit();
  }
  /**
   * Forced rotation (Riptide Charge, Downdraft; R5): the existing side-wide pacing (no forced rotation within 3 exchanges of the
   * last one on that side) and the just-entered protection (an active that entered this exchange cannot be forced out) are kept, as
   * the contracts require. No entry penalty. `incoming` is a combatant id or 'firstReserve' (first living reserve in stable lineup
   * order). Returns true when the rotation happened; a refusal is logged with its unmet conditions.
   */
  function forcedRotation(src, side, { incoming = 'firstReserve', abilityId = null } = {}) {
    const out = side.active; const unmet = [];
    const reserves = reservesOf(side);
    if (!out) unmet.push({ condition: 'active monster' });
    if (!reserves.length) unmet.push({ condition: 'living reserve' });
    if (ex - side.lastForced < FORCED_EVERY) unmet.push({ condition: 'forced-rotation pacing', need: FORCED_EVERY, have: ex - side.lastForced });
    if (out && out.entry?.ex === ex) unmet.push({ condition: 'just-entered protection', detail: `${out.c.name} entered this exchange (${out.entry.reason})` });
    const lock = !unmet.length ? lockOf(out, true) : null; if (lock) unmet.push({ condition: 'rotation lock or immunity', detail: lock.reason || 'locked', abilityId: lock.abilityId ?? null, by: lock.by });
    const inc = !unmet.length ? (incoming === 'firstReserve' ? reserves[0] : reserves.find((x) => x.c.id === incoming)) : null;
    if (!unmet.length && !inc) unmet.push({ condition: 'chosen replacement is a living reserve', detail: String(incoming) });
    if (unmet.length) { if (LOG) log('rotation_refused', src, out || null, `${src.c.name}'s forced rotation is refused (${unmet.map((u) => u.condition).join(', ')})`, { forced: true, abilityId, unmet, stage: 'trigger' }); return false; }
    side.lastForced = ex; side.forced += 1;
    if (LOG) log('rotation', src, out, `${src.c.name} forces ${out.c.name} out; ${inc.c.name} comes in`, { side: side.key, voluntary: false, forced: true, out: out.c.id, in: inc.c.id, abilityId, stage: 'resolution' });
    depart(out, 'forced'); enter(inc, 'forced');
    return true;
  }

  // ---- one normal turn (P6 step 3). Returns true when the battle is decided.
  function takeTurn(x) {
    x.turns += 1; x.inTurn = true; phase = 'turn'; turnIndex += 1;
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
    // P8 entry penalty (approved; src/data/approved-values.js rotationEntryPenalty): on the entrant's first normal turn after a
    // VOLUNTARY rotation its damage multipliers, heals, shields and status-application chances are x0.5; a Stunned skip spends it.
    // KO replacements and forced rotations never set it. Entry effects, reactions and defensive effects are unchanged.
    if (x.p8pending) {
      const pen = rotationEntryPenalty({ firstAfterVoluntaryRotation: true, stunnedSkip }); x.p8pending = false; x.p8 = { factor: pen.factor };
      if (LOG) log('entry_penalty', x, null, stunnedSkip ? `${x.c.name}'s entry penalty is spent by the Stunned skip` : `${x.c.name} acts at half strength (first turn after rotating in)`, { factor: pen.factor, spentBy: stunnedSkip ? 'stunned skip' : 'turn' });
    }
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
      reportUnmet('chooseAction', x.c.id, choice);
      const foe = other(x.side).active;
      // The normal action: the ordinary attack (no contract), or what a contract's chooseAction returns in its place: a special
      // normal-action attack, or a support action (heal / shield). S6-S11 register the real contracts; tests use stubs.
      if (choice?.kind === 'attack') { if (foe) done = strike(x, foe, { tag: 'special', mult: choice.mult ?? 1, abilityId: choice.abilityId ?? null, hits: choice.hits, undodgeable: choice.undodgeable, exceptions: choice.exceptions, label: choice.label }); }
      else if (choice?.kind === 'heal') heal(x, byId.get(choice.targetId ?? x.c.id), choice);
      else if (choice?.kind === 'shield') grantShield(x, byId.get(choice.targetId ?? x.c.id), choice);
      else if (choice?.kind === 'forcedRotation') { forcedRotation(x, choice.side === 'own' ? x.side : other(x.side), { incoming: choice.incoming, abilityId: choice.abilityId ?? null }); done = endCheck(); }
      else if (foe) done = ordinaryAttack(x, foe);
    }
    // End of turn (P6 step 3.14; B3 rule 5: a monster knocked out during its own turn has no end of turn).
    // Order: 1. Afflicted damage (not on the application turn); 2.-4. the countdowns (status, then the holder's clocks).
    if (!x.koed && !done) {
      phase = 'end_of_turn';
      const tick = x.status && !x.status.appliedThisUnit ? afflictedTick(x.status, x.c.maxHp) : 0;
      if (tick > 0 && dotDamage(x, tick, { sourceId: x.status.sourceId ?? null, abilityId: x.status.abilityId ?? null })) done = settleHit(); // B3 rule 5: KO at once, the replacement enters, the countdowns skip it
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
    x.p8 = null; // the penalty lasts exactly this one normal turn
    x.inTurn = false;
    return done || endCheck();
  }

  function healMultiplier() { // values 1.1.0 C6, unchanged; nothing reads it in S1 (no heal or shield exists)
    if (ex < C6.from) return 1; const quiet = ex - lastKO;
    if (quiet >= C6.quarterAfter) return C6.quarter; if (quiet >= C6.halfAfter) return C6.half; return 1;
  }

  // ---- opening
  if (LOG) events.push({ seq: 0, ex: 0, phase, turnIndex: 0, hit: null, kind: 'start', text: `Beast Clash (t8): ${a.length} v ${b.length}. Sudden death Model ${model} from exchange ${sdFrom}.`, model, ruleset: V.ruleset });
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
  let stopped = null;
  if (stopAt != null && (!Number.isInteger(stopAt.exchange) || stopAt.exchange < 1 || (stopAt.turn != null && ![1, 2].includes(stopAt.turn)))) throw new Error('stopAt needs { exchange >= 1, turn? 1 | 2 }');
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
    let turnNo = 0;
    for (const x of order) {
      turnNo += 1;
      if (x.koed || !x.active) { phase = 'turn'; if (LOG) log('turn_cancelled', x, null, `${x.c.name}'s turn is cancelled (${x.koed ? 'knocked out' : 'no longer active'})`); }
      else if (takeTurn(x)) break;
      if (stopAt && stopAt.exchange === ex && stopAt.turn === turnNo && !winner) { stopped = { kind: 'turn', ex, turn: turnNo }; break; }
    }
    if (winner || stopped) break;
    // 4. Rotation phase (P8): after both turns and before delayed impacts. Requests come from the state at the start of the phase
    //    (both sides decided first), then resolve side A, then side B. A 'manual' side with no recorded decision stops here (D1).
    phase = 'rotation';
    if (LOG) log('rotation_phase', null, null, 'Rotation phase', { cadence: { a: ex - S.a.lastVoluntary >= CADENCE, b: ex - S.b.lastVoluntary >= CADENCE } });
    probe('rotationPhase');
    const requests = [];
    for (const side of [S.a, S.b]) { const r = rotationRequest(side); if (r?.pending) { stopped = r.pending; break; } if (r?.incoming) requests.push({ side, ...r }); }
    if (stopped) { if (LOG) log('rotation_prompt', byId.get(stopped.activeId) || null, null, `Side ${stopped.side.toUpperCase()} may rotate: waiting for a decision`, { pending: true, side: stopped.side, options: stopped.options }); break; }
    for (const q of requests) if (executeRotation(q.side, q.incoming, q.by)) break;
    if (winner) break;
    // 5. End of exchange: delayed impacts arrive here from S5.
    phase = 'end_of_exchange';
    probe('endOfExchange');
    if (LOG) log('exchange_end', null, null, `End of exchange ${ex}`);
    if (stopAt && stopAt.exchange === ex && stopAt.turn == null) { phase = 'end_check'; if (!endCheck()) { stopped = { kind: 'exchange', ex }; break; } }
    // 6. End check.
    phase = 'end_check';
    if (endCheck()) break;
  }

  // ---- the cap: HP share, then the seeded coin on an exact tie (approved)
  const hpShare = (side) => { const t = side.line.reduce((s, x) => s + x.c.maxHp, 0); return side.line.reduce((s, x) => s + x.hp, 0) / t; };
  const share = { a: hpShare(S.a), b: hpShare(S.b) };
  phase = stopped ? 'boundary' : 'end';
  if (!winner && !stopped) {
    if (share.a !== share.b) { winner = share.a > share.b ? 'a' : 'b'; by = 'hp'; if (LOG) log('cap', null, null, `Exchange cap reached: side ${winner.toUpperCase()} has more of its starting HP left (${Math.round(share.a * 100)}% v ${Math.round(share.b * 100)}%)`, { share }); }
    else { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; if (LOG) log('cap', null, null, `Exchange cap reached with an exact HP tie: the seeded coin goes to side ${winner.toUpperCase()}`, { share, coin: true }); }
  }
  // Statuses at the end (D12, approved §25 item 12): a standalone battle clears every status at its actual end; an opening or
  // overtime Clash keeps its slots for the carry into football (spec §10), returned as `carryOut` (S12 applies it to the game).
  let carryOut = null;
  if (stopped) { /* a boundary is not the end of the battle: nothing clears, nothing carries */ }
  else if (context === 'standalone') { for (const x of [...S.a.line, ...S.b.line]) if (x.status) clearStatus(x, 'end of a standalone battle'); }
  else { carryOut = {}; for (const x of [...S.a.line, ...S.b.line]) if (x.status) { const t = toFootball(x.status, x.c.maxHp); if (t) carryOut[x.c.monsterId] = t; } }
  if (LOG && !stopped) log('end', null, null, `Side ${winner.toUpperCase()} wins by ${by === 'knockout' ? 'knockout' : by === 'hp' ? 'HP share' : 'coin flip'} after ${ex} exchange${ex === 1 ? '' : 's'}`, { winner, by });

  const lineOut = (side) => side.line.map((x) => ({ id: x.c.id, monsterId: x.c.monsterId, species: x.c.species, name: x.c.name, archetype: x.c.archetype, type: x.c.type, basic: x.c.basic,
    hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, koOrder: x.koOrder, turns: x.turns, skips: x.skips, stunnedSkips: x.stunnedSkips, entries: x.entries, status: x.status ? structuredClone(x.status) : null, clocks: x.clocks.map((k) => ({ id: k.id, kind: k.kind, left: k.left })), stats: { ...x.stats }, combatant: x.c }));
  const lines = { a: lineOut(S.a), b: lineOut(S.b) };
  const sides = { a: { policy: S.a.policy, rotations: S.a.rotations, forced: S.a.forced, lastVoluntary: S.a.lastVoluntary }, b: { policy: S.b.policy, rotations: S.b.rotations, forced: S.b.forced, lastVoluntary: S.b.lastVoluntary } };
  const boundary = stopped ? { ...stopped, rngDraws: draws, stateHash: stateHash({ winner: null, by: null, ex, draws, lines }), lastSeq: events.length - 1 } : null;
  const result = {
    ruleset: V.ruleset, engine: V.engineVersion, pending: !!stopped, boundary, sides,
    winner: stopped ? null : winner, by: stopped ? null : by, exchanges: ex, capped: !stopped && !!(ex >= V.battle.exchangeCap && by !== 'knockout'), seed, model, config: cfg,
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
