// Screen router: a stack of screens rendered into #app with a top bar and,
// inside the franchise, a bottom tab bar. Screens are {render(ctx) -> html,
// mount?(root, ctx), unmount?()} objects registered by name.

import { $, html, esc } from './dom.js';

const screens = new Map();
let stack = [];
let current = null;
let app = null;
let ctxProvider = () => ({});
let tabsProvider = () => null;
let tipProvider = null; // (ctx, screenName) => html prepended to the screen (tutorial tips)
let afterMount = null; // (ctx, screenName) => void

export function registerScreen(name, screen) { screens.set(name, screen); }
export function init({ root, context, tabs, tip = null, mounted = null }) { app = root; ctxProvider = context; tabsProvider = tabs; tipProvider = tip; afterMount = mounted; }
export function currentScreen() { return stack[stack.length - 1] || null; }

export function go(name, params = {}, { replace = false, reset = false } = {}) {
  if (!screens.has(name)) throw new Error(`No screen ${name}`);
  if (reset) stack = [];
  if (replace && stack.length) stack.pop();
  stack.push({ name, params });
  navigating = true; render();
}
export function back() {
  if (stack.length > 1) stack.pop();
  navigating = true; render();
}
let navigating = false; // a go/back scrolls to the top; a re-render of the same screen (spending a point, toggling a tab) keeps the scroll position
export function render() {
  const top = currentScreen(); if (!top || !app) return;
  const screen = screens.get(top.name);
  const keepScroll = !navigating && current === screen; const y = window.scrollY; navigating = false;
  const ctx = { ...ctxProvider(), params: top.params, go, back, render };
  if (current && current !== screen) current.unmount?.();
  current = screen;
  const title = typeof screen.title === 'function' ? screen.title(ctx) : screen.title || 'Gridiron Beast';
  const showBack = stack.length > 1 && screen.back !== false;
  const tabs = screen.tabs === false ? null : tabsProvider(ctx, top.name);
  app.innerHTML = `
    <header class="topbar" role="banner">
      ${showBack ? `<button class="btn ghost back" data-action="router-back" aria-label="Back">‹</button>` : '<span class="back-spacer"></span>'}
      <h1 class="title">${esc(title)}</h1>
      <span class="topbar-right">${screen.topRight ? screen.topRight(ctx) : ''}</span>
    </header>
    <main class="screen screen-${esc(top.name)} ${tabs ? 'with-tabs' : ''}" id="screen">${tipProvider ? tipProvider(ctx, top.name) : ''}${screen.render(ctx)}</main>
    ${tabs ? `<nav class="tabbar" aria-label="Franchise sections">${tabs.map((t) => `<button class="tab ${t.active ? 'active' : ''}" data-action="router-tab" data-screen="${t.screen}" aria-current="${t.active ? 'page' : 'false'}"><span class="tab-icon">${t.icon}</span><span>${esc(t.label)}</span></button>`).join('')}</nav>` : ''}`;
  app.querySelector('[data-action="router-back"]')?.addEventListener('click', back);
  for (const b of app.querySelectorAll('[data-action="router-tab"]')) b.addEventListener('click', () => go(b.dataset.screen, {}, { reset: true }));
  screen.mount?.($('#screen'), ctx);
  afterMount?.(ctx, top.name);
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
