// Live match field: vertical, the offense always attacks UP. A camera
// window of 46 yards follows the ball. Draws field markings, pre-snap play
// art (transformed to the real ball spot and compressed before the end
// line), engine frames, and the ball. Coordinates are yards.
//
// Rendering (docs/task8/RENDER_OPT.md): the field is two layers inside the one <svg>. The static layer (turf, end zones, lines,
// numbers, hashes, sidelines, scrimmage lines, goal posts, pre-snap art, Task 8 fields, the caller's underlay) changes only when
// the camera or the situation does; the dynamic layer (movement trail, effects, players, ball, badges, status marks) is redrawn
// every frame. Monster sprites are SVG <symbol>s drawn once into the field's <defs> and placed with <use> (pixel-monster.js
// monsterSpriteRef), instead of ~70 rects per player per frame. fieldSvg() returns the whole field as one string (every screen
// that draws a field once); fieldDraw() updates a live <svg> and only replaces the layers that changed (the match screen's
// playback). Both draw exactly the same picture.
//
// Effects hook (src/ui/ability-fx.js; kept stable for the fx branch): per frame the dynamic layer calls
//   movementSvg(carrierPos, { quality })                                      → string under everything
//   fxSvg(fx, t, posOf, { quality, halfWidth, toSvg, ball, pball })          → { under, over, ball } strings
//   statusMarks(status, cx, cy, t, seed)                                      → { under, over, tf } per marked player
// where posOf(team, slot) → [x, y, dx, dy] in svg units or null, toSvg(x, y) → [x, y]; `under` goes below the monsters, `over`
// above them, `ball` just under the ball. Nothing of that interface changed.

import { monsterSpriteRef } from './pixel-monster.js';
import { FIELD, boundsFor } from '../core/field.js';
import { assignmentLines } from './play-art.js';
import { PLAYS, DEFENSE_FORMATIONS, OFFENSE_FORMATIONS } from '../data/playbook.js';
import { fxSvg, movementSvg, statusMarks } from './ability-fx.js';
import { turfSvg } from './stadium-art.js';

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
const FIELD_TINT = { Fire: '#ff7a3d', Water: '#5fb6ff', Nature: '#7ad35a', Electric: '#ffe55a', Ice: '#bfe8ff', Wind: '#9ef0dc', Earth: '#d2a86a', Dark: '#9a7ad6', Light: '#fff0a8', Metal: '#cfd5e2', Psychic: '#ff9ae6' };

/**
 * The field as its two layers: { statics, dynamic, symbols } where `symbols` lists the sprite <symbol> definitions the dynamic
 * layer's <use> elements need ({ id, symbol }, deduplicated).
 */
export function fieldLayers(o) {
  const { ballOn = 25, ballLat = 0, toGo = 10, colors = { off: '#60baff', def: '#ff9385' }, frame = null, presnap = null, ownLabel = 'OWN', oppLabel = 'OPP', camera = null, event = null, noLines = false, sprites = null, prevFrame = null, fx = null, fxQuality = 'full', time = null, underlay = '', typeIcons = null, venue = null, qbRead = false, fields = null, fxOptions = null} = o;
  const cam = camera || cameraFor(ballOn);
  const Y = (yard) => cam.top - yard; // yards → svg y
  const X = (lat) => lat; // lateral yards → svg x (centred)
  let s = '';
  // Turf and end zones: the stadium's environment (GDD §33.1); without a venue, the classic grass exactly as before.
  const T = turfSvg(venue, cam, HW, SPAN, Y);
  s += T.turf;
  if (cam.bottom < 0) s += `${T.endZone(Y(0), Y(-10) - Y(0))}<text x="0" y="${Y(-5) + 1.4}" text-anchor="middle" font-size="4" font-weight="900" fill="#dfeee6" opacity="0.8">${ownLabel}</text>`;
  if (cam.top > 100) s += `${T.endZone(Y(110), Y(100) - Y(110))}<text x="0" y="${Y(105) + 1.4}" text-anchor="middle" font-size="4" font-weight="900" fill="#dfeee6" opacity="0.8">${oppLabel}</text>`;
  s += T.over; // tint and sideline decor, under the lines and the players
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
  // Task 8 fields (spec §11): the functional rectangles of the play (sim.fields, play-relative), outlined and tinted by element.
  if (fields?.length) for (const f of fields) {
    const c = FIELD_TINT[f.type] || '#ffffff', x0 = X(ballLat + f.lat[0]), x1 = X(ballLat + f.lat[1]), y0 = Y(ballOn + f.yard[1]), y1 = Y(ballOn + f.yard[0]);
    const fa = fx?.fieldAlpha ? fx.fieldAlpha(f.id, time ?? frame?.t ?? 0) : 1; if (fa <= 0.01) continue; // Task 8 fx hook: a field's reveal / dissolve
    s += `<rect class="t8-field" data-element="${f.type}"${fa < 1 ? ` opacity="${fa.toFixed(2)}"` : ''} x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${c}" fill-opacity="0.16" stroke="${c}" stroke-width="0.3" stroke-opacity="0.85"/>`;
  }
  if (underlay) s += underlay; // caller-drawn layer under the players (Playbook Audit paths)
  const statics = s; s = '';
  // ---------------------------------------------------------------- dynamic layer
  const symbols = []; const seen = new Set(); let pre = '';
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
  let statusOver = ''; // status marks (stars, ice, "?") drawn after every sprite so they are never hidden
  const players = []; const keys = new Set(); // the players, in paint order, keyed by team and slot (fieldDraw keeps their nodes)
  const marker = (slot, x, y, team, engaged, holder, status = 0) => {
    const set = sprites?.[team];
    const m = set ? (set.map[slot] || (/\+$/.test(slot) ? set.map[slot.slice(0, -1)] || null : set.pool.length ? set.pool[(poolIdx[team]++) % set.pool.length] : null)) : null; // Task 8 fx hook: a summoned copy ('LB1+') wears its original's art
    const cx = X(ballLat + y), cy = Y(ballOn + x);
    const sm = status ? statusMarks(status, cx, cy, time ?? frame?.t ?? 0, slot.charCodeAt(0)) : null;
    if (sm?.over) statusOver += sm.over;
    let key = `${team}:${slot}`; while (keys.has(key)) key += "'"; keys.add(key);
    if (!m) { const base = simpleMarker(slot, x, y, team, engaged, holder); const html = (sm?.under || '') + (sm?.tf ? `<g transform="${sm.tf}">${base}</g>` : base); players.push({ key, html, sig: null }); return; }
    const base = team === 'off' ? colors.off : colors.def;
    const [mx] = moved(team, slot, x, y); const flip = Math.abs(mx) > 0.12 ? mx < 0 : team === 'def';
    // The sprite: a <use> of the monster's cached <symbol> (same viewBox, size and crisp edges as the inline art it replaces).
    const ref = monsterSpriteRef(m, { flip }); if (!seen.has(ref.id)) { seen.add(ref.id); symbols.push(ref); }
    const ell = { cx: cx.toFixed(2), cy: (cy + 0.75).toFixed(2), fill: base, stroke: holder ? '#fff' : engaged ? '#ffcf5a' : '#0d1f17', 'stroke-width': holder ? '0.4' : '0.2' };
    const use = { href: `#${ref.id}`, x: (cx - 1.7).toFixed(2), y: (cy - 2.5).toFixed(2) };
    const art = `<use data-fv="s" href="${use.href}" x="${use.x}" y="${use.y}" width="3.4" height="3.4" aria-hidden="true"/>`;
    const html = `${sm?.under || ''}<ellipse data-fv="b" cx="${ell.cx}" cy="${ell.cy}" rx="1.55" ry="0.7" fill="${ell.fill}" stroke="${ell.stroke}" stroke-width="${ell['stroke-width']}"/>${sm?.tf ? `<g transform="${sm.tf}">${art}</g>` : art}`;
    // Same signature = same element structure: a later draw only changes the base's and the sprite's attributes.
    players.push({ key, html, sig: `${sm?.under || ''}|${sm?.tf || ''}`, ell, use });
  };

  if (frame) {
    const ft = time ?? frame.t ?? 0; // `time` runs past the last frame during the end-of-play hold
    const posOf = (team, slot) => { const list = team === 'off' ? frame.off : frame.def; const a = list.find((p) => p[0] === slot); if (!a) return null; const [dx, dy] = moved(team, slot, a[1], a[2]); return [X(ballLat + a[2]), Y(ballOn + a[1]), dx, dy]; };
    if (frame.holder) s += movementSvg(posOf(frame.holderTeam, frame.holder), { quality: fxQuality });
    // Ability effects: the ground layer goes under the monsters, the rest over them (owner's note: monsters on top).
    const toSvg = (x, y) => [X(ballLat + y), Y(ballOn + x)];
    const lift = (b) => (b[2] ? 1.4 : 0.7); // the ball is drawn lifted off the turf
    const bsvg = frame.ball ? (([x, y]) => [x, y - lift(frame.ball), frame.ball[2]])(toSvg(frame.ball[0], frame.ball[1])) : null; const pbsvg = prevFrame?.ball ? (([x, y]) => [x, y - lift(prevFrame.ball)])(toSvg(prevFrame.ball[0], prevFrame.ball[1])) : null;
    const layers = fx ? fxSvg(fx, ft, posOf, { quality: fxQuality, halfWidth: HW, toSvg, ball: bsvg, pball: pbsvg, ...(fxOptions || {}) }) : { under: '', over: '', ball: '' }; // Task 8 fx hook
    s += layers.under;
    pre = s; s = '';
    const showStatus = true; // Task 8 (spec §13): status information stays visible at every quality level
    for (const [slot, x, y, eng, st] of frame.def) marker(slot, x, y, 'def', eng, frame.holder === slot && frame.holderTeam === 'def', showStatus ? st : 0);
    for (const [slot, x, y, eng, st] of frame.off) marker(slot, x, y, 'off', eng, frame.holder === slot && frame.holderTeam === 'off', showStatus ? st : 0);
    const [bx, by, air] = frame.ball;
    const cx = X(ballLat + by), cy = Y(ballOn + bx);
    s += layers.ball; // fire or wind on a ball in the air, just under the ball
    s += `<ellipse cx="${(cx + (air ? 0 : 0.9)).toFixed(2)}" cy="${(cy - (air ? 1.4 : 0.7)).toFixed(2)}" rx="${air ? 0.95 : 0.7}" ry="${air ? 0.6 : 0.45}" fill="#d9924f" stroke="#fff" stroke-width="0.18"/>`;
    // Ability presentation over the sprites: icons, badges, outcome labels; then status marks on top of everything.
    // QB read indicator (GDD §53, opt-in): a thin dashed ring on the receiver the quarterback is reading. Draws only; the frame's
    // `read` is what the engine recorded.
    if (qbRead && frame.read) { const p = posOf('off', frame.read); if (p) s += `<circle class="qb-read-ring" cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="2.3" fill="none" stroke="#ffe26c" stroke-width="0.28" stroke-dasharray="0.9 0.6" opacity="0.85"/><circle cx="${p[0].toFixed(2)}" cy="${(p[1] - 2.9).toFixed(2)}" r="0.45" fill="#ffe26c" opacity="0.9"/>`; }
    s += layers.over + statusOver;
  } else if (presnap?.offensePlay || presnap?.defensePlay) {
    const dp = presnap.defensePlay; const op = presnap.offensePlay;
    pre = s; s = '';
    if (dp) for (const slot of dp.onField) { const [x, y] = dp.align[slot]; marker(slot, x, y, 'def', false, false); }
    if (op) for (const slot of op.onField) { const [x, y] = op.align[slot]; marker(slot, x, y, 'off', false, slot === 'QB'); }
    // Expected type matchups (GDD §32.4): a small badge just above the sprite's inside shoulder, never over the monster or the
    // ball, and off the line of a straight route (routes leave from the feet). Each badge is a button: tapping opens the matchup panel.
    if (typeIcons) for (const [team, play] of [['def', dp], ['off', op]]) for (const [slot, dir] of Object.entries(typeIcons[team] || {})) {
      const at = play?.align?.[slot]; if (!at || !dir) continue;
      const cx = X(ballLat + at[1]) + (at[1] > 0 ? -1.3 : 1.3), cy = Y(ballOn + at[0]) - 3.35; // over the inside shoulder, clear of the head and a straight stem
      const up = dir === 'up'; const col = up ? '#22c55e' : '#f5a524';
      const arrow = up ? `M${cx - 0.48} ${cy + 0.22} L${cx} ${cy - 0.42} L${cx + 0.48} ${cy + 0.22}` : `M${cx - 0.48} ${cy - 0.22} L${cx} ${cy + 0.42} L${cx + 0.48} ${cy - 0.22}`;
      s += `<g class="tm-icon" data-tm="${team}:${slot}" role="button" tabindex="0" aria-label="${up ? 'Type advantage' : 'Type disadvantage'} for ${slot}"><circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="2.1" fill="transparent"/><circle class="tm-dot" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="0.85" fill="${col}" stroke="#0b1a14" stroke-width="0.2"/><path d="${arrow}" fill="none" stroke="#0b1a14" stroke-width="0.28" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
  }
  if (!frame && !(presnap?.offensePlay || presnap?.defensePlay)) { pre = s; s = ''; }
  const post = s;
  // The dynamic layer: what lies under the players (movement trail, ground effects), the players (one <g> each), what lies over
  // them (ball effects, ball, read ring, effects, status marks, type badges). The groups carry no attributes: paint order and
  // pixels are those of the flat markup.
  const dynamic = `<g class="fv-pre">${pre}</g><g class="fv-pl">${players.map((x) => `<g>${x.html}</g>`).join('')}</g><g class="fv-post">${post}</g>`;
  return { statics, dynamic, symbols, pre, players, post };
}

/** The whole field as one SVG inner string: sprite definitions, the static layer, the dynamic layer. */
export function fieldSvg(o) {
  const L = fieldLayers(o);
  return `<defs class="fv-defs">${L.symbols.map((x) => x.symbol).join('')}</defs><g class="fv-static">${L.statics}</g><g class="fv-dyn">${L.dynamic}</g>`;
}

/**
 * Draw the field into a live <svg> (the match screen's playback). The three children fieldSvg emits are kept across draws:
 * sprite symbols are added to <defs> as new ones appear (never removed within the element's life), the static layer is replaced
 * only when its markup changed (camera move, new situation); in the dynamic layer, the parts under and over the players are
 * replaced when they changed, and each player keeps its nodes (attributes updated in place). An <svg> first filled with
 * fieldSvg() is adopted as it stands. A layer whose markup did not change is not touched. Returns { staticRedrawn, dynamicRedrawn }.
 */
export function fieldDraw(svg, o) {
  const L = fieldLayers(o);
  let st = svg.__fv;
  if (!st || st.defs.parentNode !== svg || st.statics.parentNode !== svg || st.dyn.parentNode !== svg) {
    let defs = null, statics = null, dyn = null;
    for (const c of svg.children) { const cl = c.getAttribute('class'); if (cl === 'fv-defs') defs = c; else if (cl === 'fv-static') statics = c; else if (cl === 'fv-dyn') dyn = c; }
    if (!defs || !statics || !dyn) { svg.innerHTML = '<defs class="fv-defs"></defs><g class="fv-static"></g><g class="fv-dyn"></g>'; [defs, statics, dyn] = svg.children; }
    if (!(dyn.children.length === 3 && dyn.children[0].getAttribute('class') === 'fv-pre' && dyn.children[1].getAttribute('class') === 'fv-pl' && dyn.children[2].getAttribute('class') === 'fv-post')) dyn.innerHTML = '<g class="fv-pre"></g><g class="fv-pl"></g><g class="fv-post"></g>';
    const ids = new Set(); for (const c of defs.children) if (c.id) ids.add(c.id);
    st = svg.__fv = { defs, statics, dyn, pre: dyn.children[0], pl: dyn.children[1], post: dyn.children[2], ids, staticStr: null, dynStr: null, preStr: null, postStr: null, keys: null, recs: [], draws: 0, skipped: 0 };
  }
  for (const x of L.symbols) if (!st.ids.has(x.id)) { st.ids.add(x.id); st.defs.insertAdjacentHTML('beforeend', x.symbol); }
  const staticRedrawn = L.statics !== st.staticStr;
  if (staticRedrawn) { st.statics.innerHTML = L.statics; st.staticStr = L.statics; }
  // Nothing moved (a still frame of the end-of-play hold, a re-render of the same moment): the dynamic layer is left as it is.
  const dynamicRedrawn = L.dynamic !== st.dynStr;
  if (!dynamicRedrawn) { st.skipped++; return { staticRedrawn, dynamicRedrawn }; }
  st.dynStr = L.dynamic; st.draws++;
  if (L.pre !== st.preStr) { st.pre.innerHTML = L.pre; st.preStr = L.pre; }
  if (L.post !== st.postStr) { st.post.innerHTML = L.post; st.postStr = L.post; }
  // Players: the same players in the same order keep their nodes. A sprite player whose structure is unchanged (same status
  // marks) only gets its base ellipse's and its <use>'s changed attributes set, so the <use> keeps its instance of the symbol;
  // anything else is rebuilt from its markup. A new line-up rebuilds the group.
  const keys = L.players.map((x) => x.key).join(' ');
  const index = (g, x) => ({ g, html: x.html, sig: x.sig, b: x.sig != null ? g.querySelector('[data-fv="b"]') : null, s: x.sig != null ? g.querySelector('[data-fv="s"]') : null, ell: x.ell ? { ...x.ell } : null, use: x.use ? { ...x.use } : null });
  if (keys !== st.keys) {
    st.pl.innerHTML = L.players.map((x) => `<g>${x.html}</g>`).join('');
    st.recs = L.players.map((x, i) => index(st.pl.children[i], x)); st.keys = keys;
  } else {
    for (let i = 0; i < L.players.length; i++) {
      const x = L.players[i]; const r = st.recs[i];
      if (x.html === r.html) continue;
      if (x.sig != null && x.sig === r.sig && r.b && r.s) {
        for (const k in x.ell) if (r.ell[k] !== x.ell[k]) { r.b.setAttribute(k, x.ell[k]); r.ell[k] = x.ell[k]; }
        for (const k in x.use) if (r.use[k] !== x.use[k]) { r.s.setAttribute(k, x.use[k]); r.use[k] = x.use[k]; }
        r.html = x.html;
      } else { r.g.innerHTML = x.html; st.recs[i] = index(r.g, x); }
    }
  }
  return { staticRedrawn, dynamicRedrawn };
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
