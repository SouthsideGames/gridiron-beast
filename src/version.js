// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v31.6-clash-gateb2', date: '2026-10-21', branch: 'beast-clash-p1' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
