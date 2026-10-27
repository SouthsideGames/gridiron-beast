// Zone coverage intelligence (v42.12, GDD §53.5h): zone defenders weigh the receivers in and entering their zone instead of always
// taking the deepest; deep defenders keep their depth; overloads force real choices (a split or a pick, not perfect coverage);
// Awareness changes how quickly and how well they read; zone anticipation uses the delayed, observed receiver movement; and the
// developer trace changes nothing in the play. Defenders read the quarterback only from what shows (his facing and throwing
// motion), and an aware deep defender is harder to look off.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { play } from '../src/lab/attr-trials.js';
import { PLAYS } from '../src/data/playbook.js';

const zoneSlots = (def) => PLAYS[def].onField.filter((s) => PLAYS[def].assignments[s]?.a === 'zone');
const covSlots = (def) => PLAYS[def].onField.filter((s) => ['man', 'zone', 'spy'].includes(PLAYS[def].assignments[s]?.a));
const run = (off, def, seed, extra = {}) => play({ off, def, defSubjects: extra.attr ? covSlots(def) : [], attr: extra.attr || null, value: extra.value ?? 65, seed, options: { trace: true, ...(extra.options || {}) } });
/** Every zone decision before the throw: { t, slot, role, z (the zone info), f (the frame) }. */
function zoneReads(sim, def) {
  const th = sim.events.find((e) => e.kind === 'throw'); const end = th ? th.t : 4; const out = [];
  for (const f of sim.frames) {
    if (!f.dbg || f.t > end) continue;
    for (const e of f.dbg) { const a = PLAYS[def].assignments[e[0]]; if (a?.a === 'zone' && e[1] === 'zone' && e[6]) out.push({ t: f.t, slot: e[0], role: a.role, z: e[6], f }); }
  }
  return out;
}

test('a deep defender never leaves a deep receiver in his zone to play an underneath back', () => {
  let deepReads = 0;
  for (const [off, def] of [['deep_post', 'cover_3'], ['four_verticals', 'cover_3'], ['dagger', 'cover_4'], ['smash', 'cover_2_zone']]) {
    for (let s = 0; s < 25; s++) {
      const sim = run(off, def, 7000 + s);
      for (const r of zoneReads(sim, def).filter((x) => x.role === 'deep')) {
        deepReads++;
        const depth = (sl) => sim.frames && r.f.off.find((p) => p[0] === sl)?.[1];
        const deepIn = (r.z.in || []).filter((sl) => depth(sl) > 12);
        if (deepIn.length && r.z.tgt) assert.ok(depth(r.z.tgt) > 8, `${off} vs ${def} seed ${7000 + s} t=${r.t}: deep ${r.slot} plays ${r.z.tgt} at ${depth(r.z.tgt)?.toFixed(1)} yd with ${deepIn} deep in his zone`);
      }
    }
  }
  assert.ok(deepReads > 200, `deep reads sampled: ${deepReads}`);
});

test('an overload is recognised and forces a choice: not always the deepest, and the defence is still beatable', () => {
  let overloads = 0, notDeepest = 0, splits = 0, completions = 0, thrown = 0;
  for (const [off, def] of [['flood', 'cover_3'], ['flood', 'cover_2_zone'], ['levels', 'tampa_2'], ['spacing', 'cover_3']]) {
    for (let s = 0; s < 30; s++) {
      const sim = run(off, def, 7100 + s);
      if (sim.events.some((e) => e.kind === 'throw')) { thrown++; if (sim.stats.receiver) completions++; }
      for (const r of zoneReads(sim, def)) {
        if (!r.z.overload) continue; overloads++; if (r.z.split) splits++;
        const depth = (sl) => r.f.off.find((p) => p[0] === sl)?.[1] ?? -99;
        const deepest = [...r.z.in].sort((a, b) => depth(b) - depth(a))[0];
        if (r.z.tgt && r.z.tgt !== deepest) notDeepest++;
      }
    }
  }
  assert.ok(overloads > 100, `overloaded reads: ${overloads}`);
  assert.ok(notDeepest / overloads > 0.15, `in an overload he sometimes plays a receiver other than the deepest (${notDeepest}/${overloads})`);
  assert.ok(splits > 0, `underneath defenders sometimes split two close threats (${splits})`);
  assert.ok(completions / thrown > 0.45, `overloads still complete often (${completions}/${thrown})`);
});

test('Awareness changes the read: 95 reads the throwing motion earlier than 50 (same seeds, same Coverage and Speed)', () => {
  const radius = (a) => (a.role === 'deep' ? 12 : a.role === 'middle' ? 7.5 : 7);
  const trulyIn = (a, p) => (a.role === 'deep' ? Math.abs(p[2] - a.at[1]) < radius(a) && p[1] > 5 : Math.hypot(p[1] - a.at[0], p[2] - a.at[1]) < radius(a)) && p[1] > -1;
  const study = (value) => {
    const recog = [], windup = [];
    for (const [off, def] of [['levels', 'tampa_2'], ['mesh', 'cover_3'], ['curl_flat', 'cover_3'], ['quick_slants', 'cover_3'], ['smash', 'cover_2_zone'], ['spacing', 'cover_3']]) {
      for (let s = 0; s < 40; s++) {
        const sim = run(off, def, 7200 + s, { attr: 'awareness', value }); const th = sim.events.find((e) => e.kind === 'throw'); const entered = {}; const sawWindup = {};
        for (const r of zoneReads(sim, def)) {
          const a = PLAYS[def].assignments[r.slot];
          for (const p of r.f.off) { if (!/^(WR|TE|RB|FB)/.test(p[0]) || !trulyIn(a, p)) continue; const k = `${r.slot}|${p[0]}`; if (entered[k] == null) entered[k] = r.t; if (r.z.tgt === p[0] && entered[k] >= 0) { recog.push(r.t - entered[k]); entered[k] = -1; } }
          if (th && r.z.why === 'QB winding up' && sawWindup[r.slot] == null) { sawWindup[r.slot] = 1; windup.push(th.t - r.t); }
        }
      }
    }
    return { recog: recog.reduce((a, b) => a + b, 0) / recog.length, windup: windup.reduce((a, b) => a + b, 0) / windup.length, n: windup.length };
  };
  const lo = study(50), hi = study(95);
  assert.ok(hi.windup > lo.windup + 0.03, `throwing motion read before the release: 95 ${hi.windup.toFixed(3)} s vs 50 ${lo.windup.toFixed(3)} s (${lo.n}/${hi.n})`);
});

test('zone anticipation reads observed, delayed movement, not the receiver\'s true velocity', () => {
  const src = fs.readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
  const zone = src.slice(src.indexOf('function zoneRead'), src.indexOf('function defenseTick'));
  assert.ok(zone.includes('zoneObserve('), 'zone reads use zoneObserve');
  assert.ok(!/\br\.vx\b|\br\.vy\b|\bc\.r\.vx\b/.test(zone), 'no true receiver velocity in the zone read');
  const obs = src.slice(src.indexOf('function zoneObserve'), src.indexOf('function zoneObserve') + 900);
  assert.ok(/history/.test(obs) && /zoneDelay/.test(obs), 'the observation comes from position history after a reaction delay');
  // the zone case steers with the observation too
  const tick = src.slice(src.indexOf('function defenseTick'));
  const zc = tick.slice(tick.indexOf('zoneRead(d'), tick.indexOf('zoneRead(d') + 2500);
  assert.ok(!/\br\.vx\b|\br\.vy\b/.test(zc), 'zone steering uses observed velocity');
});

test('zone defenders do not anticipate routes on runs or before a play-action fake resolves (the pass key)', () => {
  const src = fs.readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
  const zone = src.slice(src.indexOf('function zoneRead'), src.indexOf('function defenseTick'));
  assert.match(zone, /passKey\s*=\s*ball\.inAir \|\| \(ball\.holder === qb && !handoffDone && phase === 'dropback' && !\(isPlayAction && t < 1\.0\)\)/);
  assert.match(zone, /passKey && !isIn && edgeGap/);
});

test('zone plays replay identically from the same seed, and the developer trace changes nothing', () => {
  for (const [off, def] of [['flood', 'cover_3'], ['levels', 'tampa_2'], ['four_verticals', 'cover_3'], ['pa_post', 'cover_3']]) {
    for (const seed of [11, 12, 13]) {
      const a = play({ off, def, seed, options: { trace: true } }), b = play({ off, def, seed, options: { trace: true } }), c = play({ off, def, seed, options: {} });
      assert.equal(JSON.stringify(a.frames), JSON.stringify(b.frames), `${off} seed ${seed} replays identically`);
      const strip = (fr) => JSON.stringify(fr.map(({ dbg, ...rest }) => rest));
      assert.equal(strip(a.frames), strip(c.frames), `${off} seed ${seed}: trace on/off gives the same play`);
      assert.equal(a.yards, c.yards); assert.equal(a.result, c.result);
    }
  }
});

test('zone defenders read only what the quarterback shows: no access to his read, his decision or the landing spot before the throw', () => {
  const src = fs.readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
  const zone = src.slice(src.indexOf('function zoneRead'), src.indexOf('function defenseTick'));
  const zcase = src.slice(src.indexOf("case 'zone': {", src.indexOf('function defenseTick')), src.indexOf("case 'spy': {", src.indexOf('function defenseTick')));
  for (const [name, body] of [['zoneRead', zone], ['zone case', zcase]]) {
    assert.ok(!/qr\.cur|qr\.order|qb\.windup|qb\.decision|ball\.landing|ball\.target/.test(body), `${name} reads hidden QB or ball state`);
  }
  assert.match(zone, /seenFacing\(aw\)/, 'the quarterback is read through his seen facing');
  assert.match(src, /facingHist\.push\(fr \? \{ ang: Math\.atan2/, 'only the facing direction is recorded for the defense');
});

test('look-offs: an aware deep defender lets the quarterback\'s eyes decide fewer of his reads than an unaware one', () => {
  const share = (value) => {
    let eyes = 0, reads = 0;
    for (const [off, def] of [['four_verticals', 'cover_3'], ['deep_post', 'cover_3'], ['dagger', 'cover_4'], ['smash', 'cover_2_zone']]) {
      for (let s = 0; s < 25; s++) {
        for (const r of zoneReads(run(off, def, 7300 + s, { attr: 'awareness', value }), def)) { if (r.role !== 'deep') continue; reads++; if (r.z.why === 'QB eyes') eyes++; }
      }
    }
    return eyes / reads;
  };
  const lo = share(50), hi = share(95);
  assert.ok(hi < lo * 0.8, `deep reads decided by the QB's eyes: 95 ${(100 * hi).toFixed(1)}% vs 50 ${(100 * lo).toFixed(1)}%`);
  assert.ok(hi > 0.01, 'an aware defender still uses a held stare');
});
