#!/usr/bin/env python3
"""Real DOM/tap regression for the shared franchise polish; not a real-device check.
Run python3 tools/franchise-polish-check.py. Optional CHROMIUM_EXECUTABLE.
Fixtures set up a franchise; decisions below use actual UI controls.
"""
import http.server
import json
import os
import socketserver
import threading
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        args = {'executable_path': os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}
        browser = pw.chromium.launch(**args)
        for width, height in [(320,568),(390,844),(440,900)]:
            page = browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_address[1]}/')
            page.wait_for_function('globalThis.__gb && document.querySelector("main.screen")')
            page.evaluate("""async () => {
              const F=await import('/src/franchise/franchise.js');
              const f=F.createFranchise({owner:{first:'Phone',last:'Polish'},club:'Ember City Beasts',seed:312});
              F.hireDefaultStaff(f); f.settings.tutorial=false; f.settings.devNotices=false;
              f.scenes=[];f.achievementsBackfilled=true;f.guide={enabled:false};
              await __gb.setFranchise(f);
            }""")
            def go(name):
                page.evaluate("async name => (await import('/src/ui/router.js')).go(name,{}, {reset:true})",name)
                page.wait_for_timeout(150)
            def close_sheet():
                page.locator('.sheet-backdrop').last.locator('[data-action="sheet-close"]').click()
            def no_overflow():
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), f'overflow at {width}'
            go('draft')
            # Saving an unscouted prospect never spends a draft pick or RNG.
            before=page.evaluate('JSON.stringify([__gb.f.draft.index,__gb.f.rngState])')
            card=page.locator('[data-prospect-id]').last
            card.locator('[data-polish="shortlist"]').click()
            assert page.evaluate('JSON.stringify([__gb.f.draft.index,__gb.f.rngState])')==before
            card.locator('[data-polish="compare"]').click()
            assert page.locator('.polish-comparison tbody tr').first.locator('td').first.inner_text()=='???'
            close_sheet()
            page.locator('[data-polish-filter="shortlist"]').check()
            assert page.locator('[data-prospect-id]:visible').count()==1
            page.locator('[data-polish="clear-filters"]').click()
            assert page.locator('[data-prospect-id]:visible').count()>30
            no_overflow()
            # Named lineup setup; preview itself cannot change the depth chart.
            go('roster')
            page.locator('[data-polish="presets-lineup"]').click()
            page.locator('[data-preset-name]').fill('My Team')
            page.locator('[data-polish="preset-save"]').click()
            assert page.locator('[data-polish="preset-load"]').count()==1
            close_sheet()
            # Point preview changes nothing until confirmation.
            beast=page.evaluate("""async () => {
              const {frac}=await import('/src/core/fraction.js');
              const m=__gb.f.roster.find(m=>Object.keys(m.dev.current).some(a=>m.dev.current[a]<m.dev.potential[a]));
              m.dev.bank=frac(4);m.points=4;
              const attr=Object.keys(m.dev.current).find(a=>m.dev.current[a]<m.dev.potential[a]);
              await (await import('/src/ui/router.js')).go('monster',{id:m.id});return {id:m.id,attr};
            }""")
            page.locator('[data-polish="points"]').click()
            before=page.evaluate('JSON.stringify(__gb.f.roster.find(m=>m.id==='+json.dumps(beast['id'])+'))')
            page.locator('[data-polish="point-add"][data-id='+json.dumps(beast['attr'])+']').click()
            assert page.evaluate('JSON.stringify(__gb.f.roster.find(m=>m.id==='+json.dumps(beast['id'])+'))')==before
            page.locator('[data-polish="point-confirm"]').click()
            assert page.evaluate('__gb.f.roster.find(m=>m.id==='+json.dumps(beast['id'])+').points')<4
            # Unsaved play selections survive a details trip.
            page.evaluate('__gb.f.season.day=4')
            go('gameplan')
            play=page.locator('[data-action="toggle"][data-side="offense"].selected').first
            play_id=play.get_attribute('data-id');play.click()
            page.locator('[data-action="details"]').click()
            page.locator('[data-action="plan"]').click()
            assert 'selected' not in page.locator('[data-action="toggle"][data-id='+json.dumps(play_id)+']').get_attribute('class')
            no_overflow()
            assert not errors, errors
            print(json.dumps({'width':width,'result':'pass','checks':['shortlist','hidden-knowledge','all-prospects','presets','point-preview','plan-draft','overflow']}))
            page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
