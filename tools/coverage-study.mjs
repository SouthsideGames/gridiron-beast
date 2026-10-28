#!/usr/bin/env node
// Phase B coverage probes (bracket coverage and deep defensive intelligence). Developer tooling only: it runs the real engine
// through the Attribute Lab setup (src/lab/attr-trials.js: every monster a plain 65, no ability, no type, only the tested
// attribute changes) with fixed seeds, so the same command on two trees (--root) compares engines play for play. It changes
// nothing and stores nothing.
//
// Sections (--only=a,b; default all):
//   bracket   the left receiver's routes (deep, intermediate, short, crossing) against Bracket Left and the man / zone calls it
//             is meant to improve on: forced throws to him (completion, yards, separation from the nearest and second-nearest
//             defender at arrival) and the geometry of the two bracket defenders around him (who is under, who is over, spacing)
//   bracketqb the same plays with the real quarterback: how often he throws to the bracketed receiver, and how the rest of the
//             field does (the opportunity the bracket must create elsewhere)
//   deep      deep and play-action concepts (--plays=all: every pass play) against every defensive call, real quarterback:
//             completion, yards per attempt, 20+ yard completions, interceptions, sacks
//   attrs     Coverage, Awareness and Speed of the coverage defenders, 50..95, on deep concepts (largest adjacent step)
//   matchup   strong receivers against weak defenders and the reverse
//   node tools/coverage-study.mjs [--root=DIR] [--only=bracket,deep] [--n=120] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const N = Number(args.n) || 120; const only = args.only ? String(args.only).split(',') : null; const want = (k) => !only || only.includes(k);
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const { PLAYS, DEFENSE_IDS, manKeyTargets } = await import(path.join(ROOT, 'src/data/playbook.js'));
const r2 = (v) => (v == null || !Number.isFinite(v) ? null : +v.toFixed(2));
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const pct = (xs) => { const v = xs.filter((x) => x != null); return v.length ? +(100 * v.filter(Boolean).length / v.length).toFixed(1) : null; };
const seeds = (base, n = N) => Array.from({ length: n }, (_, i) => base + i);
const coverSlots = (def) => PLAYS[def].onField.filter((s) => ['man', 'zone', 'spy'].includes(PLAYS[def].assignments[s]?.a));
const forced = (target, at) => ({ qb: { mode: 'human', at, action: 'throw', target } });
const out = { root: ROOT, n: N };
const log = (...a) => { if (!args.quiet) console.log(...a); };
const posOf = (f, team, slot) => f[team].find((p) => p[0] === slot);
const ev = (s, k) => s.events.find((e) => e.kind === k);
const thrownOf = (s) => !!ev(s, 'throw');
function passLine(sims) {
  const th = sims.filter(thrownOf);
  return { n: sims.length, att: th.length, comp: pct(th.map((s) => !!s.stats.receiver)), ypa: mean(th.map((s) => s.yards)), ypp: mean(sims.map((s) => s.yards)),
    exp20: pct(th.map((s) => !!s.stats.receiver && s.yards >= 20)), int: pct(th.map((s) => !!s.stats.interceptor)), sack: pct(sims.map((s) => s.result === 'sack')), sep: mean(th.map((s) => s.stats.arriveSep)) };
}
/** At the arrival of a throw to `slot`: distance from the ball to the nearest and second-nearest unengaged defender. */
function arrival(sim) {
  const th = ev(sim, 'throw'); if (!th) return null; const arr = sim.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > th.t); if (!arr) return null;
  const f = sim.frames.find((x) => x.t >= arr.t - 1e-6) || sim.frames.at(-1); const ds = f.def.filter((d) => !d[3]).map((d) => Math.hypot(d[1] - f.ball[0], d[2] - f.ball[1])).sort((a, b) => a - b);
  return { m1: ds[0], m2: ds[1] };
}

// The bracketed receiver (Bracket Left's 'wideL') on each play, and when a forced throw to him is due (his route developed).
const BRACKET_PLAYS = [
  ['deep_post', 2.3, 'post (deep)'], ['three_verticals', 2.4, 'go (deep)'], ['double_move', 2.6, 'double move (deep)'], ['deep_corner', 2.3, 'skinny post (deep)'],
  ['pa_post', 2.6, 'play-action post'], ['pa_shot', 2.7, 'play-action go'], ['flood', 2.3, 'go (clear-out)'], ['y_cross', 2.2, 'post (crossing set)'],
  ['levels', 1.9, 'dig (intermediate)'], ['smash', 1.9, 'dig (intermediate)'], ['curl_flat', 1.8, 'comeback'], ['mesh', 2.0, 'corner'],
  ['quick_slants', 1.0, 'slant (short)'], ['slot_fade', 1.6, 'drag (shallow cross)'],
].filter(([p]) => PLAYS[p]);
const BRACKET_COMPARE = ['bracket_left', 'cover_1', 'man_press', 'cover_3', 'cover_6', 'cover_2_zone', 'cover_4'].filter((d) => PLAYS[d]);

if (want('bracket')) {
  const res = {};
  for (const [off, at, label] of BRACKET_PLAYS) {
    const tgt = manKeyTargets(PLAYS[off]).wideL; res[off] = { label, target: tgt, calls: {} };
    for (const def of BRACKET_COMPARE) {
      const sims = seeds(61000).map((s) => T.play({ off, def, attr: 'speed', value: 65, seed: s, options: { ...forced(tgt, at), trace: def === 'bracket_left' } }));
      const line = passLine(sims); const arr = sims.map(arrival).filter(Boolean); line.m1 = mean(arr.map((a) => a.m1)); line.m2 = mean(arr.map((a) => a.m2)); line.double = pct(arr.map((a) => a.m2 < 2.5));
      if (def === 'bracket_left') {
        // Geometry at the throw: the corner (CB1) and the safety (SS) relative to the receiver. Under = shallower than him; over = deeper.
        // Inside = between him and the middle of the field. Spacing = between the two defenders.
        const g = sims.map((s) => { const th = ev(s, 'throw'); if (!th) return null; const f = s.frames.find((x) => x.t >= th.t - 1e-6); const w = posOf(f, 'off', tgt), cb = posOf(f, 'def', 'CB1'), ss = posOf(f, 'def', 'SS'); if (!w || !cb || !ss) return null;
          const inside = (d) => Math.sign(-w[2] || 1) * (d[2] - w[2]); // + = toward the middle
          const dbg = f.dbg ? Object.fromEntries(f.dbg.map((e) => [e[0], `${e[1]}${e[2] ? ` · ${e[2]}` : ''}`])) : {};
          return { cbDepth: cb[1] - w[1], ssDepth: ss[1] - w[1], cbInside: inside(cb), ssInside: inside(ss), spacing: Math.hypot(cb[1] - ss[1], cb[2] - ss[2]), ssToW: Math.hypot(ss[1] - w[1], ss[2] - w[2]), cbToW: Math.hypot(cb[1] - w[1], cb[2] - w[2]), ssWhy: dbg.SS || '', wDepth: w[1] }; }).filter(Boolean);
        const whyCount = {}; for (const x of g) { const k = x.ssWhy.replace(/\(\d in zone\)/, '').trim(); whyCount[k] = (whyCount[k] || 0) + 1; }
        line.geo = { wrDepth: mean(g.map((x) => x.wDepth)), cbDepth: mean(g.map((x) => x.cbDepth)), ssDepth: mean(g.map((x) => x.ssDepth)), cbInside: mean(g.map((x) => x.cbInside)), ssInside: mean(g.map((x) => x.ssInside)), spacing: mean(g.map((x) => x.spacing)), cbToW: mean(g.map((x) => x.cbToW)), ssToW: mean(g.map((x) => x.ssToW)), ssOnHim: pct(g.map((x) => x.ssToW < 4)), bothUnder: pct(g.map((x) => x.cbDepth < 0 && x.ssDepth < 0)), ssWhy: Object.entries(whyCount).sort((a, b) => b[1] - a[1]).slice(0, 4) };
      }
      res[off].calls[def] = line;
    }
    const b = res[off].calls.bracket_left, c1 = res[off].calls.cover_1;
    log(`bracket ${off.padEnd(16)} ${label.padEnd(22)} BL comp ${b.comp} ypa ${b.ypa} m1 ${b.m1} m2 ${b.m2} dbl ${b.double}% | C1 comp ${c1.comp} ypa ${c1.ypa} m2 ${c1.m2} | C3 ${res[off].calls.cover_3?.comp}/${res[off].calls.cover_3?.ypa}`);
    log(`   geo: WR ${b.geo.wrDepth} deep; CB1 ${b.geo.cbDepth} over / ${b.geo.cbInside} inside (${b.geo.cbToW} away); SS ${b.geo.ssDepth} over / ${b.geo.ssInside} inside (${b.geo.ssToW} away, on him ${b.geo.ssOnHim}%); spacing ${b.geo.spacing}; SS: ${b.geo.ssWhy.map(([k, v]) => `${k} ${v}`).join(' | ')}`);
  }
  out.bracket = res;
}

if (want('bracketqb')) {
  const res = {};
  for (const [off] of BRACKET_PLAYS) {
    const tgt = manKeyTargets(PLAYS[off]).wideL; res[off] = {};
    for (const def of BRACKET_COMPARE) {
      const sims = seeds(62000).map((s) => T.play({ off, def, attr: 'speed', value: 65, seed: s }));
      const th = sims.filter(thrownOf); const toT = th.filter((s) => s.stats.target === tgt), else_ = th.filter((s) => s.stats.target !== tgt);
      res[off][def] = { ...passLine(sims), share: pct(th.map((s) => s.stats.target === tgt)), tgt: passLine(toT), rest: passLine(else_) };
    }
    const b = res[off].bracket_left, c = res[off].cover_1;
    log(`bracketqb ${off.padEnd(16)} BL: ${b.share}% to ${tgt} (comp ${b.tgt.comp}, ${b.tgt.ypa}) rest ${b.rest.comp}/${b.rest.ypa} | all ${b.ypp} yd/play | C1: ${c.share}% (comp ${c.tgt.comp}, ${c.tgt.ypa}) rest ${c.rest.comp}/${c.rest.ypa} | all ${c.ypp}`);
  }
  out.bracketqb = res;
}

const ALL_PASS = (await import(path.join(ROOT, 'src/data/playbook.js'))).OFFENSE_IDS.filter((k) => PLAYS[k].type !== 'run');
const DEEP = args.plays === 'all' ? ALL_PASS : ['deep_post', 'three_verticals', 'double_move', 'deep_corner', 'slot_fade', 'te_seam', 'wheel', 'pa_post', 'pa_shot', 'four_verticals', 'levels', 'dagger', 'y_cross'].filter((p) => PLAYS[p]);
if (want('deep')) {
  const res = {};
  for (const off of DEEP) { res[off] = {}; for (const def of DEFENSE_IDS) res[off][def] = passLine(seeds(63000).map((s) => T.play({ off, def, attr: 'speed', value: 65, seed: s }))); }
  const byCall = Object.fromEntries(DEFENSE_IDS.map((d) => [d, { ypa: mean(DEEP.map((o) => res[o][d].ypa)), ypp: mean(DEEP.map((o) => res[o][d].ypp)), comp: mean(DEEP.map((o) => res[o][d].comp)), exp20: mean(DEEP.map((o) => res[o][d].exp20)), int: mean(DEEP.map((o) => res[o][d].int)), sack: mean(DEEP.map((o) => res[o][d].sack)) }]));
  const byPlay = Object.fromEntries(DEEP.map((o) => [o, { ypp: mean(DEFENSE_IDS.map((d) => res[o][d].ypp)), comp: mean(DEFENSE_IDS.map((d) => res[o][d].comp)), exp20: mean(DEFENSE_IDS.map((d) => res[o][d].exp20)) }]));
  for (const [d, v] of Object.entries(byCall).sort((a, b) => a[1].ypp - b[1].ypp)) log(`deep ${d.padEnd(14)} ${v.ypp} yd/play, comp ${v.comp}%, ${v.ypa} ypa, 20+ ${v.exp20}%, int ${v.int}%, sack ${v.sack}%`);
  for (const [o, v] of Object.entries(byPlay)) log(`deep play ${o.padEnd(16)} ${v.ypp} yd/play comp ${v.comp}% 20+ ${v.exp20}%`);
  out.deep = { cells: res, byCall, byPlay };
}

const LEVELS = [50, 58, 65, 72, 80, 88, 95];
if (want('attrs')) {
  const cells = [['deep_post', 'cover_1'], ['three_verticals', 'cover_3'], ['double_move', 'cover_1'], ['deep_post', 'bracket_left'], ['three_verticals', 'cover_4'], ['levels', 'cover_2_zone'], ['pa_post', 'cover_3'], ['y_cross', 'cover_1']].filter(([o, d]) => PLAYS[o] && PLAYS[d]);
  const res = {};
  for (const attr of ['coverage', 'awareness', 'speed']) {
    res[attr] = {};
    for (const [off, def] of cells) {
      const row = LEVELS.map((v) => passLine(seeds(64000).map((s) => T.play({ off, def, defSubjects: coverSlots(def), attr, value: v, seed: s }))));
      res[attr][`${off}|${def}`] = row;
    }
    const agg = LEVELS.map((_, i) => mean(Object.values(res[attr]).map((row) => row[i].ypp)));
    const compAgg = LEVELS.map((_, i) => mean(Object.values(res[attr]).map((row) => row[i].comp)));
    const steps = agg.slice(1).map((v, i) => r2(v - agg[i]));
    res[attr].agg = { ypp: agg, comp: compAgg, steps, total: r2(agg.at(-1) - agg[0]) };
    log(`attrs ${attr.padEnd(10)} yd/play ${agg.join(' / ')} (50→95 ${res[attr].agg.total}; steps ${steps.join(' ')}) comp ${compAgg.join(' / ')}`);
    for (const [k, row] of Object.entries(res[attr])) if (k !== 'agg') log(`   ${k.padEnd(28)} ${row.map((x) => x.ypp).join(' / ')}`);
  }
  out.attrs = res;
}

if (want('matchup')) {
  // Every receiver one level, every coverage defender another; Speed, Coverage, Catching and Agility move together.
  const setSide = (side, slots, v, keys) => { for (const s of slots) for (const k of keys) side[s].attrs[k] = v; };
  const recv = (off) => Object.keys(PLAYS[off].assignments).filter((s) => PLAYS[off].assignments[s].a === 'route');
  const cells = [['deep_post', 'cover_1'], ['three_verticals', 'cover_3'], ['deep_post', 'bracket_left'], ['levels', 'cover_2_zone'], ['curl_flat', 'man_press']].filter(([o, d]) => PLAYS[o] && PLAYS[d]);
  const res = {};
  for (const [off, def] of cells) {
    const row = {};
    for (const [rv, dv] of [[50, 50], [95, 50], [50, 95], [95, 95], [80, 65], [65, 80]]) {
      row[`${rv}v${dv}`] = passLine(seeds(65000).map((s) => T.play({ off, def, attr: 'speed', value: 65, seed: s, extra: (o, d) => { setSide(o, recv(off), rv, ['speed', 'agility', 'catching']); setSide(d, coverSlots(def), dv, ['speed', 'agility', 'coverage', 'awareness']); } })));
    }
    res[`${off}|${def}`] = row;
    log(`matchup ${off}|${def}: ${Object.entries(row).map(([k, v]) => `${k} ${v.ypp} yd (comp ${v.comp}%, 20+ ${v.exp20}%)`).join('; ')}`);
  }
  out.matchup = res;
}

if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
