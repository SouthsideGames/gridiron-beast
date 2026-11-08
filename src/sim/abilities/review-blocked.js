// Task 8 Reviewer v2 (spec §25): the checklist of a labelled blocked or failure variant. Its four items, each from engine records of
// one play: the qualifying situation was reached; the activation did not happen, with the gate or unmet condition the engine reported;
// the ordinary outcome stood; nothing was spent. `cfg`: { situation(p, ctx) -> event, reason(p, ctx) -> text, ordinary(p, ctx) ->
// event, kept(before, after) -> bool, labels: [4 texts] }.
const evText = (e) => `${(e.t ?? 0).toFixed(1)}s ${e.text || e.kind}`;
export function blockedEval(cfg) {
  return ({ plays, slot }) => {
    const ctx = { slot };
    const i = plays.findIndex((p) => cfg.situation(p, ctx)); const list = [];
    const push = (id, ok, play, t, evidence, n) => list.push({ id, label: cfg.labels[n], ok: !!ok, play, t, evidence });
    if (i < 0) {
      ['trigger', 'activation', 'resolution', 'cleanup'].forEach((id, n) => push(id, false, null, null, null, n));
      return { done: false, list, failure: { condition: `${cfg.labels[0]}: not reached`, detail: `no qualifying situation in ${plays.length} play(s)` } };
    }
    const p = plays[i]; const sit = cfg.situation(p, ctx); const why = cfg.reason(p, ctx); const ord = cfg.ordinary(p, ctx);
    push('trigger', true, i, sit.t ?? 0, `engine: ${evText(sit)}`, 0);
    push('activation', !p.executed && !!why, i, sit.t ?? 0, p.executed ? 'an execution WAS recorded (the gate did not hold)' : why || 'no execution, but no reason was reported', 1);
    push('resolution', !!ord, i, ord?.t ?? null, ord ? `engine: ${evText(ord)} · ${p.text}` : null, 2);
    const kept = cfg.kept(p.before || {}, p.after || {});
    push('cleanup', kept, i, kept ? (p.allEvents.at(-1)?.t ?? 0) : null, `state before ${JSON.stringify(p.before)} -> after ${JSON.stringify(p.after)}`, 3);
    const done = list.every((x) => x.ok); const miss = list.find((x) => !x.ok);
    return { done, list, failure: done ? null : { condition: `${miss.label}: not observed`, detail: miss.evidence || '' }, targets: [] };
  };
}
