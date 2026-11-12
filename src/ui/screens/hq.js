// Franchise Headquarters and the weekly action screens, plus playbook
// browsing and the league screens.

import { abilitiesHtml } from '../ability-info.js';
import { apexEmblem, apexFactsHtml } from '../apex-ui.js';
import { discover } from '../../franchise/t8/discovery.js';
import { venueHtml } from '../stadium-preview.js';
import { leagueNewsPanel, leagueNewsSheetHtml } from '../league-news-ui.js';
import { careerLink, careerBlockHtml } from '../career-ui.js';
import { legendaryCardHtml, openLegendarySheet, announceLegendary } from '../legendary-ui.js';
import { LEGENDARY_IDS, unannouncedLegendary } from '../../franchise/legendary.js';
import { esc, delegate, toast, sheet, fmtMoney, confirmSheet } from '../dom.js';
import { retirementDue, retirementChecklist, requestRetirement, cancelRetirement, SEASON_CAP, seasonsCompleted, isArchived } from '../../franchise/lifecycle.js';
import { ROUTE_LABELS } from '../../data/routes.js';
import { yearOf } from '../../data/calendar.js';

import * as F from '../../franchise/franchise.js';
import { REPORTERS, STYLE_LABEL, STYLE_ICON } from '../../data/press.js';
import { REGIONS, TRAINING_FOCI, ROLE_LABEL, trainingBonus } from '../../data/staff.js';
import { PLAYS, LESSONS, counterPlays } from '../../data/playbook.js';
import { tierById, TEAM_META, DIVISIONS, conferenceFor, divisionOf } from '../../data/league.js';
import { temperSummary } from '../../data/temper.js';
import { salaryFor, monsterOverall, TYPES, effectiveAttributes, HEADLINE, headlineAttributes, resolveSpecies, ABILITIES } from '../../data/monsters.js';
import { TRAITS } from '../../data/species.js';
import { headlineHtml } from './roster.js';
import { ATTRIBUTES, OFFENSE_BASE, DEFENSE_BASE, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS } from '../../data/personnel.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
import { GYMS, GYM_BY_CLUB } from '../../data/gyms.js';
import { SPECIES_BY_ID } from '../../data/monsters.js';
import { sprite16 } from '../sprite16.js';
import { playCardSvg, legendHtml } from '../play-art.js';
import { teamOverall, buildDepthChart } from '../../franchise/roster.js';
import { AWARD_RULES } from '../../franchise/awards.js';
import { RIVAL_WEEKLY } from '../../data/dialogue.js';
import { LEADER_CATEGORIES, leaders, statLine, leagueSeasons, seasonTables, combinedTable, ARCHIVE_SEASONS } from '../../franchise/stats.js';
import { HELP_HTML as CLASH_HELP } from './clash-battle.js';
import { warningsHtml, noteHtml } from '../tutorial.js';
import { suggestProspect, suggestDraftPick, suggestContract, suggestGoal, consequence } from '../../franchise/assist-advice.js';
import { captainWarning, captainBadge } from '../captains-ui.js';
import { callPanelHtml, callConfirmText, openTradeDesk, tradeStatusHtml, tradeLineHtml } from '../trade-desk-ui.js';
import { faOffseasonHtml, faHandlers, migrationPanelHtml, negotiationSheet, lineupGateSheet } from '../fa-ui.js';
import { t as $t, fieldText } from '../../text/index.js';

const STARTERS_BY_POS = { QB: 1, RB: 1, WR: 2, TE: 1, OL: 2, DL: 2, LB: 2, CB: 2, S: 1, K: 1 };

const ATTR_LABEL = { speed: $t('hq.speed'), agility: $t('hq.agility'), strength: $t('hq.strength'), awareness: $t('hq.awareness'), catching: $t('hq.catching'), arm: $t('hq.arm'), accuracy: $t('hq.accuracy'), blocking: $t('hq.blocking'), tackling: $t('hq.tackling'), coverage: $t('hq.coverage'), durability: $t('hq.durability'), kicking: $t('hq.kicking') };

export function weekStrip(f) {
  return `<div class="week" aria-label="${$t('hq.week', { week: f.season.week })}">${F.DAYS.map((d, i) => `<div class="day ${i < f.season.day ? 'done' : i === f.season.day ? 'today' : ''}" title="${esc(F.DAY_ACTIONS[i])}">${d.slice(0, 3)}</div>`).join('')}</div>`;
}

export function registerHqScreens(Router, app) {
  // Answering a call works wherever the panel shows.
  document.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-call]'); if (!b || !app.f) return; e.preventDefault();
    const yes = b.dataset.call === 'yes'; const c = F.tradeCall(app.f); if (!c) return;
    if (yes && !(await confirmSheet(callConfirmText(app.f, c), { title: $t('hq.accept_the_trade'), okLabel: $t('hq.trade') }))) return;
    const r = F.answerTradeCall(app.f, yes); if (!r.ok) { toast(r.reason, 'bad'); Router.render(); return; }
    app.save(); toast(yes ? (c.kind === 'buy' ? $t('hq.deal_done') : `${r.got?.player?.name || $t('hq.deal')} ${r.got?.player ? $t('hq.is_yours') : 'done.'}`) : $t('hq.offer_declined'), yes ? 'good' : 'info'); Router.render();
  });
  const need = () => app.f;

  /** Captain Partnerships (GDD §27.4B): the one-time initial pick, or next season's pick in the offseason. Never blocks anything. */
  function captainCard(f) {
    if (F.initialCaptainsDue(f)) return `<div class="panel cap-card">${$t('hq.b_pick_your_team_captains_b')}<p class="dim" style="margin:4px 0 8px">${$t('hq.new_two_captains_for_offense_and')}</p><button class="btn primary block" data-action="go" data-screen="captains">${$t('hq.choose_captains')}</button></div>`;
    if (F.offseasonCaptainsOpen(f)) { const pick = f.partnerships?.pick?.year === f.season.year + 1; return `<div class="panel cap-card">${$t('hq.b_captains_for_b', { year: yearOf(f.season.year + 1) })}<p class="dim" style="margin:4px 0 8px">${pick ? $t('hq.saved_you_can_change_them_until') : $t('hq.choose_next_seasons_captains_or_the')}</p><button class="btn block" data-action="go" data-screen="captains">${pick ? $t('hq.review_captains') : $t('hq.choose_captains')}</button></div>`; }
    return '';
  }
  Router.registerScreen('hq', {
    title: ({ f }) => f ? f.club : $t('hq.headquarters'), back: false,
    render({ f }) {
      if (!f) return `<p>${$t('hq.no_franchise')}</p>`;
      if (isArchived(f)) { setTimeout(() => Router.go('legacy', {}, { reset: true }), 0); return `<div class="panel"><p>${$t('hq.this_franchise_is_a_read_only')}</p></div>`; } // GDD §42.7: the archive shell, never HQ
      if (F.nextStaffRole(f) && !f.season.finished) return `<div class="panel"><p>${$t('hq.your_front_office_is_not_complete')}</p><button class="btn primary block" data-action="go" data-screen="hire">${$t('hq.hire_staff')}</button></div>`;
      const s = F.summary(f); const cap = s.cap; const tier = tierById(f.tier);
      const fx = F.currentFixture(f); const po = F.playoffFixture(f);
      const opp = F.opponentName(f);
      const rival = f.rivals[f.tier];
      const day = f.season.day;
      const offPending = f.season.finished && (!F.offseasonReady(f) || !F.draftDone(f) || f.roster.length < F.ROSTER_MIN || F.nextStaffRole(f));
      const due = retirementDue(f);
      const next = due === 'fired' ? { label: $t('hq.the_board_has_let_you_go'), action: 'fired', icon: '🚪' } : due === 'season-cap' ? { label: `${$t('hq.season_complete_retire_to_the_franchise', { seasonCap: SEASON_CAP })}`, action: 'retire-now', icon: '🏛️' } : due === 'voluntary' ? { label: $t('hq.retirement_complete_it_now'), action: 'retire-now', icon: '🏛️' } : f.season.finished ? (F.postseasonEvent(f) ? { label: `${$t('hq.postseason', { title: F.postseasonEvent(f).title })}`, action: 'postseason', icon: '📞' } : f.legendPick && !f.legendPick.resolved ? { label: $t('hq.choose_your_legend_track'), action: 'legend', icon: '🌟' } : { label: offPending ? `${$t('hq.offseason')} ${F.offseasonPending(f).length ? F.offseasonPending(f).length + ' contract decision' + (F.offseasonPending(f).length === 1 ? '' : 's') : !F.draftDone(f) ? $t('hq.the_draft') : f.roster.length < F.ROSTER_MIN ? $t('hq.sign_to') + F.ROSTER_MIN + ' monsters' : 'hire staff'}` : $t('hq.continue_to_the_offseason'), action: 'offseason', icon: '📋' }) : nextAction(f);
      const race = f.season.week >= 5 && !f.season.finished && !F.inPlayoffs(f) ? `<div class="muted" style="margin-top:4px">${$t('hq.playoff_race_b_b', { text: esc(F.playoffPicture(f).text) })}</div>` : '';
      const gameLine = f.season.finished ? `${$t('hq.b_season_complete_b', { year: yearOf(f.season.year), club: f.season.champion === f.club ? $t('hq.beast_bowl_champions') : f.season.champion ? $t('hq.won_the_beast_bowl_2', { club: esc(f.season.champion) }) : '' })} <button class="btn small" data-action="awards">${$t('hq.how_we_finished')}</button>`
        : po ? `<b>${esc(po.tag)}</b> · ${po.home === f.club ? 'vs' : '@'} ${esc(opp)}`
        : fx?.bye ? `<b>${$t('hq.bye_week')}</b>${$t('hq.rest_and_recover')}` : fx ? `<b>Week ${fx.week}</b> · ${fx.home ? 'vs' : '@'} ${esc(opp)} · ${esc(fx.category)}${rival?.team === opp ? $t('hq.rival') : ''}` : '';
      // Last game (2026-10-22 feedback pass): the result and what it did to the roster, shown through the following week.
      const lg = f.lastGame; const lgFresh = lg && lg.year === f.season.year && (lg.week === f.season.week - 1 || (lg.week === f.season.week && f.season.day === 0)) && !f.season.finished;
      const lgEvents = lgFresh ? (lg.events || []) : []; const lgLvl = lgEvents.filter((e) => e.kind === 'levelup' || e.kind === 'evolve'), lgInj = lgEvents.filter((e) => e.kind === 'injury');
      const lastGame = lgFresh ? `<div class="panel tight last-game ${lg.won ? 'won' : 'lost'}"><div class="row between"><span><b>${lg.forfeit ? $t('hq.forfeit') : lg.won ? $t('hq.win') : $t('hq.loss')}</b> ${lg.playerScore}–${lg.oppScore} vs ${esc(lg.opponent)}</span><span class="dim">week ${lg.week}</span></div>${lgLvl.length || lgInj.length ? `<div class="dim" style="margin-top:2px">${lgLvl.map((e) => e.kind === 'evolve' ? `✨ ${esc(e.from)} → ${esc(e.to)}` : `⬆️ ${esc(e.name)} Lv ${e.level}`).join(' · ')}${lgLvl.length && lgInj.length ? ' · ' : ''}${lgInj.map((e) => `<span style="color:var(--bad)">🩹 ${esc(e.name)} ${e.weeks}w</span>`).join(' · ')}</div>` : ''}</div>` : '';
      const lb = f.campaign?.lastBadge; const lbGym = lb && lb.year === f.season.year && f.season.week - lb.week <= 1 ? GYM_BY_CLUB[lb.club] : null;
      const badgeBanner = lbGym ? `<div class="badge-banner" style="--hue:${TYPES[lbGym.element]?.hue ?? 120}"><span class="badge-banner-star">★</span><div>${$t('hq.b_earned_b_badge_of_8', { badge: esc(lbGym.badge), n: lb.n })}<div class="dim">${$t('hq.s_beaten_in_week', { name: esc(lbGym.coach.name), club: esc(lb.club), lb: lb.week })} ${lb.n === 8 ? $t('hq.all_eight_the_gyms_are_yours') : `${$t('hq.to_go', { n: 8 - lb.n })}`}</div></div></div>` : '';
      return `${badgeBanner}${callPanelHtml(f)}${tradeLineHtml(f)}${lastGame}
        <div class="panel tight"><div class="row between"><div><b>${yearOf(F.displayYear(f))}</b> · ${phaseLabel(f)}</div><div class="chip accent">${$t('hq.team_ovr', { overall: s.overall })}</div></div>
          <div class="row between" style="margin-top:4px"><span>${f.season.playoffs ? playoffStatus(f) : `${$t('hq.record')} <b class="mono">${s.record}</b>${rival ? ` · <span class="dim">${$t('hq.rival_2', { team: esc(rival.team) })}</span>` : ''}`}</span><span class="muted">${$t('hq.cap_room')} <b style="color:${cap.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(cap.remaining)}</b></span></div>${race}</div>
        ${weekStrip(f)}
        <div class="panel"><div class="muted" style="font-size:12px">${$t('hq.this_week')}</div><div style="margin:4px 0 8px">${gameLine}${(() => { const g = opp && GYM_BY_CLUB[opp]; if (!g || f.season.finished) return ''; const b = F.badgeOf(f, opp); return `<div class="muted" style="margin-top:4px">${b ? `${$t('hq.you_hold_the', { badge: esc(g.badge), year: yearOf(b.year) })}` : `${$t('hq.b_badge_game_b_beat_s', { name: esc(g.coach.name), opp: esc(opp), badge: esc(g.badge) })}`}</div>`; })()}</div>
          ${next ? `<button class="btn primary big block ${next.action === 'forfeit' || next.action === 'lineupgate' ? 'danger' : ''}" data-action="${next.action}">${next.icon} ${esc(next.label)}</button>${next.note ? `<p class="dim" style="margin:4px 0 0;color:var(--bad)">${$t('hq.fix_the_depth_chart_or_sign', { note: esc(next.note) })}</p>` : ''}${next.skip ? `<button class="btn block" data-action="skipplayoffs" style="margin-top:8px">${$t('hq.skip_to_the_offseason')}</button>` : ''}` : ''}
          ${!f.season.finished && day < 6 && !f.week.commissioner && !(F.inPlayoffs(f) && !F.playoffFixture(f)) && !F.needsGoal(f) ? `<button class="btn block" data-action="autorun" style="margin-top:8px">${$t('hq.let_the_staff_run_the_week')}</button>` : ''}
          ${cap.over && !f.week.commissioner ? `<p class="muted" style="color:var(--warn);margin-top:8px">${$t('hq.over_the_cap_by_the_commissioner', { amount: fmtMoney(-cap.remaining) })} <button class="btn small" data-action="releasemon">${$t('hq.release_a_monster')}</button></p>` : ''}
          ${f.week.commissioner ? `<p class="muted" style="color:var(--bad);margin-top:8px">${$t('hq.the_commissioner_is_waiting_over_the', { amount: fmtMoney(f.week.commissioner.over) })}</p>` : ''}${warningsHtml(f, { max: 2, only: ['min', 'depth', 'hurt', 'tight', 'points'] })}</div>
        ${captainCard(f)}
        ${rivalCard(f)}
        ${boardPanel(f)}
        ${campaignPanel(f)}
        ${f.week.gameResult && !f.week.gameResult.bye && day === 0 ? '' : ''}
        <div class="grid2" style="margin-bottom:var(--s3)">
          <button class="btn block" data-action="go" data-screen="schedule">${$t('hq.schedule')}</button><button class="btn block" data-action="go" data-screen="standings">${$t('hq.standings')}</button>
          <button class="btn block" data-action="go" data-screen="league">${$t('hq.league_hub')}</button><button class="btn block" data-action="go" data-screen="history">${$t('hq.history_and_records')}</button>
          <button class="btn block" data-action="go" data-screen="staff">${$t('hq.coaching_staff')}</button><button class="btn block" data-action="go" data-screen="practice">${$t('hq.practice')}</button></div>
        ${leagueNewsPanel(f, { clubLog: f.news })}`;
    },
    mount(root) {
      if (app.f && !app.f.achievementsBackfilled && F.backfillAchievements(app.f).length) app.save();
      if (app.f && !app.f.game && F.nextScene(app.f)) { setTimeout(() => Router.go('scene', {}, { reset: true }), 0); return; } // an achievement cutscene plays before anything else (GDD §21)
      // Legendary Plays (GDD §36.8): a Legendary just joined? Show the discovery card once; the plan is never changed for the owner.
      if (app.f && !app.f.game) { const r = F.syncLegendary(app.f); const ids = unannouncedLegendary(app.f); if (ids.length && !document.querySelector('.sheet')) announceLegendary(app.f, ids, { onPlan: () => Router.go(app.f.season.day === 4 ? 'gameplan' : 'playbook'), save: () => app.save() }); else if (r.discovered.length || r.removed.length) app.save(); }
      if (F.hallOfFameNotice(app.f)) { app.save(); sheet(`<div class="commissioner">${portraitSprite('commissioner', 56, { hue: 210 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">${$t('hq.league_commissioner')}</div>${$t('hq.eight_badges_the_titles_the_wins')}</div></div>`, { title: $t('hq.hall_of_fame') }); }
      const f0 = app.f;
      if (f0?.season.playoffs && !f0.season.recapShown && !f0.game) { f0.season.recapShown = true; app.save(); sheet(seasonRecapHtml(f0), { title: `${$t('hq.regular_season_over', { year: yearOf(f0.season.year) })}` }); }
      else if (f0?.season.finished && f0.season.awards && !f0.season.awardsShown) { f0.season.awardsShown = true; app.save(); sheet(seasonFinalHtml(f0), { title: `${$t('hq.how_we_finished_2', { year: yearOf(f0.season.year) })}` }); }
      delegate(root, {
        go: (el) => Router.go(el.dataset.screen),
        scout: () => Router.go('scout'), recruit: () => Router.go('recruit'), training: () => Router.go('training'), scoutopp: () => Router.go('scoutopp'), gameplan: () => Router.go('gameplan'), lineup: () => Router.go('lineup'),
        bye: () => { F.takeBye(app.f); app.save(); toast($t('hq.bye_week_taken_fatigue_recovered')); Router.render(); },
        game: () => { if (!F.canPlayGames(app.f)) { Router.go('commissioner'); return; } Router.go('pregame'); },
        lineupgate: () => lineupGateSheet(app, { mode: 'game', onContinue: () => { F.forfeitSunday(app.f); app.save(); Router.go('hq', {}, { reset: true }); }, onDone: () => { app.save(); Router.render(); } }), // the lineup safeguard
        forfeit: async () => { const m = F.sundayMatchup(app.f); if (!(await confirmSheet(`${$t('hq.forfeit_to_it_is_recorded_as', { forfeitReason: m?.forfeitReason || $t('hq.no_legal_lineup'), opponent: m?.opponent })}`, { title: $t('hq.forfeit_2'), okLabel: $t('hq.forfeit_2'), danger: true }))) return; F.forfeitSunday(app.f); app.save(); Router.go('hq', {}, { reset: true }); },
        commissioner: () => Router.go('commissioner'),
        restbye: () => { F.skipToByeIfIdle(app.f); app.save(); Router.render(); },
        postseason: () => Router.go('postseason'),
        legend: () => Router.go('legend'),
        // Retirement (GDD §42.4, decision R): available once the Hall of Fame checklist is met; it takes effect after the season.
        retire: async () => {
          const f = app.f; const eligible = F.hallOfFameProgress(f).eligible; if (!eligible) { toast($t('hq.not_yet_eligible_for_the_hall'), 'bad'); return; }
          if (f.lifecycle?.pendingRetirement) { if (await confirmSheet($t('hq.retirement_is_set_for_the_end'), { title: $t('hq.retirement_planned'), okLabel: $t('hq.keep_playing') })) { cancelRetirement(f); app.save(); Router.render(); } return; }
          if (!f.season.finished) {
            if (!(await confirmSheet(`${$t('hq.retire_at_the_end_of_this', { club: f.club })}`, { title: $t('hq.retire_after_this_season'), okLabel: $t('hq.retire_after_the_season') }))) return;
            requestRetirement(f); app.save(); toast($t('hq.retirement_is_set_for_the_end_2'), 'info', 4000); Router.render(); return;
          }
          await retireNow(app, Router, 'voluntary');
        },
        'retire-now': async () => { const due = retirementDue(app.f); if (!due) { toast($t('hq.retirement_is_not_due_yet'), 'bad'); return; } await retireNow(app, Router, due); },
        resume: () => Router.go('match'),
        goals: () => Router.go('goals'),
        offseason: () => Router.go('offseason'),
        scoutdraft: () => Router.go('draftclass'),
        recovery: () => { const r = F.recoveryDay(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(`<p>${$t('hq.everyone_rests_fatigue_15')}${r.healed.length ? ` <b>${esc(r.healed.join(', '))}${$t('hq.b_cleared_to_play')}` : $t('hq.injured_monsters_are_a_week_closer')}</p><p class="dim">${$t('hq.the_final_week_and_the_playoffs')}</p>`, { title: $t('hq.recovery_day'), onClose: () => Router.go('hq', {}, { reset: true }) }); },
        draft: () => Router.go('draft'), releasemon: () => Router.go('contracts'),
        leaguenews: () => sheet(leagueNewsSheetHtml(app.f), { title: $t('hq.league_news') }),
        recap: () => sheet(seasonRecapHtml(app.f), { title: `${$t('hq.regular_season', { year: yearOf(app.f.season.year) })}` }),
        watchround: () => { const r = F.advancePlayoffs(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(roundResultsHtml(app.f, r), { title: F.ROUND_NAMES[r.round] || `${$t('hq.round', { round: r.round })}`, onClose: () => Router.go('hq', {}, { reset: true }) }); },
        skipplayoffs: async () => { if (!(await confirmSheet($t('hq.simulate_the_rest_of_the_playoffs'), { title: $t('hq.skip_the_playoffs'), okLabel: $t('hq.skip') }))) return; F.skipPlayoffs(app.f); app.save(); Router.go('hq', {}, { reset: true }); },
        fired: async () => { await retireNow(app, Router, 'fired'); },
        autorun: async () => { if (!(await confirmSheet($t('hq.your_staff_will_scout_recruit_only'), { title: $t('hq.run_the_week'), okLabel: $t('hq.run_it') }))) return; const r = F.autoRunToSunday(app.f); app.save(); sheet(`<ul style="padding-left:18px">${r.did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`, { title: $t('hq.week_handled'), onClose: () => Router.go('hq', {}, { reset: true }) }); },
        awards: () => sheet(app.f.season.finished ? seasonFinalHtml(app.f) : seasonRecapHtml(app.f), { title: `${$t('hq.season', { year: yearOf(app.f.season.year) })}` }),
        gym: (el) => { const g = GYM_BY_CLUB[el.dataset.club]; if (!g) return; const b = F.badgeOf(app.f, g.club); const sp = SPECIES_BY_ID[g.legendary]; sheet(`<div class="row">${portraitSprite(g.coach.portrait, 56, { hue: TYPES[g.element]?.hue })}<div><b>${esc(g.coach.name)}</b><div class="muted">${$t('hq.head_coach', { club: esc(g.club), style: esc(g.coach.style) })}</div><div class="muted">${$t('hq.gym_tier', { element: esc(g.element), tier: g.tier })}</div></div></div><p>${b ? `${$t('hq.b_b_earned_in_week', { badge: esc(g.badge), year: yearOf(b.year), b: b.week, score: esc(b.score) })}` : `${$t('hq.beat_in_any_game_that_counts', { club: esc(g.club), badge: esc(g.badge) })}`}</p><h3>${$t('hq.signature_monster')}</h3><div class="row">${sprite16(sp, 48)}<div><b>${esc(sp.name)}</b><div class="muted">${$t('hq.legendary', { element: esc(sp.element), position: sp.position })}</div><div class="muted">${esc(sp.ability.name)}: ${esc(sp.ability.text)}</div></div></div><p class="dim">${$t('hq.gym_clubs_grow_stronger_every_season')}</p>`, { title: g.badge }); },
        nextseason: async () => { if (await confirmSheet(`${$t('hq.start_the_season_your_roster_ages', { year: yearOf(app.f.season.year + 1) })}`, { title: $t('hq.new_season'), okLabel: $t('hq.start') })) { F.startNextSeason(app.f); app.save(); Router.render(); } },
      });
    },
  });
  function nextAction(f) {
    const d = f.season.day;
    if (f.game) return { label: f.game.state?.finished ? (f.game.state.needsTiebreak && !f.game.state.winner ? $t('hq.overtime_beast_clash_decides_the_game') : $t('hq.finish_the_game')) : $t('hq.resume_game'), action: 'resume', icon: f.game.state?.finished && f.game.state.needsTiebreak && !f.game.state.winner ? '⚔️' : '▶' };
    if (F.creationDraftPending(f)) return { label: `${$t('hq.draft_day_you_hold_the_pick', { lotterySlot: f.draft.lotterySlot })}`, action: 'draft', icon: '🎓' };
    if (F.needsGoal(f)) return { label: $t('hq.meet_the_commissioner_this_seasons_goal'), action: 'goals', icon: '🎯' };
    if (F.draftWindow(f) && d === 0) return { label: `${$t('hq.monday_scout_the_draft_class')}`, action: 'scoutdraft', icon: '🎓' };
    if (F.draftWindow(f) && d === 1) return { label: $t('hq.tuesday_recovery_day'), action: 'recovery', icon: '🩹' };
    if (F.inPlayoffs(f) && !F.playoffFixture(f) && !f.season.finished) return { label: `${$t('hq.playoffs_play_the')} ${(F.ROUND_NAMES[f.season.playoffs?.round] || $t('hq.next_round')).replace(/\b[a-z]/g, (c) => c.toUpperCase())}`, action: 'watchround', icon: '🏆', skip: true };
    if (f.week.commissioner) return { label: $t('hq.the_commissioners_office'), action: 'commissioner', icon: '🏛️' };
    if (F.isBye(f) && d >= 3 && d < 6) return { label: $t('hq.bye_week_rest_until_sunday'), action: 'restbye', icon: '😴' };
    if (d === 6) { if (F.isBye(f)) return { label: $t('hq.take_the_bye_week'), action: 'bye', icon: '😴' }; const m = F.sundayMatchup(f); if (m?.forfeit) return { label: $t('hq.lineup_incomplete_review_before_kickoff'), action: 'lineupgate', icon: '⚠️', note: m.forfeitReason }; return { label: $t('hq.play_sunday_game'), action: 'game', icon: '🏈' }; }
    return [{ label: $t('hq.monday_scout_a_region'), action: 'scout', icon: '🧭' }, { label: $t('hq.tuesday_monster_encounter'), action: 'recruit', icon: '⚔️' }, { label: $t('hq.wednesday_training_focus'), action: 'training', icon: '💪' }, { label: $t('hq.thursday_scout_opponent'), action: 'scoutopp', icon: '🔍' }, { label: $t('hq.friday_set_game_plan'), action: 'gameplan', icon: '📋' }, { label: $t('hq.saturday_media_day'), action: 'lineup', icon: '🎤' }][d];
  }

  // ---------------------------------------------------------------- the commissioner's office (GDD §15.6)
  // ---------------------------------------------------------------- Offseason (GDD §18.1)
  const yrs = {}; // contract length chosen per row (1 or 2 seasons), default 2
  Router.registerScreen('offseason', {
    title: ({ f }) => `${$t('hq.offseason_2', { year: yearOf(f ? F.displayYear(f) : 1) })}`,
    render({ f }) {
      const items = f.offseason?.items || []; const pending = F.offseasonPending(f);
      const cap = F.salarySummary(f); const usage = Math.min(100, Math.round(cap.total / cap.cap * 100));
      const fmt = (n) => n.toLocaleString('en-US');
      const monsters = items.filter((i) => i.kind === 'monster'), staff = items.filter((i) => i.kind === 'staff');
      // The salary is per season (it counts against the cap every year); the chosen length sets how many seasons it is locked in.
      const t7 = F.task7Offseason(f) && f.season.finished; // Task 7: renewals 1–3 seasons, answered by the monster; free agency before the draft
      const termLine = (i) => { const y = yrs[i.id] || 2; return `<div class="sub">${y === 1 ? '1 season' : `${y} seasons`} ${$t('hq.b_b_total', { amount: fmt(i.ask * y) })}</div>`; };
      const row = (i) => (t7 ? monsterNegRow(f, i, fmt) : old_row(i));
      const old_row = (i) => { const m = f.roster.find((x) => x.id === i.id); return `<div class="item static ${i.status ? 'done' : ''}" style="align-items:flex-start">${m ? monsterSprite(m, 36) : ''}<div class="grow"><div class="name">${esc(i.name)} <span class="dim">${$t('hq.ovr', { position: esc(i.position), ovr: i.ovr })}</span></div><div class="sub">${$t('hq.asks_b_b_yr', { amount: fmt(i.current), amount2: fmt(i.ask), big: i.big ? $t('hq.big_season_10') : '', award: i.award ? $t('hq.league_award_15') : '' })}</div>${i.status ? '' : termLine(i)}${i.status ? '' : noteHtml(suggestContract(f, i)?.text, 'suggest')}
        ${i.status ? `<div class="sub">${i.status === 'signed' ? `${$t('hq.re_signed_at_for', { amount: fmt(i.final) })} ${i.years === 1 ? '1 season' : `${i.years} seasons`}${i.countered === 'accepted' ? $t('hq.took_the_counter') : ''}` : i.status === 'declined' ? `${$t('hq.turned_down_a_free_agent_when', { countered: i.countered === 'refused' ? $t('hq.your_counter') : $t('hq.the_renewal') })}` : i.status === 'walked' ? `${$t('hq.walked', { countered: i.countered === 'refused' ? $t('hq.refused_the_counter') : '' })}` : esc(i.status)}</div>` : `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><span class="seg"><button class="btn small ${(yrs[i.id] || 2) === 1 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="1">1 yr</button><button class="btn small ${(yrs[i.id] || 2) === 2 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="2">2 yr</button>${t7 ? `<button class="btn small ${(yrs[i.id] || 2) === 3 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="3">3 yr</button>` : ''}</span>${i.counter ? `<button class="btn small primary" data-action="c" data-id="${i.id}" data-v="acceptcounter">${$t('hq.take_his_counter_yr', { amount: fmt(i.counter.salary), years: i.counter.years })}</button>` : ''}<button class="btn small ${i.counter ? '' : 'primary'}" data-action="c" data-id="${i.id}" data-v="sign">${$t('hq.sign_yr', { amount: fmt(i.ask) })}</button><button class="btn small" data-action="c" data-id="${i.id}" data-v="counter">${$t('hq.counter_yr', { amount: fmt(Math.round(i.ask * 0.85 / 100) * 100) })}</button><button class="btn small danger" data-action="c" data-id="${i.id}" data-v="walk">${$t('hq.let_walk')}</button></div>${m && m.age >= 29 ? `<div class="dim">${$t('hq.age_a_one_year_deal_keeps', { age: m.age })}</div>` : ''}`}</div></div>`; };
      const srow = (i) => (t7 && i.eval ? staffNegRow(f, i, fmt) : old_srow(i));
      const old_srow = (i) => `<div class="item static ${i.status ? 'done' : ''}"><div class="grow"><div class="name">${esc(i.name)} <span class="dim">${esc(i.role.replace(/_/g, ' '))}</span></div><div class="sub">${$t('hq.asks_b_b_yr_10', { current: fmt(i.current), ask: fmt(i.ask) })}</div>${i.status || !t7 ? '' : (() => { const c = F.staffRenewalCheck(f, i.role); return `<div class="sub" style="color:${c.ok ? 'var(--good)' : 'var(--bad)'}">${c.ok ? `${$t('hq.fits_next_seasons_cap_cr_would', { amount: fmt(c.room - c.demand) })}` : esc(c.reason)}</div>`; })()}${i.status ? '' : termLine(i)}${i.status ? `<div class="sub">${i.status === 'signed' ? `${$t('hq.re_signed_for', { years: i.years === 1 ? '1 season' : '2 seasons' })}` : $t('hq.left')}</div>` : `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><span class="seg"><button class="btn small ${(yrs[i.id] || 2) === 1 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="1">1 yr</button><button class="btn small ${(yrs[i.id] || 2) === 2 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="2">2 yr</button></span><button class="btn small primary" data-action="c" data-id="${i.id}" data-v="sign">${$t('hq.re_sign')}</button><button class="btn small danger" data-action="c" data-id="${i.id}" data-v="walk">${$t('hq.let_walk')}</button></div>`}</div></div>`;
      const faHtml = faOffseasonHtml(f); const market = faHtml == null ? F.offseasonMarket(f) : [];
      const canStart = F.offseasonReady(f) && (!t7 || F.freeAgencyDone(f)) && F.draftDone(f) && f.roster.length >= F.ROSTER_MIN && !F.nextStaffRole(f) && !F.legendCompliance(f)?.due;
      return `${migrationPanelHtml(f)}${callPanelHtml(f)}${warningsHtml(f, { max: 2, only: ['min', 'expiring'] })}<div class="panel"><div class="row between">${$t('hq.b_roster_b', { n: f.roster.length, rosterMax: F.ROSTER_MAX })}<span class="chip ${f.roster.length < F.ROSTER_MIN ? 'bad' : ''}">minimum ${F.ROSTER_MIN}</span></div>
        <div class="bar ${cap.over ? 'bad' : usage > 90 ? 'warn' : ''}" style="margin:6px 0"><i style="width:${usage}%"></i></div><div class="row between muted"><span>${$t('hq.cap', { amount: fmt(cap.cap) })}</span><span style="color:${cap.over ? 'var(--bad)' : 'var(--good)'}">${cap.over ? $t('hq.over_by') + fmt(-cap.remaining) : $t('hq.room') + fmt(cap.remaining)}</span></div>
        ${cap.over ? `<div class="panel tight hotseat" style="margin:6px 0">${$t('hq.b_over_the_cap_by_b', { amount: fmt(-cap.remaining) })}<div class="dim">${$t('hq.you_can_start_the_season_over')}</div><div class="row" style="gap:6px;margin-top:6px"><button class="btn small primary" data-action="releasemon">${$t('hq.release_a_monster')}</button><button class="btn small" data-action="staffroom">${$t('hq.staff')}</button></div></div>` : ''}
        ${t7 ? `<p class="dim">${$t('hq.renewals_run_one_to_three_seasons')}</p>` : ''}<p class="dim" ${t7 ? 'hidden' : ''}>${$t('hq.new_signings_are_two_seasons_at')}</p></div>
        ${(() => { const R = f.retirementsLast; if (!R || R.year !== f.season.year) return ''; const total = (R.league || 0) + (R.owner?.length || 0) + (R.unsigned || 0); if (!total) return '';
          return `<h3>${$t('hq.retirements')}</h3><div class="panel tight">${R.owner?.length ? `${$t('hq.b_your_club_retired_b', { n: R.owner.length })}<div class="list" style="margin-top:4px">${R.owner.map((x) => `<div class="item static"><div class="grow"><div class="name">🌅 ${esc(x.name)} <span class="dim">${$t('hq.ovr_age', { position: esc(x.position), ovr: x.ovr, age: x.age, starter: x.starter ? $t('hq.a_starter') : '' })}</span></div><div class="sub">${$t('hq.retirement_is_final_the_draft_and')}</div></div></div>`).join('')}</div>` : `<b>${$t('hq.none_of_your_monsters_retired')}</b>`}<div class="dim" style="margin-top:6px">${$t('hq.around_the_league_retired_from_ai', { league: R.league })}${R.unsigned ? `${$t('hq.unsigned', { unsigned: R.unsigned })}` : ''}${R.notable?.length ? ` · ${R.notable.map((x) => `${esc(x.name)} (${esc(x.club)}, ${x.age})`).join(', ')}` : ''}.</div></div>`; })()}
        ${monsters.length ? `<h3>${$t('hq.contracts_up_monsters')}${monsters.filter((i) => !i.status).length} ${$t('hq.to_decide')}</h3>${monsters.some((i) => !i.status) ? `<div class="row" style="gap:6px;margin-bottom:6px"><button class="btn small" data-action="signall">${$t('hq.sign_everyone_left_at_their_ask')}</button><span class="dim">${$t('hq.total_yr', { total: fmt(monsters.filter((i) => !i.status).reduce((a, i) => a + i.ask, 0)) })}</span></div>` : ''}<div class="list">${monsters.map(row).join('')}</div>` : `<h3>${$t('hq.contracts')}</h3><p class="dim">${$t('hq.no_monster_deals_expire_this_offseason')}</p>`}
        ${staff.length ? `<h3>${$t('hq.contracts_up_staff')}</h3><div class="list">${staff.map(srow).join('')}</div>` : ''}
        ${F.nextStaffRole(f) ? `<div class="panel tight" style="border-color:var(--bad)">${$t('hq.b_front_office_incomplete_b')} <button class="btn small" data-action="hire">${$t('hq.hire_staff')}</button></div>` : ''}
        ${faHtml != null ? faHtml : ''}<h3>${$t('hq.the_draft_2')}</h3><div class="panel tight">${F.draftDone(f) ? `${$t('hq.b_draft_held_b')} ${f.draft ? `${f.draft.picks.filter((p) => p.mine && !p.passed).length} ${$t('hq.rookies_drafted')}` : ''}` : `<b>${f.draft?.started ? $t('hq.draft_in_progress') : $t('hq.three_rounds_worst_record_first')}</b> <div class="dim">${$t('hq.rookies_sign_two_seasons_at_of', { n: Math.round(F.ROOKIE_SCALE * 100), n2: pending.length ? $t('hq.settle_the_contracts_to_open_it') : t7 && !F.freeAgencyDone(f) ? $t('hq.free_agency_comes_first_it_opens') : '' })}</div><button class="btn primary block" data-action="draft" ${pending.length || (t7 && !F.freeAgencyDone(f)) ? 'disabled' : ''} style="margin-top:6px">${f.draft?.started ? $t('hq.back_to_the_draft_room') : $t('hq.open_the_draft')}</button>${f.draft?.started ? '' : `<button class="btn block" data-action="shop" style="margin-top:6px">${$t('hq.shop_your_picks_before_the_draft')}</button>`}<div class="dim" style="margin-top:6px">${picksLine(f)}</div>`}</div>
        ${faHtml != null ? '' : `<h3>${$t('hq.free_agent_market', { n: market.length })}</h3><p class="dim">${$t('hq.pool_monsters_keep_their_stats_and')}</p>
        ${needsBanner(f)}
        <div class="list">${market.map((e) => ({ e, pf: F.positionFit(f, e.monster) })).sort((a, b) => ({ need: 0, starter: 1, depth: 2 }[a.pf.kind] ?? 3) - ({ need: 0, starter: 1, depth: 2 }[b.pf.kind] ?? 3)).map(({ e, pf }) => { const m = e.monster; const v = F.freeAgentView(f, m); return `<div class="item tappable ${fitClass(pf)}" data-action="fa" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${careerLink(m.id, m.name)} <span class="dim">${esc(m.position)} · ${v.ovr != null ? `${$t('hq.ovr_2', { ovr: v.ovr })}` : $t('hq.ovr_3')} ${$t('hq.age', { age: m.age })}</span>${e.fromPool ? ' <span class="chip warn">free agent</span>' : ''}${v.formerOwn ? ` <span class="chip accent">${$t('hq.played_for_you')}</span>` : ''}</div><div class="sub">${esc(m.origin || '')} · ${(() => { const a = F.freeAgentAsk(f, m); return a.estimate ? `${$t('hq.asks_about_yr', { amount: fmt(a.shown) })}` : `${$t('hq.asks_yr', { amount: fmt(a.shown) })}`; })()}${(m.history || []).length ? ' · ' + esc(m.history.map((h) => h.club).join(', ')) : ''}</div>${fitLine(pf)}<div class="dim" style="font-size:11px">${headlineAttributes(m) ? HEADLINE.slice(0, 4).map((x) => `${x.label.slice(0, 3)} ${headlineAttributes(m)[x.key]}`).join(' · ') : ''} ${$t('hq.tap_for_the_full_card')}</div></div><button class="btn small" data-action="sign" data-id="${m.id}" ${f.roster.length >= F.ROSTER_MAX ? 'disabled' : ''}>${$t('hq.sign')}</button></div>`; }).join('') || `<p class="dim">${$t('hq.nobody_on_the_market')}</p>`}</div>`}
        <button class="btn primary big block ${canStart ? '' : 'disabled'}" data-action="start" ${canStart ? '' : 'disabled'} style="margin-top:12px">${$t('hq.start_the_season', { year: yearOf(f.season.year + 1) })}</button>${canStart ? '' : `<p class="dim center">${pending.length ? `${$t('hq.contract_decisions_first', { n: pending.length })}` : t7 && !F.freeAgencyDone(f) ? $t('hq.finish_free_agency_periods_1_5') : F.legendCompliance(f)?.due ? $t('hq.the_legendary_limit_trade_or_release') : !F.draftDone(f) ? $t('hq.hold_the_draft_first') : f.roster.length < F.ROSTER_MIN ? `${$t('hq.sign_more_to_reach_the_minimum', { n: F.ROSTER_MIN - f.roster.length })}` : $t('hq.hire_a_full_staff_first')}</p>`}`;
    },
    mount(root) {
      delegate(root, {
        yrs: (el) => { yrs[el.dataset.id] = Number(el.dataset.v); Router.render(); },
        c: async (el) => { const v = el.dataset.v; const item = (app.f.offseason?.items || []).find((i) => i.id === el.dataset.id); if (v === 'acceptcounter') { const r = F.resolveContract(app.f, el.dataset.id, 'acceptcounter'); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); return; } if (v === 'walk' && !(await confirmSheet(`${$t('hq.let_walk_2', { name: item?.name, item: item?.kind === 'staff' ? $t('hq.you_will_need_to_hire_a') : $t('hq.they_go_to_the_free_agent') })}`, { title: $t('hq.let_walk'), okLabel: $t('hq.let_walk'), danger: true }))) return; const r = F.resolveContract(app.f, el.dataset.id, v, { years: yrs[el.dataset.id] || 2 }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); if (r.status === 'rejected') toast(r.reason, 'bad'); else if (r.status === 'walked' && fieldText(r, 'why')) toast(`${$t('hq.leaves', { name: item?.name, why: fieldText(r, 'why') })}`, 'bad'); else if (r.status === 'countered') toast(`${$t('hq.he_counters_yr_for', { toLocaleString: r.counter.salary.toLocaleString('en-US'), years: r.counter.years })}`, 'info'); else if (r.status === 'declined') toast($t('hq.he_turned_it_down_a_free'), 'bad'); else if (r.status === 'signed') toast('Re-signed.', 'good'); else if (v === 'counter') toast(r.countered === 'accepted' ? $t('hq.they_took_the_counter') : $t('hq.they_refused_and_walked'), r.countered === 'accepted' ? 'good' : 'bad'); Router.render(); },
        sign: (el, ev) => { ev?.stopPropagation?.(); const r = F.signFreeAgent(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? $t('hq.signed_over_the_cap') : 'Signed.', r.overCap ? 'bad' : 'good'); Router.render(); },
        fa: (el) => freeAgentSheet(app.f, el.dataset.id, () => Router.render()),
        negrenew: (el) => negotiationSheet(app, el.dataset.id, () => Router.render(), { mode: 'renew' }),
        hire: () => Router.go('hire'),
        draft: () => Router.go('draft'),
        shop: () => tradeSheet(app.f, { onDone: () => Router.render() }),
        releasemon: () => Router.go('contracts'), staffroom: () => Router.go('staff'),
        signall: async () => { const left = (app.f.offseason?.items || []).filter((i) => i.kind === 'monster' && !i.status); if (!(await confirmSheet(`${$t('hq.re_sign_all_remaining_monsters_at', { n: left.length })}`, { title: $t('hq.sign_everyone'), okLabel: $t('hq.sign_all') }))) return; for (const i of left) F.resolveContract(app.f, i.id, 'sign'); app.save(); Router.render(); },
        ...faHandlers(app, Router), // Task 7: the market (fa-ui.js)
        start: async () => { if (!(await confirmSheet(`${$t('hq.start_the_season_2', { year: yearOf(app.f.season.year + 1), task7Offseason: F.task7Offseason(app.f) ? $t('hq.the_record_resets_your_roster_aged') : $t('hq.your_roster_ages_one_year_and') })}`, { title: $t('hq.new_season'), okLabel: $t('hq.start') }))) return; const r = F.startNextSeason(app.f); if (!r.ok && r.code === 'lineup') { lineupGateSheet(app, { mode: 'season', onContinue: () => { const x = F.startNextSeason(app.f, { acceptForfeits: true }); if (!x.ok) { toast(x.reason, 'bad'); return; } app.save(); Router.go('hq', {}, { reset: true }); }, onDone: () => { app.save(); Router.render(); } }); return; } if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.go('hq', {}, { reset: true }); }, // the lineup safeguard at the season start
      });
    },
  });
  // ---------------------------------------------------------------- Draft class (GDD §19)
  let draftFocus = '', draftSort = 'board';
  // Roster fit (v42.11): a card's border shows whether he would help THIS roster, blue on offense, red on defense; solid when he
  // would start (an open starting spot, or better than your weakest starter), dashed when he would be your only backup.
  const fitClass = (fit) => (fit?.kind ? `${$t('hq.pfit_pfit_pfit', { side: fit.side, kind: fit.kind === 'depth' ? 'depth' : 'start' })}` : '');
  const fitLine = (fit) => (fit?.kind ? `<div class="pfit-line pfit-${fit.side}">${fit.side === 'offense' ? '🔵' : fit.side === 'defense' ? '🔴' : '⚪'} ${esc(fit.text)}</div>` : '');
  /** What the roster needs, worst first, for the draft and the free-agent market. */
  function needsBanner(f) {
    const needs = F.ownerNeeds(f);
    const chip = (n) => `<span class="need-chip pfit-${n.side}">${esc(n.position)} · ${n.status === 'short' ? (n.healthy ? `${$t('hq.starters', { healthy: n.healthy, slots: n.slots })}` : 'nobody') : $t('hq.no_backup')}</span>`;
    const weakest = Object.entries(F.GROUP_SLOTS).filter(([g]) => g !== 'K').map(([g, slots]) => { const o = f.roster.filter((x) => x.position === g && !x.injury).map(monsterOverall).sort((a, b) => b - a); return { g, low: o.length >= slots.length ? o[slots.length - 1] : null }; }).filter((x) => x.low != null).sort((a, b) => a.low - b.low).slice(0, 2);
    return `<div class="panel tight needs-banner">${$t('hq.b_your_team_needs_b')}${needs.length ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">${needs.map(chip).join('')}</div>` : `<div class="dim">${$t('hq.every_starting_spot_has_a_backup')}</div>`}${weakest.length ? `<div class="dim" style="margin-top:4px">${$t('hq.weakest_starters')} ${weakest.map((w) => `${$t('hq.ovr_4', { w: esc(w.g), low: w.low })}`).join(', ')}</div>` : ''}<div class="dim" style="font-size:11px;margin-top:2px">${$t('hq.offense_defense_a_solid_border_would')}</div></div>`;
  }
  function prospectRow(f, m, { pickable = false, taken = false } = {}) {
    const v = F.prospectView(f, m); const h = headlineAttributes(m);
    const bars = v.headline ? HEADLINE.slice(0, 4).map((x, i) => `<span class="dim" style="font-size:11px">${i < v.headline ? `${x.label.slice(0, 3)} ${h[x.key]}` : `${x.label.slice(0, 3)} ??`}</span>`).join(' · ') : '<span class="dim" style="font-size:11px">unscouted</span>';
    const scouted = v.level >= 6; const fit = scouted ? F.fitFor(f, m) : null; // scheme fit shows only once the scout has the full picture (GDD §19.4)
    const pf = taken ? null : F.positionFit(f, m, { ovr: v.ovr ?? null });
    return `<div class="item ${scouted ? 'tappable' : 'static'} ${taken ? 'done' : ''} ${fit?.fits ? 'fit' : ''} ${fitClass(pf)}" style="align-items:flex-start" ${scouted ? `data-action="prospect" data-id="${m.id}" role="button" tabindex="0"` : ''}>${monsterSprite(m, 36)}<div class="grow"><div class="name">#${m.boardRank} ${esc(m.name)}${fit?.fits ? ` <span class="fit-star" title="${$t('hq.fits_your_scheme')}">✦</span>` : ''} <span class="dim">${esc(m.position)} · age ${m.age} · ${esc(m.origin || '')}</span>${scouted ? ` <span class="chip good">${$t('hq.scouted_tap_for_the_report')}</span>` : v.level > 0 ? ` <span class="chip">glanced</span>` : ''}</div>
      <div class="sub">${v.ovr != null ? `${$t('hq.b_ovr_b', { ovr: v.ovr })}` : `<b>${$t('hq.ovr_3')}</b>`}${v.potential != null ? ` ${$t('hq.potential', { potential: v.potential })}` : ''}${apexEmblem(f, m) ? ` ${apexEmblem(f, m)}` : ''}${v.natureKnown ? ` ${$t('hq.temper', { name: esc(temperSummary(m.temper).name) })}` : ''} ${$t('hq.rookie_deal_yr', { ovr: (Math.round((18000 + 280 * (v.ovr ?? 52)) * F.ROOKIE_SCALE / 100) * 100).toLocaleString('en-US') })}</div>${pickable ? (() => { const a = F.draftAffordability(f, m.id); return a ? `<div class="sub" style="color:var(--bad)">${$t('hq.over_your_cap_his_rookie_deal', { toLocaleString: (a.charge).toLocaleString('en-US'), toLocaleString2: Math.max(0, a.usable).toLocaleString('en-US') })}</div>` : ''; })() : ''}<div>${bars}</div>${fitLine(pf)}</div>${pickable ? `<button class="btn small primary" data-action="pick" data-id="${m.id}">${$t('hq.pick')}</button>` : ''}</div>`;
  }
  /** The scout's full report on a fully scouted prospect (GDD §19.4): bio, nature, ability, all twelve attributes, and how they compare with the owner's best at the position. */
  function prospectSheet(f, m) {
    const v = F.prospectView(f, m); if (v.level < 6) return;
    const sp = resolveSpecies(m); const temper = temperSummary(m.temper); const attrs = m.attributes;
    const mine = f.roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a));
    const best = mine[0]; const depth = F.depthNeeds(f).find((n) => n.position === m.position);
    const pk = f.draft?.picks?.find((p) => p.id === m.id);
    const salary = Math.round((18000 + 280 * monsterOverall(m)) * F.ROOKIE_SCALE / 100) * 100;
    sheet(`<div class="row" style="gap:12px">${monsterSprite(m, 64)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)}</div><div class="muted">${$t('hq.type_age_board', { position: esc(m.position), type: esc(m.type), age: m.age, boardRank: m.boardRank })}</div><div class="muted">${$t('hq.born_in', { origin: esc(m.origin || '·'), name: esc(sp.name) })}${sp.rarity ? ` (${esc(sp.rarity)})` : ''}</div></div></div>
      ${pk ? `<p class="chip ${pk.team === f.club ? 'accent' : ''}">${$t('hq.drafted_r_by', { pk: pk.round, overall: pk.overall, team: esc(pk.team) })}</p>` : ''}
      <div class="panel tight">${$t('hq.b_career_b')}<div class="muted">${pk ? `${$t('hq.his_professional_career_began_with_the', { team: esc(pk.team) })} ${careerLink(m.id, $t('hq.open_his_career'), { cls: 'block' })}` : $t('hq.a_draft_prospect_no_professional_games')}</div></div>
      ${apexFactsHtml(f, m)}
      <div class="panel tight"><div class="row between">${$t('hq.b_ovr_b_2', { monsterOverall: monsterOverall(m) })}<span>potential <b>${m.potential}</b></span><span class="dim">${$t('hq.rookie_deal_yr_2_seasons', { toLocaleString: salary.toLocaleString('en-US') })}</span></div></div>
      <div class="panel tight">${$t('hq.b_temper_b', { name: esc(temper.name) })}<div class="muted">${esc(temper.text)}</div>
        ${$t('hq.b_signature_abilities_b')}${abilitiesHtml(m, { seeIt: true })}
        ${sp.evolution?.length ? `<div class="dim">${$t('hq.evolves_at_level', { level: sp.evolution[0].level })}</div>` : ''}</div>
      ${headlineHtml(m)}${(() => { const fit = F.fitFor(f, m); return fit ? `<p class="${fit.fits ? 'fit-key' : 'dim'}" style="margin:6px 0 0">${fit.fits ? $t('hq.fits_your_scheme_2') : $t('hq.not_a_scheme_fit')} · ${esc(fieldText(fit, 'why'))}</p>` : ''; })()}
      <div class="attr-grid" style="margin-top:8px">${ATTRIBUTES.map((k) => `<div class="attr"><span>${ATTR_LABEL[k]}</span><div class="bar ${attrs[k] < 45 ? 'bad' : attrs[k] < 60 ? 'warn' : ''}"><i style="width:${attrs[k]}%"></i></div><b>${attrs[k]}</b></div>`).join('')}</div>
      <div class="panel tight" style="margin-top:8px">${$t('hq.b_on_your_roster_b')}<div class="muted">${best ? `${$t('hq.your_best_is_at_ovr_at', { position: esc(m.position), name: esc(best.name), monsterOverall: monsterOverall(best), n: mine.length })}${depth && depth.status !== 'ok' ? `, ${esc(depth.status)}` : ''}). ${monsterOverall(m) >= monsterOverall(best) ? $t('hq.this_prospect_would_start_on_day') : monsterOverall(m) >= monsterOverall(best) - 6 ? $t('hq.a_real_backup_with_room_to') : $t('hq.a_development_pick_behind_the_starter')}` : `${$t('hq.you_have_nobody_at_this_prospect', { position: esc(m.position) })}`}</div></div>`, { title: $t('hq.scouting_report') });
  }
  /**
   * A free agent's card (polish 2.0). What is public: bio, clubs, ability, the ask. What the scout has
   * to find: ratings (some or all), overall, potential, nature. Same rules as a recruit's report.
   */
  function freeAgentSheet(f, id, onSigned) {
    const entry = F.offseasonMarket(f).find((e) => e.monster.id === id); if (!entry) return; const fmt = (n) => n.toLocaleString('en-US');
    const m = entry.monster; const v = F.freeAgentView(f, m); const sp = resolveSpecies(m); const temper = temperSummary(m.temper);
    if (v.potential != null) { (app.apexSeen ||= new Map()).set(m.id, m); if (discover(f, m, 'free-agent-report')) setTimeout(() => { app.save(); app.playApex?.(); }, 0); } // a potential-revealing report: an Apex is discovered here (spec §5)
    const bio = F.monsterBio({ ...f, club: '__nobody__' }, m); const clubs = (m.history || []).map((h) => `${esc(h.club)}${h.from ? ` (${yearOf(h.from)}${h.to && h.to !== h.from ? `-${yearOf(h.to)}` : ''})` : ''}`).join(', ');
    const askV = F.freeAgentAsk(f, m); const ask = askV.exact; const askText = askV.estimate ? `${$t('hq.asks_about_yr_an_estimate_until', { amount: fmt(askV.shown) })}` : `${$t('hq.asks_yr', { amount: fmt(ask) })}`; const h = headlineAttributes(m);
    const mine = f.roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a)); const best = mine[0];
    const verdict = v.ovr == null ? `${$t('hq.overall_is_hidden_your_scout')}${v.scoutName ? `, ${esc(v.scoutName)},` : ''} ${$t('hq.has_only_a_partial_read_on', { region: esc(v.region) })}` : !best ? `${$t('hq.you_have_nobody_at_he_would', { position: esc(m.position) })}` : v.ovr >= monsterOverall(best) ? `${$t('hq.b_would_start_b_over_ovr', { name: esc(best.name), monsterOverall: monsterOverall(best) })}` : v.ovr >= monsterOverall(best) - 6 ? `${$t('hq.a_real_backup_behind_ovr', { name: esc(best.name), monsterOverall: monsterOverall(best) })}` : `${$t('hq.depth_behind_ovr', { name: esc(best.name), monsterOverall: monsterOverall(best) })}`;
    const { close } = sheet(`<div class="row" style="gap:12px">${monsterSprite(m, 64)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)}</div><div class="muted">${esc(m.position)} · ${esc(m.type)} type · age ${m.age} · ${bio.yearsPro ? `${$t('hq.seasons_pro', { yearsPro: bio.yearsPro, n: bio.yearsPro })}` : $t('hq.no_pro_seasons')}</div><div class="muted">${$t('hq.from', { region: esc(v.region), name: esc(sp.name) })}${sp.rarity ? ` (${esc(sp.rarity)})` : ''}</div></div></div>
      ${v.formerOwn ? `<p class="chip accent">${$t('hq.played_for_you_you_know_everything')}</p>` : `<p class="dim" style="margin:6px 0">${$t('hq.free_agent_his_pro_record_and')}</p>`}${(() => { const pf = F.positionFit(f, m); return pf.kind ? `<div class="panel tight ${fitClass(pf)}">${fitLine(pf)}</div>` : `<div class="dim" style="margin-bottom:6px">${esc(pf.text)}</div>`; })()}
      ${apexFactsHtml(f, m)}
      <div class="panel tight"><div class="row between"><b>${v.ovr != null ? `${$t('hq.ovr_2', { ovr: v.ovr })}` : $t('hq.ovr_3')}</b><span>potential <b>${v.potential ?? '??'}</b></span><span class="dim">${$t('hq.2_seasons', { askText })}</span></div></div>
      <div class="panel tight">${$t('hq.b_temper_b_2', { natureKnown: v.natureKnown ? esc(temper.name) : '??' })}${v.natureKnown ? `<div class="muted">${esc(temper.text)}</div>` : `<div class="dim">${$t('hq.not_scouted_yet')}</div>`}
        ${$t('hq.b_signature_abilities_b')}${abilitiesHtml(m, { seeIt: true })}</div>
      <div class="headline" style="margin:8px 0">${HEADLINE.map((x, i) => `<div class="hl"><span class="hl-v">${i < v.headlineKnown ? h[x.key] : '??'}</span><span class="hl-l">${x.label}</span><div class="bar"><i style="width:${i < v.headlineKnown ? h[x.key] : 0}%"></i></div></div>`).join('')}</div>
      ${v.full ? `<div class="attr-grid">${ATTRIBUTES.map((k) => `<div class="attr"><span>${ATTR_LABEL[k]}</span><div class="bar ${m.attributes[k] < 45 ? 'bad' : m.attributes[k] < 60 ? 'warn' : ''}"><i style="width:${m.attributes[k]}%"></i></div><b>${m.attributes[k]}</b></div>`).join('')}</div>` : `<p class="dim">${4 - v.headlineKnown ? `${$t('hq.headline_ratings_and_the', { headlineKnown: 4 - v.headlineKnown, n: 4 - v.headlineKnown })}` : $t('hq.the')} ${$t('hq.full_attribute_sheet_need_a_complete')}</p>`}
      <div class="panel tight" style="margin-top:8px">${$t('hq.b_career_b')}${careerBlockHtml(f, m.id)}${clubs ? '' : `<div class="muted">${$t('hq.no_pro_club_yet_a_regional')}</div>`}</div>
      <div class="panel tight">${$t('hq.b_on_your_roster_b')}<div class="muted">${verdict}</div></div>
      <button class="btn primary block" data-action="fasign" ${f.roster.length >= F.ROSTER_MAX ? 'disabled' : ''} style="margin-top:8px">${askV.estimate ? `${$t('hq.sign_about_yr', { amount: fmt(askV.shown) })}` : `${$t('hq.sign_for_yr', { amount: fmt(ask) })}`}</button>${f.roster.length >= F.ROSTER_MAX ? `<p class="dim center" style="margin-top:4px">${$t('hq.roster_full_release_a_monster_from', { rosterMax: F.ROSTER_MAX })}</p>` : ''}`, { title: $t('hq.free_agent') });
    document.querySelector('.sheet [data-action="fasign"]')?.addEventListener('click', () => { const r = F.signFreeAgent(app.f, id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); close(); toast(r.overCap ? $t('hq.signed_over_the_cap') : 'Signed.', r.overCap ? 'bad' : 'good'); onSigned?.(); });
  }
  Router.registerScreen('draftclass', {
    title: $t('hq.draft_class'),
    render({ f }) {
      const d = F.ensureDraftClass(f); if (!d) return `<p class="dim">${$t('hq.the_draft_class_arrives_in_the')}</p>`;
      const monday = f.season.day === 0 && F.draftWindow(f) && !f.season.finished;
      const scout = F.staffMember(f, 'head_scout');
      let list = d.class.filter((m) => !draftFocus || m.position === draftFocus);
      if (draftSort === 'known') list = list.slice().sort((a, b) => (F.prospectView(f, b).level - F.prospectView(f, a).level) || (a.boardRank - b.boardRank));
      const last = f.week.draftScouted;
      return `<p class="muted">${$t('hq.first_year_monsters', { n: d.class.length })} ${Object.values(d.revealed).filter((l) => l >= 6).length} ${$t('hq.fully_scouted_board_rank_is_the', { name: esc(scout?.name || $t('hq.your_scout')), scout: scout?.overall >= 80 ? 3 : scout?.overall >= 45 ? 2 : 1 })}</p>
        ${monday ? `<div class="panel tight"><label class="field">${$t('hq.focus_position')} <select class="input" id="draft-focus">${[['', $t('hq.best_available')], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, g])].map(([v, l]) => `<option value="${v}" ${draftFocus === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label><button class="btn primary block" data-action="study">${$t('hq.send_the_scout_monday')}</button></div>` : last ? `<div class="panel tight">${$t('hq.b_this_week_b_studied')} ${last.studied.map((id) => esc(d.class.find((m) => m.id === id)?.name || '')).join(', ') || 'nobody'}${$t('hq.glanced_at', { n: last.glanced.length })}</div>` : ''}
        <div class="row between" style="margin:8px 0"><div class="seg"><button class="btn small ${draftSort === 'board' ? 'primary' : ''}" data-action="sort" data-v="board">${$t('hq.board')}</button><button class="btn small ${draftSort === 'known' ? 'primary' : ''}" data-action="sort" data-v="known">${$t('hq.scouted_first')}</button></div><select class="input" id="draft-filter" style="width:auto">${[['', $t('hq.all_positions')], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, g])].map(([v, l]) => `<option value="${v}" ${draftFocus === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        ${needsBanner(f)}
        <div class="list">${list.map((m) => prospectRow(f, m)).join('')}</div>`;
    },
    mount(root) {
      delegate(root, {
        study: () => { const focus = root.querySelector('#draft-focus')?.value || null; const r = F.scoutDraft(app.f, { focus }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(`<p><b>${esc(r.scout)}</b> studied <b>${r.studied.map((m) => esc(m.name) + ' (' + m.position + ')').join(', ') || 'nobody new'}${$t('hq.b_and_glanced_at_more', { n: r.glanced.length })}</p>`, { title: $t('hq.draft_scouting'), onClose: () => Router.go('hq', {}, { reset: true }) }); },
        sort: (el) => { draftSort = el.dataset.v; Router.render(); },
        prospect: (el) => { const m = app.f.draft?.class.find((x) => x.id === el.dataset.id); if (m) prospectSheet(app.f, m); },
      });
      root.querySelector('#draft-filter')?.addEventListener('change', (e) => { draftFocus = e.target.value; Router.render(); });
      root.querySelector('#draft-focus')?.addEventListener('change', (e) => { draftFocus = e.target.value; });
    },
  });
  // ---------------------------------------------------------------- Trading picks (GDD §19.6)
  const pickLabel = (p, f) => `${yearOf(p.year)} R${p.round}${p.overall ? ` (#${p.overall})` : ''}${p.original && p.original !== f.club ? ` via ${esc(p.original.split(' ').pop())}` : ''}`;
  function picksLine(f) {
    const mine = F.myTradablePicks(f); const led = F.pickLedger(f);
    const byYear = {}; for (const p of mine) (byYear[p.year] ||= []).push(p);
    return `${Object.entries(byYear).map(([y, ps]) => `<b>${yearOf(y)}</b> ${ps.map((p) => `R${p.round}${p.overall ? `#${p.overall}` : ''}${p.original !== f.club ? '*' : ''}`).join(' ')}`).join(' · ')}${led.gone.length ? ` · <span class="dim">${$t('hq.sent_away')} ${led.gone.map((p) => `${yearOf(p.year)} R${p.round} → ${esc(p.owner.split(' ').pop())}`).join(', ')}</span>` : ''}${led.acquired.length ? ` <span class="dim">${$t('hq.acquired')}</span>` : ''}`;
  }
  /** The phone: choose what to give, ask for a player or for picks, see up to three offers. */
  function tradeSheet(f, { lead = null, onDone = null } = {}) {
    const state = { give: lead ? [lead] : [], tab: 'player', position: F.depthNeeds(f).find((n) => n.status !== 'ok')?.position || 'S', year: F.tradableYears(f)[1] || F.tradableYears(f)[0], round: 2, count: 1, result: null, busy: false };
    const { el, close } = sheet('', { title: $t('hq.trades'), onClose: () => onDone?.() });
    const body = el.querySelector('.sheet-body');
    const render = () => {
      const mine = F.myTradablePicks(f); const years = F.tradableYears(f);
      const leadPick = state.give[0]; const asksLeft = leadPick ? mine.find((p) => F.pickKey(p) === F.pickKey(leadPick))?.asksLeft ?? 0 : null;
      const byYear = {}; for (const p of mine) (byYear[p.year] ||= []).push(p);
      const giveHtml = `<div class="panel tight"><div class="row between">${$t('hq.b_you_give_b')}<span class="dim" style="font-size:12px">${$t('hq.tap_picks_to_add_them_each', { asksPerPick: F.ASKS_PER_PICK })}</span></div>
        ${Object.entries(byYear).map(([y, ps]) => `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center"><span class="dim" style="width:40px">${yearOf(y)}</span>${ps.map((p) => { const on = state.give.some((g) => F.pickKey(g) === F.pickKey(p)); const dead = p.asksLeft <= 0 && !on; return `<button class="btn small ${on ? 'primary' : ''}" data-give="${F.pickKey(p)}" ${dead ? 'disabled' : ''} title="${p.asksLeft} asks left">R${p.round}${p.overall ? ` #${p.overall}` : ''}${p.original !== f.club ? '*' : ''}${p.onClock ? ' ⏱' : ''}${dead ? ' ✕' : ''}</button>`; }).join('')}</div>`).join('') || `<p class="dim">${$t('hq.you_hold_no_tradable_picks')}</p>`}
        ${leadPick ? `<div class="dim" style="margin-top:6px">${$t('hq.offering_b')}${state.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}${$t('hq.b_lead_pick_has_calls_left', { asksLeft, n: asksLeft })}${mine.some((p) => p.original !== f.club) ? $t('hq.acquired_2') : ''}</div>` : `<div class="dim" style="margin-top:6px">${$t('hq.choose_at_least_one_pick')}</div>`}</div>`;
      const positions = Object.keys(F.GROUP_SLOTS);
      const askHtml = `<div class="seg" style="margin:8px 0"><button class="btn small ${state.tab === 'player' ? 'primary' : ''}" data-tab="player">${$t('hq.for_a_player')}</button><button class="btn small ${state.tab === 'picks' ? 'primary' : ''}" data-tab="picks">${$t('hq.for_future_picks')}</button></div>
        ${state.tab === 'player' ? `<div class="panel tight"><label class="field">${$t('hq.a_veteran_at')} <select class="input" data-field="position">${positions.map((g) => `<option value="${g}" ${state.position === g ? 'selected' : ''}>${g}${(() => { const n = F.depthNeeds(f).find((x) => x.position === g); return n && n.status !== 'ok' ? ` (${n.status})` : ''; })()}</option>`).join('')}</select></label><div class="dim">${$t('hq.clubs_answer_from_their_own_depth')}${F.canTakePlayer(f) ? '' : ` ${$t('hq.b_your_roster_is_full_b', { rosterMax: F.ROSTER_MAX })}`}</div></div>`
        : `<div class="panel tight"><div class="row" style="gap:8px;flex-wrap:wrap"><label class="field">${$t('hq.class')} <select class="input" data-field="year">${years.map((y) => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${yearOf(y)}</option>`).join('')}</select></label><label class="field">${$t('hq.round_2')} <select class="input" data-field="round">${[1, 2, 3].map((r) => `<option value="${r}" ${state.round === r ? 'selected' : ''}>R${r}</option>`).join('')}</select></label><label class="field">${$t('hq.how_many')} <select class="input" data-field="count">${[1, 2].map((n) => `<option value="${n}" ${state.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><div class="dim">${$t('hq.a_pick_this_year_is_worth')}</div></div>`}`;
      const canCall = state.give.length && asksLeft > 0 && (state.tab === 'picks' || F.canTakePlayer(f));
      const callHtml = `${noteHtml(consequence(f, 'trade'))}<button class="btn primary big block" data-call="1" ${canCall ? '' : 'disabled'} style="margin-top:8px">${$t('hq.make_the_call')}${leadPick ? ` ${$t('hq.left_on_r', { asksLeft, year: yearOf(leadPick.year), leadPick: leadPick.round })}` : ''}</button>`;
      let resultHtml = '';
      if (state.result) {
        const r = state.result;
        if (!r.ok) resultHtml = `<p class="bad">${esc(r.reason)}</p>`;
        else if (!r.offers.length) resultHtml = `<div class="panel tight">${$t('hq.b_no_takers_b')}<div class="dim">${$t('hq.nobody_in_the_league_wants_that', { asksLeft: r.asksLeft > 0 ? $t('hq.change_the_ask_or_add_a') : $t('hq.that_pick_has_been_shopped_out') })}</div></div>`;
        else resultHtml = `<h3>${$t('hq.offers', { n: r.offers.length })}</h3><div class="list">${r.offers.map((o, i) => o.get.player ? `<div class="item static" style="align-items:flex-start">${monsterSprite(o.get.player, 40)}<div class="grow"><div class="name">${esc(o.get.player.name)} <span class="dim">${$t('hq.ovr_age_2', { position: esc(o.get.player.position), monsterOverall: monsterOverall(o.get.player), age: o.get.player.age })}</span>${o.starter ? ` <span class="chip">their starter</span>` : ''}</div><div class="sub">${$t('hq.from_yr_two_seasons_for', { team: esc(o.team), amount: fmtMoney(o.get.player.salary) })} ${o.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}</div></div><button class="btn small primary" data-accept="${i}">${$t('hq.accept')}</button></div>`
          : `<div class="item static"><div class="grow"><div class="name">${o.get.picks.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} <span class="chip ${o.exact ? 'good' : ''}">${o.exact ? 'yes' : 'counter'}</span></div><div class="sub">${$t('hq.from_for', { team: esc(o.team) })} ${o.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}</div></div><button class="btn small primary" data-accept="${i}">${$t('hq.accept')}</button></div>`).join('')}</div>`;
      }
      const deskHtml = F.deskAvailable(f) ? `<button type="button" class="btn block" data-desk="1" style="margin-bottom:8px">${$t('hq.trade_desk_monsters_and_picks_with')}</button><div class="dim" style="font-size:12px;margin-bottom:8px">${$t('hq.below_shop_your_picks_to_the')}</div>` : '';
      body.innerHTML = `${tradeStatusHtml(f)}${deskHtml}${giveHtml}${askHtml}${callHtml}${resultHtml}`;
    };
    body.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.field) { const v = t.value; state[t.dataset.field] = t.dataset.field === 'position' ? v : Number(v); state.result = null; }
    });
    body.addEventListener('click', (e) => {
      if (e.target.closest('[data-desk]')) { close(); openTradeDesk(app, { onDone }); return; }
      const gv = e.target.closest('[data-give]'); if (gv) { const mine = F.myTradablePicks(f); const p = mine.find((x) => F.pickKey(x) === gv.dataset.give); if (state.give.some((g) => F.pickKey(g) === gv.dataset.give)) state.give = state.give.filter((g) => F.pickKey(g) !== gv.dataset.give); else state.give.push(p); state.result = null; render(); return; }
      const tab = e.target.closest('[data-tab]'); if (tab) { state.tab = tab.dataset.tab; state.result = null; render(); return; }
      if (e.target.closest('[data-call]')) { state.result = state.tab === 'player' ? F.tradeAskPlayer(f, { give: state.give, position: state.position }) : F.tradeAskPicks(f, { give: state.give, year: state.year, round: state.round, count: state.count }); app.save(); render(); return; }
      const acc = e.target.closest('[data-accept]'); if (acc) { const o = state.result.offers[Number(acc.dataset.accept)]; const r = F.acceptTrade(f, o); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(o.get.player ? `${$t('hq.is_yours_2', { name: o.get.player.name })}` : $t('hq.picks_swapped'), 'good'); close(); Router.render(); }
    });
    render();
  }
  // ---------------------------------------------------------------- Draft room (GDD §19)
  Router.registerScreen('draft', {
    title: ({ f }) => `${$t('hq.draft_class_2', { year: yearOf(f?.draft?.creation ? f.season.year : (f?.season.year || 0) + 1) })}`,
    render({ f }) {
      const d = f.draft; if (!d?.started) return `<div class="panel"><p>${$t('hq.contracts_first_then_the_draft')}</p><button class="btn primary block" data-action="begin" ${F.offseasonReady(f) ? '' : 'disabled'}>${$t('hq.open_the_draft_2')}</button></div>`;
      const intro = d.creation && !d.done ? `<div class="talk" style="margin-bottom:8px"><div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 48, { hue: 40 })}<div class="grow"><div class="talk-name">${$t('hq.the_commissioner')}</div><p class="talk-line">${$t('hq.fast_i_know_welcome_to_the', { club: esc(f.club), lotterySlot: d.lotterySlot })}</p></div></div></div>` : '';
      const clock = F.onTheClock(f); const mine = clock === f.club;
      const myPicks = d.picks.filter((p) => p.mine);
      const recent = d.picks.slice(-6).reverse();
      const avail = d.class.filter((m) => d.available.includes(m.id)).filter((m) => !draftFocus || m.position === draftFocus);
      const sorted = draftSort === 'known' ? avail.slice().sort((a, b) => (F.prospectView(f, b).level - F.prospectView(f, a).level) || (a.boardRank - b.boardRank)) : avail;
      const mySlots = d.order.map((o, i) => ({ ...o, i })).filter((o) => o.team === f.club);
      const lastPick = d.picks[d.picks.length - 1];
      return `${intro}<div class="panel tight"><div class="row between"><b>${d.done ? $t('hq.draft_complete') : `${$t('hq.round_pick_of', { round: d.round, index: d.index + 1, n: d.order.length })}`}</b><span class="chip ${mine ? 'accent' : ''}">${d.done ? '' : mine ? $t('hq.you_are_on_the_clock') : esc(clock || '')}</span></div>
        <div class="dim">${$t('hq.your_picks')} ${mySlots.map((o) => `R${o.round} #${o.i + 1}`).join(', ') || 'none left'} ${$t('hq.worst_record_picks_first_snake_order', { n: f.roster.length, rosterMax: F.ROSTER_MAX })}</div><div class="dim" style="margin-top:2px">${picksLine(f)}</div>
        <div class="row between" style="margin-top:6px"><span class="dim">${lastPick ? `${$t('hq.last_pick_b_b', { name: esc(lastPick.name) })}${lastPick.position ? ` (${esc(lastPick.position)}, ${lastPick.ovr} OVR)` : ''} → ${esc(lastPick.team)}` : $t('hq.no_picks_yet')}</span><button class="btn small" data-action="picks">${$t('hq.all_picks', { n: d.picks.length })}</button></div></div>
        ${d.done ? '' : needsBanner(f)}
        ${myPicks.length ? `<h3>${$t('hq.your_draft')}</h3><div class="list">${myPicks.map((p) => `<div class="item static"><div class="grow"><div class="name">R${p.round} #${p.overall} · ${p.passed ? esc(p.name) : careerLink(p.id, p.name)}</div><div class="sub">${p.passed ? 'passed' : `${$t('hq.ovr_rookie_deal_two_seasons', { position: esc(p.position), ovr: p.ovr })}`}</div></div></div>`).join('')}</div>` : ''}
        ${!d.done && mine && f.roster.length >= F.ROSTER_MAX ? `<div class="assist-note critical" role="alert">${$t('hq.roster_full_release_a_monster_from_2', { n: f.roster.length, rosterMax: F.ROSTER_MAX })}</div>` : ''}
        ${!d.done && mine ? noteHtml(suggestDraftPick(f)?.text, 'suggest') : ''}
        ${d.done ? `<button class="btn primary big block" data-action="back">${d.creation ? $t('hq.to_headquarters') : $t('hq.back_to_the_offseason')}</button>` : mine ? `<div class="row between" style="margin:8px 0"><div class="seg"><button class="btn small ${draftSort === 'board' ? 'primary' : ''}" data-action="sort" data-v="board">${$t('hq.board')}</button><button class="btn small ${draftSort === 'known' ? 'primary' : ''}" data-action="sort" data-v="known">${$t('hq.scouted_first')}</button></div><select class="input" id="draft-filter" style="width:auto">${[['', $t('hq.all_positions')], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, g])].map(([v, l]) => `<option value="${v}" ${draftFocus === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div><button class="btn block" data-action="trade" style="margin-bottom:8px">${$t('hq.shop_this_pick_trade')}</button><div class="list">${sorted.slice(0, 30).map((m) => prospectRow(f, m, { pickable: true })).join('')}</div><p class="center" style="margin-top:10px"><button class="btn small ghost" data-action="pass">${$t('hq.forfeit_this_pick')}</button></p>` : ''}
        <h3>${$t('hq.recent_picks')}</h3><div class="list">${recent.map((p) => `<div class="item static ${p.mine ? 'mine' : ''}"><div class="grow"><div class="name">R${p.round} #${p.overall} · ${esc(p.team)}</div><div class="sub">${p.id ? careerLink(p.id, p.name) : esc(p.name)}${p.position ? ` · ${esc(p.position)} · ${p.ovr} OVR` : ''}</div></div></div>`).join('') || `<p class="dim">${$t('hq.no_picks_yet')}</p>`}</div>`;
    },
    mount(root) {
      delegate(root, {
        begin: () => { const r = F.beginDraft(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
        pick: async (el) => { const m = app.f.draft.class.find((x) => x.id === el.dataset.id); if (!(await confirmSheet(`${$t('hq.draft', { name: m.name, position: m.position })}${(() => { const c = consequence(app.f, 'draft', { salary: Math.round(salaryFor(m) * F.ROOKIE_SCALE / 100) * 100 }); return c ? ' ' + c : ''; })()}`, { title: $t('hq.your_pick'), okLabel: $t('hq.draft_2') }))) return; const r = F.myDraftPick(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${$t('hq.joins_the', { name: r.monster.name, club: app.f.club })}`, 'good'); Router.render(); },
        pass: async () => { if (!(await confirmSheet($t('hq.forfeit_this_pick_nobody_is_drafted'), { title: $t('hq.forfeit_pick'), okLabel: $t('hq.forfeit_2'), danger: true }))) return; F.passDraftPick(app.f); app.save(); Router.render(); },
        trade: () => { const lead = F.myTradablePicks(app.f).find((p) => p.onClock) || null; tradeSheet(app.f, { lead, onDone: () => Router.render() }); },
        sort: (el) => { draftSort = el.dataset.v; Router.render(); },
        back: () => Router.go(app.f.draft?.creation ? 'hq' : 'offseason', {}, { reset: true }),
        prospect: (el) => { const m = app.f.draft?.class.find((x) => x.id === el.dataset.id); if (m) prospectSheet(app.f, m); },
        picks: () => { const d = app.f.draft; const rows = d.picks.slice().reverse().map((p) => `<div class="item ${p.id && F.prospectView(app.f, d.class.find((x) => x.id === p.id) || {}).level >= 6 ? 'tappable' : 'static'} ${p.mine ? 'mine' : ''}" ${p.id ? `data-action="prospect" data-id="${p.id}"` : ''}><div class="grow"><div class="name">R${p.round} #${p.overall} · ${esc(p.team)}</div><div class="sub">${p.id ? careerLink(p.id, p.name) : esc(p.name)}${p.position ? ` · ${esc(p.position)} · ${p.ovr} OVR` : ''}</div></div></div>`).join('');
          const { el: el2 } = sheet(`<p class="dim">${$t('hq.of_picks_made_newest_first', { n: d.picks.length, n2: d.order.length })}</p><div class="list">${rows || `<p class="dim">${$t('hq.no_picks_yet')}</p>`}</div>`, { title: $t('hq.draft_board_picks_so_far') }); el2.addEventListener('click', (e) => { const b = e.target.closest('[data-action="prospect"]'); if (!b) return; const m = d.class.find((x) => x.id === b.dataset.id); if (m) prospectSheet(app.f, m); }); },
      });
      root.querySelector('#draft-filter')?.addEventListener('change', (e) => { draftFocus = e.target.value; Router.render(); });
    },
  });
  // ---------------------------------------------------------------- The commissioner's goals (GDD §17.4)
  Router.registerScreen('goals', {
    title: $t('hq.commissioners_office'),
    render({ f }) {
      const offers = F.commissionerGoals(f); const b = f.board || { confidence: 0, history: [] };
      const fc = F.boardForecastFor(f);
      return `<div class="talk"><div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 56, { hue: 40 })}<div class="grow"><div class="talk-name">${$t('hq.the_commissioner')}</div>
        <p class="talk-line">${$t('hq.the_forecast_has_at_wins_against', { year: yearOf(f.season.year), club: esc(f.club), toFixed: fc.wins.toFixed(1) })}${b.history.length ? `${$t('hq.last_year_you', { n: b.history[b.history.length - 1].met ? 'delivered' : 'fell short' })}` : ''}${$t('hq.tell_me_what_you_are_promising')}</p>
        <p class="talk-line">${$t('hq.hit_it_and_the_board_trusts')}</p></div></div></div>
        <div class="panel tight"><div class="row between"><span>${$t('hq.board_confidence')}</span><b>${F.confidenceLabel(b.confidence)} (${b.confidence >= 0 ? '+' : ''}${b.confidence})</b></div><div class="dim">${$t('hq.1_for_a_goal_met_2')}</div></div>
        ${noteHtml(suggestGoal(f, offers)?.text, 'suggest')}
        <div class="stack">${offers.map((o) => `<button class="item" data-action="goal" data-id="${o.id}"><div class="grow"><div class="name">${esc(o.label)} <span class="chip ${o.tier === 'stretch' ? 'accent' : o.tier === 'medium' ? 'warn' : ''}">${o.tier}</span></div><div class="sub">${esc(o.text)}${o.weight > 1 ? ` ${$t('hq.worth', { weight: o.weight })}` : ''}</div></div></button>`).join('')}</div>
        ${b.history.length ? `<h3>${$t('hq.past_goals')}</h3><div class="list">${b.history.slice().reverse().map((h) => `<div class="item static"><div class="grow"><div class="name">${yearOf(h.year)} · ${esc(h.label)}</div><div class="sub">${h.met ? $t('hq.met') : h.miss === 'narrow' ? $t('hq.missed_narrowly') : $t('hq.missed')}${h.wins != null ? ` ${$t('hq.wins', { wins: h.wins })}${h.forecast != null ? ` ${$t('hq.forecast', { forecast: h.forecast })}` : ''}` : ''} ${$t('hq.confidence', { confidence: h.confidence })}</div></div></div>`).join('')}</div>` : ''}`;
    },
    mount(root) { delegate(root, { goal: async (el) => { const o = F.commissionerGoals(app.f).find((x) => x.id === el.dataset.id); if (!(await confirmSheet(`${$t('hq.commit_to_for_season_the_board', { label: o.label, year: app.f.season.year })}${(() => { const c = consequence(app.f, 'goal', { hot: (app.f.board?.confidence ?? 0) <= -1 }); return c ? ' ' + c : ''; })()}`, { title: $t('hq.your_word'), okLabel: $t('hq.commit') }))) return; const r = F.chooseGoal(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast($t('hq.goal_set_the_board_is_watching'), 'good'); Router.go('hq', {}, { reset: true }); } }); },
  });
  Router.registerScreen('commissioner', {
    title: $t('hq.commissioners_office'), back: true,
    render({ f }) {
      const c = f.week.commissioner; if (!c) return `<div class="panel"><p>${$t('hq.nothing_to_discuss_youre_under_the')}</p><button class="btn primary block" data-action="back">${$t('hq.back_to_hq')}</button></div>`;
      const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
      const line = c.visits === 1 ? `${$t('hq.youre_over_budget_im_guessing_you', { amount: fmtMoney(c.over) })}` : `${$t('hq.still_over_by_were_not_done', { amount: fmtMoney(c.over) })}`;
      const rule = c.enough ? `${$t('hq.ive_picked_any_one_of_them', { n: c.names.length })}` : `${$t('hq.none_of_your_monsters_alone_covers', { n: c.names.length })}`;
      return `<div class="commissioner">${portraitSprite('commissioner', 56, { hue: 210 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">${$t('hq.league_commissioner')}</div>${esc(line)}<p style="margin:8px 0 0">${esc(rule)}</p></div></div>
        <div class="list" style="margin-top:12px">${c.names.map((id) => byId[id]).filter(Boolean).map((m) => `<div class="item static">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)} ${m.cornerstone ? '★' : ''}${m.legendary ? ` <span class="chip accent">legendary</span>` : ''}${captainBadge(f, m.id)}</div><div class="sub">${m.position} · ${monsterOverall(m)} OVR · ${fmtMoney(m.salary)}/yr${(m.salary || 0) >= c.over ? $t('hq.gets_you_under') : ''}</div></div><button class="btn small danger" data-action="release" data-id="${m.id}" data-name="${esc(m.name)}">${$t('hq.release')}</button></div>`).join('')}</div>
        <p class="dim" style="margin-top:8px">${$t('hq.rule_the_commissioner_names_the_cheapest', { commissionerPicks: F.difficultyOf(f).commissionerPicks, label: esc(F.difficultyOf(f).label) })}</p>`;
    },
    mount(root) {
      delegate(root, {
        back: () => Router.go('hq', {}, { reset: true }),
        release: async (el) => {
          if (!(await confirmSheet(`${$t('hq.release_nothing_comes_back_for_them', { name: el.dataset.name, captainWarning: captainWarning(app.f, el.dataset.id) })}`, { title: $t('hq.the_commissioner_is_waiting'), okLabel: $t('hq.release'), danger: true }))) return;
          const r = F.commissionerRelease(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; }
          app.save();
          if (r.done) { toast(`${$t('hq.released_youre_under_the_cap', { name: r.released.name })}`, 'info'); Router.go('hq', {}, { reset: true }); } else { toast(`${$t('hq.released_still_over', { name: r.released.name })}`, 'bad'); Router.render(); }
        },
      });
    },
  });

  // ---------------------------------------------------------------- postseason story event (GDD §15.7)
  Router.registerScreen('postseason', {
    title: $t('hq.postseason_2'), back: true,
    render({ f }) {
      const ev = F.postseasonEvent(f); if (!ev) return `<div class="panel"><p>${$t('hq.nothing_waiting_the_offseason_is_quiet')}</p><button class="btn primary block" data-action="back">${$t('hq.back_to_hq')}</button></div>`;
      const who = ev.speaker === 'agent' ? { seed: `agent|${f.club}`, label: 'AGENT' } : { seed: f.staff[f.postseason.coordRole] || 'coach', label: $t('hq.your_coordinator') };
      return `<p class="muted">${$t('hq.a_season_has_consequences_this_one', { n: esc(f.history[f.history.length - 1]?.record.w), n2: esc(f.history[f.history.length - 1]?.record.l) })}</p>
        <div class="commissioner">${portraitSprite(who.seed, 56)}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">${who.label}</div>${ev.lines.map((l) => esc(l)).join(`<br>`)}</div></div>
        <div class="stack" style="margin-top:12px">${ev.options.map((o) => `<button class="choice" data-action="choose" data-v="${o.id}"><span class="name">${esc(o.label)}</span><div class="muted">${esc(o.text)}</div></button>`).join('')}</div>`;
    },
    mount(root) {
      delegate(root, {
        back: () => Router.go('hq', {}, { reset: true }),
        choose: (el) => { const r = F.resolvePostseason(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.text, 'info', 4000); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  // ---------------------------------------------------------------- Legend Tracks (GDD §15.8)
  Router.registerScreen('legend', {
    title: $t('hq.legend_track'), back: true,
    render({ f }) {
      const choices = F.legendChoices(f); const pending = f.legendPick && !f.legendPick.resolved;
      return `<div class="panel">${$t('hq.b_beast_bowl_champions_choose_a')}<div class="muted">${$t('hq.three_tracks_on_the_same_legendary')}</div></div>
        <div class="stack">${choices.map((c) => `<div class="choice"><div class="row" style="align-items:flex-start">${sprite16(c.species, 56)}<div class="grow"><div class="name">${esc(c.species.name)} <span class="dim">${c.species.position}</span></div><div class="muted">${$t('hq.legendary_home', { element: esc(c.species.element), regions: esc((c.species.regions || [])[0] || '') })}</div><div class="muted">${esc(c.species.ability.name)}: ${esc(c.species.ability.text)}</div><div class="mono" style="margin-top:4px">${$t('hq.tracks_3', { tracks: '●'.repeat(c.tracks), tracks2: '○'.repeat(Math.max(0, 3 - c.tracks)), tracks3: c.tracks })}</div></div></div>${pending ? `<button class="btn primary small" data-action="pick" data-v="${c.id}" style="margin-top:6px">${$t('hq.add_a_track_toward', { name: esc(c.species.name) })}</button>` : ''}</div>`).join('') || `<p class="dim">${$t('hq.every_legendary_you_can_track_is')}</p>`}</div>
        ${pending ? '' : `<p class="dim" style="margin-top:8px">${$t('hq.win_the_beast_bowl_to_earn')}</p>`}`;
    },
    mount(root) {
      delegate(root, {
        pick: (el) => { const r = F.chooseLegendTrack(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.unlocked ? `${$t('hq.unlocked_scout_to_find_it', { name: r.species.name, regions: (r.species.regions || [])[0] })}` : `${$t('hq.track_of_3_toward', { tracks: r.tracks, name: r.species.name })}`, 'good', 4000); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  // ---------------------------------------------------------------- Monday
  Router.registerScreen('scout', {
    title: $t('hq.monday_scouting'),
    render({ f }) {
      const scout = F.staffMember(f, 'head_scout');
      const needs = F.depthNeeds(f); const gaps = needs.filter((n) => n.status !== 'ok');
      return `<p class="muted">${$t('hq.searches_one_region_for_prospects_better', { name: esc(scout?.name || $t('hq.your_scout')) })}</p>
        <div class="panel tight"><div class="row between">${$t('hq.b_depth_check_b')}<span class="dim">${gaps.length ? `${needs.filter((n) => n.status === 'short').length} ${$t('hq.short')} ${needs.filter((n) => n.status === 'thin').length} ${$t('hq.without_a_backup')}` : $t('hq.every_position_has_a_backup')}</span></div>
          <div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${needs.map((n) => `<span class="chip ${n.status === 'short' ? 'bad' : n.status === 'thin' ? 'warn' : ''}">${n.position} ${n.healthy}/${n.slots}</span>`).join('')}</div>
          <label class="field" style="margin-top:6px">${$t('hq.ask_the_scout_to_look_for')} <select class="input" id="scout-focus">${[['', gaps.length ? `${$t('hq.automatic', { position: gaps[0].position, status: gaps[0].status === 'short' ? 'short-handed' : $t('hq.no_backup') })}` : $t('hq.nothing_in_particular')], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, `${g}${needs.find((n) => n.position === g)?.status === 'short' ? $t('hq.short_handed') : needs.find((n) => n.position === g)?.status === 'thin' ? $t('hq.no_backup_2') : ''}`])].map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label></div>
        <div class="stack">${Object.entries(REGIONS).map(([name, r]) => { const skill = scout?.biomes?.[r.biome] ?? 50; return `<button class="item" data-action="region" data-v="${esc(name)}"><div class="grow"><div class="name">${esc(name)}</div><div class="sub">${r.types.join(' · ')}</div></div><span class="chip ${skill >= 80 ? 'good' : skill < 40 ? 'bad' : ''}">${skill}/100</span></button>`; }).join('')}</div>`;
    },
    mount(root) { delegate(root, { region: (el) => { const focus = root.querySelector('#scout-focus')?.value || null; const r = F.scoutRegion(app.f, el.dataset.v, { focus }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${$t('hq.found_prospects', { scout: r.scout, n: r.prospects.length })}`, 'good'); Router.go('recruit', {}, { replace: true }); } }); },
  });

  // ---------------------------------------------------------------- Tuesday: Monster Encounters (Beast Clash, GDD §26.1)
  Router.registerScreen('recruit', {
    title: $t('hq.tuesday_monster_encounter'),
    render({ f }) {
      const e = f.week.encounter;
      if (f.season.day !== 1) return `<div class="panel"><p>${$t('hq.tuesday_is_done_for_this_week')}</p>${f.week.recruited ? `<p class="muted">${$t('hq.signed')} ${esc(f.roster.find((m) => m.id === f.week.recruited)?.name || '')}</p>` : e?.status === 'skipped' ? `<p class="muted">${$t('hq.you_skipped_the_encounter')}</p>` : ''}<button class="btn block" data-action="back">${$t('hq.back')}</button></div>`;
      if (e && e.status !== 'ready') { setTimeout(() => Router.go('clash-battle', { kind: 'encounter', i: e.prospectIndex }, { replace: true }), 0); return `<p class="muted">${$t('hq.opening_the_battle')}</p>`; }
      if (!f.week.prospects.length) return `<div class="panel"><p>${$t('hq.no_monsters_were_found_this_week')}</p><button class="btn primary block" data-action="skip">${$t('hq.continue_to_wednesday')}</button></div>`;
      const cap = F.salarySummary(f); const healthy = f.roster.filter((m) => !m.injury).length;
      return `<p class="muted">${$t('hq.your_scout_found_these_monsters_pick')} <button class="btn small ghost" data-action="clashhelp">${$t('hq.help')}</button></p>
        <p class="dim">${$t('hq.roster_cap_room_monsters_fit_to', { n: f.roster.length, rosterMax: F.ROSTER_MAX, amount: fmtMoney(cap.remaining), healthy })}</p>
        ${noteHtml(suggestProspect(f)?.text, 'suggest')}
        <div class="stack">${f.week.prospects.map((p, i) => prospectCard(p, i)).join('')}</div>
        <button class="btn block" data-action="skip" style="margin-top:8px">${$t('hq.skip_the_encounter')}</button>
        <p class="dim">${$t('hq.skipping_means_no_battle_and_no')}</p>`;
    },
    mount(root) {
      delegate(root, {
        back: () => Router.back(),
        clashhelp: () => sheet(CLASH_HELP, { title: $t('hq.how_beast_clash_works') }),
        skip: () => { F.skipEncounter(app.f); app.save(); toast($t('hq.encounter_skipped_on_to_wednesday')); Router.go('hq', {}, { reset: true }); },
        compare: (el) => { const p = app.f.week.prospects[Number(el.dataset.i)]; if (p) sheet(compareHtml(app.f, p), { title: `${$t('hq.vs_your_s', { name: p.monster.name, position: p.monster.position })}` }); },
        enter: (el) => { const i = Number(el.dataset.i); const pv = F.encounterPreview(app.f, i); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'encounter', i }); },
      });
    },
  });
  /** Prospect vs the club's monsters at the same position: headline ratings, OVR, age, salary, and where they'd slot in. */
  function compareHtml(f, p) {
    const m = p.monster; const known = Math.min(4, Math.ceil(p.revealed / 3)); const ovrKnown = p.revealed >= 4;
    const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const starters = new Set([...OFFENSE_BASE, ...DEFENSE_BASE, 'K'].map((s) => chart[s])); const pkg = new Set([...OFFENSE_PACKAGE_SLOTS, ...DEFENSE_PACKAGE_SLOTS].map((s) => chart[s]));
    const mates = f.roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a));
    const startSlots = STARTERS_BY_POS[m.position] || 1;
    const hp = headlineAttributes(m);
    const cell = (v, best, show = true) => `<td class="mono ${show && v >= best ? 'best' : ''}">${show ? v : '??'}</td>`;
    const rows = [{ m, prospect: true }, ...mates.map((x) => ({ m: x }))];
    const best = Object.fromEntries(HEADLINE.map((x) => [x.key, Math.max(...rows.map((r, i) => (i === 0 && HEADLINE.findIndex((y) => y.key === x.key) >= known) ? 0 : headlineAttributes(r.m)[x.key]))]));
    const table = `<table class="compare"><thead><tr><th></th>${HEADLINE.map((x) => `<th>${x.label.slice(0, 3)}</th>`).join('')}<th>${$t('hq.ovr_5')}</th><th>${$t('hq.age_2')}</th></tr></thead><tbody>${rows.map((r, idx) => { const h = headlineAttributes(r.m); return `<tr class="${r.prospect ? 'prospect' : ''}"><td><div class="row" style="gap:4px">${monsterSprite(r.m, 22)}<span>${esc(r.m.name)}${(!r.prospect || ovrKnown) && F.fitFor(f, r.m)?.fits ? ` <span class="fit-star" title="${$t('hq.fits_scheme')}">✦</span>` : ''}${r.prospect ? ` <span class="chip accent">new</span>` : starters.has(r.m.id) ? ` <span class="chip">starter</span>` : pkg.has(r.m.id) ? ` <span class="chip">package</span>` : ''}</span></div></td>${HEADLINE.map((x, i) => cell(h[x.key], best[x.key], !r.prospect || i < known)).join('')}<td class="mono"><b>${r.prospect && !ovrKnown ? '??' : monsterOverall(r.m)}</b></td><td class="mono">${r.m.age}</td></tr>`; }).join('')}</tbody></table>`;
    let verdict;
    if (!ovrKnown) verdict = `${$t('hq.overall_is_hidden_a_better_scout', { name: esc(m.name) })}`;
    else {
      const rank = mates.filter((x) => monsterOverall(x) > monsterOverall(m)).length;
      verdict = !mates.length ? `${$t('hq.you_have_no_would_start_immediately', { position: m.position, name: esc(m.name) })}` : rank < startSlots ? `${$t('hq.b_would_start_b_at_best', { position: m.position, rank: rank + 1, value: ['st', 'nd', 'rd'][rank] || 'th', n: mates.length + 1 })}` : rank === startSlots ? `${$t('hq.b_first_backup_b_at', { position: m.position })}` : `${$t('hq.b_depth_b_better', { rank, position: m.position, rank2: rank === 1 ? ' is' : $t('hq.s_are') })}`;
    }
    const cap = F.salarySummary(f, m.salary);
    return `${table}<p style="margin-top:10px">${verdict}</p><p class="muted">${$t('hq.starting_slots_salary_yr_cap_room', { startSlots, position: m.position, amount: fmtMoney(m.salary), n: startSlots })} ${cap.over ? `<span style="color:var(--bad)">${$t('hq.over_by_2', { amount: fmtMoney(-cap.remaining) })}</span>` : fmtMoney(cap.remaining)} ${$t('hq.roster', { n: f.roster.length + 1, rosterMax: F.ROSTER_MAX })}</p>${known < 4 ? `<p class="dim">${$t('hq.not_yet_scouted')}</p>` : ''}`;
  }
  function prospectCard(p, i) {
    const m = p.monster; const attrs = effectiveAttributes(m);
    const h = headlineAttributes(m); const known = Math.min(4, Math.ceil(p.revealed / 3));
    const fit = p.revealed >= 4 ? F.fitFor(app.f, m) : null;
    const depth = p.depth || (p.need ? 'short' : 'ok');
    return `<div class="panel ${fit?.fits ? 'fit' : ''} ${depth === 'short' ? 'need-short' : depth === 'thin' ? 'need-thin' : ''}">${depth !== 'ok' ? `<div class="fitchip-row"><span class="chip ${depth === 'short' ? 'bad' : 'warn'}">${depth === 'short' ? `${$t('hq.short_handed_at', { position: esc(m.position) })}` : `${$t('hq.no_backup_at', { position: esc(m.position) })}`}</span> <span class="dim">${p.need ? $t('hq.the_scout_went_looking_for_this') : depth === 'short' ? $t('hq.one_injury_from_an_empty_slot') : $t('hq.one_injury_from_a_hole')}</span></div>` : ''}${fit?.fits ? `<div class="fitchip-row"><span class="chip fitchip">${$t('hq.fits_your_scheme_2')}</span> <span class="dim">${esc(fieldText(fit, 'why'))}</span></div>` : ''}<div class="row" style="flex-wrap:nowrap;align-items:flex-start">${monsterSprite(m, 52)}<div class="grow" style="flex:1;min-width:0"><b>${esc(m.name)}</b> ${typeGlyph(m.type)} ${apexEmblem(app.f, m)}<div class="muted">${m.position} · age ${m.age} · ${p.potentialKnown ? 'potential ' + m.potential : 'potential unknown'} · ${p.revealed >= 4 && p.potentialKnown ? fmtMoney(m.salary) + "/yr" : "18,000–46,000 cr/yr (estimate)"}</div><div class="muted">${$t('hq.temper_2', { natureKnown: p.natureKnown ? esc(temperSummary(m.temper).name) : '???' })}</div></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:none"><span class="ovr">${p.revealed >= 4 ? monsterOverall(m) : '??'}</span><button class="info-btn" data-action="compare" data-i="${i}" aria-label="Compare ${esc(m.name)} with your roster">i</button></div></div>
      <div class="headline" style="margin:8px 0">${HEADLINE.map((x, i) => `<div class="hl"><span class="hl-v">${i < known ? h[x.key] : '??'}</span><span class="hl-l">${x.label}</span><div class="bar"><i style="width:${i < known ? h[x.key] : 0}%"></i></div></div>`).join('')}</div>${known < 4 ? `<div class="dim">${$t('hq.ratings_hidden_a_better_scout_reveals', { known: 4 - known, n: 4 - known })}</div>` : ''}
      <button class="btn primary block" data-action="enter" data-i="${i}">${$t('hq.enter_beast_clash_with', { name: esc(m.name) })}</button></div>`;
  }

  // ---------------------------------------------------------------- Wednesday
  let intensity = 'normal';
  Router.registerScreen('training', {
    title: $t('hq.wednesday_training'),
    render({ f }) {
      const tr = F.staffMember(f, 'monster_trainer');
      if (f.season.day !== 2 && f.week.trainingSkipped) return `<div class="panel"><p>${$t('hq.practice_was_skipped_this_week_nothing')}</p></div><button class="btn block" data-action="back">${$t('hq.back')}</button>`;
      if (f.season.day !== 2 && f.week.training) { const t = f.week.training; return `<div class="panel">${trainingResultHtml(t)}</div><button class="btn block" data-action="back">${$t('hq.back')}</button>`; }
      const pct = (x) => `${Math.round(x * 100)}%`;
      return `<p class="muted">${$t('hq.runs_one_practice_if_it_goes', { name: esc(tr?.name || $t('hq.your_trainer')) })}</p>
        <div class="seg" style="margin-bottom:6px">${Object.entries(F.INTENSITIES).map(([id, I]) => `<button class="btn small ${intensity === id ? 'primary' : ''}" data-action="intensity" data-v="${id}">${I.label}</button>`).join('')}</div>
        <p class="dim" style="margin-top:0">${esc(F.INTENSITIES[intensity].text)}</p>
        <div class="stack">${Object.entries(TRAINING_FOCI).map(([id, t]) => { const o = F.trainingOdds(f, id, intensity); return `<button class="item" data-action="focus" data-v="${id}"><div class="grow"><div class="name">${esc(t.label)} <span class="chip accent">+${o.amount}</span></div><div class="sub">${esc(t.attrs.map((a) => ATTR_LABEL[a]).join(', '))}</div><div class="sub"><b style="color:${o.success >= 0.7 ? 'var(--good)' : o.success >= 0.45 ? 'var(--warn, #e0a33b)' : 'var(--bad)'}">${$t('hq.success_b_injury_risk', { percent: pct(o.success), percent2: pct(o.risk) })}${o.streak >= 2 ? ` · <span style="color:var(--bad)">${$t('hq.weeks_in_a_row_monsters_are', { streak: o.streak })}</span>` : o.streak === 1 ? $t('hq.same_as_last_week') : ''}</div></div></button>`; }).join('')}</div>
        <button class="btn block skip-wed" data-action="skipwed" style="margin-top:12px">${$t('hq.skip_wednesday')}</button>
        <p class="dim" style="margin-top:4px;text-align:center">${$t('hq.no_practice_no_boost_no_fatigue')}</p>`;
    },
    mount(root) { delegate(root, { back: () => Router.back(), skipwed: () => { const r = F.skipTraining(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(F.isBye(app.f) ? $t('hq.practice_skipped_bye_week_rest_up') : $t('hq.practice_skipped_on_to_thursday')); Router.go('hq', {}, { reset: true }); }, intensity: (el) => { intensity = el.dataset.v; Router.render(); }, focus: (el) => { const r = F.setTraining(app.f, el.dataset.v, intensity); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(trainingResultHtml(app.f.week.training), { title: $t('hq.practice_report'), onClose: () => Router.go('hq', {}, { reset: true }) }); } }); },
  });
  function trainingResultHtml(t) {
    const label = TRAINING_FOCI[t.focus]?.label || t.focus;
    return `<h2 style="margin-top:0">${t.success ? $t('hq.good_practice') : $t('hq.sloppy_practice')}</h2><p>${t.success ? `${$t('hq.work_paid_off_b_b_to', { label: esc(label), amount: t.amount })} ${esc(TRAINING_FOCI[t.focus].attrs.map((a) => ATTR_LABEL[a]).join(', '))} ${$t('hq.on_sunday')}` : `${$t('hq.work_didnt_stick_this_week_no', { label: esc(label) })}`}</p>${t.injury ? `<p style="color:var(--bad)">${$t('hq.was_hurt_out_weeks_the_next', { name: esc(t.injury.name), severity: esc(t.injury.severity), weeks: t.injury.weeks, n: t.injury.weeks })}</p>` : `<p class="muted">${$t('hq.everyone_came_out_healthy')}</p>`}${t.fatigue ? `<p class="dim">${$t('hq.practice_added_fatigue_fatigue_comes_off', { fatigue: t.fatigue })}</p>` : ''}`;
  }

  // ---------------------------------------------------------------- Thursday
  Router.registerScreen('scoutopp', {
    title: $t('hq.thursday_opponent'),
    render({ f }) {
      const opp = F.opponentName(f);
      if (!opp) return `<div class="panel"><p>${$t('hq.no_opponent_this_week_bye')}</p><button class="btn primary block" data-action="skip">${$t('hq.continue')}</button></div>`;
      const venue = venueHtml(F.sundayVenue(f));
      if (f.week.scoutReport) return `${venue}<div class="panel">${reportHtml(f.week.scoutReport, opp)}</div><button class="btn block" data-action="back">${$t('hq.back')}</button>`;
      return `${venue}<p class="muted">${$t('hq.scout_b_b_s_offense_or', { opp: esc(opp) })}</p><div class="grid2"><button class="btn big" data-action="side" data-v="offense">${$t('hq.their_offense')}</button><button class="btn big" data-action="side" data-v="defense">${$t('hq.their_defense')}</button></div>`;
    },
    mount(root) { delegate(root, { back: () => Router.back(), skip: () => { F.scoutOpponent(app.f, 'offense'); app.save(); Router.go('hq', {}, { reset: true }); }, side: (el) => { const r = F.scoutOpponent(app.f, el.dataset.v); app.save(); sheet(reportHtml(r.report, F.opponentName(app.f) || ''), { title: $t('hq.scouting_report'), onClose: () => Router.go('hq', {}, { reset: true }) }); } }); },
  });
  function reportHtml(r, opp) {
    if (!r) return `<p>${$t('hq.no_report')}</p>`;
    const ids = r.plays || r.favourite || [];
    const cards = `<h3 style="margin-bottom:4px">${$t('hq.their_plays', { n: ids.length, side: r.side === 'offense' ? 'offensive' : 'defensive' })}</h3><p class="dim" style="margin-top:0">${$t('hq.theyll_only_call_these_on_sunday')}</p><div class="play-grid">${ids.map((id) => `<button class="card" data-scout-play="${id}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id]?.name || id)}</span></button>`).join('')}</div>${legendHtml(r.side)}`;
    const star = r.star ? `${$t('hq.b_star_b')}<span>${r.star.id ? careerLink(r.star.id, r.star.name) : esc(r.star.name)} (${r.star.slot}, ${r.star.ovr} OVR)</span>` : '';
    const bonus = r.bonus && PLAYS[r.bonus.play] ? `<div class="panel tight" style="margin-top:8px"><b>${r.bonus.analyst ? $t('hq.analysts_eye') : $t('hq.rematch_scouting')}</b><div class="muted">${r.bonus.analyst ? $t('hq.your_background_in_the_tape_room') : `${$t('hq.youve_faced_them_times', { games: r.bonus.games, n: r.bonus.games })}`} ${$t('hq.one_of_their_plays_is_known', { side: r.bonus.side === 'offense' ? 'offensive' : 'defensive' })}</div><div class="play-grid" style="margin-top:6px"><button class="card" data-action="play" data-id="${r.bonus.play}"><div>${playCardSvg(r.bonus.play)}</div><span class="card-label">${esc(PLAYS[r.bonus.play].name)}</span></button></div></div>` : '';
    return bonus + (r.side === 'offense'
      ? `<h2>${esc(opp)} offense</h2><div class="kv">${$t('hq.b_pass_run_split_b')}<span>${$t('hq.pass', { passBias: r.passBias })}</span>${$t('hq.b_passing_strength_b')}<span>${r.pass}</span>${$t('hq.b_running_strength_b')}<span>${r.run}</span>${$t('hq.b_aggression_b')}<span>${r.aggression}/100</span>${star}</div><p class="muted" style="margin-top:8px">${r.passBias >= 60 ? $t('hq.they_throw_a_lot_coverage_heavy') : r.passBias <= 48 ? $t('hq.run_first_stack_the_box_and') : $t('hq.balanced_mix_your_calls')}</p>${cards}`
      : `<h2>${esc(opp)} defense</h2><div class="kv">${$t('hq.b_pass_defense_b')}<span>${r.passD}</span>${$t('hq.b_run_defense_b')}<span>${r.runD}</span>${$t('hq.b_aggression_b')}<span>${r.aggression}/100</span>${star}</div><p class="muted" style="margin-top:8px">${r.aggression >= 60 ? $t('hq.blitz_happy_screens_and_quick_throws') : r.passD > r.runD + 6 ? $t('hq.strong_secondary_lean_on_the_run') : r.runD > r.passD + 6 ? $t('hq.soft_against_the_pass_take_your') : $t('hq.no_obvious_weakness_stay_balanced')}</p>${cards}`);
  }
  /** Tapping a scouted play card opens its full diagram. */
  document.addEventListener('click', (e) => { const id = e.target.closest?.('[data-scout-play]')?.dataset.scoutPlay; if (id && PLAYS[id]) sheet(playDetailHtml(id).replace(/<div style="margin-top:12px"><button[^]*?<\/div>$/, ''), { title: PLAYS[id].name }); });


  // ---------------------------------------------------------------- Friday
  Router.registerScreen('gameplan', {
    title: $t('hq.friday_game_plan'),
    render({ f }) {
      if (f.season.day !== 4) return `<div class="panel"><p>${$t('hq.the_game_plan_is_set_on')} ${f.week.plan.offense.length ? f.week.plan.offense.map((id) => esc(PLAYS[id].name)).join(', ') : $t('hq.coachs_default')} · ${f.week.plan.defense.length ? f.week.plan.defense.map((id) => esc(PLAYS[id].name)).join(', ') : $t('hq.coachs_default')}.</p><button class="btn block" data-action="back">${$t('hq.back')}</button></div>`;
      const sel = { offense: new Set(F.startingPlan(f, 'offense')), defense: new Set(F.startingPlan(f, 'defense')) };
      const rep = f.week.scoutReport; const hintsOn = f.settings.hints !== false;
      const hintSide = rep?.side === 'defense' ? 'offense' : rep?.side === 'offense' ? 'defense' : null;
      const hints = hintsOn && hintSide ? counterPlays(F.catalog(f, hintSide), rep.plays || []) : [];
      const hintMap = Object.fromEntries(hints.map((h) => [h.id, h]));
      const hintNote = hintsOn && hintSide ? `<div class="panel tight hint-note">${$t('hq.b_coachs_hints_b')} ${hints.length ? `${$t('hq.outlined_plays_counter_what_showed_in', { hintSide, opponentName: esc(F.opponentName(f) || 'they') })}` : `${$t('hq.nothing_in_your_playbook_clearly_counters', { hintSide })}`} <span class="dim">${$t('hq.settings_coaching_hints')}</span></div>` : hintsOn ? `<p class="dim">${$t('hq.scout_the_opponent_on_thursday_to')}</p>` : '';
      const avail = F.playAvailability(f);
      const availNote = avail.slots.length ? `<div class="panel tight" style="border-color:var(--bad)">${$t('hq.b_no_legal_monster_for')} ${avail.slots.join(', ')}${$t('hq.b_plays_using')} ${avail.slots.map((sl) => ({ SS: $t('hq.nickel'), DL3: $t('hq.heavy_pressure'), WR3: $t('hq.spread'), C: $t('hq.tight') })[sl] || sl).join(' / ')} ${$t('hq.are_grayed_out_and_will_not')}</div>` : '';
      const side = (s) => `<h3>${s === 'offense' ? $t('hq.offense') : $t('hq.defense')} · <span id="count-${s}">${sel[s].size}</span>${$t('hq.equipped', { planSize: F.PLAN_SIZE })}</h3><div class="play-grid" data-side="${s}">${F.catalog(f, s).map((id) => `<button class="card ${sel[s].has(id) ? 'selected' : ''} ${hintMap[id] ? 'hint' : ''} ${avail.blocked[id] ? 'blocked' : ''}" title="${avail.blocked[id] ? esc($t('hq.needs_nobody_legal_to_fill_it', { position: avail.blocked[id] })) : hintMap[id] ? esc($t('hq.counters', { plays: hintMap[id].beats.join(', ') })) : ''}" data-action="toggle" data-side="${s}" data-id="${id}" aria-pressed="${sel[s].has(id)}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></button>`).join('')}${LEGENDARY_IDS.filter((id) => PLAYS[id].side === s).map((id) => legendaryCardHtml(f, id, { selected: sel[s].has(id), side: s })).join('')}</div>`;
      return `<p class="muted">${$t('hq.equip_offensive_and_defensive_plays_for', { planSize: F.PLAN_SIZE, planSize2: F.PLAN_SIZE })}</p>${availNote}${hintNote}
        ${side('offense')}${legendHtml('offense')}${side('defense')}${legendHtml('defense')}
        <div class="row between" style="margin-top:12px"><button class="btn" data-action="details">${$t('hq.play_details')}</button><button class="btn primary" data-action="save">${$t('hq.save_game_plan')}</button></div>`;
    },
    mount(root) {
      const f0 = app.f; const sel = { offense: new Set(F.startingPlan(f0, 'offense')), defense: new Set(F.startingPlan(f0, 'defense')) };
      delegate(root, {
        back: () => Router.back(),
        toggle: (el) => { const s = el.dataset.side, id = el.dataset.id; if (sel[s].has(id)) sel[s].delete(id); else if (sel[s].size >= F.PLAN_SIZE) { toast(`${$t('hq.only_plays_remove_one_first', { planSize: F.PLAN_SIZE, s })}`); return; } else sel[s].add(id); el.classList.toggle('selected', sel[s].has(id)); el.setAttribute('aria-pressed', sel[s].has(id)); root.querySelector(`#count-${s}`).textContent = sel[s].size; },
        details: () => Router.go('playbook'),
        'lp-info': (el) => openLegendarySheet(app.f, el.dataset.id),
        save: () => { const r = F.setGamePlan(app.f, [...sel.offense], [...sel.defense]); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast($t('hq.game_plan_saved'), 'good'); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  // ---------------------------------------------------------------- Saturday
  let mediaPicks = [];
  Router.registerScreen('lineup', {
    title: $t('hq.saturday_media_day'),
    render({ f }) {
      const r = F.lineupCheck(f, { advance: false });
      const borrowed = r.borrowed?.length ? `<p class="muted" style="color:var(--warn)">${r.borrowed.map((b) => b.legal ? `↪ ${b.slot}: ${esc(b.name)} (${esc(b.position)}${b.outOfPosition ? $t('hq.1_75_injury_risk') : ''}) fills in` : `${$t('hq.nobody_legal_plays_using_it_are', { slot: b.slot })}`).join(' · ')}.</p>` : '';
      const lineup = r.ok ? `<p class="muted">${$t('hq.lineup_set_every_starting_position_has')}${r.tired.length ? ` <span style="color:var(--warn)">${$t('hq.tired')} ${esc(r.tired.join(', '))}.</span>` : ''}</p>${borrowed}` : `<p style="color:var(--bad)">${$t('hq.no_legal_monster_for')} ${r.problems.join(', ')}${$t('hq.unless_you_fix_the_depth_chart')}</p>${borrowed}`;
      if (f.week.media) {
        const md = f.week.media; const starM = md.star ? f.roster.find((x) => x.id === md.star) : null; const groups = starM ? `<span class="chip accent">${$t('hq.in_the_spotlight_2_awareness', { name: esc(starM.name) })}</span>` : '';
        const hl = md.headline; const paper = hl ? `<div class="newspaper" role="img" aria-label="${esc(hl.paper)}: ${esc(hl.title)}"><div class="np-mast">${esc(hl.paper)}</div><div class="np-rule"></div><div class="np-title">${esc(hl.title)}</div><div class="np-sub">${esc(hl.sub)}</div><div class="np-kicker">${esc(hl.kicker)}</div></div>` : '';
        return `${paper}<div class="panel"><h3 style="margin-top:0">${$t('hq.press_conference_done')}</h3><p>${groups || $t('hq.no_boosts')}${md.hype ? ` <span class="chip bad">${$t('hq.trash_talk_2_all_risky')}</span>` : ''}</p>${lineup}</div><div class="grid2"><button class="btn block" data-action="roster">${$t('hq.depth_chart')}</button><button class="btn primary block" data-action="done">${$t('hq.on_to_sunday')}</button></div>`;
      }
      const qs = F.mediaQuestions(f); app.save(); const answered = mediaPicks.filter((x) => x != null).length;
      return `<p class="muted">${$t('hq.three_questions_pick_how_you_answer')}</p>
        ${qs.map((q, k) => { const rep = REPORTERS[q.reporter]; return `<div class="panel press-q"><div class="press-rep">${portraitSprite(rep.portrait, 48)}<div class="grow"><div class="press-name">${esc(rep.name)}</div><div class="dim" style="font-size:12px">${esc(rep.role)} · ${esc(rep.outlet)}</div></div><span class="chip">${k + 1} / ${qs.length}</span></div>
          <div class="press-text">“${esc(q.q)}”</div>
          <div class="stack" style="margin-top:8px">${q.a.map((a, ai) => `<button class="choice press-a press-${a.t} ${mediaPicks[k] === ai ? 'selected' : ''}" data-action="answer" data-q="${k}" data-a="${ai}" aria-pressed="${mediaPicks[k] === ai}"><span class="press-style">${STYLE_ICON[a.t]} ${esc(STYLE_LABEL[a.t])}${[a.hype ? ` · <b>${$t('hq.trash_talk_risky_boost')}</b>` : '', a.star ? ` ${$t('hq.b_spotlight_b')}` : ''].join('')}</span><span>${esc(a.text)}</span></button>`).join('')}</div></div>`; }).join('')}
        ${lineup}<button class="btn primary big block" data-action="submit" ${answered === qs.length ? '' : 'disabled'}>${$t('hq.finish_and_read_the_headline')}</button>${answered === qs.length ? '' : `<p class="dim center" style="margin-top:4px">${$t('hq.answer_all_questions_to_finish', { n: qs.length })}</p>`}`;
    },
    mount(root) { delegate(root, {
      roster: () => Router.go('roster'), done: () => Router.go('hq', {}, { reset: true }),
      answer: (el) => { mediaPicks[Number(el.dataset.q)] = Number(el.dataset.a); Router.render(); },
      submit: () => { F.answerMedia(app.f, mediaPicks); mediaPicks = []; app.save(); Router.render(); },
    }); },
  });

  // ---------------------------------------------------------------- Playbook browsing
  Router.registerScreen('playbook', {
    title: $t('hq.playbook'), back: false,
    render({ f }) {
      const oc = F.staffMember(f, 'offensive_coordinator'), dc = F.staffMember(f, 'defensive_coordinator');
      const grid = (s) => `<div class="play-grid">${F.catalog(f, s).map((id) => { const st = F.playStat(f, id); return `<button class="card ${f.week.plan[s].includes(id) ? 'selected' : ''}" data-action="open" data-id="${id}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span><span class="card-stat">${st.used ? `${st.used}× · ${st.avg.toFixed(1)} yd` : $t('hq.not_used_yet')}</span></button>`; }).join('')}</div>`;
      return `<div class="row between"><h3 style="margin:0">${$t('hq.offense_2', { style: esc(oc?.style || '') })}</h3>${f.season.day === 4 ? `<button class="btn small" data-action="plan">${$t('hq.set_game_plan')}</button>` : `<span class="dim">${$t('hq.game_plan_is_set_on_fridays')}</span>`}</div>${grid('offense')}${legendHtml('offense')}
        <h3>${$t('hq.defense_2', { style: esc(dc?.style || '') })}</h3>${grid('defense')}${legendHtml('defense')}
        <h3>${$t('hq.legendary_plays')}</h3><p class="dim" style="margin-top:0">${$t('hq.each_legendary_monster_unlocks_one_play')}</p><div class="play-grid">${LEGENDARY_IDS.map((id) => legendaryCardHtml(f, id, { mode: 'view' })).join('')}</div>
        <p class="dim">${$t('hq.highlighted_cards_are_in_this_weeks')}</p>`;
    },
    mount(root) { delegate(root, { open: (el) => Router.go('playdetail', { id: el.dataset.id }), plan: () => Router.go('gameplan'), 'lp-info': (el) => openLegendarySheet(app.f, el.dataset.id) }); },
  });
  Router.registerScreen('playdetail', {
    title: ({ params }) => PLAYS[params.id]?.name || $t('hq.play'),
    render({ params, f }) { return playDetailHtml(params.id, f); },
    mount(root) { delegate(root, { practice: (el) => Router.go('practice', { play: el.dataset.id }) }); },
  });

  // ---------------------------------------------------------------- League
  Router.registerScreen('league', {
    title: $t('hq.league'), back: false,
    render({ f }) {
      const rival = f.rivals[f.tier]; const titles = Object.values(f.badges).reduce((a, b) => a + b, 0);
      const races = F.awardRaces(f); const anyRace = Object.values(races).some((v) => v.length);
      const watch = `<h3>${$t('hq.award_watch')}</h3>${anyRace ? '' : `<p class="dim">${$t('hq.races_start_after_the_first_sunday')}</p>`}<div class="list">${Object.entries(F.AWARDS).map(([k, a]) => { const top = races[k]; return `<button class="item" style="display:block" data-action="award" data-k="${k}"><div class="row between"><div class="name">${esc(a.label)} <span class="dim">${a.short}</span></div><span class="dim">${$t('hq.top_5')}</span></div>${top.length ? top.map((r, i) => { const me = r.team === f.club; return k === 'coy' ? `<div class="row between sub ${me ? 'mine' : ''}"><span>${i + 1}. ${esc(r.coach)} <span class="dim">${esc(r.team)}</span></span><span class="mono">${r.w}-${r.l}</span></div>` : `<div class="row sub ${me ? 'mine' : ''}" style="gap:6px"><span class="dim">${i + 1}.</span>${monsterSprite(r, 20)}<span class="grow">${esc(r.name)} <span class="dim">${esc(r.position)} · ${esc(r.team)}</span></span><span class="mono">${raceLine(r)}</span></div>`; }).join('') : `<div class="sub dim">${$t('hq.no_contenders_yet')}</div>`}</button>`; }).join('')}</div>`;
      return `<div class="panel">${$t('hq.b_beast_league_b_16_clubs', { year: yearOf(f.season.year) })}<div class="muted">${$t('hq.beast_bowl_titles', { titles })}${f.season.week >= 5 && !f.season.finished ? ` · ${esc(F.playoffPicture(f).text)}` : ''}</div>
        ${rival ? `<div class="muted">${$t('hq.rival_b_b_gm_all_time', { team: esc(rival.team), gm: esc(rival.gm), w: rival.headToHead.w, l: rival.headToHead.l })}</div>` : ''}</div>
        <div class="grid2"><button class="btn block" data-action="go" data-screen="schedule">${$t('hq.schedule')}</button><button class="btn block" data-action="go" data-screen="standings">${$t('hq.standings')}</button><button class="btn block" data-action="go" data-screen="history">${$t('hq.history')}</button><button class="btn block" data-action="go" data-screen="playoffs">${$t('hq.playoffs')}</button><button class="btn block" data-action="go" data-screen="leaders">${$t('hq.stats')}</button><button class="btn block" data-action="go" data-screen="awardhistory">${$t('hq.award_history')}</button><button class="btn block" data-action="go" data-screen="records">${$t('hq.records_book')}</button></div>${watch}`;
    },
    mount(root) { delegate(root, {
        award: (el) => sheet(awardRaceHtml(app.f, el.dataset.k), { title: F.AWARDS[el.dataset.k].label }), go: (el) => Router.go(el.dataset.screen) }); },
  });
  Router.registerScreen('schedule', {
    title: $t('hq.schedule_2'),
    render({ f }) {
      const rival = f.rivals[f.tier]?.team;
      return `<p class="muted">${$t('hq.9_games_1_bye_playoffs_weeks', { year: yearOf(f.season.year) })}</p><div class="list">${f.season.schedule.map((g) => { const res = g.result; return `<div class="item static ${g.week === f.season.week ? 'me' : ''}"><div class="grow"><div class="name">${$t('hq.week', { week: g.week })} ${g.bye ? $t('hq.bye') : `· ${g.home ? 'vs' : '@'} ${esc(g.opponent)}`}${g.opponent === rival ? ' ⚔️' : ''}</div><div class="sub">${g.bye ? $t('hq.rest_and_recover_2') : esc(g.category)}${!g.bye && GYM_BY_CLUB[g.opponent] ? ` · 🏅 ${esc(GYM_BY_CLUB[g.opponent].badge)}${F.badgeOf(f, g.opponent) ? ' (held)' : ''}` : ''}</div></div>${res ? `<span class="chip ${res.won ? 'good' : 'bad'}">${res.won ? 'W' : 'L'} ${res.playerScore}-${res.oppScore}</span>` : g.week === f.season.week ? `<span class="chip accent">${$t('hq.this_week_2')}</span>` : ''}</div>`; }).join('')}</div>`;
    },
  });
  Router.registerScreen('standings', {
    title: $t('hq.standings_2'),
    render({ f }) {
      const st = F.leagueStandings(f);
      const rec = (t) => f.season.records[t];
      const table = (teams) => `<table class="standings"><thead><tr><th>${$t('hq.team')}</th><th class="num">W</th><th class="num">L</th><th class="num">PF</th><th class="num">PA</th></tr></thead><tbody>${teams.map((t) => `<tr class="${t === f.club ? 'me' : ''}"><td>${esc(t)}</td><td class="num">${rec(t).w}</td><td class="num">${rec(t).l}</td><td class="num">${rec(t).pf}</td><td class="num">${rec(t).pa}</td></tr>`).join('')}</tbody></table>`;
      return `<div class="grid2" style="margin-bottom:8px"><button class="btn block" data-action="go" data-screen="league">${$t('hq.league_hub')}</button><button class="btn block" data-action="go" data-screen="leaders">${$t('hq.leaders')}</button></div>` + ['Aurora', 'Titan'].map((conf) => `<h3>${$t('hq.conference', { conf })}</h3>${Object.keys(DIVISIONS).filter((d) => conferenceFor(d) === conf).map((d) => `<div class="panel tight"><b>${d}</b>${table(st.divisions[d])}</div>`).join('')}`).join('') + `<p class="dim">${$t('hq.tiebreakers_head_to_head_division_record')}</p>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen) }); },
  });
  // ---------------------------------------------------------------- Achievement cutscenes (GDD §21)
  let sceneBeat = 0;
  Router.registerScreen('scene', {
    title: $t('hq.achievement'), tabs: false,
    render({ f }) {
      const sc = F.nextScene(f); if (!sc) return `<p class="dim">${$t('hq.nothing_to_show')}</p><button class="btn primary block" data-action="done">${$t('hq.back_to_headquarters')}</button>`;
      const shown = sc.beats.slice(0, sceneBeat + 1); const last = sceneBeat >= sc.beats.length - 1;
      const who = sc.speaker === 'board' ? '' : sc.speaker === 'rival' ? `<div class="row" style="gap:12px;align-items:flex-start">${portraitSprite(`gm|${sc.rivalTeam}`, 72, { hue: 280 })}<div class="grow"><div class="talk-name">${esc(sc.rivalGm || $t('hq.the_rival_gm'))}</div><div class="dim">${$t('hq.gm_on_the_phone', { rivalTeam: esc(sc.rivalTeam || '') })}</div></div></div>` : `<div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 72, { hue: 40 })}<div class="grow"><div class="talk-name">${$t('hq.the_commissioner')}</div><div class="dim">${$t('hq.league_office')}</div></div></div>`;
      const body = sc.speaker === 'board' ? `<div class="board-letter">${shown.map((b, i) => `<p class="${i === sceneBeat ? 'fresh' : ''}">${esc(b)}</p>`).join('')}</div>` : `<div class="stack" style="margin-top:12px">${shown.map((b, i) => `<div class="talk ${i === sceneBeat ? 'fresh' : ''} ${sc.speaker === 'rival' ? 'rival' : ''}"><p class="talk-line">${esc(b)}</p></div>`).join('')}</div>`;
      const left = (f.scenes?.length || 1) - 1;
      return `<div class="scene scene-${sc.speaker}"><div class="scene-badge">${$t('hq.achievement_2', { toUpperCase: esc(sc.title.toUpperCase()) })}</div>${who}${body}
        <button class="btn primary big block" data-action="${last ? 'next' : 'more'}" style="margin-top:14px">${last ? (left ? `${$t('hq.continue_more', { left })}` : $t('hq.back_to_headquarters_2')) : $t('hq.continue')}</button></div>`;
    },
    mount(root) {
      delegate(root, {
        more: () => { sceneBeat += 1; Router.render(); root.querySelector('.fresh')?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); },
        next: () => { F.dismissScene(app.f); sceneBeat = 0; app.save(); if (F.nextScene(app.f)) Router.render(); else Router.go('hq', {}, { reset: true }); },
        done: () => Router.go('hq', {}, { reset: true }),
      });
    },
  });
  /** The bracket (GDD §20.8): Aurora on the left, Titan on the right, the Beast Bowl in the middle, semifinals → championship → final. */
  function bracketHtml(f, p) {
    const abbr = (t) => TEAM_META[t]?.abbr || (t || '').slice(0, 3).toUpperCase();
    const seedOf = (t) => { for (const c of ['Aurora', 'Titan']) { const i = p.seeds[c].indexOf(t); if (i >= 0) return i + 1; } return ''; };
    const winnerOf = (g) => g?.result ? (g.result.winner || (g.result.homeScore > g.result.awayScore ? g.home : g.away)) : null;
    const scoreOf = (g, t) => !g?.result ? '' : t === g.home ? g.result.homeScore : g.result.awayScore;
    const light = (hex) => { const h = String(hex || '').replace('#', ''); if (h.length < 6) return false; const [r, g2, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g2 + 0.0722 * b > 0.55; };
    const cell = (t, g) => { if (!t) return `<div class="bk-team tbd"><span class="bk-seed"></span><span class="bk-abbr">${$t('hq.tbd')}</span></div>`; const w = winnerOf(g); const col = TEAM_META[t]?.color || '#345'; return `<div class="bk-team ${t === f.club ? 'me' : ''} ${w && w !== t ? 'out' : ''} ${w === t ? 'won' : ''} ${light(col) ? 'lighttc' : ''}" style="--tc:${col}"><span class="bk-seed">${seedOf(t)}</span><span class="bk-abbr">${esc(abbr(t))}</span>${g?.result ? `<span class="bk-score">${scoreOf(g, t)}</span>` : ''}</div>`; };
    const pair = (g, top, bottom) => `<div class="bk-pair">${cell(top, g)}${cell(bottom, g)}</div>`;
    const conf = (c) => {
      const seeds = p.seeds[c]; const semis = p.fixtures.filter((g) => g.round === 1 && g.conf === c);
      const s1 = semis.find((g) => g.home === seeds[0]) || null, s2 = semis.find((g) => g.home === seeds[1]) || null;
      const champ = p.fixtures.find((g) => g.round === 2 && g.conf === c) || null;
      const semiCol = `<div class="bk-col">${pair(s1, seeds[0], seeds[3])}${pair(s2, seeds[1], seeds[2])}</div>`;
      const champCol = `<div class="bk-col">${pair(champ, champ?.home || winnerOf(s1), champ?.away || winnerOf(s2))}</div>`;
      return { semiCol, champCol };
    };
    const A = conf('Aurora'), T = conf('Titan');
    const final = p.fixtures.find((g) => g.round === 3) || null;
    const aChamp = winnerOf(p.fixtures.find((g) => g.round === 2 && g.conf === 'Aurora')), tChamp = winnerOf(p.fixtures.find((g) => g.round === 2 && g.conf === 'Titan'));
    const champ = p.champion || winnerOf(final);
    const head = (l, cls = '') => `<div class="bk-h ${cls}">${l}</div>`;
    return `<div class="bracket">
      <div class="bk-heads">${head($t('hq.semis'))}${head('Aurora')}${head($t('hq.beast_bowl'), 'final')}${head('Titan')}${head($t('hq.semis'))}</div>
      <div class="bk-grid">${A.semiCol}${A.champCol}<div class="bk-col bk-center"><div class="bk-ball">🏈</div><div class="bk-pair final">${cell(final ? (final.home === tChamp ? final.away : final.home) : aChamp, final)}${cell(final ? (final.home === tChamp ? final.home : final.away) : tChamp, final)}</div></div>${T.champCol}${T.semiCol}</div>
      <div class="bk-champ"><span class="bk-champ-label">${$t('hq.champion')}</span><span class="bk-champ-name">${champ ? `🏆 ${esc(champ)}${champ === f.club ? $t('hq.thats_you') : ''}` : ''}</span></div>
    </div>`;
  }
  /** HQ header (GDD §21.1): the week in the regular season; the playoff round once the bracket is drawn; the offseason after. */
  function phaseLabel(f) {
    if (f.season.finished) return F.displayYear(f) > f.season.year ? $t('hq.offseason_draft_free_agency') : $t('hq.offseason_contracts');
    const p = f.season.playoffs; if (!p) return `${$t('hq.week', { week: f.season.week })}`;
    return F.ROUND_NAMES?.[p.round] ? ({ 1: $t('hq.playoffs_conference_semifinals'), 2: $t('hq.playoffs_conference_championships'), 3: $t('hq.playoffs_beast_bowl') })[p.round] : $t('hq.playoffs_2');
  }
  function playoffStatus(f) {
    const p = f.season.playoffs; const rec = f.season.records[f.club] || { w: 0, l: 0 };
    if (f.season.finished) return f.season.champion === f.club ? `<b>${$t('hq.beast_bowl_champions_2')}</b>` : `${$t('hq.final_record')} <b class="mono">${rec.w}-${rec.l}</b>`;
    const fx = F.playoffFixture(f); const inIt = Object.values(p.seeds).flat().includes(f.club);
    if (!inIt) return `<span class="dim">${$t('hq.missed_the_playoffs_watching_the_bracket', { w: rec.w, l: rec.l })}</span>`;
    if (fx) return `<b>${esc(fx.tag)}</b> · ${fx.home === f.club ? 'vs' : '@'} ${esc(fx.home === f.club ? fx.away : fx.home)}`;
    const lost = p.results?.find((r) => r.loser === f.club || ((r.home === f.club || r.away === f.club) && r.winner !== f.club));
    return lost ? `<span class="dim">${$t('hq.eliminated_in_the', { n: esc(({ 1: 'conference semifinals', 2: 'conference championship', 3: $t('hq.beast_bowl') })[lost.round] || 'playoffs') })}</span>` : `<b>${$t('hq.advanced')}</b> ${$t('hq.waiting_on_the_next_round')}`;
  }
  Router.registerScreen('playoffs', {
    title: $t('hq.playoffs_2'),
    render({ f }) {
      const p = f.season.playoffs; const rec = (t) => f.season.records[t] || { w: 0, l: 0, t: 0 };
      const recText = (t) => { const r = rec(t); return `${r.w}-${r.l}${r.t ? '-' + r.t : ''}`; };
      const dot = (t) => `<span class="team-dot" style="background:${TEAM_META[t]?.color || '#888'}"></span>`;
      const teamRow = (t, seed, tag) => `<div class="po-row ${t === f.club ? 'me' : ''}"><span class="seed">${seed}</span>${dot(t)}<span class="grow po-name">${esc(t)}${t === f.club ? ` <span class="chip accent">${$t('hq.you')}</span>` : ''}</span>${tag ? `<span class="chip">${tag}</span>` : ''}<span class="mono po-rec">${recText(t)}</span></div>`;
      if (!p) {
        const st = F.leagueStandings(f); const wk = f.season.week;
        const conf = (c) => { const C = st.conferences[c]; const hunt = C.order.filter((t) => !C.seeds.includes(t)).slice(0, 2); const lastIn = C.seeds[3];
          const back = (t) => { const a = rec(t), b = rec(lastIn); const gb = ((b.w - a.w) + (a.l - b.l)) / 2; return gb <= 0 ? 'tiebreak' : `${gb} GB`; };
          return `<div class="panel tight po-conf"><div class="po-head">${$t('hq.b_conference_b', { c })}<span class="dim">4 qualify</span></div>${C.seeds.map((t, i) => teamRow(t, i + 1, C.champions.includes(t) ? $t('hq.div') : 'WC')).join('')}<div class="po-cut"><span>playoff line</span></div>${hunt.map((t) => teamRow(t, '·', back(t))).join('')}</div>`; };
        return `<div class="panel tight">${$t('hq.b_playoff_picture_b_week', { wk })}<div class="muted">${$t('hq.eight_clubs_make_it_two_division', { wk: wk < 5 ? $t('hq.early_days_standings_will_move') : F.playoffPicture(f).text })}</div></div>${conf('Aurora')}${conf('Titan')}<p class="dim">${$t('hq.div_division_leader_wc_wild_card')}</p>`;
      }
      const rounds = [[1, $t('hq.conference_semifinals_week_11')], [2, $t('hq.conference_championships_week_12')], [3, $t('hq.beast_bowl_week_13')]];
      const game = (g) => { const w = g.result ? (g.result.winner || (g.result.homeScore > g.result.awayScore ? g.home : g.away)) : null; const side = (t, score) => `<div class="po-row ${t === f.club ? 'me' : ''} ${w && w !== t ? 'lost' : ''}">${dot(t)}<span class="grow po-name">${esc(t)}${t === f.club ? ` <span class="chip accent">${$t('hq.you')}</span>` : ''}</span><span class="mono po-rec">${score ?? ''}</span></div>`;
        return `<div class="panel tight po-game"><div class="dim" style="font-size:12px">${esc(g.tag)}${g.result ? '' : $t('hq.upcoming')}</div>${side(g.away, g.result?.awayScore)}${side(g.home, g.result?.homeScore)}</div>`; };
      return `${bracketHtml(f, p)}<h3>${$t('hq.games')}</h3>${rounds.map(([r, label]) => { const gs = p.fixtures.filter((g) => g.round === r); return gs.length ? `<h3>${label}</h3>${gs.map(game).join('')}` : ''; }).join('')}
        <h3>${$t('hq.seeds')}</h3>${['Aurora', 'Titan'].map((c) => `<div class="panel tight po-conf"><div class="po-head"><b>${c}</b></div>${p.seeds[c].map((t, i) => teamRow(t, i + 1)).join('')}</div>`).join('')}`;
    },
  });
  // ---------------------------------------------------------------- League stats
  let leaderCat = 'passYds', leaderBucket = 'reg', leaderScope = 'league', leaderYear = null;
  const MIN_LABEL = (k) => ({ att: 'attempts', rush: 'carries', covTargets: $t('hq.targets_in_coverage'), pbSnaps: 'pass-blocking snaps', fga: 'field-goal attempts' })[k] || k;
  // League leaders (revised 2026-10-22): Season (this season or an archived one) × Game type (regular season, playoffs, both) × scope.
  Router.registerScreen('leaders', {
    title: $t('hq.league_leaders'),
    render({ f }) {
      const seasons = leagueSeasons(f); const year = seasons.includes(leaderYear) ? leaderYear : f.season.year;
      const T = seasonTables(f, year); const table = leaderBucket === 'post' ? T.post : leaderBucket === 'all' ? combinedTable(T.reg, T.post) : T.reg;
      const cat = LEADER_CATEGORIES.find((c) => c.id === leaderCat) || LEADER_CATEGORIES[0];
      const myConf = conferenceFor(f.club), myDiv = divisionOf(f.club);
      const teams = leaderScope === 'conference' ? Object.values(DIVISIONS).flat().filter((t) => conferenceFor(t) === myConf) : leaderScope === 'division' ? DIVISIONS[myDiv] : null;
      const rows = leaders(table, cat.id, { n: 15, teams });
      const seg = (items, key, cur) => `<div class="seg wrap" role="tablist">${items.map(([v, l]) => `<button class="btn small ${String(cur) === String(v) ? 'primary' : ''}" role="tab" aria-selected="${String(cur) === String(v)}" data-action="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
      const playoffsOn = T.current ? !!f.season.playoffs : Object.keys(T.post).length > 0;
      const empty = leaderBucket === 'post' && !playoffsOn ? (T.current ? $t('hq.the_playoffs_have_not_started_this') : `${$t('hq.no_playoff_statistics_were_kept_for', { year: yearOf(year) })}`)
        : !Object.keys(table).length ? (T.current ? $t('hq.no_games_played_yet_this_season') : `${$t('hq.s_tables_are_no_longer_in', { year: yearOf(year), archiveSeasons: ARCHIVE_SEASONS })}`)
        : cat.min ? `${$t('hq.nobody_has_reached_the_minimum_of', { min: cat.min[1], minLabel: MIN_LABEL(cat.min[0]) })}` : $t('hq.no_one_has_a_mark_in');
      const fmt = (v) => typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(1)) : v;
      return `${seg([...seasons.map((y) => [y, y === f.season.year ? $t('hq.this_season') : yearOf(y)])], 'year', year)}
        ${seg([['reg', $t('hq.regular_season_4')], ['post', $t('hq.playoffs_2')], ['all', $t('hq.both')]], 'bucket', leaderBucket)}
        ${seg([['league', $t('hq.league')], ['conference', esc(myConf)], ['division', esc(myDiv)]], 'scope', leaderScope)}
        <select class="input" data-action="cat" style="margin:6px 0 8px" aria-label="${$t('hq.category')}">${LEADER_CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === cat.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
        ${cat.min ? `<p class="dim" style="margin-top:0">${$t('hq.minimum', { min: cat.min[1], minLabel: esc(MIN_LABEL(cat.min[0])) })}</p>` : ''}
        <div class="list leaders">${rows.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''} ${i === 0 ? 'leader' : ''}"><span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span>${monsterSprite(r, 32)}<div class="grow"><div class="name">${careerLink(r.id, r.name)} <span class="dim">${esc(r.position)} · ${esc(r.team)}</span></div><div class="sub">${esc(statLine(r))}</div></div><span class="chip ${i === 0 ? 'accent' : ''} mono">${fmt(r[cat.key])}</span></div>`).join('') || `<p class="dim empty">${esc(empty)}</p>`}</div>`;
    },
    mount(root) {
      delegate(root, { bucket: (el) => { leaderBucket = el.dataset.v; Router.render(); }, scope: (el) => { leaderScope = el.dataset.v; Router.render(); }, year: (el) => { leaderYear = Number(el.dataset.v); Router.render(); } });
      root.querySelector('[data-action="cat"]')?.addEventListener('change', (e) => { leaderCat = e.target.value; Router.render(); });
    },
  });
  // The history screens (Franchise History, Award History, Records, Monster Hall of Fame) live in ./history.js (Task 9).
}

export function playDetailHtml(id, f = null, { practiceButton = true } = {}) {
  const p = PLAYS[id]; if (!p) return `<p>${$t('hq.unknown_play')}</p>`;
  const usage = f ? (() => { const s = F.playStat(f, id), c = F.playStat(f, id, { career: true }); const what = p.side === 'offense' ? 'gained' : 'allowed'; return `<div class="panel tight">${$t('hq.b_your_results_b')}<div class="kv">${$t('hq.b_this_season_b')}<span>${s.used ? `${$t('hq.calls_yd_of_15', { used: s.used, toFixed: s.avg.toFixed(1), what, big: s.big, n: s.used })}${s.turnovers ? ` ${$t('hq.turnovers', { turnovers: s.turnovers, n: s.turnovers })}` : ''}` : $t('hq.not_called_yet')}</span>${$t('hq.b_career_b')}<span>${c.used ? `${$t('hq.calls_yd', { used: c.used, toFixed: c.avg.toFixed(1), what })}` : '·'}</span></div></div>`; })() : '';
  const rows = p.onField.map((slot) => { const a = p.assignments[slot]; const what = a.a === 'route' ? `${$t('hq.route', { routeLabels: ROUTE_LABELS[a.r] || a.r })}` : a.a === 'zone' ? `${$t('hq.zone', { replace: a.zone.replace(/_/g, ' ') })}` : a.a === 'man' ? `${$t('hq.man', { key: a.key === 'wideL' ? 'widest left receiver' : a.key === 'wideR' ? 'widest right receiver' : 'inside receiver' })}` : a.a === 'rush' || a.a === 'contain' ? `${$t('hq.gap', { a: a.a === 'rush' ? $t('hq.rush') : $t('hq.contain'), replace: a.gap.replace('_', ' ') })}` : a.a === 'block' ? (p.type === 'run' ? $t('hq.run_block') : $t('hq.pass_protection')) : a.a.replace(/_/g, ' '); return `<tr><td class="mono"><b>${slot}</b>${slot === p.primary ? ' ★' : ''}</td><td>${esc(what)}</td></tr>`; }).join('');
  return `<div class="play-preview">${playCardSvg(id, { width: 54, depthUp: 26, depthBack: 9 })}</div>${legendHtml(p.side)}${usage}
    <div class="panel"><div class="kv">${$t('hq.b_type_b')}<span>${p.side === 'offense' ? (p.type === 'run' ? $t('hq.run') : $t('hq.pass_2')) : $t('hq.defense')}</span>${$t('hq.b_personnel_b')}<span>${esc(p.pkg)}${p.side === 'offense' ? ` · ${esc(p.formation.replace(/_/g, ' '))}` : ''}</span>${p.primary ? `${$t('hq.b_primary_read_b')}<span>${p.primary} (★)</span>` : ''}${p.progression?.length ? `${$t('hq.b_progression_b')}<span>${p.progression.join(' → ')}</span>` : ''}${$t('hq.b_best_for_b')}<span>${p.tags.map((t) => t.replace(/_/g, ' ')).join(', ')}</span></div>${p.desc ? `<p style="margin-top:8px">${esc(p.desc)}</p>` : ''}</div>${lessonHtml(id)}
    <table><thead><tr><th>${$t('hq.player')}</th><th>${$t('hq.assignment')}</th></tr></thead><tbody>${rows}</tbody></table>
    ${practiceButton ? `<div style="margin-top:12px"><button class="btn block" data-action="practice" data-id="${id}">${$t('hq.run_it_in_practice')}</button></div>` : ''}`;
}

export function lessonHtml(id) {
  const L = LESSONS[id]; if (!L) return '';
  return `<div class="panel lesson"><h3 style="margin-top:0">${$t('hq.lesson')}</h3><div class="kv">${$t('hq.b_when_b')}<span>${esc(L.when)}</span>${$t('hq.b_watch_b')}<span>${esc(L.watch)}</span>${$t('hq.b_beats_b')}<span>${esc(L.beats)}</span>${$t('hq.b_loses_to_b')}<span>${esc(L.loses)}</span></div></div>`;
}

function raceLine(r) { const b = []; if (r.passYds) b.push(`${r.passYds} pass`); if (r.passTd) b.push(`${r.passTd} TD`); if (r.rushYds) b.push(`${r.rushYds} rush`); if (r.recYds) b.push(`${r.recYds} rec`); if (r.td) b.push(`${r.td} TD`); if (r.tackles) b.push(`${r.tackles} tkl`); if (r.sacks) b.push(`${r.sacks} sk`); if (r.int) b.push(`${$t('hq.int', { int: r.int })}`); return b.slice(0, 2).join(' · '); }
export function awardsHtml(a) {
  if (!a) return `<p>${$t('hq.no_awards_yet')}</p>`;
  const line = (label, x) => x ? `<div class="item static"><div class="grow"><div class="name">${esc(label)}</div><div class="sub">${x.id ? careerLink(x.id, x.name) : esc(x.name)} (${esc(x.position)})${x.value != null ? ` · ${x.value} ${esc(x.label)}` : ''}</div></div></div>` : '';
  return `<div class="panel center"><div style="font-size:12px" class="muted">${$t('hq.season_2', { year: yearOf(a.year) })}</div><div style="font-size:20px;font-weight:900">${$t('hq.overall_2', { w: a.record.w, l: a.record.l, t: a.record.t ? '-' + a.record.t : '', place: a.place, n: ['st', 'nd', 'rd'][a.place - 1] || 'th' })}</div><div class="muted">${a.champion === undefined ? '' : a.playoffs ? $t('hq.made_the_playoffs') : $t('hq.missed_the_playoffs')}${a.champion ? ` ${$t('hq.beast_bowl_2', { champion: esc(a.champion) })}` : ''}</div></div>
    ${a.rivalry ? `<div class="panel tight" style="border-color:#a855f7">${$t('hq.rivalry_vs_b_b', { team: esc(a.rivalry.team), swept: a.rivalry.swept ? $t('hq.swept_gm_is_not_happy', { gm: esc(a.rivalry.gm) }) : a.rivalry.games ? a.rivalry.wins + '-' + (a.rivalry.games - a.rivalry.wins) : $t('hq.not_played') })}</div>` : ''}
    ${a.league ? `<h3>${$t('hq.league_awards')}</h3><div class="list">${Object.entries(F.AWARDS).map(([k, aw]) => { const w = a.league[k]; if (!w) return ''; return `<div class="item static" style="${w.team === a.club ? 'border-color:var(--accent)' : ''}"><div class="grow"><div class="name">🏅 ${esc(aw.label)}</div><div class="sub">${k === 'coy' ? `${esc(w.coach)} · ${esc(w.team)} (${w.w}-${w.l})` : `${careerLink(w.id, w.name)} (${esc(w.position)}, ${esc(w.team)}) · ${esc(fieldText(w, 'why') || raceLine(w))}`}</div></div></div>`; }).join('')}</div>` : ''}
    <h3>${$t('hq.club_awards')}</h3><div class="list">${a.mvp ? `<div class="item static" style="border-color:var(--accent)"><div class="grow"><div class="name">${$t('hq.team_mvp')}</div><div class="sub">${esc(a.mvp.name)} (${esc(a.mvp.position)})</div></div></div>` : ''}${line($t('hq.rushing_leader'), a.rusher)}${line($t('hq.receiving_leader'), a.receiver)}${line($t('hq.passing_leader'), a.passer)}${line($t('hq.tackling_leader'), a.tackler)}${line($t('hq.sack_leader'), a.rusherD)}${line($t('hq.ball_hawk'), a.ballhawk)}</div>`;
}

/** Campaign panel on HQ: the eight gym badges and the Hall of Fame checklist (GDD §15.4, §15.9). */
function campaignPanel(f) {
  const hof = F.hallOfFameProgress(f);
  const LABEL = { badges: $t('hq.gym_badges'), titles: $t('hq.beast_bowl_titles_2'), wins: $t('hq.career_wins'), awards: $t('hq.league_awards') };
  const badges = GYMS.map((g) => { const b = F.badgeOf(f, g.club); const hue = TYPES[g.element]?.hue ?? 120; return `<button class="badge ${b ? 'won' : ''}" data-action="gym" data-club="${esc(g.club)}" style="--hue:${hue}" aria-label="${b ? $t('hq.earned', { badge: esc(g.badge) }) : $t('hq.not_yet_earned', { badge: esc(g.badge) })}"><span class="badge-ico">${b ? '★' : '·'}</span><span class="badge-nm">${esc(g.element)}</span></button>`; }).join('');
  return `<div class="panel"><div class="row between">${$t('hq.b_campaign_b')}<span class="dim">${hof.eligible ? $t('hq.hall_of_fame_eligible') : `${hof.rows.filter((r) => r.done).length} ${$t('hq.on_track', { n: hof.rows.length })}`}</span></div>
    ${hof.eligible ? `<button class="btn block" data-action="retire" style="margin:8px 0">${$t('hq.retire_to_the_hall_of_fame')}</button>` : ''}
    <div class="badge-row">${badges}</div>
    <div class="hof">${hof.rows.map((r) => `<div class="row between ${r.done ? 'done' : ''}"><span>${r.done ? '✓' : '○'} ${LABEL[r.key]}</span><span class="mono">${r.have} / ${r.goal}</span></div>`).join('')}</div>
    <div class="row between" style="margin-top:8px"><span class="muted">${$t('hq.legend_tracks')} ${Object.entries(f.campaign?.tracks || {}).map(([id, n]) => `${esc(SPECIES_BY_ID[id]?.name || id)} ${n}/3`).join(' · ') || 'none yet'}</span><button class="btn small" data-action="legend">${$t('hq.tracks')}</button></div></div>`;
}

/** One award race in full: the finalists with record, the stat line that drives it, the explanation and the rule (GDD §16.4). */
function awardRaceHtml(f, k) {
  const top = F.awardRaces(f, { n: 5 })[k] || [];
  const minGames = top[0]?.minGames; const frozen = !!f.season.awardsFinal;
  const head = `<p class="muted">${esc(AWARD_RULES[k])}${minGames ? ` ${$t('hq.needs_games_and_a_starters_share', { minGames })}` : ''}</p>${frozen ? `<p class="dim">${$t('hq.regular_season_over_this_result_is')}</p>` : ''}`;
  if (k === 'coy') return `${head}<div class="list">${top.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}" style="align-items:flex-start"><div class="grow"><div class="name">${i + 1}. ${esc(r.coach)} <span class="dim">${esc(r.team)} · ${r.record}</span></div><div class="sub">${esc(fieldText(r, 'why'))}</div></div><span class="chip">${r.score}</span></div>`).join('') || `<p class="dim">${$t('hq.no_contenders_yet')}</p>`}</div><p class="dim">${$t('hq.points_are_game_generated_evaluation_points')}</p>`;
  return `${head}<div class="list">${top.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}" style="align-items:flex-start">${monsterSprite(r, 36)}<div class="grow"><div class="name">${i + 1}. ${careerLink(r.id, r.name)} <span class="dim">${esc(r.position)} · ${esc(r.team)} ${r.record}${r.rookie ? $t('hq.rookie') : ''}</span></div><div class="sub">${$t('hq.games_2', { games: r.games, why: esc(fieldText(r, 'why')), n: r.games })}</div></div><span class="chip">${r.score}</span></div>`).join('') || `<p class="dim">${$t('hq.no_contenders_yet')}</p>`}</div><p class="dim">${$t('hq.points_are_game_generated_evaluation_points')}</p>`;
}

/** Board panel on HQ: the season's goal, its progress and the owner's standing (GDD §17.4). */
function boardPanel(f) {
  const b = f.board; if (!b) return '';
  const g = b.goal; const p = g ? F.goalProgress(f) : null; const hot = F.onHotSeat(f);
  return `<div class="panel tight ${hot ? 'hotseat' : ''}"><div class="row between"><b>🎯 ${g ? esc(fieldText(g, 'label')) : $t('hq.no_goal_set')}</b><span class="chip ${hot ? 'bad' : b.confidence > 0 ? 'good' : ''}">${F.confidenceLabel(b.confidence)}</span></div>
    ${p ? `<div class="bar" style="margin:6px 0 2px"><i style="width:${Math.round(p.pct * 100)}%"></i></div><div class="dim">${esc(p.text)}${hot ? $t('hq.miss_this_and_the_board_lets') : ''}</div>` : hot ? `<div class="dim" style="color:var(--bad)">${$t('hq.on_the_hot_seat_the_next')}</div>` : ''}</div>`;
}

/** Regular season over: record, standing, club leaders, badges, the goal, the league awards and the playoff announcement (GDD §17.5). */
function seasonRecapHtml(f) {
  const rec = F.record(f); const st = F.leagueStandings(f); const place = st.overall.indexOf(f.club) + 1;
  const seeds = f.season.playoffs?.seeds || {}; const conf = Object.entries(seeds).find(([, s]) => s.includes(f.club)); const seed = conf ? conf[1].indexOf(f.club) + 1 : null;
  const po = F.playoffFixture(f); const opp = po ? (po.home === f.club ? po.away : po.home) : null;
  const T = f.season.leagueStats?.[f.club] || {}; const rows = Object.values(T);
  const lead = (key, label, fmt = (v) => v) => { const r = rows.filter((x) => (x[key] || 0) > 0).sort((a, b) => b[key] - a[key])[0]; return r ? `<div class="item static">${monsterSprite(r, 28)}<div class="grow"><div class="name">${careerLink(r.id, r.name)} <span class="dim">${esc(r.position)}</span></div><div class="sub">${esc(label)}: <b>${fmt(r[key])}</b></div></div></div>` : ''; };
  const badges = Object.entries(f.campaign?.badges || {}).filter(([, b]) => b.year === f.season.year).map(([club]) => GYM_BY_CLUB[club]?.badge).filter(Boolean);
  const goal = f.board?.goal; const prog = goal ? F.goalProgress(f) : null;
  const winners = f.season.awardsFinal?.winners || {};
  const mine = Object.entries(winners).filter(([, w]) => w && w.team === f.club);
  const announce = seed ? `<div class="panel center" style="border-color:#f5c542;background:linear-gradient(135deg,#4a3a0a,#2a2008)"><div style="font-size:12px" class="muted">${$t('hq.playoff_bound')}</div><div style="font-size:20px;font-weight:900">${$t('hq.seed', { conf: esc(conf[0]), seed })}</div><div class="muted">${opp ? `${F.ROUND_NAMES[1]}: ${po.home === f.club ? 'vs' : '@'} ${esc(opp)}` : ''}</div></div>`
    : `<div class="panel center"><div style="font-size:12px" class="muted">${$t('hq.season_over')}</div><div style="font-size:18px;font-weight:900">${$t('hq.missed_the_playoffs')}</div><div class="muted">${$t('hq.you_can_watch_the_bracket_play', { text: esc(F.playoffPicture(f).text || '') })}</div></div>`;
  return `<div class="panel center"><div style="font-size:12px" class="muted">${$t('hq.regular_season_2', { year: yearOf(f.season.year) })}</div><div style="font-size:24px;font-weight:900">${rec.w}-${rec.l}${rec.t ? '-' + rec.t : ''}</div><div class="muted">${$t('hq.of_16_points_scored_allowed', { place, n: ['st', 'nd', 'rd'][place - 1] || 'th', pf: rec.pf || 0, pa: rec.pa || 0 })}</div></div>
    ${announce}
    <h3>${$t('hq.season_leaders', { club: esc(f.club) })}</h3><div class="list">${lead('passYds', $t('hq.passing_yards'))}${lead('rushYds', $t('hq.rushing_yards'))}${lead('recYds', $t('hq.receiving_yards'))}${lead('tackles', $t('hq.solo_tackles'))}${lead('sacks', $t('hq.sacks'))}${lead('int', $t('hq.interceptions'))}</div>
    <h3>${$t('hq.campaign')}</h3><div class="panel tight">${badges.length ? `${$t('hq.badges_this_season_b')}${badges.map(esc).join(', ')}</b>` : $t('hq.no_badges_this_season')}${goal ? `<div style="margin-top:4px">🎯 ${esc(fieldText(goal, 'label'))}: <b>${esc(prog?.text || '')}</b> <span class="dim">${$t('hq.settled_after_the_playoffs')}</span></div>` : ''}</div>
    ${Object.keys(winners).length ? `<h3>${$t('hq.league_awards')}</h3>${mine.length ? `<p class="muted">🏅 ${mine.map(([k, w]) => `<b>${w.id ? careerLink(w.id, w.name) : esc(w.name)}${$t('hq.b_is_the', { short: esc(F.AWARDS[k].short) })}`).join(' · ')}!</p>` : ''}<div class="list">${Object.entries(F.AWARDS).map(([k, a]) => { const w = winners[k]; if (!w) return ''; return `<div class="item static ${w.team === f.club ? 'mine' : ''}"><div class="grow"><div class="name">${esc(a.short)} · ${k === 'coy' ? esc(w.coach) : careerLink(w.id, w.name)}</div><div class="sub">${esc(w.team)}${w.record ? ' · ' + w.record : ''}</div></div></div>`; }).join('')}</div>` : ''}`;
}
/** One playoff round's results, for the owner watching from the stands. */
function roundResultsHtml(f, r) {
  return `<div class="list">${r.results.map((g) => `<div class="item static"><div class="grow"><div class="name">${esc(g.away)} ${g.awayScore} @ ${esc(g.home)} ${g.homeScore}${g.clash ? ` ${$t('hq.ot_v_clash', { size: g.clash.size, size2: g.clash.size })}` : g.ot ? ' (OT)' : ''}</div><div class="sub">${esc(g.winner)} advance${g.winner === f.club ? '' : ''}</div></div></div>`).join('')}</div>
    ${r.champion ? `<div class="panel center" style="margin-top:8px"><div style="font-size:12px" class="muted">${$t('hq.beast_bowl_champions_3')}</div><div style="font-size:20px;font-weight:900">${esc(r.champion)}</div></div>` : `<p class="dim">${$t('hq.next', { roundNames: F.ROUND_NAMES[f.season.playoffs?.round] || '' })}</p>`}`;
}
/** Season done: how it ended, the board's verdict, campaign progress and the awards book (GDD §17.5). */
function seasonFinalHtml(f) {
  const a = f.season.awards; const rec = F.record(f); const p = f.season.playoffs;
  const myGames = (p?.results || []).filter((g) => g.home === f.club || g.away === f.club);
  const lost = myGames.find((g) => g.winner !== f.club); const won = myGames.filter((g) => g.winner === f.club).length;
  const how = f.season.champion === f.club ? $t('hq.beast_bowl_champions_4') : lost ? `${$t('hq.eliminated_in_the_by', { roundNames: F.ROUND_NAMES[lost.round] || 'playoffs', winner: lost.winner })}` : $t('hq.missed_the_playoffs');
  const v = f.season.boardVerdict;
  const hof = F.hallOfFameProgress(f);
  return `<div class="panel center"><div style="font-size:12px" class="muted">${$t('hq.final', { year: yearOf(f.season.year) })}</div><div style="font-size:20px;font-weight:900">${esc(how)}</div><div class="muted">${$t('hq.regular_season_3', { w: rec.w, l: rec.l })}${myGames.length ? ` ${$t('hq.in_the_playoffs', { won, n: myGames.length - won })}` : ''} ${$t('hq.overall_3', { place: a?.place || '?', place2: ['st', 'nd', 'rd'][(a?.place || 0) - 1] || 'th' })}${f.season.champion && f.season.champion !== f.club ? ` ${$t('hq.won_the_beast_bowl', { champion: esc(f.season.champion) })}` : ''}</div></div>
    ${v ? `<div class="panel tight ${v.met ? '' : 'hotseat'}">${$t('hq.b_board_b', { label: esc(fieldText(v.goal, 'label')), met: v.met ? $t('hq.met_2') : $t('hq.missed_2') })}<div class="dim">${$t('hq.confidence_2', { confidence: v.confidence >= 0 ? '+' : '', confidence2: v.confidence, confidence3: F.confidenceLabel(v.confidence), met: v.met ? $t('hq.expanded_scouting_next_season') : v.status === 'fired' ? $t('hq.the_board_has_let_you_go_2') : v.status === 'hot_seat' ? $t('hq.one_more_miss_and_you_are') : '' })}</div></div>` : ''}
    <div class="panel tight">${$t('hq.b_hall_of_fame_progress_b')}<div class="dim">${hof.rows.map((r) => `${r.done ? '✓' : '○'} ${r.key}: ${r.have}/${r.goal}`).join(' · ')}</div></div>
    ${a ? awardsHtml(a) : ''}`;
}

/** Rival card on HQ, every week: standings gap, head-to-head, next meeting and the GM's weekly needle (GDD §17.7). */
function rivalCard(f) {
  const rv = f.rivals?.[f.tier]; if (!rv || f.season.finished) return '';
  const mine = f.season.records[f.club] || { w: 0, l: 0 }, theirs = f.season.records[rv.team] || { w: 0, l: 0 };
  const next = f.season.schedule.find((g) => g.opponent === rv.team && !g.result && !g.bye);
  const thisWeek = next && next.week === f.season.week;
  const gb = ((theirs.w - mine.w) + (mine.l - theirs.l)) / 2;
  const state = thisWeek ? 'gameWeek' : gb < 0 ? 'ahead' : gb > 0 ? 'behind' : 'level';
  const pool = RIVAL_WEEKLY[state]; const line = pool[(f.season.week + f.season.year * 3) % pool.length];
  const played = f.season.schedule.filter((g) => g.opponent === rv.team && g.result);
  const seasonH2h = played.length ? ` ${$t('hq.this_season_3')} ${played.filter((g) => g.result.won).length}-${played.filter((g) => !g.result.won).length}` : '';
  return `<div class="panel tight rival-card ${thisWeek ? 'hot' : ''}"><div class="row" style="gap:10px;align-items:flex-start">${portraitSprite(`gm|${rv.team}`, 40, { hue: 280 })}<div class="grow"><div class="row between"><b>⚔️ ${esc(rv.team)}</b><span class="chip ${gb < 0 ? 'good' : gb > 0 ? 'bad' : ''}">${gb === 0 ? 'level' : gb < 0 ? `${$t('hq.you_lead_by', { n: Math.abs(gb) })}` : `${gb} back`}</span></div>
    <div class="dim">${$t('hq.gm_they_are_you_are_all', { gm: esc(rv.gm), w: theirs.w, l: theirs.l, w2: mine.w, l2: mine.l, w3: rv.headToHead.w, l3: rv.headToHead.l, seasonH2h })}${next ? ` · ${thisWeek ? `<b>${$t('hq.game_this_sunday')}</b>` : `next meeting week ${next.week}`}` : $t('hq.no_more_meetings_this_season')}</div>
    <p class="talk-line" style="margin:4px 0 0">“${esc(line)}”</p></div></div></div>`;
}

/**
 * Complete a retirement that is due (GDD §42.4): the season is settled, the owner confirms, the archive is written once, the
 * Hall of Fame card when the checklist is met, then the Franchise Legacy opens. Nothing is deleted.
 */
export async function retireNow(app, Router, reason) {
  const f = app.f; const check = retirementChecklist(f);
  if (!check.ready) { toast(`${$t('hq.finish_the_season_first', { missing: check.missing[0] })}`, 'bad', 5000); return false; }
  const eligible = F.hallOfFameProgress(f).eligible; const n = seasonsCompleted(f);
  const why = reason === 'fired' ? `${$t('hq.the_board_has_ended_your_time', { club: f.club })}` : reason === 'season-cap' ? `${$t('hq.has_completed_its_seasons_the_career', { club: f.club, seasonCap: SEASON_CAP })}` : `${$t('hq.retire_now', { first: f.owner.first, last: f.owner.last })}`;
  const hofLine = eligible ? $t('hq.your_career_card_is_written_to') : (reason === 'fired' ? $t('hq.you_did_not_reach_the_hall') : '');
  const text = `${$t('hq.the_franchise_becomes_a_permanent_read', { why, n, hofLine })}`;
  if (!(await confirmSheet(text, { title: reason === 'fired' ? $t('hq.let_go') : $t('hq.retire_the_franchise'), okLabel: reason === 'fired' ? $t('hq.accept_and_archive') : $t('hq.retire') }))) return false;
  const r = await app.archive({ reason });
  if (!r.ok) { toast(r.saveFailed ? `${$t('hq.the_archive_could_not_be_saved', { message: r.error?.message || 'unknown error' })}` : (r.error?.message || $t('hq.retirement_could_not_be_completed')), 'bad', 7000); return false; }
  toast(r.card ? $t('hq.welcome_to_the_hall_of_fame') : $t('hq.your_franchise_legacy_is_ready'), 'good', 4500);
  Router.go('legacy', {}, { reset: true }); return true;
}

/** Owner 2026-11-05 §8: a performance-based staff renewal row: the evaluation (band and the seasons behind it), the demand, the five options. */
function staffNegRow(f, i, fmt) {
  const pct = (x) => `${x >= 0 ? '+' : ''}${Math.round(x * 1000) / 10}%`; const yrsSel = 2;
  const opt = (k) => F.staffOfferFor(i, k); const btn = (v, label, sal, cls = '') => sal == null ? '' : `<button class="btn small ${cls}" data-action="c" data-id="${i.id}" data-v="${v}">${label}<br><span class="dim" style="font-size:11px">${fmt(sal)}</span></button>`;
  const check = i.status ? null : F.staffRenewalCheck(f, i.role);
  const why = (i.eval.seasons || []).map((x) => `${yearOf(x.year)}: ${esc(fieldText(x, 'why'))}`).join(' · ') || $t('hq.no_full_season_in_the_role');
  const done = i.status === 'signed' ? `${$t('hq.re_signed_at_for_2', { amount: fmt(i.final), years: i.years === 1 ? '1 season' : '2 seasons' })}` : i.status === 'walked' ? `${$t('hq.left')}${i.ended ? ` (${esc(i.ended)})` : ''}${$t('hq.hire_a_replacement')}` : '';
  return `<div class="item static ${i.status ? 'done' : ''}"><div class="grow"><div class="name">${esc(i.name)} <span class="dim">${esc(i.role.replace(/_/g, ' '))}</span></div>
    <div class="sub">${$t('hq.performance')} <span class="chip ${['excellent', 'good'].includes(i.eval.band) ? 'good' : i.eval.band === 'average' ? '' : 'warn'}">${esc(i.eval.label)}</span> <span class="dim">${why}</span></div>
    <div class="sub">${fmt(i.current)} → asks <b>${fmt(i.ask)}</b>/yr (${pct(i.ask / i.current - 1)})</div>
    ${check ? `<div class="sub" style="color:${check.ok ? 'var(--good)' : 'var(--bad)'}">${check.ok ? `${$t('hq.the_demand_fits_next_seasons_cap', { amount: fmt(check.room - check.demand) })}` : esc(check.reason)}</div>` : ''}
    ${i.counter && !i.status ? `<div class="sub">${$t('hq.he_counters_at_b_b_yr', { amount: fmt(i.counter) })} <button class="btn small primary" data-action="c" data-id="${i.id}" data-v="acceptcounter">${$t('hq.accept_the_counter')}</button></div>` : ''}
    ${i.status ? `<div class="sub">${done}</div>` : `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">${btn('sign', $t('hq.accept_demand'), opt('accept'), 'primary')}${btn('smaller', $t('hq.smaller_raise'), opt('smaller'))}${btn('same', $t('hq.same_salary'), opt('same'))}${btn('reduce', $t('hq.ask_for_a_cut'), opt('reduce'))}<button class="btn small danger" data-action="c" data-id="${i.id}" data-v="walk">${$t('hq.let_go_and_replace')}</button></div><div class="dim" style="font-size:12px">${i.round ? `${$t('hq.round_of_2_one_more_offer', { round: i.round })}` : $t('hq.he_may_accept_counter_or_turn')}</div>`}
  </div></div>`;
}

/** Owner 2026-11-05 (13:23): a renewal negotiation row — his opening demand, his latest counter, counteroffers left, the status. */
function monsterNegRow(f, i, fmt) {
  const m = f.roster.find((x) => x.id === i.id); const neg = F.renewalTalks(f, i.id);
  const status = i.status === 'signed' ? `${$t('hq.re_signed_at_for', { amount: fmt(i.final) })} ${i.years === 1 ? '1 season' : `${i.years} seasons`}${i.countered === 'accepted' ? $t('hq.after_negotiating') : ''}`
    : i.status === 'declined' ? `${$t('hq.he_will_test_free_agency_when', { talks: i.talks === 'closed' ? $t('hq.does_not_want_to_negotiate') : $t('hq.ended_the_talks') })}${fieldText(i, 'clue') ? ` · ${esc(fieldText(i, 'clue'))}` : ''}`
    : i.status === 'walked' ? $t('hq.walked_2') : i.status ? esc(i.status) : '';
  const open = !i.status && neg?.state === 'active';
  return `<div class="item static ${i.status ? 'done' : ''}" style="align-items:flex-start">${m ? monsterSprite(m, 36) : ''}<div class="grow"><div class="name">${esc(i.name)} <span class="dim">${$t('hq.ovr', { position: esc(i.position), ovr: i.ovr })}${m ? ` ${$t('hq.age', { age: m.age })}` : ''}</span></div>
    <div class="sub">${$t('hq.now_opening_demand_b_b_yr', { amount: fmt(i.current), amount2: fmt(i.opening ?? i.ask) })}${neg ? ` × ${neg.opening.years}` : ''}</div>
    ${neg && neg.demand.salary !== neg.opening.salary ? `<div class="sub">${$t('hq.his_latest_counter_b_b_yr', { amount: fmt(neg.demand.salary), years: neg.demand.years })}</div>` : ''}
    ${open ? `<div class="sub dim">${$t('hq.counteroffers_left_of_2', { left: neg.left })}${fieldText(neg, 'clue') ? ` · ${esc(fieldText(neg, 'clue'))}` : ''}</div><div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn small primary" data-action="c" data-id="${i.id}" data-v="sign">${$t('hq.accept_yr', { amount: fmt(i.ask) })}</button><button class="btn small" data-action="negrenew" data-id="${i.id}" ${neg.left ? '' : 'disabled'}>${$t('hq.counteroffer')}</button><button class="btn small danger" data-action="c" data-id="${i.id}" data-v="walk">${$t('hq.let_walk')}</button></div>` : `<div class="sub">${status}</div>`}
  </div></div>`;
}
