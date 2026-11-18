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
            def dismiss_scenes():
                # A first sighting of an Apex beast plays its discovery scene over the screen; close it the way a player does.
                for _ in range(4):
                    scene = page.locator('.apex-scene')
                    if not scene.count(): return
                    for control in ['[data-apex="skip"]', '[data-apex="continue"]']:
                        if scene.locator(control).count() and scene.locator(control).first.is_visible(): scene.locator(control).first.click(); break
                    page.wait_for_timeout(300)
            def go(name):
                page.evaluate("async name => (await import('/src/ui/router.js')).go(name,{}, {reset:true})",name)
                page.wait_for_timeout(150); dismiss_scenes()
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
            page.evaluate('__gb.f.season.day=0')
            def toast_text(): return page.evaluate("() => document.querySelector('#toast.show')?.innerText || ''")
            def sheets(): return page.locator('.sheet-backdrop').count()
            # The shortlist page's own Review and Remove work (the shared header listener must not swallow them).
            go('shortlist')
            assert page.locator('[data-polish="shortlist-remove"]').count()==1
            page.locator('[data-polish="shortlist-open"]').click(); page.wait_for_timeout(150)
            assert page.locator('.sheet .polish-comparison').count()==1, 'shortlist Review opens the comparison'
            close_sheet(); page.locator('[data-polish="shortlist-remove"]').click(); page.wait_for_timeout(150)
            assert page.locator('[data-polish="shortlist-remove"]').count()==0 and not page.evaluate('__gb.f.polish.shortlist.length'), 'shortlist Remove removes'
            # A staged point plan is refused once the beast has changed; nothing is committed.
            page.evaluate("async id => { const {frac}=await import('/src/core/fraction.js'); const m=__gb.f.roster.find(m=>m.id===id); m.dev.bank=frac(3); m.points=3; await (await import('/src/ui/router.js')).go('monster',{id}); }", beast['id'])
            page.wait_for_timeout(150); page.locator('[data-polish="points"]').click()
            page.locator('[data-polish="point-add"][data-id='+json.dumps(beast['attr'])+']').click()
            page.evaluate('id => { __gb.f.roster.find(m=>m.id===id).fatigue += 5; }', beast['id'])
            snapshot=page.evaluate('JSON.stringify(__gb.f.roster.find(m=>m.id==='+json.dumps(beast['id'])+'))')
            page.locator('[data-polish="point-confirm"]').click(); page.wait_for_timeout(150)
            assert page.evaluate('JSON.stringify(__gb.f.roster.find(m=>m.id==='+json.dumps(beast['id'])+'))')==snapshot, 'a stale point preview was committed'
            # Escape closes the top sheet even after a tap on plain text moved focus out of its controls.
            page.locator('.sheet-body p').first.click(); page.keyboard.press('Escape'); page.wait_for_timeout(100)
            assert sheets()==0, 'Escape after tapping plain sheet text'
            # A quick double tap on Confirm commits once and the second tap does not fall through to the tab bar beneath.
            page.locator('[data-polish="points"]').click(); page.locator('[data-polish="point-add"][data-id='+json.dumps(beast['attr'])+']').tap()
            box=page.locator('[data-polish="point-confirm"]').bounding_box()
            page.touchscreen.tap(box['x']+box['width']/2, box['y']+box['height']/2); page.touchscreen.tap(box['x']+box['width']/2, box['y']+box['height']/2); page.wait_for_timeout(300)
            assert page.evaluate("async () => (await import('/src/ui/router.js')).currentScreen().name")=='monster', 'the second tap of a double tap navigated away'
            # Closing a sheet with ✕ never blocks a quick tap on what lay beneath it (the guard is only for action buttons).
            page.locator('[data-polish="points"]').click(); xb=page.locator('.sheet [data-action="sheet-close"]').bounding_box()
            page.touchscreen.tap(xb['x']+xb['width']/2, xb['y']+xb['height']/2); armed=page.evaluate("async () => { const d = await import('/src/ui/dom.js'); return d.swallowsRepeatTap({ clientX: 1, clientY: 1, target: document.body }) }")
            assert sheets()==0 and armed is False
            # Every attribute + on the beast page is tappable at its centre (two columns used to overlap at 320 px).
            covered=page.evaluate("""() => [...document.querySelectorAll('main.screen [data-attr-row] .plus')].filter(b => { b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return !b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }).map(b => b.dataset.attr)""")
            assert not covered, f'attribute + buttons covered at {width}: {covered}'
            # Typing an amount and tapping the offer button at once: the tap is not lost, and a mistyped amount never sends old terms.
            go('famarket'); row=page.locator('main.screen .item[data-action="faopen"]').first
            if row.count():
                row.locator('.name').click(); page.wait_for_timeout(200)
                act=page.locator('.sheet [data-act]').first; field=page.locator('.sheet [data-terms="salary"]')
                ask=int(field.input_value()); before_terms=page.evaluate("() => JSON.stringify(__gb.f.freeAgency || null) + __gb.f.roster.length")
                field.fill('12345'); act.tap(); page.wait_for_timeout(250)
                assert 'steps of' in toast_text() and page.evaluate("() => JSON.stringify(__gb.f.freeAgency || null) + __gb.f.roster.length")==before_terms, 'a mistyped amount must not send the previous terms'
                page.locator('.sheet [data-terms="salary"]').fill(str(ask+1000)); page.locator('.sheet [data-act]').first.tap(); page.wait_for_timeout(350)
                assert toast_text() or sheets()==0, 'the offer tap after typing was lost'
                if sheets(): assert page.locator('.sheet [data-terms="salary"]').input_value()==str(ask+1000)
                while sheets(): close_sheet(); page.wait_for_timeout(80)
            # Trade desk: Send (pinned in the footer) asks for confirmation; Cancel returns to the intact desk; the choice survives closing.
            page.evaluate("async () => (await import('/src/ui/trade-desk-ui.js')).openTradeDesk(window.__gb, { onDone: () => {} })"); page.wait_for_timeout(250)
            mine=page.locator('.sheet [data-m^="mine:"]').first; theirs=page.locator('.sheet [data-m^="theirs:"]').first
            if mine.count() and theirs.count():
                chosen=[mine.get_attribute('data-m'), theirs.get_attribute('data-m')]; mine.click(); page.locator('.sheet [data-m^="theirs:"]').first.click(); page.wait_for_timeout(150)
                send=page.locator('.sheet [data-send]')
                if send.is_enabled():
                    send.click(); page.wait_for_timeout(200); assert page.locator('.sheet-backdrop [data-action="no"]').count()==1, 'Send the Proposal asked for no confirmation'
                    page.locator('.sheet-backdrop [data-action="no"]').click(); page.wait_for_timeout(150); assert sheets()==1 and page.locator('.sheet [data-send]').count()==1
                close_sheet(); page.evaluate("async () => (await import('/src/ui/trade-desk-ui.js')).openTradeDesk(window.__gb, { onDone: () => {} })"); page.wait_for_timeout(250)
                assert page.evaluate("() => JSON.stringify([__gb.f.polish.tradeDraft.state.giveM.length, __gb.f.polish.tradeDraft.state.getM.length])")=='[1,1]', 'trade draft kept'
                close_sheet()
            # Larger Text applies as soon as it is ticked in Settings, and unticking restores the normal size.
            go('settings'); box=page.locator('main.screen [data-change="comfortable"]'); box.scroll_into_view_if_needed(); box.tap(); page.wait_for_timeout(150)
            assert page.evaluate("() => document.documentElement.dataset.comfortableText + getComputedStyle(document.documentElement).fontSize")=='118px', 'Larger Text did not apply at once'
            no_overflow(); box.tap(); page.wait_for_timeout(150)
            assert page.evaluate("() => document.documentElement.dataset.comfortableText")=='0'
            # Export through a phone share sheet: a cancelled share says so and never claims a saved file; a completed share is not called a save.
            page.evaluate("() => { window.Capacitor = { isNativePlatform: () => true }; navigator.canShare = () => true; navigator.share = async () => { throw new DOMException('cancelled', 'AbortError'); }; }")
            go('settings'); page.locator('main.screen [data-action="export"]').click(); page.wait_for_timeout(600)
            assert 'canceled' in toast_text().lower() and 'saved as' not in toast_text().lower(), f'cancelled share message: {toast_text()}'
            page.evaluate("() => { navigator.share = async () => {}; }"); page.wait_for_timeout(5200); page.locator('main.screen [data-action="export"]').click(); page.wait_for_timeout(600)
            assert 'saved as' not in toast_text().lower() and 'share' in toast_text().lower(), f'completed share message: {toast_text()}'
            page.evaluate("() => { delete window.Capacitor; }")
            no_overflow()
            assert not errors, errors
            print(json.dumps({'width':width,'result':'pass','checks':['shortlist','hidden-knowledge','all-prospects','presets','point-preview','plan-draft','overflow','shortlist-page','stale-points','escape','double-tap','typed-offer','trade-desk-send','share-export']}))
            page.close()
        # A short landscape phone: the Apex discovery summary scrolls, so its Continue button can be reached (it sat below the screen).
        page = browser.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
        page.goto(f'http://127.0.0.1:{server.server_address[1]}/'); page.wait_for_function('globalThis.__gb && document.querySelector("main.screen")')
        page.evaluate("""async () => { const F=await import('/src/franchise/franchise.js'); const A=await import('/src/ui/apex-ui.js');
          const f=F.createFranchise({owner:{first:'Phone',last:'Polish'},club:'Ember City Beasts',seed:312}); A.openApexDiscovery({ monster: f.roster[0], settings: {} }); }""")
        for _ in range(12):
            if page.evaluate("() => document.querySelector('.apex-scene')?.dataset.stage") == 'summary': break
            skip = page.locator('.apex-scene [data-apex="skip"]')
            if skip.count() and skip.first.is_visible(): skip.first.click()
            page.wait_for_timeout(400)
        page.locator('.apex-scene [data-apex="continue"]').click(timeout=5000); page.wait_for_timeout(300)
        assert page.locator('.apex-scene').count()==0, 'Apex summary Continue unreachable in landscape'
        print(json.dumps({'width':844,'height':390,'result':'pass','checks':['apex-landscape-continue']})); page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
