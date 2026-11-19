#!/usr/bin/env python3
"""Phone regression for the live play console (PR #136). Headless Chromium with touch, emulated phones only.
Checks, at 320x568, 390x844, 568x320 and 844x390:
  - live football: the field and the essential controls are on screen together and the page itself never scrolls;
    choosing a play in the sheet selects it without snapping; a double-tapped Snap runs exactly one play;
  - the player's own try keeps Kick, Go for Two and Choose Play on screen (they fell below a 320x568 screen);
  - short landscape keeps a usable field (it collapsed to ~45 px at 568x320);
and once at 390x844:
  - a watched Beast Clash replay keeps Back to the Result in the console (it was hidden in Guide & Notices);
  - the player's ability demonstration has no Phases list; the developer reviewer still has one.
Run: python3 tools/live-console-check.py (CHROMIUM_PATH may select a system browser).
"""
import http.server, socketserver, threading, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_address[1]}'
FAIL = []
def check(cond, what):
    if not cond: FAIL.append(what); print('FAIL', what, flush=True)
def booted(page): page.wait_for_function("() => window.__gb && __gb.storage.mode !== 'starting'", timeout=30000)
def clear_scenes(page):
    for _ in range(30):
        if not page.locator('.apex-scene').count(): return
        page.locator('.apex-scene [data-apex="skip"]').first.click(); page.wait_for_timeout(50)
        if page.locator('.apex-scene [data-apex="continue"]').count(): page.locator('.apex-scene [data-apex="continue"]').first.click()
def visible(page, sel): return page.evaluate("(s) => [...document.querySelectorAll(s)].some(e => e.getClientRects().length && !e.closest('[hidden]') && !e.disabled)", sel)
def in_view(page, sel): return page.evaluate("(s) => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length && !e.closest('[hidden]')).every(e => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight + 0.5 }) && [...document.querySelectorAll(s)].some(e => e.getClientRects().length && !e.closest('[hidden]'))", sel)
def tap(page, sel): clear_scenes(page); page.locator(sel).first.tap(); page.wait_for_timeout(200)
def state(page): return page.evaluate("() => { const G = __gb.f.game, s = G.state; return { pc: s.playCount, log: s.log.length, phase: s.phase, me: G.playerSide, poss: s.possession, rng: s.rngState, sel: { ...G.selected } } }")
START = """async () => {
  const F = await import('/src/franchise/franchise.js');
  const f = F.createFranchise({ owner: { first: 'Live', last: 'GM' }, club: 'Ember City Beasts', seed: 77 }); F.hireDefaultStaff(f);
  while (!f.draft.done) { if (F.onTheClock(f) === f.club) F.myDraftPick(f, f.draft.available[0]); }
  if (F.needsGoal(f)) F.chooseGoal(f, F.commissionerGoals(f)[0]?.id);
  f.settings.tutorial = false; f.settings.hints = false; f.scenes = []; f.achievementsBackfilled = true; f.guide = { enabled: false }; f.welcomed = true;
  F.autoRunToSunday(f); const m = F.sundayMatchup(f); f.week.pregame = { status: 'done', side: m.playerSide, result: { winner: 'a' }, choice: 'receive' };
  await __gb.setFranchise(f); (await import('/src/ui/screens/match.js')).startSundayGame(f); }"""
def settle(page):
    for _ in range(40):
        clear_scenes(page)
        if page.locator('.sheet').count(): page.locator('.sheet [data-action="sheet-close"]').first.tap(); page.wait_for_timeout(150); continue
        for a in ['skip', 'continue', 'kickoff']:
            if visible(page, f'main.screen [data-action="{a}"]'): tap(page, f'main.screen [data-action="{a}"]'); break
        else:
            if page.locator('main.screen [data-action="snap"]').count(): return
            page.wait_for_timeout(200)
def console_ok(page, w, h, where, need):
    m = page.evaluate("""() => { const f = document.querySelector('#fieldwrap'); const b = f && f.getBoundingClientRect();
      return { page: document.scrollingElement.scrollHeight - innerHeight, side: document.documentElement.scrollWidth - innerWidth, field: b ? Math.min(b.bottom, innerHeight) - Math.max(b.top, 0) : 0 } }""")
    check(m['page'] <= 1, f'{w}x{h} {where}: the page scrolls by {m["page"]} px')
    check(m['side'] <= 0, f'{w}x{h} {where}: sideways scroll {m["side"]} px')
    check(m['field'] >= min(140, h * 0.3), f'{w}x{h} {where}: only {round(m["field"])} px of field visible')
    for sel in need: check(in_view(page, sel), f'{w}x{h} {where}: {sel} is not on screen')
with sync_playwright() as pw:
    browser = pw.chromium.launch(**({'executable_path': os.environ['CHROMIUM_PATH']} if os.getenv('CHROMIUM_PATH') else {}))
    for w, h in [(320, 568), (390, 844), (568, 320), (844, 390)]:
        page = browser.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True).new_page(); errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url); booted(page); page.evaluate(START); page.wait_for_selector('.screen-match'); settle(page)
        console_ok(page, w, h, 'pre-snap', ['main.screen [data-action="snap"]', 'main.screen [data-action="match-panel"][data-panel="plays"]'])
        s0 = state(page); tap(page, 'main.screen [data-action="match-panel"][data-panel="plays"]')
        card = page.locator('.sheet .play-grid [data-live-control]').last; card.scroll_into_view_if_needed(); card.tap(); page.wait_for_timeout(300)
        s1 = state(page); side = 'offense' if s1['poss'] == s1['me'] else 'defense'
        check(not page.locator('.sheet .play-grid').count(), f'{w}x{h}: the plays sheet stayed open after a pick')
        check((s1['pc'], s1['log'], s1['rng']) == (s0['pc'], s0['log'], s0['rng']), f'{w}x{h}: choosing a play ran or changed the game')
        check(bool(s1['sel'].get(side)), f'{w}x{h}: no play selected')
        b = page.locator('main.screen [data-action="snap"]').first.bounding_box(); x, y = b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
        page.touchscreen.tap(x, y); page.touchscreen.tap(x, y); page.wait_for_timeout(200); settle(page)
        check(state(page)['pc'] - s0['pc'] == 1, f'{w}x{h}: a double-tapped Snap ran {state(page)["pc"] - s0["pc"]} plays')
        # the player's own try (forced after a touchdown so every size reaches it)
        page.evaluate("async () => { const s = __gb.f.game.state; Object.assign(s, { phase: 'try', tryTeam: __gb.f.game.playerSide, possession: __gb.f.game.playerSide, ballOn: 97, toGo: 3 }); (await import('/src/ui/router.js')).render() }")
        page.wait_for_timeout(300); clear_scenes(page)
        console_ok(page, w, h, 'own try', ['main.screen [data-action="trykick"]', 'main.screen [data-action="trytwo"]', 'main.screen [data-action="match-panel"][data-panel="plays"]'])
        check(not errors, f'{w}x{h}: page errors {errors[:2]}')
        print(f'checked {w}x{h}: live console, pick without snap, single snap, own try', flush=True)
        page.close()
    # Beast Clash replay and ability demonstrations (390x844)
    page = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url); booted(page)
    page.evaluate("""async () => { const F = await import('/src/franchise/franchise.js'); const f = F.createFranchise({ owner: { first: 'Clash', last: 'GM' }, club: 'Ember City Beasts', seed: 91 }); F.hireDefaultStaff(f);
      while (!f.draft.done) { if (F.onTheClock(f) === f.club) F.myDraftPick(f, f.draft.available[0]); } if (F.needsGoal(f)) F.chooseGoal(f, F.commissionerGoals(f)[0]?.id);
      f.settings.tutorial = false; f.settings.hints = false; f.scenes = []; f.achievementsBackfilled = true; f.guide = { enabled: false }; f.welcomed = true; await __gb.setFranchise(f);
      (await import('/src/ui/router.js')).go('hq', {}, { reset: true }) }""")
    page.wait_for_selector('.screen-hq'); clear_scenes(page)
    for _ in range(80):
        clear_scenes(page)
        if visible(page, 'main.screen [data-action="replay"]'): break
        if page.locator('.sheet').count():
            if visible(page, '.sheet [data-action="yes"]'): tap(page, '.sheet [data-action="yes"]')
            else: page.locator('.sheet [data-action="sheet-close"]').first.tap()
            continue
        for sel in ['[data-cl="skip"]', 'main.screen [data-action="region"]', 'main.screen [data-action="enter"][data-v="watch"]', 'main.screen [data-action="enter"]', 'main.screen [data-action="toresults"]', 'main.screen .btn.primary.big']:
            if visible(page, sel): tap(page, sel); break
        else: page.wait_for_timeout(300)
    check(visible(page, 'main.screen [data-action="replay"]'), 'no Watch the Replay after a Tuesday Beast Clash')
    if visible(page, 'main.screen [data-action="replay"]'):
        tap(page, 'main.screen [data-action="replay"]'); page.wait_for_timeout(600)
        check(in_view(page, '.clash-live-console [data-action="endreplay"]'), 'replay: Back to the Result is not in the console on screen')
        tap(page, '.clash-live-console [data-action="endreplay"]'); check(visible(page, 'main.screen [data-action="replay"]'), 'Back to the Result did not return to the result')
    ids = page.evaluate("() => __gb.f.roster.map(m => m.id)"); demo = False
    for mid in ids:
        page.evaluate("async (id) => (await import('/src/ui/router.js')).go('monster', { id }, { reset: true })", mid); page.wait_for_timeout(200); clear_scenes(page)
        if not page.locator('[data-see-it]').count(): continue
        page.evaluate("() => { let d = document.querySelector('[data-see-it]'); while (d) { if (d.tagName === 'DETAILS') d.open = true; d = d.parentElement } }")
        if not page.locator('[data-see-it]').first.is_visible(): continue
        page.locator('[data-see-it]').first.scroll_into_view_if_needed(); page.locator('[data-see-it]').first.tap(); page.wait_for_timeout(1200)
        if page.locator('.sheet .ability-play-console').count(): demo = True; break
    check(demo, 'no player ability demonstration opened')
    if demo:
        check(page.locator('.sheet [data-rv2="phases"]').count() == 0, 'the player demonstration shows Phases')
        check(in_view(page, '.sheet .rv2-controls [data-pb="toggle"]') and in_view(page, '.sheet .field-wrap'), 'player demonstration: field and playback controls not on screen together')
        page.locator('.sheet [data-action="sheet-close"]').first.tap()
    page.evaluate("async () => (await import('/src/ui/router.js')).go('ability-reviewer', {}, { reset: true })"); page.wait_for_timeout(500)
    page.locator('main.screen [data-action="scenario"]').first.scroll_into_view_if_needed(); page.locator('main.screen [data-action="scenario"]').first.tap(); page.wait_for_timeout(800)
    check(page.locator('.sheet [data-rv2="phases"] .rv2-phase').count() > 0, 'the developer reviewer lost its Phases checklist')
    check(not errors, f'clash/demo page errors {errors[:2]}')
    print('checked 390x844: Clash replay console, player demo without Phases, developer Phases', flush=True)
    browser.close()
print('FAIL' if FAIL else 'PASS', f'live console check: {len(FAIL)} problem(s)')
sys.exit(1 if FAIL else 0)
