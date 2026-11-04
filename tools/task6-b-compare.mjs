#!/usr/bin/env node
// Task 6 Phase B: matched-seed comparison of harness-v4 runs (planning tool; reads JSON only). Means per seed of the Group 2 and
// Group 3 measures for each labelled run set: <DIR>/<label>-C-106-108.json and -109-110.json by default.
//   DIR=path LABELS=v42170,s4r4,pb1 [FILES=C-106-108,C-109-110] node tools/task6-b-compare.mjs
import { loadRuns, seedMeasures } from './task6-analyze.mjs';
import fs from 'node:fs';
const DIR = process.env.DIR || '.'; const LABELS = (process.env.LABELS || 'v42170,s4r4').split(','); const FILES = (process.env.FILES || 'C-106-108,C-109-110').split(',');
const K = ['successionCoverPct', 'successionReadyPct', 'misalignedPosRelPct', 'weakPosRelPct', 'persistentWeakPosRelPct', 'task5.persistentWeakPct', 'contract1Pct', 'contract2Pct', 'contract3PlusPct', 'maxExpiryShare', 'youngPaymentPct', 'r1Ovr', 'r1GapToFloor', 'r1StartSeason1Pct', 'r1StarterAt2Pct', 'r1StarterAt2LatePct', 'veteransStartingPct', 'starterAgeS20', 'starters33PctS20', 'retirementsPerSeason', 'gymVsOrdinaryWinPct', 'gymTitleSharePct', 'gymLeadS5to7Min', 'gymLeadMinS8on', 'gymLeadS20', 'ordinaryPersistentLoserPct', 'ordinaryTitleSharePct', 'ordinaryPlayoffSharePct', 'ordinarySlowedPct', 'leagueStarterOvrS20', 'ownerWinPctS1to8', 'ownerWinPctS9to20', 'problems'];
const get = (o, k) => k.split('.').reduce((x, p) => x?.[p], o);
const rows = {};
for (const lab of LABELS) { const files = FILES.map((f) => `${DIR}/${lab}-${f}.json`).filter((f) => fs.existsSync(f)); if (!files.length) continue; const per = loadRuns(files).map(seedMeasures);
  rows[lab] = Object.fromEntries(K.map((k) => { const v = per.map((p) => get(p, k)).filter((x) => typeof x === 'number'); return [k, v.length ? Math.round(100 * v.reduce((a, b) => a + b, 0) / v.length) / 100 : null]; }));
  rows[lab].seeds = per.length;
  const tiers = ['gymEarlyOvrS5on', 'gymMidOvrS5on', 'gymLateOvrS5on'].map((k) => per.reduce((s, p) => s + p[k], 0) / per.length); rows[lab].tierOrderPooled = tiers[0] < tiers[1] && tiers[1] < tiers[2] ? 'held' : 'NO'; }
console.log(['measure', ...Object.keys(rows)].join(' | ')); for (const k of ['seeds', ...K, 'tierOrderPooled']) console.log([k, ...Object.values(rows).map((r) => r[k])].join(' | '));
