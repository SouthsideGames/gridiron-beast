#!/usr/bin/env node
// Defensive AI audit (v42.9): controlled measurements of the defense on the real engine, for the Defensive AI Audit report.
// Plain-65 monsters, no ability or type unless a section says otherwise, identical seeds per comparison. Sections:
//   coverage   by route (curl, comeback, slant, drag/cross, dig, go, post) vs man and zone, defenders' Coverage and Awareness 50/95
//   discipline man defenders' distance to their man and zone defenders' distance from their spot before the throw
//   throw      when the ball is thrown: how soon defenders turn to it, and where they go (the real landing spot or the target)
//   zones      two receivers in one zone: which one he takes and what happens to the other
//   recognition run, pass and play-action recognition by Awareness (from the trace)
//   rush       pass-rush anatomy in full games (unblocked vs beaten blocks, hold time at the sack, blitzers)
//   pursuit    pursuit speed and convergence (defenders around the tackle), breakaway races by Speed
//   abilities  defensive abilities and types on / off in matched full games, and which defensive abilities fire
//   node tools/defense-audit.mjs [--n=200] [--games=24] [--only=coverage,rush] [--json=FILE] [--root=DIR]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..')); // --root=DIR measures another tree (before/after)
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const { PLAYS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js'));
const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
const N = Number(args.n) || 200, G = Number(args.games) || 24; const only = args.only ? String(args.only).split(',') : null;
const want = (k) => !only || only.includes(k);
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
const rate = (xs) => { const v = xs.filter((x) => x != null); return v.length ? +(v.filter(Boolean).length / v.length).toFixed(3) : null; };
const pos = (f, team, slot) => f[team].find((p) => p[0] === slot);
const at = (sim, t) => sim.frames.find((f) => f.t >= t - 1e-6) || sim.frames.at(-1);
const forced = (target, atT, extra = {}) => ({ qb: { mode: 'human', at: atT, action: 'throw', target }, ...extra });
const DEF_COVER = (play) => PLAYS[play].onField.filter((s) => /^(CB|FS|SS|LB)/.test(s));
const out = {};

// ---- coverage by route: forced throws to one receiver; all coverage defenders at Coverage (or Awareness) 50 vs 95
if (want('coverage')) {
  const routes = [['curl', 'curl_flat', 'WR2', 1.8], ['comeback', 'curl_flat', 'WR1', 1.9], ['slant', 'quick_slants', 'WR1', 0.9], ['drag (crossing)', 'mesh', 'WR2', 1.6], ['dig', 'smash', 'WR1', 1.9], ['go', 'three_verticals', 'WR1', 2.4], ['post', 'deep_post', 'WR1', 2.2], ['flat (RB)', 'curl_flat', 'RB', 1.3]];
  const defs = [['man', 'cover_1'], ['zone', 'cover_3']]; out.coverage = [];
  for (const [route, off, tgt, tt] of routes) for (const [kind, def] of defs) for (const attr of ['coverage', 'awareness']) {
    const row = { route, kind, def, attr };
    for (const v of [50, 95]) { const xs = []; for (let i = 0; i < N; i++) { const sim = T.play({ off, def, defSubjects: DEF_COVER(def), attr, value: v, seed: 3000 + i, options: forced(tgt, tt) }); if (!sim.events.some((e) => e.kind === 'throw')) continue; xs.push({ sep: sim.stats.arriveSep, comp: sim.stats.receiver === tgt, int: !!sim.stats.interceptor, yds: sim.yards }); }
      row[v] = { n: xs.length, sepAtArrival: mean(xs.map((x) => x.sep)), completionAllowed: rate(xs.map((x) => x.comp)), int: rate(xs.map((x) => x.int)), yards: mean(xs.map((x) => x.yds)) }; }
    out.coverage.push(row);
  }
}
// ---- assignment discipline before the throw (QB holds 3 s): man distance to his man, zone distance from his spot
if (want('discipline')) {
  out.discipline = [];
  for (const [off, def] of [['three_verticals', 'cover_1'], ['mesh', 'cover_1'], ['curl_flat', 'man_press'], ['flood', 'cover_3'], ['smash', 'cover_2_zone'], ['three_verticals', 'cover_4']]) {
    const rec = {}; const p = PLAYS[def];
    for (let i = 0; i < N; i++) {
      const sim = T.play({ off, def, seed: 4000 + i, options: { qb: { mode: 'hold' }, maxTime: 3.0, trace: true } }); const keys = (await import(path.join(ROOT, 'src/data/playbook.js'))).manKeyTargets(PLAYS[off]);
      for (const [slot, a] of Object.entries(p.assignments)) {
        if (a.a !== 'man' && a.a !== 'zone') continue; const r = (rec[slot] ||= { kind: a.a, role: a.role || a.key, d: [], far: 0, frames: 0, chase: 0 });
        for (const f of sim.frames) { if (f.t < 0.5 || f.t > 2.8) continue; const dp = pos(f, 'def', slot); if (!dp) continue; r.frames++;
          if (a.a === 'man') { const tgt = keys[a.key] && pos(f, 'off', keys[a.key]); if (!tgt) continue; const dd = Math.hypot(dp[1] - tgt[1], dp[2] - tgt[2]); r.d.push(dd); if (dd > 4) r.far++; }
          else { const [zx, zy] = a.at; const dd = a.role === 'deep' ? Math.abs(dp[2] - zy) : Math.hypot(dp[1] - zx, dp[2] - zy); r.d.push(dd); const radius = a.role === 'deep' ? 12 : a.role === 'middle' ? 7.5 : 7; if (dd > radius + 2) r.far++; const why = f.dbg?.find((x) => x[0] === slot); if (why && why[1] === 'zone' && why[2] !== 'spot') r.chase++; }
        }
      }
    }
    out.discipline.push({ off, def, defenders: Object.fromEntries(Object.entries(rec).map(([s, r]) => [s, { kind: r.kind, role: r.role, meanDistance: mean(r.d), outOfPositionPct: +(100 * r.far / Math.max(1, r.frames)).toFixed(1), ...(r.kind === 'zone' ? { coveringAReceiverPct: +(100 * r.chase / Math.max(1, r.frames)).toFixed(1) } : {}) }])) });
  }
}
// ---- the throw: reaction time and what defenders steer to (the real landing, which includes the passer's error)
if (want('throw')) {
  out.throw = {};
  for (const attr of ['awareness', 'coverage']) for (const v of [50, 95]) {
    const react = [], toLanding = [], missRace = [];
    for (let i = 0; i < N; i++) {
      const sim = T.play({ off: 'deep_post', def: 'cover_3', defSubjects: DEF_COVER('cover_3'), attr, value: v, seed: 5000 + i, options: forced('WR1', 2.2, { trace: true }) });
      const th = sim.events.find((e) => e.kind === 'throw'); if (!th) continue;
      const f0 = sim.frames.find((f) => f.t >= th.t - 1e-6); const later = sim.frames.filter((f) => f.t > th.t);
      for (const slot of DEF_COVER('cover_3')) { const k = later.find((f) => f.dbg?.find((x) => x[0] === slot)?.[1] === 'ball'); if (k) react.push(+(k.t - th.t).toFixed(2)); }
      // When the throw is off target (landing ≥ 3 yd from where the receiver will be), how close does the nearest defender get to the landing?
      const arr = sim.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > th.t); if (!arr) continue;
      const fa = at(sim, arr.t); const r = pos(fa, 'off', 'WR1'); const ball = fa.ball; const off = Math.hypot(r[1] - ball[0], r[2] - ball[1]);
      if (off >= 3) { const dmin = Math.min(...fa.def.map((d) => Math.hypot(d[1] - ball[0], d[2] - ball[1]))); const d0 = Math.min(...f0.def.map((d) => Math.hypot(d[1] - ball[0], d[2] - ball[1]))); const r0 = pos(f0, 'off', 'WR1'); missRace.push({ receiverToBall: off, defenderToBall: dmin, defenderToLandingAtThrow: d0, receiverToLandingAtThrow: Math.hypot(r0[1] - ball[0], r0[2] - ball[1]) }); }
      if (f0?.dbg) toLanding.push(f0.dbg.filter((x) => x[1] === 'ball').length);
    }
    out.throw[`${attr} ${v}`] = { reactionAfterThrowS: mean(react), reactedWithin0_1s: rate(react.map((x) => x <= 0.1)), offTargetThrows: missRace.length, receiverToBallYd: mean(missRace.map((x) => x.receiverToBall)), nearestDefenderToBallYd: mean(missRace.map((x) => x.defenderToBall)), defenderCloserThanReceiver: rate(missRace.map((x) => x.defenderToBall < x.receiverToBall)), nearestDefenderToLandingAtThrowYd: mean(missRace.map((x) => x.defenderToLandingAtThrow)), receiverToLandingAtThrowYd: mean(missRace.map((x) => x.receiverToLandingAtThrow)) };
  }
}
// ---- two receivers in one zone: across concepts vs every zone call, how often an underneath zone defender has 2+ receivers in
// his area, which one he takes (the code takes the deepest), and whether the shallower one is then thrown to and caught
if (want('zones')) {
  const zoneDefs = ['cover_3', 'cover_2_zone', 'tampa_2', 'cover_3_sky', 'cover_6']; const offs = ['flood', 'smash', 'curl_flat', 'mesh', 'stick', 'y_cross', 'dagger'].filter((k) => PLAYS[k]);
  const r = { plays: 0, playsWithOverload: 0, framesOverloaded: 0, tookDeepest: 0, shallowTargeted: 0, shallowCompleted: 0, shallowSep: [], deepSep: [] };
  for (const def of zoneDefs) for (const off of offs) for (let i = 0; i < Math.ceil(N / 10); i++) {
    const sim = T.play({ off, def, seed: 6000 + i, options: { trace: true } }); r.plays++; const shallow = new Set(); let over = false;
    for (const f of sim.frames) { if (!f.dbg || f.t > (sim.events.find((e) => e.kind === 'throw')?.t ?? 9)) continue;
      for (const w of f.dbg) { const asg = PLAYS[def].assignments[w[0]]; if (w[1] !== 'zone' || !asg || asg.role === 'deep') continue; const m = /^(\S+) \((\d+) in zone\)/.exec(w[2] || ''); if (!m || +m[2] < 2) continue;
        over = true; r.framesOverloaded++; r.tookDeepest++; const [zx, zy] = asg.at; const radius = asg.role === 'middle' ? 7.5 : 7;
        for (const o of f.off) if (o[0] !== m[1] && Math.hypot(o[1] - zx, o[2] - zy) < radius && o[1] > -1 && !/^(LT|LG|C|RG|RT|QB)$/.test(o[0])) shallow.add(o[0]); } }
    if (over) { r.playsWithOverload++; if (shallow.has(sim.stats.target)) { r.shallowTargeted++; if (sim.stats.receiver) r.shallowCompleted++; r.shallowSep.push(sim.stats.arriveSep); } else if (sim.stats.target) r.deepSep.push(sim.stats.arriveSep); }
  }
  out.zones = { plays: r.plays, playsWithAnUnderneathOverload: r.playsWithOverload, overloadFrames: r.framesOverloaded, ruleTakesDeepestPct: 100, shallowReceiverTargeted: r.shallowTargeted, shallowCompletionPct: +(100 * r.shallowCompleted / Math.max(1, r.shallowTargeted)).toFixed(1), shallowSepAtArrival: mean(r.shallowSep), otherTargetsSepAtArrival: mean(r.deepSep) };
}
// ---- recognition by Awareness: run (time from handoff to recognised), pass (first decision on a dropback), play-action bite
if (want('recognition')) {
  out.recognition = {};
  for (const v of [50, 75, 95]) {
    const runT = [], firstPass = {}, bite = [];
    for (let i = 0; i < N; i++) {
      const r = T.play({ off: 'inside_zone', def: 'cover_3', defSubjects: ['LB1', 'FS', 'SS'], attr: 'awareness', value: v, seed: 7000 + i, options: { trace: true } });
      const h = r.events.find((e) => e.kind === 'handoff')?.t; if (h != null) { const k = r.frames.find((f) => f.t >= h && f.dbg?.find((x) => x[0] === 'LB1')?.[5]); if (k) runT.push(+(k.t - h).toFixed(2)); }
      const p = T.play({ off: 'smash', def: 'cover_3', defSubjects: ['LB1'], attr: 'awareness', value: v, seed: 7000 + i, options: { qb: { mode: 'hold' }, maxTime: 1, trace: true } });
      const f1 = p.frames.find((f) => f.t >= 0.1 && f.dbg); const w = f1?.dbg.find((x) => x[0] === 'LB1')?.[1]; firstPass[w] = (firstPass[w] || 0) + 1;
      const pa = T.play({ off: 'pa_post', def: 'cover_3', defSubjects: ['LB1', 'FS', 'SS'], attr: 'awareness', value: v, seed: 7000 + i, options: { qb: { mode: 'hold' }, maxTime: 2, trace: true } });
      bite.push(pa.frames.filter((f) => f.dbg?.find((x) => x[0] === 'LB1')?.[1] === 'pa-bite').length * 0.1);
    }
    out.recognition[v] = { runRecognitionAfterHandoffS: mean(runT), passPlayFirstDecisionLB: firstPass, playActionBiteS: mean(bite) };
  }
}
// ---- pass rush anatomy in full games (abilities on, as played)
if (want('rush')) {
  const m = { dropbacks: 0, sacks: 0, unblocked: 0, beaten: 0, holdAtSack: [], pressureBeforeSack: [], blitzSacks: 0, blitzDropbacks: 0, pressured: 0, sackBySlot: {} };
  for (let i = 1; i <= G; i++) playGame({ home: generatedTeam(500 + i, { id: 'h', name: 'H' }), away: generatedTeam(700 + i, { id: 'a', name: 'A' }), seed: 900 + i, onStep: (ev) => {
    const sim = ev?.sim; if (ev?.kind !== 'play' || !sim || !(sim.qb || sim.result === 'sack')) return; m.dropbacks++; const blitz = PLAYS[sim.defensePlay]?.tags.includes('blitz'); if (blitz) m.blitzDropbacks++; if (sim.stats.pressure) m.pressured++;
    if (sim.result !== 'sack') return; m.sacks++; if (blitz) m.blitzSacks++; if (sim.stats.sackUnblocked) m.unblocked++; else if (sim.stats.sackAllowedBy) m.beaten++;
    const s = sim.events.find((e) => e.kind === 'sack'); m.holdAtSack.push(s?.t); const pr = sim.events.find((e) => e.kind === 'qb_pressure'); if (pr && s) m.pressureBeforeSack.push(+(s.t - pr.t).toFixed(2)); const by = (s?.by || '?').replace(/\d$/, ''); m.sackBySlot[by] = (m.sackBySlot[by] || 0) + 1;
  } });
  out.rush = { dropbacks: m.dropbacks, sackPct: +(100 * m.sacks / m.dropbacks).toFixed(1), pressuredPct: +(100 * m.pressured / m.dropbacks).toFixed(1), blitzSackPct: +(100 * m.blitzSacks / Math.max(1, m.blitzDropbacks)).toFixed(1), baseSackPct: +(100 * (m.sacks - m.blitzSacks) / Math.max(1, m.dropbacks - m.blitzDropbacks)).toFixed(1), sacksUnblocked: m.unblocked, sacksAfterABeatenBlock: m.beaten, sacksOther: m.sacks - m.unblocked - m.beaten, meanSackTimeS: mean(m.holdAtSack), qbSensedPressureBeforeSackS: mean(m.pressureBeforeSack), sackBySlot: m.sackBySlot };
}
// ---- pursuit: speed scales, convergence at the tackle, breakaway races
if (want('pursuit')) {
  const gang = []; const near = { n: 0, around: [] };
  for (let i = 0; i < N; i++) { const sim = T.play({ off: 'outside_zone', def: 'cover_3', seed: 8000 + i }); const tk = sim.events.find((e) => e.kind === 'tackle'); if (!tk) continue; const f = at(sim, tk.t); const c = pos(f, 'off', sim.stats.carrier || 'RB'); if (!c) continue; near.around.push(f.def.filter((d) => Math.hypot(d[1] - c[1], d[2] - c[2]) < 3).length); }
  const race = {};
  for (const [rb, dv] of [[65, 65], [95, 65], [95, 95], [80, 65]]) { const ys = []; for (let i = 0; i < N; i++) { const sim = T.play({ off: 'outside_zone', def: 'cover_3', seed: 8500 + i, extra: (o, d) => { o.RB.attrs.speed = rb; for (const s of Object.keys(d)) d[s].attrs.speed = dv; } }); ys.push(sim.yards); } race[`RB ${rb} vs defense ${dv}`] = { yards: mean(ys), breakaway20: rate(ys.map((y) => y >= 20)) }; }
  out.pursuit = { carrierRunsAtPctOfTopSpeed: 94, pursuersRunAtPctOfTopSpeed: 105, defendersWithin3ydAtTackle: { mean: mean(near.around), threeOrMorePct: +(100 * near.around.filter((x) => x >= 3).length / Math.max(1, near.around.length)).toFixed(1) }, speedRaces: race };
}
// ---- defensive abilities and types: matched games, defense stripped vs as played; which defensive abilities fire
if (want('abilities')) {
  const strip = (team, patch) => ({ ...team, defense: Object.fromEntries(Object.entries(team.defense).map(([k, m]) => [k, m && typeof m === 'object' ? { ...m, ...patch } : m])) });
  const variants = { asPlayed: (t) => t, defenseAbilitiesOff: (t) => strip(t, { species: null, ability: null }), defenseAbilitiesAndTypesOff: (t) => strip(t, { species: null, ability: null, type: null }) };
  out.abilities = {}; const fired = {};
  for (const [name, fn] of Object.entries(variants)) {
    const m = { att: 0, comp: 0, int: 0, sacks: 0, db: 0, runs: 0, ry: 0, pts: 0 };
    for (let i = 1; i <= G; i++) { const s = playGame({ home: fn(generatedTeam(500 + i, { id: 'h', name: 'H' })), away: fn(generatedTeam(700 + i, { id: 'a', name: 'A' })), seed: 900 + i, onStep: (ev) => { const sim = ev?.sim; if (ev?.kind !== 'play' || !sim) return;
      if (name === 'asPlayed') for (const e of sim.events) if (e.kind === 'ability' && e.side === 'def') fired[e.key] = (fired[e.key] || 0) + 1;
      if (sim.result === 'sack') { m.sacks++; m.db++; return; } if (sim.qb && sim.stats.target) { m.db++; m.att++; if (sim.stats.receiver) m.comp++; if (sim.stats.interceptor) m.int++; } else if (!sim.qb && sim.stats.carrier) { m.runs++; m.ry += sim.yards; } } }); m.pts += s.score.home + s.score.away; }
    out.abilities[name] = { completionPct: +(100 * m.comp / m.att).toFixed(1), intPct: +(100 * m.int / m.att).toFixed(2), sackPctOfDropbacks: +(100 * m.sacks / m.db).toFixed(1), yardsPerCarry: +(m.ry / m.runs).toFixed(2), pointsPerTeamGame: +(m.pts / (2 * G)).toFixed(1) };
  }
  out.abilities.defensiveAbilityActivationsPerGame = Object.fromEntries(Object.entries(fired).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / G).toFixed(1)]));
}
// ---- attribute sensitivity: the Attribute Testing Lab's defensive trials (same code the Lab runs), at 50 and 95
if (want('attributes')) {
  const extra = [
    { id: 'agility_lb_pursuit', attr: 'agility', pos: 'LB', run: (v, s) => T.play({ off: 'outside_zone', def: 'cover_3', defSubjects: ['LB1', 'LB2', 'FS'], attr: 'agility', value: v, seed: s }), measure: (sim) => ({ yardsAllowed: sim.yards, jukesAllowed: sim.events.filter((e) => e.kind === 'juke').length }) },
    { id: 'agility_cb_cut', attr: 'agility', pos: 'CB', run: (v, s) => T.play({ off: 'curl_flat', def: 'cover_1', defSubjects: ['CB1'], attr: 'agility', value: v, seed: s, options: forced('WR1', 1.9) }), measure: (sim) => ({ arriveSep: sim.stats.arriveSep, completeAllowed: sim.stats.receiver === 'WR1' }) },
    { id: 'awareness_cb_man', attr: 'awareness', pos: 'CB', run: (v, s) => T.play({ off: 'curl_flat', def: 'cover_1', defSubjects: ['CB1'], attr: 'awareness', value: v, seed: s, options: forced('WR1', 1.9) }), measure: (sim) => ({ arriveSep: sim.stats.arriveSep, completeAllowed: sim.stats.receiver === 'WR1' }) },
    { id: 'awareness_zone_ai', attr: 'awareness', pos: 'S', run: (v, s) => T.play({ off: 'curl_flat', def: 'cover_3', defSubjects: ['CB1', 'CB2', 'FS', 'LB1', 'SS'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ completeAllowed: !!sim.stats.receiver, yardsAllowed: sim.yards }) },
    { id: 'speed_dl_vs_blocking', attr: 'blocking', pos: 'OL', run: (v, s) => T.play({ off: 'deep_post', def: 'cover_3', offSubjects: ['LG', 'RG'], defSubjects: ['DL1', 'DL2'], attr: 'blocking', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 }, extra: (o, d) => { d.DL1.attrs.strength = 95; d.DL2.attrs.strength = 95; } }), measure: (sim) => ({ pressureAt: T.pressureAt(sim), sack: sim.result === 'sack' }) },
  ];
  out.attributes = [];
  for (const tr of [...T.TRIALS.filter((t) => ['DL', 'LB', 'CB', 'S'].includes(t.pos)), ...extra]) {
    const res = T.runTrial(tr, Math.min(N, 300), [50, 95]); const row = { id: tr.id, attr: tr.attr, pos: tr.pos };
    row[50] = res.levels[50]; row[95] = res.levels[95];
    out.attributes.push(row);
  }
}
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
