// Phase 2 acceptance (GDD §42.11): a 20-season career, played by the game's own functions, must end in a valid archive.
// Usage: node tools/lifecycle-soak.mjs [seed] [difficulty]
// Checks: Season 20 completes in full; a 21st season is refused with the cap reason; the retirement checklist holds; the
// archive is written; the Legacy summary matches the history; every mutating function is refused; the store commits the
// archive once and refuses any change to it; a Hall of Fame card is written only when the checklist is met.
import { runFranchise } from './franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as L from '../src/franchise/lifecycle.js';
import { createStore, memoryBackend } from '../src/franchise/store.js';

const seed = Number(process.argv[2] || 1); const difficulty = process.argv[3] || 'rookie';
const t0 = Date.now(); const problems = [];
const say = (c, m) => { if (!c) problems.push(m); };
const { f, problems: soak, log } = runFranchise(seed, { seasons: L.SEASON_CAP, difficulty });
problems.push(...soak);
say(f.season.finished, 'season 20 did not finish');
say(f.history.length === L.SEASON_CAP || log.fired, `${f.history.length} seasons in the history`);
while (f.scenes?.length) F.dismissScene(f);
const next = F.startNextSeason(f); say(!next.ok && (next.cap || log.fired), `a 21st season: ${JSON.stringify(next)}`);
const due = L.retirementDue(f); say(due === (log.fired ? 'fired' : 'season-cap'), `retirement due: ${due}`);
const check = L.retirementChecklist(f); say(check.ready, `checklist: ${check.missing.join('; ')}`);
const eligible = F.hallOfFameProgress(f).eligible; let card = null; if (eligible) { const r = F.retire(f); say(r.ok, 'retire() failed although eligible'); card = r.card; }
const backend = memoryBackend(); const store = createStore({ backend, localStorage: null, debounce: 0 }); await store.open();
const live = await store.replace(f, null, {}); say(live.ok, 'the active save did not commit');
const r = L.finalizeArchive(f, { reason: due, hofCard: card }); say(r.ok, `archive: ${r.reason}`);
say(f.lifecycle.status === (log.fired ? 'fired' : 'retired'), `status ${f.lifecycle.status}`);
const lg = f.lifecycle.legacy;
say(lg.seasons.length === f.history.length, 'legacy seasons differ from the history');
say(lg.record.w === f.history.reduce((a, h) => a + h.record.w, 0) && lg.record.l === f.history.reduce((a, h) => a + h.record.l, 0), 'legacy record differs from the history');
say(lg.titles === (f.campaign?.titles || 0), 'legacy titles differ from the campaign');
say((lg.hallOfFame != null) === eligible, `hall of fame card ${lg.hallOfFame} vs eligible ${eligible}`);
say(lg.bestMonsters.every((m) => f.roster.some((x) => x.id === m.id) && m.career), 'best monsters not from the roster or without snapshots');
const snap = JSON.stringify(f); let refused = 0; for (const name of F.MUTATORS) { try { F[name](f); } catch (e) { if (e.code === 'read-only') refused++; } }
say(refused === F.MUTATORS.length, `${refused} of ${F.MUTATORS.length} mutators refused`); say(JSON.stringify(f) === snap, 'a mutator changed the archive');
const a1 = await store.save(f, { immediate: true }); say(a1.ok && a1.manifest.lifecycle.status === f.lifecycle.status, 'the archive did not commit');
f.owner.first = 'Tampered'; const a2 = await store.save(f, { immediate: true }); say(a2.ok === false && a2.error?.code === 'read-only', `the store accepted a change to the archive: ${JSON.stringify(a2.error)}`);
const back = await store.loadManifest(await store.readManifest()); say(back.owner.first !== 'Tampered', 'the stored archive changed');
const bytes = a1.bytes; const seconds = Math.round((Date.now() - t0) / 1000);
console.log(JSON.stringify({ seed, difficulty, seasons: f.history.length, fired: log.fired, record: lg.record, titles: lg.titles, playoffs: lg.playoffAppearances, hofCard: !!lg.hallOfFame, bestMonsters: lg.bestMonsters.length, archiveBytesStored: bytes, mutatorsRefused: refused, seconds, problems }, null, 1));
process.exit(problems.length ? 1 : 0);
