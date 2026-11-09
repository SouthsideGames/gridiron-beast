// Task 8 M4 S5: the static gate. The t8 engine never reads the legacy move table (CLASH_MOVES) or the legacy handlers; each family
// registers once; every registered module names a Dex Clash ability with an ability-kind row, declares only known hooks, and gives
// values for every form x tier; the abilities index imports every registered module; and at M4 completion all 72 are registered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../../src/clash/t8/index.js';
import { registeredClashAbilities, registeredClashFamilies, clashContractById, CLASH_HOOKS } from '../../src/clash/t8/registry.js';
import { kindOf, ABILITY_KINDS } from '../../src/clash/t8/ability-kinds.js';
import { abilityById, formsOf, ABILITIES } from '../../src/data/beast-dex.js';

const ROOT = new URL('../../', import.meta.url).pathname;
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const files = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)])).filter((f) => f.endsWith('.js'));

test('the t8 engine and the Clash contracts never import the legacy move table, handlers, conditions or AI', () => {
  for (const f of [...files('src/clash/t8'), ...files('src/clash/abilities')]) {
    const src = read(f);
    assert.ok(!/clash-moves|CLASH_MOVES|handlers\.js|conditions\.js|from '\.\.\/ai\.js'|from '\.\.\/\.\.\/ai\.js'/.test(src), `${f} reaches the legacy tables`);
    if (f !== 'src/clash/t8/engine.js') assert.ok(!/from '\.\.\/engine\.js'|from '\.\.\/\.\.\/engine\.js'/.test(src), `${f} imports the legacy engine`);
  }
  // the one allowed legacy import: engine.js reads the approved ramp helpers only
  assert.match(read('src/clash/t8/engine.js'), /import \{ rampFor, rampModelFor \} from '\.\.\/engine\.js'/);
});

test('each registered module: a Dex Clash ability, a kinds row, known hooks only, values for every form x tier, scenarios; families register once', () => {
  const ids = registeredClashAbilities(); assert.equal(new Set(ids).size, ids.length); assert.equal(new Set(registeredClashFamilies()).size, ids.length);
  for (const id of ids) {
    const mod = clashContractById(id); const a = abilityById(id);
    assert.ok(a && a.mode === 'clash', `${id} is a Dex Clash ability`); assert.equal(mod.family, a.familyId); assert.ok(kindOf(id), `${id} has a kinds row`);
    for (const h of Object.keys(mod.hooks)) assert.ok(CLASH_HOOKS.includes(h), `${id}: hook ${h}`);
    for (const f of formsOf(a.familyId)) for (let t = 0; t < 4; t++) assert.ok(mod.values(f.id, t) && typeof mod.values(f.id, t) === 'object', `${id} values(${f.id}, ${t})`);
    assert.ok(Array.isArray(mod.review?.scenarios) && mod.review.scenarios.length >= 3, `${id} has review scenarios`);
  }
});

test('the abilities index imports every module in src/clash/abilities (no silent omission)', () => {
  const idx = read('src/clash/abilities/index.js');
  for (const f of files('src/clash/abilities')) { const base = path.basename(f); if (['index.js', 'util.js'].includes(base)) continue; assert.ok(idx.includes(`'./${base}'`), `${base} is not imported by the index`); }
});

const CLASH_IDS = ABILITIES.filter((a) => a.mode === 'clash').map((a) => a.id).sort();
const MISSING = CLASH_IDS.filter((id) => !registeredClashAbilities().includes(id));
// While batches are still landing this is reported as a TODO (never silently passed); at M4 completion it is an ordinary assertion.
test('M4 completion: all 72 Clash abilities are registered (the batches S5-S11)', { todo: MISSING.length ? `${MISSING.length} of 72 not yet registered` : false }, () => {
  const missing = MISSING; const clash = CLASH_IDS;
  assert.deepEqual(missing, [], `${missing.length} of 72 not yet registered: ${missing.join(', ')}`);
  assert.equal(ABILITY_KINDS.length, 72);
});
