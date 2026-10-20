// Reserve plays: built, drawn and simulated like every other play, reviewed in
// the Playbook Audit, but kept out of every game system (coaches, AI clubs,
// game plans, practice field) until the owner releases them. playbook.js
// calls reservePlays() with its own builders, so a reserve play compiles and
// validates exactly like a live one.
//
// Each file in ./reserve/ is one batch: a function of the builders that
// returns { plays, lessons }. Lessons follow the live LESSONS shape.

import offenseRuns from './reserve/offense-runs.js';
import offenseQuick from './reserve/offense-quick.js';
import offenseDropback from './reserve/offense-dropback.js';
import defenseCoverage from './reserve/defense-coverage.js';
import defensePressure from './reserve/defense-pressure.js';

const OFFENSE_BATCHES = [offenseRuns, offenseQuick, offenseDropback];
const DEFENSE_BATCHES = [defenseCoverage, defensePressure];

export function reservePlays(b) {
  const lessons = {};
  const run = (batches) => batches.flatMap((batch) => { const out = batch(b); Object.assign(lessons, out.lessons); return out.plays; });
  const offense = run(OFFENSE_BATCHES);
  const defense = run(DEFENSE_BATCHES);
  return { offense, defense, lessons };
}
