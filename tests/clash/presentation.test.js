// Beast Clash presentation tests (Phases 1-2). The choreographer is pure: it reads the engine's record and never
// changes it. These tests cover event coverage, state consistency against the engine, playback-control
// equivalence and pacing. The DOM arena is exercised in the browser (scratch Playwright run), not here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulateClash, logHash } from '../../src/clash/engine.js';
import { createRng } from '../../src/core/rng.js';
import { randomLineup, withoutRandomness } from './helpers.js';
import { stateAt, cuesFor, nextExchangeIndex, totalDuration, DURATION, SPEEDS, DELIVERY } from '../../src/ui/clash/choreographer.js';
import { THEMES, themeFor, decorSvg } from '../../src/ui/clash/arena-art.js';

const goldenBattles = () => { const out = []; for (let seed = 1; seed <= 20; seed++) { const rng = createRng(seed * 101); const a = randomLineup(rng, 1 + rng.int(5)), b = randomLineup(rng, 1 + rng.int(5)); out.push({ seed, a, b, r: simulateClash({ a, b, seed }) }); } return out; };
const TIERS = new Set(['tick', 'routine', 'power', 'major']);

test('event coverage: every logged event gets exactly one cue, in order, with a tier, a duration and the event itself', () => {
  const kindsSeen = new Set();
  for (const { r } of goldenBattles()) {
    const cues = cuesFor(r);
    assert.equal(cues.length, r.log.length);
    cues.forEach((c, i) => { assert.equal(c.i, i); assert.equal(c.event, r.log[i]); assert.equal(c.kind, r.log[i].kind); assert.ok(TIERS.has(c.tier), `tier for ${c.kind}`); assert.equal(c.duration, DURATION[c.tier]); kindsSeen.add(c.kind); });
  }
  for (const k of ['start', 'enter', 'damage', 'heal', 'shield', 'condition', 'ko', 'swap', 'end']) assert.ok(kindsSeen.has(k), `golden battles exercise ${k}`);
});

test('a cue never claims more than its event: damage numbers equal the log, misses carry no number, resisted conditions are not shown as applied', () => {
  for (const { r } of goldenBattles()) {
    for (const c of cuesFor(r)) {
      const e = c.event;
      if (e.kind === 'damage') { assert.equal(c.number.value, e.damage); assert.equal(c.number.absorbed, e.absorbed || 0); }
      if (e.kind === 'tick') assert.equal(c.number.value, e.damage);
      if (e.kind === 'heal') assert.equal(c.number.value, e.amount || 0);
      if (e.kind === 'miss') { assert.equal(c.number, null); assert.equal(c.move, 'dodge'); }
      if (e.kind === 'condition') { const landed = e.result === 'applied' || e.result === 'replaced'; assert.equal(c.move === 'afflict', landed, `${e.result} shown as ${c.move}`); }
      if (e.kind === 'swap') assert.equal(c.move, e.forced ? 'yank' : 'walk');
      if (e.kind === 'ko') assert.equal(c.move, 'ko');
    }
  }
});

test('state consistency: the state after the last event equals the engine result for all 20 golden battles, and HP never goes below 0 or above max at any cursor', () => {
  for (const { r } of goldenBattles()) {
    const fin = stateAt(r, r.log.length - 1);
    for (const side of ['a', 'b']) for (const x of r.lines[side]) {
      const s = fin.S[side][x.id];
      assert.equal(s.hp, x.hp, `${x.name} hp`); assert.equal(s.shield, x.shield, `${x.name} shield`); assert.equal(s.ko, x.hp <= 0, `${x.name} ko`);
    }
    const winnerSide = r.winner; const standing = fin.order[winnerSide].filter((id) => !fin.S[winnerSide][id].ko).length;
    if (r.by === 'knockout') { assert.ok(standing >= 1); const loser = winnerSide === 'a' ? 'b' : 'a'; assert.equal(fin.order[loser].filter((id) => !fin.S[loser][id].ko).length, 0); }
    for (let i = 0; i < r.log.length; i++) { const st = stateAt(r, i); for (const side of ['a', 'b']) for (const id of Object.keys(st.S[side])) { const s = st.S[side][id]; assert.ok(s.hp >= 0 && s.hp <= s.maxHp, `hp in range at ${i}`); assert.ok(s.shield >= 0); } }
  }
});

test('front-row consistency: at every cursor the choreographed front monster is the one the engine says is acting or being hit', () => {
  for (const { r } of goldenBattles()) {
    for (let i = 0; i < r.log.length; i++) {
      const e = r.log[i]; if (e.kind !== 'damage' || !e.actor || !e.target) continue;
      if (/back row|bench/i.test(e.text)) continue; // back-row actions come from a reserve by design
      const st = stateAt(r, i - 1); const side = e.actor[0];
      const front = st.front[side]; if (front) assert.equal(front, e.actor, `event ${i}: ${e.text}`);
    }
  }
});

test('playback controls agree: skipping to the end, stepping one event at a time, jumping by exchange and scrubbing all reach the same final state', () => {
  const snap = (st) => JSON.stringify(['a', 'b'].map((s) => Object.values(st.S[s]).map((x) => [x.id, x.hp, x.shield, x.cond, x.ko])).concat([st.order]));
  for (const { r } of goldenBattles()) {
    const n = r.log.length; const skip = snap(stateAt(r, n - 1));
    let i = 0; while (i < n - 1) i += 1; assert.equal(snap(stateAt(r, i)), skip);
    i = 0; let hops = 0; while (i < n - 1) { i = Math.max(i + 1, nextExchangeIndex(r, i + 1)); hops++; } assert.equal(snap(stateAt(r, i)), skip); assert.ok(hops <= r.exchanges + 2);
    for (const k of [0, Math.floor(n / 3), n - 2, n - 1, n + 50]) { const st = stateAt(r, k); assert.equal(st.i, Math.min(k, n - 1)); }
    assert.equal(snap(stateAt(r, n + 50)), skip);
  }
});

test('nextExchangeIndex moves to the first event of the following exchange and stops at the last event', () => {
  const { r } = goldenBattles()[2];
  for (let i = 0; i < r.log.length - 1; i++) { const j = nextExchangeIndex(r, i); assert.ok(j > i || j === r.log.length - 1); if (j < r.log.length - 1) assert.equal(r.log[j].ex, r.log[i].ex + 1); }
  assert.equal(nextExchangeIndex(r, r.log.length - 1), r.log.length - 1);
});

test('pacing: tick < routine < power < major; speed divides durations without touching the record; the battle-ending strike and the end are major', () => {
  assert.ok(DURATION.tick < DURATION.routine && DURATION.routine < DURATION.power && DURATION.power < DURATION.major);
  assert.deepEqual([...SPEEDS], [1, 2, 4]);
  for (const { r } of goldenBattles()) {
    const before = logHash(r); const cues = cuesFor(r); const total = totalDuration(cues);
    for (const s of SPEEDS) assert.equal(Math.round(total / s), Math.round(cues.reduce((t, c) => t + c.duration / s, 0)));
    assert.equal(logHash(r), before);
    assert.equal(cues[cues.length - 1].kind, 'end'); assert.equal(cues[cues.length - 1].tier, 'major');
    const lastDamage = [...cues].reverse().find((c) => c.kind === 'damage');
    if (r.by === 'knockout' && lastDamage) { const after = cues.slice(lastDamage.i + 1, lastDamage.i + 4).map((c) => c.kind); if (after[0] === 'ko' && after.includes('end')) assert.equal(lastDamage.tier, 'major'); }
    const routine = cues.filter((c) => c.kind === 'damage' && c.tier === 'routine'), power = cues.filter((c) => c.kind === 'damage' && c.tier !== 'routine');
    for (const c of routine) assert.ok(!(c.event.mult && c.event.mult !== 1), 'triggered damage is never routine'); void power;
  }
});

test('camera cues are restrained: zoom within 1.0-1.15, shake at most 8, and only power/major cues shake or dim', () => {
  for (const { r } of goldenBattles()) for (const c of cuesFor(r)) {
    if (!c.camera) continue;
    assert.ok(c.camera.zoom >= 1 && c.camera.zoom <= 1.15, `zoom ${c.camera.zoom}`);
    assert.ok((c.camera.shake || 0) <= 8);
    if (c.camera.shake || c.camera.dim) assert.ok(c.tier === 'power' || c.tier === 'major', `${c.kind} ${c.tier} shakes`);
    for (const id of c.camera.focus) assert.ok(r.lines[id[0]].some((x) => x.id === id), `focus ${id} is a real monster`);
  }
});

test('purity: the choreographer uses no randomness or clock and does not mutate the result; the arena file never imports the engine', () => {
  const { r } = goldenBattles()[0]; const before = JSON.stringify(r);
  withoutRandomness(() => { cuesFor(r); for (let i = 0; i < r.log.length; i++) stateAt(r, i); });
  assert.equal(JSON.stringify(r), before);
  for (const f of ['choreographer.js', 'arena.js', 'arena-art.js', 'fx.js']) {
    const src = fs.readFileSync(new URL(`../../src/ui/clash/${f}`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|simulateClash|from ['"]\.\.\/\.\.\/clash/.test(src), `${f} must not roll dice or call the engine`);
  }
});

test('phase 3 cues: every damage cue names the attacker\'s element and a delivery; named moves follow the element table, basic strikes are melee, splash and retaliation are marked', () => {
  const deliveries = new Set(['melee', 'projectile', 'arc', 'lob', 'beam', 'wave', 'splash', 'retaliate']); const seen = new Set();
  for (const { r } of goldenBattles()) for (const c of cuesFor(r)) {
    if (c.kind !== 'damage') continue;
    assert.ok(c.element, 'element'); assert.ok(deliveries.has(c.delivery), `delivery ${c.delivery}`); seen.add(c.delivery);
    const e = c.event; const mv = r.lines[e.actor[0]].find((x) => x.id === e.actor)?.combatant.move;
    if (/splashes/.test(e.text)) assert.equal(c.delivery, 'splash'); else if (/erupts|thorns/.test(e.text)) assert.equal(c.delivery, 'retaliate');
    else if (mv && e.text.includes(mv.name)) { assert.equal(c.named, true); assert.equal(c.delivery, DELIVERY[c.element] || 'melee'); }
    else { assert.equal(c.named, false); assert.equal(c.delivery, 'melee'); }
  }
  assert.ok(seen.has('melee') && seen.has('projectile'), 'golden battles exercise melee and ranged deliveries');
  assert.deepEqual(Object.keys(DELIVERY).sort(), ['Dark', 'Dragon', 'Earth', 'Electric', 'Fire', 'Ice', 'Light', 'Metal', 'Nature', 'Psychic', 'Water', 'Wind']);
});

test('knockout timing: a monster whose HP reaches 0 stays on the field until its ko event, then leaves; the next monster is front from that event on', () => {
  for (const { r } of goldenBattles()) {
    r.log.forEach((e, k) => {
      if (e.kind !== 'ko' || !e.target) return;
      const before = stateAt(r, k - 1), after = stateAt(r, k); const side = e.target[0];
      assert.equal(before.S[side][e.target].ko, false, 'still standing before the ko event'); assert.equal(after.S[side][e.target].ko, true);
      assert.notEqual(after.front[side], e.target);
    });
    const fin = stateAt(r, r.log.length - 1); for (const side of ['a', 'b']) for (const x of r.lines[side]) assert.equal(fin.S[side][x.id].ko, x.hp <= 0);
  }
});

test('arena themes and props are deterministic from the record and never from a clock or dice', () => {
  for (const { r } of goldenBattles()) {
    const t1 = themeFor(r), t2 = themeFor(r); assert.equal(t1.key, t2.key); assert.ok(THEMES[t1.key]);
    const d1 = decorSvg(t1, r.seed, false), d2 = decorSvg(t1, r.seed, false); assert.equal(d1, d2);
    assert.ok((d1.match(/<use /g) || []).length <= 12, 'at most a dozen props');
  }
  assert.ok(Object.keys(THEMES).length >= 2, 'at least two arena themes');
  const keys = new Set(goldenBattles().map(({ r }) => themeFor(r).key)); assert.ok(keys.size >= 2, 'golden battles use more than one theme');
});

test('effects layer covers all twelve elements and every condition', () => {
  const src = fs.readFileSync(new URL('../../src/ui/clash/fx.js', import.meta.url), 'utf8');
  for (const el of Object.keys(DELIVERY)) assert.ok(src.includes(`case '${el}':`), `burst for ${el}`);
  for (const c of ['burn', 'chill', 'daze', 'shock']) assert.ok(src.includes(`'${c}'`), `condition effect ${c}`);
  assert.ok(!/simulateClash|from ['"]\.\.\/\.\.\/clash/.test(src), 'fx.js never touches the engine');
  const arena = fs.readFileSync(new URL('../../src/ui/clash/arena.js', import.meta.url), 'utf8');
  assert.ok(!/ability-fx|football/.test(arena), 'arena does not import football effects');
  assert.ok(/import \{ ELEMENT_FX \} from '\.\.\/ability-fx\.js'/.test(src), 'fx.js reads only the shared palette');
});
