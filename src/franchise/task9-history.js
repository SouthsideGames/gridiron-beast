// Task 9 franchise presentation API. UI integration can consume this module
// without accessing or mutating simulation state. The GM Hall of Fame remains separate.
export { careerProfile, retiredCandidateProfile } from './career-profile.js';
export { careerPage } from './career-page.js';
export { franchiseSeasonHistory, championshipHistory, historicalAwards,
  historicalHallOfFame, franchiseLegacyIndex, monsterHallStatus, franchiseTotals } from './legacy-index.js';
export { historicalRecords, monsterRecordHonours } from './records-history.js';
export { monsterHofBallot, monsterHofInductees, candidateScore,
  WAIT_SEASONS, MAX_INDUCTEES, VOTER_COUNT, VOTE_THRESHOLD } from './monster-hof-voting.js';

/** One read-only payload for the Task 9 franchise history screens. */
import { franchiseLegacyIndex } from './legacy-index.js';
import { careerPage } from './career-page.js';
export function franchiseHistoryView(f, monsterId = null) {
  return {
    ...franchiseLegacyIndex(f),
    selectedMonster: monsterId == null ? null : careerPage(f, monsterId),
  };
}
