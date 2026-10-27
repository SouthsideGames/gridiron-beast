// Defensive developer overlay (Defensive AI audit, v42.9): drawn ONLY by the Attribute Testing Lab's Defensive scenario mode, on
// plays run with the engine's developer trace. For each defender it shows his assignment (a line to the receiver he has in man,
// his zone as a circle), his intended movement (a dashed arrow to the point the engine is steering him to), his actual movement
// (his path over the last second) and his current decision (a short label). For zone defenders (v42.12) it also shows every
// receiver he sees in his zone, the one he is playing and why, an overload, and the moment he switches. This is information a player never gets; nothing in
// the match screen or field view imports this module or reads the trace (tests/def-scenario.test.js checks both).
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SHORT = { engaged: 'blocked', carry: 'carrying', escort: 'escort', ball: 'ball in air', 'run-fit': 'run fit', pursue: 'pursue', 'pa-bite': 'bites on fake', rush: 'rush', contain: 'contain', man: 'man', zone: 'zone', spy: 'spy' };
/** Plain words for one trace entry: [slot, why, why2, aimX, aimY, recognised, zoneInfo, pursuitInfo]. */
export function decisionText(entry, { short = false } = {}) {
  if (!entry || !entry[1]) return '';
  const head = SHORT[entry[1]] || entry[1]; const tail = entry[2] ? ` · ${entry[2]}` : '';
  const z = entry[6]; const zone = z ? `${z.overload ? ' · OVERLOAD' : ''}${z.switched ? ' · switched' : ''}` : '';
  const pu = entry[7]; const chase = !pu ? '' : short ? ` ×${pu.effort.toFixed(2)}` : ` · ×${pu.effort.toFixed(2)} vs ×${pu.carry} · ${pu.gap.toFixed(1)} yd · ${pu.angle}°${pu.behind ? ' behind' : ''} · Spd ${pu.defSpeed} vs ${pu.carSpeed}`;
  if (short && pu) return `${head}${chase}`; // on the field: just the effort (the decision list has the rest)
  return `${head}${tail}${zone}${chase}${entry[5] ? ' · run read' : ''}`;
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
    // Zone reads (v42.12): dotted lines to every receiver he sees in his zone, a solid one to the receiver he is playing (and a
    // dashed one to the second when he is splitting an overload); a ring flashes on the frame he switches.
    if (show.assign && w && w[6]) {
      const z = w[6]; const rec = (sl) => f.off.find((p) => p[0] === sl);
      for (const sl of z.in || []) { const r = rec(sl); if (r && sl !== z.tgt) s += `<line x1="${X(d[2])}" y1="${Y(d[1])}" x2="${X(r[2])}" y2="${Y(r[1])}" stroke="#ffd166" stroke-width="0.1" stroke-dasharray="0.25 0.35" stroke-opacity="0.8"/>`; }
      const t = z.tgt && rec(z.tgt); if (t) s += `<line x1="${X(d[2])}" y1="${Y(d[1])}" x2="${X(t[2])}" y2="${Y(t[1])}" stroke="#6ee7a0" stroke-width="0.22" stroke-opacity="0.9"/>`;
      const sp = z.split && rec(z.split); if (sp) s += `<line x1="${X(d[2])}" y1="${Y(d[1])}" x2="${X(sp[2])}" y2="${Y(sp[1])}" stroke="#6ee7a0" stroke-width="0.16" stroke-dasharray="0.5 0.3"/>`;
      if (z.switched) s += `<circle cx="${X(d[2])}" cy="${Y(d[1])}" r="1.6" fill="none" stroke="#ff5fd2" stroke-width="0.2"/>`;
    }
    // Pursuit (v42.13): a thin red line to the ball carrier he is chasing (where he is headed is the cyan aim line).
    if (show.assign && w && w[7]) { const c = f.off.find((p) => p[0] === w[7].car) || f.def.find((p) => p[0] === w[7].car); if (c) s += `<line x1="${X(d[2])}" y1="${Y(d[1])}" x2="${X(c[2])}" y2="${Y(c[1])}" stroke="#ff6b6b" stroke-width="0.1" stroke-opacity="0.75"/>`; }
    if (show.path) {
      const pts = []; for (let k = Math.max(0, i - 20); k <= Math.min(i, frames.length - 1); k++) { const p = frames[k].def.find((q) => q[0] === slot); if (p) pts.push(`${X(p[2]).toFixed(2)},${Y(p[1]).toFixed(2)}`); }
      if (pts.length > 1) s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#ffffff" stroke-width="0.16" stroke-opacity="0.55"/>`;
    }
    if (show.aim && w && w[3] != null && w[4] != null) {
      const ax = X(w[4]), ay = Y(w[3]);
      s += `<line x1="${X(d[2])}" y1="${Y(d[1])}" x2="${ax.toFixed(2)}" y2="${ay.toFixed(2)}" stroke="#7cf3ff" stroke-width="0.16" stroke-dasharray="0.5 0.35"/><circle cx="${ax.toFixed(2)}" cy="${ay.toFixed(2)}" r="0.35" fill="#7cf3ff"/>`;
    }
    if (show.labels && w) s += `<text x="${X(d[2]) + 1.3}" y="${Y(d[1]) - 1.2}" font-size="1.15" font-weight="700" fill="#fff" stroke="#000" stroke-width="0.25" paint-order="stroke">${esc(slot)} ${esc(decisionText(w, { short: true }))}</text>`;
  }
  return s + '</g>';
}
