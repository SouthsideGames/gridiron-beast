#!/usr/bin/env node
// Task 6 Group 1 — league projection of the PROPOSED ageing and retirement rules (planning model; not game code, not a league simulation).
// Starts from real league rosters made by the game (a new franchise, or an "old save": a franchise played 15 seasons under today's rules
// with tools/franchise-soak.mjs runFranchise), then projects the 15 AI clubs' rosters season by season under tools/task6/aging-proposal.mjs:
//   season   starters (best by overall) gain levels by age as measured in v42.17.0 and draw injuries per game with the game's risk formula;
//            reserves gain 0.1 level; level-up picks and point spending follow the age-adjusted training costs (Modification 1)
//   offseason +1 age; physical then technical decline from the hidden true onset; one severe-injury penalty; retirement chance with one
//            injury factor (Modification 2); reserves aged 32+ walk (today's contract rule); refill to 38 with three draftees from the
//            game's own draft class and generated arrivals near the club's starter level, aged 24–30
//   transition (old saves): the Modification 4 ramp, or none (to show what it prevents)
// What it leaves out: games, standings, the nudge, contracts other than the 32+ walk rule, trades, free-agency choices. It measures the
// distributions the owner asked to benchmark before implementation (retirement ages, careers, starter ages, veterans, injuries,
// durability, league counts, transition); the real values come from the Phase A benchmark on the game itself.
//   node tools/aging-projection.mjs [--seed=106] [--seasons=20] [--old=15] [--json=out.json]
import fs from 'node:fs';
import { generateMonster, overall, monsterOverall, FULL_ROSTER } from '../src/data/monsters.js';
import { POSITION_WEIGHTS } from '../src/data/personnel.js';
import { GROUP_SLOTS } from '../src/franchise/roster.js';
import { generateDraftClass } from '../src/franchise/draft.js';
import * as R from '../src/franchise/league-registry.js';
import { createRng } from '../src/core/rng.js';
import { runFranchise, newFranchise } from './franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from './league-soak.mjs';
import * as P from './task6/aging-proposal.mjs';
import { levelsAt } from './aging-model.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const SEED = Number(args.seed || 106), SEASONS = Number(args.seasons || 20), OLD = Number(args.old || 15);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null); const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : null; };
const POS = Object.keys(GROUP_SLOTS);

function leagueFrom(f) { const clubs = {}; for (const c of R.leagueClubs(f)) clubs[c] = R.clubRoster(f, c).map((m) => ({ ...JSON.parse(JSON.stringify(m)), _prot: R.isProtected(m), _entry: (m.age ?? 22) - (m.yearsPro ?? 0) })); return clubs; }
const ovrOf = (m) => overall(m.attributes, m.position);
function starterIds(roster) { const s = new Set(); for (const pos of POS) for (const m of roster.filter((x) => x.position === pos).sort((a, b) => ovrOf(b) - ovrOf(a)).slice(0, GROUP_SLOTS[pos].length)) s.add(m.id); return s; }

/** Project a league. `transition`: null (a new league), 'ramp' (Modification 4) or 'none' (old save, rules applied at once). */
export function project(clubs0, { seasons, seed, transition = null, label }) {
  const rng = createRng(seed); const clubs = JSON.parse(JSON.stringify(clubs0)); const rec = { label, retirements: [], walked: 0, perSeason: [], progression: {}, startersAt: {}, veterans: [] };
  let uid = 0;
  for (let t = 1; t <= seasons; t++) {
    const s = transition === 'ramp' ? t : null; let retiredThisSeason = 0;
    for (const [club, roster] of Object.entries(clubs)) {
      const st = starterIds(roster); const clubMean = mean(roster.filter((m) => st.has(m.id)).map(ovrOf));
      // ---- the season
      for (const m of roster) {
        m._wk = 0; m._severe = false; if (m._prot) continue; const start = st.has(m.id); m._start = start;
        if (start) for (let g = 0; g < 11; g++) { const risk = 0.012 + 0.015 + (1 - (m.attributes.durability || 60) / 99) * 0.03; if (rng.next() < risk) { const roll = rng.next(); const wk = roll < 0.6 ? 1 : roll < 0.9 ? 2 + Math.floor(rng.next() * 2) : 4 + Math.floor(rng.next() * 3); m._wk += wk; if (wk >= 4) m._severe = true; } }
        m._hist = (m._hist || 0) + m._wk;
        const age = m.age; m._dap ??= age >= P.CURVE[m.position].onset - 3 ? m.attributes.durability : null; const pub = P.publicOnset(m.position, m._dap ?? m.attributes.durability);
        m._lf = (m._lf || 0) + (start ? levelsAt(age) : 0.1); const levels = Math.floor(m._lf); m._lf -= levels; let points = 0; const w = Object.entries(POSITION_WEIGHTS[m.position]);
        for (let l = 0; l < levels; l++) { for (let i = 0; i < 3; i++) { let rr = rng.next() * w.reduce((a, [, x]) => a + x, 0); let k = w[0][0]; for (const [kk, x] of w) { rr -= x; if (rr <= 0) { k = kk; break; } } if (m.attributes[k] < m.potential && rng.next() < 1 / P.costOf(k, age, pub, m.position)) m.attributes[k] = Math.min(m.potential, m.attributes[k] + 1 + (rng.next() < 0.3 ? 1 : 0)); } points += 2; }
        let guard = 30; while (points > 0 && guard-- > 0) { const opts = w.filter(([k]) => m.attributes[k] < m.potential).map(([k, x]) => ({ k, x, c: P.costOf(k, age, pub, m.position) })).filter((o) => o.c <= points); if (!opts.length) break; const tw = opts.reduce((a, o) => a + o.x / o.c, 0); let rr = rng.next() * tw; let pick = opts[opts.length - 1]; for (const o of opts) { rr -= o.x / o.c; if (rr <= 0) { pick = o; break; } } m.attributes[pick.k] += 1; points -= pick.c; }
        m._peak = Math.max(m._peak || 0, ovrOf(m));
      }
      // ---- the offseason: age, decline, retirement, the 32+ reserve walk
      const before = Object.fromEntries(roster.map((m) => [m.id, { ...m.attributes }])); const out = []; const cap = Math.ceil(P.transitionClubCap(s) * roster.length); let retiredHere = 0;
      const order = roster.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
      for (const m of order) {
        if (m._prot) continue; m.age += 1;
        m._dap ??= m.age >= P.CURVE[m.position].onset - 3 ? m.attributes.durability : null; const onset = P.trueOnset(m.position, m.id, m._dap ?? m.attributes.durability);
        const yP = P.transitionYears(m.age - onset, s), yT = P.transitionYears(m.age - onset - P.CURVE[m.position].tech, s);
        for (const k of Object.keys(m.attributes)) { const loss = P.isPhysical(k) ? P.physLoss(yP, P.CURVE[m.position].rate) + (m._severe && yP > 0 ? P.SEVERE_INJURY_PHYSICAL : 0) : P.techLoss(yT); m.attributes[k] = Math.max(20, m.attributes[k] - P.drawLoss(loss, rng)); }
        const y = m.age - (onset + P.CAREER_AFTER_ONSET); const nowOvr = ovrOf(m);
        const p = P.retireChance(y, { starterNearPeak: m._start && nowOvr >= m._peak - 4, declinedReserve: !m._start && nowOvr <= m._peak - 10, injury: P.injuryClass({ severe: m._severe, weeksLost: m._wk, chronic: m._hist >= 3 * Math.max(1, m.age - m._entry) }), ramp: P.transitionRamp(s) });
        if (p > 0 && retiredHere < cap && rng.next() < p) { out.push(m.id); retiredHere++; rec.retirements.push({ t, pos: m.position, age: m.age, longevity: P.longevityOf(m.id), dur: m._dap ?? m.attributes.durability, severeEver: !!m._sevEver, career: m.age - m._entry, starter: !!m._start }); continue; }
        if (!m._start && m.age >= 32) { out.push(m.id); rec.walked++; continue; }
        if (m._severe) m._sevEver = true;
        // attribute progression by seasons from the true onset (starters only)
        if (m._start) { const key = Math.max(-4, Math.min(8, m.age - onset)); const d = (rec.progression[key] ||= { phys: [], tech: [], ovr: [] }); const b = before[m.id]; d.phys.push(mean(P.PHYSICAL.map((k) => m.attributes[k] - b[k]))); d.tech.push(mean(Object.keys(b).filter((k) => !P.isPhysical(k) && POSITION_WEIGHTS[m.position][k]).map((k) => m.attributes[k] - b[k]))); }
      }
      retiredThisSeason += retiredHere;
      clubs[club] = roster.filter((m) => !out.includes(m.id)); void clubMean;
    }
    // ---- refill: three draftees a club from the game's own class, then generated arrivals near the club's starter level
    const cls = generateDraftClass(rng, { year: 100 + t }).sort((a, b) => (monsterOverall(b) + 0.2 * (b.potential - 70)) - (monsterOverall(a) + 0.2 * (a.potential - 70)));
    const names = Object.keys(clubs);
    for (let round = 0; round < 3; round++) for (const c of (round % 2 ? names.slice().reverse() : names)) { const m = cls.shift(); if (m && clubs[c].length < 38) clubs[c].push({ ...m, id: `p${t}_${uid++}`, _entry: m.age }); }
    for (const [c, roster] of Object.entries(clubs)) {
      const st = starterIds(roster); const lvl = mean(roster.filter((m) => st.has(m.id)).map(ovrOf)) || 60;
      for (const [pos, n] of FULL_ROSTER) { while (roster.filter((m) => m.position === pos).length < n && roster.length < 38) { const age = 24 + Math.floor(rng.next() * 7); const m = generateMonster(rng, { position: pos, quality: Math.round(lvl - 3), age }); roster.push({ ...m, id: `g${t}_${uid++}`, _entry: age - Math.floor(rng.next() * 4) }); } }
    }
    // ---- season snapshot
    const starters = Object.values(clubs).flatMap((r) => { const st = starterIds(r); return r.filter((m) => st.has(m.id) && !m._prot); });
    rec.perSeason.push({ t, retirements: retiredThisSeason, starterAge: r1(mean(starters.map((m) => m.age))), starters33: r1(100 * starters.filter((m) => m.age >= 33).length / starters.length), maxStarterAge: Math.max(...starters.map((m) => m.age)), starterOvr: r1(mean(starters.map(ovrOf))) });
    const vets = Object.values(clubs).flat().filter((m) => !m._prot && m.age >= P.publicOnset(m.position, m._dap ?? 60) + 2); const stAll = new Set(Object.values(clubs).flatMap((r) => [...starterIds(r)]));
    rec.veterans.push({ t, n: vets.length, startingPct: r1(100 * vets.filter((m) => stAll.has(m.id)).length / Math.max(1, vets.length)) });
  }
  return rec;
}

export function summarise(rec) {
  const R2 = rec.retirements; const byPos = {}; for (const r of R2) (byPos[r.pos] ||= []).push(r);
  const posRows = Object.fromEntries(POS.filter((p) => byPos[p]).map((p) => { const ages = byPos[p].map((r) => r.age); const base = P.CURVE[p].onset + P.CAREER_AFTER_ONSET; return [p, { n: ages.length, mean: r1(mean(ages)), p10: q(ages, 0.1), p50: q(ages, 0.5), p90: q(ages, 0.9), earlyPct: r1(100 * ages.filter((a) => a <= base - 2).length / ages.length), exceptionalPct: r1(100 * ages.filter((a) => a >= base + 3).length / ages.length) }]; }));
  const careers = R2.map((r) => r.career);
  const durT = (lo, hi) => { const xs = R2.filter((r) => r.dur >= lo && r.dur < hi).map((r) => r.age); return { n: xs.length, meanAge: r1(mean(xs)) }; };
  const lg = (l) => { const xs = R2.filter((r) => r.longevity === l).map((r) => r.age - (P.CURVE[r.pos].onset + P.CAREER_AFTER_ONSET)); return { n: xs.length, meanVsBase: r1(mean(xs)) }; };
  return { label: rec.label, byPosition: posRows, careerLength: { p10: q(careers, 0.1), p50: q(careers, 0.5), p90: q(careers, 0.9), mean: r1(mean(careers)) },
    byDurability: { low: durT(0, 46), mid: durT(46, 75), high: durT(75, 100) }, severeInjury: { ever: r1(mean(R2.filter((r) => r.severeEver).map((r) => r.age))), never: r1(mean(R2.filter((r) => !r.severeEver).map((r) => r.age))), nEver: R2.filter((r) => r.severeEver).length },
    byLongevity: Object.fromEntries([-3, -2, -1, 0, 1, 2, 3].map((l) => [l, lg(l)])), walkedReserves32: rec.walked,
    perSeason: rec.perSeason, veterans: rec.veterans, progression: Object.fromEntries(Object.entries(rec.progression).sort((a, b) => a[0] - b[0]).map(([k, v]) => [k, { n: v.phys.length, phys: r1(mean(v.phys)), tech: r1(mean(v.tech)) }])) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fresh = leagueFrom(newFranchise(SEED));
  let old = null; runFranchise(SEED, { seasons: OLD, check: withBoardReset(leagueInvariants), onSeason: (f, s) => { if (s === OLD) old = leagueFrom(f); } });
  const runs = [project(fresh, { seasons: SEASONS, seed: SEED * 7 + 1, label: `new league, ${SEASONS} seasons` }), project(old, { seasons: 8, seed: SEED * 7 + 2, transition: 'ramp', label: `old save (${OLD} seasons under today's rules), 8 seasons with the transition` }), project(old, { seasons: 8, seed: SEED * 7 + 2, transition: 'none', label: `old save, 8 seasons, rules applied at once (no transition)` })];
  // transition variants (Modification 4): A = ramp 3 seasons, 20% cap for 2; B = ramp 4, 15% cap for 3 (recommended); C = ramp 4, 12% cap for 4
  const variants = { A: { rampSeasons: 3, capShare: 0.2, capSeasons: 2, declineFactor: 2 }, B: { rampSeasons: 4, capShare: 0.15, capSeasons: 3, declineFactor: 2 }, C: { rampSeasons: 4, capShare: 0.12, capSeasons: 4, declineFactor: 2 } };
  const keep = { ...P.TRANSITION };
  for (const [name, v] of Object.entries(variants)) { Object.assign(P.TRANSITION, v); runs.push(project(old, { seasons: 8, seed: SEED * 7 + 2, transition: 'ramp', label: `old save, transition variant ${name} ${JSON.stringify(v)}` })); }
  Object.assign(P.TRANSITION, keep);
  const out = { seed: SEED, runs: runs.map(summarise) };
  if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
  for (const s of out.runs) {
    console.log(`\n=== ${s.label}`);
    console.log('retirement age by position (n, mean, p10/p50/p90, early ≤ base−2 %, exceptional ≥ base+3 %):'); for (const [p, v] of Object.entries(s.byPosition)) console.log(`  ${p.padEnd(3)} n=${String(v.n).padStart(4)} mean ${v.mean} ${v.p10}/${v.p50}/${v.p90} early ${v.earlyPct}% exceptional ${v.exceptionalPct}%`);
    console.log(`career length (seasons since entering the league): p10 ${s.careerLength.p10} · p50 ${s.careerLength.p50} · p90 ${s.careerLength.p90} · mean ${s.careerLength.mean}`);
    console.log(`retirement age by durability at peak: ≤45 ${JSON.stringify(s.byDurability.low)} · 46–74 ${JSON.stringify(s.byDurability.mid)} · 75+ ${JSON.stringify(s.byDurability.high)} | severe injury ever ${s.severeInjury.ever} (n=${s.severeInjury.nEver}) vs never ${s.severeInjury.never}`);
    console.log('retirement age vs position base, by hidden longevity:', Object.entries(s.byLongevity).map(([l, v]) => `${l}: ${v.meanVsBase} (n=${v.n})`).join(' · '));
    console.log('per season (retirements · starter age · starters 33+ % · oldest starter · starter overall):', s.perSeason.map((x) => `t${x.t}: ${x.retirements}·${x.starterAge}·${x.starters33}%·${x.maxStarterAge}·${x.starterOvr}`).join('  '));
    console.log('veterans (age ≥ public onset + 2) who start, %:', s.veterans.map((x) => `t${x.t}:${x.startingPct}`).join(' '));
    console.log('starters: attribute change per season by seasons from true onset (physical / technical):', Object.entries(s.progression).map(([k, v]) => `${k}: ${v.phys}/${v.tech}`).join('  '));
  }
}
