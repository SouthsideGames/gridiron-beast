// Evolution Experience Overhaul (GDD §51): a presentation overhaul. These tests pin the gameplay side: eligibility, the forms,
// the sprites, the real attribute and potential changes, abilities, the career record, captain chemistry and injury history
// preserved, no duplicate rewards, save and reload, determinism, nothing else in the franchise touched; and the report and
// results panel the scene shows (only real changes, nothing invented).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { tryEvolve, evolutionReady, nextEvolution, formOf, speciesEffect, resolveSpecies, clampAttr, monsterOverall } from '../src/data/monsters.js';
import { ATTRIBUTES, POSITION_WEIGHTS } from '../src/data/personnel.js';
import { careerEvents, careerTimeline } from '../src/franchise/career.js';
import { evolutionSnapshot, evolutionReport } from '../src/franchise/evolution-report.js';
import { evolutionResultsHtml, stageSpriteSize, stageLabel, TIMING } from '../src/ui/evolution-scene.js';
import { FX_THEMES, themeFor } from '../src/ui/evolution-fx.js';
import { TYPE_NAMES } from '../src/data/monsters.js';
import { monsterSprite } from '../src/ui/pixel-monster.js';

const copy = (x) => JSON.parse(JSON.stringify(x));
let base = null; // one played franchise (week 4: injury history, captains, chemistry live), cloned per test
const fresh = () => { base ||= runFranchise(9, { seasons: 1, stopWeek: 4 }).f; return Save.importJson(Save.exportJson(base)); };
const evolvable = (f, n = 0) => f.roster.filter((m) => nextEvolution(m))[n];
const ready = (m) => { m.level = Math.max(m.level, nextEvolution(m).level); return m; }; // test fixture: reach the level

test('eligibility: below the level, fully evolved and not on the roster are refused; at the level it evolves once', () => {
  const f = fresh(); const m = evolvable(f); const n = nextEvolution(m);
  m.level = n.level - 1; let r = F.evolveMonster(f, m.id); assert.equal(r.ok, false); assert.match(r.reason, new RegExp(`level ${n.level}`)); assert.equal(m.stage || 0, 0);
  m.level = n.level; assert.equal(evolutionReady(m), true); r = F.evolveMonster(f, m.id); assert.equal(r.ok, true); assert.equal(m.stage, 1);
  r = F.evolveMonster(f, m.id); assert.equal(r.ok, false, 'not again at the same level (unless the next form is reached)');
  assert.equal(F.evolveMonster(f, 'nobody').ok, false);
  const full = f.roster.find((x) => !nextEvolution(x)); if (full) { const r2 = F.evolveMonster(f, full.id); assert.equal(r2.ok, false); assert.match(r2.reason, /fully evolved/); }
  const two = f.roster.find((x) => resolveSpecies(x).evolution.length >= 2 && x.id !== m.id);
  if (two) { const lv = resolveSpecies(two).evolution; two.level = lv[1].level; assert.equal(F.evolveMonster(f, two.id).ok, true); assert.equal(F.evolveMonster(f, two.id).ok, true); assert.equal(two.stage, 2); assert.equal(F.evolveMonster(f, two.id).ok, false); }
});

test('the evolution itself is exactly the existing rule: same id, form, +3/+1 attributes, +4 potential, salary until renewal', () => {
  const f = fresh(); const m = ready(evolvable(f)); const twin = copy(m); const before = copy(m);
  assert.equal(F.evolveMonster(f, m.id).ok, true); tryEvolve(twin);
  for (const k of ['id', 'name', 'stage', 'attributes', 'potential', 'salary', 'level', 'xp', 'position', 'type', 'species', 'nature', 'age', 'contract', 'injury', 'fatigue', 'stats'])
    assert.deepEqual(m[k], twin[k], `${k} as tryEvolve makes it`);
  const w = POSITION_WEIGHTS[m.position];
  for (const k of ATTRIBUTES) assert.equal(m.attributes[k], clampAttr(before.attributes[k] + (w[k] ? 3 : 1)), k);
  assert.equal(m.potential, clampAttr(before.potential + 4)); assert.equal(m.salary, before.salary, 'salary unchanged until renewal');
  assert.equal(m.id, before.id); assert.equal(m.name, nextEvolution(before).name + (before.name.match(/ (II|III|IV|V|VI|\d+)$/)?.[0] || ''));
});

test('the original and evolved forms and their sprites are the real ones', () => {
  const f = fresh(); const m = ready(evolvable(f)); const beforeMon = { ...m, stage: m.stage || 0 }; const sp = resolveSpecies(m);
  assert.equal(F.evolveMonster(f, m.id).ok, true);
  assert.equal(formOf(beforeMon).id, sp.id); assert.equal(formOf(m).id, `${sp.id}_e1`); assert.equal(formOf(m).name, sp.evolution[0].name);
  const a = monsterSprite(beforeMon, 256), b = monsterSprite(m, 256);
  assert.notEqual(a, b, 'two different designs'); for (const s of [a, b]) { assert.match(s, /viewBox="0 0 16 16"/); assert.match(s, /shape-rendering="crispEdges"/); assert.match(s, /width="256"/); }
  assert.equal(monsterSprite(m, 256), monsterSprite({ ...m }, 256), 'same individual tint (by id)');
});

test('the report shows only real changes: capped attributes and potential are not improvements; no invented ability', () => {
  const f = fresh(); const m = ready(evolvable(f)); const w = POSITION_WEIGHTS[m.position];
  const capped = ATTRIBUTES.find((k) => w[k]); m.attributes[capped] = 99; m.potential = 97;
  const s0 = evolutionSnapshot(m); assert.equal(F.evolveMonster(f, m.id).ok, true); const s1 = evolutionSnapshot(m);
  const r = evolutionReport(s0, s1, { year: f.season.year, week: f.season.week, club: f.club });
  assert.equal(r.all.find((a) => a.key === capped).delta, 0); assert.ok(!r.changed.some((a) => a.key === capped), 'a capped attribute is not listed as improved');
  for (const a of r.changed) assert.equal(a.to - a.from, a.delta); assert.ok(r.changed.every((a) => a.delta !== 0));
  assert.deepEqual(r.potential, { from: 97, to: 99, delta: 2 });
  assert.equal(r.overall.from, s0.overall); assert.equal(r.overall.to, monsterOverall(m));
  assert.deepEqual(speciesEffect(m)?.name ?? null, s0.ability?.name ?? null, 'evolution keeps the ability'); assert.equal(r.ability, null);
  assert.equal(r.salary.unchanged, true); assert.equal(r.fromStage, 0); assert.equal(r.toStage, 1);
  assert.deepEqual(r.milestone, { year: f.season.year, week: f.season.week, club: f.club });
  const html = evolutionResultsHtml(r, { beforeSprite: '<svg/>', afterSprite: '<svg/>' });
  assert.match(html, /Salary unchanged until contract renewal/); assert.doesNotMatch(html, /\(\+0\)|±0/);
  assert.match(html, r.next ? new RegExp(`Next evolution at level ${r.next.level}`) : /Final form reached/);
  assert.match(html, new RegExp(`Evolved into ${r.toName}`)); assert.doesNotMatch(html, /New ability|New trait/);
  const keyRows = (html.split('<details')[0].match(/<tr class="up"/g) || []).length; assert.ok(keyRows >= 1 && keyRows <= r.changed.length, 'the default list is the changed attributes the position uses');
  assert.match(html, /Show all 12 attributes/); assert.match(html, /\(no change\)/, 'the capped attribute reads "no change" in the full table');
});

test('the Career Timeline records the evolution once, with the forms, season, week, level and overall; earlier records kept', () => {
  const f = fresh(); const m = ready(evolvable(f)); const evBefore = copy(careerEvents(m)); const ovr0 = monsterOverall(m); const name0 = m.name; const stats0 = copy(m.stats);
  assert.equal(F.evolveMonster(f, m.id).ok, true);
  const ev = careerEvents(m); assert.deepEqual(ev.slice(0, evBefore.length), evBefore, 'pre-evolution events preserved');
  const evo = ev.filter((e) => e.t === 'evolve'); assert.equal(evo.length, 1);
  assert.equal(evo[0].y, f.season.year); assert.equal(evo[0].w, f.season.week); assert.equal(evo[0].x.from, name0);
  assert.equal(evo[0].x.to, m.name); assert.equal(evo[0].x.lvl, m.level); assert.deepEqual(evo[0].x.ovr, [ovr0, monsterOverall(m)]);
  assert.deepEqual(m.stats, stats0, 'career statistics continue untouched');
  const tl = careerTimeline(m, { club: f.club }); assert.ok(tl.some((i) => /Evolved into/.test(i.title || '')), 'shown on the timeline');
});

test('captain chemistry, injury history, team, contracts and the rest of the franchise are untouched; no random number drawn', () => {
  const f = fresh(); const m = ready(evolvable(f)); const before = copy(f); const idx = f.roster.indexOf(m);
  assert.ok(f.injuryHistory && f.partnerships, 'the fixture has both');
  assert.equal(F.evolveMonster(f, m.id).ok, true);
  const after = copy(f);
  assert.deepEqual(after.partnerships, before.partnerships); assert.deepEqual(after.injuryHistory, before.injuryHistory);
  assert.equal(after.roster.length, before.roster.length); assert.equal(after.roster[idx].id, m.id);
  for (const k of Object.keys(before)) { if (['roster', 'news', 'dex'].includes(k)) continue; assert.deepEqual(after[k], before[k], `f.${k} unchanged`); }
  after.roster.forEach((x, i) => { if (i !== idx) assert.deepEqual(x, before.roster[i], `${x.name} unchanged`); });
});

test('no duplicate rewards: a second tap, a replayed scene or a reload give nothing more; deterministic', () => {
  const f = fresh(); const m = ready(evolvable(f)); const twinF = Save.importJson(Save.exportJson(f));
  assert.equal(F.evolveMonster(f, m.id).ok, true); const once = copy(m);
  assert.equal(F.evolveMonster(f, m.id).ok, false); assert.deepEqual(copy(m), once, 'a second tap changes nothing');
  const g = Save.importJson(Save.exportJson(f)); const gm = g.roster.find((x) => x.id === m.id);
  assert.deepEqual(copy(gm), once, 'save and reload keep exactly one evolution'); assert.equal(F.evolveMonster(g, m.id).ok, false);
  assert.equal(careerEvents(gm).filter((e) => e.t === 'evolve').length, 1);
  const tm = twinF.roster.find((x) => x.id === m.id); assert.equal(F.evolveMonster(twinF, m.id).ok, true);
  const strip = (x) => { const c = copy(x); return c; }; assert.deepEqual(strip(tm), once, 'the same evolution from the same save: deterministic');
});

test('the scene: sprite sizes in whole multiples of 16, timings, labels, one theme per type', () => {
  for (const [w, h] of [[320, 568], [360, 780], [375, 667], [390, 844], [393, 852], [412, 915], [430, 932]]) { const s = stageSpriteSize(w, h); assert.equal(s % 16, 0); assert.ok(s >= 128 && s <= 320 && s <= w * 0.7, `${w}: ${s}`); }
  assert.ok(TIMING.full.B < TIMING.full.C && TIMING.full.C < TIMING.full.D && TIMING.full.D < TIMING.full.E);
  const gaps = TIMING.full.swaps.map((t, i, a) => (i ? t - a[i - 1] : t)); assert.ok(gaps.every((g) => g >= 340), 'silhouette swaps at most ~3 a second (no rapid flashing)');
  assert.equal(TIMING.reduced.B, null); assert.equal(TIMING.reduced.flash, null); assert.deepEqual(TIMING.reduced.swaps, []);
  assert.equal(stageLabel(0), 'Base form'); assert.equal(stageLabel(1), 'First evolution');
  for (const t of TYPE_NAMES) assert.ok(FX_THEMES[t], `${t} has a theme`); assert.equal(themeFor('Nope'), FX_THEMES.Light);
  assert.equal(new Set(Object.values(FX_THEMES).map((t) => t.shape)).size, 12, 'twelve distinct signature effects on one engine');
});
