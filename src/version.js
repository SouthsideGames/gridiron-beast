// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v39.0-career-presentation', date: '2026-10-22', branch: 'career-presentation' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
