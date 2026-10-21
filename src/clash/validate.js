// Beast Clash data validation: the 72 moves against the registries, the archetype bands and
// their own card text. Runs as tests and in the Lab's Moves screen. Imports values, handlers, data.
import { CLASH_VALUES } from './values.js';
import { KINDS, TRIGGERS, EFFECTS } from './handlers.js';
import { CLASH_MOVES } from '../data/clash-moves.js';
import { SPECIES_DEX } from '../data/species.js';

const ARCH_COUNTS = { Striker: 15, Disruptor: 16, Balanced: 16, Support: 15, Tank: 10 };
const FIXED = new Set(['name', 'archetype', 'text', 'kind', 'trigger']);

/** Problems with the move table as a whole and each row. Empty when valid. */
export function validateMoves() {
  const out = []; const ids = Object.keys(CLASH_MOVES); const species = new Set(SPECIES_DEX.map((s) => s.id));
  for (const id of ids) if (!species.has(id)) out.push(`${id}: not a species ID`);
  for (const s of SPECIES_DEX) if (!CLASH_MOVES[s.id]) out.push(`${s.id}: no battle move`);
  const names = new Set(); const counts = {};
  for (const [id, m] of Object.entries(CLASH_MOVES)) {
    if (names.has(m.name)) out.push(`${id}: duplicate move name ${m.name}`); names.add(m.name);
    counts[m.archetype] = (counts[m.archetype] || 0) + 1;
    if (!CLASH_VALUES.archetypes[m.archetype]) out.push(`${id}: unknown archetype ${m.archetype}`);
    if (!KINDS.includes(m.kind)) out.push(`${id}: unknown kind ${m.kind}`);
    if (!m.trigger || !TRIGGERS.includes(m.trigger.kind)) out.push(`${id}: unknown trigger ${m.trigger?.kind}`);
    for (const k of Object.keys(m)) if (!FIXED.has(k) && !EFFECTS[k]) out.push(`${id}: unknown effect key ${k}`);
    if (m.trigger?.kind === 'every' && !(m.trigger.n >= 1)) out.push(`${id}: every-trigger needs n`);
    // Bands: a move cannot leave its archetype.
    const B = CLASH_VALUES.bands[m.archetype];
    if (m.archetype === 'Striker' && m.mult != null && (m.mult < B.mult[0] || m.mult > B.mult[1])) out.push(`${id}: Striker mult ${m.mult} outside ${B.mult}`);
    if (m.archetype === 'Balanced' && m.mult != null && !m.hits && m.mult !== B.mult[0]) out.push(`${id}: Balanced mult must be ${B.mult[0]}`);
    if (m.archetype === 'Tank' && (m.kind !== 'guard' || m.shield < B.shield[0] || m.shield > B.shield[1])) out.push(`${id}: Tank shield ${m.shield} outside ${B.shield}`);
    if (m.archetype === 'Support' && (m.kind !== 'mend' || m.heal < 0 || m.heal > B.heal[1])) out.push(`${id}: Support heal ${m.heal} outside ${B.heal}`);
    if (m.archetype === 'Disruptor') {
      if (!['hex', 'bench'].includes(m.kind)) out.push(`${id}: Disruptor must be hex or bench`);
      if (m.cond !== 'swap' && m.chance != null && m.chance < 1) { const band = m.cond === 'shock' ? B.shockChance : B.chance; if (m.chance < band[0] || m.chance > band[1]) out.push(`${id}: ${m.cond} chance ${m.chance} outside ${band}`); }
      if (m.cond === 'shock' && m.trigger.kind === 'every' && m.trigger.n !== CLASH_VALUES.shock.every) out.push(`${id}: Shock must be attempted every ${CLASH_VALUES.shock.every} strikes`);
    }
    if (m.priority && m.trigger.kind === 'always') out.push(`${id}: a move that always strikes first is not allowed`);
    if (m.afflict && !['burn', 'chill', 'daze', 'shock'].includes(m.afflict.cond)) out.push(`${id}: unknown afflict ${m.afflict.cond}`);
  }
  for (const [a, n] of Object.entries(ARCH_COUNTS)) if (counts[a] !== n) out.push(`archetype ${a}: ${counts[a]} moves, approved ${n}`);
  for (const [id, m] of Object.entries(CLASH_MOVES)) for (const p of cardCheck(id, m)) out.push(`${id}: card says ${p}`);
  return out;
}

/** Numbers and conditions named in the card text must equal the row's params. Returns the mismatches. */
export function cardCheck(id, m = CLASH_MOVES[id]) {
  const out = []; const nums = numbersOf(m);
  for (const [, x] of m.text.matchAll(/(\d+(?:\.\d+)?)x/g)) { const v = Number(x); if (!nums.some((n) => Math.abs(n - v) < 1e-9)) out.push(`${x}x but no param equals ${v}`); }
  for (const [, p] of m.text.matchAll(/(\d+)%/g)) { const v = Number(p) / 100; if (!nums.some((n) => Math.abs(n - v) < 1e-9)) out.push(`${p}% but no param equals ${v}`); }
  for (const c of ['Burn', 'Chill', 'Daze', 'Shock']) { const k = c.toLowerCase(); const named = new RegExp(`\\b${c}(s|ed|ing)?\\b`).test(m.text); const has = m.cond === k || m.afflict?.cond === k || m.retaliate?.cond === k || (k === 'daze' && m.cleanse === 'daze') || (k === 'shock' && m.skips); if (named && !has) out.push(`${c} but the move has no ${k}`); }
  if (/second (strike|exchange)/.test(m.text) && m.trigger.kind === 'every' && m.trigger.n !== 2 && !m.trigger.until) out.push(`every second but n is ${m.trigger.n}`);
  if (/fourth exchange/.test(m.text) && m.trigger.n !== 4) out.push('every fourth but n is not 4');
  return out;
}
function numbersOf(m) {
  const out = []; const walk = (o) => { for (const [k, v] of Object.entries(o)) { if (k === 'text' || k === 'name') continue; if (typeof v === 'number') out.push(v); else if (v && typeof v === 'object') walk(v); } };
  walk(m); if (m.perStage) out.push(m.perStage); if (m.rally) out.push(m.rally.exchanges);
  return out;
}
