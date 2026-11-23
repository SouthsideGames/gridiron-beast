// Team logos (owner ruling 2026-11-23, second set): one badge per club in its approved colours, with its own mascot emblem. Pure SVG
// in a 100×100 box, so one drawing serves every size: the club picker and team cards (24–64 px), the scoreboard (18–22 px), the
// contact sheets, and midfield (about 11 yards across). The field places it once per frame as a <symbol> + <use>.
//
// Colours: the badge is the club's secondary, the ring and the emblem its primary, details its accent, and every shape has a dark
// outline (the secondary, darkened) so the logo reads on light and dark backgrounds and at small sizes.
import { TEAM_META } from '../data/league.js';
import { BADGES } from '../data/club-identity.js';

// ---------------------------------------------------------------- colour
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const lum = (hex) => { const v = rgb(hex).map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** The four colours a logo is drawn in: P primary, S secondary (the badge), A accent, K outline. */
export function logoColors(club) {
  const m = TEAM_META[club]; if (!m) return null;
  let P = m.color, S = m.secondary; const A = m.accent;
  // the emblem must stand off the badge: a primary too close to the secondary is lifted toward the accent
  if (contrast(P, S) < 2.2) P = mix(P, A, 0.45);
  const K = mix(S, '#000000', 0.6);
  return { P, S, A, K };
}

// ---------------------------------------------------------------- badge shapes (outer edge, 100×100)
const SHAPES = {
  circle: 'M50 3 A47 47 0 1 1 49.99 3 Z',
  shield: 'M50 3 L91 13 V47 C91 72 73 89 50 97 C27 89 9 72 9 47 V13 Z',
  hex: 'M50 3 L91 26.5 V73.5 L50 97 L9 73.5 V26.5 Z',
  diamond: 'M50 2 L98 50 L50 98 L2 50 Z',
  roundsquare: 'M24 5 H76 Q95 5 95 24 V76 Q95 95 76 95 H24 Q5 95 5 76 V24 Q5 5 24 5 Z',
  pennant: 'M8 6 H92 V58 L50 97 L8 58 Z',
  crest: 'M10 9 Q30 2 50 11 Q70 2 90 9 V51 C90 74 72 90 50 97 C28 90 10 74 10 51 Z',
  oval: 'M50 3 C77 3 91 24 91 50 C91 76 77 97 50 97 C23 97 9 76 9 50 C9 24 23 3 50 3 Z',
};
/** How large the emblem may be inside each shape (a diamond has the least room). */
const ROOM = { circle: 0.86, shield: 0.84, hex: 0.84, diamond: 0.7, roundsquare: 0.9, pennant: 0.8, crest: 0.84, oval: 0.84 };
const LIFT = { shield: -2, pennant: -5, crest: -1 };
const at = (k, d = '') => `transform="translate(50 50) scale(${k}) translate(-50 -50)${d}"`;

// ---------------------------------------------------------------- emblems: one per mascot (data/league.js TEAM_META.mascot)
// Each draws in a 100×100 box centred near (50, 50), within about 18–82, in P / A / K. `o` is the outline attribute string.
const E = {
  wolf: ({ P, A, K }, o) => `<circle cx="24" cy="22" r="11" fill="${A}" ${o}/>`
    + `<path d="M28 88 L30 66 L20 60 L29 55 L24 45 L33 41 L29 24 L42 35 L51 29 L63 23 L84 11 L79 22 L70 29 L82 33 L66 40 L59 46 L64 58 L56 70 L61 88 Z" fill="${P}" ${o}/>`
    + `<path d="M50 36 L58 33 L55 39 Z" fill="${K}"/><path d="M70 29 L82 33 L68 36 Z" fill="${K}" opacity=".55"/>`
    + `<path d="M33 66 L42 62 L40 74 Z M45 70 L53 66 L51 80 Z M30 50 L37 48 L34 56 Z" fill="${A}" opacity=".9"/>`,

  bear: ({ P, A, K }, o) => `<circle cx="31" cy="30" r="10" fill="${P}" ${o}/><circle cx="69" cy="30" r="10" fill="${P}" ${o}/><circle cx="31" cy="30" r="4.5" fill="${A}"/><circle cx="69" cy="30" r="4.5" fill="${A}"/>`
    + `<path d="M50 24 C70 24 80 38 80 54 C80 72 66 82 50 82 C34 82 20 72 20 54 C20 38 30 24 50 24 Z" fill="${P}" ${o}/>`
    + `<path d="M50 56 C60 56 66 62 66 69 C66 76 58 80 50 80 C42 80 34 76 34 69 C34 62 40 56 50 56 Z" fill="${A}" ${o}/>`
    + `<path d="M44 60 H56 L50 67 Z" fill="${K}"/><path d="M35 46 L44 48 L37 51 Z M65 46 L56 48 L63 51 Z" fill="${K}"/>`
    + `<path d="M40 22 L44 12 L50 20 L56 12 L60 22 Z" fill="${A}" ${o}/>`,
  nova: ({ P, A, K }, o) => `<ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke="${A}" stroke-width="4" transform="rotate(-24 50 50)"/>`
    + `<path d="M50 14 L57 41 L84 34 L61 51 L76 76 L50 60 L24 76 L39 51 L16 34 L43 41 Z" fill="${P}" ${o}/>`
    + `<circle cx="50" cy="49" r="8" fill="${A}" ${o}/><circle cx="76" cy="27" r="3.5" fill="${A}"/><circle cx="23" cy="70" r="2.5" fill="${A}"/>`,
  colossus: ({ P, A, K }, o) => `<path d="M22 82 L28 40 L36 26 L50 18 L64 26 L72 40 L78 82 Z" fill="${P}" ${o}/>`
    + `<path d="M32 46 H68 V56 H32 Z" fill="${K}"/><path d="M38 49 H46 V53 H38 Z M54 49 H62 V53 H54 Z" fill="${A}"/>`
    + `<path d="M50 18 V44 M40 64 H60 M44 70 H56" stroke="${K}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M28 40 L18 34 L22 50 Z M72 40 L82 34 L78 50 Z" fill="${A}" ${o}/>`,
  bolt: ({ P, A, K }, o) => `<path d="M58 12 L28 54 H46 L38 88 L74 42 H54 L64 12 Z" fill="${P}" ${o}/>`
    + `<path d="M16 74 Q24 68 32 74 T48 74 T64 74 T80 74 T88 72" fill="none" stroke="${A}" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M58 18 L36 50 H44" fill="none" stroke="${A}" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>`,
  rock: ({ P, A, K }, o) => `<path d="M16 84 L22 64 L36 56 L46 60 L48 84 Z M54 84 L56 60 L66 56 L80 62 L86 84 Z" fill="${P}" ${o}/>`
    + `<path d="M28 70 L36 66 M64 66 L74 72" stroke="${K}" stroke-width="2.5" stroke-linecap="round"/>`
    + `<path d="M31 16 H69 Q77 16 77 24 V42 Q77 50 69 50 H31 Q23 50 23 42 V24 Q23 16 31 16 Z" fill="${P}" ${o}/>`
    + `<path d="M40 17 V31 M51 17 V31 M62 17 V31" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/><path d="M23 38 Q36 34 52 40 Q58 44 54 48" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/>`
    + `<path d="M50 52 L46 58 M38 54 L30 50 M62 54 L70 50 M50 52 L54 58" stroke="${A}" stroke-width="3" stroke-linecap="round"/><path d="M48 66 L44 62 L50 60 Z M86 54 L92 50 L90 58 Z M12 56 L8 50 L16 52 Z" fill="${A}" ${o}/>`,

  drake: ({ P, A, K, S }, o) => `<path d="M14 86 A36 36 0 0 1 86 86 Z" fill="${A}" ${o}/><path d="M18 76 H82 M24 68 H76" stroke="${S}" stroke-width="3"/>`
    + `<path d="M16 66 L26 48 L36 40 L32 20 L45 35 L54 31 L57 14 L63 31 L75 35 L91 43 L87 50 L74 51 L84 58 L69 61 L58 67 L46 82 L36 74 Z" fill="${P}" ${o}/>`
    + `<path d="M58 39 L66 37 L63 43 Z" fill="${K}"/><circle cx="85" cy="45" r="1.6" fill="${K}"/><path d="M74 51 L84 58 L72 56 Z" fill="${K}" opacity=".6"/>`
    + `<path d="M28 56 L36 52 L34 60 Z M40 50 L48 48 L45 56 Z" fill="${A}" opacity=".85"/>`,

  blitz: ({ P, A, K }, o) => `<path d="M14 80 L26 60 H74 L86 80 Z" fill="${A}" ${o}/>`
    + `<path d="M40 14 L24 46 H38 L30 70 L52 38 H40 L48 14 Z" fill="${P}" ${o}/><path d="M66 18 L52 46 H62 L56 66 L76 40 H66 L72 18 Z" fill="${P}" ${o}/>`
    + `<path d="M78 26 H90 M80 34 H92 M82 42 H90" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`,
  royal: ({ P, A, K }, o) => `<path d="M18 70 L14 30 L32 46 L50 20 L68 46 L86 30 L82 70 Z" fill="${P}" ${o}/>`
    + `<path d="M18 70 H82 V80 H18 Z" fill="${P}" ${o}/><circle cx="14" cy="28" r="5" fill="${A}" ${o}/><circle cx="50" cy="18" r="6" fill="${A}" ${o}/><circle cx="86" cy="28" r="5" fill="${A}" ${o}/>`
    + `<path d="M44 56 L50 48 L56 56 L50 64 Z" fill="${A}" ${o}/><circle cx="30" cy="75" r="2.5" fill="${A}"/><circle cx="70" cy="75" r="2.5" fill="${A}"/>`,
  rapid: ({ P, A, K }, o) => `<path d="M14 40 C26 24 44 26 48 38 C51 48 42 54 36 48 C42 46 42 38 34 38 C26 38 22 46 22 52 Z" fill="${P}" ${o}/>`
    + `<path d="M30 62 C42 46 62 48 66 60 C69 70 60 76 54 70 C60 68 60 60 52 60 C44 60 40 68 40 74 Z" fill="${P}" ${o}/>`
    + `<path d="M52 30 C62 18 80 20 84 32 C87 42 78 48 72 42 C78 40 78 32 70 32 C62 32 58 40 58 46 Z" fill="${A}" ${o}/>`
    + `<path d="M14 84 Q30 76 46 84 T80 84" fill="none" stroke="${A}" stroke-width="4" stroke-linecap="round"/>`,
  warden: ({ P, A, K }, o) => `<path d="M50 12 L66 36 H58 L72 54 H60 L76 74 H24 L40 54 H28 L42 36 H34 Z" fill="${P}" ${o}/>`
    + `<path d="M45 74 H55 V86 H45 Z" fill="${A}" ${o}/>`
    + `<path d="M50 40 L53 47 L60 47 L54 51 L56 58 L50 54 L44 58 L46 51 L40 47 L47 47 Z" fill="${A}"/>`,
  cyclone: ({ P, A, K }, o) => `<path d="M50 50 m-30 0 a30 30 0 1 1 30 30 a22 22 0 1 0 -22 -22 a14 14 0 1 1 14 14 a7 7 0 1 0 -7 -7" fill="none" stroke="${K}" stroke-width="12" stroke-linecap="round"/>`
    + `<path d="M50 50 m-30 0 a30 30 0 1 1 30 30 a22 22 0 1 0 -22 -22 a14 14 0 1 1 14 14 a7 7 0 1 0 -7 -7" fill="none" stroke="${P}" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M76 22 L86 14 M80 30 L92 26" stroke="${A}" stroke-width="3.5" stroke-linecap="round"/>`,
  inferno: ({ P, A, K }, o) => `<path d="M50 88 C28 88 20 72 24 58 C27 48 34 44 34 32 C42 38 44 46 44 50 C46 38 52 26 50 12 C64 22 72 38 70 52 C74 48 76 42 76 36 C84 48 84 62 78 72 C72 82 62 88 50 88 Z" fill="${P}" ${o}/>`
    + `<path d="M50 84 C38 84 34 74 37 66 C40 58 46 56 46 48 C52 54 56 60 56 66 C60 62 62 58 62 54 C68 62 68 72 64 78 C60 82 56 84 50 84 Z" fill="${A}" ${o}/>`,
  tide: ({ P, A, K }, o) => `<path d="M10 80 C12 54 32 26 60 24 C80 23 92 36 90 52 C88 64 76 68 69 61 C78 57 77 45 67 44 C55 43 47 56 53 72 C40 70 24 74 10 80 Z" fill="${P}" ${o}/>`
    + `<path d="M58 30 C72 28 84 36 84 48 M48 40 C40 50 36 60 36 70" fill="none" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`
    + `<circle cx="80" cy="28" r="3" fill="${A}"/><circle cx="88" cy="36" r="2.2" fill="${A}"/><circle cx="72" cy="24" r="2" fill="${A}"/>`
    + `<path d="M64 88 V76 M64 80 L58 72 M64 82 L71 74 M76 88 V72 M76 78 L70 68 M76 76 L83 68" stroke="${K}" stroke-width="6" stroke-linecap="round"/><path d="M64 88 V76 M64 80 L58 72 M64 82 L71 74 M76 88 V72 M76 78 L70 68 M76 76 L83 68" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`,

  charger: ({ P, A, K }, o) => `<path d="M36 26 C42 20 58 20 64 26 L70 50 C70 64 62 80 50 82 C38 80 30 64 30 50 Z" fill="${P}" ${o}/>`
    + `<path d="M36 28 C22 18 10 28 14 42 C17 52 28 52 30 44 C24 44 22 36 28 34 C32 33 34 36 34 40 Z" fill="${A}" ${o}/>`
    + `<path d="M64 28 C78 18 90 28 86 42 C83 52 72 52 70 44 C76 44 78 36 72 34 C68 33 66 36 66 40 Z" fill="${A}" ${o}/>`
    + `<path d="M40 50 L46 52 L41 55 Z M60 50 L54 52 L59 55 Z" fill="${K}"/><path d="M42 72 H58" stroke="${K}" stroke-width="3" stroke-linecap="round"/><path d="M44 66 L46 68 M56 66 L54 68" stroke="${K}" stroke-width="2.5" stroke-linecap="round"/>`,
  mystic: ({ P, A, K }, o) => `<path d="M50 50 C38 30 22 26 12 32 C24 34 32 40 36 50 Z M50 50 C62 30 78 26 88 32 C76 34 68 40 64 50 Z M50 50 C46 30 52 16 60 12 C56 24 56 36 50 50 Z" fill="${A}" ${o}/>`
    + `<path d="M18 62 C30 46 70 46 82 62 C70 78 30 78 18 62 Z" fill="${P}" ${o}/><circle cx="50" cy="62" r="9" fill="${A}" ${o}/><circle cx="50" cy="62" r="4" fill="${K}"/>`
    + `<path d="M50 74 V88" stroke="${A}" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="88" r="2.5" fill="${A}"/>`,
  bastion: ({ P, A, K }, o) => `<path d="M24 84 V34 H32 V24 H40 V34 H46 V24 H54 V34 H60 V24 H68 V34 H76 V84 Z" fill="${P}" ${o}/>`
    + `<path d="M42 84 V64 C42 56 58 56 58 64 V84 Z" fill="${K}"/><path d="M30 44 H38 V52 H30 Z M62 44 H70 V52 H62 Z" fill="${A}"/>`
    + `<path d="M24 60 H76" stroke="${A}" stroke-width="3"/><path d="M50 12 V24 M50 12 L62 16 L50 20" fill="${A}" stroke="${A}" stroke-width="2.5" stroke-linejoin="round"/>`,
  ghost: ({ P, A, K }, o) => `<path d="M24 84 V46 C24 28 36 16 50 16 C64 16 76 28 76 46 V84 L68 76 L60 84 L50 76 L40 84 L32 76 Z" fill="${P}" ${o}/>`
    + `<path d="M34 44 C34 38 44 38 44 44 C44 52 34 52 34 44 Z M56 44 C56 38 66 38 66 44 C66 52 56 52 56 44 Z" fill="${K}"/>`
    + `<path d="M42 62 C44 58 56 58 58 62 C56 68 44 68 42 62 Z" fill="${K}"/><circle cx="39" cy="43" r="2" fill="${A}"/><circle cx="61" cy="43" r="2" fill="${A}"/>`
    + `<path d="M80 30 Q88 36 84 46 M16 30 Q8 36 12 46" fill="none" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`,
  anchor: ({ P, A, K }, o) => `<path d="M46 26 H54 V74 C62 74 70 70 74 62 L68 60 L80 52 L82 66 L77 64 C72 76 62 84 50 84 C38 84 28 76 23 64 L18 66 L20 52 L32 60 L26 62 C30 70 38 74 46 74 Z" fill="${P}" ${o}/>`
    + `<circle cx="50" cy="22" r="8" fill="none" stroke="${K}" stroke-width="8"/><circle cx="50" cy="22" r="8" fill="none" stroke="${P}" stroke-width="4"/>`
    + `<path d="M34 38 H66" stroke="${K}" stroke-width="9" stroke-linecap="round"/><path d="M34 38 H66" stroke="${A}" stroke-width="5" stroke-linecap="round"/>`,
  cinder: ({ P, A, K }, o) => `<path d="M50 30 L72 42 V66 L50 78 L28 66 V42 Z" fill="${P}" ${o}/>`
    + `<path d="M50 30 V54 L72 42 M50 54 L28 42 M50 54 V78" fill="none" stroke="${K}" stroke-width="2.5"/>`
    + `<path d="M36 50 L44 56 L40 62 M58 58 L64 54 L62 64" fill="none" stroke="${A}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M50 12 L53 20 L50 24 L47 20 Z M30 18 L33 24 L30 27 L27 24 Z M70 16 L73 23 L70 26 L67 23 Z M20 34 L23 39 L20 42 L17 39 Z M80 32 L83 37 L80 40 L77 37 Z" fill="${A}" ${o}/>`,
  beast: ({ P, A, K }, o) => `<path d="M24 30 L14 14 L34 24 Z M76 30 L86 14 L66 24 Z" fill="${A}" ${o}/>`
    + `<path d="M50 20 C70 20 80 34 80 50 C80 60 76 66 72 70 L62 84 H38 L28 70 C24 66 20 60 20 50 C20 34 30 20 50 20 Z" fill="${P}" ${o}/>`
    + `<path d="M30 44 L44 50 L32 54 Z M70 44 L56 50 L68 54 Z" fill="${A}" stroke="${K}" stroke-width="2"/>`
    + `<path d="M36 66 H64 L58 78 H42 Z" fill="${K}"/><path d="M40 66 L43 73 L46 66 M54 66 L57 73 L60 66" fill="${A}"/><path d="M46 58 L50 62 L54 58 Z" fill="${K}"/>`,
  gator: ({ P, A, K }, o) => `<path d="M12 56 C14 46 26 42 42 42 L46 32 C50 28 58 28 62 32 L66 40 C78 42 88 46 90 54 C88 62 78 66 66 66 L18 66 C14 64 12 60 12 56 Z" fill="${P}" ${o}/>`
    + `<path d="M18 56 H86" stroke="${K}" stroke-width="2.5"/><path d="M22 56 L25 61 L28 56 L31 61 L34 56 L37 61 L40 56 L43 61 L46 56 L49 61 L52 56" fill="${A}" stroke="${K}" stroke-width="1"/>`
    + `<circle cx="56" cy="38" r="4" fill="${A}" ${o}/><path d="M55 35 V41" stroke="${K}" stroke-width="2"/>`
    + `<path d="M14 78 Q26 72 38 78 T62 78 T86 78" fill="none" stroke="${A}" stroke-width="3.5" stroke-linecap="round"/>`,
  solar: ({ P, A, K }, o) => `<g fill="${A}" ${o}>${Array.from({ length: 12 }, (_, i) => `<path d="M48 8 L52 8 L54 22 L46 22 Z" transform="rotate(${i * 30} 50 50)"/>`).join('')}</g>`
    + `<circle cx="50" cy="50" r="24" fill="${P}" ${o}/><circle cx="50" cy="50" r="14" fill="${A}" opacity=".9"/><circle cx="50" cy="50" r="7" fill="${P}"/>`,
  wyrm: ({ P, A, K }, o) => `<path d="M22 86 C10 74 18 58 34 60 C52 62 60 54 56 44 C52 34 36 38 34 28 C32 18 44 10 58 14 C70 17 78 24 78 32" fill="none" stroke="${K}" stroke-width="19" stroke-linecap="round"/>`
    + `<path d="M22 86 C10 74 18 58 34 60 C52 62 60 54 56 44 C52 34 36 38 34 28 C32 18 44 10 58 14 C70 17 78 24 78 32" fill="none" stroke="${P}" stroke-width="13" stroke-linecap="round"/>`
    + `<path d="M22 86 C10 74 18 58 34 60 C52 62 60 54 56 44" fill="none" stroke="${A}" stroke-width="3" stroke-dasharray="3 5" stroke-linecap="round"/>`
    + `<path d="M68 26 L94 34 L86 46 L70 44 Z" fill="${P}" ${o}/><path d="M74 26 L76 12 L82 28 Z" fill="${A}" ${o}/><circle cx="80" cy="34" r="2.6" fill="${K}"/><path d="M86 46 L92 52 L82 46 Z" fill="${A}"/>`
    + `<path d="M58 52 L78 58 L66 66 Z" fill="${A}" ${o}/>`,

  root: ({ P, A, K }, o) => `<path d="M50 52 C30 52 18 44 18 32 C18 20 30 14 40 18 C42 10 58 10 60 18 C70 14 82 20 82 32 C82 44 70 52 50 52 Z" fill="${P}" ${o}/>`
    + `<path d="M46 50 V64 C40 70 30 72 22 84 M54 50 V64 C60 70 70 72 78 84 M50 62 V86 M46 70 C40 76 38 80 36 86 M54 70 C60 76 62 80 64 86" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M46 50 V64 C40 70 30 72 22 84 M54 50 V64 C60 70 70 72 78 84 M50 62 V86 M46 70 C40 76 38 80 36 86 M54 70 C60 76 62 80 64 86" fill="none" stroke="${A}" stroke-width="3.5" stroke-linecap="round"/>`
    + `<path d="M28 30 L22 26 L30 26 Z M70 28 L78 24 L74 32 Z M50 22 L48 14 L54 20 Z" fill="${A}"/>`,
  arcanist: ({ P, A, K }, o) => `<path d="M12 78 Q50 64 88 78 L84 86 Q50 74 16 86 Z" fill="${P}" ${o}/>`
    + `<path d="M24 76 L44 14 C46 8 56 8 58 16 L68 40 L82 32 L74 76 Z" fill="${P}" ${o}/>`
    + `<path d="M28 66 Q50 58 72 66" fill="none" stroke="${A}" stroke-width="5"/>`
    + `<path d="M50 30 L53 38 L61 38 L55 43 L57 51 L50 46 L43 51 L45 43 L39 38 L47 38 Z" fill="${A}"/><circle cx="82" cy="30" r="5" fill="${A}" ${o}/><circle cx="20" cy="34" r="2.5" fill="${A}"/><circle cx="28" cy="22" r="1.8" fill="${A}"/>`,

  quake: ({ P, A, K }, o) => `<path d="M12 62 H88 V82 H12 Z" fill="${P}" ${o}/><path d="M44 62 L40 70 L48 74 L42 82 M60 62 L64 72 L58 82" fill="none" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M12 44 L24 44 L30 26 L38 58 L46 18 L54 54 L60 34 L66 44 L88 44" fill="none" stroke="${K}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="M12 44 L24 44 L30 26 L38 58 L46 18 L54 54 L60 34 L66 44 L88 44" fill="none" stroke="${A}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`,
  wisp: ({ P, A, K }, o) => `<path d="M50 86 C34 86 26 74 28 62 C30 50 40 44 42 32 C46 40 46 46 46 50 C50 40 56 28 54 14 C66 26 74 42 72 58 C70 74 62 86 50 86 Z" fill="${P}" ${o}/>`
    + `<circle cx="44" cy="64" r="4" fill="${K}"/><circle cx="56" cy="64" r="4" fill="${K}"/><circle cx="45" cy="63" r="1.4" fill="${A}"/><circle cx="57" cy="63" r="1.4" fill="${A}"/>`
    + `<path d="M18 86 C20 70 22 60 16 48 M18 74 L10 70 M19 66 L12 60 M17 56 L11 50 M18 76 L25 70 M19 66 L26 62" fill="none" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M82 86 C80 70 78 60 84 48 M82 74 L90 70 M81 66 L88 60 M83 56 L89 50 M82 76 L75 70 M81 66 L74 62" fill="none" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`,
  seer: ({ P, A, K }, o) => `<g stroke="${A}" stroke-width="3.5" stroke-linecap="round">${[-60, -30, 0, 30, 60].map((d) => `<path d="M50 30 L50 14" transform="rotate(${d} 50 50)"/>`).join('')}</g>`
    + `<path d="M12 54 C26 32 74 32 88 54 C74 76 26 76 12 54 Z" fill="${P}" ${o}/>`
    + `<circle cx="50" cy="54" r="14" fill="${A}" ${o}/><circle cx="50" cy="54" r="7" fill="${K}"/><circle cx="53" cy="51" r="2.5" fill="${A}"/>`
    + `<path d="M44 82 L50 88 L56 82 L50 76 Z" fill="${A}" ${o}/>`,
  shark: ({ P, A, K }, o) => `<path d="M10 56 C24 40 46 34 66 38 L60 18 L80 42 C86 46 90 52 90 56 C84 66 66 72 46 70 C32 69 18 64 10 56 Z" fill="${P}" ${o}/>`
    + `<path d="M22 60 C34 62 52 62 70 58 L66 66 C50 70 32 68 22 60 Z" fill="${K}"/>`
    + `<path d="M28 61 L31 65 L34 61 L37 65 L40 61 L43 65 L46 61 L49 65 L52 61 L55 65 L58 61 L61 64 L64 60" fill="${A}" stroke="${K}" stroke-width=".8"/>`
    + `<circle cx="74" cy="50" r="3" fill="${K}"/><path d="M48 46 C52 50 52 54 48 58" fill="none" stroke="${K}" stroke-width="2"/>`
    + `<path d="M14 82 Q26 76 38 82 T62 82 T86 82" fill="none" stroke="${A}" stroke-width="3.5" stroke-linecap="round"/>`,
  veil: ({ P, A, K }, o) => `<path d="M50 14 C66 14 76 30 76 48 L84 86 H16 L24 48 C24 30 34 14 50 14 Z" fill="${P}" ${o}/>`
    + `<path d="M50 26 C60 26 66 36 66 48 L68 60 H32 L34 48 C34 36 40 26 50 26 Z" fill="${K}"/><path d="M41 46 H47 M53 46 H59" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M30 72 C40 66 46 78 56 72 C64 68 70 76 76 72 M24 80 C34 76 44 84 54 80 C62 76 70 84 80 80" fill="none" stroke="${A}" stroke-width="3" stroke-linecap="round" opacity=".9"/>`,
  pirate: ({ P, A, K }, o) => `<path d="M18 76 L82 30 M18 30 L82 76" stroke="${K}" stroke-width="11" stroke-linecap="round"/><path d="M18 76 L82 30 M18 30 L82 76" stroke="${A}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M50 28 C66 28 74 38 74 50 C74 58 70 62 66 64 V72 H34 V64 C30 62 26 58 26 50 C26 38 34 28 50 28 Z" fill="${P}" ${o}/>`
    + `<path d="M34 48 C34 42 44 42 44 48 C44 54 34 54 34 48 Z M56 48 C56 42 66 42 66 48 C66 54 56 54 56 48 Z" fill="${K}"/><path d="M47 58 L50 54 L53 58 Z" fill="${K}"/><path d="M42 66 V72 M50 66 V72 M58 66 V72" stroke="${K}" stroke-width="2"/>`
    + `<path d="M16 34 C30 14 70 14 84 34 C70 28 30 28 16 34 Z" fill="${K}" ${o}/><path d="M30 26 C40 20 60 20 70 26" fill="none" stroke="${A}" stroke-width="2.5"/>`,
};
/** Small placement corrections for emblems that reach toward one side of their badge. */
const NUDGE = { wyrm: ' translate(10 8) scale(0.86)', rock: ' translate(4 4) scale(0.92)' };
/** Every club's emblem name (the mascot word in data/league.js). */
export const EMBLEMS = Object.freeze(Object.keys(E));

/**
 * A club's logo as the inside of a 100×100 svg (no <svg> wrapper): badge, ring and emblem. `ids` are unique per club so the
 * same page can hold all 32.
 */
export function logoBody(club) {
  const m = TEAM_META[club]; const c = logoColors(club); if (!m || !c) return '';
  const shape = BADGES[club] || 'circle'; const d = SHAPES[shape]; const k = ROOM[shape] || 0.84; const lift = LIFT[shape] || 0;
  const o = `stroke="${c.K}" stroke-width="2.6" stroke-linejoin="round"`;
  const emblem = (E[m.mascot] || E.nova)(c, o); const nudge = NUDGE[m.mascot] || '';
  return `<path d="${d}" fill="${c.K}"/><path d="${d}" fill="${c.S}" ${at(0.9)}/><path d="${d}" fill="none" stroke="${c.P}" stroke-width="3.2" ${at(0.8)}/>`
    + `<g transform="translate(50 ${50 + lift}) scale(${k * 0.95}) translate(-50 -50)${nudge}">${emblem}</g>`;
}
/** A club's logo as an inline svg, `size` css pixels square. */
export function teamLogo(club, size = 40, { cls = 'team-logo', title = null } = {}) {
  const body = logoBody(club); if (!body) return '';
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${title || club} logo" data-club="${club}">${body}</svg>`;
}
/** A club's logo as an svg <symbol> for the field: { id, symbol }. One per club for the page's lifetime. */
const symbols = new Map();
export function teamLogoSymbol(club) {
  if (!TEAM_META[club]) return null; let e = symbols.get(club);
  if (!e) { const id = `tl-${TEAM_META[club].abbr}`; e = { id, symbol: `<symbol id="${id}" viewBox="0 0 100 100">${logoBody(club)}</symbol>` }; symbols.set(club, e); }
  return e;
}
