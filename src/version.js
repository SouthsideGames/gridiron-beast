// Build label shown in Settings and on the main menu, so a playtest report can say which build it saw.
export const BUILD = Object.freeze({ version: 'v26', date: '2026-10-18', branch: 'prototype-2' });
export const buildLabel = () => `${BUILD.version} · ${BUILD.date}`;
