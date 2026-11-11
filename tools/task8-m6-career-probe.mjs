// Preload for a MEASUREMENT COPY: individual-level, read-only record of real franchise careers.
//  per monster and season: football starts (in the lineup of a finished game), football executions credited under the passive cap,
//  Clash lineups and Clash executions; and, at each season start, every league monster's level, age, mastery and club.
import fs from 'node:fs';
let year = 1; const ind = {}; const seenGame = new WeakSet(); const meta = { games: 0, clashSettlements: 0, seasons: [] };
const rec = (id) => (ind[id] ||= { id, seasons: {} }); const yr = (r) => (r.seasons[year] ||= { st: 0, fx: 0, cl: 0, cx: 0 });
globalThis.__m6Probe = (ev, state, teams) => {
  if (!state.finished || seenGame.has(state)) return; seenGame.add(state); meta.games++; const log = state.t8?.mastery || {};
  for (const side of ['home', 'away']) { const t = teams[side]; const seen = new Set();
    for (const m of [...Object.values(t.offense || {}), ...Object.values(t.defense || {}), t.kicker]) { if (!m?.id || seen.has(m.id)) continue; seen.add(m.id); const y = yr(rec(m.id)); y.st++; y.fx += log[m.id]?.executions || 0; } }
};
globalThis.__m6Clash = (result, side) => { meta.clashSettlements++; for (const x of result.lines?.[side] || []) { const id = x.combatant?.monsterId; if (!id) continue; const y = yr(rec(id)); y.cl++; y.cx += x.executions || 0; } };
globalThis.__m6SeasonStart = (f, y) => {
  year = y; meta.seasons.push(y); const M = f.league?.monsters || {}; const clubOf = {}; for (const [c, r] of Object.entries(f.league?.clubs || {})) for (const id of r.roster || []) clubOf[id] = c;
  const note = (m, club) => { if (!m?.dev) return; const r = rec(m.id); r.seedTag = f.seed; r.species = m.species; r.position = m.position; if (m.dev.apex) (r.apexCur ||= {})[y] = Object.values(m.dev.current).reduce((a, b) => a + b, 0); r.apex = !!m.dev.apex; r.legendary = !!m.legendary; (r.snap ||= {})[y] = { lv: m.level, age: m.age, yp: m.yearsPro, fm: m.dev.mastery?.football || 0, cm: m.dev.mastery?.clash || 0, club, ovr: m.overall ?? null }; };
  for (const m of Object.values(M)) note(m, clubOf[m.id] || null); for (const m of f.roster || []) note(m, f.club);
};
process.on('exit', () => { fs.writeFileSync(process.env.M6_CAREER_OUT, JSON.stringify({ meta, individuals: Object.values(ind) })); });
