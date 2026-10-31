#!/usr/bin/env node
// Task 6 Phase A-2: the ordinary-band comparison (+4 / +6 / +8, aligned, and slow +8 with runaway +4) against A-1 and v42.17.0 on
// matched 20-season seeds. Planning tool; reads harness-v4 files <DIR>/<label>-C-106-108.json and -109-110.json.
//   DIR=path node tools/task6-a2-variant-compare.mjs
const DIR = process.env.DIR || '.';
import { loadRuns, seedMeasures } from './task6-analyze.mjs';
const K = ['veteransStartingPct', 'r1GapToFloor', 'r1Ovr', 'gymVsOrdinaryWinPct', 'gymTitleSharePct', 'gymLeadS5to7Min', 'gymLeadMinS8on', 'gymLeadS20', 'ordinaryPersistentLoserPct', 'ordinaryTitleSharePct', 'ordinaryPlayoffSharePct', 'gymGeneratedStarterPctFinal', 'ordinarySlowedPct', 'ordinarySlowedDev', 'ordinaryUnslowedDev', 'distinctChampions', 'r1StarterAt2Pct', 'r1StarterAt2LatePct', 'r1StartSeason1Pct', 'starterAgeS20', 'starters33PctS20', 'retirementsPerSeason', 'leagueStarterOvrS20', 'ownerWinPctS1to8', 'ownerWinPctS9to20', 'task5.persistentWeakPct', 'problems'];
const get = (o, k) => k.split('.').reduce((x, p) => x?.[p], o);
const rows = {};
for (const lab of ['v42170', 'a1', 's4r4', 's6r6', 's8r8', 's8r4']) { const runs = loadRuns([`${DIR}/${lab}-C-106-108.json`, `${DIR}/${lab}-C-109-110.json`]); const per = runs.map(seedMeasures);
  rows[lab] = Object.fromEntries(K.map((k) => { const v = per.map((p) => get(p, k)).filter((x) => typeof x === 'number'); return [k, v.length ? Math.round(100 * v.reduce((a, b) => a + b, 0) / v.length) / 100 : null]; }));
  const tiers = ['gymEarlyOvrS5on', 'gymMidOvrS5on', 'gymLateOvrS5on'].map((k) => per.reduce((s, p) => s + p[k], 0) / per.length); rows[lab].tierOrderPooled = tiers[0] < tiers[1] && tiers[1] < tiers[2] ? 'held' : 'NO'; }
console.log(['measure', ...Object.keys(rows)].join(' | ')); for (const k of [...K, 'tierOrderPooled']) console.log([k, ...Object.values(rows).map((r) => r[k])].join(' | '));
