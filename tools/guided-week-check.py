#!/usr/bin/env python3
"""Phone UI regression for new-franchise guidance. Uses real game modules; not a full-season simulation.
Run: python3 tools/guided-week-check.py (CHROMIUM_PATH may select a system browser).
"""
import http.server, socketserver, threading, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_address[1]}'
with sync_playwright() as pw:
    browser = pw.chromium.launch(**({'executable_path': os.environ['CHROMIUM_PATH']} if os.getenv('CHROMIUM_PATH') else {}))
    for width in [320, 390, 440]:
        page = browser.new_page(viewport={'width': width, 'height': 844}, is_mobile=True, has_touch=True)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url); page.wait_for_selector('main.screen')
        page.evaluate("""async () => {
          const F = await import('/src/franchise/franchise.js'); const G = await import('/src/franchise/guide.js');
          const f = F.createFranchise({owner:{first:'New',last:'GM',background:'player'},club:'Ember City Beasts',seed:312});
          F.hireDefaultStaff(f); f.welcomed=true; f.scenes=[]; G.startGuide(f); __gb.f=f; __gb.save();
          (await import('/src/ui/router.js')).go('hq', {}, {reset:true});
        }""")
        assert page.locator('.commissioner-guide h2').inner_text() == 'Let Me Show You Around'
        assert page.locator('[data-screen="practice"]').count() == 0
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'overflow at {width}'
        page.locator('[data-action="guide-next"]').click()
        page.locator('[data-action="guide-open"]').first.click()
        page.wait_for_selector('.screen-roster')
        page.evaluate("async () => (await import('/src/ui/router.js')).go('league')")
        assert page.locator('.screen-roster').count() == 1, 'required sequence was bypassed'
        page.locator('[data-action="slot"]').first.click()
        page.locator('[data-action="monster"]').first.click()
        page.wait_for_selector('.screen-monster')
        assert page.locator('.commissioner-guide h2').inner_text() == 'Know Your Beast'
        page.locator('[data-action="guide-next"]').click()
        page.locator('[data-action="guide-open"]').first.click()
        # Pick an eligible alternate using real assign controls; never auto-complete from a click alone.
        slots = page.locator('[data-action="slot"]')
        changed = False
        for index in range(slots.count()):
            page.locator('[data-action="slot"]').nth(index).click()
            candidates = page.locator('[data-action="assign"]:enabled')
            if candidates.count(): candidates.first.click(); changed = True; break
            page.evaluate("async () => (await import('/src/ui/router.js')).back()")
        assert changed
        assert page.locator('.commissioner-guide h2').inner_text() == 'Meet Your Coaches'
        page.locator('[data-action="guide-open"]').first.click()
        page.locator('[data-action="guide-next"]').click()
        assert page.locator('.commissioner-guide h2').inner_text() == 'Your First Draft'
        page.locator('[data-action="guide-book"]').click()
        assert 'Meet Your Coaches' in page.locator('main').inner_text()
        # Persistence uses the application's actual save and reload path.
        page.evaluate('() => __gb.save()'); page.wait_for_timeout(1500); page.reload(); page.wait_for_selector('main.screen')
        assert page.evaluate('() => __gb.f.guide.index') == 5
        page.evaluate("async () => (await import('/src/ui/router.js')).go('hq', {}, {reset:true})")
        page.locator('[data-action="guide-off"]').click()
        page.evaluate("async () => (await import('/src/ui/router.js')).go('league')")
        page.wait_for_selector('.screen-league')
        assert not errors, errors
        print(f'PASS {width}px: tour, gate, real lineup change, Guidebook, reload, opt out')
        page.close()
    browser.close()
server.shutdown()
