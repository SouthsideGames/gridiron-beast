// Defensive developer overlay (Defensive AI audit, v42.9): drawn ONLY by the Attribute Testing Lab's Defensive scenario mode, on
// plays run with the engine's developer trace. For each defender it shows his assignment (a line to the receiver he has in man,
// his zone as a circle), his intended movement (a dashed arrow to the point the engine is steering him to), his actual movement
// (his path over the last second) and his current decision (a short label). This is information a player never gets; nothing in
// the match screen or field view imports this module or reads the trace (tests/def-scenario.test.js checks both).
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SHORT = { engaged: 'blocked', carry: 'carrying', escort: 'escort', ball: 'ball in air', 'run-fit': 'run fit', pursue: 'pursue', 'pa-bite': 'bites on fake', rush: 'rush', contain: 'contain', man: 'man', zone: 'zone', spy: 'spy' };
/** Plain words for one trace entry: [slot, why, why2, aimX, aimY, recognised]. */
export function decisionText(entry) {
  if (!entry || !entry[1]) return '';
  const head = SHORT[entry[1]] || entry[1]; const tail = entry[2] ? ` · ${entry[2]}` : '';
  return `${head}${tail}${entry[5] ? ' · run read' : ''}`;
}
/**
 * SVG for the overlay on one frame. `frames` and `i` give the path; `camTop` and `ballOn` match fieldSvg's camera
 * (svg y = camTop − (ballOn + x), svg x = lateral). `show` toggles { assign, aim, path, labels }; `focus` limits it to one slot.
 */
export function defOverlaySvg({ frames, i, ballOn, camTop, assignments = {}, show = { assign: true, aim: true, path: true, labels: true }, focus = null }) {
  const f = frames[Math.min(i, frames.length - 1)]; if (!f || !f.dbg) return '';
  const Y = (x) => camTop - (ballOn + x) - 0.6; const X = (y) => y;
  const why = Object.fromEntries(f.dbg.map((e) => [e[0], e]));
  let s = '<g class="def-overlay" pointer-events="none">';
  for (const d of f.def) {
    const slot = d[0]; if (focus && slot !== focus) continue; const a = assignments[slot] || {}; const w = why[slot];
    if (show.assign) {
      if (a.kind === 'zone' && a.at) { const r = a.role === 'deep' ? 4 : 3; s += `<circle cx="${X(a.at[1])}" cy="${Y(a.at[0]) + 0.6}" r="${r}" fill="#ffd166" fill-opacity="0.08" stroke="#ffd166" stroke-width="0.14" stroke-dasharray="0.6 0.4"/>`; }
      if (a.kind === 'man' && a.man) { const m = f.off.find((p) => p[0] === a.man); if (m) s += `<line x1="${X(d[2])}" y1="${Y(d[1])}" x2="${X(m[2])}" y2="${Y(m[1])}" stroke="#ff9f43" stroke-width="0.12" stroke-opacity="0.7"/>`; }
    }
    if (show.path) {
      const pts = []; for (let k = Math.max(0, i - 20); k <= Math.min(i, frames.length - 1); k++) { const p = frames[k].def.find((q) => q[0] === slot); if (p) pts.push(`${X(p[2]).toFixed(2)},${Y(p[1]).toFixed(2)}`); }
      if (pts.length > 1) s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#ffffff" stroke-width="0.16" stroke-opacity="0.55"/>`;
    }
    if (show.aim && w && w[3] != null && w[4] != null) {
      const ax = X(w[4]), ay = Y(w[3]);
      s += `<line x1="${X(d[2])}" y1="${Y(d[1])}" x2="${ax.toFixed(2)}" y2="${ay.toFixed(2)}" stroke="#7cf3ff" stroke-width="0.16" stroke-dasharray="0.5 0.35"/><circle cx="${ax.toFixed(2)}" cy="${ay.toFixed(2)}" r="0.35" fill="#7cf3ff"/>`;
    }
    if (show.labels && w) s += `<text x="${X(d[2]) + 1.3}" y="${Y(d[1]) - 1.2}" font-size="1.15" font-weight="700" fill="#fff" stroke="#000" stroke-width="0.25" paint-order="stroke">${esc(slot)} ${esc(decisionText(w))}</text>`;
  }
  return s + '</g>';
}
