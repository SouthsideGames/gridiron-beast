#!/usr/bin/env node
// Task 6 Phase 0: the measures of the approved specification (docs/TASK6_APPROVED_SPECIFICATION.md §4), computed from harness-v4 runs.
// Planning tool; reads JSON only. Every measure's definition is in docs/TASK6_PHASE0_METHODOLOGY.md §3 (same names).
//
// The Task 6 yardsticks are computed from the harness's own season-end snapshot (`run.v4`), never from the game's decision functions,
// so a phase that changes those functions (for example the AI's position needs) cannot move its own yardstick. The Task 4/5 measures
// (tools/post-trading-analyze.mjs seedMetrics) are carried alongside, unchanged, for continuity.
//
//   node tools/task6-analyze.mjs --files=a.json,b.json [--json=out.json]     per-seed measures and pooled distributions
import fs from 'node:fs';
import { seedMetrics as task5Metrics } from './post-trading-analyze.mjs';
import { CURVE } from './task6/aging-proposal.mjs';

const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const PHYSICAL = ['speed', 'agility', 'strength', 'durability'];
const mean = (a) => { const v = a.filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const pct = (n, d) => (d ? 100 * n / d : null);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
/** The public decline onset (position + durability, no hidden longevity) — the Group 1 yardstick for "veteran" and "past onset". */
export const publicOnset = (pos, dur) => (CURVE[pos] || CURVE.WR).onset + (dur >= 75 ? 1 : dur <= 45 ? -1 : 0);
/** Position base retirement age for early/exceptional counts. CORRECTED (owner, 2026-10-31): normal onset + 4 (CAREER_AFTER_ONSET), the
 *  base of the Group 1 projection the approved bands came from. Phase 0 had written onset + 5 by mistake; that original definition is
 *  still reported as `earlyPctOrig` / `exceptionalPctOrig` (methodology §8). */
export const baseRetireAge = (pos) => (CURVE[pos] || CURVE.WR).onset + 4;
export const baseRetireAgeOrig = (pos) => (CURVE[pos] || CURVE.WR).onset + 5;

/** A run's v4 snapshot as objects: seasons[i] = { year, ownerClub, strategy, monsters: [{id, club, ...}] }. */
export function unpack(run) {
  const v = run.v4; if (!v) return null; const cols = v.monsterColumns; const ak = v.attrKeys || [];
  return { clubs: v.clubs, attrKeys: ak, seasons: v.seasons.map((s) => ({ ...s, monsters: s.monsters.map((row) => { const o = {}; cols.forEach((c, i) => { o[c] = row[i]; }); o.attr = Object.fromEntries(ak.map((k, i) => [k, o.attrs?.[i]])); o.phys = mean(PHYSICAL.map((k) => o.attr[k])); return o; }) })) };
}

/** Every Task 6 measure for one seed (null where the run is too short or the event does not exist yet). */
export function seedMeasures(run) {
  const U = unpack(run); if (!U || run.error) return null;
  const S = U.seasons; const last = S[S.length - 1]; const at = (y) => S.find((s) => s.year === y);
  const ai = (s) => s.monsters.filter((m) => m.club !== s.ownerClub);
  const gymOf = (club) => U.clubs[club]?.gym || null;
  const rows = run.rows.filter((x) => !x.owner); const own = run.rows.filter((x) => x.owner);
  const out = {};

  // ---- ageing and careers (Group 1)
  const starterAge = (s) => (s ? mean(ai(s).filter((m) => m.starter && !m.protected).map((m) => m.age)) : null);
  const old33 = (s) => { if (!s) return null; const st = ai(s).filter((m) => m.starter && !m.protected); return pct(st.filter((m) => m.age >= 33).length, st.length); };
  out.starterAgeS10 = starterAge(at(10)); out.starterAgeS20 = starterAge(at(20)); out.starterAgeFinal = starterAge(last);
  out.starters33PctS10 = old33(at(10)); out.starters33PctS20 = old33(at(20)); out.starters33PctFinal = old33(last);
  out.oldestStarterFinal = Math.max(...ai(last).filter((m) => m.starter && !m.protected).map((m) => m.age));
  const vets = ai(last).filter((m) => !m.protected && m.age >= publicOnset(m.pos, m.attr.durability) + 2);
  out.veteransStartingPct = pct(vets.filter((m) => m.starter).length, vets.length);
  // season over season, per monster (same id in consecutive snapshots)
  let imp33 = 0, n33 = 0; const physPast = []; const ovrGain = [];
  for (let i = 1; i < S.length; i++) {
    const prev = new Map(ai(S[i - 1]).map((m) => [m.id, m]));
    for (const m of ai(S[i])) { const p = prev.get(m.id); if (!p || m.ageless) continue;
      if (m.age >= 33) { n33++; if (m.ovr > p.ovr) imp33++; }
      if (m.age >= publicOnset(m.pos, m.attr.durability) + 1 && p.phys != null && m.phys != null) physPast.push(m.phys - p.phys);
      ovrGain.push({ age: m.age, d: m.ovr - p.ovr, starter: p.starter }); }
  }
  out.improvingAt33Pct = pct(imp33, n33); out.physChangePastOnset = mean(physPast);
  const dep = run.decisions.departures || []; const retired = dep.filter((d) => d.reason === 'retired');
  out.retirementsPerSeason = retired.length / Math.max(1, run.seasons);
  out.retirementAgeMean = mean(retired.map((d) => d.age));

  // ---- draft (Groups 2, 3, 4)
  const draft = (run.decisions.draft || []).filter((d) => d.round === 1);
  const startedBy = (id, lastYear) => S.some((s) => s.year <= lastYear && s.monsters.some((m) => m.id === id && m.starter));
  const elig2 = draft.filter((d) => d.year + 2 <= last.year);
  out.r1StartWithin2Pct = pct(elig2.filter((d) => startedBy(d.id, d.year + 2)).length, elig2.length);
  const late = elig2.filter((d) => d.year >= 12); out.r1StartWithin2LatePct = late.length ? pct(late.filter((d) => startedBy(d.id, d.year + 2)).length, late.length) : null;
  // the Task 4/5 sense (a starter for the club that drafted him, at the end of the second season after the draft), from the snapshot
  const onClubAt2 = (d) => at(d.year + 2)?.monsters.some((m) => m.id === d.id && m.club === d.club && m.starter);
  out.r1StarterAt2Pct = pct(elig2.filter(onClubAt2).length, elig2.length); out.r1StarterAt2LatePct = late.length ? pct(late.filter(onClubAt2).length, late.length) : null;
  const elig1 = draft.filter((d) => d.year + 1 <= last.year);
  out.r1StartSeason1Pct = pct(elig1.filter((d) => at(d.year + 1)?.monsters.some((m) => m.id === d.id && m.starter)).length, elig1.length);
  out.r1GapToFloor = mean(draft.map((d) => (d.starterFloorAtPos ? d.starterFloorAtPos - d.ovr : null)));
  out.r1Ovr = mean(draft.map((d) => d.ovr));
  // position-relative misalignment (harness yardstick): a pick at a position where the club's starters are at or above the league
  // position mean while another position of the club is weak (−4 or worse against the league) and the board had a player there within 3
  const posMean = (s) => { const o = {}; for (const p of POS) o[p] = mean(ai(s).filter((m) => m.pos === p && m.starter).map((m) => m.ovr)); return o; };
  const groupMean = (s, club, p) => mean(s.monsters.filter((m) => m.club === club && m.pos === p && m.starter).map((m) => m.ovr));
  const allPicks = (run.decisions.draft || []);
  let mis = 0, misN = 0;
  for (const d of allPicks) { const s = at(d.year); if (!s) continue; const lm = posMean(s); const gap = (p) => (groupMean(s, d.club, p) ?? 0) - (lm[p] ?? 0);
    misN++; const weakElsewhere = POS.some((p) => p !== d.pos && p !== 'K' && gap(p) <= -4); if (gap(d.pos) >= 0 && weakElsewhere && d.bestAtNeedOvr != null && d.bestAtNeedOvr >= d.ovr - 3) mis++; }
  out.misalignedPosRelPct = pct(mis, misN);

  // ---- succession, weakness, contracts (Group 3)
  let old = 0, cov = 0, ready = 0;
  for (const s of S) for (const club of new Set(ai(s).map((m) => m.club))) for (const p of POS) {
    const at2 = s.monsters.filter((m) => m.club === club && m.pos === p); const bk = at2.filter((m) => !m.starter && !m.protected);
    for (const st of at2.filter((m) => m.starter && !m.protected && m.age >= 30)) { old++; const c = bk.filter((b) => b.age <= 26 && (b.ovr >= st.ovr - 8 || (b.potential ?? 0) >= st.ovr)); if (c.length) cov++; if (c.some((b) => b.ovr >= st.ovr - 4)) ready++; }
  }
  out.successionCoverPct = pct(cov, old); out.successionReadyPct = pct(ready, old);
  let weakN = 0, weakP = 0, elig = 0;
  for (let i = 0; i < S.length; i++) { const lm = posMean(S[i]); const lmP = i ? posMean(S[i - 1]) : null;
    for (const club of new Set(ai(S[i]).map((m) => m.club))) for (const p of POS.filter((x) => x !== 'K')) {
      const g = groupMean(S[i], club, p); if (g == null) continue; const weak = g - lm[p] <= -4; if (weak) weakN++;
      if (i) { elig++; const gp = groupMean(S[i - 1], club, p); if (weak && gp != null && gp - lmP[p] <= -4) weakP++; } } }
  out.weakPosRelPct = pct(weakN, S.reduce((s, x) => s + new Set(ai(x).map((m) => m.club)).size * 9, 0)); out.persistentWeakPosRelPct = pct(weakP, elig);
  const cl = ai(last).filter((m) => !m.protected && m.contractYears != null);
  out.contract1Pct = pct(cl.filter((m) => m.contractYears === 1).length, cl.length); out.contract2Pct = pct(cl.filter((m) => m.contractYears === 2).length, cl.length); out.contract3PlusPct = pct(cl.filter((m) => m.contractYears >= 3).length, cl.length);
  const ends = {}; for (const m of cl) ends[m.contractEnds] = (ends[m.contractEnds] || 0) + 1; out.maxExpiryShare = cl.length ? 100 * Math.max(...Object.values(ends)) / cl.length : null;
  const pays = (run.decisions.trades || []).filter((t) => t.toBAge != null); out.youngPaymentPct = pct(pays.filter((t) => t.toBAge <= 24).length, pays.length);

  // ---- development (Group 4)
  const traj = new Map(); for (const s of S) for (const m of ai(s)) { if (!traj.has(m.id)) traj.set(m.id, []); traj.get(m.id).push({ y: s.year, ...m }); }
  const gain3 = (pred) => { const g = []; for (const t of traj.values()) for (let i = 0; i < t.length; i++) { const a = t[i]; const b = t.find((x) => x.y === a.y + 3); if (!b || a.age > 24) continue; const mid = [0, 1, 2].map((k) => t.find((x) => x.y === a.y + k)); if (mid.some((x) => !x)) continue; if (pred(mid)) g.push(b.ovr - a.ovr); } return g; };
  out.youngReserveGain3 = mean(gain3((mid) => mid.every((x) => !x.starter))); out.youngStarterGain3 = mean(gain3((mid) => mid[1].starter && mid[2].starter));
  const potGain = { hi: [], lo: [] }; for (const t of traj.values()) { const a = t[0]; const b = t.find((x) => x.y === a.y + 3); if (!b || a.age > 24 || a.potential == null) continue; (a.potential - a.ovr >= 12 ? potGain.hi : potGain.lo).push(b.ovr - a.ovr); }
  out.highPotentialGain3 = mean(potGain.hi); out.lowPotentialGain3 = mean(potGain.lo);
  out.evolutionsPerClubSeason = mean(rows.map((x) => x.evolved || 0));
  out.leagueStarterOvrS10 = at(10) ? mean(ai(at(10)).filter((m) => m.starter).map((m) => m.ovr)) : null; out.leagueStarterOvrS20 = at(20) ? mean(ai(at(20)).filter((m) => m.starter).map((m) => m.ovr)) : null;

  // ---- competitive balance (Group 2)
  const isGym = (c) => !!gymOf(c);
  const wp = (rs) => { const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); return w + l ? 100 * w / (w + l) : null; };
  out.gymWinPct = wp(rows.filter((x) => isGym(x.club))); out.ordinaryWinPct = wp(rows.filter((x) => !isGym(x.club)));
  // head to head (harness v4 results): games between a gym and an ordinary AI club, from the gym's side; ties count half
  { let w = 0, n = 0; for (const s of S) for (const g of s.games || []) { const [, h, a, hs, as] = g; if (h === s.ownerClub || a === s.ownerClub) continue; const gh = isGym(h), ga = isGym(a); if (gh === ga) continue; n++; const gymScore = gh ? hs : as, othScore = gh ? as : hs; w += gymScore > othScore ? 1 : gymScore === othScore ? 0.5 : 0; }
    out.gymVsOrdinaryWinPct = pct(w, n); }
  const titles = rows.filter((x) => x.champion); out.gymTitleSharePct = pct(titles.filter((x) => isGym(x.club)).length, titles.length); out.ordinaryTitleSharePct = pct(titles.filter((x) => !isGym(x.club)).length, titles.length);
  const po = rows.filter((x) => x.playoffs); out.ordinaryPlayoffSharePct = pct(po.filter((x) => !isGym(x.club)).length, po.length);
  const byClub = {}; for (const x of rows) (byClub[x.club] ||= []).push(x); for (const l of Object.values(byClub)) l.sort((a, b) => a.year - b.year);
  const loser = (l) => l.some((_, i) => i + 2 < l.length && l[i].w <= 3 && l[i + 1].w <= 3 && l[i + 2].w <= 3);
  const ord = Object.entries(byClub).filter(([c]) => !isGym(c)); const gy = Object.entries(byClub).filter(([c]) => isGym(c));
  out.ordinaryPersistentLoserPct = pct(ord.filter(([, l]) => loser(l)).length, ord.length); out.gymPersistentLoserPct = pct(gy.filter(([, l]) => loser(l)).length, gy.length);
  const lead = (y) => { const rs = rows.filter((x) => x.year === y); const g = mean(rs.filter((x) => isGym(x.club)).map((x) => x.teamOvr)), o = mean(rs.filter((x) => !isGym(x.club)).map((x) => x.teamOvr)); return g != null && o != null ? g - o : null; };
  out.gymLeadS5 = lead(5); out.gymLeadS10 = lead(10); out.gymLeadS20 = lead(20);
  const leads = []; for (let y = 5; y <= last.year; y++) { const v = lead(y); if (v != null) leads.push(v); } out.gymLeadMinS5on = leads.length ? Math.min(...leads) : null;
  const tierOvr = (t) => mean(rows.filter((x) => x.year >= 5 && gymOf(x.club) === t).map((x) => x.teamOvr));
  out.gymTierOrderHeld = last.year >= 5 ? (tierOvr('early') < tierOvr('mid') && tierOvr('mid') < tierOvr('late') ? 1 : 0) : null;
  out.gymEarlyOvrS5on = tierOvr('early'); out.gymMidOvrS5on = tierOvr('mid'); out.gymLateOvrS5on = tierOvr('late');
  { const v = [5, 6, 7].map(lead).filter((x) => x != null); out.gymLeadS5to7Min = v.length ? Math.min(...v) : null; }
  const leads8 = []; for (let y = 8; y <= last.year; y++) { const v = lead(y); if (v != null) leads8.push(v); } out.gymLeadMinS8on = leads8.length ? Math.min(...leads8) : null;
  out.distinctChampions = new Set(titles.map((x) => x.club)).size;
  const genShare = (pred) => { let a = 0, s = 0; for (const x of rows.filter((r) => r.year === last.year && pred(r.club))) { const p = x.provenanceStarters || {}; s += Object.values(p).reduce((q, v) => q + v, 0); a += p['signed:generated'] || 0; } return pct(a, s); };
  out.gymGeneratedStarterPctFinal = genShare(isGym); out.ordinaryGeneratedStarterPctFinal = genShare((c) => !isGym(c));
  const ordRows = rows.filter((x) => !isGym(x.club)); out.ordinarySlowedPct = pct(ordRows.filter((x) => x.slowed > 0).length, ordRows.length);
  out.ordinarySlowedDev = mean(ordRows.filter((x) => x.slowed > 0).map((x) => x.devMean)); out.ordinaryUnslowedDev = mean(ordRows.filter((x) => !(x.slowed > 0)).map((x) => x.devMean));
  out.ownerWinPctS1to8 = wp(own.filter((x) => x.year <= 8)); out.ownerWinPctS9to20 = wp(own.filter((x) => x.year >= 9));

  // ---- strategy modes (Phase D; null until the field exists)
  const modes = S.map((s) => s.strategy).filter(Boolean); const hasMode = modes.some((m) => Object.values(m).some((x) => x && x.mode != null));
  if (hasMode) { let ch = 0, n = 0; for (const club of Object.keys(modes[0])) for (let i = 1; i < modes.length; i++) { n++; if (modes[i][club]?.mode !== modes[i - 1][club]?.mode) ch++; } out.modeChangesPer10 = n ? 10 * ch / n : null; } else out.modeChangesPer10 = null;

  // ---- integrity
  out.problems = run.problemCount ?? (run.problems || []).length;
  for (const k of Object.keys(out)) out[k] = typeof out[k] === 'number' ? r2(out[k]) : out[k];
  return { ...out, task5: task5Metrics(run) };
}

/** Pooled distributions that need many seeds (per-position retirement ages, career lengths, ageing by seasons past onset). */
export function pooled(runs) {
  const ret = []; const phys = {}; const careers = [];
  for (const run of runs) { const U = unpack(run); if (!U || run.error) continue;
    const S = U.seasons; const lastSeen = new Map(); for (const s of S) for (const m of s.monsters) lastSeen.set(m.id, m);
    for (const d of (run.decisions.departures || []).filter((x) => x.reason === 'retired')) { const m = lastSeen.get(d.id); const bo = baseRetireAgeOrig(d.pos); ret.push({ pos: d.pos, age: d.age, early: d.age <= baseRetireAge(d.pos) - 2, exceptional: d.age >= baseRetireAge(d.pos) + 3, earlyOrig: d.age <= bo - 2, exceptionalOrig: d.age >= bo + 3, career: m?.yearsPro ?? null }); }
    for (let i = 1; i < S.length; i++) { const prev = new Map(S[i - 1].monsters.map((m) => [m.id, m])); for (const m of S[i].monsters) { const p = prev.get(m.id); if (!p || m.ageless || !m.starter || m.club === S[i].ownerClub) continue; const y = m.age - publicOnset(m.pos, m.attr.durability); if (y < -4 || y > 8) continue; (phys[y] ||= []).push(m.phys - p.phys); } }
  }
  const byPos = {}; for (const p of POS) { const r = ret.filter((x) => x.pos === p); byPos[p] = r.length ? { n: r.length, meanAge: r2(mean(r.map((x) => x.age))), earlyPct: r2(pct(r.filter((x) => x.early).length, r.length)), exceptionalPct: r2(pct(r.filter((x) => x.exceptional).length, r.length)), earlyPctOrig: r2(pct(r.filter((x) => x.earlyOrig).length, r.length)), exceptionalPctOrig: r2(pct(r.filter((x) => x.exceptionalOrig).length, r.length)) } : { n: 0 }; }
  const car = ret.map((x) => x.career).filter((x) => x != null).sort((a, b) => a - b); const q = (p) => (car.length ? car[Math.min(car.length - 1, Math.floor(p * car.length))] : null);
  return { retirements: ret.length, retirementByPos: byPos, careerSeasons: { n: car.length, p10: q(0.1), p50: q(0.5), p90: q(0.9) }, physChangeBySeasonsPastPublicOnset: Object.fromEntries(Object.entries(phys).sort((a, b) => a[0] - b[0]).map(([k, v]) => [k, { n: v.length, mean: r2(mean(v)) }])) };
}

/** Load runs from harness files (v4 only). */
export function loadRuns(files) { const runs = []; for (const f of files) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (j.harnessV < 4) throw new Error(`${f}: harness v${j.harnessV}; Task 6 measures need v4`); runs.push(...j.runs); } return runs; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
  const runs = loadRuns(String(args.files || '').split(',').filter(Boolean));
  const per = runs.map((r) => ({ seed: r.seed, ...seedMeasures(r) }));
  const keys = Object.keys(per[0] || {}).filter((k) => k !== 'seed' && k !== 'task5');
  const summary = Object.fromEntries(keys.map((k) => [k, r2(mean(per.map((p) => p[k])))]));
  const out = { seeds: per.map((p) => p.seed), summary, pooled: pooled(runs), perSeed: per };
  if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ seeds: out.seeds.length, summary }, null, 1));
}
