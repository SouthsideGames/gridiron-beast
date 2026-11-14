"""Phone-layout and real Web Audio smoke check for the developer cry reviewer."""
import shutil,os,threading,socketserver,http.server,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=ROOT,**kw)
 def log_message(self,*args):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),Handler);threading.Thread(target=srv.serve_forever,daemon=True).start()
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=shutil.which("chromium"))
 for width in [320,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{srv.server_address[1]}/')
  page.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'",timeout=60000)
  page.evaluate("() => import('./src/ui/router.js').then(R=>R.go('developer'))")
  page.locator('[data-screen="monster-cry-reviewer"]').click()
  assert page.locator('[data-cry-form]').count()==3
  assert 'baby dragon' in page.locator('main').inner_text()
  before=page.evaluate("JSON.stringify(window.__gb.f)")
  page.locator('[data-action="play"]').first.click();page.wait_for_timeout(150)
  assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
  page.locator('[data-cry-note="drakeling:0"]').fill('Keep the proud squeak; stronger ending')
  page.locator('[data-id="drakeling:0"][data-status="revision"]').click()
  assert page.locator('[data-cry-form="drakeling:0"] [data-cry-status]').inner_text()=='revision'
  page.reload();page.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'",timeout=60000)
  page.evaluate("() => import('./src/ui/router.js').then(R=>R.go('monster-cry-reviewer'))")
  assert page.locator('[data-cry-note="drakeling:0"]').input_value()=='Keep the proud squeak; stronger ending'
  page.locator('[data-action="family-play"]').click();page.wait_for_timeout(180);page.locator('[data-action="stop"]').click()
  page.locator('[data-change="family"]').select_option('sunwhistle');assert 'Sings before every kick' in page.locator('main').inner_text()
  page.locator('[data-change="element"]').select_option('Metal');assert page.locator('[data-change="family"] option').count()>0
  assert page.evaluate("JSON.stringify(window.__gb.f)")==before
  # Real Web Audio buffer path, plus cancellation when leaving the reviewer.
  result=page.evaluate("""async()=>{const m=await import('./src/audio/monster-cries.js');const playing=m.playCry('drakeling:0');setTimeout(()=>m.stopCry(),40);return await playing;}""")
  assert result is False
  if width==390:page.screenshot(path='/tmp/monster-cry-reviewer.png',full_page=True)
  print(json.dumps({'width':width,'layout':'pass','play_stop':'pass','persistence':'pass','franchise':'unchanged'}))
  ctx.close()
 browser.close()
srv.shutdown()
assert not errors,errors
print('PASS: no page errors')
