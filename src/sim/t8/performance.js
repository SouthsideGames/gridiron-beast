// Individual performance telemetry, separate from the ordinary box score. A clone's
// credited stats remain in that box score but never enter its owner's grade.
export function mergePerformance(a = {}, b = {}) {
  for (const [key, value] of Object.entries(b)) {
    if (Array.isArray(value)) (a[key] ||= []).push(...value);
    else if (value && typeof value === 'object') a[key] = mergePerformance(a[key] || {}, value);
    else if (typeof value === 'number') { if (!Number.isFinite(value)) throw new RangeError(`invalid performance counter ${key}`); a[key] = (a[key] || 0) + value; }
  }
  return a;
}
export function recordPerformance(state, sim, off, def, { toGo = 10, down = 1 } = {}) {
  const st = sim.stats || {}, cp = st.cloneProvenance || {}, res = sim.result, gain = sim.yards || 0;
  const td = res === 'touchdown' && !st.defensiveScore;
  const first = !td && !['interception', 'fumble', 'touchback_return', 'sack', 'incomplete', 'throwaway'].includes(res) && gain >= toGo;
  const table = { off: {}, def: {} };
  const row = (side, slot) => (table[side][slot] ||= {});
  const add = (side, slot, data) => { if (slot && sim.names?.[side]?.[slot]) mergePerformance(row(side, slot), data); };
  const receiving = (slot) => {
    const caught = st.receiver === slot && !cp.receiver;
    const targeted = st.target === slot && !cp.target;
    const fumbled = st.fumbledBy === slot && !cp.fumbledBy;
    const e = { reception: caught, firstDown: first && caught, touchdown: td && caught, catchableDrop: targeted && !!st.dropped, fumble: fumbled };
    const rz = sim.ballOn >= 80;
    add('off', slot, { targets: +targeted, receptions: +caught, yards: caught ? gain : 0, touchdowns: +(td && caught), firstDowns: +(first && caught), lateDownFirstDowns: +(first && caught && down >= 3), drops: +(targeted && !!st.dropped), yac: caught ? st.yac || 0 : 0, explosives: +(caught && gain >= 20), redZoneFirstDowns: +(first && caught && rz), redZoneReceptions: +(caught && !td && rz), situationalOpportunities: +(targeted && (down >= 3 || rz || first)), reliabilityOpportunities: +(caught || (targeted && st.catchableTarget) || (targeted && !!st.dropped)), fumbles: +fumbled, plays: [e] });
  };
  if (st.target && !cp.target) receiving(st.target);
  const passer = st.passer || (res === 'sack' ? 'QB' : null);
  if (passer && !cp.passer) add('off', passer, { attempts: +(res !== 'sack'), completions: +(!!st.receiver && res !== 'sack'), plays: [{ completion: !!st.receiver, firstDown: first, touchdown: td, fumble: st.fumbledBy === passer && !cp.fumbledBy, attributableInterception: !!st.interceptor && !st.unavoidableOverride }] });
  if (st.carrier && !st.receiver && !st.passer && res !== 'sack' && !st.defensiveScore && !cp.carrier) add('off', st.carrier, { carries: 1, rushingYards: gain, fumbles: +(st.fumbledBy === st.carrier && !cp.fumbledBy), plays: [{ carry: true, qbRun: st.carrier === 'QB', yards: gain, firstDown: first, touchdown: td, fumble: st.fumbledBy === st.carrier && !cp.fumbledBy }] });
  for (const [slot, b] of Object.entries(st.blockers || {})) {
    const failure = st.sackAllowedBy === slot || st.pressureAllowedBy === slot;
    const success = !b.lost && !failure && (b.runContribution || b.protectionTime >= .5);
    // A shed is disruptive only if it led to a verified pressure, stop or sack.
    add('off', slot, { blocks: [{ sackAllowed: st.sackAllowedBy === slot, pressureAllowed: st.pressureAllowedBy === slot, disruptiveShedAllowed: !!b.lost && st.tackler && st.tackler === b.shedBy && gain <= 2, pancake: b.pancakes > 0, success: !!success }] });
  }
  for (const [slot, asg] of Object.entries(sim.assignments?.def || {})) {
    const rush = !sim.isRun && ['rush', 'contain'].includes(asg?.a);
    const sack = res === 'sack' && st.tackler === slot && !cp.tackler;
    const pressure = st.pressureBy === slot && !cp.pressureBy;
    const run = !st.passer && !st.receiver && !st.defensiveScore && res !== 'sack';
    const tackle = st.tackler === slot && !cp.tackler && !sack;
    const ff = st.forcedBy === slot && !cp.forcedBy;
    const interception = st.interceptor === slot && !cp.interceptor;
    const breakup = st.pbuBy === slot && !interception && !cp.pbuBy;
    const recovery = st.recoveredTeam === 'def' && st.recoveredSlot === slot && !cp.recoveredSlot;
    const missed = !!st.missedTackles?.[slot];
    const gapFailure = !!st.gapFailure?.[slot], redirect = !!st.gapRedirect?.[slot];
    const lostContain = !!st.lostContain?.[slot];
    const yac = st.receiver ? st.yac || 0 : null;
    const targetExcluded = (st.gradeCoverBy ?? st.coverBy) === slot && (st.dropped || st.catchableTarget === false);
    const tackling = missed ? [-1] : tackle ? [yac == null ? gain <= 2 ? 1 : 0 : yac > 5 ? -1 : yac <= 2 ? 1 : 0] : st.assistBy === slot && !cp.assistBy ? [.5] : redirect || st.containRedirect?.[slot] ? [1] : st.tackleAttempts?.[slot] ? [0] : [];
    add('def', slot, { defensiveSnaps: 1, disciplineOpportunities: 1, missedTackles: +missed, lostContain: +lostContain, gapFailures: +gapFailure, forcedFumbles: +ff, interceptions: +interception, breakups: +breakup, recoveries: +recovery, fourthDownStops: +(down === 4 && !td && !first && !interception && (tackle || breakup)), tackling, safetyRunSupport: gapFailure ? [-1] : tackling.length ? tackling : redirect ? [1] : [], cornerRunSupport: lostContain ? [-1] : tackling.length ? tackling : st.containRedirect?.[slot] ? [1] : [], safetyAssignment: lostContain ? [-1] : !st.coverageOverrides?.[slot] && !targetExcluded && st.coverageExecution?.[slot] != null ? [st.coverageExecution[slot]] : [], assignment: st.containRedirect?.[slot] || (st.doubleTeamOccupation?.[slot] && ((st.pressureBy && st.pressureBy !== slot) || (st.tackler && st.tackler !== slot && gain <= 2))) ? [1] : [], disruption: [ff ? 3 : breakup || st.penetrationDisruption?.[slot] ? 1 : 0], ...(rush ? { passRush: [sack ? 2 : pressure ? 1 : 0] } : {}), ...(run ? { runDefense: [gapFailure ? -1 : tackle && gain < 0 ? 2 : (tackle && gain <= 2) || redirect ? 1 : 0] } : {}) });
    if (!st.unavoidableOverride && !st.coverageOverrides?.[slot] && !targetExcluded && st.coverageExecution?.[slot] != null) add('def', slot, { execution: [st.coverageExecution[slot]] });
    if ((st.gradeCoverBy ?? st.coverBy) === slot && st.passer && !st.unavoidableOverride && !st.coverageOverrides?.[slot] && !cp.coverBy && !st.dropped && st.catchableTarget !== false && !['sack', 'throwaway'].includes(res)) add('def', slot, { coverage: { targets: 1, completions: +!!st.receiver, yards: st.receiver ? gain : 0, firstDownOrTd: +((first || td) && !!st.receiver), touchdowns: +(td && !!st.receiver) }, coverageScores: [interception ? 2 : breakup ? 1 : st.receiver ? first || td ? -2 : -1 : 0] });
  }
  for (const [relative, side] of [['off', off], ['def', def]]) for (const [slot, data] of Object.entries(table[relative])) {
    const p = (state.stats[side].players[slot] ||= {});
    p.performance = mergePerformance(p.performance, data);
  }
}
