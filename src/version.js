// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v38.1-league-news', date: '2026-10-22', branch: 'league-news-fixes' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
