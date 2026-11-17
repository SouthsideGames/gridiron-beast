import { iconifyMarkup } from './icons.js';
// Tiny DOM helpers: escape, element creation from HTML, delegation.
import { t as $t } from '../text/index.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Build an element from an HTML string. */
export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = iconifyMarkup(str.trim());
  return t.content.firstElementChild;
}

/** data-action delegation: handlers[action](el, event). */
export function delegate(root, handlers) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.action];
    if (fn && !el.dataset.busy) {
      e.preventDefault();
      const result = fn(el, e);
      if (result?.then) {
        el.dataset.busy = '1'; el.setAttribute('aria-busy', 'true');
        Promise.resolve(result).catch(error => { toast(error?.message || $t('shared.action_failed'), 'bad'); }).finally(() => {
          delete el.dataset.busy; el.removeAttribute('aria-busy');
        });
      }
    }
  });
  root.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = handlers[el.dataset.change];
    if (fn) fn(el, e);
  });
}

export const fmtMoney = (n) => `${Math.round(n).toLocaleString('en-US')} cr`;
export const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
export const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) > 3 ? 0 : n % 10] || 'th'}`;
export const pct = (v) => `${Math.round(v * 100)}%`;

/** Simple non-blocking toast. */
let toastTimer = null;
export function toast(text, kind = 'info', ms = 2600) {
  let el = $('#toast');
  if (!el) { el = html('<div id="toast" role="status" aria-live="polite"></div>'); document.body.appendChild(el); }
  el.textContent = text; el.dataset.kind = kind; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/** Modal sheet. Returns a close function. */
/**
 * While any sheet is open the screen behind it does not scroll (GDD §41.5): a drag or wheel on the dimmed backdrop used to
 * move the page. A body observer keeps the lock in step with the sheets actually present, however they are closed.
 */
let sheetWatch = null;
let lastSheetTap = null; // where the tap that closed the last sheet landed, and when
/** A second tap of a quick double tap on a sheet's button (Confirm, Make Offer) lands on whatever lay beneath the closed sheet,
 * often the tab bar. Drop a tap at the same spot within a moment of the closing tap; any other tap goes through untouched. */
export function swallowsRepeatTap(e, last = lastSheetTap, now = Date.now()) {
  if (!last || now - last.t > 450 || !(e.clientX || e.clientY)) return false;
  if (document.querySelector('.sheet-backdrop') || e.target?.closest?.('.sheet-backdrop')) return false;
  return Math.abs(e.clientX - last.x) <= 28 && Math.abs(e.clientY - last.y) <= 28;
}
function watchSheets() {
  if (sheetWatch || typeof MutationObserver === 'undefined') return;
  const sync = () => document.documentElement.classList.toggle('sheet-open', !!document.querySelector('.sheet-backdrop'));
  sheetWatch = new MutationObserver(sync); sheetWatch.observe(document.body, { childList: true }); sync();
  document.addEventListener('click', (e) => { if (swallowsRepeatTap(e)) { e.preventDefault(); e.stopImmediatePropagation(); lastSheetTap = null; } }, true);
  // Escape closes the top sheet even when focus is not inside it (a tap on plain text moves focus to the page).
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.defaultPrevented && closeTopSheet()) e.preventDefault(); });
}
export function closeTopSheet() {
  const layers = [...document.querySelectorAll('.sheet-backdrop')];
  const top = layers.at(-1);
  if (!top) return false;
  top.__closeSheet?.(); return true;
}
export function sheet(contentHtml, { title = '', onClose = null } = {}) {
  watchSheets();
  const el = html(`<div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="${esc(title || $t('shared.dialog'))}"><div class="sheet"><div class="sheet-head"><strong>${esc(title)}</strong><button class="btn ghost" data-action="sheet-close" aria-label="${$t('shared.close')}">✕</button></div><div class="sheet-body">${contentHtml}</div></div></div>`);
  const opener = document.activeElement;
  let closed = false; let cleanup = () => {};
  let tapAt = null; el.addEventListener('click', (e) => { tapAt = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  const close = () => {
    if (closed) return; closed = true; cleanup(); el.remove(); onClose?.();
    if (tapAt && Date.now() - tapAt.t < 450) lastSheetTap = tapAt;
    if (opener?.isConnected) opener.focus?.({ preventScroll: true });
  };
  el.__closeSheet = close;
  el.addEventListener('keydown', e => {
    if ([...document.querySelectorAll('.sheet-backdrop')].at(-1) !== el) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const controls = [...el.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(x => !x.hidden);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  });
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-action="sheet-close"]')) close(); });
  const holdPage = (e) => { if (!e.target.closest?.('.sheet-body')) e.preventDefault(); };
  el.addEventListener('wheel', holdPage, { passive: false }); el.addEventListener('touchmove', holdPage, { passive: false });
  document.body.appendChild(el);
  if (typeof MutationObserver !== 'undefined') {
    const body=el.querySelector('.sheet-body'), panel=el.querySelector('.sheet');
    const footer=document.createElement('div');footer.className='sheet-actions';
    const pin=()=>{
      if(!el.isConnected){observer.disconnect();return;}
      const actions=[...body.querySelectorAll('.polish-actions')];
      if(!actions.length)return;
      footer.replaceChildren(...actions);panel.appendChild(footer);
    };
    const observer=new MutationObserver(pin);observer.observe(body,{childList:true,subtree:true});
    pin();
    cleanup=()=>observer.disconnect();
  }
  queueMicrotask(() => { if (el.isConnected) el.querySelector('button, input, select, textarea')?.focus?.({ preventScroll: true }); });
  return { el, close };
}

/** Confirm dialog (replaces window.confirm). */
export function confirmSheet(text, { title = $t('shared.are_you_sure'), okLabel = $t('shared.confirm'), danger = false } = {}) {
  return new Promise((resolve) => {
    const { el, close } = sheet(`<p style="white-space:pre-line">${esc(text)}</p><div class="row"><button class="btn" data-action="no">${$t('shared.cancel')}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-action="yes">${esc(okLabel)}</button></div>`, { title, onClose: () => resolve(false) });
    el.addEventListener('click', (e) => { const a = e.target.closest('[data-action]')?.dataset.action; if (a === 'yes') { resolve(true); close(); } if (a === 'no') { resolve(false); close(); } });
  });
}
