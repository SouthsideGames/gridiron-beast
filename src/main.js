// App bootstrap: holds the franchise state, persists it and wires screens.

import * as Router from './ui/router.js';
import * as Save from './franchise/save.js';
import { createStore, idbBackend, classify, saveMeta } from './franchise/store.js';
import { restoreThenAdopt, replaceThenAdopt, legacyReplaceThenAdopt, shouldMirror } from './franchise/activation.js';
import { registerRecoveryScreen, showSaveFailure, saveStatusText } from './ui/storage-ui.js';
import { cloudLoad, cloudSave, cloudFlush, cloudClear, cloudLoadDex, cloudSaveDex, cloudLoadHof, cloudSaveHof, cloudLoadAchievements, cloudSaveAchievements } from './franchise/cloud-save.js';
import { setAchievementMirror, mergeAchievements, achievementsData } from './franchise/achievement-store.js';
import { setHofMirror, mergeHof, hallOfFame } from './franchise/hall-of-fame.js';
import { tipHtml, maybeSheetTip, initTutorial, helpButtonHtml } from './ui/tutorial.js';
import { openStatGuide } from './ui/stat-guide.js';
import * as F from './franchise/franchise.js';
import { setDexMirror, mergeDex, dexData } from './franchise/dex-store.js';
import { $, toast, confirmSheet } from './ui/dom.js';
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
  // Storage (GDD §43): IndexedDB through the store; 'legacy' is the v39.1 localStorage path, used only when this browser
  // cannot open the database.
  storage: { mode: 'starting', store: null, error: null },
  recovery: null, // set when the save failed its checks at start: the recovery screen lists the backups
  get settings() { return this.f?.settings || this.defaultSettings; },
  defaultSettings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, liveClock: false, difficulty: 'pro' },
  /**
   * Save the franchise. Returns a promise of { ok, savedAt } once the write is committed, or { ok: false, error }. Callers
   * that only need "save soon" can ignore it, as before: the store queues and orders every request.
   */
  save({ immediate = false } = {}) {
    if (!this.f) return Promise.resolve({ ok: false, error: { code: 'none', message: 'No franchise.' } });
    const f = this.f;
    // A finished game or a new day is written at once; everything else is batched.
    const sig = `${f.season?.year}|${f.season?.week}|${f.season?.day}|${f.game ? (f.game.state?.finished ? 'done' : 'live') : 'none'}|${f.roster?.length}`;
    const important = sig !== this.lastSig; this.lastSig = sig;
    let p;
    if (this.storage.store) p = this.storage.store.save(f, { immediate: immediate || important });
    else if (this.storage.mode === 'legacy') { const ok = Save.save(f); p = Promise.resolve(ok ? { ok: true, savedAt: f.savedAt } : { ok: false, error: { code: 'legacy', message: 'Saving to this device failed (browser storage is full or blocked).' } }); }
    else p = Promise.resolve({ ok: false, error: { code: 'starting', message: 'Storage is still starting.' } });
    // The cloud mirror follows the local attempt, never runs ahead of it, and never carries a stale tab's state (shouldMirror).
    return p.then((r) => { saveOutcome(r); if (shouldMirror(r) && this.f === f) cloudSave(f, { immediate: important }); return r; });
  },
  /**
   * Start playing a new franchise `f` (onboarding). The game needs it at once to show the next screen, so it becomes active
   * in memory immediately; in storage the replaced franchise is copied first and `f` is committed after it (store.replace),
   * and the cloud receives `f` only after that commit. If either step fails, the failure sheet says so and the replaced
   * franchise is still the stored one.
   */
  setFranchise(f) {
    const old = this.f; const st = this.storage.store;
    this.f = f; this.lastSig = null; applySettings();
    if (st && old && old !== f) return st.replace(f, old, { copyKind: 'replaced' }).then((r) => { saveOutcome(r); if (r.ok && this.f === f) cloudSave(f, { immediate: true }); return r; });
    return this.save({ immediate: true });
  },
  /**
   * Restore a backup by id. The current franchise stays active until the restored one is committed locally; only then is it
   * adopted and mirrored to the cloud. On failure nothing changes: { ok: false, error }.
   */
  async restoreBackup(id) {
    if (id === 'cloud') { const f = this.cloudCandidate; if (!f) return { ok: false, error: { code: 'invalid', message: 'The cloud copy is no longer available.' } }; const r = await this.replaceFranchise(f, { copyKind: 'pre-restore', mirror: false }); if (r.ok) this.cloudCandidate = null; return r; }
    if (!this.storage.store) return { ok: false, error: { code: 'legacy', message: 'Backups need the game database, which this browser did not open.' } };
    return restoreThenAdopt({ store: this.storage.store, current: this.f, id, adopt, mirror: (f) => cloudSave(f, { immediate: true }) });
  },
  /**
   * Replace the active franchise with `f` (an import, the v39.1 weekly backup, the cloud copy), committing it first. The
   * replaced franchise is kept as a `copyKind` backup. On failure the current franchise stays active and nothing is mirrored.
   */
  async replaceFranchise(f, { copyKind = 'replaced', mirror = true } = {}) {
    const mirrorFn = mirror ? (g) => cloudSave(g, { immediate: true }) : () => {};
    if (this.storage.store) return replaceThenAdopt({ store: this.storage.store, current: this.f, franchise: f, copyKind, adopt, mirror: mirrorFn });
    if (this.storage.mode === 'legacy') return legacyReplaceThenAdopt({ write: (g) => Save.save(g), franchise: f, adopt, mirror: mirrorFn });
    return { ok: false, error: { code: 'starting', message: 'Storage is still starting.' } };
  },
  /** The weekly safety copy taken after each Sunday (v39.1 kept it in localStorage). */
  backup(f = this.f) { if (!f) return; if (this.storage.store) this.storage.store.keepCopy(f, 'weekly').catch(() => {}); else Save.backup(f); },
  /** Delete the live franchise (kept as a 'deleted' backup). Resolves { ok }; on failure nothing is deleted, locally or in the cloud. */
  async reset() {
    const f = this.f;
    if (this.storage.store) { try { await this.storage.store.remove(f); } catch (e) { const err = classify(e); toast(`The franchise was not deleted: ${err.message}`, 'bad', 6000); return { ok: false, error: err }; } }
    else Save.clear();
    this.f = null; this.lastSig = null;
    await cloudClear();
    return { ok: true };
  },
};

let failing = false;
function saveOutcome(r) {
  if (r?.ok) { if (failing) { failing = false; toast('Saved.', 'good'); } return; }
  if (!r || r.error?.code === 'none' || r.error?.code === 'stale') return;
  failing = true; showSaveFailure(app, r.error);
}

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
  registerRecoveryScreen(Router, app);
  // The player's dex lives outside the franchise and is mirrored to the cloud like the save.
  setDexMirror((d) => cloudSaveDex(d));
  // Achievements belong to the player, not the save (GDD §21.4): mirrored like the dex.
  setAchievementMirror((d) => cloudSaveAchievements(d));
  cloudLoadAchievements().then((remote) => { if (remote) mergeAchievements(remote); if (achievementsData().updatedAt > (remote?.updatedAt || 0) && Object.keys(achievementsData().earned).length) cloudSaveAchievements(achievementsData()); });
  cloudLoadDex().then((remote) => { if (remote) mergeDex(remote); if (dexData().updatedAt > (remote?.updatedAt || 0)) cloudSaveDex(dexData()); });
  setHofMirror((cards) => cloudSaveHof(cards));
  cloudLoadHof().then((remote) => { if (remote) mergeHof(remote); if (hallOfFame().length) cloudSaveHof(hallOfFame()); });
  boot();
  // Developer reviews (GDD §23.7): pull both review sets, then announce anything new once.
  Promise.all([syncReviews('ability'), syncReviews('play')]).finally(() => setTimeout(() => { const msg = freshAnnouncement(app.settings); if (msg) toast(msg, 'good', 5000); Router.render(); }, 1200));
  onReviews(() => { const scr = Router.currentScreen()?.name; if (scr === 'menu' || scr === 'developer' || scr === 'more') Router.render(); });
  // Leaving the page: the queued save starts at once, and a copy of what it still has to write goes to the unload journal
  // (localStorage, synchronous) in case the page is gone before the database commits.
  const leaving = () => { if (!app.f) return; app.save({ immediate: true }); if (app.storage.store) app.storage.store.journal(app.f); cloudFlush(); };
  window.addEventListener('beforeunload', leaving);
  window.addEventListener('pagehide', leaving);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving(); });
}

function adopt(f) { app.f = f; app.lastSig = null; applySettings(); mergeDex(f.dex); F.syncAchievementsToGlobal(f); }

/** Open storage, migrate the v39.1 save on first run, then load (or stop at recovery). Then reconcile with the cloud copy. */
async function boot() {
  const t0 = performance.now();
  let res = null;
  try {
    const store = createStore({ backend: await idbBackend(), debounce: 1200 });
    res = await store.open();
    if (res.mode === 'legacy') app.storage = { mode: 'legacy', store: null, error: res.error }; // migration failed: v39.1 path, the save untouched
    else { app.storage = { mode: 'indexeddb', store, error: null }; store.onStatus(onStoreStatus); }
  } catch (e) {
    app.storage = { mode: 'legacy', store: null, error: classify(e) };
    res = { mode: 'legacy', franchise: Save.load(), notes: [`indexeddb unavailable: ${e.message}`] };
  }
  app.bootInfo = { ms: Math.round(performance.now() - t0), source: res.source || res.mode, notes: res.notes || [] };
  if (res.mode === 'recovery') { app.recovery = res; Router.go('recovery', {}, { reset: true }); }
  else { if (res.franchise) adopt(res.franchise); Router.go('menu', {}, { reset: true }); }
  if (res.source === 'migrated') toast('Your franchise moved to the new save storage. Your previous save is kept untouched.', 'good', 4500);
  else if (res.source === 'legacy-newer') toast('Loaded newer progress saved by an older copy of the game. The other version is kept as a backup.', 'info', 5000);
  else if (app.storage.mode === 'legacy' && app.storage.error) toast('Saving in fallback mode on this browser (see Settings → Save data).', 'info', 4500);
  reconcileCloud();
}

/** The cloud copy wins only when it is newer; the local franchise is kept as a backup first, so it is never lost. */
async function reconcileCloud() {
  const remote = await cloudLoad();
  const f = remote && Save.migrate(remote);
  if (!f) { if (app.f) cloudSave(app.f, { immediate: true }); return; }
  if (app.recovery) { // never chosen for the player: the cloud copy is offered on the recovery screen
    app.cloudCandidate = f;
    app.recovery.backups = [{ id: 'cloud', kind: 'cloud', savedAt: f.savedAt, meta: saveMeta(f), ok: true }, ...(app.recovery.backups || [])];
    if (Router.currentScreen()?.name === 'recovery') Router.render();
    return;
  }
  if (!app.f || (f.savedAt || 0) > (app.f.savedAt || 0)) {
    const st = app.storage.store; const local = app.f; const localAt = local?.savedAt;
    if (local && !st) { // fallback storage has no backups: the player chooses, the device's copy is never replaced silently
      if (!(await confirmSheet(`Your cloud save (${f.club}, saved ${new Date(f.savedAt).toLocaleString()}) is newer than the franchise on this device. Load the cloud save? This device's copy will be replaced; export it first from Settings if you want to keep it.`, { title: 'Newer cloud save', okLabel: 'Load cloud save' }))) return;
    }
    if (st && !f.uid && local?.uid && local.createdAt === f.createdAt) f.uid = local.uid;
    // Committed locally first (with the device's copy kept as 'pre-cloud'), adopted only after that commit succeeded.
    const r = await app.replaceFranchise(f, { copyKind: 'pre-cloud', mirror: false });
    if (!r.ok) { toast(`Your cloud save is newer, but it could not be stored on this device (${r.error?.message || 'unknown error'}). This device's franchise is unchanged.`, 'bad', 6000); return; }
    if (local && local.savedAt !== localAt && st) st.keepCopy(local, 'pre-cloud').catch(() => {}); // played on meanwhile: that too is kept
    const scr = Router.currentScreen()?.name;
    if (!scr || scr === 'menu') Router.go('menu', {}, { reset: true });
    toast('Restored your franchise from your cloud save (this device\'s copy is kept under Restore a backup).', 'good', 4500);
  } else if ((f.savedAt || 0) < (app.f.savedAt || 0)) cloudSave(app.f, { immediate: true }); // this device is newer: the cloud catches up
}

function onStoreStatus() {
  const el = document.getElementById('save-status'); if (el) el.innerHTML = saveStatusText(app);
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
