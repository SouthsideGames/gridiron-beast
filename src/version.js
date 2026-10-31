// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
// `test` is false in the repository and in every released build; a private TEST publish flips it to enable developer-only
// shortcuts (GDD §42.10). The released game never shows them.
export const BUILD = Object.freeze({ version: 'v42.18.1-dev.a2', date: '2026-10-31', branch: 'task6-phase-a2', test: true, release: false }); // release: true in the finished game hides every development-only display (QB reads, ...)
/** Development-only displays (QB reads in games, ...) exist only while the game is in development. */
export const devDisplaysAllowed = () => !BUILD.release;
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
