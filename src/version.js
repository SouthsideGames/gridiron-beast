// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v29.6-polish', date: '2026-10-19', branch: 'polish-2.0' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
