// Season verification used after the v42.21.0 release (run from a git archive of d2159f8; paths here are relative to this folder). Reads only.
// Post-release functional verification on the merged main (REL = git archive of d2159f8). Reads only.
import * as S from '../../../tools/franchise-soak.mjs';
import * as R from '../../../src/franchise/league-registry.js';
import { hasReplacement, STARTER_SALE } from '../../../src/franchise/league-trades.js';
const seed = Number(process.argv[2] || 4), seasons = Number(process.argv[3] || 6);
const out = { seed, seasons: [], problems: 0 };
let prev = null;
const snap = (f) => { const m = new Map(); for (const c of R.leagueClubs(f)) for (const x of R.clubRoster(f, c)) m.set(x.id, { ref: x, age: x.age, club: c, ageless: R.isAgeless(x) }); return m; };
const { f, problems } = S.runFranchise(seed, { seasons, onSeason: (f, s) => {
  const cur = snap(f); const modes = {}; for (const c of R.leagueClubs(f)) { const md = R.clubRecord(f, c).strategy?.mode || 'compete'; modes[md] = (modes[md] || 0) + 1; }
  const row = { season: s, year: f.season.year, modes };
  if (prev) {
    const joined = {}, left = {}; let aged = 0, agedOk = 0;
    for (const [id, v] of cur) { if (!prev.has(id)) { const h = v.ref.history?.[v.ref.history.length - 1]; const why = h?.reason || '?'; joined[why] = (joined[why] || 0) + 1; } else { const p = prev.get(id); if (!p.ageless) { aged++; if (v.age === p.age + 1) agedOk++; else { const k = `d${v.age - p.age}:${v.ref.injury ? "inj" : ""}${p.ref === v.ref ? "" : "newref"}`; (row.ageDiff ||= {})[k] = (row.ageDiff[k] || 0) + 1; (row.d0s ||= []).length < 400 && row.d0s.push({ r: v.ref.rookie ?? null, yp: v.ref.yearsPro, age: v.age, j: v.ref.history?.[0]?.reason, from: v.ref.history?.[0]?.from, gone: !!v.ref.retiring }); } } } }
    for (const [id, v] of prev) if (!cur.has(id)) { const h = v.ref.history?.[v.ref.history.length - 1]; const why = h?.reason || (v.ref.retired ? 'retired' : '?'); left[why] = (left[why] || 0) + 1; }
    Object.assign(row, { joined, left, aged, agedOk });
  }
  const tr = (f.league.trades || []).filter((t) => t.year === f.season.year - 1 || t.year === f.season.year);
  row.trades = tr.length; row.sales = tr.filter((t) => t.sale).map((t) => ({ y: t.year, wk: t.week, seller: t.seller, buyerMode: t.buyerMode, age: t.age, paidAges: t.paidAges }));
  out.seasons.push(row); prev = cur; } });
out.problems = problems.length; out.problemSample = problems.slice(0, 5); out.finalYear = f.season.year;
console.log(JSON.stringify(out));
