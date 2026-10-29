// AI Franchise Benchmark tooling (Task 4): the diagnostic tools stay diagnostic. Fast checks only (the benchmark itself is a
// study, run by hand: see AI_FRANCHISE_BENCHMARK.md §5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SCENARIOS } from '../tools/ai-benchmark-scenarios.mjs';
import { analyse, csv } from '../tools/ai-benchmark-analyze.mjs';

test('stress scenarios: six named setups, each with a description and an apply function', () => {
  assert.deepEqual(Object.keys(SCENARIOS).sort(), ['aging', 'expiring', 'injuries', 'picks', 'rebuild', 'thin']);
  for (const [k, s] of Object.entries(SCENARIOS)) { assert.equal(typeof s.apply, 'function', k); assert.ok(s.description.length > 20, k); }
});

test('diagnostic variants are built outside the repository and never touch production files', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-variant-'));
  const before = fs.readFileSync(new URL('../src/franchise/league-season.js', import.meta.url), 'utf8');
  execFileSync(process.execPath, [new URL('../tools/ai-benchmark-variant.mjs', import.meta.url).pathname, '--variant=flat-market', `--out=${out}`]);
  const v = fs.readFileSync(path.join(out, 'src/franchise/league-season.js'), 'utf8');
  assert.match(v, /DIAGNOSTIC VARIANT: nudge off/); assert.match(v, /DIAGNOSTIC VARIANT: one market quality/);
  assert.equal(fs.readFileSync(new URL('../src/franchise/league-season.js', import.meta.url), 'utf8'), before, 'the repository copy is unchanged');
  assert.match(before, /export const BAND = 4;/, 'production balance value intact');
  assert.ok(fs.existsSync(path.join(out, 'VARIANT.txt')));
  fs.rmSync(out, { recursive: true, force: true });
});

test('analysis reads a benchmark run and reports the pre-registered metrics', () => {
  const row = (club, year, extra = {}) => ({ seed: 1, year, club, w: 5, l: 4, pf: 100, pa: 90, playoffs: true, finalist: false, champion: false, teamOvr: 65, midOvr: 64, preOvr: 62, grew: 3, target: 66, quality: 60, slowed: 0, boosted: 0, rosterSize: 38, payroll: 1200000, capRoom: 150000, lineupProblems: 0,
    starters: { QB: [70], RB: [66], WR: [64, 63, 62], TE: [63], OL: [64, 63, 62], DL: [65, 64, 63], LB: [64, 63], CB: [64, 63], S: [64, 63], K: [60] }, backupMean: { QB: 50, RB: 50, WR: 50, TE: 50, OL: 50, DL: 50, LB: 50, CB: 50, S: 50, K: null }, backupCount: { QB: 1, RB: 1, WR: 3, TE: 1, OL: 3, DL: 3, LB: 2, CB: 2, S: 2, K: 1 },
    count: { QB: 2, RB: 2, WR: 6, TE: 2, OL: 6, DL: 6, LB: 4, CB: 4, S: 4, K: 2 }, avgStarter: 64, weakGroups: [], surplusGroups: [], meanAge: 25, age30plus: 2, age24minus: 10, starterAge: 26, provenance: { original: 30, drafted: 8 }, provenanceStarters: { original: 18, drafted: 4 }, devMean: 1, devN: 30, evolved: 1, meanLevel: 5, stage2: 0, stage1: 4, protected: 0, injured: 0, draftedStarters: 4, draftedOnRoster: 8, ...extra });
  const run = { seed: 1, seasons: 2, seconds: 10, peakHeapMB: 100, problemCount: 0, problems: [], rows: [row('A', 1), row('B', 1, { champion: true, w: 8, l: 1 }), row('A', 2), row('B', 2), { seed: 1, year: 1, club: 'O', owner: true, w: 4, l: 5 }], decisions: { draft: [{ year: 1, club: 'A', round: 1, overall: 1, id: 'x', pos: 'QB', ovr: 60, pot: 75, age: 21, needAtPos: 0, topNeedPos: 'K', topNeed: 0.5, countAtPos: 2, slots: 1, starterFloorAtPos: 70, wouldStart: false, bestAvailOvr: 61, bestAvailPot: 76, bestAtNeedOvr: 58, sameDraftDup: 0 }], arrivals: [], departures: [], trades: [], nudge: [] }, draftOutcome: [] };
  const s = analyse([run]);
  assert.equal(s.clubSeasons, 4); assert.equal(s.integrity.problems, 0); assert.equal(s.draft.aiPicks, 1); assert.equal(s.competition.titlesByAi, 1);
  assert.ok(csv([run], 'T').split('\n').length === 6, 'one CSV line per club-season plus the header');
});
