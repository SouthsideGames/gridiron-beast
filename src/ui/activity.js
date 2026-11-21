// Background throttling only: returning never requires a Resume Play confirmation.
let nativeInactive = false;
export const activityPaused = () => nativeInactive || !!globalThis.document?.hidden;
export function installActivityLifecycle() {
  let wasPaused = activityPaused();
  const changed = () => {
    const paused = activityPaused();
    if (paused === wasPaused) return;
    wasPaused = paused;
    globalThis.dispatchEvent?.(new Event(paused ? 'gb-playback-pause' : 'gb-playback-resume'));
  };
  document.addEventListener('visibilitychange', changed);
  globalThis.addEventListener?.('gb-app-state', e => {
    nativeInactive = e.detail?.isActive === false;
    changed();
  });
}
