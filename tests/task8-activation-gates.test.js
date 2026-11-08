// Task 8 M3 follow-up: the two shared activation gates on every football ability contract (docs/task8/M3_ABILITY_BRIEF.md).
// - ctx.canStartSignature(self): spec §11 Eclipse (Light + Dark hybrid: "prevent starting active signatures inside; existing
//   effects/passives/launched effects and charge/cooldowns continue; blocked start spends nothing") and ICE-05-F Cold Snap's
//   activation denial (engine.js activationAllowed: an opposing contract's `activationAttempt` hook).
// - ctx.canGainCharge(self): Cold Snap's charge side (a suppressed monster gains no new ability charge for the rest of the play).
// The static table below lists, for every contract module, the hooks where each gate is checked and why the others are not gated;
// the engine tests show the denial on a representative set (every element, every gated Dex category) with a real whole-field
// Eclipse, a stub suppressor that uses Cold Snap's own engine path, and the real Cold Snap.
// Probabilities (B12): no rate is asserted. Every denial is asserted on every sampled play; sample sizes and the minimum number of
// observed trigger situations are frozen below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abilityPlay } from './tools/ability-sim.js';
import { registerAbility, registeredFamilies, contractOf } from '../src/sim/abilities/registry.js';
import { PLAYS } from '../src/data/playbook.js';
import '../src/sim/abilities/index.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/sim/abilities');
const SHARED = new Set(['registry', 'index', 'review', 'review-scenarios', 'eligibility', 'common', 'earth-ice-util', 'fw-util', 'nature-electric-common', 'game']);

// family: [hooks checking ctx.canStartSignature(self), hooks checking ctx.canGainCharge(self), reading]
// "Out of play" = the pre-snap / pre-choice step (rules.js preSnap, field creation from a banked token), formula kicks, game hooks.
const GATES = {
  emberfox: [["tackleAttempt"], ["playEnd"], "the ignition at the first eligible tackle of a charged carry is the live activation (gated: a denied start is not an eligible tackle, the ignition is kept); the rushing charge earned at the whistle is an in-play charge gain (gated)."],
  ashkit: [[], ["playEnd"], "the zone is created before the snap by rules.js from the full bar (out of play: not gated); the tackle charge earned at the whistle is an in-play charge gain (gated)."],
  cinderclaw: [["engage"], [], "the mark at his first engagement while ready is the live activation (gated); cooldown only, no charge."],
  firestorm: [["tick"], [], "the powered release is the live activation (gated; the shockwave is its launched effect and continues); cooldown only, no charge."],
  pyrelynx: [[], [], "a passive aura (Dex category Aura) with no readiness, charge or cooldown: Eclipse leaves passives running and Cold Snap denies only new activations; not gated."],
  pyroclast: [[], ["playEnd"], "the field is created before his next offensive snap from the banked token (out of play: not gated); earning the token on the YAC run is an in-play charge gain (gated)."],
  mudcub: [["playStart"], [], "the automatic snap activation is the live activation (gated); cooldown only, no charge."],
  tidepaw: [["playEnd"], [], "the breakup creates the zone at once at the deflection spot: the live activation (gated at the whistle, where the breakup is known); cooldown only."],
  reefclaw: [["engage"], [], "the drain at his first engagement is the live activation (gated); cooldown only."],
  tidefin: [["dropped"], [], "the second catch attempt is the live activation (gated); cooldown only."],
  wavehorn: [[], [], "a passive aura decided by the snap assignment, no readiness: not gated."],
  tsunarok: [[], ["playEnd"], "the raindrop field is created before his team's next offensive snap (out of play, off-field allowed: not gated); the secured interception's earned field (and the cooldown it starts) is an in-play charge gain: a suppressed safety earns nothing and stays ready (gated)."],
  thornkit: [[], ["tick"], "the patches spawn in the pre-snap step (out of play: not gated); the token earned at the route cut is an in-play charge gain (gated)."],
  mossclaw: [["tick"], [], "the vault attempt is the live activation (gated; readiness kept when denied); cooldown only."],
  rootram: [["engage"], [], "rooting at his first engagement is the live activation (gated); cooldown only."],
  leafhorn: [[], [], "an automatic protection chosen in the pre-snap step before every defensive snap, with no readiness, charge or cooldown (nothing to deny or keep): treated as a passive grant, not gated."],
  thornback: [[], ["tackleBroken"], "the patch is created in the pre-snap step (out of play: not gated); the token earned by the broken tackle is an in-play charge gain (gated)."],
  elderoot: [["playStart"], [], "the snap summon is the live activation (gated); cooldown only."],
  flicker: [["playStart"], [], "the route-snap activation is the live activation (gated); cooldown only."],
  voltfin: [[], ["playEnd"], "the strip is created in the pre-snap step (out of play: not gated); the rushing first down's token is an in-play charge gain (gated)."],
  voltfang: [["playStart"], [], "the route-snap phase is the live activation (gated); cooldown only."],
  stormlynx: [[], [], "created automatically in the pre-snap step before each ready defensive play (rules.js preSnap: out of play, no in-play start); cooldown only, no charge: not gated."],
  joltrex: [["shed"], [], "the arc at a successful shed is the live activation (gated: a denied start keeps readiness for a later shed); cooldown only."],
  stormcrown: [["playStart"], [], "the guards' summon on a selected passing play is the live activation (gated); cooldown only."],
  pebble: [["pancakeOpportunity"], ["playEnd"], "the guaranteed pancake is the live activation (gated); banking a guarantee from an ordinary pancake is an in-play charge gain (gated)."],
  rockram: [["passRelease"], ["playEnd"], "the breakup at the release is the live activation (gated); the low-yardage bar is an in-play charge gain (gated)."],
  boulderox: [["tick"], [], "the charge at a defender ahead is the live activation (gated); cooldown only."],
  stoneguard: [[], [], "a formula punt (rules.js puntReturn): the kicker is not an engine actor and no field or Cold Snap reaches it; not gated."],
  terrabull: [["tick"], [], "the stone screen after the reception is the live activation (gated); cooldown only."],
  titanolith: [["playStart"], [], "the possession's first eligible snap is the live activation (gated; the use is kept for a later snap); no charge."],
  snowmoth: [[], [], "a made formula field goal banks the field and the field is created at the opposing pre-play (both out of play); not gated."],
  hailfang: [["tick"], [], "the snowball launch is the live activation (gated); cooldown only."],
  frostclaw: [["playStart"], ["playEnd"], "the snap summon is the live activation (gated); the low-yardage bar is an in-play charge gain (gated)."],
  icehorn: [[], ["playEnd"], "the zone is created at the pre-play from the banked token (out of play: not gated); banking it from a TFL or sack is an in-play charge gain (gated)."],
  glaciron: [[], [], "Cold Snap is the activation-denial aura itself (Dex category Aura): it answers the gate's activationAttempt hook and is not a signature start of its own; not gated (an Eclipse does not switch it off; no contract or ruling says otherwise)."],
  glacivern: [[], [], "a formula field-goal retry (rules.js fieldGoalMiss), out of play; not gated."],
  gustling: [[], [], "created by the pre-choice producer pass (rules.js preSnapContracts: out of play); cooldown only, no charge: not gated."],
  breezefang: [["tick"], ["playEnd"], "the gust at the first crossing is the live activation (gated: a denied start preserves the full bar); broken-tackle charges are in-play charge gains (gated)."],
  skywarden: [["catchMade"], ["playEnd"], "the push at the guarded catch is the live activation (gated: a denied start preserves the bar); pass-breakup charges are in-play charge gains (gated)."],
  windlynx: [[], ["playEnd"], "the lanes are created at the pre-play (out of play: not gated); pass-breakup charges are in-play charge gains (gated)."],
  zephyr: [["playStart"], [], "Dex category Aura, but the snap choice is a discrete use of a ready cooldown (the cooldown is spent when the unit is removed): the start of a signature, gated at the snap (denied: no target, nothing spent); no charge."],
  tempestra: [["catchMade"], ["playEnd"], "the tornado at the charged reception is the live activation (gated: the full bar is kept; launched blasts continue); reception charges are in-play charge gains (gated)."],
  shadowkit: [[], ["playEnd"], "the patch is created at the next defensive snap from the banked field (out of play: not gated); banking it from a pass breakup is an in-play charge gain (gated)."],
  nightowl: [[], [], "a passive aura (no cooldown or charges; the contract says it does not nullify Eclipse denial): not gated."],
  duskrunner: [["juke"], [], "the Vanishing Cut at the first qualifying juke is the live activation (gated: denied, that juke starts nothing and the cooldown is untouched); cooldown only."],
  mireclaw: [["playStart"], ["playEnd"], "the claw launch at the snap is the live activation (gated: the full charge is held); the team-stop bar is an in-play charge gain (gated)."],
  nocturne: [[], ["playEnd"], "the pocket is created at the next offensive pre-choice (out of play: not gated); banking it from a 15-yard completion is an in-play charge gain (gated)."],
  nyxshade: [["passRelease"], ["playEnd"], "the swap at a release is the live activation (gated: the bar is preserved); pass-breakup charges are in-play charge gains (gated)."],
  glimmer: [[], ["playEnd"], "the lane is created at the next offensive snap from the banked field (out of play: not gated); banking it from a first-down reception is an in-play charge gain (gated)."],
  sunwhistle: [["playStart"], [], "the cast at the live kickoff's snap is the activation of the banked support (gated: the token waits); the bank itself comes from the extra-point game hook (out of play: not gated)."],
  lumen: [["reception"], [], "Dex category Aura, but the shield application is a discrete use of a ready cooldown (spent on the attempt): the start of a signature, gated (denied: the cooldown is not spent); no charge."],
  prism: [[], ["playEnd"], "Prism Break resolves at the pre-choice point (rules.js game preSnap: out of play, not gated); tackle and breakup charges are in-play charge gains (gated)."],
  halofang: [["playStart"], ["playEnd"], "the snap activation is the live activation (gated: the bar is kept); tackle charges are in-play charge gains (gated)."],
  aurelion: [["reception"], [], "the flare at the reception is the live activation (gated: both charges kept); the charges are the game's opposing-touchdown ledger, earned even off the field (not an in-play gain): not gated."],
  ironcub: [["blockPush"], [], "the first absorbed push is the live activation (gated once: denied, no absorption this play and the cooldown untouched); cooldown only."],
  steelpaw: [[], [], "a passive aura (per-snap qualification and a per-monster ledger, no readiness): not gated."],
  gearwing: [[], [], "the punt game hook (a formula kick) banks the field and the field is created at the opposing snap (both out of play); not gated."],
  ironjaw: [["tackleMade"], ["playEnd"], "the extra fumble check at the tackle is the live activation (gated: the token is kept); earning the token from a sack is an in-play charge gain (gated)."],
  metalhorn: [[], ["playEnd"], "the grid is created at the next offensive snap (out of play: not gated); earning it is an in-play charge gain (gated)."],
  aegistron: [["playStart"], ["playEnd"], "raising the gate at the snap is the live activation (gated after the legality check: bar and use kept); the low-yardage count is an in-play charge gain (gated)."],
  mindwing: [[], ["playEnd"], "the zone is created at the next defensive snap (out of play: not gated); banking it is an in-play charge gain (gated)."],
  shadewisp: [["tick"], [], "the mirror at the first cut is the live activation (gated: readiness kept); cooldown only."],
  cerebrix: [["playStart"], [], "the validated cast at the snap is the live activation (gated after the mark: readiness kept); cooldown only."],
  echolot: [[], ["playEnd"], "the field is created at the opposing offensive snap, even benched (out of play: not gated); banking it from the live kickoff's result is an in-play charge gain (gated)."],
  enigmane: [["tick"], ["playEnd"], "the afterimage at the charged cut is the live activation (gated: readiness kept); the no-reception bar is an in-play charge gain (gated)."],
  astralux: [["tackleAttempt"], [], "the teleport at the first new tackle attempt is the live activation (gated); once per game, no charge."],
  drakeling: [["tackleOdds"], [], "the pounce at the next tackle contest is the live activation (gated: denied, no pounce on that attempt and nothing spent); per-play preparation, no game-scope charge."],
  wyrmkit: [["playStart"], ["playEnd"], "Dex category Aura, but the snap pulse spends the full bar: the start of a signature, gated (the bar is kept); the participation bar is an in-play charge gain (gated)."],
  sablewing: [["playEnd"], [], "the flight at a validated fumble recovery is the live activation (gated at the whistle, where the recovery is known: denied, the ordinary recovery spot stands); no readiness or charge."],
  scaleguard: [["engage"], ["playEnd"], "the stomp at the DL engagement is the live activation (gated: the bar and the ordinary pancake budget are kept); the engaged-finish bar is an in-play charge gain (gated)."],
  vyrnax: [[], [], "a player-chosen formula field goal (rules.js doFieldGoal), out of play; not gated."],
  aurodrax: [["catchPoint"], ["playEnd"], "the protected throw is the live activation (gated: the charged throw is kept); streak progress is an in-play charge gain (gated: a suppressed play adds no progress; the ordinary reset rules still apply)."],
};

const ELEMENT = (id) => ({ FIR: 'Fire', WAT: 'Water', NAT: 'Nature', ELE: 'Electric', EAR: 'Earth', ICE: 'Ice', WIN: 'Wind', DAR: 'Dark', LIG: 'Light', MET: 'Metal', PSY: 'Psychic', DRA: 'Dragon' })[id.slice(0, 3)];
/** The text of hook `name` in a module source: from its declaration to the next hook declaration at the same indent. */
function hookBody(src, name) {
  const lines = src.split('\n'); const i = lines.findIndex((l) => new RegExp(`^    ${name}\\((ctx|pctx|g)\\b`).test(l)); if (i < 0) return null;
  let j = i + 1; while (j < lines.length && !/^    [a-zA-Z]+\((ctx|pctx|g)\b/.test(lines[j]) && !/^  [a-z]/.test(lines[j])) j++;
  return lines.slice(i, j).join('\n');
}

test('static: every contract module is in the gate table; each gate is checked exactly in the hooks listed; the reading is in the module header', () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).filter((f) => !SHARED.has(f)).sort();
  assert.equal(files.length, 72, 'seventy-two family modules');
  assert.deepEqual(Object.keys(GATES).sort(), files, 'the table lists every module exactly once');
  for (const f of files) assert.ok(registeredFamilies().includes(f), `${f} registered`);
  for (const [fam, [start, charge, why]] of Object.entries(GATES)) {
    const src = fs.readFileSync(path.join(DIR, `${fam}.js`), 'utf8');
    assert.ok(why.length > 20, fam);
    assert.ok(/^\/\/ Activation gates \(M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap/m.test(src.split('\nimport ')[0]), `${fam}: the reading is written in the module header`);
    for (const [gate, hooks] of [['canStartSignature', start], ['canGainCharge', charge]]) {
      const calls = (src.match(new RegExp(`ctx\\.${gate}\\(self\\)`, 'g')) || []).length;
      if (!hooks.length) { assert.equal(calls, 0, `${fam}: ${gate} is not gated`); continue; }
      for (const h of hooks) { const body = hookBody(src, h); assert.ok(body, `${fam}: hook ${h}`); assert.ok(body.includes(`ctx.${gate}(self)`), `${fam}: ${gate} in ${h}`); }
      assert.ok(calls >= hooks.length, `${fam}: ${gate}`);
    }
  }
  // the summary the report quotes
  const n = (p) => Object.values(GATES).filter(p).length;
  assert.equal(n(([s]) => s.length > 0), 44, 'modules gating a live start');
  assert.equal(n(([, c]) => c.length > 0), 31, 'modules gating in-play charge gains');
  assert.equal(n(([s, c]) => !s.length && !c.length), 13, 'modules with neither (passives, formula kicks, pre-snap-only producers, Cold Snap itself)');
  // Every element has at least one gated live start.
  const els = new Set(Object.entries(GATES).filter(([, [s]]) => s.length).map(([f]) => ELEMENT(contractOf(f).abilityId)));
  assert.equal(els.size, 12);
});

// ------------------------------------------------------------------------------------------------ engine: denial on the real engine
const WHOLE = { yard: [-40, 80], lat: [-27, 27] };
const ECLIPSE = [{ id: 'gate-li', type: 'Light', strength: null, createdAt: 1, owner: 'x_light', ability: 'TEST', ...WHOLE }, { id: 'gate-da', type: 'Dark', strength: 10, createdAt: 2, owner: 'x_dark', ability: 'TEST', ...WHOLE }];
// A stub suppressor on the other team: it answers the engine's activation-denial gate exactly as Cold Snap does (activationAttempt ->
// { suppress }), for every attempt and at any range, so it reaches snap-time and offensive starts that the real aura (an engaged
// offensive blocker, three yards) cannot. `gatesweep` also asks the gate for every opponent at the snap, so they are suppressed for the
// whole play before any charge is earned (Cold Snap's charge side).
const suppress = (ctx, self, att) => { ctx.log('stub suppression', { kind: 'stub_suppress', by: self.slot, side: self.team, victim: att.slot, victimSide: att.team }); return { suppress: true }; };
registerAbility({ family: 'gatestub', abilityId: 'TEST-GATE', hooks: { activationAttempt: suppress } });
registerAbility({ family: 'gatesweep', abilityId: 'TEST-SWEEP', hooks: { activationAttempt: suppress, playStart(ctx, self) { for (const o of ctx.opponents(self.team)) ctx.canStartSignature(o); } } });

const stubSlot = (side, offPlay, defPlay, victim) => (side === 'off' ? ['WR2', 'WR1', 'RG', 'LG'].filter((s) => PLAYS[offPlay].onField.includes(s)) : ['SS', 'FS', 'CB2', 'DL1'].filter((s) => PLAYS[defPlay].onField.includes(s))).find((s) => s !== victim);
const midOf = (side, slot) => `${side === 'off' ? 'o' : 'd'}_${slot}`;

// [family, side, slot, primed state, offense play, defense play, readiness kept?, seeds, minimum trigger situations, extra input]
// Category in brackets (Dex). One or more per element; every gated category.
const STARTS = [
  ['emberfox', 'off', 'RB', { charges: 0, ignited: true }, 'inside_zone', 'cover_3', (s) => s.ignited && s.charges === 0, 60, 30], // Fire [Self enhancement]
  ['mudcub', 'off', 'LG', { cd: 0 }, 'inside_zone', 'cover_3', (s) => s.cd === 0, 40, 30], // Water [Self enhancement]
  ['tidepaw', 'def', 'CB1', { cd: 0 }, 'quick_slants', 'cover_2_man', (s) => !s.cd, 120, 4, { attrs: { coverage: 99, speed: 99, awareness: 99, agility: 99 } }], // Water [Zone]
  ['elderoot', 'def', 'LB1', { cd: 0, fresh: false }, 'inside_zone', 'cover_3', (s) => !s.cd, 40, 30], // Nature [Special action]
  ['joltrex', 'def', 'DL3', { cd: 0, fresh: false }, 'quick_slants', 'all_out', (s) => !s.cd, 200, 2, { attrs: { strength: 99, agility: 99, blocking: 99 } }], // Electric [Targeted effect]
  ['rockram', 'def', 'DL1', { bar: 3 }, 'quick_slants', 'cover_3', (s) => s.bar === 3, 40, 30], // Earth [Targeted effect]
  ['frostclaw', 'def', 'LB1', { bar: 3 }, 'inside_zone', 'cover_3', (s) => s.bar === 3, 40, 30], // Ice [Special action]
  ['breezefang', 'off', 'RB', { charges: 3 }, 'inside_zone', 'cover_3', (s) => s.charges === 3, 60, 10], // Wind [Special action]
  ['skywarden', 'def', 'CB1', { charges: 3 }, 'quick_slants', 'cover_2_man', (s) => s.charges === 3, 60, 10], // Wind [Targeted effect]
  ['mireclaw', 'def', 'LB1', { charges: 3 }, 'inside_zone', 'cover_3', (s) => s.charges === 3, 40, 30], // Dark [Targeted effect]
  ['duskrunner', 'off', 'RB', { cd: 0 }, 'inside_zone', 'cover_3', (s) => !s.cd, 80, 5, { attrs: { agility: 99 }, mastery: 3 }], // Dark [Self enhancement]
  ['halofang', 'def', 'LB1', { tackles: 0, armed: true }, 'inside_zone', 'cover_3', (s) => s.armed, 40, 30], // Light [Self enhancement]
  ['aegistron', 'def', 'DL2', { count: 0, armed: true, usedDrive: null }, 'inside_zone', 'cover_3', (s) => s.armed && s.usedDrive === null, 40, 30], // Metal [Special action]
  ['cerebrix', 'off', 'QB', { cd: 0 }, 'quick_slants', 'double_a_mug', (s) => !s.cd, 40, 30], // Psychic [Targeted effect]
  ['shadewisp', 'def', 'CB1', { cd: 0 }, 'smash', 'cover_2_man', (s) => !s.cd, 40, 30, { attrs: { speed: 99 } }], // Psychic [Self enhancement]
  ['wyrmkit', 'off', 'TE', { bar: 3 }, 'inside_zone', 'cover_3', (s) => s.bar === 3, 40, 30], // Dragon [Aura with a snap pulse]
  ['scaleguard', 'off', 'LG', { bar: 3 }, 'inside_zone', 'cover_3', (s) => s.bar === 3, 40, 30], // Dragon [Special action]
];

function startRun(fam, side, slot, st, off, def, seed, extra = {}, mode = null) {
  const t8 = { status: {}, ability: { [midOf(side, slot)]: { ...st } } };
  const place = { [side]: { [slot]: { species: fam, ...(extra.attrs ? { attrs: extra.attrs } : {}), mastery: extra.mastery || 0 } } };
  if (mode === 'stub') { const opp = side === 'off' ? 'def' : 'off'; place[opp] = { [stubSlot(opp, off, def, slot)]: { species: 'gatestub' } }; }
  const r = abilityPlay({ seed, off, def, place, t8, options: mode === 'eclipse' ? { fields: ECLIPSE } : {} });
  const id = contractOf(fam).abilityId;
  const fired = r.events.filter((e) => e.ability === id && ['ability', 'pancake'].includes(e.kind) && e.by === slot && e.side === side);
  return { r, t8, fired, st: t8.ability[midOf(side, slot)] };
}

test('engine: a whole-field Eclipse denies every gated start on the representative set; readiness kept, nothing spent, no mastery credit', () => {
  for (const [fam, side, slot, st, off, def, kept, seeds, min, extra] of STARTS) {
    let base = 0, blocked = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      if (startRun(fam, side, slot, st, off, def, seed, extra).fired.length) base++;
      const e = startRun(fam, side, slot, st, off, def, seed, extra, 'eclipse');
      assert.equal(e.fired.length, 0, `${fam} seed ${seed}: no start inside the Eclipse`);
      assert.ok(kept(e.st), `${fam} seed ${seed}: readiness kept ${JSON.stringify(e.st)}`);
      assert.equal(e.t8.mastery?.[midOf(side, slot)], undefined, `${fam} seed ${seed}: no execution recorded`);
      assert.ok(!(e.t8.fields?.pending || []).some((p) => p.owner === midOf(side, slot)), `${fam}: no field queued`);
      if (e.r.events.some((x) => x.kind === 'field_blocked_start' && x.by === slot && x.side === side)) blocked++;
    }
    assert.ok(base >= min, `${fam}: ${base} activations without the Eclipse (frozen minimum ${min} of ${seeds})`);
    assert.ok(blocked >= min, `${fam}: ${blocked} blocked starts logged (frozen minimum ${min})`);
  }
});

test('engine: an opposing activation-denial gate (Cold Snap\'s engine path) suppresses every gated start on the representative set; readiness kept', () => {
  for (const [fam, side, slot, st, off, def, kept, seeds, min, extra] of STARTS) {
    let suppressed = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const s = startRun(fam, side, slot, st, off, def, seed, extra, 'stub');
      assert.equal(s.fired.length, 0, `${fam} seed ${seed}: suppressed`);
      assert.ok(kept(s.st), `${fam} seed ${seed}: readiness kept ${JSON.stringify(s.st)}`);
      assert.equal(s.t8.mastery?.[midOf(side, slot)], undefined, `${fam} seed ${seed}: no execution recorded`);
      const sup = s.r.events.filter((x) => x.kind === 'stub_suppress' && x.victim === slot && x.victimSide === side);
      assert.ok(sup.length <= 1, `${fam}: suppressed once, then for the rest of the play without asking again`);
      if (sup.length) suppressed++;
    }
    assert.ok(suppressed >= min, `${fam}: ${suppressed} suppressed attempts (frozen minimum ${min} of ${seeds})`);
  }
});

test('engine: the real Cold Snap (engaged offensive blockers) suppresses the rushers\' in-play starts; their readiness is kept', () => {
  let n = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const t8 = { status: {}, ability: { d_DL1: { cd: 0, fresh: false }, d_DL2: { bar: 3 } } };
    const r = abilityPlay({ seed, off: ['quick_slants', 'smash', 'curl_flat'][seed % 3], def: 'cover_3', place: { off: { LG: { species: 'glaciron' }, RG: { species: 'glaciron' } }, def: { DL1: { species: 'mossclaw' }, DL2: { species: 'rockram' } } }, t8 });
    for (const e of r.events.filter((x) => x.ability === 'ICE-05-F' && x.kind === 'ability')) {
      n++; const v = e.victim;
      assert.ok(['DL1', 'DL2'].includes(v));
      assert.equal(r.events.filter((x) => x.kind === 'ability' && x.by === v && x.side === 'def' && ['NAT-02-F', 'EAR-02-F'].includes(x.ability)).length, 0, `seed ${seed}: ${v} starts nothing`);
      if (v === 'DL1') assert.equal(t8.ability.d_DL1.cd, 0, 'Vine Vault readiness kept'); else assert.equal(t8.ability.d_DL2.bar, 3, 'Stonewall Swat bar kept');
    }
  }
  assert.ok(n >= 10, `real Cold Snap suppressions ${n} (frozen minimum 10 of 60)`);
});

// [family, side, slot, starting state, offense play, defense play, gained? (state after a normal play), seeds, minimum, extra]
const CHARGES = [
  ['emberfox', 'off', 'RB', { charges: 0, ignited: false }, 'inside_zone', 'cover_3', (s) => s.charges > 0, 40, 10, { form: 'emberfox:2' }], // Fire
  ['ashkit', 'def', 'LB1', { bar: 0, queued: false }, 'inside_zone', 'cover_3', (s) => s.bar > 0, 60, 5], // Fire
  ['thornkit', 'off', 'WR1', { cd: 0, token: false, fresh: false }, 'smash', 'cover_3', (s) => s.token, 40, 5], // Nature
  ['mireclaw', 'def', 'LB1', { charges: 0 }, 'inside_zone', 'cover_3', (s) => s.charges > 0, 40, 10], // Dark
  ['halofang', 'def', 'LB1', { tackles: 0, armed: false }, 'inside_zone', 'cover_3', (s) => s.tackles > 0 || s.armed, 60, 5], // Light
  ['prism', 'def', 'LB1', { charges: 0, noCharge: false }, 'inside_zone', 'cover_3', (s) => s.charges > 0, 60, 5], // Light
  ['aegistron', 'def', 'DL2', { count: 0, armed: false, usedDrive: null }, 'inside_zone', 'cover_3', (s) => s.count > 0, 40, 10], // Metal
  ['enigmane', 'off', 'TE', { bar: 0 }, 'inside_zone', 'cover_3', (s) => s.bar > 0, 40, 10], // Psychic
  ['wyrmkit', 'off', 'TE', { bar: 0 }, 'inside_zone', 'cover_3', (s) => s.bar > 0, 40, 30], // Dragon
  ['scaleguard', 'off', 'LG', { bar: 0 }, 'inside_zone', 'cover_3', (s) => s.bar > 0, 60, 5], // Dragon
];

test('engine: a monster suppressed by the activation-denial gate gains no ability charge for the rest of the play (Cold Snap\'s charge side)', () => {
  for (const [fam, side, slot, st, off, def, gained, seeds, min, extra = {}] of CHARGES) {
    let base = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const mid = midOf(side, slot); const opp = side === 'off' ? 'def' : 'off';
      const mk = () => ({ status: {}, ability: { [mid]: { ...st } } });
      const me = { species: fam, ...(extra.form ? { form: extra.form } : {}) };
      const t0 = mk(); abilityPlay({ seed, off, def, place: { [side]: { [slot]: me } }, t8: t0 }); if (gained(t0.ability[mid])) base++;
      const t1 = mk(); const r = abilityPlay({ seed, off, def, place: { [side]: { [slot]: me }, [opp]: { [stubSlot(opp, off, def, slot)]: { species: 'gatesweep' } } }, t8: t1 });
      assert.ok(r.events.some((x) => x.kind === 'stub_suppress' && x.victim === slot && x.victimSide === side), `${fam}: suppressed at the snap`);
      assert.deepEqual(t1.ability[mid], st, `${fam} seed ${seed}: no charge gained`);
      assert.ok(!(t1.fields?.pending || []).some((p) => p.owner === mid), `${fam}: no token banked`);
    }
    assert.ok(base >= min, `${fam}: ${base} plays gain a charge without suppression (frozen minimum ${min} of ${seeds})`);
  }
});

test('engine: an Eclipse does not stop charge gain (spec §11: charge and cooldowns continue)', () => {
  for (const [fam, side, slot, st, off, def, gained, seeds, min, extra = {}] of CHARGES.filter(([f]) => ['mireclaw', 'wyrmkit', 'aegistron'].includes(f))) {
    let n = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const mid = midOf(side, slot); const t8 = { status: {}, ability: { [mid]: { ...st } } };
      abilityPlay({ seed, off, def, place: { [side]: { [slot]: { species: fam, ...(extra.form ? { form: extra.form } : {}) } } }, t8, options: { fields: ECLIPSE } });
      if (gained(t8.ability[mid])) n++;
    }
    assert.ok(n >= min, `${fam}: ${n} charge gains inside the Eclipse (frozen minimum ${min} of ${seeds})`);
  }
});
