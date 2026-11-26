// Presentation only. The game and its random-number state never read this camera.
export const AUTO_ZOOM_MS = 1800;
export class MatchCamera {
  constructor() { this.key = null; this.amount = 0; this.from = 0; this.target = 0; this.started = 0; }
  reset(key) { this.key = key; this.amount = this.from = this.target = 0; this.started = 0; }
  sample(close, { key, auto = false, closeView = false, reducedMotion = false, now = performance.now(), pad = 0 } = {}) {
    if (this.key !== key) this.reset(key);
    const target = auto && !closeView ? 1 : 0;
    // Finish the current interpolation before reversing its direction.
    const u = Math.max(0, Math.min(1, (now - this.started) / AUTO_ZOOM_MS));
    const eased = u * u * (3 - 2 * u);
    this.amount = this.from + (this.target - this.from) * eased;
    if (target !== this.target) { this.from = this.amount; this.target = target; this.started = now; }
    if (reducedMotion) this.amount = this.from = this.target;
    // `pad`: yards shown behind each end line when zoomed out (the white paint around a stadium's field).
    const bottom = close.bottom + (-10 - pad - close.bottom) * this.amount;
    const top = close.top + (110 + pad - close.top) * this.amount;
    return { bottom, top };
  }
  get moving() { return Math.abs(this.amount - this.target) > 0.00001; }
}

// Retain facing while stopped. Turn only after meaningful travel in the opposite
// direction; tiny collision corrections must not repeatedly mirror a monster.
export class FacingTracker {
  constructor() { this.players = new Map(); this.time = -Infinity; }
  observe(frame) {
    if (!frame || (frame.t ?? 0) < this.time) this.players.clear();
    this.time = frame?.t ?? -Infinity;
    const facing = {};
    for (const team of ['off', 'def']) for (const [slot, , lateral] of frame?.[team] || []) {
      const key = `${team}:${slot}`;
      let p = this.players.get(key);
      if (!p) { p = { lateral, flip: team === 'def', travel: 0 }; this.players.set(key, p); }
      const delta = lateral - p.lateral; p.lateral = lateral;
      if (Math.abs(delta) > 0.001) {
        if ((delta < 0) === p.flip) p.travel = 0;
        else {
          p.travel += Math.abs(delta);
          if (p.travel >= 0.6) { p.flip = delta < 0; p.travel = 0; }
        }
      }
      facing[key] = p.flip;
    }
    return facing;
  }
}

/**
 * Owner play test 2026-11-26: the player's own zoom for the play-calling camera (not Auto, not replays). `zoomed` true eases from the
 * close view (amount 0) to the zoomed-in view (amount 1) over the same time as Auto's camera; pressing again eases back. The close view
 * is the furthest out it goes. Presentation only: the picture is a crop of the drawn field, nothing in the game reads it.
 */
export const FIELD_ZOOM = 0.86; // the zoomed-in window, as a share of the close view's width and height (below about 0.86 the yard numbers are cut)
export class ZoomCrop {
  constructor() { this.amount = 0; this.from = 0; this.target = 0; this.started = 0; this.focus = null; }
  sample(zoomed, { reducedMotion = false, now = performance.now() } = {}) {
    const target = zoomed ? 1 : 0;
    const u = Math.max(0, Math.min(1, (now - this.started) / AUTO_ZOOM_MS));
    const eased = u * u * (3 - 2 * u);
    this.amount = this.from + (this.target - this.from) * eased;
    if (target !== this.target) { this.from = this.amount; this.target = target; this.started = now; }
    if (reducedMotion) this.amount = this.from = this.target;
    return this.amount;
  }
  get moving() { return Math.abs(this.amount - this.target) > 0.00001; }
  /**
   * The viewBox for the close view `vb` ({x, y, width, height}) cropped by `amount` around the ball at (`bx`, `by`) in field units.
   * Centred across the field; up and down the field the ball sits a little below the middle (the offence attacks up) and is followed
   * smoothly while a play runs (`follow`). The crop never leaves the close view.
   */
  crop(vb, amount, bx, by, { follow = false } = {}) {
    bx = 0; // centred across the field: both rows of yard numbers stay whole and the picture does not swing with every cut
    if (!this.focus || !follow) this.focus = { x: bx, y: by };
    else { this.focus.x += (bx - this.focus.x) * 0.18; this.focus.y += (by - this.focus.y) * 0.18; }
    const z = 1 - (1 - FIELD_ZOOM) * amount; const w = vb.width * z, h = vb.height * z;
    const x = Math.max(vb.x, Math.min(vb.x + vb.width - w, this.focus.x - w / 2));
    const y = Math.max(vb.y, Math.min(vb.y + vb.height - h, this.focus.y - h * 0.58));
    return `${x} ${y} ${w} ${h}`;
  }
}
