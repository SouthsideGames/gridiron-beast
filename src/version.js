// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v31.0-clash-p1', date: '2026-10-20', branch: 'beast-clash-p1' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
