// Task 8 M3 gate (M3_PLAN.md items 4 and 6): every Dex football ability is a registered contract, the legacy signature effects
// cannot reach the engine, and every contract plays real games together without breaking the engine or the rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FAMILIES, abilityById } from '../src/data/beast-dex.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { speciesEffect, LEGACY_ABILITY_EFFECTS_TRANSITIONAL } from '../src/data/monsters.js';
import { registeredFamilies, contractOf } from '../src/sim/abilities/registry.js';
import '../src/sim/abilities/index.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../src/data/personnel.js';
import { playGame } from '../src/sim/game-runner.js';

const FOOTBALL = FAMILIES.filter((f) => f.abilities?.football);

test('gate: all 72 Dex football abilities are registered, once each, under their own Dex ability id', () => {
  assert.equal(FOOTBALL.length, 72);
  const reg = new Set(registeredFamilies()); assert.equal(reg.size, 72);
  for (const f of FOOTBALL) { assert.ok(reg.has(f.id), `${f.id} registered`); assert.equal(contractOf(f.id).abilityId, f.abilities.football); assert.ok(abilityById(f.abilities.football), f.abilities.football); }
});

test('gate: the legacy signature effects are retired and unreachable (no stacking)', () => {
  assert.equal(LEGACY_ABILITY_EFFECTS_TRANSITIONAL, false);
  for (const sp of SPECIES_DEX) assert.equal(speciesEffect(sp), null, sp.id);
  const engine = fs.readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
  assert.ok(!/import\s*\{[^}]*\b(ABILITIES|speciesEffect)\b[^}]*\}\s*from/.test(engine), 'the engine imports no legacy ability table');
  assert.match(engine, /const ability = null, abilityName = null, abilityKind = null;/, 'no actor carries a legacy effect');
  for (const file of ['../src/franchise/roster.js', '../src/franchise/progression.js', '../src/franchise/franchise.js']) {
    const src = fs.readFileSync(new URL(file, import.meta.url), 'utf8'); // the only legacy reads outside the engine go through speciesEffect (null)
    assert.ok(!/ABILITIES\[/.test(src), `${file}: no direct legacy ability lookup`);
  }
});

test('gate: every contract plays complete games beside the others (no engine or rules error; scores and clocks stay legal)', () => {
  const byPos = {}; for (const f of FOOTBALL) (byPos[f.position] ||= []).push(f);
  const place = (team, k) => { // fill every starting slot with a contract family of that position, rotating with k
    const used = {}; const put = (side, slot) => { const list = byPos[positionOf(slot)] || []; if (!list.length) return; const f = list[(k + (used[positionOf(slot)] = (used[positionOf(slot)] ?? -1) + 1)) % list.length];
      const base = side === 'kicker' ? team.kicker : team[side][slot]; const m = { ...base, species: f.id, form: `${f.id}:${k % 3}`, mastery: k % 4, type: f.type, position: f.position };
      if (side === 'kicker') team.kicker = m; else team[side][slot] = m; };
    for (const s of OFFENSE_SLOTS) put('offense', s); for (const s of DEFENSE_SLOTS) put('defense', s); put('kicker', 'K');
  };
  const seen = new Set();
  for (let k = 0; k < 6; k++) {
    const home = generatedTeam(900 + k, { id: 'H', name: 'Home', abbr: 'HOM', quality: 62 }), away = generatedTeam(950 + k, { id: 'A', name: 'Away', abbr: 'AWY', quality: 62 });
    place(home, k); place(away, k + 3);
    for (const t of [home, away]) { for (const v of [...Object.values(t.offense), ...Object.values(t.defense), t.kicker]) if (v?.species) seen.add(v.species); }
    const g = playGame({ home, away, seed: 77 + k, quarterLength: 180 });
    assert.ok(g.finished && !g.guard, `game ${k} finished normally`);
    assert.ok(g.score.home >= 0 && g.score.away >= 0 && Number.isInteger(g.score.home + g.score.away));
    for (const e of g.log) assert.ok(!/Runner guard|NaN|undefined/.test(e.text || ''), `game ${k}: ${e.text}`);
  }
  const missing = FOOTBALL.filter((f) => !seen.has(f.id)).map((f) => f.id);
  assert.deepEqual(missing, [], 'every contract family took the field in these games');
});
