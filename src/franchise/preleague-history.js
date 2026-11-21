// Pre-franchise league archive. Kept separate from playable season history so
// achievements, GM wins and progression never credit the incoming manager.
import { ALL_TEAMS } from '../data/league.js';
import { hashString } from '../core/rng.js';
const roll = (seed, key, max) => hashString(String(seed) + '|' + key) % max;
const fields = { QB: 'passYds', RB: 'rushYds', WR: 'recYds', TE: 'recYds', OL: 'pancakes', DL: 'sacks', LB: 'tackles', CB: 'int', S: 'tackles', K: 'fgm' };
function seasonLine(m, year, seed) {
  const position = m.position || 'WR';
  const key = fields[position] || 'games';
  const games = 8 + roll(seed, m.id + ':' + year + ':gp', 5);
  const starts = Math.max(0, games - roll(seed, m.id + ':' + year + ':gs', 4));
  const prime = Math.max(0.42, 1 - Math.abs((m.age || 25) - ((m.yearsPro || 0) - year) - 26) * 0.055);
  const scale = { passYds: 1900, rushYds: 720, recYds: 650, pancakes: 42, sacks: 12, tackles: 75, int: 5, fgm: 19 };
  const value = Math.round((scale[key] || 20) * prime * (0.65 + roll(seed, m.id + ':' + year + ':prod', 71) / 100));
  return { year, team: null, reg: { games, starts, [key]: value }, post: {} };
}
export function generateLeagueArchive(f, seasons = 8) {
  const seed = f.seed >>> 0;
  const teams = ALL_TEAMS.slice();
  const monsters = [...(f.roster || []), ...Object.values(f.league?.monsters || {})];
  const teamOf = new Map((f.roster || []).map(m => [m.id, f.club]));
  for (const [club, data] of Object.entries(f.league?.clubs || {}))
    for (const id of data.roster || []) teamOf.set(id, club);
  const years = [];
  for (let year = 1 - seasons; year <= 0; year++) {
    const ranked = teams.slice().sort((a, b) => roll(seed, year + ':' + a, 100000) - roll(seed, year + ':' + b, 100000));
    const standings = ranked.map((club, i) => ({ club, w: Math.max(0, 11 - Math.floor(i * 11 / Math.max(1, ranked.length - 1))), l: 11 - Math.max(0, 11 - Math.floor(i * 11 / Math.max(1, ranked.length - 1))) }));
    const champion = ranked[0];
    years.push({ year, champion, runnerUp: ranked[1], standings, awards: { league: {} } });
  }
  const careers = {};
  for (const m of monsters) {
    const count = Math.min(seasons, Math.max(0, Math.floor(m.yearsPro || 0)));
    if (!count || !m.id) continue;
    const club = teamOf.get(m.id) || f.club;
    const books = [];
    for (let year = 1 - count; year <= 0; year++) {
      const book = seasonLine(m, year, seed);
      book.team = club;
      books.push(book);
    }
    careers[m.id] = { id: m.id, name: m.name, position: m.position, club, seasons: books,
      totals: books.reduce((sum, b) => { for (const [k,v] of Object.entries(b.reg)) sum[k] = (sum[k] || 0) + v; return sum; }, {}) };
  }
  // Award selections are drawn from actual generated career entries, not invented stat lines.
  for (const season of years) {
    const candidates = Object.values(careers).flatMap(c => c.seasons.filter(b => b.year === season.year).map(b => ({ ...c, book: b })));
    candidates.sort((a,b) => Object.entries(b.book.reg).filter(([k]) => k !== 'games' && k !== 'starts').reduce((n,[,v])=>n+v,0) -
      Object.entries(a.book.reg).filter(([k]) => k !== 'games' && k !== 'starts').reduce((n,[,v])=>n+v,0));
    if (candidates[0]) {
      const m = candidates[0];
      season.awards.league.mvp = { id: m.id, name: m.name, team: m.book.team, ...m.book.reg };
    }
  }
  return { version: 1, seed, seasons: years, careers };
}
export function validateLeagueArchive(archive) {
  const errors = [];
  const years = new Map((archive?.seasons || []).map(s => [s.year, s]));
  for (const c of Object.values(archive?.careers || {})) {
    const totals = {};
    for (const b of c.seasons) {
      if (!years.has(b.year)) errors.push('Unknown year: ' + b.year);
      for (const [k,v] of Object.entries(b.reg)) totals[k] = (totals[k] || 0) + v;
    }
    for (const [k,v] of Object.entries(totals)) if (c.totals[k] !== v) errors.push('Career mismatch: ' + c.id + ':' + k);
  }
  for (const s of years.values()) {
    if (!s.standings.some(t => t.club === s.champion)) errors.push('Champion absent: ' + s.year);
    for (const winner of Object.values(s.awards?.league || {})) {
      const book = archive.careers[winner.id]?.seasons.find(b => b.year === s.year);
      if (!book || book.team !== winner.team) errors.push('Award mismatch: ' + s.year);
    }
  }
  return errors;
}
