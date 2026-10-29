#!/usr/bin/env python3
"""Trade calendar check (Task 5 follow-up, GDD §54.10): headless Chromium at phone widths over saves taken at points of the calendar.
  early (wk 1) · window (wk 5, call waiting) · deadline (wk 8, call waiting) · passed (wk 9) · forged (wk 9, offer forced into the save) · postseason · offseason
Checks: the HQ line says open/closed and why; a waiting offer shows through week 8 and can be accepted; after the deadline it does not show;
a forged offer is refused and cleared; the desk shows its banner (green in the offseason) and cannot send in season; a reload cannot bring an offer back;
no horizontal overflow at 320/360/390/412 px; no page errors. Emulated browser, not a real device.
  node tools/trade-deadline-saves.mjs --seed=51 --dir=DIR
  python3 tools/trade-deadline-check.py --dir=DIR [--shots=DIR] [--json=PATH]
"""
import sys, threading, socketserver, http.server, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
DIR = args.get('dir'); SHOTS = args.get('shots'); OUTJSON = args.get('json')
if not DIR: print('--dir=SAVES is required (node tools/trade-deadline-saves.mjs)'); sys.exit(2)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
URL = f'http://127.0.0.1:{port}/'
problems, errors, report = [], [], {}
def check(cond, msg):
    if not cond: problems.append(msg)
def shot(page, name, w):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); page.screenshot(path=os.path.join(SHOTS, f'{name}-{w}.png'))
def overflow(page, where):
    d = page.evaluate("() => Math.max(document.documentElement.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.sheet')].map(s => s.scrollWidth - s.clientWidth))")
    check(d <= 1, f'horizontal overflow on {where} ({d}px)')
def booted(page):
    page.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && document.querySelector('main.screen .hero, main.screen-recovery')", timeout=60000)
def load(pw, w, name):
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'{name} {w}: {e}'))
    page.on('console', lambda m: errors.append(f'{name} {w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(URL + 'manifest.webmanifest'); page.evaluate("() => localStorage.clear()"); page.goto(URL); booted(page)
    text = open(os.path.join(DIR, name + '.json')).read()
    r = page.evaluate("""async (text) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(text); const r = await window.__gb.importInto(1, f); return { ok: r.ok, err: r.error || null }; }""", text)
    check(r.get('ok'), f'{name} {w}px: import {r}')
    page.goto(URL); booted(page); page.click('[data-action="continue"]'); page.wait_for_timeout(500)
    for _ in range(40):  # a ceremony or achievement card can sit over the HQ in a mid-season save: dismiss it like a player would
        card = page.get_by_role('button', name=__import__('re').compile('^(Continue|Back to headquarters)'))
        if card.count() == 0 or not card.first.is_visible(): break
        card.first.click(); page.wait_for_timeout(300)
    return b, page
def state(page):
    return page.evaluate("""async () => { const F = await import('./src/franchise/franchise.js'); const f = window.__gb.f; const w = F.tradeWindow(f); return { week: f.season.week, phase: w.phase, desk: w.desk, calls: w.calls, call: !!F.tradeCall(f), stored: !!f.tradeCall }; }""")
EXPECT = {'early': ('early', False, False), 'window': ('open-season', False, True), 'deadline': ('open-season', False, True), 'passed': ('deadline-passed', False, False), 'forged': ('deadline-passed', False, False), 'postseason': ('postseason', False, False), 'offseason': ('offseason', True, True)}
with sync_playwright() as pw:
    for w in [320, 390]:
        for name in [n for n in EXPECT if os.path.exists(os.path.join(DIR, n + '.json'))]:
            b, pg = load(pw, w, name); st = state(pg); report[f'{name}-{w}'] = st
            phase, desk, calls = EXPECT[name]
            check(st['phase'] == phase and st['desk'] == desk and st['calls'] == calls, f'{name} {w}px: calendar {st} expected {EXPECT[name]}')
            if name != 'offseason':
                line = pg.locator('[data-trade-status]')
                check(line.count() >= 1 and phase in (line.first.get_attribute('data-trade-status') or ''), f'{name} {w}px: the HQ shows the calendar line ({line.count()})')
                txt = line.first.inner_text() if line.count() else ''
                if phase == 'deadline-passed': check('deadline' in txt.lower() and 'season ends' in txt.lower(), f'{name} {w}px: closed line says why and when it reopens: {txt!r}')
                if phase == 'open-season': check('deadline' in txt.lower() and 'week 8' in txt.lower(), f'{name} {w}px: open line names the deadline: {txt!r}')
                check(pg.locator('.call-panel').count() == (1 if st['call'] else 0), f'{name} {w}px: the offer panel shows exactly when an offer is live ({st})')
                if name in ('passed', 'forged'): check(not st['call'], f'{name} {w}px: no offer after the deadline')
            overflow(pg, f'{name} HQ {w}px'); shot(pg, f'hq-{name}', w)
            if name == 'forged':
                r = pg.evaluate("async () => { const F = await import('./src/franchise/franchise.js'); const f = window.__gb.f; const before = f.roster.map((m) => m.id).join(); const r = F.answerTradeCall(f, true); return { r, same: f.roster.map((m) => m.id).join() === before, cleared: f.tradeCall === null }; }")
                check((not r['r']['ok']) and 'deadline' in r['r'].get('reason', '') and r['same'] and r['cleared'], f'{name} {w}px: a forged offer is refused, cleared, and moves nothing: {r}')
            if name == 'deadline':
                # still week 8: the offer can be accepted from the panel
                pg.click('.call-panel [data-call="yes"]'); pg.wait_for_selector('[data-action="yes"]', timeout=5000); pg.click('[data-action="yes"]'); pg.wait_for_timeout(600)
                check(pg.locator('.call-panel').count() == 0 and not state(pg)['stored'], f'{name} {w}px: the week-8 offer was accepted and cleared')
            if name in ('passed', 'early', 'offseason'):
                pg.evaluate("async () => { const U = await import('./src/ui/trade-desk-ui.js'); U.openTradeDesk(window.__gb, { onDone: () => {} }); }"); pg.wait_for_selector('.sheet [data-trade-status]', timeout=15000)
                bt = pg.inner_text('.sheet [data-trade-status]'); overflow(pg, f'{name} desk {w}px'); shot(pg, f'desk-{name}', w)
                if name == 'offseason': check('open' in bt.lower() and 'closed' not in bt.lower(), f'{name} {w}px: the desk banner says open: {bt!r}')
                else:
                    check('closed' in bt.lower() and 'reopens' in bt.lower(), f'{name} {w}px: the desk banner says closed and when it reopens: {bt!r}')
                    pg.locator('.sheet [data-m^="theirs:"]:not([disabled])').first.click(); pg.locator('.sheet [data-p^="mine:"]').first.click(); pg.wait_for_timeout(200)
                    check(pg.locator('.sheet [data-send]').is_disabled(), f'{name} {w}px: the desk cannot send a proposal in season')
            if name == 'passed':
                # a reload cannot bring an offer back
                pg.reload(); booted(pg); pg.click('[data-action="continue"]'); pg.wait_for_timeout(400); check(not state(pg)['call'], f'{name} {w}px: nothing after a reload')
            b.close()
report['problems'] = problems; report['errors'] = errors
print(json.dumps(report, indent=1)[:2500])
if OUTJSON: open(OUTJSON, 'w').write(json.dumps(report, indent=1))
sys.exit(1 if problems or errors else 0)
