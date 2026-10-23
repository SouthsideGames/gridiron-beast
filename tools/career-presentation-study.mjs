#!/usr/bin/env node
// Career Presentation study (GDD §40.6): hands-off franchises through several seasons. For every monster the save keeps (the
// roster, the regional pools, the free-agent market) the career profile builds, its trophies agree with the franchise history,
// every linked timeline event opens a verified detail, no event repeats, the Hall of Fame snapshot stays small, and reading
// any of it changes nothing. Prints a fingerprint of each franchise's seasons so two builds can be compared (--fingerprint).
//   node tools/career-presentation-study.mjs [--n=4] [--seasons=4] [--seed=1] [--fingerprint]
import { runFranchise } from './franchise-soak.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 4), SEASONS = Number(args.seasons || 4), SEED = Number(args.seed || 1);
const fingerprint = (f) => JSON.stringify({ club: f.club, seasons: f.history.map((h) => ({ y: h.year, r: h.record, champ: h.champion, place: h.place, awards: Object.fromEntries(Object.entries(h.awards?.league || {}).map(([k, w]) => [k, w ? `${w.name}|${w.team}` : null])) })), roster: f.roster.map((m) => `${m.name}:${m.level}:${m.xp}`).sort() });
if (args.fingerprint) { const out = []; for (let i = 0; i < N; i++) out.push(fingerprint(runFranchise(SEED + i, { difficulty: ['rookie', 'pro', 'allstar'][i % 3], seasons: SEASONS }).f)); console.log(JSON.stringify(out)); process.exit(0); }
const P = await import('../src/franchise/career-profile.js');
const Save = await import('../src/franchise/save.js');
let problems = 0, monsters = 0, linked = 0, opened = 0, trophies = 0, tiers = {}, snapMax = 0, ms = 0, kinds = {};
const bad = (m) => { problems++; if (problems < 20) console.log('PROBLEM', m); };
for (let i = 0; i < N; i++) {
  const { f, problems: p } = runFranchise(SEED + i, { difficulty: ['rookie', 'pro', 'allstar'][i % 3], seasons: SEASONS });
  if (p.length) bad(`soak ${SEED + i}: ${p.slice(0, 2).join('; ')}`);
  const before = JSON.stringify(f); const titleYears = new Set(f.history.filter((h) => h.champion === h.club).map((h) => h.year));
  const everyone = [...f.roster.map((m) => [m, 'roster']), ...Object.values(f.pool || {}).flat().map((m) => [m, 'pool']), ...(f.offseason?.market || []).map((m) => [m, 'market'])];
  for (const [m] of everyone) {
    const t0 = performance.now(); const pr = P.careerProfile(f, m.id); ms += performance.now() - t0; monsters++;
    if (!pr) { bad(`${m.name}: no profile`); continue; }
    kinds[pr.kind] = (kinds[pr.kind] || 0) + 1; tiers[pr.tier] = (tiers[pr.tier] || 0) + 1;
    if (new Set(pr.timeline.map((e) => e.k)).size !== pr.timeline.length) bad(`${m.name}: a repeated timeline event`);
    for (const t of pr.trophies) { trophies += t.count; if (t.kind === 'champion') for (const e of t.entries) if (!titleYears.has(e.year)) bad(`${m.name}: title ${e.year} not in the history`); if (P.TROPHY_META[t.kind]?.short) for (const e of t.entries) { const h = f.history.find((x) => x.year === e.year); if (h?.awards?.league?.[t.kind]?.id !== m.id) bad(`${m.name}: ${t.kind} ${e.year} not in the award history`); } }
    for (const e of pr.timeline.filter((x) => x.ref)) { linked++; if (P.eventDetail(f, m, e.ref)) opened++; else bad(`${m.name}: ${e.k} links to nothing`); }
    if (pr.stats.focus.some((s) => /NaN|undefined/.test(s.text))) bad(`${m.name}: a broken statistic`);
  }
  for (const m of f.roster) { const s = JSON.stringify(P.careerSnapshot(f, m)).length; if (s > snapMax) snapMax = s; }
  if (JSON.stringify(f) !== before) bad('reading profiles changed the franchise');
  const back = Save.importJson(Save.exportJson(f)); for (const m of f.roster) { const a = P.fullProfile(f, m, 'roster'), b = P.fullProfile(back, back.roster.find((x) => x.id === m.id), 'roster'); if (JSON.stringify(a.trophies) !== JSON.stringify(b.trophies) || a.timeline.length !== b.timeline.length) bad(`${m.name}: the save round-trip changed his career`); }
}
console.log(JSON.stringify({ franchises: N, seasons: SEASONS, monsters, profileKinds: kinds, tiers, trophies, linkedEvents: linked, detailsOpened: opened, msPerProfile: +(ms / monsters).toFixed(2), largestHofSnapshotBytes: snapMax, problems }, null, 1));
process.exit(problems ? 1 : 0);
