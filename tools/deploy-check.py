#!/usr/bin/env python3
"""Deploy check on a release folder (docs/TESTING_POLICY.md §6), iPhone-sized (390x844, iPhone Safari UA, touch).

  python3 tools/deploy-check.py --release DIR --version vX.Y.Z-name --save SAVE.json [--save SAVE2.json] [--files LIST] [--shots DIR]

--release  the publish folder exactly as it will be published (index.html, manifest.webmanifest, src/, styles/). It must contain no
           test helpers: a `tools/` folder, a .mjs file or anything under `__deploy-check/` in it fails the check.
--version  the expected release version, compared exactly with BUILD.version; the index.html ?v= stamp on the entry scripts and
           the build label on the Main Menu must match it too, and BUILD.test must be false.
--save     an existing franchise export (repeatable); each is imported in a fresh browser profile and must load after a reload.
--files    optional: the output of tools/release-files.py; the release folder must hold exactly those files.
--old-save a franchise saved by the 16-club game (repeatable, tools/release-saves/16club-*.json.gz). The game must refuse it with the
           16-club message, both when it is imported and when it is found on the device, and leave it unchanged.

32-club league (owner 2026-11-23): every --save is also checked in the page by tools/release-league-check.mjs (served under the
reserved prefix like the soak helper): 32 clubs in 8 divisions, the 14-game 6/5/3 schedule, four playoff rounds with seven seeds
and top-seed byes, Gym Leader badges, the Legend Track rule, the canon history, home branding and uniforms, and an export ->
import -> export round trip. Reference saves: tools/make-reference-saves.mjs writes tools/release-saves/league32-*.json.gz.

Test helpers are kept apart from the release files: the disposable franchise used for the live-game step comes from the
repository's tools/franchise-soak.mjs (next to this script, or --helpers DIR), which the local server exposes only under the
reserved prefix /__deploy-check/. Nothing is copied into the release folder, and the helper's own imports (../src/...) resolve to
the release's modules, so the game code under test is always the release's.
Checks: build version and stamp; each save loads after a reload; Main Menu -> Developer Tools -> AI Testing Lab by taps; the
Developer Tools QB-read switch toggles and survives a reload; a live franchise game draws the QB read ring and plays an
instant replay without the read list (removed in PR #150); no page errors.
"""
import argparse, os, re, sys, threading, time, socketserver, http.server, json, gzip
def read_save(path):
    with (gzip.open(path, 'rt', encoding='utf-8') if path.endswith('.gz') else open(path, encoding='utf-8')) as fh: return fh.read()
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser(description='Deploy check on a release folder')
ap.add_argument('--release', required=True); ap.add_argument('--version', required=True)
ap.add_argument('--save', action='append', required=True); ap.add_argument('--files'); ap.add_argument('--shots')
ap.add_argument('--old-save', action='append', default=[])
ap.add_argument('--helpers', default=os.path.dirname(os.path.abspath(__file__)))
a = ap.parse_args()
REL, HELPERS, VERSION = os.path.abspath(a.release), os.path.abspath(a.helpers), a.version
PREFIX = '/__deploy-check/'
problems, errors, notes = [], [], []
def check(c, m):
    (notes if c else problems).append(('ok: ' if c else '') + m); return c

# --- the release folder: no test helpers, exactly the listed files, the right version and stamp
rel_files = sorted(os.path.relpath(os.path.join(d, f), REL).replace(os.sep, '/') for d, _, fs in os.walk(REL) for f in fs)
helpers_in_release = [f for f in rel_files if f.startswith(('tools/', '__deploy-check/')) or f.endswith('.mjs')]
check(not helpers_in_release, f'release folder holds no test helpers {helpers_in_release[:5] if helpers_in_release else ""}'.rstrip())
check(os.path.isfile(os.path.join(HELPERS, 'franchise-soak.mjs')), f'test helper found outside the release: {os.path.join(HELPERS, "franchise-soak.mjs")}')
if a.files:
    want = sorted(l.strip() for l in open(a.files) if l.strip())
    extra, missing = sorted(set(rel_files) - set(want)), sorted(set(want) - set(rel_files))
    check(not extra and not missing, f'release folder matches the release file list ({len(rel_files)} files){"; extra " + str(extra[:5]) if extra else ""}{"; missing " + str(missing[:5]) if missing else ""}')
num = re.match(r'^v?(\d+\.\d+\.\d+)', VERSION)
check(bool(num), f'--version looks like vX.Y.Z[-name]: {VERSION}')
html = open(os.path.join(REL, 'index.html'), encoding='utf-8').read()
stamps = dict(re.findall(r'<script type="module" src="(src/[a-z]+\.js)\?v=([^"]+)"', html))
check(num and stamps and all(v == num.group(1) for v in stamps.values()), f'index.html entry scripts stamped ?v={num.group(1) if num else "?"}: {stamps}')

# --- serve the release, plus the helpers under the reserved prefix only
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *x, **k): super().__init__(*x, directory=REL, **k)
    def translate_path(s, path):
        clean = path.split('?')[0].split('#')[0]
        if clean.startswith(PREFIX):
            name = os.path.normpath(clean[len(PREFIX):]).lstrip(os.sep)
            return os.path.join(HELPERS, name) if not name.startswith('..') else os.path.join(HELPERS, '__denied__')
        return super().translate_path(path)
    def log_message(s, *x): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
READY = "() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'"
GO = "async ([n]) => (await import('./src/ui/router.js')).go(n, {}, { reset: true })"
def shot(p, n):
    if a.shots: os.makedirs(a.shots, exist_ok=True); p.screenshot(path=os.path.join(a.shots, n + '.png'))
def page(b):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA); p = ctx.new_page()
    p.on('pageerror', lambda e: errors.append(str(e))); p.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    p.goto(URL); p.wait_for_function(READY, timeout=60000); return ctx, p

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for i, save in enumerate(a.save):
        ctx, p = page(b); tag = os.path.basename(save)
        if i == 0:
            build = p.evaluate("async () => { const { BUILD } = await import('./src/version.js'); return { version: BUILD.version, test: BUILD.test }; }")
            check(build['version'] == VERSION, f'build version {build["version"]} (expected {VERSION})'); check(build['test'] is False, f'BUILD.test is false ({build["test"]})')
            p.evaluate(GO, ['menu']); p.wait_for_timeout(300)
            check(VERSION in p.locator('main').inner_text(), f'Main Menu build label shows {VERSION}')
        ok = p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const r = await window.__gb.importInto(1, Save.importJson(t)); await window.__gb.save({ immediate: true }); return r.ok; }""", read_save(save))
        p.reload(); p.wait_for_function(READY, timeout=60000)
        info = p.evaluate("() => window.__gb.f ? { club: window.__gb.f.club, year: window.__gb.f.season.year, week: window.__gb.f.season.week, n: window.__gb.f.roster.length } : null")
        check(bool(ok and info), f'{tag}: existing save loads after reload: {info}')
        lc = p.evaluate("""async (prefix) => { const C = await import(prefix + 'release-league-check.mjs'); return C.checkFranchise(window.__gb.f); }""", PREFIX)
        check(not lc['problems'], f'{tag}: 32-club league checks {lc["facts"]}' + (f' PROBLEMS {lc["problems"][:4]}' if lc['problems'] else ''))
        if i: ctx.close(); continue
        # Main Menu -> Developer Tools -> AI Testing Lab, by taps
        p.evaluate(GO, ['menu']); p.wait_for_timeout(300); shot(p, 'd1-menu')
        dev = p.locator('main [data-screen="developer"]').first; check(dev.count() == 1, 'Developer Tools button on the Main Menu'); dev.tap(); p.wait_for_timeout(400)
        # A franchise's first Apex discovery plays as a cutscene on franchise screens (Task 8 M6); skip it as a player would.
        for _ in range(30):
            if not p.locator('.apex-scene').count(): break
            for sel in ['.apex-scene [data-apex="skip"]', '.apex-scene [data-apex="continue"]']:
                if p.locator(sel).count(): p.locator(sel).first.click(); p.wait_for_timeout(120)
        lab = p.locator('main [data-screen="ai-lab"]'); check(lab.count() == 1, 'AI Testing Lab button in Developer Tools'); shot(p, 'd2-developer'); lab.tap(); p.wait_for_timeout(500)
        check('lab' in (p.evaluate("() => document.querySelector('main').className") or '') or p.locator('[data-action="lab-new"]').count() > 0, 'AI Testing Lab opens'); shot(p, 'd3-lab')
        # Developer Tools QB-read switch survives a reload
        p.evaluate(GO, ['developer']); p.wait_for_timeout(300); cb = p.locator('[data-change="qbreads"]'); check(cb.count() == 1 and p.locator('[data-change="devqbreads"]').count() == 1, 'Live QB read ring switch present in Developer Tools')
        was = cb.is_checked(); cb.tap(); p.wait_for_timeout(400); p.reload(); p.wait_for_function("() => window.__gb && window.__gb.f", timeout=60000)
        p.evaluate(GO, ['developer']); p.wait_for_timeout(300); check(p.locator('[data-change="qbreads"]').is_checked() != was, 'setting toggles and survives a reload')
        check(p.evaluate("() => !!window.__gb.f.settings.qbReads") == (not was), f'franchise settings.qbReads = {not was}')
        # A live franchise game on a disposable franchise from the test helper (served under the reserved prefix, not from the release)
        # The browser keeps only 250 resource entries by default; a release with more modules than that fills the buffer before the
        # helper loads, and the check below would then see nothing. Enlarge it first (entries already recorded are kept).
        p.evaluate("() => performance.setResourceTimingBufferSize(10000)")
        p.evaluate("""async (prefix) => { const S = await import(prefix + 'franchise-soak.mjs'); const F = await import('./src/franchise/franchise.js');
          const f = S.newFranchise(6, { difficulty: 'rookie' }); Object.assign(f.settings, { reducedMotion: false, mode: 'full', speed: 1.6, devNotices: false, tutorial: false, qbReads: true }); if (window.__gb.settings) window.__gb.settings.devNotices = false;
          F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); } window.__gb.f = f; }""", PREFIX)
        via = p.evaluate("(prefix) => performance.getEntriesByType('resource').map((r) => new URL(r.name).pathname).filter((u) => u.startsWith(prefix))", PREFIX)
        check(via == [PREFIX + 'franchise-soak.mjs'], f'only the helper itself came from {PREFIX}; its game imports came from the release ({via})')
        p.evaluate("async () => { const M = await import('./src/ui/screens/match.js'); M.startSundayGame(window.__gb.f); }"); p.wait_for_selector('main.screen-match')
        p.evaluate("() => { const G = window.__gb.f.game; G.auto = true; G.autoSpeed = 2; }"); p.evaluate("async () => (await import('./src/ui/router.js')).render()")
        ring = panel = False; t0 = time.time(); panelText = ''
        while time.time() - t0 < 300 and not (ring and panel):
            if not ring and p.locator('#field .qb-read-ring').count(): ring = True; shot(p, 'd4-ring')
            # PR #150 (docs/MATCH_BARS_TAP_AUDIO.md): football replays no longer include the QB read list; a replay must play without it.
            if not panel and p.locator('.replay-badge').count(): panel = True; panelText = p.locator('.qb-reads').first.inner_text() if p.locator('.qb-reads').count() else ''; shot(p, 'd5-replay')
            p.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
            if p.evaluate("() => !!window.__gb.f.game?.state.finished"): break
            p.wait_for_timeout(120)
        check(ring, 'QB read ring drawn during live franchise plays (setting on)')
        check(panel, 'an instant replay played during the live game')
        check(panel and not panelText, f'the replay shows no QB read list (removed in PR #150): {panelText[:120]!r}')
        p.evaluate("() => { if (window.__gb.f.game) window.__gb.f.game.auto = false; }"); ctx.close()
    # 16-club saves: refused with their own message, by the import route and on the device (the legacy save the game finds at
    # start), and never changed.
    for old in a.old_save:
        tag = os.path.basename(old); text = read_save(old)
        ctx, p = page(b)
        r = p.evaluate("""async ([prefix, t]) => { const C = await import(prefix + 'release-league-check.mjs'); return C.checkOldSave(t); }""", [PREFIX, text])
        check(r['refused'] and r['unchanged'] and r['message'] == r['expected'], f'{tag}: import refused with the 16-club message, file unchanged')
        ctx.close()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)
        ctx.add_init_script("(() => { const t = " + json.dumps(text) + "; try { if (!localStorage.getItem('__dc_seeded')) { localStorage.setItem('gridiron-beast-v6', t); localStorage.setItem('__dc_seeded', '1'); } } catch (e) {} })();")
        p = ctx.new_page(); p.on('pageerror', lambda e: errors.append(str(e)))
        p.goto(URL); p.wait_for_function(READY, timeout=60000); p.wait_for_timeout(800)
        body = p.locator('main').inner_text() if p.locator('main').count() else ''
        kept = p.evaluate("() => localStorage.getItem('gridiron-beast-v6')")
        check('16-club league' in body and 'kept on this device unchanged' in body, f'{tag}: found on the device, the game shows the 16-club message ({body[:80]!r})')
        check(kept == text, f'{tag}: the save on the device is unchanged after the refusal')
        shot(p, 'd6-old-save-' + tag.replace('.json', '')); ctx.close()
    b.close()
print('\n'.join(notes)); print('PROBLEMS:', problems); print('ERRORS:', errors[:10])
print('DEPLOY CHECK ' + ('PASSED' if not problems and not errors else 'FAILED')); sys.exit(1 if problems or errors else 0)
