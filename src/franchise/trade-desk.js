// The trade desk (Task 5, GDD §19.6c): the owner's proposals to AI clubs and the offers AI clubs make the owner. Pure decisions;
// the franchise carries out whatever is accepted (franchise.js). One rule judges every deal, the same one the AI clubs use
// between themselves (trade-value.js): a club says yes when the deal is fair in market value AND better for its own roster.
//
// What a club checks, in this order, and says out loud when it refuses:
//   1. who can move       protected monsters, cornerstones, a first deal, a monster who has just arrived in a trade
//   2. the window         the draft clock and the offseason (the owner's trade windows are unchanged)
//   3. the roster         both clubs end between 26 and 38 and keep their starters at every position; an AI club stays under the cap
//   4. its own lineup     a starter is not for sale unless the next man is within a few points; a monster it has no use for is worth nothing to it
//   5. the price          what it receives is worth at least what it gives, plus the club's margin (difficulty), in what it can use
// Answers are deterministic for a given proposal (a ±2% temperament drawn from the proposal itself), proposals are limited per
// club and per window, and a club never sells below market or buys above it, so buying and selling the same monster loses value.

import { monsterOverall, salaryFor, ROSTER_MAX, ROSTER_MIN } from '../data/monsters.js';
import { createRng, hashString } from '../core/rng.js';
import { GROUP_SLOTS } from './roster.js';
import { tradable, pickKey, samePick, pickWorth, picksOwnedBy, pickUsed, tradableYears } from './trades.js';
import { marketValue, rosterWorth, rosterAfter, rosterProblems, roleIn, slotsOf, countsAt, isUnavailable, DEAL_RULES } from './trade-value.js';
import { isProtected } from './league-registry.js';

export const DESK_RULES = Object.freeze({
  perClub: 3,                                       // proposals to one club in a window
  perWindow: 8,                                     // proposals in a window
  maxMonsters: 3, maxPicks: 3,                      // on each side of one proposal
  margin: Object.freeze({ rookie: 0.03, pro: 0.06, allstar: 0.12 }), // what a club asks above fair value, by difficulty
  mood: 0.02,                                       // ±2% temperament, drawn from the proposal
  replacementGap: 6,                                // a starter is for sale only if the next man is within this many overall (GDD §19.6)
  counterTries: 12,                                 // how many of your assets a club will look through for a counter
});
const ovr = monsterOverall;
const ordered = (list) => list.slice().sort((a, b) => (isUnavailable(a) - isUnavailable(b)) || (ovr(b) - ovr(a)) || (a.id < b.id ? -1 : 1));

// ---------------------------------------------------------------- windows and limits
/** The window a proposal belongs to: the creation draft, or the offseason of the season just played. Limits reset when it changes. */
export const deskStamp = (f) => (f.draft?.creation ? 'creation' : `off:${f.season?.year || 0}`);
export function deskUsage(f, team = null) {
  const d = f.tradeDesk; const same = d && d.stamp === deskStamp(f);
  const total = same ? d.total || 0 : 0, club = same && team ? d.clubs?.[team] || 0 : 0;
  return { total, club, clubLeft: DESK_RULES.perClub - club, totalLeft: DESK_RULES.perWindow - total };
}
export function spendProposal(f, team) {
  const stamp = deskStamp(f); if (!f.tradeDesk || f.tradeDesk.stamp !== stamp) f.tradeDesk = { stamp, total: 0, clubs: {} };
  f.tradeDesk.total++; f.tradeDesk.clubs[team] = (f.tradeDesk.clubs[team] || 0) + 1;
}
/** A monster who arrived in a trade this season cannot be moved on again until the next one: no flipping. */
export const justArrived = (f, m) => !!m.traded && m.traded.year === (f.season?.year ?? -1);

// ---------------------------------------------------------------- who can move
/** Why a monster cannot be traded, or null. `side` is 'mine' or 'theirs'. */
export function immovable(f, m, side) {
  if (isProtected(m)) return m.legendary ? 'A gym legendary is bound to his club for good.' : 'A rival GM’s signature monster stays with his club.';
  if (m.cornerstone) return 'A cornerstone is the face of a club and is never traded.';
  if (!tradable(f, m)) return m.contract?.rookie || m.drafted || m.rookie ? 'Rookies stay with the club that signed them for their first two seasons.' : 'He cannot be traded.';
  if (justArrived(f, m)) return side === 'mine' ? 'He just arrived in a trade; he cannot be moved again this season.' : 'He just arrived in a trade; his club will not move him again this season.';
  return null;
}
/** Is a starter at this club for sale? Only if the man behind him is within a few points. */
export function readyReplacement(roster, m) {
  const at = ordered(roster.filter((x) => x.position === m.position)); const n = slotsOf(m.position);
  if (at.indexOf(m) >= n) return true; // not a starter
  const next = at.filter((x) => x.id !== m.id)[n - 1];
  return !!next && ovr(next) >= ovr(m) - DESK_RULES.replacementGap;
}

// ---------------------------------------------------------------- the decision
const moodOf = (f, prop, stamp) => { const key = [prop.team, stamp, ...[...prop.giveMonsters].sort(), '>', ...[...prop.getMonsters].sort(), ...(prop.givePicks || []).map(pickKey).sort(), '>', ...(prop.getPicks || []).map(pickKey).sort()].join('|'); return 1 + (createRng(hashString(`desk|${f.seed}|${key}`)).next() - 0.5) * 2 * DESK_RULES.mood; };
const money = (n) => Math.round(Math.abs(n)).toLocaleString('en-US');
/**
 * Judge a proposal: { team, giveMonsters: [ids from the owner's roster], givePicks: [picks the owner holds], getMonsters: [ids
 * on the club], getPicks: [picks the club holds] }. `env`: { ownerRoster, ownerRoom (cap room, may be negative), ownerPicks
 * (picks the owner holds), roster(team), room(team), difficulty, year, count: true to spend a proposal }.
 * Returns { ok (the proposal is well formed), legal, accept, reasons: [{code, text, blocking}], detail, counter }.
 */
export function evaluateProposal(f, prop, env) {
  const { team } = prop; const year = env.year; const mine = env.ownerRoster, theirs = env.roster(team);
  const give = (prop.giveMonsters || []).map((id) => mine.find((m) => m.id === id)), get = (prop.getMonsters || []).map((id) => theirs.find((m) => m.id === id));
  const givePicks = prop.givePicks || [], getPicks = prop.getPicks || []; const reasons = []; const block = (code, text) => reasons.push({ code, text, blocking: true });
  const fail = (code, text) => ({ ok: false, legal: false, accept: false, reasons: [{ code, text, blocking: true }], detail: null, counter: null });
  if (give.some((m) => !m) || get.some((m) => !m)) return fail('gone', 'One of those monsters is no longer where the proposal says.');
  if (new Set(prop.giveMonsters).size !== give.length || new Set(prop.getMonsters).size !== get.length) return fail('duplicate', 'The same monster is listed twice.');
  if (!give.length && !givePicks.length) return fail('empty', 'Offer something: a monster or a pick.');
  if (!get.length && !getPicks.length) return fail('empty', 'Ask for something: a monster or a pick.');
  if (give.length > DESK_RULES.maxMonsters || get.length > DESK_RULES.maxMonsters || givePicks.length > DESK_RULES.maxPicks || getPicks.length > DESK_RULES.maxPicks) return fail('size', `A proposal carries at most ${DESK_RULES.maxMonsters} monsters and ${DESK_RULES.maxPicks} picks on each side.`);
  if (!env.windowOpen) return fail('window', 'Trades are open on the draft clock and in the offseason.');
  const use = deskUsage(f, team);
  if (!env.noLimit && use.clubLeft <= 0) return fail('limit', `You have made ${DESK_RULES.perClub} proposals to the ${team} this offseason. Try another club, or wait for the next window.`);
  if (!env.noLimit && use.totalLeft <= 0) return fail('limit', `You have made ${DESK_RULES.perWindow} proposals this offseason. The league is tired of your calls until the next window.`);
  // 1. who can move
  for (const m of give) { const why = immovable(f, m, 'mine'); if (why) block('immovable', `${m.name}: ${why}`); }
  for (const m of get) { const why = immovable(f, m, 'theirs'); if (why) block('immovable', `${m.name}: ${why}`); }
  for (const p of givePicks) if (!env.ownerPicks.some((x) => samePick(x, p))) block('pick', 'You no longer hold one of those picks.');
  const clubPicks = (y) => picksOwnedBy(f, team, y, env.allTeams).filter((p) => !pickUsed(f, p));
  for (const p of getPicks) if (!clubPicks(p.year).some((x) => samePick(x, p))) block('pick', `The ${team} no longer hold one of those picks.`);
  if (givePicks.some((p) => !tradableYears(f).includes(p.year)) || getPicks.some((p) => !tradableYears(f).includes(p.year))) block('pick', `Picks can be traded up to three classes ahead.`);
  // 3. the roster
  const myAfter = rosterAfter(mine, { give, get }), theirAfter = rosterAfter(theirs, { give: get, get: give });
  if (myAfter.length > ROSTER_MAX) block('rosterFull', `That leaves you ${myAfter.length} monsters; the roster holds ${ROSTER_MAX}. Include a monster to send back or release one first.`);
  if (myAfter.length < ROSTER_MIN && myAfter.length < mine.length) block('rosterShort', `That leaves you ${myAfter.length} monsters; a club needs ${ROSTER_MIN} to play.`);
  const mc = countsAt(mine), ma = countsAt(myAfter);
  for (const pos of Object.keys(GROUP_SLOTS)) if ((mc[pos] || 0) >= 1 && !(ma[pos] || 0) && pos !== 'TE') { block('onlyOne', `${give.find((m) => m.position === pos)?.name || 'That monster'} is your only ${pos}.`); break; }
  const tp = rosterProblems(theirs, theirAfter);
  if (tp.includes('rosterFull')) block('rosterFull', `That leaves the ${team} ${theirAfter.length} monsters; they hold ${ROSTER_MAX}. They will not take more bodies than they send.`);
  if (tp.includes('rosterShort')) block('rosterShort', `That leaves the ${team} ${theirAfter.length} monsters; they need ${ROSTER_MIN} to play.`);
  const short = tp.find((c) => c.startsWith('short:')); if (short) block('position', `The ${team} would be short of starters at ${short.slice(6)}.`);
  const roomT = env.room(team), roomAfter = roomT + get.reduce((s, m) => s + (m.salary || 0), 0) - give.reduce((s, m) => s + (m.salary || 0), 0);
  if (roomAfter < Math.min(0, roomT)) block('cap', `The ${team} cannot fit the salary: ${money(-roomAfter)} cr over their cap.`);
  // 4. their lineup
  for (const m of get) if (!readyReplacement(theirs, m)) block('noReplacement', `The ${team} have no ready replacement for ${m.name}; a starter is only for sale when the man behind him is within ${DESK_RULES.replacementGap} points.`);
  // 5. the price
  const margin = DESK_RULES.margin[env.difficulty] ?? DESK_RULES.margin.pro; const stamp = deskStamp(f); const mood = moodOf(f, prop, stamp);
  const pw = (list) => list.reduce((s, p) => s + pickWorth(f, p), 0);
  const worthIn = rosterWorth(rosterAfter(theirs, { get: give }), year) - rosterWorth(theirs, year) + pw(givePicks); // what the club gets, in what it can use
  const lossOut = rosterWorth(theirs, year) - rosterWorth(rosterAfter(theirs, { give: get }), year) + pw(getPicks);   // what it gives up, to its roster
  const marketOut = get.reduce((s, m) => s + marketValue(m, { year }), 0) + pw(getPicks);                           // and at market
  const marketIn = give.reduce((s, m) => s + marketValue(m, { year }), 0) + pw(givePicks);
  const need = Math.max(lossOut, marketOut) * (1 + margin) * mood;                                                // a club sells at or above market, and never below what the loss costs it
  const priceOk = worthIn >= need; const useful = give.length ? give.reduce((s, m) => s + (rosterWorth(rosterAfter(theirs, { get: [m] }), year) - rosterWorth(theirs, year)), 0) / Math.max(1, give.reduce((s, m) => s + marketValue(m, { year }), 0)) : 1;
  const blocking = reasons.some((r) => r.blocking);
  if (!blocking && !priceOk) {
    const ratio = worthIn / need; const gap = ratio >= 0.9 ? 'close' : ratio >= 0.6 ? 'short' : 'far';
    if (give.length && marketIn > 0 && useful < 0.35 && !givePicks.length) reasons.push({ code: 'noNeed', text: `The ${team} are deep where you are offering: ${give.map((m) => m.name).join(', ')} would sit on their bench, so they value ${give.length === 1 ? 'him' : 'them'} at little.`, blocking: false });
    reasons.push({ code: 'value', text: gap === 'close' ? `Close, but the ${team} want a little more for ${get.map((m) => m.name).concat(getPicks.map((p) => `a ${p.year} R${p.round}`)).join(' and ')}.` : gap === 'short' ? `The ${team} value what they give above what you offer.` : `The ${team} are far apart: what you offer is worth well under what you ask.`, blocking: false, gap });
  }
  const legal = !blocking; const accept = legal && priceOk;
  const detail = {
    youBefore: mine.length, youAfter: myAfter.length, themBefore: theirs.length, themAfter: theirAfter.length,
    youCapAfter: env.ownerRoom + give.reduce((s, m) => s + (m.salary || 0), 0) - get.reduce((s, m) => s + (m.salary || 0), 0), themCapAfter: roomAfter,
    depth: depthChange(mine, myAfter, [...give, ...get].map((m) => m.position)),
    arrives: get.map((m) => ({ id: m.id, name: m.name, position: m.position, ovr: ovr(m), salary: m.salary, role: roleIn(mine, m) })),
    leaves: give.map((m) => ({ id: m.id, name: m.name, position: m.position, ovr: ovr(m), salary: m.salary, role: roleIn(mine, m) })),
    proposalsLeft: { club: use.clubLeft - (env.count ? 1 : 0), total: use.totalLeft - (env.count ? 1 : 0) },
  };
  let counter = null;
  if (!accept && legal && env.counter !== false) counter = findCounter(f, prop, env, { give, get });
  return { ok: true, legal, accept, reasons, detail, counter };
}
/** Starters before and after at each position the deal touches: how it changes the owner's depth. */
export function depthChange(before, after, positions) {
  return [...new Set(positions)].map((pos) => { const row = (r) => { const at = ordered(r.filter((m) => m.position === pos)); const n = slotsOf(pos); return { count: at.length, slots: n, best: at[0] ? ovr(at[0]) : null, weakestStarter: at.length >= n ? ovr(at[n - 1]) : null, backups: Math.max(0, at.length - n) }; }; return { pos, before: row(before), after: row(after) }; });
}
/** The smallest thing the owner could add (a pick, then a spare monster), or drop from the ask, that would make the club say yes. Looked at once, not negotiated. */
function findCounter(f, prop, env, { give, get }) {
  const base = { ...prop }; const asks = (p) => evaluateProposal(f, p, { ...env, counter: false, count: false, noLimit: true }).accept;
  const adds = [];
  if ((prop.givePicks || []).length < DESK_RULES.maxPicks) for (const p of env.ownerPicks.filter((x) => !(prop.givePicks || []).some((g) => samePick(g, x)))) adds.push({ kind: 'pick', pick: p, cost: pickWorth(f, p), prop: { ...base, givePicks: [...(prop.givePicks || []), p] } });
  const spares = env.ownerRoster.filter((m) => !prop.giveMonsters.includes(m.id) && !immovable(f, m, 'mine') && roleIn(env.ownerRoster, m) > 0);
  if (prop.giveMonsters.length < DESK_RULES.maxMonsters) for (const m of spares) adds.push({ kind: 'monster', monster: m, cost: marketValue(m, { year: env.year }), prop: { ...base, giveMonsters: [...prop.giveMonsters, m.id] } });
  adds.sort((a, b) => a.cost - b.cost || (a.kind < b.kind ? -1 : 1));
  let tries = 0;
  for (const a of adds) { if (tries++ >= DESK_RULES.counterTries * 3) break; if (asks(a.prop)) return a.kind === 'pick' ? { kind: 'addPick', pick: a.pick, text: `They would do it if you add your ${a.pick.year} round-${a.pick.round} pick.` } : { kind: 'addMonster', monsterId: a.monster.id, text: `They would do it if you add ${a.monster.name} (${a.monster.position}, ${ovr(a.monster)} OVR).` }; }
  if (get.length + (prop.getPicks || []).length > 1) for (const m of get) { const p = { ...base, getMonsters: prop.getMonsters.filter((id) => id !== m.id) }; if ((p.getMonsters.length || (p.getPicks || []).length) && asks(p)) return { kind: 'dropAsk', monsterId: m.id, text: `They would do it without ${m.name} in the ask.` }; }
  return null;
}

// ---------------------------------------------------------------- the people and picks a proposal can use
/** Everything the desk needs for one club: who can move on each side and why not. */
export function deskAssets(f, team, env) {
  const mine = env.ownerRoster, theirs = env.roster(team);
  const row = (roster, side) => ordered(roster).map((m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, ovr: ovr(m), age: m.age, salary: m.salary || salaryFor(m), ends: m.contract?.ends ?? null, role: roleIn(roster, m), injured: isUnavailable(m), why: immovable(f, m, side), forSale: side === 'theirs' ? readyReplacement(roster, m) : true }));
  return { mine: row(mine, 'mine'), theirs: row(theirs, 'theirs'), myPicks: env.ownerPicks, theirPicks: tradableYears(f).flatMap((y) => picksOwnedBy(f, team, y, env.allTeams).filter((p) => !pickUsed(f, p)).map((p) => ({ year: p.year, round: p.round, original: p.original }))), usage: deskUsage(f, team) };
}

// ---------------------------------------------------------------- AI clubs calling the owner
/**
 * An AI club's offer for the owner, or null. It comes from the club's own roster: a spot where a monster of yours would start for
 * it, or a monster of its own it can spare for a spot where you are thin. Three shapes, so the calls differ:
 *   sell   the club sends a spare and asks your picks               (you are thin where he plays)
 *   buy    the club asks for one of your spares and pays in picks   (it is thin where he plays)
 *   swap   a spare of theirs for a spare of yours                   (each fills the other's gap)
 * Every offer is a proposal the club would itself accept (it is run through evaluateProposal), and it must leave YOU better
 * off by your own roster's measure; nothing is offered to meet a quota. `chance` is the roll that a club calls at all this
 * week. Returns { team, kind, proposal, mine: {...}, theirs: {...}, gain } where proposal is the shape evaluateProposal takes.
 */
export function buildIncomingOffer(f, env, { key, chance }) {
  const r = createRng(hashString(`call2|${f.seed}|${key}`));
  if (r.next() > chance) return null;
  const mine = env.ownerRoster; const year = env.year; const myPicks = env.ownerPicks.slice().sort((a, b) => pickWorth(f, a) - pickWorth(f, b));
  const clubs = env.clubs.slice().sort().sort(() => r.next() - 0.5);
  const spares = (roster, side) => Object.keys(GROUP_SLOTS).flatMap((pos) => ordered(roster.filter((m) => m.position === pos)).slice(slotsOf(pos))).filter((m) => !immovable(f, m, side) && !isUnavailable(m));
  const floorAt = (roster, pos) => { const at = ordered(roster.filter((m) => m.position === pos)).filter((m) => !isUnavailable(m)); return at.length < slotsOf(pos) ? 0 : ovr(at[slotsOf(pos) - 1]); };
  const mySpares = spares(mine, 'mine'); const out = { sell: [], buy: [], swap: [] };
  const ownerNet = (give, get, picksIn, picksOut) => rosterWorth(rosterAfter(mine, { give, get }), year) - rosterWorth(mine, year) + picksIn - picksOut;
  const accepted = (p) => evaluateProposal(f, p, { ...env, counter: false, count: false, windowOpen: true, noLimit: true });
  const consider = (kind, cand) => { const at = out[kind].findIndex((x) => x.team === cand.team); if (at < 0) out[kind].push(cand); else if (cand.score > out[kind][at].score) out[kind][at] = cand; }; // the best offer of each club, per kind
  for (const team of clubs) {
    const theirs = env.roster(team); const theirSpares = spares(theirs, 'theirs');
    // sell: their spare for your picks
    for (const m of theirSpares.filter((x) => ovr(x) >= floorAt(mine, x.position) + DEAL_RULES.band[0] * 0 + 2).sort((a, b) => ovr(b) - ovr(a)).slice(0, 2)) {
      const upgrade = ovr(m) - floorAt(mine, m.position); if (upgrade < 3) continue; // he must start for you, by a margin you would notice
      const gain = rosterWorth(rosterAfter(mine, { get: [m] }), year) - rosterWorth(mine, year); if (gain < DEAL_RULES.minGain) continue;
      const price = marketValue(m, { year }) * 1.3;
      const combos = [...myPicks.map((p) => [p]), ...myPicks.flatMap((p, i) => myPicks.slice(i + 1).map((q) => [p, q]))].sort((a, b) => a.reduce((s, p) => s + pickWorth(f, p), 0) - b.reduce((s, p) => s + pickWorth(f, p), 0)).slice(0, 40);
      for (const give of combos) { const prop = { team, giveMonsters: [], givePicks: give, getMonsters: [m.id], getPicks: [] }; const e = accepted(prop); if (!e.accept) continue; const cost = give.reduce((s, p) => s + pickWorth(f, p), 0); if (cost > price) break; consider('sell', { team, kind: 'sell', proposal: prop, gain, score: gain / cost + r.next() * 0.001 }); break; }
    }
    // buy: your spare for their picks
    const theirPicks = tradableYears(f).flatMap((y) => picksOwnedBy(f, team, y, env.allTeams).filter((p) => !pickUsed(f, p)));
    for (const s of mySpares.filter((x) => ovr(x) >= floorAt(theirs, x.position) + 2).sort((a, b) => ovr(b) - ovr(a)).slice(0, 2)) {
      const target = marketValue(s, { year }) * 0.95; const picks = theirPicks.slice().sort((a, b) => pickWorth(f, a) - pickWorth(f, b));
      const combos = [...picks.map((p) => [p]), ...picks.flatMap((p, i) => picks.slice(i + 1).map((q) => [p, q]))].sort((a, b) => Math.abs(a.reduce((x, p) => x + pickWorth(f, p), 0) - target) - Math.abs(b.reduce((x, p) => x + pickWorth(f, p), 0) - target)).slice(0, 40);
      for (const pay of combos) { const prop = { team, giveMonsters: [s.id], givePicks: [], getMonsters: [], getPicks: pay }; const e = accepted(prop); if (!e.accept) continue; const net = ownerNet([s], [], pay.reduce((x, p) => x + pickWorth(f, p), 0), 0); if (net < DEAL_RULES.sellerFloor) continue; consider('buy', { team, kind: 'buy', proposal: prop, gain: net, score: net + r.next() * 0.001 }); break; }
    }
    // swap: their spare where you are thin for your spare where they are thin
    for (const m of theirSpares.filter((x) => ovr(x) >= floorAt(mine, x.position) + 2).sort((a, b) => ovr(b) - ovr(a)).slice(0, 2)) {
      const vm = marketValue(m, { year });
      for (const s of mySpares.filter((x) => x.position !== m.position && ovr(x) >= floorAt(theirs, x.position) + 2)) {
        const vs = marketValue(s, { year }); if (vs < vm * 0.9 || vs > vm * 1.15) continue;
        const prop = { team, giveMonsters: [s.id], givePicks: [], getMonsters: [m.id], getPicks: [] }; if (!accepted(prop).accept) continue;
        const net = ownerNet([s], [m], 0, 0); if (net < DEAL_RULES.sellerFloor) continue; consider('swap', { team, kind: 'swap', proposal: prop, gain: net, score: net + r.next() * 0.001 });
      }
    }
  }
  const kinds = Object.keys(out).filter((k) => out[k].length); if (!kinds.length) return null;
  const pool = out[kinds[Math.floor(r.next() * kinds.length)]].sort((a, b) => (b.score - a.score) || (a.team < b.team ? -1 : 1)).slice(0, 4); // every one is a real need; which of the best few calls is the week's draw
  return pool[Math.floor(r.next() * pool.length)];
}
