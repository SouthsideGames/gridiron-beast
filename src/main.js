// App bootstrap: holds the franchise state, persists it and wires screens.

import * as Router from './ui/router.js';
import * as Save from './franchise/save.js';
import { idbBackend, classify, saveMeta } from './franchise/store.js';
import { createSlotManager } from './franchise/slots.js';
import { isArchived, retirementDue, retirementChecklist, finalizeArchive } from './franchise/lifecycle.js';
import { addHofCard, linkHofCards, relinkHofCards } from './franchise/hall-of-fame.js';
import { linkAchievements, relinkAchievements } from './franchise/achievement-store.js';
import { restoreThenAdopt, replaceThenAdopt, legacyReplaceThenAdopt, shouldMirror } from './franchise/activation.js';
import { registerRecoveryScreen, showSaveFailure, saveStatusText, showStaleTab } from './ui/storage-ui.js';
import { cloudLoad, cloudSave, cloudFlush, cloudClear, cloudStatus, cloudLoadDex, cloudSaveDex, cloudLoadHof, cloudSaveHof, cloudLoadAchievements, cloudSaveAchievements } from './franchise/cloud-save.js';
import { setAchievementMirror, mergeAchievements, achievementsData } from './franchise/achievement-store.js';
import { setHofMirror, mergeHof, hallOfFame } from './franchise/hall-of-fame.js';
import { registerFranchisesScreens } from './ui/screens/franchises.js';
import { registerLegacyScreens } from './ui/screens/legacy.js';
import { registerLeagueHubScreens } from './ui/screens/league-hub.js';
import { registerCareerScreens } from './ui/screens/career.js';
import { registerCaptainScreens } from './ui/screens/captains.js';
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
  slots: null, // the three-slot manager (GDD §42.5); `slot` is the one being played
  slot: 1,
  recovery: null, // set when the save failed its checks at start: the recovery screen lists the backups
  get settings() { return this.f?.settings || this.defaultSettings; },
  defaultSettings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, liveClock: false, difficulty: 'pro' },
  /**
   * Save the franchise. Returns a promise of { ok, savedAt } once the write is committed, or { ok: false, error }. Callers
   * that only need "save soon" can ignore it, as before: the store queues and orders every request.
   */
  save({ immediate = false, archive = false } = {}) {
    if (!this.f) return Promise.resolve({ ok: false, error: { code: 'none', message: 'No franchise.' } });
    const f = this.f;
    if (isArchived(f) && !archive) return Promise.resolve({ ok: false, error: { code: 'read-only', message: 'This franchise is a read-only archive.' } }); // GDD §42.4 step 7
    // A finished game or a new day is written at once; everything else is batched.
    const sig = `${f.season?.year}|${f.season?.week}|${f.season?.day}|${f.game ? (f.game.state?.finished ? 'done' : 'live') : 'none'}|${f.roster?.length}`;
    const important = sig !== this.lastSig; this.lastSig = sig;
    let p;
    if (this.storage.store) p = this.storage.store.save(f, { immediate: immediate || important });
    else if (this.storage.mode === 'legacy') { const ok = Save.save(f); const json = ok ? JSON.stringify(f) : null; p = Promise.resolve(ok ? { ok: true, savedAt: f.savedAt, snapshot: { savedAt: f.savedAt, uid: f.uid ?? null, schemaVersion: f.schemaVersion, json: () => json } } : { ok: false, error: { code: 'legacy', message: 'Saving to this device failed (browser storage is full or blocked).' } }); }
    else p = Promise.resolve({ ok: false, error: { code: 'starting', message: 'Storage is still starting.' } });
    // Invariant A: the cloud receives only what was committed locally: the committed snapshot, never the live object.
    return p.then((r) => { saveOutcome(r); if (shouldMirror(r) && r.snapshot) cloudSave(r.snapshot, { immediate: important || archive, createdAt: f.createdAt, archive, meta: cloudMeta(f) }); return r; });
  },
  /**
   * Start playing a new franchise `f` (onboarding, the prototype import). The same commit-first path as every other
   * activation (replaceFranchise): the replaced franchise is copied, `f` is committed, and only then does `f` become active and
   * go to the cloud. On failure the current franchise stays active and the caller shows the reason.
   */
  setFranchise(f) { return this.replaceFranchise(f, { copyKind: 'replaced' }); },
  /**
   * Restore a backup by id. The current franchise stays active until the restored one is committed locally; only then is it
   * adopted and mirrored to the cloud. On failure nothing changes: { ok: false, error }.
   */
  async restoreBackup(id) {
    if (id === 'cloud') { const f = this.cloudCandidate; if (!f) return { ok: false, error: { code: 'invalid', message: 'The cloud copy is no longer available.' } }; const r = await this.replaceFranchise(f, { copyKind: 'pre-restore', mirror: false }); if (r.ok) this.cloudCandidate = null; return r; }
    if (!this.storage.store) return { ok: false, error: { code: 'legacy', message: 'Backups need the game database, which this browser did not open.' } };
    return restoreThenAdopt({ store: this.storage.store, current: this.f, id, adopt, mirror: (snap) => cloudSave(snap, { immediate: true, createdAt: this.f?.createdAt, meta: cloudMeta(this.f) }) });
  },
  /**
   * Replace the active franchise with `f` (an import, the v39.1 weekly backup, the cloud copy), committing it first. The
   * replaced franchise is kept as a `copyKind` backup. On failure the current franchise stays active and nothing is mirrored.
   */
  async replaceFranchise(f, { copyKind = 'replaced', mirror = true, guard = null } = {}) {
    const mirrorFn = mirror ? (snap) => cloudSave(snap, { immediate: true, createdAt: this.f?.createdAt, meta: cloudMeta(this.f) }) : () => {}; // runs after adopt: this.f is the new franchise
    if (this.storage.store) return replaceThenAdopt({ store: this.storage.store, current: this.f, franchise: f, copyKind, guard, adopt, mirror: mirrorFn });
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
    if (this.storage.store && f) { try { const del = (await this.storage.store.listBackups()).find((b) => b.kind === 'deleted' && b.ok && (b.meta?.club === f.club)); if (del) this.slots?.noteDeletion({ slot: this.slot, backupId: del.id, uid: f.uid, club: f.club, meta: del.meta }); } catch { /* no undo offer, the backup itself stays */ } }
    await cloudClear(f); // every cloud copy of this franchise saved up to now becomes invalid (GDD §43.8)
    return { ok: true };
  },
  /** The slot cards (GDD §42.5), read from storage. */
  slotSummaries() { return this.slots ? this.slots.summaries() : Promise.resolve([]); },
  /**
   * Play another slot: the current franchise is saved and left where it is; the other slot's store is opened and its franchise
   * (or recovery, or nothing) becomes current. Returns the open result.
   */
  async switchSlot(slot) {
    if (!this.slots) return { ok: false, error: { code: 'starting', message: 'Storage is still starting.' } };
    if (this.f) { await this.save({ immediate: true }); await cloudFlush(); }
    if (this.storage.store) { await this.storage.store.flush?.(); unsubscribeStore?.(); unsubscribeStore = null; }
    this.f = null; this.lastSig = null; this.recovery = null; this.cloudCandidate = null; staleShown = false;
    const store = this.slots.store(slot); const res = await store.open();
    if (res.mode !== 'legacy' && res.franchise) await keepPreLeagueCopy(res.franchise, store);
    this.slot = slot; this.slots.setActiveSlot(slot);
    this.storage = { mode: res.mode === 'legacy' ? 'legacy' : 'indexeddb', store: res.mode === 'legacy' ? null : store, error: res.error || null };
    if (store && res.mode !== 'legacy') unsubscribeStore = store.onStatus(onStoreStatus);
    if (res.mode === 'recovery') { this.recovery = res; Router.go('recovery', {}, { reset: true }); return { ok: true, mode: 'recovery' }; }
    if (res.franchise) adopt(res.franchise);
    reconcileCloud();
    return { ok: true, mode: res.mode, franchise: res.franchise || null };
  },
  /** Start a new franchise in an empty slot: the slot becomes current and onboarding runs there (GDD §42.5 Creating). */
  async createIn(slot) {
    const { list } = await this.slots.slotFor(); const s = list.find((x) => x.slot === slot);
    if (!s || s.state !== 'empty') return { ok: false, error: { code: 'occupied', message: `Slot ${slot} is not empty. Delete or export its franchise first.` } };
    const r = await this.switchSlot(slot); if (!r.ok) return r;
    Router.go('onboarding', { fresh: true }, { reset: true }); return { ok: true };
  },
  /** Import a validated franchise into an empty slot (GDD §42.5 Importing); the slot becomes current. */
  async importInto(slot, franchise) {
    const { list } = await this.slots.slotFor(); const s = list.find((x) => x.slot === slot);
    if (!s || s.state !== 'empty') return { ok: false, error: { code: 'occupied', message: `Slot ${slot} is not empty.` } };
    const r = await this.switchSlot(slot); if (!r.ok) return r;
    return this.replaceFranchise(franchise, { copyKind: 'replaced' });
  },
  /** Delete the franchise in `slot` (export first and confirmation are the screen's job). Keeps a 'deleted' backup; undo for this launch. */
  async deleteSlot(slot) {
    if (slot === this.slot) return this.reset();
    const store = this.slots.store(slot); const res = await store.open();
    const f = res.franchise; if (!f) return { ok: false, error: { code: 'empty', message: 'That slot holds no readable franchise.' } };
    try { await store.remove(f); } catch (e) { return { ok: false, error: classify(e) }; }
    try { const del = (await store.listBackups()).find((b) => b.kind === 'deleted' && b.ok); if (del) this.slots.noteDeletion({ slot, backupId: del.id, uid: f.uid, club: f.club, meta: del.meta }); } catch { /* ignore */ }
    await cloudClear(f);
    return { ok: true };
  },
  /** Undo the deletion made in this launch (decision N): the deleted copy goes back into its slot. */
  async undoDelete() {
    const u = this.slots.pendingUndo(); if (!u) return { ok: false, error: { code: 'none', message: 'Nothing to undo.' } };
    const r = await this.switchSlot(u.slot); if (!r.ok) return r;
    const back = await restoreThenAdopt({ store: this.storage.store, current: this.f, id: u.backupId, adopt, mirror: (snap) => cloudSave(snap, { immediate: true, createdAt: this.f?.createdAt, meta: cloudMeta(this.f) }) });
    if (back.ok) this.slots.clearUndo();
    return back;
  },
  /**
   * Retire the current franchise (GDD §42.4): only after a settled season, by reason 'season-cap' | 'voluntary' | 'fired'.
   * A Hall of Fame card is written when the checklist is met (decision L). The archive is committed once, then mirrored.
   */
  async archive({ reason } = {}) {
    const f = this.f; if (!f) return { ok: false, error: { code: 'none', message: 'No franchise.' } };
    const why = reason || retirementDue(f); if (!why) return { ok: false, error: { code: 'not-due', message: 'Retirement is not due: the season must be complete first.' } };
    const check = retirementChecklist(f); if (!check.ready) return { ok: false, error: { code: 'unsettled', message: `Finish the season first: ${check.missing.join('; ')}.` } };
    const before = structuredClone(f); // the archive must be stored before anything else happens; if it cannot, nothing changes
    let card = null; try { const r = F.retire(f); if (r.ok) card = r.card; } catch { card = null; }
    const r = finalizeArchive(f, { reason: why, hofCard: card });
    if (!r.ok) { Object.assign(f, before); return { ok: false, error: { code: 'unsettled', message: r.reason } }; }
    const saved = await this.save({ immediate: true, archive: true });
    if (!saved.ok) { for (const k of Object.keys(f)) if (!(k in before)) delete f[k]; Object.assign(f, before); this.lastSig = null; return { ok: false, error: saved.error || { code: 'save', message: 'The archive could not be saved.' }, saveFailed: true }; }
    if (card) addHofCard(card);
    this.lastSig = null;
    return { ok: true, status: r.status, legacy: r.legacy, card };
  },
};

/** The display fields a cloud copy carries for the Franchises screen (GDD §42.5): never more than this. */
function cloudMeta(f) { if (!f) return null; const m = saveMeta(f); return { club: m.club, owner: m.owner, year: m.year, week: m.week, seasons: m.seasons, record: m.record, titles: m.titles, status: f.lifecycle?.legacy ? f.lifecycle.status : 'active' }; }
let failing = false;
function saveOutcome(r) {
  if (r?.ok) { if (failing) { failing = false; toast('Saved.', 'good'); } return; }
  if (!r || r.error?.code === 'none' || r.error?.code === 'stale') return;
  failing = true; showSaveFailure(app, r.error);
}

function applySettings() { document.documentElement.dataset.reducedMotion = app.settings.reducedMotion ? '1' : '0'; }

function tabs(ctx, screenName) {
  if (!app.f || !ctx.inFranchise || isArchived(app.f)) return null; // an archive shows the Legacy shell, not the weekly tabs
  const items = [['hq', 'HQ', '🏠'], ['roster', 'Roster', '🐾'], ['playbook', 'Plays', '📋'], ['league', 'League', '🏆'], ['more', 'More', '☰']];
  const counts = {}; for (const n of F.notices(app.f)) counts[n.screen] = (counts[n.screen] || 0) + 1;
  if (devNoticesOn(app.settings)) counts.more = (counts.more || 0) + reviewQueue().total + cardMismatches().length; // developer reviews (GDD §23.7)
  return items.map(([screen, label, icon]) => ({ screen, label, icon, badge: counts[screen] || 0, active: screenName === screen || (ctx.tabOf?.[screenName] === screen) }));
}

export function start() {
  if (globalThis.__gbRefreshing) return; // src/fresh.js is refreshing an older release's cached files: nothing is read or saved first
  globalThis.__gb = app; // test hook: the UI check reaches the franchise state through it
  Router.init({ root: $('#app'), context: () => ({ app, f: app.f, inFranchise: !!app.f, tabOf: TAB_OF }), tabs,
    tip: (ctx, name) => (ctx.f ? tipHtml(ctx.f, name) : ''), mounted: (ctx, name) => { if (ctx.f) maybeSheetTip(ctx.f, name, () => app.save()); }, help: (ctx, name) => (ctx.f ? helpButtonHtml(name) : '') });
  initTutorial({ app, Router, openStats: () => openStatGuide() });
  registerMenuScreens(Router, app);
  registerOnboardingScreens(Router, app);
  registerHqScreens(Router, app);
  registerRosterScreens(Router, app);
  registerCaptainScreens(Router, app); // Captain Partnerships (GDD §27.4B)
  registerMatchScreens(Router, app);
  registerPracticeScreens(Router, app);
  registerAbilityAudit(Router, app);
  registerClashLab(Router, app); // Beast Clash developer tools
  registerClashBattle(Router, app); // Beast Clash in Franchise Mode: Tuesday encounters, the pregame Clash and the overtime Clash (GDD §26)
  registerAbilityBalance(Router);
  // "▶ See it" buttons anywhere (monster card, scout reports, free agents, sheets): one listener for all of them.
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-see-it]'); if (!b) return; e.preventDefault(); e.stopPropagation(); openAbilityPreview(app.settings, b.dataset.seeIt); }, true);
  // Career links anywhere (awards, news, the draft, free agency, the Hall of Fame): one listener opens a monster's career by id (GDD §40.5).
  installCareerLinks(() => app.f, (screen, params) => Router.go(screen, params), { current: () => Router.currentScreen() });
  registerDexScreens(Router, app);
  registerCeremony(Router, app); // the Beast Bowl ceremony (GDD §35)
  registerRecoveryScreen(Router, app);
  registerFranchisesScreens(Router, app); // the three-slot manager (GDD §42.5)
  registerLeagueHubScreens(Router, app); // the League Hub (GDD §46)
  registerCareerScreens(Router, app); // full-screen career profiles (GDD §48)
  registerLegacyScreens(Router, app); // the read-only archive shell (GDD §42.7)
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
  const leaving = () => { if (!app.f || isArchived(app.f)) return; app.save({ immediate: true }); if (app.storage.store) app.storage.store.journal(app.f); cloudFlush(); };
  window.addEventListener('beforeunload', leaving);
  window.addEventListener('pagehide', leaving);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving(); else checkOtherTabs(); });
  window.addEventListener('focus', checkOtherTabs);
}

/**
 * When this tab comes back to the front, check whether another tab or window changed the franchise meanwhile. If so, this tab
 * cannot save over it (the store would refuse), so the player is told at once, before playing on: reload to continue from
 * the newest save, or export what this tab holds first.
 */
let staleShown = false;
async function checkOtherTabs() {
  const st = app.storage.store; if (!st || !app.f || staleShown) return;
  if (!(await st.isStale())) return;
  staleShown = true; showStaleTab(app, () => { staleShown = false; });
}

let unsubscribeStore = null;
/**
 * Persistent AI rosters (GDD §42.6, schema 8): an active franchise from v40 or before gets its league registry the first time
 * this build adopts it (adopt, below), built from the very rosters it was facing; the capture is verified on the copy and
 * rolled back on any problem, in which case the game plays on with the generated rosters and says so in the boot notes.
 * Before the slot's live save is migrated at start, the save as it was is kept as a named backup ('pre-league', restorable
 * from the slot's backups); restores, imports and cloud copies already keep the previous franchise by their own rules.
 * Archives are never touched.
 */
async function keepPreLeagueCopy(f, store) {
  if (!f || F.hasLeague(f) || isArchived(f) || !store) return;
  try { await store.keepCopy(structuredClone(f), 'pre-league'); } catch (e) { app.bootInfo?.notes?.push(`pre-league copy not kept: ${e.message}`); }
}
function migrateLeague(f) {
  if (!f || F.hasLeague(f) || isArchived(f)) return;
  let r; try { r = F.ensureLeague(f); } catch (e) { r = { ok: false, problems: [e?.message || String(e)] }; } // never in the way of opening the franchise
  (app.bootInfo?.notes || []).push(r.ok ? `league registry built (${r.rekeyed.length} re-keyed)` : `league registry not built: ${r.problems[0]}`);
  if (r.ok && !holdLeagueSave) queueMicrotask(() => { if (app.f === f) app.save({ immediate: true }); });
  else if (r.ok) heldLeagueSave = f; // a migration boot: saved once the cloud has been compared (reconcileCloud), GDD §47.4
}
// On the boot that migrates a v39 save, the league registry's first save waits until reconcileCloud has compared the cloud copy:
// saving first would stamp a stale copy as the newest and upload it over progress another device already sent for this franchise.
let holdLeagueSave = false; let heldLeagueSave = null;
async function flushHeldLeagueSave() { const f = heldLeagueSave; heldLeagueSave = null; holdLeagueSave = false; if (f && app.f === f) await app.save({ immediate: true }); }
function adopt(f) { migrateLeague(f); app.f = f; app.lastSig = null; applySettings(); mergeDex(f.dex); F.syncAchievementsToGlobal(f); if (f.uid && f.seed != null) { linkHofCards({ uid: f.uid, seed: f.seed }); linkAchievements({ uid: f.uid, seed: f.seed }); } }

/** Open storage, migrate the v39.1 save on first run, then load (or stop at recovery). Then reconcile with the cloud copy. */
async function boot() {
  const t0 = performance.now();
  let res = null; let playedAt = null;
  try {
    app.slots = createSlotManager({ backend: await idbBackend(), debounce: 1200 }); app.slots.newLaunch();
    app.slot = app.slots.activeSlot(); const store = app.slots.store(app.slot);
    res = await store.open();
    if (res.source === 'migrated') { playedAt = res.franchise?.savedAt ?? null; holdLeagueSave = true; } // read before anything below writes the franchise
    if (res.mode !== 'legacy' && res.franchise) await keepPreLeagueCopy(res.franchise, store); // before the storage is announced as ready: nothing reads the franchise yet
    if (res.mode === 'legacy') app.storage = { mode: 'legacy', store: null, error: res.error }; // migration failed: v39.1 path, the save untouched
    else { app.storage = { mode: 'indexeddb', store, error: null }; unsubscribeStore = store.onStatus(onStoreStatus); }
  } catch (e) {
    app.storage = { mode: 'legacy', store: null, error: classify(e) };
    res = { mode: 'legacy', franchise: Save.load(), notes: [`indexeddb unavailable: ${e.message}`] };
  }
  app.bootInfo = { ms: Math.round(performance.now() - t0), source: res.source || res.mode, notes: res.notes || [] };
  // A save migrated on this boot is compared with the cloud by the time it was last really saved (in v39), not by the stamp
  // the migration's own writes give it: otherwise a stale copy on a second device would look newer than the progress another
  // device already uploaded under the same franchise id (GDD §47.4).
  if (res.mode === 'recovery') { app.recovery = res; Router.go('recovery', {}, { reset: true }); }
  else { if (res.franchise) adopt(res.franchise); Router.go('menu', {}, { reset: true }); }
  app.slotCount = (await app.slotSummaries().catch(() => [])).filter((s) => s.state !== 'empty').length;
  if (res.source === 'migrated') toast('Your franchise moved to the new save storage. Your previous save is kept untouched.', 'good', 4500);
  else if (res.notes?.includes('legacy-newer kept')) toast('An older copy of the game saved progress on this device after the update. Your franchise was kept; the other save is under Settings → Save data → Restore a backup.', 'info', 6500);
  else if (app.storage.mode === 'legacy' && app.storage.error) toast('Saving in fallback mode on this browser (see Settings → Save data).', 'info', 4500);
  reconcileCloud({ playedAt });
}

/**
 * Send the cloud what is already committed on this device: a verified snapshot read back from storage, so nothing is written
 * locally and only committed state is uploaded (invariant A). In fallback storage the v39.1 path saves and mirrors as before.
 */
async function mirrorCommitted() {
  const st = app.storage.store;
  if (!st) { if (app.storage.mode === 'legacy' && app.f) await app.save({ immediate: true }); return; }
  const snap = await st.committedSnapshot(); if (snap) cloudSave(snap, { immediate: true, createdAt: app.f?.createdAt, archive: isArchived(app.f), meta: cloudMeta(app.f) });
}

/** The cloud copy wins only when it is newer; the local franchise is kept as a backup first, so it is never lost. */
async function reconcileCloud(opts = {}) {
  try { await reconcileCloudInner(opts); } finally { await flushHeldLeagueSave(); } // whatever happened, the local franchise's league is saved unless the cloud copy replaced it
}
async function reconcileCloudInner({ playedAt = null } = {}) {
  const others = app.f ? [] : (await app.slotSummaries().catch(() => [])).filter((s) => s.slot !== app.slot && s.uid).map((s) => ({ uid: s.uid }));
  const remote = await cloudLoad(app.f ? { uid: app.f.uid, createdAt: app.f.createdAt } : null, { exclude: others }); // this slot's franchise; an empty slot never takes one another slot holds
  const f = remote && Save.migrate(remote);
  if (!f) { await flushHeldLeagueSave(); if (app.f && cloudStatus().state === 'on') await mirrorCommitted(); return; } // an empty cloud receives the committed save
  if (app.recovery) { // never chosen for the player: the cloud copy is offered on the recovery screen
    app.cloudCandidate = f;
    app.recovery.backups = [{ id: 'cloud', kind: 'cloud', savedAt: f.savedAt, meta: saveMeta(f), ok: true }, ...(app.recovery.backups || [])];
    if (Router.currentScreen()?.name === 'recovery') Router.render();
    return;
  }
  const mineAt = playedAt ?? app.f?.savedAt ?? 0;
  if (!app.f || (f.savedAt || 0) > mineAt) {
    const st = app.storage.store; const local = app.f; const localAt = local?.savedAt;
    if (local && !st) { // fallback storage has no backups: the player chooses, the device's copy is never replaced silently
      if (!(await confirmSheet(`Your cloud save (${f.club}, saved ${new Date(f.savedAt).toLocaleString()}) is newer than the franchise on this device. Load the cloud save? This device's copy will be replaced; export it first from Settings if you want to keep it.`, { title: 'Newer cloud save', okLabel: 'Load cloud save' }))) return;
    }
    if (st && !f.uid && local?.uid && local.createdAt === f.createdAt) f.uid = local.uid;
    // Committed locally first (with the device's copy kept as 'pre-cloud'), adopted only after that commit succeeded.
    // Invariant F: the guard is rechecked inside the store's exclusive operation, right before and right after the commit; if
    // the player has played on (or switched franchise) by then, this device's newer progress stays and the cloud copy is not used.
    const guard = () => app.f === local && (!local || local.savedAt === localAt);
    const r = await app.replaceFranchise(f, { copyKind: 'pre-cloud', mirror: false, guard });
    // The cloud copy of this same franchise (same creation stamp and seed) under another uid: this device migrated its own v39
    // copy before learning the uid another device gave it. The cloud's uid is kept, and this device's records follow it.
    if (r.ok && local?.uid && f.uid && local.uid !== f.uid && local.createdAt === f.createdAt && local.seed === f.seed) { relinkAchievements({ from: local.uid, to: f.uid }); relinkHofCards({ from: local.uid, to: f.uid }); }
    if (r.ok && heldLeagueSave !== app.f) heldLeagueSave = null; // the migrated copy was replaced (kept as 'pre-cloud'): its held save is dropped; a v39-layout cloud copy just adopted keeps its own, saved below
    if (!r.ok && r.error?.code === 'superseded') { toast('You kept playing on this device, so its newer progress was kept instead of the cloud copy.', 'info', 4500); if (app.f) { await app.save({ immediate: true }); await mirrorCommitted(); } return; }
    if (!r.ok) { toast(`Your cloud save is newer, but it could not be stored on this device (${r.error?.message || 'unknown error'}). This device's franchise is unchanged.`, 'bad', 6000); return; }
    const scr = Router.currentScreen()?.name;
    if (!scr || scr === 'menu') Router.go('menu', {}, { reset: true });
    toast('Restored your franchise from your cloud save (this device\'s copy is kept under Restore a backup).', 'good', 4500);
  } else if ((f.savedAt || 0) < mineAt) { await flushHeldLeagueSave(); await mirrorCommitted(); } // this device is newer: the cloud catches up
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
