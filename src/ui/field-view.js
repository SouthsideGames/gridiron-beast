// Live match field: vertical, the offense always attacks UP. A camera
// window of 46 yards follows the ball. Draws field markings, pre-snap play
// art (transformed to the real ball spot and compressed before the end
// line), engine frames, and the ball. Coordinates are yards.

import { monsterSprite } from './pixel-monster.js';
import { FIELD, boundsFor } from '../core/field.js';
import { assignmentLines } from './play-art.js';
import { PLAYS, DEFENSE_FORMATIONS, OFFENSE_FORMATIONS } from '../data/playbook.js';
import { fxSvg, movementSvg } from './ability-fx.js';

const SPAN = 46; // visible yards
const HW = FIELD.halfWidth + 0.33;

export function cameraFor(ballOn) {
  let bottom = ballOn - 15;
  bottom = Math.max(-10, Math.min(110 - SPAN, bottom));
  return { bottom, top: bottom + SPAN };
}
export const FIELD_VIEWBOX = `${-HW} 0 ${HW * 2} ${SPAN}`;

/**
 * @param {object} o
 *  ballOn, ballLat, toGo, offenseLabel, defenseLabel, colors {off, def}, frame (engine frame or null),
 *  presnap {play (compiled), offensePlay} or null, holderHighlight, camera override, dim (0..1)
 */
export function fieldSvg(o) {
  const { ballOn = 25, ballLat = 0, toGo = 10, colors = { off: '#60baff', def: '#ff9385' }, frame = null, presnap = null, ownLabel = 'OWN', oppLabel = 'OPP', camera = null, event = null, noLines = false, sprites = null, prevFrame = null, fx = null, fxQuality = 'full' } = o;
  const cam = camera || cameraFor(ballOn);
  const Y = (yard) => cam.top - yard; // yards → svg y
  const X = (lat) => lat; // lateral yards → svg x (centred)
  let s = '';
  // Grass and end zones.
  s += `<rect x="${-HW}" y="0" width="${HW * 2}" height="${SPAN}" fill="#236b49"/>`;
  for (let yard = Math.floor(cam.bottom / 10) * 10; yard < cam.top; yard += 10) {
    if (yard < 0 || yard >= 100) continue;
    s += `<rect x="${-HW}" y="${Y(yard + 10)}" width="${HW * 2}" height="10" fill="${(yard / 10) % 2 ? '#28734d' : '#216444'}"/>`;
  }
  if (cam.bottom < 0) s += `<rect x="${-HW}" y="${Y(0)}" width="${HW * 2}" height="${Y(-10) - Y(0)}" fill="#1a4b3b"/><text x="0" y="${Y(-5) + 1.4}" text-anchor="middle" font-size="4" font-weight="900" fill="#dfeee6" opacity="0.8">${ownLabel}</text>`;
  if (cam.top > 100) s += `<rect x="${-HW}" y="${Y(110)}" width="${HW * 2}" height="${Y(100) - Y(110)}" fill="#1a4b3b"/><text x="0" y="${Y(105) + 1.4}" text-anchor="middle" font-size="4" font-weight="900" fill="#dfeee6" opacity="0.8">${oppLabel}</text>`;
  // Event field art: rivalry games get a painted midfield crest and purple end-zone stripes; playoffs get gold.
  if (event) {
    const accent = event === 'rival' ? '#a855f7' : '#f5c542';
    if (cam.bottom < 50 && cam.top > 50) s += `<g opacity="0.35"><circle cx="0" cy="${Y(50)}" r="6" fill="none" stroke="${accent}" stroke-width="0.6"/><text x="0" y="${Y(50) + 1.6}" text-anchor="middle" font-size="4.5" font-weight="900" fill="${accent}">${event === 'rival' ? '⚔' : '★'}</text></g>`;
    for (const ez of [[-10, 0], [100, 110]]) if (cam.bottom < ez[1] && cam.top > ez[0]) s += `<rect x="${-HW}" y="${Y(ez[1])}" width="${HW * 2}" height="${Y(ez[0]) - Y(ez[1])}" fill="${accent}" opacity="0.18"/>`;
  }
  // Yard lines, hashes, numbers.
  for (let yard = 0; yard <= 100; yard += 5) {
    if (yard < cam.bottom - 1 || yard > cam.top + 1) continue;
    const major = yard % 10 === 0, goal = yard === 0 || yard === 100;
    s += `<line x1="${-HW}" y1="${Y(yard)}" x2="${HW}" y2="${Y(yard)}" stroke="#eaf3e6" stroke-width="${goal ? 0.5 : major ? 0.22 : 0.12}" stroke-opacity="${goal ? 1 : major ? 0.8 : 0.45}"/>`;
    if (major && !goal) {
      const n = yard <= 50 ? yard : 100 - yard;
      s += `<text x="${-HW + 2.2}" y="${Y(yard) + 1}" font-size="2.8" font-weight="800" fill="#f3f7ee" opacity="0.85">${n}</text><text x="${HW - 2.2}" y="${Y(yard) + 1}" text-anchor="end" font-size="2.8" font-weight="800" fill="#f3f7ee" opacity="0.85">${n}</text>`;
    }
  }
  for (let yard = Math.ceil(cam.bottom); yard < cam.top; yard++) {
    if (yard <= 0 || yard >= 100 || yard % 5 === 0) continue;
    for (const hx of [-FIELD.hashFromCentre, FIELD.hashFromCentre, -HW + 0.6, HW - 0.6]) s += `<line x1="${hx - 0.4}" y1="${Y(yard)}" x2="${hx + 0.4}" y2="${Y(yard)}" stroke="#f3f7e9" stroke-width="0.15" stroke-opacity="0.7"/>`;
  }
  // Sidelines.
  s += `<rect x="${-HW + 0.15}" y="0.1" width="${HW * 2 - 0.3}" height="${SPAN - 0.2}" fill="none" stroke="#f0f6e9" stroke-width="0.3"/>`;
  // Line of scrimmage and line to gain.
  const ltg = Math.min(100, ballOn + toGo);
  if (!noLines) {
    s += `<line x1="${-HW}" y1="${Y(ballOn)}" x2="${HW}" y2="${Y(ballOn)}" stroke="#4aa3ff" stroke-width="0.35"/>`;
    if (ltg < 100) s += `<line x1="${-HW}" y1="${Y(ltg)}" x2="${HW}" y2="${Y(ltg)}" stroke="#ffb13d" stroke-width="0.35"/>`;
  }
  // Goal posts on the end lines (drawn flat from above: crossbar + uprights).
  for (const [end, dir] of [[110, 1], [-10, -1]]) if (cam.bottom - 1 < end && cam.top + 1 > end) { const y = Y(end) + dir * 0.6; s += `<g stroke="#ffd84a" stroke-width="0.45" stroke-linecap="round"><line x1="-3" y1="${y}" x2="3" y2="${y}"/><line x1="-3" y1="${y}" x2="-3" y2="${y - dir * 2.4}"/><line x1="3" y1="${y}" x2="3" y2="${y - dir * 2.4}"/></g>`; }
  // Pre-snap art.
  if (presnap?.play) {
    const B = boundsFor(ballOn, ballLat);
    const proj = { p: ([x, y]) => [X(ballLat + y), Y(ballOn + x)] };
    s += `<g opacity="0.95">${assignmentLines(presnap.play, proj, { limitX: B.endLine - 0.8, offenseAlign: presnap.offensePlay?.align || null, referenceOffense: presnap.offensePlay?.id })}</g>`;
  }
  // Players.
  const simpleMarker = (slot, x, y, team, engaged, holder) => {
    const cx = X(ballLat + y), cy = Y(ballOn + x);
    const fill = team === 'off' ? colors.off : colors.def;
    const ring = holder ? '#ffe26c' : engaged ? '#ffffff' : '#0b1a14';
    const shape = team === 'off' ? `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="1.35" fill="${fill}" stroke="${ring}" stroke-width="${holder ? 0.45 : 0.25}"/>` : `<rect x="${(cx - 1.3).toFixed(2)}" y="${(cy - 1.3).toFixed(2)}" width="2.6" height="2.6" rx="0.4" fill="${fill}" stroke="${ring}" stroke-width="${holder ? 0.45 : 0.25}"/>`;
    return shape + `<text x="${cx.toFixed(2)}" y="${(cy + 0.5).toFixed(2)}" text-anchor="middle" font-size="1.35" font-weight="800" font-family="ui-monospace, monospace" fill="#0d1f17">${slot}</text>`;
  };  // Monster art on a team-coloured base; unknown slots (kick units) draw from the team's pool.
  const poolIdx = { off: 0, def: 0 };
  // Facing (polish 2.0): a sprite turns toward its lateral movement; still, it faces the way its team lines up.
  const prevPos = {};
  if (prevFrame) { for (const p of prevFrame.off) prevPos['off' + p[0]] = p; for (const p of prevFrame.def) prevPos['def' + p[0]] = p; }
  const moved = (team, slot, x, y) => { const p = prevPos[team + slot]; return p ? [X(ballLat + y) - X(ballLat + p[2]), Y(ballOn + x) - Y(ballOn + p[1])] : [0, 0]; };
  const marker = (slot, x, y, team, engaged, holder) => {
    const set = sprites?.[team];
    const m = set ? (set.map[slot] || (set.pool.length ? set.pool[(poolIdx[team]++) % set.pool.length] : null)) : null;
    if (!m) return simpleMarker(slot, x, y, team, engaged, holder);
    const cx = X(ballLat + y), cy = Y(ballOn + x);
    const base = team === 'off' ? colors.off : colors.def;
    const [mx] = moved(team, slot, x, y); const flip = Math.abs(mx) > 0.12 ? mx < 0 : team === 'def';
    const art = monsterSprite(m, 16, { flip }).replace(/<svg class="sprite" width="16" height="16"/, `<svg x="${(cx - 1.7).toFixed(2)}" y="${(cy - 2.5).toFixed(2)}" width="3.4" height="3.4"`);
    return `<ellipse cx="${cx.toFixed(2)}" cy="${(cy + 0.75).toFixed(2)}" rx="1.55" ry="0.7" fill="${base}" stroke="${holder ? '#fff' : engaged ? '#ffcf5a' : '#0d1f17'}" stroke-width="${holder ? 0.4 : 0.2}"/>${art}`;
  };

  if (frame) {
    const ft = frame.t ?? 0;
    const posOf = (team, slot) => { const list = team === 'off' ? frame.off : frame.def; const a = list.find((p) => p[0] === slot); if (!a) return null; const [dx, dy] = moved(team, slot, a[1], a[2]); return [X(ballLat + a[2]), Y(ballOn + a[1]), dx, dy]; };
    if (frame.holder) s += movementSvg(posOf(frame.holderTeam, frame.holder), { quality: fxQuality });
    for (const [slot, x, y, eng] of frame.def) s += marker(slot, x, y, 'def', eng, frame.holder === slot && frame.holderTeam === 'def');
    for (const [slot, x, y, eng] of frame.off) s += marker(slot, x, y, 'off', eng, frame.holder === slot && frame.holderTeam === 'off');
    const [bx, by, air] = frame.ball;
    const cx = X(ballLat + by), cy = Y(ballOn + bx);
    s += `<ellipse cx="${(cx + (air ? 0 : 0.9)).toFixed(2)}" cy="${(cy - (air ? 1.4 : 0.7)).toFixed(2)}" rx="${air ? 0.95 : 0.7}" ry="${air ? 0.6 : 0.45}" fill="#d9924f" stroke="#fff" stroke-width="0.18"/>`;
    // Ability presentation: activation → elemental action → outcome label (ability-fx.js), drawn over the sprites.
    if (fx) s += fxSvg(fx, ft, posOf, { quality: fxQuality, halfWidth: HW, toSvg: (x, y) => [X(ballLat + y), Y(ballOn + x)] });
  } else if (presnap?.offensePlay || presnap?.defensePlay) {
    const dp = presnap.defensePlay; const op = presnap.offensePlay;
    if (dp) for (const slot of dp.onField) { const [x, y] = dp.align[slot]; s += marker(slot, x, y, 'def', false, false); }
    if (op) for (const slot of op.onField) { const [x, y] = op.align[slot]; s += marker(slot, x, y, 'off', false, slot === 'QB'); }
  }
  return s;
}

/**
 * What the player may see of the opponent before the snap: personnel and the
 * package's base alignment, never the actual call or its assignments.
 */
export function presnapLook(playId) {
  const p = PLAYS[playId]; if (!p) return null;
  const formation = p.side === 'defense' ? DEFENSE_FORMATIONS[p.formation] : OFFENSE_FORMATIONS[p.formation];
  return { id: p.id, side: p.side, onField: p.onField, align: Object.fromEntries(p.onField.map((s) => [s, formation.align[s] || p.align[s]])) };
}
