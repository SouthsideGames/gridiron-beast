#!/usr/bin/env python3
"""UI check for stadiums, instant replays, the Beast Bowl ceremony and Legendary Plays (GDD §33-36), in the real app in
headless Chromium at a phone size. Emulated browser only, not a real device.
  python3 tools/feature-ui-check.py [--width=390 --height=844] [--shots=DIR] [--replay-wait=240]
Checks: the venue card on the pregame screen and the scouting report, More -> Stadiums, the field takes the stadium's look;
an automatic replay appears after a big play, changes nothing in the game (score, clock, plays, stats), can be skipped, can
be watched again by hand, and the setting turns it off; the Legendary Play discovery card, gold cards in the game plan and
the playbook, the detail sheet, equipping one; the ceremony runs through its scenes, can be skipped, and is revisited from
Franchise History. Page errors and horizontal overflow fail the run.
"""
import sys, threading, socketserver, http.server, os, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); SHOTS = args.get('shots'); WAIT = int(args.get('replay-wait', 240))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
problems, errors, notes = [], [], []
def shot(page, name):
    if SHOTS: page.screenshot(path=os.path.join(SHOTS, f'{W}-{name}.png'))
def overflow(page): return page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
def check_overflow(page, where):
    if overflow(page) > 0: problems.append(f'horizontal overflow on {where}')
def go(page, screen, params='{}'): page.evaluate(f"async () => (await import('/src/ui/router.js')).go('{screen}', {params}, {{ reset: true }})"); page.wait_for_timeout(250)
def close_sheets(page): page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
GAME = "() => { const G = __gb.f.game; if (!G) return null; const s = G.state; return JSON.stringify([s.score, s.clock, s.quarter, s.playCount, s.possession, s.down, s.ballOn, s.log.length, JSON.stringify(s.box || s.stats || null).length]) }"

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    page.evaluate("""async () => {
      const S = await import('/tools/franchise-soak.mjs'); const F = await import('/src/franchise/franchise.js');
      const f = S.newFranchise(6, { difficulty: 'rookie' }); Object.assign(f.settings, { reducedMotion: false, mode: 'full', speed: 1.6, devNotices: false, tutorial: false }); if (__gb.settings) __gb.settings.devNotices = false;
      F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); }
      __gb.f = f; __gb.save();
    }""")
    # ---------------- stadiums
    go(page, 'pregame'); page.wait_for_timeout(300)
    v = page.evaluate("() => ({ card: !!document.querySelector('.venue-card'), name: document.querySelector('.venue-name')?.innerText, env: [...(document.querySelector('.venue-card')?.classList || [])].find(c => c.startsWith('env-')) })")
    if not v['card']: problems.append('no venue card on the pregame screen')
    notes.append(f"pregame venue: {v['name']} ({v['env']})"); shot(page, 'st-1-pregame'); check_overflow(page, 'pregame')
    go(page, 'more'); page.click('[data-action=stadiums]'); page.wait_for_timeout(200)
    n = page.evaluate("() => document.querySelectorAll('.sheet .item').length")
    if n != 16: problems.append(f'Stadiums list shows {n} clubs, expected 16')
    shot(page, 'st-2-stadiums'); check_overflow(page, 'stadiums'); close_sheets(page)
    # ---------------- match + replays
    page.evaluate("async () => { const M = await import('/src/ui/screens/match.js'); M.startSundayGame(__gb.f); }"); page.wait_for_selector('main.screen-match')
    venue = page.evaluate("() => __gb.f.game.state.venue")
    wrapcls = page.evaluate("() => document.querySelector('#fieldwrap').className")
    if venue and f"env-{venue['env']}" not in wrapcls: problems.append(f"field does not carry env-{venue['env']}: {wrapcls}")
    notes.append(f"game venue: {venue['name']} · {venue['env']} · {venue['weather']}")
    shot(page, 'st-3-field')
    # Auto on, fast, until a replay starts
    page.evaluate("() => { const G = __gb.f.game; G.auto = true; G.autoSpeed = 2; __gb.save(); }"); page.evaluate("async () => (await import('/src/ui/router.js')).render()")
    t0 = time.time(); seen = False
    while time.time() - t0 < WAIT:
        if page.query_selector('.replay-badge'): seen = True; break
        if page.query_selector('.sheet-backdrop'): close_sheets(page)
        if page.evaluate("() => !!__gb.f.game?.state.finished"): break
        page.wait_for_timeout(150)
    if not seen: problems.append(f'no automatic replay within {WAIT}s of Auto play')
    else:
        label = page.evaluate("() => document.querySelector('.replay-badge')?.innerText"); notes.append(f'auto replay: {label}')
        before = page.evaluate(GAME); page.wait_for_timeout(700); shot(page, 'rp-1-replay')
        zoom = page.evaluate("() => document.querySelector('#field')?.style.transform || ''")
        if 'scale' not in zoom: problems.append('replay camera zoom missing')
        mid = page.evaluate(GAME)
        if mid != before: problems.append(f'the game changed during a replay: {before} -> {mid}')
        # stop Auto so the game waits, then skip the replay
        page.evaluate("() => { __gb.f.game.auto = false; }")
        sk = page.query_selector('[data-action=skip]')
        if sk: sk.click()
        page.wait_for_timeout(300)
        if page.query_selector('.replay-badge'): problems.append('Skip replay did not end the replay')
        after = page.evaluate(GAME)
        if after != before: problems.append(f'the game changed across a skipped replay: {before} -> {after}')
        if page.evaluate("() => document.querySelector('#field')?.style.transform || ''"): problems.append('zoom left on after the replay')
        # manual replay
        page.evaluate("async () => (await import('/src/ui/router.js')).render()"); page.wait_for_timeout(200)
        btn = page.query_selector('[data-action=replay]')
        if not btn: notes.append('no manual Replay button on this screen state (phase without the scrimmage bar)')
        else:
            btn.click(); page.wait_for_timeout(500)
            if not page.query_selector('.replay-badge'): problems.append('manual replay did not start')
            t1 = time.time()
            while page.query_selector('.replay-badge') and time.time() - t1 < 20: page.wait_for_timeout(200)
            if page.query_selector('.replay-badge'): problems.append('manual replay did not finish on its own')
            if page.evaluate(GAME) != after: problems.append('the game changed across a manual replay')
        # setting off: no automatic replays
        page.evaluate("() => { __gb.f.settings.replays = false; __gb.f.game.auto = true; __gb.f.game.autoSpeed = 2; }"); page.evaluate("async () => (await import('/src/ui/router.js')).render()")
        t2 = time.time(); off_seen = False; plays0 = page.evaluate("() => __gb.f.game.state.playCount")
        while time.time() - t2 < 40:
            if page.query_selector('.replay-badge'): off_seen = True; break
            if page.evaluate("() => !!__gb.f.game?.state.finished"): break
            page.wait_for_timeout(150)
        if off_seen: problems.append('a replay played with the setting off')
        notes.append(f"with replays off: {page.evaluate('() => __gb.f.game.state.playCount') - plays0} plays, no replay")
        page.evaluate("() => { __gb.f.game.auto = false; __gb.f.settings.replays = true; }")
    check_overflow(page, 'match')
    # ---------------- Legendary Plays
    page.evaluate("() => { __gb.f.game = null; __gb.save(); }")
    r = page.evaluate("async () => { const F = await import('/src/franchise/franchise.js'); const r = F.devGrantLegendary(__gb.f, 'tempestra'); __gb.save(); return { ok: r.ok, reason: r.reason || null } }")
    if not r['ok']: problems.append('dev grant failed: ' + str(r))
    page.evaluate("() => { __gb.f.legendaryPlays.announced = {}; }")
    go(page, 'hq'); page.wait_for_timeout(400)
    disc = page.evaluate("() => document.querySelector('.sheet')?.innerText || ''")
    if 'LEGENDARY PLAY DISCOVERED' not in disc: problems.append('no discovery card on HQ: ' + disc[:120])
    shot(page, 'lp-1-discovered'); check_overflow(page, 'discovery'); close_sheets(page)
    go(page, 'hq'); page.wait_for_timeout(300)
    if 'LEGENDARY PLAY DISCOVERED' in (page.evaluate("() => document.querySelector('.sheet')?.innerText || ''")): problems.append('discovery card shown twice')
    close_sheets(page)
    page.evaluate("() => { __gb.f.season.day = 4; }"); go(page, 'gameplan'); page.wait_for_timeout(300)
    cards = page.evaluate("() => ({ gold: document.querySelectorAll('.card.legendary').length, avail: document.querySelectorAll('.card.legendary[data-action=toggle]').length, locked: document.querySelectorAll('.card.legendary.locked').length })")
    if cards['gold'] != 6 or cards['avail'] != 1 or cards['locked'] != 5: problems.append(f'game plan legendary cards {cards}')
    shot(page, 'lp-2-gameplan'); check_overflow(page, 'game plan')
    page.click('.card.legendary.locked'); page.wait_for_timeout(200)
    if 'LOCKED' not in page.evaluate("() => document.querySelector('.sheet')?.innerText.toUpperCase() || ''") and 'SIGN' not in page.evaluate("() => document.querySelector('.sheet')?.innerText.toUpperCase() || ''"): problems.append('locked card sheet lacks the reason')
    shot(page, 'lp-3-sheet'); close_sheets(page)
    # equip: drop one standard offensive play, add Eye of the Storm, save
    page.evaluate("() => { const c = [...document.querySelectorAll('.play-grid[data-side=offense] .card.selected:not(.legendary)')][0]; c?.click(); }")
    page.click('.card.legendary[data-action=toggle]'); page.click('[data-action=save]'); page.wait_for_timeout(300)
    plan = page.evaluate("() => __gb.f.week.plan.offense")
    if 'lp_eye_of_the_storm' not in plan or len(plan) != 6: problems.append(f'equipping failed: {plan}')
    go(page, 'playbook'); page.wait_for_timeout(200)
    if page.evaluate("() => document.querySelectorAll('.card.legendary').length") != 6: problems.append('playbook legendary section missing')
    shot(page, 'lp-4-playbook')
    # ---------------- ceremony
    page.evaluate("async () => { const F = await import('/src/franchise/franchise.js'); const f = __gb.f; f.history.push({ year: 99, club: f.club, tier: f.tier, record: { w: 9, l: 1, t: 0 }, place: 1, champion: f.club, playoffs: true, schedule: [], rival: {}, championship: { ...F.championshipRecord(f), year: 99 } }); __gb.save(); }")
    go(page, 'ceremony', "{ year: 99, fromGame: true }")
    scenes = []
    t0 = time.time()
    while time.time() - t0 < 30:
        cls = page.evaluate("() => document.querySelector('#ceremony')?.className || ''")
        for sc in ['sc-final', 'sc-enter', 'sc-show', 'sc-trophy', 'sc-summary']:
            if sc in cls and sc not in scenes:
                scenes.append(sc); page.wait_for_timeout(500 if sc != 'sc-show' else 1300); shot(page, f'cer-{len(scenes)}-{sc}')
        if 'sc-summary' in cls: break
        page.wait_for_timeout(120)
    if scenes != ['sc-final', 'sc-enter', 'sc-show', 'sc-trophy', 'sc-summary']: problems.append(f'ceremony scenes {scenes}')
    n_st = page.evaluate("() => document.querySelectorAll('.cer-mon.starter').length")
    if n_st < 10: problems.append(f'only {n_st} starters in the ceremony')
    check_overflow(page, 'ceremony summary')
    page.click('[data-action=cer-replay]'); page.wait_for_timeout(600); page.click('[data-action=cer-skip]'); page.wait_for_timeout(200)
    if 'sc-summary' not in page.evaluate("() => document.querySelector('#ceremony')?.className || ''"): problems.append('skip did not jump to the summary')
    page.click('[data-action=cer-done]'); page.wait_for_timeout(300)
    if page.evaluate("() => (document.querySelector('main.screen')?.className.match(/screen-([a-z0-9-]+)/) || [])[1]") != 'hq': problems.append('Continue did not return to HQ')
    go(page, 'history'); page.wait_for_timeout(200)
    if not page.query_selector('[data-action=ceremony]'): problems.append('no Ceremony button in Franchise History')
    else:
        page.click('[data-action=ceremony]'); page.wait_for_timeout(400)
        if not page.query_selector('#ceremony'): problems.append('ceremony did not open from history')
    b.close()
srv.shutdown()
print(json.dumps({'width': W, 'height': H, 'problems': problems, 'errors': errors[:8], 'notes': notes}, indent=1))
sys.exit(1 if problems or errors else 0)
