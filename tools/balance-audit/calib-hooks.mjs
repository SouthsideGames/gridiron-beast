// Module-load hook for tools/balance-audit/calib-experiment.mjs (final calibration F-02 / F-13; investigation only). Never imported by
// the game. In THIS process only, it rewrites:
//   CAL_RECOVERY=N      progression.js recoverWeek: weekly fatigue recovery 28 → N (a bye week keeps 50)
//   CAL_ROOKIE_Q=Q      franchise.js DIFFICULTY.rookie.quality −4 → Q (founding and replenishment quality of Rookie AI clubs)
// Each rewrite asserts its anchor, so an experiment can never silently measure the shipped behaviour.
const REC = process.env.CAL_RECOVERY, RQ = process.env.CAL_ROOKIE_Q;
const sub = (src, a, b, f) => { if (!src.includes(a)) throw new Error(`calib-hooks: anchor not found in ${f}: ${a}`); return src.replace(a, b); };
export async function load(url, context, next) {
  const r = await next(url, context);
  const prog = /\/src\/franchise\/progression\.js$/.test(url), fr = /\/src\/franchise\/franchise\.js$/.test(url);
  if (!(prog && REC) && !(fr && RQ)) return r;
  let src = typeof r.source === 'string' ? r.source : Buffer.from(r.source).toString('utf8');
  if (prog && REC) src = sub(src, 'm.fatigue = Math.max(0, m.fatigue - (bye ? 50 : 28));', `m.fatigue = Math.max(0, m.fatigue - (bye ? 50 : ${Number(REC)})); // calibration`, 'progression.js');
  if (fr && RQ) src = sub(src, "rookie: { label: 'Rookie', aiDev: 0.6, quality: -4,", `rookie: { label: 'Rookie', aiDev: 0.6, quality: ${Number(RQ)},`, 'franchise.js');
  return { ...r, source: src, shortCircuit: true };
}
