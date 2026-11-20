#!/usr/bin/env python3
"""Focused identity UI check; emulated phones, not a native build."""
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
            page.evaluate('''async()=>{const F=await import('/src/franchise/franchise.js');const f=F.createFranchise({owner:{first:'Names',last:'Review'},club:'Ember City Beasts',seed:82});F.hireDefaultStaff(f);f.guide={enabled:false};f.settings.tutorial=false;f.scenes=[];f.achievementsBackfilled=true;await __gb.setFranchise(f);}''')
            def scenes():
                for _ in range(20):
                    scene=page.locator('.apex-scene')
                    if not scene.count():return
                    for sel in ['[data-apex="skip"]','[data-apex="continue"]']:
                        b=scene.locator(sel)
                        if b.count() and b.first.is_visible():b.first.click();break
                    page.wait_for_timeout(100)
                raise AssertionError('Discovery scenes did not close')
            def go(name,params=None):
                page.evaluate("async ([name,params])=>(await import('/src/ui/router.js')).go(name,params||{}, {reset:true})",[name,params])
                page.wait_for_timeout(200);scenes()
            def fits():
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'overflow at {width}'
            go('roster');fits()
            beast=page.evaluate('''async()=>{const M=await import('/src/data/monsters.js');const m=__gb.f.roster.find(x=>x.position==='WR');return {id:m.id,name:m.name,species:m.species,form:M.formOf(m).name};}''')
            page.locator('[data-action="view"][data-v="depth"]').click();scenes()
            for query in [beast['name'],beast['form']]:
                page.locator('[data-polish-search]').fill(query);page.wait_for_timeout(200)
                assert page.locator(f'.dc-row:not([hidden]) [data-action="monster"][data-id="{beast["id"]}"]').count()==1
            page.locator('[data-polish-search]').fill('')
            page.locator(f'.dc-row [data-action="monster"][data-id="{beast["id"]}"]').click();scenes()
            assert beast['name'] in page.locator('.topbar').inner_text()
            assert beast['form'] in page.locator('.screen-monster .beast-species').first.inner_text();fits()
            go('dex');assert page.locator(f'[data-action="open"][data-id="{beast["species"]}"]').count()==1
            go('draft');fits()
            card=page.locator('[data-prospect-id]').first
            assert card.locator('.beast-species').count()==1
            candidate=card.get_attribute('data-prospect-id')
            expected=page.evaluate('(id)=>__gb.f.draft.class.find(m=>m.id===id).name',candidate)
            card.locator('[data-action="pick"]').click()
            page.locator('.sheet [data-action="yes"]').click();page.wait_for_timeout(500);scenes()
            assert expected in page.locator('.draft-announcement').inner_text()
            assert page.evaluate('(id)=>__gb.f.roster.some(m=>m.id===id)',candidate)
            before=page.evaluate('JSON.stringify(__gb.f.individualNames.byId)')
            page.evaluate('()=>__gb.save({immediate:true})');page.wait_for_timeout(1500);page.reload()
            page.wait_for_function('globalThis.__gb?.f && __gb.storage.mode!=="starting"')
            assert page.evaluate('JSON.stringify(__gb.f.individualNames.byId)')==before
            assert not errors,errors
            print(f'{width}x{height}: identity UI passed');page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
