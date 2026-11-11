// Save compatibility after the Task 8 fresh-save break (schema 10; docs/beast-dex/SPECIFICATION_BASELINE.md §15, owner-authorised):
// saves exported by earlier builds (the v31.10 fixtures, commit 59cfa7a, schema 6; and schemas 8 and 9) are identified and refused
// with the Start New Franchise message, never parsed as current and never changed. A save from a later build (11+) is refused too.
// A schema-10 franchise round-trips through export and import and plays on through the Tuesday encounter, the pregame Clash and
// the season. The v31 fixtures are kept as the refusal inputs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { clashSettings } from '../src/franchise/clash-link.js';
import { newFranchise, runFranchise } from '../tools/franchise-soak.mjs';

const FIXTURES = ['tuesday', 'sunday', 'season2'];
const text = (name) => fs.readFileSync(new URL(`./fixtures/save-v31-${name}.json`, import.meta.url), 'utf8');
const week = (f) => { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); };
const incompatible = (schemaVersion) => (e) => e.code === 'incompatible' && e.message === Save.INCOMPATIBLE_MESSAGE && e.schemaVersion === schemaVersion;
const reload = (f) => Save.importJson(Save.exportJson(f));

test('schema: the save key is unchanged and the schema is 10; v31 saves (schema 6) are refused unchanged, through migrate and importJson', () => {
  assert.equal(F.LEGACY_SCHEMA_VERSION, 6); assert.equal(F.SCHEMA_VERSION, 10); assert.equal(F.LEAGUE_SCHEMA_VERSION, 8); assert.equal(Save.SAVE_KEY, 'gridiron-beast-v6');
  assert.match(Save.INCOMPATIBLE_MESSAGE, /earlier version/); assert.match(Save.INCOMPATIBLE_MESSAGE, /Start a new franchise/);
  for (const name of FIXTURES) {
    const raw = text(name); const obj = JSON.parse(raw); const f = obj.franchise; assert.equal(f.schemaVersion, 6, `${name} is a schema 6 save`);
    const before = JSON.stringify(obj);
    assert.throws(() => Save.migrate(f), incompatible(6), `${name}: migrate refuses it`);
    assert.equal(JSON.stringify(obj), before, `${name}: the refused save is not changed`);
    assert.throws(() => Save.importJson(raw), incompatible(6), `${name}: importJson refuses it`);
    assert.throws(() => Save.importJson(JSON.stringify(f)), incompatible(6), `${name}: also without the export wrapper`);
  }
});

test('schemas 8 and 9, a schema-10 roster monster without its development record, and an unversioned save are refused; a later build (11) is refused too', () => {
  const f = newFranchise(31); assert.equal(f.schemaVersion, 10); assert.ok(f.roster.every((m) => m.dev), 'a Task 8 roster carries development records');
  for (const v of [8, 9]) {
    const old = JSON.parse(JSON.stringify(f)); old.schemaVersion = v; if (v === 8) delete old.freeAgency; const before = JSON.stringify(old);
    assert.throws(() => Save.migrate(old), incompatible(v), `schema ${v} is refused`); assert.equal(JSON.stringify(old), before, `schema ${v}: not changed`);
    assert.throws(() => Save.importJson(JSON.stringify(old)), incompatible(v));
  }
  const nodev = JSON.parse(JSON.stringify(f)); delete nodev.roster[3].dev; const nb = JSON.stringify(nodev);
  assert.throws(() => Save.migrate(nodev), incompatible(10), 'a monster without m.dev is not a Task 8 save'); assert.equal(JSON.stringify(nodev), nb);
  const unversioned = JSON.parse(JSON.stringify(f)); delete unversioned.schemaVersion; assert.throws(() => Save.migrate(unversioned), incompatible(null));
  const later = JSON.parse(JSON.stringify(f)); later.schemaVersion = 11; const lb = JSON.stringify(later);
  assert.equal(Save.migrate(later), null, 'a save from a later build is refused, never guessed at'); assert.equal(JSON.stringify(later), lb);
  assert.throws(() => Save.importJson(JSON.stringify(later)), (e) => e.code !== 'incompatible' && /cannot read|can read/.test(e.message), 'refused as unreadable, not as an earlier version');
});

test('a schema-10 franchise round-trips through export and import, carries Clash defaults, and continues through the Tuesday encounter', () => {
  const f = reload(newFranchise(32)); assert.equal(f.schemaVersion, 10); assert.ok(F.hasLeague(f));
  assert.deepEqual(clashSettings(f.settings), { mode: 'ask', speed: 2 });
  assert.equal(JSON.stringify(reload(f)), JSON.stringify(f), 'a second round trip changes nothing');
  F.scoutRegion(f, 'Volcanic Fields'); assert.equal(f.season.day, 1); // Tuesday, prospects on the board
  const g = reload(f); assert.equal(g.season.day, 1, 'the save reopens on the Tuesday'); assert.ok(g.week.prospects.length >= 1);
  assert.deepEqual(g.week.prospects.map((p) => p.monster.id), f.week.prospects.map((p) => p.monster.id), 'the same prospects');
  const ids = g.roster.map((m) => m.id).sort();
  const pv = F.encounterPreview(g, 0); assert.ok(pv.ok, pv.reason); assert.ok(pv.size >= 1);
  const skip = JSON.parse(JSON.stringify(g)); F.skipEncounter(skip); assert.equal(skip.season.day, 2); assert.equal(skip.roster.length, g.roster.length);
  assert.ok(F.startEncounter(g, 0, { mode: 'skip' }).ok); const b = F.resolveEncounter(g); assert.ok(b.ok, b.reason); // Task 8 M4: Watch would stop at the player's rotation prompt (D1); a headless test settles with Skip
  if (b.won) assert.ok(F.declineOffer(g).ok); else { const r = F.recruit(g, 0, 'development'); assert.ok(r.ok); if (r.success) ids.push(r.monster.id); }
  assert.deepEqual(g.roster.map((m) => m.id).sort(), ids.sort(), 'no monster appeared or vanished except a signing');
  const w0 = g.season.week; for (let i = 0; i < 3; i++) week(g); assert.ok(g.season.week >= w0 + 3, 'three more weeks are played');
});

test('a reloaded schema-10 Sunday plays through the pregame Clash and, if needed, the overtime Clash, then the rest of the season', () => {
  const f = newFranchise(33); F.autoRunToSunday(f); while (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); }
  const g = reload(f); assert.equal(g.season.day, 6); assert.ok(!g.week.pregame, 'no pregame Clash yet');
  const game = F.simulatePlayerGame(g); assert.ok(game.finished); assert.ok(g.week.pregame?.result, 'the pregame Clash ran'); assert.equal(game.coin.winner, F.pregamePossession(g).coinWinner);
  if (game.needsTiebreak) assert.ok(game.winner && game.tiebreak);
  F.finishSunday(g, game);
  let guard = 0; while (!g.season.finished && guard++ < 40) week(g);
  assert.ok(g.season.finished);
  for (const rec of Object.values(g.season.records)) assert.equal(rec.t, 0);
});

test('a multi-season schema-10 save (offseason after season 1) loads with its monsters, history and records intact; the v31 one is refused', () => {
  assert.throws(() => Save.migrate(JSON.parse(text('season2')).franchise), incompatible(6));
  const { f } = runFranchise(34, { seasons: 1 }); assert.ok(f.season.finished || f.offseason);
  const g = reload(f); assert.equal(g.schemaVersion, 10); assert.ok(g.history.length >= 1); assert.ok(g.roster.length >= 20);
  for (const m of g.roster) { assert.ok(m.id && m.species && m.attributes && m.dev && typeof m.level === 'number'); }
  assert.deepEqual(g.roster.map((m) => m.id), f.roster.map((m) => m.id)); assert.equal(JSON.stringify(g.history), JSON.stringify(f.history));
  assert.ok(Object.values(g.season.records).every((r) => r.w + r.l + r.t > 0));
  assert.equal(JSON.stringify(g.season.records), JSON.stringify(f.season.records));
});
