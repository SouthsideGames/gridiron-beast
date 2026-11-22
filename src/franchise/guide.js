// Optional additive save data. Only onboarding enrolls a franchise; loading an older save never enrolls it.
import { LESSONS } from './guide-lessons.js';
import { canPlay } from '../data/personnel.js';
import { buildDepthChart } from './roster.js';
import { setAssist } from './assist.js';
export { LESSONS };
export const guideActive = (f) => f?.guide?.v === 1 && f.guide.enabled && !f.guide.done;
export const lineupStamp = (f) => JSON.stringify(buildDepthChart(f.roster, f.lineupManual, f.depth));
/**
 * `returning`: this device already holds another franchise, so its owner has been shown around before. The tour starts switched
 * off and the automatic first-use tips with it (Coach Assist: Expert). Help, the Guidebook and Settings bring either back.
 */
export function startGuide(f, { returning = false } = {}) {
  if (f.guide) return;
  f.guide = { v: 1, enabled: !returning, index: 0, completed: [], skipped: [], moments: [], year: f.season.year, week: f.season.week, lineup: lineupStamp(f), evidence: {} };
  if (returning) { f.guide.returning = true; setAssist(f, { mode: 'expert' }); }
}
/** Skip the whole tutorial (the lesson card's Skip, after its confirmation). Nothing is simulated or spent. */
export function skipTutorial(f) { if (!f?.guide) return false; f.guide.enabled = false; delete f.guide.skipPending; return true; }
/** Turn the tutorial back on from the Guidebook; it carries on from the lesson it had reached. */
export function resumeTutorial(f) { if (!f?.guide || f.guide.done) return false; f.guide.enabled = true; return true; }
export const currentLesson = (f) => guideActive(f) ? LESSONS[f.guide.index] || null : null;
// Later lesson IDs stay in the archive for older saves and the Guidebook. The
// actual required tour now ends as soon as the first football game starts.
const footballIndex = LESSONS.findIndex(l => l.kind === 'game');
export const GUIDE_LESSON_COUNT = footballIndex + 1;
export function finishGuideAtFootball(f) {
  if (!guideActive(f)) return false;
  const g = f.guide;
  if (!f.game?.state && !g.evidence?.gameFinished && g.index <= footballIndex) return false;
  const showSendoff = !!f.game?.state && !f.game.state.finished && g.index <= footballIndex;
  if (g.index === footballIndex && !g.completed.includes('sunday') && !g.skipped.includes('sunday')) g.completed.push('sunday');
  g.done = true; g.endedAtFootball = true;
  g.index = Math.max(g.index, GUIDE_LESSON_COUNT);
  (g.evidence ||= {}).gameStarted = true;
  g.sendoffPending = showSendoff;
  delete g.skipPending;
  return true;
}
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
// One save can complete more than one checkpoint (skipping Tuesday's encounter ends both the prospect and Clash lessons),
// so keep advancing until the current lesson is not yet done. Never more than one pass per lesson.
export function syncGuide(f) {
  if (finishGuideAtFootball(f)) return true;
  let advanced = false;
  for (let i = 0; i <= LESSONS.length && syncOnce(f); i++) advanced = true;
  return advanced;
}
function syncOnce(f) {
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
  const shared = ['onboarding', 'welcome', 'hq', 'scene', 'commissioner', 'captains', 'guidebook', 'menu', 'settings', 'test-session', 'shortlist']; // the shortlist only plans
  const routes = {
    roster: ['roster', 'monster', 'assign'], monster: ['roster', 'monster', 'assign'], staff: ['staff', 'interview', 'hire'],
    scout: ['scout', 'recruit'], recruit: ['recruit', 'clash-battle'], training: ['training', 'roster', 'monster'],
    scoutopp: ['scoutopp'], gameplan: ['gameplan', 'playbook', 'playdetail'], lineup: ['lineup', 'roster', 'assign', 'monster'],
  };
  if (l.kind === 'independent') return null; // deliberate independent navigation, with Help Me available
  // A week that ended without a played game (a forfeit) leaves the football lesson waiting for the next real game; the new
  // week's days must stay reachable meanwhile.
  if (l.kind === 'game' && f.season.day < 6) return null;
  if (l.kind === 'draft') return [...shared, 'draft', 'draftclass', 'monster'];
  if (l.kind === 'board') return [...shared, 'goals'];
  // The Sunday lineup safeguard offers the free-agent market, releases and the lineup screen as repairs: keep them reachable.
  if (l.kind === 'game') return [...shared, 'pregame', 'clash-battle', 'match', 'roster', 'assign', 'monster', 'goals', 'famarket', 'contracts', 'lineup'];
  return [...shared, ...(routes[l.screen] || [])];
}
/** Retained API for older callers. Automatic football lessons have been retired. */
export function footballLessonKey(f, snoozed = () => false) {
  // Compatibility for callers and older saves: football is independent play.
  return null;
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
