#!/usr/bin/env node
// Task 10 Beast Clash ability strength (measurement only; the Task 8 engine, src/clash/t8). Three studies on mature monsters
// (quality 70, age 26, five seasons played, no Apex), every battle seeded and repeatable:
//   A  isolation   Each family's monster fights monsters that have no Clash ability (the Dex "Basic" species): alone against as
//                  many of them as makes the fight even, and 3 v 3 with two Basic team-mates. The same battles are run with
//                  abilities on and off; only the subject has an ability, so the difference is his ability alone. Reported at the
//                  first form with no mastery and at the last form with full mastery: executions per battle, battles with none,
//                  win rate off and on, battles whose winner changed (to a win, to a loss).
//   B  round robin Every family against every other, 1 v 1, last form and full mastery, abilities on and off: the win rate each
//                  family really has among its peers, and what abilities add or take relative to the others.
//   C  elements    From B with abilities off: win rate of the attacking type against each defending type, against the chart.
//   node tools/task10-clash-strength.mjs [--seeds=3] [--rr=6] [--only=fam,...] [--json=out.json]
import { writeFileSync } from 'node:fs';
import { simulateClashT8 } from '../src/clash/t8/index.js';
import { FAMILIES, formsOf, abilityById } from '../src/data/beast-dex.js';
import { generateMonster, monsterOverall } from '../src/data/monsters.js';
import { createRng, hashString } from '../src/core/rng.js';
import { chartEdge } from '../src/data/type-chart.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SEEDS = Number(args.seeds || 3), RR = Number(args.rr || 6); const ONLY = args.only ? new Set(String(args.only).split(',')) : null;
const WITH = FAMILIES.filter((f) => f.abilities?.clash), BASIC = FAMILIES.filter((f) => !f.abilities?.clash);
const mk = (fam, quality, { stage = null, tier = 0, salt = '' } = {}) => { const m = generateMonster(createRng(hashString(`t10:${fam.id}:${quality}:${salt}`)), { species: fam.id, position: fam.position, quality, age: 26, yearsPro: 5, apexRoll: false }); m.fatigue = 0; m.injury = null; if (stage != null) m.stage = stage; m.clashMasteryTier = tier; return m; };
const fight = (a, b, seed, abilities) => simulateClashT8({ a, b, seed, config: { ruleset: 't8', abilities }, log: 'none' });
const pct = (n, d) => (d ? +(100 * n / d).toFixed(1) : null);

// ---------------------------------------------------------------- A: isolation against monsters without an ability
// Basics are much weaker than the families that have abilities (median overall 35 against 65), so one against one is rarely a
// contest. The handicap is numbers, never a change to the subject: alone against K Basics, with K (1 to 5) chosen per family as
// the count that brings his win rate without abilities closest to 50%. `three` is the team case: he and two Basics against three.
const panel = BASIC.map((f) => ({ f, m: mk(f, 70) }));
function run(subject, size, K) {
  const r = { n: 0, winOff: 0, winOn: 0, toWin: 0, toLoss: 0, ex: 0, none: 0, exchOff: 0, exchOn: 0 };
  for (const [i, o] of panel.entries()) for (let s = 0; s < SEEDS; s++) {
    const seed = 1 + i * 131 + s * 7919; const pick = (k) => panel[(i * (7 + 2 * k) + 3 + 11 * k + s) % panel.length].m;
    const mates = size === 3 ? [pick(1), pick(2)] : []; const foes = [o.m, ...Array.from({ length: K - 1 }, (_, k) => pick(k + 3))];
    const flip = (i + s) % 2 === 1; const A = flip ? foes : [subject, ...mates], B = flip ? [subject, ...mates] : foes; const me = flip ? 'b' : 'a';
    const off = fight(A, B, seed, 'off'), on = fight(A, B, seed, 'on'); const wOff = off.winner === me ? 1 : 0, wOn = on.winner === me ? 1 : 0; const ex = on.mastery?.[subject.id]?.executions || 0;
    r.n++; r.winOff += wOff; r.winOn += wOn; if (wOn > wOff) r.toWin++; if (wOn < wOff) r.toLoss++; r.ex += ex; if (!ex) r.none++; r.exchOff += off.exchanges; r.exchOn += on.exchanges;
  }
  return { size, foes: K, battles: r.n, exPerBattle: +(r.ex / r.n).toFixed(2), noExecutionPct: pct(r.none, r.n), winOffPct: pct(r.winOff, r.n), winOnPct: pct(r.winOn, r.n), deltaPts: +(100 * (r.winOn - r.winOff) / r.n).toFixed(1), changedToWinPct: pct(r.toWin, r.n), changedToLossPct: pct(r.toLoss, r.n),
    exchangesOff: +(r.exchOff / r.n).toFixed(1), exchangesOn: +(r.exchOn / r.n).toFixed(1) };
}
function isolate(fam, v, size) {
  const subject = mk(fam, 70, { stage: v.stage, tier: v.tier });
  if (size === 3) return run(subject, 3, 3);
  let best = null; for (let K = 1; K <= 5; K++) { const x = run(subject, 1, K); if (!best || Math.abs(x.winOffPct - 50) < Math.abs(best.winOffPct - 50)) best = x; if (x.winOffPct < 50) break; }
  return best;
}
const A = []; const t0 = Date.now();
for (const fam of WITH) {
  if (ONLY && !ONLY.has(fam.id)) continue; const ab = abilityById(fam.abilities.clash) || {}; const forms = formsOf(fam.id);
  for (const v of [{ id: 'base', stage: 0, tier: 0 }, { id: 'top', stage: forms.length - 1, tier: 3 }]) {
    const subject = mk(fam, 70, { stage: v.stage, tier: v.tier });
    const row = { family: fam.id, ability: ab.name || fam.abilities.clash, abilityId: fam.abilities.clash, element: fam.type, rarity: fam.rarity, position: fam.position, variant: v.id, ovr: monsterOverall(subject), one: isolate(fam, v, 1), three: isolate(fam, v, 3) };
    A.push(row); console.log(JSON.stringify(row));
  }
}
// ---------------------------------------------------------------- B: round robin among the families, C: elements
let B = [], C = null;
if (!ONLY) {
  const top = WITH.map((fam) => ({ fam, m: mk(fam, 70, { stage: formsOf(fam.id).length - 1, tier: 3 }) })); const tally = new Map(top.map((x) => [x.fam.id, { n: 0, on: 0, off: 0, ex: 0 }])); const el = {};
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) for (let s = 0; s < RR; s++) {
    const x = top[i], y = top[j]; const flip = s % 2 === 1; const a = flip ? y : x, b = flip ? x : y; const seed = 1 + i * 977 + j * 131 + s * 7919;
    const on = fight([a.m], [b.m], seed, 'on'), off = fight([a.m], [b.m], seed, 'off');
    for (const [who, side] of [[a, 'a'], [b, 'b']]) { const t = tally.get(who.fam.id); t.n++; if (on.winner === side) t.on++; if (off.winner === side) t.off++; t.ex += on.mastery?.[who.m.id]?.executions || 0; }
    for (const [p, q, side] of [[a, b, 'a'], [b, a, 'b']]) { const e = chartEdge(p.fam.type, q.fam.type); const k = (el[e] ||= { n: 0, off: 0, on: 0 }); k.n++; if (off.winner === side) k.off++; if (on.winner === side) k.on++; }
  }
  B = top.map((x) => { const t = tally.get(x.fam.id); return { family: x.fam.id, ability: abilityById(x.fam.abilities.clash)?.name, element: x.fam.type, rarity: x.fam.rarity, position: x.fam.position, ovr: monsterOverall(x.m), battles: t.n, winOnPct: pct(t.on, t.n), winOffPct: pct(t.off, t.n), abilityPts: +(100 * (t.on - t.off) / t.n).toFixed(1), exPerBattle: +(t.ex / t.n).toFixed(2) }; }).sort((p, q) => q.winOnPct - p.winOnPct);
  C = Object.fromEntries(Object.entries(el).map(([k, v]) => [k, { battles: v.n, winOffPct: pct(v.off, v.n), winOnPct: pct(v.on, v.n) }]));
  for (const r of B) console.log(JSON.stringify(r)); console.log(JSON.stringify({ elements: C }));
}
if (args.json) writeFileSync(String(args.json), JSON.stringify({ seeds: SEEDS, rr: RR, basics: BASIC.length, families: WITH.length, sec: Math.round((Date.now() - t0) / 1000), A, B, C }));
