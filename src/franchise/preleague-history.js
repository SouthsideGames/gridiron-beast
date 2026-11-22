// Pre-franchise league archive. Kept separate from playable season history so
// achievements, GM wins and progression never credit the incoming manager.
import { ALL_TEAMS } from '../data/league.js';
import { hashString } from '../core/rng.js';
const roll = (seed, key, max) => hashString(String(seed) + '|' + key) % max;
function seasonLine(m, year, seed) {
  const position = m.position || 'WR';
  const games = 10 + roll(seed, m.id + ':' + year + ':gp', 5);
  const starts = Math.max(0, games - roll(seed, m.id + ':' + year + ':gs', 3));
  const age = (m.age || 25) + year - 1;
  const prime = Math.max(0.42, 1 - Math.abs(age - 26) * 0.055);
  const factor = prime * (0.75 + roll(seed, m.id + ':' + year + ':prod', 51) / 100) * games / 14;
  const n = (base) => Math.max(0, Math.round(base * factor));
  const reg = { games, starts };
  if (position === 'QB') {
    reg.att = n(290); reg.comp = Math.min(reg.att, n(187));
    reg.passYds = n(2600); reg.passTd = n(19); reg.intThrown = n(8);
    reg.rush = n(28); reg.rushYds = n(105); reg.rushTd = n(1);
  } else if (position === 'RB') {
    reg.rush = n(185); reg.rushYds = n(790); reg.rushTd = n(7);
    reg.targets = n(35); reg.rec = Math.min(reg.targets, n(26));
    reg.recYds = n(210); reg.recTd = n(1);
  } else if (position === 'WR' || position === 'TE') {
    reg.targets = n(position === 'WR' ? 92 : 65);
    reg.rec = Math.min(reg.targets, n(position === 'WR' ? 61 : 44));
    reg.recYds = n(position === 'WR' ? 810 : 510);
    reg.recTd = n(position === 'WR' ? 6 : 4);
    if (position === 'TE') { reg.pbSnaps = n(110); reg.pbWins = n(85); }
  } else if (position === 'OL') {
    reg.pbSnaps = n(370); reg.pbWins = n(330);
    reg.rbSnaps = n(250); reg.rbWins = n(213);
    reg.sacksAllowed = n(4); reg.pressuresAllowed = n(17);
    reg.pancakes = n(32);
  } else if (['DL', 'LB', 'CB', 'S'].includes(position)) {
    reg.tacklesSolo = n(position === 'LB' ? 67 : position === 'S' ? 53 : 35);
    reg.tacklesAssist = n(position === 'LB' ? 23 : 15);
    reg.tacklesTotal = reg.tacklesSolo + reg.tacklesAssist;
    reg.sacks = n(position === 'DL' ? 10 : position === 'LB' ? 3 : 0);
    reg.tfl = n(position === 'DL' ? 12 : 5);
    reg.int = n(position === 'CB' ? 4 : position === 'S' ? 3 : 1);
    reg.pd = n(position === 'CB' ? 12 : position === 'S' ? 7 : 2);
    reg.ff = n(2);
    if (position === 'DL') reg.pressures = n(30);
  } else if (position === 'K') {
    reg.fga = n(23); reg.fgm = Math.min(reg.fga, n(19));
    reg.fgLong = 35 + roll(seed, m.id + ':' + year + ':long', 24);
    reg.xpa = n(28); reg.xpm = Math.min(reg.xpa, n(27));
    reg.kickPts = reg.fgm * 3 + reg.xpm;
  }
  return { year, team: null, reg, post: {} };
}
export function generateLeagueArchive(f, seasons = 8) {
  const seed = f.seed >>> 0;
  const teams = ALL_TEAMS.slice();
  const monsters = [...new Map([...Object.values(f.league?.monsters || {}), ...(f.roster || [])].filter(m => m?.id).map(m => [String(m.id), m])).values()];
  const teamOf = new Map((f.roster || []).map(m => [m.id, f.club]));
  for (const [club, data] of Object.entries(f.league?.clubs || {}))
    for (const id of data.roster || []) if (!teamOf.has(id)) teamOf.set(id, club);
  const years = [];
  for (let year = 1 - seasons; year <= 0; year++) {
    // Play each club against 14 opponents, omitting one fixed pairing per club.
    // Scores are not reconstructed; only standings and postseason outcomes are archived.
    const records = new Map(teams.map(club => [club, { club, w: 0, l: 0 }]));
    for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) {
      if (i % 2 === 0 && j === i + 1) continue; // 8 omitted matchups: 14 games per club
      const home = teams[i], away = teams[j];
      const winner = roll(seed, year + ':fixture:' + home + ':' + away, 2) ? home : away;
      records.get(winner).w++;
      records.get(winner === home ? away : home).l++;
    }
    const standings = [...records.values()].sort((a, b) => b.w - a.w || roll(seed, year + ':tie:' + a.club, 100000) - roll(seed, year + ':tie:' + b.club, 100000));
    const qualified = standings.slice(0, 8).map(t => t.club);
    const rounds = [];
    let alive = qualified;
    while (alive.length > 1) {
      const next = [];
      const games = [];
      for (let i = 0; i < alive.length / 2; i++) {
        const a = alive[i], b = alive[alive.length - 1 - i];
        const winner = roll(seed, year + ':playoff:' + alive.length + ':' + a + ':' + b, 2) ? a : b;
        games.push({ home: a, away: b, winner });
        next.push(winner);
      }
      rounds.push({ name: alive.length === 8 ? 'Quarterfinals' : alive.length === 4 ? 'Semifinals' : 'Beast Bowl', games });
      alive = next;
    }
    const champion = alive[0];
    const final = rounds[rounds.length - 1].games[0];
    years.push({ year, champion, runnerUp: final.home === champion ? final.away : final.home, standings, playoffs: rounds, awards: { league: {} } });
  }
  const careers = {};
  for (const m of monsters) {
    const count = Math.min(seasons, Math.max(0, Math.floor(m.yearsPro || 0)));
    if (!count || !m.id) continue;
    const club = teamOf.get(m.id) || f.club;
    const books = [];
    const transfers = [];
    let previous = null;
    // Protected/signature players stay with their club. Others may have
    // transferred before the franchise opened; their current club is fixed.
    const previousClub = !m.legendary && !m.signature && count > 2 &&
      roll(seed, m.id + ':transfer-chance', 4) === 0
      ? teams.filter(t => t !== club)[roll(seed, m.id + ':former-club', teams.length - 1)] : null;
    const transferYear = previousClub ? -Math.max(1, Math.floor(count / 2)) : null;
    for (let year = 1 - count; year <= 0; year++) {
      const book = seasonLine(m, year, seed);
      book.team = previousClub && year < transferYear ? previousClub : club;
      if (previous !== book.team) transfers.push({ year, club: book.team, from: previous });
      previous = book.team;
      books.push(book);
    }
    careers[m.id] = { id: m.id, name: m.name, position: m.position, club, transfers, seasons: books,
      totals: books.reduce((sum, b) => { for (const [k,v] of Object.entries(b.reg)) sum[k] = k === 'fgLong' ? Math.max(sum[k] || 0, v) : (sum[k] || 0) + v; return sum; }, {}) };
  }
  // Award winners are selected from generated season books, with positional
  // eligibility. All awards reference the same monster IDs as the archive.
  for (const season of years) {
    const candidates = Object.values(careers).flatMap(c => c.seasons.filter(b => b.year === season.year).map(b => ({ career: c, book: b })));
    const award = (kind, selected) => {
      if (!selected) return;
      const c = selected.career;
      season.awards.league[kind] = { id: c.id, name: c.name, position: c.position, team: selected.book.team };
    };
    const offensiveScore = r => (r.passYds || 0) / 15 + (r.passTd || 0) * 6 +
      (r.rushYds || 0) / 8 + (r.rushTd || 0) * 8 + (r.recYds || 0) / 8 + (r.recTd || 0) * 8;
    const defensiveScore = r => (r.sacks || 0) * 8 + (r.int || 0) * 12 +
      (r.tacklesTotal || 0) * 0.6 + (r.pd || 0) * 2 + (r.tfl || 0) * 2;
    const offense = candidates.filter(x => ['QB','RB','WR','TE','OL'].includes(x.career.position))
      .sort((a,b) => offensiveScore(b.book.reg) - offensiveScore(a.book.reg) || String(a.career.id).localeCompare(String(b.career.id)))[0];
    const defense = candidates.filter(x => ['DL','LB','CB','S'].includes(x.career.position))
      .sort((a,b) => defensiveScore(b.book.reg) - defensiveScore(a.book.reg) || String(a.career.id).localeCompare(String(b.career.id)))[0];
    award('mvp', offense || defense || candidates[0]);
    award('opoy', offense);
    award('dpoy', defense);
    // SMOY means Signature Monster of the Year, not special teams.
    // The historical archive cannot reconstruct ability impact, so do not
    // invent a winner from kicking statistics.

  }
  // Retired legends are archival identities only. They are never inserted into
  // the live league registry, draft pools, or Hall of Fame voting machinery.
  const legends = [];
  for (let i = 0; i < 6; i++) {
    const id = 'historical_' + hashString(seed + ':legend:' + i).toString(36);
    const club = teams[roll(seed, id + ':club', teams.length)];
    const position = ['QB', 'RB', 'WR', 'DL', 'LB', 'CB'][i];
    const name = ['Aster', 'Bramble', 'Cinder', 'Dusk', 'Echo', 'Frost'][i] + ' ' +
      ['Ironclaw', 'Stormmane', 'Brightfang', 'Stonehide', 'Nightwing', 'Goldhorn'][roll(seed, id + ':surname', 6)];
    const retiredYear = -roll(seed, id + ':retired', 3);
    const books = [];
    for (let year = 1 - seasons; year <= retiredYear; year++) {
      const m = { id, age: 29, yearsPro: seasons, position };
      books.push({ ...seasonLine(m, year, seed), team: club });
    }
    const totals = books.reduce((sum, b) => { for (const [k,v] of Object.entries(b.reg)) sum[k] = (sum[k] || 0) + v; return sum; }, {});
    careers[id] = { id, name, position, club, retired: true, seasons: books, totals };
    legends.push({ id, name, position, club, retiredYear, totals });
  }
  return { version: 1, seed, seasons: years, careers, legends };
}
export function validateLeagueArchive(archive) {
  const errors = [];
  const allSeasons = archive?.seasons || [];
  const years = new Map(allSeasons.map(s => [s.year, s]));
  if (years.size !== allSeasons.length) errors.push('Duplicate historical season');
  if (allSeasons.some((s, i) => s.year !== i + 1 - allSeasons.length)) errors.push('Invalid season chronology');
  for (const c of Object.values(archive?.careers || {})) {
    const totals = {};
    if (new Set(c.seasons.map(b => b.year)).size !== c.seasons.length) errors.push('Duplicate career season: ' + c.id);
    if (c.seasons.at(-1)?.team !== c.club) errors.push('Current club mismatch: ' + c.id);
    for (const b of c.seasons) {
      if (!ALL_TEAMS.includes(b.team)) errors.push('Unknown club: ' + c.id);
      if (!years.has(b.year)) errors.push('Unknown year: ' + b.year);
      for (const [k,v] of Object.entries(b.reg)) totals[k] = k === 'fgLong' ? Math.max(totals[k] || 0, v) : (totals[k] || 0) + v;
    }
    for (const [k,v] of Object.entries(totals)) if (c.totals[k] !== v) errors.push('Career mismatch: ' + c.id + ':' + k);
  }
  for (const s of years.values()) {
    if (s.standings.length !== ALL_TEAMS.length || new Set(s.standings.map(t => t.club)).size !== ALL_TEAMS.length) errors.push('Invalid standings clubs: ' + s.year);
    if (!s.standings.some(t => t.club === s.champion)) errors.push('Champion absent: ' + s.year);
    if (s.standings.reduce((n,t)=>n+t.w,0) !== s.standings.reduce((n,t)=>n+t.l,0)) errors.push('Unbalanced standings: ' + s.year);
    if (s.standings.some(t => t.w + t.l !== 14)) errors.push('Invalid season length: ' + s.year);
    if (s.playoffs?.at(-1)?.games?.[0]?.winner !== s.champion) errors.push('Playoff winner mismatch: ' + s.year);
    const final = s.playoffs?.at(-1)?.games?.[0];
    if (final && (final.winner === s.runnerUp || ![final.home, final.away].includes(s.runnerUp))) errors.push('Runner-up mismatch: ' + s.year);
    if ((s.playoffs || []).length !== 3 || s.playoffs.some((r,i) => r.games.length !== 4 / (2 ** i))) errors.push('Invalid playoff rounds: ' + s.year);
    for (const winner of Object.values(s.awards?.league || {})) {
      const book = archive.careers[winner.id]?.seasons.find(b => b.year === s.year);
      if (!book || book.team !== winner.team) errors.push('Award mismatch: ' + s.year);
    }
  }
  return errors;
}
