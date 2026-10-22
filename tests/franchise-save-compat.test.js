// Save compatibility for the Beast Clash integration (GDD §26.0): saves exported by the previous build (v31.10, commit 59cfa7a,
// before any Clash state existed) load through importJson/migrate unchanged in schema, and the week continues through the new
// Tuesday encounter, the pregame Clash and the season, with no replacement monsters and no schema change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { clashSettings } from '../src/franchise/clash-link.js';

const load = (name) => Save.importJson(fs.readFileSync(new URL(`./fixtures/save-v31-${name}.json`, import.meta.url), 'utf8'));
const week = (f) => { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); };

test('schema: the save key and schema version are unchanged; older saves carry no Clash fields and get defaults when read', () => {
  assert.equal(F.SCHEMA_VERSION, 6); assert.equal(Save.SAVE_KEY, 'gridiron-beast-v6');
  for (const name of ['tuesday', 'sunday', 'season2']) {
    const f = load(name); assert.equal(f.schemaVersion, 6);
    assert.ok(!('encounter' in f.week) && !('pregame' in f.week) && !('overtime' in f.week), 'the old save has no Clash state');
    assert.ok(!f.settings.clash); assert.deepEqual(clashSettings(f.settings), { mode: 'ask', speed: 2 });
    assert.ok(Save.migrate(JSON.parse(JSON.stringify(f))), 'migrate accepts it');
    const json = Save.exportJson(f); assert.ok(Save.importJson(json), 'round-trips');
  }
});

test('an old Tuesday (prospects on the board) continues as a Monster Encounter; skipping it is harmless; the roster is the same monsters', () => {
  const f = load('tuesday'); assert.equal(f.season.day, 1); assert.ok(f.week.prospects.length >= 1);
  const ids = f.roster.map((m) => m.id).sort(); const n = f.roster.length;
  const pv = F.encounterPreview(f, 0); assert.ok(pv.ok, pv.reason); assert.ok(pv.size >= 1);
  const g = JSON.parse(JSON.stringify(f)); F.skipEncounter(g); assert.equal(g.season.day, 2); assert.equal(g.roster.length, n);
  assert.ok(F.startEncounter(f, 0).ok); const b = F.resolveEncounter(f); assert.ok(b.ok);
  if (b.won) assert.ok(F.declineOffer(f).ok); else { const r = F.recruit(f, 0, 'development'); assert.ok(r.ok); if (r.success) ids.push(r.monster.id); }
  assert.deepEqual(f.roster.map((m) => m.id).sort(), ids.sort(), 'no monster appeared or vanished except a signing');
  for (let i = 0; i < 3; i++) week(f); assert.ok(f.season.week >= 5);
});

test('an old Sunday (before the toss) plays through the pregame Clash and, if needed, the overtime Clash, then the rest of the season and into the next', () => {
  const f = load('sunday'); assert.equal(f.season.day, 6); assert.equal(f.week.pregame, undefined);
  const g = F.simulatePlayerGame(f); assert.ok(g.finished); assert.ok(f.week.pregame?.result, 'the pregame Clash ran'); assert.equal(g.coin.winner, F.pregamePossession(f).coinWinner);
  if (g.needsTiebreak) assert.ok(g.winner && g.tiebreak);
  F.finishSunday(f, g);
  let guard = 0; while (!f.season.finished && guard++ < 40) week(f);
  assert.ok(f.season.finished); assert.ok(f.season.playoffs?.champion || f.season.champion || f.season.finished);
  for (const rec of Object.values(f.season.records)) assert.equal(rec.t, 0);
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
});

test('a multi-season save (offseason after season 1) loads, and its monsters, history and records are intact', () => {
  const f = load('season2'); assert.ok(f.season.finished || f.offseason); assert.ok(f.history.length >= 0); assert.ok(f.roster.length >= 20);
  for (const m of f.roster) { assert.ok(m.id && m.species && m.attributes && typeof m.level === 'number'); }
  assert.ok(Object.values(f.season.records).every((r) => r.w + r.l + r.t > 0));
});
