// Main menu, settings, developer tools, about.

import { esc, delegate, toast, confirmSheet, sheet } from '../dom.js';
import { openTypeChart } from '../type-chart.js';
import { stadiumListHtml } from '../stadium-preview.js';
import { achievementsData } from '../../franchise/achievement-store.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { yearOf } from '../../data/calendar.js';
import * as Save from '../../franchise/save.js';
import { savePanelHtml, fillStorageMeter, offerExport, importFile, openBackups } from '../storage-ui.js';
import { buildLabel, devDisplaysAllowed } from '../../version.js';
import { summary, hireDefaultStaff, DIFFICULTY, dexCounts, DEX_GROUPS } from '../../franchise/franchise.js';
import * as F from '../../franchise/franchise.js';
import { BACKGROUNDS } from '../../data/staff.js';
import { TEAM_META } from '../../data/league.js';
import { coachEditorHtml, coachEditorActions, specOf } from '../coach-editor.js';
import { parseCoach, lookFromLegacy } from '../coach-portrait.js';
import { GYM_BY_CLUB } from '../../data/gyms.js';
import { resetDex } from '../../franchise/dex-store.js';
import { clashSettings } from '../../franchise/clash-link.js';
import { hallOfFame } from '../../franchise/hall-of-fame.js';
import { isArchived, SEASON_CAP } from '../../franchise/lifecycle.js';
import { shortcutsEnabled, fastForwardSeason, fastForwardSeasons } from '../../franchise/dev-shortcut.js';
import { resetTutorial, primerHtml, assistSettingsHtml } from '../tutorial.js';
import { setAssist, assistSettings, ASSIST_MODE_TEXT } from '../../franchise/assist.js';
import { openStatGuide } from '../stat-guide.js';
import { DIFFICULTY as DIFF } from '../../franchise/franchise.js';
import { monsterSprite } from '../pixel-monster.js';
import { portraitSprite } from '../pixel-monster.js';
import { applyFlashPref } from '../flash-pref.js';
import { applyFrameRate, frameRateOf } from '../frame-rate.js';
import { reviewQueue, queueText, devBadge, devNoticesOn, abilityQueueText, focusReviewer } from '../dev-review.js';
import { t } from '../../text/index.js';
import { t as $t } from '../../text/index.js';

export function registerMenuScreens(Router, app) {
  Router.registerScreen('menu', {
    title: t('menu.gridiron_beast'), back: false, tabs: false,
    render({ f }) {
      const legacy = Save.legacySummary(Save.readLegacy());
      const s = f ? summary(f) : null;
      const archived = f && isArchived(f); const hof = hallOfFame().length;
      const tile = (screen, icon, label, count) => `<button class="menu-tile" data-action="go" data-screen="${screen}"><span class="mt-icon">${icon}</span><span class="mt-label">${label}</span>${count != null ? `<span class="mt-count mono">${count}</span>` : ''}</button>`;
      // One franchise card: the franchise you are in and how to get back to it; switching or starting another lives behind one
      // quiet link (the Franchises screen holds the three slots and their New / Import actions). The League Hub is inside the
      // franchise (HQ), not here.
      const card = f ? `<div class="panel menu-franchise">
          <div class="row" style="gap:12px">${portraitSprite(f.owner.portrait + '|' + f.owner.first, 52, { teamColor: TEAM_META[f.club]?.color })}<div class="grow" style="min-width:0">
            <div class="mf-club">${esc(s.club)}</div>
            <div class="muted">GM ${esc(f.owner.first)} ${esc(f.owner.last)}</div>
            <div class="mf-meta"><span class="chip">${yearOf(s.year)}</span>${archived ? `<span class="chip">${t('menu.legacy')}</span>` : `<span class="chip">${t('menu.week', { week: s.week })}</span><span class="chip accent">${s.record}</span>`}</div></div></div>
          <button class="btn primary big block" style="margin-top:14px" data-action="continue">${archived ? t('menu.view_franchise_legacy') : t('menu.continue')}</button>
          <button class="mf-switch" data-action="go" data-screen="franchises"><span>${t('menu.switch_or_start_a_franchise')}</span><span class="dim">›</span></button>
        </div>` : `<div class="panel menu-franchise">
          <div class="mf-club" style="text-align:center">${t('menu.build_a_monster_dynasty')}</div>
          <p class="muted center" style="margin:6px 0 14px">${t('menu.draft_monsters_call_the_plays_win')}</p>
          <button class="btn primary big block" data-action="new">${t('menu.new_franchise')}</button>
          <button class="mf-switch" data-action="go" data-screen="franchises"><span>${t('menu.saved_franchises')}</span><span class="dim">›</span></button>
        </div>`;
      return `
        <div class="hero"><div class="logo">${t('menu.gridiron_beast_2')}</div><div class="muted">${t('menu.monster_football_franchise_7_on_7')}</div></div>
        ${card}
        ${legacy && !f ? `<button class="btn block" style="margin-bottom:12px" data-action="import-legacy">${t('menu.import_s_previous_version', { owner: esc(legacy.owner), club: esc(legacy.club) })}</button>` : ''}
        <div class="menu-tiles ${hof ? 'three' : ''}">
          ${tile('dex', '📖', t('menu.beast_dex'), `${dexCounts(f).all.seen}/${dexCounts(f).all.total}`)}
          ${tile('achievements', '🏅', t('menu.achievements'), `${Object.keys(achievementsData().earned).length}/${ACHIEVEMENTS.length}`)}
          ${hof ? tile('hof', '🏛️', t('menu.hall_of_fame'), hof) : ''}
        </div>
        <div class="grid2" style="margin-top:12px"><button class="btn block menu-util" data-action="go" data-screen="settings">${t('menu.settings')}</button><button class="btn block badge-host menu-util" data-action="go" data-screen="developer">${t('menu.developer')}${devBadge(app.settings)}</button></div>
        <p class="center dim" style="margin-top:16px;font-size:12px">${t('menu.gridiron_beast_build_southside_games', { build: esc(buildLabel()) })}</p>`;
    },
    mount(root, ctx) {
      delegate(root, {
        continue: () => Router.go(isArchived(app.f) ? 'legacy' : 'hq', {}, { reset: true }),
        // A new franchise goes into an empty slot (GDD §42.5): the Franchises screen chooses it. With no slot manager (fallback
        // storage) the single-save behaviour of v39.1 remains, with its warning.
        new: async () => {
          if (app.slots && app.storage.store) { const { empty } = await app.slots.slotFor(); if (!app.f && empty.includes(app.slot)) { Router.go('onboarding', { fresh: true }); return; } if (empty.length === 1 && !app.f) { await app.createIn(empty[0]); return; } Router.go('franchises'); if (!empty.length) toast(t('menu.all_three_slots_are_full_delete'), 'info', 5000); return; }
          if (app.f && !(await confirmSheet(t('menu.starting_a_new_franchise_replaces_your'), { title: t('menu.new_franchise_2'), okLabel: t('menu.start_new'), danger: true }))) return; Router.go('onboarding', { fresh: true });
        },
        'import-legacy': async () => { try { const f = Save.importLegacy(Save.readLegacy()); const r = await app.setFranchise(f); if (!r.ok) { toast(`${t('menu.import_failed_nothing_was_changed', { message: r.error?.message })}`, 'bad', 6000); return; } toast(t('menu.imported_your_previous_franchise_your_old'), 'good'); if (Object.keys(f.staff).length < 5) hireDefaultStaff(f); app.save(); Router.go('hq', {}, { reset: true }); } catch (e) { toast(e.message, 'bad'); } },
        soon: (el) => toast(`${t('menu.is_planned_for_a_later_release', { what: el.dataset.what })}`),
        go: (el) => Router.go(el.dataset.screen),
      });
    },
  });

  Router.registerScreen('settings', {
    title: t('menu.settings_2'),
    render({ app }) {
      const s = app.settings;
      return `
        <div class="panel">
          <label class="field">${t('menu.game_length')}<select data-change="quarter"><option value="180" ${s.quarterLength === 180 ? 'selected' : ''}>${t('menu.standard_3_minute_quarters_25_plays')}</option><option value="300" ${s.quarterLength === 300 ? 'selected' : ''}>${t('menu.long_5_minute_quarters_45_plays')}</option><option value="420" ${s.quarterLength === 420 ? 'selected' : ''}>${t('menu.full_7_minute_quarters_60_plays')}</option></select></label>
          ${app.f ? `<div class="field"><span>${t('menu.difficulty')}</span><div class="muted">${t('menu.b_b_set_when_the_franchise', { label: esc(DIFFICULTY[s.difficulty]?.label || t('menu.pro')) })}</div></div>` : ''}
          <label class="field">${t('menu.coaching_mode')}<select data-change="mode"><option value="key" ${s.mode === 'key' ? 'selected' : ''}>${t('menu.key_moments_you_coach_the_big')}</option><option value="full" ${s.mode === 'full' ? 'selected' : ''}>${t('menu.full_coaching_call_every_play')}</option></select></label>
          <p class="dim">${t('menu.times_assume_key_moments_full_coaching')}</p>
          <label class="field">${t('menu.animation_speed')}<select data-change="speed"><option value="0.7" ${s.speed === 0.7 ? 'selected' : ''}>${t('menu.slow')}</option><option value="1" ${s.speed === 1 ? 'selected' : ''}>${t('menu.normal')}</option><option value="1.6" ${s.speed === 1.6 ? 'selected' : ''}>${t('menu.fast')}</option></select></label>
          ${(() => { const c = clashSettings(s); return `<label class="field">${t('menu.beast_clash_battles')}<select data-change="clashmode"><option value="ask" ${c.mode === 'ask' ? 'selected' : ''}>${t('menu.ask_every_time_default')}</option><option value="watch" ${c.mode === 'watch' ? 'selected' : ''}>${t('menu.suggest_watch_battle')}</option><option value="skip" ${c.mode === 'skip' ? 'selected' : ''}>${t('menu.suggest_skip_to_results')}</option></select></label>
          <label class="field">${t('menu.beast_clash_speed')}<select data-change="clashspeed"><option value="1" ${c.speed === 1 ? 'selected' : ''}>${t('menu.normal')}</option><option value="2" ${c.speed === 2 ? 'selected' : ''}>${t('menu.fast_default')}</option><option value="4" ${c.speed === 4 ? 'selected' : ''}>${t('menu.fastest')}</option></select></label>
          <p class="dim">${t('menu.tuesday_encounters_the_pregame_clash_and')}</p>`; })()}
          <label class="field">${t('menu.players_on_the_field')}<select data-change="markers"><option value="sprites" ${s.fieldMarkers !== 'simple' ? 'selected' : ''}>${t('menu.monster_art')}</option><option value="simple" ${s.fieldMarkers === 'simple' ? 'selected' : ''}>${t('menu.simple_circles_and_squares')}</option></select></label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="replays" ${s.replays !== false ? 'checked' : ''}> ${t('menu.instant_replays_of_big_plays_touchdowns')}</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="typeicons" ${s.typeIcons !== false ? 'checked' : ''}> ${t('menu.type_matchup_icons_before_the_snap')}</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="autopoints" ${s.autoPoints ? 'checked' : ''}> ${t('menu.trainer_invests_training_points_for_me')}</label>
          ${app.f ? assistSettingsHtml(app.f) : ''}
          <label class="field">${t('menu.frame_rate')}<select data-change="framerate"><option value="60" ${frameRateOf(s) === 60 ? 'selected' : ''}>${t('menu.60_fps_default')}</option><option value="30" ${frameRateOf(s) === 30 ? 'selected' : ''}>${t('menu.30_fps_battery_saver')}</option></select></label>
          <p class="dim" style="margin-top:0">${t('menu.30_fps_redraws_effects_less_often')}</p>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="reduced" ${s.reducedMotion ? 'checked' : ''}> ${t('menu.reduce_motion_no_play_animation_no')}</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="reducedflash" ${s.reducedFlash ? 'checked' : ''}> ${t('menu.reduce_flashes_softer_ability_and_score')}</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="shake" ${s.screenShake !== false ? 'checked' : ''}> ${t('menu.screen_shake_on_big_hits_and')}</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="evosound" ${s.evoSound ? 'checked' : ''}> ${t('menu.evolution_sounds_off_by_default_the')}</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="devnotices" ${s.devNotices !== false ? 'checked' : ''}> ${t('menu.developer_review_notices_new_or_changed')}</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="liveclock" ${s.liveClock ? 'checked' : ''}> ${t('menu.live_40_second_play_clock_off')}</label>
        </div>
        ${savePanelHtml(app)}
        <p class="dim">${t('menu.saves_from_earlier_versions_are_never')}</p>
        <p class="center dim">${t('menu.build_files_if_this_does_not', { build: esc(buildLabel()), gbFiles: globalThis.__gbFiles === 'mapped' ? t('menu.up_to_date') : globalThis.__gbFiles === 'refreshed' ? 'refreshed' : 'checking' })}</p>`;
    },
    mount(root, ctx) {
      fillStorageMeter(root, app);
      const set = (k, v) => { if (app.f) { app.f.settings[k] = v; app.save(); } else app.defaultSettings[k] = v; document.documentElement.dataset.reducedMotion = app.settings.reducedMotion ? '1' : '0'; applyFlashPref(app.settings); applyFrameRate(app.settings); };
      delegate(root, {
        quarter: (el) => set('quarterLength', Number(el.value)), mode: (el) => set('mode', el.value), speed: (el) => set('speed', Number(el.value)),
        clashmode: (el) => set('clash', { ...clashSettings(app.settings), mode: el.value }), clashspeed: (el) => set('clash', { ...clashSettings(app.settings), speed: Number(el.value) }),
        reduced: (el) => set('reducedMotion', el.checked), reducedflash: (el) => set('reducedFlash', el.checked), framerate: (el) => set('frameRate', Number(el.value) === 30 ? 30 : 60), shake: (el) => set('screenShake', el.checked), evosound: (el) => set('evoSound', el.checked), qbreads: (el) => set('qbReads', el.checked), devnotices: (el) => set('devNotices', el.checked), markers: (el) => set('fieldMarkers', el.value), typeicons: (el) => set('typeIcons', el.checked), replays: (el) => set('replays', el.checked), autopoints: (el) => set('autoPoints', el.checked), 'assist-hints': (el) => { setAssist(app.f, { hints: el.checked }); app.save(); }, 'assist-consequences': (el) => { setAssist(app.f, { consequences: el.checked }); app.save(); }, 'assist-mode': (el) => { setAssist(app.f, { mode: el.dataset.v }); app.save(); toast(`${t('menu.coach_assist', { label: ASSIST_MODE_TEXT[el.dataset.v].label })}`, 'good'); Router.render(); }, liveclock: (el) => set('liveClock', el.checked),
        tutreset: () => { resetTutorial(app.f); if (assistSettings(app.f).mode === 'expert') setAssist(app.f, { mode: 'standard' }); app.save(); toast(t('menu.tips_will_show_again_on_each'), 'good'); Router.render(); },
        primer: () => sheet(primerHtml(), { title: t('menu.how_football_works') }),
        export: () => { if (app.f) offerExport(app.f); },
        import: async (el) => { const file = el.files?.[0]; if (!file) return; try { if (await importFile(app, file)) Router.go('hq', {}, { reset: true }); } catch (e) { toast(t('menu.import_failed') + e.message, 'bad'); } el.value = ''; },
        backups: () => openBackups(app, { onRestored: () => Router.go('hq', {}, { reset: true }) }),
        'restore-legacy': async () => { const b = Save.loadBackup(); if (!b) return; if (await confirmSheet(`${t('menu.roll_back_to_week_saved_after', { year: yearOf(b.season.year), b: b.season.week })}`, { title: t('menu.restore_backup'), okLabel: t('menu.restore') })) { const r = await app.replaceFranchise(b, { copyKind: 'pre-restore' }); if (!r.ok) { toast(`${t('menu.restore_failed_nothing_was_changed', { message: r.error?.message })}`, 'bad', 6000); return; } toast(t('menu.backup_restored_and_saved'), 'good'); Router.go('hq', {}, { reset: true }); } },
        persist: async () => { let ok = false; try { ok = await navigator.storage.persist(); } catch { ok = false; } toast(ok ? t('menu.the_browser_will_keep_this_data') : t('menu.the_browser_declined_for_now_your'), ok ? 'good' : 'info', 4000); fillStorageMeter(root, app); },
        reset: async () => { if (await confirmSheet(app.storage.store ? t('menu.delete_this_franchise_it_leaves_your') : t('menu.delete_this_franchise_permanently_export_first'), { title: t('menu.delete_franchise'), okLabel: t('menu.delete'), danger: true })) { if (!(await app.reset()).ok) return; toast(t('menu.franchise_deleted')); Router.go('menu', {}, { reset: true }); } },
      });
    },
  });

  Router.registerScreen('developer', {
    title: t('menu.developer_tools'),
    render() {
      const q = reviewQueue();
      return `<p class="muted">${t('menu.inspection_tools_that_work_without_a')}</p>
        ${q.plays.length ? `<div class="panel tight dev-queue">${t('menu.b_waiting_for_your_review_b')}<div class="muted" style="margin-top:2px">${t('menu.new_or_changed_since_you_last', { queue: esc(queueText(q)) })}</div></div>` : ''}
        ${[q.football, q.clash].filter((r) => r.outstanding).map((r) => `<div class="panel tight dev-queue" data-review-notice="${r.ns}"><button class="dev-notice" data-action="reviewer" data-ns="${r.ns}" data-status="outstanding"><b>🔔 ${esc(abilityQueueText(r))}</b><span class="muted" style="display:block;margin-top:2px">${t('menu.of_approved_tap_to_open_the', { n: r.approved.length, total: r.total, title: esc(r.title) })}</span></button>
          ${r.revision.length ? `<div class="chips" style="margin-top:6px">${r.revision.slice(0, 8).map((x) => `<button class="chip warn" data-action="reviewer" data-ns="${r.ns}" data-status="revision" data-id="${esc(x.id)}">✎ ${esc(x.name)}</button>`).join('')}${r.revision.length > 8 ? `<span class="dim">${t('menu.more', { n: r.revision.length - 8 })}</span>` : ''}</div>` : ''}</div>`).join('')}
        ${q.total ? '' : `<div class="panel tight dim">${t('menu.nothing_waiting_for_review')}</div>`}
        <div class="stack">
        <button class="btn block badge-host" data-action="go" data-screen="audit">${t('menu.playbook_audit')}${devBadge(app.settings, q.plays.length)}</button>
        <button class="btn block" data-action="go" data-screen="practice">${t('menu.practice_field')}</button>
        <button class="btn block" data-action="go" data-screen="ai-lab">${t('menu.ai_testing_lab_qb_decisions')}</button>
        <button class="btn block" data-action="go" data-screen="attr-lab">${t('menu.attribute_testing_lab')}</button>
        <button class="btn block" data-action="go" data-screen="evo-preview">${t('menu.preview_evolution')}</button>
        <button class="btn block badge-host" data-action="go" data-screen="ability-reviewer">${t('menu.ability_reviewer')}${devBadge(app.settings, q.football.outstanding)}</button>
        <button class="btn block" data-action="go" data-screen="ability-balance">${t('menu.ability_balance')}</button>
        <button class="btn block badge-host" data-action="go" data-screen="clash-ability-reviewer">${t('menu.clash_ability_reviewer')}${devBadge(app.settings, q.clash.outstanding)}</button>
        <button class="btn block" data-action="go" data-screen="clash-lab">${t('menu.clash_lab_beast_clash_phase_1')}</button>
        ${app.f ? `<h3>${t('menu.feature_testing_this_franchise')}</h3><p class="dim" style="margin-top:0">${t('menu.for_trying_the_new_features_without')}</p>
        <div class="row" style="gap:6px;flex-wrap:wrap">${['aurodrax', 'tempestra', 'titanolith', 'nyxshade', 'glacivern', 'elderoot'].map((sp) => `<button class="btn small" data-action="dev-legend" data-sp="${sp}">+ ${sp[0].toUpperCase() + sp.slice(1)}</button>`).join('')}</div>
        <button class="btn block" data-action="dev-ceremony" style="margin-top:6px">${t('menu.preview_the_beast_bowl_ceremony_nothing')}</button>` : ''}
        ${devDisplaysAllowed() ? `<h3>${t('menu.development_displays')}</h3><p class="dim" style="margin-top:0">${t('menu.shown_only_while_the_game_is')}</p>
        <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="devqbreads" ${app.settings?.devQbReads !== false ? 'checked' : ''}> ${t('menu.qb_reads_in_games_the_read')}</label>
        <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="qbreads" ${app.settings?.qbReads ? 'checked' : ''}> ${t('menu.live_qb_read_ring_during_plays')}</label>` : ''}
        <button class="btn block" data-action="dexall">${t('menu.beast_dex_everything_revealed')}</button>
        <button class="btn block danger" data-action="dexreset">${t('menu.reset_my_beast_dex')}</button>
        <button class="btn block" data-action="go" data-screen="about">${t('menu.about_this_build')}</button>
        ${shortcutsEnabled() ? `<div class="panel tight" style="border-color:var(--warn)">${t('menu.b_test_build_shortcut_b')}<div class="muted">${t('menu.plays_whole_seasons_headlessly_in_the', { seasonCap: SEASON_CAP })}</div><div class="grid2" style="margin-top:6px"><button class="btn block" data-action="ff" data-n="1" ${app.f ? '' : 'disabled'}>${t('menu.finish_this_season')}</button><button class="btn block" data-action="ff" data-n="5" ${app.f ? '' : 'disabled'}>${t('menu.play_5_seasons')}</button></div></div>` : ''}</div>`;
    },
    mount(root) { delegate(root, {
        ff: async (el) => { if (!app.f || !shortcutsEnabled()) return; const n = Number(el.dataset.n) || 1; el.disabled = true; el.textContent = t('menu.playing'); await new Promise((r) => setTimeout(r, 30)); const r = n === 1 ? fastForwardSeason(app.f) : fastForwardSeasons(app.f, n - 1); const saved = await app.save({ immediate: true }); toast(r.ok ? `${t('menu.seasons_played', { played: r.played ?? 1, n: (r.played ?? 1) })}${r.stoppedBecause === 'cap' ? `${t('menu.season_complete_retirement_is_due', { seasonCap: SEASON_CAP })}` : r.stoppedBecause === 'fired' ? t('menu.the_board_let_you_go') : ''}${saved.ok ? '' : t('menu.not_saved')}` : `${t('menu.stopped', { reason: r.reason })}`, r.ok ? 'good' : 'bad', 6000); Router.render(); },
        'dev-legend': async (el) => { if (!(await confirmSheet(t('menu.add_this_legendary_to_your_roster'), { title: t('menu.developer_test'), okLabel: t('menu.add') }))) return; const r = F.devGrantLegendary(app.f, el.dataset.sp); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${t('menu.joined_legendary_play_discovered', { name: r.monster.name })}`, 'good'); },
        devqbreads: (el) => { if (app.f) { app.f.settings.devQbReads = el.checked; app.save(); } else app.defaultSettings.devQbReads = el.checked; },
        qbreads: (el) => { if (app.f) { app.f.settings.qbReads = el.checked; app.save(); } else app.defaultSettings.qbReads = el.checked; },
        'dev-ceremony': () => Router.go('ceremony', { preview: true }), go: (el) => Router.go(el.dataset.screen),
        reviewer: (el) => { const r = reviewQueue()[el.dataset.ns === 'clashability' ? 'clash' : 'football']; focusReviewer(r.ns, { status: el.dataset.status || 'outstanding', id: el.dataset.id || null }); Router.go(r.screen); }, // a review notification opens its own reviewer, on what is outstanding
        dexall: () => Router.go('dex', { all: true }), dexreset: async () => { if (await confirmSheet(t('menu.wipe_every_species_you_have_discovered'), { title: t('menu.reset_beast_dex'), okLabel: t('menu.reset'), danger: true })) { resetDex(); toast(t('menu.beast_dex_reset')); } } }); },
  });

  // ---------------------------------------------------------------- Achievements (GDD §21.4): the player's, across every franchise
  Router.registerScreen('achievements', {
    title: t('menu.achievements'), back: true,
    render() {
      const earned = achievementsData().earned; const got = ACHIEVEMENTS.filter((a) => earned[a.id]).length;
      const who = (sp) => sp === 'board' ? t('menu.a_letter_from_the_board') : sp === 'rival' ? t('menu.the_rival_gm') : t('menu.the_commissioner');
      const diff = (d) => ({ rookie: t('menu.rookie'), pro: t('menu.pro'), allstar: t('menu.all_star') })[d] || d;
      return `<div class="panel"><div class="row between">${t('menu.b_of_earned_b', { got, n: ACHIEVEMENTS.length })}<span class="dim">across every franchise</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.round(got / ACHIEVEMENTS.length * 100)}%"></i></div><p class="dim" style="margin:6px 0 0">${t('menu.each_one_arrives_in_your_franchise')}</p></div>
        <div class="stack">${ACHIEVEMENTS.map((a) => { const e = earned[a.id]; return e ? `<div class="panel ach-card earned"><div class="row between"><b>🏅 ${esc(e.scene?.title || a.title.replace(/\{\w+\}/g, t('menu.your_rival')))}</b><span class="dim">${yearOf(e.year)}</span></div><div class="muted">${esc(a.desc || '')}</div><div class="dim" style="font-size:12px;margin-top:2px">${t('menu.first_earned_with', { who: who(a.speaker), club: esc(e.club || ''), diff: esc(diff(e.difficulty)) })}${e.count > 1 ? ` ${t('menu.franchises', { count: e.count })}` : ''}</div>${e.scene ? `<button class="btn small" data-action="replay" data-id="${a.id}" style="margin-top:6px">${t('menu.replay_the_scene')}</button>` : ''}</div>`
          : `<div class="panel ach-card locked"><div class="row between"><b>🔒 ${esc(a.title.includes('{') ? t('menu.a_word_from_your_rival') : a.title)}</b><span class="dim">·</span></div><div class="muted">${esc(a.desc || '')}</div><div class="dim" style="font-size:12px;margin-top:2px">${who(a.speaker)}</div></div>`; }).join('')}</div>`;
    },
    mount(root) {
      delegate(root, { replay: (el) => { const e = achievementsData().earned[el.dataset.id]; const sc = e?.scene; if (!sc) return;
        const head = sc.speaker === 'board' ? '' : sc.speaker === 'rival' ? `<div class="row" style="gap:12px;align-items:flex-start;margin-bottom:10px">${portraitSprite(`gm|${sc.rivalTeam}`, 56, { hue: 280 })}<div><div class="talk-name">${esc(sc.rivalGm || t('menu.the_rival_gm_2'))}</div><div class="dim">GM, ${esc(sc.rivalTeam || '')}</div></div></div>` : `<div class="row" style="gap:12px;align-items:flex-start;margin-bottom:10px">${portraitSprite('commissioner', 56, { hue: 40 })}<div><div class="talk-name">${t('menu.the_commissioner_2')}</div><div class="dim">${t('menu.league_office')}</div></div></div>`;
        const body = sc.speaker === 'board' ? `<div class="board-letter">${sc.beats.map((b) => `<p>${esc(b)}</p>`).join('')}</div>` : `<div class="stack">${sc.beats.map((b) => `<div class="talk ${sc.speaker === 'rival' ? 'rival' : ''}" style="margin:0"><p class="talk-line">${esc(b)}</p></div>`).join('')}</div>`;
        sheet(`<div class="scene">${head}${body}</div>`, { title: `🏅 ${sc.title}` }); } });
    },
  });
  Router.registerScreen('hof', {
    title: t('menu.hall_of_fame'),
    mount(root) { root.addEventListener('click', (e) => { const b = e.target.closest('[data-hof]'); if (!b) return; const card = hallOfFame().find((c) => c.id === b.dataset.hof); if (!card) return; Router.go('career', { hof: card.id, i: Number(b.dataset.i) || 0 }); }); }, // the full-screen career (GDD §48): the card's snapshot, or the partial profile of an older card
    render() {
      const cards = hallOfFame();
      if (!cards.length) return `<div class="panel"><p>${t('menu.no_careers_enshrined_yet_hit_every')}</p></div>`;
      return `<div class="stack">${cards.map((c) => `<div class="panel hof-card"><div class="row">${portraitSprite(`${c.portrait}|${c.owner.split(' ')[0]}`, 48)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(c.owner)}</div><div class="muted">${t('menu.seasons', { club: esc(c.club), label: esc(DIFF[c.difficulty]?.label || c.difficulty), seasons: c.seasons, n: c.seasons })}</div></div><span class="chip accent">🏛️</span></div>
        <div class="kv" style="margin-top:8px">${t('menu.b_record_b')}<span class="mono">${c.record.w}-${c.record.l}</span>${t('menu.b_beast_bowls_b')}<span>${c.titles}</span>${t('menu.b_badges_b')}<span>${c.badges.length} / 8</span>${t('menu.b_league_awards_b')}<span>${c.awards}</span>${t('menu.b_families_discovered_b')}<span>${c.dexGroups ? `${c.dexGroups.all} / ${DEX_GROUPS.all.length} (original ${c.dexGroups.original} / ${DEX_GROUPS.original.length}, Basic ${c.dexGroups.basic} / ${DEX_GROUPS.basic.length})` : esc(String(c.dexSeen ?? '—'))}</span>${c.rival ? `${t('menu.b_rival_b')}<span>${esc(c.rival)} ${c.rivalRecord ? `(${c.rivalRecord.w}-${c.rivalRecord.l})` : ''}</span>` : ''}</div>
        ${c.bestMonsters?.length ? `<div class="muted" style="margin-top:8px;font-size:12px">${t('menu.best_monsters')}</div><div class="row" style="flex-wrap:wrap;gap:8px">${c.bestMonsters.map((m, i) => c.careers?.[i] ? `<button class="hof-mon" data-hof="${esc(c.id)}" data-i="${i}" aria-label="${esc($t('menu.open_his_career', { name: m.name }))}">${monsterSprite({ id: c.careers[i].id || m.name, name: m.name, species: m.species, stage: c.careers[i].stage || 0 }, 28)}<span style="font-size:13px">${esc(m.name)} <span class="dim">${m.position} ${m.ovr}</span>${c.careers[i].honours?.titles || c.careers[i].honours?.awards ? ' 🏆' : ''}</span><span class="tl-go">›</span></button>` : `<button class="hof-mon legacy" data-hof="${esc(c.id)}" data-i="${i}" aria-label="${esc($t('menu.partial_history', { name: m.name }))}">${monsterSprite({ id: m.name, name: m.name, species: m.species }, 28)}<span style="font-size:13px">${esc(m.name)} <span class="dim">${m.position} ${m.ovr}</span></span><span class="tl-go">›</span></button>`).join('')}</div><div class="dim" style="font-size:12px;margin-top:4px">${c.careers ? t('menu.tap_a_monster_for_his_career') : t('menu.tap_a_monster_for_what_this')}</div>` : ''}
        <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">${t('menu.season_by_season')}</summary>${(c.seasonsList || []).map((h) => `<div class="row between sub"><span>${yearOf(h.year)}</span><span class="mono">${h.w}-${h.l}${h.champion ? ' 🏆' : h.playoffs ? t('menu.playoffs') : ''}</span></div>`).join('')}</details>
        <div class="dim" style="margin-top:6px;font-size:12px">${t('menu.retired', { toLocaleDateString: new Date(c.retiredAt).toLocaleDateString() })}</div></div>`).join('')}</div>`;
    },
  });

  Router.registerScreen('about', {
    title: t('menu.about'),
    render() { return `<div class="panel"><p>${t('menu.b_gridiron_beast_v6_b_a')}</p><p class="muted">${t('menu.engine_playbook_coaching_ai_and_franchise')}</p><p class="muted">${t('menu.16_clubs_two_conferences_a_10')}</p></div>`; },
  });

  // ---------------------------------------------------------------- My office (GDD §18.6): the GM's own page
  Router.registerScreen('office', {
    title: t('menu.my_office'),
    render({ f }) {
      const b = f.board || { confidence: 0, goal: null, history: [] }; const g = b.goal; const p = g ? F.goalProgress(f) : null;
      const hof = F.hallOfFameProgress(f); const diff = DIFFICULTY[f.settings.difficulty] || DIFFICULTY.pro;
      const seasons = f.history.length; const wins = f.history.reduce((a, h) => a + h.record.w, 0) + F.record(f).w, losses = f.history.reduce((a, h) => a + h.record.l, 0) + F.record(f).l;
      const badges = Object.entries(f.campaign?.badges || {});
      const bg = BACKGROUNDS[f.owner.background];
      return `<div class="panel"><div class="row" style="gap:12px">${portraitSprite(f.owner.portrait, 72, { teamColor: TEAM_META[f.club]?.color })}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(f.owner.first)} ${esc(f.owner.last)}</div><div class="muted">${t('menu.general_manager', { club: esc(f.club), year: yearOf(f.season.year), label: esc(diff.label) })}</div>${bg ? `<div class="dim">${esc(bg.label)} · ${esc(bg.text)}</div>` : ''}<button class="btn small" data-action="editlook" style="margin-top:6px">${t('menu.edit_appearance')}</button></div></div></div>
        <div class="panel ${F.onHotSeat(f) ? 'hotseat' : ''}"><div class="row between">${t('menu.b_board_b')}<span class="chip ${F.onHotSeat(f) ? 'bad' : b.confidence > 0 ? 'good' : ''}">${F.confidenceLabel(b.confidence)} (${b.confidence >= 0 ? '+' : ''}${b.confidence})</span></div>
          ${g ? `<div style="margin-top:6px">${t('menu.this_season_b_b', { label: esc(g.label) })}${p ? ` · ${esc(p.text)}` : ''}</div><div class="bar" style="margin:6px 0 0"><i style="width:${Math.round((p?.pct || 0) * 100)}%"></i></div>` : `<div class="dim" style="margin-top:6px">${t('menu.no_goal_committed_yet')}</div>`}
          ${b.history.length ? `<div class="dim" style="margin-top:6px">${t('menu.past')} ${b.history.map((h) => `${yearOf(h.year)} ${h.met ? '✅' : '❌'} ${esc(h.label)}`).join(' · ')}</div>` : ''}</div>
        <div class="panel">${t('menu.b_career_b')}<div class="kv" style="margin-top:6px">${t('menu.b_seasons_b')}<span>${seasons + 1}</span>${t('menu.b_record_b')}<span>${wins}-${losses}</span>${t('menu.b_beast_bowls_b')}<span>${f.campaign?.titles || 0}</span>${t('menu.b_league_awards_b')}<span>${f.campaign?.awards || 0}</span>${t('menu.b_badges_b')}<span>${badges.length} / 8</span>${t('menu.b_career_wins_hof_b')}<span>${f.campaign?.wins || 0}</span></div>
          ${badges.length ? `<div class="row" style="flex-wrap:wrap;gap:4px;margin-top:6px">${badges.map(([club, x]) => `<span class="chip accent">${esc(GYM_BY_CLUB[club]?.badge || club)} · ${yearOf(x.year)}</span>`).join('')}</div>` : ''}</div>
        ${(() => { const list = F.achievementList(f); const got = list.filter((a) => a.earned); return `<div class="panel"><div class="row between">${t('menu.b_achievements_this_franchise_b')}<span class="dim">${got.length} of ${list.length}</span></div><div class="dim" style="margin-top:4px">${got.length ? got.map((a) => esc(a.title)).join(' · ') : t('menu.none_yet')}</div><div class="dim" style="margin-top:4px">${t('menu.every_achievement_what_it_takes_and')}</div></div>`; })()}
          <div class="panel">${t('menu.b_hall_of_fame_b')} <span class="dim">${esc(diff.hof)}</span><div class="hof" style="margin-top:6px">${hof.rows.map((r) => `<div class="row between ${r.done ? 'done' : ''}"><span>${r.done ? '✓' : '○'} ${r.key}</span><span class="mono">${r.have} / ${r.goal}</span></div>`).join('')}</div>${hof.eligible ? `<p class="muted">${t('menu.eligible_retire_from_hq_whenever_you')}</p>` : ''}</div>
        <div class="panel">${t('menu.b_franchises_b')}<div class="dim">${t('menu.selling_this_club_and_starting_another')}</div></div>`;
    },
    mount(root) { delegate(root, { editlook: () => { lookState = null; Router.go('coach-look'); } }); },
  });
  // ---------------------------------------------------------------- Coach appearance (coach creation expansion): edit any time
  // Saving replaces f.owner.portrait and nothing else: the record, the career, achievements and every other field are untouched.
  let lookState = null;
  Router.registerScreen('coach-look', {
    title: t('menu.coach_appearance'),
    render({ f }) {
      lookState ||= { look: parseCoach(f.owner.portrait) || lookFromLegacy(f.owner.portrait), tab: 'face' };
      return `${coachEditorHtml(lookState.look, { tab: lookState.tab, teamColor: TEAM_META[f.club]?.color, teamNote: `${t('menu.team_colors_are_the', { club: f.club })}` })}
        <div class="grid2" style="margin-top:12px"><button class="btn block" data-action="cancel">${t('menu.cancel')}</button><button class="btn primary block" data-action="savelook">${t('menu.save_appearance')}</button></div>`;
    },
    mount(root) { delegate(root, { ...coachEditorActions(lookState, () => Router.render()), cancel: () => { lookState = null; Router.back(); },
      savelook: () => { app.f.owner.portrait = specOf(lookState); lookState = null; app.save(); toast(t('menu.appearance_saved')); Router.back(); } }); },
  });
  Router.registerScreen('more', {
    title: t('menu.more_2'),
    render({ f }) {
      return `<div class="stack">
        <button class="btn block" data-action="go" data-screen="office">${t('menu.my_office_2')} <span class="dim">${esc(f.owner.first)} ${esc(f.owner.last)}</span></button>
        <button class="btn block" data-action="go" data-screen="dex">${t('menu.beast_dex_2')} <span class="dim mono">${dexCounts(f).all.seen}/${dexCounts(f).all.total}</span></button>
        <button class="btn block" data-action="statguide">${t('menu.what_the_stats_mean')}</button>
        <button class="btn block" data-action="typechart">${t('menu.type_chart')} <span class="dim">${t('menu.strengths_and_weaknesses')}</span></button>
        <button class="btn block" data-action="stadiums">${t('menu.stadiums')} <span class="dim">${t('menu.every_clubs_field')}</span></button>
        <button class="btn block" data-action="go" data-screen="settings">${t('menu.settings')}</button>
        ${devNoticesOn(app.settings) && reviewQueue().total ? `<button class="btn block badge-host" data-action="go" data-screen="developer">${t('menu.developer')}${devBadge(app.settings)}</button>` : ''}
        <button class="btn block" data-action="menu">${t('menu.main_menu')}</button></div>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen), menu: () => Router.go('menu', {}, { reset: true }), statguide: () => openStatGuide('QB'), typechart: () => openTypeChart(app.f?.roster?.[0]?.type || 'Fire'), stadiums: () => sheet(stadiumListHtml(app.f), { title: t('menu.stadiums_2') }) }); },
  });
}
