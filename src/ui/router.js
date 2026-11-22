import { TabHistory } from './phone-navigation.js';
import { polishHeader, mountPolish } from './polish.js';
import { iconifyMarkup } from './icons.js';
// Screen router: a stack of screens rendered into #app with a top bar and,
// inside the franchise, a bottom tab bar. Screens are {render(ctx) -> html,
// mount?(root, ctx), unmount?()} objects registered by name.

import { $, html, esc, closeTopSheet } from './dom.js';
import { t as $t } from '../text/index.js';

const screens = new Map();
let navigationGuard = null;
export function setGuard(guard) { navigationGuard = guard; }
let stack = [];
const tabHistory = new TabHistory();
let current = null;
let layoutObserver = null;
let app = null;
let ctxProvider = () => ({});
let tabsProvider = () => null;
let tipProvider = null; // (ctx, screenName) => html prepended to the screen (tutorial tips)
let afterMount = null; // (ctx, screenName) => void
let helpProvider = null; // (ctx, screenName) => html for the top bar's "? Help" button (Coach Assist, every mode)

export function registerScreen(name, screen) { screens.set(name, screen); }
/** Every registered screen name (tools and checks that walk the whole game use it). */
export const screenNames = () => [...screens.keys()];
let nativeBackInstalled = false;
export function nativeBack() { back(); }
globalThis.addEventListener?.('gb-native-back', nativeBack);
export function init({ root, context, tabs, tip = null, mounted = null, help = null }) {
  if (!nativeBackInstalled) {
    const nativeApp = globalThis.Capacitor?.Plugins?.App;
    if (!globalThis.gbNativeBridgeInstalled && nativeApp?.addListener) {
      nativeBackInstalled = true;
      try { Promise.resolve(nativeApp.addListener('backButton', () => { if (!globalThis.gbNativeBridgeInstalled) nativeBack(); })).catch(() => { nativeBackInstalled=false; }); } catch { nativeBackInstalled=false; }
    }
  } app = root; ctxProvider = context; tabsProvider = tabs; tipProvider = tip; afterMount = mounted; helpProvider = help; }
export function currentScreen() { return stack[stack.length - 1] || null; }

export function go(name, params = {}, { replace = false, reset = false } = {}) {
  if (navigationGuard && !navigationGuard(name)) return;
  if (!screens.has(name)) throw new Error(`${$t('shared.no_screen', { name })}`);
  if (reset) stack = [];
  else if (stack.length && !replace) stack[stack.length - 1].scroll = window.scrollY; // remembered for the way back
  if (replace && stack.length) stack.pop();
  stack.push({ name, params });
  navigating = true; render();
}
let restoreTo = null;
/**
 * Open a franchise where its owner left it: HQ, or straight back into the game when one is under way (a game left by closing
 * the app is still in the save). The game screen leads back to HQ itself when the game is over.
 */
export function goToFranchise(f) {
  go(f?.game?.state && screens.has('match') ? 'match' : 'hq', {}, { reset: true });
}
export function back() {
  if (closeTopSheet()) return;
  if (stack.length > 1) stack.pop(); // the guard is for going forward: Back only returns to a screen already visited, so a lesson that completes on a sub-screen never strands the player there
  restoreTo = stack[stack.length - 1]?.scroll ?? null; // back to where the thumb left the previous screen (GDD §40.5)
  navigating = true; render();
}
export function switchTab(name) {
  const ctx=ctxProvider(), items=tabsProvider(ctx,currentScreen()?.name)||[];
  if (!items.some(t=>t.screen===name)) return;
  if (closeTopSheet()) return;
  tabHistory.reset(ctx.f);
  tabHistory.active=items.find(t=>t.active)?.screen || tabHistory.active;
  let proposed=tabHistory.active===name?[{name,params:{}}]:tabHistory.saved.get(name)||[{name,params:{}}];
  // A tab whose remembered sub-screen is closed right now (a guided lesson) opens at its own root instead of refusing the tab.
  if (navigationGuard && proposed.length>1 && !navigationGuard(proposed.at(-1).name,{silent:true}) && navigationGuard(name,{silent:true})) { tabHistory.saved.delete(name); proposed=[{name,params:{}}]; }
  if (navigationGuard && !navigationGuard(proposed.at(-1).name)) return;
  stack=tabHistory.switchTo(name,stack,window.scrollY);
  restoreTo=stack.at(-1)?.scroll??0;navigating=true;render();
}
let navigating = false; // a go/back scrolls to the top; a re-render of the same screen (spending a point, toggling a tab) keeps the scroll position
export function render() {
  const top = currentScreen(); if (!top || !app) { restoreTo = null; return; }
  const restore = restoreTo; restoreTo = null; // consumed by this render only: never carried into a later, unrelated one
  const screen = screens.get(top.name);
  const keepScroll = !navigating && current === screen; const y = window.scrollY; const entering = navigating; navigating = false; // a go/back slides the new screen in; a re-render of the same screen stays put
  globalThis.dispatchEvent?.(new Event('gb-before-screen-render'));
  const ctx = { ...ctxProvider(), params: top.params, entering, go, back, render };
  if (current && current !== screen) current.unmount?.();
  current = screen;
  const title = typeof screen.title === 'function' ? screen.title(ctx) : screen.title || $t('shared.gridiron_beast');
  const showBack = stack.length > 1 && screen.back !== false;
  tabHistory.reset(ctx.f);
  const tabs = screen.tabs === false ? null : tabsProvider(ctx, top.name);
  app.innerHTML = iconifyMarkup(`
    <header class="topbar" role="banner">
      ${showBack ? `<button class="btn ghost back" data-action="router-back" aria-label="${$t('shared.back')}">‹</button>` : `<span class="back-spacer"></span>`}
      <h1 class="title">${esc(title)}</h1>
      <span class="topbar-right">${screen.topRight ? screen.topRight(ctx) : ''}${helpProvider && screen.help !== false ? helpProvider(ctx, top.name) : ''}</span>
    </header>
    <main class="screen screen-${esc(top.name)} ${tabs ? 'with-tabs' : ''} ${entering ? 'enter' : ''}" id="screen">${tipProvider ? tipProvider(ctx, top.name) : ''}${polishHeader(ctx, top.name)}${screen.render(ctx)}</main>
    ${tabs ? `<nav class="tabbar" aria-label="${$t('shared.franchise_sections')}">${tabs.map((t) => `<button class="tab ${t.active ? 'active' : ''}" data-action="router-tab" data-screen="${t.screen}" aria-current="${t.active ? 'page' : 'false'}"><span class="tab-icon">${t.icon}${t.badge ? `<span class="tab-badge" aria-label="${t.badge} notices">${t.badge > 9 ? '9+' : t.badge}</span>` : ''}</span><span>${esc(t.label)}</span></button>`).join('')}</nav>` : ''}`);
  app.querySelector('[data-action="router-back"]')?.addEventListener('click', back);
  for (const b of app.querySelectorAll('[data-action="router-tab"]')) b.addEventListener('click', () => switchTab(b.dataset.screen));
  screen.mount?.($('#screen'), ctx);
  mountPolish($('#screen'), ctx, top.name, { go, back, render });
  afterMount?.(ctx, top.name);
  layoutObserver?.disconnect();
  const tabbar=app.querySelector('.tabbar'), nextBar=app.querySelector('.phone-hq-next');
  const measure=()=>{
    const style=globalThis.document?.documentElement?.style;
    if(tabbar)style?.setProperty('--phone-tab-height',`${tabbar.getBoundingClientRect().height}px`);
    if(nextBar)style?.setProperty('--phone-next-height',`${nextBar.getBoundingClientRect().height}px`);
  };
  measure();
  if(globalThis.ResizeObserver){layoutObserver=new ResizeObserver(measure);if(tabbar)layoutObserver.observe(tabbar);if(nextBar)layoutObserver.observe(nextBar);}

  if (keepScroll) window.scrollTo(0, y); else if (restore != null) window.scrollTo(0, restore); else window.scrollTo(0, 0);
}
