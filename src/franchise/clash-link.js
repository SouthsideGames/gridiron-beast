// Beast Clash in Franchise Mode: the one franchise file that imports the Clash engine (owner authorization, 2026-10-21; GDD §26).
// It turns roster monsters into battles and battle results into roster effects. The engine itself stays pure and deterministic:
// every battle here is a seed (drawn once from the franchise generator), two lineups of real monsters and the player's recorded
// decisions, so the same battle can be rebuilt for the screen, for a replay or for a test. The permanent balance values are the
// game's defaults (battleConfig with no overrides); nothing here changes them.
import { simulateClash, battleConfig, logHash, battleXp, chooseLineup, archetypeOf, CLASH_VALUES } from '../clash/index.js';
import { createRng } from '../core/rng.js';
import { monsterOverall, xpForLevel, levelUp } from '../data/monsters.js';

/** Battle sizes by occasion (GDD §26). */
export const CLASH_SIZE = Object.freeze({ encounter: 1, pregame: 3, overtime: 3, overtimePlayoff: 5 }); // Tuesday encounters are strictly 1v1 (owner decision 2026-10-21)
/** Fatigue a battle costs each monster that took part (CLASH_VALUES.load, provisional values from Phase 1). */
export const CLASH_FATIGUE = Object.freeze({ encounter: CLASH_VALUES.load.battle, pregame: CLASH_VALUES.load.opening, overtime: CLASH_VALUES.load.overtime });
/** How a battle is shown; 'skip' and 'auto' play the identical battle (the smart swap policy), 'play' asks the player at every swap decision. */
export const CLASH_MODES = Object.freeze(['play', 'auto', 'skip']);
export const CLASH_SPEEDS = Object.freeze([1, 2, 4]);
/** Exchanges between voluntary swaps (the engine's rule); a 'stay' answer holds for this many exchanges. */
export const SWAP_EVERY = CLASH_VALUES.swaps.voluntaryEvery;
export const CLASH_DEFAULT_SETTINGS = Object.freeze({ mode: 'ask', speed: 2 });

/** Settings with defaults filled in (older saves have no clash block). */
export function clashSettings(settings) { return { ...CLASH_DEFAULT_SETTINGS, ...(settings?.clash || {}) }; }

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

/** Run one franchise battle. `mode` 'play' gives side a the manual policy; otherwise both sides use the smart policy. */
export function runBattle({ a, b, seed, mode = 'auto', decisions = null, log = 'full' }) {
  const config = battleConfig({ policies: { a: mode === 'play' ? 'manual' : 'smart', b: 'smart' }, decisions: decisions ? { a: decisions } : undefined });
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
 * Returns level-up events in the football event shape.
 */
export function applyBattleEffects(roster, result, side, occasion, rng, { autoSpend = false } = {}) {
  const events = []; const xp = battleXp(result, side); const fatigue = CLASH_FATIGUE[occasion] || 0;
  for (const x of result.lines[side]) {
    const m = roster.find((mm) => mm.id === x.combatant.monsterId); if (!m) continue;
    m.xp = (m.xp || 0) + Math.round(xp[x.id] || 0);
    while (m.xp >= xpForLevel(m.level)) {
      m.xp -= xpForLevel(m.level);
      const before = monsterOverall(m); levelUp(m, rng, { autoSpend });
      events.push({ kind: 'levelup', id: m.id, name: m.name, level: m.level, from: before, to: monsterOverall(m) });
    }
    m.fatigue = Math.min(100, (m.fatigue || 0) + fatigue);
  }
  return events;
}

/** The AI's possession choice when it wins the pregame Clash: defer two times in three (the coin-toss AI's rule), else receive. One seeded draw. */
export function aiPossessionChoice(rng) { return rng.chance(0.65) ? 'defer' : 'receive'; }
/** Side a / b of a franchise battle mapped back to home / away. */
export const POSSESSION_CHOICES = Object.freeze(['receive', 'defer', 'kick']);

