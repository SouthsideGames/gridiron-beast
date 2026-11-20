#!/usr/bin/env python3
"""Auto camera and UI cue integration; emulated phones, not a real device.
Run CHROMIUM_PATH=/usr/bin/chromium python3 tools/auto-camera-audio-check.py.
The audio spy observes actual BufferSource starts; it does not prove audibility
through an iPhone speaker or native audio-session behavior.
"""
import http.server, socketserver, threading, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_address[1]}'
START = """async () => {
 const F=await import('/src/franchise/franchise.js');
 const f=F.createFranchise({owner:{first:'Camera',last:'Test'},club:'Ember City Beasts',seed:77});F.hireDefaultStaff(f);
 while(!f.draft.done){if(F.onTheClock(f)===f.club)F.myDraftPick(f,f.draft.available[0]);}
 if(F.needsGoal(f))F.chooseGoal(f,F.commissionerGoals(f)[0]?.id);
 f.settings.tutorial=false;f.settings.hints=false;f.scenes=[];f.guide={enabled:false};f.welcomed=true;f.achievementsBackfilled=true;
 F.autoRunToSunday(f);const m=F.sundayMatchup(f);f.week.pregame={status:'done',side:m.playerSide,result:{winner:'a'},choice:'receive'};
 await __gb.setFranchise(f);(await import('/src/ui/screens/match.js')).startSundayGame(f);
}"""
def size(page): return page.locator('#field').evaluate('(s)=>s.viewBox.baseVal.height')
def tap(page, selector): page.locator(selector).filter(visible=True).first.tap()
def close_scenes(page):
    for _ in range(30):
        skip=page.locator('.apex-scene [data-apex="skip"]')
        if not skip.count(): return
        skip.first.click();page.wait_for_timeout(50)
        cont=page.locator('.apex-scene [data-apex="continue"]')
        if cont.count(): cont.first.click()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.getenv('CHROMIUM_PATH') else {}))
        for w,h in [(320,568),(390,844),(440,956),(568,320)]:
            page=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True).new_page()
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(URL);page.wait_for_function("()=>window.__gb&&__gb.storage.mode!=='starting'")
            page.evaluate(START);page.wait_for_selector('#field');close_scenes(page)
            assert abs(size(page)-46)<.01
            # Force Auto initially so the same check covers kickoff and ordinary plays.
            page.evaluate("async()=>{__gb.f.game.auto=true;__gb.f.game.autoCloseView=false;(await import('/src/ui/router.js')).render()}")
            page.wait_for_timeout(2200)
            assert abs(size(page)-120)<.01,(w,h,size(page))
            assert page.locator('#field .fv-static').text_content().count('50')==2
            tap(page,'button[data-action="autocamera"]');page.wait_for_timeout(2100)
            assert abs(size(page)-46)<.01
            tap(page,'button[data-action="autocamera"]');page.wait_for_timeout(2100)
            assert abs(size(page)-120)<.01
            tap(page,'button[data-action="auto"]');page.wait_for_timeout(2100)
            assert abs(size(page)-46)<.01
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            # Record starts on the real SFX bus, with the approved assets decoded.
            page.evaluate("""async()=>{
             const {uiSounds}=await import('/src/audio/ui-sounds.js');const A=await import('/src/audio/context.js');
             A.setAudioPreferences({muted:false,sfx:.7});const ac=A.audioContext();await ac.resume();await uiSounds.preload();
             window.heard=[];const old=ac.createBufferSource.bind(ac);ac.createBufferSource=()=>{const s=old(),start=s.start.bind(s);s.start=(...a)=>{heard.push([...uiSounds.buffers].find(([,b])=>b===s.buffer)?.[0]);return start(...a)};return s};
            }""")
            for sound in ['tap','back','confirm','unavailable','notification','reward','achievement']:
                page.wait_for_timeout(100)
                page.evaluate("async id=>(await import('/src/audio/ui-sounds.js')).uiSound(id)",sound)
                page.wait_for_timeout(50)
            assert page.evaluate('heard').__eq__(['tap','back','confirm','unavailable','notification','reward','achievement'])
            page.evaluate("async()=>{(await import('/src/audio/context.js')).setAudioPreferences({sfx:0});(await import('/src/audio/ui-sounds.js')).uiSound('reward')}")
            page.wait_for_timeout(100);assert page.evaluate('heard.length')==7
            assert not errors,errors
            print(f'PASS {w}x{h}: Auto cameras, controls, real UI sound starts and mute',flush=True)
            page.context.close()
        browser.close()
finally:
    server.shutdown()
