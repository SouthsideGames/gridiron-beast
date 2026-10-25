#!/usr/bin/env python3
"""Previous / Next on a monster page (v42.4.1), headless Chromium at 320/375/390/430 px over a disposable save: the bar shows under
the title (Back and Help unchanged), Next and Previous walk the whole roster in depth-chart order and wrap around, every monster
is visited once, the page opens at the top, the bar stays pinned while scrolling, nothing overflows, and Back returns to the
Roster screen (not through every monster browsed). Browsing writes nothing beyond the season stamp the monster page already puts on an empty stats book.
  python3 tools/roster-nav-check.py --save=EXPORT.json [--shots=DIR]"""
import sys, os, json, threading, socketserver, http.server
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
IMPORT = """async (t) => { const Save = await import('./src/franchise/save.js'); const F = await import('./src/franchise/franchise.js'); await window.__gb.importInto(1, Save.importJson(t)); const g = window.__gb.f; F.backfillAchievements(g); let n = 0; while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; g.season.recapShown = g.season.awardsShown = true; await window.__gb.save({ immediate: true }); }"""
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm))"
cur = lambda p: p.evaluate("() => import('./src/ui/router.js').then((R) => R.currentScreen())")
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [320, 375, 390, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page(); p.on('pageerror', lambda e: errors.append(str(e)))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000); p.evaluate(IMPORT, TEXT)
        n = p.evaluate("() => window.__gb.f.roster.length"); before = p.evaluate("() => JSON.stringify(window.__gb.f)")
        p.evaluate(GO, ['roster', {}]); p.wait_for_timeout(300); first = p.evaluate("() => window.__gb.f.roster[0].id")
        p.evaluate(GO, ['monster', {'id': first}]); p.wait_for_timeout(300)
        check(p.locator('.topbar .back').count() >= 1, f'{w}: Back is still in the title bar'); check('Help' in p.locator('.topbar').inner_text(), f'{w}: Help is still in the title bar')
        check(p.locator('main .mon-nav').count() == 1, f'{w}: the Previous / Next bar')
        if SHOTS and w in (320, 390): os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, f'nav-{w}-top.png'))
        seen = []; 
        for i in range(n + 1):
            seen.append(cur(p)['params']['id'])
            lay = p.evaluate("""() => { const W = innerWidth; const nav = document.querySelector('.mon-nav'); const r = nav.getBoundingClientRect(); const bad = [...nav.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > W + 1).length;
              return { over: document.documentElement.scrollWidth - W, bad, top: Math.round(scrollY), btnH: Math.min(...[...nav.querySelectorAll('button')].map((x) => x.getBoundingClientRect().height)) }; }""")
            check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: overflow {lay}'); check(lay['btnH'] >= 43, f'{w}: buttons touch-sized {lay["btnH"]}')
            if i: check(lay['top'] == 0, f'{w}: a new monster opens at the top ({lay["top"]})')
            p.evaluate("() => scrollTo(0, 900)"); p.wait_for_timeout(60)
            check(p.evaluate("() => { const r = document.querySelector('.mon-nav').getBoundingClientRect(); const t = document.querySelector('.topbar').getBoundingClientRect(); return r.top >= t.bottom - 1 && r.top <= t.bottom + 1; }"), f'{w}: the bar stays pinned under the title while scrolling')
            if SHOTS and w == 390 and i == 1: p.screenshot(path=os.path.join(SHOTS, f'nav-{w}-scrolled.png'))
            if i < n: p.locator('main .mon-nav-btn.next').click(); p.wait_for_timeout(120)
        check(len(set(seen[:n])) == n, f'{w}: Next visits all {n} monsters once ({len(set(seen[:n]))})'); check(seen[n] == seen[0], f'{w}: and wraps around to the first')
        p.locator('main .mon-nav-btn').first.click(); p.wait_for_timeout(120); check(cur(p)['params']['id'] == seen[n - 1], f'{w}: Previous goes back one (and wraps)')
        p.locator('.topbar .back').first.click(); p.wait_for_timeout(300); check(cur(p)['name'] == 'roster', f'{w}: Back returns to the Roster after browsing ({cur(p)["name"]})')
        aft = p.evaluate("() => JSON.stringify(window.__gb.f)")
        # The monster page itself (existing behaviour, not the bar) stamps the current season on an empty stats book the first time it
        # opens; that one change is allowed, anything else is a problem.
        def norm(t):
            d = json.loads(t)
            for m in d.get('roster', []):
                st = m.get('stats') or {}
                if st.get('season', {}).get('year') is None and not st.get('season', {}).get('reg') and st.get('season') is not None: st['season']['year'] = d['season']['year']
            return json.dumps(d, sort_keys=True)
        if norm(aft) == norm(before): before = aft
        if aft != before:
            B, A = json.loads(before), json.loads(aft); keys = [k for k in B if json.dumps(B[k]) != json.dumps(A.get(k))]
            det = []
            for x, y in zip(B.get('roster', []), A.get('roster', [])):
                if json.dumps(x) != json.dumps(y): det.append((x['name'], [k for k in set(x) | set(y) if json.dumps(x.get(k)) != json.dumps(y.get(k))]))
            problems.append(f'{w}: browsing changed {keys} {det[:3]}')
        ctx.close()
print(json.dumps({'problems': problems[:20], 'errors': errors[:5]}, indent=1)); ok = not problems and not errors
print(('ROSTER NAV CHECK PASSED' if ok else 'ROSTER NAV CHECK FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)'); sys.exit(0 if ok else 1)
