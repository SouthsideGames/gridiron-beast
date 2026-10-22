// Coach Assist 1.0 (GDD §27.3): modes, first-use tips that stay dismissed, Expert without interruptions, help everywhere,
// preferences in the save, old saves, warnings and suggestions that never decide anything, and no effect on the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as A from '../src/franchise/assist.js';
import * as Adv from '../src/franchise/assist-advice.js';

const fresh = (seed = 7) => { const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed }); F.hireDefaultStaff(f); while (F.creationDraftPending(f) && F.onTheClock(f) === f.club) F.passDraftPick(f); return f; };
const fixture = (name) => Save.importJson(fs.readFileSync(new URL(`./fixtures/save-v31-${name}.json`, import.meta.url), 'utf8'));
// Every screen the UI registers (read from the source, so a renamed screen fails this test instead of losing its help).
const SCREENS = new Set(fs.readdirSync(new URL('../src/ui/screens/', import.meta.url)).flatMap((file) => [...fs.readFileSync(new URL(`../src/ui/screens/${file}`, import.meta.url), 'utf8').matchAll(/registerScreen\('([a-z0-9-]+)'/g)].map((m) => m[1])));
const COMPLEX = ['welcome', 'hire', 'hq', 'scout', 'recruit', 'clash-battle', 'training', 'scoutopp', 'gameplan', 'lineup', 'pregame', 'match', 'roster', 'monster', 'offseason', 'contracts', 'draft', 'draftclass', 'playbook', 'league', 'staff'];

test('defaults: a new franchise is Standard with hints and consequence notes on', () => {
  assert.deepEqual(A.assistSettings(fresh()), { mode: 'standard', hints: true, consequences: true });
  assert.deepEqual(A.assistSettings(null), { mode: 'standard', hints: true, consequences: true });
});

test('modes switch at any time, invalid values are refused, and the older switches follow', () => {
  const f = fresh();
  for (const m of A.ASSIST_MODES) { assert.equal(A.setAssist(f, { mode: m }).ok, true); assert.equal(A.assistSettings(f).mode, m); assert.equal(f.settings.tutorial, m !== 'expert'); }
  assert.equal(A.setAssist(f, { mode: 'nightmare' }).ok, false); assert.equal(A.assistSettings(f).mode, 'expert');
  A.setAssist(f, { hints: false, consequences: false }); assert.deepEqual(A.assistSettings(f), { mode: 'expert', hints: false, consequences: false }); assert.equal(f.settings.hints, false);
});

test('preferences are saved with the franchise and survive export/import', () => {
  const f = fresh(); A.setAssist(f, { mode: 'guided', hints: false, consequences: true }); A.dismissTip(f, 'week');
  const g = Save.importJson(Save.exportJson(f));
  assert.deepEqual(A.assistSettings(g), { mode: 'guided', hints: false, consequences: true }); assert.equal(g.tutorial.seen.week, true);
});

test('old saves (before Coach Assist) load with safe defaults; their old switches and dismissed tips carry over', () => {
  for (const name of ['tuesday', 'sunday', 'season2']) {
    const f = fixture(name); assert.ok(!f.settings.assist);
    const a = A.assistSettings(f); assert.ok(A.ASSIST_MODES.includes(a.mode)); assert.equal(typeof a.hints, 'boolean'); assert.equal(a.consequences, true);
  }
  const raw = JSON.parse(Save.exportJson(fresh())); delete raw.franchise.settings.assist; raw.franchise.settings.tutorial = false; raw.franchise.settings.hints = false; raw.franchise.tutorial = { seen: { hq: true, playbook: true, offseason: true } };
  const g = Save.importJson(JSON.stringify(raw));
  assert.deepEqual(A.assistSettings(g), { mode: 'expert', hints: false, consequences: true }, 'tips off → Expert; coaching hints off → hints off');
  assert.ok(g.tutorial.seen.week && g.tutorial.seen.plays && g.tutorial.seen.contracts, 'tips dismissed under their old names stay dismissed');
});

test('first-use tips: Standard shows the brief, Guided adds the steps, Expert shows nothing on any screen', () => {
  const f = fresh();
  const s = A.autoTip(f, 'scout'); assert.equal(s.key, 'scout'); assert.ok(s.text.length > 20); assert.deepEqual(s.steps, []);
  A.setAssist(f, { mode: 'guided' }); const g = A.autoTip(f, 'scout'); assert.ok(g.steps.length >= 2); assert.equal(g.guided, true);
  A.setAssist(f, { mode: 'expert' });
  for (const sc of [...SCREENS]) assert.equal(A.autoTip(f, sc), null, `no automatic tip on ${sc} in Expert`);
  for (const k of A.TOPIC_KEYS) assert.equal(A.momentTip(f, k), null, `no moment tip ${k} in Expert`);
});

test('a dismissed tip stays dismissed across visits, mode changes and save/load; a screen with two topics shows them one at a time', () => {
  const f = fresh(); assert.equal(A.autoTip(f, 'recruit').key, 'recruit');
  A.dismissTip(f, 'recruit'); assert.equal(A.autoTip(f, 'recruit').key, 'skips', 'the next topic on the same screen, one at a time');
  A.dismissTip(f, 'skips'); assert.equal(A.autoTip(f, 'recruit'), null);
  A.setAssist(f, { mode: 'guided' }); assert.equal(A.autoTip(f, 'recruit'), null, 'switching mode does not bring it back');
  const g = Save.importJson(Save.exportJson(f)); assert.equal(A.autoTip(g, 'recruit'), null);
  A.resetTips(g); assert.equal(A.autoTip(g, 'recruit').key, 'recruit', '"Show all tips again" brings them back');
  // HQ: the week tip once, then "after the game" once the first game is played, then nothing.
  const h = fresh(); assert.equal(A.autoTip(h, 'hq').key, 'week'); A.dismissTip(h, 'week'); h.season.week = 2; assert.equal(A.autoTip(h, 'hq').key, 'postgame'); A.dismissTip(h, 'postgame'); assert.equal(A.autoTip(h, 'hq'), null);
});

test('help: every complex screen has topics in every mode, every topic points at real screens, and all topics are complete', () => {
  for (const sc of COMPLEX) { assert.ok(SCREENS.has(sc), `${sc} is a real screen`); assert.ok(A.helpTopics(sc).length >= 1, `${sc} has help`); }
  for (const [k, t] of Object.entries(A.TOPICS)) { assert.ok(t.title && t.brief && t.area, k); for (const sc of t.screens) assert.ok(SCREENS.has(sc), `${k} → ${sc}`); }
  const areas = new Set(Object.values(A.TOPICS).map((t) => t.area));
  for (const a of ['Getting started', 'Scouting and signing', 'Beast Clash', 'Football', 'Roster', 'Contracts and money', 'Draft', 'Trading']) assert.ok(areas.has(a), a);
  for (const k of ['owner', 'staff', 'week', 'scout', 'attributes', 'recruit', 'skips', 'clash', 'elements', 'decisions', 'pregame', 'overtime', 'plays', 'gameplan', 'modes', 'roster', 'health', 'evolution', 'contracts', 'draft', 'trading']) assert.ok(A.TOPICS[k], k);
  assert.match(A.TOPICS.skips.brief, /Skip the encounter/); assert.match(A.TOPICS.skips.brief, /Skip to results/);
});

test('warnings: cap and roster-minimum problems show in every mode, even with hints off; the rest follow the hints switch', () => {
  const f = fresh(); A.setAssist(f, { mode: 'expert', hints: false });
  f.roster.splice(F.ROSTER_MIN - 2); const ws = Adv.rosterWarnings(f); assert.ok(ws.some((w) => w.key === 'min' && w.level === 'critical'));
  assert.ok(ws.every((w) => w.level === 'critical'), 'hints off: only critical warnings');
  const g = fresh(); for (const m of g.roster) m.salary *= 4; assert.ok(Adv.rosterWarnings(g).some((w) => w.key === 'cap' && w.level === 'critical'));
  const h = fresh(); for (const m of h.roster.filter((x) => x.position === 'CB')) m.injury = { severity: 'Minor', weeks: 2, type: 'ankle' };
  assert.ok(Adv.rosterWarnings(h).some((w) => w.key === 'depth')); A.setAssist(h, { hints: false }); assert.ok(!Adv.rosterWarnings(h).some((w) => w.key === 'depth'));
});

test('suggestions appear only in Guided and never change anything; consequence lines follow their switch', () => {
  const f = fresh(); F.scoutRegion(f, 'Coral Coast');
  assert.equal(Adv.suggestProspect(f), null, 'Standard: no suggestion');
  A.setAssist(f, { mode: 'guided' }); const before = JSON.stringify(f);
  const s = Adv.suggestProspect(f); assert.ok(s && typeof s.text === 'string'); assert.ok(s.i === null || f.week.prospects[s.i]);
  assert.equal(JSON.stringify(f), before, 'a suggestion is read-only');
  assert.match(Adv.consequence(f, 'sign', { salary: 40000 }), /cap room after/);
  A.setAssist(f, { consequences: false }); assert.equal(Adv.consequence(f, 'sign', { salary: 40000 }), '');
});

test('Coach Assist never touches the game: a week plays out identically in Guided and Expert (results, generator, achievements)', () => {
  const run = (mode) => { const f = fresh(41); A.setAssist(f, { mode }); F.chooseGoal(f, 'wins'); for (let w = 0; w < 3; w++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f)); } return f; };
  const g = run('guided'), e = run('expert');
  const strip = (f) => { const c = JSON.parse(JSON.stringify(f)); delete c.settings; delete c.createdAt; return c; };
  assert.deepEqual(strip(g), strip(e));
});
