import { createPerformanceLedger } from './performance.js';
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
import { E as $E, lineOf as $lineOf, resetLines } from '../../core/english.js';

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
  'FIR-03-C': $E('clashlog.falling_star_impact_at_the_owners'),
  'FIR-06-C': $E('clashlog.faultline_impact_at_the_owners_last'),
  'FIR-04-C': $E('clashlog.molten_brand_lethal_hit_eruption_settle'),
  'WAT-02-C': $E('clashlog.shared_burden_the_current_hit_keeps'),
  'EAR-06-C': $E('clashlog.mountain_shelter_protection_already_granted'),
  'PSY-06-C': $E('clashlog.astral_strike_ordinary_replacement_then_continue'),
  'FIR-02-C': $E('clashlog.cinder_clamp_the_owners_ko_releases'),
  'NAT-01-C': $E('clashlog.second_spring_revival_on_a_later'),
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
export function simulateClashT8(args) {
  const g = runT8(args, null); const r = g.next();
  if (!r.done) throw new Error('A t8 battle paused outside a session'); // without a session the generator never yields
  return r.value;
}

/**
 * Task 10 (owner 2026-11-13): ONE continuous battle. A session keeps a single live battle state and advances it exchange by exchange:
 * it pauses before each rotation phase (after both actives have acted), shows the live state, and takes the player's command for that
 * rotation phase (a reserve to bring in, or 'auto'), then continues from the same state. Nothing is re-simulated and nothing restarts.
 * The decisions it was given are the record: simulateClashT8 with the same lineups, seed, config and those decisions reproduces the
 * session's battle exactly (log, state hash, winner), which is how replays, reloads and Skip settle it.
 *   const s = createClashSessionT8({ a, b, seed, config: { ruleset: 't8', policies: { a: 'player', b: 'ai' } } });
 *   s.view (the live result-shaped view) · s.request(reserveId) · s.auto() · s.advance() · s.finish() · s.result · s.decisions
 */
export function createClashSessionT8(args) {
  const live = { decisions: { a: {}, b: {} }, view: null };
  const g = runT8(args, live); let step = g.next(); let done = step.done; let result = done ? step.value : null; let pendingCmd = null; let lastRefusal = null;
  const view = () => (done ? result : step.value);
  const rotationInfo = () => (done ? null : step.value.rotation);
  return {
    get done() { return done; }, get result() { return result; }, get view() { return view(); }, get ex() { return view().exchanges; },
    get decisions() { return structuredClone(live.decisions); }, get queued() { return pendingCmd; }, get lastRefusal() { return lastRefusal; },
    /** Can the player switch to `id` at the coming rotation phase? { ok, reason, exchangesLeft }. A refusal changes nothing (no cooldown is touched). */
    canSwitch(id) {
      if (done) return { ok: false, reason: 'finished' };
      const r = rotationInfo(); if (!r || r.side !== 'a') return { ok: false, reason: 'not-player' };
      if (r.policy !== 'player') return { ok: false, reason: 'auto' };
      if (!r.reserves.some((x) => x.id === id || x.monsterId === id)) return { ok: false, reason: r.reserves.length ? 'not-reserve' : 'no-reserve' };
      if (r.exchangesLeft > 0) return { ok: false, reason: 'cooldown', exchangesLeft: r.exchangesLeft };
      return { ok: true };
    },
    /** Queue a switch for the coming rotation phase (the next safe boundary). Returns canSwitch's answer; only a legal request is queued. */
    request(id) { const c = this.canSwitch(id); if (c.ok) { const r = rotationInfo(); pendingCmd = r.reserves.find((x) => x.id === id || x.monsterId === id).id; } return c; },
    cancel() { pendingCmd = null; },
    /** Hand the player's rotations to the AI policy for the rest of this battle (the approved "Auto for the rest", D1). */
    auto() { if (!done && rotationInfo()?.policy === 'player') pendingCmd = 'auto'; },
    /** Run the coming rotation phase (with the queued command, if any) and the next exchange up to its rotation phase. Returns the new view. */
    advance() {
      if (done) return result;
      const r = rotationInfo(); lastRefusal = null;
      if (pendingCmd && r) live.decisions.a[r.ex] = pendingCmd;
      const asked = pendingCmd; pendingCmd = null;
      step = g.next(); done = step.done; if (done) result = step.value;
      if (asked && asked !== 'auto' && r) { const v = view(); const rot = v.log.slice(r.lastSeq + 1).find((e) => e.kind === 'rotation' && e.ex === r.ex && e.side === 'a'); if (!rot) lastRefusal = { ex: r.ex, id: asked, reason: 'blocked' }; } // a rotation lock or delay refused it at the boundary
      return view();
    },
    /** Run to the end with no further switches (or with the AI, after auto()). */
    finish() { let guard = 0; while (!done && guard++ < 10000) this.advance(); return result; },
  };
}

function* runT8({ a, b, seed = 1, config = {}, log: logMode = 'full', probes = [], stage = null, carryIn = null, stopAt = null }, session = null) {
  resetLines();   // a log entry never picks up a line read before this battle (src/core/english.js)
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
  const log = (kind, actor, target, text, extra = {}) => { events.push({ seq: events.length, ex, phase, turnIndex, hit: curHit?.id ?? null, kind, actor: actor?.c.id ?? null, target: target?.c.id ?? null, text, ...$lineOf(text), ...extra, actorState: snap(actor), targetState: snap(target), active: activeIds(), ramp }); };

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
  const performance = createPerformanceLedger();
  const control = new Map(); let controlSeq = 0;
  const supportKey = (src, abilityId) => `${ex}:${turnIndex}:${src?.c.id}:${abilityId || 'support'}:${curAttack?.seq || 0}`;
  const controlUsed = (x) => control.get(x?.status?.gradeControl)?.();
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
    addClock: (holderId, spec) => { const x = byId.get(holderId); if (!x || x.koed) throw new Error(`No living combatant ${holderId}`); const k = addClock(x, spec); if (LOG) log('clock_start', x, x, `${$E('clashlog.starts_normal_turns', { name: x.c.name, kind: k.kind, id: k.id, left: k.left, n: k.left })}`, { clock: k.id, clockKind: k.kind, left: k.left, excluded: k.excludeTurn === x.turns && x.inTurn }); return k.left; },
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
    log('unmet', o, null, `${$E('clashlog.does_not_activate', { o: o ? o.c.name : $E('clashlog.hook'), abilityId: r.abilityId || hook })}${r.unmet.map((u) => u.condition).join(', ')})`, { hook, stage: 'trigger', abilityId: r.abilityId ?? null, unmet: r.unmet });
  }

  // ---- the shared status slot in mode 'clash' (S2)
  const NAME = { stunned: 'Stunned', slowed: 'Slowed', stumbled: 'Stumbled', knockedDown: $E('clashlog.knocked_down'), afflicted: 'Afflicted', weakened: 'Weakened', confused: 'Confused', healingReduced: $E('clashlog.healing_reduced'), shielded: 'Shielded', empowered: 'Empowered', quickened: 'Quickened', guarded: 'Guarded' };
  const slotView = (sl) => (sl ? { id: sl.id, strength: sl.strength, remaining: sl.remaining, applications: sl.applications, ...(sl.freeze ? { freeze: sl.freeze } : {}), ...(sl.id === 'shielded' ? { pool: sl.payload.pool, poolLeft: sl.payload.remaining } : {}) } : null);
  function applyStatus(x, attempt) {
    const src = attempt.sourceId != null ? byId.get(attempt.sourceId) || null : null;
    const controlUse = src && src.side !== x.side && STATUS[attempt.id]?.kind === 'harmful' && attempt.id !== 'afflicted' ? performance.control(src.c.monsterId) : null;
    const veto = callC('statusIncoming', x, { ...attempt, targetId: x.c.id }) ?? probe('statusIncoming', x.c.id, { ...attempt });
    if (veto?.block) { if (LOG) log('status_blocked', src, x, `${$E('clashlog.is_blocked', { name: x.c.name, name2: NAME[attempt.id], reason: veto.reason || 'blocked' })}`, { status: attempt.id, reason: veto.reason || 'blocked', unmet: [{ condition: 'incoming veto', detail: veto.reason || 'blocked' }], sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null }); return { accepted: false, reason: veto.reason || 'blocked', vetoed: true }; }
    const before = x.status;
    const r = applyClash(x.status, attempt, { recipientInTurn: x.inTurn });
    if (!r.accepted) { if (LOG) log('status_blocked', src, x, `${$E('clashlog.is_not_applied', { name: x.c.name, name2: NAME[attempt.id], reason: r.reason })}`, { status: attempt.id, reason: r.reason, unmet: [{ condition: 'shared status gate', detail: r.reason }], slot: slotView(before), sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null }); return r; }
    x.status = r.slot;
    if (controlUse) { const token = ++controlSeq; control.set(token, controlUse); x.status = { ...x.status, gradeControl: token }; }
    if (LOG) log('status', src, x, `${$E('clashlog.is_turns', { name: x.c.name, name2: NAME[attempt.id], reason: r.reason, remaining: x.status.remaining, n: x.status.remaining })}${x.status.id === 'shielded' ? `${$E('clashlog.shield', { remaining: x.status.payload.remaining })}` : ''})`, { status: attempt.id, reason: r.reason, slot: slotView(x.status), excluded: x.inTurn, sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null, stage: 'resolution' });
    callC('statusApplied', x, slotView(x.status)); probe('statusApplied', x.c.id, slotView(x.status));
    return r;
  }
  function applyStatusBatch(attempts) {
    return orderAttempts(attempts).map((t) => { const x = byId.get(t.targetId); if (!x || x.koed) throw new Error(`No living combatant ${t.targetId}`); const { targetId, order, ...rest } = t; return { targetId, sourceId: rest.sourceId, abilityId: rest.abilityId ?? null, accepted: applyStatus(x, rest).accepted }; });
  }
  function cleanse(x, sourceId, abilityId = null) {
    if (!x) throw new Error('No such combatant');
    const r = cleanseSlot(x.status); const old = x.status;
    if (LOG) log(r.removed ? 'status_end' : 'cleanse_refused', byId.get(sourceId) || null, x, r.removed ? `${$E('clashlog.s_is_cleansed', { name: x.c.name, name2: NAME[x.status.id] })}` : `${$E('clashlog.cleanse_has_no_effect', { name: x.c.name, reason: r.reason })}`, { reason: r.reason, status: x.status?.id ?? null, sourceId, abilityId, stage: 'resolution', ...(r.removed ? {} : { unmet: [{ condition: 'cleansable harmful status', detail: r.reason }] }) });
    const healer = byId.get(sourceId);
    if (healer && healer.side === x.side) performance.support(healer.c.monsterId, supportKey(healer, abilityId), x.c.id, { maxHp: x.c.maxHp, cleansed: r.removed });
    x.status = r.slot; if (r.removed) callC('statusEnded', x, { id: old.id, reason: 'cleansed', sourceId, abilityId });
    return r.removed;
  }
  function replaceStatus(x, attempt, opts = {}) {
    if (!x) throw new Error('No such combatant');
    const r = replaceWith(x.status, attempt, { recipientInTurn: x.inTurn, overridesUncleansable: !!opts.overridesUncleansable });
    if (!r.accepted) { if (LOG) log('status_blocked', null, x, `${$E('clashlog.replacement_refused', { name: x.c.name, name2: NAME[attempt.id], reason: r.reason })}`, { status: attempt.id, reason: r.reason, unmet: [{ condition: 'explicit replacement', detail: r.reason }] }); return false; }
    const old = x.status; x.status = r.slot;
    const src = byId.get(attempt.sourceId);
    if (src && src.side === x.side && old && STATUS[old.id]?.kind === 'harmful') performance.support(src.c.monsterId, supportKey(src, attempt.abilityId), x.c.id, { maxHp: x.c.maxHp, cleansed: true });
    if (LOG) log('status', byId.get(attempt.sourceId) || null, x, `${x.c.name}: ${old ? `${$E('clashlog.is_replaced', { name: NAME[old.id] })} ` : ''}${$E('clashlog.a_fresh_episode_begins', { name: NAME[attempt.id] })}`, { status: attempt.id, reason: 'explicit replacement', replaced: old?.id ?? null, slot: slotView(x.status), sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null, stage: 'resolution' });
    if (old) callC('statusEnded', x, { id: old.id, reason: 'replaced', sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null });
    callC('statusApplied', x, slotView(x.status));
    return true;
  }
  function clearStatus(x, reason, extra = {}) {
    if (!x.status) return null; const old = x.status; x.status = null;
    if (LOG) log('status_end', null, x, `${x.c.name}'s ${NAME[old.id]} ${reason === 'expired' ? 'ends' : `${$E('clashlog.clears', { reason })}`}`, { status: old.id, reason, ...extra });
    if (!x.koed) callC('statusEnded', x, { id: old.id, reason, ...extra });
    return old;
  }
  /** Explicit beneficial-status removal (Wash Away) or steal (Eclipse Theft): the whole slot, pool included. Returns the removed slot. */
  function removeStatus(x, src, abilityId, reason) {
    if (!x.status) return null; const old = x.status; x.status = null;
    if (src && src.side === x.side && STATUS[old.id]?.kind === 'harmful') performance.support(src.c.monsterId, supportKey(src, abilityId), x.c.id, { maxHp: x.c.maxHp, cleansed: true });
    if (src && src.side !== x.side && STATUS[old.id]?.kind === 'beneficial') performance.control(src.c.monsterId)();
    if (LOG) log('status_end', src, x, `${$E('clashlog.s_is', { name: x.c.name, name2: NAME[old.id], reason })}`, { status: old.id, reason, sourceId: src?.c.id ?? null, abilityId, stage: 'resolution' });
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
    to.status = { ...slot, gradeSource: src.c.id, gradeUnattributed: false };
    if (STATUS[slot.id]?.kind === 'harmful' && src.side !== to.side && slot.id !== 'afflicted') { const token = ++controlSeq; control.set(token, performance.control(src.c.monsterId)); to.status.gradeControl = token; }
    if (LOG) log('status', src, to, `${$E('clashlog.takes_over_s_turns_of_3', { name: to.c.name, name2: from.c.name, name3: NAME[slot.id], remaining: slot.remaining, applications: slot.applications, n: slot.remaining })}`, { status: slot.id, reason: reason, slot: slotView(slot), sourceId: src?.c.id ?? null, abilityId, from: from.c.id, stage: 'resolution' });
    callC('statusApplied', to, slotView(to.status));
    return true;
  }

  // ---- entry, knockout, replacement, revive
  function enter(x, reason) {
    x.side.active = x; x.active = true; x.entries += 1; x.entry = { reason, ex };
    if (LOG) log('enter', x, null, (reason === 'opening' ? $E('clashlog.starts_as_the_active_fighter_2', { name: x.c.name, archetype: x.c.archetype, type: x.c.type }) : $E('clashlog.enters', { name: x.c.name, archetype: x.c.archetype, type: x.c.type })), { reason, hp: x.hp, maxHp: x.c.maxHp, archetype: x.c.archetype, type: x.c.type, first: x.entries === 1 });
    // Entry effects run at full strength (P8: "entry effects ... are unchanged"), for every entry reason.
    runDescriptors(hookList(callC('onEntry', x, { reason })), x.c.id, 'onEntry');
    if (probes.length) runDescriptors(hookList(probe('onEntry', x.c.id, { reason })), x.c.id, 'onEntry');
    for (const y of livingStable()) if (y !== x) callC('anyEntry', y, { id: x.c.id, reason, side: x.side.key });
  }
  function depart(x, reason) {
    x.active = false; if (x.side.active === x) x.side.active = null;
    x.p8pending = false; x.p8 = null; // PROVISIONAL 'p8-pending-cleared-on-departure'
    if (LOG) log('depart', x, null, `${$E('clashlog.goes_to_reserve', { name: x.c.name })}`, { reason, status: x.status?.id ?? null, ...(x.status ? { paused: true } : {}) });
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
    if (LOG) log('ko', by, x, `${$E('clashlog.is_knocked_out', { name: x.c.name })}${by && by !== x ? ` by ${by.c.name}` : ''}`, { koOrder: x.koOrder, clearedClocks: cleared.map((k) => k.id), ...(st ? { clearedStatus: st.id } : {}) });
    callC('onKO', x, { by: by?.c.id ?? null });
    for (const y of livingStable()) callC('anyKO', y, { id: x.c.id, by: by?.c.id ?? null, side: x.side.key });
  }
  /** Second Spring (D18): the revived monster returns at the back of its lineup with `hp`; statuses were cleared at KO; cooldowns and once-flags stay. */
  function revive(x, hp, src, abilityId) {
    if (!x.koed) throw new Error(`${x.c.id} is not knocked out`);
    const side = x.side; side.line = [...side.line.filter((y) => y !== x), x]; side.line.forEach((y, i) => { y.slot = i; });
    x.koed = false; x.hp = Math.max(1, Math.min(x.c.maxHp, hp)); x.koOrder = null; x.entry = null;
    if (src && src.side === x.side) performance.support(src.c.monsterId, supportKey(src, abilityId), x.c.id, { healed: x.hp, maxHp: x.c.maxHp });
    if (LOG) log('revive', src, x, `${$E('clashlog.returns_at_hp_at_the_back', { src: src ? src.c.name : $E('clashlog.revival'), name: x.c.name, hp: x.hp, maxHp: x.c.maxHp })}`, { hp: x.hp, abilityId, stage: 'resolution', lineup: side.line.map((y) => y.c.id) });
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
  function flushDeferred() { while (deferred.length && !winner) { const d = deferred.shift(); const o = byId.get(d.ownerId); if (!o || o.koed) { if (LOG && o) log('cancelled', o, null, `${$E('clashlog.s_deferred_is_canceled_knocked_out', { name: o.c.name, abilityId: d.abilityId })}`, { abilityId: d.abilityId, stage: 'cleanup', rule: $E('clashlog.b3_rule_2') }); continue; } d.fn(api, o.self); } }
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
      if (att.koed && !spec.exception) { if (LOG) log('cancelled', att, intended, `${$E('clashlog.s_is_canceled_knocked_out', { name: att.c.name, label: label(spec) })}`, { rule: $E('clashlog.b3_rule_2'), stage: 'cleanup', abilityId: spec.abilityId ?? null }); out.cancelled = true; out.decided = endCheck(); return out; }
      // 3.4 launch: a performed normal attack is counted here (performed-attack counters); costs and once-uses are the contract's own;
      // then launch accuracy (Snowbank Shot); then ONE Confused roll for the whole attack (eligible normal attacks; commanded attacks
      // roll their own ordinary chance, spec §10; reactions and counters never roll).
      if (normal && spec.normalAction !== false && att.inAction) att.performed += 1;
      const launch = callC('launch', att, { target: intended.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null }) ?? probeR('launch', att.c.id, { target: intended.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null });
      if (launch?.cancel) { if (LOG) log('launch_cancelled', att, intended, `${$E('clashlog.s_does_not_launch', { name: att.c.name, label: label(spec), reason: launch.reason || 'cancelled' })}`, { reason: launch.reason || 'cancelled', abilityId: launch.abilityId ?? spec.abilityId ?? null, stage: 'resolution', unmet: launch.unmet || [{ condition: 'launch', detail: launch.reason || 'cancelled' }] }); out.cancelled = true; out.launched = true; out.missed = true; return out; }
      out.launched = true;
      let t = intended;
      const conf = (normal || spec.confusable) && !spec.noConfusedRoll ? clashEffect(att.status).confusedChance : 0;
      if (conf > 0) {
        const redirected = rng.chance(conf);
        if (LOG) log('confused_roll', att, redirected ? att : t, `${$E('clashlog.is_confused', { name: att.c.name, redirected: redirected ? $E('clashlog.the_attack_turns_on_itself') : $E('clashlog.it_attacks_normally') })}`, { chance: conf, redirected, intended: t.c.id });
        if (redirected) { controlUsed(att); t = att; out.redirected = true; }
      }
      out.target = t.c.id;
      for (let h = 1; h <= hits; h++) {
        if (att.koed && !spec.exception) { if (LOG) log('hits_cancelled', att, t, `${$E('clashlog.s_remaining_hits_are_canceled_knocked', { name: att.c.name })}`, { remaining: hits - h + 1, rule: $E('clashlog.b3_rule_2') }); break; }
        if (h > 1 && (t.koed || (!t.active && t !== att))) { if (LOG) log('hits_cancelled', att, t, `${$E('clashlog.s_remaining_hits_are_canceled_target', { name: att.c.name })}`, { remaining: hits - h + 1, rule: $E('clashlog.multi_hit_target_ko_provisional') }); break; }
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
    } finally {
      if (out.launched && intended.side !== att.side) {
        const ids = new Set(out.hits.flatMap((h) => h.recipients).filter((id) => byId.get(id)?.side !== att.side));
        if (!ids.size) ids.add(intended.c.id);
        const hpDamage = out.hits.reduce((sum, h) => sum + Object.entries(h.losses).reduce((n, [id, v]) => n + (byId.get(id)?.side !== att.side ? v : 0), 0), 0);
        const shieldDamage = out.hits.reduce((sum, h) => sum + Object.entries(h.poolLosses).reduce((n, [id, v]) => n + (byId.get(id)?.side !== att.side ? v : 0), 0), 0);
        performance.offense(att.c.monsterId, { hpDamage, shieldDamage, enemyMaxHp: [...ids].reduce((sum, id) => sum + byId.get(id).c.maxHp, 0), ko: out.kos.some((id) => byId.get(id)?.side !== att.side) });
      }
      curAttack = prevAttack; if (!curAttack) flushDeferred();
    }
  }
  function oneHit(att, t, spec, hitNo) {
    const prevHit = curHit; curHit = { id: ++hitSeq, tag: spec.tag, attacker: att.c.id, abilityId: spec.abilityId ?? null, hitNo };
    const res = { targetId: t.c.id, missed: false, intercepted: false, hpDamage: 0, shieldDamage: 0, kos: [], recipients: [], losses: {}, poolLosses: {}, transferred: [], decided: false, prevented: 0 };
    try {
      const sideOf = t.side;
      // 3.5 interception (Stone Divide): asked of the target's side in lineup order, then probes
      const icpInfo = { attacker: att.c.id, owner: curAttack.owner, target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null, strikeKey: spec.strikeKey ?? null, extra: curAttack.extra, hitNo, attackSeq: curAttack.seq };
      const icp = firstC('intercept', lineupOrder(sideOf).filter((y) => !y.koed), icpInfo, (r) => r.intercepted) ?? probeR('intercept', t.c.id, icpInfo);
      if (icp?.intercepted) { if (LOG) log('intercepted', byId.get(icp.by) || null, att, `${$E('clashlog.s_is_intercepted', { name: att.c.name, label: label(spec) })}`, { stage: 'resolution', abilityId: icp.abilityId ?? null, by: icp.by ?? null, strike: spec.abilityId ?? spec.tag }); res.intercepted = true; return res; }
      // 3.6 explicit miss sources only (N7a, P10): the target's own sources; undodgeable attacks bypass them without a roll
      if (!spec.undodgeable) {
        const mi = { attacker: att.c.id, owner: curAttack.owner, tag: spec.tag, abilityId: spec.abilityId ?? null, hitNo, attackSeq: curAttack.seq, hits: spec.hits || 1 };
        const miss = callC('missCheck', t, mi) ?? probeR('missCheck', t.c.id, mi);
        if (miss?.miss) { if (LOG) log('miss', att, t, `${$E('clashlog.s_misses', { name: att.c.name, label: label(spec), source: miss.source || 'explicit miss effect' })}`, { source: miss.source ?? null, abilityId: miss.abilityId ?? null, stage: 'resolution' }); res.missed = true; res.decided = afterHit(att, t, spec, [], true); return res; }
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
      const unweakenedRaw = att.c.atk * (spec.mult ?? 1) * ramp * spread * p8 * abRaw + abAdd;
      const raw = att.c.atk * (spec.mult ?? 1) * ramp * spread * out * p8 * abRaw + abAdd;
      // attacker-side shield rule (Phase Strike bypass, Iron Bite multiplier)
      const sr = callC('shieldRule', att, { target: t.c.id, tag: spec.tag, abilityId: spec.abilityId ?? null });
      const hitSpec = sr ? { ...spec, shieldRule: sr } : spec;
      // 8b Emergency Cover: lethality predicted after the original target's defences, before any survival ability is spent
      let recipients = [{ x: t, raw }];
      const predicted = roundHalfUp(mitigate(att, t, raw, hitSpec, false).exact);
      const cvInfo = { attacker: att.c.id, target: t.c.id, raw, predicted, lethal: predicted >= t.hp, tag: spec.tag, abilityId: spec.abilityId ?? null };
      const cover = firstC('lethalRedirect', lineupOrder(sideOf).filter((y) => !y.koed && !y.active), cvInfo, (r) => r.to) ?? probeR('lethalRedirect', t.c.id, cvInfo);
      if (cover?.to) { const r = byId.get(cover.to); if (!r || r.koed) throw new Error(`lethalRedirect to ${cover.to}: not a living combatant`); if (LOG) log('redirect', r, t, `${$E('clashlog.takes_the_hit_for', { name: r.c.name, name2: t.c.name })}`, { stage: 'activation', abilityId: cover.abilityId ?? null, predicted }); recipients = [{ x: r, raw }]; }
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
        if (LOG) log('raw_split', src, recipients[0].x, `${$E('clashlog.shares_of', { name: src.c.name, source: sh.source, whole })}`, { stage: 'resolution', abilityId: split.abilityId ?? null, whole, sourceShare: sh.source, targetShare: sh.target, pct: split.pct, source: split.to });
      }
      const order = [recipients[0], ...recipients.slice(1).sort((p, q) => p.x.c.id.localeCompare(q.x.c.id))];
      const landed = [];
      for (const { x: rec, raw: rr, transferred } of order) {
        // 8d mitigation, then one rounding (D9); a per-hit cap (Tempered Guard) clamps the HP loss after the shield
        const unguarded = rec.status?.id === 'guarded' ? roundHalfUp(mitigate(att, rec, rr, hitSpec, false, { noGuarded: true }).exact) : null; // preview before the commit
        const protectiveStatus = rec.status ? { ...rec.status } : null;
        const m = mitigate(att, rec, rr, hitSpec, true);
        let loss = roundHalfUp(m.exact); let capped = false;
        if (m.capHp < loss && !transferred) { loss = Math.max(0, roundHalfUp(m.capHp)); capped = true; }
        const prevented = unguarded != null ? Math.max(0, unguarded - roundHalfUp(m.exact)) : 0; // HP damage the Guarded episode prevented (Fortress storage)
        // 8e pre-KO hook on every damage path (Last Root)
        if (loss >= rec.hp && rec.hp > 0) {
          const pkInfo = { attacker: att.c.id, loss, tag: spec.tag, abilityId: spec.abilityId ?? null };
          const pk = callC('preKO', rec, pkInfo) ?? probeR('preKO', rec.c.id, pkInfo);
          if (pk?.survive) { if (LOG) log('survive', rec, att, `${$E('clashlog.holds_on_at_1_hp', { name: rec.c.name })}`, { stage: 'activation', abilityId: pk.abilityId ?? null, prevented: loss - (rec.hp - 1) }); loss = rec.hp - 1; }
        }
        // 8f HP loss and the immediate KO (B3 rule 1)
        const before = rec.hp;
        if (att.side !== rec.side) {
          let budget = Math.min(before, roundHalfUp(rr * m.type));
          const credit = (sourceId, next) => {
            const after = Math.min(before, Math.max(0, roundHalfUp(next)));
            const src = byId.get(sourceId);
            if (src && src.side === rec.side) performance.defense(src.c.monsterId, curAttack.seq, rec.c.id, Math.max(0, budget - after), rec.c.maxHp);
            budget = Math.min(budget, after);
          };
          credit(rec.c.id, rr * m.type * m.guard);
          credit(protectiveStatus?.id === 'guarded' && !protectiveStatus.gradeUnattributed ? protectiveStatus.gradeSource || protectiveStatus.sourceId : null, rr * m.type * m.guard * m.guarded);
          credit(rec.c.id, rr * m.type * m.guard * m.guarded * m.ab);
          credit(protectiveStatus?.id === 'shielded' && !protectiveStatus.gradeUnattributed ? protectiveStatus.gradeSource || protectiveStatus.sourceId : null, m.exact);
          credit(rec.c.id, loss);
        }
        // A modifier's presence is not a useful disruption. Compare the rounded
        // HP/pool outcome on the same frozen raw draw and existing protection.
        // Ambiguous split/cap/survival counterfactuals remain uncredited.
        if (out < 1 && !split && !capped && m.capHp === Infinity && loss < before - 1) {
          let preview = unweakenedRaw * m.type * m.guard * m.guarded * m.ab;
          let pool = 0;
          if (protectiveStatus?.id === 'shielded' && !m.shield?.bypassed) {
            const br = m.shield?.breakMult || 1;
            if (m.shield?.ironBite) { const S0 = protectiveStatus.payload.remaining; pool = Math.min(S0, roundHalfUp(preview * br)); preview = preview * br >= S0 ? Math.max(0, preview - S0 / br) : 0; }
            else { const r = absorb(protectiveStatus, preview, br); pool = r.poolLoss; preview = r.toHp; }
          }
          if (Math.min(before, roundHalfUp(preview)) > Math.min(before, loss) || pool > (m.shield?.poolLoss || 0)) controlUsed(att);
        }
        rec.hp = Math.max(0, rec.hp - loss);
        if (isNormalAttack(spec.tag) && rec === order[0].x) att.stats.attacks += 1;
        att.stats.dealt += before - rec.hp; rec.stats.taken += before - rec.hp;
        if (rec.side !== att.side) att.maxHitDealt = Math.max(att.maxHitDealt, before - rec.hp);
        if (LOG) {
          const sn = m.shield ? (m.shield.bypassed ? $E('clashlog.shield_bypassed') : `${$E('clashlog.absorbed_by_the_shield', { poolLoss: m.shield.poolLoss, broken: m.shield.broken ? $E('clashlog.shield_broken') : '' })}`) : '';
          log('damage', att, rec, `${$E('clashlog.s_damage', { name: att.c.name, label: label(spec), loss, sn, guard: m.guard < 1 ? $E('clashlog.tank_guard') : '', guarded: m.guarded < 1 ? ' (Guarded)' : '', capped: capped ? $E('clashlog.hit_cap') : '', out: out !== 1 ? (out > 1 ? ' (Empowered)' : ' (Weakened)') : '', p8: p8 !== 1 ? $E('clashlog.entry_penalty') : '', att: rec === att ? $E('clashlog.confused_hits_itself') : '', type: m.type > 1 ? $E('clashlog.type_advantage') : m.type < 1 ? $E('clashlog.type_disadvantage') : '', transferred: transferred ? $E('clashlog.transferred_share') : '' })}`,
            { tag: spec.tag, damage: loss, raw: Math.round(rr * 100) / 100, hpBefore: before, hpAfter: rec.hp, type: typeEdge(att.c.type, rec.c.type), guard: m.guard < 1, pierce: m.pierce, stage: 'resolution',
              ...(spec.abilityId ? { abilityId: spec.abilityId } : {}), ...(spec.strikeKey ? { strikeKey: spec.strikeKey } : {}), ...(spec.mult != null && spec.mult !== 1 ? { mult: spec.mult } : {}), ...(out !== 1 ? { outgoing: out } : {}), ...(p8 !== 1 ? { penalty: p8 } : {}), ...(m.guarded !== 1 ? { guarded: m.guarded } : {}), ...(m.ab !== 1 ? { mitigation: m.ab } : {}), ...(capped ? { capped: true } : {}), ...(m.shield ? { shield: m.shield } : {}), ...(rec === att ? { redirected: true } : {}), ...(hitNo > 1 ? { hitNo } : {}), ...(transferred ? { transferred: true } : {}), ...(prevented ? { prevented } : {}) });
          if (m.shield?.broken) log('status_end', att, rec, `${$E('clashlog.s_shielded_ends_shield_broken', { name: rec.c.name })}`, { status: 'shielded', reason: 'broken' });
        }
        if (m.shield?.broken) callC('statusEnded', rec, { id: 'shielded', reason: 'broken', sourceId: att.c.id, abilityId: spec.abilityId ?? null });
        if (!transferred && rec.hp > 0 && att.c.archetype === 'Tank') {
          rec.clocks = rec.clocks.filter((k) => k.id !== 'tank-bruise');
          startClock(rec, { id: 'tank-bruise', kind: 'duration', turns: 2, source: 'tank-perk' });
          if (LOG) log('bruise', att, rec, `${$E('clashlog.is_bruised_healing_reduced_25_for', { name: rec.c.name })}`, { strength: 25, turns: 2, stage: 'resolution' });
        }
        landed.push({ x: rec, loss, poolLoss: m.shield?.poolLoss ?? 0, transferred: !!transferred, prevented });
        if (transferred) res.transferred.push(rec.c.id);
        const actual = before - rec.hp; // actual HP lost (no overkill)
        // Taking HP damage alone earns nothing. Explicit transfer/cover can earn
        // absorption credit for the HP actually spent protecting the original ally.
        if (att.side !== rec.side && (transferred || cover?.to === rec.c.id) && rec !== t) performance.defense(rec.c.monsterId, curAttack.seq, t.c.id, actual, t.c.maxHp);
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
      if (owner.koed && !d.exception) { if (LOG) log('cancelled', owner, null, `${$E('clashlog.s_is_canceled_knocked_out_2', { name: owner.c.name, abilityId: d.abilityId || d.kind })}`, { hook, item: d.kind, abilityId: d.abilityId ?? null, rule: $E('clashlog.b3_rule_2'), stage: 'cleanup' }); continue; }
      if (LOG && d.abilityId) log('ability', owner, null, `${owner.c.name}: ${d.abilityId} (${hook})`, { hook, abilityId: d.abilityId, stage: 'activation', ...(owner.koed ? { postKO: d.exception } : {}) });
      if (d.kind === 'strike') {
        const tgt = byId.get(d.target === 'attacker' ? curHit?.attacker : d.target);
        if (!tgt || tgt.koed) { if (LOG) log('cancelled', owner, tgt || null, `${$E('clashlog.s_has_no_target', { name: owner.c.name, abilityId: d.abilityId || 'strike' })}`, { hook, rule: $E('clashlog.no_living_target'), stage: 'cleanup', unmet: [{ condition: 'living target' }] }); continue; }
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
    const factors = [{ id: 'entry-penalty', factor: pen }, { id: 'stalemate-c6', factor: healMult }, { id: 'healing-reduced', factor: clashEffect(t.status).heal }, { id: 'tank-bruise', factor: t.clocks.some((k) => k.id === 'tank-bruise') ? 0.75 : 1 }].filter((f) => f.factor !== 1);
    const r = resolveAmount(b, factors, { rounding, max: t.c.maxHp - t.hp });
    const budget = resolveAmount(b, factors, { rounding }).amount;
    const before = t.hp; t.hp += r.amount;
    if (src && src.side === t.side) performance.support(src.c.monsterId, supportKey(src, abilityId), t.c.id, { healed: r.amount, maxHp: t.c.maxHp });
    if (clashEffect(t.status).heal < 1 && resolveAmount(b, factors.filter((f) => f.id !== 'healing-reduced'), { rounding, max: t.c.maxHp - before }).amount > r.amount) controlUsed(t);
    if (LOG) log('heal', src, t, `${src ? src.c.name : $E('clashlog.healing')} heals ${t.c.name} ${r.amount}${factors.length ? ` (${factors.map((f) => f.id).join(', ')})` : ''}`, { amount: r.amount, exact: r.exact, budget, factors: r.factors, rounding, hpBefore: before, hpAfter: t.hp, abilityId, stage: 'resolution', healKind: kind });
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
    if (r.amount < 1) { if (LOG) log('unmet', src, t, `${$E('clashlog.the_shield_rounds_to_0', { src: src ? src.c.name : $E('clashlog.shield_2') })}`, { unmet: [{ condition: 'positive shield pool', detail: r.exact }], abilityId, stage: 'trigger' }); return false; }
    return applyStatus(t, { id: 'shielded', strength: r.amount, duration, sourceId: src?.c.id ?? null, abilityId, ...(payload ? { payload } : {}) }).accepted;
  }
  function dotDamage(x, amount, extra) {
    let loss = amount;
    if (loss >= x.hp) { const pkInfo = { attacker: null, loss, tag: 'dot' }; const pk = callC('preKO', x, pkInfo) ?? probeR('preKO', x.c.id, pkInfo); if (pk?.survive) { if (LOG) log('survive', x, null, `${$E('clashlog.holds_on_at_1_hp', { name: x.c.name })}`, { stage: 'activation', abilityId: pk.abilityId ?? null }); loss = x.hp - 1; } }
    const before = x.hp; x.hp = Math.max(0, x.hp - loss); x.stats.taken += before - x.hp;
    const src = x.status?.gradeUnattributed ? null : byId.get(x.status?.gradeSource || extra?.sourceId);
    if (src && src.side !== x.side) performance.offense(src.c.monsterId, { hpDamage: before - x.hp, enemyMaxHp: x.c.maxHp, ko: x.hp <= 0 });
    if (LOG) log('afflicted', null, x, `${$E('clashlog.suffers_from_afflicted', { name: x.c.name, loss })}`, { tag: 'dot', damage: loss, hpBefore: before, hpAfter: x.hp, ...extra });
    if (x.hp <= 0) { knockout(x, null); return true; }
    return false;
  }
  /** HP cost (Dragon Pounce): a resource debit, not damage; never below 1 HP; no shield or Guarded reduces it. */
  function hpCost(x, amount, abilityId) {
    const loss = Math.min(amount, Math.max(0, x.hp - 1)); const before = x.hp; x.hp -= loss;
    if (LOG) log('hp_cost', x, x, `${$E('clashlog.pays_hp', { name: x.c.name, loss })}`, { amount: loss, hpBefore: before, hpAfter: x.hp, abilityId, stage: 'resolution' });
    return loss;
  }
  /** Set HP directly (Root Communion apportionment, donations): logged with provenance; never below 1 or above max; not a heal event. */
  function setHp(x, hp, src, abilityId, why) {
    const nh = Math.max(1, Math.min(x.c.maxHp, hp)); const before = x.hp; x.hp = nh;
    if (src && src.side === x.side && nh > before) performance.support(src.c.monsterId, supportKey(src, abilityId), x.c.id, { healed: nh - before, maxHp: x.c.maxHp });
    if (LOG) log('hp_set', src, x, `${x.c.name}: ${before} -> ${nh} HP (${why})`, { hpBefore: before, hpAfter: nh, delta: nh - before, abilityId, stage: 'resolution', why });
    return nh - before;
  }
  const ordinaryAttack = (x, t) => strike(x, t, { tag: 'ordinary' });

  // ---- delayed impacts, constructs, schedules (S5 primitives; P9 diagnostics)
  const delayed = []; let delayedSeq = 0; const diag = { overflow: [], constructs: 0, schedules: { a: 0, b: 0 } };
  function diagnostic(kind, detail) { diag.overflow.push({ kind, ex, ...detail }); if (LOG) log('diagnostic', null, null, `${$E('clashlog.p9_diagnostic_over_its_threshold', { kind, stringify: JSON.stringify(detail) })}`, { kind, detail, stage: 'trigger' }); }
  /** Schedule a delayed impact for the end of exchange ex + after (default 1), marking the target side's active position (or lineup index). */
  function scheduleDelayed(owner, { abilityId, targetSide, targetId, after = 1, data = {} }) {
    const item = { id: ++delayedSeq, ownerId: owner.c.id, abilityId, side: targetSide, slot: 'active', launchTargetId: targetId, launchedEx: ex, impactEx: ex + after, data: { ...data } };
    delayed.push(item);
    const pending = delayed.filter((d) => d.ownerId[0] === owner.c.id[0]).length;
    if (pending > P9_CLASH_LIMITS.delayedPerSide) diagnostic('delayed impacts per side', { side: owner.side.key, pending });
    if (LOG) log('delayed_launch', owner, byId.get(targetId) || null, `${$E('clashlog.is_launched_impact_at_the_end', { name: owner.c.name, abilityId, impactEx: item.impactEx })}`, { abilityId, impactEx: item.impactEx, slot: item.slot, stage: 'activation', delayedId: item.id });
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
      if (LOG) log('delayed_impact', owner, occupant || null, `${$E('clashlog.s_impacts', { name: owner.c.name, abilityId: item.abilityId, koed: owner.koed ? $E('clashlog.at_its_pre_ko_strength') : '' })}`, { abilityId: item.abilityId, delayedId: item.id, occupant: frozen.occupantId, others: frozen.others, stage: 'resolution', postKO: owner.koed || undefined });
      callC('delayedImpact', owner, { ...item, frozen });
      if (winner) return true;
    }
    return !!winner;
  }

  // ---- signature restriction (Eye of the Storm): engine-owned; counts the target's normal turns, pauses in reserve
  function restrictSignature(target, turns, src, abilityId) {
    const token = src.side !== target.side ? ++controlSeq : null;
    if (token) control.set(token, performance.control(src.c.monsterId));
    target.sigRestrict = { left: turns, by: src.c.id, abilityId, appliedInTurn: target.inTurn, ...(token ? { gradeControl: token } : {}) };
    if (LOG) log('signature_restricted', src, target, `${$E('clashlog.is_restricted_to_ordinary_attacks_for', { name: target.c.name, turns, n: turns })}`, { abilityId, turns, stage: 'resolution' });
  }

  // ---- clocks: cooldowns (owner normal turns) with extension / reduction (Circuit Breaker, Fresh Start)
  function startClock(x, spec) { const k = addClock(x, spec); if (LOG) log('clock_start', x, x, `${$E('clashlog.starts_normal_turns', { name: x.c.name, kind: k.kind, id: k.id, left: k.left, n: k.left })}`, { clock: k.id, clockKind: k.kind, left: k.left, excluded: k.excludeTurn === x.turns && x.inTurn, abilityId: spec.source ?? null }); return k; }
  function adjustClock(x, clockId, delta, src, abilityId) {
    const used = src && src.side !== x.side ? performance.control(src.c.monsterId) : null;
    const k = x.clocks.find((c) => c.id === clockId); if (!k) return null;
    const before = k.left; k.left = Math.max(0, k.left + delta);
    if (k.left !== before) used?.();
    if (LOG) log('clock_adjust', src, x, `${$E('clashlog.s_cooldown', { name: x.c.name, id: k.id, before, left: k.left })}`, { clock: k.id, before, after: k.left, abilityId, stage: 'resolution' });
    if (k.left <= 0) { x.clocks = x.clocks.filter((c) => c !== k); if (LOG) log('clock_end', x, x, `${$E('clashlog.ends_reduced_to_zero_readiness_restored', { name: x.c.name, kind: k.kind, id: k.id })}`, { clock: k.id, clockKind: k.kind, turn: x.turns }); }
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
    rng: { chance: (p, self, label_) => { const r = rng.chance(p); if (LOG) log('roll', byId.get(self?.id) || null, null, `${self?.name ?? $E('clashlog.roll')}: ${label_ || 'chance'} ${Math.round(p * 100)}% -> ${r ? 'success' : 'failure'}`, { chance: p, success: r, abilityId: self?.abilityId ?? null, stage: 'resolution' }); return r; }, next: () => rng.next() },
    log: (self, kind, text, extra = {}) => { if (LOG) log(kind, byId.get(self.id) || null, extra.targetId ? byId.get(extra.targetId) || null : null, text, { abilityId: self.abilityId, ...extra }); },
    /** The reviewer stream stages: trigger met, activation, resolution (engine events), cleanup. */
    trigger: (self, text, extra = {}) => { if (LOG) log('trigger', byId.get(self.id), extra.targetId ? byId.get(extra.targetId) || null : null, `${$E('clashlog.triggers', { name: self.name, abilityId: self.abilityId, text })}`, { abilityId: self.abilityId, stage: 'trigger', ...extra }); },
    activate: (self, text, extra = {}) => { if (LOG) log('ability', byId.get(self.id), extra.targetId ? byId.get(extra.targetId) || null : null, `${$E('clashlog.activates', { name: self.name, abilityId: self.abilityId, text })}`, { abilityId: self.abilityId, stage: 'activation', ...extra }); },
    cleanup: (self, text, extra = {}) => { if (LOG) log('cleanup', byId.get(self.id), extra.targetId ? byId.get(extra.targetId) || null : null, `${self.name}: ${self.abilityId} ${text}`, { abilityId: self.abilityId, stage: 'cleanup', ...extra }); },
    unmet: (self, conditions, extra = {}) => { reportUnmet(extra.hook || 'contract', self.id, { abilityId: self.abilityId, unmet: conditions.map((c) => (typeof c === 'string' ? { condition: c } : c)) }); return { unmet: conditions.map((c) => (typeof c === 'string' ? { condition: c } : c)), abilityId: self.abilityId, reported: true }; },
    /**
     * A decision that depends on an unruled point (flags.js PROVISIONAL_POINTS; owner ruling 2026-11-09 rule 1). Normal gameplay: logs
     * `unmet: awaiting ruling` and returns false (the caller does not activate; its use is preserved). Provisional mode: logs the
     * labelled reading and returns true.
     */
    provisional: (self, pointId, detail = '') => {
      const p = provisionalPoint(pointId); const x = byId.get(self.id) || null;
      if (p.approved) return true; // N9c: approved behavior is available without provisional mode or labels
      if (PROV) { if (LOG) log('provisional', x, null, `${$E('clashlog.uses_the_provisional_reading', { name: self.name, abilityId: self.abilityId, pointId, reading: p.reading })}${detail ? `: ${detail}` : ''}`, { abilityId: self.abilityId, point: pointId, provisional: true, stage: 'activation', waitsOn: p.waitsOn }); return true; }
      reportUnmet('provisional', self.id, { abilityId: self.abilityId, unmet: [{ condition: 'awaiting ruling', point: pointId, waitsOn: p.waitsOn, detail }] });
      return false;
    },
    provisionalMode: () => PROV,
    /** D5: would the ordinary-only perk change this hit? (a Striker against a Shielded target; a Disruptor against an active Tank) */
    perkDecisive: (self, foeId) => { const me = need(self.id); const f = foeId ? byId.get(foeId) : null; if (!f) return false; return (me.c.perks.shieldBreak > 1 && f.status?.id === 'shielded' && f.status.payload?.remaining > 0) || (me.c.perks.pierce && f.active && f.c.perks.guard < 1); },
    /** Mastery execution record (spec §6): one credit per valid execution; a passive at most once per cap scope (this battle). */
    executed: (self, { passive = false } = {}) => { const x = need(self.id); if (passive) { if (x.passiveCredited) return false; x.passiveCredited = true; } x.executions += 1; if (LOG) log('execution', x, null, `${$E('clashlog.execution_recorded', { name: x.c.name, abilityId: self.abilityId, passive: passive ? $E('clashlog.passive_once_per_battle') : '', executions: x.executions })}`, { abilityId: self.abilityId, executions: x.executions, passive }); return true; },
    // statuses
    applyStatus: (self, targetId, attempt) => applyStatus(need(targetId), { sourceId: self.id, abilityId: self.abilityId, ...attempt }),
    applyStatuses: (self, attempts) => applyStatusBatch(attempts.map((t) => ({ sourceId: self.id, abilityId: self.abilityId, ...t }))),
    cleanse: (self, targetId) => cleanse(need(targetId), self.id, self.abilityId),
    replaceStatus: (self, targetId, attempt, opts) => replaceStatus(need(targetId), { sourceId: self.id, abilityId: self.abilityId, ...attempt }, opts),
    removeStatus: (self, targetId, reason) => removeStatus(need(targetId), need(self.id), self.abilityId, reason || 'removed'),
    transferStatus: (self, fromId, toId, opts) => transferStatus(need(fromId), need(toId), need(self.id), self.abilityId, opts),
    setFreeze: (self, targetId, turns) => { const x = need(targetId); if (!x.status || STATUS[x.status.id].kind !== 'harmful') return false; x.status = { ...x.status, freeze: turns }; if (LOG) log('status_freeze', byId.get(self.id), x, `${$E('clashlog.s_countdown_is_frozen_for_normal', { name: x.c.name, name2: NAME[x.status.id], turns, n: turns })}`, { status: x.status.id, freeze: turns, abilityId: self.abilityId, stage: 'resolution' }); return true; },
    holdStatusTick: (self, targetId) => { const x = need(targetId); if (x.status) x.status = { ...x.status, appliedThisUnit: true }; }, // Lightning Rod: no second decrement this turn
    decrementStatus: (self, targetId) => { const x = need(targetId); if (!x.status) return null; const r = statusEndOfTurn({ ...x.status, appliedThisUnit: false }); if (r.slot) x.status = r.slot; else clearStatus(x, 'expired', { abilityId: self.abilityId }); if (LOG && r.slot) log('status_tick', byId.get(self.id), x, `${$E('clashlog.s_loses_one_turn_left', { name: x.c.name, name2: NAME[x.status.id], remaining: x.status.remaining })}`, { status: x.status.id, remaining: x.status.remaining, abilityId: self.abilityId }); return x.status; },
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
      if (curAttack && att.c.id !== curAttack.attacker && (curAttack.suppressRetaliation || curAttack.noRetaliation)) { reportUnmet('reaction', self.id, { abilityId: self.abilityId, unmet: [{ condition: 'retaliation allowed', detail: curAttack.suppressRetaliation ? $E('clashlog.attack_retaliation_is_suppressed_by_the') : `${$E('clashlog.a_strike_triggers_no_reactions', { tag: curAttack.tag })}` }] }); return { suppressed: true, launched: false, landed: false, missed: false, hits: [], hpDamage: 0, shieldDamage: 0, kos: [], decided: false }; }
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
    queueRotation: (self, sideKey, outId, incomingId) => { queuedRotations.push({ side: sideKey, outId, inId: incomingId, abilityId: self.abilityId }); if (LOG) log('rotation_queued', byId.get(self.id), byId.get(outId), `${$E('clashlog.s_delayed_rotation_is_released_for', { name: byId.get(outId).c.name })}`, { abilityId: self.abilityId, stage: 'resolution' }); },
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
      const inc = byId.get(incomingId); if (!inc || inc.koed || inc.active || inc.side !== side) return { rotated: false, decided: false, unmet: [{ condition: $E('clashlog.incoming_is_a_living_reserve'), detail: incomingId }] };
      const out = side.active; const decided = executeRotation(side, inc, 'relay', { reason: 'relay', penalty: false, abilityId: self.abilityId });
      const rotated = !out.koed && !out.active && inc.active; // a departing ally knocked out before it leaves (Riptide Pursuit) is a failed rotation
      return { rotated, decided, unmet: rotated ? [] : [{ condition: $E('clashlog.the_rotation_completed'), detail: out.koed ? `${out.c.name} was knocked out before departing` : $E('clashlog.not_completed') }] };
    },
    // delayed impacts, constructs, schedules
    delay: (self, opts) => scheduleDelayed(need(self.id), { abilityId: self.abilityId, ...opts }),
    pendingDelayed: () => delayed.map((d) => ({ ...d })),
    construct: (self, delta) => { diag.constructs += delta; if (diag.constructs > P9_CLASH_LIMITS.constructsPerBattle) diagnostic($E('clashlog.twin_thunder_constructs_per_battle'), { constructs: diag.constructs }); },
    schedule: (self, delta) => { const k = need(self.id).side.key; diag.schedules[k] += delta; if (diag.schedules[k] > P9_CLASH_LIMITS.dawnSongSchedulesPerSide(S[k].line.length)) diagnostic($E('clashlog.dawn_song_schedules_per_side'), { side: k, schedules: diag.schedules[k] }); },
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
    // Task 10: 'auto' on the continuous player policy hands the side to the AI from this rotation phase, legal or not (the approved
    // "Auto for the rest", D1; also what a headless settlement records).
    if (side.policy === 'player' && (session?.decisions?.[side.key]?.[ex] ?? cfg.decisions?.[side.key]?.[ex]) === 'auto') { side.policy = 'ai'; if (LOG) log('rotation_decision', side.active, null, `${$E('clashlog.auto_for_the_rest_of_this', { toUpperCase: side.key.toUpperCase() })}`, { side: side.key, decision: 'auto' }); }
    const L = voluntaryLegality(side);
    if (!L.legal) { if (L.lock && LOG) log('rotation_unavailable', side.active, null, `${$E('clashlog.cannot_rotate', { name: side.active.c.name, reason: L.lock.reason || 'locked' })}`, { side: side.key, unmet: L.unmet, stage: 'trigger' }); return null; }
    const reserves = reservesOf(side);
    if (side.policy === 'manual' || side.policy === 'player') {
      const d = session?.decisions?.[side.key]?.[ex] ?? cfg.decisions?.[side.key]?.[ex];
      if (d === undefined && side.policy === 'player') return null; // continuous battle (Task 10): no tap, no switch, no prompt
      if (d === undefined) return { pending: { kind: 'rotation', ex, side: side.key, activeId: side.active.c.id, options: ['stay', 'auto', ...reserves.map((x) => x.c.id)], reserves: reserves.map(optionView) } };
      if (d === 'auto') { side.policy = 'ai'; if (LOG) log('rotation_decision', side.active, null, `${$E('clashlog.auto_for_the_rest_of_this', { toUpperCase: side.key.toUpperCase() })}`, { side: side.key, decision: 'auto' }); }
      else if (d === 'stay') { if (LOG) log('rotation_decision', side.active, null, `${$E('clashlog.stays_in_your_call', { name: side.active.c.name })}`, { side: side.key, decision: 'stay' }); return null; }
      else {
        const pick = reserves.find((x) => x.c.id === d || x.c.monsterId === d);
        if (!pick) throw new Error(`Decision ${side.key}/${ex} names ${d}, which is not a living reserve`);
        if (LOG) log('rotation_decision', side.active, pick, `${$E('clashlog.rotates_out_for_your_call', { name: side.active.c.name, name2: pick.c.name })}`, { side: side.key, decision: pick.c.id });
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
    if (dl?.delay) { if (LOG) log('rotation_delayed', out, incoming, `${$E('clashlog.s_rotation_is_delayed', { name: out.c.name })}`, { abilityId: dl.abilityId ?? null, by: dl.by, stage: 'activation', unmet: [{ condition: $E('clashlog.not_delayed'), abilityId: dl.abilityId ?? null }] }); return false; }
    // 2. Riptide Pursuit's hit on the departing monster; 3. Shell Harvest cash-out
    for (const hook of ['pursuit', 'cashOut']) {
      for (const y of livingStable()) { if (runDescriptors(hookList(callC(hook, y, info)), y.c.id, hook)) return true; if (winner) return true; }
      if (probes.length) for (const y of stable()) if (runDescriptors(hookList(probe(hook, y.c.id, info)), y.c.id, hook)) return true;
    }
    if (out.koed) { if (LOG) log('rotation_cancelled', out, incoming, `${$E('clashlog.is_knocked_out_before_it_can', { name: out.c.name })}`, { rule: $E('clashlog.b3_rule_4_ordinary_replacement') }); return settleHit(); }
    // 4. departure; 5. the entrant's entry effects (in enter); 6. Cold Welcome and Downdraft on the entrant
    side.lastVoluntary = ex; side.rotations += 1;
    if (LOG) log('rotation', out, incoming, `${$E('clashlog.rotates_out_for', { by: by === 'manual' ? $E('clashlog.your_call') : by === 'relay' ? $E('clashlog.feather_relay') : by === 'delayed' ? $E('clashlog.delayed_request') : 'AI', name: out.c.name, name2: incoming.c.name, penalty: penalty ? '' : $E('clashlog.no_entry_penalty') })}`, { side: side.key, voluntary: reason === 'voluntary', reason, out: out.c.id, in: incoming.c.id, by, ...(abilityId ? { abilityId, stage: 'resolution' } : {}), ...(penalty ? {} : { noPenalty: true }) });
    depart(out, reason); enter(incoming, reason); if (penalty) incoming.p8pending = true;
    const ar = { side: side.key, in: incoming.c.id, out: out.c.id, reason };
    for (const y of livingStable()) if (runDescriptors(hookList(callC('arrival', y, ar)), y.c.id, 'arrival')) return true;
    if (probes.length) for (const y of stable()) if (runDescriptors(hookList(probe('arrival', y.c.id, ar)), y.c.id, 'arrival')) return true;
    return settleHit();
  }
  function forcedRotation(src, side, { incoming = 'firstReserve', abilityId = null } = {}) {
    const used = src.side !== side ? performance.control(src.c.monsterId) : null;
    const out = side.active; const unmet = [];
    const reserves = reservesOf(side);
    if (!out) unmet.push({ condition: 'active monster' });
    if (!reserves.length) unmet.push({ condition: 'living reserve' });
    if (ex - side.lastForced < FORCED_EVERY) unmet.push({ condition: 'forced-rotation pacing', need: FORCED_EVERY, have: ex - side.lastForced });
    if (out && out.entry?.ex === ex) unmet.push({ condition: 'just-entered protection', detail: `${$E('clashlog.entered_this_exchange', { name: out.c.name, reason: out.entry.reason })}` });
    const lock = !unmet.length ? lockOf(out, true) : null; if (lock) unmet.push({ condition: 'rotation lock or immunity', detail: lock.reason || 'locked', abilityId: lock.abilityId ?? null, by: lock.by });
    const inc = !unmet.length ? (incoming === 'firstReserve' ? reserves[0] : reserves.find((x) => x.c.id === incoming)) : null;
    if (!unmet.length && !inc) unmet.push({ condition: $E('clashlog.chosen_replacement_is_a_living_reserve'), detail: String(incoming) });
    if (unmet.length) { if (LOG) log('rotation_refused', src, out || null, `${$E('clashlog.s_forced_rotation_is_refused', { name: src.c.name })}${unmet.map((u) => u.condition).join(', ')})`, { forced: true, abilityId, unmet, stage: 'trigger' }); return false; }
    side.lastForced = ex; side.forced += 1; used?.();
    if (LOG) log('rotation', src, out, `${$E('clashlog.forces_out_comes_in', { name: src.c.name, name2: out.c.name, name3: inc.c.name })}`, { side: side.key, voluntary: false, forced: true, out: out.c.id, in: inc.c.id, abilityId, stage: 'resolution' });
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
    if (LOG) log('turn_start', x, null, `${$E('clashlog.s_turn', { name: x.c.name, turns: x.turns })}`, { turn: x.turns });
    callC('turnStart', x); probe('turnStart', x.c.id);
    // The Stunned check (P6 3.2; STA-01; D4): see M4_STATUS.md "D4". A skipped turn still counts as a normal turn.
    let hold = false; let stunnedSkip = false;
    if (clashEffect(x.status).stunned) {
      if (x.stunProtected) { hold = true; if (LOG) log('stun_safeguard', x, null, `${$E('clashlog.is_stunned_but_cannot_lose_two', { name: x.c.name, remaining: x.status.remaining, n: x.status.remaining })}`, { turn: x.turns, remaining: x.status.remaining }); }
      else stunnedSkip = true;
    }
    x.stunProtected = false;
    if (x.p8pending) {
      const pen = rotationEntryPenalty({ firstAfterVoluntaryRotation: true, stunnedSkip }); x.p8pending = false; x.p8 = { factor: pen.factor };
      if (LOG) log('entry_penalty', x, null, stunnedSkip ? `${$E('clashlog.s_entry_penalty_is_spent_by', { name: x.c.name })}` : `${$E('clashlog.acts_at_half_strength_first_turn', { name: x.c.name })}`, { factor: pen.factor, spentBy: stunnedSkip ? 'stunned skip' : 'turn' });
    }
    let done = false;
    if (stunnedSkip) {
      controlUsed(x);
      x.skips += 1; x.consecutiveSkips += 1; x.stunnedSkips += 1; x.stunProtected = true;
      if (LOG) log('skip', x, null, `${$E('clashlog.is_stunned_and_skips_its_turn', { name: x.c.name })}`, { turn: x.turns, cause: 'stunned', remaining: x.status.remaining });
      callC('stunnedSkip', x, { turn: x.turns });
    } else {
      // The team action opportunity (Feather Relay, left unmet) before the active chooses: reserves in lineup order.
      let teamActed = false;
      for (const y of reservesOf(x.side)) { const r = callC('teamAction', y, { activeId: x.c.id }); if (r?.run) { const tr = r.run(api, y.self) || {}; if (tr.acted) { teamActed = true; done = !!tr.decided; if (LOG) log('team_action', y, x, `${$E('clashlog.s_took_the_teams_normal_action', { name: y.c.name, abilityId: y.mod.abilityId })}`, { abilityId: y.mod.abilityId, stage: 'cleanup' }); break; } } }
      if (!teamActed && (x.koed || !x.active)) { teamActed = true; done = endCheck(); } // the active ally is gone (a failed relay): its turn ends
      // Signature restriction (Eye of the Storm): a restricted active uses the ordinary attack instead of its ready, repeatable signature;
      // its contract is not asked, so nothing is spent. Passives, entry effects, reactions and once-per-Clash casts are not restricted.
      const restricted = !!x.sigRestrict && x.mod && restrictable(x.mod.abilityId);
      let choice = null;
      if (!done && !teamActed) {
        if (restricted) { control.get(x.sigRestrict.gradeControl)?.(); if (LOG) log('signature_restricted', x, null, `${$E('clashlog.must_use_an_ordinary_attack', { name: x.c.name, abilityId: x.sigRestrict.abilityId })}`, { abilityId: x.sigRestrict.abilityId, restricted: x.mod.abilityId, stage: 'resolution', left: x.sigRestrict.left }); }
        else choice = callC('chooseAction', x, { foeId: other(x.side).active?.c.id ?? null, restricted: !!x.sigRestrict });
        if (choice == null) choice = probe('chooseAction', x.c.id);
      }
      if (teamActed) { /* the team's normal action was used by a reserve support action (Feather Relay) */ }
      else if (!done && choice?.kind === 'skip') { x.skips += 1; x.consecutiveSkips += 1; if (LOG) log('skip', x, null, `${$E('clashlog.s_turn_is_skipped', { name: x.c.name })}`, { turn: x.turns }); }
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
        if (r.held && LOG) log('status_hold', x, x, `${$E('clashlog.s_stunned_is_held_this_turn', { name: x.c.name, remaining: x.status.remaining })}`, { status: id, remaining: x.status.remaining, reason: $E('clashlog.d4_protected_turn') });
        if (r.froze && LOG) log('status_freeze', x, x, `${$E('clashlog.s_countdown_is_frozen_freeze_turns', { name: x.c.name, name2: NAME[id], freeze: r.slot.freeze, n: r.slot.freeze })}`, { status: id, freeze: r.slot.freeze });
        if (r.slot) x.status = r.slot; else clearStatus(x, 'expired');
      }
      if (x.sigRestrict) { if (x.sigRestrict.appliedInTurn) x.sigRestrict.appliedInTurn = false; else { x.sigRestrict.left -= 1; if (x.sigRestrict.left <= 0) { if (LOG) log('signature_restriction_end', x, x, `${x.c.name} may use its signature again`, { abilityId: x.sigRestrict.abilityId, stage: 'cleanup' }); x.sigRestrict = null; } } }
      for (const k of tickClocks(x)) if (LOG) log('clock_end', x, x, $E('clashlog.ends', { name: x.c.name, kind: k.kind, id: k.id }), { clock: k.id, clockKind: k.kind, turn: x.turns, abilityId: k.source ?? null });
      probe('endOfTurn', x.c.id);
      for (const y of livingStable()) callC('anyEndOfTurn', y, { id: x.c.id, side: x.side.key });
    }
    x.p8 = null; x.inTurn = false;
    return done || endCheck();
  }

  function healMultiplier() { if (ex < C6.from) return 1; const quiet = ex - lastKO; if (quiet >= C6.quarterAfter) return C6.quarter; if (quiet >= C6.halfAfter) return C6.half; return 1; }

  // ---- opening
  if (LOG) events.push({ seq: 0, ex: 0, phase, turnIndex: 0, hit: null, kind: 'start', ...((text) => ({ text, ...$lineOf(text) }))($E('clashlog.beast_clash_t8_v_sudden_death', { n: a.length, n2: b.length, model, sdFrom })), model, ruleset: V.ruleset, abilities: ABILITIES });
  if (carryIn) for (const [mid, slot] of Object.entries(carryIn)) {
    const x = all().find((y) => y.c.monsterId === mid); if (!x) throw new Error(`carryIn names ${mid}, who is not in this battle`);
    const t = slot ? fromFootball(slot, x.c.maxHp) : null; if (t) { delete t.gradeControl; delete t.gradeSource; t.gradeUnattributed = true; } x.status = t;
    if (LOG) log(t ? 'status_carry' : 'status_end', null, x, t ? `${$E('clashlog.carries_into_the_clash_turns', { name: x.c.name, name2: NAME[t.id], remaining: t.remaining, n: t.remaining })}${t.id === 'shielded' ? `${$E('clashlog.shield', { remaining: t.payload.remaining })}` : ''})` : `${$E('clashlog.s_clears_on_entering_the_clash', { name: x.c.name, name2: NAME[slot?.id] || 'status' })}`, { status: slot?.id ?? null, slot: slotView(t), reason: t ? $E('clashlog.carry_in') : $E('clashlog.unsupported_in_clash') });
  }
  if (stage) for (const [id, st] of Object.entries(stage)) {
    const x = byId.get(id); if (!x) throw new Error(`stage names ${id}, who is not in this battle`);
    for (const k of Object.keys(st)) if (!['hp', 'status', 'ability'].includes(k)) throw new Error(`Unknown stage field ${k}`);
    if (st.hp != null) { if (!Number.isInteger(st.hp) || st.hp < 1 || st.hp > x.c.maxHp) throw new Error(`Staged HP for ${id} must be a whole number in 1..${x.c.maxHp}`); x.hp = st.hp; if (LOG) log('stage', null, x, `${$E('clashlog.staged_at_hp', { name: x.c.name, hp: st.hp, maxHp: x.c.maxHp })}`, { staged: true, hp: st.hp }); }
    if (st.status) { const r = applyStatus(x, { sourceId: 'stage', ...st.status }); if (LOG) log('stage', null, x, `${$E('clashlog.staged', { name: NAME[st.status.id] })} ${r.accepted ? 'applied' : `${$E('clashlog.refused', { reason: r.reason })}`}`, { staged: true, status: st.status.id, accepted: r.accepted }); }
    if (st.ability) { if (!x.ab) throw new Error(`stage.${id}.ability: ${x.c.name} has no Clash contract`); for (const k of Object.keys(st.ability)) if (!(k in x.ab)) throw new Error(`stage.${id}.ability.${k} is not a field of ${x.mod.abilityId}'s state`); Object.assign(x.ab, structuredClone(st.ability)); if (LOG) log('stage', null, x, `${$E('clashlog.staged_controlled_prerequisite_state', { abilityId: x.mod.abilityId, stringify: JSON.stringify(st.ability) })}`, { staged: true, controlled: true, abilityId: x.mod.abilityId, ability: structuredClone(st.ability) }); }
  }
  for (const side of [S.a, S.b]) enter(side.line[0], 'opening');

  // ---- the exchange loop (P6 "Beast Clash exchange", B3)
  const lineOut = (side) => side.line.map((x) => ({ id: x.c.id, monsterId: x.c.monsterId, species: x.c.species, name: x.c.name, archetype: x.c.archetype, type: x.c.type, basic: x.c.basic, form: x.c.form, tier: x.c.tier,
    hp: x.hp, maxHp: x.c.maxHp, active: x.active, koed: x.koed, koOrder: x.koOrder, turns: x.turns, skips: x.skips, stunnedSkips: x.stunnedSkips, entries: x.entries, performed: x.performed, status: x.status ? structuredClone(x.status) : null, clocks: x.clocks.map((k) => ({ id: k.id, kind: k.kind, left: k.left })), stats: { ...x.stats }, combatant: x.c,
    abilityId: x.mod?.abilityId ?? null, ability: x.ab ? structuredClone(x.ab) : null, executions: x.executions, passiveCredited: x.passiveCredited, sigRestrict: x.sigRestrict ? { ...x.sigRestrict } : null }));
  /** Task 10 session view: the battle so far, in the shape of a pending result (the arena plays it), plus the player's rotation options. */
  const sessionView = () => {
    const side = S.a; const res = reservesOf(side);
    const lines = { a: lineOut(S.a), b: lineOut(S.b) };
    return Object.freeze({ ruleset: V.ruleset, engine: V.engineVersion, pending: true, session: true, boundary: { kind: 'session', ex, side: 'a', lastSeq: events.length - 1 }, winner: null, by: null, exchanges: ex, seed, model, config: cfg, context,
      lines, log: events.slice(), rngDraws: draws, hpShare: null, sides: { a: { policy: S.a.policy, rotations: S.a.rotations, lastVoluntary: S.a.lastVoluntary }, b: { policy: S.b.policy, rotations: S.b.rotations, lastVoluntary: S.b.lastVoluntary } },
      rotation: { side: 'a', ex, policy: side.policy, lastSeq: events.length - 1, exchangesLeft: Math.max(0, CADENCE - (ex - side.lastVoluntary)), cadence: CADENCE, activeId: side.active?.c.id ?? null, reserves: res.map(optionView) } });
  };
  let stopped = null;
  if (stopAt != null && (!Number.isInteger(stopAt.exchange) || stopAt.exchange < 1 || (stopAt.turn != null && ![1, 2].includes(stopAt.turn)))) throw new Error('stopAt needs { exchange >= 1, turn? 1 | 2 }');
  while (ex < V.battle.exchangeCap && !winner) {
    ex += 1; ramp = rampFor(model, ex, sdFrom); healMult = healMultiplier();
    // 1. Round start: reserve windows (every living monster in stable lineup order: side A then side B, lineup order). Reserves are
    //    inert unless a contract's roundStart acts (Eclipse Call).
    phase = 'round_start';
    if (LOG) { if (ramp > 1) log('sudden_death', null, null, `${$E('clashlog.sudden_death_damage_x', { toFixed: ramp.toFixed(2) })}`, { ramp }); log('round_start', null, null, `${$E('clashlog.exchange', { ex })}`, { reserves: { a: living(S.a).filter((x) => !x.active).map((x) => x.c.id), b: living(S.b).filter((x) => !x.active).map((x) => x.c.id) } }); }
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
    if (why === 'speed') {
      const sa = fa.c.spd * clashEffect(fa.status).initiative, sb = fb.c.spd * clashEffect(fb.status).initiative;
      if (clashEffect(fa.status).initiative < 1 && Math.abs(fa.c.spd - sb) >= V.damage.initiativeTie && order[0] !== (fa.c.spd > sb ? fa : fb)) controlUsed(fa);
      if (clashEffect(fb.status).initiative < 1 && Math.abs(sa - fb.c.spd) >= V.damage.initiativeTie && order[0] !== (sa > fb.c.spd ? fa : fb)) controlUsed(fb);
    }
    for (const y of reservesOf(order[1].side)) { const r = callC('preInitiative', y, { order: order.map((x) => x.c.id), activeId: order[1].c.id, by: why }); if (r?.advance) { order = [order[1], order[0]]; why = `${$E('clashlog.advanced_by', { name: y.c.name })}`; break; } }
    if (LOG) log('initiative', order[0], order[1], `${$E('clashlog.acts_first', { name: order[0].c.name, why })}`, { by: why, order: order.map((x) => x.c.id) });
    // 3. Each active monster's turn, in initiative order.
    let turnNo = 0;
    for (const x of order) {
      turnNo += 1;
      if (x.koed || !x.active) { phase = 'turn'; if (LOG) log('turn_cancelled', x, null, `${$E('clashlog.s_turn_is_canceled', { name: x.c.name, koed: x.koed ? 'knocked out' : $E('clashlog.no_longer_active') })}`); }
      else if (takeTurn(x)) break;
      if (stopAt && stopAt.exchange === ex && stopAt.turn === turnNo && !winner) { stopped = { kind: 'turn', ex, turn: turnNo }; break; }
    }
    if (winner || stopped) break;
    if (session) yield sessionView(); // Task 10: the session shows this exchange and takes the player's command for the rotation phase below
    // 4. Rotation phase (P8).
    phase = 'rotation';
    if (LOG) log('rotation_phase', null, null, $E('clashlog.rotation_phase'), { cadence: { a: ex - S.a.lastVoluntary >= CADENCE, b: ex - S.b.lastVoluntary >= CADENCE } });
    for (const y of livingStable()) callC('rotationPhase', y);
    probe('rotationPhase');
    // A queued (delayed) voluntary rotation executes first, when legal; otherwise it keeps waiting.
    for (const q of [...queuedRotations]) {
      const side = S[q.side]; const out = byId.get(q.outId); const inc = byId.get(q.inId);
      if (!out || out.koed || !out.active || side.active !== out) { queuedRotations.splice(queuedRotations.indexOf(q), 1); if (LOG) log('cancelled', out || null, null, $E('clashlog.the_delayed_rotation_lapses_its_monster'), { abilityId: q.abilityId, stage: 'cleanup' }); continue; }
      const target = inc && !inc.koed && !inc.active ? inc : reservesOf(side)[0]; const L = voluntaryLegality(side);
      if (!target || !L.legal) continue;
      queuedRotations.splice(queuedRotations.indexOf(q), 1);
      if (step(() => executeRotation(side, target, 'delayed', { reason: 'voluntary', skipDelay: true, abilityId: q.abilityId }))) break;
    }
    if (winner) break;
    const requests = [];
    for (const side of [S.a, S.b]) { if (side.lastVoluntary === ex) continue; const r = rotationRequest(side); if (r?.pending) { stopped = r.pending; break; } if (r?.incoming) requests.push({ side, ...r }); }
    if (stopped) { if (LOG) log('rotation_prompt', byId.get(stopped.activeId) || null, null, `${$E('clashlog.side_may_rotate_waiting_for_a', { toUpperCase: stopped.side.toUpperCase() })}`, { pending: true, side: stopped.side, options: stopped.options }); break; }
    for (const q of requests) if (step(() => executeRotation(q.side, q.incoming, q.by))) break;
    if (winner) break;
    // 5. End of exchange: delayed impacts (Falling Star, Faultline), in launch order, then the contracts' end-of-exchange hooks.
    phase = 'end_of_exchange';
    if (resolveDelayed()) break;
    for (const y of livingStable()) callC('endOfExchange', y);
    probe('endOfExchange');
    if (LOG) log('exchange_end', null, null, `${$E('clashlog.end_of_exchange', { ex })}`);
    if (stopAt && stopAt.exchange === ex && stopAt.turn == null) { phase = 'end_check'; if (!endCheck()) { stopped = { kind: 'exchange', ex }; break; } }
    // 6. End check.
    phase = 'end_check';
    if (endCheck()) break;
  }

  // ---- the cap (D8 provisional): pending delayed impacts are discarded (or resolved, per the flag), then HP share, then the coin
  if (!winner && !stopped && delayed.length) {
    if (PROV && flag('d8CapDelayed') === 'resolve') { phase = 'end_of_exchange'; for (const d of delayed) d.impactEx = ex; if (LOG) log('provisional', null, null, $E('clashlog.pending_delayed_impacts_resolve_at_the'), { point: 'd8-cap-delayed', provisional: true }); resolveDelayed(); }
    else for (const d of delayed.splice(0)) {
      const o = byId.get(d.ownerId) || null;
      if (PROV) { if (LOG) log('provisional', o, null, `${$E('clashlog.s_pending_is_discarded_at_the', { name: o?.c.name, abilityId: d.abilityId })}`, { abilityId: d.abilityId, point: 'd8-cap-delayed', provisional: true, stage: 'cleanup', rule: $E('clashlog.exchange_cap_provisional_d8') }); }
      else if (LOG) { log('unmet', o, null, `${$E('clashlog.s_pending_does_not_resolve_the', { name: o?.c.name, abilityId: d.abilityId })}`, { abilityId: d.abilityId, stage: 'trigger', hook: 'cap', unmet: [{ condition: 'awaiting ruling', point: 'd8-cap-delayed', waitsOn: provisionalPoint('d8-cap-delayed').waitsOn }] }); log('cancelled', o, null, `${$E('clashlog.s_pending_lapses_with_the_battle', { name: o?.c.name, abilityId: d.abilityId })}`, { abilityId: d.abilityId, stage: 'cleanup', rule: $E('clashlog.exchange_cap_d8_open') }); }
    }
  }
  const hpShare = (side) => { const t = side.line.reduce((s, x) => s + x.c.maxHp, 0); return side.line.reduce((s, x) => s + x.hp, 0) / t; };
  const share = { a: hpShare(S.a), b: hpShare(S.b) };
  phase = stopped ? 'boundary' : 'end';
  if (!winner && !stopped) {
    if (share.a !== share.b) { winner = share.a > share.b ? 'a' : 'b'; by = 'hp'; if (LOG) log('cap', null, null, `${$E('clashlog.exchange_cap_reached_side_has_more', { toUpperCase: winner.toUpperCase(), n: Math.round(share.a * 100), n2: Math.round(share.b * 100) })}`, { share }); }
    else { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; if (LOG) log('cap', null, null, `${$E('clashlog.exchange_cap_reached_with_an_exact', { toUpperCase: winner.toUpperCase() })}`, { share, coin: true }); }
  }
  let carryOut = null;
  if (stopped) { /* a boundary is not the end of the battle */ }
  else if (context === 'standalone') { for (const x of all()) if (x.status) clearStatus(x, $E('clashlog.end_of_a_standalone_battle')); }
  else { carryOut = {}; for (const x of all()) if (x.status) { const t = toFootball(x.status, x.c.maxHp); if (t) carryOut[x.c.monsterId] = t; } }
  if (LOG && !stopped) log('end', null, null, `${$E('clashlog.side_wins_by_after_exchanges', { toUpperCase: winner.toUpperCase(), by: by === 'knockout' ? 'knockout' : by === 'hp' ? $E('clashlog.hp_share') : 'coin flip', ex, n: ex })}`, { winner, by });

  const lines = { a: lineOut(S.a), b: lineOut(S.b) };
  const sides = { a: { policy: S.a.policy, rotations: S.a.rotations, forced: S.a.forced, lastVoluntary: S.a.lastVoluntary }, b: { policy: S.b.policy, rotations: S.b.rotations, forced: S.b.forced, lastVoluntary: S.b.lastVoluntary } };
  const mastery = {}; for (const x of all()) if (x.mod) mastery[x.c.monsterId] = { abilityId: x.mod.abilityId, executions: x.executions, passiveCredited: x.passiveCredited };
  const boundary = stopped ? { ...stopped, rngDraws: draws, stateHash: stateHash({ winner: null, by: null, ex, draws, lines }), lastSeq: events.length - 1 } : null;
  const result = {
    ruleset: V.ruleset, engine: V.engineVersion, pending: !!stopped, boundary, sides,
    winner: stopped ? null : winner, by: stopped ? null : by, exchanges: ex, capped: !stopped && !!(ex >= V.battle.exchangeCap && by !== 'knockout'), seed, model, config: cfg,
    context, carryOut, hpShare: share, lines, log: events, rngDraws: draws, probed: probes.length > 0, staged: !!stage, provisional: PROV,
    performance: performance.result(), mastery, delayed: delayed.map((d) => ({ ...d })), diagnostics: { overflow: diag.overflow, constructs: diag.constructs, schedules: { ...diag.schedules } },
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
