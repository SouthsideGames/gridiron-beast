// All-Star investigation recorder (read-only diagnostics; owner 2026-11-05 19:36). The drift benchmark's franchise (persistent league,
// board reset, hands-off owner) with per-game and per-offseason records; --owner=negotiate adds the negotiating owner (visible information only).
//   node record.mjs --root=TREE --difficulty=allstar --seed=1 --seasons=8 --owner=handsoff|negotiate --json=out.json
import fs from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const R = args.root; const imp = (p) => import(`${R}/${p}`);
const { runFranchise, invariants } = await imp('tools/franchise-soak.mjs'); const { withBoardReset } = await imp('tools/league-soak.mjs');
const F = await imp('src/franchise/franchise.js'); const { teamOverall, buildDepthChart } = await imp('src/franchise/roster.js'); const { monsterOverall } = await imp('src/data/monsters.js');
let E = null; try { E = await imp('src/franchise/fa-engine.js'); } catch {}
let CON = null; try { CON = await imp('src/franchise/contracts.js'); } catch {}
const seed = +args.seed, seasons = +(args.seasons || 8), difficulty = args.difficulty || 'allstar', NEGO = args.owner === 'negotiate', REPAIR = args.owner === 'repair';
const RO = { ...(await imp('src/franchise/roster.js')), positionOf: (await imp('src/data/personnel.js')).positionOf }; const { ROSTER_MAX } = await imp('src/data/monsters.js'); const rep = { signed: 0, released: 0, failed: 0 };
// the repair variant: the hands-off owner plus what the lineup warning asks a player to do — sign a legal monster for an open starting slot
function repair(f) {
  for (let k = 0; k < 4; k++) {
    const probs = RO.lineupProblems(f.roster, RO.buildDepthChart(f.roster, f.lineupManual, f.depth)); if (!probs.length) return; const pos = RO.positionOf(probs[0]);
    if (f.roster.length >= ROSTER_MAX) { const cnt = {}; for (const m of f.roster) cnt[m.position] = (cnt[m.position] || 0) + 1; const st = new Set(Object.values(RO.buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean));
      const spare = f.roster.filter((m) => !st.has(m.id) && m.position !== pos && cnt[m.position] > (RO.GROUP_SLOTS[m.position]?.length || 1) + 1).sort((a, b) => monsterOverall(a) - monsterOverall(b))[0]; if (!spare || !F.releaseMonster(f, spare.id).ok) { rep.failed++; return; } rep.released++; }
    const room = E.capView(f, f.club).usable; let done = false;
    for (const x of F.freeAgentMarket(f).filter((x) => x.monster.position === pos && !x.monster.injury).sort((a, b) => a.ask.salary - b.ask.salary)) { if (x.ask.salary > room) continue; let r = F.negotiateFreeAgent(f, x.monster.id, x.ask); if (r.ok && r.outcome === 'countered') r = F.negotiateFreeAgent(f, x.monster.id, r.counter); if (r.ok && r.outcome === 'signed') { rep.signed++; done = true; break; } }
    if (!done) { const c = F.freeAgentMarket(f).filter((x) => x.monster.position === pos); (rep.why ||= []).length < 6 && rep.why.push({ y: f.season?.year, w: f.season?.week, pos, room, market: c.length, cheapest: c.map((x) => x.ask.salary).sort((a, b) => a - b)[0] ?? null, roster: f.roster.length });
      // a player would free cap by releasing his best-paid reserve (zero dead cap) and try again
      const st = new Set(Object.values(RO.buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean)); const cnt = {}; for (const m of f.roster) cnt[m.position] = (cnt[m.position] || 0) + 1;
      const rich = f.roster.filter((m) => !st.has(m.id) && m.position !== pos && cnt[m.position] > (RO.GROUP_SLOTS[m.position]?.length || 1)).sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
      if (!c.length || !rich || f.roster.length <= 26 || !F.releaseMonster(f, rich.id).ok) { rep.failed++; return; } rep.released++; }
  }
}
const games = []; const seen = new Set(); const offs = []; let starters = new Set();
const base = withBoardReset(invariants);
const check = (f, where) => {
  const g = f.lastGame; if (g && g.year && !seen.has(`${g.year}|${g.week}|${g.opponent}`) && f.season) { seen.add(`${g.year}|${g.week}|${g.opponent}`);
    let opp = null; try { opp = teamOverall(F.aiTeam(f, g.opponent, g.year)); } catch {}
    games.push([g.year, g.week, g.opponent, g.won ? 1 : 0, g.playerScore, g.oppScore, teamOverall(F.playerTeam(f)), opp, g.tag || null, g.forfeit ? 1 : 0]); }
  if (/ end$/.test(where)) starters = new Set(Object.values(buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean));
  return base(f, where);
};
// the negotiating owner: only what the screens show (his market ask, the opening demand, his counters, the attempts left, role, overall, age,
// potential on his own roster, the cap); never the Ambition, never a reload
const nlog = { accepted: 0, countered: 0, agreed: 0, ended: 0, walked: 0, offers: 0 };
function negotiate(f, i) {
  if (!E || i.kind !== 'monster' || i.status) return;
  const t = F.renewalTalks(f, i.id); if (!t || t.state !== 'active') return; const m = f.roster.find((x) => x.id === i.id); if (!m) return;
  const ask = E.askOf(f, m).salary; const ovr = monsterOverall(m); const st = new Set(Object.values(buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean));
  const top = f.roster.map(monsterOverall).sort((a, b) => b - a)[Math.floor(f.roster.length / 4)] ?? 99; const core = st.has(m.id) || ((m.age || 30) <= 25 && (m.potential || 0) >= ovr + 5);
  const r100 = (x) => Math.round(x / 100) * 100; const D = t.demand.salary;
  if (D <= ask * 0.97 || (st.has(m.id) && ovr >= top && D <= ask * 1.08)) { const r = F.resolveContract(f, i.id, 'sign'); if (r.status === 'signed') nlog.accepted++; return; } // a fair deal, or a star worth not risking
  const o1 = r100(D * (core ? 0.95 : 0.9)); nlog.offers++; let r = F.resolveContract(f, i.id, 'offer', { salary: o1 });
  if (r.status === 'signed') { nlog.agreed++; return; } if (r.status !== 'countered') { nlog.ended++; return; }
  nlog.countered++; const c = r.counter.salary;
  if (c <= ask * (core ? 1.03 : 1.0)) { r = F.resolveContract(f, i.id, 'acceptcounter'); if (r.status === 'signed') nlog.agreed++; return; }
  if (!core && c > ask * 1.05) { F.resolveContract(f, i.id, 'walk'); nlog.walked++; return; } // a reserve asking too much: let him go
  nlog.offers++; r = F.resolveContract(f, i.id, 'offer', { salary: r100((o1 + c) / 2) }); if (r.status === 'signed') nlog.agreed++; else nlog.ended++;
}
const t0 = Date.now();
const { f, problems, log } = runFranchise(seed, { seasons, difficulty, check, negotiate: NEGO ? negotiate : null, beforeGame: REPAIR ? repair : null, onOffseason: REPAIR ? repair : null, onSeason: (f) => {
  const items = (f.offseason?.items || []).filter((i) => i.kind === 'monster'); const sal = F.salarySummary(f);
  const staff = CON ? Object.keys(f.staff || {}).reduce((a, r) => a + CON.staffSalary(f, r), 0) : null;
  offs.push({ year: f.season.year, items: items.length, signed: items.filter((i) => i.status === 'signed').length, left: items.filter((i) => i.status && i.status !== 'signed').length,
    startersLost: items.filter((i) => i.status && i.status !== 'signed' && starters.has(i.id)).length, starterItems: items.filter((i) => starters.has(i.id)).length,
    payRatio: (() => { const s = items.filter((i) => i.status === 'signed' && i.final); const a = s.map((i) => { const m = f.roster.find((x) => x.id === i.id); return m && E ? i.final / E.askOf(f, m).salary : null; }).filter((x) => x); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; })(),
    capRoom: sal.remaining, payroll: sal.total, cap: sal.cap, staff, roster: f.roster.length, ovr: teamOverall(F.playerTeam(f)) });
} });
fs.writeFileSync(args.json, JSON.stringify({ root: R, seed, difficulty, owner: NEGO ? 'negotiate' : REPAIR ? 'repair' : 'handsoff', rep, fired: log.fired, problems: problems.slice(0, 5), games, offs, nlog, seconds: Math.round((Date.now() - t0) / 1000) }));
