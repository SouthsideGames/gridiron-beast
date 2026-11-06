import json, glob, statistics as st, sys
from collections import defaultdict
D = '/home/claude/t7/r7/runs'
def load(build, owner, diff):
    out = []
    for s in range(1, 13):
        try: out.append(json.load(open(f'{D}/{build}-{owner}-{diff}-{s}.json')))
        except FileNotFoundError: pass
    return out
def m(v): v = [x for x in v if x is not None]; return round(st.mean(v), 2) if v else None
BINS = [(-99, -6), (-6, -3), (-3, 0), (0, 3), (3, 6), (6, 99)]
def summary(runs):
    g = [x + [r['seed']] for r in runs for x in r['games'] if x[8] and 'Week' in str(x[8])]
    res = {'runs': len(runs), 'games': len(g), 'win': round(100 * m([x[3] for x in g]), 1) if g else None}
    for lo, hi, name in ((1, 4, 's1-4'), (5, 8, 's5-8')):
        gg = [x for x in g if lo <= x[0] <= hi]; res[name] = {'win': round(100 * m([x[3] for x in gg]), 1) if gg else None, 'own': m([x[6] for x in gg]), 'opp': m([x[7] for x in gg]), 'gap': m([x[6] - x[7] for x in gg if x[7] is not None])}
    res['byGap'] = {f'{lo}..{hi}': (len(b), round(100 * m([x[3] for x in b]), 1)) for lo, hi in BINS for b in [[x for x in g if x[7] is not None and lo <= x[6] - x[7] < hi]] if b}
    res['forfeits'] = sum(x[9] for x in g)
    o = [x for r in runs for x in r['offs']]
    res['offseason'] = {'retention%': round(100 * sum(x['signed'] for x in o) / max(1, sum(x['items'] for x in o)), 1), 'departuresPerOff': m([x['left'] for x in o]), 'startersLostPerOff': m([x['startersLost'] for x in o]),
        'payVsAsk': m([x['payRatio'] for x in o]), 'capRoom': m([x['capRoom'] for x in o]), 'payroll': m([x['payroll'] for x in o]), 'staff': m([x['staff'] for x in o]), 'roster': m([x['roster'] for x in o]), 'ovr': m([x['ovr'] for x in o])}
    res['nlog'] = {k: sum(r.get('nlog', {}).get(k, 0) for r in runs) for k in ('accepted', 'countered', 'agreed', 'ended', 'walked', 'offers')}
    res['seedWin'] = {r['seed']: round(100 * m([x[3] for x in r['games'] if x[8] and 'Week' in str(x[8])]), 1) for r in runs}
    return res
which = sys.argv[1:] or ['REL-handsoff-allstar', 'CAND3-handsoff-allstar', 'CAND9-handsoff-allstar', 'CAND9-negotiate-allstar', 'CAND9-handsoff-pro', 'CAND9-negotiate-pro', 'CAND9-handsoff-rookie', 'CAND9-negotiate-rookie']
for w in which:
    b, o, d = w.split('-'); print(w, json.dumps(summary(load(b, o, d))))
