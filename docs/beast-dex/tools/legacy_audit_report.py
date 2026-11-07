"""Summarise tools/basic-audit-legacy.mjs runs (the game's LEGACY generator; Basic families unreachable).
    python3 docs/beast-dex/tools/legacy_audit_report.py OUT.json RUN1.json [RUN2.json ...]
Exact creation-profile repeat: same species, all 12 ratings, scalar potential and Nature (the legacy stand-ins for individual
potentials and Temper; no Apex exists). Near-identical (audit assumption, as in the reference experiment): same species and every
position-weighted attribute (src/data/personnel.js POSITION_WEIGHTS) within ±2, potential within ±2. Name, ID, timestamp and seed excluded.
"""
import collections, itertools, json, sys
out, runs = sys.argv[1], sys.argv[2:]
ATTRS = ['speed', 'agility', 'strength', 'awareness', 'catching', 'arm', 'accuracy', 'blocking', 'tackling', 'coverage', 'durability', 'kicking']
rep = {'generator': 'LEGACY (pre-Task 8); Basic families not reachable; measures the 72 original species only', 'runs': []}
for path in runs:
    r = json.load(open(path)); W = r['frozen']['weights']; row = {'seed': r['seed'], 'seasonsPlayed': r['played'], 'fired': r['fired'], 'soakProblems': r['problems']}
    for ch, xs in r['individuals'].items():
        fp = collections.Counter((x['species'], tuple(x['attributes']), x['potential'], x['nature']) for x in xs)
        exact = sum(c * (c - 1) // 2 for c in fp.values())
        near = 0; bysp = collections.defaultdict(list)
        for x in xs: bysp[x['species']].append(x)
        for sp, g in bysp.items():
            idx = [ATTRS.index(k) for k in W[g[0]['position']]]
            for a, b in itertools.combinations(g, 2):
                near += abs(a['potential'] - b['potential']) <= 2 and all(abs(a['attributes'][i] - b['attributes'][i]) <= 2 for i in idx)
        bypos = collections.defaultdict(collections.Counter)
        for x in xs: bypos[x['position']][x['species']] += 1
        row[ch] = {'individuals': len(xs), 'distinctSpecies': len(bysp), 'exactPairs': exact, 'nearIdenticalPairs': near,
                   'maxSpeciesAppearancesByPosition': {p: c.most_common(1)[0][1] for p, c in sorted(bypos.items())},
                   'distinctSpeciesByPosition': {p: len(c) for p, c in sorted(bypos.items())},
                   'levelAtFirstSight': dict(collections.Counter('1' if x['level'] == 1 else '2+' for x in xs))}
    rep['runs'].append(row)
json.dump(rep, open(out, 'w'), indent=1); open(out, 'a').write('\n')
for row in rep['runs']:
    print(row['seed'], row['seasonsPlayed'], {ch: {k: row[ch][k] for k in ('individuals', 'distinctSpecies', 'exactPairs', 'nearIdenticalPairs')} for ch in ('draft', 'scout', 'ai')})
