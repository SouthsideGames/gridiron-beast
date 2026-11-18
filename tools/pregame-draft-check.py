#!/usr/bin/env python3
"""Focused phone UI checks for pre-game/Clash presentation and saved draft announcements.
Run CHROMIUM_EXECUTABLE=/usr/bin/chromium python3 tools/pregame-draft-check.py.
Screenshots are optional: set PRESENTATION_SHOTS to a local output directory.
"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k):super().__init__(*a,directory=ROOT,**k)
    def log_message(self,*a):pass
server=socketserver.ThreadingTCPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as pw:
        args={'executable_path':os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}
        browser=pw.chromium.launch(**args)
        for width,height in [(320,568),(390,844),(440,900),(844,390)]:
            page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(f'http://127.0.0.1:{server.server_address[1]}/')
            page.wait_for_function('globalThis.__gb && document.querySelector("main.screen")')
            page.evaluate('''async()=>{const F=await import('/src/franchise/franchise.js'); const f=F.createFranchise({owner:{first:'Panel',last:'Review'},club:'Ember City Beasts',seed:82});F.hireDefaultStaff(f);f.settings.tutorial=false;f.settings.devNotices=false;f.guide={enabled:false};f.scenes=[];f.achievementsBackfilled=true;await __gb.setFranchise(f);}''')
            def go(name):
                page.evaluate("async name=>(await import('/src/ui/router.js')).go(name,{}, {reset:true})",name)
                for _ in range(6):
                    scene=page.locator('.apex-scene')
                    if not scene.count():break
                    for sel in ['[data-apex="skip"]','[data-apex="continue"]']:
                        if scene.locator(sel).count() and scene.locator(sel).first.is_visible():scene.locator(sel).first.click();break
                    page.wait_for_timeout(200)
            def fits():
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'overflow {width}'
            def shot(name):
                folder=os.environ.get('PRESENTATION_SHOTS')
                if folder:
                    os.makedirs(folder,exist_ok=True);page.screenshot(path=os.path.join(folder,f'{name}-{width}.png'),full_page=True)
            go('draft');before=page.evaluate('JSON.stringify([__gb.f.draft.picks,__gb.f.rngState,__gb.f.roster])')
            page.locator('[data-action="draft-watch"]').click()
            page.locator('[data-action="draft-next"]').click()
            fits();shot('draft')
            if page.locator('[data-action="draft-skip"]').count():page.locator('[data-action="draft-skip"]').click()
            assert page.evaluate('JSON.stringify([__gb.f.draft.picks,__gb.f.rngState,__gb.f.roster])')==before
            page.evaluate('''async()=>{const F=await import('/src/franchise/franchise.js');while(!__gb.f.draft.done)F.passDraftPick(__gb.f);__gb.f.season.day=6;}''')
            go('pregame');fits();shot('pregame')
            page.locator('[data-action="pregame-detail"]').first.click()
            assert page.locator('.sheet').count()==1
            page.locator('[data-action="sheet-close"]').last.click()
            page.locator('[data-action="pregame-team"][data-team="theirs"]').click();fits()
            page.locator('[data-action="toss"]').click()
            page.wait_for_selector('.clash-faceoff');fits();shot('clash')
            assert page.locator('[data-action="enter"]:not([disabled])').count()>0
            page.locator('[data-action="edit"]').click();fits()
            page.evaluate('''async()=>{__gb.f.season.day=4;(await import('/src/ui/router.js')).go('gameplan',{}, {reset:true});}''')
            page.evaluate('scrollTo(0,document.body.scrollHeight)');fits()
            assert page.evaluate('''()=>{const a=document.querySelector('.polish-actions').getBoundingClientRect(),b=document.querySelector('.tabbar').getBoundingClientRect();return Math.abs(a.bottom-b.top)<2;}'''),'footer gap'
            assert not errors,errors
            print(f'PASS presentation {width}x{height}')
            page.close()
        browser.close()
finally:server.shutdown();server.server_close()
