// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v39.2-storage-foundation', date: '2026-10-23', branch: 'storage-foundation' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
