import { recorder } from './recorder.js';
export function installRecorder({ app, currentScreen, win = window, doc = document }) {
  const onError = (e) => recorder.finding('runtime-error', 'An unexpected JavaScript error occurred.', { message: e.message, file: e.filename, line: e.lineno, stack: String(e.error?.stack || '').slice(0, 4000) });
  const onRejection = (e) => recorder.finding('unhandled-rejection', 'An asynchronous operation failed unexpectedly.', { message: String(e.reason?.message || e.reason), stack: String(e.reason?.stack || '').slice(0, 4000) });
  const onAction = (e) => {
    if (!recorder.active()) return;
    const el = e.target.closest?.('[data-action], [data-change]'); if (!el) return;
    recorder.setContext({ screen: currentScreen()?.name, franchise: { uid: app.f?.uid, club: app.f?.club, year: app.f?.season?.year, week: app.f?.season?.week, day: app.f?.season?.day } });
    // Only declared action identifiers, never typed text, credentials, or arbitrary element values.
    recorder.record('action', { action: el.dataset.action || el.dataset.change, id: el.dataset.id, side: el.dataset.side, zone: el.dataset.zone, choice: el.dataset.choice });
  };
  const flush = () => recorder.flush();
  win.addEventListener('error', onError); win.addEventListener('unhandledrejection', onRejection);
  doc.addEventListener('click', onAction, true); doc.addEventListener('change', onAction, true);
  win.addEventListener('pagehide', flush); const hidden = () => { if (doc.visibilityState === 'hidden') flush(); }; doc.addEventListener('visibilitychange', hidden);
  return () => { win.removeEventListener('error', onError); win.removeEventListener('unhandledrejection', onRejection); doc.removeEventListener('click', onAction, true); doc.removeEventListener('change', onAction, true); win.removeEventListener('pagehide', flush); doc.removeEventListener('visibilitychange', hidden); };
}
