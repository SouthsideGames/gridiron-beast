#!/usr/bin/env node
// Career Timeline study (GDD §38.6): hands-off franchises through several seasons; how timelines accumulate, how much they
// weigh in the save, and that nothing is duplicated or out of season. Exits 1 on a problem.
//   node tools/career-study.mjs [--n=6] [--seasons=4] [--seed=21]
import { runFranchise } from './franchise-soak.mjs';
import { careerTimeline } from '../src/franchise/career.js';
import * as Save from '../src/franchise/save.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 6), SEASONS = Number(args.seasons || 4), SEED = Number(args.seed || 21);
const types = {}; let monsters = 0, withHighlight = 0, events = 0, majors = 0, bytes = 0, saveBytes = 0, problems = 0, maxEv = 0, longest = null, seasons = 0;
for (let i = 0; i < N; i++) {
  const { f, problems: p, log } = runFranchise(SEED + i, { difficulty: ['rookie', 'pro', 'allstar'][i % 3], seasons: SEASONS });
  problems += p.length; if (p.length) console.log('PROBLEMS', SEED + i, p.slice(0, 5)); seasons += log.seasons.length;
  const save = Save.exportJson(f); saveBytes += save.length;
  const back = Save.importJson(save);
  for (const m of f.roster) {
    monsters++; const t = careerTimeline(m, { club: f.club }); const ev = m.career?.ev || []; events += ev.length; bytes += JSON.stringify(m.career || {}).length;
    for (const e of t) types[e.t] = (types[e.t] || 0) + 1;
    if (t.some((e) => e.tier !== 'career')) withHighlight++; majors += t.filter((e) => e.tier === 'major').length;
    if (ev.length > maxEv) { maxEv = ev.length; longest = { name: m.name, position: m.position, events: t.slice(0, 12).map((e) => `${e.y ?? '-'}${e.w ? '/' + e.w : ''} ${e.title}`) }; }
    const b = back.roster.find((x) => x.id === m.id); if (JSON.stringify(b.career?.ev) !== JSON.stringify(m.career?.ev)) { problems++; console.log('save changed the timeline of', m.name); }
  }
}
console.log(JSON.stringify({ franchises: N, seasons, monsters, eventsStored: events, perMonster: +(events / monsters).toFixed(1), withAHighlight: `${Math.round(withHighlight / monsters * 100)}%`, majorsShown: majors, careerBytesPerRoster: Math.round(bytes / N), share: `${(bytes / saveBytes * 100).toFixed(1)}% of the save`, byType: types, longest, problems }, null, 1));
process.exit(problems ? 1 : 0);
