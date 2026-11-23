// Uniforms (owner ruling 2026-11-23, second set). Every club has a home and an away kit in its approved colours, and a third
// (its dark secondary) used only when its away kit would be too close to the home side's. On the field a kit is drawn into the
// monster's own sprite: a jersey band across the body and a trim line under it, recolouring body pixels only, so every monster
// keeps its exact silhouette, eyes and outline (sprite16.js). The base under each player is the kit's colour too.
// The jersey drawing here (kitJersey) is the same kit as a shirt with the club's logo on the chest, for screens that show a
// team's uniforms (the pregame matchup, the uniform sheets).
import { TEAM_META } from '../data/league.js';
import { logoBody } from './team-logo.js';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex) => { const v = rgb(hex).map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** How far apart two colours look (0 the same … about 1 black against white): a weighted RGB distance. */
export function colorDistance(a, b) { const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b); const rm = (r1 + r2) / 2; return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2) / 765; }
/** Two kits are told apart when their jerseys differ by at least this much (colour) or this much (lightness contrast). */
export const KIT_MIN_DISTANCE = 0.22, KIT_MIN_CONTRAST = 1.6;
const apart = (a, b) => colorDistance(a, b) >= KIT_MIN_DISTANCE || contrast(a, b) >= KIT_MIN_CONTRAST;

/**
 * A club's kits: { home, away, alt }, each { kind, jersey, trim, base }. Home: the primary with the secondary as trim (the accent if
 * the secondary does not stand off the primary). Away: the accent, trimmed in the primary. Alternate: the secondary, trimmed in the accent.
 */
export function teamKits(club) {
  const m = TEAM_META[club]; if (!m) return null; const P = m.color, S = m.secondary, A = m.accent;
  const trimOn = (j, first, second) => (contrast(j, first) >= 1.8 ? first : second);
  return {
    home: { club, kind: 'home', jersey: P, trim: trimOn(P, S, A), base: P },
    away: { club, kind: 'away', jersey: A, trim: trimOn(A, P, S), base: A },
    alt: { club, kind: 'alt', jersey: S, trim: trimOn(S, A, P), base: S },
  };
}
/**
 * The kits worn in one game: the home club in its home kit; the visitors in their away kit, or, when that is too close to the home
 * jersey, whichever of their other two kits stands furthest from it.
 */
export function gameKits(home, away) {
  const H = teamKits(home), V = teamKits(away);
  const homeKit = H?.home || null; if (!V) return { home: homeKit, away: null };
  if (!homeKit || apart(V.away.jersey, homeKit.jersey)) return { home: homeKit, away: V.away };
  const pick = [V.alt, V.home].sort((x, y) => colorDistance(y.jersey, homeKit.jersey) - colorDistance(x.jersey, homeKit.jersey))[0];
  return { home: homeKit, away: pick };
}
/** True when the two kits of a game are told apart (the tests check every pairing of the 32 clubs). */
export const kitsApart = (a, b) => !!a && !!b && apart(a.jersey, b.jersey);

/**
 * The kit as a shirt with the club's logo on the chest, `size` px wide (an svg). The same colours the field draws; the logo is the
 * club's own (team-logo.js).
 */
export function kitJersey(kit, size = 96, { label = null } = {}) {
  if (!kit) return ''; const { jersey: J, trim: T } = kit; const dark = lum(J) < 0.18; const line = dark ? '#05080a' : '#1b2228';
  const body = 'M30 8 L42 4 Q50 12 58 4 L70 8 L94 24 L84 44 L74 38 V94 H26 V38 L16 44 L6 24 Z';
  return `<svg class="kit-jersey" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${label || `${kit.club} ${kit.kind} uniform`}">`
    + `<path d="${body}" fill="${J}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<path d="M6 24 L16 44 L19 42.2 L9 22.2 Z M94 24 L84 44 L81 42.2 L91 22.2 Z" fill="${T}"/>`
    + `<path d="M26 80 H74 V86 H26 Z" fill="${T}"/><path d="M42 4 Q50 12 58 4 L60 7 Q50 17 40 7 Z" fill="${T}" stroke="${line}" stroke-width="1"/>`
    + `<g transform="translate(36 22) scale(0.28)">${logoBody(kit.club)}</g>`
    + `<path d="${body}" fill="none" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
}
