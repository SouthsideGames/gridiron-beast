// "Reduce flashes" (Task 8 spec §14; docs/task8/FX_FOOTBALL_MATRIX.md I3; src/ui/flash-pref.js): an accessibility setting, off by
// default, saved with the other settings (one boolean; schema 10 unchanged). It reaches the football effect layer as
// fxOptions.reducedFlash and the Clash effect layers as `reducedFlash`; it softens flashes and removes strobing and never hides an
// ability, a status or a result, and never touches the simulation. It is not a graphics-quality preset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { reducedFlash, fxOptionsFor, applyFlashPref } from '../src/ui/flash-pref.js';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';
import { fieldSvg } from '../src/ui/field-view.js';
import { prepare } from './helpers/fx-football.js';
import { flash, setFlashSoft } from '../src/ui/clash/t8/looks/common.js';
import { catalog, prepare as prepareClash, drawAt } from './helpers/fx-clash.js';
import { drawClashT8 } from '../src/ui/clash/t8/fx-t8.js';

const src = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const opacities = (svg) => [...svg.matchAll(/opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
const shapes = (svg) => (svg.match(/<(circle|ellipse|rect|line|polygon|polyline|path|text|use)\b/g) || []).length;

test('the setting: off by default, one boolean saved with the settings, schema 10 unchanged, older saves read as off', () => {
  const f = newFranchise(11); assert.equal(f.settings.reducedFlash, false); assert.equal(F.SCHEMA_VERSION, 10); assert.equal(f.schemaVersion, 10);
  assert.equal(reducedFlash(f.settings), false); assert.deepEqual(fxOptionsFor(f.settings), { reducedFlash: false });
  f.settings.reducedFlash = true; const back = Save.importJson(Save.exportJson(f)); assert.equal(back.settings.reducedFlash, true, 'persisted with the other settings'); assert.equal(back.schemaVersion, 10);
  assert.deepEqual(fxOptionsFor(back.settings), { reducedFlash: true });
  const old = newFranchise(12); delete old.settings.reducedFlash; const read = Save.importJson(Save.exportJson(old)); assert.ok(read, 'a schema-10 save without the field still loads'); assert.equal(reducedFlash(read.settings), false, 'and reads as off');
  assert.equal(reducedFlash(null), false); assert.equal(reducedFlash({}), false); assert.doesNotThrow(() => applyFlashPref({ reducedFlash: true }), 'no document: nothing to mirror');
});

test('the setting is offered beside Reduce motion, passed to the football and Clash effect layers, and is not a quality preset', () => {
  const menu = src('src/ui/screens/menu.js');
  assert.match(menu, /data-change="reducedflash" \$\{s\.reducedFlash \? 'checked' : ''\}> Reduce flashes/); assert.match(menu, /reducedflash: \(el\) => set\('reducedFlash', el\.checked\)/);
  assert.ok(menu.indexOf('data-change="reducedflash"') > menu.indexOf('data-change="reduced"') && menu.indexOf('data-change="reducedflash"') < menu.indexOf('data-change="shake"'), 'right after Reduce motion');
  assert.ok(!/fxQuality|data-change="quality"/.test(menu), 'no graphics-quality preset in Settings');
  const match = src('src/ui/screens/match.js'); assert.ok((match.match(/fxOptions: fxOptionsFor\(f\.settings\)/g) || []).length >= 5, 'every match draw with effects passes fxOptions'); assert.match(match, /const tdFlash = reducedFlash\(f\.settings\) \? ''/);
  for (const f of ['src/ui/screens/practice.js', 'src/ui/screens/ability-audit.js']) assert.match(src(f), /fxOptions: fxOptionsFor\(app\.settings\)/, f);
  const arena = src('src/ui/clash/arena.js'); assert.match(arena, /reducedFlash: softFlash\b/); assert.match(arena, /drawClashT8\(t8state, t, g, \{ quality, reduced: reduced\(\), reducedFlash: softFlash\(\) \}\)/); assert.match(arena, /if \(softFlash\(\)\) frames = calm\(frames\)/);
  assert.match(src('src/main.js'), /reducedFlash: false/); assert.match(src('src/main.js'), /applyFlashPref\(app\.settings\)/);
  const css = src('styles/app.css'); assert.match(css, /html\[data-reduced-flash="1"\] \.field-wrap\.td-flash::after/); assert.match(css, /html\[data-reduced-flash="1"\] \.weather-storm/);
});

test('football: a flash-heavy look is softened, never removed; every other ability draws the same; status, cue and shapes stay', () => {
  const CAT = reviewCatalog(); let softened = 0;
  for (const c of CAT) {
    const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 }); const P = prepare(r, c); const act = P[r.activation]?.fx ? P[r.activation] : P.find((x) => x.fx); if (!act) continue;
    const own = act.fx.t8.items.find((it) => it.id === c.abilityId && it.main) || act.fx.t8.items.find((it) => it.id === c.abilityId); if (!own) continue;
    const before = JSON.stringify(act.sim);
    for (const dt of [0.05, 0.15, 0.3]) {
      const t = own.t0 + dt; let i = 0; while (i + 1 < act.sim.frames.length && (act.sim.frames[i + 1].t ?? 0) <= t + 1e-6) i++;
      const draw = (reduced) => fieldSvg({ time: t, ballOn: act.sim.ballOn ?? 35, ballLat: act.sim.ballLat || 0, frame: act.sim.frames[i], prevFrame: act.sim.frames[i - 1] || null, fx: act.fx, fields: act.sim.fields || null, fxOptions: { reducedFlash: reduced } });
      const a = draw(false), b = draw(true);
      assert.equal(shapes(a), shapes(b), `${c.abilityId}: the same shapes are drawn (nothing is hidden)`);
      assert.equal(a.replace(/opacity="[\d.]+"/g, ''), b.replace(/opacity="[\d.]+"/g, ''), `${c.abilityId}: only opacities differ`);
      if (a !== b) { softened += 1; const oa = opacities(a), ob = opacities(b); assert.ok(ob.every((v, k) => v <= oa[k] + 1e-9), `${c.abilityId}: softer, never brighter`); }
    }
    assert.equal(JSON.stringify(act.sim), before, `${c.abilityId}: drawing with the option never changes the record`);
  }
  assert.ok(softened >= 3, `flash-heavy looks are softened (${softened} frames differ)`);
});

test('Clash: the looks\' impact flash is dimmer and smaller under the option; the information layer and the result are unchanged', () => {
  setFlashSoft(false); const full = flash([10, 10], 8, '#ffffff', 0.8); setFlashSoft(true); const soft = flash([10, 10], 8, '#ffffff', 0.8); setFlashSoft(false);
  assert.match(full, /r="8\.00"/); assert.match(soft, /r="6\.00"/); assert.ok(opacities(soft)[0] < opacities(full)[0] && opacities(soft)[0] > 0, 'dimmer, still drawn');
  let differ = 0, checked = 0;
  for (const c of catalog(['Fire', 'Water', 'Nature', 'Electric', 'Earth', 'Ice', 'Wind', 'Dark', 'Light', 'Metal', 'Psychic', 'Dragon'])) {
    let prep; try { prep = prepareClash({ abilityId: c.id }); } catch { continue; } if (!prep?.state) continue; checked += 1;
    const own = prep.state.items.filter((it) => it.id === c.id); const before = JSON.stringify(prep.result);
    for (const it of own) for (const dt of [0.05, 0.2]) {
      const t = it.t0 + dt; const a = drawAt(prep, t), g = drawClashT8(prep.state, t, geomOf(prep, t), { quality: 'full', reducedFlash: true });
      assert.equal(a.hud, g.hud, `${c.id}: badges, icons and counts are untouched`); assert.equal(shapes(a.over + a.under), shapes(g.over + g.under), `${c.id}: the same shapes`);
      if (a.over !== g.over || a.under !== g.under) differ += 1;
    }
    assert.equal(JSON.stringify(prep.result), before, `${c.id}: the battle record is untouched`);
  }
  assert.ok(checked >= 60, `Clash abilities checked: ${checked}`); assert.ok(differ >= 3, `Clash looks with a flash are softened (${differ} frames)`);
});
import { geomAt } from './helpers/fx-clash.js';
function geomOf(prep, t) { return geomAt(prep.result, prep.cues, t); }
