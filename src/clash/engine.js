// Beast Clash battle engine: simulateClash(). One pure, seeded function: the same lineups, seed,
// configuration and values version give the same result and the same log on every device.
// No global random generator, no clock, no DOM, no storage. Only +, -, *, /, Math.round/floor/min/max.
//
// Order inside one exchange (approved plan, section 3):
//   sudden death ramp -> voluntary swaps (policies) -> condition ticks on both fronts -> back-row
//   actions (Support heals, Disruptor bench actions under the back-row test) -> initiative ->
//   first actor acts -> knockout check -> second actor acts -> replacements -> end check.
import { createRng } from '../core/rng.js';
import { CLASH_VALUES, battleConfig, activeExperiments } from './values.js';
import { typeFactor } from './types.js';
import { buildCombatant } from './stats.js';
import { freshState, applyCondition, tickCondition, consumeShock, cleanse, pauseCondition, resumeCondition } from './conditions.js';
import { triggerFires, hit, heal, grantShield } from './handlers.js';
import { chooseSwap, POLICIES } from './ai.js';

const V = CLASH_VALUES;
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };

/** Sudden-death multiplier for the model in force at exchange `ex`. */
export function rampFor(model, ex, from = null) { const m = V.suddenDeath[model]; const f = from ?? m.from; return Math.min(m.cap, 1 + m.step * Math.max(0, ex - (f - 1))); }
export function rampModelFor(perSide) { return perSide >= 4 ? 'F' : 'E'; }

/**
 * @param {object} args
 *  a, b: arrays of 1-5 monsters (plain objects from the game's generator; never mutated)
 *  seed: integer
 *  config: battleConfig() overrides { backRow, duration, O1, O2, policies: {a, b} }
 *  log: 'full' | 'none'
 */
export function simulateClash({ a, b, seed = 1, config = {}, log: logMode = 'full' }) {
  for (const [k, v] of Object.entries(config)) if (typeof v === 'function') throw new Error(`Battle options cannot be functions (${k})`);
  const cfg = battleConfig(config);
  if (!POLICIES.includes(cfg.policies.a) || !POLICIES.includes(cfg.policies.b)) throw new Error('Unknown swap policy');
  if (!a?.length || !b?.length || a.length > V.battle.maxPerSide || b.length > V.battle.maxPerSide) throw new Error('Each side needs 1-5 monsters');
  const perSide = Math.max(a.length, b.length);
  const model = rampModelFor(perSide); const sdFrom = model === 'E' ? cfg.sdFromE : null; const br = V.backRow.tests[cfg.backRow]; const dur = V.duration.models[cfg.duration];
  const rng = createRng(seed);
  const events = []; let ex = 0; let lastKO = 0;
  const E = { rng, ex: 0, ramp: 1, healMult: 1, config: cfg, perSide, note: null, log: null, onShieldBroken: null, afterHit: null };
  const push = (ev) => { if (logMode !== 'none') events.push(ev); };
  // Every event carries the state the replay needs: who is where, and the actor's and target's HP, shield and condition.
  const snap = (x) => (x ? { hp: Math.max(0, x.hp), shield: Math.round(x.shield), cond: x.cs.cond?.kind || null, paused: x.cs.paused?.kind || null } : null);
  E.log = (kind, actor, target, text, extra = {}) => { if (logMode === 'none') return; push({ ex, kind, actor: actor?.c.id ?? null, target: target?.c.id ?? null, text, ...extra, actorState: snap(actor), targetState: snap(target), order: { a: S.a.line.map((x) => x.c.id), b: S.b.line.map((x) => x.c.id) }, ramp: E.ramp, healMult: E.healMult }); };

  // ---- live records
  const mkSide = (key, monsters, policy) => {
    const side = { key, policy, line: [], lastForced: -99, lastVoluntary: -99, healsThisExchange: 0, benchActs: 0, rallyUntil: -1, rallyBonus: 0, swappedThisExchange: false };
    side.line = monsters.map((m, i) => {
      const c = buildCombatant(m, { perSide, config: cfg, slot: i, side: key });
      return { c, side, hp: c.hp, shield: 0, cs: freshState(), entered: false, enteredAt: -1, forcedInAt: -99, strikes: 0, acts: 0, lastSkipped: false, onceUsed: false, firstAfterEntryDue: false,
        dodge: false, veil: !!c.move.veil, illusion: false, brace: 0, charge: 0, haste: false, forge: 0, overcharge: 0, lastTaken: 0, bruisedUntil: -1, regrows: c.move.regrow || 0, isFront: false, roarUntil: -1, unansweredUntil: -1, stats: { dealt: 0, taken: 0, support: 0, kos: 0, acts: 0 } };
    });
    return side;
  };
  const S = { a: mkSide('a', a, cfg.policies.a), b: mkSide('b', b, cfg.policies.b) };
  const other = (side) => (side === S.a ? S.b : S.a);
  const alive = (side) => side.line.filter((x) => x.hp > 0);
  const front = (side) => alive(side)[0] || null;

  // ---- helpers the handlers call back into
  E.onShieldBroken = (def, att) => {
    E.log('shield_break', att, def, `${def.c.name}'s shield breaks`);
    const mv = def.c.move;
    if (mv.erupt) { const d = Math.round(def.c.atk * mv.erupt * E.ramp); att.hp = Math.max(0, att.hp - d); def.stats.dealt += d; att.stats.taken += d; E.log('damage', def, att, `${def.c.name}'s Magma Crust erupts: ${d} damage to ${att.c.name}`, { damage: d, hpAfter: att.hp }); }
    if (mv.thorns) { const d = Math.round(def.c.atk * mv.thorns * E.ramp); att.hp = Math.max(0, att.hp - d); def.stats.dealt += d; att.stats.taken += d; E.log('damage', def, att, `${def.c.name}'s thorns: ${d} damage to ${att.c.name}`, { damage: d, hpAfter: att.hp }); }
    // breakCharge (Gate B.4, patch-only): the attacker that breaks a shield charges its own next strike.
    if (att && att.hp > 0 && att.c.move.breakCharge && att !== def) { att.charge = Math.max(att.charge || 0, att.c.move.breakCharge); E.log('buff', att, att, `${att.c.name}'s ${att.c.move.name}: shield broken, next strike +${Math.round(att.c.move.breakCharge * 100)}%`); }
    if (mv.regrow && def.regrows > 0) { def.regrows -= 1; const amt = Math.round(def.c.maxHp * mv.shield * E.healMult); def.shield += amt; E.log('shield', def, def, `${def.c.name}'s Glacier Wall regrows (${amt})`, { amount: amt, shield: def.shield }); }
  };
  E.afterHit = (att, def, toHp, label) => {
    const dm = def.c.move;
    if (toHp > 0 && dm.regrowOnHit && def.hp > 0) { const amt = Math.min(def.c.maxHp - def.hp, Math.round(def.c.maxHp * dm.regrowOnHit)); if (amt > 0) { def.hp += amt; def.stats.support += amt; E.log('heal', def, def, `${def.c.name} regrows ${amt}`, { amount: amt, hpAfter: def.hp }); } }
    if (toHp > 0 && dm.dragonhide && def.hp > 0 && toHp >= def.c.maxHp * dm.dragonhide.threshold && def.dragonhideEx !== ex) { def.dragonhideEx = ex; const amt = Math.min(def.c.maxHp - def.hp, Math.round(def.c.maxHp * dm.dragonhide.heal)); if (amt > 0) { def.hp += amt; def.stats.support += amt; E.log('heal', def, def, `${def.c.name}'s Dragonhide heals ${amt}`, { amount: amt, hpAfter: def.hp }); } }
    // forgeOnHit (Gate B.5, patch-only): a hit that takes at least `min` of its HP adds a forge step (shared cap with the strike forge).
    if (toHp > 0 && dm.forgeOnHit && def.hp > 0 && toHp >= def.c.maxHp * dm.forgeOnHit.min && (def.forgeCount || 0) < (dm.forge?.max ?? dm.forgeOnHit.max)) { def.forgeCount = (def.forgeCount || 0) + 1; def.forge += dm.forgeOnHit.step; E.log('buff', def, def, `${def.c.name}'s ${dm.name} tempers under the blow: attack +${Math.round(def.forge * 100)}%`); }
    if (toHp > 0 && dm.retaliate && att.hp > 0) {
      const r = dm.retaliate; const ok = !r.whenTarget || att.cs.cond?.kind === r.whenTarget; // Heat Mirage: a Dazed attacker may Burn
      if (ok && rng.chance(r.chance)) condition(def, att, r.cond, `${def.c.name}'s ${dm.name}`);
    }
    if (def.hp <= 0) knockout(def, att, label);
  };
  function condition(src, target, kind, label, opts = {}) {
    const r = applyCondition(target.cs, kind, ex, opts);
    E.log('condition', src, target, `${label}: ${target.c.name} ${r.words}`, { condition: kind, result: r.result, left: target.cs.cond?.left ?? 0, replaced: r.replaced ?? null });
    if (r.result === 'applied' || r.result === 'replaced') { src.stats.support += Math.round(src.c.atk * 1.5); return true; }
    return false;
  }
  // Gate B.5 (patch-only): extra effects when a move's own condition lands. stripOnCond removes the target's shield;
  // healCut marks the condition so heals on the target are multiplied by the value while that condition lasts.
  function moveCondEffects(src, target) {
    const mv = src.c.move; const held = target.cs.cond || target.cs.paused; if (!held) return;
    if (mv.stripOnCond && target.shield > 0) { E.log('debuff', src, target, `${mv.name}: ${target.c.name} loses its ${Math.round(target.shield)} shield`); target.shield = 0; }
    if (mv.healCut) { target.healCutCond = held; target.healCut = mv.healCut; target.healCutUntil = ex + (mv.healCutFor || 3) - 1; E.log('debuff', src, target, `${mv.name}: ${target.c.name}'s healing is cut to ${Math.round(mv.healCut * 100)}% while the ${held.kind} lasts`); }
  }
  function knockout(def, att, label) {
    if (def.koed) return; def.koed = true; def.isFront = false; lastKO = ex; if (att && att !== def) att.stats.kos += 1;
    E.log('ko', att, def, `${def.c.name} is knocked out${att && att !== def ? ` by ${att.c.name}'s ${label}` : ''}`);
    const am = att?.c.move;
    if (att && att !== def && att.hp > 0) {
      if (am.overcharge && !att.overcharge) { att.overcharge = am.overcharge; E.log('buff', att, att, `${att.c.name}'s Overcharge: +${Math.round(am.overcharge * 100)}% attack for the rest of the battle`); }
      if (am.koHeal && label === am.name) { const amt = Math.min(att.c.maxHp - att.hp, Math.round(att.c.maxHp * am.koHeal)); if (amt > 0) { att.hp += amt; att.stats.support += amt; E.log('heal', att, att, `${att.c.name}'s Iron Bite heals ${amt}`, { amount: amt, hpAfter: att.hp }); } }
    }
  }
  // Entry: once per monster per battle, whatever brought it to the front.
  function enter(x, how = 'enters') {
    x.isFront = true; x.enteredAt = ex; x.firstAfterEntryDue = !!(x.c.move.trigger.kind === 'firstAfterEntry'); x.strikesSinceEntry = 0;
    const resumed = resumeCondition(x.cs);
    E.log('enter', x, null, `${x.c.name} ${how} (${x.c.archetype}, ${x.c.type})${resumed ? `; its ${resumed} resumes with ${x.cs.cond.left} left` : ''}`, { hp: x.hp, maxHp: x.c.maxHp, shield: x.shield, archetype: x.c.archetype, type: x.c.type, resumed });
    // dodgeEntry (Gate B.3, patch-only): 'once' = only the first entry of the battle; 'notVoluntary' = not on a voluntary swap-in.
    if (x.c.move.dodgeOnEntry && !(x.c.move.dodgeEntry === 'once' && x.entered) && !(x.c.move.dodgeEntry === 'notVoluntary' && how === 'swaps in')) x.dodge = true;
    if (!x.entered) {
      x.entered = true;
      const mv = x.c.move;
      if (mv.kind === 'guard') { const share = mv.shield * (1 + (mv.perStage || 0) * x.c.stage); grantShield(E, x, x, share, mv.name); }
      if (mv.roar) { const f = front(other(x.side)); if (f) { f.roarUntil = ex + mv.roar - 1; E.log('debuff', x, f, `${x.c.name}'s Dragon's Roar: ${f.c.name} acts last for ${mv.roar} exchanges`); } }
    } else E.log('note', x, null, `${x.c.name} gets no second entry effect`);
  }
  function bench(x, how = 'goes to the bench') { x.isFront = false; const p = pauseCondition(x.cs); E.log('bench', x, null, `${x.c.name} ${how}${p ? `; its ${p} is paused` : ''}`, { paused: p }); }
  const canLeave = (x, by) => {
    if (x.c.move.immovable) return `${x.c.name} cannot be moved`;
    const f = front(other(x.side)); if (f && f.c.move.clamp && f.shield > 0 && by === 'self') return `${f.c.name}'s Shell Clamp holds ${x.c.name} in place`;
    return null;
  };
  // Forced swap on `side` by `src`. kind: frontTwo | backToFront | strongestBack | sweep (front to the back) | lift (own side: front one place back)
  function forcedSwap(src, side, kind, { hitMult = 0, label = 'swap', arrivalCond = null, refusedEffect = null } = {}) {
    // Experimental (Gate B.2, patch-only): when a swap move is refused it may fall back to a secondary effect on the front.
    const refuse = (target, why) => { E.log('swap_refused', src, target, why); if (refusedEffect && target && target.hp > 0 && (refusedEffect.chance == null || rng.chance(refusedEffect.chance))) { if (refusedEffect.cond) condition(src, target, refusedEffect.cond, `${label} (refused)`); if (refusedEffect.hit && target.hp > 0 && (!refusedEffect.cond || refusedEffect.both)) hit(E, src, target, refusedEffect.hit, { label: `${label} (refused)` }); } return false; };
    const L = alive(side); if (L.length < 2) { return refuse(null, `${label}: ${side.key === 'a' ? 'side A' : 'side B'} has nobody to swap`); }
    const f = L[0];
    if (ex - side.lastForced < V.swaps.forcedEvery) return refuse(f, `${label}: refused, ${f.c.name}'s side was forced to swap ${ex - side.lastForced} exchange(s) ago`);
    if (f.forcedInAt === ex || f.enteredAt === ex) return refuse(f, `${label}: refused, ${f.c.name} just arrived`);
    const held = canLeave(f, 'forced'); if (held) return refuse(f, `${label}: refused, ${held}`);
    let incoming;
    if (kind === 'frontTwo') incoming = L[1];
    else if (kind === 'backToFront' || kind === 'sweep') incoming = L[L.length - 1] === f ? L[1] : L[L.length - 1];
    else if (kind === 'strongestBack') { const strongest = L.slice().sort((p, q) => q.c.overall - p.c.overall || p.c.id.localeCompare(q.c.id))[0]; if (strongest !== f) return refuse(f, `${label}: the strongest monster is already on the bench`); incoming = L[1]; }
    else if (kind === 'strongestFront') { // experimental: the strongest active opponent is sent back whoever it is; it pulls the next in line forward
      incoming = L[1]; }
    else if (kind === 'mostHurt') { // Gate B.5 (patch-only): the most-hurt bench monster is dragged to the front; the front takes its place
      incoming = L.slice(1).sort((p, q) => p.hp / p.c.maxHp - q.hp / q.c.maxHp || p.c.id.localeCompare(q.c.id))[0]; }
    const i = side.line.indexOf(f), j = side.line.indexOf(incoming);
    if (kind === 'sweep' || kind === 'strongestBack') { side.line.splice(i, 1); side.line.push(f); } else { [side.line[i], side.line[j]] = [side.line[j], side.line[i]]; }
    side.lastForced = ex; incoming.forcedInAt = ex;
    E.log('swap', src, f, `${label}: ${f.c.name} is forced to the ${kind === 'sweep' || kind === 'strongestBack' ? 'back' : 'bench'}; ${incoming.c.name} is pulled to the front`, { forced: true, out: f.c.id, in: incoming.c.id });
    // stripOnSwap (Gate B.4, patch-only): the monster sent back loses its shield.
    if (src.c.move.stripOnSwap && f.shield > 0) { E.log('debuff', src, f, `${label}: ${f.c.name} loses its ${Math.round(f.shield)} shield`); f.shield = 0; }
    bench(f, 'is forced back'); enter(incoming, 'is pulled to the front');
    if (hitMult > 0 && incoming.hp > 0) hit(E, src, incoming, hitMult, { label: `${label} arrival hit` });
    if (arrivalCond && incoming.hp > 0) condition(src, incoming, arrivalCond, `${label} (on arrival)`);
    return true;
  }
  function voluntarySwap(side, incoming) {
    const f = front(side); const held = canLeave(f, 'self'); if (held) { E.log('swap_refused', f, null, `${side.policy} swap refused: ${held}`); return false; }
    const i = side.line.indexOf(f), j = side.line.indexOf(incoming); [side.line[i], side.line[j]] = [side.line[j], side.line[i]];
    side.lastVoluntary = ex; side.swappedThisExchange = true;
    E.log('swap', f, incoming, `${side.policy} policy: ${f.c.name} swaps out for ${incoming.c.name}${cfg.swapCost === 'action' ? ' (uses the side\'s action)' : cfg.swapCost === 'half' ? ' (acts at half damage)' : ''}`, { forced: false, out: f.c.id, in: incoming.c.id });
    bench(f); enter(incoming, 'swaps in');
    incoming.halfAction = cfg.swapCost === 'half'; // set after entry: entry effects (first-entry shield, Roar, dodge-on-entry) are not actions and stay at full strength
    return true;
  }
  function healMultiplier() {
    if (cfg.duration === 'R2') return 1 / E.ramp;
    if (cfg.duration === 'C6') { if (ex < dur.from) return 1; const quiet = ex - lastKO; if (quiet >= dur.quarterAfter) return dur.quarter; if (quiet >= dur.halfAfter) return dur.half; }
    return 1;
  }

  // ---- the front monster's own action
  function act(x, foeSide) {
    const foe = front(foeSide); if (!foe) return;
    x.acts += 1; x.stats.acts += 1;
    // Half-cost voluntary swap (experimental): the monster that just swapped in acts at half strength this exchange,
    // whatever the action: damage, healing and shielding x0.5, condition rolls at half chance, its own swap move
    // cannot fire and support effects without a magnitude are withheld. Set by voluntarySwap, cleared next exchange.
    if (x.halfAction) E.log('note', x, null, `${x.c.name} just swapped in: this action is at half strength`);
    // Shock: lose this action (never two in a row to any cause).
    if (x.cs.cond?.kind === 'shock') {
      if (x.lastSkipped) { E.log('note', x, null, `${x.c.name} is shocked but cannot lose two actions in a row; it acts`); }
      else { consumeShock(x.cs, ex); x.lastSkipped = true; E.log('skip', x, null, `${x.c.name} is shocked and skips its action${x.cs.cond ? ` (${x.cs.cond.skips - x.cs.cond.skipped} skip left)` : ''}`); return; }
    }
    if (x.unansweredUntil === ex) { if (x.lastSkipped) E.log('note', x, null, `${x.c.name} cannot lose two actions in a row; it answers`); else { x.lastSkipped = true; E.log('skip', x, null, `${x.c.name} cannot answer this exchange`); return; } }
    x.lastSkipped = false; x.strikes += 1;
    const mv = x.c.move; const fires = ['guard', 'mend', 'bench'].includes(mv.kind) ? false : triggerFires(mv, x);
    if (fires && mv.trigger.kind === 'once') x.onceUsed = true;
    if (fires && mv.trigger.kind === 'firstAfterEntry') x.firstAfterEntryDue = false;
    const label = fires ? mv.name : 'strike';
    // Bench kinds that also act from the front (Undertow, Foresight) use the swap as their strike.
    if (mv.kind === 'bench' && mv.anywhere && ex % (mv.trigger.n || 1) === 0 && !x.halfAction) { if (forcedSwap(x, foeSide, mv.swapKind, { hitMult: mv.hit ? (mv.hitMult || br.swapHit) : 0, label: mv.name, arrivalCond: mv.arrivalCond, refusedEffect: mv.refusedEffect })) return; }
    let mult = 1, hits = 1, shieldBreak = 1;
    // Half-cost swap: strike effects without a magnitude (sweeps, cannot-answer, dodge-next, forge) are withheld.
    const withheld = (what) => { if (!x.halfAction) return false; E.log('note', x, null, `${mv.name}: ${what} withheld, ${x.c.name} just swapped in`); return true; };
    if (fires) {
      if (mv.kind === 'heavy' || mv.kind === 'surge') { mult = mv.mult + (mv.perStage && mv.kind === 'heavy' ? mv.perStage * x.c.stage : 0); hits = mv.hits || 1; shieldBreak = mv.shieldBreak || 1; }
      if (mv.firstStrike && x.strikes === 1) mult = mv.firstStrike;
      if (mv.vsShield && foe.shield > 0) mult = mv.vsShield;
      if (mv.blink) { const second = alive(foeSide)[1]; if (second) { hit(E, x, second, mult, { label: `${mv.name} (past ${foe.c.name})` }); return; } }
      if (mv.unanswered && !withheld('the cannot-answer effect')) { foe.unansweredUntil = ex; E.log('debuff', x, foe, `${x.c.name}'s Daybreak: ${foe.c.name} cannot answer this exchange`); }
      if (mv.fakeFirst && x.strikes === 1 && !withheld('the fake')) { foe.unansweredUntil = ex; E.log('debuff', x, foe, `${x.c.name}'s Mind Game: ${foe.c.name} bites on the fake and skips its answer`); }
    }
    if (mv.firstStrike && x.strikes === 1) mult = mv.firstStrike;
    if (x.halfAction) mult = Math.round(mult * 50) / 100;
    let dealt = 0;
    for (let h = 0; h < hits; h++) { if (foe.hp <= 0) break; dealt += hit(E, x, foe, mult, { label: hits > 1 ? `${label} hit ${h + 1}` : label, shieldBreak }); }
    if (mv.splash) { const next = alive(foeSide).find((y) => y !== foe); if (next && next.hp > 0 && (fires || mv.kind === 'hex')) { const d = Math.round(dealt * mv.splash); if (d > 0) { next.hp = Math.max(0, next.hp - d); x.stats.dealt += d; next.stats.taken += d; E.log('damage', x, next, `${mv.name} splashes ${next.c.name} for ${d}`, { damage: d, hpAfter: next.hp }); if (next.hp <= 0) knockout(next, x, mv.name); } } }
    // Conditions on the strike.
    if (foe.hp > 0) {
      if (mv.kind === 'hex' && (mv.trigger.kind === 'always' || fires) && mv.cycloneArrival && mv.sweepTarget && fires && !withheld('the sweep')) {
        // cycloneArrival (Gate B.5, patch-only): sweep the front away and apply the condition to the monster pulled forward;
        // if the sweep is refused, the condition lands on the front instead, so the effect is never spent on the bench.
        const ok = forcedSwap(x, foeSide, 'sweep', { label: mv.name, arrivalCond: mv.cond });
        if (!ok && foe.hp > 0) { if (rng.chance(mv.chance)) { if (condition(x, foe, mv.cond, mv.name)) moveCondEffects(x, foe); } else E.log('condition', x, foe, `${mv.name}: ${foe.c.name} shrugs off the ${mv.cond}`, { condition: mv.cond, result: 'missed' }); }
      } else if (mv.kind === 'hex' && (mv.trigger.kind === 'always' || fires)) {
        if (rng.chance(mv.chance * (x.halfAction ? 0.5 : 1))) {
          if (mv.wholeLine) { for (const y of alive(foeSide)) if (condition(x, y, mv.cond, mv.name, { duration: mv.duration || V.conditions.duration })) moveCondEffects(x, y); }
          else if (condition(x, foe, mv.cond, mv.name, mv.skips ? { skips: mv.skips } : {})) moveCondEffects(x, foe);
        } else E.log('condition', x, foe, `${mv.name}: ${foe.c.name} shrugs off the ${mv.cond}`, { condition: mv.cond, result: 'missed' });
        if (mv.sweepTarget && fires && foe.hp > 0 && !withheld('the sweep')) forcedSwap(x, foeSide, 'sweep', { label: mv.name });
      }
      const af = mv.afflict;
      const below = !af?.belowHp || x.hp / x.c.maxHp < af.belowHp; // chanceAbove (Gate B.5, patch-only): the afflict chance when not below the HP line
      if (af && fires && (below || af.chanceAbove != null) && (!af.firstOnly || !x.afflictUsed)) {
        const ch = below ? af.chance : af.chanceAbove;
        if (rng.chance(ch * (x.halfAction ? 0.5 : 1))) { x.afflictUsed = true; if (condition(x, foe, af.cond, mv.name)) moveCondEffects(x, foe); } else E.log('condition', x, foe, `${mv.name}: the ${af.cond} does not take`, { condition: af.cond, result: 'missed' });
      }
      // sweepAbove / sweepHit (Gate B.5, patch-only): sweep only a target above that HP share; the monster pulled forward takes an arrival hit.
      if (mv.sweepTarget && fires && mv.kind === 'surge' && foe.hp > 0 && (!mv.sweepAbove || foe.hp / foe.c.maxHp > mv.sweepAbove) && !withheld('the sweep')) forcedSwap(x, foeSide, 'sweep', { label: mv.name, hitMult: mv.sweepHit || 0 });
    }
    if (fires) {
      if (mv.selfHeal) heal(E, x, x, mv.selfHeal, mv.name);
      if (mv.dodgeNext && !withheld('the dodge')) { x.dodge = true; E.log('buff', x, x, `${x.c.name} will dodge the next hit`); }
      if (mv.forge && (x.forgeCount || 0) < mv.forge.max && !withheld('the forge step')) { x.forgeCount = (x.forgeCount || 0) + 1; x.forge += mv.forge.step; E.log('buff', x, x, `${x.c.name}'s Forge Swipe: attack +${Math.round(x.forge * 100)}%`); }
    }
  }

  // ---- back-row actions (Supports from anywhere on their rhythm; Disruptors from the bench under the back-row test)
  function backRow() {
    for (const side of [S.a, S.b]) {
      const foeSide = other(side); const L = alive(side); side.benchActs = 0;
      for (const x of L) {
        const mv = x.c.move; const isFront = x === L[0];
        if (mv.kind === 'mend' && ex % (mv.trigger.n || V.support.every) === 0) {
          // Half-cost swap: heals and shields are halved in the handlers; effects with no magnitude are withheld.
          const withheld = x.halfAction ? (why) => E.log('note', x, null, `${mv.name}: ${why} withheld, ${x.c.name} just swapped in`) : null;
          if (mv.heal > 0) {
            const byHurt = L.slice().sort((p, q) => p.hp / p.c.maxHp - q.hp / q.c.maxHp || p.c.id.localeCompare(q.c.id));
            const targets = mv.target === 'front' ? [L[0]] : mv.target === 'all' ? L : mv.target === 'twoMostHurt' ? byHurt.slice(0, 2) : [byHurt[0]];
            for (const t of targets) { heal(E, x, t, mv.heal, mv.name); if (withheld) { if (mv.cleanse || mv.brace || mv.haste) withheld('cleanse, brace and haste'); continue; } if (mv.cleanse && t.cs.cond) { const c = cleanse(t.cs, ex, mv.cleanse); if (c) E.log('condition', x, t, `${mv.name} clears ${t.c.name}'s ${c}`, { condition: c, result: 'cleared' }); } if (mv.brace) { t.brace = mv.brace; } if (mv.haste) { t.haste = true; } }
            if (mv.second && L[1]) heal(E, x, L[1], mv.second, mv.name);
            if (mv.lift && withheld) withheld('the lift');
            else if (mv.lift && targets[0] === L[0] && L.length > 1) { const f = L[0]; const i = side.line.indexOf(f), j = side.line.indexOf(L[1]); [side.line[i], side.line[j]] = [side.line[j], side.line[i]]; E.log('swap', x, f, `${mv.name} lifts ${f.c.name} one place back; ${L[1].c.name} steps up`, { forced: false, out: f.c.id, in: L[1].c.id }); bench(f, 'is lifted back'); enter(L[1], 'steps up'); }
          }
          if (mv.shield) { const byHurt = L.slice().sort((p, q) => p.hp / p.c.maxHp - q.hp / q.c.maxHp || p.c.id.localeCompare(q.c.id)); grantShield(E, x, mv.target === 'front' ? L[0] : byHurt[0], mv.shield, mv.name); }
          if (withheld && (mv.charge || mv.illusion || mv.rally)) withheld(mv.charge ? 'the charge' : mv.illusion ? 'the illusion' : 'the rally');
          else if (mv.charge) { L[0].charge = mv.charge; E.log('buff', x, L[0], `${mv.name}: ${L[0].c.name}'s next strike +${Math.round(mv.charge * 100)}%`); }
          else if (mv.illusion) { const t = L.slice().sort((p, q) => p.hp / p.c.maxHp - q.hp / q.c.maxHp || p.c.id.localeCompare(q.c.id))[0]; t.illusion = true; E.log('buff', x, t, `${mv.name}: an illusion will absorb the next hit on ${t.c.name}`); }
          else if (mv.rally) { side.rallyUntil = ex + mv.rally.exchanges - 1; side.rallyBonus = mv.rally.bonus; E.log('buff', x, null, `${mv.name}: allies strike ${Math.round(mv.rally.bonus * 100)}% harder for ${mv.rally.exchanges} exchanges`); }
          x.stats.acts += 1;
          continue;
        }
        // Disruptor bench actions under the back-row test.
        if (!isFront && x.c.archetype === 'Disruptor' && (mv.kind === 'hex' || mv.kind === 'bench') && !(mv.trigger.kind === 'once' || mv.trigger.kind === 'first' || mv.trigger.kind === 'firstAfterEntry')) {
          const rhythm = Math.max(br.every, mv.kind === 'bench' ? (mv.trigger.n || 1) : (mv.trigger.kind === 'every' ? mv.trigger.n : 1));
          if (ex % rhythm !== 0) continue;
          if (side.benchActs >= br.maxPerSide) { E.log('bench_blocked', x, null, `${x.c.name} waits: ${br.maxPerSide === 1 ? `one ${br.count === 'landed' ? 'landed ' : ''}bench action per side this exchange` : 'bench limit reached'}`); continue; }
          if (br.count !== 'landed') side.benchActs += 1;
          x.stats.acts += 1;
          const foe = front(foeSide); if (!foe) continue;
          if (mv.cond === 'swap') { const sw = forcedSwap(x, foeSide, mv.swapKind, { hitMult: mv.hit ? (mv.hitMult || br.swapHit) : 0, label: `${mv.name} (from the bench)`, arrivalCond: mv.arrivalCond, refusedEffect: mv.refusedEffect });
            // hasteOnSwap (Gate B.5, patch-only): a successful bench swap lets its own front act first this exchange.
            const own = front(side); if (sw && mv.hasteOnSwap && own && own.hp > 0) { own.haste = true; E.log('buff', x, own, `${mv.name}: ${own.c.name} acts first this exchange`); }
            if (sw && br.count === 'landed') side.benchActs += 1; continue; }
          const chanceK = perSide >= 4 ? br.chanceBig : br.chanceSmall;
          if (rng.chance(mv.chance * chanceK)) {
            const landed = condition(x, foe, mv.cond, `${mv.name} (from the bench)`);
            if (landed) moveCondEffects(x, foe);
            if (landed && br.count === 'landed') side.benchActs += 1;
            if (mv.frontTwo) { const next = alive(foeSide)[1]; if (next) { if (!next.cs.paused && !next.cs.cond) { next.cs.paused = null; } const r = applyCondition(next.cs, mv.cond, ex); if ((r.result === 'applied' || r.result === 'replaced') && next.cs.cond) { pauseCondition(next.cs); } E.log('condition', x, next, `${mv.name}: ${next.c.name} on the bench: ${r.words}${r.result === 'applied' || r.result === 'replaced' ? ' (paused until it enters)' : ''}`, { condition: mv.cond, result: r.result }); if (r.result === 'applied' || r.result === 'replaced') moveCondEffects(x, next); } }
          } else E.log('bench_miss', x, foe, `${x.c.name}'s ${mv.name} from the bench: ${foe.c.name} shrugs it off`, { condition: mv.cond, result: 'missed' });
        }
      }
    }
  }

  // ---- opening
  push({ ex: 0, kind: 'start', text: `Beast Clash: ${a.length} v ${b.length}. Sudden death Model ${model} from exchange ${sdFrom ?? V.suddenDeath[model].from}. Back row ${cfg.backRow}; duration ${cfg.duration}${activeExperiments(cfg).length ? `; experiments: ${activeExperiments(cfg).join(', ')}` : ''}.`, model, config: cfg, experiments: activeExperiments(cfg) });
  for (const side of [S.a, S.b]) enter(side.line[0], 'starts in front');

  // ---- the exchange loop
  let winner = null, by = null;
  while (ex < V.battle.exchangeCap) {
    ex += 1; E.ex = ex; E.ramp = rampFor(model, ex, sdFrom); E.healMult = healMultiplier();
    if (E.ramp > 1 && rampFor(model, ex - 1, sdFrom) === 1) push({ ex, kind: 'sudden_death', text: `Sudden death begins: damage x${E.ramp.toFixed(2)}, rising each exchange`, ramp: E.ramp });
    else if (E.ramp > 1) push({ ex, kind: 'sudden_death', text: `Sudden death: damage x${E.ramp.toFixed(2)}`, ramp: E.ramp });
    if (cfg.duration === 'C6' && E.healMult < 1) push({ ex, kind: 'stalemate', text: `Stalemate rule: no knockout for ${ex - lastKO} exchanges, healing and shields at ${Math.round(E.healMult * 100)}%`, healMult: E.healMult, ramp: E.ramp, quiet: ex - lastKO });
    if (cfg.duration === 'R2' && E.healMult < 1) push({ ex, kind: 'stalemate', text: `R2: healing and shields at ${Math.round(E.healMult * 100)}%`, healMult: E.healMult, ramp: E.ramp });
    for (const side of [S.a, S.b]) { side.healsThisExchange = 0; side.swappedThisExchange = false; for (const x of side.line) x.halfAction = false; }
    // 1. voluntary swaps
    for (const side of [S.a, S.b]) {
      if (side.policy === 'none' || ex - side.lastVoluntary < V.swaps.voluntaryEvery) continue;
      const pick = chooseSwap(side.policy, { ex, front: front(side), bench: alive(side).slice(1), foe: front(other(side)), rng });
      if (pick) voluntarySwap(side, pick);
    }
    // 2. condition ticks on both fronts
    for (const side of [S.a, S.b]) {
      const f = front(side); if (!f) continue;
      const r = tickCondition(f.cs, ex, f.c.maxHp);
      if (r.burn) { f.hp = Math.max(0, f.hp - r.burn); f.stats.taken += r.burn; E.log('tick', f, f, `${f.c.name} burns for ${r.burn}`, { damage: r.burn, hpAfter: f.hp }); if (f.hp <= 0) knockout(f, null, 'burn'); }
      if (r.expired) E.log('condition', f, f, `${f.c.name}'s ${r.expired} expires`, { condition: r.expired, result: 'expired' });
    }
    replace();
    if (ended()) break;
    // 2b. opening effects (Gate B.5, patch-only): a move with `opening` fires once at exchange 1 from any position.
    if (ex === 1) for (const side of [S.a, S.b]) for (const x of alive(side)) { const mv = x.c.move; if (!mv.opening || x.onceUsed) continue; x.onceUsed = true;
      if (mv.kind === 'hex' && mv.wholeLine) { if (rng.chance(mv.chance)) { for (const y of alive(other(side))) if (condition(x, y, mv.cond, `${mv.name} (opening)`, { duration: mv.duration || V.conditions.duration })) moveCondEffects(x, y); } else E.log('condition', x, front(other(side)), `${mv.name} (opening): it does not take`, { condition: mv.cond, result: 'missed' }); } }
    // 3. back-row actions
    backRow();
    replace();
    if (ended()) break;
    // 4. initiative
    const fa = front(S.a), fb = front(S.b);
    const eff = (x) => (x.cs.cond?.kind === 'chill' ? x.c.spd * V.conditions.chillSpeed : x.c.spd);
    const prio = (x) => (x.roarUntil >= ex ? -2 : x.c.move.neverFirst ? -1 : x.haste ? 2 : (x.c.move.priority && (x.c.move.trigger.kind === 'first' ? x.strikes === 0 : x.c.move.priorityExchanges ? ex <= x.c.move.priorityExchanges : false)) ? 1 : 0);
    let order;
    const pa = prio(fa), pb = prio(fb);
    if (pa !== pb) order = pa > pb ? [fa, fb] : [fb, fa];
    else { const sa = eff(fa), sb = eff(fb); if (Math.abs(sa - sb) < V.damage.initiativeTie) { const coin = rng.chance(0.5); order = coin ? [fa, fb] : [fb, fa]; E.log('initiative', order[0], order[1], `${order[0].c.name} wins the coin flip for initiative (${sa.toFixed(1)} v ${sb.toFixed(1)})`, { coin: true }); } else order = sa > sb ? [fa, fb] : [fb, fa]; }
    if (pa !== pb) E.log('initiative', order[0], order[1], `${order[0].c.name} acts first${order[0].haste ? ' (Updraft)' : order[0].c.move.priority ? ` (${order[0].c.move.name})` : order[1].roarUntil >= ex ? ` (${order[1].c.name} is roared down)` : order[1].c.move.neverFirst ? ` (${order[1].c.name} never strikes first)` : ''}`, { coin: false });
    for (const x of [fa, fb]) x.haste = false;
    // 5-7. the two actions with a knockout check between
    for (const x of order) {
      if (x.hp <= 0 || (x.side.swappedThisExchange && cfg.swapCost === 'action')) continue;
      if (front(x.side) !== x) continue; // swept away by the other action
      act(x, other(x.side));
      if (ended()) break;
    }
    // 8. replacements
    replace();
    if (ended()) break;
  }
  function replace() {
    for (const side of [S.a, S.b]) { const f = front(side); if (f && !f.isFront) enter(f, 'steps up'); }
  }
  function ended() {
    const la = alive(S.a).length, lb = alive(S.b).length;
    if (la && lb) return false;
    winner = la ? 'a' : lb ? 'b' : null; by = 'knockout';
    if (!winner) { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; }
    return true;
  }
  // ---- the cap
  const hpShare = (side) => { const t = side.line.reduce((s, x) => s + x.c.maxHp, 0); return side.line.reduce((s, x) => s + Math.max(0, x.hp), 0) / t; };
  const share = { a: hpShare(S.a), b: hpShare(S.b) };
  if (!winner) {
    if (share.a !== share.b) { winner = share.a > share.b ? 'a' : 'b'; by = 'hp'; push({ ex, kind: 'cap', text: `Exchange cap reached: side ${winner.toUpperCase()} has more of its starting HP left (${Math.round(share.a * 100)}% v ${Math.round(share.b * 100)}%)`, share }); }
    else { winner = rng.chance(0.5) ? 'a' : 'b'; by = 'coin'; push({ ex, kind: 'cap', text: `Exchange cap reached with an exact HP tie (${Math.round(share.a * 100)}%): the seeded coin flip goes to side ${winner.toUpperCase()}`, share, coin: true }); }
  }
  push({ ex, kind: 'end', text: `Side ${winner.toUpperCase()} wins by ${by === 'knockout' ? 'knockout' : by === 'hp' ? 'HP share' : 'coin flip'} after ${ex} exchange${ex === 1 ? '' : 's'}`, winner, by });

  const lineOut = (side) => side.line.map((x) => ({ id: x.c.id, species: x.c.species, name: x.c.name, archetype: x.c.archetype, type: x.c.type, hp: Math.max(0, x.hp), maxHp: x.c.maxHp, shield: Math.round(x.shield), condition: x.cs.cond?.kind || x.cs.paused?.kind || null, stats: { ...x.stats }, combatant: x.c }));
  const result = {
    winner, by, exchanges: ex, capped: ex >= V.battle.exchangeCap && by !== 'knockout', seed, model, config: cfg, experiments: activeExperiments(cfg),
    hpShare: share, lines: { a: lineOut(S.a), b: lineOut(S.b) }, log: events,
    replayKey: replayKey({ a, b, seed, config: cfg }),
  };
  return deepFreeze(result);
}

/** One line that rebuilds this battle exactly: versions, seed, configuration and full lineup snapshots. */
export function replayKey({ a, b, seed, config }) {
  const snap = (m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, nature: m.nature, level: m.level, stage: m.stage || 0, potential: m.potential, fatigue: m.fatigue || 0, attributes: { ...m.attributes } });
  return JSON.stringify({ engine: V.engineVersion, values: V.version, seed, config, a: a.map(snap), b: b.map(snap) });
}
// Values versions this build can still replay exactly, and the ruleset that reproduces each (values 1.1.0 kept 1.0.0 as a ruleset).
const REPLAYABLE = Object.freeze({ '1.0.0': 'v1.0.0' });
export function parseReplayKey(line) {
  const k = JSON.parse(line);
  if (k.engine !== V.engineVersion || (k.values !== V.version && !REPLAYABLE[k.values])) throw new Error(`Replay key is for engine ${k.engine} / values ${k.values}; this build is ${V.engineVersion} / ${V.version}`);
  const config = k.values === V.version ? k.config : { ...k.config, ruleset: REPLAYABLE[k.values] };
  return { a: k.a, b: k.b, seed: k.seed, config };
}
/** Stable hash of a battle log, for golden-seed tests. */
export function logHash(result) {
  let h = 2166136261;
  const s = result.log.map((e) => `${e.ex}|${e.kind}|${e.actor}|${e.target}|${e.text}`).join('\n') + `|${result.winner}|${result.by}|${result.exchanges}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
