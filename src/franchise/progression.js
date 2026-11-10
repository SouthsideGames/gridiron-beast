// XP, level-ups, fatigue, injuries and recovery (GDD §5.1 and §8).

import { xpForLevel, levelUp, monsterOverall, salaryFor, speciesEffect, tryEvolve, autoSpendPoints, syncFromDev } from '../data/monsters.js';
import { addBankedPoints, addTrainingProgress, MAX_LEVEL } from './t8/progression.js';
import { OFFSEASON_POINTS, footballAward } from './t8/awards.js';
import { applyActivity } from './reward-ledger.js';
import { applyMastery } from './t8/mastery.js';
import { footballGrade } from './t8/grading.js';
import { mergePerformance } from '../sim/t8/performance.js';
import * as FR from '../core/fraction.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf, POSITION_WEIGHTS } from '../data/personnel.js';
import { isAgeless } from './league-registry.js';
import { CURVE, trueOnset, technicalOffset, peakWindowAge, isPhysical, physLoss, techLoss, drawLoss, transitionYears, SEVERE_INJURY_PHYSICAL, ATTRIBUTE_FLOOR } from '../data/aging.js';
/** Injury-risk multiplier for a monster playing a secondary position. */
export const OUT_OF_POSITION_RISK = 1.75;

const norm = (v) => Math.max(1, Math.min(99, v ?? 60)) / 99;

/** N7c B6: the approved level-XP multiplier, tuned to the development benchmarks (median level 50 in 5-8 seasons). Initial value 1. */
export const XP_MULTIPLIER = 1;
/**
 * Apply one approved activity award (spec §6) to a monster: level XP (stops at level 50, never converted to training) and training
 * progress (one banked point per full bar, excess carried; continues at level 50). Returns { xp, training, events }.
 * Mastery is separate (M5) and never earned here.
 */
export function applyAward(m, { xp, training }, rng, { autoSpend = false, autoEvolve = false, train = null } = {}) { // train: Task 8 D7, an AI identity's training priority { position: [attributes] }
  const events = []; const d = m.dev; const startLevel = m.level;
  const xpGain = d.level >= MAX_LEVEL ? 0 : FR.toNumber(FR.mul(xp, XP_MULTIPLIER));
  if (xpGain > 0) {
    m.xp = (m.xp || 0) + xpGain;
    while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level)) {
      m.xp -= xpForLevel(m.level); const before = monsterOverall(m);
      levelUp(m, rng, { autoSpend: false });
      events.push({ kind: 'levelup', id: m.id, name: m.name, level: m.level, from: before, to: monsterOverall(m) });
      if (autoEvolve) { const evo = tryEvolve(m); if (evo) events.push(evo); }
    }
    if (m.level >= MAX_LEVEL) m.xp = 0;
  }
  const points = addTrainingProgress(d, training); syncFromDev(m);
  if (autoSpend && FR.floor(d.bank) > 0) autoSpendPoints(m, rng, { first: train?.[m.position] || null });
  return { xp: xpGain, training, points, levelsGained: m.level - startLevel, events };
}
/** The kicks a K made in a game (field goals, extra points, kickoffs, punts) from the slot's stats: one qualifies him (spec §6). */
const kicksOf = (st) => (st?.fga || 0) + (st?.xpa || 0) + (st?.kickoffs || 0) + (st?.punts || 0);

/** Apply one game's consequences to the roster. `chart` maps slots to monster ids; `playerStats` from the game state. */
/**
 * Task 8 M2: level XP and training come from the approved football award (spec §6, R1 items 9-12), aggregated by monster (not slot),
 * once per activity through the reward ledger when one is given. M5 grades verified performance telemetry before applying the
 * bounded positional adjustment and training bonus. Participation: min(1, live snaps / 10); a kicker qualifies with one kick.
 */
export function afterGame(roster, chart, playerStats, rng, { won = false, snaps = 45, autoSpend = false, autoEvolve = true, xpScale = 1, ledger = null, activityId = null, train = null, mastery = null } = {}) {
  const events = [];
  const byId = Object.fromEntries(roster.map((m) => [m.id, m]));
  const slots = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS, 'K'];
  // aggregate participation by monster across the slots he filled
  const part = new Map(); const counted = Object.keys(playerStats || {}).length > 0;
  for (const slot of slots) {
    const m = byId[chart[slot]]; if (!m) continue; const st = playerStats?.[slot] || {};
    const p = part.get(m.id) || { monsterId: m.id, m, liveSnaps: 0, kicks: 0, performance: {} };
    p.liveSnaps += (st.snapsOff || 0) + (st.snapsDef || 0) + (st.stSnaps || 0); if (slot === 'K') p.kicks += kicksOf(st);
    if (!counted) { p.liveSnaps = Math.max(p.liveSnaps, snaps); if (slot === 'K') p.kicks = Math.max(p.kicks, 1); } // no per-slot counts at all (tools, labs): full participation
    mergePerformance(p.performance, st.performance);
    part.set(m.id, p);
  }
  const award = (p) => {
    const masteryCredits = mastery && activityId ? applyMastery(p.m, 'football', mastery[p.m.id], { scope: activityId }) : 0;
    const gradeAdj = footballGrade(p.m.position, p.performance);
    const a = footballAward({ position: p.m.position, liveSnaps: p.liveSnaps, kicks: p.kicks, gradeAdj });
    const r = applyAward(p.m, { xp: xpScale === 1 ? a.xp : FR.mul(a.xp, FR.frac(Math.round(xpScale * 100), 100)), training: a.training }, rng, { autoSpend, autoEvolve, train });
    events.push(...r.events);
    events.push({ kind: 'xp', id: p.m.id, name: p.m.name, position: p.m.position, amount: r.xp, gradeAdj, masteryCredits, training: FR.toNumber(r.training), points: r.points, level: p.m.level, levelsGained: r.levelsGained, xp: p.m.xp, next: xpForLevel(p.m.level), max: p.m.level >= MAX_LEVEL });
  };
  const entries = [...part.values()].filter((p) => p.m.dev); // a lab's synthetic monster (no development record) earns nothing; its fatigue and injury roll below still run
  if (ledger && activityId) applyActivity(ledger, activityId, entries, award); else for (const p of entries) award(p);
  for (const slot of slots) {
    const m = byId[chart[slot]]; if (!m) continue;
    // Fatigue and injury risk.
    const dur = norm(m.attributes.durability);
    const stamina = speciesEffect(m)?.effect?.fatigue || 1; // Iron Lungs: tires slower
    m.fatigue = Math.min(100, m.fatigue + Math.round((16 + (1 - dur) * 10 + rng.int(6)) * stamina));
    const outOfPosition = slot !== 'K' && positionOf(slot) !== m.position;
    const risk = (0.012 + (m.fatigue / 100) * 0.03 + (1 - dur) * 0.03) * (outOfPosition ? OUT_OF_POSITION_RISK : 1); // a body doing unfamiliar work breaks more (GDD §17.2)
    if (slot !== 'K' && rng.chance(risk)) {
      const roll = rng.next();
      const severity = roll < 0.6 ? 'Minor' : roll < 0.9 ? 'Moderate' : 'Severe';
      const weeks = severity === 'Minor' ? 1 : severity === 'Moderate' ? 2 + rng.int(2) : 4 + rng.int(3);
      m.injury = { severity, weeks, type: rng.pick(['hamstring', 'ankle', 'shoulder', 'knee', 'ribs', 'wrist']) };
      events.push({ kind: 'injury', id: m.id, name: m.name, severity, weeks });
    }
  }
  return events;
}

/** Weekly recovery (called when a new week begins). */
export function recoverWeek(roster, { bye = false } = {}) {
  const events = [];
  for (const m of roster) {
    m.fatigue = Math.max(0, m.fatigue - (bye ? 50 : 28));
    if (m.injury) {
      m.injury.weeks -= 1;
      if (m.injury.weeks <= 0) { events.push({ kind: 'healed', id: m.id, name: m.name }); m.injury = null; }
    }
  }
  return events;
}

/**
 * Task 7 (specification audit resolution 1): a negotiated salary is a contract. Ageing, development and rating changes never
 * overwrite it; only a monster without a running deal (unsigned) or on a protected permanent deal (gym legendaries, the rival's
 * signature: owner decision D1, unchanged) carries today's market figure.
 */
export const marketPriced = (m) => !m.contract || !!m.contract.permanent;
/**
 * Offseason: ageing, decline and growth, salary refresh (GDD §55, Task 6 Phase A-1). Legendary monsters and the rival's signature
 * monster do not age and never decline (owner's rules, 2026-10-23); they still gain a season of experience, rest and heal like everyone.
 *   - Growth to 23 as before: +1 awareness and strength toward potential.
 *   - Physical decline from the monster's (hidden) onset, more each season past it, by position; technical decline later and slower.
 *   - One severe injury last season past the onset costs a further point of each physical attribute (once).
 *   - Durability at peak is recorded once, at the start of the peak window (onset − 3): it sets the onset's ±1 year.
 * `ctx`: `s` = offseasons under these rules for a save made before them (the transition's decline cap; null = none);
 * `severeOf(m)` = did he suffer a severe injury last season. Draws come from `rng` in roster order, attribute by attribute.
 */
export function offseason(roster, rng, { s = null, severeOf = null, autoAllocate = true, train = null } = {}) { // train: Task 8 D7 (applyAward)
  const events = [];
  for (const m of roster) {
    const ageless = isAgeless(m) || !!m.dev?.apex; // Apex is ageless (spec §5)
    const severe = !ageless && !!severeOf?.(m); // read before the injury clears
    if (!ageless) m.age += 1;
    m.yearsPro = (m.yearsPro ?? Math.max(0, m.age - 23)) + 1; m.fatigue = 0; m.injury = null;
    // Task 8: the eligible offseason award, 2 banked training points (replaces the old direct maturation increases, spec §6).
    // AI and pool monsters allocate it with the approved policy; the owner's club passes autoAllocate: false and decides.
    if (m.dev) { addBankedPoints(m.dev, OFFSEASON_POINTS); if (autoAllocate) autoSpendPoints(m, rng, { first: train?.[m.position] || null }); }
    if (ageless) { if (m.dev) syncFromDev(m); if (marketPriced(m)) m.salary = salaryFor(m); continue; } // ageless: banked points still mirror to m.points
    const cur = m.dev ? m.dev.current : m.attributes;
    if (m.durPeak == null && m.age >= peakWindowAge(m.position)) m.durPeak = cur.durability;
    const onset = trueOnset(m); const yP = transitionYears(m.age - onset, s); const yT = transitionYears(m.age - onset - technicalOffset(m.position), s);
    let physLost = 0;
    if (yP > 0 || yT > 0) {
      const rate = (CURVE[m.position] || CURVE.WR).rate;
      for (const k of Object.keys(cur)) {
        const mean = isPhysical(k) ? (yP > 0 ? physLoss(yP, rate) + (severe ? SEVERE_INJURY_PHYSICAL : 0) : 0) : techLoss(yT);
        if (mean <= 0) continue;
        // the decline floor never raises a rating (R1 item 34); losses go to the development record's ledger
        const before = cur[k]; const after = Math.min(before, Math.max(ATTRIBUTE_FLOOR, before - drawLoss(mean, rng))); cur[k] = after;
        if (m.dev) m.dev.loss[k] += before - after;
        if (isPhysical(k)) physLost += before - after;
      }
      events.push({ kind: 'decline', id: m.id, name: m.name });
    }
    if (m.dev) syncFromDev(m);
    if (physLost) m.physDrop = physLost; else delete m.physDrop; // what the forecast may read: did his body visibly decline this offseason
    if (marketPriced(m)) m.salary = salaryFor(m);
  }
  return events;
}
