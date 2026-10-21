// Beast Clash balance manifest (Gates B.2-B.5): the one authoritative record of every proposed change and of the
// configurations each gate was measured under. Lab and tools only: nothing in the game imports this file, and nothing
// here is live. A change becomes permanent only when the owner approves it and it is copied into clash-moves.js or
// values.js defaults (Balance Implementation Approval). Current values are read from the data, never retyped.
import { CLASH_VALUES, battleConfig } from './values.js';
import { CLASH_MOVES } from '../data/clash-moves.js';

const P = CLASH_VALUES.movePatches;

// ---- configuration adjustments shared by every proposed gate configuration (the Gate B working direction)
export const GATE_B_CONFIG = Object.freeze({ duration: 'C6' }); // back row E, Shock, sudden death E/F, swap cadence and O1-O3 off are already the defaults
export const SWAP_CONFIG = Object.freeze({ swapCost: 'half' }); // Gate B.2 rule, carried by B.2-B.5

// ---- patch sets, gate by gate (B.n = B.(n-1) with a species' patch replaced or added)
const replace = (base, id) => { const sp = P[id].species; return [...base.filter((x) => P[x].species !== sp), id]; };
const build = (base, ids) => ids.reduce(replace, base);
export const B2_PATCHES = Object.freeze(['zephiro_tailwind_combo', 'elderoot_grove_12', 'scorchulk_maul_first', 'tsunarok_undertow_hit_chill', 'aeralis_downdraft_hit', 'lumini_mend_10', 'zippit_charge_40', 'nocturne_eclipse_2', 'coglet_gearshot_heavy_break', 'cerebrix_foresight_refused_daze', 'wispira_veil_every4', 'duskyre_cut_every3']);
export const B3_PATCHES = Object.freeze(build(B2_PATCHES, ['aeralis_downdraft_daze', 'ripplet_undercurrent_08', 'umbrikit_pounce_not_voluntary']));
export const B4_PATCHES = Object.freeze(build(B3_PATCHES, ['coglet_break_charge', 'cerebrix_refused_daze_hit015', 'craggo_ram_chill', 'noctlet_always_first', 'sablewing_shadow_hex', 'aurodrax_sovereign_surge', 'scalor_hide_15_8', 'spriglet_seed_brace']));
// Gate B.5: the eight species the B.4 audit found functionally outclassed (Nocturne and Aeralis replace their earlier patches).
export const B5_ADDED = Object.freeze(['ferrcub_temper_big', 'terrabull_quake_sap_hex', 'nocturne_eclipse_opening3_80', 'tempestra_cyclone_storm', 'tideram_riptide_crash', 'aeralis_downdraft_anywhere_tailwind', 'echolot_echo_flat', 'cindruff_tumble_always']);
export const B5_PATCHES = Object.freeze(build(B4_PATCHES, B5_ADDED));

export const GATE_PATCHES = Object.freeze({ 'Gate B': Object.freeze([]), 'B.2': B2_PATCHES, 'B.3': B3_PATCHES, 'B.4': B4_PATCHES, 'B.5': B5_PATCHES });
/** The exact battle configuration a gate was measured under (plus optional policies). Frozen, validated by battleConfig. */
export function gateConfig(gate, extra = {}) {
  if (!GATE_PATCHES[gate]) throw new Error(`Unknown gate ${gate}`);
  return battleConfig({ ...GATE_B_CONFIG, ...(gate === 'Gate B' ? {} : SWAP_CONFIG), patches: GATE_PATCHES[gate], ...extra });
}

// ---- the manifest. kind: 'move' (changes a species' move), 'rule' (corrects a rule or exploit), 'config' (a battle switch).
// tests: the automated tests that cover the entry (file :: test name prefix). status: what the owner has decided.
const T = {
  b2exists: 'gateb2.test.js :: Gate B.2 patches exist', b2half: 'gateb2.test.js :: half-cost swap', b2refused: 'gateb2.test.js :: refused-swap effects and arrival conditions',
  b3exists: 'gateb3.test.js :: Gate B.3 patches exist', b3under: 'gateb3.test.js :: Undercurrent arrival hit', b3cad: 'gateb3.test.js :: shared forced-swap cadence', b3umb: 'gateb3.test.js :: Umbrikit dodgeEntry patches',
  b4exists: 'gateb4.test.js :: Gate B.4 candidates exist', b4break: 'gateb4.test.js :: breakCharge', b4refused: 'gateb4.test.js :: refused-effect hooks', b4cad: 'gateb4.test.js :: a firstAfterEntry Disruptor',
  manifest: 'gateb5.test.js :: every manifest move patch', fires: 'gateb5.test.js :: every recommended move patch fires', golden: 'engine.test.js :: determinism (golden seeds)',
  b5hooks: 'gateb5.test.js :: Gate B.5 hooks', b5int: 'gateb5.test.js :: the B.5 candidate configuration keeps', bands: 'gateb5.test.js :: recommended patched moves stay inside',
};
const PENDING = 'Awaiting owner approval (Lab-only)';
const mv = (gate, id, deps, tests, note = null) => ({ id, gate, kind: 'move', key: id, target: P[id].species, deps, tests, status: PENDING, note });
export const MANIFEST = Object.freeze([
  { id: 'duration_c6', gate: 'Gate B', kind: 'config', key: "duration: 'C6'", target: 'all battles', mechanic: 'Defensive duration (stalemate rule)', current: "Model F: no healing reduction (duration default 'F')", proposed: 'C6: from exchange 12, no knockout for 5 exchanges halves healing and shields; for 9, quarters them', deps: [], tests: ['experiments.test.js', T.golden], status: 'Gate B working direction; permanent default change awaiting owner approval' },
  { id: 'swap_cost_half', gate: 'B.2', kind: 'config', key: "swapCost: 'half'", target: 'all battles', mechanic: 'Voluntary swap cost', current: "'action': the swap uses the side's action", proposed: "'half': the incoming monster still acts this exchange at half strength (damage, heals, shields x0.5; condition rolls at half chance; magnitude-less effects withheld; its own swap move cannot fire)", deps: [], tests: [T.b2half, T.b3cad, T.b4cad], status: PENDING },
  mv('B.2', 'zephiro_tailwind_combo', [], [T.b2exists, T.manifest, T.fires]),
  mv('B.2', 'elderoot_grove_12', [], [T.manifest, T.fires]),
  mv('B.2', 'scorchulk_maul_first', [], [T.manifest, T.fires]),
  mv('B.2', 'tsunarok_undertow_hit_chill', ['arrivalCond engine hook (B.2)'], [T.b2exists, T.b2refused, T.b3cad, T.manifest, T.fires]),
  mv('B.2', 'lumini_mend_10', [], [T.manifest, T.fires]),
  mv('B.2', 'zippit_charge_40', [], [T.manifest, T.fires]),
  mv('B.2', 'wispira_veil_every4', [], [T.b2exists, T.manifest, T.fires]),
  mv('B.2', 'duskyre_cut_every3', [], [T.b2exists, T.manifest, T.fires]),
  mv('B.3', 'ripplet_undercurrent_08', ['hitMult on bench swaps (B.3)'], [T.b3exists, T.b3under, T.manifest, T.fires]),
  { ...mv('B.3', 'umbrikit_pounce_not_voluntary', ['dodgeEntry engine hook (B.3)', "swapCost 'half' (the exploit exists only when a voluntary swap still lets the incoming monster act)"], [T.b3umb, T.manifest]), kind: 'rule', note: 'Exploit correction carried on Umbrikit\'s move: a voluntary swap-in no longer re-arms the entry dodge. Not a power change; identical to the current move without voluntary swaps' },
  mv('B.4', 'coglet_break_charge', ['breakCharge engine hook (B.4)'], [T.b4exists, T.b4break, T.manifest, T.fires], 'Replaces B.2 coglet_gearshot_heavy_break (contains it and adds the break charge)'),
  mv('B.4', 'cerebrix_refused_daze_hit015', ['refusedEffect engine hook (B.2), hit/both (B.4)'], [T.b4exists, T.b4refused, T.manifest, T.fires], 'Replaces B.2 cerebrix_foresight_refused_daze (contains it and adds the 0.15x hit)'),
  mv('B.4', 'craggo_ram_chill', [], [T.b4exists, T.manifest, T.fires]),
  { ...mv('B.4', 'noctlet_always_first', ['an owner exception to the approved move rule "a move that always strikes first is not allowed"'], [T.b4exists, T.manifest, T.fires, T.bands]), note: 'Breaks the approved validation rule "a move that always strikes first is not allowed" (validate.js); permanent adoption needs an explicit owner exception or a replacement design' },
  mv('B.4', 'sablewing_shadow_hex', [], [T.b4exists, T.manifest, T.fires]),
  mv('B.4', 'aurodrax_sovereign_surge', [], [T.b4exists, T.manifest, T.fires]),
  mv('B.4', 'scalor_hide_15_8', [], [T.b4exists, T.manifest, T.fires]),
  mv('B.4', 'spriglet_seed_brace', [], [T.b4exists, T.manifest, T.fires]),
  mv('B.5', 'ferrcub_temper_big', ['forgeOnHit engine hook (B.5)'], [T.b5hooks, T.manifest, T.fires, T.bands]),
  mv('B.5', 'terrabull_quake_sap_hex', ['healCut engine hook (B.5)'], [T.b5hooks, T.manifest, T.fires, T.bands]),
  mv('B.5', 'nocturne_eclipse_opening3_80', ['opening engine hook (B.5)'], [T.b5hooks, T.manifest, T.fires, T.bands], 'Replaces B.2 nocturne_eclipse_2 (Eclipse duration 2 on its first strike)'),
  mv('B.5', 'tempestra_cyclone_storm', ['cycloneArrival engine hook (B.5)', 'shared forced-swap cadence'], [T.b5hooks, T.b5int, T.manifest, T.fires, T.bands]),
  mv('B.5', 'tideram_riptide_crash', ['sweepHit engine hook (B.5)', 'shared forced-swap cadence'], [T.b5hooks, T.b5int, T.manifest, T.fires, T.bands]),
  mv('B.5', 'aeralis_downdraft_anywhere_tailwind', ['arrivalCond (B.2)', 'hasteOnSwap engine hook (B.5)', 'shared forced-swap cadence'], [T.b5hooks, T.b5int, T.manifest, T.fires, T.bands], 'Replaces B.3 aeralis_downdraft_daze (keeps its arrival Daze, adds front activation and initiative)'),
  mv('B.5', 'echolot_echo_flat', ['echoFlat engine hook (B.5)'], [T.b5hooks, T.manifest, T.fires, T.bands]),
  mv('B.5', 'cindruff_tumble_always', [], [T.manifest, T.fires, T.bands]),
]);
// Engine hooks the move patches rely on. Each is inert unless a move carries its key; the golden fixture proves defaults unchanged.
export const ENGINE_HOOKS = Object.freeze([
  { key: 'arrivalCond', gate: 'B.2', meaning: 'a forced swap applies this condition to the arriving monster' },
  { key: 'refusedEffect', gate: 'B.2 (hit/both/chance in B.4)', meaning: 'a refused swap move falls back to a condition and/or a hit on the front' },
  { key: 'hitMult (bench swap)', gate: 'B.3', meaning: 'arrival-hit multiplier for a bench swap move (was the back-row rule 0.5x)' },
  { key: 'dodgeEntry', gate: 'B.3', meaning: "entry dodge re-arm rule: 'once' | 'notVoluntary'" },
  { key: 'breakCharge', gate: 'B.4', meaning: 'breaking a shield charges the attacker\'s next strike' },
  { key: 'firstAfterEntry bench exclusion', gate: 'B.4', meaning: 'a Disruptor whose move fires on its first strike after entry never acts from the bench (no default move is affected)' },
  { key: 'forgeOnHit', gate: 'B.5', meaning: 'a hit that takes at least `min` of the monster\'s HP adds a forge step (shared cap with the strike forge)' },
  { key: 'healCut / healCutFor', gate: 'B.5', meaning: 'while the move\'s condition lasts on a target (at most healCutFor exchanges), heals on it are multiplied by healCut' },
  { key: 'opening', gate: 'B.5', meaning: 'the move fires once at exchange 1 from any position (its strike trigger becomes once)' },
  { key: 'cycloneArrival', gate: 'B.5', meaning: 'a sweep applies the move\'s condition to the monster pulled forward; if the sweep is refused, to the front' },
  { key: 'sweepHit', gate: 'B.5', meaning: 'the monster a Balanced sweep pulls forward takes this arrival hit' },
  { key: 'hasteOnSwap', gate: 'B.5', meaning: 'a successful bench swap lets the swapping side\'s front act first that exchange' },
  { key: 'echoFlat', gate: 'B.5', meaning: 'the named strike adds this share of the last damage the attacker took, then the echo is spent' },
  { key: 'stripOnCond, afflict.chanceAbove, swapKind mostHurt', gate: 'B.5', meaning: 'tested hooks used only by rejected variants (inert; kept for reproducibility)' },
]);

/** Current and proposed values for a move entry, read from the data (so the manifest cannot drift from the code). */
export function describeEntry(e) {
  if (e.kind === 'config') return { current: e.current, proposed: e.proposed };
  const p = P[e.id]; const base = CLASH_MOVES[p.species];
  const current = {}; for (const k of Object.keys(p.changes)) current[k] = base[k] === undefined ? null : base[k];
  return { move: base.name, currentText: base.text, proposedText: p.label, current, proposed: { ...p.changes } };
}
/** The recommended configuration's move patches must be exactly the manifest's move and rule entries. */
export function manifestPatchIds() { return MANIFEST.filter((e) => e.kind !== 'config').map((e) => e.id); }
