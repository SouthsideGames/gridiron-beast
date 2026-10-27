"""v42.5.0 deploy check on a publish folder, iPhone-sized (390x844, iPhone Safari UA, touch). Usage: deploy-check.py DIR SAVE [SHOTS]"""
import sys, os, time, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT, SAVE = sys.argv[1], sys.argv[2]; SHOTS = sys.argv[3] if len(sys.argv) > 3 else None
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'; problems, errors, notes = [], [], []
def check(c, m):
    (notes if c else problems).append(('ok: ' if c else '') + m); return c
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
def shot(p, n):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, n + '.png'))
GO = "async ([n]) => (await import('./src/ui/router.js')).go(n, {}, { reset: true })"
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA); p = ctx.new_page()
    p.on('pageerror', lambda e: errors.append(str(e))); p.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
    ver = p.evaluate("async () => (await import('./src/version.js')).BUILD.version"); check(ver.startswith('v42.13.0'), f'build {ver}')
    # an existing franchise save (exported from an earlier release) loads
    text = open(SAVE).read()
    ok = p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const r = await window.__gb.importInto(1, Save.importJson(t)); await window.__gb.save({ immediate: true }); return r.ok; }""", text)
    p.reload(); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
    info = p.evaluate("() => window.__gb.f ? { club: window.__gb.f.club, year: window.__gb.f.season.year, week: window.__gb.f.season.week, n: window.__gb.f.roster.length } : null")
    check(ok and info, f'existing save loads after reload: {info}')
    # Main Menu -> Developer Tools -> AI Testing Lab, by taps
    p.evaluate(GO, ['menu']); p.wait_for_timeout(300); shot(p, 'd1-menu')
    dev = p.locator('main [data-screen="developer"]').first; check(dev.count() == 1, 'Developer Tools button on the Main Menu'); dev.tap(); p.wait_for_timeout(400)
    lab = p.locator('main [data-screen="ai-lab"]'); check(lab.count() == 1, 'AI Testing Lab button in Developer Tools'); shot(p, 'd2-developer'); lab.tap(); p.wait_for_timeout(500)
    check('lab' in (p.evaluate("() => document.querySelector('main').className") or '') or p.locator('[data-action="lab-new"]').count() > 0, 'AI Testing Lab opens'); shot(p, 'd3-lab')
    # QB Read Indicators setting
    p.evaluate(GO, ['developer']); p.wait_for_timeout(300); cb = p.locator('[data-change="qbreads"]'); check(cb.count() == 1 and p.locator('[data-change="devqbreads"]').count() == 1, 'Live QB read ring switch present in Developer Tools (moved out of Settings in v42.11.1)')
    was = cb.is_checked(); cb.tap(); p.wait_for_timeout(400); p.reload(); p.wait_for_function("() => window.__gb && window.__gb.f", timeout=60000)
    p.evaluate(GO, ['developer']); p.wait_for_timeout(300); check(p.locator('[data-change="qbreads"]').is_checked() != was, 'setting toggles and survives a reload')
    check(p.evaluate("() => !!window.__gb.f.settings.qbReads") == (not was), f'franchise settings.qbReads = {not was}')
    # A real franchise game: QB read ring live, read list in the replay (disposable franchise, not the imported one)
    p.evaluate("""async () => { const S = await import('./tools/franchise-soak.mjs'); const F = await import('./src/franchise/franchise.js');
      const f = S.newFranchise(6, { difficulty: 'rookie' }); Object.assign(f.settings, { reducedMotion: false, mode: 'full', speed: 1.6, devNotices: false, tutorial: false, qbReads: true }); if (window.__gb.settings) window.__gb.settings.devNotices = false;
      F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); } window.__gb.f = f; }""")
    p.evaluate("async () => { const M = await import('./src/ui/screens/match.js'); M.startSundayGame(window.__gb.f); }"); p.wait_for_selector('main.screen-match')
    p.evaluate("() => { const G = window.__gb.f.game; G.auto = true; G.autoSpeed = 2; }"); p.evaluate("async () => (await import('./src/ui/router.js')).render()")
    ring = panel = False; t0 = time.time(); panelText = ''
    while time.time() - t0 < 300 and not (ring and panel):
        if not ring and p.locator('#field .qb-read-ring').count(): ring = True; shot(p, 'd4-ring')
        if not panel and p.locator('.replay-badge').count() and p.locator('.qb-reads').count(): panel = True; panelText = p.locator('.qb-reads').first.inner_text(); shot(p, 'd5-replay')
        p.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
        if p.evaluate("() => !!window.__gb.f.game?.state.finished"): break
        p.wait_for_timeout(120)
    check(ring, 'QB read ring drawn during live franchise plays (setting on)')
    check(panel, f'replay shows the QB read list: {panelText[:160]!r}')
    p.evaluate("() => { if (window.__gb.f.game) window.__gb.f.game.auto = false; }")
    b.close()
print('\n'.join(notes)); print('PROBLEMS:', problems); print('ERRORS:', errors[:10])
print('DEPLOY CHECK ' + ('PASSED' if not problems and not errors else 'FAILED'))
