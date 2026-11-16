// Shared between live coaching and headless games. State is JSON-safe and keyed by individual, never by a mutable slot.
import { positionOf } from '../data/personnel.js';
import { createRng, hashString } from '../core/rng.js';
import { toNumber } from '../core/fraction.js';
import { E as $E } from '../core/english.js';
export const PHILOSOPHIES = ['heavy', 'balanced', 'starters'];
export const ROTATION_RULES = Object.freeze({ heavy: { threshold: .72, gap: 22 }, balanced: { threshold: .45, gap: 12 }, starters: { threshold: .20, gap: 6 }, injuryChance: .0015 });
export const philosophyLabel = (id) => ({heavy:$E('rotation.heavy'),balanced:$E('rotation.balanced'),starters:$E('rotation.starters')})[id] || $E('rotation.balanced');
const book = (s) => (s.rotation ||= { active: {}, manual: {}, injuries: {}, notices: [] });
export function teamInputs(team) { return [...new Map((team.rotationInputs || [...Object.values(team.offense || {}), ...Object.values(team.defense || {}), ...(team.bench || []), team.kicker]).filter(p => p?.id).map(p => [p.id, p])).values()]; }
export function staminaRatio(s, p) { const x = s.t8?.stamina?.[p.id]; return x ? Math.max(0, toNumber(x.stamina) / Math.max(1, x.capacity)) : 1; }
export function unavailable(s, p) { return !p?.id || !!p.injury || !!s.rotation?.injuries?.[p.id]; }
const rating = p => Object.values(p.attrs || {}).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(p.attrs || {}).length);
/** A next-play override, validated again against the actual package at the snap. */
export function requestSubstitution(s, teams, side, slot, id) {
  if (s.finished || !['home', 'away'].includes(side) || !['scrimmage', 'try'].includes(s.phase)) return { ok: false, reason: $E('rotation.dead_ball') };
  const p = teamInputs(teams[side]).find(x => x.id === id);
  if (!p || p.position !== positionOf(slot) || unavailable(s, p) || s.t8?.stamina?.[id]?.exhausted) return { ok: false, reason: $E('rotation.ineligible') };
  const b = book(s); (b.manual[side] ||= {})[slot] = { id, play: s.playCount || 0 }; delete s.t8?.preChoice;
  return { ok: true };
}
export function selectUnit(s, team, side, slots, initial, { pinned = [] } = {}) {
  if (!team.rotation || !team.roster?.length) return initial; // synthetic Lab teams preserve their existing behavior
  const b = book(s), key = `${s.playCount || 0}:${s.phase}:${slots.join(',')}`;
  const active = (b.active[side] ||= {}), used = new Set(), out = {}, pool = teamInputs(team);
  const philosophy = PHILOSOPHIES.includes(team.rotation.philosophy) ? team.rotation.philosophy : 'balanced';
  const R = ROTATION_RULES[philosophy], close = s.quarter >= 4 && Math.abs(s.score.home - s.score.away) <= 8;
  for (const slot of slots) {
    const candidates = pool.filter(p => p.position === positionOf(slot) && !used.has(p.id) && !unavailable(s, p));
    const order = team.rotation.depth?.[positionOf(slot)] || [];
    candidates.sort((a,b) => { const rank = p => order.includes(p.id) ? order.indexOf(p.id) : 1000 + pool.indexOf(p); return rank(a)-rank(b); });
    // The engine's own choice for the slot (the lineup, a package borrow, a Legendary Play's monster, a staged Ability Review
    // subject) is the starting point; rotation only rests or replaces it, it never undoes that choice.
    const engine = initial[slot]?.id && !used.has(initial[slot].id) && !unavailable(s, initial[slot]) ? initial[slot] : null;
    if (engine && !candidates.some(p => p.id === engine.id)) candidates.unshift(engine);
    const saved = active[slot], override = b.manual[side]?.[slot];
    const base = (engine && candidates.find(p => p.id === engine.id)) || candidates.find(p => p.id === team.chart?.[slot]) || candidates[0];
    let pick = saved?.key === key ? candidates.find(p => p.id === saved.id) : base;
    let reason = unavailable(s, initial[slot]) ? 'availability' : 'fatigue';
    const fresh = candidates.filter(p => !s.t8?.stamina?.[p.id]?.exhausted);
    if (override?.play === (s.playCount || 0)) { const p = fresh.find(p => p.id === override.id); if (p) { pick = p; reason = 'manual'; } }
    else if (team.rotation.mode !== 'manual' && base && saved?.key !== key && !pinned.includes(slot)) {
      const threshold = close && philosophy !== 'heavy' ? R.threshold * .6 : R.threshold;
      if (staminaRatio(s, base) <= threshold || s.t8?.stamina?.[base.id]?.exhausted) {
        pick = fresh.find(p => p.id !== base.id && staminaRatio(s,p) >= staminaRatio(s,base)+.15 && rating(p) >= rating(base)-R.gap) || base;
      }
    }
    // Exhaustion cannot be overridden to avoid a healthy alternative; with no alternative retain the engine's half-strength fallback.
    if (!pick || s.t8?.stamina?.[pick.id]?.exhausted) pick = fresh[0] || candidates[0];
    if (reason === 'fatigue' && pick && pick.id === base?.id) reason = 'lineup'; // the listed monster returns (rested, or after a one-play selection)
    if (pick) {
      used.add(pick.id); out[slot] = pick;
      if (saved?.id && saved.id !== pick.id) { b.notices.push({ side, slot, from: saved.id, to: pick.id, name: pick.name, reason, play: s.playCount || 0, ...(s.rotation?.injuries?.[saved.id] ? { injured: true } : {}) }); b.notices = b.notices.slice(-24); }
      active[slot] = { id: pick.id, key };
    } else out[slot] = { id: null, name: slot, attrs: {} };
  }
  return out;
}
/** Deterministic contact injury rolls, independent of animation and UI rerenders. No mutation of the persistent roster until settlement. */
export function contactInjuries(s, slots, sim, { offenseSide = s.possession } = {}) {
  const b = book(s); const contact = new Set([sim.stats?.carrier, sim.stats?.receiver, sim.stats?.tackler, sim.stats?.assistBy, ...Object.keys(sim.stats?.blockers || {})].filter(Boolean));
  if (!['tackle','sack','fumble','safety','touchdown'].includes(sim.result)) return;
  const defenseSide = offenseSide === 'home' ? 'away' : 'home';
  for (const [slot, p, side] of [...Object.entries(slots.offense).map(([k,v])=>[k,v,offenseSide]), ...Object.entries(slots.defense).map(([k,v])=>[k,v,defenseSide])].filter(([slot]) => contact.has(slot))) {
    if (unavailable(s,p)) continue;
    const r = createRng(hashString(`${s.seed}|injury|${s.playCount}|${p.id}`));
    const durability = p.permDurability ?? p.attrs?.durability ?? 60;
    const risk = ROTATION_RULES.injuryChance * (1 + (100-durability)/100 + (1-staminaRatio(s,p)));
    if (!r.chance(risk)) continue;
    const n = r.next(), severity = n < .6 ? 'Minor' : n < .9 ? 'Moderate' : 'Severe';
    b.injuries[p.id] = { severity, weeks: severity === 'Minor' ? 1 : severity === 'Moderate' ? 2+r.int(2) : 4+r.int(3), type: r.pick(['hamstring','ankle','shoulder','knee','ribs','wrist']), inGame: true };
    b.notices.push({ side, slot, name:p.name, id:p.id, reason:'injury', play:s.playCount || 0 }); b.notices = b.notices.slice(-24);
  }
}
/** The notices for the coming snap (`s.playCount`): injuries on the play just run (both clubs' are public), the replacements of
 *  `side`'s injured monsters, and `side`'s routine changes (rotation, your selections). The lineup is chosen for the coming snap
 *  as soon as the screen shows it, so these are known before the snap. Read-only. */
export function playNotices(s, side) {
  const now = (s.rotation?.notices || []).filter(n => n.play === (s.playCount || 0));
  const mine = now.filter(n => n.side === side && n.reason !== 'injury');
  return { injuries: now.filter(n => n.reason === 'injury'), replacements: mine.filter(n => n.injured), routine: mine.filter(n => !n.injured) };
}
/** Persist individual stat keys for rotating players while retaining old saves' slot keys. */
export function statKey(s, side, slot) { return s.rotation?.statKeys?.[side]?.[slot] || slot; }
export function setStatInputs(s, side, inputs) {
  const b = book(s); b.statKeys ||= {}; b.statKeys[side] = Object.fromEntries(Object.entries(inputs).filter(([,p])=>p?.id).map(([slot,p])=>[slot,p.id]));
  b.inputs ||= {}; for (const [slot,p] of Object.entries(inputs)) if(p?.id) b.inputs[p.id] = { ...p, slot };
}
export function commitGameInjuries(roster, game) { const ev=[]; for(const m of roster) { const injury=game.rotation?.injuries?.[m.id]; if(!injury) continue; m.injury={...injury}; ev.push({kind:'injury',id:m.id,name:m.name,...injury}); } return ev; }

/** Injury-sensitive play availability. Losing a package specialist must not forfeit a game while another equipped play is legal. */
export function eligiblePlays(s,team,ids,plays) {
  if(!team.rotation)return ids;
  const pool=teamInputs(team).filter(p=>!unavailable(s,p));
  return ids.filter(id=>{
    const play=plays[id];if(!play)return false;
    const needs={};for(const slot of play.onField) {const pos=positionOf(slot);needs[pos]=(needs[pos]||0)+1;}
    return Object.entries(needs).every(([pos,n])=>pool.filter(p=>p.position===pos).length>=n);
  });
}
/** Special teams fill from the healthy chart before selecting their seven, so an injured package WR yields to another blocker. */
export function specialTeamView(s,team,side) {
  if(!team.rotation)return team;
  const offense=selectUnit(s,team,side,Object.keys(team.offense),team.offense);
  const defense=selectUnit(s,team,side,Object.keys(team.defense),team.defense);
  const field=[...Object.values(offense),...Object.values(defense)];
  const returner=field.find(p=>p?.id && p.id===team.returner?.id) || field.find(p=>p?.id && ['WR','RB','CB'].includes(p.position));
  return {...team,offense,defense,returner:returner || null};
}
