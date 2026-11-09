// Task 8 presentation on the match screen (docs/task8/FX_FOOTBALL_MATRIX.md, integration items I1, I2, I6). No DOM here: the match
// screen (screens/match.js) calls these and draws the result through field-view.js. Everything is presentation: it reads the game
// state and a finished play's record, never writes them, and nothing here is read by the simulation.
//   I1  kickPlay: a formula kick (punt, field goal, kickoff) as the Ability Reviewer draws it, with the kick ability's cue.
//   I2  presnapFields + createRevealClock: the fields both teams may see on the play-call screen, and their reveal, played once.
//   I6  the match screen opts into the pre-roll (buildFx meta { preroll: true }) and starts a play at -fx.preroll.
//   I4  abilityTicks: Anchor Plate / Iron Lungs / Night Watch ticks for the last play's ability strip.
//   I5  absentMonsters: who is temporarily out (Sovereign Arm), for the scoreboard strip's portrait indicator.
import { buildFx, buildKickFx } from '../ability-fx.js';
import { toPlayFrame } from '../../sim/t8/fields.js';
import { previewPendingFields } from '../../sim/rules.js';
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
export function presnapFx(fields, lookup = () => null) { return fields?.length ? buildFx({ frames: [], events: [], fields }, lookup, { preroll: true }) : null; }

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
