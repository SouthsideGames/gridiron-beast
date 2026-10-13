// Live match field: vertical, the offense always attacks UP. A camera
// window of 46 yards follows the ball. Draws field markings, pre-snap play
// art (transformed to the real ball spot and compressed before the end
// line), engine frames, and the ball. Coordinates are yards.

import { FIELD, boundsFor } from '../core/field.js';
import { assignmentLines } from './play-art.js';
import { PLAYS, DEFENSE_FORMATIONS, OFFENSE_FORMATIONS } from '../data/playbook.js';

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
  const { ballOn = 25, ballLat = 0, toGo = 10, colors = { off: '#60baff', def: '#ff9385' }, frame = null, presnap = null, ownLabel = 'OWN', oppLabel = 'OPP', camera = null } = o;
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
  s += `<line x1="${-HW}" y1="${Y(ballOn)}" x2="${HW}" y2="${Y(ballOn)}" stroke="#4aa3ff" stroke-width="0.35"/>`;
  if (ltg < 100) s += `<line x1="${-HW}" y1="${Y(ltg)}" x2="${HW}" y2="${Y(ltg)}" stroke="#ffb13d" stroke-width="0.35"/>`;
  // Pre-snap art.
  if (presnap?.play) {
    const B = boundsFor(ballOn, ballLat);
    const proj = { p: ([x, y]) => [X(ballLat + y), Y(ballOn + x)] };
    s += `<g opacity="0.95">${assignmentLines(presnap.play, proj, { limitX: B.endLine - 0.8, offenseAlign: presnap.offensePlay?.align || null, referenceOffense: presnap.offensePlay?.id })}</g>`;
  }
  // Players.
  const marker = (slot, x, y, team, engaged, holder) => {
    const cx = X(ballLat + y), cy = Y(ballOn + x);
    const fill = team === 'off' ? colors.off : colors.def;
    const ring = holder ? '#ffe26c' : engaged ? '#ffffff' : '#0b1a14';
    const shape = team === 'off' ? `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="1.35" fill="${fill}" stroke="${ring}" stroke-width="${holder ? 0.45 : 0.25}"/>` : `<rect x="${(cx - 1.3).toFixed(2)}" y="${(cy - 1.3).toFixed(2)}" width="2.6" height="2.6" rx="0.4" fill="${fill}" stroke="${ring}" stroke-width="${holder ? 0.45 : 0.25}"/>`;
    return shape + `<text x="${cx.toFixed(2)}" y="${(cy + 0.5).toFixed(2)}" text-anchor="middle" font-size="1.35" font-weight="800" font-family="ui-monospace, monospace" fill="#0d1f17">${slot}</text>`;
  };
  if (frame) {
    for (const [slot, x, y, eng] of frame.def) s += marker(slot, x, y, 'def', eng, frame.holder === slot && frame.holderTeam === 'def');
    for (const [slot, x, y, eng] of frame.off) s += marker(slot, x, y, 'off', eng, frame.holder === slot && frame.holderTeam === 'off');
    const [bx, by, air] = frame.ball;
    const cx = X(ballLat + by), cy = Y(ballOn + bx);
    s += `<ellipse cx="${(cx + (air ? 0 : 0.9)).toFixed(2)}" cy="${(cy - (air ? 1.4 : 0.7)).toFixed(2)}" rx="${air ? 0.95 : 0.7}" ry="${air ? 0.6 : 0.45}" fill="#d9924f" stroke="#fff" stroke-width="0.18"/>`;
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
