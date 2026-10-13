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
export function positionOf(slot) {
  if (/^WR/.test(slot)) return 'WR';
  if (/^(LG|C|RG)$/.test(slot)) return 'OL';
  if (/^DL/.test(slot)) return 'DL';
  if (/^LB/.test(slot)) return 'LB';
  if (/^CB/.test(slot)) return 'CB';
  if (/^(FS|SS)$/.test(slot)) return 'S';
  return slot; // QB, RB, TE, K
}

/** Positions a monster may fill with the secondary-position penalty. */
export const SECONDARY_ELIGIBILITY = Object.freeze({
  QB: [], RB: ['WR'], WR: ['TE', 'RB'], TE: ['WR', 'OL'], OL: ['TE'],
  DL: ['LB'], LB: ['DL', 'S'], CB: ['S'], S: ['CB', 'LB'], K: [],
});

export function canPlay(position, slot) {
  const need = positionOf(slot);
  return position === need || (SECONDARY_ELIGIBILITY[position] || []).includes(need);
}

/** Attributes that matter most per position; used for OVR and level-ups. */
export const POSITION_WEIGHTS = Object.freeze({
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

export const ATTRIBUTES = Object.freeze([
  'speed', 'agility', 'strength', 'awareness', 'catching', 'arm', 'accuracy',
  'blocking', 'tackling', 'coverage', 'durability', 'kicking',
]);
