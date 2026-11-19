import { evolutionReady } from '../data/monsters.js';
import { t } from '../text/index.js';
import { esc, sheet, toast } from './dom.js';
import { LESSONS, GUIDE_LESSON_COUNT, guideActive, currentLesson, advanceGuide, syncGuide, allowedScreens, lessonCanRead, guideEvent, finishIndependent, skipLesson, finishGuideAtFootball } from '../franchise/guide.js';
import { MOMENTS } from '../franchise/guide-lessons.js';

/** The screen "Show Me Where" opens for the current lesson. */
const lessonScreen = (f, l) => l.kind === 'draft' ? 'draft' : l.kind === 'board' ? 'goals' : l.kind === 'game' ? (f.game ? 'match' : f.season.day === 6 ? 'pregame' : 'hq') : l.screen;
export function guideHtml(f, screen) {
  const l = currentLesson(f); if (!l || ['onboarding', 'welcome', 'match'].includes(screen)) return '';
  // Already there: "Show Me Where" would do nothing, so it is not offered (the lesson's own control is highlighted instead).
  const away = lessonScreen(f, l) !== screen;
  const compact = ['match', 'clash-battle'].includes(screen);
  const body = `<section class="commissioner-guide panel" aria-label="${esc(t('guide.commissioner'))}"><b>${t('guide.commissioner')}</b><div class="dim">${t('guide.progress', { n: f.guide.index + 1, total: GUIDE_LESSON_COUNT })}</div><h2>${esc(l.title())}</h2><p>${esc(l.text())}</p><div class="guide-buttons">${away ? `<button class="btn primary" data-action="guide-open">${t('guide.open')}</button>` : ''}${lessonCanRead(f, screen) ? `<button class="btn primary" data-action="guide-next">${t('guide.continue')}</button>` : ''}${l.kind === 'independent' ? `<button class="btn" data-action="guide-keep">${t('guide.keep')}</button><button class="btn" data-action="guide-open">${t('guide.help')}</button>` : ''}<button class="btn" data-action="guide-book">${t('guide.book')}</button><button class="btn ghost" data-action="guide-skip">${t('guide.skip')}</button><button class="btn ghost" data-action="guide-off">${t('guide.off')}</button></div></section>`;
  return compact ? `<details class="guide-compact"><summary>${esc(t('guide.commissioner'))}: ${esc(l.title())}</summary>${body}</details>` : body;
}
// Lessons closed with ✕ instead of Continue wait until the next time the game is opened, rather than reappearing on every
// re-render of the same screen (each tap on the Clash setup re-renders it).
const snoozed = new Set();
export function guideMoment(f, key, save) {
  const g = f?.guide; const m = MOMENTS[key];
  if (!g?.enabled || g.done || !m || g.moments.includes(key) || snoozed.has(key) || document.querySelector('.sheet')) return false;
  let read = false;
  const { el, close } = sheet(`<p>${esc(m.text())}</p><button class="btn primary" data-action="guide-moment-ok">${t('guide.continue')}</button>`, { title: `${t('guide.commissioner')}: ${m.title()}`, onClose: () => { if (!read) snoozed.add(key); } });
  // Closing without reading leaves the lesson available next time. Acknowledgment is durable.
  el.querySelector('[data-action="guide-moment-ok"]').onclick = () => { read = true; g.moments.push(key); save?.(); close(); };
  return true;
}
/** Redraw the lesson panel in place after a lesson completes without leaving the screen (comparing a prospect opens a sheet). */
function refreshGuidePanel(f, screen) {
  const old = document.querySelector('main .guide-compact') || document.querySelector('main .commissioner-guide'); if (!old) return;
  const markup = guideHtml(f, screen); if (!markup) { old.remove(); return; }
  const box = document.createElement('div'); box.innerHTML = markup; old.replaceWith(box.firstElementChild);
  highlightGuideTarget(f, screen);
}
export function guideFootball(f, save) {
  if (finishGuideAtFootball(f)) save?.();
  const g = f?.guide;
  if (!g?.enabled || !g.sendoffPending || !f.game?.state || f.game.state.finished) return;
  const host = document.querySelector('#screen #live-status');
  if (!host) return;
  const note = document.createElement('aside');
  note.className = 'guide-sendoff'; note.setAttribute('role', 'status');
  note.innerHTML = `<div><b>${t('guide.commissioner')}</b><p>${esc(t('guide.football_sendoff'))}</p></div><button class="btn small ghost" aria-label="${esc(t('shared.close'))}">×</button>`;
  note.querySelector('button').onclick = () => note.remove();
  host.appendChild(note);
  g.sendoffPending = false; g.sendoffShown = true; save?.();
}

/** Real game controls, including tab navigation, rather than the guide's shortcut. */
export function guideTargetSelectors(f, screen) {
  const l = currentLesson(f); if (!l || screen === 'match') return [];
  const destination = lessonScreen(f, l);
  if (screen === destination) {
    if (l.kind === 'monster') return ['[data-action="monster"]', '[data-action="slot"]'];
    if (l.kind === 'lineup') return ['[data-action="slot"]'];
    if (l.kind === 'compare') return ['[data-action="compare"]'];
    return [];
  }
  const action = l.kind === 'draft' ? 'draft' : l.kind === 'board' ? 'goals' : l.kind === 'game' ? 'game' : l.screen;
  return [`[data-action="${action}"]`, `[data-action="go"][data-screen="${destination}"]`, `[data-polish="go"][data-screen="${destination}"]`, `[data-action="router-tab"][data-screen="${destination}"]`];
}
export function highlightGuideTarget(f, screen, root = document) {
  for (const old of root.querySelectorAll('.guide-target')) old.classList.remove('guide-target');
  const visible = el => !el.disabled && !el.closest('[hidden],.commissioner-guide,.guide-compact') && el.getClientRects().length > 0;
  const targets = guideTargetSelectors(f, screen).flatMap(selector => [...root.querySelectorAll(selector)]).filter(visible);
  // Show a single local choice; while navigating, mark both the direct button
  // and the real tab if both are present. HQ contains the day/staff shortcuts;
  // point back there when the current page has no direct route to the lesson.
  if (!targets.length && currentLesson(f) && screen !== 'hq' && screen !== lessonScreen(f, currentLesson(f))) {
    const hq = root.querySelector('[data-action="router-tab"][data-screen="hq"]');
    if (hq && visible(hq)) targets.push(hq);
  }
  const chosen = screen === lessonScreen(f, currentLesson(f) || {}) ? targets.slice(0, 1) : targets;
  for (const target of new Set(chosen)) target.classList.add('guide-target');
}

export function initGuidedWeek({ app, Router }) {
  Router.registerScreen('guidebook', { title: t('guide.book'), render({ f }) {
    const ids = new Set([...(f.guide?.completed || []), ...(f.guide?.skipped || []), currentLesson(f)?.id]);
    return LESSONS.filter(l => ids.has(l.id)).map(l => `<details class="panel"><summary>${esc(l.title())}</summary><p>${esc(l.text())}</p></details>`).join('') + Object.entries(MOMENTS).filter(([k]) => f.guide?.moments.includes(k)).map(([, m]) => `<details class="panel"><summary>${esc(m.title())}</summary><p>${esc(m.text())}</p></details>`).join('');
  }});
  const originalSave = app.save.bind(app);
  app.save = (...args) => { syncGuide(app.f); return originalSave(...args); };
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-action]'); if (!b || !app.f) return;
    const a = b.dataset.action;
    if (a === 'guide-book') { b.closest('.sheet-backdrop')?.remove(); Router.go('guidebook'); return; }
    if (!guideActive(app.f)) return;
    const f = app.f; const l = currentLesson(f); const screen = Router.currentScreen()?.name;
    const actionGate = screen === 'hq' && (a === 'autorun' || (['scout', 'recruit', 'training', 'scoutopp', 'gameplan', 'lineup', 'game', 'draft', 'goals'].includes(a) && !((l.kind === 'draft' && a === 'draft') || (l.kind === 'board' && a === 'goals') || (l.kind === 'game' && a === 'game') || a === l.screen)));
    if (actionGate && allowedScreens(f)) { e.preventDefault(); e.stopImmediatePropagation(); toast(t('guide.blocked')); return; }
    if (a === 'monster') { guideEvent(f, 'monster'); app.save(); }
    if (a === 'compare') { const before = f.guide.index; guideEvent(f, 'compare'); app.save(); if (f.guide.index !== before) refreshGuidePanel(f, screen); }
    if (a === 'guide-off') { f.guide.enabled = false; app.save(); Router.render(); }
    if (a === 'guide-skip') { skipLesson(f); app.save(); Router.render(); }
    if (a === 'guide-next' && lessonCanRead(f, screen)) { advanceGuide(f); app.save(); Router.render(); }
    if (a === 'guide-open') Router.go(lessonScreen(f, l));
    if (a === 'guide-keep') { if (finishIndependent(f, true)) { app.save(); Router.go('hq'); } else toast(t('guide.inspect_first')); }
  }, true);
  const originalGo = Router.setGuard;
  originalGo?.((name, { silent = false } = {}) => { const allowed = allowedScreens(app.f); if (allowed && !allowed.includes(name)) { if (!silent) toast(t('guide.blocked')); return false; } return true; });
}
export function mountGuide(f, screen, save) {
  highlightGuideTarget(f, screen);
  if (!f?.guide?.enabled || f.guide.endedAtFootball) return;
  if (guideActive(f)) {
    if (currentLesson(f)?.kind === 'independent' && screen === 'monster') { f.guide.evidence.reviewedTeam = true; save(); }
    if (currentLesson(f)?.kind === 'independent' && finishIndependent(f)) save();
    if (screen === 'clash-battle') guideMoment(f, 'clash', save);
    if (screen === 'match') guideFootball(f, save);

  } else if (screen !== 'match' && screen !== 'clash-battle') {
    if (f.roster?.some(m => m.injury)) guideMoment(f, 'injury', save);
    if (f.roster?.some(evolutionReady)) guideMoment(f, 'evolution', save);
    if (screen === 'contracts' || screen === 'offseason') guideMoment(f, 'contracts', save);
    if (f.season?.finished) guideMoment(f, 'offseason', save);
  }
}
