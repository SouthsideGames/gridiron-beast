// Module-load hook for the F-03 quarterback read-time experiment (investigation only). Registered by pass-rush-study.mjs --qbk=K;
// never imported by the game. It rewrites, in THIS process only, the `look` line of awarenessProfile (src/sim/qb-read.js): the seconds a
// quarterback spends on each read. The experiment steepens how look time depends on Awareness around a pivot rating P (default 70, the
// typical starter), so a P-rated quarterback is unchanged and the change grows with distance from P:
//   look_K(aw) = look(P) + K × (look(aw) − look(P)), bounded to [0.10, 0.55] s;  look(aw) = 0.40 − 0.22 × aw/99 (production)
// K = 1 is production. Asserts its anchor, so an experiment can never silently measure the shipped behaviour.
const K = Number(process.env.QB_LOOK_K || 1), P = Number(process.env.QB_LOOK_PIVOT || 70);
const ANCHOR = '    look: 0.40 - 0.22 * a,';
export async function load(url, context, next) {
  const r = await next(url, context);
  if (!/\/src\/sim\/qb-read\.js$/.test(url) || K === 1) return r;
  let src = typeof r.source === 'string' ? r.source : Buffer.from(r.source).toString('utf8');
  if (!src.includes(ANCHOR)) throw new Error('qb-read-hooks: anchor not found in qb-read.js');
  const pv = Math.max(1, Math.min(99, P)) / 99;
  src = src.replace(ANCHOR, `    look: Math.max(0.10, Math.min(0.55, (0.40 - 0.22 * ${pv}) + ${K} * ((0.40 - 0.22 * a) - (0.40 - 0.22 * ${pv})))), // F-03 experiment K=${K} P=${P}`);
  return { ...r, source: src, shortCircuit: true };
}
