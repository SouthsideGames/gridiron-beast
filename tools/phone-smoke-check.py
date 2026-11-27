#!/usr/bin/env python3
# Short emulated phone smoke test (owner brief 2026-11-26 §9): iPhone 14 profile (Playwright Chromium, touch). Not a physical device.
# Launch and Main Menu, the build label, the achievement catalogue, loading an existing franchise (import + reload), HQ (story scenes
# and the Apex reveal dismissed by taps), Roster, a beast page, save and reopen, and a new franchise through the onboarding by taps.
#   python3 tools/phone-smoke-check.py <repo root> <franchise export .json> <screenshot dir>
# The expected build label is read from src/version.js.
import http.server, socketserver, threading, sys, os, json, time
from playwright.sync_api import sync_playwright
ROOT=sys.argv[1]; SAVE=sys.argv[2]; OUT=sys.argv[3]; os.makedirs(OUT, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',0),lambda *a,**k:Q(*a,directory=ROOT,**k)); threading.Thread(target=srv.serve_forever,daemon=True).start(); port=srv.server_address[1]
URL=f'http://127.0.0.1:{port}/index.html'; res=[]; errs=[]
def ok(name, cond, info=''): res.append(('ok' if cond else 'FAIL', name, str(info)[:160])); print(('ok  ' if cond else 'FAIL'), name, str(info)[:160], flush=True)
def overflow(page): return page.evaluate('() => document.documentElement.scrollWidth > window.innerWidth + 1')
def dismiss(page, rounds=15):
    for _ in range(rounds):
        hit=False
        for sel in ['[data-apex="skip"]','[data-apex="continue"]','[data-action="cer-skip"]','[data-action="draft-skip"]','[data-action="scene-skip"]','[data-action="sheet-close"]','.apex-scene [data-action]','[data-action="guide-skip"]','[data-action="ach-close"]','[data-action="dismiss"]','[data-action="close"]']:
            el=page.query_selector(sel)
            if el and el.is_visible():
                try: el.click(timeout=1500); page.wait_for_timeout(250); hit=True; break
                except Exception: pass
        if not hit:
            # story scenes (achievement cutscenes, letters) end with a primary Continue
            c=page.query_selector('main button.primary:has-text("Continue")') or page.query_selector('main button.primary:has-text("Back to Headquarters")')
            if c and c.is_visible() and not page.query_selector('nav [data-screen="roster"]'):
                try: c.click(timeout=1500); page.wait_for_timeout(300); continue
                except Exception: return
            return
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(**p.devices['iPhone 14']); page=ctx.new_page()
    page.on('pageerror',lambda e: errs.append('pageerror: '+str(e))); page.on('console',lambda m: errs.append('console: '+m.text) if m.type=='error' else None)
    t0=time.time(); page.goto(URL); page.wait_for_selector('[data-action="new"]'); ok('app launch and main menu', True, f'{time.time()-t0:.1f}s')
    label=page.evaluate("() => document.body.innerText.match(/v\\d+\\.\\d+\\.\\d+-[\\w-]+/)?.[0]"); exp=open(os.path.join(ROOT,'src/version.js')).read().split("version: '")[1].split("'")[0]; ok('build label', label==exp, label)
    page.screenshot(path=f'{OUT}/01-menu.png')
    # achievement catalogue
    page.click('[data-action="go"][data-screen="achievements"]'); page.wait_for_selector('.ach-card'); n=page.evaluate("() => document.querySelectorAll('.ach-card').length")
    ok('achievement catalogue (200)', n==200 and not overflow(page), n); page.screenshot(path=f'{OUT}/02-achievements.png'); page.click('[data-action="router-back"]'); page.wait_for_selector('[data-action="new"]')
    READY="() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'"
    # load an existing franchise through the game's own import, then reopen
    txt=open(SAVE).read()
    good=page.evaluate("async (t) => { const Save = await import('./src/franchise/save.js'); const r = await window.__gb.importInto(1, Save.importJson(t)); await window.__gb.save({ immediate: true }); return r.ok; }", txt)
    page.reload(); page.wait_for_function(READY, timeout=60000)
    info=page.evaluate("() => window.__gb.f ? { club: window.__gb.f.club, year: window.__gb.f.season.year, week: window.__gb.f.season.week, n: window.__gb.f.roster.length } : null")
    ok('load an existing franchise (after reload)', bool(good and info), info)
    # open it from the menu
    cont=page.query_selector('[data-action="continue"]') or page.query_selector('[data-action="resume"]')
    if cont: cont.click()
    else: page.evaluate("async () => (await import('./src/ui/router.js')).go('hq', {}, { reset: true })")
    page.wait_for_timeout(1500); dismiss(page); page.wait_for_timeout(800); dismiss(page)
    hq=page.evaluate("() => !!document.querySelector('nav, .tabbar') && /Week|Record|Cap room/.test(document.body.innerText)"); ok('HQ', hq and not overflow(page)); page.screenshot(path=f'{OUT}/03-hq.png')
    # roster tab and a beast page
    dismiss(page); tab=page.query_selector('nav [data-screen="roster"]') or page.query_selector('[data-screen="roster"]') or page.query_selector('text=Roster')
    tab.click(); page.wait_for_timeout(800); dismiss(page)
    items=page.query_selector_all('[data-action="monster"]'); ok('roster navigation', len(items)>=26 and not overflow(page), len(items)); page.screenshot(path=f'{OUT}/04-roster.png')
    [x for x in items if x.is_visible()][0].click(); page.wait_for_timeout(800); dismiss(page); ok('beast page opens', not overflow(page)); page.screenshot(path=f'{OUT}/05-beast.png')
    back=page.query_selector('[data-action="router-back"]'); back.click() if back else page.go_back(); page.wait_for_timeout(500)
    # save and reopen: change a setting-free state (week marker) and reload
    before=page.evaluate("() => JSON.stringify({w: window.__gb.f.season.week, d: window.__gb.f.season.day, ach: Object.keys(window.__gb.f.achievements||{}).length, news: (window.__gb.f.news||[]).length})")
    page.evaluate("async () => { await window.__gb.save({ immediate: true }); }"); page.reload(); page.wait_for_function(READY, timeout=60000)
    after=page.evaluate("() => window.__gb.f ? JSON.stringify({w: window.__gb.f.season.week, d: window.__gb.f.season.day, ach: Object.keys(window.__gb.f.achievements||{}).length, news: (window.__gb.f.news||[]).length}) : null")
    ok('save and reopen keeps the franchise', before==after, after)
    # new franchise through the onboarding UI (pick the first option on each step)
    ctx2=b.new_context(**p.devices['iPhone 14']); page=ctx2.new_page(); page.on('pageerror',lambda e: errs.append('pageerror: '+str(e)))
    page.goto(URL); page.wait_for_selector('[data-action="new"]'); page.click('[data-action="new"]')
    page.wait_for_selector('#first'); page.fill('#first','Sam'); page.fill('#last','Rivera')
    steps=0
    for steps in range(40):
        page.wait_for_timeout(350)
        if page.evaluate("() => !!document.querySelector('#next')"):
            txt=page.evaluate("() => document.body.innerText")
            for sel in ['[data-action="club"]:not(.selected)','[data-action="pick"]']:
                c=page.query_selector(sel)
                if c and c.is_visible() and ('club' in sel and 'Choose' in txt or 'pick' in sel):
                    try: c.click(timeout=1500); page.wait_for_timeout(250)
                    except Exception: pass
                    break
            try: page.click('#next', timeout=3000)
            except Exception: pass
            continue
        dismiss(page)
        if page.evaluate("() => !!document.querySelector('nav [data-screen=\"roster\"]')"): break
        btn=page.query_selector('main button.primary')
        if btn and btn.is_visible():
            try: btn.click(timeout=2000)
            except Exception: pass
    created=page.evaluate("() => !!(window.__gb && window.__gb.f && window.__gb.f.season)")
    ok('create a new franchise (onboarding by taps)', created, f'steps {steps}'); club=page.evaluate("() => window.__gb && window.__gb.f ? window.__gb.f.club + ' capEra ' + window.__gb.f.capEra + ' ' + window.__gb.f.difficulty : null"); ok('new franchise on the new cap', bool(club) and 'capEra 2' in club, club); page.screenshot(path=f'{OUT}/06-new-franchise.png')
    ok('no page errors', not errs, errs[:3])
    b.close()
json.dump(res, open(f'{OUT}/results.json','w'), indent=1)
