#!/usr/bin/env python3
"""Actual browser taps for phone navigation. Does not verify native Android hardware."""
import http.server,json,os,socketserver,threading
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
   errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   page.goto(f'http://127.0.0.1:{server.server_address[1]}/')
   page.wait_for_function('globalThis.__gb && document.querySelector("main.screen")')
   page.evaluate("""async()=>{const F=await import('/src/franchise/franchise.js');const f=F.createFranchise({owner:{first:'Phone',last:'Navigation'},club:'Ember City Beasts',seed:612});F.hireDefaultStaff(f);f.settings.tutorial=false;f.settings.devNotices=false;f.guide={enabled:false};f.scenes=[];f.achievementsBackfilled=true;await __gb.setFranchise(f);}""")
   def scenes():
    for _ in range(5):
     scene=page.locator('.apex-scene')
     if not scene.count():return
     for selector in ['[data-apex="skip"]','[data-apex="continue"]']:
      b=scene.locator(selector)
      if b.count() and b.first.is_visible():b.first.click();break
     page.wait_for_timeout(200)
   def go(name):
    page.evaluate("async name=>(await import('/src/ui/router.js')).go(name,{}, {reset:true})",name);page.wait_for_timeout(200);scenes()
   go('hq')
   assert page.locator('.tabbar [data-screen="map"]').count()==1 and page.locator('.tabbar [data-screen="office"]').count()==0
   assert page.locator('.tabbar [data-screen="playbook"]').count()==0
   assert page.locator('.polish-deals').count()==0, 'empty trades section'
   assert not page.locator('main.screen summary',has_text='GM Career').count()
   page.locator('main.screen [data-screen="office"]').click();page.wait_for_timeout(200);scenes()
   assert page.locator('.screen-office').count()==1
   page.locator('[data-action="gmcareer"]').click();page.wait_for_timeout(200)
   assert page.locator('.screen-gm-jobs').count()==1
   assert page.locator('.tabbar [data-screen="hq"]').get_attribute('aria-current')=='page'
   page.locator('.tabbar [data-screen="more"]').click();page.wait_for_timeout(200)
   assert page.locator('.screen-more [data-screen="office"]').count()==0
   assert page.locator('.screen-more [data-screen="playbook"]').count()==0
   assert page.locator('.screen-more [data-screen="developer"]').count()==0
   page.locator('.tabbar [data-screen="map"]').click();page.wait_for_timeout(200);scenes()
   assert page.locator('.screen-map .region-map .map-pin').count()==32
   page.locator('.screen-map .map-pin[data-club="Harbor Anchors"]').dispatch_event('click');page.wait_for_timeout(200)
   assert 'Harbor Anchors' in page.locator('.screen-map .map-card').inner_text()
   page.locator('.tabbar [data-screen="hq"]').click();page.wait_for_timeout(200)
   assert page.locator('.screen-gm-jobs').count()==1, 'HQ tab history was not retained'
   page.locator('.tabbar [data-screen="hq"]').click();page.wait_for_timeout(200)
   assert page.locator('.screen-hq').count()==1, 'second HQ tap should return to its root'
   go('hq')
   next_button=page.locator('.phone-hq-next [data-phone-next]');assert next_button.count()==1
   page.wait_for_timeout(300);top_box=next_button.bounding_box();assert top_box and top_box['y']+top_box['height']<=page.viewport_size['height'],'HQ action is not on screen before scrolling (the slide-in transform must not hold the fixed bar)'
   page.evaluate('window.scrollTo(0,document.body.scrollHeight)')
   bounds=next_button.bounding_box();tab=page.locator('.tabbar').bounding_box()
   assert bounds and bounds['y']>=0 and bounds['y']+bounds['height']<=tab['y']+1,'HQ button covers tabs'
   go('roster');page.locator('[data-action="view"][data-v="depth"]').click();page.wait_for_timeout(250)
   before_lineup=page.evaluate('JSON.stringify([__gb.f.depth,__gb.f.lineupManual])')
   page.locator('.dc-move [data-action="down"]:not([disabled])').first.click()
   page.locator('#toast button',has_text='Undo').click()
   assert page.evaluate('JSON.stringify([__gb.f.depth,__gb.f.lineupManual])')==before_lineup,'lineup Undo'
   page.locator('.dc-name').first.click();page.wait_for_timeout(250);scenes()
   detail=page.evaluate("async()=>(await import('/src/ui/router.js')).currentScreen().params.id")
   page.evaluate('window.scrollTo(0,300)');saved_scroll=page.evaluate('scrollY')
   page.locator('.tabbar [data-screen="league"]').click();page.wait_for_timeout(200)
   page.locator('.tabbar [data-screen="roster"]').click();page.wait_for_timeout(200)
   assert page.evaluate("async()=>(await import('/src/ui/router.js')).currentScreen().params.id")==detail
   assert abs(page.evaluate('scrollY')-saved_scroll)<3
   assert not page.locator('main.screen [data-action="release"]').is_visible(),'Release exposed outside Manage'
   page.locator('.phone-manage summary').click();assert page.locator('main.screen [data-action="release"]').is_visible()
   page.evaluate("async()=>{(await import('/src/ui/dom.js')).sheet('<p>Back test</p>',{title:'Back Test'});}")
   page.evaluate("dispatchEvent(new Event('gb-native-back'))");assert page.locator('.sheet-backdrop').count()==0
   assert page.evaluate("async()=>(await import('/src/ui/router.js')).currentScreen().name")=='monster'
   page.evaluate("dispatchEvent(new Event('gb-native-back'))");page.wait_for_timeout(200)
   assert page.evaluate("async()=>(await import('/src/ui/router.js')).currentScreen().name")=='roster'
   go('settings');page.locator('[data-change="autospeed"]').select_option('4')
   assert page.evaluate('__gb.f.settings.autoSpeed')==4
   go('hq');go('settings');assert page.locator('[data-change="autospeed"]').input_value()=='4'
   # New messages must wait their turn rather than replace one another.
   page.evaluate("async()=>{const D=await import('/src/ui/dom.js');D.toast('Queue First','info',1000);D.toast('Queue Second','info',1000);}")
   page.wait_for_function("document.querySelector('#toast.show')?.textContent.includes('Queue First')")
   page.wait_for_function("document.querySelector('#toast.show')?.textContent.includes('Queue Second')")
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   assert not errors,errors
   print(json.dumps({'width':width,'height':height,'result':'pass'}));page.close()
  browser.close()
finally:server.shutdown();server.server_close()
