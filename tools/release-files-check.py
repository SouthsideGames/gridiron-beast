#!/usr/bin/env python3
"""Self-check for tools/release-files.py (docs/TESTING_POLICY.md §6): on disposable copies of a release archive, each way a required
file can go missing must stop the list, and each legitimate case must pass with the right file set.
  python3 tools/release-files-check.py REL MANIFEST      (REL: `git archive` of the released commit; MANIFEST: its release/manifest.json)"""
import json, os, re, shutil, subprocess, sys, tempfile

REL, MANIFEST = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
TOOL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'release-files.py')
results = []
def run(root, *extra, manifest=MANIFEST):
    args = [sys.executable, TOOL, root] + (['--previous', manifest] if manifest else []) + list(extra)
    r = subprocess.run(args, capture_output=True, text=True); return r.returncode, r.stdout.split('\n')[:-1] if r.stdout else [], r.stderr
def case(name, mutate, expect_ok, expect_text=None, extra=(), manifest=MANIFEST, files_has=None):
    d = tempfile.mkdtemp(prefix='relcheck-'); root = os.path.join(d, 'r'); shutil.copytree(REL, root, ignore=shutil.ignore_patterns('.git', 'node_modules'))
    m = manifest
    if mutate: m = mutate(root) or manifest
    code, out, err = run(root, *extra, manifest=m)
    ok = (code == 0) == expect_ok and (expect_text is None or re.search(expect_text, err)) and (files_has is None or files_has in out)
    results.append((bool(ok), name, '' if ok else f'exit {code}; stderr: {err.strip()[-600:]}')); shutil.rmtree(d)
def edit(root, path, fn):
    p = os.path.join(root, path); text = open(p).read(); new = fn(text)
    assert new != text, f'mutation of {path} changed nothing'; open(p, 'w').write(new)
def write(root, path, text): p = os.path.join(root, path); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w').write(text)
def manifest_without(root, key, path):
    m = json.load(open(MANIFEST)); m[key].pop(path, None); out = os.path.join(root, '..', 'm.json'); json.dump(m, open(out, 'w')); return out

base = sorted(json.load(open(MANIFEST))['files'])
case('the released archive passes and lists exactly the published files', None, True, r'RELEASE FILE LIST OK: %d files' % len(base))
case('index.html stops loading src/fresh.js -> REMOVAL', lambda r: edit(r, 'index.html', lambda t: re.sub(r'<script type="module" src="src/fresh\.js[^"]*"></script>\n?', '', t)), False, r'REMOVAL: src/fresh\.js')
case('a module disappears from the import chain but is still in the import map -> refused',
     lambda r: edit(r, 'src/main.js', lambda t: re.sub(r"^import [^\n]*from '\./ui/screens/practice\.js';\n", '', t, flags=re.M)), False, r'import map lists src/ui/screens/practice\.js|REMOVAL: src/ui/screens/practice\.js')
case('a computed dynamic import -> refused', lambda r: edit(r, 'src/main.js', lambda t: t + "\nconst which = 'a'; import(`./ext/${which}.js`);\n"), False, r'dynamic import with a computed path')
case('fetch of a local data file that does not exist -> refused', lambda r: edit(r, 'src/main.js', lambda t: t + "\nfetch('./data/levels.json');\n"), False, r'references src/data/levels\.json or data/levels\.json, which does not exist')
case('fetch of a local data file that exists -> included and reported as ADDED',
     lambda r: (edit(r, 'src/main.js', lambda t: t + "\nfetch('./data/levels.json');\n"), write(r, 'data/levels.json', '{}')) and None, True, r'ADDED since .*: data/levels\.json', files_has='data/levels.json')
case('new URL(asset, import.meta.url) to a missing image -> refused', lambda r: edit(r, 'src/ui/dom.js', lambda t: t + "\nconst img = new URL('../../assets/logo.png', import.meta.url);\n"), False, r'assets/logo\.png, which does not exist')
case('a quoted sprite path in code that exists -> included', lambda r: (edit(r, 'src/ui/dom.js', lambda t: t + "\nconst SPRITE = './assets/sheet.png';\n"), write(r, 'assets/sheet.png', 'x')) and None, True, None, files_has='assets/sheet.png')
case('an imported module is missing -> refused', lambda r: os.remove(os.path.join(r, 'src/ui/stat-guide.js')), False, r'imported file is missing: src/ui/stat-guide\.js')
case('a module missing from the import map -> refused',
     lambda r: edit(r, 'index.html', lambda t: re.sub(r'"\./src/ui/type-chart\.js":"[^"]*",', '', t)), False, r'src/ui/type-chart\.js is imported but missing from the import map')
case('the import map names a module nothing imports -> refused',
     lambda r: (write(r, 'src/ui/orphan.js', 'export const x = 1;\n'), edit(r, 'index.html', lambda t: t.replace('{"imports":{', '{"imports":{"./src/ui/orphan.js":"./src/ui/orphan.js?v=1",'))) and None, False, r'import map lists src/ui/orphan\.js')
case('a stylesheet url() to a missing image -> refused', lambda r: edit(r, 'styles/app.css', lambda t: t + '\n.x{background:url("../img/field.png")}\n'), False, r'references img/field\.png, which does not exist')
case('a deliberately published extra file was deleted -> refused', lambda r: os.remove(os.path.join(r, 'src/clash/level1.js')), False, r'manifest extra src/clash/level1\.js .* no longer exists')
case('an extra dropped from the manifest without investigation -> REMOVAL', lambda r: manifest_without(r, 'extra', 'src/clash/reference-teams.js'), False, r'REMOVAL: src/clash/reference-teams\.js .*still referenced in: src/clash/level1\.js')
case('a removal acknowledged with --allow-removal but no --reason -> refused',
     lambda r: manifest_without(r, 'extra', 'src/clash/reference-teams.js'), False, r'needs its own --reason', extra=('--allow-removal', 'src/clash/reference-teams.js'))
case('a removal acknowledged with --allow-removal and --reason -> passes, reason recorded',
     lambda r: manifest_without(r, 'extra', 'src/clash/reference-teams.js'), True, r'REMOVAL allowed: src/clash/reference-teams\.js — reason: tool-only',
     extra=('--allow-removal', 'src/clash/reference-teams.js', '--reason', 'tool-only, moved to the clash Lab bundle'))
case('--allow-removal for a file that is not removed -> refused', None, False, r'is not a removal', extra=('--allow-removal', 'src/main.js', '--reason', 'x'))
case('no previous manifest -> refused', None, False, r'no previous published manifest', manifest=os.path.join(REL, 'does-not-exist.json'))
case('the word "import" in a comment or in markup is not an import', lambda r: edit(r, 'src/main.js', lambda t: t + "\n// ---- import (validation)\nconst h = '<button data-action=\"lab-import\" style=\"x\">';\n"), True)
for ok, name, why in results: print(('ok: ' if ok else 'FAIL: ') + name + (f'\n    {why}' if why else ''))
bad = [r for r in results if not r[0]]
print(f'RELEASE FILES CHECK {"PASSED" if not bad else "FAILED"} ({len(results) - len(bad)}/{len(results)})'); sys.exit(1 if bad else 0)
