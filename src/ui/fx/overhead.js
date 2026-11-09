// Over-the-head information for Task 8 abilities (spec §13): the shared status badge (a small light-grey circle with a dark neutral
// symbol and a small duration number), the charge / recharge bar and the low-stamina battery. They alternate by a slow render-time
// cycle with a short cross-fade and are never shown together (no crowding). Field effects never add a head badge. Drawing only:
// the status comes from the engine's `status` events (accepted applications, with the remaining count the engine logged) and from
// the host's HUD snapshot at the snap (state.hud), charges and the battery from that snapshot and the in-play charge events.
import { f2, op, clamp01, ring, rect, text, star, ELEMENT } from './prims.js';

/** Dark neutral symbols for the twelve shared statuses (spec §10). */
export const STATUS_GLYPH = Object.freeze({ stunned: '✶', slowed: '▼', stumbled: '≈', knockedDown: '▬', afflicted: '✚', weakened: '↓', confused: '?', healingReduced: '⊘', shielded: '◈', empowered: '↑', quickened: '»', guarded: '▣' });
export const STATUS_LABEL = Object.freeze({ stunned: 'Stunned', slowed: 'Slowed', stumbled: 'Stumbled', knockedDown: 'Knocked Down', afflicted: 'Afflicted', weakened: 'Weakened', confused: 'Confused', shielded: 'Shielded', empowered: 'Empowered', quickened: 'Quickened' });
const CYCLE = 1.6, XFADE = 0.3, TOP = 4.35;

/** The status badge at (x, y): grey disc, dark glyph, duration number (plays left; none for rest-of-play statuses). */
export function statusBadge(x, y, id, remaining, o = 1, age = 99) {
  const pop = age < 0.25 ? 0.6 + (age / 0.25) * 0.4 : 1; const g = STATUS_GLYPH[id] || '•';
  let s = `<g transform="translate(${f2(x)} ${f2(y)}) scale(${f2(pop)})" opacity="${op(o)}"><circle r="0.95" fill="#e9e9ee" stroke="#23232a" stroke-width="0.12"/><text y="0.42" text-anchor="middle" font-size="1.25" font-weight="900" fill="#23232a">${g}</text>`;
  if (remaining != null && remaining > 0) s += `<circle cx="1.05" cy="0.55" r="0.5" fill="#23232a"/><text x="1.05" y="0.82" text-anchor="middle" font-size="0.75" font-weight="900" fill="#f4f4f8">${remaining}</text>`;
  return s + '</g>';
}
/** A segmented charge bar (n of max), or a recharge bar when a cooldown runs; `ready` glows; `drain` 0..1 empties the filled part. */
export function chargeBar(x, y, c, colour, t, o = 1, drain = 0) {
  const max = Math.max(1, c.max || 3); const W = 3.2, H = 0.55; const x0 = x - W / 2;
  let s = `<g opacity="${op(o)}">`;
  if (c.cd > 0 && c.cdMax) { // a recharge bar fills as the cooldown runs down
    const frac = clamp01(1 - c.cd / c.cdMax);
    s += rect(x0, y - H / 2, W, H, '#0b1a14', 0.75, ' rx="0.2" stroke="#e9e9ee" stroke-width="0.1"') + rect(x0 + 0.08, y - H / 2 + 0.08, (W - 0.16) * frac, H - 0.16, '#cfd5e2', 0.85, ' rx="0.14"');
    s += `<text x="${f2(x + W / 2 + 0.75)}" y="${f2(y + 0.3)}" text-anchor="middle" font-size="0.85" font-weight="900" fill="#e9e9ee" stroke="#0b1a14" stroke-width="0.14" paint-order="stroke">${c.cd}</text>`;
    return s + '</g>';
  }
  const gap = 0.12; const segW = (W - gap * (max - 1)) / max; const n = Math.min(max, c.ready ? max : c.n || 0);
  for (let i = 0; i < max; i++) {
    const sx = x0 + i * (segW + gap); const filled = i < n; const fill = filled && drain > 0 ? clamp01(1 - drain * max + i) : filled ? 1 : 0; // drains from the top segment down
    s += rect(sx, y - H / 2, segW, H, '#0b1a14', 0.75, ' rx="0.14" stroke="#e9e9ee" stroke-width="0.1"');
    if (fill > 0) s += rect(sx + 0.07, y - H / 2 + 0.07, Math.max(0.01, (segW - 0.14) * fill), H - 0.14, colour, 0.95 * fill, ' rx="0.1"');
  }
  if (c.ready && drain <= 0) { const pulse = 0.55 + 0.45 * Math.sin(t * 6); s += rect(x0 - 0.15, y - H / 2 - 0.15, W + 0.3, H + 0.3, 'none', pulse, ` rx="0.25" stroke="${colour}" stroke-width="0.14"`) + star(x + W / 2 + 0.75, y, 0.45, colour, pulse); }
  if (c.spent) s += `<text x="${f2(x + W / 2 + 0.75)}" y="${f2(y + 0.3)}" text-anchor="middle" font-size="0.8" font-weight="900" fill="#e9e9ee" opacity="0.8">✓</text>`;
  return s + '</g>';
}
/** Readiness icons the Dex names instead of a plain bar (stone fist, ready stone, sun, seal, iron jaw, scratch marks): n of max filled. */
export function chargeIcon(x, y, icon, c, colour, t, o = 1, drain = 0) {
  const max = Math.max(1, c.max || 1); const frac = drain > 0 ? Math.max(0, (c.ready ? 1 : (c.n || 0) / max) - drain) : c.ready ? 1 : (c.n || 0) / max; const pulse = c.ready ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
  let g = '';
  if (icon === 'sun') { g += `<circle r="0.8" fill="#3a2a00" stroke="#ffd84a" stroke-width="0.12"/><path d="M 0 -0.8 A 0.8 0.8 0 ${frac >= 1 ? '1 1 -0.01 -0.8' : '0 1 0 0.8'} Z" fill="#ffd84a" opacity="${frac > 0 ? 1 : 0}"/>`; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g += `<line x1="${f2(Math.cos(a) * 1)}" y1="${f2(Math.sin(a) * 1)}" x2="${f2(Math.cos(a) * 1.35)}" y2="${f2(Math.sin(a) * 1.35)}" stroke="#ffd84a" stroke-width="0.14" opacity="${f2(frac >= 1 ? pulse : 0.45)}"/>`; } }
  else if (icon === 'fist') g += `<path d="M -0.9 0.7 L -0.9 -0.3 Q -0.9 -0.9 -0.3 -0.9 L 0.6 -0.9 Q 1 -0.9 1 -0.4 L 1 0.7 Z" fill="${frac >= 1 ? '#a89070' : '#3a2e20'}" stroke="#e0d2b4" stroke-width="0.12"/><line x1="-0.4" y1="-0.9" x2="-0.4" y2="-0.2" stroke="#5a4630" stroke-width="0.1"/><line x1="0.15" y1="-0.9" x2="0.15" y2="-0.2" stroke="#5a4630" stroke-width="0.1"/><line x1="0.6" y1="-0.9" x2="0.6" y2="-0.2" stroke="#5a4630" stroke-width="0.1"/>`;
  else if (icon === 'stone') g += `<path d="M -0.9 0.5 L -0.7 -0.5 L 0 -0.9 L 0.8 -0.5 L 0.9 0.4 L 0.1 0.8 Z" fill="${frac >= 1 ? '#a89070' : '#3a2e20'}" stroke="#e0d2b4" stroke-width="0.12"/><rect x="-0.9" y="${f2(0.8 - 1.7 * frac)}" width="1.8" height="${f2(1.7 * frac)}" fill="#a89070" opacity="0.6" clip-path="none"/>`;
  else if (icon === 'jaw') g += `<path d="M -0.9 -0.2 L 0.9 -0.2 L 0.6 -0.8 L -0.6 -0.8 Z M -0.9 0.2 L 0.9 0.2 L 0.6 0.8 L -0.6 0.8 Z" fill="${frac >= 1 ? '#cfd5e2' : '#2a2e38'}" stroke="#f4f4f8" stroke-width="0.1"/>`;
  else if (icon === 'seal') g += `<circle r="0.85" fill="none" stroke="#ffd36a" stroke-width="0.18" opacity="0.5"/><path d="M 0 -0.85 A 0.85 0.85 0 ${frac > 0.5 ? 1 : 0} 1 ${f2(Math.sin(frac * 2 * Math.PI - 1e-3) * 0.85)} ${f2(-Math.cos(frac * 2 * Math.PI - 1e-3) * 0.85)}" fill="none" stroke="#ffd36a" stroke-width="0.24" opacity="${frac > 0 ? 1 : 0}"/>`;
  else if (icon === 'scratch') for (let i = 0; i < max; i++) g += `<line x1="${f2(-0.7 + i * 0.6)}" y1="-0.7" x2="${f2(-0.3 + i * 0.6)}" y2="0.7" stroke="${i < Math.round(frac * max) ? '#9a7ad6' : '#2a1a4a'}" stroke-width="0.28" stroke-linecap="round"/>`;
  return `<g opacity="${op(o * (c.ready ? pulse : 1))}" transform="translate(${f2(x)} ${f2(y)})">${g}</g>`;
}
/** The low-stamina battery (at or below 25% capacity): a red cell with its remaining sliver. */
export function battery(x, y, frac, o = 1, t = 0) {
  const W = 2.1, H = 0.95; const blink = 0.7 + 0.3 * Math.sin(t * 5);
  return `<g opacity="${op(o)}"><rect x="${f2(x - W / 2)}" y="${f2(y - H / 2)}" width="${f2(W)}" height="${f2(H)}" rx="0.18" fill="#1a0c0c" stroke="#e9e9ee" stroke-width="0.12"/><rect x="${f2(x + W / 2)}" y="${f2(y - 0.25)}" width="0.22" height="0.5" fill="#e9e9ee"/><rect x="${f2(x - W / 2 + 0.14)}" y="${f2(y - H / 2 + 0.14)}" width="${f2(Math.max(0.12, (W - 0.28) * clamp01(frac)))}" height="${f2(H - 0.28)}" rx="0.1" fill="#ff4d4d" opacity="${f2(blink)}"/></g>`;
}

/**
 * All over-the-head items this frame. Sources: state.badges (status events), state.hud (snap snapshot per 'team:slot'), in-play charge
 * events (items of kind ability_charge / ability_ready) and the activation spends (state.spends).
 */
export function overheadSvg(state, t, pos, { quality = 'full', seed = 0 } = {}) {
  const per = new Map(); const key = (team, slot) => `${team}:${slot}`;
  const add = (team, slot, kind, data) => { const k = key(team, slot); if (!per.has(k)) per.set(k, { team, slot, items: [] }); const e = per.get(k); const i = e.items.findIndex((x) => x.kind === kind); if (i >= 0) e.items[i] = { kind, ...data }; else e.items.push({ kind, ...data }); };
  if (state.hud) for (const [k, hd] of Object.entries(state.hud)) { const [team, slot] = k.split(':'); if (hd.status?.id) add(team, slot, 'status', { id: hd.status.id, remaining: hd.status.remaining ?? null, age: 99 }); if (hd.charge && (hd.charge.max || hd.charge.cdMax || hd.charge.ready)) add(team, slot, 'charge', { c: { ...hd.charge }, colour: hd.colour || null }); if (hd.battery) add(team, slot, 'battery', { frac: hd.staminaFrac ?? 0.2 }); }
  for (const b of state.badges) if (t >= b.t0 && !b.restOfPlayEnded) add(b.team, b.slot, 'status', { id: b.id, remaining: b.remaining, age: t - b.t0 });
  // In-play charge progress: a logged charge event bumps the count shown from its time on.
  for (const it of state.items) { if (t < it.t0) continue; const e = it.ev; const k = key(it.team, it.slot); const cur = per.get(k)?.items.find((x) => x.kind === 'charge');
    if (e.kind === 'ability_charge') { const c = cur ? cur.c : { n: 0, max: it.base.charge?.max || 3 }; add(it.team, it.slot, 'charge', { c: { ...c, n: e.charges ?? Math.min(c.max || 3, (c.n || 0) + 1), ready: (e.charges ?? (c.n || 0) + 1) >= (c.max || 3), cd: 0 }, bump: it.t0 }); }
    if (e.kind === 'ability_ready') { const c = cur ? cur.c : { n: 0, max: it.base.charge?.max || 3 }; add(it.team, it.slot, 'charge', { c: { ...c, n: c.max || 3, ready: true, cd: 0 }, bump: it.t0 }); } }
  let s = '';
  for (const [k, e] of per) {
    const p = pos(e.team, e.slot); if (!p) continue; const [cx, cy] = p; const y = cy - TOP;
    const spend = state.spends.find((sp) => sp.team === e.team && sp.slot === e.slot && t >= sp.t);
    const items = e.items.filter((x) => x.kind !== 'charge' || !(spend && t - spend.t > 1.2 && !x.c.cd)); // a spent bar leaves after it drains (a recharge bar may replace it next play)
    if (!items.length) continue;
    const n = items.length; const ph = (t + (e.slot.charCodeAt(0) % 5) * 0.37) / CYCLE; const idx = ((Math.floor(ph) % n) + n) % n; const frac = ph - Math.floor(ph);
    // The active item, fading out at the end of its slot while the next fades in.
    const draw = (x, o) => {
      if (x.kind === 'status') return statusBadge(cx, y, x.id, x.remaining, o, x.age);
      if (x.kind === 'battery') return battery(cx, y, x.frac, o, t);
      const colour = x.colour || (state.hud?.[k]?.element ? (ELEMENT[state.hud[k].element] || {}).a : null) || '#ffe36c';
      const drain = spend ? clamp01((t - spend.t) / 0.5) : 0; const icon = x.icon || state.hud?.[k]?.icon; let g = icon && !(x.c.cd > 0) ? chargeIcon(cx, y, icon, x.c, colour, t, o, drain) : chargeBar(cx, y, x.c, colour, t, o, drain);
      if (x.bump != null && t - x.bump < 0.6) g += ring(cx, y, 1.2 + (t - x.bump) * 4, colour, 0.25, (1 - (t - x.bump) / 0.6) * o);
      return g; };
    if (n === 1) { s += draw(items[0], 1); continue; }
    const fadeOut = frac > 1 - XFADE / CYCLE ? (1 - frac) / (XFADE / CYCLE) : 1; const fadeIn = frac > 1 - XFADE / CYCLE ? 1 - fadeOut : 0;
    s += draw(items[idx], fadeOut); if (fadeIn > 0.02) s += draw(items[(idx + 1) % n], fadeIn);
  }
  return s;
}
