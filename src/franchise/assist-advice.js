// Coach Assist advice (GDD §27.3): roster and cap warnings, Guided suggestions and routine consequence lines, all read-only.
// Nothing here changes the franchise or decides anything; the UI shows it and the player chooses.
import * as F from './franchise.js';
import { monsterOverall, salaryFor } from '../data/monsters.js';
import { hintsOn, consequencesOn, suggestionsOn } from './assist.js';
import { t as $t } from '../text/index.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');

/**
 * Roster and cap problems. `critical` ones (over the cap, too few monsters to play, no legal lineup) are safety warnings and
 * show in every mode; the rest are contextual hints and follow the hints switch.
 */
export function rosterWarnings(f, { all = false } = {}) {
  if (!f?.season) return [];
  const out = []; const cap = F.salarySummary(f);
  if (cap.over) out.push({ level: 'critical', key: 'cap', text: `${$t('franchise.over_the_salary_cap_by_cr', { amount: fmt(-cap.remaining), offseason: f.offseason ? $t('franchise.the_commissioner_reviews_the_books_in') : $t('franchise.the_commissioner_reviews_the_books_before') })}`, screen: f.offseason ? 'offseason' : 'contracts' });
  if (f.roster.length < F.ROSTER_MIN) out.push({ level: 'critical', key: 'min', text: `${$t('franchise.only_monsters_a_club_needs_to', { n: f.roster.length, rosterMin: F.ROSTER_MIN, offseason: f.offseason ? $t('franchise.sign_free_agents_or_draft_to') : $t('franchise.sign_a_monster_on_tuesday') })}`, screen: f.offseason ? 'offseason' : 'recruit' });
  if (!f.offseason && !f.season.finished) { const m = F.sundayMatchup(f); if (m?.forfeit) out.push({ level: 'critical', key: 'forfeit', text: `${$t('franchise.no_legal_lineup_for_sunday', { forfeitReason: m.forfeitReason || $t('franchise.a_position_cannot_be_filled') })}`, screen: 'roster' }); }
  if (!all && !hintsOn(f)) return out;
  const needs = F.depthNeeds(f).filter((n) => n.status === 'short');
  if (needs.length) out.push({ level: 'warn', key: 'depth', text: `${$t('franchise.short_at')} ${needs.map((n) => n.position).join(', ')}${$t('franchise.fewer_healthy_monsters_than_starting_spots', { needs: needs.length === 1 ? $t('franchise.that_position') : 'those positions' })}`, screen: 'scout' });
  const hurt = f.roster.filter((m) => m.injury).length; if (hurt >= 3) out.push({ level: 'warn', key: 'hurt', text: `${$t('franchise.monsters_injured_easier_training_and_a', { hurt })}`, screen: 'roster' });
  if (!cap.over && cap.remaining < cap.cap * 0.03) out.push({ level: 'warn', key: 'tight', text: `${$t('franchise.only_cr_of_cap_room_left', { amount: fmt(cap.remaining) })}`, screen: 'contracts' });
  const pts = f.roster.filter((m) => (m.points || 0) > 0).length; if (pts && !f.settings?.autoPoints) out.push({ level: 'warn', key: 'points', text: `${$t('franchise.monster_training_points_to_invest_tap', { pts, pts2: pts === 1 ? ' has' : 's have' })}`, screen: 'roster' });
  if (f.offseason) { const n = F.offseasonPending(f).length; if (n) out.push({ level: 'warn', key: 'expiring', text: `${$t('franchise.contracts_to_decide_before_the_draft', { n })}`, screen: 'offseason' }); }
  return out;
}

/** How much a monster would add at its position: its OVR against the best healthy monster you already have there. */
export function upgradeOver(f, m) {
  const same = f.roster.filter((x) => x.position === m.position && !x.injury && x.id !== m.id).map(monsterOverall);
  return { best: same.length ? Math.max(...same) : 0, gain: monsterOverall(m) - (same.length ? Math.max(...same) : 0), count: same.length };
}

/** Guided: which Tuesday prospect to battle for, and why. Null when nothing stands out or suggestions are off. */
export function suggestProspect(f) {
  if (!suggestionsOn(f)) return null; const ps = f.week?.prospects || []; if (!ps.length) return null;
  const needs = Object.fromEntries(F.depthNeeds(f).map((n) => [n.position, n.status]));
  const scored = ps.map((p, i) => { const known = p.revealed >= 4; const u = known ? upgradeOver(f, p.monster) : { gain: 0 }; const need = needs[p.monster.position]; const affordable = known && p.potentialKnown ? !F.salarySummary(f, p.monster.salary || salaryFor(p.monster)).over : true;
    return { i, p, u, need, affordable, score: u.gain + (need === 'short' ? 12 : need === 'thin' ? 5 : 0) + (affordable ? 0 : -30) }; }).sort((a, b) => b.score - a.score);
  const top = scored[0]; if (!top || top.score < -5) return { i: null, text: $t('franchise.none_of_these_would_start_for') };
  const why = top.need === 'short' ? `${$t('franchise.you_are_short_at', { position: top.p.monster.position })}` : top.u.gain > 0 ? `${$t('franchise.ovr_better_than_your_best', { gain: top.u.gain, position: top.p.monster.position })}` : `${$t('franchise.cover_at', { position: top.p.monster.position })}`;
  return { i: top.i, text: `Suggested: ${top.p.monster.name} (${top.p.monster.position}, ${top.p.revealed >= 4 ? monsterOverall(top.p.monster) + ' OVR' : $t('franchise.ovr_unknown')}): ${why}${top.affordable ? '' : $t('franchise.but_the_salary_does_not_fit')}.` };
}

/** Guided: the draft prospect to look at first (scouted, best OVR, a needed position breaks ties). */
export function suggestDraftPick(f) {
  if (!suggestionsOn(f)) return null; const d = f.draft; if (!d?.class) return null;
  const avail = d.class.filter((m) => (d.available || d.class.map((x) => x.id)).includes(m.id) && (d.revealed?.[m.id] || 0) >= 3);
  if (!avail.length) return { id: null, text: $t('franchise.your_scout_has_not_studied_anyone') };
  const needs = Object.fromEntries(F.depthNeeds(f).map((n) => [n.position, n.status]));
  const best = avail.map((m) => ({ m, s: monsterOverall(m) + (needs[m.position] === 'short' ? 6 : needs[m.position] === 'thin' ? 3 : 0) + ((f.draft.revealed[m.id] || 0) >= 6 ? m.potential || 0 : 0) / 20 })).sort((a, b) => b.s - a.s)[0].m;
  return { id: best.id, text: `${$t('franchise.suggested_ovr', { name: best.name, position: best.position, monsterOverall: monsterOverall(best) })}${needs[best.position] !== 'ok' ? `${$t('franchise.a_position_where_you_need_depth')}` : $t('franchise.the_best_scouted_monster_left')}.` };
}

/** Guided: re-sign or let go, for one expiring monster contract. */
export function suggestContract(f, item) {
  if (!suggestionsOn(f) || item.kind !== 'monster') return null;
  const m = f.roster.find((x) => x.id === item.id); if (!m) return null;
  const peers = f.roster.filter((x) => x.position === m.position && x.id !== m.id).map(monsterOverall).sort((a, b) => b - a);
  const starter = peers.length < (F.GROUP_SLOTS[m.position]?.length || 1) || monsterOverall(m) >= (peers[(F.GROUP_SLOTS[m.position]?.length || 1) - 1] ?? 0);
  const fits = !F.salarySummary(f, item.ask - (m.salary || 0)).over;
  if (starter && fits) return { choice: 'sign', text: `${$t('franchise.suggested_re_sign_is_one_of', { name: m.name, position: m.position })}` };
  if (!fits) return { choice: starter ? 'counter' : 'walk', text: starter ? $t('franchise.suggested_counter_the_ask_does_not') : $t('franchise.suggested_let_go_a_backup_whose') };
  return { choice: 'either', text: `${$t('franchise.your_call_is_a_backup_re', { name: m.name, position: m.position, amount: fmt(item.ask) })}` };
}

/** Guided: which Board goal to commit to, and why (the owner still chooses). */
export function suggestGoal(f, offers) {
  if (!suggestionsOn(f) || !offers?.length) return null; const safe = offers.find((o) => o.tier === 'safe'); if (!safe) return null;
  const hot = (f.board?.confidence ?? 0) <= -1;
  return { id: safe.id, text: hot ? `${$t('franchise.suggested_you_are_on_the_hot', { label: safe.label })}` : `${$t('franchise.suggested_the_forecast_for_a_club', { label: safe.label })}` };
}

/** A routine consequence line, or '' when the player turned them off. */
export function consequence(f, kind, data = {}) {
  if (!consequencesOn(f)) return '';
  const cap = F.salarySummary(f, data.salary || 0);
  switch (kind) {
    case 'sign': return `${$t('franchise.signing_adds_cr_a_season_for', { amount: fmt(data.salary), over: cap.over ? $t('franchise.none_over_the_cap') : fmt(cap.remaining) + ' cr', n: f.roster.length + 1, rosterMax: F.ROSTER_MAX })}`;
    case 'draft': return `${$t('franchise.a_rookie_deal_about_cr_a', { amount: fmt(data.salary || 0) })}`;
    case 'release': return $t('franchise.released_monsters_go_back_to_the');
    case 'walk': return $t('franchise.letting_a_contract_walk_frees_its');
    case 'skip-encounter': return $t('franchise.skipping_costs_nothing_no_battle_no');
    case 'goal': return data.hot ? $t('franchise.you_are_on_the_hot_seat') : $t('franchise.met_confidence_1_2_for_the');
    case 'trade': return $t('franchise.picks_you_trade_away_are_gone');
    default: return '';
  }
}
