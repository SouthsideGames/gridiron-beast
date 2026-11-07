"""Expand the authored Basic designs (data/basic-authoring.json) into Beast Dex family and form records.
Python standard library only. Deterministic: the same authoring file always produces the same records.

The authoring file holds the creative choices for each family: name, art recipe, Clash archetype, its one positional
strength (with its ceiling), one supporting good attribute and its explicit weaknesses. This tool turns those choices into
complete 12-attribute starting and potential ranges using the fixed tier table below. The ranges are written only to
data/forms.json; the generated pages read them from there, so no rating is maintained in two places.

Usage (from the repository root): python3 docs/beast-dex/tools/build_basic.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

# Tier table: (starting range, potential range). Every starting maximum is at or below its potential minimum.
TIERS = {
    'good':    ((24, 34), (43, 53)),
    'mid':     ((18, 28), (36, 46)),
    'midplus': ((21, 31), (39, 49)),   # a mid attribute that matches the type's flavour
    'low':     ((12, 22), (29, 39)),
    'weak':    ((5, 15), (18, 28)),
    'support': ((2, 8), (8, 20)),     # attributes the position does not use
    'kick':    ((1, 6), (6, 16)),      # kicking for every non-kicker
}
def top(ceiling):
    """The family's one strength: potential up to its authored ceiling (at most 59), starting 17-27 below it."""
    return ((ceiling - 27, ceiling - 17), (ceiling - 8, ceiling))

TYPE_FLAVOUR = {'Fire': 'strength', 'Water': 'agility', 'Nature': 'durability', 'Electric': 'speed', 'Earth': 'strength',
                'Ice': 'awareness', 'Wind': 'agility', 'Dark': 'awareness', 'Light': 'awareness', 'Metal': 'durability',
                'Psychic': 'awareness', 'Dragon': 'strength'}
TYPE_ORDER = list(TYPE_FLAVOUR)

def tiers_for(b, rules):
    pos = b['position']; pr = b['profile']; attrs = rules['attributeOrder']
    primary = rules['primaryAttributesByPosition'][pos]
    t = {}
    if pos == 'K':
        for a in attrs: t[a] = 'support'
        t['awareness'] = t['durability'] = 'low'
        t[pr['good']] = 'mid'
        for w in pr['weaknesses']: t[w] = 'weak'
        t['kicking'] = 'top'
        return t
    for a in attrs: t[a] = 'support'
    t['kicking'] = 'kick'
    rest = [a for a in primary if a not in (pr['strength'], pr['good'], *pr['weaknesses'])]
    lead = TYPE_ORDER.index(b['type']) % 2  # alternate which remaining primaries sit mid or low, by type
    for i, a in enumerate(rest): t[a] = 'mid' if (i + lead) % 2 == 0 else 'low'
    fl = TYPE_FLAVOUR[b['type']]
    if t.get(fl) == 'mid': t[fl] = 'midplus'
    elif t.get(fl) == 'low': t[fl] = 'mid'
    t[pr['good']] = 'good'
    for w in pr['weaknesses']: t[w] = 'weak'
    t[pr['strength']] = 'top'
    return t

def ranges(tier, ceiling):
    s, p = top(ceiling) if tier == 'top' else TIERS[tier]
    return list(s), list(p)

def build():
    rules = json.loads((DATA / 'rules.json').read_text())
    authored = json.loads((DATA / 'basic-authoring.json').read_text())['families']
    families = [f for f in json.loads((DATA / 'families.json').read_text()) if f.get('rarity') != 'basic']
    forms = [f for f in json.loads((DATA / 'forms.json').read_text()) if f.get('rarity') != 'basic']
    for b in authored:
        pr = b['profile']; art = b['art']
        t = tiers_for(b, rules)
        st, po = {}, {}
        for a in rules['attributeOrder']:
            st[a], po[a] = ranges(t[a], pr['strengthCeiling'])
        families.append({
            'id': b['id'], 'name': b['name'], 'type': b['type'], 'rarity': 'basic', 'sourceRarity': 'basic', 'position': b['position'],
            'clashArchetype': b['clashArchetype'],
            'abilities': {'Football': None, 'Beast Clash': None},
            'appearance': {'body': art['body'], 'size': art['size'], 'look': art['look'], 'features': ', '.join(art['features']),
                           'colors': ', '.join(art['colors']), **({'pattern': art['pattern']} if art.get('pattern') else {})},
            'art': {'pipeline': 'src/ui/sprite16.js spec', 'spec': {k: art[k] for k in ('body', 'size', 'look', 'features', 'colors')} | ({'pattern': art['pattern']} if art.get('pattern') else {})},
            'description': b['personality'],
            'positionalStrength': pr['strength'], 'weaknesses': pr['weaknesses'],
            'profileStatus': 'Basic creation batch; ranges built by tools/build_basic.py; pending owner art/content review',
            'buildIdentity': b['buildIdentity'],
            'reviewStatus': b.get('reviewStatus', 'pending owner art/content review'),
            'standalone': True,
        })
        forms.append({
            'id': f"{b['id']}:0", 'familyId': b['id'], 'name': b['name'], 'stage': 0, 'evolutionLevel': None, 'referenceLevel': 1,
            'position': b['position'], 'rarity': 'basic', 'starting': st, 'potential': po, 'belowBandWeaknesses': [],
            'potentialOrigin': {'method': 'basic tier table (tools/build_basic.py)', 'tiers': t, 'strengthCeiling': pr['strengthCeiling']},
        })
    (DATA / 'families.json').write_text(json.dumps(families, indent=2, ensure_ascii=False))  # the file's existing format
    (DATA / 'forms.json').write_text(json.dumps(forms, indent=2) + '\n')  # the file's existing format
    return len(authored)

if __name__ == '__main__':
    print(f'{build()} Basic families written')
