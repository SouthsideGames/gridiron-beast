// Tiny DOM helpers: escape, element creation from HTML, delegation.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Build an element from an HTML string. */
export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

/** data-action delegation: handlers[action](el, event). */
export function delegate(root, handlers) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
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
export function sheet(contentHtml, { title = '', onClose = null } = {}) {
  const el = html(`<div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="${esc(title || 'Dialog')}"><div class="sheet"><div class="sheet-head"><strong>${esc(title)}</strong><button class="btn ghost" data-action="sheet-close" aria-label="Close">✕</button></div><div class="sheet-body">${contentHtml}</div></div></div>`);
  const close = () => { el.remove(); onClose?.(); };
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-action="sheet-close"]')) close(); });
  document.body.appendChild(el);
  return { el, close };
}

/** Confirm dialog (replaces window.confirm). */
export function confirmSheet(text, { title = 'Are you sure?', okLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    const { el, close } = sheet(`<p>${esc(text)}</p><div class="row"><button class="btn" data-action="no">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-action="yes">${esc(okLabel)}</button></div>`, { title, onClose: () => resolve(false) });
    el.addEventListener('click', (e) => { const a = e.target.closest('[data-action]')?.dataset.action; if (a === 'yes') { el.remove(); resolve(true); } if (a === 'no') { el.remove(); resolve(false); } });
  });
}
