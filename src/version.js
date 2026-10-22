// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v37.0-stadiums-replays-legendary', date: '2026-10-22', branch: 'stadiums-replays-legendary' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
