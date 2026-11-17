import { evolutionReady } from '../data/monsters.js';
import { t } from '../text/index.js';
import { esc, sheet, toast } from './dom.js';
import { LESSONS, guideActive, currentLesson, advanceGuide, syncGuide, allowedScreens, lessonCanRead, guideEvent, finishIndependent, skipLesson, footballLessonKey } from '../franchise/guide.js';
import { MOMENTS } from '../franchise/guide-lessons.js';

export function guideHtml(f, screen) {
  const l = currentLesson(f); if (!l || ['onboarding', 'welcome'].includes(screen)) return '';
  const compact = ['match', 'clash-battle'].includes(screen);
  const body = `<section class="commissioner-guide panel" aria-label="${esc(t('guide.commissioner'))}"><b>${t('guide.commissioner')}</b><div class="dim">${t('guide.progress', { n: f.guide.index + 1, total: LESSONS.length })}</div><h2>${esc(l.title())}</h2><p>${esc(l.text())}</p><div class="guide-buttons"><button class="btn primary" data-action="guide-open">${t('guide.open')}</button>${lessonCanRead(f, screen) ? `<button class="btn primary" data-action="guide-next">${t('guide.continue')}</button>` : ''}${l.kind === 'independent' ? `<button class="btn" data-action="guide-keep">${t('guide.keep')}</button><button class="btn" data-action="guide-open">${t('guide.help')}</button>` : ''}<button class="btn" data-action="guide-book">${t('guide.book')}</button><button class="btn ghost" data-action="guide-skip">${t('guide.skip')}</button><button class="btn ghost" data-action="guide-off">${t('guide.off')}</button></div></section>`;
  return compact ? `<details class="guide-compact"><summary>${esc(t('guide.commissioner'))}: ${esc(l.title())}</summary>${body}</details>` : body;
}
// Lessons closed with ✕ instead of Continue wait until the next time the game is opened, rather than reappearing on every
// re-render of the same screen (each tap on the Clash setup re-renders it).
const snoozed = new Set();
export function guideMoment(f, key, save) {
  const g = f?.guide; const m = MOMENTS[key];
  if (!g?.enabled || !m || g.moments.includes(key) || snoozed.has(key) || document.querySelector('.sheet')) return false;
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
}
export function guideFootball(f, save) {
  if (!guideActive(f) || f.guide.skipPending || currentLesson(f)?.kind !== 'game' || !f.game?.state) return;
  const key = footballLessonKey(f, (k) => snoozed.has(k));
  if (key && guideMoment(f, key, save)) return;
  if (f.game.state.lastPlay) guideMoment(f, 'result', save);
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
    if (a === 'guide-open') Router.go(l.kind === 'draft' ? 'draft' : l.kind === 'board' ? 'goals' : l.kind === 'game' ? (f.game ? 'match' : f.season.day === 6 ? 'pregame' : 'hq') : l.screen);
    if (a === 'guide-keep') { if (finishIndependent(f, true)) { app.save(); Router.go('hq'); } else toast(t('guide.inspect_first')); }
  }, true);
  const originalGo = Router.setGuard;
  originalGo?.((name) => { const allowed = allowedScreens(app.f); if (allowed && !allowed.includes(name)) { toast(t('guide.blocked')); return false; } return true; });
}
export function mountGuide(f, screen, save) {
  if (!f?.guide?.enabled) return;
  if (guideActive(f)) {
    if (currentLesson(f)?.kind === 'independent' && screen === 'monster') { f.guide.evidence.reviewedTeam = true; save(); }
    if (currentLesson(f)?.kind === 'independent' && finishIndependent(f)) save();
    if (screen === 'clash-battle') guideMoment(f, 'clash', save);
    if (screen === 'match') guideFootball(f, save);
    const l = currentLesson(f);
    const target = document.querySelector(l?.kind === 'lineup' ? '[data-action="slot"]' : l?.kind === 'monster' ? '[data-action="monster"]' : `[data-action="${l?.screen}"]`);
    target?.classList.add('guide-target');
  } else if (screen !== 'match' && screen !== 'clash-battle') {
    if (f.roster?.some(m => m.injury)) guideMoment(f, 'injury', save);
    if (f.roster?.some(evolutionReady)) guideMoment(f, 'evolution', save);
    if (screen === 'contracts' || screen === 'offseason') guideMoment(f, 'contracts', save);
    if (f.season?.finished) guideMoment(f, 'offseason', save);
  }
}
