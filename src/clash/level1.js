// Beast Clash Level 1 check (GDD §25.6-25.7): validates one species' ability against the fixed reference teams. It looks for
// broken interactions and invalid states, not win rates: win rates are reported as information and only extreme ones are flagged
// for a look. Pure and seeded. Lab and tools only; nothing in the game imports this file.
import { simulateClash, logHash } from './engine.js';
import { CLASH_VALUES, battleConfig, patchedMove } from './values.js';
import { syntheticMonster } from './batch.js';
import { REFERENCE_TEAMS, REFERENCE_PARTNERS } from './reference-teams.js';
import { CLASH_MOVES } from '../data/clash-moves.js';
import { createRng } from '../core/rng.js';

const V = CLASH_VALUES;

/** Invalid-state checks on one finished battle. Returns a list of problems (empty = clean). */
export function integrityProblems(r) {
  const out = []; const maxHp = {}; for (const side of ['a', 'b']) for (const x of r.lines[side]) maxHp[x.id] = x.maxHp;
  if (r.exchanges > V.battle.exchangeCap) out.push(`battle ran ${r.exchanges} exchanges (cap ${V.battle.exchangeCap})`);
  const koAt = {}; const lastForced = { a: -99, b: -99 }; const skips = {};
  for (const e of r.log) {
    const bad = (why) => out.push(`ex ${e.ex} ${e.kind}: ${why} (${e.text})`);
    if (e.kind === 'damage') { if (!Number.isFinite(e.damage) || e.damage < 0) bad('invalid damage'); if (e.hpAfter != null && (e.hpAfter < 0 || e.hpAfter > maxHp[e.target])) bad('HP out of range'); }
    if (e.kind === 'heal') { if (!Number.isFinite(e.amount) || e.amount < 0) bad('invalid heal'); if (e.hpAfter != null && e.hpAfter > maxHp[e.target]) bad('healed above max HP'); }
    if (e.kind === 'shield' && (!Number.isFinite(e.shield) || e.shield < 0)) bad('invalid shield');
    if (e.actor && koAt[e.actor] != null && e.ex > koAt[e.actor] && ['damage', 'heal', 'shield', 'condition', 'swap', 'buff'].includes(e.kind) && e.actor !== e.target) bad('a knocked-out monster acted');
    if (e.kind === 'ko' && e.target) koAt[e.target] = e.ex;
    if (e.kind === 'swap' && e.forced === true && e.target) { const s = e.target[0]; if (e.ex - lastForced[s] < V.swaps.forcedEvery) bad('forced swaps closer than the cadence allows'); lastForced[s] = e.ex; }
    if (e.kind === 'skip' && e.actor) { if (skips[e.actor] === e.ex - 1) bad('a monster lost two actions in a row'); skips[e.actor] = e.ex; }
  }
  return out;
}

/**
 * Level 1 check for `species` (optionally with a Lab `patch` on top of `config`). For each size (3, 5), the species plays with the
 * reference partners in every lineup position, against every reference team, from both sides, with and without the smart swap
 * policy. Returns { pass, problems, fires, firesBy, matchups, flags, battles }.
 */
export function level1Check({ species, config = {}, patch = null, n = 12, seed = 101 } = {}) {
  if (!CLASH_MOVES[species]) throw new Error(`Unknown species ${species}`);
  const patches = patch ? [...(config.patches || []).filter((x) => V.movePatches[x].species !== V.movePatches[patch].species), patch] : (config.patches || []);
  const base = battleConfig({ ...config, patches });
  const move = patchedMove(species, CLASH_MOVES[species], base);
  const rng = createRng(seed); const problems = []; const matchups = []; const flags = []; let fires = 0, battles = 0; const firesBy = { 3: 0, 5: 0 };
  for (const size of [3, 5]) {
    for (const [name, team] of Object.entries(REFERENCE_TEAMS[size])) {
      let wins = 0, played = 0, capped = 0;
      for (let k = 0; k < n; k++) {
        const slot = k % size; const mine = [...REFERENCE_PARTNERS[size]]; mine.splice(slot, 0, species);
        const mk = (ids) => ids.map((id) => syntheticMonster(id, { seed: rng.seed(), overall: 65 }));
        const A = mk(mine), B = mk(team); const mirrored = k % 2 === 1; const smart = k % 4 >= 2;
        const cfg = smart ? battleConfig({ ...base, policies: { a: 'smart', b: 'smart' } }) : base;
        const s = rng.seed(); const r = simulateClash({ a: mirrored ? B : A, b: mirrored ? A : B, seed: s, config: cfg });
        const side = mirrored ? 'b' : 'a'; const me = r.lines[side].find((x) => x.species === species);
        battles++; played++; if (r.winner === side) wins++; if (r.capped) capped++;
        for (const p of integrityProblems(r)) problems.push(`${size}v${size} v ${name} #${k}: ${p}`);
        const f = r.log.filter((e) => e.actor === me.id && e.text.includes(move.name)).length; fires += f; firesBy[size] += f;
        if (k === 0) { const again = simulateClash({ a: mirrored ? B : A, b: mirrored ? A : B, seed: s, config: cfg }); if (logHash(again) !== logHash(r)) problems.push(`${size}v${size} v ${name}: replay differs (determinism)`); }
      }
      const rate = Math.round(1000 * wins / played) / 10; matchups.push({ size, opponent: name, winPct: rate, n: played, capped });
      if (rate <= 5 || rate >= 95) flags.push(`${size}v${size} v ${name}: ${rate}% (extreme; look, do not tune by default)`);
      if (capped / played > 0.05) flags.push(`${size}v${size} v ${name}: ${capped} of ${played} battles reached the exchange cap`);
    }
  }
  if (!fires) problems.push(`${move.name} never fired in ${battles} battles`);
  for (const size of [3, 5]) if (!firesBy[size] && fires) flags.push(`${move.name} never fired in ${size}v${size}`);
  return { species, move: move.name, text: move.text, patch, pass: problems.length === 0, problems, fires, firesBy, matchups, flags, battles };
}
