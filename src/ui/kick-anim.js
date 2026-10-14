// Animated kickoffs, punts and field goals. The rules engine resolves kicks
// statistically (distance, return, make/miss); this builds frames in the same
// format as the scrimmage engine so the field view can play them. Coordinates
// are absolute yards from the KICKING team's goal line (ballOn 0), kicking
// team attacking up the screen. Frames every 0.1 s.

const DT = 0.1;
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);

function stepToward(p, tx, ty, speed) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d <= speed * DT) { p.x = tx; p.y = ty; return true; }
  p.x += (dx / d) * speed * DT; p.y += (dy / d) * speed * DT; return false;
}

function frame(t, off, def, ball, holder, holderTeam) {
  return { t: +t.toFixed(2), off: off.map((a) => [a.slot, +a.x.toFixed(2), +a.y.toFixed(2), 0]), def: def.map((a) => [a.slot, +a.x.toFixed(2), +a.y.toFixed(2), 0]), ball: [+ball.x.toFixed(2), +ball.y.toFixed(2), ball.air ? 1 : 0], holder, holderTeam, phase: 'kick' };
}

/** Kick, flight, then an optional return chased by the coverage team. */
function kickSequence({ kickFrom, kickerStart, landing, landingY = 0, returnTo, catchIt = true, fairCatch = false, touchdown = false, off, def, kicker, returner, flight }) {
  const frames = []; let t = 0;
  const ball = { x: kickFrom, y: 0, air: false };
  // 1. Approach.
  for (let i = 0; i < 5; i++) {
    stepToward(kicker, kickFrom - 0.5, 0, 6);
    for (const c of off) if (c !== kicker) stepToward(c, c.x + 0.6, c.y, 3);
    frames.push(frame(t, off, def, ball, null, null)); t += DT;
  }
  // 2. Flight: coverage sprints, return team sets up.
  const steps = Math.max(8, Math.round(flight / DT));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    ball.air = true; ball.x = lerp(kickFrom, landing, ease(k)); ball.y = lerp(0, landingY, k);
    for (const c of off) if (c !== kicker) stepToward(c, Math.min(landing - 4, c.x + 20), c.y * 0.94, 8.5);
    stepToward(returner, landing, landingY, 6);
    for (const b of def) if (b !== returner) stepToward(b, Math.max(landing - 18, b.x - 1), b.y * 0.9, 5);
    frames.push(frame(t, off, def, ball, null, null)); t += DT;
  }
  ball.air = false;
  if (!catchIt) { // ball dies (touchback into the end zone, missed kick)
    for (let i = 0; i < 6; i++) { frames.push(frame(t, off, def, ball, null, null)); t += DT; }
    return frames;
  }
  returner.x = landing; returner.y = landingY; ball.x = landing; ball.y = landingY;
  if (fairCatch || returnTo == null || Math.abs(returnTo - landing) < 0.5) {
    for (let i = 0; i < 8; i++) { for (const c of off) if (c !== kicker) stepToward(c, returner.x + 2.5, returner.y + (c.y > 0 ? 2 : -2), 6); frames.push(frame(t, off, def, ball, returner.slot, 'def')); t += DT; }
    return frames;
  }
  // 3. Return: weave toward the end spot; coverage converges; nearest makes the tackle.
  const dist = Math.abs(landing - returnTo); const retSteps = Math.max(10, Math.round(dist / 8.2 / DT));
  const weave = (returner.y > 0 ? -1 : 1) * Math.min(9, dist / 4);
  for (let i = 1; i <= retSteps; i++) {
    const k = i / retSteps;
    returner.x = lerp(landing, returnTo, k); returner.y = landingY + Math.sin(k * Math.PI) * weave;
    ball.x = returner.x; ball.y = returner.y;
    for (const c of off) stepToward(c, returner.x + (touchdown ? 3 : 0.8), returner.y, c === kicker ? 7 : 8.8);
    for (const b of def) if (b !== returner) stepToward(b, returner.x - 1.5, b.y * 0.8 + returner.y * 0.2, 7);
    frames.push(frame(t, off, def, ball, returner.slot, 'def')); t += DT;
  }
  if (!touchdown) { // tackle: closest cover man arrives
    const tackler = off.slice().sort((a, b) => Math.hypot(a.x - returner.x, a.y - returner.y) - Math.hypot(b.x - returner.x, b.y - returner.y))[0];
    tackler.x = returner.x + 0.7; tackler.y = returner.y;
  }
  for (let i = 0; i < 4; i++) { frames.push(frame(t, off, def, ball, returner.slot, 'def')); t += DT; }
  return frames;
}

const P = (slot, x, y) => ({ slot, x, y });

/** Frames for a kick event from the game runner, or null if it can't be drawn. */
export function kickFrames(ev) {
  const res = ev?.res; if (!res) return null;
  if (ev.kind === 'kickoff') {
    const from = ev.free ? 20 : 35;
    const off = [P('K', from - 6, 0), P('L1', from - 1, -6), P('L2', from - 1, -14), P('L3', from - 1, -21), P('R1', from - 1, 6), P('R2', from - 1, 14), P('R3', from - 1, 21)];
    const recvToKick = (b) => 100 - b; // receiving team's yard line -> kicking coordinates
    let landing, returnTo = null, catchIt = true;
    if (res.onside) { landing = from + 11; returnTo = landing; }
    else if (res.touchback) { landing = 104; catchIt = false; }
    else if (res.touchdown) { landing = 100 - Math.max(-5, 100 - (res.returnYards || 90)); landing = Math.min(105, Math.max(70, landing)); returnTo = -2; }
    else { const start = res.ballOn - (res.returnYards || 0); landing = recvToKick(start); returnTo = recvToKick(res.ballOn); }
    const def = [P('KR', Math.min(105, landing), 0), P('B1', 70, -10), P('B2', 70, 10), P('B3', 62, -16), P('B4', 62, 16), P('B5', 58, -5), P('B6', 58, 5)];
    if (res.onside) def.forEach((b, i) => { b.x = from + 10 + (i % 3); });
    return kickSequence({ kickFrom: from, landing, returnTo, catchIt, touchdown: !!res.touchdown, off, def, kicker: off[0], returner: def[0], flight: res.onside ? 0.9 : 2.6, fairCatch: !!res.onside });
  }
  if (ev.kind === 'punt') {
    const b = ev.from; const puntFrom = b - 10;
    const off = [P('P', puntFrom, 0), P('L1', b - 0.6, -2), P('C', b - 0.4, 0), P('L2', b - 0.6, 2), P('W1', b - 1, -6), P('G1', b - 0.6, -20), P('G2', b - 0.6, 20)];
    const def = [P('PR', Math.min(104, b + 40), 0), P('D1', b + 1, -2), P('D2', b + 1, 2), P('D3', b + 1, -6), P('D4', b + 1, 6), P('D5', b + 5, -16), P('D6', b + 5, 16)];
    if (res.blocked) {
      const ball = { x: puntFrom, y: 0, air: false }; const frames = []; let t = 0;
      for (let i = 0; i < 10; i++) { for (const d of def) if (d.slot !== 'PR') stepToward(d, puntFrom + 0.5, d.y * 0.5, 7); if (i > 5) { ball.x = puntFrom - 4; } frames.push(frame(t, off, def, ball, null, null)); t += DT; }
      return frames;
    }
    let landing, returnTo = null, catchIt = true, fair = false;
    if (res.touchback) { landing = 103; catchIt = false; }
    else if (res.touchdown) { landing = Math.min(98, b + 40); returnTo = -2; }
    else { landing = b + (res.distance || 40); if (res.fairCatch) fair = true; else if (res.returnYards != null) returnTo = 100 - res.ballOn; else { catchIt = false; } }
    def[0].x = Math.min(104, landing + 6);
    return kickSequence({ kickFrom: puntFrom, landing, returnTo, catchIt, fairCatch: fair, touchdown: !!res.touchdown, off, def, kicker: off[0], returner: def[0], flight: 2.4 });
  }
  if (ev.kind === 'field_goal') {
    const b = ev.from; const spot = b - 7;
    const off = [P('K', spot - 2, -1.5), P('H', spot, 0.4), P('L1', b - 0.6, -2), P('C', b - 0.4, 0), P('L2', b - 0.6, 2), P('W1', b - 1, -4), P('W2', b - 1, 4)];
    const def = [P('D1', b + 1, -1), P('D2', b + 1, 1), P('D3', b + 1, -3.5), P('D4', b + 1, 3.5), P('D5', b + 1.5, -6), P('D6', b + 1.5, 6), P('D7', b + 9, 0)];
    const good = !!res.good; const short = !good && res.distance > 60;
    const landing = short ? 104 : 111; const landingY = good ? 0 : short ? 0 : (res.distance % 2 ? 6 : -6);
    const frames = []; const ball = { x: spot, y: 0, air: false }; let t = 0;
    for (let i = 0; i < 5; i++) { stepToward(off[0], spot - 0.4, 0, 4); for (const d of def.slice(0, 6)) stepToward(d, b - 0.5, d.y * 0.7, 3); frames.push(frame(t, off, def, ball, 'H', 'off')); t += DT; }
    const steps = Math.round(Math.max(1.0, (landing - spot) / 38) / DT);
    for (let i = 1; i <= steps; i++) { const k = i / steps; ball.air = true; ball.x = lerp(spot, landing, k); ball.y = lerp(0, landingY, k); frames.push(frame(t, off, def, ball, null, null)); t += DT; }
    ball.air = false; for (let i = 0; i < 6; i++) { frames.push(frame(t, off, def, ball, null, null)); t += DT; }
    return frames;
  }
  return null;
}
