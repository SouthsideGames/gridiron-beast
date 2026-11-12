// AI strategy modes (Task 6 Phase D; R2 of the approved specification §1.8, owner 2026-10-30, Phase D authorised 2026-11-02).
//
// Each AI club holds one of four modes, from strongest to weakest ambition: Contend, Compete, Retool, Rebuild. The mode is set once
// a season, as the offseason opens (after retirements, before contracts and the draft), from facts the club can see:
//   recent results      this season's win share, blended with last season's (0.6 / 0.4) once a club has one
//   roster quality      the club's team overall against the mean of the 15 AI clubs
//   age distribution    the share of its starters within PLAN.ageingHorizon (2) seasons of their public decline onset, or past it
//   salary commitments  next season's payroll already under contract, against the cap
//   draft capital       picks it holds in the next two classes against the normal 2 × DRAFT_ROUNDS
// Raw mode:
//   Contend   winning (recent ≥ 0.60) with at least a league-average roster, or a roster STRATEGY.contendQuality above it while not losing
//   Rebuild   losing (recent ≤ 0.40) with an ageing roster (share ≥ 0.35), a capped-out payroll, or a stock of extra picks
//   Retool    losing with a roster that is not ageing (young enough to improve as it is)
//   Compete   everything else
// Stability (R2): a change normally needs the same new raw mode at two consecutive evaluations; a major shift (two or more steps on
// the scale) changes at once; a rebuild lasts at least two seasons. Gyms never fall below Compete. Nothing here draws a random
// number, and nothing reads a hidden value (longevity) or a result the club could not see.
// Stored additively in the existing `clubRecord.strategy`: mode, modeSince, modePending, modeLastWin, modeWhy. Absent: Compete.
import { buildDepthChart, teamOverall } from './roster.js';
import { hasLeague, leagueClubs, clubRoster, clubRecord, isProtected } from './league-registry.js';
import { horizonOf, PLAN } from './roster-plan.js';
import { contractEnds } from './contracts.js';
import { picksOwnedBy, pickUsed } from './trades.js';
import { DRAFT_ROUNDS } from './draft.js';
import { ALL_TEAMS } from '../data/league.js';
import { isGymClub } from '../data/gyms.js';
import { salaryFor } from '../data/monsters.js';

export const MODES = Object.freeze(['rebuild', 'retool', 'compete', 'contend']); // weakest ambition first: the index is the scale
export const MODE_LABEL = Object.freeze({ contend: 'Contend', compete: 'Compete', retool: 'Retool', rebuild: 'Rebuild' });
export const STRATEGY = Object.freeze({
  winning: 0.6, losing: 0.4,     // recent win share
  recentWeight: 0.6,             // this season against last season
  contendQuality: 4,             // team overall above the AI mean that contends without a winning record (while not losing)
  ageingShare: 0.35,             // Phase D (validated build): share of starters within 2 seasons of onset (or past it) that makes a losing roster "old"
  cappedShare: 0.97,             // next season's committed payroll at or above this share of the cap: capped out
  extraPicks: 2,                 // picks held above the normal 2 × DRAFT_ROUNDS that count as a stock of draft capital
  confirm: 2,                    // consecutive evaluations needed for an ordinary change
  majorSteps: 2,                 // a raw mode this many steps away changes at once
  rebuildSeasons: 2,             // a rebuild lasts at least this many seasons
  gymFloor: 'compete',
});
const rank = (m) => MODES.indexOf(m);
export const modeOf = (f, club) => (hasLeague(f) && clubRecord(f, club)?.strategy?.mode) || 'compete';

/** The facts a club decides from. `teamOf(club)`: its team for the season just played; `aiMean`: the mean AI team overall. */
export function strategyInputs(f, club, { year, cap, teamOf, aiMean }) {
  const rec = f.season?.records?.[club] || { w: 0, l: 0 }; const games = (rec.w || 0) + (rec.l || 0);
  const win = games ? rec.w / games : 0.5; const last = clubRecord(f, club)?.strategy?.modeLastWin;
  const recent = last == null ? win : STRATEGY.recentWeight * win + (1 - STRATEGY.recentWeight) * last;
  const roster = clubRoster(f, club); const team = teamOf(club); const quality = teamOverall(team) - aiMean;
  const st = new Set(Object.values(buildDepthChart(roster)).filter(Boolean)); const starters = roster.filter((m) => st.has(m.id) && !isProtected(m));
  const ageingShare = starters.length ? starters.filter((m) => horizonOf(m) <= PLAN.ageingHorizon).length / starters.length : 0;
  const committed = roster.filter((m) => !isProtected(m) && !contractEnds(m, year)).reduce((s, m) => s + (m.salary || salaryFor(m)), 0);
  const committedShare = cap ? (committed + (f.league?.staffAllowance || 0)) / cap : 0;
  let picks = 0; for (let y = year + 1; y <= year + 2; y++) for (const p of picksOwnedBy(f, club, y, ALL_TEAMS)) if (!pickUsed(f, p)) picks++;
  return { win, recent, quality, ageingShare, committedShare, picks, extraPicks: picks - 2 * DRAFT_ROUNDS };
}
/** The mode the facts point to, before the stability rules. Returns { mode, why }. */
export function rawMode(x, { ageingBar = STRATEGY.ageingShare } = {}) {
  const losing = x.recent <= STRATEGY.losing, winning = x.recent >= STRATEGY.winning;
  if ((winning && x.quality >= 0) || (!losing && x.quality >= STRATEGY.contendQuality)) return { mode: 'contend', why: winning ? 'winning with a strong roster' : 'a roster well above the league' };
  if (losing) {
    if (x.ageingShare >= ageingBar) return { mode: 'rebuild', why: 'losing with an aging roster' };
    if (x.committedShare >= STRATEGY.cappedShare) return { mode: 'rebuild', why: 'losing and capped out' };
    if (x.extraPicks >= STRATEGY.extraPicks) return { mode: 'rebuild', why: 'losing with extra draft picks' };
    return { mode: 'retool', why: 'losing with a young roster' };
  }
  return { mode: 'compete', why: 'between the two' };
}
/**
 * The stability rules. `cur` the stored state ({ mode, modeSince, modePending }), `raw` the raw mode, `year` the season just played.
 * Returns the new { mode, modeSince, modePending, changed }.
 */
export function nextMode(cur, raw, year, { gym = false } = {}) {
  const floor = (m) => (gym && rank(m) < rank(STRATEGY.gymFloor) ? STRATEGY.gymFloor : m);
  const target = floor(raw);
  if (!cur?.mode) return { mode: target, modeSince: year, modePending: null, changed: true }; // the first evaluation sets the mode
  const mode = floor(cur.mode);
  if (target === mode) return { mode, modeSince: cur.modeSince ?? year, modePending: null, changed: mode !== cur.mode };
  if (mode === 'rebuild' && year - (cur.modeSince ?? year) < STRATEGY.rebuildSeasons) return { mode, modeSince: cur.modeSince, modePending: { mode: target, n: 0 }, changed: false }; // a rebuild runs its two seasons
  if (Math.abs(rank(target) - rank(mode)) >= STRATEGY.majorSteps) return { mode: target, modeSince: year, modePending: null, changed: true };
  const n = cur.modePending?.mode === target ? (cur.modePending.n || 0) + 1 : 1;
  if (n >= STRATEGY.confirm) return { mode: target, modeSince: year, modePending: null, changed: true };
  return { mode, modeSince: cur.modeSince ?? year, modePending: { mode: target, n }, changed: false };
}
/** Every AI club's evaluation as the offseason opens. Returns [{ club, mode, from, why }] for the clubs whose mode changed. */
export function evaluateStrategies(f, { year, cap, teamOf }) {
  if (!hasLeague(f)) return []; const clubs = leagueClubs(f).slice().sort();
  const ovr = Object.fromEntries(clubs.map((c) => [c, teamOverall(teamOf(c))])); const aiMean = clubs.reduce((s, c) => s + ovr[c], 0) / (clubs.length || 1);
  const changes = []; const inputs = Object.fromEntries(clubs.map((c) => [c, strategyInputs(f, c, { year, cap, teamOf, aiMean })]));
  const ageingBar = STRATEGY.ageingShare;
  const median = (() => { const sh = clubs.map((c) => inputs[c].ageingShare).sort((a, b) => a - b); return sh[Math.floor(sh.length / 2)] ?? 0; })();
  for (const club of clubs) {
    const st = clubRecord(f, club).strategy; const x = inputs[club]; const raw = rawMode(x, { ageingBar: st.mode === 'rebuild' ? Math.max(ageingBar, median) : ageingBar }); // F1 (owner-approved 2026-11-03): a club already rebuilding stays "old" only while its ageing share is at or above the league median
    const before = st.mode || null; const n = nextMode(st, raw.mode, year, { gym: isGymClub(club) });
    st.mode = n.mode; st.modeSince = n.modeSince; st.modePending = n.modePending; st.modeLastWin = Math.round(x.win * 1000) / 1000; st.modeWhy = raw.why;
    if (n.mode !== before) changes.push({ club, mode: n.mode, from: before, why: raw.why });
  }
  return changes;
}
