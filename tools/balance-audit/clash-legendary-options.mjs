#!/usr/bin/env node
// Beast Clash ability options study (follow-up brief I-3, investigation only). The clash-focus design (each focus family in N random
// 3 v 3 battles, last form, full mastery, abilities on and off on the same seeds), with the focus monster's own contribution read
// from the full battle log, and with an optional VARIANT of the four legendary signatures loaded through a module hook in this
// process only (tools/balance-audit/clash-variant-hooks.mjs; no file changes; the shipped game is untouched).
//
//   node tools/balance-audit/clash-legendary-options.mjs --only=tempestra,glacivern [--variant=B|C] [--n=2000] [--split=status]
//        [--json=FILE]
//
// Per family: win % with abilities on / off and the difference (the "ability effect", as in the audit), its standard error, the
// focus monster's executions (battles with none), its damage per battle and per turn, the mean damage of its ordinary attacks and of
// its signature hits, the share of its turns spent on the signature, and the battle-by-battle results (bits) so variants can be paired
// with the shipped run on the same seeds. --split=status also splits the effect by whether the foe team holds a monster whose ability
// applies a harmful status (cerebrix's STATUS_SOURCES) — the matchup dependence check for Foresight.
import { writeFileSync } from 'node:fs';
import { register } from 'node:module';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (args.variant) { process.env.CLASH_VARIANT = String(args.variant); register('./clash-variant-hooks.mjs', import.meta.url); }
const { simulateClashT8 } = await import('../../src/clash/t8/index.js');
const { FAMILIES, formsOf, abilityById } = await import('../../src/data/beast-dex.js');
const { generateMonster } = await import('../../src/data/monsters.js');
const { createRng, hashString } = await import('../../src/core/rng.js');
const { STATUS_SOURCES } = await import('../../src/clash/abilities/cerebrix.js');
const N = Number(args.n) || 2000; const ONLY = String(args.only || '').split(',').filter(Boolean);
const WITH = FAMILIES.filter((f) => f.abilities?.clash);
const mk = (fam, quality, { stage = null, tier = 0, salt = '' } = {}) => { const m = generateMonster(createRng(hashString(`t10:${fam.id}:${quality}:${salt}`)), { species: fam.id, position: fam.position, quality, age: 26, yearsPro: 5, apexRoll: false }); m.fatigue = 0; m.injury = null; if (stage != null) m.stage = stage; m.clashMasteryTier = tier; return m; };
const top = WITH.map((fam) => ({ fam, m: mk(fam, 70, { stage: formsOf(fam.id).length - 1, tier: 3 }) }));
const fight = (a, b, seed, abilities, log) => simulateClashT8({ a, b, seed, config: { ruleset: 't8', abilities }, log });
const out = { tool: 'balance-audit/clash-legendary-options', variant: args.variant || 'A (shipped)', n: N, families: {} };
for (const id of ONLY) {
  const me = top.find((x) => x.fam.id === id); if (!me) { console.error('no family', id); continue; }
  const r = createRng(hashString(`focus:${id}`)); let on = 0, off = 0, ex = 0, none = 0; const bits = [];
  let dmg = 0, turns = 0, ordHits = 0, ordDmg = 0, sigHits = 0, sigDmg = 0, sigTurns = 0; const split = { src: [0, 0, 0], none: [0, 0, 0] };
  const draw = (ban) => { const t = []; while (t.length < (ban.length ? 3 : 2)) { const x = top[r.int(top.length)]; if (x !== me && !t.includes(x) && !ban.includes(x)) t.push(x); } return t; };
  for (let g = 0; g < N; g++) {
    const mates = draw([]); const foes = draw([me, ...mates]); const a = [me, ...mates], b = foes; const seed = 1 + g * 7919;
    const flip = g % 2 === 1; const A = flip ? b : a, B = flip ? a : b, side = flip ? 'b' : 'a';
    const rOn = fight(A.map((x) => x.m), B.map((x) => x.m), seed, 'on', 'full'), rOff = fight(A.map((x) => x.m), B.map((x) => x.m), seed, 'off', 'none');
    const wOn = rOn.winner === side, wOff = rOff.winner === side; if (wOn) on++; if (wOff) off++; bits.push(wOn ? 1 : 0);
    const e = rOn.mastery?.[me.m.id]?.executions || 0; ex += e; if (!e) none++;
    const myLine = `${side}0`; // the focus monster leads its side's lineup
    const turnSet = new Set();
    for (const ev of rOn.log || []) {
      if (ev.actor !== myLine) continue;
      if (ev.kind === 'turn_start') turns++;
      if (ev.kind === 'damage' && ev.damage != null) { dmg += ev.damage; if (ev.tag === 'ordinary') { ordHits++; ordDmg += ev.damage; } else if (ev.abilityId && ev.abilityId === me.fam.abilities.clash) { sigHits++; sigDmg += ev.damage; } }
      if (ev.kind === 'ability' || ev.kind === 'execution') turnSet.add(`${ev.ex}:${ev.turnIndex ?? ''}`);
    }
    sigTurns += turnSet.size;
    const hasSrc = foes.some((x) => STATUS_SOURCES.includes(x.fam.id)); const s = hasSrc ? split.src : split.none; s[0]++; if (wOn) s[1]++; if (wOff) s[2]++;
  }
  const pts = (w, l, n) => +(100 * (w - l) / Math.max(1, n)).toFixed(1);
  const row = { family: id, ability: abilityById(me.fam.abilities.clash)?.name, abilityId: me.fam.abilities.clash, rarity: me.fam.rarity, battles: N, winOnPct: +(100 * on / N).toFixed(1), winOffPct: +(100 * off / N).toFixed(1), abilityPts: pts(on, off, N), se: +(100 * Math.sqrt(0.5 / N)).toFixed(1),
    exPerBattle: +(ex / N).toFixed(2), noExecutionPct: +(100 * none / N).toFixed(1), dmgPerBattle: +(dmg / N).toFixed(1), turnsPerBattle: +(turns / N).toFixed(2), dmgPerTurn: +(dmg / Math.max(1, turns)).toFixed(1),
    ordinaryHitMean: +(ordDmg / Math.max(1, ordHits)).toFixed(1), signatureHits: sigHits, signatureHitMean: sigHits ? +(sigDmg / sigHits).toFixed(1) : null, signatureTurnSharePct: +(100 * sigTurns / Math.max(1, turns)).toFixed(1),
    split: args.split ? { foeHasStatusSource: { battles: split.src[0], abilityPts: pts(split.src[1], split.src[2], split.src[0]), se: +(100 * Math.sqrt(0.5 / Math.max(1, split.src[0]))).toFixed(1) }, noStatusSource: { battles: split.none[0], abilityPts: pts(split.none[1], split.none[2], split.none[0]), se: +(100 * Math.sqrt(0.5 / Math.max(1, split.none[0]))).toFixed(1) } } : undefined,
    bits: bits.join('') };
  out.families[id] = row; const { bits: _b, ...show } = row; console.log(JSON.stringify(show));
}
if (args.json) writeFileSync(String(args.json), JSON.stringify(out, null, 1));
