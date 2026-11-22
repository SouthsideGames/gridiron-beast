// Stadium Polish (v1): the crowd (people and monsters) in the stand behind the far end zone.
//
// The people are generated, never stored: who sits where follows from the game's seed, so a game always shows the same crowd.
// Most of a crowd wears the home club's colour, with visiting fans sprinkled in. How many of each depends on how the two clubs
// are doing: a home club that is losing draws fewer of its own fans and leaves empty seats, and a strong visitor brings more of
// theirs (a 1-7 club hosting a 7-1 club can be outnumbered in its own building). Rivalry and playoff games sell out.
// Presentation only: nothing here is read by the game, and home-field effects are unchanged.

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
export function crowdImages({ seed, mix, homeColor, awayColor, stand = 'far', type = null }) {
  const key = `${seed}|${stand}|${mix.home}|${mix.away}|${mix.fill}|${homeColor}|${awayColor}|${type}`;
  if (cache.has(key)) return cache.get(key);
  const doc = globalThis.document; if (!doc?.createElement) return null;
  const seats = crowdSeats(seed, mix, stand); const beasts = crowdMonsters(seed, stand, type); const r = rng(seed, `look-${stand}`); const back = stand === 'near';
  const mk = () => { const c = doc.createElement('canvas'); c.width = CROWD_W; c.height = CROWD_H; return c; };
  const base = mk(), up = { h: mk(), a: mk() }; const g = base.getContext?.('2d'); if (!g) return null;
  const gu = { h: up.h.getContext('2d'), a: up.a.getContext('2d') };
  g.fillStyle = '#10151d'; g.fillRect(0, 0, CROWD_W, CROWD_H);
  for (let y = 0; y < CROWD_ROWS; y++) {
    // Row 0 is the one next to the field. The far stand's front row is at the bottom of its picture; the near stand's at the top.
    const py = back ? 1 + y * PITCH_Y : CROWD_H - (y + 1) * PITCH_Y; const depth = 1 - y * 0.07; const step = y % 2 ? '#1b2433' : '#202b3d';
    g.fillStyle = step; g.fillRect(0, py, CROWD_W, PITCH_Y); // the step of the stand
    g.fillStyle = '#0b0f15'; g.fillRect(0, py + PITCH_Y - 1, CROWD_W, 1);
    for (let x = 0; x < CROWD_COLS; x++) {
      const px = x * PITCH_X + 1 + (y % 2 ? 2 : 0); const who = seats[y][x];
      const skin = SKIN[Math.floor(r() * SKIN.length)], hair = HAIR[Math.floor(r() * HAIR.length)], plain = NEUTRAL[Math.floor(r() * NEUTRAL.length)]; const hat = r() < 0.22;
      if (x % 9 === 8) { g.fillStyle = '#2b3547'; g.fillRect(px + 6, py, 2, PITCH_Y - 1); } // an aisle
      g.fillStyle = '#2c3a55'; g.fillRect(px, py + 5, 6, 5); g.fillStyle = '#35466a'; g.fillRect(px, py + 5, 6, 1); // the seat
      if (!who) continue; // an empty seat
      const shirt = who === 'h' ? homeColor : who === 'a' ? awayColor : plain;
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
export function crowdFor({ seed, homeColor, awayColor, homeRecord, awayRecord, event, type = null }) {
  return { seed, type, homeColor: homeColor || '#5aa0ff', awayColor: awayColor || '#ff8a7a', mix: crowdMix({ home: homeRecord, away: awayRecord, event }) };
}
