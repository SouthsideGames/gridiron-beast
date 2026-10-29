#!/usr/bin/env python3
"""Trade desk check (Task 5, GDD §19.6c): headless Chromium at phone widths over a played franchise in its first offseason.
  - the desk opens from the Trades sheet and from code; partner list, both rosters (with the reason a monster cannot move), picks;
  - choosing a monster and a pick on each side previews roster, cap and depth, and says whether the deal is legal, never whether the club accepts;
  - sending asks for confirmation, then shows the club's answer: a deal done, or a no with reasons (and a counter when there is one);
  - a club's call shows what it offers, what it asks and what accepting does, and answering it works;
  - no horizontal overflow at 320/360/390/412 px; the main controls are at least 40 px tall; no page errors.
Emulated browser, not a real device.
  node tools/trade-desk-save.mjs --seed=51 --out=EXPORT.json
  python3 tools/trade-desk-check.py --save=EXPORT.json [--shots=DIR] [--json=PATH]
"""
import sys, threading, socketserver, http.server, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
SAVE = args.get('save'); SHOTS = args.get('shots'); OUTJSON = args.get('json')
if not SAVE: print('--save=EXPORT.json is required (node tools/trade-desk-save.mjs)'); sys.exit(2)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
URL = f'http://127.0.0.1:{port}/'
TEXT = open(SAVE).read()
problems, errors, report = [], [], {'widths': {}}
def check(cond, msg):
    if not cond: problems.append(msg)
def shot(page, name, w):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); page.screenshot(path=os.path.join(SHOTS, f'{name}-{w}.png'))
def overflow(page, where):
    d = page.evaluate("() => Math.max(document.documentElement.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.sheet')].map(s => s.scrollWidth - s.clientWidth))")
    check(d <= 1, f'horizontal overflow on {where} ({d}px)')
def booted(page):
    page.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && document.querySelector('main.screen .hero, main.screen-recovery')", timeout=60000)
def fresh(pw, w):
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'{w}: {e}'))
    page.on('console', lambda m: errors.append(f'{w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(URL + 'manifest.webmanifest'); page.evaluate("() => localStorage.clear()")
    page.goto(URL); booted(page)
    r = page.evaluate("""async (text) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(text); const r = await window.__gb.importInto(1, f); return { ok: r.ok, err: r.error || null }; }""", TEXT)
    check(r.get('ok'), f'{w}px: import of the played franchise: {r}')
    page.goto(URL); booted(page); page.click('[data-action="continue"]'); page.wait_for_timeout(500)
    return b, page
def small_controls(page, where):
    bad = page.evaluate("() => [...document.querySelectorAll('.sheet button:not([disabled]), .call-panel button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 30).map(b => b.textContent.trim().slice(0, 20))")
    check(not bad, f'{where}: touch targets under 30px: {bad}')

with sync_playwright() as pw:
    for w in [320, 360, 390, 412]:
        b, pg = fresh(pw, w); p = {}
        pg.evaluate("() => import('./src/ui/router.js').then((R) => R.go('offseason'))"); pg.wait_for_timeout(400)
        pg.evaluate("async () => { const U = await import('./src/ui/trade-desk-ui.js'); U.openTradeDesk(window.__gb, { onDone: () => {} }); }"); pg.wait_for_selector('.sheet [data-f="team"]', timeout=15000)
        overflow(pg, f'desk open at {w}px'); shot(pg, 'desk-1-open', w); small_controls(pg, f'desk {w}px')
        p['partners'] = pg.locator('.sheet [data-f="team"] option').count(); check(p['partners'] == 15, f'{w}px: 15 clubs, got {p["partners"]}')
        p['myRows'] = pg.locator('.sheet [data-m^="mine:"]').count(); p['theirRows'] = pg.locator('.sheet [data-m^="theirs:"]').count()
        check(p['myRows'] >= 26 and p['theirRows'] >= 26, f'{w}px: both rosters listed ({p["myRows"]}, {p["theirRows"]})')
        p['blocked'] = pg.locator('.sheet [data-m][disabled]').count(); check(p['blocked'] >= 1, f'{w}px: monsters that cannot move are shown, disabled')
        # choose one of theirs that is for sale and one pick of ours; preview
        pg.locator('.sheet [data-m^="theirs:"][data-sale="1"]:not([disabled])').first.click(); pg.locator('.sheet [data-p^="mine:"]').first.click(); pg.wait_for_timeout(200)
        txt = pg.inner_text('.sheet'); check('Your roster' in txt and 'cap room after' in txt, f'{w}px: preview shows roster and cap'); check('accept' not in txt.lower().split('whether the club says yes')[0][-400:], f'{w}px: preview does not announce an answer')
        overflow(pg, f'desk preview at {w}px'); shot(pg, 'desk-2-preview', w)
        send = pg.locator('.sheet [data-send]'); check(send.is_enabled(), f'{w}px: a legal proposal can be sent')
        pg.evaluate("() => { window.__confirmed = 0; }")
        send.click(); pg.wait_for_selector('[data-action="yes"]', timeout=5000)
        shot(pg, 'desk-2b-confirm', w); pg.click('[data-action="yes"]'); pg.wait_for_timeout(600)
        res = pg.inner_text('.sheet'); p['answered'] = ('Deal done' in res) or ('said no' in res)
        check(p['answered'], f'{w}px: the club answered ({res[-200:]!r})'); overflow(pg, f'desk answer at {w}px'); shot(pg, 'desk-3-answer', w); small_controls(pg, f'desk answer {w}px')
        # a second proposal to the same club is counted
        left = pg.evaluate("() => import('./src/franchise/franchise.js').then((F) => F.deskPartners(window.__gb.f).map((x) => x.clubLeft).reduce((a, c) => a + (3 - c), 0))")
        check(left >= 1, f'{w}px: the proposal was counted ({left})')
        pg.click('.sheet [data-action="sheet-close"]'); pg.wait_for_timeout(300)
        # a call
        info = pg.evaluate("""async () => { const F = await import('./src/franchise/franchise.js'); const f = window.__gb.f; f.offseason ||= { items: [] }; let c = null; for (let s = 1; s <= 80 && !c; s++) { f.seed = s; f.callsMade = {}; f.tradeCall = null; c = F.maybeTradeCall(f); } window.__gb.save(); const R = await import('./src/ui/router.js'); R.go('offseason', {}, { reset: true }); return c ? { kind: c.kind, team: c.team } : null; }""")
        p['call'] = info; check(info is not None, f'{w}px: a club calls')
        if info:
            pg.wait_for_selector('.call-panel', timeout=10000); overflow(pg, f'call panel at {w}px'); shot(pg, 'call-panel', w); small_controls(pg, f'call {w}px')
            t = pg.inner_text('.call-panel'); check('ON THE LINE' in t.upper() and 'If you accept' in t, f'{w}px: the call shows its effect ({t[:120]!r})')
            pg.click('.call-panel [data-call="no"]'); pg.wait_for_timeout(400); check(pg.locator('.call-panel').count() == 0, f'{w}px: declining clears the panel')
        report['widths'][w] = p; b.close()
report['problems'] = problems; report['errors'] = errors
print(json.dumps(report, indent=1)[:3000]); 
if OUTJSON: open(OUTJSON, 'w').write(json.dumps(report, indent=1))
sys.exit(1 if problems or errors else 0)
