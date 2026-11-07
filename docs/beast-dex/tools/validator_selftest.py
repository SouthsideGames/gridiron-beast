"""Self-test for render_and_validate.py: each case damages a copy of the Beast Dex in a temporary folder and expects the
validator to fail (the unchanged copy must pass). Python standard library only. Run from the repository root:
    python3 docs/beast-dex/tools/validator_selftest.py
"""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
def form(M, n): return next(f for f in M if f['name'] == n)
def fam(F, n): return next(f for f in F if f['name'] == n)
CASES = [
    ('unchanged data passes', 0, lambda F, M: None),
    ('original Cindruff Coverage reverted to 23-33', 1, lambda F, M: form(M, 'Cindruff')['starting'].__setitem__('coverage', [23, 33])),
    ('original Ripplet Speed maximum 95', 1, lambda F, M: form(M, 'Ripplet')['potential'].__setitem__('speed', [85, 95])),
    ('Basic family given a football ability', 1, lambda F, M: fam(F, 'Kindlet')['abilities'].__setitem__('Football', 'FIR-01-F')),
    ('Basic primary potential 60', 1, lambda F, M: form(M, 'Charbun')['potential'].__setitem__('speed', [52, 60])),
    ('Basic supporting potential 62', 1, lambda F, M: form(M, 'Charbun')['potential'].__setitem__('arm', [50, 62])),
    ('Basic attribute missing', 1, lambda F, M: form(M, 'Kindlet')['potential'].pop('kicking')),
    ('two Basics in one type/position', 1, lambda F, M: fam(F, 'Charbun').__setitem__('position', 'QB') or form(M, 'Charbun').__setitem__('position', 'QB')),
    ('archetype total off by one', 1, lambda F, M: fam(F, 'Kindlet').__setitem__('clashArchetype', 'Striker')),
    ('name collides with an original', 1, lambda F, M: fam(F, 'Kindlet').__setitem__('name', 'Flaroo')),
    ('starting range above potential minimum', 1, lambda F, M: form(M, 'Kindlet')['starting'].__setitem__('arm', [40, 58])),
    ('evolution added to a Basic', 1, lambda F, M: M.append({**form(M, 'Kindlet'), 'id': 'kindlet:1', 'stage': 1, 'evolutionLevel': 16, 'name': 'Kindlord'})),
    ('art recipe no longer matches its asset', 1, lambda F, M: fam(F, 'Kindlet')['art']['spec'].__setitem__('look', 'fierce')),
]
failed = 0
with tempfile.TemporaryDirectory() as tmp:
    for i, (name, want, mutate) in enumerate(CASES):
        root = Path(tmp) / str(i); d = root / 'docs' / 'beast-dex'
        shutil.copytree(REPO / 'docs' / 'beast-dex', d); shutil.copytree(REPO / 'src', root / 'src')
        F = json.loads((d / 'data/families.json').read_text()); M = json.loads((d / 'data/forms.json').read_text()); mutate(F, M)
        (d / 'data/families.json').write_text(json.dumps(F, indent=2, ensure_ascii=False)); (d / 'data/forms.json').write_text(json.dumps(M, indent=2) + '\n')
        r = subprocess.run([sys.executable, str(d / 'tools/render_and_validate.py')], capture_output=True, text=True)
        ok = (r.returncode == 0) == (want == 0); failed += not ok
        print(f'{"ok  " if ok else "FAIL"} {name} (exit {r.returncode})')
print(f'{len(CASES) - failed}/{len(CASES)} self-test cases behave as expected'); sys.exit(bool(failed))
