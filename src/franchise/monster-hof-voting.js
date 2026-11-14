// Task 9: deterministic, presentation-only annual Monster Hall of Fame ballot, decided by an anonymous Hall Board.
// The existing GM Hall of Fame is separate. No gameplay RNG or attributes are modified.
// Candidates must be supplied from preserved retired monster records, never invented.
export const MONSTER_HOF_VERSION = 1;
export const WAIT_SEASONS = 3;
export const MAX_INDUCTEES = 3;
export const VOTER_COUNT = 15;
export const MAX_NOMINEES = 15;
export const VOTE_THRESHOLD = 0.7;

const integer = (n, fallback = 0) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }; // mixed at the end: seats that differ by one character must not hold near-identical standards
const stableId = (c) => String(c?.id ?? '');
const count = (c, key) => {
  const explicit = c?.honours?.[key] ?? c?.[key];
  if (Number.isFinite(explicit)) return integer(explicit);
  const kinds = { titles: 'champion', awards: 'award', records: 'record' };
  return (c?.ev || []).filter((e) => e?.t === kinds[key]).length;
};
const seasons = (c) => Array.isArray(c?.seasons) ? c.seasons.length : integer(c?.seasons ?? c?.yearsPro);
const games = (c) => integer(c?.games ?? c?.career?.games ?? c?.stats?.games);
const eligible = (c, year, inducted) =>
  c && stableId(c) && Number.isInteger(c.retiredYear) &&
  year - c.retiredYear >= WAIT_SEASONS && c.retiredYear < year &&
  !inducted.has(stableId(c));

// ---- The Hall case (owner 2026-11-12): what a career is judged on. Individual play, awards, records and longevity carry the case;
// a team's titles add a little. Every part reads facts the league preserved when the monster retired.
//   awards      each league award by its weight (an MVP counts most, a rookie award least)
//   records     a season record more than a single-game record, with a ceiling: records fall easily in a league's first seasons
//   production  where the career's output stands among retired monsters at the SAME position, so a kicker or a lineman is judged
//               against kickers and linemen, never against a quarterback's yardage
//   longevity   seasons on record and games played, each with a ceiling
//   titles      a small bonus with a ceiling
export const HALL_CASE = Object.freeze({
  award: Object.freeze({ mvp: 30, opoy: 22, dpoy: 22, smoy: 12, oroy: 8, droy: 8 }), awardOther: 14,
  record: Object.freeze({ season: 10, game: 5 }), recordOther: 7, recordCap: 30,
  production: 40, productionPeers: 8, best: Object.freeze([16, 8]), bestPeers: 10,
  season: 2, seasonCap: 12, gamesPer: 16, gamesCap: 160,
  title: 2, titleCap: 3,
  standardFrom: 57, standardSpan: 31,
});
const num = (v) => (Number.isFinite(v) ? v : 0);
/** A career's output in one number, by position, from the preserved career totals. Only ever compared within a position. */
export function careerProduction(position, c = {}) {
  const v = (k) => num(c[k]);
  switch (position) {
    case 'QB': return v('passYds') + 20 * v('passTd') - 45 * v('intThrown') + 0.5 * v('rushYds');
    case 'RB': return v('rushYds') + v('recYds') + 20 * (v('rushTd') + v('recTd'));
    case 'WR': case 'TE': return v('recYds') + 20 * v('recTd');
    case 'DL': return v('tackles') + 4 * v('sacks') + 2 * v('tfl') + 0.5 * v('pressures') + 3 * v('ff');
    case 'LB': return v('tackles') + 4 * v('sacks') + 2 * v('tfl') + 3 * v('pd') + 6 * v('int') + 3 * v('ff');
    case 'CB': case 'S': return 0.5 * v('tackles') + 3 * v('pd') + 8 * v('int') + 3 * v('ff');
    case 'K': return 3 * v('fgm') + v('xpm');
    case 'P': return v('puntYds') || v('punts') * 40 || v('games');
    case 'OL': return Math.max(0, v('pbSnaps') + v('rbSnaps') - v('blocksLost') - 10 * v('sacksAllowed'));
    default: return v('games');
  }
}
const titlesOf = (c) => count(c, 'titles');
const awardPoints = (c) => (c?.awardsBy ? Object.entries(c.awardsBy).reduce((n, [k, x]) => n + integer(x) * (HALL_CASE.award[k] ?? HALL_CASE.awardOther), 0) : count(c, 'awards') * HALL_CASE.awardOther);
const recordPoints = (c) => Math.min(HALL_CASE.recordCap, c?.recordsBy ? Object.entries(c.recordsBy).reduce((n, [k, x]) => n + integer(x) * (HALL_CASE.record[k] ?? HALL_CASE.recordOther), 0) : count(c, 'records') * HALL_CASE.recordOther);
/**
 * Where each candidate's production stands among retired monsters at his position: Map(id -> 0..1). A candidate with no preserved
 * production figure (recorded before it was kept) stands in the middle. Small groups are pulled toward the middle, so the best of
 * three kickers is not automatically the best there has ever been.
 */
export function productionStanding(candidates) {
  const by = new Map(); for (const c of candidates || []) { if (!c || !Number.isFinite(c.prod)) continue; const k = c.position || '?'; if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
  const out = new Map(); const k = HALL_CASE.productionPeers;
  for (const group of by.values()) for (const c of group) { let lower = 0, same = 0; for (const o of group) { if (o === c) continue; if (o.prod < c.prod) lower++; else if (o.prod === c.prod) same++; } out.set(stableId(c), (lower + same / 2 + 0.5 * k) / (group.length - 1 + k)); }
  return out;
}
/**
 * The most productive careers at each position: Map(id -> 1 | 2). Being the best (or second best) a position has seen is the one
 * honour open to every position alike, a lineman or a kicker as much as a quarterback. Counted only once a position has enough
 * retired monsters on record (HALL_CASE.bestPeers), so the first few retirees of a young league are not crowned by default.
 */
export function productionRank(candidates) {
  const by = new Map(); for (const c of candidates || []) { if (!c || !Number.isFinite(c.prod) || !(c.prod > 0)) continue; const k = c.position || '?'; if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
  const out = new Map();
  for (const group of by.values()) { if (group.length < HALL_CASE.bestPeers) continue; const sorted = group.slice().sort((a, b) => b.prod - a.prod || stableId(a).localeCompare(stableId(b))); for (let i = 0; i < HALL_CASE.best.length && i < sorted.length; i++) out.set(stableId(sorted[i]), i + 1); }
  return out;
}
/** The parts of a Hall case, in points: { awards, records, production, longevity, titles, total }. `standing` is 0..1 (see productionStanding); `rank` is 1 or 2 for the best at a position (see productionRank). */
export function candidateCase(c, standing = 0.5, rank = 0) {
  const H = HALL_CASE;
  const awards = awardPoints(c); const records = recordPoints(c);
  const production = Math.round((H.production * standing * standing + (H.best[rank - 1] || 0)) * 10) / 10;   // only the top of a position earns much
  const longevity = Math.min(seasons(c), H.seasonCap) * H.season + Math.min(games(c), H.gamesCap) / H.gamesPer;
  const titles = Math.min(titlesOf(c), H.titleCap) * H.title;
  return { awards, records, production, longevity, titles, total: Math.round((awards + records + production + longevity + titles) * 10) / 10 };
}
/** A candidate's Hall points. Without a standing among his peers the production part is taken at the middle. */
export function candidateScore(c, standing = 0.5, rank = 0) { return candidateCase(c, standing, rank).total; }

export function monsterHofBallot(candidates, year, past = []) {
  if (!Number.isInteger(year)) throw new TypeError('year must be an integer');
  const inducted = new Set((past || []).flatMap((e) => (e?.inductees || []).map((x) => String(x.id))));
  const unique = new Map();
  // peers: every retired monster on record by this election, inducted or not, eligible or not
  const known = new Map(); for (const c of candidates || []) { if (c && stableId(c) && Number.isInteger(c.retiredYear) && c.retiredYear <= year && !known.has(stableId(c))) known.set(stableId(c), c); }
  const standing = productionStanding([...known.values()]); const rank = productionRank([...known.values()]);
  const scoreOf = (c) => candidateScore(c, standing.get(stableId(c)) ?? 0.5, rank.get(stableId(c)) || 0);
  for (const c of candidates || []) {
    if (!eligible(c, year, inducted)) continue;
    const id = stableId(c);
    const old = unique.get(id);
    if (!old || scoreOf(c) > scoreOf(old)) unique.set(id, c);
  }
  // The independent, anonymous Hall Board reviews only the fifteen strongest eligible careers; the rest wait for another year.
  const pool = [...unique.values()].sort((a, b) => scoreOf(b) - scoreOf(a) || stableId(a).localeCompare(stableId(b))).slice(0, MAX_NOMINEES);
  const ballot = pool.map((c) => {
    const score = scoreOf(c);
    let votes = 0;
    // Each Board member holds the same facts to a slightly different standard, fixed by the year, the seat and the candidate:
    // no call to the game's RNG, and the same result however often the election is computed.
    for (let voter = 0; voter < VOTER_COUNT; voter++) {
      const standard = HALL_CASE.standardFrom + (hash(`hof:${year}:${voter}:${stableId(c)}`) % HALL_CASE.standardSpan);
      if (score >= standard) votes++;
    }
    return {
      id: stableId(c), name: String(c.name || 'Unknown'), position: c.position || null,
      retiredYear: c.retiredYear ?? c.retired ?? c.left, score, votes, voters: VOTER_COUNT,
      share: votes / VOTER_COUNT, qualified: votes / VOTER_COUNT >= VOTE_THRESHOLD,
    };
  }).sort((a, b) => b.votes - a.votes || b.score - a.score || a.id.localeCompare(b.id));
  return ballot;
}

/** Idempotent annual election. Call only after a completed season is archived. */
export function electMonsterHallOfFame(candidates, year, history = []) {
  const existing = (history || []).find((e) => e?.year === year);
  if (existing) return { election: existing, history, created: false };
  const ballot = monsterHofBallot(candidates, year, history);
  const inductees = ballot.filter((c) => c.qualified).slice(0, MAX_INDUCTEES)
    .map(({ id, name, position, retiredYear, votes, voters, score }) =>
      ({ id, name, position, retiredYear, inductedYear: year, votes, voters, score }));
  const election = { v: MONSTER_HOF_VERSION, year, ballot, inductees, authority: 'anonymous-hall-board', sealed: true };
  return { election, history: [...(history || []), election], created: true };
}

export function monsterHofInductees(history = []) {
  const seen = new Set();
  const out = [];
  for (const election of [...history].sort((a, b) => (a.year || 0) - (b.year || 0))) {
    for (const c of election.inductees || []) {
      if (!c?.id || seen.has(String(c.id))) continue;
      seen.add(String(c.id)); out.push({ ...c, inductedYear: c.inductedYear ?? election.year });
    }
  }
  return out;
}

/** The detail of a Hall case, read from a preserved career record: which awards, which kind of records, and the career's output. */
export function caseFacts(stub) {
  const awardsBy = {}; const recordsBy = {};
  for (const e of stub?.careerHonours || stub?.ev || []) {
    if (e?.t === 'award') { const k = String(e.k || '').split(':')[1] || e.x?.award || 'other'; awardsBy[k] = (awardsBy[k] || 0) + 1; }
    else if (e?.t === 'record') { const k = e.x?.scope || String(e.k || '').split(':')[1] || 'other'; recordsBy[k] = (recordsBy[k] || 0) + 1; }
  }
  return { awardsBy, recordsBy, prod: Math.round(careerProduction(stub?.position, stub?.career || {})) };
}

/**
 * Preserve only actual retired monster identities and their already recorded
 * career evidence. A legend stub's 'left' date is NOT itself proof of retirement:
 * monsters may also leave the league for other reasons.
 */
export function recordRetiredMonsterCandidates(f, retired, year) {
  const hof = (f.monsterHallOfFame ||= { v: MONSTER_HOF_VERSION, candidates: [], elections: [] });
  if (!Array.isArray(hof.candidates)) hof.candidates = [];
  if (!Array.isArray(hof.elections)) hof.elections = [];
  const known = new Set(hof.candidates.map((c) => String(c.id)));
  // A candidate recorded before the detailed case was kept gains it from the same preserved record (nothing is estimated).
  for (const c of hof.candidates) { if (c && !Number.isFinite(c.prod)) { const stub = f.league?.legends?.[c.id]; if (stub) Object.assign(c, caseFacts(stub)); } }
  const retiredIds = [...(retired?.owner || []), ...(retired?.league || []), ...(retired?.unsignedIds || [])];
  for (const item of retiredIds) {
    const id = String(item?.id ?? '');
    if (!id || known.has(id)) continue;
    const stub = f.league?.legends?.[id];
    if (!stub) continue; // no preserved career evidence: do not manufacture it
    // A current-season retirement can only be recorded from the retirement
    // pass itself; a legend stub alone also represents non-retirement exits.
    if (item?.id == null || !Number.isInteger(year)) continue;
    hof.candidates.push({
      id, name: stub.name, position: stub.position,
      retiredYear: year, seasons: Array.isArray(stub.seasons) ? stub.seasons.length : 0,
      games: (stub.seasons || []).reduce((n, b) => n + (b?.reg?.games || 0) + (b?.post?.games || 0), 0),
      honours: {
        titles: (stub.ev || []).filter((e) => e.t === 'champion').length,
        awards: (stub.ev || []).filter((e) => e.t === 'award').length,
        records: (stub.ev || []).filter((e) => e.t === 'record').length,
      },
      ...caseFacts(stub),
    });
    known.add(id);
  }
  return hof.candidates.length;
}
