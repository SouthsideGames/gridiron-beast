import { overheadSvg } from './fx/overhead.js';
import { FacingTracker } from './match-camera.js';
import { hybridRegions } from '../sim/t8/zone-planning.js';
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
import { fieldBrand, brandEndZone, brandMidfield, LOGO_YARDS } from './field-branding.js';
import { postsSvg, standsDepth, standSvg, wallSvg, apronSvg, borderSvg, barrierSvg, sideStandsSvg, SIDE_REACH, fieldBorder, FIELD_BORDER, STANDS_GRASS, STANDS_BARRIER, STANDS_GAP, FOOTBALL } from './stadium-fx.js';
import { t as $t } from '../text/index.js';

const SPAN = 46; // visible yards
const HW = FIELD.halfWidth + 0.33;
let nextLiveClip = 0;

export function cameraFor(ballOn) {
  let bottom = ballOn - 15;
  const reach = standsDepth(); // Stadium Polish: with a stadium scene set, the picture reaches a few yards past each end line (the stands)
  bottom = Math.max(-10 - reach, Math.min(110 + reach - SPAN, bottom));
  return { bottom, top: bottom + SPAN };
}
export const FIELD_VIEWBOX = `${-HW} 0 ${HW * 2} ${SPAN}`;
/** Stadium Polish: half the picture's width. With a stadium scene set the picture is wider than the field by the white paint. */
/** Zoomed out, the picture also takes in the stands along the sidelines; they slide into view as the camera pulls back. */
const sideReach = (span) => (fieldBorder() ? SIDE_REACH * Math.max(0, Math.min(1, (span - SPAN) / 50)) : 0);
const viewHalf = (span = SPAN) => HW + fieldBorder() + sideReach(span);
/** The viewBox for the field on screen now (FIELD_VIEWBOX unless a stadium scene is set). */
export const fieldViewBox = (span = SPAN) => `${-viewHalf(span)} 0 ${viewHalf(span) * 2} ${span}`;

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
  const { ballOn = 25, ballLat = 0, toGo = 10, colors = { off: '#60baff', def: '#ff9385' }, frame = null, presnap = null, ownLabel = 'OWN', oppLabel = 'OPP', camera = null, event = null, noLines = false, sprites = null, prevFrame = null, fx = null, fxQuality = 'full', time = null, underlay = '', typeIcons = null, venue = null, qbRead = false, fields = null, fxOptions = null, readinessHud = null, kits = null, homeOnOffense = null} = o;
  const portalFrame = frame && (frame.hoardFlight || fx?.t8?.items?.some((i) => i.id === 'PSY-02-F' && (frame.t ?? 0) >= i.t0));
  const cam = o.viewCamera || (portalFrame ? cameraFor(ballOn + frame.ball[0]) : camera || cameraFor(ballOn));
  const span = cam.top - cam.bottom;
  const Y = (yard) => cam.top - yard; // yards → svg y
  const X = (lat) => lat; // lateral yards → svg x (centred)
  let s = '';
  // Turf and end zones: the stadium's environment (GDD §33.1); without a venue, the classic grass exactly as before.
  const T = turfSvg(venue, cam, HW, span, Y);
  s += T.turf;
  // Home-field branding (field-branding.js): the home club's place name in the end zone it defends, its nickname in the other.
  // Which end zone that is follows the camera (the offense always attacks up): the near one when the home club has the ball.
  const brand = fieldBrand(venue); const homeNear = homeOnOffense ?? true;
  if (brand) s += `<defs>${brand.logo.symbol}</defs>`;
  const ez = (y0, h, label, which) => (brand ? `${T.endZone(y0, h)}${brandEndZone(brand, which, HW, y0, h)}` : `${T.endZone(y0, h)}<text x="0" y="${y0 + h / 2 + 1.4}" text-anchor="middle" font-size="4" font-weight="900" fill="#dfeee6" opacity="0.8">${label}</text>`);
  if (cam.bottom < 0) s += ez(Y(0), Y(-10) - Y(0), ownLabel, homeNear ? 'place' : 'nickname');
  if (cam.top > 100) s += ez(Y(110), Y(100) - Y(110), oppLabel, homeNear ? 'nickname' : 'place');
  const VW = viewHalf(span); const sideSymbols = [];
  s += borderSvg(cam, HW, Y); // Stadium Polish: the white paint around the field (the sideline markers stand on it)
  s += T.over; // tint and sideline decor, under the lines and the players
  // Event field art: rivalry games get a painted midfield crest and purple end-zone stripes; playoffs get gold.
  const midIn = cam.bottom < 50 + LOGO_YARDS / 2 && cam.top > 50 - LOGO_YARDS / 2;
  if (brand && midIn) s += brandMidfield(brand, Y, event ? (event === 'rival' ? '#a855f7' : '#f5c542') : null); // under the yard lines, which stay readable
  if (event) {
    const accent = event === 'rival' ? '#a855f7' : '#f5c542';
    if (!brand && cam.bottom < 50 && cam.top > 50) s += `<g opacity="0.35"><circle cx="0" cy="${Y(50)}" r="6" fill="none" stroke="${accent}" stroke-width="0.6"/><text x="0" y="${Y(50) + 1.6}" text-anchor="middle" font-size="4.5" font-weight="900" fill="${accent}">${event === 'rival' ? '⚔' : '★'}</text></g>`;
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
  s += `<rect x="${-HW + 0.15}" y="0.1" width="${HW * 2 - 0.3}" height="${span - 0.2}" fill="none" stroke="#f0f6e9" stroke-width="0.3"/>`;
  // Line of scrimmage and line to gain.
  const ltg = Math.min(100, ballOn + toGo);
  if (!noLines) {
    s += `<line x1="${-HW}" y1="${Y(ballOn)}" x2="${HW}" y2="${Y(ballOn)}" stroke="#4aa3ff" stroke-width="0.35"/>`;
    if (ltg < 100) s += `<line x1="${-HW}" y1="${Y(ltg)}" x2="${HW}" y2="${Y(ltg)}" stroke="#ffb13d" stroke-width="0.35"/>`;
  }
  // Stadium Polish: what lies behind the end lines (the far stand with its crowd; the near wall). Over the turf and sidelines there.
  // A strip of grass runs between each end line and what stands behind it.
  // Behind the white: grass, the padded barrier, then the stand (far end) or the wall (near end), across the whole picture.
  if (cam.top > 110 + FIELD_BORDER) s += `${apronSvg(venue, -VW, Y(110 + FIELD_BORDER + STANDS_GRASS), VW * 2, STANDS_GRASS)}${barrierSvg(venue, -VW, Y(110 + STANDS_GAP), VW * 2, -1)}${cam.top > 110 + STANDS_GAP ? standSvg(venue, -VW, Y(110 + standsDepth()), VW * 2) : ''}`; // the stand only once it is in view
  if (cam.bottom < -10 - FIELD_BORDER) s += `${apronSvg(venue, -VW, Y(-10 - FIELD_BORDER), VW * 2, STANDS_GRASS)}${barrierSvg(venue, -VW, Y(-10 - FIELD_BORDER - STANDS_GRASS), VW * 2, 1)}${cam.bottom < -10 - STANDS_GAP ? wallSvg(venue, -VW, Y(-10 - STANDS_GAP), VW * 2) : ''}`;
  if (sideReach(span) > 0.05) { const side = sideStandsSvg(venue, cam, HW, Y); if (side) { s += side.svg; sideSymbols.push(...side.symbols); } }
  // Goal posts on the end lines (drawn flat from above: crossbar + uprights).
  for (const [end, dir] of [[110, 1], [-10, -1]]) if (cam.bottom - 1 < end && cam.top + 1 > end) { const y = Y(end) + (fieldBorder() ? -dir * 0.9 : dir * 0.6); s += `<g stroke="#ffd84a" stroke-width="0.45" stroke-linecap="round"><line x1="-3" y1="${y}" x2="3" y2="${y}"/><line x1="-3" y1="${y}" x2="-3" y2="${y - dir * 2.4}"/><line x1="3" y1="${y}" x2="3" y2="${y - dir * 2.4}"/></g>${postsSvg(venue?.env, y, dir)}`; }
  // Pre-snap art.
  if (presnap?.play) {
    const B = boundsFor(ballOn, ballLat);
    const proj = { p: ([x, y]) => [X(ballLat + y), Y(ballOn + x)] };
    s += `<g opacity="0.95">${assignmentLines(presnap.play, proj, { limitX: B.endLine - 0.8, offenseAlign: presnap.offensePlay?.align || null, referenceOffense: presnap.offensePlay?.id })}</g>`;
  }
  // Task 8 fields (spec §11): the functional rectangles of the play (sim.fields, play-relative), outlined and tinted by element.
  const drawn = fx?.t8?.ghosts?.length ? [...(fields || []), ...fx.t8.ghosts] : fields; // + a zone Prism Break shatters before the snap (fx/t8-fx.js)
  if (drawn?.length) for (const f of drawn) {
    const c = FIELD_TINT[f.type] || '#ffffff', x0 = X(ballLat + f.lat[0]), x1 = X(ballLat + f.lat[1]), y0 = Y(ballOn + f.yard[1]), y1 = Y(ballOn + f.yard[0]);
    const fa = fx?.fieldAlpha ? fx.fieldAlpha(f.id, time ?? frame?.t ?? 0) : 1; if (fa <= 0.01) continue; // Task 8 fx hook: a field's reveal / dissolve
    s += `<rect class="t8-field" data-element="${f.type}"${fa < 1 ? ` opacity="${fa.toFixed(2)}"` : ''} x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${c}" fill-opacity="0.16" stroke="${c}" stroke-width="0.3" stroke-opacity="0.85"><title>${f.type} zone${Number.isFinite(f.remaining) ? ` · ${f.remaining} relevant plays remaining` : ''}</title></rect>`;
  }
  for (const h of hybridRegions(fields)) {
    const x0 = X(ballLat + h.lat[0]), x1 = X(ballLat + h.lat[1]), y0 = Y(ballOn + h.yard[1]), y1 = Y(ballOn + h.yard[0]);
    const color = h.name === 'Steam' ? '#e9f7ff' : h.name === 'Eclipse' ? '#c9a4ff' : '#c9f4da';
    s += `<g class="t8-hybrid" data-hybrid="${h.name}"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${color}" fill-opacity="0.24" stroke="${color}" stroke-width="0.24" stroke-dasharray="0.5 0.35"/><text x="${(x0+x1)/2}" y="${(y0+y1)/2}" text-anchor="middle" font-size="1.35" font-weight="bold" fill="${color}" stroke="#14281f" stroke-width="0.17" paint-order="stroke">${h.name}${h.remaining == null ? '' : ` · ${h.remaining}`}</text></g>`;
  }
  if (underlay) s += underlay; // caller-drawn layer under the players (Playbook Audit paths)
  const statics = s; s = '';
  // ---------------------------------------------------------------- dynamic layer
  const clipId = o.clipId || 'fv-clip';
  const symbols = [{ id: clipId, symbol: `<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${-VW}" y="0" width="${VW * 2}" height="${span}"/></clipPath>` }, ...sideSymbols]; const seen = new Set(); let pre = '';
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
    const kit = kits?.[team] || null; const base = kit?.base || (team === 'off' ? colors.off : colors.def); // the uniform (team-kit.js): jersey on the sprite, kit colour under it
    const [mx] = moved(team, slot, x, y); const flip = o.facing?.[`${team}:${slot}`] ?? (Math.abs(mx) > 0.12 ? mx < 0 : team === 'def');
    // The sprite: a <use> of the monster's cached <symbol> (same viewBox, size and crisp edges as the inline art it replaces).
    const ref = monsterSpriteRef(m, { flip, kit }); if (!seen.has(ref.id)) { seen.add(ref.id); symbols.push(ref); }
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
    const bsvg = frame.ball ? (([x, y]) => [x, y - lift(frame.ball), frame.ball[2]])(toSvg(frame.ball[0], frame.ball[1])) : null; const pbsvg = !frame.ballHidden && !prevFrame?.ballHidden && prevFrame?.ball ? (([x, y]) => [x, y - lift(prevFrame.ball)])(toSvg(prevFrame.ball[0], prevFrame.ball[1])) : null;
    const layers = fx ? fxSvg(fx, ft, posOf, { quality: fxQuality, halfWidth: HW, toSvg, ball: bsvg, pball: pbsvg, ...(fxOptions || {}) }) : { under: '', over: '', ball: '' }; // Task 8 fx hook
    s += layers.under;
    pre = s; s = '';
    const showStatus = true; // Task 8 (spec §13): status information stays visible at every quality level
    for (const [slot, x, y, eng, st] of frame.def) marker(slot, x, y, 'def', eng, frame.holder === slot && frame.holderTeam === 'def', showStatus ? st : 0);
    // Draw the ball-carrying QB after all linemen so their sprites cannot cover him.
    const qbOnTop = frame.holderTeam === 'off' && frame.holder === 'QB';
    for (const [slot, x, y, eng, st] of frame.off) if (!qbOnTop || slot !== 'QB') marker(slot, x, y, 'off', eng, frame.holder === slot && frame.holderTeam === 'off', showStatus ? st : 0);
    if (qbOnTop) for (const [slot, x, y, eng, st] of frame.off) if (slot === 'QB') marker(slot, x, y, 'off', eng, true, showStatus ? st : 0);
    const [bx, by, air] = frame.ball;
    const cx = X(ballLat + by), cy = Y(ballOn + bx);
    s += layers.ball; // fire or wind on a ball in the air, just under the ball
    const ballArt = `<ellipse cx="${(cx + (air ? 0 : 0.9)).toFixed(2)}" cy="${(cy - (air ? 1.4 : 0.7)).toFixed(2)}" rx="${air ? 0.95 : FOOTBALL.rx}" ry="${air ? 0.6 : FOOTBALL.ry}" fill="${FOOTBALL.fill}" stroke="${FOOTBALL.stroke}" stroke-width="${FOOTBALL.strokeWidth}"/>`;
    // Ability presentation over the sprites: icons, badges, outcome labels; then status marks on top of everything.
    // QB read indicator (GDD §53, opt-in): a thin dashed ring on the receiver the quarterback is reading. Draws only; the frame's
    // `read` is what the engine recorded.
    if (qbRead && frame.read) { const p = posOf('off', frame.read); if (p) s += `<circle class="qb-read-ring" cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="2.3" fill="none" stroke="#ffe26c" stroke-width="0.28" stroke-dasharray="0.9 0.6" opacity="0.85"/><circle cx="${p[0].toFixed(2)}" cy="${(p[1] - 2.9).toFixed(2)}" r="0.45" fill="#ffe26c" opacity="0.9"/>`; }
    s += layers.over + (frame.ballHidden ? '' : ballArt) + statusOver;
  } else if (presnap?.offensePlay || presnap?.defensePlay) {
    const dp = presnap.defensePlay; const op = presnap.offensePlay;
    // Task 8 fx hook (I2): the fields visible before the snap, with their element decoration and, once, their reveal (`time` is the
    // reveal clock; the monsters stand at their alignment). Ground marks go under the monsters like in a play.
    const preFx = fx ? fxSvg(fx, time ?? 0, (team, slot) => { const at = (team === 'off' ? op : dp)?.align?.[slot]; return at ? [X(ballLat + at[1]), Y(ballOn + at[0]), 0, 0] : null; }, { quality: fxQuality, halfWidth: HW, toSvg: (x, y) => [X(ballLat + y), Y(ballOn + x)], ...(fxOptions || {}) }) : null;
    if (preFx) s += preFx.under;
    pre = s; s = '';
    if (dp) for (const slot of dp.onField) { const [x, y] = dp.align[slot]; marker(slot, x, y, 'def', false, false); }
    if (op) for (const slot of op.onField) { const [x, y] = op.align[slot]; marker(slot, x, y, 'off', false, slot === 'QB'); }
    if (readinessHud) s += overheadSvg({ hud: readinessHud, badges: [], items: [], spends: [] }, time ?? 0, (team, slot) => {
      const at = (team === 'off' ? op : dp)?.align?.[slot];
      return at ? [X(ballLat + at[1]), Y(ballOn + at[0])] : null;
    }, { showReadiness: true });
    // Expected type matchups (GDD §32.4): a small badge just above the sprite's inside shoulder, never over the monster or the
    // ball, and off the line of a straight route (routes leave from the feet). Each badge is a button: tapping opens the matchup panel.
    let tmIcons = '';
    if (typeIcons) for (const [team, play] of [['def', dp], ['off', op]]) for (const [slot, dir] of Object.entries(typeIcons[team] || {})) {
      const at = play?.align?.[slot]; if (!at || !dir) continue;
      const cx = X(ballLat + at[1]) + (at[1] > 0 ? -1.3 : 1.3), cy = Y(ballOn + at[0]) - 3.35; // over the inside shoulder, clear of the head and a straight stem
      const up = dir === 'up'; const col = up ? '#22c55e' : '#f5a524';
      const arrow = up ? `M${cx - 0.48} ${cy + 0.22} L${cx} ${cy - 0.42} L${cx + 0.48} ${cy + 0.22}` : `M${cx - 0.48} ${cy - 0.22} L${cx} ${cy + 0.42} L${cx + 0.48} ${cy - 0.22}`;
      tmIcons += `<g class="tm-icon" data-tm="${team}:${slot}" role="button" tabindex="0" aria-label="${up ? $t('match.type_advantage_for', { slot }) : $t('match.type_disadvantage_for', { slot })}"><circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="2.1" fill="transparent"/><circle class="tm-dot" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="0.85" fill="${col}" stroke="#0b1a14" stroke-width="0.2"/><path d="${arrow}" fill="none" stroke="#0b1a14" stroke-width="0.28" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
    if (preFx) s += preFx.over;
    s += tmIcons; // the tappable matchup badges stay on top
  }
  if (!frame && !(presnap?.offensePlay || presnap?.defensePlay)) { pre = s; s = ''; }
  const post = s;
  // The dynamic layer: what lies under the players (movement trail, ground effects), the players (one <g> each), what lies over
  // them (ball effects, ball, read ring, effects, status marks, type badges). The groups carry no attributes: paint order and
  // pixels are those of the flat markup.
  const dynamic = `<g class="fv-pre">${pre}</g><g class="fv-pl">${players.map((x) => `<g>${x.html}</g>`).join('')}</g><g class="fv-post">${post}</g>`;
  return { statics, dynamic, symbols, pre, players, post, span, clipId };
}

/** The whole field as one SVG inner string: sprite definitions, the static layer, the dynamic layer. */
export function fieldSvg(o) {
  const L = fieldLayers(o);
  return `<defs class="fv-defs">${L.symbols.map((x) => x.symbol).join('')}</defs><g class="fv-static" clip-path="url(#${L.clipId})">${L.statics}</g><g class="fv-dyn" clip-path="url(#${L.clipId})">${L.dynamic}</g>`;
}

/**
 * Draw the field into a live <svg> (the match screen's playback). The three children fieldSvg emits are kept across draws:
 * sprite symbols are added to <defs> as new ones appear (never removed within the element's life), the static layer is replaced
 * only when its markup changed (camera move, new situation); in the dynamic layer, the parts under and over the players are
 * replaced when they changed, and each player keeps its nodes (attributes updated in place). An <svg> first filled with
 * fieldSvg() is adopted as it stands. A layer whose markup did not change is not touched. Returns { staticRedrawn, dynamicRedrawn }.
 */
export function fieldDraw(svg, o) {
  const tracker = svg.__facing || (svg.__facing = new FacingTracker());
  const clipId = svg.__clipId || (svg.__clipId = `fv-clip-live-${++nextLiveClip}`);
  const L = fieldLayers({ ...o, clipId, facing: tracker.observe(o.frame) });
  if (o.viewCamera) svg.setAttribute('viewBox', fieldViewBox(L.span));
  let st = svg.__fv;
  if (!st || st.defs.parentNode !== svg || st.statics.parentNode !== svg || st.dyn.parentNode !== svg) {
    let defs = null, statics = null, dyn = null;
    for (const c of svg.children) { const cl = c.getAttribute('class'); if (cl === 'fv-defs') defs = c; else if (cl === 'fv-static') statics = c; else if (cl === 'fv-dyn') dyn = c; }
    if (!defs || !statics || !dyn) { svg.innerHTML = '<defs class="fv-defs"></defs><g class="fv-static" clip-path="url(#fv-clip)"></g><g class="fv-dyn" clip-path="url(#fv-clip)"></g>'; [defs, statics, dyn] = svg.children; }
    if (!(dyn.children.length === 3 && dyn.children[0].getAttribute('class') === 'fv-pre' && dyn.children[1].getAttribute('class') === 'fv-pl' && dyn.children[2].getAttribute('class') === 'fv-post')) dyn.innerHTML = '<g class="fv-pre"></g><g class="fv-pl"></g><g class="fv-post"></g>';
    const ids = new Set(); for (const c of defs.children) if (c.id) ids.add(c.id);
    st = svg.__fv = { defs, statics, dyn, pre: dyn.children[0], pl: dyn.children[1], post: dyn.children[2], ids, staticStr: null, dynStr: null, preStr: null, postStr: null, keys: null, recs: [], draws: 0, skipped: 0 };
  }
  // A review sheet can draw another field above a wide Auto field. SVG ids are
  // document-global, so each live field needs its own changing clip rectangle.
  const adoptedClip = st.defs.querySelector('#fv-clip');
  if (adoptedClip) { adoptedClip.setAttribute('id', clipId); st.ids.delete('fv-clip'); st.ids.add(clipId); }
  st.statics.setAttribute('clip-path', `url(#${clipId})`); st.dyn.setAttribute('clip-path', `url(#${clipId})`);
  for (const x of L.symbols) if (!st.ids.has(x.id)) { st.ids.add(x.id); st.defs.insertAdjacentHTML('beforeend', x.symbol); }
  const clip = st.defs.querySelector(`#${clipId} rect`);
  if (clip) { clip.setAttribute('height', String(L.span)); clip.setAttribute('x', String(-viewHalf(L.span))); clip.setAttribute('width', String(viewHalf(L.span) * 2)); }
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
