"""Render the approved design data and report conflicts. Python standard library only.
Exit 1 means a design/data conflict remains; it must not be hidden to pass CI.
"""
import collections,hashlib,json,math,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(n):return json.loads((ROOT/'data'/f'{n}.json').read_text())
families,forms,abilities,rules=[load(n) for n in ['families','forms','abilities','rules']]
attrs=rules['attributeOrder'];by_family={x['id']:x for x in families};by_ability={x['id']:x for x in abilities}
errors=[];counts=collections.Counter()
def check(ok,msg):
 counts['assertions']+=1
 if not ok:errors.append(msg)
check(len(families)==72,'Expected 72 families');check(len(forms)==102,'Expected 102 forms');check(len(abilities)==144,'Expected 144 mode abilities')
for items,label in [(families,'family'),(forms,'form'),(abilities,'ability')]:check(len({x['id'] for x in items})==len(items),f'Duplicate {label} IDs')
for f in families:
 check(set(f['abilities'])=={'Football','Beast Clash'},f'{f["id"]}: missing mode ability')
 for aid in f['abilities'].values():check(aid in by_ability and by_ability[aid]['familyId']==f['id'],f'{f["id"]}: invalid ability link')
for f in forms:
 family=by_family.get(f['familyId']);check(family is not None,f'{f["id"]}: missing family')
 check(f['position']==family['position'] and f['rarity']==family['rarity'],f'{f["name"]}: identity mismatch')
 for k in ['starting','potential']:check(set(f[k])==set(attrs),f'{f["name"]}: missing {k} attributes')
 primary=rules['primaryAttributesByPosition'][f['position']];band=rules['rarityPotentialBands'][f['rarity']]
 for a in attrs:
  s,p=f['starting'][a],f['potential'][a];counts['attributePairs']+=1
  check(all(isinstance(v,int) and not isinstance(v,bool) for v in s+p),f'{f["name"]}/{a}: noninteger range')
  check(1<=s[0]<=s[1]<=99 and 1<=p[0]<=p[1]<=99,f'{f["name"]}/{a}: invalid endpoints')
  check(s[1]<=p[0],f'{f["name"]}/{a}: starting {s[0]}–{s[1]} exceeds minimum potential {p[0]} (approved ranges require resolution)')
  check(p[1]<= (99 if f['rarity']=='legendary' else 98),f'{f["name"]}/{a}: ordinary maximum violation')
  if a in primary:
   check(p[1]<=band[1],f'{f["name"]}/{a}: above rarity maximum')
   check(p[0]>=band[0] or a in f['belowBandWeaknesses'],f'{f["name"]}/{a}: unlisted weakness')
for fid,group in __import__('itertools').groupby(sorted(forms,key=lambda x:(x['familyId'],x['stage'])),lambda x:x['familyId']):
 group=list(group)
 for old,new in zip(group,group[1:]):
  for a in attrs:
   for q in [0,.25,.5,.75,1]:
    op=math.floor(old['potential'][a][0]+q*(old['potential'][a][1]-old['potential'][a][0])+.5)
    np=math.floor(new['potential'][a][0]+q*(new['potential'][a][1]-new['potential'][a][0])+.5)
    check(np>=op,f'{fid}/{a}: potential decreases on evolution')
    for current in [1,op//2,op]:
     out=min(np,math.floor(current*np/op+.5));check(1<=out<=np,f'{fid}/{a}: evolution bounds')
     counts['evolutionCases']+=1
check(math.floor(10*40/20+.5)==20,'Owner evolution example 10/20 → 20/40')
# Render family pages.
for pos in rules['primaryAttributesByPosition']:
 group=[f for f in families if f['position']==pos];lines=[f'# {pos} families','', '[Back to Beast Dex](../README.md)','', '| Family | Type | Rarity | Clash archetype |','| --- | --- | --- | --- |']
 for f in group:lines.append(f'| [{f["name"]}](../families/{f["id"]}.md) | {f["type"]} | {f["rarity"].title()} | {f["clashArchetype"]} |')
 p=ROOT/'positions'/f'{pos}.md';p.parent.mkdir(exist_ok=True);p.write_text('\n'.join(lines)+'\n')
for f in families:
 lines=[f'# {f["name"]}','',f'**{f["type"]} · {f["rarity"].title()} · {f["position"]} · Clash: {f["clashArchetype"]}**','',f'[Position comparison](../positions/{f["position"]}.md) · [Beast Dex](../README.md)','',f'Family ID: `{f["id"]}`. Source labels are not runtime implementation proof.']
 if f['rarity']!=f['sourceRarity']:lines+=['',f'Owner-approved rarity change: {f["sourceRarity"].title()} → {f["rarity"].title()}.']
 lines+=['', '**Approved build:** '+f['buildIdentity']+'.']
 for form in [x for x in forms if x['familyId']==f['id']]:
  lines+=['',f'## {form["name"]}', '', f'Stage {form["stage"]}; '+(f'evolution level {form["evolutionLevel"]}; ' if form['evolutionLevel'] else '')+'starting reference level 1. Evolution preserves rarity.','', '| Attribute | Level-1 start | Individual potential | Below-band weakness |','| --- | ---: | ---: | --- |']
  for a in attrs:
   st,po=form['starting'][a],form['potential'][a];lines.append(f'| {a.title()} | {st[0]}–{st[1]} | {po[0]}–{po[1]} | {"Yes" if a in form["belowBandWeaknesses"] else "—"} |')
  lines+=['','These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.']
 for mode,aid in f['abilities'].items():
  a=by_ability[aid];lines+=['',f'## {mode}: {a["name"]}', '',f'Ability ID: `{aid}`. Category: {a["category"]}.','',str(a['activation']),'',str(a['mechanic']),'','Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.']
  for item in a['details']:lines+=['',f'### {item["section"]}', '',str(item['rule'])]
 p=ROOT/'families'/f'{f["id"]}.md';p.parent.mkdir(exist_ok=True);p.write_text('\n'.join(lines)+'\n')
report={'counts':{'families':len(families),'forms':len(forms),'modeAbilities':len(abilities),**counts},'positions':dict(collections.Counter(x['position'] for x in families)),'rarities':dict(collections.Counter(x['rarity'] for x in families)),'errors':errors,'runtimeTested':False,'status':'PASS' if not errors else 'BLOCKED: approved-data conflict'}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
lines=['# Validation report','',f'**{report["status"]}**','',f'{len(families)} families; {len(forms)} forms; {len(abilities)} mode abilities; {counts["attributePairs"]} complete start/potential pairs; {counts["evolutionCases"]} evolution arithmetic checks.','',f'{counts["assertions"]} assertions evaluated; {len(errors)} failed.','', '## Unresolved data conflicts','']
lines+=['- '+e for e in errors] if errors else ['None.']
lines+=['','This validates design data, identity links, ranges and reference evolution arithmetic. It does not implement or test the production generator, abilities, balance, save handling, UI, or mobile frame rates. A passing arithmetic check is not a proof of progression exploit resistance.','', 'All approved values are retained. No invalid pair is silently clamped, rerolled, or changed.']
(ROOT/'VALIDATION.md').write_text('\n'.join(lines)+'\n')
manifest={'files':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'data').glob('*.json'))}}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(report,indent=2));sys.exit(bool(errors))
