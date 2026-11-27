#!/usr/bin/env node
// Balance audit R-10 (2026-11-25): a focused version of task10-clash-strength study D (random 3 v 3 teams of the families, last form,
// full mastery, abilities on and off on the same seeds) for chosen families: every battle has the focus family on one side with two
// random team-mates, against three random families, so each focus family gets N battles instead of about N/12. Reports the ability
// effect (win % on − off), executions per battle and battles with none, as study D does. Measurement only; nothing is changed.
//   node tools/balance-audit/clash-focus.mjs --only=boulderox,cerebrix [--n=600] [--json=FILE]
import { writeFileSync } from 'node:fs';
import { simulateClashT8 } from '../../src/clash/t8/index.js';
import { FAMILIES, formsOf, abilityById } from '../../src/data/beast-dex.js';
import { generateMonster } from '../../src/data/monsters.js';
import { createRng, hashString } from '../../src/core/rng.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n) || 600; const ONLY = String(args.only || '').split(',').filter(Boolean);
const WITH = FAMILIES.filter((f) => f.abilities?.clash);
const mk = (fam, quality, { stage = null, tier = 0, salt = '' } = {}) => { const m = generateMonster(createRng(hashString(`t10:${fam.id}:${quality}:${salt}`)), { species: fam.id, position: fam.position, quality, age: 26, yearsPro: 5, apexRoll: false }); m.fatigue = 0; m.injury = null; if (stage != null) m.stage = stage; m.clashMasteryTier = tier; return m; };
const top = WITH.map((fam) => ({ fam, m: mk(fam, 70, { stage: formsOf(fam.id).length - 1, tier: 3 }) }));
const fight = (a, b, seed, abilities) => simulateClashT8({ a, b, seed, config: { ruleset: 't8', abilities }, log: 'none' });
const out = { tool: 'balance-audit/clash-focus', n: N, families: {} };
for (const id of ONLY) {
  const me = top.find((x) => x.fam.id === id); if (!me) { console.error('no family', id); continue; }
  const r = createRng(hashString(`focus:${id}`)); let on = 0, off = 0, ex = 0, none = 0;
  const draw = (ban) => { const t = []; while (t.length < (ban.length ? 3 : 2)) { const x = top[r.int(top.length)]; if (x !== me && !t.includes(x) && !ban.includes(x)) t.push(x); } return t; };
  for (let g = 0; g < N; g++) {
    const mates = draw([]); const foes = draw([me, ...mates]); const a = [me, ...mates], b = foes; const seed = 1 + g * 7919;
    const flip = g % 2 === 1; const A = flip ? b : a, B = flip ? a : b, side = flip ? 'b' : 'a';
    const rOn = fight(A.map((x) => x.m), B.map((x) => x.m), seed, 'on'), rOff = fight(A.map((x) => x.m), B.map((x) => x.m), seed, 'off');
    if (rOn.winner === side) on++; if (rOff.winner === side) off++; const e = rOn.mastery?.[me.m.id]?.executions || 0; ex += e; if (!e) none++;
  }
  const row = { family: id, ability: abilityById(me.fam.abilities.clash)?.name, rarity: me.fam.rarity, battles: N, winOnPct: +(100 * on / N).toFixed(1), winOffPct: +(100 * off / N).toFixed(1), abilityPts: +(100 * (on - off) / N).toFixed(1), se: +(100 * Math.sqrt(0.5 / N)).toFixed(1), exPerBattle: +(ex / N).toFixed(2), noExecutionPct: +(100 * none / N).toFixed(1) };
  out.families[id] = row; console.log(JSON.stringify(row));
}
if (args.json) writeFileSync(String(args.json), JSON.stringify(out, null, 1));
