// Legendary Plays in Franchise Mode (GDD §36): discovery, availability and the game plan. A Legendary Play is an ordinary
// play in PLAYS with a `legendary: { species, slot }` key; everything here is driven by that data, so adding one of the
// other Legendary monsters' plays later is a playbook entry and a lesson, not new code.
//
// Rules: the play is discovered the first time its Legendary is on the club's roster and stays discovered for good.
// It can sit in one of the six game-plan slots only while that monster is on the roster, healthy and able to play the
// play's slot; otherwise it is taken out of the plan (the slot goes back to the coordinator's pick) until he is back.

import { PLAYS, LEGENDARY_IDS } from '../data/playbook.js';
import { SPECIES_BY_ID } from '../data/monsters.js';
import { canPlay } from '../data/personnel.js';
import { t as $t, line as $L, lineParts as $P } from '../text/index.js';

export { LEGENDARY_IDS };
export const legendOf = (id) => PLAYS[id]?.legendary || null;
export const sideOf = (id) => PLAYS[id]?.side || null;
const speciesName = (sp) => SPECIES_BY_ID[sp]?.name || sp;

/** The club's monster who unlocks `id` (Legendaries exist once in the league), or null. */
export function holderOf(roster, id) { const L = legendOf(id); return L ? (roster || []).find((m) => m.species === L.species) || null : null; }

/** Discovery and availability of one Legendary Play for a franchise: { discovered, available, monster, reason }. */
export function legendaryStatus(f, id) {
  const L = legendOf(id); if (!L) return { discovered: false, available: false, monster: null, reason: $t('franchise.not_a_legendary_play') };
  const discovered = !!f.legendaryPlays?.discovered?.[id]; const m = holderOf(f.roster, id);
  let reason = null;
  if (!m) reason = discovered ? `${$t('franchise.is_no_longer_on_your_roster', { species: speciesName(L.species) })}` : `${$t('franchise.sign_the_legendary_to_discover_this', { species: speciesName(L.species) })}`;
  else if (m.injury) reason = `${$t('franchise.is_injured_wk_the_play_returns', { name: m.name, weeks: m.injury.weeks, name2: m.name })}`;
  else if (!canPlay(m.position, L.slot)) reason = `${$t('franchise.cannot_play', { name: m.name, slot: L.slot })}`;
  return { discovered: discovered || !!m, available: !reason, monster: m, reason, slot: L.slot, species: L.species };
}
/** Legendary Plays this franchise can put in its plan right now, for one side. */
export function legendaryAvailable(f, side) { return LEGENDARY_IDS.filter((id) => sideOf(id) === side && legendaryStatus(f, id).available); }

/**
 * Bring the record up to date: discover plays whose Legendary has joined, and take unavailable Legendary Plays out of the
 * week's plan and the remembered plan. Returns { discovered: [ids], removed: [ids] } (new this call). Idempotent.
 * `refill(side, plan)` returns a full plan without the removed plays (the franchise passes its coordinator's default).
 */
export function syncLegendaryPlays(f, { refill = null, news = null } = {}) {
  const rec = (f.legendaryPlays ||= { discovered: {}, announced: {} }); rec.discovered ||= {}; rec.announced ||= {};
  const out = { discovered: [], removed: [] };
  for (const id of LEGENDARY_IDS) {
    const m = holderOf(f.roster, id);
    if (m && !rec.discovered[id]) { rec.discovered[id] = { year: f.season?.year ?? 1, week: f.season?.week ?? 1, monster: m.name }; out.discovered.push(id); news?.($L('franchise.legendary_play_discovered_unlocked_by_add', { name: PLAYS[id].name, name2: m.name }), 'win'); }
  }
  for (const holder of [f.week?.plan, f.lastPlan]) {
    if (!holder) continue;
    for (const side of ['offense', 'defense']) {
      const plan = holder[side]; if (!plan?.length) continue;
      const bad = plan.filter((id) => legendOf(id) && !legendaryStatus(f, id).available); if (!bad.length) continue;
      const kept = plan.filter((id) => !bad.includes(id));
      holder[side] = refill ? refill(side, kept) : kept;
      for (const id of bad) if (!out.removed.includes(id)) { out.removed.push(id); if (holder === f.week?.plan) news?.($L('franchise.is_out_of_the_game_plan', { name: PLAYS[id].name, reason: legendaryStatus(f, id).reason }), 'info'); }
    }
  }
  return out;
}
/** Discovered plays the owner has not been shown yet (the HQ shows the "Legendary Play Discovered!" card once each). */
export function unannouncedLegendary(f) { const r = f.legendaryPlays; return r ? Object.keys(r.discovered || {}).filter((id) => !r.announced?.[id]) : []; }
export function markAnnounced(f, ids) { const r = (f.legendaryPlays ||= { discovered: {}, announced: {} }); r.announced ||= {}; for (const id of ids) r.announced[id] = true; }

/**
 * AI clubs (GDD §36.6): a club whose roster holds a Legendary equips its play in place of the plan play of the same kind
 * (pass for a pass play, run for a run, a defence sharing the most tags), unless the monster is hurt. Deterministic.
 */
export function equipLegendaryForAI(team) {
  for (const id of LEGENDARY_IDS) {
    const L = legendOf(id); const m = (team.roster || []).find((x) => x.species === L.species);
    if (!m || m.injury || !canPlay(m.position, L.slot)) continue;
    const key = sideOf(id) === 'offense' ? 'offensePlays' : 'defensePlays'; const plays = team[key]; if (!plays?.length || plays.includes(id)) continue;
    const p = PLAYS[id]; const score = (q) => (q.type === p.type ? 2 : 0) + q.tags.filter((t) => p.tags.includes(t)).length;
    const swap = plays.slice().sort((a, b) => score(PLAYS[b]) - score(PLAYS[a]) || a.localeCompare(b))[0];
    team[key] = plays.map((x) => (x === swap ? id : x));
  }
  return team;
}
