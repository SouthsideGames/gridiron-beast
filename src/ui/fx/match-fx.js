// Task 8 presentation on the match screen (docs/task8/FX_FOOTBALL_MATRIX.md, integration items I1, I2, I6). No DOM here: the match
// screen (screens/match.js) calls these and draws the result through field-view.js. Everything is presentation: it reads the game
// state and a finished play's record, never writes them, and nothing here is read by the simulation.
//   I1  kickPlay: a formula kick (punt, field goal, kickoff) as the Ability Reviewer draws it, with the kick ability's cue.
//   I2  presnapFields + createRevealClock: the fields both teams may see on the play-call screen, and their reveal, played once.
//   I6  the match screen opts into the pre-roll (buildFx meta { preroll: true }) and starts a play at -fx.preroll.
//   I4  abilityTicks: Anchor Plate / Iron Lungs / Night Watch ticks for the last play's ability strip.
//   I5  absentMonsters: who is temporarily out (Sovereign Arm), for the scoreboard strip's portrait indicator;
//       createAbsenceTracker / servedVacancies / sequenceStaged: his empty formation spot while he is out and his return before the
//       formation of the play he is back for (drawn by the ability's own sub-looks through buildFx meta.staged).
import { buildFx, buildKickFx } from '../ability-fx.js';
import { toPlayFrame } from '../../sim/t8/fields.js';
import { previewPendingFields, pickSlots, opponent } from '../../sim/rules.js';
import { PLAYS } from '../../data/playbook.js';
import { FIELD_REVEAL } from './fields-fx.js';
import { LOOKS } from './looks/index.js';

/** The approved name of a Dex football ability (its look's name), or null. */
export const dexAbilityName = (id) => LOOKS[id]?.name || null;

/** How a field is named across the snap (the preview has no field id yet): its creator and its ability. */
export const fieldKey = (f) => `${f.owner}|${f.ability}`;

/**
 * I1. A formula kick event `{ kind, res, from }` as a drawable play: { sim, fx }. `sim` is kick-fx.js kickSim (the frames the match
 * always played, bent for Second Chance, plus the ability's event); `fx` is the effect state when a kick ability acted on this kick
 * (sim.kickAbility), else null: an ordinary kick is drawn exactly as before, without an effect layer. Null when it cannot be drawn.
 */
export function kickPlay(ev, lookup, meta = null) {
  const K = buildKickFx(ev, lookup, meta); if (!K?.sim?.frames?.length) return null;
  return { sim: K.sim, fx: K.sim.kickAbility ? K.fx : null };
}

/**
 * I2. The fields visible before the snap, in the upcoming play's frame (field-view.js `fields`): every active field (it was on the
 * field last play and both teams have seen it), and the banked fields the next snap will create for these calls, placed where the
 * snap will place them (rules.js previewPendingFields, read only). `calls`: { offense, defense } play ids as they would be snapped
 * now. `hideDefenseAlign`: the defensive call is the opponent's; a banked field whose placement reads a defender's alignment in that
 * call is left out, because the call (and its disguise) is hidden until the snap. Fields a contract creates inside the snap itself
 * are not known before it (their reveal plays in the pre-roll). Returns [{ field, isNew, pending }]: `isNew` fields get a reveal.
 */
export function presnapFields(state, teams, calls = null, { hideDefenseAlign = false } = {}) {
  if (!state || state.phase !== 'scrimmage' || state.finished) return [];
  const frame = { home: state.possession === 'home', ballOn: state.ballOn, ballLat: state.ballLat || 0 };
  const strip = ({ fresh, ...f }) => f; // eslint-disable-line no-unused-vars
  const active = state.t8?.fields?.list || [];
  const out = toPlayFrame(active, frame).map((f, i) => ({ field: strip(f), isNew: !!active[i].createdThisPlay, pending: false }));
  if (calls?.offense && calls?.defense && state.t8?.fields?.pending?.length) {
    let banked = [];
    try { banked = previewPendingFields(state, teams, calls.offense, calls.defense); } catch { banked = []; } // presentation never breaks the screen
    if (hideDefenseAlign) banked = banked.filter((f) => !f.usesDefenseAlign);
    const seq = state.t8.fields.seq || 0;
    toPlayFrame(banked, frame).forEach((f, i) => out.push({ field: { ...strip(f), id: `pre${seq}-${i + 1}` }, isNew: true, pending: true }));
  }
  return out;
}

const leadOf = (f) => FIELD_REVEAL[f.ability]?.lead ?? 0, durOf = (f) => FIELD_REVEAL[f.ability]?.dur ?? 0.9;

/**
 * I2. The reveal clock of the play-call screen: a new field's reveal plays once, from the moment it is first shown, and a later
 * re-render of the same situation continues it or finds it finished (never restarts it). `frame(gameKey, list, now, animate)` with
 * presnapFields' list returns { fields (with `fresh` on the ones being revealed now), time (the reveal's clock for the draw), until
 * (ms: when the reveal ends, 0 when nothing is animating), shown (fieldKey of every new field shown: the snap's play skips their
 * reveal) }. `animate` false (reduced motion): new fields are simply shown.
 */
export function createRevealClock() {
  let game = null; const seen = new Map();
  return {
    frame(gameKey, list, now, animate = true) {
      if (gameKey !== game) { game = gameKey; seen.clear(); }
      const fresh = list.filter((x) => x.isNew);
      for (const x of fresh) { const k = `${x.field.id}|${fieldKey(x.field)}`; if (!seen.has(k)) seen.set(k, animate ? now : -Infinity); }
      const startOf = (x) => seen.get(`${x.field.id}|${fieldKey(x.field)}`);
      const live = fresh.filter((x) => now - startOf(x) < 4000); const t0 = live.length ? Math.max(...live.map(startOf)) : 0;
      let batch = live.filter((x) => startOf(x) === t0); const lead = Math.max(0, ...batch.map((x) => leadOf(x.field))); const span = lead + Math.max(0, ...batch.map((x) => durOf(x.field)));
      if ((now - t0) / 1000 >= span) batch = [];
      return { fields: list.map((x) => (batch.includes(x) ? { ...x.field, fresh: true } : x.field)), time: batch.length ? (now - t0) / 1000 - lead : 0, until: batch.length ? t0 + span * 1000 : 0, shown: fresh.map((x) => fieldKey(x.field)) };
    },
    reset() { game = null; seen.clear(); },
  };
}

/** I2. The effect state of the play-call screen: the fields' decoration and reveal, nothing else (no play, no events). */
export function presnapFx(fields, lookup = () => null, staged = null) { return fields?.length || staged?.length ? buildFx({ frames: [], events: [], fields: fields || [] }, lookup, { preroll: true, ...(staged?.length ? { staged } : {}) }) : null; }

/**
 * I4. Ticks for the last play's ability strip (the match screen's ability panel), read from the play's own events: Anchor Plate's
 * absorbed push, Iron Lungs' saved stamina drain and whom it steadied, Night Watch's protected ally. Returns { 'side:slot:ability':
 * text }. `nameOf(side, slot)` names a monster (falls back to the slot). Presentation only: the numbers are the engine's.
 */
export function abilityTicks(sim, nameOf = (side, slot) => slot) {
  const out = {}; const key = (e) => `${e.side}:${e.by}:${e.ability}`;
  for (const e of sim?.events || []) {
    if (e.ability === 'MET-01-F' && e.kind === 'ability_end' && e.absorbed != null) out[key(e)] = `absorbed ${(+e.absorbed).toFixed(2)} yd of push`;
    else if (e.ability === 'MET-02-F' && e.kind === 'ability' && e.targets?.length) out[key(e)] = `saved 1 stamina: ${e.targets.map((s) => nameOf(e.side, s)).join(', ')}`;
    else if (e.ability === 'DAR-02-F' && e.kind === 'ability' && e.victim) out[key(e)] = `${nameOf(e.side, e.victim)} keeps full Awareness in the dark`;
  }
  return out;
}

/**
 * I5. Monsters temporarily out of the game (Sovereign Arm's swallowed defender), from the game's own absence list: [{ mid, monster,
 * team, serveOn, ability }] (`team`: his club's side; `serveOn`: the side whose next offensive scrimmage play he misses). Read only.
 */
export function absentMonsters(state, teams) {
  const out = [];
  for (const a of state?.t8?.absences || []) {
    let found = null;
    for (const side of ['home', 'away']) { const T = teams?.[side]; if (!T) continue; const m = [...Object.values(T.defense || {}), ...Object.values(T.offense || {}), ...(T.bench || [])].find((x) => x?.id === a.mid); if (m) { found = { monster: m, team: side }; break; } }
    out.push({ mid: a.mid, monster: found?.monster || null, team: found?.team || null, serveOn: a.serveOn || null, ability: a.ability || null });
  }
  return out;
}

// ---- I5, the rest: the swallowed defender's empty spot in the formation while he is out, and his return (Dex DRA-06-F Visuals:
// "Portrait dragon-mouth indicator while unavailable, return animation before formation").
/** The sub-looks (src/ui/fx/looks) that draw an ability's temporary absence: the vacant spot, the return. */
export const ABSENCE_LOOK = Object.freeze({ 'DRA-06-F': Object.freeze({ absent: 'dragon_absent', back: 'dragon_return', returnDur: 1.4 }) });

/** The defensive slot a monster fills in a call (or a pre-snap look: { onField, align }) of his team: { slot, at: [x, y] } | null. Read only. */
export function defenseSlotOf(teams, defSide, defensePlay, mid) {
  const T = teams?.[defSide]; if (!T || !defensePlay?.onField || !mid) return null;
  const slots = pickSlots(T.defense || {}, defensePlay.onField, T, defensePlay);
  for (const sl of defensePlay.onField) if (slots[sl]?.id === mid) { const at = defensePlay.align?.[sl]; return at ? { slot: sl, at: [at[0], at[1]] } : null; }
  return null;
}

/**
 * The play on which an absence was served: the staged marks (buildFx meta.staged) for the spots left empty. `served`: absentMonsters()
 * entries read BEFORE the snap whose serveOn was the side on offense; `sim`: the finished play's record. A spot is marked only when the
 * record really has nobody there. Read only.
 */
export function servedVacancies(served, sim, teams, defSide) {
  const dp = PLAYS[sim?.defensePlay]; const there = new Set((sim?.frames?.[0]?.def || []).map((q) => q[0])); const out = [];
  for (const a of served || []) { const look = ABSENCE_LOOK[a.ability]; const w = look ? defenseSlotOf(teams, defSide, dp, a.mid) : null; if (!w || there.has(w.slot)) continue;
    out.push({ ability: a.ability, kind: look.absent, team: 'def', slot: w.slot, at: w.at, always: true, name: a.monster?.name || null }); }
  return out;
}

/**
 * The Ability Reviewer's sequence (review-sequence.js plays): the staged marks of play `i`. The play that serves an absence gets the
 * vacant spot; the first later play with the defender back in his slot gets his return, which a pre-rolling host plays before the snap.
 */
export function sequenceStaged(plays, i) {
  const p = plays?.[i]; const out = []; if (!p) return out;
  for (const a of p.served || []) { const look = ABSENCE_LOOK[a.ability]; const slot = a.who?.slot; const at = look && slot ? PLAYS[p.sim?.defensePlay]?.align?.[slot] : null;
    if (at && !p.presence?.def?.includes(slot)) out.push({ ability: a.ability, kind: look.absent, team: 'def', slot, at: [at[0], at[1]], always: true, name: a.who.name || null }); }
  for (let j = 0; j < i; j++) for (const a of plays[j].served || []) { const look = ABSENCE_LOOK[a.ability]; const slot = a.who?.slot; if (!look || !slot) continue;
    let back = -1; for (let q = j + 1; q < plays.length; q++) if (plays[q].presence?.def?.includes(slot)) { back = q; break; }
    if (back === i) out.push({ ability: a.ability, kind: look.back, team: 'def', slot, name: a.who.name || null }); }
  return out;
}

/**
 * The match screen's memory of temporary absences (presentation only, in memory; the game state is only read). `observe(gameKey,
 * state, teams)` on every draw: an absence that has left the game's list has been served, so its monster is "returning" until his
 * return has been shown. `frame(state, teams, defensePlay, now, animate)` on a play-call screen (`defensePlay`: the defensive call or
 * look drawn there) returns
 *   vacant     the formation slots to leave empty: an absence that this snap will serve (the offense is the side he sits out for)
 *   staged     buildFx meta.staged entries: the vacant marks (always on) and, for a defender back in this formation, his return
 *              with `age` (seconds since it began; the caller turns it into the draw clock's `t`)
 *   returning  [{ mid, monster, team, slot }] the monsters whose return belongs to this play-call screen (for a text chip)
 *   until      ms: when the last running return ends (0: nothing is animating)
 * A return plays once, from the first screen that shows him back; a re-render continues it, never restarts it; it is over at the next
 * snap. `animate` false (reduced motion): no animation, he is simply back (the chip still says so).
 */
export function createAbsenceTracker() {
  let game = null; const out = new Map(), back = new Map();
  return {
    observe(gameKey, state, teams) {
      if (gameKey !== game) { game = gameKey; out.clear(); back.clear(); }
      const now = absentMonsters(state, teams); const ids = new Set(now.map((a) => a.mid)); const n = state?.playCount || 0;
      for (const [mid, a] of out) if (!ids.has(mid)) { out.delete(mid); if (!state?.finished && ABSENCE_LOOK[a.ability]) back.set(mid, { ...a, shownAt: null, startedAt: null }); }
      for (const a of now) { out.set(a.mid, a); back.delete(a.mid); }
      for (const [mid, b] of back) if (state?.finished || (b.shownAt != null && b.shownAt !== n)) back.delete(mid);
    },
    frame(state, teams, defensePlay, now, animate = true) {
      const res = { vacant: [], staged: [], returning: [], until: 0 };
      if (!state || state.phase !== 'scrimmage' || state.finished || !defensePlay) return res;
      const defSide = opponent(state.possession); const n = state.playCount || 0;
      for (const a of out.values()) { const look = ABSENCE_LOOK[a.ability]; if (!look || a.serveOn !== state.possession || a.team !== defSide) continue;
        const w = defenseSlotOf(teams, defSide, defensePlay, a.mid); if (!w) continue;
        res.vacant.push(w.slot); res.staged.push({ ability: a.ability, kind: look.absent, team: 'def', slot: w.slot, always: true, name: a.monster?.name || null }); }
      for (const b of back.values()) { const look = ABSENCE_LOOK[b.ability]; if (b.team !== defSide) continue;
        const w = defenseSlotOf(teams, defSide, defensePlay, b.mid); if (!w) continue;
        if (b.shownAt == null) { b.shownAt = n; b.startedAt = animate ? now : -Infinity; }
        res.returning.push({ mid: b.mid, monster: b.monster, team: b.team, slot: w.slot });
        const age = (now - b.startedAt) / 1000; if (age >= 0 && age < look.returnDur) { res.staged.push({ ability: b.ability, kind: look.back, team: 'def', slot: w.slot, age, name: b.monster?.name || null }); res.until = Math.max(res.until, b.startedAt + look.returnDur * 1000); } }
      return res;
    },
    reset() { game = null; out.clear(); back.clear(); },
  };
}
