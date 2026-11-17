// UI lifecycle only. Never changes a result, consumes RNG or simulates a play.
let interrupted = false;
export const activityPaused = () => interrupted || !!globalThis.document?.hidden;
export function pauseActivity() { interrupted = true; }
export function resumeActivity() { interrupted = false; }
export function installActivityLifecycle({ app, Router }) {
  const pause = () => {
    if (!app.f?.game && Router.currentScreen()?.name !== 'clash-battle') return;
    pauseActivity();
    (app.f.polish ||= {}).playbackPaused = true;
    globalThis.dispatchEvent?.(new Event('gb-playback-pause'));
    app.save({ immediate: true });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (interrupted) Router.render();
  });
  globalThis.addEventListener?.('gb-app-state', e => {
    if (e.detail?.isActive === false) pause(); else if (interrupted) Router.render();
  });
}
