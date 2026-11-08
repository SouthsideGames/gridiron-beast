// Test helper (Task 8 M3 ability batches): one engine play with Dex monsters placed on chosen slots of frozen lineups.
import { simulatePlay } from '../../src/sim/engine.js';
import { PLAYS } from '../../src/data/playbook.js';
import { lineup } from './lineup.js';

/**
 * place: { off: { SLOT: { species, form?, mastery?, type?, id?, attrs? } }, def: {...} } — merged over lineup(11, 60) / lineup(12, 64).
 * Every slot gets a stable id (`o_SLOT` / `d_SLOT`) unless given. Returns the engine result; `t8` is the game-scope block (mutated).
 */
export function abilityPlay({ seed = 1, off = 'inside_zone', def = 'cover_3', place = {}, t8 = { status: {} }, options = {}, ballOn = 30, offSeed = 11, defSeed = 12 } = {}) {
  const L = lineup(offSeed, 60), D = lineup(defSeed, 64);
  const build = (side, base, pre) => Object.fromEntries(Object.entries(base[side]).map(([slot, p]) => {
    const o = place[side === 'offense' ? 'off' : 'def']?.[slot];
    const m = { ...p, id: `${pre}_${slot}` };
    if (o) Object.assign(m, { form: `${o.species}:0`, mastery: 0, type: o.type || null, name: o.name || o.species, ...o, attrs: { ...p.attrs, ...(o.attrs || {}) } });
    return [slot, m];
  }));
  return simulatePlay({ offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense: build('offense', L, 'o'), defense: build('defense', D, 'd'), ballOn, seed, options: { t8, ...options } });
}
export const evs = (r, ability, kind = null) => r.events.filter((e) => e.ability === ability && (!kind || e.kind === kind));
