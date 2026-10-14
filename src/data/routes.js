// Route templates. Each returns play-relative waypoints (yards) starting at
// the player's alignment `[x, y]`. `inward` is -1 for a player on the right
// (breaks toward the centre go to -y) and +1 for a player on the left; a
// player exactly on the centre line breaks to the right.

const inwardOf = (y) => (y > 0 ? -1 : 1);

export const ROUTES = {
  go: ([x, y]) => [[x, y], [x + 25, y]],
  fade: ([x, y]) => [[x, y], [x + 6, y - inwardOf(y) * 2], [x + 25, y - inwardOf(y) * 4]],
  seam: ([x, y]) => [[x, y], [x + 8, y + inwardOf(y) * 2], [x + 25, y + inwardOf(y) * 3]],
  post: ([x, y]) => [[x, y], [x + 11, y], [x + 22, y + inwardOf(y) * 9]],
  corner: ([x, y]) => [[x, y], [x + 12, y], [x + 22, y - inwardOf(y) * 9]],
  out: ([x, y]) => [[x, y], [x + 9, y], [x + 9.5, y - inwardOf(y) * 8]],
  dig: ([x, y]) => [[x, y], [x + 11, y], [x + 11.5, y + inwardOf(y) * 11]],
  slant: ([x, y]) => [[x, y], [x + 2.5, y], [x + 9, y + inwardOf(y) * 6.5]],
  curl: ([x, y]) => [[x, y], [x + 11, y], [x + 9.5, y + inwardOf(y) * 2]],
  comeback: ([x, y]) => [[x, y], [x + 14, y], [x + 11, y - inwardOf(y) * 3]],
  hitch: ([x, y]) => [[x, y], [x + 6, y], [x + 5, y + inwardOf(y) * 1]],
  flat: ([x, y]) => [[x, y], [x + 2, y - inwardOf(y) * 6], [x + 3, y - inwardOf(y) * 12]],
  drag: ([x, y]) => [[x, y], [x + 3.5, y + inwardOf(y) * 4], [x + 5, y + inwardOf(y) * 20]],
  shallow: ([x, y]) => [[x, y], [x + 2, y + inwardOf(y) * 6], [x + 4, y + inwardOf(y) * 22]],
  wheel: ([x, y]) => [[x, y], [x + 2, y - inwardOf(y) * 8], [x + 8, y - inwardOf(y) * 10], [x + 24, y - inwardOf(y) * 10]],
  angle: ([x, y]) => [[x, y], [x + 3, y - inwardOf(y) * 5], [x + 9, y + inwardOf(y) * 4]],
  swing: ([x, y]) => [[x, y], [x + 1, y - inwardOf(y) * 7], [x + 4, y - inwardOf(y) * 13]],
  screen: ([x, y]) => [[x, y], [x - 1, y - inwardOf(y) * 4], [x - 2, y - inwardOf(y) * 7]],
  bubble: ([x, y]) => [[x, y], [x - 1, y - inwardOf(y) * 3], [x - 1.5, y - inwardOf(y) * 6]],
  stick: ([x, y]) => [[x, y], [x + 6, y], [x + 7, y - inwardOf(y) * 3]],
  skinny_post: ([x, y]) => [[x, y], [x + 12, y], [x + 25, y + inwardOf(y) * 5]],
  double_move: ([x, y]) => [[x, y], [x + 8, y], [x + 10, y + inwardOf(y) * 3], [x + 25, y - inwardOf(y) * 2]],
  texas: ([x, y]) => [[x, y], [x + 2, y - inwardOf(y) * 4], [x + 5, y - inwardOf(y) * 5], [x + 12, y + inwardOf(y) * 6]],
};

export const ROUTE_LABELS = Object.freeze({
  go: 'Go', fade: 'Fade', seam: 'Seam', post: 'Post', corner: 'Corner', out: 'Out', dig: 'Dig',
  slant: 'Slant', curl: 'Curl', comeback: 'Comeback', hitch: 'Hitch', flat: 'Flat', drag: 'Drag',
  shallow: 'Shallow', wheel: 'Wheel', angle: 'Angle', swing: 'Swing', screen: 'Screen', bubble: 'Bubble',
  stick: 'Stick', skinny_post: 'Skinny Post', double_move: 'Double Move', texas: 'Texas',
});

/** Routes that count as "alternate / special" (green) in play art. */
export const ALTERNATE_ROUTES = new Set(['flat', 'swing', 'screen', 'bubble', 'wheel', 'angle', 'texas']);

export function routePoints(name, align) {
  const fn = ROUTES[name];
  if (!fn) throw new Error(`Unknown route ${name}`);
  return fn(align);
}

/** Zone landmarks: play-relative yards from the ball. */
export const ZONES = Object.freeze({
  deep_half_L: { at: [15, -10], role: 'deep' },
  deep_half_R: { at: [15, 10], role: 'deep' },
  deep_third_L: { at: [15, -14], role: 'deep' },
  deep_third_M: { at: [16, 0], role: 'deep' },
  deep_third_R: { at: [15, 14], role: 'deep' },
  deep_quarter_LL: { at: [14, -17], role: 'deep' },
  deep_quarter_L: { at: [15, -6], role: 'deep' },
  deep_quarter_R: { at: [15, 6], role: 'deep' },
  deep_quarter_RR: { at: [14, 17], role: 'deep' },
  deep_middle: { at: [12, 0], role: 'deep' },
  deep_center: { at: [20, 0], role: 'deep' },
  hook_L: { at: [6, -6], role: 'middle' },
  hook_M: { at: [6, 0], role: 'middle' },
  hook_R: { at: [6, 6], role: 'middle' },
  robber: { at: [8, 0], role: 'middle' },
  flat_L: { at: [3, -15], role: 'flat' },
  flat_R: { at: [3, 15], role: 'flat' },
  curl_L: { at: [9, -11], role: 'flat' },
  curl_R: { at: [9, 11], role: 'flat' },
  short_L: { at: [2, -5], role: 'middle' },
  short_R: { at: [2, 5], role: 'middle' },
  goal_L: { at: [2, -8], role: 'flat' },
  goal_R: { at: [2, 8], role: 'flat' },
});

/** Rush lanes: where the rusher attacks first before pursuing the QB. */
export const GAPS = Object.freeze({
  A_L: [-1, -0.9], A_R: [-1, 0.9], B_L: [-1.5, -2.6], B_R: [-1.5, 2.6],
  edge_L: [-2.2, -3.6], edge_R: [-2.2, 3.6], contain_L: [-4.5, -6.5], contain_R: [-4.5, 6.5],
});
