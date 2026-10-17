// XP, level-ups, fatigue, injuries and recovery (GDD §5.1 and §8).

import { xpForLevel, levelUp, monsterOverall, salaryFor, speciesEffect, tryEvolve } from '../data/monsters.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../data/personnel.js';
/** Injury-risk multiplier for a monster playing a secondary position. */
export const OUT_OF_POSITION_RISK = 1.75;

const norm = (v) => Math.max(1, Math.min(99, v ?? 60)) / 99;

/** Apply one game's consequences to the roster. `chart` maps slots to monster ids; `playerStats` from the game state. */
export function afterGame(roster, chart, playerStats, rng, { won = false, snaps = 45 } = {}) {
  const events = [];
  const byId = Object.fromEntries(roster.map((m) => [m.id, m]));
  for (const slot of [...OFFENSE_SLOTS, ...DEFENSE_SLOTS, 'K']) {
    const m = byId[chart[slot]]; if (!m) continue;
    const st = playerStats?.[slot] || {};
    let xp = 24 + (won ? 10 : 0);
    xp += Math.round((st.rushYds || 0) / 4 + (st.recYds || 0) / 4 + (st.passYds || 0) / 10);
    xp += (st.td || 0) * 14 + (st.tackles || 0) * 5 + (st.sacks || 0) * 12 + (st.int || 0) * 14 + (st.rec || 0) * 2;
    m.xp += xp;
    while (m.xp >= xpForLevel(m.level)) {
      m.xp -= xpForLevel(m.level);
      const before = monsterOverall(m);
      levelUp(m, rng);
      events.push({ kind: 'levelup', id: m.id, name: m.name, level: m.level, from: before, to: monsterOverall(m) });
      const evo = tryEvolve(m); if (evo) events.push(evo);
    }
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

/** Offseason: ageing, mild decline/growth, salary refresh. */
export function offseason(roster, rng) {
  const events = [];
  for (const m of roster) {
    m.age += 1; m.yearsPro = (m.yearsPro ?? Math.max(0, m.age - 23)) + 1; m.fatigue = 0; m.injury = null;
    if (m.age >= 30) {
      for (const k of ['speed', 'agility', 'durability']) m.attributes[k] = Math.max(20, m.attributes[k] - 1 - rng.int(2));
      events.push({ kind: 'decline', id: m.id, name: m.name });
    } else if (m.age <= 23) {
      for (const k of ['awareness', 'strength']) if (m.attributes[k] < m.potential) m.attributes[k] += 1;
    }
    m.salary = salaryFor(m);
  }
  return events;
}
