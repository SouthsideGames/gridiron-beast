// Beast Clash in Franchise Mode: the one franchise file that imports the Clash engine (owner authorization, 2026-10-21; GDD §26).
// It turns roster monsters into battles and battle results into roster effects. The engine itself stays pure and deterministic:
// every battle here is a seed (drawn once from the franchise generator), two lineups of real monsters and the player's recorded
// decisions, so the same battle can be rebuilt for the screen, for a replay or for a test. The permanent balance values are the
// game's defaults (battleConfig with no overrides); nothing here changes them.
import { applyActivity } from './reward-ledger.js';
import { clashAward } from './t8/awards.js';
import { applyAward } from './progression.js';
import * as FR from '../core/fraction.js';
import { simulateByRuleset, logHashFor, battleConfig, chooseLineup, archetypeOf, CLASH_VALUES, T8_RULESET, T8_VALUES, t8Config } from '../clash/index.js';
import { createRng } from '../core/rng.js';
import { monsterOverall, xpForLevel } from '../data/monsters.js';
import { tierIndex } from './t8/mastery.js';

/** Battle sizes by occasion (GDD §26). */
export const CLASH_SIZE = Object.freeze({ encounter: 3, pregame: 3, overtime: 3, overtimePlayoff: 5 });
/** Fatigue a battle costs each monster that took part (CLASH_VALUES.load, provisional values from Phase 1). */
export const CLASH_FATIGUE = Object.freeze({ encounter: CLASH_VALUES.load.battle, pregame: CLASH_VALUES.load.opening, overtime: CLASH_VALUES.load.overtime });
/**
 * How a battle is shown (revised 2026-10-22, owner brief "one selection, one continuous battle"): 'watch' animates it, 'skip'
 * shows the result at once. Both are the identical battle. Older saves and settings may still say 'play' or 'auto'; normalizeMode
 * maps them to 'watch'.
 */
export const CLASH_MODES = Object.freeze(['watch', 'skip']);
export const LEGACY_MODES = Object.freeze({ play: 'watch', auto: 'watch' });
export function normalizeMode(mode) { return CLASH_MODES.includes(mode) ? mode : LEGACY_MODES[mode] || null; }
export const CLASH_SPEEDS = Object.freeze([1, 2, 4]);
/**
 * Swap policies of a LEGACY franchise battle (records from before Task 8 M4): neither side swaps voluntarily; the lineup order is
 * the order of entry. Battles recorded under this rule keep the policies they were played with (D19).
 */
export const FRANCHISE_POLICIES = Object.freeze({ a: 'none', b: 'none' });
/** Exchanges between voluntary swaps (the engine's rule); only legacy 'play' records still carry decisions. */
export const SWAP_EVERY = CLASH_VALUES.swaps.voluntaryEvery;

// ------------------------------------------------------------------------------------------------ Task 8 M4 S12: versioned records
/**
 * Every battle record names the engine that plays it (N8d D19: "Completed pre-M4 Clash records replay through the isolated
 * historical engine. New battles use the versioned Task 8 engine once integrated."):
 *   - version 1 (implicit: no `version`, no `ruleset`): a pre-M4 record. It replays on the frozen legacy engine with the policies
 *     it was played with. Nothing is rewritten.
 *   - version 2: `ruleset: 't8'`, `engine` (the t8 engine version), `context` ('standalone' | 'opening' | 'overtime'), policies per
 *     side ('manual' for the player's side in Watch, else 'ai': D1, D2), `decisions.a` keyed by exchange (D1: every choice is
 *     recorded, so a replay or a reload is identical), `carryIn` (overtime: the football statuses of the battlers, spec §10),
 *     `carryOut` (set at settlement; the opening Clash hands it to kickoff) and `mastery` (execution counts only; awards are M5).
 * An unresolved legacy record (status 'battle', rewards not yet applied) found in a schema-10 save is re-run on t8 from the same
 * seed and lineups and tagged `migrated` (plan D19 default; the ledger prevents duplicate rewards).
 */
export const CLASH_RECORD_VERSION = 2;
export const T8_CONTEXT = Object.freeze({ encounter: 'standalone', pregame: 'opening', overtime: 'overtime' });
/** The engine a stored record plays on: 't8' for version-2 records, null (the legacy engine's own default) for pre-M4 records. */
export function rulesetOf(record) { return record?.ruleset === T8_RULESET ? T8_RULESET : null; }
export const isT8Record = (record) => rulesetOf(record) === T8_RULESET;
/** D1 / D2: the player's side is manual (prompted) in Watch; Skip, headless settlement and staff auto-run use the AI policy. The opponent is always the AI. */
export function t8Policies(mode) { return { a: normalizeMode(mode) === 'watch' ? 'manual' : 'ai', b: 'ai' }; }
/** The version-2 record fields of a new battle (the caller adds the occasion's own fields). */
export function newBattleRecord({ occasion, mode = 'watch', carryIn = null }) {
  const m = normalizeMode(mode) || 'watch';
  return { version: CLASH_RECORD_VERSION, ruleset: T8_RULESET, engine: T8_VALUES.engineVersion, context: T8_CONTEXT[occasion] || 'standalone', mode: m, policies: t8Policies(m), decisions: { a: {} }, ...(carryIn ? { carryIn } : {}), status: 'battle', result: null };
}
/** D19: an unresolved pre-M4 record is re-run on t8 from its own seed and lineups (in place, once; tagged). Finished records are never touched. */
export function upgradeUnresolvedRecord(e) {
  if (!e || e.status !== 'battle' || isT8Record(e) || e.result) return e;
  const legacy = { policies: e.policies || null, decisions: e.decisions || null, mode: e.mode || null };
  Object.assign(e, { version: CLASH_RECORD_VERSION, ruleset: T8_RULESET, engine: T8_VALUES.engineVersion, context: e.context || (e.prospectIndex != null ? 'standalone' : e.playoff != null ? 'overtime' : 'opening'), policies: t8Policies(e.mode), decisions: { a: {} }, migrated: { from: 'legacy', ...legacy } });
  return e;
}
/** Record the player's answer at a t8 rotation prompt: a reserve's id (combatant or monster id), 'stay' or 'auto' ("Auto for the rest", D1). */
export function recordDecision(e, ex, choice) {
  if (!isT8Record(e)) return false;
  if (!Number.isInteger(ex) || ex < 1 || typeof choice !== 'string' || !choice) return false;
  (e.decisions ||= { a: {} }); (e.decisions.a ||= {}); e.decisions.a[ex] = choice; return true;
}
/**
 * Headless settlement of a t8 battle whose player side is still manual (Skip after a Watch start, staff auto-run, a tied game
 * settled without the screen): every open prompt is answered 'auto' (D1), so the log is identical up to that point and the AI
 * policy (D2) plays the rest. Returns the completed result; the decisions are recorded on the record.
 */
export function settleHeadless(e, run) {
  let result = run(); let guard = 0;
  while (result?.pending && guard++ < 64) { const p = pendingDecision(result); if (!p || p.kind !== 'rotation' || !recordDecision(e, p.ex, 'auto')) break; result = run(); }
  return result;
}
/** The record's statuses to carry out of an opening / overtime Clash (spec §10): the engine's football-shaped payloads, or null. */
export const carryOutOf = (result) => (result?.carryOut && Object.keys(result.carryOut).length ? result.carryOut : null);
/** Mastery execution counts of a t8 battle (M4: counts only, per cap scope; M5 awards). */
export function masteryRecord(result, scope) { return result?.mastery ? { scope, counts: result.mastery } : null; }
export const CLASH_DEFAULT_SETTINGS = Object.freeze({ mode: 'ask', speed: 2 });

/** Settings with defaults filled in (older saves have no clash block; 'play' and 'auto' become 'watch'). */
export function clashSettings(settings) { const c = { ...CLASH_DEFAULT_SETTINGS, ...(settings?.clash || {}) }; if (c.mode !== 'ask') c.mode = normalizeMode(c.mode) || 'ask'; if (!CLASH_SPEEDS.includes(c.speed)) c.speed = CLASH_DEFAULT_SETTINGS.speed; return c; }

/**
 * The fields a battle reads from a monster (the engine's own replay-key snapshot). A record keeps these, so a battle rebuilds
 * identically after the monsters have tired, levelled or left. Task 8 M4: `stage` is the form; `clashMasteryTier` is the Clash
 * mastery tier of the monster's credit count (tierIndex, never the raw count); `exhausted` (overtime only) is the football game's
 * stamina verdict (spec §12), halved once by the engine.
 */
export function snapMonster(m, { exhausted = false } = {}) {
  return { id: m.id, name: m.name, species: m.species, position: m.position, type: m.type, nature: m.nature, level: m.level, stage: m.stage || 0, potential: m.potential, fatigue: m.fatigue || 0, attributes: { ...m.attributes },
    clashMasteryTier: tierIndex(m.dev?.mastery?.clash || 0), ...(exhausted ? { exhausted: true } : {}) };
}

/** Monsters that may battle: on the roster and not injured. Kickers are monsters too. */
export function eligibleBattlers(roster) { return roster.filter((m) => !m.injury); }

/**
 * An automatic lineup of up to `n` from `roster`, the engine's own lineup rule (one Tank first when available, best overalls,
 * at most two of one archetype, Tank in front, Supports and Disruptors at the back). `seed` breaks ties deterministically.
 */
export function autoLineup(roster, n, seed = 1) {
  const pool = eligibleBattlers(roster).map((m) => ({ species: m.species, archetype: archetypeOf(m.species), overall: monsterOverall(m), type: m.type, monster: m }));
  if (!pool.length || n <= 0) return [];
  return chooseLineup(pool, Math.min(n, pool.length), createRng(seed)).map((x) => x.monster);
}

/** The policies a stored record was played with: its own, or (records from before 2026-10-22) manual for a 'play' battle with decisions and smart for everything else. */
export function policiesOf(record) {
  if (record?.policies) return record.policies;
  return record?.mode === 'play' ? { a: 'manual', b: 'smart' } : { a: 'smart', b: 'smart' };
}
/**
 * Run one franchise battle on the engine its record names. `ruleset: 't8'` (every new record): the Task 8 engine with the record's
 * context, policies, decisions and carry-in; a manual side with no decision at a legal rotation phase stops at that boundary
 * (`result.pending`, see pendingDecision). No ruleset (a pre-M4 record): the frozen legacy engine with the policies it was played with.
 * Provisional readings are never switched on here (owner rule 1, 2026-11-09): normal play has no `provisional` option.
 */
export function runBattle({ a, b, seed, mode = 'watch', decisions = null, policies = null, log = 'full', ruleset = null, context = 'standalone', carryIn = null }) {
  if (ruleset === T8_RULESET) {
    const pol = policies || t8Policies(mode);
    const config = t8Config({ ruleset: T8_RULESET, context, policies: { a: pol.a, b: pol.b }, decisions: decisions?.a && Object.keys(decisions.a).length ? { a: decisions.a } : undefined });
    return simulateByRuleset({ a, b, seed, config, log, carryIn: context === 'standalone' ? null : carryIn });
  }
  if (ruleset != null) throw new Error(`Unknown Clash record ruleset ${ruleset}`);
  const pol = policies || FRANCHISE_POLICIES;
  const config = battleConfig({ policies: { a: pol.a, b: pol.b }, decisions: decisions && pol.a === 'manual' ? { a: decisions } : undefined });
  return simulateByRuleset({ a, b, seed, config, log });
}
/** Rebuild a record's battle from the save (deterministic): lineups, seed, policies, decisions and carry-in all come from the record. */
export function runRecord(e, { a = e?.a, b = e?.b, log = 'full' } = {}) {
  if (!e?.seed || !a?.length || !b?.length) return null;
  return runBattle({ a, b, seed: e.seed, mode: e.mode, decisions: e.decisions, policies: policiesOf(e), log, ruleset: rulesetOf(e), context: e.context || 'standalone', carryIn: e.carryIn || null });
}

/** The small record a save keeps of a finished battle (the full log is rebuilt from the seed when needed). A pending t8 battle has no summary. */
export function battleSummary(result) {
  if (result.pending) throw new Error('A pending battle has no summary: a rotation decision is still open');
  return { winner: result.winner, by: result.by, exchanges: result.exchanges, hash: logHashFor(result), hpShare: result.hpShare ? { a: Math.round(result.hpShare.a * 1000) / 1000, b: Math.round(result.hpShare.b * 1000) / 1000 } : null,
    ...(result.ruleset === T8_RULESET ? { ruleset: T8_RULESET, engine: result.engine, stateHash: result.stateHash } : {}) };
}

/**
 * The first decision the player still has to make, or null when the battle ran to its end.
 * t8 (D1): the engine stopped at a legal rotation phase of the manual side: { kind: 'rotation', index (the prompt's log index), ex,
 * side, activeId, options ('stay' | 'auto' | reserve combatant ids), reserves (id, monsterId, name, hp, maxHp, type, archetype,
 * status), monsterIds }. Legacy 'play' records: the old swap decision { kind: 'swap', index, ex, actor, options, monsterIds }.
 */
export function pendingDecision(result) {
  if (result.ruleset === T8_RULESET) {
    if (!result.pending || result.boundary?.kind !== 'rotation') return null;
    const b = result.boundary;
    return { kind: 'rotation', index: b.lastSeq, ex: b.ex, side: b.side, actor: b.activeId, activeId: b.activeId, options: b.options, reserves: b.reserves, monsterIds: b.reserves.map((x) => x.monsterId) };
  }
  const i = result.log.findIndex((e) => e.kind === 'decision' && e.pending);
  return i < 0 ? null : { kind: 'swap', index: i, ex: result.log[i].ex, actor: result.log[i].actor, options: result.log[i].options, monsterIds: result.log[i].monsterIds };
}

/**
 * Apply a battle's effects to the roster monsters that fought on `side`: Arena XP (Model C2, the Phase 1 formula) through the
 * same level-up loop as a football game, and the occasion's fatigue. Evolutions wait for the owner, as after a game.
 * Returns level-up events in the football event shape, plus one { kind: 'xp' } event per battler (XP gained, progress to the next level).
 */
/**
 * Apply a battle's level XP and fatigue to one side's monsters. `bonusPct` adds extra level XP (N7g: the Basic encounter bonus;
 * level XP only, never training progress or mastery). With `ledger` and `activityId` the awards go through the reward ledger
 * (spec §15): once per activity and monster, so a replay or reload awards nothing more.
 */
export function applyBattleEffects(roster, result, side, occasion, rng, { autoSpend = false, bonusPct = 0, bonusLabel = null, ledger = null, activityId = null } = {}) {
  const events = []; const fatigue = CLASH_FATIGUE[occasion] || 0;
  const entries = []; for (const x of result.lines[side]) { const m = roster.find((mm) => mm.id === x.combatant.monsterId); if (m && !entries.some((e) => e.monsterId === m.id)) entries.push({ monsterId: m.id, x, m }); }
  const award = ({ x, m }) => {
    // Task 8 M2 (spec §6): every selected lineup member, unused reserves included, gets the approved Clash award: 25 level XP and 25%
    // of a training bar. The archetype grade adjustment arrives with grading (M5); until then 0 (TRANSITIONAL). Skips and early KOs keep it.
    const a = clashAward({ gradeAdj: 0, involved: true }); const base = FR.toNumber(a.xp); const bonus = bonusPct ? base * bonusPct / 100 : 0;
    const r = applyAward(m, { xp: FR.add(a.xp, FR.frac(Math.round(bonus * 100), 100)), training: a.training }, rng, { autoSpend });
    events.push(...r.events);
    m.fatigue = Math.min(100, (m.fatigue || 0) + fatigue);
    // What the result screen shows for each battler: XP gained (base + any Basic bonus), training progress and progress toward the next level.
    events.push({ kind: 'xp', id: m.id, name: m.name, amount: r.xp, base: r.xp ? base : 0, bonus: r.xp ? bonus : 0, bonusLabel: bonus && r.xp ? bonusLabel : null, training: FR.toNumber(r.training), points: r.points, level: m.level, levelsGained: r.levelsGained, xp: m.xp, next: xpForLevel(m.level), max: m.level >= 50 });
  };
  if (ledger && activityId) applyActivity(ledger, activityId, entries, award); else for (const e of entries) award(e);
  return events;
}

/** The AI's possession choice when it wins the pregame Clash: defer two times in three (the coin-toss AI's rule), else receive. One seeded draw. */
export function aiPossessionChoice(rng) { return rng.chance(0.65) ? 'defer' : 'receive'; }
/** Side a / b of a franchise battle mapped back to home / away. */
export const POSSESSION_CHOICES = Object.freeze(['receive', 'defer', 'kick']);

