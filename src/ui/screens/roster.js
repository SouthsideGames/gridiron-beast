// Roster: depth chart, reserves, monster details, slot assignment,
// contracts and the coaching staff room.

import { esc, delegate, toast, sheet, confirmSheet, fmtMoney } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import * as F from '../../franchise/franchise.js';
import { negotiationSheet, renewalOutlook, extensionAdviceHtml } from '../fa-ui.js';
import { extensionEligible } from '../../franchise/fa-engine.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS, PACKAGE_SLOT_USE, ATTRIBUTES, positionOf, canPlay } from '../../data/personnel.js';
import { temperSummary } from '../../data/temper.js';
import * as FR from '../../core/fraction.js';
import { monsterOverall, effectiveAttributes, TYPES, ABILITIES, xpForLevel, HEADLINE, headlineAttributes, resolveSpecies, POINTS_PER_LEVEL, schemePreferences, evolutionReady, nextEvolution, pointCost } from '../../data/monsters.js';
import { abilitiesHtml, masteryBarHtml, hasAbilities, MODE_LABEL } from '../ability-info.js';
import { apexEmblem, apexClass, apexFactsHtml, openApexDiscovery } from '../apex-ui.js';
import { apexKnown } from '../../franchise/t8/discovery.js';
import { trainingCost, attributeBar } from '../../franchise/t8/progression.js';
import { reserveAward } from '../../franchise/t8/awards.js';
import { speciesSheet, silhouette } from './dex.js';
import { buildDepthChart, depthOrder, GROUP_SLOTS, OFFENSE_GROUPS, DEFENSE_GROUPS, borrowedSlots } from '../../franchise/roster.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
import { ROLE_LABEL, STAFF_ROLES, PLAYBOOKS, TRAINING_FOCI, STAFF, staffById } from '../../data/staff.js';
import { PLAYS } from '../../data/playbook.js';
import { ensureStats, POSITION_COLUMNS, STAT_GROUPS, GROUP_LABEL, groupsWithData, withDerived, statLine, monsterLine, monsterSeasons } from '../../franchise/stats.js';
import { attributeHelps, statMeaning, POSITION_NAME } from '../../data/stat-guide.js';
import { openStatGuide, openStatMeaning } from '../stat-guide.js';
import { playCardSvg } from '../play-art.js';
import { openTypeChart } from '../type-chart.js';
import { careerSectionHtml, careerActions, fullProfile } from '../career-ui.js';
import { honoursCount } from '../../franchise/career-profile.js';
import { typeProfile } from '../../data/type-chart.js';
import { captainBadge, partnershipStripHtml, captainWarning, benchNote } from '../captains-ui.js';
import { evolutionSnapshot, evolutionReport } from '../../franchise/evolution-report.js';
import { openEvolutionScene } from '../evolution-scene.js';
import { t as $t } from '../../text/index.js';

const ATTR_LABEL = { speed: 'Speed', agility: 'Agility', strength: 'Strength', awareness: 'Awareness', catching: 'Catching', arm: 'Arm', accuracy: 'Accuracy', blocking: 'Blocking', tackling: 'Tackling', coverage: 'Coverage', durability: 'Durability', kicking: 'Kicking' };

/** Four headline bars for a monster. */
export function headlineHtml(m, opts) {
  const h = headlineAttributes(m, opts);
  return `<div class="headline">${HEADLINE.map((x) => `<div class="hl" title="${esc(x.help)}"><span class="hl-v ${h[x.key] >= 70 ? 'hi' : h[x.key] < 50 ? 'lo' : ''}">${h[x.key]}</span><span class="hl-l">${x.label}</span><div class="bar ${h[x.key] < 45 ? 'bad' : h[x.key] < 60 ? 'warn' : ''}"><i style="width:${h[x.key]}%"></i></div></div>`).join('')}</div>`;
}
/** Captain Partnerships (GDD §27.4B): starters now, and a gentle note when a captain just left the starting lineup. */
const starters = (f) => new Set(Object.values(buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean));
function benchToast(f, before) { const now = starters(f); const out = [...before].find((id) => !now.has(id) && benchNote(f, id)); if (out) toast(benchNote(f, out), 'info', 3600); return !!out; }
export function registerRosterScreens(Router, app) {
  let side = 'offense';
  let noticesOpen = true;
  let depthDetails = false; // depth chart: show contract end and nature on every line // the roster's notice strip: tap the header to fold it
  let view = 'field';
  const GROUP_LABEL = { QB: 'Quarterback', RB: $t('roster.running_back'), WR: $t('roster.wide_receiver'), TE: $t('roster.tight_end'), OL: $t('roster.offensive_line'), DL: $t('roster.defensive_line'), LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker' };
  /** "More details" on the depth chart (GDD §21.5): the year the contract ends (amber in its final year) and the nature. */
  function detailHtml(f, m) {
    const ends = m.contract?.ends; const last = ends != null && ends <= f.season.year; const nat = `${$t('roster.temper', { name: temperSummary(m.temper).name })}`;
    return `<span class="dc-more"><span class="${last ? 'dc-expiring' : ''}">${ends != null ? `${last ? '⏳' : '📄'} ${yearOf(ends)}` : $t('roster.no_contract')}</span> · ${esc(nat)}</span>`;
  }
  /** With details on: who is in a final year, by position, and the natures on the roster (for scouting). */
  function depthSummary(f) {
    const expiring = f.roster.filter((m) => m.contract && m.contract.ends <= f.season.year);
    const byPos = {}; for (const m of expiring) (byPos[m.position] ||= []).push(m.name);
    const nat = {}; for (const m of f.roster) nat[m.temper] = (nat[m.temper] || 0) + 1;
    const natList = Object.entries(nat).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(temperSummary(k).name)} ${n}`).join(' · ');
    return `<div class="panel tight" style="margin-bottom:8px"><div>${$t('roster.b_final_year_b', { year: yearOf(f.season.year) })} ${expiring.length ? Object.entries(byPos).map(([p, ns]) => `<b>${p}</b> ${ns.map(esc).join(', ')}`).join(' · ') : '<span class="dim">nobody</span>'}</div><div class="dim" style="margin-top:4px">${$t('roster.b_tempers_b', { natList })}</div><div class="dim" style="margin-top:4px;font-size:12px">${$t('roster.each_line_contract_runs_through_that')}</div></div>`;
  }
  /** Depth chart: every position in order, starters first, with the slot each monster fills and thin spots flagged. */
  function depthHtml(f) {
    const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
    const slotOf = Object.fromEntries(Object.entries(chart).filter(([, id]) => id).map(([s, id]) => [id, s]));
    const borrowed = borrowedSlots(f.roster, chart);
    const group = (g) => {
      const order = depthOrder(f.roster, f.depth, g); const slots = GROUP_SLOTS[g];
      const healthy = order.filter((m) => !m.injury).length;
      const thin = healthy < slots.length ? 'bad' : healthy === slots.length ? 'warn' : '';
      const rows = order.map((m, i) => { const sl = slotOf[m.id]; const sec = m.position !== g; const fit = F.fitFor(f, m)?.fits; return `<div class="dc-row ${m.injury ? 'out' : ''} ${fit ? 'fit' : ''}"><span class="dc-n">${i + 1}</span>${monsterSprite(m, 26)}<div class="dc-mid"><button class="dc-name" data-action="monster" data-id="${m.id}">${F.monsterNotices(f, m.id).length ? '<span class="notice-dot"></span>' : ''}${m.cornerstone ? `<span class="cs-star" title="${$t('roster.cornerstone')}">★</span> ` : ''}${esc(m.name)}${sec ? ` <span class="dim">(` + m.position + ')</span>' : ''}</button>${captainBadge(f, m.id)}${depthDetails ? detailHtml(f, m) : ''}</div><span class="dc-tag">${m.fatigue >= 30 && !m.injury ? `<span class="fat-pip ${m.fatigue >= 60 ? 'bad' : 'warn'}" title="Fatigue ${m.fatigue}%" aria-label="Fatigue ${m.fatigue}%">${m.fatigue}%</span>` : ''}${m.injury ? `<span class="chip bad">${$t('roster.out_w', { weeks: m.injury.weeks })}</span>` : sl ? `<span class="chip ${OFFENSE_PACKAGE_SLOTS.includes(sl) || DEFENSE_PACKAGE_SLOTS.includes(sl) ? '' : 'accent'}">${sl}</span>` : `<span class="dim dc-backup">backup</span>`}</span><span class="ovr">${monsterOverall(m, { slotPosition: g })}</span><span class="dc-move"><button class="btn small" data-action="up" data-g="${g}" data-id="${m.id}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} up">▲</button><button class="btn small" data-action="down" data-g="${g}" data-id="${m.id}" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} down">▼</button></span></div>`; }).join('');
      return `<div class="dc-group ${thin}"><div class="dc-head"><b>${g}</b> <span class="dim">${$t('roster.slots', { groupLabel: GROUP_LABEL[g], n: slots.length })}</span>${thin === 'bad' ? `<span class="chip bad">${$t('roster.short_handed')}</span>` : thin === 'warn' ? `<span class="chip warn">${$t('roster.no_backup')}</span>` : ''}</div>${rows || `<p class="dim" style="margin:6px 0">${$t('roster.nobody_at_this_position')}</p>`}${borrowed.filter((b) => GROUP_SLOTS[g].includes(b.slot)).map((b) => `<p class="dim" style="margin:4px 0 0;${b.legal ? '' : 'color:var(--bad)'}">${b.legal ? `${$t('roster.has_no_monster_of_its_own', { slot: b.slot, name: esc(b.name), position: esc(b.position), outOfPosition: b.outOfPosition ? $t('roster.secondary_position_1_75_injury_risk') : '' })}` : `${$t('roster.has_no_monster_of_its_own_2', { slot: b.slot, position: positionOf(b.slot) })}`} ${$t('roster.sign_a_on_tuesday', { g })}</p>`).join('')}</div>`;
    };
    return `<p class="dim">${$t('roster.order_each_position_the_top_healthy')}</p>
      <h3>${$t('roster.offense')}</h3>${OFFENSE_GROUPS.map(group).join('')}<h3>${$t('roster.defense')}</h3>${DEFENSE_GROUPS.map(group).join('')}<h3>${$t('roster.special_teams')}</h3>${group('K')}`;
  }

  /** R5 (owner 2026-11-05): what the lineup cannot field, why, and what would fix it (nobody is ever substituted out of position). */
  function warningsPanel(f) {
    const w = F.lineupWarnings(f); if (!w.length) return '';
    return `<div class="panel tight" style="border-color:${w.some((x) => x.kind === 'base') ? 'var(--bad)' : 'var(--warn)'};margin-bottom:8px">${$t('roster.b_lineup_warnings_b')}${w.map((x) => `<div class="muted" style="margin-top:4px"><b>${esc(x.slot)}</b> (${esc(x.position)}) · ${esc(x.formation)}: ${x.kind === 'base' ? `<span class="chip bad">forfeit risk</span>` : `<span class="chip warn">plays unavailable</span>`}<div class="dim">${esc(x.why)}. ${esc(x.fix)}</div></div>`).join('')}</div>`;
  }
  Router.registerScreen('roster', {
    title: $t('roster.roster'), back: false,
    render({ f }) {
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
      const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
      const rows = side === 'offense' ? [['WR1', 'LG', 'RG', 'TE', 'WR2'], ['QB'], ['RB']] : [['DL1', 'DL2'], ['LB1', 'LB2'], ['CB1', 'FS', 'CB2']];
      const pkgRow = side === 'offense' ? OFFENSE_PACKAGE_SLOTS : DEFENSE_PACKAGE_SLOTS;
      const slot = (s) => { const m = byId[chart[s]]; const sec = m && positionOf(s) !== m.position; const fit = m && F.fitFor(f, m)?.fits; return `<button class="slot ${m?.injury ? 'injured' : ''} ${sec ? 'secondary' : ''} ${fit ? 'fit' : ''}" data-action="slot" data-slot="${s}" aria-label="${s}: ${m ? esc(m.name) : 'empty'}"><span class="pos">${s}</span>${m ? captainBadge(f, m.id) : ''}${m ? monsterSprite(m, 30) : `<span style="height:30px"></span>`}<span class="nm">${m && F.monsterNotices(f, m.id).length ? `<span class="notice-dot"></span>` : ''}${m?.cornerstone ? `<span class="cs-star" title="${$t('roster.cornerstone')}">★</span> ` : ''}${m ? esc(m.name) : $t('roster.empty')}</span><span class="ov">${m ? monsterOverall(m, { slotPosition: positionOf(s) }) : '·'}${sec ? '*' : ''}</span></button>`; };
      const starters = new Set(Object.values(chart));
      const reserves = f.roster.filter((m) => !starters.has(m.id)).sort((a, b) => monsterOverall(b) - monsterOverall(a));
      const cap = F.salarySummary(f);
      const room = Math.abs(cap.remaining) >= 10000 ? `${Math.round(cap.remaining / 1000)}k` : fmtMoney(cap.remaining);
      const viewBar = `<div class="seg roster-bar" role="tablist"><button class="btn small ${view === 'field' ? 'primary' : ''}" data-action="view" data-v="field" role="tab">${$t('roster.lineup')}</button><button class="btn small ${view === 'depth' ? 'primary' : ''}" data-action="view" data-v="depth" role="tab">${$t('roster.depth')}</button><span class="chip roster-room ${cap.remaining < 0 ? 'bad' : ''}" title="${$t('roster.roster_size_and_cap_room')}">${f.roster.length}/${F.ROSTER_MAX} · ${room} room</span></div>`;
      const notes = F.noticesFor(f, 'roster');
      const noticeStrip = notes.length ? `<div class="notices ${noticesOpen ? 'open' : ''}"><button class="notices-head row between" data-action="notices" aria-expanded="${noticesOpen}">${$t('roster.b_things_need_you_b', { n: notes.length, notes2: notes.length === 1 ? 's' : '' })}<span class="dim">${noticesOpen ? $t('roster.hide') : $t('roster.show')}</span></button>${noticesOpen ? `<div class="stack" style="gap:4px;margin-top:6px">${notes.map((n) => `<button class="notice-row" data-action="monster" data-id="${n.id}"><span class="notice-dot"></span><span class="grow">${esc(n.text)}</span><span class="dim">${n.kind === 'evolve' ? $t('roster.evolve') : $t('roster.spend')}</span></button>`).join('')}</div>${notes.some((n) => n.kind === 'points') ? `<button class="btn small block" data-action="autospend" style="margin-top:6px">${$t('roster.trainer_spend_all_points')}</button>` : ''}` : ''}</div>` : '';
      const bestBtn = `<button class="btn small" data-action="bestlineup" title="${$t('roster.order_every_position_by_overall_best')}">${$t('roster.best_lineup')}</button>`;
      const detailBtn = `<button class="btn small ${depthDetails ? 'on' : ''}" data-action="depthdetails" title="${$t('roster.contract_end_year_and_nature_on')}" aria-pressed="${depthDetails}">${depthDetails ? $t('roster.details') : $t('roster.details_2')}</button>`;
      const tools = (...b) => `<div class="row roster-tools">${b.join('')}</div>`;
      if (view === 'depth') return viewBar + noticeStrip + warningsPanel(f) + tools(bestBtn, detailBtn) + (depthDetails ? depthSummary(f) : '') + depthHtml(f) + devHtml(f) + `<div class="grid2" style="margin-top:12px"><button class="btn block" data-action="go" data-screen="contracts">${$t('roster.contracts')}</button><button class="btn block" data-action="go" data-screen="staff">${$t('roster.staff')}</button></div>`;
      return `${viewBar}${noticeStrip}${warningsPanel(f)}<div class="row between" style="margin-bottom:8px;gap:6px"><div class="row"><button class="btn small ${side === 'offense' ? 'primary' : ''}" data-action="side" data-v="offense">${$t('roster.offense')}</button><button class="btn small ${side === 'defense' ? 'primary' : ''}" data-action="side" data-v="defense">${$t('roster.defense')}</button></div>${bestBtn}</div>
        <div class="depth" style="margin-bottom:12px">${rows.map((r) => `<div class="depth-row" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(slot).join('')}</div>`).join('')}</div>
        ${schemeLockHtml(f, side)}
        ${partnershipStripHtml(f, side, F.captainStatus(f, side))}
        <p class="dim">${$t('roster.your_seven_starters_tap_a_slot')} <span class="fit-key">${$t('roster.gold_outline')}</span> ${$t('roster.fits_your_coordinators_schemes')}</p>
        <h3>${$t('roster.package_slots')}</h3><div class="depth" style="margin-bottom:4px"><div class="depth-row" style="grid-template-columns:repeat(${pkgRow.length},1fr)">${pkgRow.map(slot).join('')}</div></div>
        <p class="dim">${pkgRow.map((s) => `${$t('roster.b_b_comes_in_for_plays', { s, packageSlotUse: PACKAGE_SLOT_USE[s] })}`).join(' · ')}${$t('roster.replacing_a_starter_for_that_snap')}</p>
        <h3>${$t('roster.reserves_specialists', { n: reserves.length })}</h3><div class="list">${reserves.map((m) => monsterRow(m, chart)).join('') || `<p class="dim">${$t('roster.no_reserves')}</p>`}</div>
        ${devHtml(f)}
        <div class="grid2" style="margin-top:12px"><button class="btn block" data-action="go" data-screen="contracts">${$t('roster.contracts')}</button><button class="btn block" data-action="go" data-screen="staff">${$t('roster.staff')}</button></div>`;
    },
    mount(root) { delegate(root, { depthdetails: () => { depthDetails = !depthDetails; Router.render(); }, bestlineup: async () => { if (!(await confirmSheet($t('roster.reorder_every_position_by_overall_rating'), { title: $t('roster.best_lineup_2'), okLabel: $t('roster.reorder') }))) return; F.autoDepth(app.f); app.save(); toast($t('roster.depth_chart_set_best_overall_first'), 'good'); Router.render(); }, notices: () => { noticesOpen = !noticesOpen; Router.render(); }, autospend: () => { const r = F.autoSpendAllPoints(app.f); app.save(); toast(r.spent ? `${$t('roster.spent_points_on_monsters', { spent: r.spent, monsters: r.monsters })}` : $t('roster.no_points_to_spend'), 'good'); Router.render(); }, view: (el) => { view = el.dataset.v; Router.render(); }, up: (el) => { F.moveDepth(app.f, el.dataset.g, el.dataset.id, -1); app.save(); Router.render(); }, down: (el) => { const before = starters(app.f); F.moveDepth(app.f, el.dataset.g, el.dataset.id, 1); app.save(); benchToast(app.f, before); Router.render(); }, side: (el) => { side = el.dataset.v; Router.render(); }, slot: (el) => Router.go('assign', { slot: el.dataset.slot }), monster: (el) => Router.go('monster', { id: el.dataset.id }), go: (el) => Router.go(el.dataset.screen), 'dev-on': (el) => { const r = F.setDevSlot(app.f, el.dataset.id, true); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); }, 'dev-off': (el) => { const r = F.setDevSlot(app.f, el.dataset.id, false); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); }, 'dev-reset': () => { F.resetDevSlots(app.f); app.save(); toast($t('roster.every_development_slot_is_back_to'), 'good'); Router.render(); } }); },
  });
  /** Development slots (GDD §57, Task 6 Phase C): who practises with the first team and earns XP after each game. */
  function devHtml(f) {
    const v = F.devSlotsView(f);
    const line = (x, inSlot) => `<div class="item static dev-row"><div class="grow"><div class="name">${esc(x.name)} <span class="dim">${esc(x.position)}</span>${inSlot ? (x.manual ? ` <span class="chip accent">${$t('roster.your_pick')}</span>` : ` <span class="chip">auto</span>`) : ''}</div><div class="sub">${$t('roster.age_ovr_potential', { age: x.age, ovr: x.ovr, potential: x.potential })}</div></div>${inSlot ? `<button class="btn small" data-action="dev-off" data-id="${x.id}" aria-label="Take ${esc(x.name)} out of development">${$t('roster.remove')}</button>` : `<button class="btn small primary" data-action="dev-on" data-id="${x.id}" aria-label="Put ${esc(x.name)} in a development slot">${$t('roster.develop')}</button>`}</div>`;
    return `<h3>${$t('roster.development_slots', { n: v.slots.length, size: v.size })}</h3>
      <p class="dim">${$t('roster.reserves_aged_25_or_under_with', { toNumber: FR.toNumber(reserveAward().xp), training: FR.toNumber(reserveAward().training) * 100, perPosition: v.perPosition })}</p>
      <div class="list">${v.slots.map((x) => line(x, true)).join('') || `<p class="dim">${$t('roster.nobody_is_eligible_right_now')}</p>`}</div>
      ${v.candidates.length ? `<details style="margin-top:6px"><summary class="muted" style="cursor:pointer">${$t('roster.other_eligible_reserves', { n: v.candidates.length })}</summary><div class="list" style="margin-top:6px">${v.candidates.map((x) => line(x, false)).join('')}</div></details>` : ''}
      ${f.devSlots ? `<button class="btn small ghost" data-action="dev-reset" style="margin-top:6px">${$t('roster.let_the_coaches_fill_every_slot')}</button>` : ''}`;
  }
  function monsterRow(m, chart = {}) {
    const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
    const fit = F.fitFor(app.f, m)?.fits;
    return `<button class="item ${fit ? 'fit' : ''}" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)} ${typeGlyph(m.type)} ${F.monsterNotices(app.f, m.id).length ? `<span class="notice-dot" title="${$t('roster.needs_your_attention')}"></span>` : ''}${m.cornerstone ? `<span class="chip cornerstone" title="${$t('roster.your_cornerstone_the_monster_you_built')}">${$t('roster.cornerstone_2')}</span>` : ''}${apexEmblem(app.f, m)}${fit ? ` <span class="chip fitchip">${$t('roster.fits_scheme')}</span>` : ''}${(m.points || 0) > 0 ? ` <span class="chip warn" title="${$t('roster.banked_training_points_to_invest')}">${$t('roster.pts', { points: m.points })}</span>` : ''}${evolutionReady(m) ? ` <span class="chip good">${$t('roster.ready_to_evolve')}</span>` : ''}${(() => { const n = honoursCount(m); return n ? ` <span class="chip honours" title="${n} honor${n === 1 ? '' : 's'} in his trophy case">🏆${n > 1 ? ` ${n}` : ''}</span>` : ''; })()}</div><div class="sub">${m.position}${slot ? ' · ' + slot : ''} · L${m.level} · ${m.injury ? `<span style="color:var(--bad)">${$t('roster.injury_wk', { severity: m.injury.severity, weeks: m.injury.weeks })}</span>` : m.fatigue >= 60 ? `<span style="color:var(--warn)">fatigued</span>` : 'healthy'}</div></div><span class="mini-hl mono">${(() => { const h = headlineAttributes(m); return `${h.speed}·${h.power}·${h.hands}·${h.smarts}`; })()}</span><span class="ovr ${monsterOverall(m) >= 65 ? 'hi' : ''}">${monsterOverall(m)}</span></button>`;
  }

  Router.registerScreen('assign', {
    title: ({ params }) => `${$t('roster.assign', { slot: params.slot })}`,
    render({ f, params }) {
      const slot = params.slot; const need = positionOf(slot);
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
      const eligible = f.roster.filter((m) => canPlay(m.position, slot)).sort((a, b) => monsterOverall(b, { slotPosition: need }) - monsterOverall(a, { slotPosition: need }));
      return `<p class="muted">${$t('roster.eligible_monsters_for_b_b_every', { slot, need, need2: need })}</p><div class="list">${eligible.map((m) => `<div class="item static"><div class="row" style="flex:1" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)}${chart[slot] === m.id ? ` <span class="chip accent">current</span>` : ''}</div><div class="sub">${m.position}${m.position !== need ? ' (secondary)' : ''} · ${m.injury ? `<span style="color:var(--bad)">${$t('roster.injured_wk', { weeks: m.injury.weeks })}</span>` : `${$t('roster.fatigue', { fatigue: m.fatigue })}`}</div></div><span class="ovr">${monsterOverall(m, { slotPosition: need })}</span></div><button class="btn small primary" data-action="assign" data-id="${m.id}" ${m.injury || chart[slot] === m.id ? 'disabled' : ''}>${$t('roster.start')}</button></div>`).join('')}</div>
        ${f.depth?.[positionOf(slot)] ? `<button class="btn block" data-action="auto" style="margin-top:8px">${$t('roster.let_the_coach_order_this_position')}</button>` : ''}`;
    },
    mount(root, ctx) { delegate(root, { assign: (el) => { const before = starters(app.f); const r = F.assignSlot(app.f, ctx.params.slot, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); if (!benchToast(app.f, before)) toast($t('roster.lineup_updated'), 'good'); Router.back(); }, auto: () => { F.assignSlot(app.f, ctx.params.slot, null); app.save(); Router.back(); }, monster: (el) => Router.go('monster', { id: el.dataset.id }) }); },
  });

  /** Browse order for Previous / Next on a monster page (v42.4.1): the depth chart's order, offense then defense then the kicker,
   * each monster once at its own position, so Next walks the roster the way the Depth view lists it. */
  const browseOrder = (f) => { const seen = new Set(); const out = [];
    for (const g of [...OFFENSE_GROUPS, ...DEFENSE_GROUPS, 'K']) for (const m of depthOrder(f.roster, f.depth, g)) if (m.position === g && !seen.has(m.id)) { seen.add(m.id); out.push(m); }
    for (const m of f.roster) if (!seen.has(m.id)) out.push(m);
    return out; };
  const browseNav = (f, id) => { const list = browseOrder(f); const i = list.findIndex((m) => m.id === id); if (i < 0 || list.length < 2) return '';
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    return `<nav class="mon-nav" aria-label="${$t('roster.browse_the_roster')}"><button class="mon-nav-btn" data-action="mon-go" data-id="${prev.id}" aria-label="Previous: ${esc(prev.name)}"><span aria-hidden="true">‹</span><span class="nm">${esc(prev.name)}</span></button><span class="mon-nav-pos">${i + 1} / ${list.length}<span class="dim"> · ${esc(list[i].position)}</span></span><button class="mon-nav-btn next" data-action="mon-go" data-id="${next.id}" aria-label="Next: ${esc(next.name)}"><span class="nm">${esc(next.name)}</span><span aria-hidden="true">›</span></button></nav>`; };
  /** Career stage and retirement outlook (GDD §55.6): observable estimates only; legendary monsters never age. */
  const outlookHtml = (f, m) => { const o = apexKnown(f, m) ? null : F.monsterOutlook(f, m); if (!o) return `<div class="muted">${$t('roster.ageless_never_declines_or_retires')}</div>`; const [a, b, c] = o.window;
    return `<div class="muted">${$t('roster.career_stage')} <span class="chip stage-${o.key}">${esc(o.label)}</span> ${$t('roster.retirement_outlook')} <b class="${o.outlook === 'high' ? 'bad' : o.outlook === 'moderate' ? 'warn' : ''}">${esc(o.outlookLabel)}</b> <span class="dim" title="${$t('roster.an_estimate_from_age_position_durability')}">${$t('roster.likely_around', { a, c, b })}</span></div>`; };
  Router.registerScreen('monster', {
    title: ({ f, params }) => f.roster.find((m) => m.id === params.id)?.name || 'Monster',
    render({ f, params }) {
      const m = f.roster.find((x) => x.id === params.id); if (!m) return `<p>${$t('roster.not_found')}</p>`;
      const base = m.attributes, eff = effectiveAttributes(m); const temper = temperSummary(m.temper); const d = m.dev; const apex = apexKnown(f, m);
      const bank = d ? FR.floor(d.bank) : 0; const canTrain = bank > 0 && !F.pointsLocked(f); const mode = hasAbilities(m) ? masteryMode : null;
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
      return `${browseNav(f, m.id)}<div class="panel${apexClass(f, m)}"><div class="row">${monsterSprite(m, 72)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)}${m.cornerstone ? ` <span class="chip cornerstone">${$t('roster.cornerstone_2')}</span>` : ''} ${apexEmblem(f, m)}</div><div class="muted">${$t('roster.type_age', { position: m.position, slot: slot ? $t('roster.starts_at') + slot : $t('roster.reserve'), type: esc(m.type), age: m.age })}</div><div class="muted">${m.level >= 50 ? $t('roster.level_50_max') : `${$t('roster.level_xp', { level: m.level, n: Math.floor(m.xp), xpForLevel: xpForLevel(m.level) })}`} · ${apex ? $t('roster.potential_99_in_every_attribute') : `potential ${m.potential}`}</div>${outlookHtml(f, m)}</div><span class="ovr hi" style="font-size:26px">${monsterOverall(m)}</span></div>
        <div class="row between dim t8-bar-label" data-bar="level" style="margin-top:8px"><span>${$t('roster.level', { level: m.level })}</span><span>${m.level >= 50 ? $t('roster.max') : `${Math.floor(m.xp)}/${xpForLevel(m.level)} XP`}</span></div><div class="bar" style="margin:2px 0 4px"><i style="width:${m.level >= 50 ? 100 : Math.round(m.xp / xpForLevel(m.level) * 100)}%"></i></div>
        ${mode ? `${masteryBarHtml(m, mode)}<div class="seg t8-mode" style="margin:0 0 6px">${['football', 'clash'].map((k) => `<button class="btn small ${mode === k ? 'primary' : ''}" data-action="mastery-mode" data-v="${k}" aria-pressed="${mode === k}">${$t('roster.mastery', { modeLabel: MODE_LABEL[k] })}</button>`).join('')}</div>` : `<div class="dim t8-bar-label" data-bar="mastery" data-mode="none">${$t('roster.no_ability_mastery_a_basic_family')}</div>`}
        ${d ? `<div class="row between dim t8-bar-label" data-bar="training"><span>${$t('roster.training_shared_by_both_modes_continues')}</span><span>${$t('roster.points_banked', { n: Math.floor(FR.toNumber(d.bar) * 100), bank })}</span></div><div class="bar train" style="margin:2px 0 4px"><i style="width:${Math.floor(FR.toNumber(d.bar) * 100)}%;background:var(--accent2, #5fb6ff)"></i></div>` : ''}
        <div class="row between muted"><span>${$t('roster.fatigue_2', { fatigue: m.fatigue })}</span><span>${m.injury ? `<b style="color:var(--bad)">${esc(m.injury.severity)} ${esc(m.injury.type)} · ${m.injury.weeks} wk</b>` : $t('roster.healthy')}</span><span>${fmtMoney(m.salary)}/yr${m.contract ? ` ${$t('roster.through', { year: yearOf(m.contract.ends) })}` : ''}</span></div>
        ${m.contract && m.contract.ends <= f.season.year ? `<p class="dim" style="margin:4px 0 0">${$t('roster.contract_year_renewal_in_the_offseason', { amount: fmtMoney(F.renewalAsk(m).ask) })}</p>` : ''}
        <div class="row" style="gap:6px;margin-top:8px"><button class="btn small" data-action="career-jump">${$t('roster.career')}</button><button class="btn small ghost" data-action="release">${$t('roster.release', { name: esc(m.name) })}</button><span class="dim" style="font-size:12px">${$t('roster.frees_yr_back_to_the_pool', { amount: fmtMoney(m.salary), homeRegion: esc(F.homeRegion(m)) })}</span></div></div>
        ${apexFactsHtml(f, m, { replay: true })}
        ${bioHtml(f, m)}
        ${(() => { F.monsterTimeline(f, m); return careerSectionHtml(f, fullProfile(f, m, 'roster'), { domId: 'timeline' }); })()}
        <button class="btn block cp-open" data-career="${esc(m.id)}">${$t('roster.full_career_profile')}</button>
        <div class="panel">${$t('roster.b_temper_b', { name: esc(temper.name) })}<p class="muted" style="margin:2px 0">${esc(temper.text)}</p>
          <div class="row between" style="gap:6px">${$t('roster.b_type_b', { type: esc(m.type) })}<button class="btn small" data-action="typechart" data-type="${esc(m.type)}">${$t('roster.type_chart')}</button></div><p class="muted" style="margin:2px 0">${esc(TYPES[m.type].blurb)}. ${(() => { const p = typeProfile(m.type); return `${$t('roster.strong_against')} ${p.strong.join(' and ')}${$t('roster.weak_against')} ${p.weak.join(' and ')}.`; })()}</p>
          ${$t('roster.b_signature_abilities_b')}${abilitiesHtml(m, { monster: m, seeIt: true })}
          ${evolutionHtml(m)}
          <button class="btn small" data-action="species" style="margin-top:6px">${$t('roster.in_the_beast_dex', { name: esc(resolveSpecies(m).name) })}</button></div>
        <h3>${$t('roster.ratings')}</h3>${headlineHtml(m)}${schemeHtml(f, m)}
        ${bank > 0 && F.pointsLocked(f) ? `<div class="panel points">${$t('roster.b_training_points_banked_frozen_b', { bank, n: bank })}<div class="dim">${$t('roster.points_are_frozen_until_every_contract')}</div></div>` : ''}${canTrain ? `<div class="panel points" data-training="open">${$t('roster.b_training_points_to_invest_b', { bank, n: bank })}<div class="dim">${$t('roster.a_full_training_bar_banks_one', { apex: apex ? '' : $t('roster.and_past_his_peak_his_age') })}</div><button class="btn small" data-action="autospendone" style="margin-top:6px">${$t('roster.let_the_trainer_invest_them')}</button></div>` : ''}
        <details style="margin-top:8px" ${canTrain ? 'open' : ''}><summary class="muted" style="cursor:pointer">${$t('roster.all_twelve_attributes')}</summary><div class="attr-grid" style="margin-top:8px">${ATTRIBUTES.map((k) => { const helps = attributeHelps(m.position, k); const cur = d ? d.current[k] : base[k]; const ceil = d ? d.potential[k] : null; const atCeil = ceil != null && cur >= ceil; const cost = d ? FR.toNumber(trainingCost(d, m, k).effective) : null; const prog = d ? Math.floor(FR.toNumber(attributeBar(d, m, k)) * 100) : 0; const costText = cost == null ? '' : cost === 1 ? $t('roster.1_point_per_1') : cost < 1 ? `${1 / cost} per point` : `${$t('roster.points_per_1', { cost })}`;
          return `<div class="attr ${helps ? '' : 'no-help'}" data-attr-row="${k}" title="${esc(statMeaning(m.position, k))}" style="${helps ? '' : 'opacity:.6'}"><button class="linkish" data-action="statinfo" data-attr="${k}" style="all:unset;cursor:pointer;text-decoration:underline dotted">${ATTR_LABEL[k]}</button><div class="bar ${eff[k] < 45 ? 'bad' : eff[k] < 60 ? 'warn' : ''}"><i style="width:${eff[k]}%"></i>${ceil != null ? `<u class="ceil" style="left:${Math.min(100, ceil)}%" aria-hidden="true"></u>` : ''}</div><span class="v" style="color:${eff[k] > base[k] ? 'var(--good)' : eff[k] < base[k] ? 'var(--bad)' : 'inherit'}">${eff[k]}${ceil != null ? `<small class="dim">/${ceil}</small>` : ''}</span>${canTrain ? `<button class="btn small plus" data-action="spend" data-attr="${k}" ${atCeil ? `disabled title="At his ceiling (${ceil})"` : `title="${costText}${prog ? `; ${prog}% of the next +1 already invested` : ''}"`} aria-label="Invest 1 point in ${ATTR_LABEL[k]} (${atCeil ? 'at ceiling' : costText})">+${!atCeil && cost !== 1 ? `<small class="cost">${cost < 1 ? `×${1 / cost}` : `÷${cost}`}</small>` : ''}</button>` : ''}${prog && !atCeil ? `<i class="invest" style="width:${prog}%" title="${prog}% of the next +1 invested"></i>` : ''}</div>`; }).join('')}</div>
        <p class="dim" style="margin-top:8px">${$t('roster.each_value_is_shown_against_that', { toLowerCase: esc(POSITION_NAME[m.position]?.toLowerCase() || m.position) })}</p>
        <button class="btn small" data-action="statguide" style="margin-top:4px">${$t('roster.what_the_stats_mean_for_a', { toLowerCase: esc(POSITION_NAME[m.position]?.toLowerCase() || m.position) })}</button></details>
        ${monsterStatsHtml(m, f)}`;
    },
    mount(root, ctx) {
      delegate(root, {
        ...careerActions({ f: () => app.f, profile: () => fullProfile(app.f, app.f.roster.find((x) => x.id === ctx.params.id), 'roster'), monster: () => app.f.roster.find((x) => x.id === ctx.params.id), domId: 'timeline', go: (s, prm) => Router.go(s, prm) }),
        'mon-go': (el) => Router.go('monster', { id: el.dataset.id }, { replace: true }), // replace: Back still returns to where you came from
        'career-jump': () => root.querySelector('#timeline')?.scrollIntoView({ block: 'start', behavior: app.f?.settings?.reducedMotion ? 'auto' : 'smooth' }),
        typechart: (el) => openTypeChart(el.dataset.type),
        species: () => { const m = ctx.f.roster.find((x) => x.id === ctx.params.id); if (!m) return; const sp = resolveSpecies(m); sheet(speciesSheet(sp, ctx.f), { title: sp.name }); },
        'mastery-mode': (el) => { masteryMode = el.dataset.v === 'clash' ? 'clash' : 'football'; Router.render(); },
        'apex-replay': () => { const m = app.f.roster.find((x) => x.id === ctx.params.id); if (m && apexKnown(app.f, m) && !document.querySelector('.apex-scene')) openApexDiscovery({ monster: m, settings: app.settings }); },
        autospendone: () => { F.autoSpendAllPoints(app.f, { only: ctx.params.id }); app.save(); Router.render(); },
        release: async () => { const m = app.f.roster.find((x) => x.id === ctx.params.id); if (!m) return; if (!(await confirmSheet(`${$t('roster.release_they_go_back_to_the', { name: m.name, homeRegion: F.homeRegion(m), captainWarning: captainWarning(app.f, m.id) })}`, { title: $t('roster.release_monster'), okLabel: $t('roster.release_2'), danger: true }))) return; const r = F.releaseMonster(app.f, m.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${m.name} released.`, 'info'); Router.go('roster', {}, { reset: true }); },
        evolve: async (el) => { // GDD §51: commit the evolution once and save, then present it full-screen (the scene only shows the report)
          const m = app.f.roster.find((x) => x.id === ctx.params.id); if (!m || document.querySelector('.evo-scene')) return; if (el) el.disabled = true;
          const before = evolutionSnapshot(m); const beforeMon = { ...m, stage: before.stage };
          const r = F.evolveMonster(app.f, m.id); if (!r.ok) { if (el) el.disabled = false; toast(r.reason, 'bad'); return; }
          app.save();
          const report = evolutionReport(before, evolutionSnapshot(m), { year: app.f.season.year, week: app.f.season.week, club: app.f.club });
          const s = app.f.settings || {};
          openEvolutionScene({ report, beforeMon, afterMon: m, settings: { reducedMotion: s.reducedMotion || app.settings?.reducedMotion, screenShake: s.screenShake, evoSound: s.evoSound }, onSound: (on) => { app.f.settings.evoSound = on; app.save(); }, onClose: () => Router.render() });
        },
        statinfo: (el) => { const m = app.f.roster.find((x) => x.id === ctx.params.id); if (m) openStatMeaning(m.position, el.dataset.attr, m.name); },
        statguide: () => { const m = app.f.roster.find((x) => x.id === ctx.params.id); openStatGuide(m?.position || 'QB'); },
        spend: (el) => { const r = F.spendAttributePoint(app.f, ctx.params.id, el.dataset.attr); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
        'stat-scope': (el) => { const v = el.dataset.v; statView.scope = /^\d+$/.test(v) ? Number(v) : v; Router.render(); }, 'stat-bucket': (el) => { statView.bucket = el.dataset.v; Router.render(); }, 'stat-group': (el) => { statView.group = el.dataset.v; Router.render(); },
      });
    },
  });

  let contractSort = 'salary';
  const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
  function sortedForContracts(f) {
    const r = f.roster.slice();
    if (contractSort === 'position') return r.sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || monsterOverall(b) - monsterOverall(a));
    if (contractSort === 'ovr') return r.sort((a, b) => monsterOverall(b) - monsterOverall(a));
    if (contractSort === 'ends') return r.sort((a, b) => (a.contract?.ends || 0) - (b.contract?.ends || 0) || b.salary - a.salary);
    if (contractSort === 'value') return r.sort((a, b) => (b.salary / Math.max(1, monsterOverall(b))) - (a.salary / Math.max(1, monsterOverall(a)))); // most overpaid first
    return r.sort((a, b) => b.salary - a.salary);
  }
  Router.registerScreen('contracts', {
    title: $t('roster.salary_contracts'),
    render({ f }) {
      const c = F.salarySummary(f);
      const usage = Math.min(100, Math.round(c.total / c.cap * 100));
      return `<div class="panel"><div class="muted" style="font-size:12px">${$t('roster.total_annual_salary_monsters_staff')}</div><div style="font-size:24px;font-weight:900">${fmtMoney(c.total)}</div><div class="bar ${c.over ? 'bad' : usage > 90 ? 'warn' : ''}" style="margin:6px 0"><i style="width:${usage}%"></i></div><div class="row between muted"><span>${$t('roster.cap', { amount: fmtMoney(c.cap) })}</span><span>${$t('roster.monsters_staff', { amount: fmtMoney(c.monsters), amount2: fmtMoney(c.staff) })}</span></div><p style="color:${c.over ? 'var(--bad)' : 'var(--good)'};margin:6px 0 0"><b>${c.over ? $t('roster.over_by') + fmtMoney(-c.remaining) + ', games locked' : $t('roster.room') + fmtMoney(c.remaining)}</b></p></div>
        <p class="muted">${$t('roster.released_monsters_go_back_to_their', { rosterMin: F.ROSTER_MIN })}${F.task7Offseason(f) || f.freeAgency?.v ? ` ${$t('roster.a_released_monster_cannot_re_sign')}${f.season.finished ? ` ${$t('roster.in_the_offseason_you_may_go', { rosterMin: F.ROSTER_MIN, rosterMin2: F.ROSTER_MIN })}` : ''}` : ''}</p>
        ${f.freeAgency?.v ? `<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn small" data-action="famarket">${$t('roster.free_agent_market')}${F.freeAgencyOpen(f) ? ` ${$t('roster.period', { period: f.freeAgency.period })}` : ''}</button><span class="dim">${$t('roster.unsigned_monsters_are_on_the_market')}</span></div>` : ''}
        ${extensionAdviceHtml(f, { action: 'extend' })}
        <div class="seg" style="margin-bottom:8px">${[['salary', 'Salary'], ['position', 'Position'], ['ovr', 'OVR'], ['ends', 'Contract End'], ['value', 'Cost per OVR']].map(([k, l]) => `<button class="btn small ${contractSort === k ? 'primary' : ''}" data-action="csort" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="list">${sortedForContracts(f).map((m) => `<div class="item static">${monsterSprite(m, 32)}<div class="grow"><div class="name">${esc(m.name)}</div><div class="sub">${m.position} · ${monsterOverall(m)} OVR · ${fmtMoney(m.salary)}/yr${m.contract?.bonus ? ` ${$t('roster.bonus', { amount: fmtMoney(m.contract.alloc?.[(f.freeAgency?.leagueYear ?? f.season.year) - m.contract.signed] || 0) })}` : ''}${m.contract ? ` ${$t('roster.through_2', { year: yearOf(m.contract.next ? m.contract.next.ends : m.contract.ends), next: m.contract.next ? ' (extended)' : '' })}` : ''}</div>${(() => { const o = renewalOutlook(f, m); return o ? `<div class="sub">${$t('roster.renewal_outlook')} <span class="chip ${o.cls}">${o.label}</span> <span class="dim">${$t('roster.at_yr', { amount: fmtMoney(o.terms.salary), years: o.terms.years })}</span></div>${o.clue ? `<div class="sub dim">${esc(o.clue)}</div>` : ''}` : ''; })()}</div>${f.freeAgency?.v && extensionEligible(f, m) ? `<button class="btn small" data-action="extend" data-id="${m.id}">${$t('roster.extend')}</button>` : ''}<button class="btn small danger" data-action="release" data-id="${m.id}" data-name="${esc(m.name)}">${$t('roster.release_2')}</button></div>`).join('')}</div>`;
    },
    mount(root) { delegate(root, { famarket: () => Router.go('famarket'), extend: (el) => negotiationSheet(app, el.dataset.id, () => Router.render(), { mode: 'extend' }), csort: (el) => { contractSort = el.dataset.v; Router.render(); }, release: async (el) => { if (!(await confirmSheet(`${$t('roster.release_this_cannot_be_undone', { name: el.dataset.name, captainWarning: captainWarning(app.f, el.dataset.id) })}`, { title: $t('roster.release_monster'), okLabel: $t('roster.release_2'), danger: true }))) return; const r = F.releaseMonster(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${el.dataset.name} released.`); Router.render(); } }); },
  });

  Router.registerScreen('staff', {
    title: $t('roster.coaching_staff'),
    render({ f }) {
      const al = F.schemeAlignment(f); const rf = F.rosterFit(f);
      const fitLine = (x, label) => `<div class="row between"><span>${$t('roster.b_of_b_starters_fit', { label, fit: x.fit, total: x.total, scheme: esc(x.scheme) })}</span><span class="${x.total && x.fit / x.total < 0.5 ? 'chip bad' : 'chip good'}">${x.total ? Math.round(100 * x.fit / x.total) : 0}%</span></div>`;
      return `<div class="panel">${$t('roster.b_team_identity_b')}<div class="muted">${$t('roster.oc_scheme_fit_b_b_100', { offense: al.offense, defense: al.defense })}</div>
        <div style="margin-top:8px">${$t('roster.b_roster_fit_b', { fitLine: fitLine(rf.offense, 'Offense'), fitLine2: fitLine(rf.defense, 'Defense') })}<div class="dim" style="font-size:12px;margin-top:4px">${$t('roster.under_half_fitting_is_a_problem')}</div></div></div>
        <div class="list">${STAFF_ROLES.map((r) => { const c = F.staffMember(f, r); if (!c) return `<div class="item static"><div class="grow"><div class="name">${ROLE_LABEL[r]}</div><div class="sub">${$t('roster.vacant')}</div></div></div>`; return `<div class="item static">${portraitSprite(c.id, 40)}<div class="grow"><div class="name">${esc(c.name)} <span class="chip">${esc(c.style)}</span></div><div class="sub">${ROLE_LABEL[r]} · OVR ${c.overall} · ${fmtMoney(c.salary)}/yr</div><div class="sub">${esc(c.strength)}</div></div>${c.role.includes('coordinator') ? `<button class="btn small" data-action="plays" data-id="${c.id}" data-name="${esc(c.name)}">${$t('roster.plays')}</button>` : ''}<button class="btn small" data-action="interview" data-role="${r}">${$t('roster.replace')}</button></div>`; }).join('')}</div>
        <p class="dim" style="margin-top:8px">${$t('roster.replacing_a_staff_member_is_immediate')}${f.deadCap ? ` ${$t('roster.dead_money_this_season', { amount: fmtMoney(f.deadCap) })}` : ''}.</p>`;
    },
    mount(root) { delegate(root, {
      plays: (el) => { const ids = PLAYBOOKS[el.dataset.id] || []; sheet(`<div class="play-grid">${ids.map((id) => `<div class="card"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></div>`).join('')}</div>`, { title: el.dataset.name }); },
      interview: (el) => {
        const role = el.dataset.role; const current = app.f.staff[role];
        const { el: sh, close } = sheet(`<div class="stack">${STAFF.filter((c) => c.role === role).map((c) => { const after = F.salarySummary(app.f, c.salary - (staffById(current)?.salary || 0)); return `<div class="panel"><div class="row">${portraitSprite(c.id, 40)}<div class="grow"><b>${esc(c.name)}</b> <span class="chip">${esc(c.style)}</span>${c.id === current ? ` <span class="chip accent">current</span>` : ''}<div class="muted">${esc(c.strength)} · OVR ${c.overall} · ${fmtMoney(c.salary)}/yr</div></div></div><div class="row between" style="margin-top:6px"><span class="muted">${$t('roster.room_after')} <b style="color:${after.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(after.remaining)}</b></span><button class="btn small primary" data-hire="${c.id}" ${c.id === current || after.over ? 'disabled' : ''}>${$t('roster.hire')}</button></div></div>`; }).join('')}</div>`, { title: $t('roster.candidates') + ROLE_LABEL[role] });
        sh.addEventListener('click', (e) => { const id = e.target.closest('[data-hire]')?.dataset.hire; if (!id) return; const r = F.replaceStaff(app.f, id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); close(); toast($t('roster.staff_updated'), 'good'); Router.render(); });
      },
    }); },
  });
}

// ---------------------------------------------------------------- monster stats (GDD §16)
const statView = { scope: 'season', bucket: 'reg', group: null };
let masteryMode = 'football'; // which mode's mastery the profile's third bar shows (both records always exist, spec §6)
const GROUP_OF_POSITION = { QB: 'passing', RB: 'rushing', WR: 'receiving', TE: 'receiving', OL: 'blocking', DL: 'pass_rush', LB: 'pass_rush', CB: 'coverage', S: 'coverage', K: 'kicking' };
function statTable(line, position, group) {
  const colPos = group ? STAT_GROUPS[group][0] : position;
  const cols = POSITION_COLUMNS[group && group === GROUP_OF_POSITION[position] ? position : colPos] || POSITION_COLUMNS[colPos] || POSITION_COLUMNS.WR;
  const d = withDerived(line);
  const cell = (k) => { const v = d[k]; return v == null ? `<span class="dim">·</span>` : v; };
  return `<div class="stat-table"><table><thead><tr>${cols.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody><tr>${cols.map(([k]) => `<td>${cell(k)}</td>`).join('')}</tr></tbody></table></div>`;
}
/**
 * Statistics for one monster (revised 2026-10-22): two filters that work together, Season (this season, each past season,
 * career) × Game type (regular season, playoffs, both), plus the game log; a group switch when it has stats in several roles.
 * Every empty combination says why it is empty.
 */
export function monsterStatsHtml(m, f) {
  const s = ensureStats(m, f.season.year); const pos = m.position; const curYear = s.season.year ?? f.season.year;
  const seasons = monsterSeasons(m, f.season.year); const years = seasons.filter((y) => y !== curYear);
  const scope = statView.scope === 'log' ? 'log' : statView.scope === 'career' ? 'career' : (years.includes(statView.scope) ? statView.scope : 'season');
  const bucket = ['reg', 'post', 'all'].includes(statView.bucket) ? statView.bucket : 'reg';
  const seg = (items, key, cur) => `<div class="seg wrap" role="tablist">${items.map(([v, l]) => `<button class="btn small ${String(cur) === String(v) ? 'primary' : ''}" role="tab" aria-selected="${String(cur) === String(v)}" data-action="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const seasonBar = seg([['season', 'This season'], ...years.map((y) => [y, yearOf(y)]), ['career', 'Career'], ['log', 'Game log']], 'stat-scope', scope);
  const groupBar = (line) => { const gs = groupsWithData(line); const def = GROUP_OF_POSITION[pos]; const all = [...new Set([def, ...gs])].filter(Boolean); if (all.length <= 1) { statView.group = null; return ''; } const cur = statView.group && all.includes(statView.group) ? statView.group : def; statView.group = cur; return `<div class="seg wrap" style="margin:6px 0">${all.map((g) => `<button class="btn small ${cur === g ? 'primary' : ''}" data-action="stat-group" data-v="${g}">${esc(GROUP_LABEL[g] || g)}</button>`).join('')}</div>`; };
  let body = '';
  if (scope === 'log') {
    const log = s.log.slice().reverse();
    body = log.length ? `<div class="list">${log.map((g) => `<div class="item static"><div class="grow"><div class="name">${yearOf(g.year)} wk ${g.week}${g.playoff ? ` <span class="chip">playoffs</span>` : ''} ${g.home ? 'vs' : '@'} ${esc(g.opp)} <span class="${g.won ? 'good' : 'bad'}">${g.won ? 'W' : 'L'} ${g.score}</span></div><div class="sub">${esc(statLine(g.line)) || $t('roster.no_stats')}</div></div></div>`).join('')}</div><p class="dim">${$t('roster.the_last_games_played', { n: Math.min(20, log.length) })}</p>` : `<p class="dim empty">${$t('roster.no_games_played_yet')}</p>`;
  } else {
    const typeBar = seg([['reg', 'Regular season'], ['post', 'Playoffs'], ['all', 'Both']], 'stat-bucket', bucket);
    const line = monsterLine(m, scope === 'season' ? curYear : scope, bucket);
    const label = scope === 'career' ? `${$t('roster.career_seasons', { n: seasons.length })}` : scope === 'season' ? `${$t('roster.this_season', { year: yearOf(curYear) })}` : yearOf(scope);
    const typeLabel = bucket === 'reg' ? 'regular season' : bucket === 'post' ? 'playoffs' : $t('roster.regular_season_playoffs');
    const why = scope === 'career' ? (bucket === 'post' ? $t('roster.no_playoff_games_in_this_career') : $t('roster.no_games_in_this_career_yet')) : scope === 'season' ? (bucket === 'post' ? (f.season.playoffs ? $t('roster.no_playoff_games_for_this_monster') : $t('roster.the_playoffs_have_not_started_this')) : `${$t('roster.no_games_yet_in', { year: yearOf(curYear) })}`) : (bucket === 'post' ? `${$t('roster.no_playoff_games_in', { year: yearOf(scope) })}` : `${$t('roster.no_games_in', { year: yearOf(scope) })}`);
    body = `${typeBar}${Object.keys(line).length ? `${groupBar(line)}<div class="dim stat-caption">${$t('roster.games', { label: esc(label), typeLabel, games: line.games || 0, n: line.games })}</div>${statTable(line, pos, statView.group)}` : `<p class="dim empty">${why}</p>`}`;
  }
  return `<h3>${$t('roster.statistics')}</h3>${seasonBar}${body}
    <p class="dim" style="margin-top:6px">${m.yearsPro === 0 ? $t('roster.rookie_season') : `${$t('roster.seasons_pro', { yearsPro: m.yearsPro ?? '?', n: m.yearsPro })}`} ${$t('roster.rates_come_from_the_totals_shown')}</p>`;
}

/** Scheme section (GDD §20.6): which schemes this monster suits, best first, with the club's own scheme marked. */
function schemeHtml(f, m) {
  const pref = schemePreferences(m); if (!pref) return '';
  const mine = F.fitFor(f, m); const club = F.clubSchemes ? F.clubSchemes(f) : null; const ours = club ? club[pref.side] : null;
  const rows = pref.schemes.map((x) => `<div class="scheme-row ${x.fits ? 'fits' : ''} ${x.scheme === ours ? 'ours' : ''}"><span class="scheme-name">${x.fits ? '✦' : '·'} ${esc(x.label)}${x.scheme === ours ? ` <span class="chip accent">${$t('roster.your_scheme')}</span>` : ''}</span><span class="dim">${x.fits ? `${$t('roster.fits', { margin: x.margin })}` : `${x.margin} short`} ${$t('roster.wants')} ${x.keys.join(' & ')}</span></div>`).join('');
  const head = mine?.fits ? `<p class="fit-key" style="margin:2px 0 6px">${$t('roster.fits_your_scheme', { side: esc(pref.side) })}</p>` : pref.best?.fits ? `<p class="muted" style="margin:2px 0 6px">${$t('roster.prefers_b_b_not_a_fit', { label: esc(pref.best.label), side: esc(pref.side) })}</p>` : `<p class="muted" style="margin:2px 0 6px">${$t('roster.no_scheme_fits_yet_closest_is', { label: esc(pref.best.label) })}</p>`;
  return `<div class="panel scheme">${$t('roster.b_scheme_b', { head })}<div class="stack" style="gap:2px">${rows}</div></div>`;
}
/** Evolution block: stage, the next form as a silhouette until it happens, and the Evolve button once the level is reached. */
function evolutionHtml(m) {
  const sp = resolveSpecies(m); if (!sp.evolution.length) return '';
  const st = m.stage || 0; const next = nextEvolution(m); const ready = evolutionReady(m);
  const stageText = st ? `${$t('roster.stage_of_evolved_from', { st: st + 1, n: sp.evolution.length + 1, name: esc(sp.name) })}` : $t('roster.base_form');
  if (!next) return `${$t('roster.b_evolution_b')}<p class="muted" style="margin:2px 0">${$t('roster.fully_evolved', { stageText })}</p>`;
  return `${$t('roster.b_evolution_b')}<div class="row evo-row" style="margin:4px 0 2px;align-items:center;gap:10px">${monsterSprite(m, 40)}<span class="dim">→</span><span class="evo-next ${ready ? 'evo-ready' : ''}">${silhouette(next.spec, 48)}</span><div class="grow"><div class="muted">${stageText}</div><div class="${ready ? 'good' : 'dim'}">${ready ? `${$t('roster.b_ready_to_evolve_b_level', { level: next.level })}` : `${$t('roster.next_form_at_level', { level: next.level, level2: m.level >= next.level - 2 ? $t('roster.soon') : '' })}`}</div></div></div>${ready ? `<button class="btn primary block evolve-btn" data-action="evolve" style="margin-top:6px"><span class="evo-spark" aria-hidden="true">✨</span> ${$t('roster.evolve_2', { name: esc(m.name) })} <span class="evo-spark" aria-hidden="true">✨</span></button>` : ''}`;
}

/** Bio card (GDD §20.2): where the monster is from, how long it has been pro, and every club on its record. */
function bioHtml(f, m) {
  const b = F.monsterBio(f, m);
  const span = (s) => s.regional ? `${s.to - s.from + 1} season${s.to - s.from ? 's' : ''}` : s.to == null ? (s.from >= (f.season?.year || 1) ? `${yearOf(s.from)}` : `${yearOf(s.from)}-now`) : s.from === s.to ? `${yearOf(s.from)}` : `${yearOf(s.from)}-${yearOf(s.to)}`;
  const why = (s) => s.regional ? $t('roster.before_the_league') : s.current ? '' : s.reason === 'walked' ? $t('roster.left_as_a_free_agent') : s.reason === 'commissioner' ? $t('roster.cut_by_the_commissioner') : s.reason === 'released' ? 'released' : s.reason === 'signed' ? $t('roster.signed_from_the_pool') : s.reason || '';
  return `<div class="panel bio"><div class="row between">${$t('roster.b_bio_b')}<span class="dim">${b.rookie ? $t('roster.rookie_season') : `${$t('roster.seasons_pro', { yearsPro: b.yearsPro, n: b.yearsPro })}`}</span></div>
    <div class="muted">${$t('roster.born_in_b_b', { birthplace: esc(b.birthplace) })}${m.drafted ? ` ${$t('roster.drafted_round_in_the_class', { overall: m.drafted.overall, drafted: m.drafted.round, year: yearOf(m.drafted.year) })}${m.drafted.club !== f.club ? ` by ${esc(m.drafted.club)}` : ''}` : m.rookie != null ? ` ${$t('roster.draft_class', { year: yearOf(m.rookie) })}` : ''}</div>
    <div class="stints">${b.stints.map((s) => `<div class="stint ${s.current ? 'current' : ''}"><span class="when">${span(s)}</span><span class="club">${esc(s.club)}</span><span class="dim">${esc(why(s))}</span></div>`).join('')}</div></div>`;
}

/** Scheme lock banner (GDD §17): all starters on this side fit the coordinator's scheme → the side plays with an edge on Sunday. */
function schemeLockHtml(f, side) {
  const lock = F.schemeLock(f); const x = lock.fit[side]; const on = side === 'offense' ? lock.offense : lock.defense;
  if (on) return `<div class="scheme-lock">${$t('roster.b_scheme_locked_b', { side })}<div>${$t('roster.all_starters_fit_b_b_every', { total: x.total, side: side === 'offense' ? 'offensive' : 'defensive', scheme: esc(x.scheme), side2: side === 'offense' ? 'offensive' : 'defensive', schemeLockEdge: F.SCHEME_LOCK_EDGE })}</div></div>`;
  if (x.total && x.total - x.fit <= 2) return `<p class="dim" style="margin:4px 0">${$t('roster.of_starters_fit_more_and_the', { fit: x.fit, total: x.total, scheme: esc(x.scheme), fit2: x.total - x.fit })}</p>`;
  return '';
}
