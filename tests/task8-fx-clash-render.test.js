// Task 8 Clash ability presentation, render smoke (no DOM; docs/task8/FX_CLASH_MATRIX.md): the t8 timeline agrees with the engine's
// own end state; for every Clash ability (first form, mastery 0) the reviewer scenario's activation frame is drawn through the real
// layer drawer at full, low and min quality: well-formed markup, no NaN, the same string twice (deterministic), the information layer
// (status badge, ability icon) present at every quality, the PROVISIONAL label only in provisional mode. Drawing never touches the
// engine record (visuals never feed the engine): the result is frozen and its state hash is unchanged by a draw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registeredClashAbilities } from '../src/clash/t8/registry.js';
import { t8StateAt, t8CuesFor, t8CueAt, DURATION } from '../src/ui/clash/t8/timeline.js';
import { buildClashT8, drawClashT8, t8Hold, t8Live, clashStatusBadge, abilityIcon, pips, turnMarker } from '../src/ui/clash/t8/fx-t8.js';
import { prepare, drawAt, geomAt, pickScenario, LOOKS, STAGE } from './helpers/fx-clash.js';

const IDS = registeredClashAbilities();
const VOID = new Set(['circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'path', 'stop', 'use', 'image']);
function wellFormed(svg) { const st = []; for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) { const [, close, name, , self] = m; if (self || (VOID.has(name) && !close && /\/$/.test(m[0].slice(0, -1)))) continue; if (close) { if (st.pop() !== name) return `unbalanced </${name}>`; } else if (!self) st.push(name); } return st.length ? `unclosed <${st[st.length - 1]}>` : null; }

test('the t8 timeline: one cue per event in order with a tier and a start time; the state after the last event matches the engine', () => {
  for (const id of IDS) {
    const P = prepare({ abilityId: id, scenarioId: pickScenario(id, 0, 0).id }); const r = P.result; const cues = P.cues;
    assert.equal(cues.length, r.log.length, `${id}: one cue per event`);
    cues.forEach((c, i) => { assert.equal(c.i, i); assert.equal(c.event, r.log[i]); assert.ok(DURATION[c.tier] === c.duration, `${id}: tier ${c.tier}`); if (i) assert.ok(c.at >= cues[i - 1].at, 'monotonic'); });
    const st = t8StateAt(r, r.log.length - 1);
    for (const side of ['a', 'b']) for (const x of r.lines[side]) { const s = st.S[x.id]; assert.equal(s.hp, x.hp, `${id} ${x.id}: HP`); assert.equal(s.ko, x.koed, `${id} ${x.id}: knocked out`); if (!r.pending) assert.equal(!!s.status, false, `${id} ${x.id}: standalone statuses clear at the end`); }
    if (r.pending) for (const side of ['a', 'b']) assert.equal(st.active[side], r.lines[side].find((x) => x.active)?.id || null, `${id}: the active fighter on side ${side}`);
    assert.equal(t8CueAt(cues, cues[cues.length - 1].at + 5), cues[cues.length - 1]);
  }
});

test('every Clash ability: the activation frame draws at every quality, deterministic, well-formed, no NaN; the engine record is untouched', () => {
  assert.equal(IDS.length, 72);
  for (const id of IDS) {
    const P = prepare({ abilityId: id, scenarioId: pickScenario(id, 0, 0).id }); const own = P.state.items.find((it) => it.id === id && it.main) || P.state.items.find((it) => it.id === id);
    assert.ok(own, `${id}: a drawable item`); const t = own.t0 + 0.2; const hashBefore = P.result.stateHash; assert.ok(Object.isFrozen(P.result), 'the result is frozen');
    for (const q of ['full', 'low', 'min']) {
      const a = drawAt(P, t, q), b = drawAt(P, t, q); const sa = a.under + a.over + a.hud, sb = b.under + b.over + b.hud;
      assert.equal(sa, sb, `${id} ${q}: deterministic`); assert.ok(!/NaN|undefined|Infinity/.test(sa), `${id} ${q}: no NaN`); assert.equal(wellFormed(sa), null, `${id} ${q}: well-formed`);
      assert.ok(a.hud.includes('<rect') || a.hud.includes('<circle'), `${id} ${q}: the information layer draws`);
      assert.ok(a.over.length + a.under.length > 0, `${id} ${q}: the ability draws something at its activation`);
      assert.equal(/PROVISIONAL/.test(a.hud), !!P.result.provisional, `${id} ${q}: the PROVISIONAL label only in provisional mode`);
    }
    const red = drawAt(P, t, 'full', true); assert.ok(!/NaN/.test(red.over + red.hud), `${id}: reduced motion draws`);
    assert.equal(P.result.stateHash, hashBefore, `${id}: drawing changed nothing`);
    assert.ok(t8Hold(P.state) >= 0 && typeof t8Live(P.state, t) === 'boolean');
  }
});

test('the shared pieces: the status badge shows the id glyph, the remaining count, the shield pool and the Deep Winter ice; the ability icon shows cooldown, restriction and the broken circuit', () => {
  const b = clashStatusBadge(10, 10, 6, { id: 'shielded', remaining: 3, pool: 24 }, { frozen: 2 });
  assert.ok(b.includes('◈') && b.includes('>3<') && b.includes('>24<') && b.includes('<polygon'), 'badge pieces');
  assert.equal(wellFormed(b), null);
  const i = abilityIcon(10, 10, 6, { a: '#fff', glyph: '🔥' }, { cd: 2, cdMax: 5, ready: false, restricted: true, broken: true, armed: true });
  assert.ok(i.includes('>2<') && i.includes('<path') && (i.match(/<line/g) || []).length >= 2, 'icon pieces'); assert.equal(wellFormed(i), null);
  assert.equal((pips(0, 0, 6, 2, 3, '#fff').match(/<rect/g) || []).length, 3); assert.ok(turnMarker(0, 0, 6, 1).includes('>1<'));
});

test('a look never draws for an ability without a stream, and the geometry helper lays every living monster out inside the stage', () => {
  const P = prepare({ abilityId: 'FIR-01-C', scenarioId: 'misses-no-charge' });
  assert.equal(P.state.items.filter((it) => it.id === 'FIR-01-C' && it.main).length, 0, 'no activation: no activation item');
  const g = geomAt(P.result, P.cues, 1); for (const side of ['a', 'b']) for (const x of P.result.lines[side]) { const p = g.pos(x.id); if (!p) continue; assert.ok(p.x >= 0 && p.x <= STAGE.W && p.y >= 0 && p.y <= STAGE.H, `${x.id} inside the stage`); }
  for (const id of IDS) assert.ok(LOOKS[id].name && LOOKS[id].element, `${id}: name and element`);
  void buildClashT8; void drawClashT8; void t8CuesFor;
});
