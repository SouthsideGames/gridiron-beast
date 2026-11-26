#!/usr/bin/env node
// Salary-cap experiment analyser (follow-up brief I-1, recording only). Reads ai-franchise-benchmark JSON files (plain or from
// tools/balance-audit/cap-experiment.mjs) and reports, per file group, cap utilisation and the money-driven behaviour the brief
// asks about. Groups are formed by `--group=label:fileA,fileB` (repeatable) or, without it, one group per cap found in the files.
//
//   node tools/balance-audit/cap-analyze.mjs --group=1.8M:a.json,b.json --group=1.5M:c.json,d.json [--out=summary.json]
//        [--years=1,5,10,15]
//
// Definitions (all AI clubs unless marked owner):
//   usable cap      = tier cap − STAFF_ALLOWANCE (405,000) — what an AI club can spend on players (league-registry.js).
//   utilisation     = payroll / usable cap, from the season row (in-season payroll); capRoom is the row's own room figure.
//   near the cap    = capRoom < 50,000 ("tight") or < 100,000 ("near").
//   FA close        = v4.seasons[].fa.cap [payroll incl. staff, dead, room] recorded at the market's close (owner: room only).
//   releases        = decisions.departures reason 'released' (offseason trims + in-season); veteran = age ≥ 29.
//   elite lost      = an ovr ≥ 75 monster leaving by 'walked' or 'released' (not retired, not traded); young lost = age ≤ 24 and
//                     potential ≥ 75 by the same reasons; both reported per season (elite also as a share of elite exits
//                     that were not retirements or trades).
import fs from 'node:fs';
import path from 'node:path';

const STAFF = 405000;
const argv = process.argv.slice(2);
const opt = Object.fromEntries(argv.filter((a) => !a.startsWith('--group=')).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const YEARS = (opt.years || '1,5,10,15').split(',').map(Number);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const { GYM_BY_CLUB } = await import(path.join(root, 'src/data/gyms.js'));
const isGym = (c) => !!GYM_BY_CLUB?.[c];

let groups = argv.filter((a) => a.startsWith('--group=')).map((a) => { const [label, files] = a.slice(8).split(':'); return { label, files: files.split(',') }; });
const loose = argv.filter((a) => !a.startsWith('--') && a.endsWith('.json'));
if (!groups.length) {
  const by = {};
  for (const f of loose) { const o = JSON.parse(fs.readFileSync(f, 'utf8')); const k = String(o.capExperiment?.cap ?? 1800000); (by[k] ||= []).push(f); }
  groups = Object.entries(by).map(([k, files]) => ({ label: `${(k / 1e6).toFixed(2)}M`, files }));
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const median = (a) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const pct = (a, p) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const r1 = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);

function analyse(files) {
  const acc = { runs: 0, seasons: 0, cap: null, util: [], room: [], tightest: [], tight: 0, near: 0, overCapRows: 0, clubSeasons: 0, roster: [], lineupProblems: 0,
    byYear: {}, faUtil: [], faRoomMin: [], signs: 0, bidders: [], bonusSigns: 0, bonusSum: 0, contested: 0, ownerSigns: 0, offers: 0, extensions: 0,
    renewalsSigned: 0, renewalsDeclined: 0, unsigned: 0, walked: 0, released: 0, vetReleased: 0, eliteLost: 0, eliteSeen: 0, youngLost: 0, youngSeen: 0, retired: 0, traded: 0,
    resigned: 0, overCap: 0, runaway: 0, problems: 0, marketProblems: 0, ownerW: 0, ownerG: 0, ownerRoom: [], ownerPlayoffs: 0, titles: {}, gymTitles: 0, titleCount: 0, ownerTitles: 0,
    teamOvrByYear: {}, payrollByYear: {} };
  for (const file of files) {
    const o = JSON.parse(fs.readFileSync(file, 'utf8'));
    const cap = o.capExperiment?.cap ?? 1800000; acc.cap = cap; const usable = cap - STAFF;
    for (const r of o.runs) {
      acc.runs++; acc.seasons += r.seasons || 0; acc.problems += r.problemCount || 0;
      const owner = r.ownerClub;
      const years = [...new Set(r.rows.map((x) => x.year))];
      for (const y of years) {
        const rows = r.rows.filter((x) => x.year === y);
        const ai = rows.filter((x) => x.club !== owner);
        const rooms = ai.map((x) => x.capRoom);
        acc.tightest.push(Math.min(...rooms));
        for (const x of ai) {
          acc.clubSeasons++; acc.util.push(x.payroll / usable); acc.room.push(x.capRoom); acc.roster.push(x.rosterSize); acc.lineupProblems += x.lineupProblems ? 1 : 0;
          if (x.capRoom < 50000) acc.tight++; if (x.capRoom < 100000) acc.near++; if (x.capRoom < 0) acc.overCapRows++;
          (acc.teamOvrByYear[y] ||= []).push(x.teamOvr); (acc.payrollByYear[y] ||= []).push(x.payroll);
        }
        const champ = rows.find((x) => x.champion);
        if (champ) { acc.titleCount++; acc.titles[champ.club] = (acc.titles[champ.club] || 0) + 1; if (isGym(champ.club)) acc.gymTitles++; if (champ.club === owner) acc.ownerTitles++; }
        const own = rows.find((x) => x.club === owner);
        if (own) { acc.ownerW += own.w + (own.t || 0) / 2; acc.ownerG += own.w + own.l + (own.t || 0); if (own.playoffs) acc.ownerPlayoffs++; }
      }
      for (const s of r.v4?.seasons || []) {
        const fa = s.fa; if (!fa) continue;
        const caps = Object.entries(fa.cap || {}).filter(([c]) => c !== owner);
        if (caps.length) { for (const [, v] of caps) acc.faUtil.push((v[0] - STAFF) / usable); acc.faRoomMin.push(Math.min(...caps.map(([, v]) => v[2])));
        const oc = fa.cap?.[owner]; if (oc) acc.ownerRoom.push(oc[2]); }
        for (const g of fa.signs || []) { if (g.owner) { acc.ownerSigns++; continue; } acc.signs++; acc.bidders.push(g.bidders || 0); if (g.bidders > 1) acc.contested++; if (g.bonus > 0) { acc.bonusSigns++; acc.bonusSum += g.bonus; } }
        acc.offers += fa.offers || 0; acc.extensions += fa.extensions || 0; acc.renewalsSigned += fa.renewalsSigned || 0; acc.renewalsDeclined += fa.renewalsDeclined || 0; acc.unsigned += fa.unsignedAtClose || 0; acc.marketProblems += (fa.marketProblems || []).length;
      }
      for (const n of r.decisions?.nudge || []) { const c = n.contracts || {}; acc.resigned += c.resigned || 0; acc.overCap += (c.overCap || []).length; acc.runaway += (c.runaway || []).length; }
      for (const d of r.decisions?.departures || []) {
        if (d.club === owner) continue;
        const gone = d.reason === 'walked' || d.reason === 'released';
        if (d.reason === 'walked') acc.walked++; if (d.reason === 'released') { acc.released++; if (d.age >= 29) acc.vetReleased++; }
        if (d.reason === 'retired') acc.retired++; if (d.reason === 'traded') acc.traded++;
        if (d.ovr >= 75 && d.reason !== 'traded') { acc.eliteSeen++; if (gone) acc.eliteLost++; }
        if (d.age <= 24 && (d.potential || 0) >= 75 && d.reason !== 'traded') { acc.youngSeen++; if (gone) acc.youngLost++; }
      }
    }
  }
  const per = (x) => r1(x / Math.max(1, acc.seasons), 1);
  const titleVals = Object.values(acc.titles).sort((a, b) => b - a);
  return {
    cap: acc.cap, usable: acc.cap - STAFF, runs: acc.runs, seasons: acc.seasons, clubSeasons: acc.clubSeasons,
    utilisation: { mean: r1(mean(acc.util) * 100), median: r1(median(acc.util) * 100), p10: r1(pct(acc.util, 0.1) * 100), p90: r1(pct(acc.util, 0.9) * 100), max: r1(Math.max(...acc.util) * 100) },
    capRoom: { mean: Math.round(mean(acc.room)), median: Math.round(median(acc.room)), p10: pct(acc.room, 0.1), min: Math.min(...acc.room), tightestPerSeasonMean: Math.round(mean(acc.tightest)), tightestPerSeasonMin: Math.min(...acc.tightest) },
    nearCap: { tightUnder50kPct: r1((acc.tight / acc.clubSeasons) * 100), nearUnder100kPct: r1((acc.near / acc.clubSeasons) * 100), overCapRows: acc.overCapRows },
    faClose: { utilMean: r1(mean(acc.faUtil) * 100), utilMedian: r1(median(acc.faUtil) * 100), tightestRoomMean: Math.round(mean(acc.faRoomMin)), tightestRoomMin: Math.min(...acc.faRoomMin) },
    freeAgency: { aiSignsPerSeason: per(acc.signs), contestedPct: r1((acc.contested / Math.max(1, acc.signs)) * 100), meanBidders: r1(mean(acc.bidders), 2), bonusSigns: acc.bonusSigns, bonusSum: acc.bonusSum, ownerSigns: acc.ownerSigns, offersPerSeason: per(acc.offers), unsignedAtClosePerSeason: per(acc.unsigned) },
    contracts: { extensionsPerSeason: per(acc.extensions), renewalsSignedPerSeason: per(acc.renewalsSigned), renewalsDeclinedPerSeason: per(acc.renewalsDeclined), resignedPerSeason: per(acc.resigned), walkedPerSeason: per(acc.walked), overCapCases: acc.overCap, runaway: acc.runaway },
    releases: { perSeason: per(acc.released), veteranPerSeason: per(acc.vetReleased), retiredPerSeason: per(acc.retired), tradedPerSeason: per(acc.traded) },
    retention: { eliteLostPerSeason: per(acc.eliteLost), eliteLostShareOfEliteExits: r1((acc.eliteLost / Math.max(1, acc.eliteSeen)) * 100), youngProspectsLostPerSeason: per(acc.youngLost) },
    roster: { mean: r1(mean(acc.roster)), min: Math.min(...acc.roster), max: Math.max(...acc.roster), lineupProblemClubSeasons: acc.lineupProblems },
    legality: { problems: acc.problems, marketProblems: acc.marketProblems, overCapRows: acc.overCapRows },
    owner: { winPct: r1((acc.ownerW / Math.max(1, acc.ownerG)) * 100), playoffSeasons: acc.ownerPlayoffs, titles: acc.ownerTitles, roomMean: Math.round(mean(acc.ownerRoom)), roomMin: Math.min(...acc.ownerRoom) },
    titles: { total: acc.titleCount, gym: acc.gymTitles, distinctChampions: titleVals.length, topClubTitles: titleVals[0] || 0, top3Share: r1((titleVals.slice(0, 3).reduce((s, x) => s + x, 0) / Math.max(1, acc.titleCount)) * 100) },
    sustainability: Object.fromEntries(YEARS.filter((y) => acc.teamOvrByYear[y]).map((y) => [y, { aiTeamOvr: r1(mean(acc.teamOvrByYear[y])), aiPayroll: Math.round(mean(acc.payrollByYear[y])) }])),
  };
}

const out = { generated: new Date().toISOString(), staffAllowance: STAFF, groups: groups.map((g) => ({ label: g.label, files: g.files.map((f) => path.basename(f)), ...analyse(g.files) })) };
if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));
for (const g of out.groups) {
  console.log(`\n== ${g.label} (cap ${g.cap}, usable ${g.usable}; ${g.runs} runs, ${g.seasons} seasons)`);
  for (const k of ['utilisation', 'capRoom', 'nearCap', 'faClose', 'freeAgency', 'contracts', 'releases', 'retention', 'roster', 'legality', 'owner', 'titles', 'sustainability']) console.log(`${k.padEnd(14)} ${JSON.stringify(g[k])}`);
}
