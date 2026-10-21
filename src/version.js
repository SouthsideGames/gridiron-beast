// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v30.4-playbook', date: '2026-10-20', branch: 'playbook-expansion' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
