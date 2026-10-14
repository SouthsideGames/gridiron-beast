// Play art: one SVG renderer for cards, previews, the audit tool and the
// live pre-snap overlay. Vertical orientation: the offense is at the
// bottom and attacks up the screen. Colours and endpoints follow GDD §6.

import { PLAYS, artRole, artEnd, manKeyTargets } from '../data/playbook.js';
import { OFFENSE_FORMATIONS } from '../data/playbook.js';
import { ZONES } from '../data/routes.js';

export const ART_COLORS = Object.freeze({
  primary: '#FACC15', secondary: '#EF4444', alternate: '#22C55E', block: '#FFFFFF',
  deep: '#3B82F6', middle: '#FACC15', flat: '#A855F7', rush: '#EF4444', man: '#FACC15',
});
export const ART_LEGEND = Object.freeze({
  offense: [['primary', 'Primary route'], ['secondary', 'Secondary route'], ['alternate', 'Alternate / special'], ['block', 'Block (T-bar)']],
  defense: [['deep', 'Deep zone'], ['middle', 'Middle zone'], ['flat', 'Flat / sideline zone'], ['rush', 'Blitz / rush'], ['man', 'Man coverage (dotted)']],
});

/** Map play-relative yards (x upfield, y lateral) to SVG units in a vertical box. */
export function makeProjector({ width = 44, depthUp = 24, depthBack = 8 } = {}) {
  const W = width, H = depthUp + depthBack;
  return {
    viewBox: `0 0 ${W} ${H}`, W, H,
    p: ([x, y]) => [W / 2 + y, depthUp - x],
  };
}

function polyline(pts, color, extra = '') {
  return `<polyline points="${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}
function arrowhead([x, y], [px, py], color) {
  const ang = Math.atan2(y - py, x - px), len = 1.6, wing = 0.55;
  const l = [x - len * Math.cos(ang - wing), y - len * Math.sin(ang - wing)], r = [x - len * Math.cos(ang + wing), y - len * Math.sin(ang + wing)];
  return `<path d="M${l[0].toFixed(2)} ${l[1].toFixed(2)} L${x.toFixed(2)} ${y.toFixed(2)} L${r[0].toFixed(2)} ${r[1].toFixed(2)}" fill="none" stroke="${color}" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function tbar([x, y], [px, py], color) {
  const ang = Math.atan2(y - py, x - px), nx = -Math.sin(ang), ny = Math.cos(ang), half = 1.3;
  return `<line x1="${(x + nx * half).toFixed(2)}" y1="${(y + ny * half).toFixed(2)}" x2="${(x - nx * half).toFixed(2)}" y2="${(y - ny * half).toFixed(2)}" stroke="${color}" stroke-width="0.8" stroke-linecap="round"/>`;
}

/**
 * Assignment lines (no field, no markers) in projector space. `opts.limitX`
 * compresses routes so nothing extends beyond that depth (the end line).
 */
export function assignmentLines(play, proj, opts = {}) {
  const { limitX = Infinity, offenseAlign = null, showMan = true } = opts;
  let out = '';
  const scaleX = (x) => (limitX < Infinity && x > 0 ? Math.min(x, limitX) : x);
  const keys = play.side === 'defense' && showMan ? manKeyTargets(offenseAlign ? { ...PLAYS.quick_slants, align: offenseAlign, onField: Object.keys(offenseAlign) } : PLAYS[opts.referenceOffense || 'curl_flat']) : null;
  for (const slot of play.onField) {
    const a = play.assignments[slot];
    const role = artRole(play, slot), color = ART_COLORS[role], end = artEnd(play, slot);
    if (a.a === 'zone') {
      const [zx, zy] = a.at; const [cx, cy] = proj.p([scaleX(zx), zy]);
      const rx = role === 'deep' ? 5.5 : 4.2, ry = role === 'deep' ? 4 : 3;
      const start = proj.p(play.align[slot]);
      out += polyline([start, [cx, cy]], color, 'stroke-opacity="0.9"');
      out += `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-width="0.5" stroke-dasharray="1.2 0.8"/>`;
      continue;
    }
    if (a.a === 'man') {
      const targetSlot = keys?.[a.key];
      const targetAlign = offenseAlign?.[targetSlot] || PLAYS[opts.referenceOffense || 'curl_flat'].align[targetSlot];
      if (targetAlign) { const s = proj.p(play.align[slot]), e = proj.p(targetAlign); out += polyline([s, e], color, 'stroke-dasharray="0.3 1.4" stroke-width="0.9"'); }
      continue;
    }
    if (a.a === 'spy') { const s = proj.p(play.align[slot]), e = proj.p([2, 0]); out += polyline([s, e], color, 'stroke-dasharray="1 1"'); out += arrowhead(e, s, color); continue; }
    const pts = (a.points || [play.align[slot]]).map(([x, y]) => proj.p([scaleX(x), y]));
    if (pts.length < 2) continue;
    out += polyline(pts, color);
    const tail = pts[pts.length - 1], prev = pts[pts.length - 2];
    if (end === 'arrow') out += arrowhead(tail, prev, color);
    else if (end === 'tbar') out += tbar(tail, prev, color);
  }
  return out;
}

/** Player markers for a side at its alignment. */
export function markers(play, proj, { fill = '#77c5ff', text = '#102b36', shape = play.side === 'offense' ? 'circle' : 'square', r = 1.3, labels = true } = {}) {
  let out = '';
  for (const slot of play.onField) {
    const [x, y] = proj.p(play.align[slot]);
    if (shape === 'circle') out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="0.35"/>`;
    else out += `<rect x="${(x - r).toFixed(2)}" y="${(y - r).toFixed(2)}" width="${r * 2}" height="${r * 2}" rx="0.4" fill="${fill}" stroke="#fff" stroke-width="0.35"/>`;
    if (labels) out += `<text x="${x.toFixed(2)}" y="${(y + 0.5).toFixed(2)}" text-anchor="middle" font-size="1.35" font-weight="700" font-family="ui-monospace, monospace" fill="${text}">${slot}</text>`;
  }
  return out;
}

/** Complete card/preview SVG for one play. */
export function playCardSvg(playId, { compact = true, width = 44, depthUp = 24, depthBack = 8, label = false, ariaLabel = null } = {}) {
  const play = PLAYS[playId]; if (!play) return '';
  const proj = makeProjector({ width, depthUp, depthBack });
  const los = proj.p([0, 0])[1];
  let svg = `<svg viewBox="${proj.viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${ariaLabel || play.name + ' play diagram'}" class="play-art">`;
  svg += `<rect width="${proj.W}" height="${proj.H}" fill="#173c31"/>`;
  for (let d = -5; d <= depthUp; d += 5) { const yy = proj.p([d, 0])[1]; svg += `<line x1="0" y1="${yy}" x2="${proj.W}" y2="${yy}" stroke="#e4f5e8" stroke-opacity="${d === 0 ? 0 : 0.12}" stroke-width="0.25"/>`; }
  svg += `<line x1="0" y1="${los}" x2="${proj.W}" y2="${los}" stroke="#e5c968" stroke-width="0.5"/>`;
  svg += assignmentLines(play, proj);
  svg += markers(play, proj, play.side === 'offense' ? { fill: '#77c5ff', text: '#102b36' } : { fill: '#f28d81', text: '#381f1b', r: 1.25 });
  if (label) svg += `<text x="${proj.W / 2}" y="${proj.H - 1}" text-anchor="middle" font-size="2.4" fill="#e3f3e8">${play.name}</text>`;
  svg += '</svg>';
  return svg;
}

/** Legend chips for a side. */
export function legendHtml(side) {
  return `<div class="art-legend">${ART_LEGEND[side].map(([k, t]) => `<span class="legend-item"><i style="background:${ART_COLORS[k]}"></i>${t}</span>`).join('')}</div>`;
}
