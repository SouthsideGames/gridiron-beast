// Sprite generator v2: the 60 appearance features, face and marking controls (Beast Dex SPRITE_GENERATOR_BRIEF.md).
// Appearance only: no feature carries damage, statuses, collision, buffs or targeting. Features attach to the anchors each
// structure returns (head, eyes, mouth, back, belly, tail, feet, hands) after the proportion controls have moved them, and follow
// the structure's view: side views face left (or right when flagged), front views place pairs symmetrically, and the dorsal
// insect places head features at the top of the frame and tails at the bottom.
//
// Layering: "behind" features fill only empty cells, so the body occludes them; "front" features paint over the body. Built-in
// anatomy is configured rather than duplicated: a shell, beak or pincers feature on a structure that already has one sets its
// variant; the insect's own antennae take the antennae variant at their tips. A feature that changes no pixel is reported by
// recipeDiagnostics (sprite-gen.js) instead of being credited as visible.
import { installFinisher, installFeatureCompat, installBuiltInConfig, STRUCTURES } from './sprite-gen.js';

const V3 = (a, b, c) => Object.freeze([a, b, c]);
const TAIL_CURVES = V3('straight', 'raised', 'curled');
const WING_VARIANTS = V3('folded', 'spread', 'raised');

/** id → { group, label, layer, variants?, needs?, draw(c, k) } where k = { a, dir, view, variant, s, X }. */
export const FEATURES = {};
const F = (id, group, label, layer, draw, opt = {}) => { FEATURES[id] = Object.freeze({ id, group, label, layer, draw, ...opt }); };

// ---------------------------------------------------------------- geometry helpers
const sidesOf = (k) => (k.dir ? [-k.dir] : [-1, 1]); // side view: the far-from-face side (the visible back of the head)
const headTop = (k) => { const [hx, hy, rx, ry] = k.a.head; return [hx, hy - ry, rx, ry, hx, hy]; };
const backPt = (k) => k.a.back || [k.a.head[0], k.a.head[1] - k.a.head[3]];
const tailBase = (k) => k.a.tail || [12, 12];
const tailDir = (k) => (k.view === 'dorsal' ? [0, 1] : k.dir ? [-k.dir, 0] : [1, 0]);

// ---------------------------------------------------------------- head
F('ears', 'Head', 'Ears', 'front', (c, k) => { const [hx, top, rx] = headTop(k);
  for (const s of sidesOf(k)) { const bx = hx + s * rx * (k.dir ? 0.2 : 0.6);
    if (k.variant === 'rounded') c.ellipse(bx + s * 0.4, top - 0.4, 1.1, 1.3, 'M');
    else if (k.variant === 'drooping') c.oval(hx + s * (rx + 0.3), k.a.head[1] - 0.2, 0.8, 1.9, s * -18, 'M');
    else c.poly([[bx - s * 0.9, top + 0.8], [bx + s * 0.5, top - 2.4], [bx + s * 1.3, top + 0.9]], 'M'); } }, { variants: V3('pointed', 'rounded', 'drooping') });
F('horns', 'Head', 'Horns', 'front', (c, k) => { const [hx, top, rx] = headTop(k);
  for (const s of sidesOf(k)) { const bx = hx + s * rx * (k.dir ? 0.1 : 0.45);
    if (k.variant === 'swept') c.poly([[bx - s * 0.5, top + 0.6], [bx + s * 2.2, top - 2], [bx + s * 0.8, top + 0.8]], 'W');
    else if (k.variant === 'curled') { c.capsule(bx, top + 0.4, bx + s * 1, top - 1.6, 0.45, 'W'); c.capsule(bx + s * 1, top - 1.6, bx + s * 2.2, top - 0.8, 0.4, 'W'); }
    else c.poly([[bx - 0.6, top + 0.6], [bx, top - 1.8], [bx + 0.6, top + 0.6]], 'W'); } }, { variants: V3('short', 'swept', 'curled') });
F('antlers', 'Head', 'Antlers', 'front', (c, k) => { const [hx, top, rx] = headTop(k);
  for (const s of sidesOf(k)) { const bx = hx + s * rx * (k.dir ? 0.1 : 0.4); c.capsule(bx, top + 0.4, bx + s * 0.8, top - 3, 0.35, 'Wd');
    if (k.variant === 'palmate') c.ellipse(bx + s * 1.4, top - 2.6, 1.4, 0.9, 'Wd');
    else { c.capsule(bx + s * 0.4, top - 1.2, bx + s * 2, top - 2.2, 0.35, 'Wd'); if (k.variant === 'branching') { c.capsule(bx + s * 0.7, top - 2.4, bx - s * 0.6, top - 3.6, 0.35, 'Wd'); c.capsule(bx + s * 1.6, top - 1.9, bx + s * 2.4, top - 3.4, 0.35, 'Wd'); } } } },
  { variants: V3('forked', 'branching', 'palmate') });
F('crest', 'Head', 'Crest', 'front', (c, k) => { const [hx, top] = headTop(k); const x = hx - (k.dir || 0) * 0.6;
  if (k.variant === 'fan') c.ellipse(x, top - 0.4, 1.8, 1.4, 'A', { keep: true });
  else if (k.variant === 'plume') c.chain([[x, top + 0.2, 0.6], [x - (k.dir || 1) * 1.4, top - 1.8, 0.5], [x - (k.dir || 1) * 2.8, top - 2.2, 0.35]], 'A');
  else c.poly([[x - 0.8, top + 0.6], [x, top - 2.6], [x + 0.8, top + 0.6]], 'A'); }, { variants: V3('spike', 'fan', 'plume') });
F('frill', 'Head', 'Frill', 'behind', (c, k) => { const [hx, hy, rx, ry] = k.a.head; const x = hx - (k.dir || 0) * rx * 0.8;
  if (k.variant === 'spiked') { c.ellipse(x, hy - ry * 0.3, rx + 1.2, ry + 0.6, 'A', { keep: true }); for (const dx of [-1, 0, 1]) c.poly([[x + dx * (rx + 0.6) - 0.7, hy - ry], [x + dx * (rx + 1.6), hy - ry - 2], [x + dx * (rx + 0.6) + 0.7, hy - ry]], 'A', { keep: true }); }
  else if (k.variant === 'round') c.ellipse(x, hy - 0.3, rx + 1.6, ry + 1.4, 'A', { keep: true });
  else c.ellipse(x, hy - ry * 0.4, rx + 2.2, ry + 1, 'A', { keep: true }); }, { variants: V3('fan', 'spiked', 'round') });
F('antennae', 'Head', 'Antennae', 'front', (c, k) => {
  const tips = k.a.antennaTips || sidesOf(k).map((s) => { const [hx, top, rx] = headTop(k); const bx = hx + s * rx * 0.4; c.capsule(bx, top + 0.4, bx + s * 0.9, top - 2.6, 0.3, 'K'); return [bx + s * 0.9, top - 2.6]; });
  for (const [x, y] of tips) { const s = x < 8 ? -1 : 1;
    if (k.variant === 'clubbed') c.ellipse(x, y, 0.9, 0.9, 'G'); else if (k.variant === 'curled') { c.px(x + s * 0.8, y - 0.4, 'K'); c.px(x + s * 1.2, y + 0.4, 'K'); } else c.px(x, y - 0.6, 'K'); } },
  { variants: V3('straight', 'curled', 'clubbed') });

// ---------------------------------------------------------------- face
F('muzzle', 'Face', 'Muzzle', 'front', (c, k) => { const [hx, hy, rx, ry] = k.a.head; if (k.dir) c.ellipse(hx + k.dir * (rx * 0.7), hy + ry * 0.4, 1.5, Math.max(0.8, ry * 0.5), 'B'); else c.ellipse(hx, hy + ry * 0.55, Math.max(1.1, rx * 0.45), Math.max(0.8, ry * 0.35), 'B'); });
F('beak', 'Face', 'Beak', 'front', (c, k) => { const [hx, hy, rx, ry] = k.a.head; const L = k.variant === 'long' ? 3 : 2;
  if (k.dir) { c.poly([[hx + k.dir * rx * 0.6, hy - 0.3], [hx + k.dir * (rx + L), hy + 0.5], [hx + k.dir * rx * 0.6, hy + 1]], 'W'); if (k.variant === 'hooked') c.px(hx + k.dir * (rx + L - 0.4), hy + 1.2, 'W'); }
  else { c.poly([[hx - 1.2, hy + ry * 0.25], [hx + 1.2, hy + ry * 0.25], [hx, hy + ry * 0.25 + L * 0.9]], 'W'); if (k.variant === 'hooked') c.px(hx + 0.6, hy + ry * 0.3 + L * 0.7, 'W'); } }, { variants: V3('short', 'long', 'hooked') });
F('tusks', 'Face', 'Tusks', 'front', (c, k) => { const [mx, my] = k.a.mouth || [k.a.head[0], k.a.head[1] + 1];
  for (const s of k.dir ? [k.dir] : [-1, 1]) { const x = k.dir ? mx + k.dir * 0.2 : mx + s * 1.2; c.capsule(x, my, x + (k.dir ? k.dir * 0.4 : s * 0.4), my + 1.6, 0.4, 'W'); } });
F('fangs', 'Face', 'Fangs', 'front', (c, k) => { const [mx, my] = k.a.mouth || [k.a.head[0], k.a.head[1] + 1]; for (const dx of k.dir ? [0.4] : [-0.6, 0.6]) c.px(mx + dx, my + 0.6, 'W'); });
F('whiskers', 'Face', 'Whiskers', 'front', (c, k) => { const [hx, hy, rx] = k.a.head;
  for (const s of k.dir ? [k.dir] : [-1, 1]) { c.capsule(hx + s * rx * 0.7, hy + 0.5, hx + s * (rx + 1.6), hy + 0.2, 0.3, 'W'); c.capsule(hx + s * rx * 0.7, hy + 1.1, hx + s * (rx + 1.6), hy + 1.5, 0.3, 'W'); } });
F('brows', 'Face', 'Brows', 'front', (c, k) => { for (const [ex, ey] of k.a.eyes || []) c.capsule(ex - 0.6, ey - 1.2, ex + 0.6, ey - 1.5, 0.3, 'K'); }, { needsEyes: true });

// ---------------------------------------------------------------- back
F('mane', 'Back', 'Mane', 'behind', (c, k) => { const [hx, hy, rx, ry] = k.a.head; if (k.dir) c.ellipse(hx - k.dir * rx * 0.7, hy + 0.4, rx * 0.9, ry + 1.4, 'A', { keep: true }); else c.ellipse(hx, hy + 0.5, rx + 1.4, ry + 1.3, 'A', { keep: true }); });
F('ridge', 'Back', 'Ridge', 'front', (c, k) => { const [bx, by] = backPt(k); for (let i = -1; i <= 1; i++) c.poly([[bx + i * 1.6 - 0.6, by + 0.6], [bx + i * 1.6, by - 0.8], [bx + i * 1.6 + 0.6, by + 0.6]], 'A'); });
F('spines', 'Back', 'Spines', 'front', (c, k) => { const [bx, by] = backPt(k); for (let i = -1; i <= 1; i++) c.poly([[bx + i * 1.8 - 0.6, by + 0.8], [bx + i * 1.8 + (k.dir ? -k.dir * 0.6 : 0), by - 2.2 + Math.abs(i) * 0.6], [bx + i * 1.8 + 0.6, by + 0.8]], 'W'); });
F('dorsal_fin', 'Back', 'Dorsal fin', 'front', (c, k) => { const [bx, by] = backPt(k); const s = k.dir ? -k.dir : 1; c.poly([[bx - s * 1.4, by + 0.8], [bx + s * 0.8, by - 3], [bx + s * 1.6, by + 0.8]], 'A'); });
F('hump', 'Back', 'Hump', 'front', (c, k) => { const [bx, by] = backPt(k); c.ellipse(bx, by - 0.2, 1.8, 1.6, 'M'); c.px(bx, by - 1, 'Ml'); });
F('shell', 'Back', 'Shell', 'front', (c, k) => { const [bx, by] = backPt(k); const ry = 2;
  if (k.variant === 'angular') c.poly([[bx - 3, by + 1.6], [bx - 2, by - 1.2], [bx + 0.4, by - 1.8], [bx + 2.4, by - 0.8], [bx + 3, by + 1.6]], 'A');
  else c.ellipse(bx, by + 0.4, 3, ry, 'A');
  if (k.variant === 'ridged') for (const dx of [-1.6, 0, 1.6]) c.px(bx + dx, by - 1.8, 'Ad'); else c.px(bx, by, 'Ad'); }, { variants: V3('smooth', 'ridged', 'angular') });

// ---------------------------------------------------------------- limbs
const feetOf = (k) => { const out = []; for (const [x, y] of k.a.feet || []) if (!out.some(([ox]) => Math.abs(ox - x) < 1)) out.push([x, y]); return out; };
F('claws', 'Limbs', 'Claws', 'front', (c, k) => { const pts = [...feetOf(k), ...(k.a.hands || [])]; for (const [x, y] of pts) { const s = k.dir || Math.sign(x - 8) || 1; const yy = Math.min(15, y);
  if (k.variant === 'large') c.poly([[x, yy - 0.8], [x + s * 1.8, yy + 0.2], [x, yy + 0.4]], 'W'); else if (k.variant === 'hooked') { c.px(x + s * 0.8, yy, 'W'); c.px(x + s * 1.2, yy - 0.8, 'W'); } else { c.px(x + s * 0.8, yy, 'W'); c.px(x + s * 0.8, yy - 0.8, 'W'); } } }, { variants: V3('straight', 'hooked', 'large'), needs: 'feetOrHands' });
F('hooves', 'Limbs', 'Hooves', 'front', (c, k) => { for (const [x] of feetOf(k)) { c.rect(x - 0.6, 14, x + 0.6, 15, 'K'); c.px(x, 14, 'Wd'); } }, { needs: 'feet' });
F('paws', 'Limbs', 'Paws', 'front', (c, k) => { for (const [x] of feetOf(k)) { c.ellipse(x + (k.dir || 0) * 0.3, 14.8, 1.2, 0.8, 'M'); c.px(x + (k.dir || 0) * 0.8, 15, 'B'); } }, { needs: 'feet' });
F('pincers', 'Limbs', 'Pincers', 'front', (c, k) => { for (const [x, y] of k.a.hands || []) { const s = Math.sign(x - 8) || 1; const R = k.variant === 'large' ? 1.5 : 1.1;
  c.ellipse(x, y, R, R * 0.9, 'A'); if (k.variant !== 'closed') c.poly([[x, y - R * 0.6], [x + s * 1.6, y - R * 1.8], [x + s * 1.1, y - 0.2]], 'A'); else c.px(x, y - R * 0.6, 'Ad'); } }, { variants: V3('open', 'closed', 'large'), needs: 'hands' });
F('flippers', 'Limbs', 'Flippers', 'front', (c, k) => { const [ux, uy] = k.a.belly || backPt(k); if (k.dir) c.oval(ux + k.dir * 1.2, uy + 0.8, 2.2, 0.9, k.dir * 25, 'A'); else for (const s of [-1, 1]) c.oval(ux + s * 4, uy - 0.6, 0.9, 2.2, s * 35, 'A'); });
F('webbed_feet', 'Limbs', 'Webbed feet', 'front', (c, k) => { for (const [x] of feetOf(k)) { const s = k.dir || Math.sign(x - 8) || 1; c.poly([[x - s * 0.4, 14.2], [x + s * 2, 15.4], [x - s * 0.8, 15.4]], 'A'); } }, { needs: 'feet' });

// ---------------------------------------------------------------- tails (the tailCurve control or the feature variant sets the curve)
const tailPath = (k, len = 3.6) => { const [x, y] = tailBase(k); const [dx, dy] = tailDir(k); let curve = k.variant || k.X.tailCurve || 'straight';
  // Bounded placement: a tail never runs past the frame. Room behind the base keeps a 1.6 margin for the tip (tuft, club, fin);
  // with too little room behind, a straight tail grows upward instead (an authored adaptation, documented, not a silent clip).
  const tipM = 1.6; const room = (dx > 0 ? 15 - x : dx < 0 ? x - 1 : 14 - y) - tipM, up = y - 1 - tipM;
  if (k.view === 'dorsal') { const L = Math.min(2.4, Math.max(1, room)); return curve === 'curled' ? [[x, y, 0.8], [x + 1.2, y + L * 0.6, 0.6], [x + 0.4, y + L, 0.45]] : curve === 'raised' ? [[x, y, 0.8], [x - 1, y + L * 0.6, 0.6], [x - 2, y + L, 0.45]] : [[x, y, 0.8], [x, y + L * 0.6, 0.6], [x, y + L, 0.45]]; }
  const ex = dx || 1; let L = len * k.X.tail;
  if (curve === 'straight' && room < 1.4) curve = 'raised';
  if (curve === 'raised') { const Lr = Math.min(L, Math.max(1.2, up)); const reach = Math.max(0, Math.min(Lr * 0.6, room)); return [[x, y, 0.8], [x + ex * reach * 0.6, y - Lr * 0.5, 0.6], [x + ex * reach, y - Lr, 0.45]]; }
  if (curve === 'curled') { const Lc = Math.min(L, Math.max(1.4, Math.min(room / 0.6, up))); return [[x, y, 0.8], [x + ex * Lc * 0.6, y - Lc * 0.4, 0.6], [x + ex * Lc * 0.4, y - Lc * 0.9, 0.5], [x - ex * 0.2, y - Lc * 0.7, 0.45]]; }
  L = Math.min(L, room); return [[x, y, 0.8], [x + ex * L * 0.6, y + 0.2, 0.6], [x + ex * L, y - 0.2, 0.45]]; };
const tailChain = (c, k, pts, code = 'M') => c.chain(pts.map(([x, y, r]) => [x, y, r * k.X.tailThick]), code, k.view === 'front' ? { keep: true } : undefined);
const tip = (pts) => pts[pts.length - 1];
F('tufted_tail', 'Tails', 'Tufted tail', 'behind', (c, k) => { const p = tailPath(k); tailChain(c, k, p); const [x, y] = tip(p); c.ellipse(x, y, 1.2, 1.1, 'A'); }, { variants: TAIL_CURVES, tail: true });
F('paddle_tail', 'Tails', 'Paddle tail', 'behind', (c, k) => { const p = tailPath(k, 2.6); tailChain(c, k, p); const [x, y] = tip(p); const [dx] = tailDir(k); c.oval(x + (dx || 0) * 0.8, y, 1.8, 1, dx ? 0 : 90, 'A'); }, { variants: TAIL_CURVES, tail: true });
// a curled tail is always curled; its variants are the curl's form: a loose curl, a tight coil (a short curl wound into a knob) or a raised curl
F('curled_tail', 'Tails', 'Curled tail', 'behind', (c, k) => { const v = k.variant || 'loose';
  const p = tailPath({ ...k, variant: v === 'raised' ? 'raised' : 'curled' }, v === 'tight' ? 2.4 : 3.4); tailChain(c, k, p);
  if (v === 'tight') { const [x, y] = tip(p); c.ellipse(x, y, 1.1, 1.1, 'M'); c.px(x, y, 'Md'); }
  if (v === 'raised') { const [x, y] = tip(p); const [dx] = tailDir(k); c.capsule(x, y, x - (dx || 1) * 1.2, y + 0.4, 0.45, 'M'); } }, { variants: V3('loose', 'tight', 'raised'), tail: true });
F('club_tail', 'Tails', 'Club tail', 'behind', (c, k) => { const p = tailPath(k, 3.2); tailChain(c, k, p); const [x, y] = tip(p); c.ellipse(x, y, 1.4, 1.3, 'A'); c.px(x, y - 1, 'W'); }, { variants: TAIL_CURVES, tail: true });
F('forked_tail', 'Tails', 'Forked tail', 'behind', (c, k) => { const p = tailPath(k, 3); tailChain(c, k, p); const [x, y] = tip(p); const [dx, dy] = tailDir(k); const fx = dx || 0.6, fy = dy || 0;
  c.capsule(x, y, x + fx * 1.6 - fy, y - 1.2 + fy * 1.6, 0.35, 'M'); c.capsule(x, y, x + fx * 1.6 + fy, y + 1.2 + fy * 1.6, 0.35, 'M'); }, { variants: TAIL_CURVES, tail: true });
F('finned_tail', 'Tails', 'Finned tail', 'behind', (c, k) => { const p = tailPath(k, 3); tailChain(c, k, p); const [x, y] = tip(p); const [dx] = tailDir(k); const s = dx || 1; c.poly([[x - s * 0.4, y], [x + s * 1.6, y - 1.8], [x + s * 1.6, y + 1.8]], 'A'); }, { variants: TAIL_CURVES, tail: true });

// ---------------------------------------------------------------- wings (behind the body; folded | spread | raised)
const wingPair = (k) => (k.dir ? [-k.dir] : [-1, 1]);
const wingRoot = (k) => { const [bx, by] = backPt(k); return k.view === 'dorsal' ? [8, by - 1.5] : [bx, by + 1]; };
const wingShape = (c, k, draw) => { const [rx, ry] = wingRoot(k); const span = k.X.wing; const v = k.variant || k.X.wingFold === 'folded' && 'folded' || 'spread'; k.over = v === 'folded' ? undefined : { keep: true }; // folded wings lie against the body; open wings sit behind it
  for (const s of wingPair(k)) draw(rx, ry, s, v, span); };
F('feathered_wings', 'Wings', 'Feathered wings', 'behind', (c, k) => wingShape(c, k, (x, y, s, v, sp) => {
  if (v === 'folded') { c.oval(x + s * 1.6, y + 1.4, 1.3, 2.6, s * -10, 'A'); c.px(x + s * 1.8, y + 3, 'Ad'); }
  else { const ty = v === 'raised' ? y - 4.4 : y - 1.6; const tx = x + s * 5.4 * sp; c.poly([[x, y], [tx, ty], [tx - s * 0.6, ty + 2.4], [x + s * 3.2 * sp, y + 2.6], [x + s * 1.6, y + 2]], 'A', { keep: true }); c.px(tx - s * 1.4, ty + 2.2, 'Ad'); c.px(tx - s * 2.6, ty + 2.6, 'Ad'); } }), { variants: WING_VARIANTS, wing: true });
F('membrane_wings', 'Wings', 'Membrane wings', 'behind', (c, k) => wingShape(c, k, (x, y, s, v, sp) => {
  if (v === 'folded') { c.poly([[x, y - 0.6], [x + s * 2.6, y - 1.8], [x + s * 2.6, y + 2.6], [x + s * 0.6, y + 2]], 'A'); c.capsule(x, y - 0.6, x + s * 2.6, y - 1.8, 0.3, 'M'); return; }
  const ty = v === 'raised' ? y - 4.6 : y - 2; const tx = x + s * 5.6 * sp; c.poly([[x, y], [tx, ty], [tx - s * 0.6, ty + 2.6], [tx - s * 1.8, ty + 2], [tx - s * 2.6, ty + 3.2], [x + s * 1.2, y + 2.2]], 'A', { keep: true }); c.capsule(x, y, tx, ty, 0.3, 'M'); }), { variants: WING_VARIANTS, wing: true });
F('insect_wings', 'Wings', 'Insect wings', 'behind', (c, k) => wingShape(c, k, (x, y, s, v, sp) => {
  if (v === 'folded') c.oval(x + s * 0.9, y + 2.2, 1, 3, s * 8, 'G');
  else { const up = v === 'raised' ? -2.6 : 0; c.oval(x + s * 3 * sp, y - 1 + up, 2.6 * sp, 1.3, s * (v === 'raised' ? -50 : -20), 'G', { keep: true }); c.oval(x + s * 2.6 * sp, y + 1.4 + up * 0.5, 2 * sp, 1, s * 15, 'G', { keep: true }); } }), { variants: WING_VARIANTS, wing: true });
F('finlike_wings', 'Wings', 'Finlike wings', 'behind', (c, k) => wingShape(c, k, (x, y, s, v, sp) => { const L = v === 'folded' ? 2.8 : 3.8 * sp; const up = v === 'raised' ? -2.4 : v === 'folded' ? 1.4 : 0;
  c.poly([[x, y - 0.6], [x + s * L, y - 1.4 + up], [x + s * (L - 0.6), y + 1.4 + up * 0.4], [x, y + 1.6]], 'A', k.over); }), { variants: WING_VARIANTS, wing: true });
F('leaf_wings', 'Wings', 'Leaf wings', 'behind', (c, k) => wingShape(c, k, (x, y, s, v, sp) => { const up = v === 'raised' ? -2.6 : 0; const L = v === 'folded' ? 1.8 : 3 * sp;
  c.oval(x + s * L, y - 0.4 + up, L, 1.3, s * (v === 'raised' ? -40 : v === 'folded' ? 70 : -15), 'A', { keep: true }); c.capsule(x, y, x + s * L * 1.6, y - 0.4 + up * 1.4, 0.25, 'Ad'); }), { variants: WING_VARIANTS, wing: true });
F('reduced_wings', 'Wings', 'Reduced wings', 'front', (c, k) => wingShape(c, k, (x, y, s, v) => { const up = v === 'raised' ? -1.6 : v === 'folded' ? 0.8 : 0; c.oval(x + s * 1.8, y + up, 1.5, 0.9, s * -25, 'A'); c.px(x + s * 2.6, y + up - 0.4, 'Ad'); }), { variants: WING_VARIANTS, wing: true });

// ---------------------------------------------------------------- surface and material (painted over the body; some break the outline)
const bodyCells = (c, k, fn) => { const [ox, oy] = k.a.belly ? [k.a.belly[0], k.a.belly[1] - 1.8] : [8, 10]; const Xc = c.tx(ox), Yc = c.ty(oy);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (c.g[y][x] === 'M' && Math.abs(x + 0.5 - Xc) < 4.5 && Math.abs(y + 0.5 - Yc) < 3.5) fn(x, y); };
F('plates', 'Surface', 'Plates', 'front', (c, k) => bodyCells(c, k, (x, y) => { if (y % 2 === 0 && x % 3 !== 0) c.g[y][x] = 'Ad'; }));
F('scales', 'Surface', 'Scales', 'front', (c, k) => bodyCells(c, k, (x, y) => { if ((x + y) % 3 === 0) c.g[y][x] = 'Md'; }));
F('fur_tufts', 'Surface', 'Fur tufts', 'front', (c, k) => { const [bx, by] = backPt(k); for (const dx of [-2.2, 0, 2.2]) c.poly([[bx + dx - 0.6, by + 0.6], [bx + dx + (k.dir ? -k.dir : 0.4) * 0.8, by - 1.2], [bx + dx + 0.6, by + 0.6]], 'M'); });
F('crystal_growths', 'Surface', 'Crystal growths', 'front', (c, k) => { const [bx, by] = backPt(k); c.poly([[bx - 1.8, by + 0.6], [bx - 1.2, by - 2.4], [bx - 0.4, by + 0.6]], 'G'); c.poly([[bx + 0.4, by + 0.6], [bx + 1.2, by - 1.6], [bx + 1.8, by + 0.6]], 'W'); });
F('stone_segments', 'Surface', 'Stone segments', 'front', (c, k) => bodyCells(c, k, (x, y) => { if (x % 4 === 1 || y % 3 === 2) c.g[y][x] = 'Md'; }));
F('metal_panels', 'Surface', 'Metal panels', 'front', (c, k) => bodyCells(c, k, (x, y) => { if (x % 4 === 0 || y % 4 === 0) c.g[y][x] = 'Wd'; else if ((x + y) % 7 === 0) c.g[y][x] = 'K'; }));

// ---------------------------------------------------------------- plant and fungal
F('leaves', 'Plant', 'Leaves', 'front', (c, k) => { const [hx, top] = headTop(k); for (const s of [-1, 1]) c.oval(hx + s * 1.2, top - 0.6, 1.6, 0.8, s * -35, 'A'); });
F('vines', 'Plant', 'Vines', 'front', (c, k) => { const [bx, by] = backPt(k); const [ux, uy] = k.a.belly || [bx, by + 3]; c.chain([[bx - 2.4, by + 0.4, 0.35], [bx, by + 1.6, 0.35], [ux + 1.8, uy, 0.35], [ux + 2.6, uy + 1.6, 0.3]], 'A'); c.px(ux + 2.6, uy + 2.2, 'G'); });
F('buds', 'Plant', 'Buds', 'front', (c, k) => { const [bx, by] = backPt(k); for (const dx of [-1.6, 1.4]) { c.ellipse(bx + dx, by - 0.4, 0.8, 0.9, 'G'); c.px(bx + dx, by + 0.4, 'A'); } });
F('flowers', 'Plant', 'Flowers', 'front', (c, k) => { const [hx, top] = headTop(k); const x = hx + (k.dir ? -k.dir * 1 : 1.4); for (const [dx, dy] of [[-0.9, 0], [0.9, 0], [0, -0.9], [0, 0.9]]) c.px(x + dx, top - 0.6 + dy, 'W'); c.px(x, top - 0.6, 'G'); });
F('mushrooms', 'Plant', 'Mushrooms', 'front', (c, k) => { const [bx, by] = backPt(k); c.rect(bx - 0.3, by - 1.4, bx + 0.3, by, 'W'); c.ellipse(bx, by - 1.8, 1.6, 0.9, 'A'); c.px(bx - 0.6, by - 2.2, 'W'); });
F('root_feet', 'Plant', 'Root feet', 'front', (c, k) => { for (const [x] of feetOf(k)) for (const s of [-1, 1]) c.capsule(x, 14.6, x + s * 1.4, 15, 0.35, 'Md'); }, { needs: 'feet' });

// ---------------------------------------------------------------- elemental anatomy
F('flame_tufts', 'Elemental', 'Flame tufts', 'front', (c, k) => { const [hx, top] = headTop(k); c.poly([[hx - 1.2, top + 0.6], [hx - 0.4, top - 2.6], [hx + 0.2, top - 0.6], [hx + 0.8, top - 1.8], [hx + 1.2, top + 0.6]], 'G'); c.px(hx - 0.2, top - 0.4, 'A'); });
F('water_sacs', 'Elemental', 'Water sacs', 'front', (c, k) => { const [ux, uy] = k.a.belly || backPt(k); for (const s of k.dir ? [0] : [-1, 1]) { c.ellipse(ux + s * 2.6, uy - 0.6, 1.1, 1.2, 'G'); c.px(ux + s * 2.6 - 0.4, uy - 1.2, 'H'); } });
F('frost_shards', 'Elemental', 'Frost shards', 'front', (c, k) => { const [bx, by] = backPt(k); for (const [dx, h] of [[-1.8, 2], [0, 2.8], [1.8, 1.8]]) c.poly([[bx + dx - 0.5, by + 0.6], [bx + dx + 0.3, by - h], [bx + dx + 0.6, by + 0.6]], 'W'); });
F('static_prongs', 'Elemental', 'Static prongs', 'front', (c, k) => { const [hx, top, rx] = headTop(k); for (const s of sidesOf(k)) { const x = hx + s * rx * 0.5; c.px(x, top - 0.6, 'G'); c.px(x + s * 0.8, top - 1.4, 'G'); c.px(x + s * 0.2, top - 2.2, 'G'); } });
F('light_orbs', 'Elemental', 'Light orbs', 'behind', (c, k) => { const [hx, hy, rx, ry] = k.a.head; for (const s of [-1, 1]) c.ellipse(hx + s * (rx + 1.8), hy - ry - 0.4, 0.9, 0.9, 'G', { keep: true }); });
F('shadow_wisps', 'Elemental', 'Shadow wisps', 'behind', (c, k) => { const [bx, by] = backPt(k); const s = k.dir ? -k.dir : 1; c.chain([[bx, by + 0.6, 0.6], [bx + s * 2, by - 1, 0.45], [bx + s * 3.4, by - 0.6, 0.3]], 'K', { keep: true }); c.chain([[bx - s * 0.6, by + 1.6, 0.5], [bx + s * 1.6, by + 0.8, 0.35], [bx + s * 2.8, by + 1.6, 0.3]], 'K', { keep: true }); });

// ---------------------------------------------------------------- special anatomy
F('halo', 'Special', 'Halo', 'behind', (c, k) => { const [hx, top, rx] = headTop(k); const X0 = c.tx(hx), Y0 = c.ty(top - 1.2), RX = Math.max(1.6, rx * 0.8) * c.scale, RY = 0.9 * c.scale;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = ((x + 0.5 - X0) / RX) ** 2 + ((y + 0.5 - Y0) / RY) ** 2; if (d <= 1.5 && d >= 0.35 && !c.g[y][x]) c.g[y][x] = 'G'; } });
F('lure', 'Special', 'Lure', 'front', (c, k) => { const [hx, top] = headTop(k); const s = k.dir || -1; c.capsule(hx, top + 0.4, hx + s * 1.6, top - 2.4, 0.3, 'K'); c.ellipse(hx + s * 2.2, top - 2.6, 0.9, 0.9, 'G'); });
F('cheek_pouches', 'Special', 'Cheek pouches', 'front', (c, k) => { const [hx, hy, rx, ry] = k.a.head; for (const s of k.dir ? [k.dir * 0.2] : [-1, 1]) c.ellipse(hx + s * rx * 0.85, hy + ry * 0.45, Math.max(1, rx * 0.4), Math.max(0.9, ry * 0.4), 'M'); for (const s of k.dir ? [k.dir * 0.2] : [-1, 1]) c.px(hx + s * rx * 0.85, hy + ry * 0.45, 'B'); });
F('shoulder_shells', 'Special', 'Shoulder shells', 'front', (c, k) => { const [bx, by] = backPt(k); for (const s of k.dir ? [k.dir] : [-1, 1]) { c.ellipse(bx + s * (k.dir ? 1.6 : 3), by + 0.8, 1.6, 1.1, 'A'); c.px(bx + s * (k.dir ? 1.6 : 3), by + 0.4, 'Ad'); } });
F('vent_fins', 'Special', 'Vent fins', 'front', (c, k) => { const [hx, hy, rx] = k.a.head; for (const s of sidesOf(k)) c.poly([[hx + s * rx * 0.8, hy - 0.6], [hx + s * (rx + 1.8), hy - 1.4], [hx + s * (rx + 1.4), hy + 0.4], [hx + s * rx * 0.8, hy + 0.8]], 'A'); });
F('orbiting_masses', 'Special', 'Orbiting masses', 'behind', (c, k) => { const [hx, hy, rx, ry] = k.a.head; for (const s of [-1, 1]) { const x = hx + s * (rx + 2.6), y = hy - ry * 0.4; c.capsule(hx + s * rx * 0.8, hy, x, y, 0.25, 'K', { keep: true }); c.ellipse(x, y, 1, 1, 'A', { keep: true }); } });

export const FEATURE_IDS = Object.freeze(Object.keys(FEATURES));
export const FEATURE_GROUPS = Object.freeze([...new Set(FEATURE_IDS.map((id) => FEATURES[id].group))]);

// ---------------------------------------------------------------- compatibility, built-in configuration and drawing
const BUILT_IN = { // feature → [structure flag/part, how the feature configures it]
  shell: ['shell', 'shell'], beak: ['beak', 'beak'], pincers: ['pincers', 'pincer'],
};
const norm = (f) => (typeof f === 'string' ? { id: f } : f || {});
function featureProblems(recipe, parts) {
  const out = []; const st = STRUCTURES[recipe.structure]; const name = st.name; const pose = recipe.pose || 'neutral';
  const list = (recipe.features || []).map(norm); const ids = list.map((f) => f.id);
  if (!Array.isArray(recipe.features ?? [])) return ['features must be a list'];
  const hasFeet = parts.has('leg') && !['insectoid', 'arachnid', 'segmented_crawler', 'plant_bodied', 'tentacled'].includes(recipe.structure);
  list.forEach((f, i) => {
    const d = FEATURES[f.id]; if (!d) { out.push(`unknown feature "${f.id}" (known: ${FEATURE_IDS.join(', ')})`); return; }
    for (const k of Object.keys(f)) if (!['id', 'variant'].includes(k)) out.push(`feature ${f.id}: unknown field "${k}" (accepted: id, variant)`);
    if (f.variant != null && !(d.variants || []).includes(f.variant)) out.push(`feature ${f.id}: unknown variant "${f.variant}" (${d.variants ? `known: ${d.variants.join(', ')}` : 'this feature has no variants'})`);
    if (ids.indexOf(f.id) !== i) out.push(`feature ${f.id} is listed twice`);
    if (d.needs === 'feet' && !hasFeet) out.push(`feature ${f.id} is not supported by ${name}: it needs feet on grounded legs`);
    if (d.needs === 'feetOrHands' && !hasFeet && !STRUCTURE_HANDS[recipe.structure]) out.push(`feature ${f.id} is not supported by ${name}: it needs feet or hands`);
    if (d.needs === 'hands' && !STRUCTURE_HANDS[recipe.structure] && !parts.has('pincers')) out.push(`feature ${f.id} is not supported by ${name}: it needs hands (front uprights, knuckle-walker) or built-in pincers`);
    if (d.needsEyes && recipe.eyes === 'none') out.push(`feature ${f.id} needs visible eyes (eyes is "none")`);
    if (f.id === 'muzzle' && parts.has('beak')) out.push(`feature muzzle conflicts with ${name}'s built-in beak`);
    if (f.id === 'membrane_wings' && recipe.structure === 'batlike') out.push(`feature membrane_wings: ${name} already has membrane wings; use the wingSpan control`);
    if (f.id === 'orbiting_masses' && recipe.structure === 'multi_bodied') out.push(`feature orbiting_masses: ${name}'s satellites are built in and follow its pose`);
    if (d.wing && recipe.structure === 'plant_bodied') out.push(`feature ${f.id}: ${name}'s fronds are its arms and are built in`);
    if (f.id === 'root_feet' && recipe.structure === 'plant_bodied') out.push(`feature root_feet: ${name} already stands on roots`);
    if ((d.tail && ids.filter((x) => FEATURES[x]?.tail).length > 1) && ids.find((x) => FEATURES[x]?.tail) === f.id) out.push('only one tail feature per design');
    if ((d.wing && ids.filter((x) => FEATURES[x]?.wing).length > 1) && ids.find((x) => FEATURES[x]?.wing) === f.id) out.push('only one wing feature per design');
  });
  const fc = recipe.face || {}; for (const k of Object.keys(fc)) if (!FACE[k]) out.push(`unknown face control "${k}" (known: ${Object.keys(FACE).join(', ')})`); else if (!FACE[k].includes(fc[k])) out.push(`face ${k}: unknown value "${fc[k]}" (known: ${FACE[k].join(', ')})`);
  if (fc.eyeSpacing && fc.eyeSpacing !== 'normal' && (st.view === 'side')) out.push(`face eyeSpacing is not supported by ${name}: a side view shows one eye`);
  const mk = recipe.markings || {}; for (const k of Object.keys(mk)) if (!MARKINGS[k]) out.push(`unknown markings field "${k}" (known: ${Object.keys(MARKINGS).join(', ')})`); else if (!MARKINGS[k].includes(mk[k])) out.push(`markings ${k}: unknown value "${mk[k]}" (known: ${MARKINGS[k].join(', ')})`);
  void pose; return out;
}
export const FACE = Object.freeze({ eyeShape: ['round', 'narrow', 'large', 'sleepy', 'none'], eyeSpacing: ['normal', 'close', 'wide'], mouth: ['none', 'smile', 'frown', 'open', 'grin'] });
export const MARKINGS = Object.freeze({ pattern: ['none', 'stripes', 'spots', 'mask', 'band', 'backstripe', 'patches', 'gradient'], color: ['accent', 'dark'] });
/** Hand anchors for structures with free hands (front uprights and the knuckle-walker), by pose. */
const STRUCTURE_HANDS = { compact_upright: true, heavy_upright: true, long_limbed_upright: true, knuckle_walker: true };

installFeatureCompat(featureProblems);
installBuiltInConfig((recipe) => { const cfg = {}; const parts = recipe.structure && STRUCTURES[recipe.structure] ? null : null; void parts;
  for (const f of (recipe.features || []).map(norm)) { const b = BUILT_IN[f.id]; if (!b) continue;
    const st = recipe.structure; const flag = { shell: st === 'shelled', beak: st === 'perching_avian' || st === 'running_avian', pincers: st === 'crustacean' }[b[0]];
    if (flag) { cfg[b[1]] = f.variant || FEATURES[f.id].variants?.[0] || 'default'; (cfg.builtIn ||= []).push(f.id); } }
  return cfg; });

function drawMarkings(c, a, mk) {
  const pat = mk.pattern || 'none'; if (pat === 'none') return; const code = mk.color === 'dark' ? 'K' : 'Ad'; const g = c.g;
  const on = (x, y) => g[y]?.[x] === 'M';
  const [hx, hy] = a.head || [8, 6]; const [bx, by] = a.belly ? [a.belly[0], a.belly[1] - 1.8] : [8, 10];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (!on(x, y)) continue; const X = x + 0.5, Y = y + 0.5; const tx = c.tx, ty = c.ty;
    if (pat === 'stripes' && Y > ty(hy) + 1 && (x + (a.side ? 0 : 1)) % 3 === 0) g[y][x] = code;
    else if (pat === 'spots' && (x * 7 + y * 5) % 11 === 0) g[y][x] = code;
    else if (pat === 'mask' && Math.abs(Y - ty(a.eyes?.[0]?.[1] ?? hy)) < 0.8 && Math.abs(X - tx(hx)) < 3.2) g[y][x] = 'K';
    else if (pat === 'band' && Math.abs(Y - ty(by)) < 1) g[y][x] = code;
    else if (pat === 'backstripe' && (!g[y - 1]?.[x] || g[y - 1][x] === 0) && Y > ty(hy)) g[y][x] = 'Md';
    else if (pat === 'patches' && (((X - tx(bx) - 1.5) ** 2 + (Y - ty(by)) ** 2 < 2.4) || ((X - tx(hx) + 0.8) ** 2 + (Y - ty(hy)) ** 2 < 1.4))) g[y][x] = code;
    else if (pat === 'gradient' && Y > ty(by) + 0.6) g[y][x] = 'Md'; }
}
function drawFace(c, a, face) {
  const shape = face.eyeShape || 'round'; const spacing = face.eyeSpacing || 'normal';
  if (spacing !== 'normal' && a.eyes?.length === 2) { const mid = (a.eyes[0][0] + a.eyes[1][0]) / 2; const d = spacing === 'wide' ? 0.7 : -0.6; a.eyes = a.eyes.map(([x, y]) => [x + Math.sign(x - mid) * d, y]); }
  a.eyeShape = shape;
  const m = face.mouth || 'none'; if (m !== 'none' && a.mouth) { const [mx, my] = a.mouth; const dir = a.side ? (a.faceRight ? 1 : -1) : 0;
    if (m === 'open') c.rect(mx - 0.5 + dir * 0.4, my, mx + 0.5 + dir * 0.4, my + 0.6, 'K');
    else if (m === 'smile') { c.px(mx - 0.8, my - 0.2, 'K'); c.px(mx, my + 0.3, 'K'); if (!dir) c.px(mx + 0.8, my - 0.2, 'K'); }
    else if (m === 'frown') { c.px(mx - 0.8, my + 0.4, 'K'); c.px(mx, my - 0.1, 'K'); if (!dir) c.px(mx + 0.8, my + 0.4, 'K'); }
    else if (m === 'grin') { c.rect(mx - 1, my, mx + 1, my, 'K'); c.px(mx - 0.4, my, 'W'); c.px(mx + 0.6, my, 'W'); } }
}
installFinisher((c, a, recipe, st) => {
  const dir = st.view === 'side' ? (a.faceRight ? 1 : -1) : 0; const list = (recipe.features || []).map(norm);
  const hands = handAnchors(recipe.structure, recipe.pose || 'neutral'); if (hands) a.hands = hands.map(([x, y]) => c.map('torso', x, y));
  c.part('abs');
  if (recipe.markings) drawMarkings(c, a, recipe.markings);
  const ctx = (f) => ({ a, dir, view: st.view, variant: f.variant, X: c.xf });
  for (const layer of ['behind', 'front']) for (const f of list) { const d = FEATURES[f.id]; if (!d || d.layer !== layer) continue;
    const built = (c.xf.builtIn || []).includes(f.id); if (built) continue; // configured the structure's own anatomy instead
    d.draw(c, ctx(f)); }
  if (recipe.face) drawFace(c, a, recipe.face);
  c.part('body');
});
/** Hand anchors for the structures with free hands, from their pose geometry (authored coordinates). */
function handAnchors(structure, pose) {
  const p = pose[0];
  if (structure === 'compact_upright') { if (pose === 'expressive') return [[2.6, 6.6], [13.4, 6.6]]; const ay = { n: 11.6, a: 10.6, b: 11.2, f: 12.4 }[p], ax = { n: 3.4, a: 3.6, b: 2.8, f: 3.8 }[p]; return [[ax, ay + 1], [16 - ax, ay + 1]]; }
  if (structure === 'heavy_upright') return pose === 'forward' ? [[4.8, 11.6], [11.2, 11.6]] : pose === 'expressive' ? [[1.8, 2.6], [14.4, 11.4]] : [[1.6, { n: 11.4, a: 10.2, b: 11.8 }[p] + 0.4], [14.4, { n: 11.4, a: 10.2, b: 11.8 }[p] + 0.4]];
  if (structure === 'long_limbed_upright') return { n: [[3, 10.4], [13, 10.4]], a: [[3.4, 9], [12.6, 9]], b: [[1.8, 7], [14.2, 7]], f: [[2.6, 12.4], [13.4, 7.4]], e: [[2.6, 1.6], [13, 10.6]] }[p];
  if (structure === 'knuckle_walker') return pose === 'expressive' ? [[3.2, 2]] : [[{ n: 4.4, a: 4.6, b: 3.6, f: 2.8 }[p], 14.6]];
  return null;
}
