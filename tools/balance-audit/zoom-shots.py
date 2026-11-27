"""Owner play test 2026-11-26: Match Day tag, plain home field (no sideline markers), zoom out / zoom in. Emulated phone 390x844."""
import http.server, socketserver, threading, os, sys, json
from playwright.sync_api import sync_playwright
ROOT='/home/claude/gb-impl'; OUT=sys.argv[1]; os.makedirs(OUT, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),Q); threading.Thread(target=srv.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{srv.server_address[1]}'
SETUP="""async () => {
 const F=await import('/src/franchise/franchise.js');
 const f=F.createFranchise({owner:{first:'Zoom',last:'Test'},club:'Ember City Beasts',seed:77});F.hireDefaultStaff(f);
 while(!f.draft.done){if(F.onTheClock(f)===f.club)F.myDraftPick(f,f.draft.available[0]);}
 if(F.needsGoal(f))F.chooseGoal(f,F.commissionerGoals(f)[0]?.id);
 f.settings.tutorial=false;f.settings.hints=false;f.scenes=[];f.guide={enabled:false};f.welcomed=true;f.achievementsBackfilled=true;
 F.autoRunToSunday(f);
 const m=F.sundayMatchup(f); window.__m={home:m.home,away:m.away,tag:m.tag,venue:m.venue?.env};
 await __gb.setFranchise(f); return window.__m;
}"""
def close_scenes(p):
    for _ in range(30):
        s=p.locator('.apex-scene [data-apex="skip"]')
        if not s.count(): return
        s.first.click(); p.wait_for_timeout(50)
        c=p.locator('.apex-scene [data-apex="continue"]')
        if c.count(): c.first.click()
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True); p=ctx.new_page()
    errors=[]; p.on('pageerror',lambda e: errors.append(str(e)))
    p.goto(URL); p.wait_for_function("()=>window.__gb&&__gb.storage.mode!=='starting'")
    info=p.evaluate(SETUP); print('matchup', info['tag'])
    # Match Day with the interconference tag (disposable state: this week's fixture marked Interconference if it is not already)
    p.evaluate("""async()=>{const f=__gb.f; const fx=(f.season.schedule||[]).find(g=>g.week===f.season.week&&!g.bye)||null; if(fx) fx.category='Interconference'; const R=await import('/src/ui/router.js'); R.go('pregame',{},{});}""")
    p.wait_for_timeout(900); close_scenes(p); p.screenshot(path=f'{OUT}/1-match-day.png')
    print('tag', p.locator('.mu-tag').first.inner_text() if p.locator('.mu-tag').count() else None)
    # Start the game from a settled pregame Clash; we receive
    p.evaluate("""async()=>{const F=await import('/src/franchise/franchise.js'); const f=__gb.f; const m=F.sundayMatchup(f); f.week.pregame={status:'done',side:m.playerSide,result:{winner:'a'},choice:'receive'}; (await import('/src/ui/screens/match.js')).startSundayGame(f);}""")
    p.wait_for_selector('#field'); close_scenes(p); p.wait_for_timeout(1500)
    print('venue', p.evaluate("__gb.f.game.state.venue"))
    # Kick off (the opponent kicks): press the primary action until a scrimmage play is being called
    for i in range(12):
        ph=p.evaluate("(()=>{const s=__gb.f.game.state;return s.phase})()")
        if ph=='scrimmage' and p.locator('.match-actions button').count(): break
        btn=p.locator('.match-actions button.primary, .match-actions button').filter(visible=True)
        if btn.count(): btn.first.click()
        p.wait_for_timeout(2500); close_scenes(p)
    p.get_by_text('Choose Play').first.wait_for(state='visible', timeout=60000); p.wait_for_timeout(1500)
    print('phase', p.evaluate("__gb.f.game.state.phase"), 'zoom button', p.locator('[data-action="fieldzoom"]').count())
    vb=lambda: p.locator('#field').evaluate('(s)=>s.getAttribute("viewBox")')
    p.evaluate("window.scrollTo(0,0)"); p.screenshot(path=f'{OUT}/2-zoomed-out.png'); print('out', vb())
    p.locator('[data-action="fieldzoom"]').click(); p.wait_for_timeout(900); print('mid', vb()); p.screenshot(path=f'{OUT}/3-zooming.png')
    p.wait_for_timeout(1400); p.screenshot(path=f'{OUT}/4-zoomed-in.png'); print('in', vb())
    p.locator('[data-action="fieldzoom"]').click(); p.wait_for_timeout(2300); print('back', vb())
    print('errors', errors[:5])
