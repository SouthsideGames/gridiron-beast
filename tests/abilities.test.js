// Signature abilities do what their cards say (GDD §23.9, §23.11): once-per scopes, memory, key mechanics.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import { manKeyTargets, PLAYS } from '../src/data/playbook.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { createRng } from '../src/core/rng.js';
import { generateMonster, effectiveAttributes } from '../src/data/monsters.js';
import { positionOf } from '../src/data/personnel.js';
import { abilityMemory, rememberAbilities } from '../src/sim/rules.js';

const plain = (pos) => SPECIES_DEX.find((s) => s.position === pos && !s.ability) || SPECIES_DEX.find((s) => s.position === pos && s.rarity === 'uncommon');
function side(play, overrides, seed) {
  const rng = createRng(seed); const out = {};
  for (const s of play.onField) { const pos = positionOf(s); const sp = overrides[s] ? SPECIES_DEX.find((x) => x.id === overrides[s]) : plain(pos); const m = generateMonster(rng, { position: pos, quality: 72, species: plain(pos).id }); out[s] = { attrs: effectiveAttributes(m), name: sp.name, species: sp.id, id: `${s}-${seed}` }; }
  return out;
}
const sim = (o, d, off, def, i, memory) => simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], offense: side(PLAYS[o], off, 1), defense: side(PLAYS[d], def, 2), ballOn: 35, seed: 100 + i, options: memory ? { memory } : {} });

test('abilities: Blink fires at most once per game when the memory is carried', () => {
  const state = { drive: { team: 'home', plays: 0 }, playCount: 0, quarter: 1, abilityMemory: {} };
  let blinks = 0;
  for (let i = 0; i < 40; i++) { const s = sim('inside_zone', 'run_wall', { RB: 'astralux' }, {}, i, abilityMemory(state)); rememberAbilities(state, s); state.playCount += 1; blinks += s.events.filter((e) => e.kind === 'blink').length; }
  assert.equal(blinks, 1);
});

test('abilities: Whiteout is once per drive and comes back on the next drive', () => {
  const state = { drive: { team: 'home', plays: 0 }, playCount: 0, quarter: 1, abilityMemory: {} };
  const count = () => { let n = 0; for (let i = 0; i < 30; i++) { const s = sim('mesh', 'cover_3', {}, { FS: 'glacivern' }, i, abilityMemory(state)); rememberAbilities(state, s); n += s.events.filter((e) => e.kind === 'read_frozen').length; } return n; };
  assert.equal(count(), 1); state.quarter = 3; assert.equal(count(), 0, 'not again on the same drive, even in a new half'); state.playCount = 40; state.drive = { team: 'home', plays: 0 }; assert.equal(count(), 1, 'back on the next drive');
});

test('abilities: Eruption is once per drive', () => {
  const state = { drive: { team: 'home', plays: 0 }, playCount: 0, quarter: 1, abilityMemory: {} };
  // Power Right: the tight end blocks on every play (since v42.14 Run Wall's linebackers rarely run into the inside-zone tight end)
  let n = 0; for (let i = 0; i < 20; i++) { const s = sim('power_right', 'run_wall', { TE: 'pyroclast' }, {}, i, abilityMemory(state)); rememberAbilities(state, s); state.playCount += 1; state.drive.plays += 1; n += s.events.filter((e) => e.kind === 'flattened').length; }
  assert.equal(n, 1);
  state.drive = { team: 'away', plays: 0 }; // a new drive
  let m = 0; for (let i = 0; i < 20; i++) { const s = sim('power_right', 'run_wall', { TE: 'pyroclast' }, {}, i, abilityMemory(state)); rememberAbilities(state, s); state.playCount += 1; state.drive.plays += 1; m += s.events.filter((e) => e.kind === 'flattened').length; }
  assert.equal(m, 1);
});

test('abilities: Sovereign Arm first-read throws are never intercepted', () => {
  let denied = 0, picks = 0, plainPicks = 0;
  for (let i = 0; i < 600; i++) {
    const o = ['mesh', 'smash', 'quick_slants'][i % 3], d = ['cover_1', 'man_press', 'cover_0'][i % 3];
    const s = sim(o, d, { QB: 'aurodrax' }, {}, i); denied += s.events.filter((e) => e.kind === 'pick_denied').length; if (s.stats.interceptor) picks += 1;
    if (sim(o, d, {}, {}, i).stats.interceptor) plainPicks += 1;
  }
  assert.ok(denied > 0, 'it denied picks'); assert.ok(picks < plainPicks, 'fewer interceptions than the same QB without it');
});

test('abilities: Landslide never loses a pass block, Night Veil draws throws', () => {
  for (let i = 0; i < 200; i++) { // pass protection: until a catch, a scramble or a handoff turns it into a run
    const s = sim('mesh', 'all_out', { LG: 'titanolith' }, {}, i); const end = s.events.find((e) => ['catch', 'scramble', 'interception'].includes(e.kind))?.t ?? Infinity;
    assert.ok(!s.events.some((e) => e.kind === 'shed' && e.blocker === 'LG' && e.t < end), 'LG never shed in pass protection');
  }
  // Night Veil (v42.8 test): both halves of the card, measured directly over 1,800 plays. Quarterbacks do not see him as
  // covering, so his man is targeted more; a ball that arrives with him within a yard is never caught, so completions against
  // him fall. (The earlier version read the +5-point targeting lift off 900 plays, where the sampling error is about ±2 points.)
  const at = (def) => { let th = 0, tgt = 0, comp = 0; for (let i = 0; i < 1800; i++) {
    const o = PLAYS[['mesh', 'quick_slants', 'curl_flat', 'deep_post', 'smash', 'flood', 'dagger'][i % 7]], d = PLAYS[['cover_1', 'man_press', 'cover_2_man', 'cover_0'][(i >> 1) % 4]];
    const s = simulatePlay({ offensePlay: o, defensePlay: d, offense: side(o, {}, i), defense: side(d, def, 50000 + i), ballOn: 35, seed: 7 + i });
    if (!s.events.some((e) => e.kind === 'throw')) continue; th++; const mine = manKeyTargets(o)[d.assignments.CB1?.key]; if (mine && s.stats.target === mine) { tgt++; if (s.stats.receiver === mine) comp++; } }
    return { targeted: tgt / th, completion: comp / Math.max(1, tgt) }; };
  const veil = at({ CB1: 'nyxshade' }), base = at({});
  assert.ok(veil.targeted > base.targeted + 0.025, `quarterbacks throw at his man more often (${base.targeted.toFixed(3)} -> ${veil.targeted.toFixed(3)})`);
  assert.ok(veil.completion < base.completion - 0.08, `and complete less against him (${base.completion.toFixed(3)} -> ${veil.completion.toFixed(3)})`);
});

test('abilities: memory keys name the monster, ability and scope', () => {
  const s = sim('inside_zone', 'run_wall', { RB: 'astralux' }, {}, 3, { drive: 'D1', half: 'h1', quarter: 1, used: {} });
  for (const k of s.memoryUsed) assert.match(k, /^[^:]+:(blink|eruption|whiteout|daybreak|overcharge):(g|h:h1|d:D1)$/);
});

test('abilities (new cards): Whiteout really freezes the first read; Permafrost freezes the runner; Vanishing Cut leaves its man lost', () => {
  const frozen = (s) => s.frames.some((fr) => fr.off.some((p) => p[4] === 'frozen'));
  let wh = 0; for (let i = 0; i < 40 && !wh; i++) { const s = sim('mesh', 'cover_3', {}, { FS: 'glacivern' }, i, { drive: 'D', half: 'h1', quarter: 1, used: {} }); if (s.events.some((e) => e.kind === 'read_frozen')) { assert.ok(frozen(s), 'the first-read receiver shows frozen'); wh++; } }
  assert.equal(wh, 1);
  let pf = 0; for (let i = 0; i < 300 && !pf; i++) { const s = sim(['inside_zone', 'dive', 'power_right'][i % 3], 'run_wall', {}, { DL1: 'icehorn' }, i); if (s.events.some((e) => e.kind === 'stuffed')) { assert.ok(frozen(s)); pf++; } }
  assert.equal(pf, 1);
  let vc = 0; for (let i = 0; i < 400 && !vc; i++) { const s = sim(['inside_zone', 'outside_zone', 'toss_sweep'][i % 3], 'cover_3', { RB: 'duskrunner' }, {}, i); if (s.events.some((e) => e.kind === 'vanished')) { assert.ok(s.frames.some((fr) => fr.def.some((p) => p[4] === 'lost'))); vc++; } }
  assert.equal(vc, 1);
});

test('abilities (new cards): Precision Gears adds on 40+ yard field goals only', async () => {
  const { attemptFieldGoal } = await import('../src/sim/special-teams.js');
  const rng = () => ({ chance: () => true });
  const short = attemptFieldGoal(rng(), 85, { attrs: { kicking: 60 }, longKick: 6 }).chance, shortPlain = attemptFieldGoal(rng(), 85, { attrs: { kicking: 60 } }).chance;
  const long = attemptFieldGoal(rng(), 70, { attrs: { kicking: 60 }, longKick: 6 }).chance, longPlain = attemptFieldGoal(rng(), 70, { attrs: { kicking: 60 } }).chance;
  assert.equal(short, shortPlain); assert.ok(long > longPlain);
});

test('abilities (balance pass): Night Veil denies catches within a yard; Ancient Grove guards never bite on play action', () => {
  let veiled = 0;
  for (let i = 0; i < 600 && veiled < 3; i++) {
    const o = PLAYS[['mesh', 'quick_slants', 'curl_flat', 'smash'][i % 4]], d = PLAYS[['cover_1', 'man_press', 'cover_0'][i % 3]];
    const s = simulatePlay({ offensePlay: o, defensePlay: d, offense: side(o, {}, i), defense: side(d, { CB1: 'nyxshade' }, 50000 + i), ballOn: 35, seed: 7 + i });
    const v = s.events.find((e) => e.kind === 'veiled'); if (!v) continue; veiled++;
    assert.ok(!s.events.some((e) => e.kind === 'catch' && e.t >= v.t), 'no catch after the veil denies it');
  }
  assert.ok(veiled >= 1, 'Night Veil fires');
  const pa = Object.values(PLAYS).find((p) => p.tags?.includes('play_action'));
  if (pa) { let rooted = 0; for (let i = 0; i < 60; i++) { const s = sim(pa.id, 'cover_3', {}, { LB1: 'elderoot' }, i); if (s.events.some((e) => e.kind === 'ability' && e.key === 'grove')) rooted++; } assert.ok(rooted > 0, 'the grove fires on play action'); }
});
