// Beast Clash balance manifest (Gates B.2-B.5, final review, values 1.1.0 implementation): the one authoritative record of every
// proposed change, the owner's decision on it, and the configurations each gate was measured under. Lab and tools only: nothing in
// the game imports this file. The owner approved 15 patches, two system settings and one card correction on 2026-10-21; they were
// copied into clash-moves.js and values.js (values 1.1.0) and are the permanent game. Every other patch here is an inactive Lab
// experiment. Historical gates replay under the frozen values 1.0.0 ruleset, so their measurements keep their meaning.
import { CLASH_VALUES, battleConfig } from './values.js';
import { CLASH_MOVES } from '../data/clash-moves.js';
import { CLASH_MOVES_V1_0_0 } from '../data/clash-moves-v1.0.0.js';

const P = CLASH_VALUES.movePatches;

// ---- configuration adjustments shared by every proposed gate configuration (the Gate B working direction)
// Every gate was measured on the values 1.0.0 game, so a gate configuration names that ruleset and both settings explicitly.
export const GATE_B_CONFIG = Object.freeze({ ruleset: 'v1.0.0', duration: 'C6', swapCost: 'action' }); // back row E, Shock, sudden death E/F, swap cadence, O1-O3 off
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

// Final implementation review (2026-10-21, revised philosophy, GDD §25): the recommended configuration. Lab-only until approved.
// It keeps the changes justified by correctness, an exploit fix, counterplay evidence or clarity, plus the optional changes the
// review leans to keep; three species use their earlier (B.2/B.3) patch instead of the later viability-driven one.
export const FINAL_PATCHES = Object.freeze(['umbrikit_pounce_not_voluntary', 'wispira_veil_every4', 'duskyre_cut_every3', 'scorchulk_maul_first', 'echolot_echo_flat',
  'zephiro_tailwind_combo', 'tsunarok_undertow_hit_chill', 'ripplet_undercurrent_08', 'cerebrix_foresight_refused_daze', 'aurodrax_sovereign_surge', 'nocturne_eclipse_2', 'aeralis_downdraft_daze', 'cindruff_tumble_always']);

// Owner-approved permanent configuration (authorization 2026-10-21): the Final preset plus Elderoot's 12% Ancient Grove and
// Tempestra's Storm Cyclone. Implemented in values 1.1.0: gateConfig('Approved') (values 1.0.0 + these patches) plays exactly like
// the permanent game, permanentConfig(). Noctlet's always-first change was declined; every other experiment is not approved.
export const OWNER_ADDED = Object.freeze(['elderoot_grove_12', 'tempestra_cyclone_storm']);
export const APPROVED_PATCHES = Object.freeze([...FINAL_PATCHES, ...OWNER_ADDED]);

export const GATE_PATCHES = Object.freeze({ 'Gate B': Object.freeze([]), 'B.2': B2_PATCHES, 'B.3': B3_PATCHES, 'B.4': B4_PATCHES, 'B.5': B5_PATCHES, Final: FINAL_PATCHES, Approved: APPROVED_PATCHES });
export const APPROVED_SETTINGS = Object.freeze({ duration: 'C6', swapCost: 'half' });
export const DECLINED_PATCHES = Object.freeze(['noctlet_always_first']);
export const PERMANENT_VERSION = CLASH_VALUES.version;
/** The permanent game's configuration (values 1.1.0 defaults: no patches, no experiments), plus optional Lab switches. */
export function permanentConfig(extra = {}) { return battleConfig({ ...extra }); }
/** The owner's decision on a manifest item. */
export function decisionOf(id) {
  if (APPROVED_PATCHES.includes(id) || id === 'duration_c6' || id === 'swap_cost_half') return 'implemented';
  return DECLINED_PATCHES.includes(id) ? 'declined' : 'not approved';
}
export const STATUS_TEXT = Object.freeze({ implemented: 'Implemented permanently in values 1.1.0 (owner approval 2026-10-21)', declined: 'Declined by the owner (2026-10-21); inactive Lab experiment that fails validation', 'not approved': 'Not approved; inactive Lab experiment' });
/** The exact battle configuration a gate was measured under (values 1.0.0 ruleset, plus optional policies). Frozen, validated by battleConfig. */
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
const mv = (gate, id, deps, tests, note = null) => ({ id, gate, kind: 'move', key: id, target: P[id].species, deps, tests, status: STATUS_TEXT[decisionOf(id)], note });
export const MANIFEST = Object.freeze([
  { id: 'duration_c6', gate: 'Gate B', kind: 'config', key: "duration: 'C6'", target: 'all battles', mechanic: 'Defensive duration (stalemate rule)', current: "Model F: no healing reduction (duration default 'F')", proposed: 'C6: from exchange 12, no knockout for 5 exchanges halves healing and shields; for 9, quarters them', deps: [], tests: ['experiments.test.js', T.golden], status: STATUS_TEXT.implemented },
  { id: 'swap_cost_half', gate: 'B.2', kind: 'config', key: "swapCost: 'half'", target: 'all battles', mechanic: 'Voluntary swap cost', current: "'action': the swap uses the side's action", proposed: "'half': the incoming monster still acts this exchange at half strength (damage, heals, shields x0.5; condition rolls at half chance; magnitude-less effects withheld; its own swap move cannot fire)", deps: [], tests: [T.b2half, T.b3cad, T.b4cad], status: STATUS_TEXT.implemented },
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

// Patches that are not in the B.5 manifest but are recommended in the final configuration (earlier versions of a species' change).
export const ALTERNATES = Object.freeze([
  { id: 'cerebrix_foresight_refused_daze', gate: 'B.2', kind: 'move', key: 'cerebrix_foresight_refused_daze', target: 'cerebrix', deps: ['refusedEffect engine hook (B.2)'], tests: [T.b2refused, 'readiness.test.js'], status: STATUS_TEXT.implemented, note: 'B.2 version of the Cerebrix change, without B.4\'s 0.15x hit' },
  { id: 'nocturne_eclipse_2', gate: 'B.2', kind: 'move', key: 'nocturne_eclipse_2', target: 'nocturne', deps: [], tests: ['readiness.test.js'], status: STATUS_TEXT.implemented, note: 'B.2 version of the Nocturne change: Eclipse lasts two exchanges, still on its first strike' },
  { id: 'aeralis_downdraft_daze', gate: 'B.3', kind: 'move', key: 'aeralis_downdraft_daze', target: 'skywarden', deps: ['arrivalCond engine hook (B.2)'], tests: [T.b3exists, T.b3cad, 'readiness.test.js'], status: STATUS_TEXT.implemented, note: 'B.3 version of the Aeralis change: the swapped-in monster is Dazed; still from the back only' },
]);

// The review of every item under the revised philosophy. verdict: 'recommend' (justified on its own), 'keep' (optional, the review
// leans to keep), 'drop' (optional, the review leans not to adopt), 'not' (not recommended). basis names why it exists.
const R = (verdict, basis, reason, cardText = null) => Object.freeze({ verdict, basis, reason, cardText });
export const REVIEW = Object.freeze({
  duration_c6: R('recommend', 'system', 'Ends defensive stalemates (5 Supports mirror reached the cap in 6.8% of battles under Model F); pacing'),
  swap_cost_half: R('recommend', 'system', 'Makes voluntary swapping a real decision: the incoming monster still acts, at half strength'),
  umbrikit_pounce_not_voluntary: R('recommend', 'exploit', 'Closes a loop where swapping Umbrikit out and back re-armed its entry dodge', 'Every second strike hits 1.3x; it dodges the first strike after it enters the front, except when it swaps in by choice'),
  wispira_veil_every4: R('recommend', 'counterplay', 'Without it the Wispira + Florant + Galyx stack beats random teams 99% of the time and every accessible counter wins 0-15%; with it four accessible counters win 66-83%', 'Every fourth exchange shields an ally with an illusion that absorbs a hit'),
  duskyre_cut_every3: R('recommend', 'counterplay', 'Without it Duskyre alone wins 84% of battles and 93% against Tank lines, and twice as many strikes aimed at it miss (2.2 a battle): an interaction that stops opponents acting', 'Every third strike hits 1.4x and it dodges the next hit'),
  scorchulk_maul_first: R('recommend', 'counterplay', 'Scorchulk anchors every accessible counter to the Support stack; keeping its never-first clause cuts those counters by 8-16 points', 'Every second strike hits 1.5x and Burns'),
  echolot_echo_flat: R('recommend', 'correctness', 'The card says it returns part of the damage it took; the code added only 3-5%. The flat echo does what the card says (alternative: keep the mechanic and reword the card)', 'Every second strike hits 1.3x and adds half of the last damage it took'),
  zephiro_tailwind_combo: R('keep', 'viability', 'Tailwind fired every fourth exchange and was rarely felt; every second exchange with a small heal is easy to read. No new mechanic', 'Every second exchange heals every ally 6% and makes allies strike 15% harder for three exchanges'),
  tsunarok_undertow_hit_chill: R('keep', 'viability', 'The drag now visibly does something to the arriving monster; uses the shared arrival hook', 'Every second exchange, from anywhere, drags the opponent\'s back monster to the front, striking it at half strength and Chilling it'),
  ripplet_undercurrent_08: R('keep', 'clarity', 'Replaces a card that exposed an internal rule ("arrival hit set by the back-row rule") with a plain number; makes it distinct from Downdraft', 'From the back, every second exchange swaps the opponent\'s front two and hits the new front at 0.8x'),
  cerebrix_foresight_refused_daze: R('keep', 'clarity', 'Foresight is often refused by the shared swap cadence and then did nothing; a Daze on refusal gives visible feedback. Recommended instead of B.4\'s version', 'Every second exchange pulls the opponent\'s strongest monster to the back; when it cannot, it Dazes the front'),
  aurodrax_sovereign_surge: R('keep', 'viability', 'Gives Aurodrax the standard Balanced rhythm (every second strike 1.3x) that most Balanced moves have; no new mechanic', 'Every second strike hits 1.3x; its strikes cannot be dodged or reduced; +20% in sudden death'),
  nocturne_eclipse_2: R('keep', 'correctness', 'A one-exchange Eclipse barely reaches the benched monsters its card names (0.3 Dazed strikes each); two exchanges makes the whole-line effect real (1.1). Recommended instead of B.5\'s opening Eclipse', 'Its first strike Dazes the whole opposing line for two exchanges'),
  aeralis_downdraft_daze: R('keep', 'clarity', 'The swap now has a visible arrival effect and is distinct from Ripplet\'s; recommended instead of B.5\'s version', 'From the back, every second exchange swaps the opponent\'s front two and Dazes the monster swapped in'),
  cindruff_tumble_always: R('keep', 'clarity', 'A simpler card: every heavy strike Burns, with no HP condition', 'Every second strike hits 1.3x and Burns'),
  elderoot_grove_12: R('drop', 'viability', 'A buff to lift a weak species; Elderoot stayed outclassed. Harmless if you want it', 'Every second exchange heals every ally 12%'),
  lumini_mend_10: R('drop', 'viability', 'A buff to lift a weak species; Lumini stayed outclassed. Harmless if you want it', 'Every second exchange heals the two most hurt allies 10% each'),
  zippit_charge_40: R('drop', 'viability', 'A buff to lift a weak species; Zippit stayed at Unproven. Harmless if you want it', 'Every second exchange charges the front ally\'s next strike +40%'),
  coglet_break_charge: R('drop', 'viability', 'A new mechanic (breakCharge) created to give Coglet a niche; the current card works as written', 'Every second strike hits 1.3x and breaks shields twice as fast; breaking a shield makes its next strike hit 50% harder; its strikes never roll below full damage'),
  cerebrix_refused_daze_hit015: R('drop', 'viability', 'The 0.15x hit was added for viability; the B.2 refusal Daze alone gives the feedback', 'Every second exchange pulls the opponent\'s strongest monster to the back; when it cannot, it Dazes the front and strikes it at 0.15x'),
  craggo_ram_chill: R('drop', 'viability', 'Adds a second effect to a card that works; created for a niche', 'Every second strike hits 1.3x, or 1.6x against a shielded foe, and may Chill the target'),
  sablewing_shadow_hex: R('drop', 'viability', 'Turns a back-row Disruptor into a front-and-back one for viability; the current card is accurate', 'Every second strike from the front, or every second exchange from the back, Dazes the opposing front'),
  scalor_hide_15_8: R('drop', 'viability', 'A threshold change for viability; the current card works', 'When a hit takes 15% of its HP, it heals 8% (once each exchange)'),
  spriglet_seed_brace: R('drop', 'viability', 'Adds a second effect for viability', 'Every second exchange heals the front ally 10% and the next ally 6%; the front ally takes only 85% of its next hit'),
  ferrcub_temper_big: R('drop', 'viability', 'A new mechanic (forgeOnHit) created to make Ferrcub viable; the current card works as written. The most thematic of the B.5 ideas if you want one', 'Every second strike hits 1.3x and raises its own attack 5%; a hit that takes 10% of its HP raises it 8%; up to four times in all'),
  nocturne_eclipse_opening3_80: R('drop', 'viability', 'A new trigger (opening) created for viability; the B.2 two-exchange Eclipse fixes the reach problem with no new mechanic', 'At the start of the battle, from anywhere, it has an 80% chance to Daze the whole opposing line for three exchanges'),
  tempestra_cyclone_storm: R('drop', 'viability', 'A new mechanic (cycloneArrival) and a faster trigger for viability; the current card works as written. Your call if you want a stronger Legendary', 'Every third strike sweeps the opposing front to the back and Dazes the monster pulled forward; if the sweep is refused, it Dazes the front'),
  noctlet_always_first: R('not', 'viability', 'Created for viability and needs an exception to an approved validation rule; not worth weakening the rule for (exception package prepared if you want it)', 'It strikes first every exchange (a hastened opponent, or a Roar, still overrides it)'),
  terrabull_quake_sap_hex: R('not', 'viability', 'A new mechanic (healCut) for viability, and Terrabull stayed outclassed; the real defect is its card, fixed by a text correction', 'Every second strike from the front, or every second exchange from the back, Chills the opposing front (from the back, the next in line too); a Chilled target heals at 50% for up to three exchanges'),
  tideram_riptide_crash: R('not', 'viability', 'A new mechanic (sweepHit) for viability with only a borderline result', 'Every second strike hits 1.3x and, if the target survives, sweeps it to the back of its line; the monster pulled forward takes a 0.5x hit'),
  aeralis_downdraft_anywhere_tailwind: R('not', 'viability', 'A new mechanic (hasteOnSwap) plus front activation for viability; the B.3 version keeps the visible arrival Daze', 'Every second exchange, from anywhere, swaps the opponent\'s front two and Dazes the monster swapped in; from the back, its own front then strikes first'),
});
// Card wording fixes for moves whose card did not match what they do (no mechanic change). Implemented in values 1.1.0.
export const TEXT_CORRECTIONS = Object.freeze({
  terrabull: Object.freeze({ text: 'From the back, every second exchange shakes the opposing front two, Chilling them', reason: 'Quake Step only acts from the bench (0 times in front in 600 test battles), but the card does not say so' }),
});
// The Noctlet always-first exception was declined (2026-10-21): validation has no exception list, and noctlet_always_first fails it.

/** Current and proposed values for a move entry, read from the data (so the manifest cannot drift from the code). */
export function describeEntry(e) {
  if (e.kind === 'config') return { current: e.current, proposed: e.proposed };
  const p = P[e.id]; const base = CLASH_MOVES_V1_0_0[p.species]; const now = CLASH_MOVES[p.species];
  const current = {}; for (const k of Object.keys(p.changes)) current[k] = base[k] === undefined ? null : base[k];
  return { move: base.name, currentText: base.text, proposedText: p.label, current, proposed: { ...p.changes }, permanentText: now.text, decision: decisionOf(e.id) };
}
/** The recommended configuration's move patches must be exactly the manifest's move and rule entries. */
export function manifestPatchIds() { return MANIFEST.filter((e) => e.kind !== 'config').map((e) => e.id); }
/** Every move entry the final review covers (B.5 manifest + alternates). */
export const REVIEWED_ENTRIES = Object.freeze([...MANIFEST, ...ALTERNATES]);
/** A values 1.0.0 move table with the given patches applied, each with its reviewed card text, plus text corrections.
 * finalMoveTable(APPROVED_PATCHES) is exactly the permanent table (tested). */
export function finalMoveTable(patchIds = FINAL_PATCHES) {
  const out = { ...CLASH_MOVES_V1_0_0 };
  for (const [sp, t] of Object.entries(TEXT_CORRECTIONS)) out[sp] = { ...out[sp], text: t.text };
  for (const id of patchIds) { const sp = P[id].species; out[sp] = { ...out[sp], ...P[id].changes, text: REVIEW[id]?.cardText ?? out[sp].text }; }
  return out;
}
