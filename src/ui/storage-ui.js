// Save data UI (GDD §43): the honest save status, the storage meter, backups and restore, export and import, the save-failure
// sheet and the recovery screen. Nothing here ever says "saved" before the store reports a committed write, and nothing ever
// replaces a save without the player choosing it.

import { esc, toast, confirmSheet, sheet } from './dom.js';
import { yearOf } from '../data/calendar.js';
import { cloudStatus } from '../franchise/cloud-save.js';
import { exportFranchise, exportFileName, validateImport } from '../franchise/store.js';
import { offerFile } from './file-offer.js';
import * as Save from '../franchise/save.js';
import { t as $t } from '../text/index.js';

const KIND = { roll0: $t('franchises.previous_save'), roll1: $t('franchises.save_before_that'), weekly: $t('franchises.weekly_backup_after_sunday'), 'pre-restore': $t('franchises.kept_before_a_restore_undo'), 'pre-cloud': $t('franchises.before_the_cloud_copy_replaced_it'), replaced: $t('franchises.franchise_you_replaced'), deleted: $t('franchises.franchise_that_left_your_game_deleted'), 'legacy-original': $t('franchises.original_save_from_v39_1_before'), 'pre-league': $t('franchises.save_before_persistent_ai_rosters_v40'), 'legacy-newer': $t('franchises.save_written_by_an_older_copy'), quarantine: $t('franchises.damaged_save_kept_for_diagnosis'), cloud: $t('franchises.your_cloud_save') };
export const kb = (n) => (n == null ? '—' : n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (t) => (t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'unknown time');
const timeOnly = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const where = (m) => (m ? `${m.club ? esc(m.club) : $t('franchises.franchise')}${m.year != null ? ` · ${esc(yearOf(m.year))}` : ''}${m.week != null ? ` ${$t('franchises.week', { week: m.week })}` : ''}` : $t('franchises.unknown_franchise'));

// ------------------------------------------------------------ status line
export function saveStatusText(app) {
  const st = app.storage; const s = st.store?.status();
  if (st.mode === 'legacy') return `<span class="chip warn">${$t('franchises.fallback_storage')}</span> <span class="dim">${$t('franchises.this_browser_would_not_open_the')}${st.error ? ` (${esc(st.error.message)})` : ''}${$t('franchises.saving_to_browser_local_storage_as')}</span>`;
  if (!s) return `<span class="dim">${$t('franchises.starting')}</span>`;
  if (s.state === 'error') return `<span class="chip bad">${$t('franchises.last_save_failed')}</span> <span class="dim">${esc(s.error?.message || '')}${s.lastOkAt ? ` ${$t('franchises.last_saved', { timeOnly: timeOnly(s.lastOkAt) })}` : ''}</span>`;
  if (s.state === 'saving' || s.state === 'pending') return `<span class="chip">${$t('franchises.saving')}</span>${s.lastOkAt ? ` <span class="dim">last saved ${timeOnly(s.lastOkAt)}</span>` : ''}`;
  if (s.lastOkAt) return `<span class="chip good">${$t('franchises.saved_on_this_device')}</span> <span class="dim">${timeOnly(s.lastOkAt)}</span>`;
  return `<span class="dim">${$t('franchises.not_saved_yet')}</span>`;
}

/** The cloud save's last problem in plain words (the franchise on this device is never affected). */
export function cloudErrorText(code) {
  if (code === 'deleted') return $t('franchises.this_franchise_was_deleted_from_your');
  if (code === 'unidentified') return $t('franchises.this_franchise_is_too_old_to');
  if (code === 'quota_exceeded') return $t('franchises.your_cloud_save_is_full_so');
  return `${$t('franchises.last_sync_failed', { code })}`;
}

// ------------------------------------------------------------ the Settings panel
export function savePanelHtml(app) {
  if (!app.f && !app.storage.store) return '';
  const c = cloudStatus();
  return `<div class="panel save-data" id="save-data"><h3>${$t('franchises.save_data')}</h3>
    <div class="save-status" id="save-status">${saveStatusText(app)}</div>
    <p class="muted">${c.state === 'on' ? `${$t('franchises.cloud_save_on')}${c.at ? ` ${$t('franchises.last_synced', { timeOnly: timeOnly(c.at) })}` : ''}${c.error ? ` · <span class="bad-text">${esc(cloudErrorText(c.error))}</span>` : ''}` : $t('franchises.cloud_save_is_available_when_playing')}</p>
    <div class="storage-meter" id="storage-meter"><span class="dim">${$t('franchises.measuring_storage')}</span></div>
    <div class="stack">
      ${app.storage.store ? `<button class="btn block" data-action="backups">${$t('franchises.restore_a_backup')}</button>` : (Save.loadBackup() ? `<button class="btn block" data-action="restore-legacy">${$t('franchises.restore_last_weeks_backup')}</button>` : '')}
      ${app.f ? `<button class="btn block" data-action="export">${$t('franchises.export_franchise_gbfranchise')}</button>` : ''}
      <label class="btn block" style="cursor:pointer">${$t('franchises.import_a_franchise_file')}<input type="file" accept=".gbfranchise,application/json,.json" data-change="import" class="sr-only"></label>
      ${app.f ? `<button class="btn danger block" data-action="reset">${$t('franchises.delete_franchise')}</button>` : ''}
    </div></div>`;
}

/** Fill the storage meter (async). */
export async function fillStorageMeter(root, app) {
  const el = root.querySelector('#storage-meter'); if (!el) return;
  try {
    if (!app.storage.store) { let n = 0; try { n = (localStorage.getItem(Save.SAVE_KEY)?.length || 0) + (localStorage.getItem(Save.BACKUP_KEY)?.length || 0); } catch { n = 0; } el.innerHTML = `<div class="kv">${$t('franchises.b_save_and_weekly_backup_b')}<span class="mono">${kb(n)}</span></div><p class="dim">${$t('franchises.browser_local_storage_holds_about_5')}</p>`; return; }
    const u = await app.storage.store.usage();
    const est = u.estimate; const pct = est?.quota ? est.usage / est.quota : null;
    const tight = est?.quota != null && (est.quota < 100 * 1048576 || pct > 0.8);
    el.innerHTML = `<div class="kv">
      ${$t('franchises.b_this_franchise_b')}<span class="mono">${kb(u.save)}</span>
      ${$t('franchises.b_backups_extra_space_b')}<span class="mono">${kb(u.backups)}</span>
      ${u.legacy ? `${$t('franchises.b_original_v39_1_copy_b')}<span class="mono">${kb(u.legacy)}</span>` : ''}
      ${u.legacyLocalStorage ? `${$t('franchises.b_v39_1_save_left_in')}<span class="mono">${kb(u.legacyLocalStorage)}</span>` : ''}
      ${est ? `${$t('franchises.b_browser_estimate_b')}<span class="mono">${kb(est.usage)}${est.quota ? ` of ${kb(est.quota)}` : ''}</span>` : ''}
    </div>
    <p class="dim">${u.raw ? `${$t('franchises.your_franchise_is_as_plain_data', { kb: kb(u.raw) })} ` : ''}${$t('franchises.the_browser_estimate_is_approximate_it')}</p>
    ${tight ? `<p class="warn-text">${$t('franchises.this_browser_is_offering_little_storage')}</p>` : ''}
    ${u.persisted === true ? `<p class="dim">${$t('franchises.the_browser_has_agreed_to_keep')}</p>` : u.persisted === false && navigator.storage?.persist ? `<button class="btn block ghost" data-action="persist">${$t('franchises.ask_the_browser_to_keep_this')}</button><p class="dim">${$t('franchises.without_this_a_browser_low_on')}</p>` : ''}`;
  } catch (e) { el.innerHTML = `<span class="dim">${$t('franchises.storage_figures_unavailable', { message: esc(e.message) })}</span>`; }
}

// ------------------------------------------------------------ export
/**
 * Offer the export file. Inside claude.ai it goes through the platform (the player confirms; the message says whether it was
 * saved); in a browser, the browser decides whether and where it is kept, so the message never says the download finished.
 */
export async function offerExport(f) {
  const text = exportFranchise(f);
  const check = validateImport(text); // the file is verified before it is offered
  // It is offered even when the check finds a problem: this may be the player's only copy of their current progress (a save
  // that keeps failing). The file name and the message say it did not pass its check.
  const name = check.ok ? exportFileName(f) : exportFileName(f).replace(/\.gbfranchise$/, '-unverified.gbfranchise');
  const r = await offerFile({ name, text });
  const what = check.ok ? `${$t('franchises.verified', { kb: kb(text.length) })}` : `${$t('franchises.did_not_pass_its_own_check', { kb: kb(text.length), problems: check.problems[0] })}`;
  if (r.how === 'browser') {
    if (check.ok) toast(`${$t('franchises.export_file_prepared_check_that_your', { what })}`, 'good', 4500);
    else toast(`${$t('franchises.export_file_prepared_keep_it_it', { what })}`, 'bad', 7000);
  } else if (r.ok) toast(`${$t('franchises.export_saved_as', { what, name: r.name })}`, check.ok ? 'good' : 'bad', 5000);
  else if (r.code === 'declined') toast($t('franchises.export_canceled_no_file_was_saved'), 'info', 5000);
  else if (r.code === 'rate_limited') toast($t('franchises.a_save_prompt_is_already_open'), 'info', 5000);
  else toast(`${$t('franchises.files_cannot_be_saved_from_this', { code: r.code })}`, 'bad', 7000);
  return r;
}

// ------------------------------------------------------------ restore results
/** Why a restore did not happen, worded for the player. Nothing has changed in any of these cases. */
export function restoreFailText(r) {
  const m = String(r?.error?.message || 'unknown error').replace(/\.$/, '');
  if (r?.stage === 'read') return `${$t('franchises.that_backup_could_not_be_read', { m })}`;
  if (r?.stage === 'copy') return `${$t('franchises.your_current_franchise_could_not_be', { m })}`;
  return `${$t('franchises.the_restored_franchise_could_not_be', { m })}`;
}
async function runRestore(app, id, btn) {
  if (btn) { btn.disabled = true; btn.textContent = $t('franchises.restoring'); }
  let r; try { r = await app.restoreBackup(id); } catch (e) { r = { ok: false, error: { message: e.message } }; }
  if (!r.ok && btn) { btn.disabled = false; btn.textContent = $t('franchises.restore'); }
  if (!r.ok) toast(`${$t('franchises.restore_failed', { restoreFail: restoreFailText(r) })}`, 'bad', 6500);
  return r;
}

// ------------------------------------------------------------ backups sheet
function backupRowHtml(b, i) {
  return `<div class="backup-row ${b.ok ? '' : 'bad'}"><div class="grow"><b>${esc(KIND[b.kind] || b.kind)}</b><div class="muted">${where(b.meta)}</div><div class="dim">${$t('franchises.saved', { when: esc(when(b.savedAt)) })}${b.ok ? '' : ` ${$t('franchises.fails_its_integrity_check')}`}</div></div>${b.ok && b.kind !== 'quarantine' ? `<button class="btn" data-action="pick" data-i="${i}">${$t('franchises.restore')}</button>` : ''}</div>`;
}
export async function openBackups(app, { onRestored, intro = '' } = {}) {
  const { el, close } = sheet(`<p class="dim">${$t('franchises.checking_backups')}</p>`, { title: $t('franchises.restore_a_backup') });
  let list = [];
  try { list = await app.storage.store.listBackups(); } catch (e) { el.querySelector('.sheet-body').innerHTML = `<p>${$t('franchises.backups_could_not_be_read', { message: esc(e.message) })}</p>`; return; }
  const body = el.querySelector('.sheet-body');
  body.innerHTML = `${intro}<p class="muted">${$t('franchises.every_backup_was_checked_just_now')}</p>
    ${list.length ? `<div class="stack">${list.map(backupRowHtml).join('')}</div>` : `<p>${$t('franchises.no_backups_yet_they_appear_after')}</p>`}`;
  body.addEventListener('click', async (e) => {
    const b = list[Number(e.target.closest('[data-action="pick"]')?.dataset.i)]; if (!b) return;
    const cur = app.f; const lost = cur?.savedAt && b.savedAt && cur.savedAt > b.savedAt;
    const ok = await confirmSheet(`${$t('franchises.restore_saved', { kind: KIND[b.kind] || b.kind, amp: where(b.meta).replace(/&amp;/g, '&'), when: when(b.savedAt) })}${lost ? ` ${$t('franchises.progress_made_after_will_no_longer', { when: when(b.savedAt) })}` : ''}`, { title: $t('franchises.restore_backup'), okLabel: $t('franchises.restore') });
    if (!ok) return;
    const r = await runRestore(app, b.id, body.querySelector(`[data-action="pick"][data-i="${list.indexOf(b)}"]`));
    if (r.ok) { close(); toast($t('franchises.backup_restored_and_saved'), 'good'); onRestored?.(); }
  });
}

// ------------------------------------------------------------ import (validation and restore; the full import screen is Phase 2)
export async function importFile(app, file) {
  const text = await file.text(); const v = validateImport(text);
  if (!v.ok) { toast(`${$t('franchises.import_refused', { problems: v.problems[0] })}`, 'bad', 5000); return false; }
  const ok = await confirmSheet(`${$t('franchises.import', { amp: where(v.meta).replace(/&amp;/g, '&'), f: app.f ? $t('franchises.your_current_franchise_is_kept_as') : '' })}${v.warnings.length ? ` ${$t('franchises.note', { warnings: v.warnings[0] })}` : ''}`, { title: $t('franchises.import_franchise'), okLabel: $t('franchises.import_2') });
  if (!ok) return false;
  const r = await app.replaceFranchise(v.franchise, { copyKind: 'replaced' });
  if (!r.ok) { toast(`${$t('franchises.import_failed_nothing_was_changed', { message: r.error?.message || $t('franchises.the_franchise_could_not_be_saved') })}`, 'bad', 6000); return false; }
  toast($t('franchises.franchise_imported_and_saved'), 'good'); return true;
}

// ------------------------------------------------------------ save failure
let failSheet = null;
export function showSaveFailure(app, error) {
  if (failSheet) return;
  const quota = error?.code === 'quota';
  failSheet = sheet(`<p>${$t('franchises.b_your_latest_progress_is_not', { message: esc(error?.message || $t('franchises.the_save_did_not_complete')) })}</p>
    <p class="muted">${$t('franchises.your_franchise_is_still_here_in', { error: error?.code === 'newer-elsewhere' ? $t('franchises.reloading_loads_the_newest_save_what') : '', quota: quota ? $t('franchises.free_some_space_on_this_device') : '' })}${app.storage.store?.status().lastOkAt ? ` (${timeOnly(app.storage.store.status().lastOkAt)})` : ''}.</p>
    <div class="stack"><button class="btn primary block" data-action="retry">${$t('franchises.retry_save')}</button><button class="btn block" data-action="exp">${$t('franchises.export_franchise')}</button><button class="btn ghost block" data-action="later">${$t('franchises.keep_playing')}</button></div>`, { title: $t('franchises.save_failed'), onClose: () => { failSheet = null; } });
  failSheet.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'retry') { const btn = e.target.closest('button'); btn.disabled = true; btn.textContent = $t('franchises.saving'); const r = await app.save({ immediate: true }); if (r?.ok) { failSheet?.close(); toast('Saved.', 'good'); } else { btn.disabled = false; btn.textContent = $t('franchises.retry_save_2'); toast(`${$t('franchises.still_failing', { message: r?.error?.message || 'unknown error' })}`, 'bad'); } }
    if (a === 'exp' && app.f) offerExport(app.f);
    if (a === 'later') failSheet?.close();
  });
}

// ------------------------------------------------------------ another tab changed the franchise
/** Shown when this tab returns to the front and another tab or window has changed (or deleted) the franchise meanwhile. */
export function showStaleTab(app, onClose) {
  const { el, close } = sheet(`<p>${$t('franchises.b_this_franchise_was_changed_in')}</p>
    <p class="muted">${$t('franchises.this_tab_can_no_longer_save')}</p>
    <div class="stack"><button class="btn primary block" data-action="reload">${$t('franchises.reload_the_game')}</button><button class="btn block" data-action="exp">${$t('franchises.export_this_tabs_franchise')}</button></div>`, { title: $t('franchises.changed_in_another_tab'), onClose });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'reload') { close(); location.reload(); }
    if (a === 'exp' && app.f) offerExport(app.f);
  });
}

// ------------------------------------------------------------ recovery
export function registerRecoveryScreen(Router, app) {
  Router.registerScreen('recovery', {
    title: $t('franchises.save_recovery'), back: false, tabs: false,
    render() {
      const r = app.recovery || {}; const good = (r.backups || []).filter((b) => b.ok && b.kind !== 'quarantine');
      // Task 8 fresh-save break (spec §15): a save from an earlier version is identified and refused, with Start New Franchise.
      if (r.error?.code === 'incompatible') return `<div class="panel"><h3>${$t('franchises.this_save_is_from_an_earlier')}</h3>
        <p>${esc(r.error.message)}</p>
        <p class="muted">${$t('franchises.nothing_has_been_changed_or_deleted')}</p></div>
        <div class="stack" style="margin-top:12px"><button class="btn primary block" data-action="start-new">${$t('franchises.start_new_franchise')}</button>
        <button class="btn ghost block" data-action="leave">${$t('franchises.go_to_the_main_menu')}</button></div>`;
      return `<div class="panel"><h3>${$t('franchises.your_save_could_not_be_loaded')}</h3>
        <p>${$t('franchises.the_game_stopped_instead_of_loading')}${r.error ? ` (${esc(r.error.message)})` : ''}${$t('franchises.nothing_has_been_changed_or_deleted_2')}</p>
        <p class="muted">${$t('franchises.choose_a_backup_to_restore_progress')}</p></div>
        ${good.length ? `<div class="stack">${(r.backups || []).map((b, i) => backupRowHtml(b, i)).join('')}</div>` : `<div class="panel"><p>${$t('franchises.no_readable_backup_was_found_on')}</p><p class="muted">${$t('franchises.if_you_play_inside_claude_your')}</p></div>`}
        <div class="stack" style="margin-top:12px"><label class="btn block" style="cursor:pointer">${$t('franchises.import_a_franchise_file')}<input type="file" accept=".gbfranchise,application/json,.json" data-change="import" class="sr-only"></label>
        <button class="btn ghost block" data-action="leave">${$t('franchises.go_to_the_main_menu_without')}</button></div>`;
    },
    mount(root) {
      root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-action="start-new"]')) { app.recovery = null; if (app.slots && app.storage?.store) { Router.go('franchises', {}, { reset: true }); toast($t('franchises.choose_a_slot_for_the_new'), 'info', 5000); } else Router.go('onboarding', { fresh: true }, { reset: true }); return; }
        const pick = e.target.closest('[data-action="pick"]'); const leave = e.target.closest('[data-action="leave"]');
        if (leave) { if (await confirmSheet($t('franchises.go_on_without_a_franchise_the'), { title: $t('franchises.continue'), okLabel: $t('franchises.continue') })) { app.recovery = null; Router.go('menu', {}, { reset: true }); } return; }
        if (!pick) return; const b = app.recovery.backups[Number(pick.dataset.i)];
        if (!(await confirmSheet(`${$t('franchises.restore_saved_anything_after_that_time', { kind: KIND[b.kind] || b.kind, amp: where(b.meta).replace(/&amp;/g, '&'), when: when(b.savedAt) })}`, { title: $t('franchises.restore_backup'), okLabel: $t('franchises.restore') }))) return;
        const r = await runRestore(app, b.id, pick); if (r.ok) { app.recovery = null; toast($t('franchises.backup_restored_and_saved'), 'good'); Router.go('menu', {}, { reset: true }); }
      });
      root.addEventListener('change', async (e) => { const inp = e.target.closest('[data-change="import"]'); if (!inp?.files?.[0]) return; try { if (await importFile(app, inp.files[0])) { app.recovery = null; Router.go('menu', {}, { reset: true }); } } catch (err) { toast(`${$t('franchises.import_failed', { message: err.message })}`, 'bad'); } inp.value = ''; });
    },
  });
}
