"""Render the approved design data and report conflicts. Python standard library only.
Exit 1 means a design/data conflict remains; it must not be hidden to pass CI.

Two groups are validated separately:
  * the original roster: 72 families, 102 forms, 144 mode abilities, checked against the per-record baseline frozen from
    commit 6e82f13 (data/original-baseline.json), so any unintended change to an approved record is reported;
  * the Basic creation batch: 120 standalone families (one per type and position) with no unique abilities.
Profile and art data are validated here; production ability behaviour is not (no runtime test is claimed).
"""
import collections, hashlib, itertools, json, math, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def load(n): return json.loads((ROOT / 'data' / f'{n}.json').read_text())
families, forms, abilities, rules = [load(n) for n in ['families', 'forms', 'abilities', 'rules']]
baseline = load('original-baseline')
attrs = rules['attributeOrder']; by_family = {x['id']: x for x in families}; by_ability = {x['id']: x for x in abilities}
TYPES = ['Fire', 'Water', 'Nature', 'Electric', 'Earth', 'Ice', 'Wind', 'Dark', 'Light', 'Metal', 'Psychic', 'Dragon']
POSITIONS = list(rules['primaryAttributesByPosition'])
errors = []; counts = collections.Counter()
def check(ok, msg):
    counts['assertions'] += 1
    if not ok: errors.append(msg)
def rhash(r): return hashlib.sha256(json.dumps(r, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

orig_f = [f for f in families if f['rarity'] != 'basic']; basic_f = [f for f in families if f['rarity'] == 'basic']
orig_s = [f for f in forms if f['rarity'] != 'basic']; basic_s = [f for f in forms if f['rarity'] == 'basic']

# ---------------------------------------------------------------- the original roster: counts and the frozen baseline
check(len(orig_f) == 72, f'Expected 72 original families, found {len(orig_f)}')
check(len(orig_s) == 102, f'Expected 102 original forms, found {len(orig_s)}')
check(len(abilities) == 144, f'Expected 144 mode abilities, found {len(abilities)}')
for f in orig_f: check(baseline['families'].get(f['id']) == rhash(f), f'{f["id"]}: original family record differs from the approved baseline')
for f in orig_s: check(baseline['forms'].get(f['id']) == rhash(f), f'{f["id"]}: original form record differs from the approved baseline')
for a in abilities: check(baseline['abilities'].get(a['id']) == rhash(a), f'{a["id"]}: ability record differs from the approved baseline')
check(set(baseline['families']) == {f['id'] for f in orig_f}, 'Original family set differs from the baseline')
check(set(baseline['forms']) == {f['id'] for f in orig_s}, 'Original form set differs from the baseline')
for items, label in [(families, 'family'), (forms, 'form'), (abilities, 'ability')]: check(len({x['id'] for x in items}) == len(items), f'Duplicate {label} IDs')
for f in orig_f:
    check(set(f['abilities']) == {'Football', 'Beast Clash'}, f'{f["id"]}: missing mode ability')
    for aid in f['abilities'].values(): check(aid in by_ability and by_ability[aid]['familyId'] == f['id'], f'{f["id"]}: invalid ability link')
check(all(by_family.get(a['familyId'], {}).get('rarity') != 'basic' for a in abilities), 'A mode ability is linked to a Basic family')

# ---------------------------------------------------------------- every form: identity, ranges, rarity bands
for f in forms:
    family = by_family.get(f['familyId']); check(family is not None, f'{f["id"]}: missing family')
    if family is None: continue
    check(f['position'] == family['position'] and f['rarity'] == family['rarity'], f'{f["name"]}: identity mismatch')
    for k in ['starting', 'potential']: check(set(f[k]) == set(attrs), f'{f["name"]}: missing {k} attributes')
    primary = rules['primaryAttributesByPosition'][f['position']]; band = rules['rarityPotentialBands'][f['rarity']]
    for a in attrs:
        s, p = f['starting'].get(a), f['potential'].get(a); counts['attributePairs'] += 1
        if f['rarity'] == 'basic': counts['basicAttributePairs'] += 1
        check(isinstance(s, list) and isinstance(p, list) and len(s) == 2 and len(p) == 2, f'{f["name"]}/{a}: missing range')
        if not (isinstance(s, list) and isinstance(p, list)): continue
        check(all(isinstance(v, int) and not isinstance(v, bool) for v in s + p), f'{f["name"]}/{a}: noninteger range')
        check(1 <= s[0] <= s[1] <= 99 and 1 <= p[0] <= p[1] <= 99, f'{f["name"]}/{a}: invalid endpoints')
        check(s[1] <= p[0], f'{f["name"]}/{a}: starting {s[0]}–{s[1]} exceeds minimum potential {p[0]} (approved ranges require resolution)')
        check(p[1] <= (99 if f['rarity'] == 'legendary' else 98), f'{f["name"]}/{a}: ordinary maximum violation')
        if a in primary:
            check(p[1] <= band[1], f'{f["name"]}/{a}: above rarity maximum')
            check(p[0] >= band[0] or a in f['belowBandWeaknesses'], f'{f["name"]}/{a}: unlisted weakness')
        if f['rarity'] == 'basic' and a not in primary: check(p[1] <= band[1], f'{f["name"]}/{a}: a Basic supporting attribute above 59 would be a disguised specialty')

incomplete = [f['name'] for f in forms if any(not (isinstance(f.get(k, {}).get(a), list) and len(f[k][a]) == 2) for k in ('starting', 'potential') for a in attrs)]
if incomplete:  # missing values are never read as zero: stop before arithmetic and rendering
    print(json.dumps({'status': 'BLOCKED: incomplete ranges', 'forms': incomplete}, indent=2)); print('\n'.join(errors[:40])); sys.exit(1)

# ---------------------------------------------------------------- the Basic batch
B = rules['basic']
check(len(basic_f) == 120, f'Expected 120 Basic families, found {len(basic_f)}')
check(len(basic_s) == 120, f'Expected 120 Basic forms, found {len(basic_s)}')
combos = collections.Counter((f['type'], f['position']) for f in basic_f)
for t in TYPES:
    for p in POSITIONS: check(combos[(t, p)] == 1, f'Basic {t} {p}: {combos[(t, p)]} families (exactly one required)')
check(set(combos) <= {(t, p) for t in TYPES for p in POSITIONS}, 'Basic family outside the 12 types × 10 positions')
arch_basic = collections.Counter(f['clashArchetype'] for f in basic_f); arch_all = collections.Counter(f['clashArchetype'] for f in families)
for a, n in B['archetypeAdditions'].items(): check(arch_basic[a] == n, f'Basic {a}: {arch_basic[a]} (approved {n})')
for a, n in B['archetypeTargets'].items(): check(arch_all[a] == n, f'All families {a}: {arch_all[a]} (approved {n})')
for f in basic_f:
    check(f['abilities'] == {'Football': None, 'Beast Clash': None}, f'{f["name"]}: a Basic family must record no unique football or Clash ability (null)')
    check(f.get('standalone') is True, f'{f["name"]}: Basic families are standalone')
    check(f['type'] in TYPES and f['position'] in POSITIONS, f'{f["name"]}: type/position')
    check(f['positionalStrength'] in (rules['primaryAttributesByPosition'][f['position']]), f'{f["name"]}: strength is not a positional primary')
    check(len(f['weaknesses']) >= 1, f'{f["name"]}: explicit weaknesses required')
    check(bool(f.get('description')) and bool(f.get('buildIdentity')), f'{f["name"]}: description and strength text required')
    own = [x for x in basic_s if x['familyId'] == f['id']]
    check(len(own) == 1 and own[0]['stage'] == 0 and own[0]['evolutionLevel'] is None, f'{f["name"]}: exactly one form, no evolution')
    art = ROOT / 'art' / 'basic' / f'{f["id"]}.svg'; check(art.exists(), f'{f["name"]}: art asset {art.name} missing')
# names: unique across all 192 families and 222 forms, no collision with old save names
names = [x['name'].lower() for x in families] + [x['name'].lower() for x in forms if x['name'] != by_family[x['familyId']]['name']]
check(len(names) == len(set(names)), 'Duplicate family/form display names: ' + ', '.join(n for n, c in collections.Counter(names).items() if c > 1))
legacy = ROOT.parents[1] / 'src' / 'data' / 'monsters.js'
if legacy.exists():
    old = {n.strip(" '").lower() for n in re.search(r'OLD_SPECIES = \[(.*?)\]', legacy.read_text()).group(1).split(',')}
    for f in basic_f: check(f['name'].lower() not in old and f['id'] not in old, f'{f["name"]}: collides with a legacy save name')
    for f in basic_f: check(f['id'] not in {x['id'] for x in orig_f}, f'{f["id"]}: collides with an existing family ID')
# art: every record in the art report matches its asset
art_report_path = ROOT / 'art' / 'basic-art.json'
if art_report_path.exists():
    rep = json.loads(art_report_path.read_text()); recs = {r['id']: r for r in rep['records']}
    check(not rep['problems'], 'Art check problems: ' + '; '.join(rep['problems']))
    for f in basic_f:
        r = recs.get(f['id']); check(r is not None, f'{f["name"]}: no art record')
        if r: check(r['spec'] == f['art']['spec'] and hashlib.sha256((ROOT / r['asset']).read_bytes()).hexdigest() == r['svgSha256'], f'{f["name"]}: art record does not match the family recipe or the asset (re-run art_review.mjs)')
else: check(False, 'art/basic-art.json missing (run docs/beast-dex/tools/art_review.mjs)')

# ---------------------------------------------------------------- reference evolution arithmetic (original evolving families)
for fid, group in itertools.groupby(sorted(forms, key=lambda x: (x['familyId'], x['stage'])), lambda x: x['familyId']):
    group = list(group)
    for old, new in zip(group, group[1:]):
        for a in attrs:
            for q in [0, .25, .5, .75, 1]:
                op = math.floor(old['potential'][a][0] + q * (old['potential'][a][1] - old['potential'][a][0]) + .5)
                np = math.floor(new['potential'][a][0] + q * (new['potential'][a][1] - new['potential'][a][0]) + .5)
                check(np >= op, f'{fid}/{a}: potential decreases on evolution')
                for current in [1, op // 2, op]:
                    out = min(np, math.floor(current * np / op + .5)); check(1 <= out <= np, f'{fid}/{a}: evolution bounds')
                    counts['evolutionCases'] += 1
check(math.floor(10 * 40 / 20 + .5) == 20, 'Owner evolution example 10/20 → 20/40')

# ---------------------------------------------------------------- rendering (in memory first, so determinism can be checked)
ATTR_LABEL = {a: a.title() for a in attrs}
def rng_text(r): return f'{r[0]}–{r[1]}'
def render():
    out = {}
    for pos in POSITIONS:
        group = [f for f in families if f['position'] == pos]
        prim = rules['primaryAttributesByPosition'][pos]
        lines = [f'# {pos} families', '', '[Back to Beast Dex](../README.md)', '', f'{len(group)} families: {sum(f["rarity"] != "basic" for f in group)} original, {sum(f["rarity"] == "basic" for f in group)} Basic.', '',
                 '| Family | Type | Rarity | Clash archetype |', '| --- | --- | --- | --- |']
        for f in group: lines.append(f'| [{f["name"]}](../families/{f["id"]}.md) | {f["type"]} | {f["rarity"].title()} | {f["clashArchetype"]} |')
        lines += ['', '## Primary-attribute comparison', '', 'Individual potential ranges of each family\'s first form (level-1 reference profile). Generated from `data/forms.json`; ranges are inclusive.', '',
                  '| Family | Rarity | ' + ' | '.join(ATTR_LABEL[a] for a in prim) + ' |', '| --- | --- | ' + ' | '.join('---:' for _ in prim) + ' |']
        for f in group:
            first = min((x for x in forms if x['familyId'] == f['id']), key=lambda x: x['stage'])
            lines.append(f'| [{f["name"]}](../families/{f["id"]}.md) | {f["rarity"].title()} | ' + ' | '.join(rng_text(first['potential'][a]) for a in prim) + ' |')
        out[f'positions/{pos}.md'] = '\n'.join(lines) + '\n'
    for f in families:
        basic = f['rarity'] == 'basic'
        lines = [f'# {f["name"]}', '', f'**{f["type"]} · {f["rarity"].title()} · {f["position"]} · Clash: {f["clashArchetype"]}**', '', f'[Position comparison](../positions/{f["position"]}.md) · [Beast Dex](../README.md)', '', f'Family ID: `{f["id"]}`. Source labels are not runtime implementation proof.']
        if f['rarity'] != f['sourceRarity']: lines += ['', f'Owner-approved rarity change: {f["sourceRarity"].title()} → {f["rarity"].title()}.']
        if basic:
            spec = f['art']['spec']
            lines += ['', f'![{f["name"]} sprite](../art/basic/{f["id"]}.svg)', '', f'**Review status:** {f["reviewStatus"]}.', '',
                      f'**Personality and appearance:** {f["description"]}', '', f'**Positional strength:** {f["buildIdentity"]} ({ATTR_LABEL[f["positionalStrength"]]}).', '',
                      f'**Weaknesses:** ' + ', '.join(ATTR_LABEL[w] for w in f['weaknesses']) + '.', '',
                      f'**Art recipe** (game sprite builder): {spec["body"]}, {spec["size"]}, {spec["look"]}; features {", ".join(spec["features"])}' + (f'; pattern {spec["pattern"]}' if spec.get('pattern') else '') + f'; colours {spec["colors"][0]} / {spec["colors"][1]}.', '',
                      'Standalone Basic family: no evolutions, no unique football ability and no unique Beast Clash ability. Shared type rules, shared type moves, the shared archetype perks and ordinary teammate-effect eligibility apply as for any monster (approved rules; not yet implemented in the game).']
        else:
            lines += ['', '**Approved build:** ' + f['buildIdentity'] + '.']
        for form in [x for x in forms if x['familyId'] == f['id']]:
            lines += ['', f'## {form["name"]}', '', f'Stage {form["stage"]}; ' + (f'evolution level {form["evolutionLevel"]}; ' if form['evolutionLevel'] else '') + 'starting reference level 1.' + ('' if basic else ' Evolution preserves rarity.'), '',
                      '| Attribute | Level-1 start | Individual potential | Below-band weakness |', '| --- | ---: | ---: | --- |']
            for a in attrs:
                st, po = form['starting'][a], form['potential'][a]; lines.append(f'| {ATTR_LABEL[a]} | {st[0]}–{st[1]} | {po[0]}–{po[1]} | {"Yes" if a in form["belowBandWeaknesses"] else "—"} |')
            lines += ['', 'These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential.' + ('' if basic else ' Starting reference rows for evolved forms do not themselves award evolution gains.')]
        if basic:
            lines += ['', '## Football: none', '', 'No unique football ability (approved Basic rule).', '', '## Beast Clash: none', '', 'No unique Beast Clash ability (approved Basic rule). Clash archetype: ' + f['clashArchetype'] + '; its existing shared archetype perks apply.']
        else:
            for mode, aid in f['abilities'].items():
                a = by_ability[aid]; lines += ['', f'## {mode}: {a["name"]}', '', f'Ability ID: `{aid}`. Category: {a["category"]}.', '', str(a['activation']), '', str(a['mechanic']), '', 'Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.']
                for item in a['details']: lines += ['', f'### {item["section"]}', '', str(item['rule'])]
        out[f'families/{f["id"]}.md'] = '\n'.join(lines) + '\n'
    # The new-family index and manifest
    lines = ['# Basic families: index', '', '[Back to Beast Dex](README.md) · [Art review guide](art/REVIEW_GUIDE.md) · [Creation brief](BASIC_CREATION_BRIEF.md)', '',
             '120 standalone Basic families, one per type and position. All are pending owner art/content review.', '',
             '| Art | Family | ID | Type | Position | Clash archetype | Strength | Weaknesses | Review |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for f in basic_f:
        lines.append(f'| <img src="art/basic/{f["id"]}.svg" width="32" height="32" alt=""> | [{f["name"]}](families/{f["id"]}.md) | `{f["id"]}` | {f["type"]} | {f["position"]} | {f["clashArchetype"]} | {ATTR_LABEL[f["positionalStrength"]]} | {", ".join(ATTR_LABEL[w] for w in f["weaknesses"])} | {f["reviewStatus"]} |')
    out['BASIC_INDEX.md'] = '\n'.join(lines) + '\n'
    manifest = {'note': 'Basic creation batch: stable IDs, names, identity and asset references. Generated by tools/render_and_validate.py.',
                'families': [{'familyId': f['id'], 'formId': f'{f["id"]}:0', 'name': f['name'], 'type': f['type'], 'position': f['position'], 'clashArchetype': f['clashArchetype'],
                              'asset': f'art/basic/{f["id"]}.svg', 'artRecipe': f['art']['spec'], 'reviewStatus': f['reviewStatus']} for f in basic_f]}
    out['basic-manifest.json'] = json.dumps(manifest, indent=1, ensure_ascii=False) + '\n'
    rows = []
    for pos in POSITIONS:
        fs = [f for f in families if f['position'] == pos]; ids = {f['id'] for f in fs}
        rows.append(f'| [{pos}](positions/{pos}.md) | {len(fs)} | {sum(f["rarity"] == "basic" for f in fs)} | {sum(x["familyId"] in ids for x in forms)} |')
    rar = collections.Counter(f['rarity'] for f in families)
    out['README.md'] = '\n'.join([
        '# Gridiron Beast — Beast Dex', '',
        f'**{len(families)} families · {len(forms)} forms · {len({f["type"] for f in families})} types · {len(abilities)} mode abilities**', '',
        f'Original roster: {len(orig_f)} families and {len(orig_s)} forms ({rar["common"]} Common, {rar["uncommon"]} Uncommon, {rar["rare"]} Rare, {rar["legendary"]} Legendary), owner-approved attribute profiles and rarity amendments, {len(abilities)} mode abilities. '
        f'Basic creation batch: {len(basic_f)} standalone families and {len(basic_s)} forms, one per type and position, with no unique abilities; pending owner art and content review. '
        'These are authored design counts, not counts of generated individual monsters. This is a design dataset and browsable GitHub reference; it does not modify the running game.', '',
        '## Basic families', '',
        '[Basic family index](BASIC_INDEX.md) · [Art review guide](art/REVIEW_GUIDE.md) · [Creation brief](BASIC_CREATION_BRIEF.md) · [Technical audit](BASIC_AUDIT.md) · [Later progression decisions](PROGRESSION_DECISIONS.md)', '',
        '## Browse by position', '', '| Position | Families | of which Basic | Forms |', '| --- | ---: | ---: | ---: |', *rows, '',
        '## Rules and readiness', '',
        '[Approved rules](APPROVED_RULES.md) · [Validation report](VALIDATION.md) · [Remaining specifications](UNRESOLVED.md) · [Data format](DATA_FORMAT.md)', '',
        'Potential ranges describe individual ceilings, not starting strength. All ranges are inclusive. Rarity governs primary potential bands with explicit below-band weaknesses; supporting attributes can be lower.', '',
        'The structured files in `data/` are the profile source for the generated family pages. Use the consolidated Task 8 specification for shared runtime rules. Ability contracts imported from workbook v18 retain their provenance and require the later overrides documented here.', '',
        'This is not yet the no-questions Claude handoff. Do not silently resolve conflicts or treat this dataset as deployed gameplay.', '',
        'To regenerate pages and repeat the checks, run `python3 docs/beast-dex/tools/render_and_validate.py` from the repository root (this README is generated too). No third-party packages are needed. The Basic records are built from `data/basic-authoring.json`; see [Data format](DATA_FORMAT.md).', ''])
    return out

first = render(); second = render()
check(first == second, 'Rendering is not deterministic for the same inputs')
for rel, text in first.items():
    p = ROOT / rel; p.parent.mkdir(exist_ok=True); p.write_text(text)

# ---------------------------------------------------------------- local links in every Markdown page resolve
for md in sorted(ROOT.rglob('*.md')):
    for target in re.findall(r'\]\(([^)#\s]+)(?:#[^)]*)?\)', md.read_text()) + re.findall(r'<img src="([^"]+)"', md.read_text()):
        if re.match(r'^[a-z]+:', target): continue
        counts['links'] += 1; check((md.parent / target).resolve().exists(), f'{md.relative_to(ROOT)}: broken link {target}')

report = {'counts': {'families': len(families), 'forms': len(forms), 'modeAbilities': len(abilities), 'originalFamilies': len(orig_f), 'originalForms': len(orig_s),
                     'basicFamilies': len(basic_f), 'basicForms': len(basic_s), 'legendaryFamilies': sum(f['rarity'] == 'legendary' for f in families), 'types': len({f['type'] for f in families}), **counts},
          'positions': dict(collections.Counter(x['position'] for x in families)), 'rarities': dict(collections.Counter(x['rarity'] for x in families)),
          'archetypes': {'original': dict(collections.Counter(f['clashArchetype'] for f in orig_f)), 'basic': dict(arch_basic), 'all': dict(arch_all)},
          'errors': errors, 'runtimeTested': False, 'status': 'PASS' if not errors else 'BLOCKED: approved-data conflict'}
(ROOT / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')
c = report['counts']
lines = ['# Validation report', '', f'**{report["status"]}**', '',
         f'Authored roster: {c["families"]} families and {c["forms"]} forms in {c["types"]} types: the original {c["originalFamilies"]} families / {c["originalForms"]} forms (including {c["legendaryFamilies"]} legendary families) and {c["basicFamilies"]} Basic families / {c["basicForms"]} Basic forms. {c["modeAbilities"]} mode abilities, all on original families; Basic families have none.', '',
         f'{counts["attributePairs"]} complete start/potential pairs ({counts["basicAttributePairs"]} Basic); {counts["evolutionCases"]} evolution arithmetic checks; {counts["links"]} local links.', '',
         f'{counts["assertions"]} assertions evaluated; {len(errors)} failed.', '',
         '## What is checked', '',
         '- Original roster: every family, form and ability record matches the per-record baseline frozen from commit 6e82f13 (the approved 72/102/144 data, including the rarity amendments and the Cindruff Coverage correction).',
         '- Basic batch: exactly one family per type and position (120/120); 120 standalone single-form families; no unique football or Clash ability (explicit nulls) and no ability record linked to a Basic family; all 12 starting and potential ranges per form with valid endpoints, starts at or below potential minima and every Basic potential at or below 59; the approved archetype totals for the batch and for all 192 families; unique IDs and names with no collision with the original roster or legacy save names; one art asset per family that matches its recipe.',
         '- Every local link in the generated pages resolves, and rendering twice from the same data gives identical output.', '',
         '## Unresolved data conflicts', '']
lines += ['- ' + e for e in errors] if errors else ['None.']
lines += ['', '## Scope', '', 'This validates design data, identity links, ranges, art references and reference evolution arithmetic. It does not implement or test the production generator, abilities, balance, save handling, UI or mobile frame rates. Owner art approval is a human review, not an automated claim.', '',
          'Earlier context: before the Basic batch, this validator reported PASS for the original 72 families / 102 forms / 144 abilities (14,095 assertions at commit 23f3793). That result covered the original roster only.', '',
          'All approved values are retained. No invalid pair is silently clamped, rerolled or changed.']
(ROOT / 'VALIDATION.md').write_text('\n'.join(lines) + '\n')
manifest = {'files': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT / 'data').glob('*.json'))}}
(ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['counts', 'archetypes', 'status']}, indent=2)); print('\n'.join(errors[:40]))
sys.exit(bool(errors))
