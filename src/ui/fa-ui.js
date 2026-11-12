// Task 7 — the free-agency market screens (decisions 11, 12, 14, 19, 29, 30; specification "Interface").
// Simple by default: period, cap (total, committed, reserved, usable), position filter, each free agent's name, overall, position,
// rarity, fit, ask and interest, and a one-tap offer at his ask. Expandable: his priorities, the competing offers, bonus and term
// controls, the full cap schedule, the deadline and the negotiation history. Every block is explained with what to do about it.
// The GM Assistant only recommends and prepares offers: nothing is signed or spent without the owner's confirmation.
import { esc, toast, sheet, confirmSheet, delegate } from './dom.js';
import * as Router from './router.js';
import { monsterSprite } from './pixel-monster.js';
import * as F from '../franchise/franchise.js';
import * as E from '../franchise/fa-engine.js';
import { personaOf, PRIORITY_LABEL, responseWindow } from '../franchise/fa-personality.js';
import { allocateBonus, OFFER_STEP } from '../franchise/fa-contracts.js';
import { legendSide } from '../franchise/fa-legendary.js';
import { monsterOverall, resolveSpecies } from '../data/monsters.js';
import { lineupProblems, buildDepthChart } from '../franchise/roster.js';
import { positionOf } from '../data/personnel.js';
import { yearOf } from '../data/calendar.js';
import { t as $t, fieldText } from '../text/index.js';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-US');
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const STATE_LABEL = { pending: $t('market.waiting_for_his_answer'), countered: 'he countered', accepted: $t('market.accepted_waiting_for_your_legendary_to'), signed: 'signed', rejected: 'turned down', withdrawn: 'withdrawn', expired: 'expired' };
let filter = ''; let showAll = false; let keenOnly = false; // decision 14: the interest dashboard can show only those interested in your club

/** How keen he is on the owner's club at given terms: { label, cls, why[] } (a readable explanation, decision 30). */
export function interestOf(f, m, terms) {
  const r = E.rateOffer(f, m, f.club, terms); const p = personaOf(m); const ratio = r.score / (r.need || 1);
  const label = ratio >= 1 ? $t('market.interested') : ratio >= E.FA_RULES.counterBand ? $t('market.listening') : $t('market.not_interested'); const cls = ratio >= 1 ? 'good' : ratio >= E.FA_RULES.counterBand ? 'warn' : 'bad';
  const why = [];
  why.push(r.moneyRatio >= 1 ? $t('market.the_money_meets_his_ask') : r.moneyRatio >= E.FA_RULES.lowball ? $t('market.the_money_is_a_little_under') : $t('market.the_money_is_well_under_his'));
  const ask = E.askOf(f, m); if (terms.years !== ask.years) why.push(`${$t('market.he_would_rather_sign_for_seasons', { years: ask.years, n: ask.years })}`);
  const role = E.roleAt(f, f.club, m); why.push(role === 'starter' ? $t('market.he_would_start_for_you') : role === 'backup' ? $t('market.he_would_be_your_first_backup') : $t('market.he_would_be_depth_for_you'));
  if (p.winning >= 60) why.push(E.clubSuccess(f, f.club) >= 0.5 ? $t('market.he_likes_that_your_club_wins') : $t('market.winning_matters_to_him_your_record'));
  return { label, cls, why, ratio };
}
const rarityOf = (m) => { try { return resolveSpecies(m).rarity; } catch { return 'common'; } };
const fitOf = (f, m) => { const role = E.roleAt(f, f.club, m); let scheme = null; try { scheme = F.fitFor(f, m)?.fits; } catch { /* no scheme read */ } return `${role === 'starter' ? $t('market.would_start') : role === 'backup' ? 'first backup' : 'depth'}${scheme === true ? $t('market.fits_your_scheme') : scheme === false ? $t('market.off_scheme') : ''}`; }; // team fit: role from the actual roster, scheme where the game has one

/** The cap line the market shows: total, committed, reserved by live offers, usable. */
export function capPanelHtml(f) {
  const c = F.freeAgencyCap(f); const pct = (x) => Math.max(0, Math.min(100, Math.round(x / c.cap * 100)));
  return `<div class="panel tight"><div class="row between">${$t('market.b_cap_b', { amount: fmt(c.cap) })}<span class="dim">league year ${yearOf(c.leagueYear)}</span></div>
    <div class="bar ${c.usable < 0 ? 'bad' : c.usable < c.cap * 0.05 ? 'warn' : ''}" style="margin:6px 0"><i style="width:${pct(c.committed)}%"></i></div>
    <div class="row between muted" style="flex-wrap:wrap;gap:6px"><span>${$t('market.committed', { amount: fmt(c.committed) })}</span><span>${$t('market.reserved', { amount: fmt(c.reserved) })}</span><span style="color:${c.usable < 0 ? 'var(--bad)' : 'var(--good)'}">${$t('market.usable', { amount: fmt(c.usable) })}</span></div>
    ${(() => { const d = F.draftReserve(f); return d.picks ? `<div class="row between muted" style="margin-top:4px"><span>${$t('market.draft_reserve_picks', { picks: d.picks, n: d.picks })}</span><span>≈ ${fmt(d.total)}</span></div><div class="dim" style="font-size:12px">${$t('market.what_your_remaining_picks_are_expected', { estimate: d.estimate ? $t('market.at_the_board_prospect_for_each') : '' })}</div>` : ''; })()}
    <div class="dim" style="font-size:12px">${$t('market.a_live_offer_reserves_his_first')}</div></div>`;
}

/** The GM Assistant (decision 19): up to three recommendations from your needs and cap; it never signs anything. */
export function assistantHtml(f) {
  if (!f.settings?.gmAssistant) return '';
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const holes = lineupProblems(f.roster, chart).map(positionOf);
  const count = {}; for (const m of f.roster) count[m.position] = (count[m.position] || 0) + 1;
  const thin = POS.filter((p) => (count[p] || 0) < (p === 'K' ? 1 : p === 'QB' || p === 'RB' || p === 'TE' ? 2 : 3));
  const usable = F.freeAgencyCap(f).usable; const want = [...new Set([...holes, ...thin])];
  const recs = []; for (const pos of want) { const best = F.freeAgentMarket(f).filter((x) => x.monster.position === pos && !x.mine && x.ask.salary <= usable).sort((a, b) => monsterOverall(b.monster) - monsterOverall(a.monster))[0]; if (best) recs.push({ pos, x: best, hole: holes.includes(pos) }); if (recs.length >= 3) break; }
  const warn = F.lineupWarnings(f); const warnHtml = warn.length ? `<div class="dim" style="margin-top:4px">${warn.map((x) => `<b>${esc(x.slot)}</b> ${esc(x.formation)}: ${esc(x.fix)}`).join('<br>')}</div>` : '';
  return extensionAdviceHtml(f) + `<div class="panel tight">${$t('market.b_gm_assistant_b')} <span class="dim">recommendations only</span>${warnHtml}${recs.length ? `<div class="list" style="margin-top:4px">${recs.map(({ pos, x, hole }) => `<div class="item static"><div class="grow"><div class="name">${esc(x.monster.name)} <span class="dim">${$t('market.ovr_asks', { pos, monsterOverall: monsterOverall(x.monster), amount: fmt(x.ask.salary) })}</span></div><div class="sub">${hole ? `${$t('market.you_have_no_healthy_for_a', { pos })}` : `${$t('market.you_are_thin_at', { pos })}`}</div></div><button class="btn small" data-action="faopen" data-id="${x.monster.id}">${$t('market.prepare_offer')}</button></div>`).join('')}</div>` : `<div class="dim">${$t('market.nothing_urgent_within_your_usable_cap')}</div>`}</div>`;
}

/** The owner's live offers. */
function myOffersHtml(f) {
  const mine = E.liveOffers(f, (o) => o.club === f.club); if (!mine.length) return '';
  return `<h3>${$t('market.your_offers', { n: mine.length })}</h3><div class="list">${mine.map((o) => { const u = E.unsigned(f, o.mid); const m = u?.m; if (!m) return '';
    return `<div class="item tappable" data-action="faopen" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${esc(m.name)} <span class="dim">${$t('market.ovr', { position: esc(m.position), monsterOverall: monsterOverall(m) })}</span></div><div class="sub">${fmt(o.salary)}/yr × ${o.years}${o.bonus ? ` ${$t('market.bonus', { amount: fmt(o.bonus) })}` : ''} ${$t('market.b_b_answers_by_period', { stateLabel: STATE_LABEL[o.state], expires: o.expires })}</div></div>${o.state === 'countered' ? '<span class="chip warn">counter</span>' : ''}</div>`; }).join('')}</div>`;
}

/** R3 (owner 2026-11-05): a monster's renewal outlook in his contract's final season — the same evaluation his extension or renewal gets
 *  (his ask, his preferred term, the club's role for him and its results), as Interested, Listening or Not interested. */
export function renewalOutlook(f, m) {
  if (!f.freeAgency?.v || !E.extensionEligible(f, m)) return null; const neg = F.extensionTalks(f, m.id); if (!neg) return null;
  const ask = E.askOf(f, m); const terms = { ...neg.demand };
  if (neg.state === 'no-talks') return { label: $t('market.not_interested'), cls: 'bad', why: [fieldText(neg, 'clue'), $t('market.he_does_not_want_to_discuss')], ratio: 0, terms, talks: false, clue: fieldText(neg, 'clue'), state: neg.state, left: 0 };
  if (neg.state === 'ended') return { label: $t('market.not_interested'), cls: 'bad', why: [$t('market.talks_ended_in_this_window_a')], ratio: 0, terms, talks: false, clue: null, state: neg.state, left: 0 };
  const ratio = ask.salary / Math.max(1, neg.demand.salary); const label = ratio >= 1 / 1.05 ? $t('market.interested') : $t('market.listening');
  const clue = ratio < 0.9 ? $t('market.he_is_looking_for_a_stronger') : fieldText(neg, 'clue');
  return { label, cls: label === $t('market.interested') ? 'good' : 'warn', why: [clue, `${$t('market.he_opens_at_yr_for_seasons', { amount: fmt(neg.opening.salary), years: neg.opening.years, left: neg.left, left2: neg.left === 1 ? '' : 's', n: neg.opening.years })}`], ratio, terms, talks: true, clue, state: neg.state, left: neg.left };
}
/** R3: the GM Assistant's extension advice (optional, recommendations only): core monsters in their final season who are Interested now. */
export function extensionAdviceHtml(f, { action = 'faopen' } = {}) {
  if (!f.settings?.gmAssistant || !f.freeAgency?.v) return '';
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const starters = new Set(Object.values(chart).filter(Boolean));
  const core = f.roster.map((m) => ({ m, o: renewalOutlook(f, m) })).filter(({ m, o }) => o && (starters.has(m.id) || ((m.age || 30) <= 25 && (m.potential || 0) >= monsterOverall(m) + 5)));
  if (!core.length) return '';
  const row = ({ m, o }) => `<div class="item static"><div class="grow"><div class="name">${esc(m.name)} <span class="dim">${$t('market.ovr_age', { position: esc(m.position), monsterOverall: monsterOverall(m), age: m.age })}</span></div><div class="sub"><span class="chip ${o.cls}">${o.label}</span> ${$t('market.at_yr', { amount: fmt(o.terms.salary), years: o.terms.years, label: o.label === $t('market.interested') ? $t('market.a_good_moment_to_extend') : o.label === $t('market.listening') ? $t('market.he_may_counter') : $t('market.he_would_likely_say_no_now') })}</div></div><button class="btn small" data-action="${action}" data-id="${m.id}">${$t('market.extend')}</button></div>`;
  return `<div class="panel tight">${$t('market.b_gm_assistant_extensions_b')} <span class="dim">${$t('market.recommendations_only_nothing_is_offered_without')}</span><div class="list" style="margin-top:4px">${core.sort((a, b) => b.o.ratio - a.o.ratio).slice(0, 6).map(row).join('')}</div></div>`;
}

/** The single-position migration report (owner 2026-11-05), shown in the offseason it ran: who moved, and any open starting slot. */
export function migrationPanelHtml(f) {
  const r = f.positionMigration; if (!r || r.year !== f.season?.year || !f.season?.finished || (!r.owner?.length && !r.ownerHoles?.length)) return '';
  const rows = (r.owner || []).slice(0, 12).map((x) => `<div class="muted">${esc(x.name)}: ${esc(x.from)} → <b>${esc(x.to)}</b></div>`).join('');
  return `<div class="panel tight" style="border-color:var(--warn)">${$t('market.b_one_position_per_family_b')}<div class="muted">${$t('market.every_monster_now_plays_its_species', { n: r.owner.length })}</div>${rows}${r.owner.length > 12 ? `<div class="dim">${$t('market.and_more', { n: r.owner.length - 12 })}</div>` : ''}${r.ownerHoles?.length ? `<div class="muted" style="color:var(--bad);margin-top:4px">${$t('market.open_starting_slots')} ${r.ownerHoles.map(esc).join(', ')}${$t('market.fill_them_in_free_agency_or')}</div>` : ''}</div>`;
}

/** The roster minimum against the cap (owner rule 2026-11-04): what is missing, and the releases the owner may choose, with their savings. */
export function floorPanelHtml(f) {
  if (!F.freeAgencyDone(f)) return '';
  const p = F.rosterFloorPlan(f); if (!p.short) return '';
  const head = `${$t('market.b_roster_minimum_of_b', { n: f.roster.length, rosterMin: F.ROSTER_MIN })}`;
  if (!p.enough) return `<div class="panel tight" style="border-color:var(--bad)">${head}<div class="muted">${$t('market.the_market_has_fewer_than_free', { short: p.short })}</div></div>`;
  if (!p.gap) return `<div class="panel tight" style="border-color:var(--warn)">${head}<div class="muted">${$t('market.sign_more_the_cheapest_free_agents', { short: p.short, short2: p.short, amount: fmt(p.needed), amount2: fmt(p.usable) })}</div></div>`;
  const rows = p.releases.slice(0, 6).map((x) => `<div class="item static"><div class="grow"><div class="name">${esc(x.name)} <span class="dim">${$t('market.ovr_2', { position: esc(x.position), ovr: x.ovr })}</span></div><div class="sub">${$t('market.frees_b_b_cr', { amount: fmt(x.saving) })} ${x.gapAfter ? `${$t('market.then_still_cr_short', { amount: fmt(x.gapAfter) })}` : $t('market.then_the_cheapest_replacements_fit')}</div></div><button class="btn small" data-action="fafloorrel" data-id="${x.id}">${$t('market.release')}</button></div>`).join('');
  return `<div class="panel tight" style="border-color:var(--bad)">${head}<div class="muted">${$t('market.you_need_more_the_cheapest_free', { short: p.short, short2: p.short, amount: fmt(p.needed), amount2: fmt(Math.max(0, p.usable)), amount3: fmt(p.gap), rosterMin: F.ROSTER_MIN })}</div><div class="list" style="margin-top:6px">${rows}</div><div class="dim" style="margin-top:4px">${$t('market.each_release_is_one_more_monster')}</div></div>`;
}

/** The free-agency section of the Task 7 offseason screen. */
export function faOffseasonHtml(f) {
  if (!F.task7Offseason(f)) return null;
  const pending = F.offseasonPending(f).length; const open = F.freeAgencyOpen(f); const done = F.freeAgencyDone(f); const p = f.freeAgency.period;
  const comp = F.legendCompliance(f);
  const compHtml = comp ? `<div class="panel tight" style="border-color:var(--bad)">${$t('market.b_legendary_limit_b')}<div class="muted">${esc(comp.reason)}${comp.due ? '' : ` ${$t('market.until_then_you_keep_them_but')}`}</div><div class="row" style="gap:6px;margin-top:6px"><button class="btn small" data-action="releasemon">${$t('market.release')}</button><button class="btn small" data-action="shop">${$t('market.trade_desk')}</button></div></div>` : '';
  if (!open && !done) return `${compHtml}<h3>${$t('market.free_agency')}</h3><div class="panel tight">${$t('market.b_five_periods_before_the_draft')}<div class="dim">${$t('market.every_club_bids_in_the_same')}</div><button class="btn primary block" data-action="faopenmarket" ${pending ? 'disabled' : ''} style="margin-top:6px">${$t('market.open_free_agency_period_1')}</button>${pending ? `<p class="dim center">${$t('market.settle_the_renewals_first', { pending, n: pending })}</p>` : ''}</div>`;
  const list = F.freeAgentMarket(f).filter((x) => !filter || x.monster.position === filter).map((x) => ({ x, i: interestOf(f, x.monster, x.ask) })).filter(({ i }) => !keenOnly || i.ratio >= 1).sort((a, b) => monsterOverall(b.x.monster) - monsterOverall(a.x.monster));
  const shown = showAll ? list : list.slice(0, 25);
  const head = open ? `<div class="row between">${$t('market.b_free_agency_period_of_b', { p, periods: E.FA_RULES.periods })}<span class="dim">${F.freeAgentMarket(f).length} unsigned</span></div>` : `<div class="row between">${$t('market.b_free_agency_closed_b')}<span class="dim">${$t('market.unsigned_monsters_stay_on_the_market')}</span></div>`;
  return `${compHtml}${floorPanelHtml(f)}<h3>${$t('market.free_agency')}</h3>${head}${capPanelHtml(f)}${assistantHtml(f)}${myOffersHtml(f)}
    <div class="row" style="gap:4px;flex-wrap:wrap;margin:6px 0"><button class="btn small ${filter ? '' : 'primary'}" data-action="fafilter" data-v="">${$t('market.all')}</button>${POS.map((x) => `<button class="btn small ${filter === x ? 'primary' : ''}" data-action="fafilter" data-v="${x}">${x}</button>`).join('')}<button class="btn small ${keenOnly ? 'primary' : ''}" data-action="fakeen" aria-pressed="${keenOnly}">${$t('market.interested_in_you')}</button><button class="btn small ${f.settings?.gmAssistant ? 'primary' : ''}" data-action="faassist" aria-pressed="${f.settings?.gmAssistant ? 'true' : 'false'}" style="margin-left:auto">${$t('market.gm_assistant', { settings: f.settings?.gmAssistant ? 'On' : $t('market.off') })}</button></div>
    <div class="list">${shown.map(({ x, i }) => { const m = x.monster; const rival = x.offers.filter((o) => o.club !== f.club).length; const legend = legendSide(m);
      return `<div class="item tappable" data-action="faopen" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${legend ? '🌟 ' : ''}${esc(m.name)} <span class="dim">${esc(m.position)} · ${monsterOverall(m)} OVR · ${esc(rarityOf(m))} · age ${m.age}</span></div><div class="sub">${$t('market.asks_b_b_yr_seasons', { amount: fmt(x.ask.salary), years: x.ask.years, fit: fitOf(f, m), n: x.ask.years })}${rival ? ` ${$t('market.other_offers', { rival, n: rival })}` : ''}</div></div><span class="chip ${i.cls}">${i.label}</span></div>`; }).join('') || `<p class="dim">${$t('market.nobody_on_the_market_at_this')}</p>`}</div>
    ${list.length > shown.length ? `<button class="btn small block" data-action="faall">${$t('market.show_all', { n: list.length })}</button>` : ''}
    ${open ? `<div class="row" style="gap:6px;margin-top:10px"><button class="btn primary grow" data-action="faadvance">${p >= E.FA_RULES.periods ? $t('market.close_free_agency') : `${$t('market.advance_to_period', { p: p + 1 })}`}</button><button class="btn" data-action="fafinish">${$t('market.finish_now')}</button></div>` : ''}`;
}

/** The negotiation sheet: simple terms first, the rest expandable. `mode`: 'offer' (periods), 'now' (immediate), 'extend'. */
export function negotiationSheet(app, id, onDone, { mode = null } = {}) {
  const f = app.f; const inRoster = f.roster.find((x) => x.id === id); const u = E.unsigned(f, id);
  const m = inRoster || u?.m; if (!m) return;
  mode ||= inRoster ? 'extend' : F.freeAgencyOpen(f) ? 'offer' : 'now';
  const ask = E.askOf(f, m); const mine = E.liveOffers(f, (o) => o.club === f.club && o.mid === id)[0] || null;
  const talks = () => (mode === 'extend' ? F.extensionTalks(f, id) : mode === 'renew' ? F.renewalTalks(f, id) : null); // the negotiation as it stands (owner 2026-11-05, 13:23)
  const n0 = talks();
  const t = { salary: mine?.salary ?? n0?.demand?.salary ?? ask.salary, years: mine?.years ?? n0?.demand?.years ?? ask.years, bonus: mine?.bonus ?? n0?.demand?.bonus ?? 0 };
  const p = personaOf(m);
  const draw = () => {
    const neg = talks(); const negHtml = neg ? negotiationPanel(neg) : '';
    const it = (() => { if (mode === 'renew') return interestOf(f, m, t); if (mode !== 'extend') return interestOf(f, m, t); const tk = E.talksOpen(f, m, f.club); return tk.open ? interestOf(f, m, t) : { label: $t('market.not_interested'), cls: 'bad', why: [fieldText(tk, 'clue'), $t('market.he_is_not_ready_to_discuss')], ratio: 0 }; })(); const block = mode === 'extend' || mode === 'renew' ? null : E.blocker(f, f.club, m, t, { own: mine, final: mode === 'now' });
    const sched = (() => { const start = mode === 'extend' ? (m.contract?.ends ?? 0) + 1 : mode === 'renew' ? f.season.year + 1 : (f.freeAgency?.leagueYear ?? f.season.year); const a = allocateBonus(t.bonus, t.years); return a.map((b, i) => ({ year: start + i, salary: t.salary, bonus: b, total: t.salary + b })); })();
    const rivals = E.competingOffers(f, id).filter((o) => o.club !== f.club);
    const hist = mine?.history || [];
    const deadline = mine ? mine.expires : mode === 'offer' ? E.deadlineFor(f, m) : null;
    const blockHtml = block ? `<div class="panel tight" style="border-color:var(--bad)">${$t('market.b_cant_yet_b', { mode: mode === 'offer' ? 'offer' : 'sign' })}<div class="muted">${esc(block.reason)}</div>${block.code === 'roster' ? `<button class="btn small" data-action="goroster">${$t('market.salary_contracts')}</button>` : block.code === 'legendary' ? `<button class="btn small" data-action="goroster">${$t('market.release_a_legendary')}</button>` : ''}</div>` : '';
    return `<div class="row" style="gap:12px">${monsterSprite(m, 56)}<div class="grow"><div style="font-size:18px;font-weight:900">${legendSide(m) ? '🌟 ' : ''}${esc(m.name)}</div><div class="muted">${esc(m.position)} · ${monsterOverall(m)} OVR · age ${m.age} · ${esc(rarityOf(m))}</div><div class="muted">${$t('market.asks_yr_for_seasons', { amount: fmt(ask.salary), years: ask.years, n: ask.years })}</div></div></div>
      <div class="panel tight"><div class="row between">${$t('market.b_salary_per_season_b')}<span><button class="btn small" data-t="sal" data-d="-1000">−1k</button> <b>${fmt(t.salary)}</b> <button class="btn small" data-t="sal" data-d="1000">+1k</button></span></div>
        <div class="row between" style="margin-top:6px">${$t('market.b_seasons_b')}<span class="seg">${[1, 2, 3].map((y) => `<button class="btn small ${t.years === y ? 'primary' : ''}" data-t="yrs" data-v="${y}">${y}</button>`).join('')}</span></div>
        <div class="row between" style="margin-top:6px">${$t('market.b_interest_b')}<span class="chip ${it.cls}">${it.label}</span></div><ul class="dim" style="margin:4px 0 0 16px;padding:0">${fieldText(it, 'why').map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        ${deadline ? `<div class="dim" style="margin-top:4px">${$t('market.he_answers_by_b_period_b', { deadline, mine: mode === 'offer' && !mine ? $t('market.his_patience_sets_it_revisions_keep') : '' })}</div>` : mode === 'now' ? `<div class="dim" style="margin-top:4px">${$t('market.outside_the_periods_he_answers_at')}</div>` : ''}</div>
      ${negHtml}${blockHtml}
      <details class="panel tight"><summary>${$t('market.b_advanced_b')} <span class="dim">${$t('market.bonus_priorities_competing_offers_cap_schedule')}</span></summary>
        <div class="row between" style="margin-top:6px">${$t('market.b_signing_bonus_b')}<span><button class="btn small" data-t="bon" data-d="-1000">−1k</button> <b>${fmt(t.bonus)}</b> <button class="btn small" data-t="bon" data-d="1000">+1k</button></span></div>
        <div class="dim" style="font-size:12px">${$t('market.paid_once_spread_over_the_seasons')}</div>
        <b style="display:block;margin-top:8px">${$t('market.what_he_wants_b')}${['money', 'security', 'role', 'winning', 'patience', 'timing'].map((k) => `<div class="attr"><span>${PRIORITY_LABEL[k]}</span><div class="bar"><i style="width:${p[k]}%"></i></div><b>${p[k]}</b></div>`).join('')}<div class="dim">${$t('market.career_stage_answers_within_periods', { stage: p.stage, responseWindow: responseWindow(m), n: responseWindow(m) })}</div>
        <b style="display:block;margin-top:8px">${$t('market.competing_offers_b')}${rivals.length ? rivals.map((o) => `<div class="muted">${esc(o.club)}: ${fmt(o.salary)}/yr × ${o.years}${o.bonus ? ` + ${fmt(o.bonus)}` : ''} · ${o.state}</div>`).join('') : `<div class="dim">${$t('market.none_from_other_clubs')}</div>`}
        <b style="display:block;margin-top:8px">${$t('market.cap_schedule_b')}${sched.map((r) => `<div class="row between muted"><span>${yearOf(r.year)}</span><span>${fmt(r.salary)} + ${fmt(r.bonus)} = <b>${fmt(r.total)}</b></span></div>`).join('')}
        ${hist.length ? `<b style="display:block;margin-top:8px">${$t('market.history_b')}${hist.map((h) => `<div class="dim">P${h.p ?? '–'} ${esc(h.act)}${h.salary ? ` · ${fmt(h.salary)} × ${h.years}${h.bonus ? ` + ${fmt(h.bonus)}` : ''}` : ''}</div>`).join('')}` : ''}
      </details>
      <div class="row" style="gap:6px;margin-top:8px">${mode === 'offer' ? (mine ? `<button class="btn primary grow" data-act="revise">${$t('market.revise_offer')}</button>${mine.state === 'countered' ? `<button class="btn grow" data-act="counter">${$t('market.accept_his_counter')}</button>` : ''}<button class="btn danger" data-act="withdraw">${$t('market.withdraw')}</button>` : `<button class="btn primary grow" data-act="offer" ${block ? 'disabled' : ''}>${$t('market.make_offer')}</button>`) : mode === 'extend' || mode === 'renew' ? negButtons(neg, mode) : `<button class="btn primary grow" data-act="now" ${block ? 'disabled' : ''}>${$t('market.offer_now')}</button>`}</div>`;
  };
  const { el, close } = sheet(draw(), { title: mode === 'extend' ? $t('market.contract_extension') : mode === 'renew' ? $t('market.contract_renewal') : $t('market.free_agent') }); let advOpen = false;
  const root = () => el;
  const redraw = () => { const body = el.querySelector('.sheet-body') || el; advOpen = !!el.querySelector('details')?.open; body.innerHTML = draw(); if (advOpen) el.querySelector('details')?.setAttribute('open', ''); };
  const done = (msg, kind = 'good') => { app.save({ immediate: true }); toast(msg, kind); close(); onDone?.(); };
  root()?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.t === 'sal') { t.salary = Math.max(OFFER_STEP, t.salary + Number(b.dataset.d)); redraw(); return; }
    if (b.dataset.t === 'bon') { t.bonus = Math.max(0, t.bonus + Number(b.dataset.d)); redraw(); return; }
    if (b.dataset.t === 'yrs') { t.years = Number(b.dataset.v); redraw(); return; }
    if (b.dataset.action === 'goroster') { close(); Router.go('contracts'); return; }
    const act = b.dataset.act; if (!act) return; let r;
    if (act === 'offer') { r = F.offerFreeAgent(f, id, t); if (r.ok) return done(`${$t('market.offer_made_he_answers_by_period', { expires: r.offer.expires })}`); }
    if (act === 'revise') { r = F.reviseFreeAgentOffer(f, mine.id, t); if (r.ok) return done($t('market.offer_revised_same_deadline')); }
    if (act === 'counter') { r = F.acceptFreeAgentCounter(f, mine.id); if (r.ok) return done($t('market.you_took_his_counter_he_answers')); }
    if (act === 'withdraw') { if (!(await confirmSheet(`${$t('market.withdraw_your_offer_to_the_reserved', { name: m.name })}`, { title: $t('market.withdraw'), okLabel: $t('market.withdraw'), danger: true }))) return; r = F.withdrawFreeAgentOffer(f, mine.id); if (r.ok) return done($t('market.offer_withdrawn'), 'info'); }
    if (act === 'acceptdemand' || act === 'renewoffer') {
      r = mode === 'extend' ? F.extendContract(f, id, t, { accept: act === 'acceptdemand' }) : F.resolveContract(f, id, act === 'acceptdemand' ? 'sign' : 'offer', act === 'acceptdemand' ? {} : { salary: t.salary, years: t.years, bonus: t.bonus });
      if (r.ok && (r.outcome === 'signed' || r.status === 'signed')) return done(mode === 'extend' ? `${m.name} extended.` : `${$t('market.re_signed', { name: m.name })}`);
      if (r.ok && (r.outcome === 'countered' || r.status === 'countered')) { Object.assign(t, r.counter); toast(`${$t('market.he_counters_yr_for', { amount: fmt(r.counter.salary), years: r.counter.years })}`, 'info'); redraw(); return; }
      if (r.ok) { toast(r.reason || (r.status === 'declined' ? $t('market.he_ends_the_talks_and_will') : $t('market.he_ends_the_talks_for_now')), 'bad'); redraw(); onDone?.(); return; }
    }
    if (act === 'now' || act === 'extend') {
      r = act === 'now' ? F.negotiateFreeAgent(f, id, t) : F.extendContract(f, id, t);
      if (r.ok && r.outcome === 'signed') return done(act === 'now' ? `${m.name} signed.` : `${m.name} extended.`);
      if (r.ok && r.outcome === 'countered') { Object.assign(t, r.counter); toast(`${$t('market.he_counters_yr_for', { amount: fmt(r.counter.salary), years: r.counter.years })}`, 'info'); redraw(); return; }
      if (r.ok) { toast(r.reason || $t('market.he_turned_it_down'), 'bad'); redraw(); return; }
    }
    if (r && !r.ok) toast(r.reason, 'bad');
  });
}

/** The negotiation as the owner sees it: opening demand, his current demand, the offers made and his answers, attempts left, status. */
function negotiationPanel(neg) {
  const st = neg.state === 'active' ? $t('market.negotiating') : neg.state === 'agreed' ? $t('market.agreed') : neg.state === 'no-talks' ? (neg.window === 'renew' ? $t('market.not_negotiating_he_will_test_free') : $t('market.not_negotiating_in_this_window')) : neg.window === 'renew' ? $t('market.ended_he_will_test_free_agency') : $t('market.ended_for_this_window');
  const ans = { accept: 'accepted', counter: 'countered', end: $t('market.ended_the_talks') };
  return `<div class="panel tight"><div class="row between">${$t('market.b_negotiation_b')}<span class="chip ${neg.state === 'active' ? 'warn' : neg.state === 'agreed' ? 'good' : 'bad'}">${esc(st)}</span></div>
    <div class="row between muted"><span>${$t('market.opening_demand')}</span><span>${fmt(neg.opening.salary)}/yr × ${neg.opening.years}</span></div>
    ${neg.demand.salary !== neg.opening.salary || neg.demand.bonus ? `<div class="row between muted"><span>${$t('market.his_latest_counter')}</span><b>${fmt(neg.demand.salary)}/yr × ${neg.demand.years}${neg.demand.bonus ? ` + ${fmt(neg.demand.bonus)}` : ''}</b></div>` : ''}
    ${neg.offers.filter((o) => !o.free).map((o, i) => `<div class="row between dim"><span>${$t('market.your_counteroffer', { i: i + 1 })}</span><span>${fmt(o.salary)} × ${o.years}${o.bonus ? ` + ${fmt(o.bonus)}` : ''} · ${ans[o.answer] || o.answer}</span></div>`).join('')}
    <div class="row between muted"><span>${$t('market.counteroffers_left')}</span><b>${neg.left}</b></div>
    ${neg.state === 'no-talks' && fieldText(neg, 'clue') ? `<div class="dim">${esc(fieldText(neg, 'clue'))}</div>` : ''}
    <div class="dim" style="font-size:12px">${$t('market.accepting_his_demand_is_binding_and')}</div></div>`;
}
function negButtons(neg, mode) {
  if (!neg || neg.state !== 'active') return `<button class="btn grow" disabled>${neg?.state === 'agreed' ? $t('market.agreed') : $t('market.talks_closed')}</button>`;
  return `<button class="btn primary grow" data-act="acceptdemand">${$t('market.accept_yr', { amount: fmt(neg.demand.salary) })}</button><button class="btn grow" data-act="renewoffer" ${neg.left ? '' : 'disabled'}>${$t('market.counteroffer_left', { left: neg.left })}</button>`;
}

/** Handlers the offseason screen delegates (kept here with the markup they serve). */
export function faHandlers(app, Router) {
  return {
    faopenmarket: () => { const r = F.openFreeAgency(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save({ immediate: true }); Router.render(); }, // a checkpoint around each period step (specification: persistence)
    faopen: (el) => negotiationSheet(app, el.dataset.id, () => Router.render()),
    fafloorrel: async (el) => { // owner rule 2026-11-04: the owner chooses each release; nothing is released automatically
      const x = F.rosterFloorPlan(app.f).releases.find((r) => r.id === el.dataset.id); if (!x) return;
      if (!(await confirmSheet(`${$t('market.release_ovr_his_cr_charge_leaves', { name: x.name, position: x.position, ovr: x.ovr, amount: fmt(x.saving) })}`, { title: $t('market.release_to_make_cap_room'), okLabel: $t('market.release_2') }))) return;
      const r = F.releaseMonster(app.f, x.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save({ immediate: true }); toast(`${$t('market.released_cr_freed', { name: x.name, amount: fmt(x.saving) })}`, 'info'); Router.render();
    },
    fafilter: (el) => { filter = el.dataset.v || ''; Router.render(); },
    faall: () => { showAll = true; Router.render(); },
    fakeen: () => { keenOnly = !keenOnly; Router.render(); },
    faassist: () => { app.f.settings ||= {}; app.f.settings.gmAssistant = !app.f.settings.gmAssistant; app.save(); Router.render(); },
    faadvance: async () => {
      const w = F.advanceWarning(app.f); const last = app.f.freeAgency.period >= E.FA_RULES.periods;
      if (w.length && !(await confirmSheet(`${$t('market.of_your_offers_will_be_answered', { n: w.length, last: last ? $t('market.and_the_market_closes') : '' })}`, { title: $t('market.pending_offers'), okLabel: $t('market.advance') }))) return;
      const r = F.advanceFreeAgency(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save({ immediate: true });
      const mine = r.signed.filter((x) => x.club === app.f.club); for (const s of r.signed) { const m = app.f.roster.find((x) => x.id === s.mid) || null; if (m && legendSide(m)) toast(`${$t('market.legendary_signing_joins', { name: m.name, club: s.club })}`, 'good', 4000); }
      toast(mine.length ? `${$t('market.signed')} ${mine.map((x) => x.name).join(', ')}.` : r.period ? `${$t('market.period_of', { period: r.period, periods: E.FA_RULES.periods })}` : $t('market.free_agency_closed_the_draft_is'), mine.length ? 'good' : 'info'); Router.render();
    },
    fafinish: async () => { const w = E.liveOffers(app.f, (o) => o.club === app.f.club); /* finishing settles every live offer, not only those due this period */ if (!(await confirmSheet(`${$t('market.finish_free_agency_now_every_remaining')}${w.length ? `${$t('market.live_offers_of_yours_will_be', { n: w.length })}` : ''}.`, { title: $t('market.finish_free_agency'), okLabel: $t('market.finish') }))) return; F.finishFreeAgency(app.f); app.save({ immediate: true }); Router.render(); },
  };
}

/** The year-round market screen (decision 9): the offseason periods when they run, else immediate negotiation (decision 17). */
export function registerFaScreens(R, app) {
  R.registerScreen('famarket', {
    title: $t('market.free_agent_market'),
    render({ f }) {
      if (!f.freeAgency?.v) return `<p class="dim">${$t('market.the_free_agent_market_arrives_with')}</p>`;
      const t7Off = F.task7Offseason(f) && f.season.finished;
      if (t7Off) return faOffseasonHtml(f) || '';
      return `<p class="muted">${$t('market.unsigned_monsters_are_on_the_market')}</p>${capPanelHtml(f)}${assistantHtml(f)}${marketListHtml(f)}`;
    },
    mount(root) { delegate(root, faHandlers(app, R)); },
  });
}
function marketListHtml(f) {
  const list = F.freeAgentMarket(f).filter((x) => !filter || x.monster.position === filter).map((x) => ({ x, i: interestOf(f, x.monster, x.ask) })).filter(({ i }) => !keenOnly || i.ratio >= 1).sort((a, b) => monsterOverall(b.x.monster) - monsterOverall(a.x.monster));
  const shown = showAll ? list : list.slice(0, 25);
  return `<div class="row" style="gap:4px;flex-wrap:wrap;margin:6px 0"><button class="btn small ${filter ? '' : 'primary'}" data-action="fafilter" data-v="">${$t('market.all')}</button>${POS.map((x) => `<button class="btn small ${filter === x ? 'primary' : ''}" data-action="fafilter" data-v="${x}">${x}</button>`).join('')}<button class="btn small ${keenOnly ? 'primary' : ''}" data-action="fakeen" aria-pressed="${keenOnly}">${$t('market.interested_in_you')}</button><button class="btn small ${f.settings?.gmAssistant ? 'primary' : ''}" data-action="faassist" aria-pressed="${f.settings?.gmAssistant ? 'true' : 'false'}" style="margin-left:auto">${$t('market.gm_assistant', { settings: f.settings?.gmAssistant ? 'On' : $t('market.off') })}</button></div>
    <div class="list">${shown.map(({ x, i }) => { const m = x.monster; return `<div class="item tappable" data-action="faopen" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${legendSide(m) ? '🌟 ' : ''}${esc(m.name)} <span class="dim">${esc(m.position)} · ${monsterOverall(m)} OVR · ${esc(rarityOf(m))} · age ${m.age}</span></div><div class="sub">${$t('market.asks_b_b_yr_seasons', { amount: fmt(x.ask.salary), years: x.ask.years, fit: fitOf(f, m), n: x.ask.years })}</div></div><span class="chip ${i.cls}">${i.label}</span></div>`; }).join('') || `<p class="dim">${$t('market.nobody_on_the_market_at_this')}</p>`}</div>
    ${list.length > shown.length ? `<button class="btn small block" data-action="faall">${$t('market.show_all', { n: list.length })}</button>` : ''}`;
}

/**
 * The lineup safeguard (owner's final Task 7 decision): shown before a game that would be forfeited, or before a season that would start
 * into forfeits. It names each open starting slot and why, lists the cheapest legal free agents for it (with cap and roster status),
 * opens the signing sheet, the contracts screen (releases, zero dead cap) and the lineup, re-checks after every move, and offers a
 * deliberate, confirmed way to continue under the existing forfeit rule. It never signs, releases or moves anyone by itself.
 * `mode`: 'game' (Sunday) or 'season' (the season start). `onContinue`: the deliberate continue (forfeit the game / start anyway).
 */
export function lineupGateSheet(app, { mode = 'game', onContinue, onDone } = {}) {
  const f = app.f; let closed = false;
  const body = () => {
    const g = F.lineupGate(f);
    if (g.ok) return `<div class="panel tight" style="border-color:var(--good)">${$t('market.b_lineup_complete_b')}<div class="muted">${$t('market.every_starting_slot_has_a_legal')}</div></div><button class="btn primary block" data-act="close">${$t('market.continue')}</button>`;
    const holes = g.holes.map((h) => {
      const list = g.fixes[h.position] || [];
      const rows = list.map((x) => `<div class="item static"><div class="grow"><div class="name">${esc(x.name)} <span class="dim">${$t('market.ovr_2', { position: esc(h.position), ovr: x.ovr })}</span></div><div class="sub">${$t('market.asks_yr', { amount: fmt(x.ask) })} ${x.fits ? $t('market.fits_your_usable_cap') : `${$t('market.needs_more_usable_cap_release_a', { amount: fmt(x.short) })}`}${x.needsRoomOnRoster ? $t('market.roster_full_release_a_monster_first') : ''}</div></div>${g.canSign ? `<button class="btn small" data-act="sign" data-id="${x.id}">${$t('market.sign')}</button>` : ''}</div>`).join('');
      return `<div class="panel tight">${$t('market.b_needs_a_b', { slot: esc(h.slot), position: esc(h.position) })}<div class="muted">${h.healthy} healthy ${esc(h.position)}${h.injured ? `${$t('market.injured', { injured: h.injured })}` : ''}${$t('market.only_a_may_play_there_nobody', { position: esc(h.position) })}</div>
        ${rows ? `<div class="list" style="margin-top:4px">${rows}</div>` : `<div class="muted" style="margin-top:4px;color:var(--bad)">${$t('market.no_healthy_is_on_the_market', { position: esc(h.position) })}</div>`}</div>`;
    }).join('');
    const short = g.shortRoster ? `<div class="panel tight">${$t('market.b_roster_below_the_minimum_b')}<div class="muted">${esc(g.reason)}</div></div>` : '';
    const periods = !g.canSign ? `<div class="dim">${$t('market.during_the_free_agency_periods_you')}</div>` : '';
    const cont = mode === 'game' ? $t('market.forfeit_this_game') : $t('market.start_the_season_anyway');
    return `<div class="assist-note critical" role="alert">⚠️ ${esc(g.reason)}</div>
      <div class="muted" style="margin:6px 0">${$t('market.usable_cap_roster', { amount: fmt(g.cap), roster: g.roster, rosterMax: F.ROSTER_MAX })}</div>${short}${holes}${periods}
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn small" data-act="market">${$t('market.free_agent_market')}</button><button class="btn small" data-act="contracts">${$t('market.release_a_monster')}</button><button class="btn small" data-act="lineup">${$t('market.lineup')}</button></div>
      <div class="dim" style="margin-top:8px">${mode === 'game' ? $t('market.if_you_continue_without_a_legal') : $t('market.if_you_start_without_a_legal')}</div>
      <button class="btn danger block" data-act="continue" style="margin-top:6px">${cont}</button>`;
  };
  const { el, close } = sheet(body(), { title: mode === 'game' ? $t('market.lineup_incomplete') : $t('market.lineup_incomplete_for_the_new_season') });
  const redraw = () => { if (closed) return; const b = el.querySelector('.sheet-body') || el; b.innerHTML = body(); };
  el.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act;
    if (act === 'close') { closed = true; close(); onDone?.(); return; }
    if (act === 'sign') { negotiationSheet(app, b.dataset.id, () => { redraw(); onDone?.(); }, { mode: 'now' }); return; } // re-checked when the signing sheet closes
    if (act === 'market' || act === 'contracts' || act === 'lineup') { closed = true; close(); Router.go(act === 'market' ? 'famarket' : act); return; }
    if (act === 'continue') { if (!(await confirmSheet(mode === 'game' ? $t('market.forfeit_this_game_it_is_recorded') : $t('market.start_the_season_without_a_legal'), { title: $t('market.continue_under_the_forfeit_rule'), okLabel: mode === 'game' ? $t('market.forfeit') : $t('market.start_anyway'), danger: true }))) return; closed = true; close(); onContinue?.(); }
  });
}
