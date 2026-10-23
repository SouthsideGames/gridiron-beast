// Save data UI (GDD §43): the honest save status, the storage meter, backups and restore, export and import, the save-failure
// sheet and the recovery screen. Nothing here ever says "saved" before the store reports a committed write, and nothing ever
// replaces a save without the player choosing it.

import { esc, toast, confirmSheet, sheet } from './dom.js';
import { yearOf } from '../data/calendar.js';
import { cloudStatus } from '../franchise/cloud-save.js';
import { exportFranchise, exportFileName, validateImport } from '../franchise/store.js';
import { offerFile } from './file-offer.js';
import * as Save from '../franchise/save.js';

const KIND = { roll0: 'Previous save', roll1: 'Save before that', weekly: 'Weekly backup (after Sunday)', 'pre-restore': 'Kept before a restore (undo)', 'pre-cloud': 'Before the cloud copy replaced it', replaced: 'Franchise you replaced', deleted: 'Franchise that left your game (deleted, retired or let go)', 'legacy-original': 'Original save from v39.1 (before this update)', 'legacy-newer': 'Save written by an older copy of the game', quarantine: 'Damaged save (kept for diagnosis)', cloud: 'Your cloud save' };
export const kb = (n) => (n == null ? '—' : n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (t) => (t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'unknown time');
const timeOnly = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const where = (m) => (m ? `${m.club ? esc(m.club) : 'Franchise'}${m.year != null ? ` · ${esc(yearOf(m.year))}` : ''}${m.week != null ? ` · Week ${m.week}` : ''}` : 'Unknown franchise');

// ------------------------------------------------------------ status line
export function saveStatusText(app) {
  const st = app.storage; const s = st.store?.status();
  if (st.mode === 'legacy') return `<span class="chip warn">Fallback storage</span> <span class="dim">This browser would not open the game's database${st.error ? ` (${esc(st.error.message)})` : ''}; saving to browser local storage as in v39.1.</span>`;
  if (!s) return '<span class="dim">Starting…</span>';
  if (s.state === 'error') return `<span class="chip bad">⚠ Last save failed</span> <span class="dim">${esc(s.error?.message || '')}${s.lastOkAt ? ` · last saved ${timeOnly(s.lastOkAt)}` : ''}</span>`;
  if (s.state === 'saving' || s.state === 'pending') return `<span class="chip">Saving…</span>${s.lastOkAt ? ` <span class="dim">last saved ${timeOnly(s.lastOkAt)}</span>` : ''}`;
  if (s.lastOkAt) return `<span class="chip good">✓ Saved on this device</span> <span class="dim">${timeOnly(s.lastOkAt)}</span>`;
  return '<span class="dim">Not saved yet.</span>';
}

/** The cloud save's last problem in plain words (the franchise on this device is never affected). */
export function cloudErrorText(code) {
  if (code === 'deleted') return 'this franchise was deleted from your cloud save (here or on another device), so it is not backed up there; your progress on this device is safe';
  if (code === 'unidentified') return 'this franchise is too old to identify, so it is not backed up to the cloud; export it from here to keep a copy; your progress on this device is safe';
  if (code === 'quota_exceeded') return 'your cloud save is full, so the latest progress is not backed up there; your progress on this device is safe';
  return `last sync failed (${code})`;
}

// ------------------------------------------------------------ the Settings panel
export function savePanelHtml(app) {
  if (!app.f && !app.storage.store) return '';
  const c = cloudStatus();
  return `<div class="panel save-data" id="save-data"><h3>Save data</h3>
    <div class="save-status" id="save-status">${saveStatusText(app)}</div>
    <p class="muted">${c.state === 'on' ? `☁️ Cloud save on${c.at ? ` · last synced ${timeOnly(c.at)}` : ''}${c.error ? ` · <span class="bad-text">${esc(cloudErrorText(c.error))}</span>` : ''}` : 'Cloud save is available when playing inside Claude.'}</p>
    <div class="storage-meter" id="storage-meter"><span class="dim">Measuring storage…</span></div>
    <div class="stack">
      ${app.storage.store ? '<button class="btn block" data-action="backups">Restore a backup</button>' : (Save.loadBackup() ? '<button class="btn block" data-action="restore-legacy">Restore last week’s backup</button>' : '')}
      ${app.f ? '<button class="btn block" data-action="export">Export franchise (.gbfranchise)</button>' : ''}
      <label class="btn block" style="cursor:pointer">Import a franchise file<input type="file" accept=".gbfranchise,application/json,.json" data-change="import" class="sr-only"></label>
      ${app.f ? '<button class="btn danger block" data-action="reset">Delete franchise</button>' : ''}
    </div></div>`;
}

/** Fill the storage meter (async). */
export async function fillStorageMeter(root, app) {
  const el = root.querySelector('#storage-meter'); if (!el) return;
  try {
    if (!app.storage.store) { let n = 0; try { n = (localStorage.getItem(Save.SAVE_KEY)?.length || 0) + (localStorage.getItem(Save.BACKUP_KEY)?.length || 0); } catch { n = 0; } el.innerHTML = `<div class="kv"><b>Save and weekly backup</b><span class="mono">${kb(n)}</span></div><p class="dim">Browser local storage holds about 5 MB per site; long careers can outgrow it.</p>`; return; }
    const u = await app.storage.store.usage();
    const est = u.estimate; const pct = est?.quota ? est.usage / est.quota : null;
    const tight = est?.quota != null && (est.quota < 100 * 1048576 || pct > 0.8);
    el.innerHTML = `<div class="kv">
      <b>This franchise</b><span class="mono">${kb(u.save)}</span>
      <b>Backups (extra space)</b><span class="mono">${kb(u.backups)}</span>
      ${u.legacy ? `<b>Original v39.1 copy</b><span class="mono">${kb(u.legacy)}</span>` : ''}
      ${u.legacyLocalStorage ? `<b>v39.1 save, left in place</b><span class="mono">${kb(u.legacyLocalStorage)}</span>` : ''}
      ${est ? `<b>Browser estimate</b><span class="mono">${kb(est.usage)}${est.quota ? ` of ${kb(est.quota)}` : ''}</span>` : ''}
    </div>
    <p class="dim">${u.raw ? `Your franchise is ${kb(u.raw)} as plain data; it is stored compressed, with nothing removed. ` : ''}The browser estimate is approximate: it covers this whole site (including cached game files) and browsers may report a rounded or padded figure.</p>
    ${tight ? '<p class="warn-text">⚠ This browser is offering little storage. Export your franchise regularly and allow storage below.</p>' : ''}
    ${u.persisted === true ? '<p class="dim">✓ The browser has agreed to keep this data (it will not clear it to free space).</p>' : u.persisted === false && navigator.storage?.persist ? '<button class="btn block ghost" data-action="persist">Ask the browser to keep this data</button><p class="dim">Without this, a browser low on space may clear site data. It may say no; your saves keep working either way.</p>' : ''}`;
  } catch (e) { el.innerHTML = `<span class="dim">Storage figures unavailable (${esc(e.message)}).</span>`; }
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
  const what = check.ok ? `${kb(text.length)}, verified` : `${kb(text.length)}, did not pass its own check: ${check.problems[0]}`;
  if (r.how === 'browser') {
    if (check.ok) toast(`Export file prepared (${what}). Check that your browser saved it.`, 'good', 4500);
    else toast(`Export file prepared (${what}). Keep it: it holds your current progress. Check that your browser saved it.`, 'bad', 7000);
  } else if (r.ok) toast(`Export saved (${what}) as ${r.name}.`, check.ok ? 'good' : 'bad', 5000);
  else if (r.code === 'declined') toast('Export cancelled. No file was saved. Your progress is still saved on this device.', 'info', 5000);
  else if (r.code === 'rate_limited') toast('A save prompt is already open. Finish or close it, then try again.', 'info', 5000);
  else toast(`Files cannot be saved from this view (${r.code}). No file was saved. Your progress is still saved on this device.`, 'bad', 7000);
  return r;
}

// ------------------------------------------------------------ restore results
/** Why a restore did not happen, worded for the player. Nothing has changed in any of these cases. */
export function restoreFailText(r) {
  const m = String(r?.error?.message || 'unknown error').replace(/\.$/, '');
  if (r?.stage === 'read') return `That backup could not be read (${m}). Nothing was changed.`;
  if (r?.stage === 'copy') return `Your current franchise could not be backed up first (${m}), so nothing was restored. Nothing was changed.`;
  return `The restored franchise could not be saved (${m}). Your current franchise is unchanged and still saving.`;
}
async function runRestore(app, id, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Restoring…'; }
  let r; try { r = await app.restoreBackup(id); } catch (e) { r = { ok: false, error: { message: e.message } }; }
  if (!r.ok && btn) { btn.disabled = false; btn.textContent = 'Restore'; }
  if (!r.ok) toast(`Restore failed. ${restoreFailText(r)}`, 'bad', 6500);
  return r;
}

// ------------------------------------------------------------ backups sheet
function backupRowHtml(b, i) {
  return `<div class="backup-row ${b.ok ? '' : 'bad'}"><div class="grow"><b>${esc(KIND[b.kind] || b.kind)}</b><div class="muted">${where(b.meta)}</div><div class="dim">Saved ${esc(when(b.savedAt))}${b.ok ? '' : ` · ⚠ fails its integrity check`}</div></div>${b.ok && b.kind !== 'quarantine' ? `<button class="btn" data-action="pick" data-i="${i}">Restore</button>` : ''}</div>`;
}
export async function openBackups(app, { onRestored, intro = '' } = {}) {
  const { el, close } = sheet('<p class="dim">Checking backups…</p>', { title: 'Restore a backup' });
  let list = [];
  try { list = await app.storage.store.listBackups(); } catch (e) { el.querySelector('.sheet-body').innerHTML = `<p>Backups could not be read: ${esc(e.message)}</p>`; return; }
  const body = el.querySelector('.sheet-body');
  body.innerHTML = `${intro}<p class="muted">Every backup was checked just now. Restoring replaces the current franchise; the current one is kept as a backup first, so a restore can be undone.</p>
    ${list.length ? `<div class="stack">${list.map(backupRowHtml).join('')}</div>` : '<p>No backups yet. They appear after a few saves.</p>'}`;
  body.addEventListener('click', async (e) => {
    const b = list[Number(e.target.closest('[data-action="pick"]')?.dataset.i)]; if (!b) return;
    const cur = app.f; const lost = cur?.savedAt && b.savedAt && cur.savedAt > b.savedAt;
    const ok = await confirmSheet(`Restore "${KIND[b.kind] || b.kind}" (${where(b.meta).replace(/&amp;/g, '&')}, saved ${when(b.savedAt)})?${lost ? ` Progress made after ${when(b.savedAt)} will no longer be in your franchise (the current franchise is kept as a backup).` : ''}`, { title: 'Restore backup', okLabel: 'Restore' });
    if (!ok) return;
    const r = await runRestore(app, b.id, body.querySelector(`[data-action="pick"][data-i="${list.indexOf(b)}"]`));
    if (r.ok) { close(); toast('Backup restored and saved.', 'good'); onRestored?.(); }
  });
}

// ------------------------------------------------------------ import (validation and restore; the full import screen is Phase 2)
export async function importFile(app, file) {
  const text = await file.text(); const v = validateImport(text);
  if (!v.ok) { toast(`Import refused: ${v.problems[0]}`, 'bad', 5000); return false; }
  const ok = await confirmSheet(`Import ${where(v.meta).replace(/&amp;/g, '&')}?${app.f ? ' Your current franchise is kept as a backup on this device.' : ''}${v.warnings.length ? ` Note: ${v.warnings[0]}` : ''}`, { title: 'Import franchise', okLabel: 'Import' });
  if (!ok) return false;
  const r = await app.replaceFranchise(v.franchise, { copyKind: 'replaced' });
  if (!r.ok) { toast(`Import failed: ${r.error?.message || 'the franchise could not be saved'}. Nothing was changed.`, 'bad', 6000); return false; }
  toast('Franchise imported and saved.', 'good'); return true;
}

// ------------------------------------------------------------ save failure
let failSheet = null;
export function showSaveFailure(app, error) {
  if (failSheet) return;
  const quota = error?.code === 'quota';
  failSheet = sheet(`<p><b>Your latest progress is not saved yet.</b> ${esc(error?.message || 'The save did not complete.')}</p>
    <p class="muted">${error?.code === 'newer-elsewhere' ? 'Reloading loads the newest save; what happened in this tab since then can be exported first. ' : ''}Your franchise is still here in the game. ${quota ? 'Free some space on this device (or in the browser\'s site data), then retry. ' : ''}Retry the save, or export the franchise to a file to be safe. Closing the game now could lose what happened since the last save${app.storage.store?.status().lastOkAt ? ` (${timeOnly(app.storage.store.status().lastOkAt)})` : ''}.</p>
    <div class="stack"><button class="btn primary block" data-action="retry">Retry save</button><button class="btn block" data-action="exp">Export franchise</button><button class="btn ghost block" data-action="later">Keep playing</button></div>`, { title: 'Save failed', onClose: () => { failSheet = null; } });
  failSheet.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'retry') { const btn = e.target.closest('button'); btn.disabled = true; btn.textContent = 'Saving…'; const r = await app.save({ immediate: true }); if (r?.ok) { failSheet?.close(); toast('Saved.', 'good'); } else { btn.disabled = false; btn.textContent = 'Retry save'; toast(`Still failing: ${r?.error?.message || 'unknown error'}`, 'bad'); } }
    if (a === 'exp' && app.f) offerExport(app.f);
    if (a === 'later') failSheet?.close();
  });
}

// ------------------------------------------------------------ another tab changed the franchise
/** Shown when this tab returns to the front and another tab or window has changed (or deleted) the franchise meanwhile. */
export function showStaleTab(app, onClose) {
  const { el, close } = sheet(`<p><b>This franchise was changed in another tab or window of the game.</b></p>
    <p class="muted">This tab can no longer save without overwriting that progress, so it won't. Reload to continue from the newest save. If you played on in this tab and want to keep it, export it first.</p>
    <div class="stack"><button class="btn primary block" data-action="reload">Reload the game</button><button class="btn block" data-action="exp">Export this tab's franchise</button></div>`, { title: 'Changed in another tab', onClose });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'reload') { close(); location.reload(); }
    if (a === 'exp' && app.f) offerExport(app.f);
  });
}

// ------------------------------------------------------------ recovery
export function registerRecoveryScreen(Router, app) {
  Router.registerScreen('recovery', {
    title: 'Save recovery', back: false, tabs: false,
    render() {
      const r = app.recovery || {}; const good = (r.backups || []).filter((b) => b.ok && b.kind !== 'quarantine');
      return `<div class="panel"><h3>Your save could not be loaded</h3>
        <p>The game stopped instead of loading a save that failed its integrity check${r.error ? ` (${esc(r.error.message)})` : ''}. Nothing has been changed or deleted.</p>
        <p class="muted">Choose a backup to restore. Progress made after the backup was saved will not be in it. The damaged save is kept on this device either way.</p></div>
        ${good.length ? `<div class="stack">${(r.backups || []).map((b, i) => backupRowHtml(b, i)).join('')}</div>` : '<div class="panel"><p>No readable backup was found on this device.</p><p class="muted">If you play inside Claude, your cloud save will be offered here once it has been checked. You can also import an exported franchise file.</p></div>'}
        <div class="stack" style="margin-top:12px"><label class="btn block" style="cursor:pointer">Import a franchise file<input type="file" accept=".gbfranchise,application/json,.json" data-change="import" class="sr-only"></label>
        <button class="btn ghost block" data-action="leave">Go to the main menu without restoring</button></div>`;
    },
    mount(root) {
      root.addEventListener('click', async (e) => {
        const pick = e.target.closest('[data-action="pick"]'); const leave = e.target.closest('[data-action="leave"]');
        if (leave) { if (await confirmSheet('Go on without a franchise? The damaged save and all backups stay on this device; you can restore one later from Settings.', { title: 'Continue', okLabel: 'Continue' })) { app.recovery = null; Router.go('menu', {}, { reset: true }); } return; }
        if (!pick) return; const b = app.recovery.backups[Number(pick.dataset.i)];
        if (!(await confirmSheet(`Restore "${KIND[b.kind] || b.kind}" (${where(b.meta).replace(/&amp;/g, '&')}, saved ${when(b.savedAt)})? Anything after that time is not in this backup.`, { title: 'Restore backup', okLabel: 'Restore' }))) return;
        const r = await runRestore(app, b.id, pick); if (r.ok) { app.recovery = null; toast('Backup restored and saved.', 'good'); Router.go('menu', {}, { reset: true }); }
      });
      root.addEventListener('change', async (e) => { const inp = e.target.closest('[data-change="import"]'); if (!inp?.files?.[0]) return; try { if (await importFile(app, inp.files[0])) { app.recovery = null; Router.go('menu', {}, { reset: true }); } } catch (err) { toast(`Import failed: ${err.message}`, 'bad'); } inp.value = ''; });
    },
  });
}
