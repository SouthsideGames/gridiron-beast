// Evidence checks, not balance judgements. A normal miss, immunity, or empty zone is not a bug.
export function checkFranchise(f) {
  const out = []; if (!f) return out;
  const ids = new Set();
  for (const m of f.roster || []) {
    if (!m?.id || ids.has(m.id)) out.push({ code: 'roster-id', message: 'A roster monster has a missing or duplicate id.', evidence: { id: m?.id } });
    ids.add(m?.id);
    for (const [key, value] of Object.entries(m?.attributes || m?.dev?.current || {})) if (!Number.isFinite(value)) out.push({ code: 'roster-number', message: 'A roster attribute is not a finite number.', evidence: { id: m.id, key, value: String(value) } });
  }
  return out;
}
export function checkPlay(before, after, event, trace) {
  const out = [];
  const add = (code, message, evidence) => out.push({ code, message, evidence });
  if (!event && !after.finished) add('runner-stalled', 'The game returned no event before the final whistle.', { phase: after.phase });
  for (const [key, value] of Object.entries({ ballOn: after.ballOn, clock: after.clock, homeScore: after.score?.home, awayScore: after.score?.away })) {
    if (typeof value !== 'number' || !Number.isFinite(value)) add('game-number', 'A game value is missing or not finite.', { key, value: String(value) });
  }
  if (after.guard) add('runner-guard', 'The simulation used its emergency stop guard.', { phase: after.phase });
  for (const e of trace) {
    if (e.kind === 'status' && e.accepted && e.requested !== e.actual) add('status-not-applied', 'An accepted status was not stored on its target.', e);
    if (e.kind === 'field-created') {
      const f = e.field;
      if (![f.lat, f.yard].every((r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite) && r[1] > r[0])) add('field-bounds', 'A created zone has invalid bounds.', e);
      if (!Number.isFinite(f.remaining) || f.remaining <= 0) add('field-lifetime', 'A created zone has no valid remaining lifetime.', e);
    }
    if (e.kind === 'field-speed' && (!Number.isFinite(e.expected) || !Number.isFinite(e.actual) || Math.abs(e.expected - e.actual) > 1e-8 || (e.expectedMax != null && (!Number.isFinite(e.actualMax) || Math.abs(e.expectedMax - e.actualMax) > 1e-8)))) add('field-speed-not-applied', 'The zone speed modifier differs from the resolved field effect.', e);
  }
  const sim = event?.sim;
  if (sim && !Number.isFinite(sim.yards)) add('play-yards', 'A simulated play returned invalid yardage.', { yards: String(sim.yards), result: sim.result });
  return out;
}
