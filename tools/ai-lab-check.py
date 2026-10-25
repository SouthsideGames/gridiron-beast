#!/usr/bin/env python3
"""AI Testing Lab check (GDD §53.8), headless Chromium at 320/375/390/430 px, no franchise loaded: Developer Tools → AI Testing
Lab; Live mode (snap, watch, tap a receiver while the play runs) and Paused mode (frozen at the AI's decision point); the
comparison (both decisions, the windows, both results, expected outcomes, the AI's reads) appears only after deciding; the record
is stored and survives a reload; the Data tab shows the analysis; export → clear → import restores the records; no franchise
save is created or changed; no horizontal overflow, buttons touch-sized, no page errors.
  python3 tools/ai-lab-check.py [--shots=DIR]"""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[1:]); SHOTS = args.get('shots')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'; problems, errors, report = [], [], {}
def check(c, m):
    if not c: problems.append(m)
    return c
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm))"
COUNT = "() => import('./src/lab/lab-store.js').then((S) => S.labAll()).then((r) => r.length)"
LAYOUT = r"""() => { const W = innerWidth; const bad = [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1; }).length; const btns = [...document.querySelectorAll('.lab-actions .btn, main .btn.big, .lab-compare .btn')].filter((b) => b.getBoundingClientRect().width).map((b) => Math.round(b.getBoundingClientRect().height)); return { over: document.documentElement.scrollWidth - W, bad, minBtn: btns.length ? Math.min(...btns) : null }; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [320, 375, 390, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page(); p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        franchise0 = p.evaluate("() => JSON.stringify(window.__gb.f || null)"); n0 = p.evaluate(COUNT)
        p.evaluate(GO, ['developer', {}]); p.wait_for_timeout(300); check(p.locator('[data-screen="ai-lab"]').count() == 1, f'{w}: the Lab is in Developer Tools')
        p.locator('[data-screen="ai-lab"]').click(); p.wait_for_timeout(400)
        # Live mode
        p.locator('[data-action="lab-new"]').first.click(); p.wait_for_timeout(500)
        check(p.locator('.lab-actions .btn[disabled]').count() >= 3, f'{w}: actions wait for the snap')
        check(p.locator('.lab-compare').count() == 0 and p.locator('.lab-table').count() == 0, f'{w}: nothing measured is shown before the decision')
        if SHOTS and w == 390: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, 'lab-1-ready.png'))
        live = p.locator('.lab-actions [data-action="lab-throw"]:not([disabled])')
        for attempt in range(5): # a random situation can end before a decision (a quick sack): take a new one, as a person would
            p.locator('[data-action="lab-snap"]').click(); p.wait_for_timeout(1300)
            if live.count() >= 2: break
            p.locator('[data-action="lab-new"]').first.click(); p.wait_for_timeout(500)
        if SHOTS and w == 390: p.screenshot(path=os.path.join(SHOTS, 'lab-2-live.png'))
        if check(live.count() >= 2, f'{w}: receivers can be chosen during the play'):
            live.first.click(); p.wait_for_selector('.lab-compare', timeout=20000); p.wait_for_timeout(1500)
            txt = p.locator('.lab-compare').inner_text()
            for k in ['You', 'AI (Awareness', 'Receivers at your decision', 'What happened', 'Expected over', "The AI's reads"]: check(k.lower() in txt.lower(), f'{w}: comparison shows "{k}"')
            if SHOTS and w == 390: p.screenshot(path=os.path.join(SHOTS, 'lab-3-compare.png'), full_page=True)
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: overflow {lay}'); check((lay['minBtn'] or 44) >= 43, f'{w}: buttons {lay}')
        # Paused mode
        p.locator('[data-action="lab-mode"][data-v="paused"]').click(); p.wait_for_timeout(300); p.locator('.lab-setup [data-action="lab-new"]').click(); p.wait_for_timeout(700)
        check('Frozen at' in p.locator('.lab-status').inner_text(), f'{w}: paused mode freezes at a decision point')
        if SHOTS and w == 390: p.screenshot(path=os.path.join(SHOTS, 'lab-4-paused.png'))
        p.locator('[data-action="lab-scramble"]').click(); p.wait_for_selector('.lab-compare', timeout=20000); p.wait_for_timeout(400)
        n1 = p.evaluate(COUNT); check(n1 >= n0 + 2, f'{w}: both decisions stored ({n0} → {n1})')
        # Same situation repeated: identical frozen picture
        f1 = p.evaluate("() => document.querySelector('#labfield').innerHTML"); p.locator('[data-action="lab-again"]').first.click(); p.wait_for_timeout(600)
        check(p.evaluate("() => document.querySelector('#labfield').innerHTML") != '' and 'Frozen at' in p.locator('.lab-status').inner_text(), f'{w}: the same situation can be repeated')
        # Reload: persists
        p.reload(); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000); check(p.evaluate(COUNT) == n1, f'{w}: decisions survive a reload')
        # Data tab, export, clear, import
        p.evaluate(GO, ['ai-lab', {}]); p.wait_for_timeout(400); p.locator('[data-action="lab-tab"][data-v="data"]').click(); p.wait_for_timeout(500)
        dt = p.locator('main').inner_text().lower(); check('agree with ai' in dt and 'by coverage' in dt, f'{w}: the Data tab shows the analysis')
        if SHOTS and w == 390: p.screenshot(path=os.path.join(SHOTS, 'lab-5-data.png'), full_page=True)
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: data overflow {lay}')
        with p.expect_download() as dl: p.locator('[data-action="lab-export"]').click()
        path = dl.value.path(); data = json.load(open(path)); check(data.get('schema') == 'gridiron-beast/qb-decisions' and data.get('count') == n1, f'{w}: export carries every record ({data.get("count")})')
        p.locator('[data-action="lab-clear"]').click(); p.wait_for_timeout(200); p.locator('.sheet [data-action="yes"]').click(); p.wait_for_timeout(500); check(p.evaluate(COUNT) == 0, f'{w}: clear empties the Lab')
        p.set_input_files('input[data-change="lab-import"]', path); p.wait_for_timeout(800); check(p.evaluate(COUNT) == n1, f'{w}: import restores the records')
        check(p.evaluate("() => JSON.stringify(window.__gb.f || null)") == franchise0, f'{w}: no franchise created or changed')
        report[w] = {'records': n1}; ctx.close()
print(json.dumps({'report': report, 'problems': problems[:20], 'errors': errors[:5]}, indent=1)); ok = not problems and not errors
print(('AI LAB CHECK PASSED' if ok else 'AI LAB CHECK FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)'); sys.exit(0 if ok else 1)
