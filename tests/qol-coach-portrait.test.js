// Franchise QoL update: coach creation expansion. The portrait is one spec string built from modular layers; older portraits
// still draw exactly as before, and changing the appearance changes nothing else in a save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import * as C from '../src/ui/coach-portrait.js';
import { coachEditorHtml, coachEditorActions, specOf } from '../src/ui/coach-editor.js';
import { portraitSprite } from '../src/ui/pixel-monster.js';

const rectsOk = (svg) => { const rects = [...svg.matchAll(/<rect ([^>]*)>/g)]; assert.ok(rects.length > 10, 'draws something');
  for (const [, a] of rects) { const n = (k) => Number(a.match(new RegExp(`${k}="([^"]+)"`))?.[1]); for (const k of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(n(k)), `${k} in ${a}`);
    assert.ok(n('x') >= 0 && n('y') >= 0 && n('x') + n('width') <= 16.001 && n('y') + n('height') <= 16.001, `inside the 16×16 frame: ${a}`); assert.ok(!/undefined|NaN|null/.test(a), a); } };

test('option counts meet the brief', () => {
  for (const h of ['buzz', 'shortfade', 'hightop', 'afro', 'shortcurls', 'longcurls', 'braids', 'cornrows', 'locs', 'ponytail', 'longstraight', 'bald']) assert.ok(C.HAIRS.includes(h), `hairstyle ${h}`);
  assert.ok(C.HAIRS.length >= 20); assert.ok(C.HAIR_COLORS2.length >= 10); assert.ok(C.SKINS.length >= 8); assert.ok(C.FACES.length >= 4); assert.ok(C.EYES.length >= 5); assert.ok(C.BROWS.length >= 5); assert.ok(C.NOSES.length >= 4);
  assert.ok(C.FACIALS.length >= 8); for (const o of ['hoodie', 'polo', 'jacket', 'suit']) assert.ok(C.OUTFITS.includes(o)); assert.ok(C.OUTFIT_COLORS.includes('team'));
  for (const x of ['cap', 'visor', 'beanie']) assert.ok(C.HATS.includes(x)); assert.ok(C.GLASSES.length >= 5); assert.ok(C.EXTRAS.includes('headset')); assert.equal(C.BUILDS.length, 4);
  for (const list of [C.FACES, C.EYES, C.BROWS, C.NOSES, C.HAIRS, C.FACIALS, C.OUTFITS, C.HATS, C.GLASSES, C.EXTRAS, C.BUILDS]) { assert.equal(new Set(list).size, list.length); for (const v of list) assert.ok(C.LABELS[v], `label for ${v}`); }
  const keys = C.COACH_CATEGORIES.flatMap((c) => c.options.map((o) => o.key)); assert.deepEqual([...keys].sort(), Object.keys(C.DEFAULT_LOOK).sort(), 'every part of a look can be edited');
});

test('spec: round trip, and damaged or newer specs still parse to a valid look', () => {
  for (let s = 1; s <= 300; s++) { const look = C.randomLook(s * 7919); assert.deepEqual(C.parseCoach(C.coachSpec(look)), look); }
  assert.deepEqual(C.parseCoach(C.coachSpec()), { ...C.DEFAULT_LOOK });
  assert.equal(C.parseCoach('custom|1|2|short|none|210'), null); assert.equal(C.parseCoach(3), null); assert.equal(C.parseCoach(''), null);
  for (const bad of ['coach2', 'coach2|', 'coach2|99|x|-1|4.5||nohair|abc|fur|cape|plaid|crown|goggles|sword|9', 'coach2|1|1|1|1|1|afro|1|none|tee|team|none|none|none|1|future|fields']) {
    const l = C.parseCoach(bad); assert.ok(l, bad); assert.deepEqual(C.parseCoach(C.coachSpec(l)), l); rectsOk(C.coachPortrait(bad, 64)); }
  assert.ok(!C.coachSpec(C.randomLook(5)).includes('<'));
});

test('every option draws inside the frame, alone and in combination; team colour is used', () => {
  const each = { hair: C.HAIRS, facial: C.FACIALS, outfit: C.OUTFITS, outfitColor: C.OUTFIT_COLORS, hat: C.HATS, glasses: C.GLASSES, extra: C.EXTRAS, skin: C.SKINS.map((_, i) => i), face: C.FACES.map((_, i) => i), eyes: C.EYES.map((_, i) => i), brows: C.BROWS.map((_, i) => i), nose: C.NOSES.map((_, i) => i), hairColor: C.HAIR_COLORS2.map((_, i) => i), build: C.BUILDS.map((_, i) => i) };
  const seen = {};
  for (const [k, values] of Object.entries(each)) { const svgs = new Set(); for (const v of values) { const svg = C.coachPortrait({ ...C.DEFAULT_LOOK, hat: 'none', extra: 'none', [k]: v }, 64, { teamColor: '#aa3311' }); rectsOk(svg); svgs.add(svg); } seen[k] = svgs.size; assert.equal(svgs.size, values.length, `${k}: every option looks different`); }
  for (const hair of C.HAIRS) for (const hat of C.HATS) for (const face of [0, 1, 3]) rectsOk(C.coachPortrait({ ...C.DEFAULT_LOOK, hair, hat, face, glasses: 'aviators', extra: 'headset', facial: 'longbeard', build: 3 }, 32));
  for (let s = 1; s <= 200; s++) rectsOk(C.coachPortrait(C.randomLook(s * 104729), 44));
  const team = C.coachPortrait({ ...C.DEFAULT_LOOK, outfitColor: 'team' }, 44, { teamColor: '#aa3311' }); assert.ok(team.toLowerCase().includes('#aa3311')); assert.notEqual(team, C.coachPortrait({ ...C.DEFAULT_LOOK, outfitColor: 'team' }, 44, { teamColor: '#1133aa' }));
  rectsOk(C.coachPortrait({ ...C.DEFAULT_LOOK, outfitColor: 'team' }, 44, { teamColor: 'javascript:bad' }));
  assert.ok(C.coachPortrait(C.DEFAULT_LOOK, 128).length < 12000, 'a portrait stays a small inline SVG');
});

test('older portraits are untouched; the editor opens them as the nearest new look', () => {
  for (const seed of [0, 3, 7, 'custom|1|2|short|none|210', 'custom|4|0|afro|headset|20', 'custom|2|5|cap|sunglasses|120']) {
    const svg = portraitSprite(seed, 44); assert.ok(svg.includes('<svg') && !svg.includes('coach-portrait'), `${seed} draws with the old renderer`); }
  assert.ok(portraitSprite(C.coachSpec(), 44, { teamColor: '#aa3311' }).includes('coach-portrait'));
  const l = C.lookFromLegacy('custom|4|0|afro|headset|20'); assert.equal(l.hair, 'afro'); assert.equal(l.extra, 'headset'); assert.equal(l.outfitColor, 20); assert.deepEqual(C.parseCoach(C.coachSpec(l)), l);
  assert.equal(C.lookFromLegacy('custom|2|5|cap|sunglasses|120').hat, 'cap'); assert.equal(C.lookFromLegacy('custom|2|5|cap|sunglasses|120').glasses, 'shades');
  assert.deepEqual(C.lookFromLegacy(4), { ...C.DEFAULT_LOOK }, 'a numbered preset starts from the default look');
});

test('editor: tabs, steppers and chips change exactly one part; every category renders', () => {
  const state = { look: { ...C.DEFAULT_LOOK }, tab: 'face' }; let draws = 0; const act = coachEditorActions(state, () => draws++);
  for (const c of C.COACH_CATEGORIES) { act['ce-tab']({ dataset: { v: c.id } }); const html = coachEditorHtml(state.look, { tab: state.tab, teamColor: '#aa3311', teamNote: 'x' });
    for (const o of c.options) { assert.equal((html.match(new RegExp(`data-action="ce-set" data-k="${o.key}"`, 'g')) || []).length, o.values.length, `${o.key}: a chip per choice`); assert.equal((html.match(new RegExp(`data-action="ce-step" data-k="${o.key}"`, 'g')) || []).length, 2); }
    assert.ok(html.includes('ce-preview') && html.includes('ce-random')); assert.ok(!/undefined|NaN/.test(html)); }
  const before = { ...state.look }; act['ce-set']({ dataset: { k: 'hair', v: 'locs' } }); assert.deepEqual(state.look, { ...before, hair: 'locs' });
  act['ce-set']({ dataset: { k: 'skin', v: '7' } }); assert.equal(state.look.skin, 7, 'numbers stay numbers');
  act['ce-set']({ dataset: { k: 'hair', v: 'not-a-style' } }); assert.equal(state.look.hair, 'locs'); act['ce-set']({ dataset: { k: 'nope', v: 'x' } });
  act['ce-step']({ dataset: { k: 'build', d: '-1' } }); act['ce-step']({ dataset: { k: 'build', d: '-1' } }); assert.equal(state.look.build, 3, 'cycling wraps'); act['ce-step']({ dataset: { k: 'build', d: '1' } }); assert.equal(state.look.build, 0);
  act['ce-step']({ dataset: { k: 'outfitColor', d: '1' } }); assert.equal(state.look.outfitColor, 'black');
  act['ce-random'](); assert.deepEqual(C.parseCoach(specOf(state)), state.look); assert.ok(draws >= 9);
});

test('changing the appearance changes only the portrait; it survives save and load', () => {
  const f = newFranchise(81); const before = structuredClone(f); const spec = C.coachSpec({ ...C.DEFAULT_LOOK, hair: 'locs', glasses: 'aviators', build: 2 });
  f.owner.portrait = spec; // what My office → Edit appearance → Save does
  const a = structuredClone(f), b = structuredClone(before); delete a.owner.portrait; delete b.owner.portrait; assert.deepEqual(a, b, 'record, roster, history, achievements: all untouched');
  const back = Save.importJson(Save.exportJson(f)); assert.equal(back.owner.portrait, spec); assert.ok(portraitSprite(back.owner.portrait, 44).includes('coach-portrait'));
  const old = Save.importJson(Save.exportJson(before)); assert.deepEqual(old.owner.portrait, before.owner.portrait, 'a save that never opened the editor keeps its portrait');
});
