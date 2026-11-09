// Task 8 presentation for the formula kicks (punts and field goals are resolved by the rules engine, not simulated play by play):
// the kick animation (kick-anim.js kickFrames, the same frames the match screen plays) plus the ability cue derived from the kick's
// own result, so Second Chance (ICE-06-F), Dragon Roar (DRA-05-F) and Stone Cradle (EAR-04-F) draw their Dex visuals on the kick.
// Drawing only: the result (`res`) is final before anything is drawn; the frames only show it. Second Chance bends the drawn flight
// (wide first, the shard strikes, then toward the uprights or still wide) to show the one final result the engine resolved.
import { kickFrames } from '../kick-anim.js';

/** The kick abilities' ids and how to read them from a kick result. */
export const KICK_ABILITY = Object.freeze({
  'ICE-06-F': (ev) => ev.kind === 'field_goal' && (ev.res?.secondChance || ev.res?.ability === 'ICE-06-F'),
  'DRA-05-F': (ev) => ev.kind === 'field_goal' && ev.res?.signature === 'DRA-05-F',
  'EAR-04-F': (ev) => ev.kind === 'punt' && (ev.res?.cradled || ev.res?.ability === 'EAR-04-F'),
});

/**
 * A sim-like record for a formula kick event `{ kind, res, from }`: { frames, events, ballOn: 0, ballLat: 0, kick: true, kickAbility }
 * or null when the kick cannot be drawn. Events carry the Dex ability id so the Task 8 looks draw them like any engine event.
 */
export function kickSim(ev) {
  const frames = kickFrames(ev); if (!frames?.length) return null;
  const id = Object.keys(KICK_ABILITY).find((k) => KICK_ABILITY[k](ev)) || null; const events = [];
  const airIdx = frames.findIndex((f) => f.ball[2]); const landIdx = airIdx < 0 ? -1 : frames.findIndex((f, i) => i > airIdx && !f.ball[2]);
  const tAir = airIdx >= 0 ? frames[airIdx].t : 0.4; const tLand = landIdx >= 0 ? frames[landIdx].t : (frames[frames.length - 1].t ?? 1);
  if (id === 'ICE-06-F') {
    // The drawn flight shows the miss first, the shard strike, then the final result: good bends to the uprights' centre, else wide.
    const good = !!ev.res.good; const side = (ev.res.distance || 1) % 2 ? 1 : -1; const strikeK = 0.55;
    const air = frames.filter((f) => f.ball[2]); const n = air.length; const tStrike = air[Math.max(0, Math.floor(n * strikeK))]?.t ?? tAir;
    air.forEach((f, i) => { const k = (i + 1) / n; const wide = 6 * side * Math.min(1, k / strikeK); const y = k <= strikeK ? wide : good ? 6 * side * (1 - (k - strikeK) / (1 - strikeK)) : 6 * side + (k - strikeK) * 4 * side; f.ball = [f.ball[0], +y.toFixed(2), 1]; });
    const last = air[n - 1]; if (last) for (const f of frames) if (f.t > last.t) f.ball = [f.ball[0], good ? 0 : last.ball[1], 0];
    const at = frames.find((f) => f.t >= tStrike) || frames[0]; const K = at.off.find((p) => p[0] === 'K') || at.off[0];
    events.push({ t: tStrike, kind: 'ability', ability: 'ICE-06-F', by: 'K', side: 'off', x: at.ball[0], y: at.ball[1], fromX: K[1], fromY: K[2], good, text: 'Second Chance' });
  } else if (id === 'DRA-05-F') {
    events.push({ t: Math.max(0, tAir - 0.4), kind: 'ability', ability: 'DRA-05-F', by: 'K', side: 'off', good: !!ev.res.good, landT: tLand, text: 'Dragon Roar' });
  } else if (id === 'EAR-04-F') {
    const catchF = frames.find((f) => f.t >= tLand) || frames[frames.length - 1]; const ret = catchF.def.find((p) => p[0] === 'PR');
    events.push({ t: catchF.t, kind: 'ability', ability: 'EAR-04-F', by: 'P', side: 'off', victim: 'PR', victimSide: 'def', x: ret?.[1], y: ret?.[2], text: 'Stone Cradle' });
  }
  return { frames, events, ballOn: 0, ballLat: 0, kick: true, kickAbility: id };
}
