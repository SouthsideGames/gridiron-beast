// 7-on-7 personnel packages and depth-chart slots (GDD §2).

/** Depth chart. The seven base starters per side are what the owner manages; package slots rotate in for specific personnel groupings. */
export const OFFENSE_BASE = ['QB', 'RB', 'WR1', 'WR2', 'TE', 'LG', 'RG'];
export const OFFENSE_PACKAGE_SLOTS = ['WR3', 'C'];
export const OFFENSE_SLOTS = [...OFFENSE_BASE, ...OFFENSE_PACKAGE_SLOTS];
export const DEFENSE_BASE = ['DL1', 'DL2', 'LB1', 'LB2', 'CB1', 'CB2', 'FS'];
export const DEFENSE_PACKAGE_SLOTS = ['DL3', 'SS'];
export const DEFENSE_SLOTS = [...DEFENSE_BASE, ...DEFENSE_PACKAGE_SLOTS];
/** Every lineman slot (position group OL). Only LG and RG are on the field in every package; C joins in tight sets. */
export const LINEMEN = ['LG', 'C', 'RG'];
export const BASE_LINEMEN = ['LG', 'RG'];
export const SKILL_SLOTS = ['RB', 'WR1', 'WR2', 'WR3', 'TE'];
/** Which package slot each grouping brings in (for roster labels). */
export const PACKAGE_SLOT_USE = Object.freeze({ WR3: 'Spread', C: 'Tight', DL3: 'Heavy & Pressure', SS: 'Nickel' });

/** Offensive packages: QB + two linemen + four others. */
export const OFFENSE_PACKAGES = Object.freeze({
  pro: { label: 'Pro', skill: ['RB', 'WR1', 'WR2', 'TE'] },
  spread: { label: 'Spread', skill: ['RB', 'WR1', 'WR2', 'WR3'] },
  tight: { label: 'Tight', skill: ['C', 'RB', 'TE', 'WR1'] },
});

/** Defensive packages: the seven slots on the field. */
export const DEFENSE_PACKAGES = Object.freeze({
  base: { label: 'Base 2-2-3', slots: ['DL1', 'DL2', 'LB1', 'LB2', 'CB1', 'CB2', 'FS'] },
  nickel: { label: 'Nickel 2-1-4', slots: ['DL1', 'DL2', 'LB1', 'CB1', 'CB2', 'FS', 'SS'] },
  heavy: { label: 'Heavy 3-2-2', slots: ['DL1', 'DL2', 'DL3', 'LB1', 'LB2', 'CB1', 'CB2'] },
  pressure: { label: 'Pressure 3-1-3', slots: ['DL1', 'DL2', 'DL3', 'LB1', 'CB1', 'CB2', 'FS'] },
});

export function offenseOnField(pkg) {
  const p = OFFENSE_PACKAGES[pkg];
  if (!p) throw new Error(`Unknown offensive package ${pkg}`);
  return ['QB', ...BASE_LINEMEN, ...p.skill];
}

export function defenseOnField(pkg) {
  const p = DEFENSE_PACKAGES[pkg];
  if (!p) throw new Error(`Unknown defensive package ${pkg}`);
  return [...p.slots];
}

/** Position group of a depth-chart slot (roster positions use the group). */
// perf: a pure function of the slot name, called per tick by the engine (pancake, shed): string results are memoised
const POSITION_OF = new Map();
export function positionOf(slot) {
  if (typeof slot !== 'string') return positionGroup(slot);
  let p = POSITION_OF.get(slot); if (p === undefined) { p = positionGroup(slot); POSITION_OF.set(slot, p); }
  return p;
}
function positionGroup(slot) {
  if (/^WR/.test(slot)) return 'WR';
  if (/^(LG|C|RG)$/.test(slot)) return 'OL';
  if (/^DL/.test(slot)) return 'DL';
  if (/^LB/.test(slot)) return 'LB';
  if (/^CB/.test(slot)) return 'CB';
  if (/^(FS|SS)$/.test(slot)) return 'S';
  return slot; // QB, RB, TE, K
}

/**
 * One football position per monster (Task 7, owner decision 2026-11-04, specification audit resolution 2): a monster fills only
 * the depth-chart slots of its own position group (a WR plays WR1, WR2 or WR3, never TE). No secondary-position fallback exists,
 * for the owner's club or the AI's. Kept as an empty table so older callers read "no secondary positions".
 */
export const SECONDARY_ELIGIBILITY = Object.freeze({ QB: [], RB: [], WR: [], TE: [], OL: [], DL: [], LB: [], CB: [], S: [], K: [] });

export function canPlay(position, slot) { return position === positionOf(slot); }

/**
 * Emergency positions (balance audit R-6, owner decision 2026-11-25). Each position has one emergency position it may cover, and only
 * as a last resort: when no healthy beast of a base slot's own position is left (injuries, an emptied group). Normal eligibility is
 * unchanged (`canPlay`, one position per family), the owner cannot list a beast at its emergency position, and a beast's primary position
 * never changes. Emergency cover fills the base lineup (OFFENSE_BASE, DEFENSE_BASE) only: package slots still need their own position, so
 * a package play is not opened by it. A beast plays the emergency slot on its own attributes, with no out-of-position penalty or boost;
 * the best one is chosen by the overall for the slot's position (its relevant attributes), not its own. Same rule for player and AI.
 * K has no emergency cover (no position lists K), so an empty kicker slot still cannot be filled.
 */
export const EMERGENCY_POSITION = Object.freeze({ QB: 'WR', RB: 'WR', WR: 'RB', TE: 'OL', OL: 'TE', DL: 'LB', LB: 'DL', CB: 'S', S: 'CB', K: 'QB' });
export const BASE_SLOTS = Object.freeze([...OFFENSE_BASE, ...DEFENSE_BASE]);
/** May a beast of `position` cover `slot` in an emergency (a base slot of its emergency position)? */
export function canCoverEmergency(position, slot) { return BASE_SLOTS.includes(slot) && EMERGENCY_POSITION[position] === positionOf(slot); }
/** The positions whose emergency position is `pos` (who may cover a `pos` base slot): e.g. WR ← QB, RB. */
export const emergencySources = (pos) => Object.keys(EMERGENCY_POSITION).filter((p) => EMERGENCY_POSITION[p] === pos);

/** Attributes that matter most per position; used for OVR and level-ups.
 *  Balance audit 2026-11-25: R-17 adds Durability (it halves injury risk and sets Clash HP, but was in no overall): 1 for RB, OL, DL and
 *  LB (the most contact), 0.5 for QB, WR, TE, CB and S. K was provisionally 0.25 (the brief's "low") and is 0 after
 *  testing: kickers are never injured and fatigue does not touch kicking, so Durability does nothing for a kicker in football. R-2 prices DL and TE Speed at 2 (was 1): R-1 made the DL pass rush
 *  use Speed, and at constant payroll a fast lineup won 3.3 points a game because Speed was cheap in these overalls. */
/** The position weights before the balance audit (2026-11-25). Beast Clash reads them (combatant HP / attack / speed come from the overall
 *  on these), and monster generation selects and develops its candidates on them (t8/selection.js, the prior-career simulation in
 *  t8/career.js), so every recorded battle and replay key plays exactly as before, every seed generates the same monsters, and the
 *  generation calibrations (CALIBRATION, HISTORY_REFERENCE) stay valid. The football overall (POSITION_WEIGHTS: R-2 Speed, R-17
 *  Durability) is what the game shows, pays and trains by. */
export const BASE_POSITION_WEIGHTS = Object.freeze({
  QB: { accuracy: 3, awareness: 3, arm: 2, agility: 1, speed: 1 },
  RB: { speed: 3, agility: 3, strength: 2, awareness: 2, catching: 1, blocking: 1 },
  WR: { speed: 3, catching: 3, agility: 2, awareness: 1, strength: 1 },
  TE: { catching: 2, blocking: 2, strength: 2, speed: 1, agility: 1, awareness: 1 },
  OL: { blocking: 4, strength: 3, awareness: 1, agility: 1 },
  DL: { strength: 3, tackling: 2, agility: 2, speed: 1, awareness: 1 },
  LB: { tackling: 3, awareness: 2, speed: 2, strength: 1, coverage: 1 },
  CB: { coverage: 3, speed: 3, agility: 2, awareness: 1, catching: 1 },
  S: { coverage: 2, awareness: 2, speed: 2, tackling: 2, catching: 1 },
  K: { kicking: 6, awareness: 1 },
});
export const CLASH_POSITION_WEIGHTS = BASE_POSITION_WEIGHTS;
export const POSITION_WEIGHTS = Object.freeze({
  QB: { accuracy: 3, awareness: 3, arm: 2, agility: 1, speed: 1, durability: 0.5 },
  RB: { speed: 3, agility: 3, strength: 2, awareness: 2, catching: 1, blocking: 1, durability: 1 },
  WR: { speed: 3, catching: 3, agility: 2, awareness: 1, strength: 1, durability: 0.5 },
  TE: { catching: 2, blocking: 2, strength: 2, speed: 2, agility: 1, awareness: 1, durability: 0.5 },
  OL: { blocking: 4, strength: 3, awareness: 1, agility: 1, durability: 1 },
  DL: { strength: 3, tackling: 2, agility: 2, speed: 2, awareness: 1, durability: 1 },
  LB: { tackling: 3, awareness: 2, speed: 2, strength: 1, coverage: 1, durability: 1 },
  CB: { coverage: 3, speed: 3, agility: 2, awareness: 1, catching: 1, durability: 0.5 },
  S: { coverage: 2, awareness: 2, speed: 2, tackling: 2, catching: 1, durability: 0.5 },
  K: { kicking: 6, awareness: 1 }, // R-17: 0 for K after testing (kickers are never injured and fatigue does not touch kicking)
});

export const ATTRIBUTES = Object.freeze([
  'speed', 'agility', 'strength', 'awareness', 'catching', 'arm', 'accuracy',
  'blocking', 'tackling', 'coverage', 'durability', 'kicking',
]);
