// Beast Clash in Franchise Mode: the one franchise file that imports the Clash engine (owner authorization, 2026-10-21; GDD §26).
// It turns roster monsters into battles and battle results into roster effects. The engine itself stays pure and deterministic:
// every battle here is a seed (drawn once from the franchise generator), two lineups of real monsters and the player's recorded
// decisions, so the same battle can be rebuilt for the screen, for a replay or for a test. The permanent balance values are the
// game's defaults (battleConfig with no overrides); nothing here changes them.
import { applyActivity } from './reward-ledger.js';
import { clashAward } from './t8/awards.js';
import { applyAward } from './progression.js';
import * as FR from '../core/fraction.js';
import { simulateClash, battleConfig, logHash, battleXp, chooseLineup, archetypeOf, CLASH_VALUES } from '../clash/index.js';
import { createRng } from '../core/rng.js';
import { monsterOverall, xpForLevel, levelUp } from '../data/monsters.js';

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
 * Swap policies of a franchise battle: neither side swaps voluntarily. The lineup order the player (or the automatic lineup)
 * chose is the order of entry: the front monster fights until it is knocked out, then the next steps up, HP and conditions
 * carrying over, until one side has nobody left. Battles recorded before this rule keep the policies they were played with.
 */
export const FRANCHISE_POLICIES = Object.freeze({ a: 'none', b: 'none' });
/** Exchanges between voluntary swaps (the engine's rule); only legacy 'play' records still carry decisions. */
export const SWAP_EVERY = CLASH_VALUES.swaps.voluntaryEvery;
export const CLASH_DEFAULT_SETTINGS = Object.freeze({ mode: 'ask', speed: 2 });

/** Settings with defaults filled in (older saves have no clash block; 'play' and 'auto' become 'watch'). */
export function clashSettings(settings) { const c = { ...CLASH_DEFAULT_SETTINGS, ...(settings?.clash || {}) }; if (c.mode !== 'ask') c.mode = normalizeMode(c.mode) || 'ask'; if (!CLASH_SPEEDS.includes(c.speed)) c.speed = CLASH_DEFAULT_SETTINGS.speed; return c; }

/** The fields a battle reads from a monster (the engine's own replay-key snapshot). A record keeps these, so a battle rebuilds identically after the monsters have tired, levelled or left. */
export function snapMonster(m) { return { id: m.id, name: m.name, species: m.species, position: m.position, type: m.type, nature: m.nature, level: m.level, stage: m.stage || 0, potential: m.potential, fatigue: m.fatigue || 0, attributes: { ...m.attributes } }; }

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
/** Run one franchise battle: fixed order on both sides (FRANCHISE_POLICIES) unless `policies` says otherwise (legacy records). */
export function runBattle({ a, b, seed, mode = 'watch', decisions = null, policies = FRANCHISE_POLICIES, log = 'full' }) {
  const config = battleConfig({ policies: { a: policies.a, b: policies.b }, decisions: decisions && policies.a === 'manual' ? { a: decisions } : undefined });
  return simulateClash({ a, b, seed, config, log });
}

/** The small record a save keeps of a finished battle (the full log is rebuilt from the seed when needed). */
export function battleSummary(result) {
  return { winner: result.winner, by: result.by, exchanges: result.exchanges, hash: logHash(result), hpShare: result.hpShare ? { a: Math.round(result.hpShare.a * 1000) / 1000, b: Math.round(result.hpShare.b * 1000) / 1000 } : null };
}

/** The first decision the player still has to make in a 'play' battle, or null when the battle runs to its end. */
export function pendingDecision(result) {
  const i = result.log.findIndex((e) => e.kind === 'decision' && e.pending);
  return i < 0 ? null : { index: i, ex: result.log[i].ex, actor: result.log[i].actor, options: result.log[i].options, monsterIds: result.log[i].monsterIds };
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

