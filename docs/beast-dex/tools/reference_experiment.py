"""Approved-model reference experiment for the Basic creation brief's duplicate and Apex audit.
Python standard library only; deterministic for a given seed.

This is NOT the game's generator. The game on this branch still uses the legacy (pre-Task 8) generator, audited separately by
tools/basic-audit-legacy.mjs. This script draws individuals directly from the approved rules in data/rules.json and the authored
ranges in data/forms.json, so it shows what repetition the approved model itself produces. Neither result validates the other.

Approved rules used: independent uniform inclusive integer rolls for every starting and potential range; 1% initial Apex chance for
nonlegendary individuals; Apex starts 10-15 in every attribute, potential 99 in all 12, neutral Temper; ordinary Temper uniform over
the 25 approved Tempers. Audit assumptions (not approved rules, listed in the report): which family a generated slot gets, the use of
level-1 reference rows of first forms, uniform selection among the three neutral Tempers and uniform 10-15 Apex starts (R06), draft
and scouting sizes copied from the legacy game.

    python3 docs/beast-dex/tools/reference_experiment.py [--out PATH]
"""
import collections, json, math, random, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
families = json.loads((ROOT / 'data/families.json').read_text()); forms = json.loads((ROOT / 'data/forms.json').read_text())
rules = json.loads((ROOT / 'data/rules.json').read_text()); ATTRS = rules['attributeOrder']
TEMPERS = ['Swift', 'Powerful', 'Forceful', 'Protective', 'Patient', 'Adaptive', 'Instinctive', 'Precise', 'Measured', 'Bold', 'Gifted', 'Resistant', 'Hardy', 'Relentless',
           'Aggressive', 'Disciplined', 'Watchful', 'Surehanded', 'Secure', 'Elusive', 'Explosive', 'Driven', 'Calm', 'Balanced', 'Steady']  # SPECIFICATION_BASELINE §3
NEUTRAL = ['Calm', 'Balanced', 'Steady']
APEX = rules['apex']['nonLegendaryGenerationChance']
first_form = {}
for f in forms:
    if f['familyId'] not in first_form or f['stage'] < first_form[f['familyId']]['stage']: first_form[f['familyId']] = f
eligible = [f for f in families if f['rarity'] != 'legendary']
by_pos = collections.defaultdict(list)
for f in eligible: by_pos[f['position']].append(f)
# Frozen from the legacy game (src/franchise/draft.js CLASS_SHAPE; scouting reports per season observed in tools/basic-audit-legacy.mjs runs).
CLASS_SHAPE = [('QB', 4), ('RB', 5), ('WR', 8), ('TE', 4), ('OL', 7), ('DL', 7), ('LB', 5), ('CB', 6), ('S', 5), ('K', 2)]
SCOUT_PER_SEASON = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--scout=')), 25))  # legacy Pro careers saw 24-28 scouting prospects a season
SEASONS, CAREERS = 20, 20

def individual(rng, fam):
    form = first_form[fam['id']]
    if rng.random() < APEX:
        return {'family': fam['id'], 'apex': True, 'temper': rng.choice(NEUTRAL), 'start': tuple(rng.randint(10, 15) for _ in ATTRS), 'pot': (99,) * len(ATTRS)}
    return {'family': fam['id'], 'apex': False, 'temper': rng.choice(TEMPERS),
            'start': tuple(rng.randint(*form['starting'][a]) for a in ATTRS), 'pot': tuple(rng.randint(*form['potential'][a]) for a in ATTRS)}
def fingerprint(x): return (x['family'], x['start'], x['pot'], x['temper'], x['apex'])  # name, ID, timestamp and seed excluded
def near(a, b, pos):
    """Audit assumption (not a gameplay rule): same family, and every primary attribute of the position within 2 in both start and potential."""
    if a['family'] != b['family']: return False
    idx = [ATTRS.index(k) for k in rules['primaryAttributesByPosition'][pos]]
    return all(abs(a['start'][i] - b['start'][i]) <= 2 and abs(a['pot'][i] - b['pot'][i]) <= 2 for i in idx)
def wilson(k, n, z=1.96):
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(c - h, 5), round(c + h, 5)]
def pairs(group, pos):
    exact = near_n = 0
    byfam = collections.defaultdict(list)
    for x in group: byfam[x['family']].append(x)
    for xs in byfam.values():
        fp = collections.Counter(fingerprint(x) for x in xs); exact += sum(c * (c - 1) // 2 for c in fp.values())
        for a, b in __import__('itertools').combinations(xs, 2): near_n += near(a, b, pos)
    return exact, near_n

def apex_report(seed=2026):
    rng = random.Random(seed); fams = eligible; rows = [individual(rng, rng.choice(fams)) | {'type': None} for _ in range(10000)]
    for r in rows: f = next(x for x in families if x['id'] == r['family']); r['type'], r['position'], r['rarity'] = f['type'], f['position'], f['rarity']
    ap = [r for r in rows if r['apex']]
    again = random.Random(seed); repeat = [individual(again, again.choice(fams))['apex'] for _ in range(10000)]
    return {'rolls': 10000, 'eligibleFamilies': len(fams), 'eligibleBasic': sum(f['rarity'] == 'basic' for f in fams), 'eligibleOriginal': sum(f['rarity'] != 'basic' for f in fams),
            'apex': len(ap), 'rate': len(ap) / 10000, 'wilson95': wilson(len(ap), 10000), 'expected': 100, 'binomialSd': round(math.sqrt(10000 * APEX * (1 - APEX)), 2),
            'byType': dict(collections.Counter(r['type'] for r in ap)), 'byPosition': dict(collections.Counter(r['position'] for r in ap)),
            'byRarity': dict(collections.Counter(r['rarity'] for r in ap)), 'familiesWithApex': len({r['family'] for r in ap}),
            'familiesWithMoreThanOneApex': sum(1 for c in collections.Counter(r['family'] for r in ap).values() if c > 1),
            'sameSeedRepeatsExactly': repeat == [r['apex'] for r in rows], 'legendaryApex': sum(r['rarity'] == 'legendary' for r in ap),
            'assumption': 'family drawn uniformly from the 180 eligible families for each roll (generation-channel mix is not approved yet)'}

def career(seed, pool):
    rng = random.Random(seed); out = {'draft': [], 'scout': []}
    for season in range(1, SEASONS + 1):
        for pos, n in CLASS_SHAPE:
            for _ in range(n): out['draft'].append(individual(rng, rng.choice(pool[pos])) | {'position': pos, 'season': season})
        for _ in range(SCOUT_PER_SEASON):
            pos = rng.choice([p for p, _ in CLASS_SHAPE]); out['scout'].append(individual(rng, rng.choice(pool[pos])) | {'position': pos, 'season': season})
    return out

def exposure(label, pool):
    agg = {'draft': collections.Counter(), 'scout': collections.Counter()}; famrep = {}; per = []
    for c in range(CAREERS):
        car = career(1000 + c, pool); row = {'seed': 1000 + c}
        for ch, xs in car.items():
            ex = nr = 0
            for pos in by_pos:
                e, n = pairs([x for x in xs if x['position'] == pos], pos); ex += e; nr += n
            fams = collections.Counter(x['family'] for x in xs)
            row[ch] = {'individuals': len(xs), 'distinctFamilies': len(fams), 'maxFamilyAppearances': max(fams.values()), 'exactPairs': ex, 'nearIdenticalPairs': nr, 'apex': sum(x['apex'] for x in xs)}
        per.append(row)
    summ = {}
    for ch in ('draft', 'scout'):
        rs = [r[ch] for r in per]
        summ[ch] = {k: {'mean': round(sum(r[k] for r in rs) / len(rs), 2), 'min': min(r[k] for r in rs), 'max': max(r[k] for r in rs)} for k in rs[0]}
    return {'pool': label, 'familiesByPosition': {p: len(v) for p, v in pool.items()}, 'careers': CAREERS, 'seasons': SEASONS, 'seeds': [1000, 1000 + CAREERS - 1], 'summary': summ, 'perCareer': per}

def scaling(seed=7):
    rng = random.Random(seed); out = []
    for n in (570, 1000, 10000):  # 570 ≈ 15 AI clubs × 38 at league creation
        xs = []
        for _ in range(n): pos = rng.choice(list(by_pos)); xs.append(individual(rng, rng.choice(by_pos[pos])) | {'position': pos})
        ex = nr = 0
        for pos in by_pos: e, m = pairs([x for x in xs if x['position'] == pos], pos); ex += e; nr += m
        out.append({'individuals': n, 'exactPairs': ex, 'nearIdenticalPairs': nr})
    return out

orig_pool = {p: [f for f in v if f['rarity'] != 'basic'] for p, v in by_pos.items()}
report = {'model': 'APPROVED-MODEL REFERENCE EXPERIMENT (not the game generator)',
          'nearIdenticalDefinition': 'Audit assumption: same family, and every primary attribute of the position (data/rules.json primaryAttributesByPosition) within ±2 in both starting rating and individual potential. Temper and Apex are ignored for near-identity. Not a gameplay rule.',
          'exactDefinition': 'Same family/form, all 12 starting ratings, all 12 individual potentials, Temper and Apex designation; name, ID, timestamp and seed excluded. All generated individuals are first forms, so the family-level canonical fingerprint equals the form fingerprint.',
          'frozen': {'draftClass': dict(CLASS_SHAPE), 'draftClassSize': sum(n for _, n in CLASS_SHAPE), 'scoutingReportsPerSeason': SCOUT_PER_SEASON, 'seasons': SEASONS, 'careers': CAREERS,
                     'familySelection': 'uniform among eligible (nonlegendary) families of the slot position — audit assumption; Basic acquisition weights are not approved',
                     'rosterAttrition': 'not modelled: every individual offered or seen is counted once'},
          'apex': apex_report(),
          'exposure': [exposure('all 180 eligible families (Basic included)', by_pos), exposure('60 eligible original families only (Basic excluded, for contrast)', orig_pool)],
          'scaling': scaling()}
out = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--out=')), None)
text = json.dumps(report, indent=1)
if out: Path(out).write_text(text + '\n')
print(json.dumps({'apex': {k: report['apex'][k] for k in ('apex', 'rate', 'wilson95', 'familiesWithApex', 'familiesWithMoreThanOneApex', 'sameSeedRepeatsExactly', 'byRarity')},
                  'exposure': [{'pool': e['pool'], **{ch: {k: v['mean'] for k, v in e['summary'][ch].items()} for ch in ('draft', 'scout')}} for e in report['exposure']], 'scaling': report['scaling']}, indent=1))
