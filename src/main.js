// App bootstrap: holds the franchise state, persists it and wires screens.

import * as Router from './ui/router.js';
import * as Save from './franchise/save.js';
import { cloudLoad, cloudSave, cloudFlush, cloudClear, cloudLoadDex, cloudSaveDex, cloudLoadHof, cloudSaveHof, cloudLoadAchievements, cloudSaveAchievements } from './franchise/cloud-save.js';
import { setAchievementMirror, mergeAchievements, achievementsData } from './franchise/achievement-store.js';
import { setHofMirror, mergeHof, hallOfFame } from './franchise/hall-of-fame.js';
import { tipHtml, maybeSheetTip, initTutorial, helpButtonHtml } from './ui/tutorial.js';
import { openStatGuide } from './ui/stat-guide.js';
import * as F from './franchise/franchise.js';
import { setDexMirror, mergeDex, dexData } from './franchise/dex-store.js';
import { $, toast } from './ui/dom.js';
import { registerMenuScreens } from './ui/screens/menu.js';
import { registerOnboardingScreens } from './ui/screens/onboarding.js';
import { registerHqScreens } from './ui/screens/hq.js';
import { registerRosterScreens } from './ui/screens/roster.js';
import { registerMatchScreens } from './ui/screens/match.js';
import { registerCeremony } from './ui/screens/ceremony.js';
import { registerPracticeScreens } from './ui/screens/practice.js';
import { registerAbilityAudit, openAbilityPreview, registerAbilityBalance } from './ui/screens/ability-audit.js';
import { registerClashLab } from './ui/screens/clash-lab.js';
import { registerClashBattle } from './ui/screens/clash-battle.js';
import { reviewQueue, devNoticesOn, freshAnnouncement, cardMismatches } from './ui/dev-review.js';
import { syncReviews, onReviews } from './franchise/review-store.js';
import { registerDexScreens } from './ui/screens/dex.js';
import { installCareerLinks } from './ui/career-ui.js';

const app = {
  f: null, // the franchise state (null before creation)
  get settings() { return this.f?.settings || this.defaultSettings; },
  defaultSettings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, liveClock: false, difficulty: 'pro' },
  save() {
    if (!this.f) return; const ok = Save.save(this.f);
    // A finished game or a new day is written to the cloud at once; everything else is throttled.
    const f = this.f; const sig = `${f.season?.year}|${f.season?.week}|${f.season?.day}|${f.game ? (f.game.state?.finished ? 'done' : 'live') : 'none'}|${f.roster?.length}`;
    const important = sig !== this.lastSig; this.lastSig = sig;
    cloudSave(this.f, { immediate: important });
    if (!ok && !this.warned) { this.warned = true; toast('Saving to this device failed; your cloud save is still kept.', 'bad'); }
  },
  setFranchise(f) { this.f = f; this.save(); applySettings(); },
  reset() { this.f = null; Save.clear(); cloudClear(); },
};

function applySettings() { document.documentElement.dataset.reducedMotion = app.settings.reducedMotion ? '1' : '0'; }

function tabs(ctx, screenName) {
  if (!app.f || !ctx.inFranchise) return null;
  const items = [['hq', 'HQ', '🏠'], ['roster', 'Roster', '🐾'], ['playbook', 'Plays', '📋'], ['league', 'League', '🏆'], ['more', 'More', '☰']];
  const counts = {}; for (const n of F.notices(app.f)) counts[n.screen] = (counts[n.screen] || 0) + 1;
  if (devNoticesOn(app.settings)) counts.more = (counts.more || 0) + reviewQueue().total + cardMismatches().length; // developer reviews (GDD §23.7)
  return items.map(([screen, label, icon]) => ({ screen, label, icon, badge: counts[screen] || 0, active: screenName === screen || (ctx.tabOf?.[screenName] === screen) }));
}

export function start() {
  globalThis.__gb = app; // test hook: the UI check reaches the franchise state through it
  Router.init({ root: $('#app'), context: () => ({ app, f: app.f, inFranchise: !!app.f, tabOf: TAB_OF }), tabs,
    tip: (ctx, name) => (ctx.f ? tipHtml(ctx.f, name) : ''), mounted: (ctx, name) => { if (ctx.f) maybeSheetTip(ctx.f, name, () => app.save()); }, help: (ctx, name) => (ctx.f ? helpButtonHtml(name) : '') });
  initTutorial({ app, Router, openStats: () => openStatGuide() });
  registerMenuScreens(Router, app);
  registerOnboardingScreens(Router, app);
  registerHqScreens(Router, app);
  registerRosterScreens(Router, app);
  registerMatchScreens(Router, app);
  registerPracticeScreens(Router, app);
  registerAbilityAudit(Router, app);
  registerClashLab(Router, app); // Beast Clash developer tools
  registerClashBattle(Router, app); // Beast Clash in Franchise Mode: Tuesday encounters, the pregame Clash and the overtime Clash (GDD §26)
  registerAbilityBalance(Router);
  // "▶ See it" buttons anywhere (monster card, scout reports, free agents, sheets): one listener for all of them.
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-see-it]'); if (!b) return; e.preventDefault(); e.stopPropagation(); openAbilityPreview(app.settings, b.dataset.seeIt); }, true);
  // Career links anywhere (awards, news, the draft, free agency, the Hall of Fame): one listener opens a monster's career by id (GDD §40.5).
  installCareerLinks(() => app.f, (screen, params) => Router.go(screen, params));
  registerDexScreens(Router, app);
  registerCeremony(Router, app); // the Beast Bowl ceremony (GDD §35)
  const saved = Save.load();
  if (saved) { app.f = saved; applySettings(); mergeDex(saved.dex); F.syncAchievementsToGlobal(saved); }
  // The player's dex lives outside the franchise and is mirrored to the cloud like the save.
  setDexMirror((d) => cloudSaveDex(d));
  // Achievements belong to the player, not the save (GDD §21.4): mirrored like the dex.
  setAchievementMirror((d) => cloudSaveAchievements(d));
  cloudLoadAchievements().then((remote) => { if (remote) mergeAchievements(remote); if (achievementsData().updatedAt > (remote?.updatedAt || 0) && Object.keys(achievementsData().earned).length) cloudSaveAchievements(achievementsData()); });
  cloudLoadDex().then((remote) => { if (remote) mergeDex(remote); if (dexData().updatedAt > (remote?.updatedAt || 0)) cloudSaveDex(dexData()); });
  setHofMirror((cards) => cloudSaveHof(cards));
  cloudLoadHof().then((remote) => { if (remote) mergeHof(remote); if (hallOfFame().length) cloudSaveHof(hallOfFame()); });
  Router.go('menu', {}, { reset: true });
  // The cloud copy wins when it is newer (e.g. the device's storage was cleared while the app sat in the background).
  cloudLoad().then((remote) => {
    const f = remote && Save.migrate(remote);
    if (!f) { if (app.f) cloudSave(app.f, { immediate: true }); return; }
    if (!app.f || (f.savedAt || 0) > (app.f.savedAt || 0)) {
      app.f = f; Save.save(f); applySettings(); mergeDex(f.dex); F.syncAchievementsToGlobal(f);
      if (!Router.currentScreen() || Router.currentScreen().name === 'menu') Router.go('menu', {}, { reset: true });
      toast('Restored your franchise from your cloud save.', 'good');
    }
  });
  // Developer reviews (GDD §23.7): pull both review sets, then announce anything new once.
  Promise.all([syncReviews('ability'), syncReviews('play')]).finally(() => setTimeout(() => { const msg = freshAnnouncement(app.settings); if (msg) toast(msg, 'good', 5000); Router.render(); }, 1200));
  onReviews(() => { const scr = Router.currentScreen()?.name; if (scr === 'menu' || scr === 'developer' || scr === 'more') Router.render(); });
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
  more: 'more', settings: 'more', developer: 'more', about: 'more', dex: 'more', hof: 'more', achievements: 'more',
};

start();
