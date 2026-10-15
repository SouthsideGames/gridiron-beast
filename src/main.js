// App bootstrap: holds the franchise state, persists it and wires screens.

import * as Router from './ui/router.js';
import * as Save from './franchise/save.js';
import { cloudLoad, cloudSave, cloudFlush, cloudClear, cloudLoadDex, cloudSaveDex } from './franchise/cloud-save.js';
import { setDexMirror, mergeDex, dexData } from './franchise/dex-store.js';
import { $, toast } from './ui/dom.js';
import { registerMenuScreens } from './ui/screens/menu.js';
import { registerOnboardingScreens } from './ui/screens/onboarding.js';
import { registerHqScreens } from './ui/screens/hq.js';
import { registerRosterScreens } from './ui/screens/roster.js';
import { registerMatchScreens } from './ui/screens/match.js';
import { registerPracticeScreens } from './ui/screens/practice.js';
import { registerDexScreens } from './ui/screens/dex.js';

const app = {
  f: null, // the franchise state (null before creation)
  get settings() { return this.f?.settings || this.defaultSettings; },
  defaultSettings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, liveClock: false, difficulty: 'pro' },
  save() { if (!this.f) return; const ok = Save.save(this.f); cloudSave(this.f); if (!ok && !this.warned) { this.warned = true; toast('Saving to this device failed; your cloud save is still kept.', 'bad'); } },
  setFranchise(f) { this.f = f; this.save(); applySettings(); },
  reset() { this.f = null; Save.clear(); cloudClear(); },
};

function applySettings() { document.documentElement.dataset.reducedMotion = app.settings.reducedMotion ? '1' : '0'; }

function tabs(ctx, screenName) {
  if (!app.f || !ctx.inFranchise) return null;
  const items = [['hq', 'HQ', '🏠'], ['roster', 'Roster', '🐾'], ['playbook', 'Plays', '📋'], ['league', 'League', '🏆'], ['more', 'More', '☰']];
  return items.map(([screen, label, icon]) => ({ screen, label, icon, active: screenName === screen || (ctx.tabOf?.[screenName] === screen) }));
}

export function start() {
  globalThis.__gb = app; // test hook: the UI check reaches the franchise state through it
  Router.init({ root: $('#app'), context: () => ({ app, f: app.f, inFranchise: !!app.f, tabOf: TAB_OF }), tabs });
  registerMenuScreens(Router, app);
  registerOnboardingScreens(Router, app);
  registerHqScreens(Router, app);
  registerRosterScreens(Router, app);
  registerMatchScreens(Router, app);
  registerPracticeScreens(Router, app);
  registerDexScreens(Router, app);
  const saved = Save.load();
  if (saved) { app.f = saved; applySettings(); mergeDex(saved.dex); }
  // The player's dex lives outside the franchise and is mirrored to the cloud like the save.
  setDexMirror((d) => cloudSaveDex(d));
  cloudLoadDex().then((remote) => { if (remote) mergeDex(remote); if (dexData().updatedAt > (remote?.updatedAt || 0)) cloudSaveDex(dexData()); });
  Router.go('menu', {}, { reset: true });
  // The cloud copy wins when it is newer (e.g. the device's storage was cleared while the app sat in the background).
  cloudLoad().then((remote) => {
    const f = remote && Save.migrate(remote);
    if (!f) { if (app.f) cloudSave(app.f, { immediate: true }); return; }
    if (!app.f || (f.savedAt || 0) > (app.f.savedAt || 0)) {
      app.f = f; Save.save(f); applySettings(); mergeDex(f.dex);
      if (!Router.currentScreen() || Router.currentScreen().name === 'menu') Router.go('menu', {}, { reset: true });
      toast('Restored your franchise from your cloud save.', 'good');
    }
  });
  window.addEventListener('beforeunload', () => { app.save(); cloudFlush(); });
  window.addEventListener('pagehide', () => { app.save(); cloudFlush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { app.save(); cloudFlush(); } });
}

/** Which bottom tab a secondary screen belongs to. */
export const TAB_OF = {
  hq: 'hq', commissioner: 'hq', postseason: 'hq', legend: 'hq', scout: 'hq', recruit: 'hq', training: 'hq', scoutopp: 'hq', gameplan: 'playbook', lineup: 'roster', pregame: 'hq', match: 'hq',
  roster: 'roster', monster: 'roster', assign: 'roster', contracts: 'roster', staff: 'more',
  playbook: 'playbook', playdetail: 'playbook', practice: 'playbook', audit: 'more',
  league: 'league', schedule: 'league', standings: 'league', history: 'league',
  more: 'more', settings: 'more', developer: 'more', about: 'more', dex: 'more',
};

start();
