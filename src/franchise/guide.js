// Optional additive save data. Only onboarding enrolls a franchise; loading an older save never enrolls it.
import { LESSONS } from './guide-lessons.js';
import { canPlay } from '../data/personnel.js';
import { buildDepthChart } from './roster.js';
export { LESSONS };
export const guideActive = (f) => f?.guide?.v === 1 && f.guide.enabled && !f.guide.done;
export const lineupStamp = (f) => JSON.stringify(buildDepthChart(f.roster, f.lineupManual, f.depth));
export function startGuide(f) {
  if (f.guide) return;
  f.guide = { v: 1, enabled: true, index: 0, completed: [], skipped: [], moments: [], year: f.season.year, week: f.season.week, lineup: lineupStamp(f), evidence: {} };
}
export const currentLesson = (f) => guideActive(f) ? LESSONS[f.guide.index] || null : null;
export function advanceGuide(f, { skip = false } = {}) {
  const l = currentLesson(f); if (!l) return false;
  f.guide[skip ? 'skipped' : 'completed'].push(l.id);
  delete f.guide.skipPending;
  f.guide.index++; f.guide.lineup = lineupStamp(f);
  if (f.guide.index >= LESSONS.length) f.guide.done = true;
  return true;
}
export function guideEvent(f, event) {
  if (!guideActive(f)) return;
  const l = currentLesson(f);
  if (event === 'monster' && l.kind === 'monster') advanceGuide(f);
  if (event === 'compare' && l.kind === 'compare') advanceGuide(f);
}
export function syncGuide(f) {
  if (!guideActive(f)) return false;
  const g = f.guide; const l = currentLesson(f); const later = f.season.year > g.year || f.season.week > g.week;
  if (l.kind === 'lineup') {
    const chart = JSON.parse(lineupStamp(f));
    const alternate = Object.entries(chart).some(([slot, id]) => f.roster.some(m => m.id !== id && !m.injury && canPlay(m.position, slot)));
    if (!alternate) return advanceGuide(f, { skip: true });
  }
  if (l.kind === 'compare' && (later || f.season.day > 1 || (f.season.day === 1 && !f.week.prospects?.length))) return advanceGuide(f, { skip: true });
  const day = Number(l.kind.match(/^day([0-5])$/)?.[1]);
  const ready = l.kind === 'lineup' ? lineupStamp(f) !== g.lineup
    : l.kind === 'draft' ? !f.draft?.creation || !!f.draft?.done
    : l.kind === 'board' ? !!f.board?.goal
    : /^day/.test(l.kind) ? later || f.season.day > day
    : l.kind === 'game' ? !!g.evidence.gameFinished
    : false;
  return ready ? advanceGuide(f, { skip: !!g.skipPending }) : false;
}
// Keep emergency repairs and the first draft usable. Within a lesson, the player still chooses their own beasts and plays.
export function allowedScreens(f) {
  const l = currentLesson(f); if (!l) return null;
  if (f.guide.skipPending) return null;
  const shared = ['onboarding', 'welcome', 'hq', 'scene', 'commissioner', 'captains', 'guidebook', 'menu', 'settings', 'test-session'];
  const routes = {
    roster: ['roster', 'monster', 'assign'], monster: ['roster', 'monster', 'assign'], staff: ['staff', 'interview', 'hire'],
    scout: ['scout', 'recruit'], recruit: ['recruit', 'clash-battle'], training: ['training', 'roster', 'monster'],
    scoutopp: ['scoutopp'], gameplan: ['gameplan', 'playbook', 'playdetail'], lineup: ['lineup', 'roster', 'assign', 'monster'],
  };
  if (l.kind === 'independent') return null; // deliberate independent navigation, with Help Me available
  if (l.kind === 'draft') return [...shared, 'draft', 'draftclass', 'monster'];
  if (l.kind === 'board') return [...shared, 'goals'];
  if (l.kind === 'game') return [...shared, 'pregame', 'clash-battle', 'match', 'roster', 'assign', 'monster', 'goals'];
  return [...shared, ...(routes[l.screen] || [])];
}
export function lessonCanRead(f, screen) {
  const l = currentLesson(f); return !!l && l.kind === 'read' && l.screen === screen;
}
export function finishIndependent(f, keep = false) {
  if (currentLesson(f)?.kind !== 'independent' || !f.guide.evidence.reviewedTeam) return false;
  if (!keep && lineupStamp(f) === f.guide.lineup) return false;
  return advanceGuide(f);
}

export function skipLesson(f) {
  const l = currentLesson(f); if (!l) return false;
  // Skipping instructions does not spend a day or simulate a match. Let the player act freely until that milestone occurs.
  if (/^day/.test(l.kind) || ['draft', 'board', 'game'].includes(l.kind)) { f.guide.skipPending = true; return true; }
  return advanceGuide(f, { skip: true });
}
