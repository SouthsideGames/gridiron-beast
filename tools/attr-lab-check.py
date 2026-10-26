#!/usr/bin/env python3
"""Attribute Testing Lab check (GDD §8.2 audit), headless Chromium as a phone at 390 px (layout also at 320/430): Developer Tools →
Attribute Testing Lab; a Speed comparison runs on the real engine and its results table shows the engine's numbers (the 95 side
faster than the 50 side: time to 20 yards shorter, peak speed higher); the side-by-side watch draws two fields with the subject
ringed; Durability and Kicking (function trials) run; no franchise created or changed; no overflow; no page errors.
  python3 tools/attr-lab-check.py [--shots=DIR]"""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[1:]); SHOTS = args.get('shots')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'; problems, errors, notes = [], [], []
def check(c, m):
    (notes if c else problems).append(m); return c
def shot(p, n):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, n + '.png'), full_page=True)
GO = "([n]) => import('./src/ui/router.js').then((R) => R.go(n, {}))"
TABLE = "() => [...document.querySelectorAll('.attr-results .lab-table tr')].slice(1).map((tr) => [...tr.children].map((c) => c.innerText.trim()))"
LAYOUT = "() => ({ over: document.documentElement.scrollWidth - innerWidth, bad: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length })"
def num(s): return float(''.join(ch for ch in s if ch.isdigit() or ch in '.-') or 'nan')
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [390, 320, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}')); p.on('console', lambda m, w=w: errors.append(f'{w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        franchise0 = p.evaluate("() => JSON.stringify(window.__gb.f || null)")
        p.evaluate(GO, ['menu']); p.wait_for_timeout(300); p.locator('main [data-screen="developer"]').first.tap(); p.wait_for_timeout(300)
        check(p.locator('main [data-screen="attr-lab"]').count() == 1, f'{w}: Attribute Testing Lab is in Developer Tools'); p.locator('main [data-screen="attr-lab"]').tap(); p.wait_for_timeout(400)
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: setup fits {lay}')
        p.select_option('[data-change=attr-attr]', 'speed'); p.wait_for_timeout(200); p.select_option('[data-change=attr-trial]', 'speed_wr_go'); p.wait_for_timeout(200); p.select_option('[data-change=attr-n]', '25')
        p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000)
        rows = p.evaluate(TABLE); by = {r[0].lower(): r for r in rows} # CSS uppercases the headers
        check('time to 20 yards' in by and num(by['time to 20 yards'][1]) > num(by['time to 20 yards'][2]), f'{w}: 95 Speed reaches 20 yards sooner {by.get("time to 20 yards")}')
        check('peak speed' in by and num(by['peak speed'][2]) > num(by['peak speed'][1]) + 1, f'{w}: 95 Speed peaks higher {by.get("peak speed")}')
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: results fit {lay}')
        if w != 390: shot(p, f'attr-{w}-results'); ctx.close(); continue
        shot(p, 'attr-1-results')
        # live engine numbers, not assumed: the same trial headless must agree
        exp = p.evaluate("async () => { const T = await import('./src/lab/attr-trials.js'); const t = T.TRIALS.find((x) => x.id === 'speed_wr_go'); const r = T.runTrial(t, 25, [50, 95]); return [r.levels[50].peak, r.levels[95].peak]; }")
        check(abs(num(by['peak speed'][1]) - exp[0]) < 0.06 and abs(num(by['peak speed'][2]) - exp[1]) < 0.06, f'the table shows the engine\'s own numbers {by["peak speed"][1:3]} vs {exp}')
        # watch side by side
        p.locator('[data-action="attr-watch"]').first.tap(); p.wait_for_timeout(1500)
        check(p.locator('#attrfield0').count() == 1 and p.locator('#attrfield1').count() == 1, 'two fields drawn side by side')
        check(p.evaluate("() => document.querySelectorAll('#attrfield0 .qb-read-ring, #attrfield1 .qb-read-ring').length") == 2, 'the subject is ringed on both fields')
        shot(p, 'attr-2-watch')
        # a defensive subject, a contact trial, durability and kicking
        p.select_option('[data-change=attr-attr]', 'tackling'); p.wait_for_timeout(200); p.select_option('[data-change=attr-n]', '25'); p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000)
        rows = p.evaluate(TABLE); check(len(rows) >= 2, f'tackling trial produces measures {[r[0] for r in rows]}')
        p.locator('[data-action="attr-watch"]').first.tap(); p.wait_for_timeout(800); check(p.evaluate("() => document.querySelectorAll('#attrfield0 circle[stroke-dasharray]').length") >= 1, 'defensive subjects are ringed')
        for a in ['durability', 'kicking']:
            p.select_option('[data-change=attr-attr]', a); p.wait_for_timeout(200); p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000)
            rows = p.evaluate(TABLE); check(len(rows) >= 2 and all(r[1] != '—' for r in rows), f'{a} trial shows numbers {rows[:2]}')
        shot(p, 'attr-3-kicking')
        check(p.evaluate("() => JSON.stringify(window.__gb.f || null)") == franchise0, 'no franchise created or changed')
        ctx.close()
print('\n'.join('ok: ' + n for n in notes)); print(json.dumps({'problems': problems, 'errors': errors[:8]}, indent=1))
print('ATTR LAB CHECK ' + ('PASSED' if not problems and not errors else 'FAILED'))
sys.exit(0 if not problems and not errors else 1)
