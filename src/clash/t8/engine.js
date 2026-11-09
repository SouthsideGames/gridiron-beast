// Beast Clash, ruleset 't8' (Task 8 M4): the core model, the normal-turn clock, the shared status slot, the B3 damage pipeline, P8
// rotation and (S5) the contract primitives. One pure, seeded function; the same lineups, seed and configuration give the same
// result and the same log on every device. No global random generator, no clock, no DOM, no storage. Nothing in the franchise or
// the UI uses this engine yet (S12 wires it in); the legacy rulesets stay on engine.js.
//
// S1-S4 (M4_STATUS.md): one active fighter per side with inert reserves (spec §1); the P6 exchange skeleton as corrected by B3;
// per-combatant normal-turn clocks; the shared status gate in mode 'clash' (S2); the B3 step-8 pipeline with immediate KO (S3); P8
// rotation, forced rotation, D1 decisions and the D2 AI policy (S4).
//
// S5 (this build): the Clash contract registry (registry.js) is wired to every hook point. Each combatant whose family has a Clash
// contract carries its module and a battle-scope ability state; the engine calls hooks by name and never names an ability. New
// primitives: delayed slot-marked impacts with frozen targets and the pre-KO strength snapshot; constructs and schedules (counted
// for the P9 diagnostics); revive (D18: back of the lineup); HP transfer and bounded apportionment; status transfer and steal;
// commanded and assist strikes; reserve windows and the pre-initiative advance; signature restriction (Eye of the Storm); cooldown
// clocks with extension and reduction; once-use ledgers; the mastery execution record (counts only; awards are M5). Every strike
// returns an outcome, so a contract can chain conditional follow-ups through the real pipeline.
//
// `probes` (tests and the reviewer only; never part of a record): plain objects whose hooks receive a read-only view. Probes are
// consulted at the same hook points as contracts and cannot draw from the random stream.
import { createRng } from '../../core/rng.js';
import { typeFactor, typeEdge } from '../types.js';
import { rampFor, rampModelFor } from '../engine.js';
import { T8_VALUES } from './values.js';
import { T8_FLAGS, flag, provisionalPoint } from './flags.js';
import { buildT8Combatant } from './combatant.js';
import { addClock, tickClocks, clearClocks } from './clock.js';
import { roundHalfUp, resolveAmount, splitRaw } from './arith.js';
import { rotationEntryPenalty, ROTATION_CADENCE_EXCHANGES } from '../../data/approved-values.js';
import { chooseRotationAI, T8_POLICIES } from './ai.js';
import { STATUS, applyClash, orderAttempts, endOfTurn as statusEndOfTurn, clashEffect, afflictedTick, absorb, cleanse as cleanseSlot, replaceWith, fromFootball, toFootball } from './status.js';
import { clashContractOf, CLASH_HOOKS } from './registry.js';
import { kindOf, isExtraStrike, restrictable } from './ability-kinds.js';

const V = T8_VALUES;
const L_SWAPS = T8_VALUES.swaps;
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };
export { roundHalfUp };
const PROBE_HOOKS = ['initiative', 'chooseAction', 'roundStart', 'turnStart', 'endOfTurn', 'rotationPhase', 'endOfExchange', 'statusIncoming', 'statusApplied',
  'launch', 'intercept', 'missCheck', 'rawModifiers', 'lethalRedirect', 'rawSplit', 'mitigate', 'preKO', 'attached', 'reaction', 'afterWholeHit', 'followUp',
  'rotationLock', 'rotationDelay', 'pursuit', 'cashOut', 'onEntry', 'arrival'];
/**
 * B3 rule 3 (REMAINING_DECISIONS §B3, approved N7c; RULINGS_2026-11-07b "post-KO exceptions", which removes Riptide Pursuit): the ONLY
 * effects that continue after their owner is knocked out. A hook item naming any other exception is refused.
 */
export const POST_KO_EXCEPTIONS = Object.freeze({
  'FIR-03-C': 'Falling Star impact, at the owner\'s last pre-KO strength',
  'FIR-06-C': 'Faultline impact, at the owner\'s last pre-KO strength',
  'FIR-04-C': 'Molten Brand lethal-hit eruption ("settle both knockouts before winner")',
  'WAT-02-C': 'Shared Burden: the current hit keeps its split; the link ends',
  'EAR-06-C': 'Mountain Shelter protection already granted',
  'PSY-06-C': 'Astral Strike: ordinary replacement, then continue as written',
  'FIR-02-C': 'Cinder Clamp: the owner\'s KO releases the grip',
  'NAT-01-C': 'Second Spring revival on a later own turn',
});
/** P9 diagnostic thresholds for Clash (spec §21 B4; P9_VERIFIED_LIMITS.md §6): never restrictions; an overflow logs and fails the suite. */
export const P9_CLASH_LIMITS = Object.freeze({ delayedPerSide: 2, constructsPerBattle: 2, dawnSongSchedulesPerSide: (lineupSize) => lineupSize });
export const T8_CONTEXTS = Object.freeze(['standalone', 'opening', 'overtime']);
const CONFIG_KEYS = ['ruleset', 'context', 'policies', 'decisions', 'abilities', 'provisional'];
/** Attack-kind tags (plan §3.6). */
export const ATTACK_TAGS = Object.freeze(['ordinary', 'special', 'reaction', 'counter', 'followUp', 'commanded', 'assist', 'delayed']);

/** The t8 configuration. Unknown keys and function values are refused. */
export function t8Config(config = {}) {
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === 'function') throw new Error(`Battle options cannot be functions (${k})`);
    if (!CONFIG_KEYS.includes(k)) throw new Error(`Unknown t8 battle option ${k}`);
  }
  if (config.ruleset != null && config.ruleset !== V.ruleset) throw new Error(`The t8 engine plays ruleset t8, not ${config.ruleset}`);
  if (config.context != null && !T8_CONTEXTS.includes(config.context)) throw new Error(`Unknown t8 battle context ${config.context}`);
  if (config.abilities != null && !['on', 'off'].includes(config.abilities)) throw new Error(`abilities must be 'on' or 'off'`);
  // Owner ruling 2026-11-09 (rule 1): provisional readings are OFF in normal gameplay; 'on' only in reviewer / provisional-test contexts.
  if (config.provisional != null && !['on', 'off'].includes(config.provisional)) throw new Error(`provisional must be 'on' or 'off'`);
  const policies = { a: 'ai', b: 'ai', ...(config.policies || {}) };
  for (const [k, v] of Object.entries(policies)) { if (!['a', 'b'].includes(k)) throw new Error(`Unknown side ${k} in policies`); if (!T8_POLICIES.includes(v)) throw new Error(`Unknown t8 rotation policy ${v}`); }
  const decisions = {};
  for (const [k, v] of Object.entries(config.decisions || {})) {
    if (!['a', 'b'].includes(k)) throw new Error(`Unknown side ${k} in decisions`);
    decisions[k] = {}; for (const [e, d] of Object.entries(v || {})) { if (!/^\d+$/.test(e)) throw new Error(`Decision exchange ${e} is not a whole number`); if (typeof d !== 'string' || !d) throw new Error(`Decision ${k}/${e} must be an id, 'stay' or 'auto'`); decisions[k][e] = d; }
  }
  return deepFreeze({ ruleset: V.ruleset, ...(config.context && config.context !== 'standalone' ? { context: config.context } : {}), policies, ...(Object.keys(decisions).length ? { decisions } : {}), ...(config.abilities === 'off' ? { abilities: 'off' } : {}), ...(config.provisional === 'on' ? { provisional: 'on' } : {}) });
}

/**
 * @param {object} args
 *  a, b: arrays of 1-5 monsters (never mutated); each may carry `stage` (form) and `clashMasteryTier` (0-3)
 *  seed: integer;  config: { ruleset: 't8', context?, policies?, decisions?, abilities?: 'on' | 'off' }
 *  log: 'full' | 'none';  probes: test / reviewer instrumentation
 *  stage: reviewer / test staging only: { [combatantId]: { hp?, status?, ability? } }. A staged status goes through the real gate;
 *    staged ability state is a labelled prerequisite (never a manufactured result); the result is marked `staged: true`.
 *  carryIn: opening / overtime only (spec §10; D10, D11).  stopAt: { exchange, turn? } (turn stepping; the B11 checkpoint, S13).
 */
export function simulateClashT8({ a, b, seed = 1, config = {}, log: logMode = 'full', probes = [], stage = null, carryIn = null, stopAt = null }) {
  const cfg = t8Config(config); const context = cfg.context || 'standalone'; const ABILITIES = cfg.abilities !== 'off'; const PROV = cfg.provisional === 'on';
  if (carryIn && context === 'standalone') throw new Error('A standalone Clash has no incoming status carry (D12)');
  if (!a?.length || !b?.length || a.length > V.battle.maxPerSide || b.length > V.battle.maxPerSide) throw new Error('Each side needs 1-5 monsters');
  if (!Array.isArray(probes)) throw new Error('probes must be an array');
  for (const p of probes) for (const [k, v] of Object.entries(p)) if (!PROBE_HOOKS.includes(k) || typeof v !== 'function') throw new Error(`Unknown probe hook ${k}`);
  const perSide = Math.max(a.length, b.length);
  const model = rampModelFor(perSide); const sdFrom = V.suddenDeath[model].from;
  const C6 = V.stalemate;

  // ---- one seeded stream, counted
  const base = createRng(seed); let draws = 0;
  const rng = Object.freeze({ next: () => { draws += 1; return base.next(); }, chance: (p) => { draws += 1; return base.next() < p; } });

  const LOG = logMode !== 'none';
  const events = []; let ex = 0; let phase = 'opening'; let ramp = 1; let healMult = 1; let lastKO = 0; let koSeq = 0;
  const snap = (x) => (x ? { hp: x.hp, turns: x.turns, active: x.active, clocks: x.clocks.length, status: x.status ? { id: x.status.id, remaining: x.status.remaining, applications: x.status.applications, ...(x.status.id === 'shielded' ? { pool: x.status.payload.remaining } : {}) } : null } : null);
  const activeIds = () => ({ a: S.a.active?.c.id ?? null, b: S.b.active?.c.id ?? null });
  let turnIndex = 0;
  const log = (kind, actor, target, text, extra = {}) => { events.push({ seq: events.length, ex, phase, turnIndex, hit: curHit?.id ?? null, kind, actor: actor?.c.id ?? null, target: target?.c.id ?? null, text, ...extra, actorState: snap(actor), targetState: snap(target), active: activeIds(), ramp }); };

  // ---- live records
  const mkSide = (key, monsters) => {
    const side = { key, line: [], active: null, policy: cfg.policies[key], lastVoluntary: -99, lastForced: -99, rotations: 0, forced: 0, delayed: 0 };
    side.line = monsters.map((m, i) => {
      const c = buildT8Combatant(m, { slot: i, side: key });
      const mod = ABILITIES ? clashContractOf(c.species) : null; // a registered module for the species (the Dex contract; tests may register a stub on a Basic)
      const x = { c, side, slot: i, hp: c.hp, active: false, koed: false, koOrder: null, turns: 0, skips: 0, consecutiveSkips: 0, inTurn: false, inAction: false,
        entries: 0, entry: null, clocks: [], status: null, stunProtected: false, stunnedSkips: 0, p8pending: false, p8: null, maxHitDealt: 0, performed: 0, sigRestrict: null, koSnapshot: null,
        mod, ab: mod ? mod.initBattle(c.form, c.tier) : null, executions: 0, passiveCredited: false, stats: { dealt: 0, taken: 0, kos: 0, attacks: 0 } };
      if (mod && (x.ab === null || typeof x.ab !== 'object')) throw new Error(`${mod.abilityId}: initBattle must return an object`);
      x.self = mod ? { id: c.id, side: key, family: c.species, abilityId: mod.abilityId, form: c.form, stage: c.stage, tier: c.tier, name: c.name, state: x.ab } : null;
      return x;
    });
    return side;
  };
  const S = { a: mkSide('a', a), b: mkSide('b', b) };
  const other = (side) => (side === S.a ? S.b : S.a);
  const living = (side) => side.line.filter((x) => !x.koed);
  const byId = new Map([...S.a.line, ...S.b.line].map((x) => [x.c.id, x]));
  const all = () => [...S.a.line, ...S.b.line];
  const stable = () => all().sort((p, q) => p.c.id.localeCompare(q.c.id));
  const reservesOf = (side) => side.line.filter((x) => !x.koed && !x.active);
  const lineupOrder = (side) => side.line; // lineup-order-stable (S4): the original order, never reordered except by a revive (D18)

  // ---- probes (read-only view)
  const view = () => Object.freeze({
    ex, phase, active: activeIds(),
    side: (k) => { const sd = S[k]; return sd ? Object.freeze({ key: k, policy: sd.policy, lastVoluntary: sd.lastVoluntary, lastForced: sd.lastForced, active: sd.active?.c.id ?? null, line: sd.line.map((x) => x.c.id) }) : null; },
    combatant: (id) => { const x = byId.get(id); return x ? Object.freeze({ id, hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, turns: x.turns, skips: x.skips, inTurn: x.inTurn, stunProtected: x.stunProtected, entry: x.entry ? { ...x.entry } : null, entryPenalty: x.p8?.factor ?? (x.p8pending ? 'pending' : 1), clocks: x.clocks.map((k) => ({ ...k })), status: x.status ? structuredClone(x.status) : null, ability: x.ab ? structuredClone(x.ab) : null }) : null; },
    applyStatus: (targetId, attempt) => { const x = byId.get(targetId); if (!x || x.koed) throw new Error(`No living combatant ${targetId}`); return applyStatus(x, { sourceId: 'probe', ...attempt }).accepted; },
    applyStatuses: (attempts) => applyStatusBatch(attempts.map((t) => ({ sourceId: 'probe', ...t }))),
    cleanse: (targetId) => cleanse(byId.get(targetId), 'probe'),
    replaceStatus: (targetId, attempt, opts) => replaceStatus(byId.get(targetId), { sourceId: 'probe', ...attempt }, opts),
    addClock: (holderId, spec) => { const x = byId.get(holderId); if (!x || x.koed) throw new Error(`No living combatant ${holderId}`); const k = addClock(x, spec); if (LOG) log('clock_start', x, x, `${x.c.name}: ${k.kind} ${k.id} starts (${k.left} normal turn${k.left === 1 ? '' : 's'})`, { clock: k.id, clockKind: k.kind, left: k.left, excluded: k.excludeTurn === x.turns && x.inTurn }); return k.left; },
  });
  const probe = (hook, ...args) => { let out = null; for (const p of probes) if (p[hook]) { const r = p[hook](view(), ...args); if (r != null && out == null) out = r; } return out; };
  /** A probe consulted at a pipeline hook point: its unmet report is logged like a contract's. */
  const probeR = (hook, id, info) => { const r = probe(hook, id, info); if (r?.unmet && !r.reported) reportUnmet(hook, id, r); return r; };

  // ---- contracts: the hook calls. A hook is asked of one combatant (callC), of a side in lineup order (firstC), or of every living
  // monster in a given order (eachC). Probes are consulted at the same points, after the contract.
  const callC = (hook, x, info) => { if (!x?.mod) return null; const h = x.mod.hooks[hook]; if (!h) return null; const r = h(api, x.self, info); if (r?.unmet && !r.reported) { reportUnmet(hook, x.c.id, { abilityId: x.mod.abilityId, ...r }); if (typeof r === 'object' && !Object.isFrozen(r)) r.reported = true; } return r; };
  const firstC = (hook, xs, info, decided) => { for (const y of xs) { const r = callC(hook, y, info); if (r && decided(r)) return { ...r, by: y.c.id }; } return null; };
  const hookList = (r) => (r == null ? [] : Array.isArray(r) ? r : [r]);
  /** Log an `unmet` report from a hook: the ability was considered but a stated condition failed (reviewer requirement, §25). */
  function reportUnmet(hook, ownerId, r) {
    if (!r?.unmet || !LOG) return;
    const o = byId.get(ownerId) || null;
    log('unmet', o, null, `${o ? o.c.name : 'Hook'}: ${r.abilityId || hook} does not activate (${r.unmet.map((u) => u.condition).join(', ')})`, { hook, stage: 'trigger', abilityId: r.abilityId ?? null, unmet: r.unmet });
  }

  // ---- the shared status slot in mode 'clash' (S2)
  const NAME = { stunned: 'Stunned', slowed: 'Slowed', stumbled: 'Stumbled', knockedDown: 'Knocked Down', afflicted: 'Afflicted', weakened: 'Weakened', confused: 'Confused', healingReduced: 'Healing Reduced', shielded: 'Shielded', empowered: 'Empowered', quickened: 'Quickened', guarded: 'Guarded' };
  const slotView = (sl) => (sl ? { id: sl.id, strength: sl.strength, remaining: sl.remaining, applications: sl.applications, ...(sl.freeze ? { freeze: sl.freeze } : {}), ...(sl.id === 'shielded' ? { pool: sl.payload.pool, poolLeft: sl.payload.remaining } : {}) } : null);
  function applyStatus(x, attempt) {
    const src = attempt.sourceId != null ? byId.get(attempt.sourceId) || null : null;
    const veto = callC('statusIncoming', x, { ...attempt, targetId: x.c.id }) ?? probe('statusIncoming', x.c.id, { ...attempt });
    if (veto?.block) { if (LOG) log('status_blocked', src, x, `${x.c.name}: ${NAME[attempt.id]} is blocked (${veto.reason || 'blocked'})`, { status: attempt.id, reason: veto.reason || 'blocked', unmet: [{ condition: 'incoming veto', detail: veto.reason || 'blocked' }], sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null }); return { accepted: false, reason: veto.reason || 'blocked', vetoed: true }; }
    const before = x.status;
    const r = applyClash(x.status, attempt, { recipientInTurn: x.inTurn });
    if (!r.accepted) { if (LOG) log('status_blocked', src, x, `${x.c.name}: ${NAME[attempt.id]} is not applied (${r.reason})`, { status: attempt.id, reason: r.reason, unmet: [{ condition: 'shared status gate', detail: r.reason }], slot: slotView(before), sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null }); return r; }
    x.status = r.slot;
    if (LOG) log('status', src, x, `${x.c.name} is ${NAME[attempt.id]} (${r.reason}; ${x.status.remaining} turn${x.status.remaining === 1 ? '' : 's'}${x.status.id === 'shielded' ? `, ${x.status.payload.remaining} shield` : ''})`, { status: attempt.id, reason: r.reason, slot: slotView(x.status), excluded: x.inTurn, sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null, stage: 'resolution' });
    callC('statusApplied', x, slotView(x.status)); probe('statusApplied', x.c.id, slotView(x.status));
    return r;
  }
  function applyStatusBatch(attempts) {
    return orderAttempts(attempts).map((t) => { const x = byId.get(t.targetId); if (!x || x.koed) throw new Error(`No living combatant ${t.targetId}`); const { targetId, order, ...rest } = t; return { targetId, sourceId: rest.sourceId, abilityId: rest.abilityId ?? null, accepted: applyStatus(x, rest).accepted }; });
  }
  function cleanse(x, sourceId, abilityId = null) {
    if (!x) throw new Error('No such combatant');
    const r = cleanseSlot(x.status); const old = x.status;
    if (LOG) log(r.removed ? 'status_end' : 'cleanse_refused', byId.get(sourceId) || null, x, r.removed ? `${x.c.name}'s ${NAME[x.status.id]} is cleansed` : `${x.c.name}: cleanse has no effect (${r.reason})`, { reason: r.reason, status: x.status?.id ?? null, sourceId, abilityId, stage: 'resolution', ...(r.removed ? {} : { unmet: [{ condition: 'cleansable harmful status', detail: r.reason }] }) });
    x.status = r.slot; if (r.removed) callC('statusEnded', x, { id: old.id, reason: 'cleansed', sourceId, abilityId });
    return r.removed;
  }
  function replaceStatus(x, attempt, opts = {}) {
    if (!x) throw new Error('No such combatant');
    const r = replaceWith(x.status, attempt, { recipientInTurn: x.inTurn, overridesUncleansable: !!opts.overridesUncleansable });
    if (!r.accepted) { if (LOG) log('status_blocked', null, x, `${x.c.name}: ${NAME[attempt.id]} replacement refused (${r.reason})`, { status: attempt.id, reason: r.reason, unmet: [{ condition: 'explicit replacement', detail: r.reason }] }); return false; }
    const old = x.status; x.status = r.slot;
    if (LOG) log('status', byId.get(attempt.sourceId) || null, x, `${x.c.name}: ${old ? `${NAME[old.id]} is replaced; ` : ''}a fresh ${NAME[attempt.id]} episode begins`, { status: attempt.id, reason: 'explicit replacement', replaced: old?.id ?? null, slot: slotView(x.status), sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null, stage: 'resolution' });
    if (old) callC('statusEnded', x, { id: old.id, reason: 'replaced', sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null });
    callC('statusApplied', x, slotView(x.status));
    return true;
  }
  function clearStatus(x, reason, extra = {}) {
    if (!x.status) return null; const old = x.status; x.status = null;
    if (LOG) log('status_end', null, x, `${x.c.name}'s ${NAME[old.id]} ${reason === 'expired' ? 'ends' : `clears (${reason})`}`, { status: old.id, reason, ...extra });
    if (!x.koed) callC('statusEnded', x, { id: old.id, reason, ...extra });
    return old;
  }
  /** Explicit beneficial-status removal (Wash Away) or steal (Eclipse Theft): the whole slot, pool included. Returns the removed slot. */
  function removeStatus(x, src, abilityId, reason) {
    if (!x.status) return null; const old = x.status; x.status = null;
    if (LOG) log('status_end', src, x, `${x.c.name}'s ${NAME[old.id]} is ${reason}`, { status: old.id, reason, sourceId: src?.c.id ?? null, abilityId, stage: 'resolution' });
    callC('statusEnded', x, { id: old.id, reason, sourceId: src?.c.id ?? null, abilityId });
    return old;
  }
  /** Status transfer (Lightning Rod, Eclipse Theft): the episode moves 1:1 (strength, remaining, applications, payload, history). */
  // The basic status payload a transfer keeps (Eclipse Theft: "No source ability uses, riders or flags transfer"; the shield pool,
  // remaining fraction, spent-save flag, magnitudes and history are the status itself).
  const BASIC_PAYLOAD = ['pool', 'remaining', 'fraction', 'saveSpent', 'fumbleSaves', 'clashPoolPct', 'pct', 'redirectPct', 'uncleansable', 'tickHp', 'tickPctMaxHp'];
  function transferStatus(from, to, src, abilityId, { reason = 'transferred', stripRiders = false } = {}) {
    if (!from.status || to.status) return false;
    const slot = { ...from.status, appliedThisUnit: false, freeze: from.status.freeze || 0 };
    if (stripRiders && slot.payload) slot.payload = Object.fromEntries(Object.entries(slot.payload).filter(([k]) => BASIC_PAYLOAD.includes(k)));
    removeStatus(from, src, abilityId, reason);
    to.status = slot;
    if (LOG) log('status', src, to, `${to.c.name} takes over ${from.c.name}'s ${NAME[slot.id]} (${slot.remaining} turn${slot.remaining === 1 ? '' : 's'}, ${slot.applications} of 3 applications)`, { status: slot.id, reason: reason, slot: slotView(slot), sourceId: src?.c.id ?? null, abilityId, from: from.c.id, stage: 'resolution' });
    callC('statusApplied', to, slotView(to.status));
    return true;
  }

  // ---- entry, knockout, replacement, revive
  function enter(x, reason) {
    x.side.active = x; x.active = true; x.entries += 1; x.entry = { reason, ex };
    if (LOG) log('enter', x, null, `${x.c.name} ${reason === 'opening' ? 'starts as the active fighter' : 'enters'} (${x.c.archetype}, ${x.c.type})`, { reason, hp: x.hp, maxHp: x.c.maxHp, archetype: x.c.archetype, type: x.c.type, first: x.entries === 1 });
    // Entry effects run at full strength (P8: "entry effects ... are unchanged"), for every entry reason.
    runDescriptors(hookList(callC('onEntry', x, { reason })), x.c.id, 'onEntry');
    if (probes.length) runDescriptors(hookList(probe('onEntry', x.c.id, { reason })), x.c.id, 'onEntry');
    for (const y of livingStable()) if (y !== x) callC('anyEntry', y, { id: x.c.id, reason, side: x.side.key });
  }
  function depart(x, reason) {
    x.active = false; if (x.side.active === x) x.side.active = null;
    x.p8pending = false; x.p8 = null; // PROVISIONAL 'p8-pending-cleared-on-departure'
    if (LOG) log('depart', x, null, `${x.c.name} goes to reserve`, { reason, status: x.status?.id ?? null, ...(x.status ? { paused: true } : {}) });
    callC('onDeparture', x, { reason });
    for (const y of livingStable()) if (y !== x) callC('anyDeparture', y, { id: x.c.id, reason, side: x.side.key });
  }
  function knockout(x, by) {
    if (x.koed) return;
    x.koSnapshot = { outgoing: clashEffect(x.status).outgoing, ex }; // "strength immediately before knockout" for the post-KO delayed impacts
    x.koed = true; x.active = false; x.hp = 0; koSeq += 1; x.koOrder = koSeq; lastKO = ex; x.p8pending = false; x.p8 = null; x.sigRestrict = null;
    if (x.side.active === x) x.side.active = null;
    if (by && by !== x) by.stats.kos += 1;
    const cleared = clearClocks(x, 'duration');
    const st = x.status; x.status = null; x.stunProtected = false;
    if (LOG) log('ko', by, x, `${x.c.name} is knocked out${by && by !== x ? ` by ${by.c.name}` : ''}`, { koOrder: x.koOrder, clearedClocks: cleared.map((k) => k.id), ...(st ? { clearedStatus: st.id } : {}) });
    callC('onKO', x, { by: by?.c.id ?? null });
    for (const y of livingStable()) callC('anyKO', y, { id: x.c.id, by: by?.c.id ?? null, side: x.side.key });
  }
  /** Second Spring (D18): the revived monster returns at the back of its lineup with `hp`; statuses were cleared at KO; cooldowns and once-flags stay. */
  function revive(x, hp, src, abilityId) {
    if (!x.koed) throw new Error(`${x.c.id} is not knocked out`);
    const side = x.side; side.line = [...side.line.filter((y) => y !== x), x]; side.line.forEach((y, i) => { y.slot = i; });
    x.koed = false; x.hp = Math.max(1, Math.min(x.c.maxHp, hp)); x.koOrder = null; x.entry = null;
    if (LOG) log('revive', src, x, `${src ? src.c.name : 'Revival'}: ${x.c.name} returns at ${x.hp} / ${x.c.maxHp} HP, at the back of the lineup`, { hp: x.hp, abilityId, stage: 'resolution', lineup: side.line.map((y) => y.c.id) });
    return x.hp;
  }
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
    if (!winner) { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; }
    return true;
  }
  const livingStable = () => stable().filter((x) => !x.koed);

  // ---- the damage pipeline (S3; B3 step 8; P6 3.4-3.13). Attack-kind tags: ATTACK_TAGS. D5: the Striker shield-break and Disruptor
  // pierce apply to ORDINARY attacks only; the Tank guard while the Tank is active. Explicit ability exceptions through spec.exceptions.
  let hitSeq = 0; let curHit = null; let curAttack = null; let attackSeq = 0;
  // Deferred reactions (Rubble Reprisal: "Finish the entire originating healing ability ... BEFORE reaction"): queued by a hook and run
  // when the outermost resolving step has finished (the end of the normal action, of the outermost strike, of a rotation, of a phase).
  const deferred = [];
  function flushDeferred() { while (deferred.length && !winner) { const d = deferred.shift(); const o = byId.get(d.ownerId); if (!o || o.koed) { if (LOG && o) log('cancelled', o, null, `${o.c.name}'s deferred ${d.abilityId} is cancelled (knocked out)`, { abilityId: d.abilityId, stage: 'cleanup', rule: 'B3 rule 2' }); continue; } d.fn(api, o.self); } }
  const isNormalAttack = (tag) => tag === 'ordinary' || tag === 'special';
  const label = (spec) => spec.label || (spec.tag === 'ordinary' ? 'attack' : spec.abilityId || spec.tag);
  const penaltyOf = (x, spec) => (isNormalAttack(spec?.tag ?? 'ordinary') || spec?.support ? x.p8?.factor ?? 1 : 1);
  /** Mitigation preview or application for one recipient (8d). */
  function mitigate(att, rec, raw, spec, commit, { noGuarded = false } = {}) {
    const ordinary = spec.tag === 'ordinary'; const ex_ = spec.exceptions || {};
    const type = typeFactor(att.c.type, rec.c.type);
    const pierce = ex_.pierce ?? (ordinary && att.c.perks.pierce);
    const guardOn = ex_.tankGuard ?? true;
    const guard = guardOn && rec.active && rec.c.perks.guard < 1 && !pierce ? rec.c.perks.guard : 1;
    const guarded = noGuarded ? 1 : clashEffect(rec.status).incoming;
    const mc = callC('mitigate', rec, { attacker: att.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null, raw });
    const mp = hookList(probe('mitigate', rec.c.id, { attacker: att.c.id, tag: spec.tag, raw }));
    const ab = [...hookList(mc), ...mp].reduce((k, m) => k * (m.factor ?? 1), 1);
    const capHp = [...hookList(mc), ...mp].reduce((k, m) => (m.capHp != null ? Math.min(k, m.capHp) : k), Infinity);
    let exact = raw * type * guard * guarded * ab; let shield = null;
    if (rec.status?.id === 'shielded' && rec.status.payload?.remaining > 0) {
      const rule = spec.shieldRule || {};
      if (rule.bypass) shield = { poolLoss: 0, broken: false, breakMult: 0, bypassed: true }; // Phase Strike: HP only, pool untouched
      else if (rule.mult) { // Iron Bite (G08): D budget, M multiplier; remove min(S, D*M) pool; HP budget max(0, D - S/M) once broken
        const D = exact, M = rule.mult, Spool = rec.status.payload.remaining; const poolLoss = Math.min(Spool, roundHalfUp(D * M));
        const broken = D * M >= Spool; const toHp = broken ? Math.max(0, D - Spool / M) : 0;
        shield = { poolLoss, broken, breakMult: M, ironBite: true };
        if (commit) rec.status = broken ? null : { ...rec.status, payload: { ...rec.status.payload, remaining: Spool - poolLoss, fraction: (Spool - poolLoss) / rec.status.payload.pool } };
        exact = toHp;
      } else {
        const br = ex_.shieldBreak ?? (ordinary ? att.c.perks.shieldBreak || 1 : 1);
        const r = absorb(rec.status, exact, br);
        shield = { poolLoss: r.poolLoss, broken: r.broken, breakMult: br };
        if (commit) rec.status = r.slot;
        exact = r.toHp;
      }
    }
    return { exact, type, guard, guarded, ab, capHp, shield, pierce: !!pierce && rec.c.perks.guard < 1 };
  }
  /**
   * One attack from `att` at `target`. spec: { tag, mult = 1, abilityId, strikeKey, label, hits = 1, undodgeable, exceptions, shieldRule,
   *   exception (B3 rule 3), suppressRetaliation (Daybreak Lance), noRetaliation, confusable, noConfusedRoll, normalAction }.
   * Returns the outcome: { decided, launched, cancelled, intercepted, missed (every hit), redirected, hits: [...], hpDamage, shieldDamage,
   *   kos, landed (any hit connected) }.
   */
  function strike(att, intended, spec = { tag: 'ordinary' }) {
    if (!ATTACK_TAGS.includes(spec.tag)) throw new Error(`Unknown attack tag ${spec.tag}`);
    if (spec.exception && !POST_KO_EXCEPTIONS[spec.exception]) throw new Error(`${spec.exception} is not an approved post-KO exception (B3 rule 3)`);
    const hits = spec.hits || 1; const normal = isNormalAttack(spec.tag);
    const out = { decided: false, launched: false, cancelled: false, intercepted: false, missed: false, redirected: false, hits: [], hpDamage: 0, shieldDamage: 0, kos: [], landed: false, tag: spec.tag, abilityId: spec.abilityId ?? null, attacker: att.c.id, target: intended.c.id };
    const prevAttack = curAttack;
    curAttack = { seq: ++attackSeq, attacker: att.c.id, owner: spec.commandedBy ?? att.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null, suppressRetaliation: !!spec.suppressRetaliation, noRetaliation: spec.noRetaliation ?? (spec.tag === 'reaction' || spec.tag === 'counter' || spec.tag === 'commanded'), extra: isExtraStrike(spec) };
    try {
      if (att.koed && !spec.exception) { if (LOG) log('cancelled', att, intended, `${att.c.name}'s ${label(spec)} is cancelled (knocked out)`, { rule: 'B3 rule 2', stage: 'cleanup', abilityId: spec.abilityId ?? null }); out.cancelled = true; out.decided = endCheck(); return out; }
      // 3.4 launch: a performed normal attack is counted here (performed-attack counters); costs and once-uses are the contract's own;
      // then launch accuracy (Snowbank Shot); then ONE Confused roll for the whole attack (eligible normal attacks; commanded attacks
      // roll their own ordinary chance, spec §10; reactions and counters never roll).
      if (normal && spec.normalAction !== false && att.inAction) att.performed += 1;
      const launch = callC('launch', att, { target: intended.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null }) ?? probeR('launch', att.c.id, { target: intended.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null });
      if (launch?.cancel) { if (LOG) log('launch_cancelled', att, intended, `${att.c.name}'s ${label(spec)} does not launch (${launch.reason || 'cancelled'})`, { reason: launch.reason || 'cancelled', abilityId: launch.abilityId ?? spec.abilityId ?? null, stage: 'resolution', unmet: launch.unmet || [{ condition: 'launch', detail: launch.reason || 'cancelled' }] }); out.cancelled = true; out.launched = true; out.missed = true; return out; }
      out.launched = true;
      let t = intended;
      const conf = (normal || spec.confusable) && !spec.noConfusedRoll ? clashEffect(att.status).confusedChance : 0;
      if (conf > 0) {
        const redirected = rng.chance(conf);
        if (LOG) log('confused_roll', att, redirected ? att : t, `${att.c.name} is Confused: ${redirected ? 'the attack turns on itself' : 'it attacks normally'}`, { chance: conf, redirected, intended: t.c.id });
        if (redirected) { t = att; out.redirected = true; }
      }
      out.target = t.c.id;
      for (let h = 1; h <= hits; h++) {
        if (att.koed && !spec.exception) { if (LOG) log('hits_cancelled', att, t, `${att.c.name}'s remaining hits are cancelled (knocked out)`, { remaining: hits - h + 1, rule: 'B3 rule 2' }); break; }
        if (h > 1 && (t.koed || (!t.active && t !== att))) { if (LOG) log('hits_cancelled', att, t, `${att.c.name}'s remaining hits are cancelled (target gone)`, { remaining: hits - h + 1, rule: 'multi-hit-target-ko (provisional)' }); break; }
        const r = oneHit(att, t, spec, h);
        out.hits.push(r); if (r.intercepted) out.intercepted = true;
        if (!r.missed && !r.intercepted) { out.landed = true; out.hpDamage += r.hpDamage; out.shieldDamage += r.shieldDamage; out.kos.push(...r.kos); }
        if (r.decided) { out.decided = true; return out; }
      }
      out.missed = out.hits.length > 0 && out.hits.every((r) => r.missed) && !out.intercepted;
      // once per attack: the whole-attack observers (counters, memories, heals), then the follow-ups (after the replacement entered)
      const info = { attackerId: att.c.id, targetId: t.c.id, intendedId: intended.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null, strikeKey: spec.strikeKey ?? null, hits: out.hits.map((r) => ({ targetId: r.targetId, loss: r.hpDamage, poolLoss: r.shieldDamage, missed: r.missed, intercepted: r.intercepted, koed: r.kos.length > 0, recipients: r.recipients, losses: r.losses, poolLosses: r.poolLosses, transferred: r.transferred, prevented: r.prevented })),
        hpDamage: out.hpDamage, shieldDamage: out.shieldDamage, allMissed: out.missed, landed: out.landed, redirected: out.redirected, kos: [...out.kos], retaliationAllowed: !(curAttack.suppressRetaliation || curAttack.noRetaliation), inAction: att.inAction, normal };
      if (!spec.noWholeAttackHooks) {
        const order = reactionOrder(out.hits.flatMap((r) => r.recipients.map((id) => byId.get(id))).filter(Boolean), att);
        for (const y of order) if (y.mod && !(y.koed && !(y.mod.abilityId in POST_KO_EXCEPTIONS))) { if (runDescriptors(hookList(callC('afterWholeAttack', y, info)), y.c.id, 'afterWholeAttack')) { out.decided = true; return out; } }
        if (settleHit()) { out.decided = true; return out; }
        for (const y of order) if (y.mod && !y.koed) { if (runDescriptors(hookList(callC('followUp', y, info)), y.c.id, 'followUp')) { out.decided = true; return out; } }
      }
      out.decided = endCheck();
      return out;
    } finally { curAttack = prevAttack; if (!curAttack) flushDeferred(); }
  }
  function oneHit(att, t, spec, hitNo) {
    const prevHit = curHit; curHit = { id: ++hitSeq, tag: spec.tag, attacker: att.c.id, abilityId: spec.abilityId ?? null, hitNo };
    const res = { targetId: t.c.id, missed: false, intercepted: false, hpDamage: 0, shieldDamage: 0, kos: [], recipients: [], losses: {}, poolLosses: {}, transferred: [], decided: false, prevented: 0 };
    try {
      const sideOf = t.side;
      // 3.5 interception (Stone Divide): asked of the target's side in lineup order, then probes
      const icpInfo = { attacker: att.c.id, owner: curAttack.owner, target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null, strikeKey: spec.strikeKey ?? null, extra: curAttack.extra, hitNo, attackSeq: curAttack.seq };
      const icp = firstC('intercept', lineupOrder(sideOf).filter((y) => !y.koed), icpInfo, (r) => r.intercepted) ?? probeR('intercept', t.c.id, icpInfo);
      if (icp?.intercepted) { if (LOG) log('intercepted', byId.get(icp.by) || null, att, `${att.c.name}'s ${label(spec)} is intercepted`, { stage: 'resolution', abilityId: icp.abilityId ?? null, by: icp.by ?? null, strike: spec.abilityId ?? spec.tag }); res.intercepted = true; return res; }
      // 3.6 explicit miss sources only (N7a, P10): the target's own sources; undodgeable attacks bypass them without a roll
      if (!spec.undodgeable) {
        const mi = { attacker: att.c.id, owner: curAttack.owner, tag: spec.tag, abilityId: spec.abilityId ?? null, hitNo, attackSeq: curAttack.seq, hits: spec.hits || 1 };
        const miss = callC('missCheck', t, mi) ?? probeR('missCheck', t.c.id, mi);
        if (miss?.miss) { if (LOG) log('miss', att, t, `${att.c.name}'s ${label(spec)} misses (${miss.source || 'explicit miss effect'})`, { source: miss.source ?? null, abilityId: miss.abilityId ?? null, stage: 'resolution' }); res.missed = true; res.decided = afterHit(att, t, spec, [], true); return res; }
      }
      // 8a raw damage once: ATK x mult x ramp x spread (variance hook: Gear Shot floor) x Weakened/Empowered (pre-KO snapshot for a
      //    knocked-out owner's delayed impact) x P8 x ability raw modifiers
      let spread = V.damage.spreadMin + rng.next() * (V.damage.spreadMax - V.damage.spreadMin);
      const varc = callC('variance', att, { tag: spec.tag, spread });
      if (varc?.floor != null) spread = Math.min(V.damage.spreadMax, Math.max(spread, varc.floor));
      const out = att.koed && att.koSnapshot ? att.koSnapshot.outgoing : clashEffect(att.status).outgoing;
      const p8 = penaltyOf(att, spec);
      const rmInfo = { target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null };
      const rawMods = [...hookList(callC('rawModifiers', att, rmInfo)), ...hookList(probe('rawModifiers', att.c.id, rmInfo))];
      const abRaw = rawMods.reduce((k, m) => k * (m.factor ?? 1), 1);
      const abAdd = rawMods.reduce((k, m) => k + (m.add ?? 0), 0); // an additive raw budget (Echo Strike's stored-hit bonus), before every defence
      const raw = att.c.atk * (spec.mult ?? 1) * ramp * spread * out * p8 * abRaw + abAdd;
      // attacker-side shield rule (Phase Strike bypass, Iron Bite multiplier)
      const sr = callC('shieldRule', att, { target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null });
      const hitSpec = sr ? { ...spec, shieldRule: sr } : spec;
      // 8b Emergency Cover: lethality predicted after the original target's defences, before any survival ability is spent
      let recipients = [{ x: t, raw }];
      const predicted = roundHalfUp(mitigate(att, t, raw, hitSpec, false).exact);
      const cvInfo = { attacker: att.c.id, target: t.c.id, raw, predicted, lethal: predicted >= t.hp, tag: spec.tag, abilityId: spec.abilityId ?? null };
      const cover = firstC('lethalRedirect', lineupOrder(sideOf).filter((y) => !y.koed && !y.active), cvInfo, (r) => r.to) ?? probeR('lethalRedirect', t.c.id, cvInfo);
      if (cover?.to) { const r = byId.get(cover.to); if (!r || r.koed) throw new Error(`lethalRedirect to ${cover.to}: not a living combatant`); if (LOG) log('redirect', r, t, `${r.c.name} takes the hit for ${t.c.name}`, { stage: 'activation', abilityId: cover.abilityId ?? null, predicted }); recipients = [{ x: r, raw }]; }
      // 8c Shared Burden raw split: the strongest available link (highest share; ties: earliest creation, then stable id)
      const spInfo = { attacker: att.c.id, target: recipients[0].x.c.id, raw, tag: spec.tag, abilityId: spec.abilityId ?? null };
      let split = null;
      if (!cover?.to) {
        const offers = lineupOrder(sideOf).filter((y) => !y.koed && !y.active).map((y) => { const r = callC('rawSplit', y, spInfo); return r?.to ? { ...r, by: y.c.id } : null; }).filter(Boolean);
        offers.sort((p, q) => q.pct - p.pct || (p.since ?? 0) - (q.since ?? 0) || p.by.localeCompare(q.by));
        split = offers[0] || probeR('rawSplit', recipients[0].x.c.id, spInfo);
      }
      if (split?.to) {
        const src = byId.get(split.to); if (!src || src.koed) throw new Error(`rawSplit to ${split.to}: not a living combatant`);
        const whole = roundHalfUp(raw); const sh = splitRaw(whole, split.pct);
        recipients = [{ x: recipients[0].x, raw: sh.target }, { x: src, raw: sh.source, transferred: true }];
        if (LOG) log('raw_split', src, recipients[0].x, `${src.c.name} shares ${sh.source} of ${whole}`, { stage: 'resolution', abilityId: split.abilityId ?? null, whole, sourceShare: sh.source, targetShare: sh.target, pct: split.pct, source: split.to });
      }
      const order = [recipients[0], ...recipients.slice(1).sort((p, q) => p.x.c.id.localeCompare(q.x.c.id))];
      const landed = [];
      for (const { x: rec, raw: rr, transferred } of order) {
        // 8d mitigation, then one rounding (D9); a per-hit cap (Tempered Guard) clamps the HP loss after the shield
        const unguarded = rec.status?.id === 'guarded' ? roundHalfUp(mitigate(att, rec, rr, hitSpec, false, { noGuarded: true }).exact) : null; // preview before the commit
        const m = mitigate(att, rec, rr, hitSpec, true);
        let loss = roundHalfUp(m.exact); let capped = false;
        if (m.capHp < loss && !transferred) { loss = Math.max(0, roundHalfUp(m.capHp)); capped = true; }
        const prevented = unguarded != null ? Math.max(0, unguarded - roundHalfUp(m.exact)) : 0; // HP damage the Guarded episode prevented (Fortress storage)
        // 8e pre-KO hook on every damage path (Last Root)
        if (loss >= rec.hp && rec.hp > 0) {
          const pkInfo = { attacker: att.c.id, loss, tag: spec.tag, abilityId: spec.abilityId ?? null };
          const pk = callC('preKO', rec, pkInfo) ?? probeR('preKO', rec.c.id, pkInfo);
          if (pk?.survive) { if (LOG) log('survive', rec, att, `${rec.c.name} holds on at 1 HP`, { stage: 'activation', abilityId: pk.abilityId ?? null, prevented: loss - (rec.hp - 1) }); loss = rec.hp - 1; }
        }
        // 8f HP loss and the immediate KO (B3 rule 1)
        const before = rec.hp; rec.hp = Math.max(0, rec.hp - loss);
        if (isNormalAttack(spec.tag) && rec === order[0].x) att.stats.attacks += 1;
        att.stats.dealt += before - rec.hp; rec.stats.taken += before - rec.hp;
        if (rec.side !== att.side) att.maxHitDealt = Math.max(att.maxHitDealt, before - rec.hp);
        if (LOG) {
          const sn = m.shield ? (m.shield.bypassed ? ', shield bypassed' : `, ${m.shield.poolLoss} absorbed by the shield${m.shield.broken ? ' (shield broken)' : ''}`) : '';
          log('damage', att, rec, `${att.c.name}'s ${label(spec)}: ${loss} damage${sn}${m.guard < 1 ? ' (Tank guard)' : ''}${m.guarded < 1 ? ' (Guarded)' : ''}${capped ? ' (hit cap)' : ''}${out !== 1 ? (out > 1 ? ' (Empowered)' : ' (Weakened)') : ''}${p8 !== 1 ? ' (entry penalty)' : ''}${rec === att ? ' (Confused: hits itself)' : ''}${m.type > 1 ? ' (type advantage)' : m.type < 1 ? ' (type disadvantage)' : ''}${transferred ? ' (transferred share)' : ''}`,
            { tag: spec.tag, damage: loss, raw: Math.round(rr * 100) / 100, hpBefore: before, hpAfter: rec.hp, type: typeEdge(att.c.type, rec.c.type), guard: m.guard < 1, pierce: m.pierce, stage: 'resolution',
              ...(spec.abilityId ? { abilityId: spec.abilityId } : {}), ...(spec.strikeKey ? { strikeKey: spec.strikeKey } : {}), ...(spec.mult != null && spec.mult !== 1 ? { mult: spec.mult } : {}), ...(out !== 1 ? { outgoing: out } : {}), ...(p8 !== 1 ? { penalty: p8 } : {}), ...(m.guarded !== 1 ? { guarded: m.guarded } : {}), ...(m.ab !== 1 ? { mitigation: m.ab } : {}), ...(capped ? { capped: true } : {}), ...(m.shield ? { shield: m.shield } : {}), ...(rec === att ? { redirected: true } : {}), ...(hitNo > 1 ? { hitNo } : {}), ...(transferred ? { transferred: true } : {}), ...(prevented ? { prevented } : {}) });
          if (m.shield?.broken) log('status_end', att, rec, `${rec.c.name}'s Shielded ends (shield broken)`, { status: 'shielded', reason: 'broken' });
        }
        if (m.shield?.broken) callC('statusEnded', rec, { id: 'shielded', reason: 'broken', sourceId: att.c.id, abilityId: spec.abilityId ?? null });
        landed.push({ x: rec, loss, poolLoss: m.shield?.poolLoss ?? 0, transferred: !!transferred, prevented });
        if (transferred) res.transferred.push(rec.c.id);
        const actual = before - rec.hp; // actual HP lost (no overkill)
        res.recipients.push(rec.c.id); res.losses[rec.c.id] = actual; res.poolLosses[rec.c.id] = m.shield?.poolLoss ?? 0; res.hpDamage += actual; res.shieldDamage += m.shield?.poolLoss ?? 0; res.prevented += prevented;
        if (rec.hp <= 0) { knockout(rec, att); res.kos.push(rec.c.id); }
      }
      res.decided = afterHit(att, t, spec, landed, false);
      return res;
    } finally { curHit = prevHit; }
  }
  /** Steps 3.9-3.12 after one hit: attached effects, reactions (no chains), after the whole hit, the replacement (B3 rule 4), probe follow-ups. */
  function afterHit(att, t, spec, landed, missed) {
    const info = { attacker: att.c.id, target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null, strikeKey: spec.strikeKey ?? null, missed, hitNo: curHit?.hitNo ?? 1, retaliationAllowed: !(curAttack?.suppressRetaliation || curAttack?.noRetaliation), landed: landed.map((l) => ({ id: l.x.c.id, loss: l.loss, poolLoss: l.poolLoss, koed: l.x.koed, transferred: l.transferred, prevented: l.prevented })) };
    // 3.9 attached effects through the shared gate (a blocked status never cancels the damage); the attacker's contract, then probes
    if (!missed) { if (runDescriptors(hookList(callC('attached', att, info)), att.c.id, 'attached')) return true; runDescriptors(hookList(probe('attached', att.c.id, info)), att.c.id, 'attached'); }
    const noChain = curAttack?.noRetaliation;
    // 3.10 reactions to that hit by every monster that has one (recipients first; a knocked-out recipient's reaction runs only under its
    //      post-KO exception); a reaction or counter strike never triggers reactions
    if (!noChain) {
      for (const y of reactionOrder(landed.map((l) => l.x), att)) { if (y.mod && (!y.koed || y.mod.abilityId in POST_KO_EXCEPTIONS)) if (runDescriptors(hookList(callC('reaction', y, info)), y.c.id, 'reaction')) return true; }
      if (probes.length) for (const y of reactionOrder(landed.map((l) => l.x), att)) runDescriptors(hookList(probe('reaction', y.c.id, info)), y.c.id, 'reaction');
      // 3.11 after the whole hit
      for (const y of reactionOrder(landed.map((l) => l.x), att)) { if (y.mod && !y.koed) if (runDescriptors(hookList(callC('afterWholeHit', y, info)), y.c.id, 'afterWholeHit')) return true; }
      if (probes.length) for (const y of reactionOrder(landed.map((l) => l.x), att)) runDescriptors(hookList(probe('afterWholeHit', y.c.id, info)), y.c.id, 'afterWholeHit');
    }
    // B3 rule 4: the replacement enters now, after every living monster's reactions and before the next hit or follow-up.
    if (settleHit()) return true;
    if (!noChain && probes.length) { for (const y of reactionOrder(landed.map((l) => l.x), att)) if (runDescriptors(hookList(probe('followUp', y.c.id, info)), y.c.id, 'followUp')) return true; }
    return endCheck();
  }
  /** Reactors in stable order: the hit's recipients first (in recipient order), then every other monster by stable ID. */
  function reactionOrder(first, att) { const rest = all().filter((y) => !first.includes(y)).sort((p, q) => p.c.id.localeCompare(q.c.id)); void att; return [...first, ...rest]; }
  /**
   * Run what a hook returned (descriptors are plain data; a contract that needs the real pipeline calls the api instead). B3 rule 2:
   * an owner knocked out before its item resolves has it cancelled unless it names a B3 rule 3 exception. Returns true when decided.
   */
  function runDescriptors(list, ownerId, hook) {
    for (const d of list) {
      if (!d || d.unmet) { if (d && !d.reported) reportUnmet(hook, d.owner ?? ownerId, d); continue; }
      if (!d.kind) continue; // a bare report ({ ok }) is not a descriptor
      const owner = byId.get(d.owner ?? ownerId);
      if (d.exception && !POST_KO_EXCEPTIONS[d.exception]) throw new Error(`${d.exception} is not an approved post-KO exception (B3 rule 3)`);
      if (owner.koed && !d.exception) { if (LOG) log('cancelled', owner, null, `${owner.c.name}'s ${d.abilityId || d.kind} is cancelled (knocked out)`, { hook, item: d.kind, abilityId: d.abilityId ?? null, rule: 'B3 rule 2', stage: 'cleanup' }); continue; }
      if (LOG && d.abilityId) log('ability', owner, null, `${owner.c.name}: ${d.abilityId} (${hook})`, { hook, abilityId: d.abilityId, stage: 'activation', ...(owner.koed ? { postKO: d.exception } : {}) });
      if (d.kind === 'strike') {
        const tgt = byId.get(d.target === 'attacker' ? curHit?.attacker : d.target);
        if (!tgt || tgt.koed) { if (LOG) log('cancelled', owner, tgt || null, `${owner.c.name}'s ${d.abilityId || 'strike'} has no target`, { hook, rule: 'no living target', stage: 'cleanup', unmet: [{ condition: 'living target' }] }); continue; }
        const r = strike(owner, tgt, { tag: d.tag || (hook === 'reaction' ? 'reaction' : hook === 'followUp' ? 'followUp' : 'counter'), mult: d.mult ?? 1, abilityId: d.abilityId ?? null, exceptions: d.exceptions, undodgeable: d.undodgeable, label: d.label, exception: d.exception, strikeKey: d.strikeKey });
        if (r.decided) return true;
      } else if (d.kind === 'status') { const { kind, owner: _o, exception, targetId, ...attempt } = d; const x = byId.get(targetId); if (x && !x.koed) applyStatus(x, { sourceId: owner.c.id, ...attempt }); }
      else if (d.kind === 'heal') heal(owner, byId.get(d.targetId), d);
      else if (d.kind === 'shield') grantShield(owner, byId.get(d.targetId), d);
      else if (d.kind === 'forcedRotation') { const tgt = d.side === 'own' ? owner.side : other(owner.side); forcedRotation(owner, tgt, { incoming: d.incoming, abilityId: d.abilityId ?? null }); if (settleHit()) return true; }
      else throw new Error(`Unknown hook descriptor ${d.kind}`);
    }
    return false;
  }

  // ---- healing, shields, transfers (D9: P8 x C6 x Healing Reduced multiply, rounded once; explicit floors keep 'floor')
  /** Heal `t` by pctMaxHp of its max HP (or `base` HP). Capped at missing HP. Returns { amount, budget (before the cap), exact }. */
  function heal(src, t, { pctMaxHp, base, rounding = 'halfUp', abilityId = null, support = true, kind = 'heal', penalty = null } = {}) {
    if (!t || t.koed) return { amount: 0, budget: 0, exact: 0 };
    const b = base ?? (t.c.maxHp * pctMaxHp) / 100;
    const pen = penalty ?? (src && src.inAction ? penaltyOf(src, { support }) : 1);
    const factors = [{ id: 'entry-penalty', factor: pen }, { id: 'stalemate-c6', factor: healMult }, { id: 'healing-reduced', factor: clashEffect(t.status).heal }].filter((f) => f.factor !== 1);
    const r = resolveAmount(b, factors, { rounding, max: t.c.maxHp - t.hp });
    const budget = resolveAmount(b, factors, { rounding }).amount;
    const before = t.hp; t.hp += r.amount;
    if (LOG) log('heal', src, t, `${src ? src.c.name : 'Healing'} heals ${t.c.name} ${r.amount}${factors.length ? ` (${factors.map((f) => f.id).join(', ')})` : ''}`, { amount: r.amount, exact: r.exact, budget, factors: r.factors, rounding, hpBefore: before, hpAfter: t.hp, abilityId, stage: 'resolution', healKind: kind });
    if (r.amount > 0) for (const y of livingStable()) callC('healed', y, { targetId: t.c.id, amount: r.amount, sourceId: src?.c.id ?? null, abilityId, kind });
    return { amount: r.amount, budget, exact: r.exact };
  }
  /** Grant Shielded with a pool of pctMaxHp of the recipient's max HP (or `pool` HP); P8 and C6 multiply, one rounding, through the gate. */
  function grantShield(src, t, { pctMaxHp, pool, duration, abilityId = null, support = true, payload = null, noFactors = false } = {}) {
    if (!t || t.koed) return false;
    const pen = src && src.inAction ? penaltyOf(src, { support }) : 1;
    // noFactors: the pool is an amount already factored once (Second Tide's surplus is the factored heal budget left over; D9 one rounding)
    const factors = noFactors ? [] : [{ id: 'entry-penalty', factor: pen }, { id: 'stalemate-c6', factor: healMult }].filter((f) => f.factor !== 1);
    const r = resolveAmount(pool ?? (t.c.maxHp * pctMaxHp) / 100, factors);
    if (r.amount < 1) { if (LOG) log('unmet', src, t, `${src ? src.c.name : 'Shield'}: the shield rounds to 0`, { unmet: [{ condition: 'positive shield pool', detail: r.exact }], abilityId, stage: 'trigger' }); return false; }
    return applyStatus(t, { id: 'shielded', strength: r.amount, duration, sourceId: src?.c.id ?? null, abilityId, ...(payload ? { payload } : {}) }).accepted;
  }
  function dotDamage(x, amount, extra) {
    let loss = amount;
    if (loss >= x.hp) { const pkInfo = { attacker: null, loss, tag: 'dot' }; const pk = callC('preKO', x, pkInfo) ?? probeR('preKO', x.c.id, pkInfo); if (pk?.survive) { if (LOG) log('survive', x, null, `${x.c.name} holds on at 1 HP`, { stage: 'activation', abilityId: pk.abilityId ?? null }); loss = x.hp - 1; } }
    const before = x.hp; x.hp = Math.max(0, x.hp - loss); x.stats.taken += before - x.hp;
    if (LOG) log('afflicted', null, x, `${x.c.name} suffers ${loss} from Afflicted`, { tag: 'dot', damage: loss, hpBefore: before, hpAfter: x.hp, ...extra });
    if (x.hp <= 0) { knockout(x, null); return true; }
    return false;
  }
  /** HP cost (Dragon Pounce): a resource debit, not damage; never below 1 HP; no shield or Guarded reduces it. */
  function hpCost(x, amount, abilityId) {
    const loss = Math.min(amount, Math.max(0, x.hp - 1)); const before = x.hp; x.hp -= loss;
    if (LOG) log('hp_cost', x, x, `${x.c.name} pays ${loss} HP`, { amount: loss, hpBefore: before, hpAfter: x.hp, abilityId, stage: 'resolution' });
    return loss;
  }
  /** Set HP directly (Root Communion apportionment, donations): logged with provenance; never below 1 or above max; not a heal event. */
  function setHp(x, hp, src, abilityId, why) {
    const nh = Math.max(1, Math.min(x.c.maxHp, hp)); const before = x.hp; x.hp = nh;
    if (LOG) log('hp_set', src, x, `${x.c.name}: ${before} -> ${nh} HP (${why})`, { hpBefore: before, hpAfter: nh, delta: nh - before, abilityId, stage: 'resolution', why });
    return nh - before;
  }
  const ordinaryAttack = (x, t) => strike(x, t, { tag: 'ordinary' });

  // ---- delayed impacts, constructs, schedules (S5 primitives; P9 diagnostics)
  const delayed = []; let delayedSeq = 0; const diag = { overflow: [], constructs: 0, schedules: { a: 0, b: 0 } };
  function diagnostic(kind, detail) { diag.overflow.push({ kind, ex, ...detail }); if (LOG) log('diagnostic', null, null, `P9 diagnostic: ${kind} over its threshold (${JSON.stringify(detail)})`, { kind, detail, stage: 'trigger' }); }
  /** Schedule a delayed impact for the end of exchange ex + after (default 1), marking the target side's active position (or lineup index). */
  function scheduleDelayed(owner, { abilityId, targetSide, targetId, after = 1, data = {} }) {
    const item = { id: ++delayedSeq, ownerId: owner.c.id, abilityId, side: targetSide, slot: 'active', launchTargetId: targetId, launchedEx: ex, impactEx: ex + after, data: { ...data } };
    delayed.push(item);
    const pending = delayed.filter((d) => d.ownerId[0] === owner.c.id[0]).length;
    if (pending > P9_CLASH_LIMITS.delayedPerSide) diagnostic('delayed impacts per side', { side: owner.side.key, pending });
    if (LOG) log('delayed_launch', owner, byId.get(targetId) || null, `${owner.c.name}: ${abilityId} is launched; impact at the end of exchange ${item.impactEx}`, { abilityId, impactEx: item.impactEx, slot: item.slot, stage: 'activation', delayedId: item.id });
    return item.id;
  }
  function resolveDelayed() {
    const due = delayed.filter((d) => d.impactEx <= ex); if (!due.length) return false;
    for (const item of due) {
      delayed.splice(delayed.indexOf(item), 1);
      const owner = byId.get(item.ownerId); const side = S[item.side];
      const occupant = item.slot === 'active' ? side.active : side.line[item.slot];
      const lt = byId.get(item.launchTargetId);
      const frozen = { occupantId: occupant && !occupant.koed ? occupant.c.id : null, launchTargetId: item.launchTargetId, launchTargetAlive: !!lt && !lt.koed, disputed: !!occupant && occupant.c.id !== item.launchTargetId, others: living(side).filter((y) => y !== occupant).map((y) => y.c.id) }; // front, then the rest front-to-back (lineup order)
      if (LOG) log('delayed_impact', owner, occupant || null, `${owner.c.name}'s ${item.abilityId} impacts${owner.koed ? ' (at its pre-KO strength)' : ''}`, { abilityId: item.abilityId, delayedId: item.id, occupant: frozen.occupantId, others: frozen.others, stage: 'resolution', postKO: owner.koed || undefined });
      callC('delayedImpact', owner, { ...item, frozen });
      if (winner) return true;
    }
    return !!winner;
  }

  // ---- signature restriction (Eye of the Storm): engine-owned; counts the target's normal turns, pauses in reserve
  function restrictSignature(target, turns, src, abilityId) {
    target.sigRestrict = { left: turns, by: src.c.id, abilityId, appliedInTurn: target.inTurn };
    if (LOG) log('signature_restricted', src, target, `${target.c.name} is restricted to ordinary attacks for ${turns} normal turn${turns === 1 ? '' : 's'}`, { abilityId, turns, stage: 'resolution' });
  }

  // ---- clocks: cooldowns (owner normal turns) with extension / reduction (Circuit Breaker, Fresh Start)
  function startClock(x, spec) { const k = addClock(x, spec); if (LOG) log('clock_start', x, x, `${x.c.name}: ${k.kind} ${k.id} starts (${k.left} normal turn${k.left === 1 ? '' : 's'})`, { clock: k.id, clockKind: k.kind, left: k.left, excluded: k.excludeTurn === x.turns && x.inTurn, abilityId: spec.source ?? null }); return k; }
  function adjustClock(x, clockId, delta, src, abilityId) {
    const k = x.clocks.find((c) => c.id === clockId); if (!k) return null;
    const before = k.left; k.left = Math.max(0, k.left + delta);
    if (LOG) log('clock_adjust', src, x, `${x.c.name}'s ${k.id} cooldown: ${before} -> ${k.left}`, { clock: k.id, before, after: k.left, abilityId, stage: 'resolution' });
    if (k.left <= 0) { x.clocks = x.clocks.filter((c) => c !== k); if (LOG) log('clock_end', x, x, `${x.c.name}: ${k.kind} ${k.id} ends (reduced to zero: readiness restored)`, { clock: k.id, clockKind: k.kind, turn: x.turns }); }
    return k.left;
  }

  // ---- the contract api (registry.js): what a hook may read and do. Views are plain snapshots; mutations go through the engine's
  //      primitives so every effect is logged with provenance and respects the gate, the pipeline and the P8 / C6 factors.
  let inStep = false;
  const step = (fn) => { const was = inStep; inStep = true; try { return fn(); } finally { inStep = was; if (!was && !curAttack) flushDeferred(); } };
  const viewOf = (x) => ({ id: x.c.id, name: x.c.name, side: x.side.key, slot: x.slot, species: x.c.species, type: x.c.type, archetype: x.c.archetype, basic: x.c.basic, hp: x.hp, maxHp: x.c.maxHp, atk: x.c.atk, spd: x.c.spd, active: x.active, koed: x.koed, koOrder: x.koOrder, turns: x.turns, inTurn: x.inTurn, stunProtected: x.stunProtected, entries: x.entries, entry: x.entry, performed: x.performed, status: x.status, abilityId: x.mod?.abilityId ?? null, stunned: clashEffect(x.status).stunned, able: !clashEffect(x.status).stunned || x.stunProtected, sigRestrict: x.sigRestrict ? { ...x.sigRestrict } : null, entryPenalty: x.p8?.factor ?? 1, clocks: x.clocks.map((k) => ({ id: k.id, kind: k.kind, left: k.left, source: k.source })) });
  const need = (id) => { const x = byId.get(id); if (!x) throw new Error(`No combatant ${id}`); return x; };
  const api = Object.freeze({
    ex: () => ex, phase: () => phase, flags: T8_FLAGS, limits: P9_CLASH_LIMITS,
    get: (id) => { const x = byId.get(id); return x ? viewOf(x) : null; },
    me: (self) => viewOf(need(self.id)),
    activeOf: (sideKey) => (S[sideKey].active ? viewOf(S[sideKey].active) : null),
    foe: (self) => { const f = other(need(self.id).side).active; return f ? viewOf(f) : null; },
    allies: (self) => living(need(self.id).side).map(viewOf),          // living, lineup order, self included
    reserves: (self) => reservesOf(need(self.id).side).map(viewOf),
    enemies: (self) => living(other(need(self.id).side)).map(viewOf),
    enemyReserves: (self) => reservesOf(other(need(self.id).side)).map(viewOf),
    lineup: (sideKey) => S[sideKey].line.map(viewOf),                  // whole lineup, knocked-out included
    typeFactor: (attId, defId) => typeFactor(need(attId).c.type, need(defId).c.type),
    ramp: () => ramp, healMult: () => healMult,
    rng: { chance: (p, self, label_) => { const r = rng.chance(p); if (LOG) log('roll', byId.get(self?.id) || null, null, `${self?.name ?? 'Roll'}: ${label_ || 'chance'} ${Math.round(p * 100)}% -> ${r ? 'success' : 'failure'}`, { chance: p, success: r, abilityId: self?.abilityId ?? null, stage: 'resolution' }); return r; }, next: () => rng.next() },
    log: (self, kind, text, extra = {}) => { if (LOG) log(kind, byId.get(self.id) || null, extra.targetId ? byId.get(extra.targetId) || null : null, text, { abilityId: self.abilityId, ...extra }); },
    /** The reviewer stream stages: trigger met, activation, resolution (engine events), cleanup. */
    trigger: (self, text, extra = {}) => { if (LOG) log('trigger', byId.get(self.id), extra.targetId ? byId.get(extra.targetId) || null : null, `${self.name}: ${self.abilityId} triggers (${text})`, { abilityId: self.abilityId, stage: 'trigger', ...extra }); },
    activate: (self, text, extra = {}) => { if (LOG) log('ability', byId.get(self.id), extra.targetId ? byId.get(extra.targetId) || null : null, `${self.name}: ${self.abilityId} activates (${text})`, { abilityId: self.abilityId, stage: 'activation', ...extra }); },
    cleanup: (self, text, extra = {}) => { if (LOG) log('cleanup', byId.get(self.id), extra.targetId ? byId.get(extra.targetId) || null : null, `${self.name}: ${self.abilityId} ${text}`, { abilityId: self.abilityId, stage: 'cleanup', ...extra }); },
    unmet: (self, conditions, extra = {}) => { reportUnmet(extra.hook || 'contract', self.id, { abilityId: self.abilityId, unmet: conditions.map((c) => (typeof c === 'string' ? { condition: c } : c)) }); return { unmet: conditions.map((c) => (typeof c === 'string' ? { condition: c } : c)), abilityId: self.abilityId, reported: true }; },
    /**
     * A decision that depends on an unruled point (flags.js PROVISIONAL_POINTS; owner ruling 2026-11-09 rule 1). Normal gameplay: logs
     * `unmet: awaiting ruling` and returns false (the caller does not activate; its use is preserved). Provisional mode: logs the
     * labelled reading and returns true.
     */
    provisional: (self, pointId, detail = '') => {
      const p = provisionalPoint(pointId); const x = byId.get(self.id) || null;
      if (PROV) { if (LOG) log('provisional', x, null, `${self.name}: ${self.abilityId} uses the PROVISIONAL reading ${pointId} (${p.reading})${detail ? `: ${detail}` : ''}`, { abilityId: self.abilityId, point: pointId, provisional: true, stage: 'activation', waitsOn: p.waitsOn }); return true; }
      reportUnmet('provisional', self.id, { abilityId: self.abilityId, unmet: [{ condition: 'awaiting ruling', point: pointId, waitsOn: p.waitsOn, detail }] });
      return false;
    },
    provisionalMode: () => PROV,
    /** D5: would the ordinary-only perk change this hit? (a Striker against a Shielded target; a Disruptor against an active Tank) */
    perkDecisive: (self, foeId) => { const me = need(self.id); const f = foeId ? byId.get(foeId) : null; if (!f) return false; return (me.c.perks.shieldBreak > 1 && f.status?.id === 'shielded' && f.status.payload?.remaining > 0) || (me.c.perks.pierce && f.active && f.c.perks.guard < 1); },
    /** Mastery execution record (spec §6): one credit per valid execution; a passive at most once per cap scope (this battle). */
    executed: (self, { passive = false } = {}) => { const x = need(self.id); if (passive) { if (x.passiveCredited) return false; x.passiveCredited = true; } x.executions += 1; if (LOG) log('execution', x, null, `${x.c.name}: ${self.abilityId} execution recorded${passive ? ' (passive, once per battle)' : ''} (${x.executions})`, { abilityId: self.abilityId, executions: x.executions, passive }); return true; },
    // statuses
    applyStatus: (self, targetId, attempt) => applyStatus(need(targetId), { sourceId: self.id, abilityId: self.abilityId, ...attempt }),
    applyStatuses: (self, attempts) => applyStatusBatch(attempts.map((t) => ({ sourceId: self.id, abilityId: self.abilityId, ...t }))),
    cleanse: (self, targetId) => cleanse(need(targetId), self.id, self.abilityId),
    replaceStatus: (self, targetId, attempt, opts) => replaceStatus(need(targetId), { sourceId: self.id, abilityId: self.abilityId, ...attempt }, opts),
    removeStatus: (self, targetId, reason) => removeStatus(need(targetId), need(self.id), self.abilityId, reason || 'removed'),
    transferStatus: (self, fromId, toId, opts) => transferStatus(need(fromId), need(toId), need(self.id), self.abilityId, opts),
    setFreeze: (self, targetId, turns) => { const x = need(targetId); if (!x.status || STATUS[x.status.id].kind !== 'harmful') return false; x.status = { ...x.status, freeze: turns }; if (LOG) log('status_freeze', byId.get(self.id), x, `${x.c.name}'s ${NAME[x.status.id]} countdown is frozen for ${turns} normal turn${turns === 1 ? '' : 's'}`, { status: x.status.id, freeze: turns, abilityId: self.abilityId, stage: 'resolution' }); return true; },
    holdStatusTick: (self, targetId) => { const x = need(targetId); if (x.status) x.status = { ...x.status, appliedThisUnit: true }; }, // Lightning Rod: no second decrement this turn
    decrementStatus: (self, targetId) => { const x = need(targetId); if (!x.status) return null; const r = statusEndOfTurn({ ...x.status, appliedThisUnit: false }); if (r.slot) x.status = r.slot; else clearStatus(x, 'expired', { abilityId: self.abilityId }); if (LOG && r.slot) log('status_tick', byId.get(self.id), x, `${x.c.name}'s ${NAME[x.status.id]} loses one turn (${x.status.remaining} left)`, { status: x.status.id, remaining: x.status.remaining, abilityId: self.abilityId }); return x.status; },
    // HP
    heal: (self, targetId, opts) => heal(need(self.id), need(targetId), { abilityId: self.abilityId, ...opts }),
    shield: (self, targetId, opts) => grantShield(need(self.id), need(targetId), { abilityId: self.abilityId, ...opts }),
    hpCost: (self, amount) => hpCost(need(self.id), amount, self.abilityId),
    /** An HP restoration that is not a heal() (Mind Mend's credit) raises the healed hook for the reactors (T8_PROVISIONAL healed-hook-kinds). */
    notifyHealed: (self, targetId, amount, kind) => { if (amount > 0) for (const y of livingStable()) callC('healed', y, { targetId, amount, sourceId: self.id, abilityId: self.abilityId, kind }); },
    healFactor: (targetId) => clashEffect(need(targetId).status).heal,
    setHp: (self, targetId, hp, why) => setHp(need(targetId), hp, need(self.id), self.abilityId, why),
    revive: (self, targetId, hp) => revive(need(targetId), hp, need(self.id), self.abilityId),
    // strikes (the real pipeline). From a reaction context, a non-attacker's strike is refused while retaliation is suppressed.
    strike: (self, targetId, spec) => {
      const att = need(self.id); const tgt = need(targetId);
      if (curAttack && att.c.id !== curAttack.attacker && (curAttack.suppressRetaliation || curAttack.noRetaliation)) { reportUnmet('reaction', self.id, { abilityId: self.abilityId, unmet: [{ condition: 'retaliation allowed', detail: curAttack.suppressRetaliation ? 'attack retaliation is suppressed by the triggering strike' : `a ${curAttack.tag} strike triggers no reactions` }] }); return { suppressed: true, launched: false, landed: false, missed: false, hits: [], hpDamage: 0, shieldDamage: 0, kos: [], decided: false }; }
      if (tgt.koed) { reportUnmet('strike', self.id, { abilityId: self.abilityId, unmet: [{ condition: 'living target', detail: targetId }] }); return { launched: false, landed: false, missed: false, hits: [], hpDamage: 0, shieldDamage: 0, kos: [], decided: endCheck() }; }
      return strike(att, tgt, { abilityId: self.abilityId, ...spec });
    },
    /** A strike by another monster on this contract's behalf (commanded / assist attacks): the attacker is `attackerId`. */
    commandStrike: (self, attackerId, targetId, spec) => { const att = need(attackerId); const tgt = need(targetId); if (att.koed || tgt.koed) return { launched: false, landed: false, missed: false, hits: [], hpDamage: 0, shieldDamage: 0, kos: [], decided: endCheck() }; return strike(att, tgt, { abilityId: self.abilityId, normalAction: false, commandedBy: self.id, ...spec }); },
    // lineup and rotation
    forcedRotation: (self, sideKey, opts) => forcedRotation(need(self.id), S[sideKey], { abilityId: self.abilityId, ...opts }),
    /**
     * Queue a voluntary rotation to execute at the next legal rotation phase (Cinder Clamp's delayed request; its owner's KO releases
     * it). It runs before that phase's requests, cannot be delayed again, and waits while it is not legal.
     */
    queueRotation: (self, sideKey, outId, incomingId) => { queuedRotations.push({ side: sideKey, outId, inId: incomingId, abilityId: self.abilityId }); if (LOG) log('rotation_queued', byId.get(self.id), byId.get(outId), `${byId.get(outId).c.name}'s delayed rotation is released for the next legal rotation phase`, { abilityId: self.abilityId, stage: 'resolution' }); },
    /** Would a forced rotation of this side be legal now? { legal, unmet } (no lock check for immunity: the attempt reports it) */
    forcedLegality: (sideKey) => { const side = S[sideKey]; const unmet = []; if (!side.active) unmet.push({ condition: 'active monster' }); if (!reservesOf(side).length) unmet.push({ condition: 'living reserve' }); if (ex - side.lastForced < FORCED_EVERY) unmet.push({ condition: 'forced-rotation pacing' }); if (side.active && side.active.entry?.ex === ex) unmet.push({ condition: 'just-entered protection' }); if (!unmet.length) { const lk = lockOf(side.active, true); if (lk) unmet.push({ condition: 'rotation lock or immunity', detail: lk.reason || 'locked' }); } return { legal: !unmet.length, unmet }; },
    /** Is a voluntary rotation legal for this side now (cadence, a living reserve, no lock)? { legal, unmet } */
    rotationLegality: (sideKey) => { const L = voluntaryLegality(S[sideKey]); return { legal: L.legal, unmet: L.unmet }; },
    /**
     * Feather Relay (D3 as reconciled 2026-11-09): a rotation at the team's normal action opportunity, keeping the locks, legal
     * availability and the cadence, WITHOUT the P8 entry penalty. Reason 'relay' is passed to every rotation hook. Returns
     * { rotated, decided, unmet }.
     */
    teamRotation: (self, sideKey, incomingId) => {
      const side = S[sideKey]; const L = voluntaryLegality(side); if (!L.legal) return { rotated: false, decided: false, unmet: L.unmet };
      const inc = byId.get(incomingId); if (!inc || inc.koed || inc.active || inc.side !== side) return { rotated: false, decided: false, unmet: [{ condition: 'incoming is a living reserve', detail: incomingId }] };
      const out = side.active; const decided = executeRotation(side, inc, 'relay', { reason: 'relay', penalty: false, abilityId: self.abilityId });
      const rotated = !out.koed && !out.active && inc.active; // a departing ally knocked out before it leaves (Riptide Pursuit) is a failed rotation
      return { rotated, decided, unmet: rotated ? [] : [{ condition: 'the rotation completed', detail: out.koed ? `${out.c.name} was knocked out before departing` : 'not completed' }] };
    },
    // delayed impacts, constructs, schedules
    delay: (self, opts) => scheduleDelayed(need(self.id), { abilityId: self.abilityId, ...opts }),
    pendingDelayed: () => delayed.map((d) => ({ ...d })),
    construct: (self, delta) => { diag.constructs += delta; if (diag.constructs > P9_CLASH_LIMITS.constructsPerBattle) diagnostic('Twin Thunder constructs per battle', { constructs: diag.constructs }); },
    schedule: (self, delta) => { const k = need(self.id).side.key; diag.schedules[k] += delta; if (diag.schedules[k] > P9_CLASH_LIMITS.dawnSongSchedulesPerSide(S[k].line.length)) diagnostic('Dawn Song schedules per side', { side: k, schedules: diag.schedules[k] }); },
    restrictSignature: (self, targetId, turns) => restrictSignature(need(targetId), turns, need(self.id), self.abilityId),
    // clocks and ledgers
    cooldown: (self, turns, id) => startClock(need(self.id), { id: id || self.abilityId, kind: 'cooldown', turns, source: self.abilityId }).left,
    ready: (self, id) => !need(self.id).clocks.some((k) => k.id === (id || self.abilityId)),
    cooldownLeft: (self, id) => need(self.id).clocks.find((k) => k.id === (id || self.abilityId))?.left ?? 0,
    cooldownsOf: (id) => need(id).clocks.filter((k) => k.kind === 'cooldown').map((k) => ({ id: k.id, left: k.left, source: k.source })),
    adjustCooldown: (self, holderId, clockId, delta) => adjustClock(need(holderId), clockId, delta, need(self.id), self.abilityId),
    durationClock: (self, holderId, turns, id) => startClock(need(holderId), { id, kind: 'duration', turns, source: self.abilityId }).left,
    clockLeft: (holderId, id) => need(holderId).clocks.find((k) => k.id === id)?.left ?? 0,
    stateOf: (id) => need(id).ab, // another monster's ability state (read-only by convention; used by the reviewer and interactions)
    curAttack: () => (curAttack ? { ...curAttack } : null),
    /** Queue a reaction to run after the originating step has finished (Rubble Reprisal). */
    defer: (self, fn) => { deferred.push({ ownerId: self.id, abilityId: self.abilityId, fn }); if (!curAttack && !inStep) flushDeferred(); },
  });

  // ---- rotation (S4; P8; R5; D1, D2)
  const CADENCE = ROTATION_CADENCE_EXCHANGES;
  const queuedRotations = [];
  const FORCED_EVERY = L_SWAPS.forcedEvery;
  function lockOf(x, forced) {
    for (const y of livingStable()) { const r = callC('rotationLock', y, { activeId: x.c.id, forced }); if (r?.locked) return { ...r, by: y.c.id }; }
    if (!probes.length) return null;
    for (const y of stable()) { const r = probe('rotationLock', y.c.id, { activeId: x.c.id, forced }); if (r?.locked) return { ...r, by: y.c.id }; }
    return null;
  }
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
  const rotHooks = (hook, info) => { for (const y of livingStable()) { const r = callC(hook, y, info); if (r) return { ...r, by: y.c.id }; } return null; };
  function executeRotation(side, incoming, by, { reason = 'voluntary', penalty = true, abilityId = null, skipDelay = false } = {}) {
    const out = side.active; if (!out || out.koed || incoming.koed || incoming.active) return false;
    const info = { side: side.key, out: out.c.id, in: incoming.c.id, reason };
    // 1. Cinder Clamp's delay check
    const dl = skipDelay ? null : rotHooks('rotationDelay', info) ?? (probes.length ? (() => { for (const y of stable()) { const r = probe('rotationDelay', y.c.id, info); if (r?.delay) return { ...r, by: y.c.id }; } return null; })() : null);
    if (dl?.delay) { if (LOG) log('rotation_delayed', out, incoming, `${out.c.name}'s rotation is delayed`, { abilityId: dl.abilityId ?? null, by: dl.by, stage: 'activation', unmet: [{ condition: 'not delayed', abilityId: dl.abilityId ?? null }] }); return false; }
    // 2. Riptide Pursuit's hit on the departing monster; 3. Shell Harvest cash-out
    for (const hook of ['pursuit', 'cashOut']) {
      for (const y of livingStable()) { if (runDescriptors(hookList(callC(hook, y, info)), y.c.id, hook)) return true; if (winner) return true; }
      if (probes.length) for (const y of stable()) if (runDescriptors(hookList(probe(hook, y.c.id, info)), y.c.id, hook)) return true;
    }
    if (out.koed) { if (LOG) log('rotation_cancelled', out, incoming, `${out.c.name} is knocked out before it can rotate`, { rule: 'B3 rule 4: ordinary replacement' }); return settleHit(); }
    // 4. departure; 5. the entrant's entry effects (in enter); 6. Cold Welcome and Downdraft on the entrant
    side.lastVoluntary = ex; side.rotations += 1;
    if (LOG) log('rotation', out, incoming, `${by === 'manual' ? 'Your call' : by === 'relay' ? 'Feather Relay' : by === 'delayed' ? 'Delayed request' : 'AI'}: ${out.c.name} rotates out for ${incoming.c.name}${penalty ? '' : ' (no entry penalty)'}`, { side: side.key, voluntary: reason === 'voluntary', reason, out: out.c.id, in: incoming.c.id, by, ...(abilityId ? { abilityId, stage: 'resolution' } : {}), ...(penalty ? {} : { noPenalty: true }) });
    depart(out, reason); enter(incoming, reason); if (penalty) incoming.p8pending = true;
    const ar = { side: side.key, in: incoming.c.id, out: out.c.id, reason };
    for (const y of livingStable()) if (runDescriptors(hookList(callC('arrival', y, ar)), y.c.id, 'arrival')) return true;
    if (probes.length) for (const y of stable()) if (runDescriptors(hookList(probe('arrival', y.c.id, ar)), y.c.id, 'arrival')) return true;
    return settleHit();
  }
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
    const ar = { side: side.key, in: inc.c.id, out: out.c.id, reason: 'forced' };
    for (const y of livingStable()) runDescriptors(hookList(callC('arrival', y, ar)), y.c.id, 'arrival');
    return true;
  }

  // ---- one normal turn (P6 step 3). Returns true when the battle is decided.
  /** One normal turn as one resolving step: deferred reactions run when the whole turn (action and end of turn) has finished. */
  function takeTurn(x) { const d = step(() => takeTurnInner(x)); return d || endCheck(); }
  function takeTurnInner(x) {
    x.turns += 1; x.inTurn = true; phase = 'turn'; turnIndex += 1;
    if (LOG) log('turn_start', x, null, `${x.c.name}'s turn ${x.turns}`, { turn: x.turns });
    callC('turnStart', x); probe('turnStart', x.c.id);
    // The Stunned check (P6 3.2; STA-01; D4): see M4_STATUS.md "D4". A skipped turn still counts as a normal turn.
    let hold = false; let stunnedSkip = false;
    if (clashEffect(x.status).stunned) {
      if (x.stunProtected) { hold = true; if (LOG) log('stun_safeguard', x, null, `${x.c.name} is Stunned but cannot lose two turns in a row: it acts (${x.status.remaining} turn${x.status.remaining === 1 ? '' : 's'} of Stunned kept)`, { turn: x.turns, remaining: x.status.remaining }); }
      else stunnedSkip = true;
    }
    x.stunProtected = false;
    if (x.p8pending) {
      const pen = rotationEntryPenalty({ firstAfterVoluntaryRotation: true, stunnedSkip }); x.p8pending = false; x.p8 = { factor: pen.factor };
      if (LOG) log('entry_penalty', x, null, stunnedSkip ? `${x.c.name}'s entry penalty is spent by the Stunned skip` : `${x.c.name} acts at half strength (first turn after rotating in)`, { factor: pen.factor, spentBy: stunnedSkip ? 'stunned skip' : 'turn' });
    }
    let done = false;
    if (stunnedSkip) {
      x.skips += 1; x.consecutiveSkips += 1; x.stunnedSkips += 1; x.stunProtected = true;
      if (LOG) log('skip', x, null, `${x.c.name} is Stunned and skips its turn`, { turn: x.turns, cause: 'stunned', remaining: x.status.remaining });
      callC('stunnedSkip', x, { turn: x.turns });
    } else {
      // The team action opportunity (Feather Relay, left unmet) before the active chooses: reserves in lineup order.
      let teamActed = false;
      for (const y of reservesOf(x.side)) { const r = callC('teamAction', y, { activeId: x.c.id }); if (r?.run) { const tr = r.run(api, y.self) || {}; if (tr.acted) { teamActed = true; done = !!tr.decided; if (LOG) log('team_action', y, x, `${y.c.name}'s ${y.mod.abilityId} took the team's normal action: no normal attack for the team this turn`, { abilityId: y.mod.abilityId, stage: 'cleanup' }); break; } } }
      if (!teamActed && (x.koed || !x.active)) { teamActed = true; done = endCheck(); } // the active ally is gone (a failed relay): its turn ends
      // Signature restriction (Eye of the Storm): a restricted active uses the ordinary attack instead of its ready, repeatable signature;
      // its contract is not asked, so nothing is spent. Passives, entry effects, reactions and once-per-Clash casts are not restricted.
      const restricted = !!x.sigRestrict && x.mod && restrictable(x.mod.abilityId);
      let choice = null;
      if (!done && !teamActed) {
        if (restricted) { if (LOG) log('signature_restricted', x, null, `${x.c.name} must use an ordinary attack (${x.sigRestrict.abilityId})`, { abilityId: x.sigRestrict.abilityId, restricted: x.mod.abilityId, stage: 'resolution', left: x.sigRestrict.left }); }
        else choice = callC('chooseAction', x, { foeId: other(x.side).active?.c.id ?? null, restricted: !!x.sigRestrict });
        if (choice == null) choice = probe('chooseAction', x.c.id);
      }
      if (teamActed) { /* the team's normal action was used by a reserve support action (Feather Relay) */ }
      else if (!done && choice?.kind === 'skip') { x.skips += 1; x.consecutiveSkips += 1; if (LOG) log('skip', x, null, `${x.c.name}'s turn is skipped`, { turn: x.turns }); }
      else if (!done) {
        x.consecutiveSkips = 0; x.inAction = true;
        const foe = other(x.side).active;
        const wasStep = inStep; inStep = true;
        try {
          if (choice?.kind === 'done') { /* the contract performed the normal action itself (a launch, a link, a cast) */ }
          else if (choice?.kind === 'run') done = !!choice.run(api, x.self);
          else if (choice?.kind === 'attack') { if (foe) done = strike(x, foe, { tag: choice.tag || 'special', mult: choice.mult ?? 1, abilityId: choice.abilityId ?? x.mod?.abilityId ?? null, strikeKey: choice.strikeKey, hits: choice.hits, undodgeable: choice.undodgeable, exceptions: choice.exceptions, label: choice.label, suppressRetaliation: choice.suppressRetaliation }).decided; }
          else if (choice?.kind === 'heal') heal(x, byId.get(choice.targetId ?? x.c.id), choice);
          else if (choice?.kind === 'shield') grantShield(x, byId.get(choice.targetId ?? x.c.id), choice);
          else if (choice?.kind === 'forcedRotation') { forcedRotation(x, choice.side === 'own' ? x.side : other(x.side), { incoming: choice.incoming, abilityId: choice.abilityId ?? null }); done = endCheck(); }
          else if (foe) done = ordinaryAttack(x, foe).decided;
        } finally { x.inAction = false; inStep = wasStep; }
        if (!curAttack) flushDeferred(); if (!done) done = endCheck(); // reactions to the action (Rubble Reprisal) run once the whole action has resolved, before the end of turn
      }
    }
    // End of turn (P6 step 3.14; B3 rule 5). Order: Afflicted damage (not on the application turn); the countdowns (status, then clocks).
    if (!x.koed && !done) {
      phase = 'end_of_turn';
      const tick = x.status && !x.status.appliedThisUnit ? afflictedTick(x.status, x.c.maxHp) : 0;
      if (tick > 0 && dotDamage(x, tick, { sourceId: x.status.sourceId ?? null, abilityId: x.status.abilityId ?? null })) done = settleHit();
    }
    if (!x.koed) {
      phase = 'end_of_turn';
      if (!done) step(() => callC('endOfTurn', x));
      if (x.status) {
        const id = x.status.id; const r = statusEndOfTurn(x.status, { hold });
        if (r.held && LOG) log('status_hold', x, x, `${x.c.name}'s Stunned is held this turn (${x.status.remaining} left)`, { status: id, remaining: x.status.remaining, reason: 'D4 protected turn' });
        if (r.froze && LOG) log('status_freeze', x, x, `${x.c.name}'s ${NAME[id]} countdown is frozen (${r.slot.freeze} freeze turn${r.slot.freeze === 1 ? '' : 's'} left)`, { status: id, freeze: r.slot.freeze });
        if (r.slot) x.status = r.slot; else clearStatus(x, 'expired');
      }
      if (x.sigRestrict) { if (x.sigRestrict.appliedInTurn) x.sigRestrict.appliedInTurn = false; else { x.sigRestrict.left -= 1; if (x.sigRestrict.left <= 0) { if (LOG) log('signature_restriction_end', x, x, `${x.c.name} may use its signature again`, { abilityId: x.sigRestrict.abilityId, stage: 'cleanup' }); x.sigRestrict = null; } } }
      for (const k of tickClocks(x)) if (LOG) log('clock_end', x, x, `${x.c.name}: ${k.kind} ${k.id} ends`, { clock: k.id, clockKind: k.kind, turn: x.turns, abilityId: k.source ?? null });
      probe('endOfTurn', x.c.id);
      for (const y of livingStable()) callC('anyEndOfTurn', y, { id: x.c.id, side: x.side.key });
    }
    x.p8 = null; x.inTurn = false;
    return done || endCheck();
  }

  function healMultiplier() { if (ex < C6.from) return 1; const quiet = ex - lastKO; if (quiet >= C6.quarterAfter) return C6.quarter; if (quiet >= C6.halfAfter) return C6.half; return 1; }

  // ---- opening
  if (LOG) events.push({ seq: 0, ex: 0, phase, turnIndex: 0, hit: null, kind: 'start', text: `Beast Clash (t8): ${a.length} v ${b.length}. Sudden death Model ${model} from exchange ${sdFrom}.`, model, ruleset: V.ruleset, abilities: ABILITIES });
  if (carryIn) for (const [mid, slot] of Object.entries(carryIn)) {
    const x = all().find((y) => y.c.monsterId === mid); if (!x) throw new Error(`carryIn names ${mid}, who is not in this battle`);
    const t = slot ? fromFootball(slot, x.c.maxHp) : null; x.status = t;
    if (LOG) log(t ? 'status_carry' : 'status_end', null, x, t ? `${x.c.name} carries ${NAME[t.id]} into the Clash (${t.remaining} turn${t.remaining === 1 ? '' : 's'}${t.id === 'shielded' ? `, ${t.payload.remaining} shield` : ''})` : `${x.c.name}'s ${NAME[slot?.id] || 'status'} clears on entering the Clash`, { status: slot?.id ?? null, slot: slotView(t), reason: t ? 'carry in' : 'unsupported in Clash' });
  }
  if (stage) for (const [id, st] of Object.entries(stage)) {
    const x = byId.get(id); if (!x) throw new Error(`stage names ${id}, who is not in this battle`);
    for (const k of Object.keys(st)) if (!['hp', 'status', 'ability'].includes(k)) throw new Error(`Unknown stage field ${k}`);
    if (st.hp != null) { if (!Number.isInteger(st.hp) || st.hp < 1 || st.hp > x.c.maxHp) throw new Error(`Staged HP for ${id} must be a whole number in 1..${x.c.maxHp}`); x.hp = st.hp; if (LOG) log('stage', null, x, `Staged: ${x.c.name} at ${st.hp} / ${x.c.maxHp} HP`, { staged: true, hp: st.hp }); }
    if (st.status) { const r = applyStatus(x, { sourceId: 'stage', ...st.status }); if (LOG) log('stage', null, x, `Staged: ${NAME[st.status.id]} ${r.accepted ? 'applied' : `refused (${r.reason})`}`, { staged: true, status: st.status.id, accepted: r.accepted }); }
    if (st.ability) { if (!x.ab) throw new Error(`stage.${id}.ability: ${x.c.name} has no Clash contract`); for (const k of Object.keys(st.ability)) if (!(k in x.ab)) throw new Error(`stage.${id}.ability.${k} is not a field of ${x.mod.abilityId}'s state`); Object.assign(x.ab, structuredClone(st.ability)); if (LOG) log('stage', null, x, `Staged (controlled prerequisite): ${x.mod.abilityId} state ${JSON.stringify(st.ability)}`, { staged: true, controlled: true, abilityId: x.mod.abilityId, ability: structuredClone(st.ability) }); }
  }
  for (const side of [S.a, S.b]) enter(side.line[0], 'opening');

  // ---- the exchange loop (P6 "Beast Clash exchange", B3)
  let stopped = null;
  if (stopAt != null && (!Number.isInteger(stopAt.exchange) || stopAt.exchange < 1 || (stopAt.turn != null && ![1, 2].includes(stopAt.turn)))) throw new Error('stopAt needs { exchange >= 1, turn? 1 | 2 }');
  while (ex < V.battle.exchangeCap && !winner) {
    ex += 1; ramp = rampFor(model, ex, sdFrom); healMult = healMultiplier();
    // 1. Round start: reserve windows (every living monster in stable lineup order: side A then side B, lineup order). Reserves are
    //    inert unless a contract's roundStart acts (Eclipse Call).
    phase = 'round_start';
    if (LOG) { if (ramp > 1) log('sudden_death', null, null, `Sudden death: damage x${ramp.toFixed(2)}`, { ramp }); log('round_start', null, null, `Exchange ${ex}`, { reserves: { a: living(S.a).filter((x) => !x.active).map((x) => x.c.id), b: living(S.b).filter((x) => !x.active).map((x) => x.c.id) } }); }
    step(() => { for (const y of [...living(S.a), ...living(S.b)]) callC('roundStart', y); });
    probe('roundStart');
    if (winner) break;
    // 2. Initiative: explicit interrupts, then priority, then speed, then the seeded tie; then the reserve pre-initiative opening
    //    (Second Wind advances the active ally's existing action).
    phase = 'initiative';
    const fa = S.a.active, fb = S.b.active;
    const tier = (x) => { const t = callC('initiative', x) || probe('initiative', x.c.id) || {}; return { interrupt: t.interrupt || 0, priority: t.priority || 0 }; };
    const ta = tier(fa), tb = tier(fb);
    let order, why;
    if (ta.interrupt !== tb.interrupt) { order = ta.interrupt > tb.interrupt ? [fa, fb] : [fb, fa]; why = 'interrupt'; }
    else if (ta.priority !== tb.priority) { order = ta.priority > tb.priority ? [fa, fb] : [fb, fa]; why = 'priority'; }
    else {
      const sa = fa.c.spd * clashEffect(fa.status).initiative, sb = fb.c.spd * clashEffect(fb.status).initiative;
      if (Math.abs(sa - sb) < V.damage.initiativeTie) { order = rng.chance(0.5) ? [fa, fb] : [fb, fa]; why = 'coin'; }
      else { order = sa > sb ? [fa, fb] : [fb, fa]; why = 'speed'; }
    }
    for (const y of reservesOf(order[1].side)) { const r = callC('preInitiative', y, { order: order.map((x) => x.c.id), activeId: order[1].c.id, by: why }); if (r?.advance) { order = [order[1], order[0]]; why = `advanced by ${y.c.name}`; break; } }
    if (LOG) log('initiative', order[0], order[1], `${order[0].c.name} acts first (${why})`, { by: why, order: order.map((x) => x.c.id) });
    // 3. Each active monster's turn, in initiative order.
    let turnNo = 0;
    for (const x of order) {
      turnNo += 1;
      if (x.koed || !x.active) { phase = 'turn'; if (LOG) log('turn_cancelled', x, null, `${x.c.name}'s turn is cancelled (${x.koed ? 'knocked out' : 'no longer active'})`); }
      else if (takeTurn(x)) break;
      if (stopAt && stopAt.exchange === ex && stopAt.turn === turnNo && !winner) { stopped = { kind: 'turn', ex, turn: turnNo }; break; }
    }
    if (winner || stopped) break;
    // 4. Rotation phase (P8).
    phase = 'rotation';
    if (LOG) log('rotation_phase', null, null, 'Rotation phase', { cadence: { a: ex - S.a.lastVoluntary >= CADENCE, b: ex - S.b.lastVoluntary >= CADENCE } });
    for (const y of livingStable()) callC('rotationPhase', y);
    probe('rotationPhase');
    // A queued (delayed) voluntary rotation executes first, when legal; otherwise it keeps waiting.
    for (const q of [...queuedRotations]) {
      const side = S[q.side]; const out = byId.get(q.outId); const inc = byId.get(q.inId);
      if (!out || out.koed || !out.active || side.active !== out) { queuedRotations.splice(queuedRotations.indexOf(q), 1); if (LOG) log('cancelled', out || null, null, 'The delayed rotation lapses (its monster is no longer active)', { abilityId: q.abilityId, stage: 'cleanup' }); continue; }
      const target = inc && !inc.koed && !inc.active ? inc : reservesOf(side)[0]; const L = voluntaryLegality(side);
      if (!target || !L.legal) continue;
      queuedRotations.splice(queuedRotations.indexOf(q), 1);
      if (step(() => executeRotation(side, target, 'delayed', { reason: 'voluntary', skipDelay: true, abilityId: q.abilityId }))) break;
    }
    if (winner) break;
    const requests = [];
    for (const side of [S.a, S.b]) { if (side.lastVoluntary === ex) continue; const r = rotationRequest(side); if (r?.pending) { stopped = r.pending; break; } if (r?.incoming) requests.push({ side, ...r }); }
    if (stopped) { if (LOG) log('rotation_prompt', byId.get(stopped.activeId) || null, null, `Side ${stopped.side.toUpperCase()} may rotate: waiting for a decision`, { pending: true, side: stopped.side, options: stopped.options }); break; }
    for (const q of requests) if (step(() => executeRotation(q.side, q.incoming, q.by))) break;
    if (winner) break;
    // 5. End of exchange: delayed impacts (Falling Star, Faultline), in launch order, then the contracts' end-of-exchange hooks.
    phase = 'end_of_exchange';
    if (resolveDelayed()) break;
    for (const y of livingStable()) callC('endOfExchange', y);
    probe('endOfExchange');
    if (LOG) log('exchange_end', null, null, `End of exchange ${ex}`);
    if (stopAt && stopAt.exchange === ex && stopAt.turn == null) { phase = 'end_check'; if (!endCheck()) { stopped = { kind: 'exchange', ex }; break; } }
    // 6. End check.
    phase = 'end_check';
    if (endCheck()) break;
  }

  // ---- the cap (D8 provisional): pending delayed impacts are discarded (or resolved, per the flag), then HP share, then the coin
  if (!winner && !stopped && delayed.length) {
    if (PROV && flag('d8CapDelayed') === 'resolve') { phase = 'end_of_exchange'; for (const d of delayed) d.impactEx = ex; if (LOG) log('provisional', null, null, 'Pending delayed impacts resolve at the cap (PROVISIONAL reading d8-cap-delayed)', { point: 'd8-cap-delayed', provisional: true }); resolveDelayed(); }
    else for (const d of delayed.splice(0)) {
      const o = byId.get(d.ownerId) || null;
      if (PROV) { if (LOG) log('provisional', o, null, `${o?.c.name}'s pending ${d.abilityId} is discarded at the cap (PROVISIONAL reading d8-cap-delayed)`, { abilityId: d.abilityId, point: 'd8-cap-delayed', provisional: true, stage: 'cleanup', rule: 'exchange-cap (provisional, D8)' }); }
      else if (LOG) { log('unmet', o, null, `${o?.c.name}'s pending ${d.abilityId} does not resolve: the battle ends at the cap (awaiting ruling, D8)`, { abilityId: d.abilityId, stage: 'trigger', hook: 'cap', unmet: [{ condition: 'awaiting ruling', point: 'd8-cap-delayed', waitsOn: provisionalPoint('d8-cap-delayed').waitsOn }] }); log('cancelled', o, null, `${o?.c.name}'s pending ${d.abilityId} lapses with the battle (exchange-cap)`, { abilityId: d.abilityId, stage: 'cleanup', rule: 'exchange-cap (D8 open)' }); }
    }
  }
  const hpShare = (side) => { const t = side.line.reduce((s, x) => s + x.c.maxHp, 0); return side.line.reduce((s, x) => s + x.hp, 0) / t; };
  const share = { a: hpShare(S.a), b: hpShare(S.b) };
  phase = stopped ? 'boundary' : 'end';
  if (!winner && !stopped) {
    if (share.a !== share.b) { winner = share.a > share.b ? 'a' : 'b'; by = 'hp'; if (LOG) log('cap', null, null, `Exchange cap reached: side ${winner.toUpperCase()} has more of its starting HP left (${Math.round(share.a * 100)}% v ${Math.round(share.b * 100)}%)`, { share }); }
    else { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; if (LOG) log('cap', null, null, `Exchange cap reached with an exact HP tie: the seeded coin goes to side ${winner.toUpperCase()}`, { share, coin: true }); }
  }
  let carryOut = null;
  if (stopped) { /* a boundary is not the end of the battle */ }
  else if (context === 'standalone') { for (const x of all()) if (x.status) clearStatus(x, 'end of a standalone battle'); }
  else { carryOut = {}; for (const x of all()) if (x.status) { const t = toFootball(x.status, x.c.maxHp); if (t) carryOut[x.c.monsterId] = t; } }
  if (LOG && !stopped) log('end', null, null, `Side ${winner.toUpperCase()} wins by ${by === 'knockout' ? 'knockout' : by === 'hp' ? 'HP share' : 'coin flip'} after ${ex} exchange${ex === 1 ? '' : 's'}`, { winner, by });

  const lineOut = (side) => side.line.map((x) => ({ id: x.c.id, monsterId: x.c.monsterId, species: x.c.species, name: x.c.name, archetype: x.c.archetype, type: x.c.type, basic: x.c.basic, form: x.c.form, tier: x.c.tier,
    hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, koOrder: x.koOrder, turns: x.turns, skips: x.skips, stunnedSkips: x.stunnedSkips, entries: x.entries, performed: x.performed, status: x.status ? structuredClone(x.status) : null, clocks: x.clocks.map((k) => ({ id: k.id, kind: k.kind, left: k.left })), stats: { ...x.stats }, combatant: x.c,
    abilityId: x.mod?.abilityId ?? null, ability: x.ab ? structuredClone(x.ab) : null, executions: x.executions, passiveCredited: x.passiveCredited, sigRestrict: x.sigRestrict ? { ...x.sigRestrict } : null }));
  const lines = { a: lineOut(S.a), b: lineOut(S.b) };
  const sides = { a: { policy: S.a.policy, rotations: S.a.rotations, forced: S.a.forced, lastVoluntary: S.a.lastVoluntary }, b: { policy: S.b.policy, rotations: S.b.rotations, forced: S.b.forced, lastVoluntary: S.b.lastVoluntary } };
  const mastery = {}; for (const x of all()) if (x.mod) mastery[x.c.monsterId] = { abilityId: x.mod.abilityId, executions: x.executions, passiveCredited: x.passiveCredited };
  const boundary = stopped ? { ...stopped, rngDraws: draws, stateHash: stateHash({ winner: null, by: null, ex, draws, lines }), lastSeq: events.length - 1 } : null;
  const result = {
    ruleset: V.ruleset, engine: V.engineVersion, pending: !!stopped, boundary, sides,
    winner: stopped ? null : winner, by: stopped ? null : by, exchanges: ex, capped: !stopped && !!(ex >= V.battle.exchangeCap && by !== 'knockout'), seed, model, config: cfg,
    context, carryOut, hpShare: share, lines, log: events, rngDraws: draws, probed: probes.length > 0, staged: !!stage, provisional: PROV,
    mastery, delayed: delayed.map((d) => ({ ...d })), diagnostics: { overflow: diag.overflow, constructs: diag.constructs, schedules: { ...diag.schedules } },
    stateHash: stateHash({ winner, by, ex, draws, lines }),
    replayKey: t8ReplayKey({ a, b, seed, config: cfg, carryIn }),
  };
  return deepFreeze(result);
}

const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
/** Hash of the authoritative end state (never of the log), so log on and off can be compared. Ability state is appended only when present. */
function stateHash({ winner, by, ex, draws, lines }) {
  const row = (x) => `${x.id}:${x.hp}:${x.koed ? 1 : 0}:${x.koOrder ?? '-'}:${x.turns}:${x.skips}:${x.entries}:${x.active ? 1 : 0}:${x.clocks.map((k) => `${k.id}/${k.left}`).join(',')}${x.status ? `:${x.status.id}/${x.status.remaining}/${x.status.applications}/${x.status.payload?.remaining ?? ''}/${x.status.freeze || 0}` : ''}${x.ability ? `:${JSON.stringify(x.ability)}/${x.executions}` : ''}`;
  return fnv(`${winner}|${by}|${ex}|${draws}|${lines.a.map(row).join(';')}|${lines.b.map(row).join(';')}`);
}

/** One line that rebuilds this battle exactly: ruleset, engine version, seed, configuration and full lineup snapshots. */
export function t8ReplayKey({ a, b, seed, config, carryIn = null }) {
  const snap = (m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, level: m.level, stage: m.stage || 0, fatigue: m.fatigue || 0, attributes: { ...m.attributes }, ...(m.clashMasteryTier ? { clashMasteryTier: m.clashMasteryTier } : {}), ...(m.exhausted ? { exhausted: true } : {}) });
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
export { CLASH_HOOKS };
