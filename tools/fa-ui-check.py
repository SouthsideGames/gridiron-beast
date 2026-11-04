#!/usr/bin/env python3
"""Task 7 free-agency market UI check (headless phone-sized Chromium).

Imports a franchise at the end of its first season (renewals pending) and walks the new offseason through the real screens:
renewals (1-3 seasons) -> open free agency -> the market list (cap total / reserved / usable, filters, interest) -> the
negotiation sheet (simple terms, the expandable advanced detail) -> an offer (reservation shown) -> the advance warning ->
finish -> the draft gate -> the Salary & Contracts screen (market link, extension button). At 320, 390 and 430 px: no page
errors, no horizontal overflow, controls at least 30 px tall.

  python3 tools/fa-ui-check.py FIXTURE.json [--root=DIR] [--shots=DIR]
"""
import sys, os, json, threading, http.server, functools
from playwright.sync_api import sync_playwright

args = dict(a.split('=', 1) if '=' in a else (a, '1') for a in sys.argv[2:])
FIXTURE = sys.argv[1]; ROOT = os.path.abspath(args.get('--root', os.path.join(os.path.dirname(__file__), '..'))); SHOTS = args.get('--shots')
TEXT = open(FIXTURE).read(); errors = []; fails = []; PORT = 8791
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/'
def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg); (None if cond else fails.append(msg))
def shot(page, name, w):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); page.screenshot(path=os.path.join(SHOTS, f'{name}-{w}.png'))
def overflow(page, where):
    d = page.evaluate("() => Math.max(document.documentElement.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.sheet')].map(s => s.scrollWidth - s.clientWidth))")
    check(d <= 1, f'{where}: no horizontal overflow ({d}px)')
def small(page, where):
    bad = page.evaluate("() => [...document.querySelectorAll('main.screen button:not([disabled]), .sheet button:not([disabled])')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 30).map(b => b.textContent.trim().slice(0, 20))")
    check(not bad, f'{where}: controls at least 30px tall {bad[:5]}')
def booted(page):
    page.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && document.querySelector('main.screen .hero, main.screen-recovery')", timeout=60000)
def go(page, name):
    page.evaluate(f"() => import('./src/ui/router.js').then((R) => R.go('{name}'))"); page.wait_for_timeout(400)
def state(page, js):
    return page.evaluate(f"() => import('./src/franchise/franchise.js').then((F) => {{ const f = window.__gb.f; return {js}; }})")

with sync_playwright() as pw:
    for w in (320, 390, 430):
        b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': w, 'height': 820}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page(); page.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}'))
        page.on('console', lambda m, w=w: errors.append(f'{w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
        page.goto(URL + 'manifest.webmanifest'); page.evaluate("() => localStorage.clear()")
        page.goto(URL); booted(page)
        r = page.evaluate("""async (text) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(text); const r = await window.__gb.importInto(1, f); return { ok: r.ok, err: r.error || null }; }""", TEXT)
        check(r.get('ok'), f'{w}px: fixture imported {r}')
        page.goto(URL); booted(page); page.click('[data-action="continue"]'); page.wait_for_timeout(500)
        go(page, 'offseason'); body = page.inner_text('main.screen')
        check('free agency' in body.lower() and 'open free agency' in body.lower(), f'{w}px: offseason shows the free-agency step')
        check(page.locator('[data-action="faopenmarket"]').is_disabled(), f'{w}px: free agency waits for the renewals')
        check(page.locator('[data-action="yrs"][data-v="3"]').count() > 0, f'{w}px: renewals offer three seasons')
        overflow(page, f'{w}px offseason (renewals)'); shot(page, 'fa-1-renewals', w)
        # settle the renewals at their asks (the monster answers)
        page.click('[data-action="signall"]'); page.wait_for_selector('[data-action="yes"]'); page.click('[data-action="yes"]'); page.wait_for_timeout(500)
        check(state(page, 'F.offseasonPending(f).length') == 0, f'{w}px: every renewal answered')
        page.click('[data-action="faopenmarket"]'); page.wait_for_timeout(600)
        body = page.inner_text('main.screen')
        check('period 1 of 5' in body.lower() and 'usable' in body.lower() and 'reserved' in body.lower(), f'{w}px: market header, cap total/committed/reserved/usable')
        check(page.locator('[data-action="faopen"]').count() > 5, f'{w}px: free agents listed')
        overflow(page, f'{w}px market'); small(page, f'{w}px market'); shot(page, 'fa-2-market', w)
        page.click('[data-action="fafilter"][data-v="WR"]'); page.wait_for_timeout(300)
        pos = page.evaluate("() => [...document.querySelectorAll('[data-action=\"faopen\"] .name .dim')].map(e => e.textContent.split(' ')[0])")
        check(all(p == 'WR' for p in pos), f'{w}px: position filter ({set(pos)})')
        page.click('[data-action="fafilter"][data-v=""]'); page.wait_for_timeout(300)
        # the negotiation sheet
        page.locator('[data-action="faopen"]').nth(3).click(); page.wait_for_selector('.sheet [data-act="offer"], .sheet [data-act="revise"]')
        txt = page.inner_text('.sheet'); check('Interest' in txt and 'answers by' in txt, f'{w}px: sheet shows interest and the deadline before submitting')
        page.click('.sheet details summary'); page.wait_for_timeout(200); txt = page.inner_text('.sheet')
        check('What he wants' in txt and 'Cap schedule' in txt and 'Competing offers' in txt and 'Signing bonus' in txt, f'{w}px: advanced detail expands')
        overflow(page, f'{w}px sheet'); small(page, f'{w}px sheet'); shot(page, 'fa-3-sheet', w)
        before = state(page, 'F.freeAgencyCap(f).reserved')
        if page.locator('.sheet [data-act="offer"]').is_enabled():
            page.click('.sheet [data-act="offer"]'); page.wait_for_timeout(500)
            after = state(page, 'F.freeAgencyCap(f).reserved'); check(after > before, f'{w}px: the offer reserves cap ({before} -> {after})')
            check('your offers' in page.inner_text('main.screen').lower(), f'{w}px: the offer is listed with its state')
        else:
            check(False, f'{w}px: an offer could be made ({page.inner_text(".sheet")[-160:]!r})')
            page.click('.sheet [data-action="sheet-close"]')
        # the advance warning, then finish
        page.click('[data-action="fafinish"]'); page.wait_for_selector('[data-action="yes"]'); wtxt = page.inner_text('.sheet')
        check('live offer' in wtxt, f'{w}px: finishing warns about the pending offer'); page.click('[data-action="yes"]'); page.wait_for_timeout(700)
        check(state(page, 'F.freeAgencyDone(f)'), f'{w}px: free agency finished')
        body = page.inner_text('main.screen'); check('free agency closed' in body.lower(), f'{w}px: closed state shown')
        check(state(page, 'Object.values(f.freeAgency.offers).filter((o) => ["pending","countered","accepted"].includes(o.state)).length') == 0, f'{w}px: nothing left live')
        overflow(page, f'{w}px after free agency'); shot(page, 'fa-4-closed', w)
        go(page, 'contracts'); body = page.inner_text('main.screen')
        check('free-agent market' in body.lower(), f'{w}px: Salary & Contracts links the market'); overflow(page, f'{w}px contracts'); small(page, f'{w}px contracts')
        go(page, 'famarket'); check('free agency closed' in page.inner_text('main.screen').lower(), f'{w}px: market screen opens'); overflow(page, f'{w}px market screen')
        b.close()
srv.shutdown()
check(not errors, f'no page errors {errors[:4]}')
print(json.dumps({'fails': len(fails), 'errors': len(errors)}))
sys.exit(1 if fails or errors else 0)
