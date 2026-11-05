// Task 7 — the hidden monster Ambition (owner approval 2026-11-05, section 1). Separate from Nature (Task 8 owns Nature and Temper;
// nothing here reads or changes them, training costs, development or ceilings).
//
// Each monster has exactly one dominant career Ambition — Money, Loyalty, Championship or Opportunity — assigned to the individual
// (never to his species family), fixed for his whole career (evolution, trades, release and free agency never change it) and saved
// with him. It is derived from his id with the game's seeded hash (ids come from the seeded generator), so assignment is reproducible,
// roughly equal across the four, draws nothing from the generator, and an existing save receives the same Ambition the first time
// it is opened (a one-time, persisted migration) and on every load after. It is never shown to the player: no profile, Dex, roster,
// contract, scouting, market or GM Assistant view prints it or its weights. Player-facing screens only show indirect observations.
//
// What it does (probabilities, never rules):
//   1. Offer evaluation (fa-engine rateOffer, the one evaluation for every club): it multiplies the weight of the priority it cares
//      about, so circumstances that matter to him matter more. Championship reads a club's competitive outlook (recent results and
//      roster strength) instead of this season's record alone; Loyalty values staying with the club that drafted or established him,
//      worth at most AMBITION.loyalHome of the money (no unrealistic discount). A seeded "mood" for each monster, club and league year
//      moves his answer a little (± AMBITION.mood), so two equal offers need not give the same result, while the same offer to the same
//      club always gets the same answer (no reroll) and a better offer is always at least as likely to be accepted.
//   2. Extension talks (fa-engine talksOpen): before any offer, whether he is willing to discuss an extension at all in this contract's
//      final year. One seeded draw per monster, club and contract (no reroll); the chance is set by his Ambition and the circumstances
//      at the time of asking, so a club that starts winning can reopen talks. Declining talks never refuses the club's later offers in
//      free agency.
import { hashString } from '../core/rng.js';

export const AMBITIONS = Object.freeze(['money', 'loyalty', 'championship', 'opportunity']);

/** The modest model. Weight multipliers for rateOffer's four priorities; the loyalty value; the mood; extension-talk chances. */
export const AMBITION = Object.freeze({
  weight: Object.freeze({
    money: Object.freeze({ money: 1.6, winning: 0.7 }),        // the money decides more; a losing club matters less when it pays
    loyalty: Object.freeze({ security: 1.2 }),                  // plus the home value below
    championship: Object.freeze({ winning: 1.7 }),             // a club's competitive outlook decides more
    opportunity: Object.freeze({ role: 1.7 }),                 // the role on the club against the role his level earns elsewhere
  }),
  loyalHome: 0.06,   // at his established club: worth up to 6% of the money part (a reasonable team-friendly deal, never a large discount)
  mood: 0.05,        // ± share of his evaluation from the seeded mood (monster, club, league year)
  talk: Object.freeze({
    base: 0.86,                       // most monsters will listen
    money: 0.9,                       // a money-minded monster always wants to hear the number
    loyaltyHome: 0.97, loyaltyAway: 0.86,
    championship: [0.3, 0.75],        // chance = a + b × competitive outlook (0–1): about 0.5 at a struggling club, 0.9+ at a contender
    opportunity: Object.freeze({ starter: 0.92, backup: 0.62, depth: 0.5 }),
    blocked: 0.18,                    // less again when his level would earn a bigger role elsewhere (a talented backup)
    veteran: 0.08,                    // a veteran past his onset is more willing to settle
    star: 0.04,                       // a monster who would start anywhere has options (not for Loyalty)
    min: 0.15, max: 0.98,
  }),
});

/** The Ambition a monster is born with: a seeded slice of his id (no generator draw). */
export const ambitionFor = (id) => AMBITIONS[(hashString(`ambition|${id ?? 'x'}`) >>> 7) % AMBITIONS.length];
/** His Ambition (the saved one; a monster from before the system gets the same value the migration will save). Internal use only. */
export const ambitionOf = (m) => (AMBITIONS.includes(m?.ambition) ? m.ambition : ambitionFor(m?.id ?? m?.name));
/** Give `m` his Ambition if he has none (generation and the one-time migration). Never changes an existing one. */
export function assignAmbition(m) { if (m && !AMBITIONS.includes(m.ambition)) m.ambition = ambitionFor(m.id ?? m.name); return m?.ambition; }

/** A seeded uniform in [0, 1) for one decision key. */
export const draw = (key) => hashString(key) / 4294967296;
/** The mood factor for (monster, club, league year): 1 ± AMBITION.mood. */
export const moodOf = (seed, ly, mid, club) => 1 + AMBITION.mood * (2 * draw(`mood|${seed ?? 0}|${ly}|${mid}|${club}`) - 1);

/** Is `club` the organization that drafted him, or the one he is established with (his longest stint, two seasons or more)? */
export function isHomeClub(m, club, year) {
  if (!m || !club) return false; if (m.drafted?.club === club) return true;
  const len = {}; for (const s of m.history || []) if (s?.club) len[s.club] = (len[s.club] || 0) + Math.max(0, (s.to ?? year) - (s.from ?? year) + 1);
  const best = Object.entries(len).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  return !!best && best[0] === club && best[1] >= 2;
}

/**
 * The chance he will discuss an extension with the club now. `x`: { ambition, outlook (0–1), role ('starter' | 'backup' | 'depth'),
 * marketRole, home (the club is his established one), veteran }.
 */
export function talkChance(x) {
  const T = AMBITION.talk; let p = T.base;
  if (x.ambition === 'money') p = T.money;
  else if (x.ambition === 'loyalty') p = x.home ? T.loyaltyHome : T.loyaltyAway;
  else if (x.ambition === 'championship') p = T.championship[0] + T.championship[1] * x.outlook;
  else if (x.ambition === 'opportunity') { p = T.opportunity[x.role] ?? T.base; if (x.role !== 'starter' && rank(x.marketRole) > rank(x.role)) p -= T.blocked; }
  if (x.veteran) p += T.veteran;
  if (x.marketRole === 'starter' && x.ambition !== 'loyalty') p -= T.star;
  return Math.max(T.min, Math.min(T.max, p));
}
const rank = (r) => (r === 'starter' ? 2 : r === 'backup' ? 1 : 0);

/** Observations a player may read (never the Ambition itself). */
export const CLUES = Object.freeze({
  direction: 'He appears concerned about the team’s competitive direction.',
  money: 'He is looking for a stronger financial offer.',
  role: 'He would like a clearer path to a starting role.',
  home: 'He appears interested in remaining with the organization.',
  market: 'He seems curious about what the market would offer.',
  open: 'He seems open to talking.',
});
/**
 * One observation for the outlook: an applicable circumstance, chosen with a seeded draw that favours what matters to him (an
 * observation, not a disclosure: another applicable circumstance, or a neutral line, is possible). `apply`: the circumstances that
 * hold now { direction, money, role, home }; `key`: the seeded key of the contract.
 */
export function clueFor(ambition, apply, key, { talks = true } = {}) {
  const favoured = { money: 'money', loyalty: 'home', championship: 'direction', opportunity: 'role' }[ambition];
  const list = Object.keys(apply).filter((k) => apply[k]); const u = draw(`clue|${key}`);
  if (!list.length) return talks ? CLUES.open : CLUES.market;
  if (list.includes(favoured) && u < 0.65) return CLUES[favoured];
  if (u > 0.9) return talks ? CLUES.open : CLUES.market;
  return CLUES[list[Math.floor(draw(`clue2|${key}`) * list.length)]];
}
