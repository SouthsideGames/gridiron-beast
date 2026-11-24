#!/usr/bin/env python3
"""Large screens in a real browser: Galaxy Z Fold cover and inner screens (both ways round), tablets and computers.

Checks, at each size: no sideways scroll on the main franchise screens; the pinned HQ action is on screen before scrolling
and centred; HQ uses two columns from 860 px; sheets are centred dialogs from 720x600 (bottom sheets otherwise); the live
match fits without page scroll with its Snap button on screen and, on a large landscape screen, a field at least 560 px wide.
Then it folds and unfolds a phone in the middle of a match and checks that nothing in the game changes and play continues.

Browser emulation only: it does not prove a real Fold's hinge, Android activity restarts or native safe areas.
Set CHROMIUM_EXECUTABLE to use a system Chrome.
"""
import http.server, json, os, re, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_address[1]}/'
START = re.search(r'START = """(.*?)"""', open(os.path.join(ROOT, 'tools/live-console-check.py')).read(), re.S).group(1)
FRANCHISE = """async () => { const F = await import('/src/franchise/franchise.js');
  const f = F.createFranchise({ owner: { first: 'Large', last: 'Screen' }, club: 'Ember City Beasts', seed: 612 }); F.hireDefaultStaff(f);
  f.settings.tutorial = false; f.settings.devNotices = false; f.guide = { enabled: false }; f.scenes = []; f.achievementsBackfilled = true; f.welcomed = true;
  await __gb.setFranchise(f); }"""
GO = "async ([name, params]) => (await import('/src/ui/router.js')).go(name, params, { reset: !params.id })"
SIZES = [  # name, width, height, touch
    ('fold-cover', 384, 897, True), ('fold-open', 757, 840, True), ('fold-open-landscape', 840, 757, True),
    ('tablet', 820, 1180, True), ('tablet-landscape', 1180, 820, True), ('laptop', 1440, 900, False), ('desktop', 1920, 1080, False),
]
problems = []
def check(cond, what):
    if not cond: problems.append(what); print('FAIL', what, flush=True)
def visible(page, sel): return page.evaluate("(s) => [...document.querySelectorAll(s)].some(e => e.getClientRects().length && !e.closest('[hidden]') && !e.disabled)", sel)
def clear(page):
    for _ in range(30):
        scene = page.locator('.apex-scene [data-apex="skip"], .apex-scene [data-apex="continue"]')
        if not scene.count(): break
        scene.first.click(); page.wait_for_timeout(60)
    page.evaluate("() => document.querySelectorAll('#toast').forEach(t => t.classList.remove('show'))")
def settle(page):
    for _ in range(40):
        clear(page)
        if page.locator('.sheet').count(): page.locator('.sheet [data-action="sheet-close"]').first.click(); page.wait_for_timeout(150); continue
        for a in ['skip', 'continue', 'kickoff']:
            if visible(page, f'main.screen [data-action="{a}"]'): page.locator(f'main.screen [data-action="{a}"]').first.click(); page.wait_for_timeout(200); break
        else:
            if page.locator('main.screen [data-action="snap"]').count(): return
            page.wait_for_timeout(200)
def play(page):
    settle(page); page.locator('main.screen [data-action="match-panel"][data-panel="plays"]').first.click(); page.wait_for_timeout(200)
    card = page.locator('.sheet .play-grid [data-live-control]').last; card.scroll_into_view_if_needed(); card.click(); page.wait_for_timeout(300)
    page.locator('main.screen [data-action="snap"]').first.click(); page.wait_for_timeout(2500); settle(page)
CONSOLE = """() => { const f = document.querySelector('#fieldwrap'), b = f && f.getBoundingClientRect(), s = document.querySelector('main.screen [data-action="snap"]'), sb = s && s.getBoundingClientRect();
  return { page: document.scrollingElement.scrollHeight - innerHeight, side: document.documentElement.scrollWidth - innerWidth,
    field: b ? Math.round(Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)) : 0, fieldW: b ? Math.round(b.width) : 0, snap: !!sb && sb.top >= 0 && sb.bottom <= innerHeight } }"""
GAME = "() => { const s = __gb.f.game.state; return JSON.stringify([s.playCount, s.rngState, s.score, s.ballOn, s.clock, s.possession]) }"

with sync_playwright() as pw:
    args = {'executable_path': os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}
    browser = pw.chromium.launch(**args)
    for name, w, h, touch in SIZES:
        page = browser.new_page(viewport={'width': w, 'height': h}, is_mobile=touch, has_touch=touch); errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL); page.wait_for_function("() => window.__gb && __gb.storage.mode !== 'starting'"); page.evaluate(FRANCHISE)
        for screen, params in [('hq', {}), ('roster', {}), ('league', {}), ('office', {}), ('map', {}), ('more', {}), ('monster', 'first')]:
            page.evaluate(GO, [screen, {'id': page.evaluate('__gb.f.roster[0].id')} if params == 'first' else params]); page.wait_for_timeout(350); clear(page)
            check(page.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0, f'{name}: {screen} scrolls sideways')
        page.evaluate(GO, ['hq', {}]); page.wait_for_timeout(400); clear(page)
        bar = page.locator('.phone-hq-next [data-phone-next]').bounding_box()
        check(bar and bar['y'] + bar['height'] <= h, f'{name}: the HQ action is not on screen before scrolling')
        if bar: check(abs((bar['x'] + bar['width'] / 2) - w / 2) <= 2, f'{name}: the HQ action is not centred ({round(bar["x"])}px from the left)')
        cols = page.evaluate("() => getComputedStyle(document.querySelector('main.screen-hq')).gridTemplateColumns.split(' ').length")
        check((cols == 2) == (w >= 860), f'{name}: HQ has {cols} column(s)')
        page.evaluate(GO, ['league', {}]); page.wait_for_timeout(300); clear(page)
        page.evaluate("async () => (await import('/src/ui/dom.js')).sheet('<p>Large screen check</p>', { title: 'Check' })"); page.wait_for_timeout(300)
        box = page.locator('.sheet').last.bounding_box(); dialog = w >= 720 and h >= 600
        check(box and ((abs(box['y'] + box['height'] / 2 - h / 2) <= 30) if dialog else (abs(box['y'] + box['height'] - h) <= 2)), f'{name}: sheet should be {"a centred dialog" if dialog else "a bottom sheet"} ({box})')
        page.keyboard.press('Escape'); page.wait_for_timeout(200)
        page.evaluate(START); page.wait_for_selector('.screen-match'); settle(page)
        m = page.evaluate(CONSOLE)
        check(m['page'] <= 1 and m['side'] <= 0 and m['snap'] and m['field'] >= 140, f'{name}: live match console {m}')
        if w >= 900 and h >= 560 and w > h: check(m['fieldW'] >= 560, f'{name}: the field is only {m["fieldW"]} px wide on a large landscape screen')
        check(not errors, f'{name}: page errors {errors[:2]}')
        print(json.dumps({'size': name, 'width': w, 'height': h, 'hqColumns': cols, 'field': m}), flush=True)
        page.close()
    # Fold and unfold in the middle of a match.
    page = browser.new_page(viewport={'width': 384, 'height': 897}, is_mobile=True, has_touch=True); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_function("() => window.__gb && __gb.storage.mode !== 'starting'"); page.evaluate(START); page.wait_for_selector('.screen-match'); play(page)
    for w, h, step in [(757, 840, 'unfold'), (840, 757, 'turn sideways'), (384, 897, 'fold'), (757, 840, 'unfold again')]:
        before = page.evaluate(GAME); page.set_viewport_size({'width': w, 'height': h}); page.wait_for_timeout(600)
        m = page.evaluate(CONSOLE)
        check(page.evaluate(GAME) == before, f'fold test: {step} changed the game')
        check(m['page'] <= 1 and m['side'] <= 0 and m['field'] >= 140, f'fold test: {step} console {m}')
    count = page.evaluate('__gb.f.game.state.playCount'); play(page)
    check(page.evaluate('__gb.f.game.state.playCount') > count, 'fold test: no play ran after folding and unfolding')
    check(not errors, f'fold test: page errors {errors[:2]}')
    browser.close()
server.shutdown()
print(('PASS' if not problems else 'FAIL') + f' large screen check: {len(problems)} problem(s)')
sys.exit(1 if problems else 0)
