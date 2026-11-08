// MET-06-F Fortress Gate (aegistron: Aegistron; DL, legendary). Task 8 M3, Metal batch (special action; physical obstacle).
// Contract (Dex; spec §12 physical obstacles): once per defensive possession, after 3 participating plays on which the opponent gains
// at most 3 yards, his next defensive snap auto-activates if he is able: two physical gate panels beside his initial DL position, each
// 1.5 / 2 / 2.5 / 3 yards wide by mastery (the former fixed 2-yard width is superseded), 0.5 yard thick, with a clear 1-yard side gap,
// leaving the centre lane and his own spot open. The panels are stationary for the play and block BOTH teams' movement, not the
// football (engine obstacles); no push, damage, status or extra player. One use per defensive possession; the activation play cannot
// charge; an illegal placement keeps the full bar and the use. The panels disappear at the whistle; the charge carries over halftime
// and possessions, and the use resets only with a new opposing possession. Safe placement only: a panel may not spawn inside a body
// or past an end-zone boundary (or the sideline), and the pair is skipped if either is illegal. Owner N8b: each panel is shortened
// to its longest safe length, never below 1.5 yd, before a refusal. The opponent can run the centre or
// pass. He keeps his normal DL role after the cast.
// Readings where the contract is silent (documented, minimal):
//   - "Beside": lateral; each panel's inner edge is 1 yard from his spot, its thickness centred on his depth.
//   - "Inside a body": a monster's centre within the engine's body radius (0.35 yd, half the 0.7 separation) of the panel.
//   - The 3 qualifying plays need not be consecutive and are counted on his defensive scrimmage plays (kickoffs are not defensive
//     snaps, B20; two-point tries excluded); "gains" is the play's whole-yard gain (incompletions 0). A full bar takes no more charge.
//   - The possession is the game's drive key (rules.js abilityMemory); without one (labs) every play is its own possession.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): raising the gate
// at the snap is the live activation (gated after the legality check: bar and use kept); the low-yardage count is an in-play charge
// gain (gated).
import { registerAbility } from './registry.js';
import { able, scrimmage, byMastery } from './common.js';

export const FORTRESS = Object.freeze({ width: [1.5, 2, 2.5, 3], thickness: 0.5, gap: 1, plays: 3, maxGain: 3, body: 0.35 });

/** Owner ruling N8b (item F): each panel is placed at its longest safe length, from the mastery width down to (never below) the
 *  mastery-0 width 1.5 yd, shortened from its outer end (the inner edge stays 1 yd from his spot); a panel that is not safe even at
 *  1.5 yd is refused as before (the pair is skipped, bar and use kept). Returns { panels, refusal }. */
export const MIN_PANEL = 1.5;
export function safePanels(x, y, m, B, bodies) {
  const w0 = byMastery(FORTRESS.width, m), h = FORTRESS.thickness / 2, g = FORTRESS.gap; const out = [];
  for (const side of [-1, 1]) {
    let placed = null, why = null;
    for (let w = w0; w >= MIN_PANEL - 1e-9; w = Math.round((w - 0.1) * 10) / 10) {
      const p = side < 0 ? { x0: x - h, x1: x + h, y0: y - g - w, y1: y - g } : { x0: x - h, x1: x + h, y0: y + g, y1: y + g + w };
      why = panelRefusal(p, B, bodies); if (!why) { placed = p; break; }
    }
    if (!placed) return { panels: null, refusal: why };
    out.push(placed);
  }
  return { panels: out, refusal: null };
}
/** The two full-width panels for a source at (x, y) and mastery m, as play-frame rectangles. */
export function gatePanels(x, y, m) {
  const w = byMastery(FORTRESS.width, m), h = FORTRESS.thickness / 2, g = FORTRESS.gap;
  return [{ x0: x - h, x1: x + h, y0: y - g - w, y1: y - g }, { x0: x - h, x1: x + h, y0: y + g, y1: y + g + w }];
}
/** Why a panel is illegal (null when legal): bounds B (play frame) and the bodies on the field. */
export function panelRefusal(p, B, bodies) {
  if (p.y0 < B.left || p.y1 > B.right) return 'sideline';
  if (p.x0 <= B.ownGoal || p.x1 >= B.goal) return 'end zone';
  const r = FORTRESS.body;
  if (bodies.some((a) => a.x > p.x0 - r && a.x < p.x1 + r && a.y > p.y0 - r && a.y < p.y1 + r)) return 'body';
  return null;
}

export default registerAbility({
  family: 'aegistron', abilityId: 'MET-06-F',
  initGame: () => ({ count: 0, armed: false, usedDrive: null }),
  hooks: {
    playStart(ctx, self) {
      self.gate = { activated: false };
      if (self.team !== 'def' || !scrimmage(ctx)) return;
      const st = ctx.state(self); if (!st.armed || !able(ctx, self)) return;
      if (ctx.drive != null && st.usedDrive === ctx.drive) return; // once per defensive possession
      const { panels, refusal: why } = safePanels(self.x, self.y, self.mastery, ctx.bounds, ctx.actors.filter((a) => a !== self)); // N8b: longest safe panels
      if (why) { ctx.log(`${self.name}'s Fortress Gate finds no safe ground (${why})`, { kind: 'ability_blocked', by: self.slot, side: self.team, ability: 'MET-06-F', reason: why }); return; } // bar and use kept
      if (!ctx.canStartSignature(self)) return; // denied: bar and use kept
      for (const p of panels) ctx.addObstacle({ ...p, owner: self.mid, ability: 'MET-06-F', kind: 'gate' });
      st.armed = false; st.count = 0; st.usedDrive = ctx.drive; self.gate.activated = true; ctx.executed(self);
      ctx.log(`${self.name} raises the Fortress Gate`, { kind: 'ability', by: self.slot, side: self.team, ability: 'MET-06-F', panels: panels.map((p) => [p.x0, p.x1, p.y0, p.y1].map((v) => +v.toFixed(2))) });
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || !scrimmage(ctx) || self.gate?.activated) return; // the activation play cannot charge
      const st = ctx.state(self); if (st.armed) return;
      if (s.gain <= FORTRESS.maxGain && ctx.canGainCharge(self)) { st.count += 1; if (st.count >= FORTRESS.plays) st.armed = true; }
    },
  },
});
