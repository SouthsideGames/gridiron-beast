#!/usr/bin/env python3
"""Type matchup UI check (GDD §32): headless Chromium at phone sizes. Builds a franchise, starts Sunday's game, reaches a
pre-snap with type icons, taps an icon and checks the panel opens without snapping or selecting a play, closes it, opens the
Type Chart from the panel, from the monster card and from More, and checks for page errors and horizontal overflow.
Emulated browser only, not a real device.
  python3 tools/type-ui-check.py [--width=390 --height=844] [--shots=DIR]
"""
import sys, threading, socketserver, http.server, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); SHOTS = args.get('shots')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
problems, errors = [], []
def shot(page, name):
    if SHOTS: page.screenshot(path=os.path.join(SHOTS, f'{W}-{name}.png'))
def overflow(page): return page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    page.evaluate("""async () => {
      const S = await import('/tools/franchise-soak.mjs'); const F = await import('/src/franchise/franchise.js'); const M = await import('/src/ui/screens/match.js');
      const f = S.newFranchise(5); f.settings.reducedMotion = true; f.settings.mode = 'full'; f.settings.devNotices = false; if (__gb.settings) __gb.settings.devNotices = false;
      F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); }
      __gb.f = f; __gb.save(); M.startSundayGame(f);
    }""")
    page.wait_for_selector('main.screen-match')
    # Advance to a scrimmage snap where the player has icons (kickoffs, continues and other phases are clicked through).
    found = False
    for i in range(80):
        n = page.evaluate("() => document.querySelectorAll('#field .tm-icon').length")
        picked = page.evaluate("() => { const G = __gb.f.game; return !!(G.selected.offense || G.selected.defense) }")
        if n: found = True
        if n >= 2 and picked: break  # prefer a called play with two or more icons for the screenshot
        if n and i > 60: break
        acted = False
        for sel in ['[data-action=continue]', '[data-action=kickoff]', '[data-action=trykick]', '[data-action=skip]']:
            el = page.query_selector(sel)
            if el and el.is_visible() and el.is_enabled(): el.click(); acted = True; break
        if not acted:
            cards = page.query_selector_all('[data-action=pick]')
            sel_now = page.evaluate("() => { const G = __gb.f.game; return G.selected.offense || G.selected.defense }")
            snap = page.query_selector('[data-action=snap]')
            if cards and (not sel_now or i % 3 == 2):
                cards[(i // 3) % len(cards)].click()  # try another call: different calls give different matchups
            elif snap and snap.is_visible() and snap.is_enabled(): snap.click()
        page.wait_for_timeout(250)
        if page.query_selector('.sheet-backdrop'): page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
    if not found: problems.append('no type icon appeared in 80 steps')
    else:
        shot(page, '1-presnap-icons')
        before = page.evaluate("() => { const G = __gb.f.game; return JSON.stringify([G.state.playCount, G.state.clock, G.selected, !!document.querySelector('#field image, #field svg')]) }")
        page.evaluate("() => document.querySelector('#fieldwrap').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(100)
        icon = page.query_selector('#field .tm-icon'); box = icon.bounding_box()
        if box['width'] < 20 or box['height'] < 20: problems.append(f"icon hit area {box['width']:.0f}x{box['height']:.0f}px")
        page.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); page.wait_for_timeout(300)
        txt = page.evaluate("() => document.querySelector('.sheet')?.innerText || ''")
        if 'Matchup' not in txt or ('Type advantage' not in txt and 'Type disadvantage' not in txt and 'wildcard' not in txt): problems.append('panel did not open with a verdict: ' + txt[:200])
        if 'not permanent stat increases' not in txt: problems.append('panel lacks the situational note')
        if '%' not in txt: problems.append('panel lacks the modifier')
        shot(page, '2-panel')
        after = page.evaluate("() => { const G = __gb.f.game; return JSON.stringify([G.state.playCount, G.state.clock, G.selected, !!document.querySelector('#field image, #field svg')]) }")
        if before != after: problems.append(f'tapping the icon changed the game: {before} -> {after}')
        if overflow(page) > 0: problems.append('overflow with the panel open')
        page.click('.sheet-head [data-action=sheet-close]', timeout=5000); page.wait_for_timeout(150)
        if page.query_selector('.sheet-backdrop'): problems.append('panel did not close')
        # panel -> Type Chart
        page.evaluate("() => document.querySelector('#fieldwrap').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(100)
        icon = page.query_selector('#field .tm-icon'); bx = icon.bounding_box(); page.touchscreen.tap(bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2); page.wait_for_timeout(200)
        page.click('.sheet [data-action=tm-chart]'); page.wait_for_timeout(200)
        if 'Strong against' not in (page.evaluate("() => document.querySelector('.sheet')?.innerText || ''")): problems.append('Type Chart did not open from the panel')
        page.click('.sheet [data-action=tc-pick][data-type=Dragon]'); page.wait_for_timeout(150)
        if 'Wildcard' not in page.evaluate("() => document.querySelector('.sheet')?.innerText || ''"): problems.append('Dragon note missing')
        shot(page, '3-chart-dragon')
        if overflow(page) > 0: problems.append('overflow on the Type Chart')
        page.click('.sheet [data-action=sheet-close]')
        after2 = page.evaluate("() => { const G = __gb.f.game; return JSON.stringify([G.state.playCount, G.state.clock, G.selected, !!document.querySelector('#field image, #field svg')]) }")
        if before != after2: problems.append('opening the chart from a match changed the game')
        # icons hidden when the setting is off
        page.evaluate("() => { __gb.f.settings.typeIcons = false; }"); page.evaluate("async () => (await import('/src/ui/router.js')).render()")
        if page.evaluate("() => document.querySelectorAll('#field .tm-icon').length"): problems.append('icons drawn with the setting off')
        page.evaluate("() => { __gb.f.settings.typeIcons = true; }"); page.evaluate("async () => (await import('/src/ui/router.js')).render()")
        # snapping still works and no popup appears after the snap
        snap = page.query_selector('[data-action=snap]')
        if snap and snap.is_visible() and snap.is_enabled():
            snap.click(); during = 0
            for _ in range(40):  # while the play animates (the Skip button is up), no icons and no popups
                if page.query_selector('[data-action=skip]'):
                    during += 1
                    if page.evaluate("() => document.querySelectorAll('#field .tm-icon').length"): problems.append('icons drawn during the play'); break
                elif during: break
                page.wait_for_timeout(50)
            if page.query_selector('.sheet-backdrop .tm-panel'): problems.append('a matchup popup appeared after the snap')
    # monster card and More
    page.evaluate("async () => { const R = await import('/src/ui/router.js'); R.go('monster', { id: __gb.f.roster[0].id }); }"); page.wait_for_timeout(300)
    btn = page.query_selector('[data-action=typechart]')
    if not btn: problems.append('no Type Chart button on the monster card')
    else:
        btn.click(); page.wait_for_timeout(200); shot(page, '4-chart-from-card')
        if 'Strong against' not in page.evaluate("() => document.querySelector('.sheet')?.innerText || ''"): problems.append('chart did not open from the monster card')
        if overflow(page) > 0: problems.append('overflow on the chart from the card')
        page.click('.sheet [data-action=sheet-close]')
    page.evaluate("async () => (await import('/src/ui/router.js')).go('more')"); page.wait_for_timeout(200)
    if not page.query_selector('[data-action=typechart]'): problems.append('no Type Chart entry in More')
    else:
        page.click('[data-action=typechart]'); page.wait_for_timeout(200)
        if 'Strong against' not in page.evaluate("() => document.querySelector('.sheet')?.innerText || ''"): problems.append('chart did not open from More')
    b.close()
srv.shutdown()
print({'width': W, 'height': H, 'problems': problems, 'errors': errors[:8]})
sys.exit(1 if problems or errors else 0)
