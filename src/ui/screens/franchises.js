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

const when = (t) => (t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');
const STATUS = { active: ['Active', 'good'], retired: ['Retired', ''], fired: ['Dismissed', 'warn'], damaged: ['Needs recovery', 'bad'], migrating: ['Moving to the new storage', 'warn'], empty: ['Empty slot', ''] };
const tierLine = (meta) => { const t = TIERS.find((x) => x.id === meta?.tier); const div = meta?.club ? divisionOf(meta.club) : null; return [t?.name, div ? `${div} Division` : null].filter(Boolean).join(' · ') || null; };
const recordText = (r) => (r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '—');

/** One slot card. `s` is a summary from the slot manager; `active` marks the slot being played. */
export function slotCardHtml(s, { active = false, undo = null } = {}) {
  const [label, chip] = STATUS[s.state] || STATUS.empty; const m = s.meta || {}; const lc = s.lifecycle || {}; const head = lc.legacyHeadline;
  const title = `<div class="row between"><b>Slot ${s.slot}</b><span class="chip ${chip}">${esc(label)}${active && s.state === 'active' ? ' · playing' : active && (s.state === 'retired' || s.state === 'fired') ? ' · open' : ''}</span></div>`;
  if (s.state === 'empty') {
    return `<div class="panel slot-card" data-slot="${s.slot}">${title}
      <p class="muted">Empty slot.${undo ? ` <b>${esc(undo.club || 'A franchise')}</b> was deleted from this slot a moment ago.` : ''}</p>
      <div class="stack">
        ${undo ? '<button class="btn primary block" data-action="undo">↩ Undo delete</button>' : ''}
        <div class="grid2"><button class="btn primary block" data-action="new" data-slot="${s.slot}">🏆 New franchise</button><label class="btn block" style="cursor:pointer">Import a file<input type="file" accept=".gbfranchise,application/json,.json" data-change="import" data-slot="${s.slot}" class="sr-only"></label></div>
        ${s.backups ? `<button class="btn ghost block" data-action="backups" data-slot="${s.slot}">Restore a backup kept in this slot</button>` : ''}
      </div></div>`;
  }
  if (s.state === 'damaged' || s.state === 'migrating') {
    return `<div class="panel slot-card" data-slot="${s.slot}">${title}<p class="muted">${s.state === 'damaged' ? 'The save in this slot could not be read. Nothing has been changed or deleted; its backups are kept.' : 'This slot\'s save is still moving to the new storage. Open it to finish.'}</p>
      <div class="stack"><button class="btn primary block" data-action="open" data-slot="${s.slot}">${s.state === 'damaged' ? 'Open recovery' : 'Open'}</button></div></div>`;
  }
  const archived = s.state === 'retired' || s.state === 'fired';
  const seasonLine = archived ? `${head?.reason === 'fired' ? 'Dismissed' : 'Retired'} after ${head?.seasons ?? m.seasons ?? '?'} season${(head?.seasons ?? m.seasons) === 1 ? '' : 's'}` : `Season ${(m.seasons ?? 0) + 1} of ${SEASON_CAP} · ${m.year != null ? yearOf(m.year) : '—'}${m.week != null ? ` · Week ${m.week}` : ''}${m.finished ? ' · offseason' : ''}`;
  const tier = tierLine(m);
  return `<div class="panel slot-card" data-slot="${s.slot}">${title}
    <div class="row" style="margin-top:8px">${m.portrait != null ? `<span>${portraitSprite(`${m.portrait}|${(m.owner || '').split(' ')[0]}`, 44)}</span>` : ''}<div class="grow"><div><b>${esc(m.club || 'Franchise')}</b>${m.owner ? ` · ${esc(m.owner)}` : ''}</div>
      <div class="muted">${esc(seasonLine)}</div>
      <div class="muted">Record <span class="mono">${archived ? esc(head?.record || recordText(m.record)) : recordText(m.record)}</span>${m.titles ? ` · 🏆 ${m.titles} Beast Bowl${m.titles === 1 ? '' : 's'}` : ''}${tier ? ` · ${esc(tier)}` : ''}</div>
      <div class="dim" style="font-size:12px">Last saved ${esc(when(s.savedAt))} · ${kb(s.bytes)} stored</div></div></div>
    <div class="stack" style="margin-top:10px">
      ${archived ? `<button class="btn primary block" data-action="legacy" data-slot="${s.slot}">🏛️ View Franchise Legacy</button>` : active ? '<button class="btn primary block" data-action="continue">▶ Continue Franchise</button>' : `<button class="btn primary block" data-action="switch" data-slot="${s.slot}">▶ Play this franchise</button>`}
      <div class="grid2"><button class="btn block" data-action="export" data-slot="${s.slot}">Export</button><button class="btn danger block" data-action="delete" data-slot="${s.slot}">Delete</button></div>
    </div></div>`;
}

export function registerFranchisesScreens(Router, app) {
  let cache = null; // the summaries shown by the last render (re-read on every render)
  Router.registerScreen('franchises', {
    title: 'Franchises', tabs: false,
    render() {
      return `<p class="muted">Up to three franchises live here, each in its own slot with its own saves and backups. Retired and dismissed franchises keep their slot as a read-only Franchise Legacy until you delete them (export first).</p>
        <div class="stack" id="slot-cards"><div class="panel"><span class="dim">Reading your slots…</span></div></div>
        <div id="cloud-offers"></div>
        <p class="dim" style="font-size:12px;margin-top:10px">A franchise plays at most ${SEASON_CAP} seasons. Deleting always offers an export first and asks you to type the club's name.</p>`;
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
        host.innerHTML = `<div class="panel" style="margin-top:10px"><b>☁️ In your cloud save, not on this device</b><p class="muted">${empty.length ? 'Restore one into an empty slot.' : 'Free a slot to restore one here.'}</p><div class="stack">${offers.map((c, i) => { const m = c.meta || {}; return `<div class="row between"><div><b>${esc(m.club || 'Franchise')}</b>${m.owner ? ` · ${esc(m.owner)}` : ''}<div class="dim" style="font-size:12px">${m.status && m.status !== 'active' ? (m.status === 'fired' ? 'Dismissed' : 'Retired') + ' archive · ' : ''}${m.seasons != null ? `${m.seasons} season${m.seasons === 1 ? '' : 's'} · ` : ''}saved ${esc(when(c.savedAt))}</div></div>${empty.length ? `<button class="btn small" data-action="cloud" data-i="${i}" data-slot="${empty[0]}">Restore into slot ${empty[0]}</button>` : ''}</div>`; }).join('')}</div></div>`;
        host.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-action="cloud"]'); if (!b) return; const c = offers[Number(b.dataset.i)]; const slot = Number(b.dataset.slot); if (!c) return;
          b.disabled = true; b.textContent = 'Restoring…';
          const r0 = await app.switchSlot(slot); if (!r0.ok || app.f) { toast('That slot is no longer empty.', 'bad'); b.disabled = false; b.textContent = 'Restore'; return; }
          const raw = await cloudLoad({ uid: c.uid, createdAt: c.createdAt }); const f = raw && Save.migrate(raw);
          if (!f) { toast('The cloud copy could not be read right now. Nothing was changed.', 'bad', 5000); b.disabled = false; b.textContent = 'Restore'; return; }
          const r = await app.replaceFranchise(f, { copyKind: 'replaced', mirror: false });
          if (!r.ok) { toast(`Restore failed: ${r.error?.message || 'unknown error'}. Nothing was changed.`, 'bad', 6000); b.disabled = false; b.textContent = 'Restore'; return; }
          toast(`${f.club} restored into slot ${slot}.`, 'good'); Router.go(f.lifecycle?.legacy ? 'legacy' : 'hq', {}, { reset: true });
        });
      })();
      const franchiseOf = async (slot) => (slot === app.slot && app.f ? app.f : (await app.slots.store(slot).open()).franchise);
      delegate(root, {
        continue: () => Router.go(app.f && (app.f.lifecycle?.legacy) ? 'legacy' : 'hq', {}, { reset: true }),
        switch: async (el) => { const slot = Number(el.dataset.slot); const r = await app.switchSlot(slot); if (!r.ok) { toast(r.error?.message || 'Could not open that slot.', 'bad'); return; } if (r.mode !== 'recovery') Router.go(app.f?.lifecycle?.legacy ? 'legacy' : 'hq', {}, { reset: true }); },
        open: async (el) => { const r = await app.switchSlot(Number(el.dataset.slot)); if (r.ok && r.mode !== 'recovery') Router.go('hq', {}, { reset: true }); },
        legacy: async (el) => { const slot = Number(el.dataset.slot); if (slot !== app.slot) { const r = await app.switchSlot(slot); if (!r.ok) { toast(r.error?.message || 'Could not open that slot.', 'bad'); return; } } Router.go('legacy', {}, { reset: true }); },
        new: async (el) => { const r = await app.createIn(Number(el.dataset.slot)); if (!r.ok) toast(r.error?.message || 'That slot is not empty.', 'bad'); },
        export: async (el) => { const f = await franchiseOf(Number(el.dataset.slot)); if (!f) { toast('Nothing to export in that slot.', 'bad'); return; } await offerExport(f); },
        delete: async (el) => { const slot = Number(el.dataset.slot); const f = await franchiseOf(slot); const s = cache?.find((x) => x.slot === slot); if (!f) { toast('Nothing to delete in that slot.', 'bad'); return; } await deleteFlow(app, { slot, f, bytes: s?.bytes || 0, onDone: async () => { await paint(); Router.render(); } }); },
        undo: async () => { const r = await app.undoDelete(); if (r.ok) { toast('Franchise restored.', 'good'); Router.go('hq', {}, { reset: true }); } else toast(`Undo failed: ${r.error?.message || 'unknown error'}`, 'bad', 6000); },
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
  const name = f.club || 'this franchise'; const seasons = (f.history || []).length;
  const body = `<p>Delete <b>${esc(name)}</b> (${esc(`${f.owner?.first || ''} ${f.owner?.last || ''}`.trim())}, ${seasons} season${seasons === 1 ? '' : 's'}, ${kb(bytes)} stored) from slot ${slot}?</p>
    <p class="muted">Export a copy first so you can bring it back later. The deleted copy is also kept among this slot's backups, and you can undo the deletion until you close the game.</p>
    <div class="stack"><button class="btn primary block" data-action="export">⬇ Export first</button><div class="dim" id="del-export" style="font-size:12px;min-height:1em"></div>
    <label class="muted">Type <b>${esc(name)}</b> or <b>DELETE</b> to confirm<input id="del-confirm" class="input block" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(name)}"></label>
    <div class="row"><button class="btn" data-action="cancel">Cancel</button><button class="btn danger" data-action="delete" disabled>Delete forever</button></div></div>`;
  return new Promise((resolve) => {
    const { el, close } = sheet(body, { title: 'Delete franchise', onClose: () => resolve(false) });
    const input = el.querySelector('#del-confirm'); const btn = el.querySelector('[data-action="delete"]');
    const matches = () => { const v = input.value.trim(); return v === 'DELETE' || (v.length > 0 && v.toLowerCase() === String(name).toLowerCase()); };
    input.addEventListener('input', () => { btn.disabled = !matches(); });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-action]')?.dataset.action; if (!a) return;
      if (a === 'cancel') { el.remove(); resolve(false); }
      if (a === 'export') { const r = await offerExport(f); const line = el.querySelector('#del-export'); if (line) line.textContent = r?.how === 'browser' ? 'Export offered to your browser: check that it saved the file.' : r?.ok ? `Saved as ${r.name}.` : 'No file was saved.'; }
      if (a === 'delete') {
        if (!matches()) return; btn.disabled = true; btn.textContent = 'Deleting…';
        const r = await app.deleteSlot(slot);
        if (!r.ok) { btn.disabled = false; btn.textContent = 'Delete forever'; toast(`Nothing was deleted: ${r.error?.message || 'unknown error'}`, 'bad', 6000); return; }
        el.remove(); toast(`${name} deleted. Undo is on the Franchises screen until you close the game.`, 'info', 5000); await onDone?.(); resolve(true);
      }
    });
  });
}

/**
 * Importing (GDD §42.5): validate on a copy, preview, then choose an empty slot. A file whose franchise already occupies a
 * slot is offered Replace slot N (the delete flow) or Import as a copy (a new uid). Nothing is replaced silently.
 */
export async function importFlow(app, Router, { file, preferredSlot = null, onDone = null }) {
  let text; try { text = await file.text(); } catch (e) { toast(`The file could not be read: ${e.message}`, 'bad', 5000); return false; }
  const v = validateImport(text);
  if (!v.ok) { toast(`Import refused: ${v.problems[0]}`, 'bad', 6000); return false; }
  const f = v.franchise; const m = v.meta || {}; const { list, empty, same } = await app.slots.slotFor({ uid: f.uid });
  const status = f.lifecycle?.legacy ? (f.lifecycle.status === 'fired' ? 'Dismissed archive' : 'Retired archive') : 'Active';
  const preview = `<div class="panel tight"><div><b>${esc(m.club || f.club || 'Franchise')}</b>${m.owner ? ` · ${esc(m.owner)}` : ''}</div><div class="muted">${m.year != null ? yearOf(m.year) : ''}${m.week != null ? ` · Week ${m.week}` : ''} · ${esc(status)} · ${kb(text.length)} in the file</div><div class="dim mono" style="font-size:11px;overflow-wrap:anywhere">id ${esc(f.uid || 'none')}</div>${v.warnings?.length ? `<div class="warn-text">${esc(v.warnings[0])}</div>` : ''}</div>`;
  const slotButtons = (slots, label) => slots.map((n) => `<button class="btn block" data-action="into" data-slot="${n}">${label} slot ${n}</button>`).join('');
  const sameNote = same ? `<p class="warn-text">This franchise is already in slot ${same}. Replace it (the delete flow runs first) or import this file as a separate copy.</p>` : '';
  const body = `${preview}${sameNote}<div class="stack" style="margin-top:10px">
    ${same ? `<button class="btn danger block" data-action="replace" data-slot="${same}">Replace slot ${same}</button><button class="btn block" data-action="copy">Import as a copy${empty.length ? '' : ' (no empty slot)'}</button>` : ''}
    ${!same ? (empty.length ? `<p class="muted">Choose an empty slot:</p>${slotButtons(empty, 'Import into')}` : '<p class="warn-text">All three slots are full. Delete or export a franchise first, then import again.</p>') : ''}
    <button class="btn ghost block" data-action="cancel">Cancel</button></div>`;
  return new Promise((resolve) => {
    const { el } = sheet(body, { title: 'Import franchise', onClose: () => resolve(false) });
    let asCopy = false;
    const into = async (slot) => {
      const g = asCopy ? { ...f, uid: newUid() } : f;
      const r = await app.importInto(slot, g);
      if (!r.ok) { toast(`Import failed: ${r.error?.message || 'the franchise could not be saved'}. Nothing was changed.`, 'bad', 6000); return; }
      el.remove(); toast(`Franchise imported into slot ${slot} and saved.`, 'good'); await onDone?.(); Router.go(g.lifecycle?.legacy ? 'legacy' : 'hq', {}, { reset: true }); resolve(true);
    };
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-action]')?.dataset.action; if (!a) return;
      if (a === 'cancel') { el.remove(); resolve(false); }
      if (a === 'into') await into(Number(e.target.closest('[data-action]').dataset.slot));
      if (a === 'copy') { asCopy = true; if (!empty.length) { toast('No empty slot. Delete or export a franchise first.', 'bad', 5000); return; } const host = el.querySelector('.sheet-body'); host.innerHTML = `${preview}<p class="muted">Import as a separate copy into which empty slot?</p><div class="stack">${slotButtons(empty, 'Copy into')}<button class="btn ghost block" data-action="cancel">Cancel</button></div>`; }
      if (a === 'replace') { const slot = Number(e.target.closest('[data-action]').dataset.slot); const cur = slot === app.slot && app.f ? app.f : (await app.slots.store(slot).open()).franchise; const s = list.find((x) => x.slot === slot); const done = await deleteFlow(app, { slot, f: cur, bytes: s?.bytes || 0 }); if (done) await into(slot); }
    });
  });
}
