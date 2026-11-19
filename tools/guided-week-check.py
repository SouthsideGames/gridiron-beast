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
def clear_scenes(page):
    # First-discovery (Apex) panels open over HQ for a new club's beasts; a player taps Skip, then Continue.
    for _ in range(20):
        if not page.locator('.apex-scene').count(): return
        page.locator('.apex-scene [data-apex="skip"]').first.click(); page.locator('.apex-scene [data-apex="continue"]').first.click()
    raise AssertionError('Apex panels did not close')
def click(page, selector, nth=0):
    clear_scenes(page); page.locator(selector).nth(nth).click()
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
        click(page, '[data-action="guide-next"]')
        roster_tab = page.locator('.tabbar [data-screen="roster"]')
        assert 'guide-target' in roster_tab.get_attribute('class'), 'real Roster tab is not highlighted'
        assert roster_tab.evaluate('(el) => getComputedStyle(el).animationName') == 'guide-control-pulse'
        click(page, '.tabbar [data-screen="roster"]')
        page.wait_for_selector('.screen-roster')
        page.evaluate("async () => (await import('/src/ui/router.js')).go('league')")
        assert page.locator('.screen-roster').count() == 1, 'required sequence was bypassed'
        click(page, '[data-action="slot"]')
        click(page, '[data-action="monster"]')
        page.wait_for_selector('.screen-monster')
        assert page.locator('.commissioner-guide h2').inner_text() == 'Know Your Beast'
        click(page, '[data-action="guide-next"]')
        click(page, '[data-action="guide-open"]')
        # Pick an eligible alternate using real assign controls; never auto-complete from a click alone.
        slots = page.locator('[data-action="slot"]')
        changed = False
        for index in range(slots.count()):
            click(page, '[data-action="slot"]', index)
            candidates = page.locator('[data-action="assign"]:enabled')
            if candidates.count():
                candidates.first.click(); changed = True
                # The completed lesson must not strand the player on the assignment screen (Back used to be refused by the lesson gate).
                page.wait_for_selector('.screen-roster'); assert 'Finish or skip' not in (page.locator('#toast').inner_text() if page.locator('#toast.show').count() else '')
                break
            page.evaluate("async () => (await import('/src/ui/router.js')).back()")
        assert changed
        assert page.locator('.commissioner-guide h2').inner_text() == 'Meet Your Coaches'
        click(page, '[data-action="guide-open"]')
        click(page, '[data-action="guide-next"]')
        assert page.locator('.commissioner-guide h2').inner_text() == 'Your First Draft'
        click(page, '[data-action="guide-book"]')
        assert 'Meet Your Coaches' in page.locator('main').inner_text()
        # Persistence uses the application's actual save and reload path.
        page.evaluate('() => __gb.save()'); page.wait_for_timeout(1500); page.reload(); page.wait_for_function('() => window.__gb && __gb.storage.mode !== "starting" && __gb.f')  # main.screen is already in the loading placeholder
        assert page.evaluate('() => __gb.f.guide.index') == 5
        page.evaluate("async () => (await import('/src/ui/router.js')).go('hq', {}, {reset:true})")
        click(page, '[data-action="guide-off"]')
        page.evaluate("async () => (await import('/src/ui/router.js')).go('league')")
        page.wait_for_selector('.screen-league')
        # A new player's real match transition ends the guide before kickoff.
        page.evaluate("""async () => {
          const F = await import('/src/franchise/franchise.js'); const G = await import('/src/franchise/guide.js');
          const f = F.createFranchise({owner:{first:'Kickoff',last:'GM',background:'player'},club:'Ember City Beasts',seed:312});
          F.hireDefaultStaff(f); f.welcomed=true; f.scenes=[]; G.startGuide(f);
          f.guide.index=G.LESSONS.findIndex(l=>l.kind==='game'); f.season.day=6;
          const m=F.sundayMatchup(f); f.week.pregame={status:'done',side:m.playerSide,result:{winner:'a'},choice:'receive'};
          __gb.f=f; (await import('/src/ui/screens/match.js')).startSundayGame(f);
        }""")
        page.wait_for_selector('.screen-match'); clear_scenes(page)
        assert page.locator('.guide-sendoff').count() == 1
        assert 'the board will' in page.locator('.guide-sendoff').inner_text()
        assert page.evaluate('__gb.f.guide.done && __gb.f.guide.endedAtFootball')
        assert page.locator('.commissioner-guide,.guide-compact,.guide-target').count() == 0
        assert page.locator('.sheet-backdrop').count() == 0, 'a legacy football lesson replaced the guide'
        click(page, '.guide-sendoff button')
        page.evaluate("async () => (await import('/src/ui/router.js')).render()")
        assert page.locator('.guide-sendoff').count() == 0, 'send-off repeated after rerender'
        page.evaluate("""async () => {
          const g=await import('/src/ui/guided-week.js'); const t=await import('/src/ui/tutorial.js');
          __gb.f.game.state.down=4; g.guideFootball(__gb.f,()=>__gb.save());
          g.guideMoment(__gb.f,'status',()=>__gb.save()); t.momentSheet(__gb.f,'clock',()=>__gb.save());
          __gb.save();
        }""")
        assert page.locator('.sheet-backdrop').count() == 0
        page.wait_for_timeout(1500); page.reload()
        page.wait_for_function('() => window.__gb && __gb.storage.mode !== "starting" && __gb.f')
        page.evaluate("async () => (await import('/src/ui/router.js')).go('match', {}, {reset:true})")
        assert page.locator('.guide-sendoff,.commissioner-guide,.guide-compact').count() == 0
        assert not errors, errors
        print(f'PASS {width}px: real highlighted navigation, tour, lineup, kickoff handoff, no match tips, reload, opt out')
        page.close()
    browser.close()
server.shutdown()
