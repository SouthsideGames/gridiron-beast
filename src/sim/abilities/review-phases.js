// Task 8 Reviewer v2 (spec §25): the four-phase checklist of a complete-interaction run, evaluated from engine records only.
//   trigger met     the qualifying condition: built up in earlier plays (the contract's charge / ready events), held by the staged
//                   or built game-scope state at the activation snap, and (where the spec names one) the engine event that met it
//   ability activated  the subject's own recorded execution (registry.js recordExecution) and his ability event on that play
//   effect resolved the effect the contract produced: its effect events, the field it created, the status it applied, the outcome
//   cleanup         what the contract leaves behind is gone or back: the per-play effect ended at the whistle (a follow-up play
//                   ran), the game-scope state spent, the cooldown back to ready, every field it created expired, every status it
//                   applied cleared, an absence served and the absentee returned
// Each phase records the play and the engine time of its evidence, so the reviewer can tick it during playback. A spec entry per
// family names the texts the reviewer explains before playback (source, targets, expected result) and, where the generic evidence
// is not enough, the events that evidence a phase. No gameplay value or rule lives here.
import { SPECS, VARIANTS } from './review-texts.js';

export const CONTROL_LABELS = Object.freeze({
  fumbleOnTackle: 'Controlled prerequisite: the first fumble check of an ordinary tackle fumbles (the recovery is the engine\'s ordinary draw)',
  wouldBeInterception: 'Controlled prerequisite: the nearest defender (within 2.5 yd) makes a would-be interception at the catch point',
});
export const PHASE_LABELS = Object.freeze({ trigger: 'Trigger met', activation: 'Ability activated', resolution: 'Effect resolved', cleanup: 'Cleanup' });
const KINDS_ABILITY = new Set(['ability', 'ability_hit', 'ability_shot', 'ability_end', 'ability_target', 'snowball', 'vault_land', 'wall_stop', 'blink', 'pancake', 'dragon_swallow', 'shed_prevented', 'afterimage', 'afterimage_end', 'foresight_mark', 'stone_charge', 'ability_miss']);
const EFFECT_KEYS = ['victim', 'victims', 'targets', 'target', 'partner', 'clone', 'guards', 'markers', 'affected', 'recipients', 'spot', 'wall', 'panels', 'fumble', 'p', 'success', 'cd', 'collected', 'points', 'removed'];
const OWNER = 'review_subject';
const READY_FLAGS = ['ignited', 'token', 'banked', 'pending', 'armed', 'charged', 'queued'];

/** What the subject's game-scope state says about readiness (descriptive; e.g. "cooldown 0", "token", "charges 3"). */
export function readyFacts(st) {
  if (!st || typeof st !== 'object') return [];
  const f = [];
  if ('cd' in st) f.push(st.cd > 0 ? `cooldown ${st.cd}` : 'cooldown 0 (ready)');
  for (const k of READY_FLAGS) if (st[k] === true) f.push(k);
  for (const k of ['charges', 'bar', 'count', 'tackles', 'streak', 'banked']) if (typeof st[k] === 'number') f.push(`${k} ${st[k]}`);
  if (st.used === false) f.push('unused this game');
  return f;
}
const subjectSide = (p) => (p.unit === 'kick' ? null : p.unit);
const isSubject = (e, p, slot, abilityId, family) => (e.ability === abilityId || e.contract === family || e.contract === true) && (e.by == null || e.by === slot) && (e.side == null || subjectSide(p) == null || e.side === subjectSide(p));
const evText = (e) => `${(e.t ?? 0).toFixed(1)}s ${e.text || e.kind}`;

/**
 * Evaluate the four phases over the recorded plays (`act`: the activation play index or -1). Returns { done, list, failure, targets }.
 * `done` means every phase has evidence (for a blocked / failure variant: its own expected outcome has evidence).
 */
export function evaluatePhases({ plays, act, spec, sc, contract, source, teams, abilityId, form, mastery }) {
  const slot = source.slot; const family = contract.family;
  const subj = (p) => p.allEvents.filter((e) => isSubject(e, p, slot, abilityId, family));
  if (spec.blocked) return spec.blocked({ plays, act, slot, subj, abilityId, teams, source, readyFacts });
  const list = [];
  const push = (id, ok, play, t, evidence) => { list.push({ id, label: PHASE_LABELS[id], ok: !!ok, play, t, evidence }); return ok; };
  if (act < 0) {
    const snaps = plays.map((p) => `play ${p.n}: ${readyFacts(p.before).join(', ') || 'no game-scope state'}${p.allEvents.some((e) => /blocked|cancel|skip/.test(e.kind || '') && (e.by === slot)) ? ' (blocked: ' + p.allEvents.filter((e) => /blocked|cancel|skip/.test(e.kind || '') && e.by === slot).map((e) => e.text).join('; ') + ')' : ''}`);
    for (const id of ['trigger', 'activation', 'resolution', 'cleanup']) push(id, false, null, null, null);
    return { done: false, list, failure: { condition: `The trigger was not met: ${spec.trigger}`, detail: `No execution was recorded for the subject in ${plays.length} play(s).`, snaps } };
  }
  const A = plays[act]; const aEvents = subj(A); const aEv = aEvents.find((e) => e.kind === 'ability') || aEvents[0] || null; const aT = aEv?.t ?? 0;
  // ---- trigger
  const charges = plays.slice(0, act + 1).flatMap((p) => subj(p).filter((e) => e.kind === 'ability_charge' || e.kind === 'ability_ready').map((e) => ({ p, e })));
  const ready = readyFacts(A.before); const primed = !!sc.prime && act === 0;
  let trig = null; let trigT = aT;
  if (spec.triggerEvent) {
    const hit = A.allEvents.find((e) => spec.triggerEvent(e, { slot, A, aT, source }) && (e.t ?? 0) <= aT + 1e-6);
    if (hit) { trig = `engine: ${evText(hit)}`; trigT = hit.t ?? aT; }
  } else {
    const ctxEv = [...A.allEvents].filter((e) => (e.t ?? 0) <= aT + 1e-6 && !isSubject(e, A, slot, abilityId, family) && e.kind !== 'debug').pop();
    trig = `condition met at ${aT.toFixed(1)}s${ctxEv ? ` (engine: ${evText(ctxEv)})` : ''}`;
  }
  const built = charges.length ? `built in play(s) ${[...new Set(charges.map((c) => c.p.n))].join(', ')}: ${charges.map((c) => c.e.text).join('; ')}` : null;
  const stateLine = ready.length ? `${primed ? 'staged (primed)' : 'game-scope state'} at the snap: ${ready.join(', ')}` : null;
  const trigOk = !!trig && (!spec.triggerReady || spec.triggerReady(A.before, { charges }));
  push('trigger', trigOk, act, trigT, [built, stateLine, trig].filter(Boolean).join(' · ') || null);
  // ---- activation
  // A formula kick or a game-level hook (rules.js) has no simulated play: its evidence is the recorded execution and the game's own
  // result text / log line for that play.
  const gameLine = A.gameLog.find((x) => x.kind === 'ability')?.text || A.text;
  push('activation', !!aEv || !A.sim || !!spec.gameHook, act, aT, aEv ? `execution recorded for ${source.name} (${slot}) · ${evText(aEv)}` : `execution recorded for ${source.name} (${slot}) by the ${A.sim ? 'pre-snap game hook' : 'formula-kick hook'} · ${gameLine}`);
  // ---- resolution
  let res = null;
  if (spec.resolveFn) res = spec.resolveFn({ plays, act, A, aEv, aT, slot, subj, source, teams });
  else if (spec.field) {
    // a field created at a snap is live in that play (sim.fields); one created at the whistle shows in the game state after the play
    for (let i = act; i < plays.length && !res; i++) {
      const live = (plays[i].sim?.fields || []).find((f) => f.owner === OWNER); const kept = plays[i].fieldsAfter.list.find((x) => x.own);
      const f = live || kept; if (!f) continue;
      res = { play: i, t: live ? 0 : (i === act ? aT : 0), text: `field ${live ? 'live in this play' : 'created at the whistle'}: ${f.type} ${f.id} (${Math.abs(f.yard[1] - f.yard[0]).toFixed(0)} x ${Math.abs(f.lat[1] - f.lat[0]).toFixed(0)} yd)${kept ? `, ${kept.remaining} play(s) left after it` : ', expires at this whistle'}` };
    }
  } else if (spec.resolveEvents) {
    const last = spec.resolveLater ? plays.length : act + 1; // a per-play effect resolves on its activation play
    for (let i = act; i < last && !res; i++) { const e = plays[i].allEvents.find((x) => spec.resolveEvents.includes(x.kind) && (i > act || (x.t ?? 0) >= aT - 1e-6) && (x.by === slot || x.ability === abilityId) && (spec.resolveWhere ? spec.resolveWhere(x) : true)); if (e) res = { play: i, t: e.t ?? 0, text: `engine: ${evText(e)}` }; }
  } else if (spec.status) {
    for (let i = act; i < (spec.resolveLater ? plays.length : act + 1) && !res; i++) { const e = plays[i].allEvents.find((x) => x.kind === 'status' && x.by === slot && (i > act || (x.t ?? 0) >= aT - 1e-6)); if (e) res = { play: i, t: e.t ?? 0, text: `engine: ${evText(e)} (${e.accepted ? 'accepted' : `refused: ${e.reason}`})` }; }
  } else {
    const eff = aEvents.find((e) => (e.t ?? 0) >= aT - 1e-6 && EFFECT_KEYS.some((k) => e[k] != null)) || aEv;
    if (eff) res = { play: act, t: eff.t ?? aT, text: `${EFFECT_KEYS.some((k) => eff[k] != null) ? 'effect' : 'self-enhancement active for the play'}: ${evText(eff)}` };
  }
  push('resolution', !!res, res?.play ?? null, res?.t ?? null, res?.text || null);
  const targets = collectTargets(plays.slice(act, (res?.play ?? act) + 1), slot, abilityId, family, teams);
  // ---- cleanup
  const rp = res?.play ?? act; const after = plays.slice(rp + 1); const need = []; const met = [];
  if (!after.length) need.push('a follow-up play (the per-play effect ends at the whistle)'); else met.push(`per-play effect ended at the whistle of play ${rp + 1}; play ${rp + 2} ran without it`);
  if (spec.spent) { const s = A.after; if (spec.spent(s)) met.push(`state spent at the whistle: ${JSON.stringify(s)}`); else need.push(`the state is not spent: ${JSON.stringify(s)}`); }
  const hasCd = contract.repeatableCooldown && A.before && 'cd' in A.before && spec.cooldown !== false;
  let cdPlay = null;
  if (hasCd) {
    const s0 = plays.findIndex((p, j) => j >= act && p.after?.cd > 0); // the cooldown starts at the activation (or when its banked effect is created)
    if (s0 < 0) need.push(`the cooldown to start (cd ${plays.at(-1).after?.cd})`);
    else { const i = plays.findIndex((p, j) => j > s0 && p.after?.cd === 0); if (i > 0) { cdPlay = i; met.push(`cooldown ${plays[s0].after.cd} counted down: ready again after play ${plays[i].n}`); } else need.push(`the cooldown back to ready (cd ${plays.at(-1).after?.cd} after play ${plays.at(-1).n})`); }
  }
  const seenOwn = new Map(); for (let i = act; i < plays.length; i++) for (const f of [...plays[i].fieldsAfter.list.filter((x) => x.own), ...(plays[i].sim?.fields || []).filter((x) => x.owner === OWNER)]) if (!seenOwn.has(f.id)) seenOwn.set(f.id, i);
  let fieldPlay = null;
  if (spec.field && seenOwn.size) {
    const last = plays.at(-1); const live = last.fieldsAfter.list.filter((f) => f.own); const pend = last.fieldsAfter.pending;
    if (live.length || pend.length) need.push(`the field(s) to expire (${live.map((f) => `${f.id} ${f.remaining} left`).concat(pend.map((x) => `${x.type} pending`)).join(', ')})`);
    else { const lastSeen = Math.max(...seenOwn.values()); fieldPlay = plays.findIndex((p, j) => j >= lastSeen && !p.fieldsAfter.list.some((f) => f.own)); met.push(`field(s) ${[...seenOwn.keys()].join(', ')} expired at the whistle of play ${plays[fieldPlay]?.n}`); }
  }
  if (spec.field && !seenOwn.size) need.push('the field it creates');
  const lastSt = plays.at(-1).statuses; if (lastSt.length) need.push(`status(es) to clear: ${lastSt.map((s) => `${s.id} on ${s.mid} (${s.remaining} left)`).join(', ')}`);
  else if (plays.slice(act).some((p) => p.allEvents.some((e) => e.kind === 'status' && e.by === slot && e.accepted))) met.push('every status it applied has cleared');
  let absPlay = null;
  if (spec.absence) {
    const q = plays.findIndex((p, j) => j >= act && p.absencesAfter.length); const s = plays.findIndex((p, j) => j > q && q >= 0 && p.served.length);
    if (q < 0) need.push('the queued absence');
    else if (s < 0) need.push(`the absence served on his team's next offensive play (${plays[q].absencesAfter.map((a) => a.mid).join(', ')} pending)`);
    else {
      const who = plays[s].served[0].who; const vacant = who && plays[s].presence && !plays[s].presence.def.includes(who.slot); const back = plays.findIndex((p, j) => j > s && p.presence && who && p.presence.def.includes(who.slot));
      if (!vacant) need.push(`${who?.name || 'the defender'}'s slot vacant on play ${plays[s].n}`);
      else if (back < 0) need.push(`${who.name} back in his formation slot after the absence`);
      else { absPlay = back; met.push(`${who.name} (${who.slot}) absent on play ${plays[s].n}, back on play ${plays[back].n}`); }
    }
  }
  if (spec.cleanupFn) { const c = spec.cleanupFn({ plays, act, A, rp, slot, source, teams }); if (c.ok) met.push(c.text); else need.push(c.text); }
  const cPlay = Math.max(rp + (after.length ? 1 : 0), cdPlay ?? 0, fieldPlay ?? 0, absPlay ?? 0);
  const cOk = need.length === 0 && !!res;
  push('cleanup', cOk, cOk ? cPlay : null, cOk ? 0 : null, cOk ? met.join(' · ') : (need.length ? `waiting for: ${need.join('; ')}` : 'no resolution to clean up'));
  list.at(-1).atEnd = true; // ticked at the whistle of its evidence play
  const done = list.every((x) => x.ok);
  const missing = list.find((x) => !x.ok);
  return { done, list, targets, failure: done ? null : { condition: `${missing.label} not observed: ${missing.id === 'cleanup' ? spec.cleanup : spec[missing.id] || ''}`, detail: missing.evidence || `no ${missing.label.toLowerCase()} evidence in ${plays.length} play(s)` } };
}

function collectTargets(plays, slot, abilityId, family, teams) {
  const out = []; const seen = new Set();
  const add = (team, s, why) => { const k = `${team}:${s}`; if (!s || seen.has(k)) return; seen.add(k); out.push({ team, slot: s, why }); };
  for (const p of plays) for (const e of p.allEvents) {
    if (!(e.by === slot && (e.ability === abilityId || e.kind === 'status' || KINDS_ABILITY.has(e.kind)))) continue;
    const other = e.victimSide || (e.side === 'off' ? 'def' : e.side === 'def' ? 'off' : null);
    if (e.victim) add(other, e.victim, e.text);
    for (const v of e.victims || []) add(other, typeof v === 'string' ? v : v.slot, e.text);
    if (e.partner) add(e.side, e.partner, e.text);
    if (e.target && typeof e.target === 'string') add(e.side, e.target, e.text);
    for (const r of e.recipients || e.affected || []) { const [tm, s] = String(r).split(':'); add(tm, s, e.text); }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------- the family specs
// Texts (shown before playback) and the evidence hints. `field`: the interaction creates a field (resolution = the field exists;
// cleanup = it expired). `status`: resolution is the status application attempt. `resolveEvents`: the engine / contract event kinds
// that evidence the resolution. `spent(state)`: the game-scope state at the activation play's whistle shows the spend. `absence`: an
// absence must be served and the absentee return. `cooldown: false`: no recharge to wait for.
export function phaseSpec(family, variant = null) { const s = SPECS[family] || {}; return variant?.spec ? { ...s, ...variant.spec } : s; }
export const variantsOf = (family) => VARIANTS[family] || [];
