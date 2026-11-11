// Preload for the Apex validation MEASUREMENT COPY (never production). Records every Apex individual's real career and imposes the
// three Clash schedules as lineup policies: F never in a Clash lineup, M in his club's first four of a season, X in every one.
// Football participation, injuries, training allocation, contracts, cuts and trades are whatever the game's own AI does.
import fs from 'node:fs'; import path from 'node:path';
const { monsterOverall } = await import(path.join(process.cwd(), 'src/data/monsters.js'));
const BOOST = Number(process.env.M6_APEX_BOOST || 0.10), BOOST_YEARS = Number(process.env.M6_APEX_BOOST_YEARS || 5);
let year = 1; const ind = {}; const refs = new Map(); const seenGame = new WeakSet(); const meta = { games: 0, clash: 0, seasons: [], boost: BOOST, boostYears: BOOST_YEARS, candidate: !!process.env.M6_APEX_CAND, policy: process.env.M6_APEX_POLICY !== '0' };
globalThis.__m6ApexChance = BOOST;
const cohortOf = (id) => 'FMX'[[...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 3];
const rec = (m) => (ind[m.id] ||= { id: m.id, cohort: cohortOf(m.id), position: m.position, species: m.species, entry: year, seasons: {} });
const yr = (r) => (r.seasons[year] ||= { st: 0, cl: 0, club: null });
globalThis.__m6Probe = (ev, state, teams) => {
  if (!state.finished || seenGame.has(state)) return; seenGame.add(state); meta.games++;
  for (const [id, m] of refs) { const s = yr(ind[id]); s.to = (s.to || 0) + 1; if (m.injury) s.io = (s.io || 0) + 1; } // share of the season spent injured
  for (const side of ['home', 'away']) { const t = teams[side]; const seen = new Set();
    for (const m of [...Object.values(t.offense || {}), ...Object.values(t.defense || {}), t.kicker]) { if (!m?.id || seen.has(m.id) || !ind[m.id]) continue; seen.add(m.id); yr(ind[m.id]).st++; } }
};
globalThis.__m6Clash = (result, side) => { meta.clash++; for (const x of result.lines?.[side] || []) { const id = x.combatant?.monsterId; if (id && ind[id]) yr(ind[id]).cl++; } };
globalThis.__m6SeasonStart = (f, y) => {
  year = y; meta.seasons.push(y); globalThis.__m6ApexChance = y <= BOOST_YEARS ? BOOST : undefined;
  const note = (m, club) => { if (!m?.dev?.apex) return; const r = rec(m); const cur = Object.values(m.dev.current); const s = yr(r);
    refs.set(m.id, m); s.club = club; s.sum = cur.reduce((a, b) => a + b, 0); s.all99 = cur.every((v) => v >= 99); s.level = m.level; s.inj = m.injury ? 1 : 0; s.bank = Number(m.points || 0); };
  const clubOf = {}; for (const [c, r] of Object.entries(f.league?.clubs || {})) for (const id of r.roster || []) clubOf[id] = c;
  for (const m of Object.values(f.league?.monsters || {})) note(m, clubOf[m.id] || null); for (const m of f.roster || []) note(m, f.club || 'owner');
  for (const r of Object.values(ind)) if (!r.seed) r.seed = f.seed;
};
if (meta.policy) globalThis.__m6Lineup = (roster, n, out) => {
  const elig = roster.filter((m) => !m.injury); const ax = elig.filter((m) => m.dev?.apex); if (!ax.length) return out;
  const want = [], ban = new Set();
  for (const m of ax) { const c = cohortOf(m.id); const done = ind[m.id]?.seasons?.[year]?.cl || 0; if (c === 'X' || (c === 'M' && done < 4)) want.push(m); else ban.add(m); }
  let line = out.filter((m) => !ban.has(m));
  for (const w of want.slice(0, n)) { if (line.includes(w)) continue; if (line.length < n) line.push(w); else { let i = line.length - 1; while (i >= 0 && want.includes(line[i])) i--; if (i >= 0) line[i] = w; } }
  if (line.length < Math.min(n, elig.length)) { const rest = elig.filter((m) => !ban.has(m) && !line.includes(m)).sort((a, b) => monsterOverall(b) - monsterOverall(a)); while (line.length < n && rest.length) line.push(rest.shift()); }
  if (line.length < Math.min(n, elig.length)) { const rest = elig.filter((m) => !line.includes(m)); while (line.length < n && rest.length) line.push(rest.shift()); } // a club with nobody else still fields a full lineup
  return line;
};
globalThis.__m6SeasonEnd = (m) => { const r = ind[m.id]; if (!r) return; const cur = Object.values(m.dev.current); const s = yr(r); s.endSum = cur.reduce((a, b) => a + b, 0); s.endAll99 = cur.every((v) => v >= 99); s.endLevel = m.level; s.endBank = Number(m.dev.banked ?? m.points ?? 0); };
process.on('exit', () => { fs.writeFileSync(process.env.M6_APEX_OUT, JSON.stringify({ meta, individuals: Object.values(ind) })); });
