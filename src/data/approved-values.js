// Task 8: pure accessors for values fixed by owner rulings (N7b, 2026-11-07). They read the generated Dex overrides, so the
// numbers live in one place (docs/beast-dex/data/task8-overrides.json). Not yet wired into the football or Clash engines.
import { approvedValues, formById } from './beast-dex.js';

export const MASTERY_INDEX = Object.freeze({ Developing: 0, Practiced: 1, Expert: 2, Mastered: 3 });
const tierIndex = (tier) => { const i = typeof tier === 'number' ? tier : MASTERY_INDEX[tier]; if (!(i >= 0 && i <= 3)) throw new RangeError(`unknown mastery tier ${tier}`); return i; };
const stageOf = (formId, familyId) => { const f = formById(formId); if (!f || f.familyId !== familyId) throw new Error(`${formId} is not a ${familyId} form`); return f.stage; };

/** P1 Stoke the Flame: counterburst as a percentage of normal attack damage (before ordinary mitigation). */
export function stokeTheFlamePct(formId, tier) { const v = approvedValues('FIR-01-C'); return v.counterburstPctByStage[stageOf(formId, 'emberfox')] + v.masteryBonusPts[tierIndex(tier)]; }
/** P2 Blazing Resolve: does a completed official rushing attempt with this net whole-yard gain earn a charge? */
export function blazingResolveQualifies(formId, netWholeYards) { if (!Number.isInteger(netWholeYards)) throw new TypeError('net gain must be whole yards'); return netWholeYards >= approvedValues('FIR-01-F').minWholeYardsByStage[stageOf(formId, 'emberfox')]; }
/** P3 Beacon Lane: field lifetime in participating offensive scrimmage plays, counting the creation play (both forms). */
export function beaconLaneLifetime(formId, tier) { stageOf(formId, 'glimmer'); return approvedValues('LIG-01-F').lifetimePlaysByMastery[tierIndex(tier)]; }
/** P10 Shadow Pounce: explicit whole-attack dodge chance (percent) while the counter is unused; 0 once it has been used. */
export function shadowPounceDodgePct(formId, counterUsed) { const pct = approvedValues('DAR-01-C').dodgePctByStage[stageOf(formId, 'shadowkit')]; return counterUsed ? 0 : pct; }
/** P10 Mind Game (Clash): explicit afterimage miss chance (percent) while no trick is stored; 0 while one is stored. */
export function mindGameAfterimagePct(trickStored) { return trickStored ? 0 : approvedValues('PSY-05-C').afterimageMissPct; }

/**
 * P8 voluntary-rotation entry penalty. Returns the multiplier for damage multipliers, heals, shields and status-application
 * chances on the given normal turn, and whether the penalty is now spent. `turn` is { firstAfterVoluntaryRotation, stunnedSkip }.
 * Knockout replacements and forced rotations never set firstAfterVoluntaryRotation. A Stunned skip spends the penalty.
 */
export function rotationEntryPenalty({ firstAfterVoluntaryRotation, stunnedSkip = false }) {
  if (!firstAfterVoluntaryRotation) return { factor: 1, spent: false };
  return { factor: stunnedSkip ? 1 : 0.5, spent: true };
}
export const ROTATION_CADENCE_EXCHANGES = 4;
