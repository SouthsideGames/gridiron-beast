// Task 9: deterministic, presentation-only annual Monster Hall of Fame ballot.
// The existing GM Hall of Fame is separate. No gameplay RNG or attributes are modified.
// Candidates must be supplied from preserved retired monster records, never invented.
export const MONSTER_HOF_VERSION = 1;
export const WAIT_SEASONS = 3;
export const MAX_INDUCTEES = 3;
export const VOTER_COUNT = 15;
export const VOTE_THRESHOLD = 0.7;

const integer = (n, fallback = 0) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
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

/** Read-only candidate assessment from actual preserved career achievements. */
export function candidateScore(c) {
  const titles = count(c, 'titles');
  const awards = count(c, 'awards');
  const records = count(c, 'records');
  const years = seasons(c);
  const played = games(c);
  // These are Hall voting criteria only, not gameplay attributes or awards.
  return titles * 18 + awards * 22 + records * 12 +
    Math.min(years, 20) * 2 + Math.min(played, 200) / 10;
}

export function monsterHofBallot(candidates, year, past = []) {
  if (!Number.isInteger(year)) throw new TypeError('year must be an integer');
  const inducted = new Set((past || []).flatMap((e) => (e?.inductees || []).map((x) => String(x.id))));
  const unique = new Map();
  for (const c of candidates || []) {
    if (!eligible(c, year, inducted)) continue;
    const id = stableId(c);
    const old = unique.get(id);
    if (!old || candidateScore(c) > candidateScore(old)) unique.set(id, c);
  }
  const pool = [...unique.values()].sort((a, b) => stableId(a).localeCompare(stableId(b)));
  const ballot = pool.map((c) => {
    const score = candidateScore(c);
    let votes = 0;
    // Simulated annual voters evaluate the same historical facts with small
    // stable differences in standards. No call to the game's RNG is made.
    for (let voter = 0; voter < VOTER_COUNT; voter++) {
      const standard = 42 + (hash(`hof:${year}:${voter}:${stableId(c)}`) % 31);
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
  const election = { v: MONSTER_HOF_VERSION, year, ballot, inductees };
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

/**
 * Preserve only actual retired monster identities and their already recorded
 * career evidence. A legend stub's 'left' date is NOT itself proof of retirement:
 * monsters may also leave the league for other reasons.
 */
export function recordRetiredMonsterCandidates(f, retired, year) {
  const hof = (f.monsterHallOfFame ||= { v: MONSTER_HOF_VERSION, candidates: [], elections: [] });
  const known = new Set(hof.candidates.map((c) => String(c.id)));
  const retiredIds = [...(retired?.owner || []), ...(retired?.league || [])];
  for (const item of retiredIds) {
    const id = String(item?.id ?? '');
    if (!id || known.has(id)) continue;
    const stub = f.league?.legends?.[id];
    if (!stub) continue; // no preserved career evidence: do not manufacture it
    hof.candidates.push({
      id, name: stub.name, position: stub.position,
      retiredYear: year, seasons: Array.isArray(stub.seasons) ? stub.seasons.length : 0,
      games: (stub.seasons || []).reduce((n, b) => n + (b?.reg?.games || 0) + (b?.post?.games || 0), 0),
      honours: {
        titles: (stub.ev || []).filter((e) => e.t === 'champion').length,
        awards: (stub.ev || []).filter((e) => e.t === 'award').length,
        records: (stub.ev || []).filter((e) => e.t === 'record').length,
      },
    });
    known.add(id);
  }
  return hof.candidates.length;
}
