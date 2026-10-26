// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
// `test` is false in the repository and in every released build; a private TEST publish flips it to enable developer-only
// shortcuts (GDD §42.10). The released game never shows them.
export const BUILD = Object.freeze({ version: 'v42.7.0-attribute-lab', date: '2026-10-25', branch: 'attribute-audit', test: false });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
