#!/usr/bin/env python3
"""Release file list (docs/TESTING_POLICY.md §6). Works out every file the game needs and refuses to print a list it cannot vouch for.

  python3 tools/release-files.py ROOT [--previous MANIFEST] [--allow-removal PATH --reason TEXT]... [--report FILE]
  python3 tools/release-files.py ROOT --write-manifest OUT --version V --commit SHA [--artifact-version N]

ROOT is a `git archive` of the commit being released (or the repository). On success the file list goes to stdout, one path per
line, and the report goes to stderr; on any problem nothing goes to stdout and the exit code is 1.

How files are found, and the cross-checks that stop one from being silently left out:
  1. index.html: its module scripts (src/fresh.js, src/main.js), stylesheets, manifest link and any non-data icon or image.
  2. The import closure of those scripts: static imports, re-exports and literal dynamic imports, followed recursively.
  3. Things an import scan cannot see, which fail the run until handled:
     - a dynamic import whose argument is not a string literal;
     - fetch(), new URL(), new Worker()/Audio()/Image() or a quoted path to a local asset (.js .mjs .css .json .png .svg .webp
       .jpg .gif .mp3 .ogg .wav .woff2 .webmanifest) in game code: each must resolve to a file that is in the list.
  4. index.html's import map (written by tools/stamp-release.mjs, and the list src/fresh.js re-fetches on a cache refresh) must name
     exactly the modules found by the import scan (entry scripts outside the map excepted): a module in one list but not the other
     fails.
  5. manifest.webmanifest icons/start_url and CSS url() references must resolve to files in the list.
  6. The previous published manifest (default ROOT/release/manifest.json) is the cross-check against the last release:
     - every file published last time and not in the new list is a REMOVAL and fails, unless that path is passed with
       --allow-removal PATH together with --reason TEXT (one reason per removal, recorded in the report). The report shows every
       remaining reference to the file in ROOT, so the removal is investigated, not waved through;
     - "extra" files in the manifest (published deliberately although nothing imports them, each with a reason) are carried into
       the list; one that no longer exists fails; one that is now imported is reported so the entry can be dropped;
     - additions are listed, and files whose content changed since the last release are counted (their live copies are what the
       publish step must read first).
After publishing, --write-manifest records the new release (paths, sha256, extras, version, commit) for the next release's check.
"""
import argparse, hashlib, json, os, re, sys

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('root', nargs='?', default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ap.add_argument('--previous', help='previous published manifest (default ROOT/release/manifest.json)')
ap.add_argument('--allow-removal', action='append', default=[], metavar='PATH')
ap.add_argument('--reason', action='append', default=[], metavar='TEXT', help='one per --allow-removal, in the same order')
ap.add_argument('--report', help='also write the report as JSON to this file')
ap.add_argument('--write-manifest', metavar='OUT'); ap.add_argument('--version'); ap.add_argument('--commit'); ap.add_argument('--artifact-version', type=int)
a = ap.parse_args()
ROOT = os.path.abspath(a.root)
problems, notes = [], []
def rel(p): return os.path.normpath(p).replace(os.sep, '/')
def exists(p): return os.path.isfile(os.path.join(ROOT, p))
def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def sha(p): return hashlib.sha256(open(os.path.join(ROOT, p), 'rb').read()).hexdigest()
def local(u): return u and not re.match(r'^(data:|https?:|//|#|mailto:)', u)
def clean(u): return u.split('?')[0].split('#')[0]

# 1. index.html
html = read('index.html')
entries = [rel(clean(s)) for s in re.findall(r'<script[^>]*type="module"[^>]*src="([^"]+)"', html)]
html_refs = {rel(clean(h)) for h in re.findall(r'<link[^>]*href="([^"]+)"', html) if local(h)}
html_refs |= {rel(clean(s)) for s in re.findall(r'<(?:img|source|audio|video)[^>]*src="([^"]+)"', html) if local(s)}
if not entries: problems.append('index.html loads no module script')

# 2. import closure
# Import statements start a statement (line start, or after ; { }), so the word "import" inside strings and markup is not one.
IMPORT = re.compile(r"""(?:^|[;{}])\s*(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|\bimport\s*\(\s*(?:['"]([^'"]+)['"]|`([^`$]+)`)\s*\)|(?:^|[;{}])\s*import\s*['"]([^'"]+)['"]""", re.M)
DYN_NONLITERAL = re.compile(r"""\bimport\s*\(\s*(?!['"])(?!`[^`$]*`)(?!\s*\))""")
def strip_comments(src):
    """Blank out /* */ and // comments (keeping line numbers), so a comment such as '// import (validation)' is not code."""
    src = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), src, flags=re.S)
    return re.sub(r'(^|[^:\'"\\])//[^\n]*', lambda m: m.group(1), src)
ASSET_CALL = re.compile(r"""\b(?:fetch|new\s+URL|new\s+Worker|new\s+SharedWorker|new\s+Audio|new\s+Image|importScripts)\s*\(\s*(['"`])([^'"`]+)\1""")
ASSET_STR = re.compile(r"""(['"`])((?:\./|\.\./|src/|styles/|assets/|img/|audio/)[^'"`\s]*\.(?:js|mjs|css|json|png|svg|webp|jpg|jpeg|gif|mp3|ogg|wav|woff2?|webmanifest))(?:\?[^'"`]*)?\1""")
modules, missing, stack = set(), [], list(entries)
asset_refs = {}  # path -> first place it is referenced
while stack:
    f = rel(stack.pop())
    if f in modules: continue
    if not exists(f): missing.append(f); continue
    modules.add(f); src = strip_comments(read(f)); here = os.path.dirname(f)
    for m in IMPORT.finditer(src):
        spec = next(x for x in m.groups() if x)
        if spec.startswith('.'): stack.append(os.path.join(here, clean(spec)))
        else: problems.append(f'{f}: bare import "{spec}" cannot be served as a static file')
    for m in DYN_NONLITERAL.finditer(src):
        line = src.count('\n', 0, m.start()) + 1
        problems.append(f'{f}:{line}: dynamic import with a computed path; list the files it can load as "extra" in the manifest (with a reason) and confirm they are published')
    # 3. assets named in code (fetch/new URL/... and quoted local paths); paths are relative to the module, or to the page for fetch
    for m in list(ASSET_CALL.finditer(src)) + list(ASSET_STR.finditer(src)):
        u = m.group(2)
        if not local(u) or '${' in u or u.startswith('import.meta'): continue
        if m.re is ASSET_STR and re.search(r'\b(?:import|from)\s*$', src[max(0, m.start() - 12):m.start()]): continue  # an import, handled above
        # a path in code may be relative to the module (import.meta.url) or to the page (fetch, DOM): accept whichever exists
        cands = [rel(os.path.join(here, clean(u))), rel(clean(u))] if u.startswith('.') else [rel(clean(u))]
        p = next((c for c in cands if exists(c)), ' or '.join(dict.fromkeys(cands)))
        asset_refs.setdefault(p, f'{f}:{src.count(chr(10), 0, m.start()) + 1}')
for f in missing: problems.append(f'imported file is missing: {f}')

# 4. import map cross-check
im = re.search(r'<script type="importmap"[^>]*>(.*?)</script>', html, re.S)
mapped = set()
if im:
    try: mapped = {rel(clean(k)) for k in json.loads(im.group(1)).get('imports', {})}
    except ValueError as e: problems.append(f'index.html import map is not valid JSON: {e}')
    for p in sorted(mapped - modules): problems.append(f'import map lists {p}, which the import scan did not reach (a module loaded some other way?)')
    for p in sorted(modules - mapped - set(entries)): problems.append(f'{p} is imported but missing from the import map (re-run tools/stamp-release.mjs)')
else: notes.append('index.html has no import map (cross-check skipped)')

# 5. web manifest and CSS references
static = {'index.html'} | html_refs
for s in sorted(html_refs):
    if s.endswith('.webmanifest') and exists(s):
        try: wm = json.loads(read(s))
        except ValueError as e: problems.append(f'{s} is not valid JSON: {e}'); wm = {}
        for u in [wm.get('start_url')] + [i.get('src') for i in wm.get('icons', []) + wm.get('screenshots', [])]:
            if local(u): asset_refs.setdefault(rel(os.path.join(os.path.dirname(s), clean(u))), s)
for s in sorted(html_refs):
    if s.endswith('.css') and exists(s):
        for u in re.findall(r'url\(\s*[\'"]?([^\'")]+)', read(s)):
            if local(u): asset_refs.setdefault(rel(os.path.join(os.path.dirname(s), clean(u))), s)
        for u in re.findall(r'@import\s+[\'"]([^\'"]+)', read(s)):
            asset_refs.setdefault(rel(os.path.join(os.path.dirname(s), clean(u))), s)
for p in sorted(static):
    if not exists(p): problems.append(f'index.html references {p}, which does not exist')
for p, where in sorted(asset_refs.items()):
    if not exists(p): problems.append(f'{where} references {p}, which does not exist')
files = modules | static | {p for p in asset_refs if exists(p)}

# 6. previous published manifest
prev_path = a.previous or os.path.join(ROOT, 'release', 'manifest.json')
prev = None
if os.path.isfile(prev_path):
    prev = json.load(open(prev_path)); prev_files = prev.get('files', {}); extra = prev.get('extra', {})
    for p, why in sorted(extra.items()):
        if not exists(p): problems.append(f'manifest extra {p} ({why}) no longer exists: investigate, then drop it from the manifest')
        elif p in files: notes.append(f'manifest extra {p} is now found by the scan; its "extra" entry can be dropped')
        else: files.add(p); notes.append(f'extra (not imported, published deliberately): {p} — {why}')
    if len(a.reason) != len(a.allow_removal): problems.append('every --allow-removal needs its own --reason')
    allowed = dict(zip(a.allow_removal, a.reason))
    removals = sorted(set(prev_files) - files)
    for p in removals:
        refs = []
        for d, _, fs in os.walk(ROOT):
            if '/.git' in d or '/node_modules' in d: continue
            for n in fs:
                if not n.endswith(('.js', '.mjs', '.html', '.css', '.json', '.py')): continue
                q = rel(os.path.relpath(os.path.join(d, n), ROOT))
                try: t = open(os.path.join(d, n), encoding='utf-8').read()
                except (UnicodeDecodeError, OSError): continue
                if os.path.basename(p) in t and q != p: refs.append(q)
        detail = f'still referenced in: {", ".join(sorted(refs)[:8])}' if refs else 'no remaining references found'
        if p in allowed: notes.append(f'REMOVAL allowed: {p} — reason: {allowed[p]} ({detail})')
        else: problems.append(f'REMOVAL: {p} was published in {prev.get("version", "the previous release")} but is not in this list ({detail}). Investigate; if it is truly gone, pass --allow-removal {p} --reason "..."')
    for p in sorted(set(allowed) - set(removals)): problems.append(f'--allow-removal {p} given, but it is not a removal')
    added = sorted(files - set(prev_files)); changed = sorted(p for p in files & set(prev_files) if prev_files[p] != sha(p))
    for p in added: notes.append(f'ADDED since {prev.get("version")}: {p}')
    notes.append(f'previous release {prev.get("version")}: {len(prev_files)} files; this list {len(files)}; changed content {len(changed)}: {", ".join(changed)}')
else:
    problems.append(f'no previous published manifest at {prev_path}: pass --previous, or (first release only) create one with --write-manifest')

report = {'root': ROOT, 'entries': entries, 'files': sorted(files), 'problems': problems, 'notes': notes, 'previous': prev and prev.get('version')}
if a.report: json.dump(report, open(a.report, 'w'), indent=1)
for n in notes: print('note: ' + n, file=sys.stderr)
for p in problems: print('PROBLEM: ' + p, file=sys.stderr)
if a.write_manifest:
    if not (a.version and a.commit): print('PROBLEM: --write-manifest needs --version and --commit', file=sys.stderr); sys.exit(1)
    extra = {p: w for p, w in (prev or {}).get('extra', {}).items() if p in files and p not in modules | static}
    out = {'version': a.version, 'commit': a.commit, 'artifactVersion': a.artifact_version, 'extra': extra, 'files': {p: sha(p) for p in sorted(files)}}
    if problems: print('manifest NOT written: fix the problems first', file=sys.stderr); sys.exit(1)
    json.dump(out, open(a.write_manifest, 'w'), indent=1); open(a.write_manifest, 'a').write('\n'); print(f'manifest written: {a.write_manifest} ({len(files)} files)', file=sys.stderr)
    sys.exit(0)
if problems: print(f'RELEASE FILE LIST REFUSED: {len(problems)} problem(s)', file=sys.stderr); sys.exit(1)
print('\n'.join(sorted(files))); print(f'RELEASE FILE LIST OK: {len(files)} files', file=sys.stderr)
