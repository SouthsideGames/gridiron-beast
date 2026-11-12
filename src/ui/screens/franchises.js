// The Franchises screen: the three save slots (GDD §42.5, Phase 2). Every card is read from storage, never from memory, so
// it shows what is really saved. Destructive actions are two-step sheets: deleting offers Export first and needs the club's
// name (or DELETE) typed; a plain tap never deletes. Importing previews the file, then asks for an empty slot; a file whose
// franchise already occupies a slot is offered Replace (the delete flow) or Import as a copy. Nothing is ever replaced silently.

import { esc, delegate, toast, confirmSheet, sheet } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { TIERS, divisionOf } from '../../data/league.js';
import { portraitSprite } from '../pixel-monster.js';
import { offerExport, importFile, kb, openBackups } from '../storage-ui.js';
import { validateImport, newUid } from '../../franchise/store.js';
import { SEASON_CAP } from '../../franchise/lifecycle.js';
import { SLOTS } from '../../franchise/slots.js';
import { cloudFranchises, cloudLoad, cloudStatus } from '../../franchise/cloud-save.js';
import * as Save from '../../franchise/save.js';
import { t as $t } from '../../text/index.js';

const when = (t) => (t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');
const STATUS = { active: [$t('franchises.active'), 'good'], retired: [$t('franchises.retired'), ''], fired: [$t('franchises.dismissed'), 'warn'], damaged: [$t('franchises.needs_recovery'), 'bad'], migrating: [$t('franchises.moving_to_the_new_storage'), 'warn'], empty: [$t('franchises.empty_slot'), ''] };
const tierLine = (meta) => { const t = TIERS.find((x) => x.id === meta?.tier); const div = meta?.club ? divisionOf(meta.club) : null; return [t?.name, div ? `${$t('franchises.division', { div })}` : null].filter(Boolean).join(' · ') || null; };
const recordText = (r) => (r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '—');

/** One slot card. `s` is a summary from the slot manager; `active` marks the slot being played. */
export function slotCardHtml(s, { active = false, undo = null } = {}) {
  const [label, chip] = STATUS[s.state] || STATUS.empty; const m = s.meta || {}; const lc = s.lifecycle || {}; const head = lc.legacyHeadline;
  const title = `<div class="row between">${$t('franchises.b_slot_b', { slot: s.slot })}<span class="chip ${chip}">${esc(label)}${active && s.state === 'active' ? $t('franchises.playing') : active && (s.state === 'retired' || s.state === 'fired') ? $t('franchises.open') : ''}</span></div>`;
  if (s.state === 'empty') {
    return `<div class="panel slot-card" data-slot="${s.slot}">${title}
      <p class="muted">${$t('franchises.empty_slot_2')}${undo ? ` ${$t('franchises.b_b_was_deleted_from_this', { club: esc(undo.club || $t('franchises.a_franchise')) })}` : ''}</p>
      <div class="stack">
        ${undo ? `<button class="btn primary block" data-action="undo">${$t('franchises.undo_delete')}</button>` : ''}
        <div class="grid2"><button class="btn primary block" data-action="new" data-slot="${s.slot}">${$t('franchises.new_franchise')}</button><label class="btn block" style="cursor:pointer">${$t('franchises.import_a_file')}<input type="file" accept=".gbfranchise,application/json,.json" data-change="import" data-slot="${s.slot}" class="sr-only"></label></div>
        ${s.backups ? `<button class="btn ghost block" data-action="backups" data-slot="${s.slot}">${$t('franchises.restore_a_backup_kept_in_this')}</button>` : ''}
      </div></div>`;
  }
  if (s.state === 'damaged' || s.state === 'migrating') {
    return `<div class="panel slot-card" data-slot="${s.slot}">${title}<p class="muted">${s.state === 'damaged' ? $t('franchises.the_save_in_this_slot_could') : $t('franchises.this_slots_save_is_still_moving')}</p>
      <div class="stack"><button class="btn primary block" data-action="open" data-slot="${s.slot}">${s.state === 'damaged' ? $t('franchises.open_recovery') : $t('franchises.open_2')}</button></div></div>`;
  }
  const archived = s.state === 'retired' || s.state === 'fired';
  const seasonLine = archived ? `${$t('franchises.after_seasons', { head: head?.reason === 'fired' ? $t('franchises.dismissed') : $t('franchises.retired'), seasons: head?.seasons ?? m.seasons ?? '?', n: (head?.seasons ?? m.seasons) })}` : `${$t('franchises.season_of', { seasons: (m.seasons ?? 0) + 1, seasonCap: SEASON_CAP, null: m.year != null ? yearOf(m.year) : '—' })}${m.week != null ? ` ${$t('franchises.week', { week: m.week })}` : ''}${m.finished ? $t('franchises.offseason') : ''}`;
  const tier = tierLine(m);
  return `<div class="panel slot-card" data-slot="${s.slot}">${title}
    <div class="row" style="margin-top:8px">${m.portrait != null ? `<span>${portraitSprite(`${m.portrait}|${(m.owner || '').split(' ')[0]}`, 44)}</span>` : ''}<div class="grow"><div><b>${esc(m.club || $t('franchises.franchise'))}</b>${m.owner ? ` · ${esc(m.owner)}` : ''}</div>
      <div class="muted">${esc(seasonLine)}</div>
      <div class="muted">${$t('franchises.record')} <span class="mono">${archived ? esc(head?.record || recordText(m.record)) : recordText(m.record)}</span>${m.titles ? ` ${$t('franchises.beast_bowls', { titles: m.titles, n: m.titles })}` : ''}${tier ? ` · ${esc(tier)}` : ''}</div>
      <div class="dim" style="font-size:12px">${$t('franchises.last_saved_stored', { when: esc(when(s.savedAt)), kb: kb(s.bytes) })}</div></div></div>
    <div class="stack" style="margin-top:10px">
      ${archived ? `<button class="btn primary block" data-action="legacy" data-slot="${s.slot}">${$t('franchises.view_franchise_legacy')}</button>` : active ? `<button class="btn primary block" data-action="continue">${$t('franchises.continue_franchise')}</button>` : `<button class="btn primary block" data-action="switch" data-slot="${s.slot}">${$t('franchises.play_this_franchise')}</button>`}
      <div class="grid2"><button class="btn block" data-action="export" data-slot="${s.slot}">${$t('franchises.export')}</button><button class="btn danger block" data-action="delete" data-slot="${s.slot}">${$t('franchises.delete')}</button></div>
    </div></div>`;
}

export function registerFranchisesScreens(Router, app) {
  let cache = null; // the summaries shown by the last render (re-read on every render)
  Router.registerScreen('franchises', {
    title: $t('franchises.franchises'), tabs: false,
    render() {
      return `<p class="muted">${$t('franchises.up_to_three_franchises_live_here')}</p>
        <div class="stack" id="slot-cards"><div class="panel"><span class="dim">${$t('franchises.reading_your_slots')}</span></div></div>
        <div id="cloud-offers"></div>
        <p class="dim" style="font-size:12px;margin-top:10px">${$t('franchises.a_franchise_plays_at_most_seasons', { seasonCap: SEASON_CAP })}</p>`;
    },
    async mount(root) {
      const paint = async () => { cache = await app.slotSummaries(); const undo = app.slots?.pendingUndo(); const host = root.querySelector('#slot-cards'); if (host) host.innerHTML = cache.map((s) => slotCardHtml(s, { active: s.slot === app.slot && !!app.f, undo: undo && undo.slot === s.slot && s.state === 'empty' ? undo : null })).join(''); };
      await paint();
      // Franchises in the cloud save that are in no slot here (a new or wiped device): offered into empty slots, never loaded silently.
      (async () => {
        if (cloudStatus().state !== 'on') return;
        const list = await cloudFranchises(); const held = new Set((cache || []).map((s) => s.uid).filter(Boolean)); const empty = app.slots?.emptySlots(cache || []) || [];
        const offers = list.filter((c) => c.uid && !held.has(c.uid));
        const host = root.querySelector('#cloud-offers'); if (!host || !offers.length) return;
        host.innerHTML = `<div class="panel" style="margin-top:10px">${$t('franchises.b_in_your_cloud_save_not')}<p class="muted">${empty.length ? $t('franchises.restore_one_into_an_empty_slot') : $t('franchises.free_a_slot_to_restore_one')}</p><div class="stack">${offers.map((c, i) => { const m = c.meta || {}; return `<div class="row between"><div><b>${esc(m.club || $t('franchises.franchise'))}</b>${m.owner ? ` · ${esc(m.owner)}` : ''}<div class="dim" style="font-size:12px">${m.status && m.status !== 'active' ? $t('franchises.archive', { status: m.status === 'fired' ? $t('franchises.dismissed') : $t('franchises.retired') }) + ' · ' : ''}${m.seasons != null ? `${$t('franchises.seasons', { seasons: m.seasons, n: m.seasons })} ` : ''}saved ${esc(when(c.savedAt))}</div></div>${empty.length ? `<button class="btn small" data-action="cloud" data-i="${i}" data-slot="${empty[0]}">${$t('franchises.restore_into_slot', { empty: empty[0] })}</button>` : ''}</div>`; }).join('')}</div></div>`;
        host.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-action="cloud"]'); if (!b) return; const c = offers[Number(b.dataset.i)]; const slot = Number(b.dataset.slot); if (!c) return;
          b.disabled = true; b.textContent = $t('franchises.restoring');
          const r0 = await app.switchSlot(slot); if (!r0.ok || app.f) { toast($t('franchises.that_slot_is_no_longer_empty'), 'bad'); b.disabled = false; b.textContent = $t('franchises.restore'); return; }
          const raw = await cloudLoad({ uid: c.uid, createdAt: c.createdAt }); const f = raw && Save.migrate(raw);
          if (!f) { toast($t('franchises.the_cloud_copy_could_not_be'), 'bad', 5000); b.disabled = false; b.textContent = $t('franchises.restore'); return; }
          const r = await app.replaceFranchise(f, { copyKind: 'replaced', mirror: false });
          if (!r.ok) { toast(`${$t('franchises.restore_failed_nothing_was_changed', { message: r.error?.message || 'unknown error' })}`, 'bad', 6000); b.disabled = false; b.textContent = $t('franchises.restore'); return; }
          toast(`${$t('franchises.restored_into_slot', { club: f.club, slot })}`, 'good'); Router.go(f.lifecycle?.legacy ? 'legacy' : 'hq', {}, { reset: true });
        });
      })();
      const franchiseOf = async (slot) => (slot === app.slot && app.f ? app.f : (await app.slots.store(slot).open()).franchise);
      delegate(root, {
        continue: () => Router.go(app.f && (app.f.lifecycle?.legacy) ? 'legacy' : 'hq', {}, { reset: true }),
        switch: async (el) => { const slot = Number(el.dataset.slot); const r = await app.switchSlot(slot); if (!r.ok) { toast(r.error?.message || $t('franchises.could_not_open_that_slot'), 'bad'); return; } if (r.mode !== 'recovery') Router.go(app.f?.lifecycle?.legacy ? 'legacy' : 'hq', {}, { reset: true }); },
        open: async (el) => { const r = await app.switchSlot(Number(el.dataset.slot)); if (r.ok && r.mode !== 'recovery') Router.go('hq', {}, { reset: true }); },
        legacy: async (el) => { const slot = Number(el.dataset.slot); if (slot !== app.slot) { const r = await app.switchSlot(slot); if (!r.ok) { toast(r.error?.message || $t('franchises.could_not_open_that_slot'), 'bad'); return; } } Router.go('legacy', {}, { reset: true }); },
        new: async (el) => { const r = await app.createIn(Number(el.dataset.slot)); if (!r.ok) toast(r.error?.message || $t('franchises.that_slot_is_not_empty'), 'bad'); },
        export: async (el) => { const f = await franchiseOf(Number(el.dataset.slot)); if (!f) { toast($t('franchises.nothing_to_export_in_that_slot'), 'bad'); return; } await offerExport(f); },
        delete: async (el) => { const slot = Number(el.dataset.slot); const f = await franchiseOf(slot); const s = cache?.find((x) => x.slot === slot); if (!f) { toast($t('franchises.nothing_to_delete_in_that_slot'), 'bad'); return; } await deleteFlow(app, { slot, f, bytes: s?.bytes || 0, onDone: async () => { await paint(); Router.render(); } }); },
        undo: async () => { const r = await app.undoDelete(); if (r.ok) { toast($t('franchises.franchise_restored'), 'good'); Router.go('hq', {}, { reset: true }); } else toast(`${$t('franchises.undo_failed', { message: r.error?.message || 'unknown error' })}`, 'bad', 6000); },
        backups: async (el) => { const slot = Number(el.dataset.slot); const r = await app.switchSlot(slot); if (!r.ok) return; await openBackups(app, { onRestored: () => Router.go('hq', {}, { reset: true }) }); },
      });
      root.addEventListener('change', async (e) => { const inp = e.target.closest('[data-change="import"]'); if (!inp?.files?.[0]) return; const file = inp.files[0]; inp.value = ''; await importFlow(app, Router, { file, preferredSlot: Number(inp.dataset.slot) || null, onDone: paint }); });
    },
  });
}

/**
 * Deleting (GDD §42.5): a sheet names the franchise and its size, offers Export first, then asks the owner to type the club's
 * name or DELETE and press Delete forever. The deleted copy stays as a backup of the slot; Undo is offered for this launch.
 */
export async function deleteFlow(app, { slot, f, bytes = 0, onDone = null }) {
  const name = f.club || $t('franchises.this_franchise'); const seasons = (f.history || []).length;
  const body = `<p>${$t('franchises.delete_b_b', { name: esc(name) })}${esc(`${f.owner?.first || ''} ${f.owner?.last || ''}`.trim())}${$t('franchises.seasons_stored_from_slot', { seasons, kb: kb(bytes), slot, n: seasons })}</p>
    <p class="muted">${$t('franchises.export_a_copy_first_so_you')}</p>
    <div class="stack"><button class="btn primary block" data-action="export">${$t('franchises.export_first')}</button><div class="dim" id="del-export" style="font-size:12px;min-height:1em"></div>
    <label class="muted">${$t('franchises.type_b_b_or_b_delete', { name: esc(name) })}<input id="del-confirm" class="input block" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(name)}"></label>
    <div class="row"><button class="btn" data-action="cancel">${$t('franchises.cancel')}</button><button class="btn danger" data-action="delete" disabled>${$t('franchises.delete_forever')}</button></div></div>`;
  return new Promise((resolve) => {
    const { el, close } = sheet(body, { title: $t('franchises.delete_franchise'), onClose: () => resolve(false) });
    const input = el.querySelector('#del-confirm'); const btn = el.querySelector('[data-action="delete"]');
    const matches = () => { const v = input.value.trim(); return v === 'DELETE' || (v.length > 0 && v.toLowerCase() === String(name).toLowerCase()); };
    input.addEventListener('input', () => { btn.disabled = !matches(); });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-action]')?.dataset.action; if (!a) return;
      if (a === 'cancel') { el.remove(); resolve(false); }
      if (a === 'export') { const r = await offerExport(f); const line = el.querySelector('#del-export'); if (line) line.textContent = r?.how === 'browser' ? $t('franchises.export_offered_to_your_browser_check') : r?.ok ? `${$t('franchises.saved_as', { name: r.name })}` : $t('franchises.no_file_was_saved'); }
      if (a === 'delete') {
        if (!matches()) return; btn.disabled = true; btn.textContent = $t('franchises.deleting');
        const r = await app.deleteSlot(slot);
        if (!r.ok) { btn.disabled = false; btn.textContent = $t('franchises.delete_forever_2'); toast(`${$t('franchises.nothing_was_deleted', { message: r.error?.message || 'unknown error' })}`, 'bad', 6000); return; }
        el.remove(); toast(`${$t('franchises.deleted_undo_is_on_the_franchises', { name })}`, 'info', 5000); await onDone?.(); resolve(true);
      }
    });
  });
}

/**
 * Importing (GDD §42.5): validate on a copy, preview, then choose an empty slot. A file whose franchise already occupies a
 * slot is offered Replace slot N (the delete flow) or Import as a copy (a new uid). Nothing is replaced silently.
 */
export async function importFlow(app, Router, { file, preferredSlot = null, onDone = null }) {
  let text; try { text = await file.text(); } catch (e) { toast(`${$t('franchises.the_file_could_not_be_read', { message: e.message })}`, 'bad', 5000); return false; }
  const v = validateImport(text);
  if (!v.ok) { toast(`${$t('franchises.import_refused', { problems: v.problems[0] })}`, 'bad', 6000); return false; }
  const f = v.franchise; const m = v.meta || {}; const { list, empty, same } = await app.slots.slotFor({ uid: f.uid });
  const status = f.lifecycle?.legacy ? (f.lifecycle.status === 'fired' ? $t('franchises.dismissed_archive') : $t('franchises.retired_archive')) : $t('franchises.active');
  const preview = `<div class="panel tight"><div><b>${esc(m.club || f.club || $t('franchises.franchise'))}</b>${m.owner ? ` · ${esc(m.owner)}` : ''}</div><div class="muted">${m.year != null ? yearOf(m.year) : ''}${m.week != null ? ` ${$t('franchises.week', { week: m.week })}` : ''} ${$t('franchises.in_the_file', { status: esc(status), kb: kb(text.length) })}</div><div class="dim mono" style="font-size:11px;overflow-wrap:anywhere">id ${esc(f.uid || 'none')}</div>${v.warnings?.length ? `<div class="warn-text">${esc(v.warnings[0])}</div>` : ''}</div>`;
  const slotButtons = (slots, label) => slots.map((n) => `<button class="btn block" data-action="into" data-slot="${n}">${$t('franchises.slot', { label, n })}</button>`).join('');
  const sameNote = same ? `<p class="warn-text">${$t('franchises.this_franchise_is_already_in_slot', { same })}</p>` : '';
  const body = `${preview}${sameNote}<div class="stack" style="margin-top:10px">
    ${same ? `<button class="btn danger block" data-action="replace" data-slot="${same}">${$t('franchises.replace_slot', { same })}</button><button class="btn block" data-action="copy">${$t('franchises.import_as_a_copy', { n: empty.length ? '' : $t('franchises.no_empty_slot') })}</button>` : ''}
    ${!same ? (empty.length ? `<p class="muted">${$t('franchises.choose_an_empty_slot')}</p>${slotButtons(empty, $t('franchises.import_into'))}` : `<p class="warn-text">${$t('franchises.all_three_slots_are_full_delete')}</p>`) : ''}
    <button class="btn ghost block" data-action="cancel">${$t('franchises.cancel')}</button></div>`;
  return new Promise((resolve) => {
    const { el } = sheet(body, { title: $t('franchises.import_franchise'), onClose: () => resolve(false) });
    let asCopy = false;
    const into = async (slot) => {
      const g = asCopy ? { ...f, uid: newUid() } : f;
      const r = await app.importInto(slot, g);
      if (!r.ok) { toast(`${$t('franchises.import_failed_nothing_was_changed', { message: r.error?.message || $t('franchises.the_franchise_could_not_be_saved') })}`, 'bad', 6000); return; }
      el.remove(); toast(`${$t('franchises.franchise_imported_into_slot_and_saved', { slot })}`, 'good'); await onDone?.(); Router.go(g.lifecycle?.legacy ? 'legacy' : 'hq', {}, { reset: true }); resolve(true);
    };
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-action]')?.dataset.action; if (!a) return;
      if (a === 'cancel') { el.remove(); resolve(false); }
      if (a === 'into') await into(Number(e.target.closest('[data-action]').dataset.slot));
      if (a === 'copy') { asCopy = true; if (!empty.length) { toast($t('franchises.no_empty_slot_delete_or_export'), 'bad', 5000); return; } const host = el.querySelector('.sheet-body'); host.innerHTML = `${preview}<p class="muted">${$t('franchises.import_as_a_separate_copy_into')}</p><div class="stack">${slotButtons(empty, $t('franchises.copy_into'))}<button class="btn ghost block" data-action="cancel">${$t('franchises.cancel')}</button></div>`; }
      if (a === 'replace') { const slot = Number(e.target.closest('[data-action]').dataset.slot); const cur = slot === app.slot && app.f ? app.f : (await app.slots.store(slot).open()).franchise; const s = list.find((x) => x.slot === slot); const done = await deleteFlow(app, { slot, f: cur, bytes: s?.bytes || 0 }); if (done) await into(slot); }
    });
  });
}
