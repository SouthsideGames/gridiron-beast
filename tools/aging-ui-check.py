#!/usr/bin/env python3
"""Task 6 Phase A-1 (GDD §55) in headless Chromium at 320/375/390/430 px over a disposable save taken in an offseason after
retirements: the monster page shows the career stage and retirement outlook, an old monster's + buttons show their point cost
(disabled when it cannot be afforded) and a + that costs more spends that many points; a legendary monster reads as ageless;
the Offseason screen lists the club's retirements and the league count; nothing overflows the width; no page errors.
  python3 tools/aging-ui-check.py --save=EXPORT.json [--shots=DIR]"""
import sys, os, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[1:]); SHOTS = args.get('shots')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'; TEXT = open(args['save']).read(); problems, errors = [], []
def check(c, m):
    if not c: problems.append(m)
    return c
IMPORT = """async (t) => { const Save = await import('./src/franchise/save.js'); const F = await import('./src/franchise/franchise.js'); await window.__gb.importInto(1, Save.importJson(t)); const g = window.__gb.f; F.backfillAchievements(g); let n = 0; while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; g.season.recapShown = g.season.awardsShown = true;
  const old = g.roster.filter((m) => !m.legendary && !m.signature).sort((a, b) => b.age - a.age)[0]; old.points = 5; old.potential = 99; window.__old = old.id; await window.__gb.save({ immediate: true }); return old.id; }"""
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm))"
OVER = "() => document.documentElement.scrollWidth - innerWidth"
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [320, 375, 390, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page(); p.on('pageerror', lambda e: errors.append(str(e)))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000); old = p.evaluate(IMPORT, TEXT)
        p.evaluate(GO, ['monster', {'id': old}]); p.wait_for_timeout(400)
        txt = p.locator('main').inner_text()
        check('Career stage' in txt and 'retirement outlook' in txt, f'{w}: career stage and outlook shown')
        costs = p.locator('main .attr .plus small.cost').count(); check(costs >= 1, f'{w}: an old monster shows point costs on + ({costs})')
        check(p.evaluate(OVER) <= 1, f'{w}: monster page overflow {p.evaluate(OVER)}')
        if SHOTS and w in (320, 390): os.makedirs(SHOTS, exist_ok=True); p.locator('details').first.evaluate('(d) => d.open = true'); p.screenshot(path=os.path.join(SHOTS, f'aging-monster-{w}.png'), full_page=False)
        if w == 390:
            btn = p.locator('main .attr .plus:not([disabled]):has(small.cost)').first
            if check(btn.count() == 1, f'{w}: an affordable costly +'):
                cost = int(btn.locator('small.cost').inner_text()); before = p.evaluate("() => window.__gb.f.roster.find((m) => m.id === window.__old).points")
                p.locator('main details').first.evaluate('(d) => d.open = true'); btn.click(); p.wait_for_timeout(300)
                after = p.evaluate("() => window.__gb.f.roster.find((m) => m.id === window.__old).points"); check(before - after == cost, f'{w}: a + that costs {cost} spends {cost} ({before} → {after})')
            leg = p.evaluate("() => (window.__gb.f.roster.find((m) => m.legendary) || {}).id || null")
            if leg: p.evaluate(GO, ['monster', {'id': leg}]); p.wait_for_timeout(300); check('Ageless' in p.locator('main').inner_text(), f'{w}: a legendary reads as ageless')
        p.evaluate(GO, ['offseason', {}]); p.wait_for_timeout(400); txt = p.locator('main').inner_text()
        check('retirements' in txt.lower() and 'Around the league' in txt, f'{w}: offseason retirements panel')
        check(p.evaluate(OVER) <= 1, f'{w}: offseason overflow {p.evaluate(OVER)}')
        if SHOTS and w in (320, 390): h = p.locator('main h3:has-text("Retirements")'); h.scroll_into_view_if_needed(); p.screenshot(path=os.path.join(SHOTS, f'aging-offseason-{w}.png'))
        ctx.close()
    b.close()
print('PASS' if not problems and not errors else 'FAIL'); [print(' -', x) for x in problems + errors]
sys.exit(0 if not problems and not errors else 1)
