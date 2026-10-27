#!/usr/bin/env python3
"""Release file list (docs/TESTING_POLICY.md, Publishing). Prints every file the game needs, one per line: index.html, the
static files, and the import closure of every module script that index.html loads (src/fresh.js and src/main.js), following
static and literal dynamic imports. Exits 1 if an imported file is missing.
  python3 tools/release-files.py [ROOT]            (ROOT defaults to the repository; use a `git archive` of the merged commit)"""
import os, re, sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC = {'index.html', 'manifest.webmanifest', 'styles/app.css', 'styles/clash.css'}
IMPORT = re.compile(r"""(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]""")
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
entries = [m.split('?')[0] for m in re.findall(r'<script[^>]*type="module"[^>]*src="([^"]+)"', html)]
seen, missing, stack = set(), [], list(entries)
while stack:
    f = os.path.normpath(stack.pop())
    if f in seen: continue
    if not os.path.exists(os.path.join(ROOT, f)): missing.append(f); continue
    seen.add(f)
    for m in IMPORT.finditer(open(os.path.join(ROOT, f), encoding='utf-8').read()):
        spec = next(x for x in m.groups() if x)
        if spec.startswith('.'): stack.append(os.path.join(os.path.dirname(f), spec.split('?')[0]))
for s in STATIC:
    if not os.path.exists(os.path.join(ROOT, s)): missing.append(s)
print('\n'.join(sorted(seen | STATIC)))
if missing: print('MISSING: ' + ', '.join(sorted(set(missing))), file=sys.stderr); sys.exit(1)
