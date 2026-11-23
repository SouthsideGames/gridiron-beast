// Generates tests/schedule-vectors.json: every club's schedule for a few seeds and seasons of the seeded 14-game schedule
// (src/data/league.js, 32-club league). Run: node tests/tools/make-schedule-vectors.mjs
import fs from 'node:fs';
import { ALL_TEAMS, teamSchedule } from '../../src/data/league.js';
const seasons = [];
for (const [seed, year] of [[0, 1], [0, 2], [312, 1], [20261107, 5]]) seasons.push({ seed, year, teams: Object.fromEntries(ALL_TEAMS.map((t) => [t, teamSchedule(year, t, seed).map((g) => (g.bye ? { bye: true } : { opponent: g.opponent, home: g.home }))])) });
fs.writeFileSync(new URL('../schedule-vectors.json', import.meta.url), JSON.stringify({ note: 'Seeded 14-game schedule, 32 clubs. Regenerate only when the schedule rules change.', seasons }));
console.log('wrote', seasons.length, 'seasons');
