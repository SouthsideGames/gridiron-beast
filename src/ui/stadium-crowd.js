// Stadium Polish (v1): the crowd (people and monsters) in the stand behind the far end zone.
//
// The people are generated, never stored: who sits where follows from the game's seed, so a game always shows the same crowd.
// Most of a crowd wears the home club's colour, with visiting fans sprinkled in. How many of each depends on how the two clubs
// are doing: a home club that is losing draws fewer of its own fans and leaves empty seats, and a strong visitor brings more of
// theirs (a 1-7 club hosting a 7-1 club can be outnumbered in its own building). Rivalry and playoff games sell out.
// Presentation only: nothing here is read by the game, and home-field effects are unchanged.

import { t as $t } from '../text/index.js';
import { esc } from './dom.js';
/** Win share of a record ({w, l, t}); 0.5 until a club has played two games, so week 1 looks like an ordinary crowd. */
export function winShare(rec) {
  const w = rec?.w || 0, l = rec?.l || 0, t = rec?.t || 0; const n = w + l + t;
  return n < 2 ? 0.5 : (w + t * 0.5) / n;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/**
 * The make-up of the crowd for one game: `home` and `away` are the shares of FILLED seats in each club's colours (the rest wear
 * neutral clothes), `fill` is how much of the building is occupied. All between 0 and 1.
 */
export function crowdMix({ home = null, away = null, event = null } = {}) {
  const h = winShare(home), a = winShare(away); const diff = a - h; // > 0: the visitors are the better club
  const big = event === 'rival' || event === 'playoff';
  const neutral = 0.12;
  let homeShare = clamp(0.8 - 0.56 * diff, 0.34, 0.9); // of the fans who picked a side
  if (big) homeShare = clamp(homeShare, 0.5, 0.82); // both sets of fans turn out
  const fill = big ? 1 : clamp(0.58 + 0.42 * h + Math.max(0, diff) * 0.12, 0.55, 1); // a losing club has empty seats; a strong visitor fills some
  const sided = 1 - neutral;
  return { home: +(sided * homeShare).toFixed(3), away: +(sided * (1 - homeShare)).toFixed(3), fill: +fill.toFixed(3) };
}

/** A small deterministic generator (mulberry32) from a seed and a label. */
function rng(seed, label) {
  let h = 2166136261 >>> 0; for (const ch of `${seed}|${label}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h |= 0; h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const CROWD_COLS = 37, CROWD_ROWS = 3; // three rows behind the end zone; a fan is about a yard and a half wide
/**
 * Who sits in each seat of one stand: rows of 'h' (home colours), 'a' (visitors), 'n' (neutral) or '' (empty). Visiting fans
 * cluster a little (a travelling block) instead of being spread perfectly evenly.
 */
export function crowdSeats(seed, mix, stand = 'far', cols = CROWD_COLS, rows = CROWD_ROWS) {
  const r = rng(seed, `crowd-${stand}`); const out = [];
  const blockCol = Math.floor(r() * (cols - 8)), blockRow = Math.floor(r() * Math.max(1, rows - 4));
  for (let y = 0; y < rows; y++) { const row = [];
    for (let x = 0; x < cols; x++) {
      if (r() >= mix.fill) { row.push(''); continue; }
      const inBlock = x >= blockCol && x < blockCol + 8 && y >= blockRow && y < blockRow + 4;
      const awayHere = clamp(mix.away * (inBlock ? 2.6 : 0.8), 0, 0.95);
      const v = r(); row.push(v < awayHere ? 'a' : v < awayHere + mix.home ? 'h' : v < awayHere + mix.home + 0.14 ? 'n' : (r() < 0.5 ? 'h' : 'n'));
    }
    out.push(row); }
  return out;
}

const SKIN = ['#f1c9a5', '#d9a47a', '#b97c52', '#8a5a3c', '#5e3d2a'];
const HAIR = ['#1b1512', '#3a2a1c', '#6b4a2a', '#b08a4a', '#d8d2c4', '#7a1f1f'];
const NEUTRAL = ['#d8dde6', '#8f98a8', '#3b4350', '#c9b79a', '#5a6b8a', '#2c2f36'];
// Monsters in the stands: some seats hold a monster instead of a person. How many changes from game to game (monsterShare). Too small for the real sprites, so each is
// a little silhouette (ears, horns, wings, an antenna or a crest) in a fur colour; more than half wear the stadium's own type.
export const MONSTER_SHARE = Object.freeze({ min: 0.05, max: 0.5 });
/** The share of seats that hold monsters in this game: anywhere from a handful to half the stand, set by the game's seed. */
export function monsterShare(seed) { const v = rng(seed, 'monster-share')(); return +(MONSTER_SHARE.min + (MONSTER_SHARE.max - MONSTER_SHARE.min) * v).toFixed(3); }
export const TYPE_FUR = Object.freeze({ Fire: '#ff7a3d', Water: '#4aa8ff', Nature: '#6fd35a', Electric: '#ffe04a', Ice: '#bfe8ff', Wind: '#8ff0dc', Earth: '#c99a5a', Dark: '#8a6ad6', Light: '#fff0a8', Metal: '#c3cada', Psychic: '#ff8ae0' });
const FURS = Object.values(TYPE_FUR); const SHAPES = ['ears', 'horns', 'wings', 'antenna', 'crest'];
/** Which seats hold monsters, and what each looks like: rows of null or { fur, shape }. Follows the seed, like the seats. */
export function crowdMonsters(seed, stand = 'far', type = null, cols = CROWD_COLS, rows = CROWD_ROWS) {
  const r = rng(seed, `monsters-${stand}`); const home = TYPE_FUR[type] || null; const out = []; const share = monsterShare(seed);
  for (let y = 0; y < rows; y++) { const row = [];
    for (let x = 0; x < cols; x++) { const is = r() < share, own = r() < 0.6, fur = FURS[Math.floor(r() * FURS.length)], shape = SHAPES[Math.floor(r() * SHAPES.length)];
      row.push(is ? { fur: home && own ? home : fur, shape } : null); }
    out.push(row); }
  return out;
}
const PITCH_X = 8, PITCH_Y = 11; // logical pixels per seat (a fan is 6 wide and 9 tall: readable as a person on a phone)
export const CROWD_W = CROWD_COLS * PITCH_X, CROWD_H = CROWD_ROWS * PITCH_Y + 2;
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))); return `rgb(${c(16)},${c(8)},${c(0)})`; };
const cache = new Map();
/**
 * The pictures of one stand: { base, home, away } as image URLs. `base` is the whole stand; `home` and `away` hold only that
 * side's fans, a pixel higher with their arms up (shown in flashes while that side celebrates). Drawn once per game on a small
 * canvas and reused; null where there is no canvas (tests, very old browsers), and the stand is then simply not drawn.
 */
export const SIDE_SEATS = 43, SIDE_COL = 11, SIDE_PITCH = 8; // a side stand's picture: 43 seats down its length, three columns deep
/**
 * `side`: 'left' or 'right' draws the picture for a stand along a sideline instead: the fans stand upright, one column per row
 * of the stand, with the front row in the column nearest the field, each fan a little in front of the one above.
 */
export function crowdImages({ seed, mix, homeColor, awayColor, homeColor2 = null, awayColor2 = null, stand = 'far', type = null, side = null }) {
  const key = `${seed}|${stand}|${side}|${mix.home}|${mix.away}|${mix.fill}|${homeColor}|${awayColor}|${homeColor2}|${awayColor2}|${type}`;
  if (cache.has(key)) return cache.get(key);
  const doc = globalThis.document; if (!doc?.createElement) return null;
  const COLS = side ? SIDE_SEATS : CROWD_COLS; const W = side ? CROWD_ROWS * SIDE_COL : CROWD_W, H = side ? SIDE_SEATS * SIDE_PITCH + 4 : CROWD_H;
  const seats = crowdSeats(seed, mix, stand, COLS); const beasts = crowdMonsters(seed, stand, type, COLS); const r = rng(seed, `look-${stand}`); const back = stand === 'near';
  const mk = () => { const c = doc.createElement('canvas'); c.width = W; c.height = H; return c; };
  const base = mk(), up = { h: mk(), a: mk() }; const g = base.getContext?.('2d'); if (!g) return null;
  const gu = { h: up.h.getContext('2d'), a: up.a.getContext('2d') };
  g.fillStyle = '#10151d'; g.fillRect(0, 0, W, H);
  if (side) for (let y = 0; y < CROWD_ROWS; y++) { const cx = (side === 'left' ? CROWD_ROWS - 1 - y : y) * SIDE_COL; g.fillStyle = y % 2 ? '#1b2433' : '#202b3d'; g.fillRect(cx, 0, SIDE_COL, H); g.fillStyle = '#0b0f15'; g.fillRect(side === 'left' ? cx : cx + SIDE_COL - 1, 0, 1, H); }
  for (let y = 0; y < CROWD_ROWS; y++) {
    // Row 0 is the one next to the field. The far stand's front row is at the bottom of its picture; the near stand's at the top.
    const py = back ? 1 + y * PITCH_Y : CROWD_H - (y + 1) * PITCH_Y; const depth = 1 - y * 0.07; const step = y % 2 ? '#1b2433' : '#202b3d';
    if (!side) { g.fillStyle = step; g.fillRect(0, py, CROWD_W, PITCH_Y); // the step of the stand
      g.fillStyle = '#0b0f15'; g.fillRect(0, py + PITCH_Y - 1, CROWD_W, 1); }
    const row = y; const rowPy = py;
    for (let x = 0; x < COLS; x++) {
      const px = side ? (side === 'left' ? CROWD_ROWS - 1 - row : row) * SIDE_COL + 2 : x * PITCH_X + 1 + (y % 2 ? 2 : 0); const py = side ? 2 + x * SIDE_PITCH + (row % 2 ? 3 : 0) : rowPy; const who = seats[y][x];
      const skin = SKIN[Math.floor(r() * SKIN.length)], hair = HAIR[Math.floor(r() * HAIR.length)], plain = NEUTRAL[Math.floor(r() * NEUTRAL.length)]; const hat = r() < 0.22;
      if (!side && x % 9 === 8) { g.fillStyle = '#2b3547'; g.fillRect(px + 6, py, 2, PITCH_Y - 1); } // an aisle
      g.fillStyle = '#2c3a55'; g.fillRect(px, py + 5, 6, 5); g.fillStyle = '#35466a'; g.fillRect(px, py + 5, 6, 1); // the seat
      if (!who) continue; // an empty seat
      const second = (x * 7 + y * 3) % 3 === 0; // one supporter in three wears the club's secondary colour
      const shirt = who === 'h' ? (second && homeColor2) || homeColor : who === 'a' ? (second && awayColor2) || awayColor : plain;
      const m = beasts[y][x];
      // A monster: fur-coloured head and paws, the club's colours on its body (so the crowd's mix still reads), bright eyes.
      const monster = (ctx, dy, arms) => {
        const fur = shade(m.fur, depth), dark = shade(m.fur, depth * 0.62);
        ctx.fillStyle = shade(shirt, depth); ctx.fillRect(px, py + 5 + dy, 6, 5); ctx.fillStyle = shade(shirt, depth * 0.78); ctx.fillRect(px, py + 9 + dy, 6, 1);
        ctx.fillStyle = fur; ctx.fillRect(px, py + 1 + dy, 6, 4); // a wide head
        if (m.shape === 'ears') { ctx.fillRect(px, py - 1 + dy, 2, 2); ctx.fillRect(px + 4, py - 1 + dy, 2, 2); }
        else if (m.shape === 'horns') { ctx.fillStyle = '#f4ead2'; ctx.fillRect(px, py - 1 + dy, 1, 2); ctx.fillRect(px + 5, py - 1 + dy, 1, 2); }
        else if (m.shape === 'wings') { ctx.fillStyle = dark; ctx.fillRect(px - 1, py + 3 + dy, 1, 4); ctx.fillRect(px + 6, py + 3 + dy, 1, 4); ctx.fillRect(px - 1, py + 2 + dy, 2, 1); ctx.fillRect(px + 5, py + 2 + dy, 2, 1); }
        else if (m.shape === 'antenna') { ctx.fillRect(px + 2, py - 1 + dy, 1, 2); ctx.fillStyle = '#fff6a8'; ctx.fillRect(px + 2, py - 2 + dy, 2, 1); }
        else { ctx.fillStyle = dark; ctx.fillRect(px + 1, py + dy, 4, 1); ctx.fillRect(px + 2, py - 1 + dy, 2, 1); }
        if (!back) { ctx.fillStyle = '#fff'; ctx.fillRect(px + 1, py + 2 + dy, 1, 2); ctx.fillRect(px + 4, py + 2 + dy, 1, 2); ctx.fillStyle = '#14100c'; ctx.fillRect(px + 1, py + 3 + dy, 1, 1); ctx.fillRect(px + 4, py + 3 + dy, 1, 1); }
        if (arms) { ctx.fillStyle = fur; ctx.fillRect(px - 1, py + dy, 2, 5); ctx.fillRect(px + 5, py + dy, 2, 5); }
      };
      const person = (ctx, dy, arms) => {
        ctx.fillStyle = shade(shirt, depth); ctx.fillRect(px, py + 5 + dy, 6, 5); // body
        ctx.fillStyle = shade(shirt, depth * 0.78); ctx.fillRect(px, py + 9 + dy, 6, 1);
        ctx.fillStyle = shade(back ? hair : skin, depth); ctx.fillRect(px + 1, py + 1 + dy, 4, 4); // head
        if (!back) { ctx.fillStyle = shade(hat && who !== 'n' ? shirt : hair, depth); ctx.fillRect(px + 1, py + 1 + dy, 4, hat ? 2 : 1); ctx.fillStyle = '#1a1410'; ctx.fillRect(px + 2, py + 3 + dy, 1, 1); ctx.fillRect(px + 4, py + 3 + dy, 1, 1); }
        else if (hat && who !== 'n') { ctx.fillStyle = shade(shirt, depth); ctx.fillRect(px + 1, py + 1 + dy, 4, 2); }
        if (arms) { ctx.fillStyle = shade(skin, depth); ctx.fillRect(px - 1, py + dy, 2, 5); ctx.fillRect(px + 5, py + dy, 2, 5); }
      };
      const fan = m ? monster : person;
      fan(g, 0, false);
      if (who === 'h' || who === 'a') { const c = gu[who]; c.fillStyle = step; c.fillRect(px - 1, py, 8, 5); c.fillStyle = '#2c3a55'; c.fillRect(px, py + 5, 6, 5); fan(c, -2, true); }
    }
  }
  const url = (c) => { try { return c.toDataURL('image/png'); } catch { return ''; } };
  const out = { base: url(base), home: url(up.h), away: url(up.a) };
  if (cache.size > 8) cache.clear();
  cache.set(key, out); return out;
}

/** What the match screen hands the surround: the two clubs' colours, the mix and the seed. */
export function crowdFor({ seed, homeColor, awayColor, homeColor2 = null, awayColor2 = null, homeRecord, awayRecord, event, type = null }) {
  return { seed, type, homeColor: homeColor || '#5aa0ff', awayColor: awayColor || '#ff8a7a', homeColor2, awayColor2, mix: crowdMix({ home: homeRecord, away: awayRecord, event }) };
}

// ------------------------------------------------------------ crowd speech bubbles (merged from crowd-talk.js: the release holds at most 512 files)
// Crowd speech bubbles (owner 2026-11-24): after a big moment, a fan or two in the stands says something, in a small bubble over
// the seats. Home fans react to the home club, visiting fans (when the visitors brought any) to theirs: a score, a takeaway, a sack,
// a big play, now and then a first down, and the other side's fans groan. Presentation only: nothing here is read by the game.
// Every line is in src/text/en.js under crowd.*: one key per mood, the lines separated by |, so more can be added there.

// One $t call per mood (so the text checks see every key in use).
const MOODS = {
  td_ours: () => $t('crowd.td_ours'), td_theirs: () => $t('crowd.td_theirs'),
  kick_ours: () => $t('crowd.kick_ours'), kick_theirs: () => $t('crowd.kick_theirs'),
  big_ours: () => $t('crowd.big_ours'), big_theirs: () => $t('crowd.big_theirs'),
  first_down_ours: () => $t('crowd.first_down_ours'), first_down_theirs: () => $t('crowd.first_down_theirs'),
  takeaway_ours: () => $t('crowd.takeaway_ours'), giveaway: () => $t('crowd.giveaway'),
  sack_ours: () => $t('crowd.sack_ours'), sack_theirs: () => $t('crowd.sack_theirs'),
};
/** The things a fan in this mood can say (the | separated line in en.js). */
export const moodLines = (mood) => String(MOODS[mood]?.() || '').split('|').map((x) => x.trim()).filter(Boolean);

const hash = (s) => { let h = 2166136261 >>> 0; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const pick = (list, seed) => (list.length ? list[seed % list.length] : '');
const other = (side) => (side === 'home' ? 'away' : 'home');
export const BIG_PLAY_YARDS = 20;

/**
 * What the crowd says after one finished play: [{ side: 'home' | 'away' (whose fans), mood, text }], at most two, or [].
 * `ev` is the match screen's event (ev.sim.result, ev.sim.yards, ev.kind, ev.scored, ev.kicking, ev.good, ev.tryTeam, ev.offenseSide,
 * ev.firstDown); `away` is the visitors' share of the crowd (0 when they brought nobody); `seed` keeps it the same on a redraw.
 */
export function crowdTalk(ev, { away = 0.2, seed = 0 } = {}) {
  if (!ev) return [];
  const r = ev.sim?.result || null; const off = ev.offenseSide || null; const def = off ? other(off) : null; const h = hash(`${seed}|${ev.text || ''}|${ev.kind || ''}`);
  let team = null, good = null, bad = null, chance = 1;
  if (r === 'touchdown' || (ev.kind === 'kickoff' && ev.scored)) { team = ev.scored?.team || off; good = 'td_ours'; bad = 'td_theirs'; }
  else if (ev.kind === 'field_goal') { if (!ev.scored) return []; team = ev.kicking || off; good = 'kick_ours'; bad = 'kick_theirs'; }
  else if (ev.kind === 'try') { if (!ev.good) return []; team = ev.tryTeam || ev.kicking || off; good = 'kick_ours'; bad = 'kick_theirs'; chance = 0.6; }
  else if (r === 'interception' || r === 'fumble') { team = def; good = 'takeaway_ours'; bad = 'giveaway'; }
  else if (r === 'sack') { team = def; good = 'sack_ours'; bad = 'sack_theirs'; chance = 0.7; }
  else if ((ev.sim?.yards ?? 0) >= BIG_PLAY_YARDS && off) { team = off; good = 'big_ours'; bad = 'big_theirs'; }
  else if (ev.firstDown && off) { team = off; good = 'first_down_ours'; bad = 'first_down_theirs'; chance = 0.35; }
  if (!team || !good) return [];
  if ((h % 1000) / 1000 >= chance) return [];
  const here = (side) => side === 'home' || away >= 0.08; // the visitors speak only when they brought a real following
  const out = [];
  if (here(team)) out.push({ side: team, mood: good, text: pick(moodLines(good), h >>> 3) });
  if (here(other(team)) && ((h >>> 11) % 100) < 55) out.push({ side: other(team), mood: bad, text: pick(moodLines(bad), h >>> 5) });
  return out.filter((x) => x.text).slice(0, 2);
}

/**
 * Where fans can be seen in the field's box right now: rectangles (box pixels) of the stands in view and of the seats around the
 * field (the bowl, wherever the field's picture leaves room). Each is { x, y, w, h }.
 */
function seatAreas(wrap) {
  const box = wrap.getBoundingClientRect(); if (!box.width || !box.height) return [];
  const out = []; const clip = (r) => { const x0 = Math.max(r.left, box.left), x1 = Math.min(r.right, box.right), y0 = Math.max(r.top, box.top), y1 = Math.min(r.bottom, box.bottom); if (x1 - x0 > 30 && y1 - y0 > 16) out.push({ x: x0 - box.left, y: y0 - box.top, w: x1 - x0, h: y1 - y0 }); };
  for (const g of wrap.querySelectorAll('.sfx-stand:not(.sfx-bowl)')) clip(g.getBoundingClientRect());
  const svg = wrap.querySelector('#field'); const vb = svg?.viewBox?.baseVal;
  if (svg && vb?.width && wrap.querySelector('.sfx-bowl')) { // the bowl shows around the field's picture: left/right or above/below it
    const s = svg.getBoundingClientRect(); const k = Math.min(s.width / vb.width, s.height / vb.height); const w = vb.width * k, hgt = vb.height * k; const l = s.left + (s.width - w) / 2, t = s.top + (s.height - hgt) / 2;
    clip({ left: box.left, right: l, top: box.top, bottom: box.bottom }); clip({ left: l + w, right: box.right, top: box.top, bottom: box.bottom });
    clip({ left: box.left, right: box.right, top: box.top, bottom: t }); clip({ left: box.left, right: box.right, top: t + hgt, bottom: box.bottom });
  }
  return out;
}

const BUBBLE_MS = 2600;
/** Show the bubbles over the seats in view, one after the other; nothing when no fans are in view. Returns how many were placed. */
export function showCrowdTalk(wrap, talk, { seed = 0, colors = {} } = {}) {
  if (!wrap || !talk?.length) return 0;
  for (const b of wrap.querySelectorAll('.crowd-bubble')) b.remove();
  const box = wrap.getBoundingClientRect(); let n = 0;
  // Never over the play's banner or anything else laid over the field: bubbles start below the lowest overlay in the top half.
  let floor = 0; for (const el of wrap.children) { if (el.tagName === 'svg' || el.classList.contains('crowd-bubble') || el.classList.contains('stadium-surround')) continue; const r = el.getBoundingClientRect(); if (r.width && r.height && r.top - box.top < box.height / 2) floor = Math.max(floor, r.bottom - box.top); }
  const areas = seatAreas(wrap).map((a) => { const y0 = Math.max(a.y, floor + 54); return { ...a, y: y0, h: a.y + a.h - y0 }; }).filter((a) => a.h > 24); if (!areas.length) return 0;
  talk.forEach((x, i) => {
    const a = areas[(hash(`${seed}|${i}`) + i) % areas.length]; const u = (hash(`${seed}|x${i}`) % 1000) / 1000, v = (hash(`${seed}|y${i}`) % 1000) / 1000;
    const left = Math.max(72, Math.min(box.width - 72, a.x + a.w * (0.15 + 0.7 * u))), top = Math.max(floor + 54, Math.min(box.height - 8, a.y + a.h * (0.2 + 0.7 * v))); // its bottom edge (the tail) sits on the seats
    const el = globalThis.document.createElement('div');
    el.className = `crowd-bubble crowd-${x.side}`; el.setAttribute('aria-hidden', 'true');
    el.style.left = `${left.toFixed(0)}px`; el.style.top = `${top.toFixed(0)}px`; el.style.animationDelay = `${i * 450}ms`;
    if (colors[x.side]) el.style.setProperty('--crowd-c', colors[x.side]);
    el.innerHTML = esc(x.text);
    wrap.appendChild(el); n++;
    setTimeout(() => el.remove(), BUBBLE_MS + i * 450 + 100);
  });
  return n;
}
