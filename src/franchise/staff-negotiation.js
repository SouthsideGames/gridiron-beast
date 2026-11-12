// Task 7 — performance-based staff renewals (owner approval 2026-11-05 §8; design docs/TASK7_STAFF_NEGOTIATION_PROPOSAL.md with the
// owner's refinements). Replaces the automatic +10% renewal raise in a Task 7 offseason. The owner's staff only: AI clubs keep their
// fixed staff allowance (no carousel, no poaching, no promotions); the candidate pool is unchanged.
//
// 1. Evaluation (each season, each role, a score P from −1 to +1), from statistics the game tracks, against what the roster's talent
//    made reasonable to expect; the clubs are ranked among the league's clubs (any number of clubs):
//      head coach              win-share rank against the team's starter-strength rank at the season's start; playoffs +0.15, title +0.3
//      offensive coordinator   points-for-per-game rank against the offence's starter-strength rank
//      defensive coordinator   points-against-per-game rank (fewest = 1) against the defence's starter-strength rank
//      head scout              the value of the club's draft picks (overall + 0.3 × (potential − 70)) against the picks made within
//                              three slots of each, ÷ 4 points; what the scout influences (prospect reveals), not who later starts
//      monster trainer         the training-week bonus delivered (successful sessions × their bonus) against what a league-average
//                              trainer would have delivered in the same sessions, ÷ 25%; what the trainer influences in the game
//    The scout's and the trainer's scores are shrunk by 0.6: the owner's own choices (who to draft, what to train) share the result.
// 2. The contract period: the seasons of the expiring contract in which this member held the role, weighted 1.0 / 0.6+0.4 / 0.5+0.3+0.2
//    (latest first). No recorded season: Average.
// 3. The demand: current salary × (1 + change), the change inside the band's approved range, placed by the score and moved a quarter
//    of the range by the member's quality (overall 83 is neutral).
// 4. Negotiation (accept the demand, a smaller raise, the same salary, a reduction, or decline and hire another): the member accepts,
//    counters or rejects. His reservation is the demand less his band's flexibility (less for overall 85+, more when a comparable
//    candidate would do the job for the offer, a seeded ±2% for his pride). Between reservation and demand he accepts with a chance
//    that rises with the offer, else counters halfway; just below it he may counter or refuse; a Very poor member who is refused his
//    floor leaves. Two rounds at most, one seeded draw per member, season and round: a repeated offer never draws a new answer.
import { hashString } from '../core/rng.js';
import { staffById, STAFF } from '../data/staff.js';

export const STAFF_BANDS = Object.freeze([
  { id: 'excellent', label: 'Excellent', min: 0.45, max: 1, lo: 0.06, hi: 0.08, flex: 0 },
  { id: 'good', label: 'Good', min: 0.15, max: 0.45, lo: 0.03, hi: 0.05, flex: 0.02 },
  { id: 'average', label: 'Average', min: -0.15, max: 0.15, lo: 0, hi: 0.02, flex: 0.04 },
  { id: 'poor', label: 'Poor', min: -0.45, max: -0.15, lo: -0.04, hi: 0, flex: 0.08 },
  { id: 'very_poor', label: 'Very poor', min: -1, max: -0.45, lo: -0.08, hi: -0.04, flex: 0.12 },
]);
export const STAFF_NEG = Object.freeze({
  playoffs: 0.15, title: 0.3, shrink: Object.freeze({ head_scout: 0.6, monster_trainer: 0.6 }),
  scoutScale: 4, scoutWindow: 3, trainerScale: 0.25, refTrainerOvr: 75,
  recency: Object.freeze({ 1: [1], 2: [0.6, 0.4], 3: [0.5, 0.3, 0.2] }),
  neutralOvr: 83, qualityShift: 0.25, leverageOvr: 85, leverageFlex: 0.02, replaceableFlex: 0.02, pride: 0.02,
  acceptFloor: 0.35, nearFloor: 0.96, nearCounter: 0.5, rounds: 2, keepYears: 8,
});
const clamp = (x, a = -1, b = 1) => Math.max(a, Math.min(b, x));
const r100 = (x) => Math.round(x / 100) * 100;
const draw = (k) => hashString(k) / 4294967296;
export const bandOf = (P) => STAFF_BANDS.find((b) => P >= b.min) || STAFF_BANDS[STAFF_BANDS.length - 1];

// ------------------------------------------------------------ recording (additive: `f.staffEval[year]`)
const rec = (f, year) => { const E = (f.staffEval ||= {}); const r = (E[year] ||= { year }); for (const y of Object.keys(E)) if (+y < year - STAFF_NEG.keepYears) delete E[y]; return r; };
/** Season start: the owner's starter-strength ranks among the league's clubs. `table`: fa-engine strengthTable. */
export function noteStaffPreseason(f, year, table) { if (!table?.rank) return; const r = rec(f, year); r.pre = { team: table.rank.team[f.club], off: table.rank.off[f.club], def: table.rank.def[f.club], n: table.n }; r.staff = { ...(f.staff || {}) }; }
/** Season close: the results ranks (per game, among every club in the records), playoffs and title; the staff who held each role. */
export function noteStaffSeason(f, year, { playoffs = false, champion = false, table = null } = {}) {
  const R = f.season?.records || {}; const clubs = Object.keys(R); if (!clubs.includes(f.club)) return;
  const g = (x) => Math.max(1, (x.w || 0) + (x.l || 0) + (x.t || 0)); const val = (c, k) => (k === 'win' ? ((R[c].w || 0) + 0.5 * (R[c].t || 0)) / g(R[c]) : (R[c][k] || 0) / g(R[c]));
  const rankOf = (k, low = false) => 1 + clubs.filter((c) => (low ? val(c, k) < val(f.club, k) : val(c, k) > val(f.club, k))).length;
  const r = rec(f, year); if (!r.pre && table?.rank) r.pre = { team: table.rank.team[f.club], off: table.rank.off[f.club], def: table.rank.def[f.club], n: table.n, late: true }; // a season with no start record (the first, or an old save): the season-end strength stands in
  r.res = { win: rankOf('win'), pf: rankOf('pf'), pa: rankOf('pa', true), n: clubs.length, playoffs: !!playoffs, champion: !!champion }; r.staff ||= { ...(f.staff || {}) };
}
/** A Wednesday session: what this trainer delivered, and what a league-average trainer would have been expected to in it. */
export function noteStaffTraining(f, year, { success, amount, odds, focus, trainer, bonusOf }) {
  const r = rec(f, year); const t = (r.train ||= { n: 0, got: 0, ref: 0, id: trainer?.id || null });
  const others = STAFF.filter((s) => s.role === 'monster_trainer').map((s) => bonusOf(s, focus)).sort((a, b) => a - b); const refAmount = others[Math.floor(others.length / 2)] ?? amount;
  const refSuccess = clamp(odds.success - ((trainer?.overall ?? STAFF_NEG.refTrainerOvr) - STAFF_NEG.refTrainerOvr) / 200, 0.05, 0.97);
  t.n++; t.got += success ? amount : 0; t.ref += refSuccess * Math.max(1, Math.round(refAmount * (odds.factor ?? 1)));
}
/** After the draft: the owner's picks against the picks made within three slots (value = overall + 0.3 × (potential − 70)). */
export function noteStaffDraft(f, year, picks, potentialOf) {
  const v = (p) => p.ovr + 0.3 * ((potentialOf(p.id) ?? 70) - 70); const real = picks.filter((p) => p.id && !p.passed); const gaps = [];
  for (const p of real.filter((x) => x.mine)) { const near = real.filter((x) => !x.mine && Math.abs(x.overall - p.overall) <= STAFF_NEG.scoutWindow); if (!near.length) continue; gaps.push(v(p) - near.reduce((s, x) => s + v(x), 0) / near.length); }
  if (!gaps.length) return; const r = rec(f, year); r.draft = { n: gaps.length, gap: gaps.reduce((s, x) => s + x, 0) / gaps.length, scout: f.staff?.head_scout || null };
}

// ------------------------------------------------------------ evaluation
/** One season's score for `role`, or null when the season has nothing to judge it on. */
export function seasonScore(r, role) {
  const n = (r?.res?.n || r?.pre?.n || 16) - 1;
  if (role === 'head_coach') { if (!r?.res || !r?.pre) return null; return clamp((r.pre.team - r.res.win) / n + (r.res.playoffs ? STAFF_NEG.playoffs : 0) + (r.res.champion ? STAFF_NEG.title : 0)); }
  if (role === 'offensive_coordinator') { if (!r?.res || !r?.pre) return null; return clamp((r.pre.off - r.res.pf) / n); }
  if (role === 'defensive_coordinator') { if (!r?.res || !r?.pre) return null; return clamp((r.pre.def - r.res.pa) / n); }
  if (role === 'head_scout') { if (!r?.draft?.n) return null; return clamp(r.draft.gap / STAFF_NEG.scoutScale) * STAFF_NEG.shrink.head_scout; }
  if (role === 'monster_trainer') { if (!r?.train?.n || !(r.train.ref > 0)) return null; return clamp((r.train.got - r.train.ref) / r.train.ref / STAFF_NEG.trainerScale) * STAFF_NEG.shrink.monster_trainer; }
  return null;
}
const ROLE_WHY = {
  head_coach: (r) => `win rank ${r.res.win} of ${r.res.n} with the ${ord(r.pre.team)}-strongest roster${r.res.champion ? ', champions' : r.res.playoffs ? ', playoffs' : ''}`,
  offensive_coordinator: (r) => `scoring rank ${r.res.pf} of ${r.res.n} with the ${ord(r.pre.off)}-strongest offense`,
  defensive_coordinator: (r) => `points-allowed rank ${r.res.pa} of ${r.res.n} with the ${ord(r.pre.def)}-strongest defense`,
  head_scout: (r) => `draft picks ${r.draft.gap >= 0 ? '+' : ''}${r.draft.gap.toFixed(1)} against the picks around them`,
  monster_trainer: (r) => `training delivered ${Math.round(100 * r.train.got / r.train.ref)}% of an average trainer's`,
};
function ord(n) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; }
/** The contract-period evaluation: { P, band, seasons: [{ year, score, why }] } for the member now in `role`. */
export function evaluateStaff(f, role) {
  const id = f.staff?.[role]; const c = f.staffContracts?.[role]; const E = f.staffEval || {}; const out = [];
  if (id && c) for (let y = c.ends; y >= c.signed && out.length < 3; y--) { const r = E[y]; if (!r || (r.staff?.[role] && r.staff[role] !== id)) continue; const s = seasonScore(r, role); if (s == null) continue; out.push({ year: y, score: s, why: ROLE_WHY[role](r) }); }
  const w = STAFF_NEG.recency[out.length] || []; const P = out.length ? out.reduce((s, x, i) => s + w[i] * x.score, 0) : 0;
  return { P, band: bandOf(P), seasons: out };
}
/** The renewal demand for `role`: { demand, change, current, P, band, seasons }. */
export function staffDemand(f, role, current) {
  const ev = evaluateStaff(f, role); const b = ev.band; const ovr = staffById(f.staff?.[role])?.overall ?? STAFF_NEG.neutralOvr;
  const pos = clamp((ev.P - b.min) / ((b.max - b.min) || 1), 0, 1); const q = clamp((ovr - STAFF_NEG.neutralOvr) / 3) * STAFF_NEG.qualityShift;
  const change = b.lo + (b.hi - b.lo) * clamp(pos + q, 0, 1);
  return { ...ev, current, change, demand: r100(current * (1 + change)) };
}

// ------------------------------------------------------------ negotiation
/** The owner's preset offers for a demand: the salary of each option ('accept' | 'smaller' | 'same' | 'reduce'), null when it does not apply. */
export function staffOptions(current, demand) {
  return { accept: demand, smaller: demand > current + 100 ? r100(current + (demand - current) / 2) : null, same: demand > current ? current : null, reduce: r100(Math.min(current, demand) * 0.95) };
}
/** His reservation salary now (internal; never shown). */
export function staffReservation(f, item) {
  const id = f.staff?.[item.role]; const m = staffById(id); const b = STAFF_BANDS.find((x) => x.id === item.eval?.band) || bandOf(0);
  let flex = b.flex - ((m?.overall ?? 0) >= STAFF_NEG.leverageOvr ? STAFF_NEG.leverageFlex : 0);
  const comparable = STAFF.some((c) => c.role === item.role && c.id !== id && c.overall >= (m?.overall ?? 0) - 2 && c.salary <= item.ask); // job security: someone comparable would do it for less
  if (comparable) flex += STAFF_NEG.replaceableFlex;
  flex += STAFF_NEG.pride * (2 * draw(`staffpride|${f.seed ?? 0}|${item.year}|${item.role}|${id}`) - 1);
  return r100(item.ask * (1 - Math.max(0, flex)));
}
/**
 * His answer to `salary` in round `round` (1 or 2): { answer: 'accept' | 'counter' | 'reject' | 'leave', counter? }. Deterministic for
 * a member, season and round, so offering the same again draws nothing new.
 */
export function staffAnswer(f, item, salary, round) {
  const demand = item.ask; if (salary >= demand) return { answer: 'accept' };
  const res = staffReservation(f, item); const u = draw(`staffans|${f.seed ?? 0}|${item.year}|${item.role}|${f.staff?.[item.role]}|${round}`);
  if (round >= 2) { if (item.counter && salary >= item.counter) return { answer: 'accept' }; return salary >= res && u < STAFF_NEG.acceptFloor ? { answer: 'accept' } : { answer: 'leave' }; }
  if (salary >= res) { const p = STAFF_NEG.acceptFloor + (1 - STAFF_NEG.acceptFloor) * (salary - res) / Math.max(100, demand - res); return u < p ? { answer: 'accept' } : { answer: 'counter', counter: Math.max(res, r100((salary + demand) / 2)) }; }
  if (item.eval?.band === 'very_poor') return { answer: 'leave' };
  if (salary >= res * STAFF_NEG.nearFloor && u < STAFF_NEG.nearCounter) return { answer: 'counter', counter: Math.max(res, r100((salary + demand) / 2)) };
  return { answer: 'reject' };
}
