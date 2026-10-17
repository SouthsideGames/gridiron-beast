#!/usr/bin/env python3
"""Mobile UI smoke test: drives the app through onboarding, a full week and a
game at several phone sizes, checking for console errors, horizontal overflow,
the 3x2 play grid, a visible Snap button and 44px touch targets.

usage: python3 tests/ui/responsive.py [--shots DIR]
Requires Playwright with Chromium; serves the repo root on a local port.
"""
import http.server, os, socketserver, sys, threading, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SIZES = [(320, 568, 'iphone-se1'), (375, 667, 'iphone-se'), (390, 844, 'iphone-14'), (412, 915, 'pixel-7')]
SHOTS = None
if '--shots' in sys.argv:
    SHOTS = sys.argv[sys.argv.index('--shots') + 1]; os.makedirs(SHOTS, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()

def serve():
    handler = lambda *a, **k: Quiet(*a, directory=ROOT, **k)
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]

failures = []
def check(cond, msg):
    if not cond: failures.append(msg); print('  FAIL', msg)
    else: print('  ok  ', msg)

def shot(page, name):
    if SHOTS: page.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False)

def no_overflow(page, label):
    w = page.evaluate('() => [document.documentElement.scrollWidth, window.innerWidth]')
    check(w[0] <= w[1] + 1, f'{label}: no horizontal overflow ({w[0]} <= {w[1]})')

def tap_targets(page, label):
    small = page.evaluate('''() => Array.from(document.querySelectorAll('button:not(.ghost), .item, .card, .slot, .tab')).filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 && !b.classList.contains('small')) && !b.classList.contains('tab'); }).map(b => (b.className || b.tagName) + ':' + Math.round(b.getBoundingClientRect().height)).slice(0, 5)''')
    check(len(small) == 0, f'{label}: all primary buttons >= 44px tall {small}')

def tip_ok(page):
    b = page.query_selector('[data-action="tut-ok"]')
    if b: b.click(); page.wait_for_timeout(60)

def settle(page, want=None, limit=40):
    """Advance the match through transient states (animation, kickoff, try, continue) until `want` is present or scrimmage controls appear."""
    for _ in range(limit):
        if want and page.query_selector(want): return True
        if page.query_selector('.sheet'): page.click('[data-action="sheet-close"]'); page.wait_for_timeout(30); continue
        for sel in ['[data-action="skip"]', '[data-action="continue"]', '[data-action="kickoff"]', '[data-action="trykick"]']:
            b = page.query_selector(sel)
            if b: b.click(); page.wait_for_timeout(80); break
        else:
            if page.query_selector('[data-action="finish"]') or page.query_selector('[data-action="snap"]'): return bool(want is None or page.query_selector(want))
            page.wait_for_timeout(80)
    return bool(want and page.query_selector(want))

def run_size(pw, port, w, h, name):
    print(f'== {name} {w}x{h}')
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: (errors.append(str(e)), print('  PAGEERROR', str(e)[:300], getattr(e, 'stack', '')[:600])))
    page.on('console', lambda m: (errors.append(m.text), print('  CONSOLE', m.text[:300])) if m.type == 'error' else None)
    page.goto(f'http://127.0.0.1:{port}/index.html')
    page.wait_for_selector('[data-action="new"]')
    no_overflow(page, 'menu'); shot(page, f'{name}-01-menu')
    # Beast Dex from the main menu (no franchise yet: every species is a silhouette)
    page.click('[data-action="go"][data-screen="dex"]'); page.wait_for_selector('.dex-cell'); no_overflow(page, 'dex'); tap_targets(page, 'dex'); shot(page, f'{name}-01b-dex')
    check(page.evaluate("() => document.querySelectorAll('.dex-cell').length") == 72, 'dex: 72 species cells')
    page.click('.dex-cell >> nth=0'); page.wait_for_selector('.sheet'); shot(page, f'{name}-01c-dex-unknown'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    page.click('[data-action="router-back"]') if page.query_selector('[data-action="router-back"]') else page.go_back()
    page.wait_for_selector('[data-action="new"]')
    # Onboarding: three steps, then straight to match day (default staff is hired automatically).
    page.click('[data-action="new"]')
    page.wait_for_selector('#first')
    page.fill('#first', 'Sam'); page.fill('#last', 'Rivera'); no_overflow(page, 'onboarding name'); shot(page, f'{name}-02-name'); page.click('#next')
    page.wait_for_selector('[data-action="opt"]'); page.click('[data-action="opt"][data-k="style"][data-v="curls"]'); page.click('[data-action="opt"][data-k="accessory"][data-v="headset"]'); no_overflow(page, 'onboarding look'); tap_targets(page, 'onboarding look'); shot(page, f'{name}-02a-look'); page.click('#next')
    page.wait_for_selector('[data-action="background"]'); page.fill('#home', 'Ember City'); page.click('[data-action="background"][data-v="scout"]'); no_overflow(page, 'onboarding background'); shot(page, f'{name}-02ab-background'); page.click('#next')
    page.click('[data-action="club"][data-v="Ember City Beasts"]'); no_overflow(page, 'onboarding club'); shot(page, f'{name}-02b-club'); page.click('#next')
    page.wait_for_selector('[data-action="difficulty"]'); page.click('[data-action="difficulty"][data-v="pro"]'); no_overflow(page, 'onboarding difficulty'); shot(page, f'{name}-02bb-difficulty'); page.click('#next')
    page.click('[data-action="reroll"]'); page.wait_for_timeout(50); page.click('[data-action="pick"][data-side="offense"] >> nth=0'); shot(page, f'{name}-02c-cornerstone'); page.click('#next')
    page.wait_for_selector('.tabbar')
    check(page.query_selector('.tip') is not None, 'tutorial: HQ tip shows on the first week')
    page.click('[data-action="tut-primer"]'); page.wait_for_selector('.sheet'); no_overflow(page, 'primer'); shot(page, f'{name}-03b-primer'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    no_overflow(page, 'hq'); tap_targets(page, 'hq'); shot(page, f'{name}-04-hq'); tip_ok(page)
    # Commissioner's office: stage a pending review and open the screen.
    page.evaluate("() => { const f = __gb.f; f.week.commissioner = { over: 50000, names: f.roster.slice(0, 3).map(m => m.id), enough: true, visits: 1 }; }")
    page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('[data-action="router-tab"][data-screen="hq"]'); page.wait_for_selector('[data-action="commissioner"]')
    page.click('[data-action="commissioner"]'); page.wait_for_selector('[data-action="release"]'); no_overflow(page, 'commissioner'); tap_targets(page, 'commissioner'); shot(page, f'{name}-04b-commissioner')
    page.evaluate("() => { __gb.f.week.commissioner = null; __gb.save(); }")
    # Postseason story event: stage one and open the screen.
    page.evaluate("() => { const f = __gb.f; f.postseason = { kind: 'star_out', starId: f.roster[0].id, coordRole: 'offensive_coordinator', vars: { star: f.roster[0].name, club: f.club, rival: 'Bayou Stalkers', record: '3–6', coach: 'Nia Park', side: 'offense', other: 'Ashford Hawks', scheme: 'Balanced', fit: 3, total: 11 }, resolved: false, chosen: null }; f.history.push({ year: 1, record: { w: 3, l: 6 } }); }")
    page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('[data-action="router-tab"][data-screen="hq"]')
    page.evaluate("() => { __gb.f.season.finished = true; }"); page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('[data-action="router-tab"][data-screen="hq"]'); page.wait_for_selector('[data-action="postseason"]')
    page.click('[data-action="postseason"]'); page.wait_for_selector('[data-action="choose"]'); no_overflow(page, 'postseason'); tap_targets(page, 'postseason'); shot(page, f'{name}-04c-postseason')
    page.evaluate("() => { __gb.f.postseason = null; __gb.f.history.pop(); __gb.f.legendPick = { year: 1, resolved: false }; __gb.save(); }")
    page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('[data-action="router-tab"][data-screen="hq"]'); page.wait_for_selector('[data-action="legend"]')
    page.click('[data-action="legend"]'); page.wait_for_selector('[data-action="pick"]'); no_overflow(page, 'legend tracks'); shot(page, f'{name}-04d-legend')
    page.evaluate("() => { __gb.f.legendPick = null; __gb.f.season.finished = false; __gb.save(); }")
    # Hall of Fame: make the franchise eligible, see the commissioner's notice and the retire button, then view a card (without retiring the test franchise).
    page.evaluate("() => { const f = __gb.f; for (const g of ['Harbor Sentinels','Sunfire Lions','Thunder Mesa','Canyon Crushers','Eastport Phantoms','Frostpeak Howlers','Ironpeak Rams','Palmetto Vipers']) f.campaign.badges[g] = { year: 1, week: 1, score: '1–0' }; Object.assign(f.campaign, { titles: 2, wins: 50, awards: 3 }); }")
    page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('[data-action="router-tab"][data-screen="hq"]'); page.wait_for_selector('.sheet'); shot(page, f'{name}-04e-hof-notice'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    check(page.query_selector('[data-action="retire"]') is not None, 'hq: retire button when eligible')
    page.evaluate("() => { const f = __gb.f; f.campaign.badges = {}; Object.assign(f.campaign, { titles: 0, wins: 0, awards: 0, hofNoticed: false }); __gb.save(); }")
    page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('[data-action="router-tab"][data-screen="hq"]'); page.wait_for_selector('[data-action="scout"], [data-action="autorun"]')
    page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('[data-action="router-tab"][data-screen="hq"]'); page.wait_for_selector('[data-action="scout"], [data-action="autorun"]')
    page.click('[data-action="router-tab"][data-screen="hq"]'); page.wait_for_selector('[data-action="scout"], [data-action="autorun"]')
    # Tabs
    for tab in ['roster', 'playbook', 'league', 'more']:
        page.click(f'[data-action="router-tab"][data-screen="{tab}"]'); page.wait_for_timeout(100)
        no_overflow(page, f'tab {tab}'); shot(page, f'{name}-05-{tab}'); tip_ok(page)
    page.click('[data-action="router-tab"][data-screen="roster"]'); page.click('.slot >> nth=0'); page.wait_for_timeout(100); no_overflow(page, 'assign'); shot(page, f'{name}-06-assign')
    page.click('[data-action="monster"] >> nth=0'); page.wait_for_timeout(100); no_overflow(page, 'monster'); shot(page, f'{name}-07-monster')
    # Stats tabs on the card (GDD §16): season table, game log, career.
    for tab in ['log', 'career', 'post', 'season']:
        page.click(f'[data-action="stat-tab"][data-v="{tab}"]'); page.wait_for_timeout(60); no_overflow(page, f'monster stats {tab}')
    shot(page, f'{name}-07e-stats')
    check(page.evaluate("() => !!document.querySelector('.stat-table') || !!document.querySelector('[data-action=\"stat-tab\"]')"), 'monster card shows the stats block')
    page.click('[data-action="species"]'); page.wait_for_selector('.sheet'); no_overflow(page, 'species sheet'); shot(page, f'{name}-07b-species'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    page.click('[data-action="router-tab"][data-screen="more"]'); page.click('[data-action="go"][data-screen="dex"]'); page.wait_for_selector('.dex-cell'); no_overflow(page, 'dex in franchise'); shot(page, f'{name}-07c-dex')
    check(page.evaluate("() => document.querySelectorAll('.dex-cell.signed').length") >= 20, 'dex: starting roster species are marked signed')
    page.click('.dex-cell.signed >> nth=0'); page.wait_for_selector('.sheet'); shot(page, f'{name}-07d-dex-species'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    page.click('[data-action="router-tab"][data-screen="league"]'); page.wait_for_selector('[data-action="award"]'); page.click('[data-action="award"][data-k="mvp"]'); page.wait_for_selector('.sheet'); no_overflow(page, 'award race'); shot(page, f'{name}-05b-award'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    page.click('[data-action="go"][data-screen="leaders"]'); page.wait_for_selector('.list'); no_overflow(page, 'leaders'); shot(page, f'{name}-05c-leaders')
    page.select_option('[data-action="cat"]', 'sacks'); page.wait_for_timeout(80); no_overflow(page, 'leaders sacks'); page.click('[data-action="bucket"][data-v="post"]'); page.wait_for_timeout(80); page.click('[data-action="router-back"]'); page.wait_for_selector('[data-action="award"]')
    page.click('[data-action="go"][data-screen="awardhistory"]'); page.wait_for_timeout(80); no_overflow(page, 'award history'); page.click('[data-action="router-back"]'); page.wait_for_selector('[data-action="award"]')
    page.click('[data-action="router-tab"][data-screen="hq"]')
    # Week
    settle(page, '[data-action="scout"]')
    page.click('[data-action="scout"]'); page.wait_for_selector('[data-action="region"]'); no_overflow(page, 'scout tip'); shot(page, f'{name}-07e-scout'); tip_ok(page); page.click('[data-action="region"] >> nth=0')
    page.wait_for_selector('[data-action="skip"], [data-action="approach"]'); no_overflow(page, 'recruit'); shot(page, f'{name}-08-recruit'); tip_ok(page)
    if page.query_selector('[data-action="compare"]'):
        page.click('[data-action="compare"] >> nth=0'); page.wait_for_selector('.sheet table.compare'); no_overflow(page, 'recruit compare'); shot(page, f'{name}-08b-compare'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    page.click('[data-action="skip"]')
    page.click('[data-action="training"]'); page.wait_for_selector('[data-action="focus"]'); no_overflow(page, 'training'); shot(page, f'{name}-08c-training'); tip_ok(page); page.click('[data-action="focus"] >> nth=0')
    page.wait_for_selector('.sheet'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    page.click('[data-action="scoutopp"]'); tip_ok(page); page.click('[data-action="side"] >> nth=0'); page.wait_for_selector('.sheet .play-grid'); check(page.evaluate("() => document.querySelectorAll('.sheet .play-grid .card').length") == 6, 'scouting: six opponent play cards'); shot(page, f'{name}-09-scout'); page.click('[data-action="sheet-close"]')
    page.wait_for_selector('[data-action="gameplan"]'); page.click('[data-action="gameplan"]')
    page.wait_for_selector('.play-grid'); tip_ok(page)
    cols = page.evaluate('''() => { const g = document.querySelector('.play-grid'); const cards = Array.from(g.children); const tops = new Set(cards.map(c => Math.round(c.getBoundingClientRect().top))); return [getComputedStyle(g).gridTemplateColumns.split(' ').length, cards.length, tops.size]; }''')
    check(cols[0] == 3, f'gameplan: three columns ({cols[0]})')
    no_overflow(page, 'gameplan'); shot(page, f'{name}-10-gameplan')
    selected = page.evaluate("() => document.querySelectorAll('[data-side=\"offense\"].selected').length")
    if selected < 6:
        for i in range(6 - selected): page.click(f'[data-action="toggle"][data-side="offense"]:not(.selected) >> nth=0')
    dsel = page.evaluate("() => document.querySelectorAll('[data-side=\"defense\"].selected').length")
    for i in range(6 - dsel): page.click('[data-action="toggle"][data-side="defense"]:not(.selected) >> nth=0')
    page.click('[data-action="save"]')
    page.wait_for_selector('[data-action="lineup"]'); page.click('[data-action="lineup"]'); page.wait_for_selector('[data-action="answer"]'); no_overflow(page, 'media day'); shot(page, f'{name}-10b-media'); tip_ok(page)
    for q in range(3): page.click(f'[data-action="answer"][data-q="{q}"] >> nth=0')
    page.click('[data-action="submit"]'); page.click('[data-action="done"]')
    page.wait_for_selector('[data-action="game"]'); page.click('[data-action="game"]')
    page.wait_for_selector('[data-action="toss"]'); no_overflow(page, 'pregame'); shot(page, f'{name}-11-pregame'); tip_ok(page)
    check(page.query_selector('.talk .talk-line') is not None, 'pregame: the other coach speaks')
    if page.query_selector('[data-action="reply"]'): page.click('[data-action="reply"][data-v="respectful"]'); page.wait_for_selector('.talk-reply'); shot(page, f'{name}-11b-reply')
    page.click('[data-action="toss"]')
    page.wait_for_selector('.sheet [data-choice]'); page.click('.sheet [data-choice] >> nth=0')
    page.wait_for_selector('#field')
    if page.query_selector('.sheet'): check(page.query_selector('.sheet [data-action="tut-primer"]') is not None, 'tutorial: first-game sheet'); shot(page, f'{name}-11c-firstgame'); page.click('[data-action="sheet-close"]'); page.wait_for_selector('.sheet', state='detached')
    no_overflow(page, 'match'); shot(page, f'{name}-12-kickoff')
    page.click('[data-action="kickoff"]'); page.wait_for_timeout(100)
    # First scrimmage: cards + snap visible without scrolling
    page.wait_for_selector('.play-grid .card'); settle(page, '[data-action="snap"]')
    grid = page.evaluate('''() => { const g = document.querySelector('.play-grid'); const r = g.getBoundingClientRect(); const cards = Array.from(g.children); const rows = new Set(cards.map(c => Math.round(c.getBoundingClientRect().top))); const snap = document.querySelector('[data-action="snap"]'); const sr = snap ? snap.getBoundingClientRect() : null; return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, rows: rows.size, cards: cards.length, snapBottom: sr ? sr.bottom : null, inner: window.innerHeight, gridBottom: r.bottom }; }''')
    check(grid['cols'] == 3 and grid['rows'] == 2 and grid['cards'] == 6, f"match: play cards in 3x2 ({grid['cols']}x{grid['rows']}, {grid['cards']} cards)")
    check(grid['snapBottom'] is not None and grid['snapBottom'] <= grid['inner'], f"match: Snap visible without scrolling ({grid['snapBottom']} <= {grid['inner']})")
    tap_targets(page, 'match')
    shot(page, f'{name}-13-presnap-nopick')
    page.click('.play-grid .card >> nth=0'); page.wait_for_timeout(50)
    shot(page, f'{name}-14-presnap')
    # Play several snaps, skipping animations
    for i in range(6):
        settle(page)
        if page.query_selector('.play-grid .card'): page.click('.play-grid .card >> nth=1'); page.wait_for_timeout(30)
        b = page.query_selector('[data-action="snap"]:not([disabled])')
        if b: b.click(); page.wait_for_timeout(120)
        elif page.query_selector('[data-action="punt"]'): page.click('[data-action="punt"]'); page.wait_for_timeout(120)
    settle(page)
    shot(page, f'{name}-15-after-plays')
    # Auto mode: three plays call themselves, then off.
    settle(page, '[data-action="auto"]'); page.click('[data-action="auto"]'); page.wait_for_timeout(3500)
    check(page.evaluate("() => __gb.f.game.state.calls.length") >= 2, 'auto mode plays on its own')
    settle(page, '[data-action="auto"]'); page.click('[data-action="auto"]'); page.wait_for_timeout(200); shot(page, f'{name}-15b-auto-off')
    # Key moments sim
    settle(page, '[data-action="mode"]')
    page.click('[data-action="mode"]'); page.wait_for_timeout(50)
    if page.query_selector('[data-action="keymoment"]'):
        page.click('[data-action="keymoment"]'); page.wait_for_timeout(300)
        if page.query_selector('.sheet'): page.click('[data-action="sheet-close"]')
    no_overflow(page, 'match after sim'); shot(page, f'{name}-16-keymoment')
    page.click('[data-action="log"]'); page.wait_for_selector('.sheet'); shot(page, f'{name}-17-log'); page.click('[data-action="sheet-close"]')
    if True:
        # Play the game to the final whistle with Key Moments, answering every decision the UI asks for.
        for _ in range(400):
            if page.query_selector('[data-action="finish"]'): break
            if page.query_selector('.sheet'): page.click('[data-action="sheet-close"]'); continue
            for sel in ['[data-action="skip"]', '[data-action="continue"]', '[data-action="kickoff"]', '[data-action="trykick"]', '[data-action="keymoment"]']:
                b = page.query_selector(sel)
                if b: b.click(); page.wait_for_timeout(60); break
            else:
                if page.query_selector('[data-action="punt"]'): page.click('[data-action="punt"]'); page.wait_for_timeout(60); continue
                if page.query_selector('.play-grid .card'): page.click('.play-grid .card >> nth=2'); page.wait_for_timeout(30)
                b = page.query_selector('[data-action="snap"]:not([disabled])')
                if b: b.click(); page.wait_for_timeout(60)
        check(page.query_selector('[data-action="finish"]') is not None, 'match: reached the final whistle')
        shot(page, f'{name}-17b-final')
        page.click('[data-action="finish"]'); page.wait_for_selector('.sheet'); shot(page, f'{name}-17c-postgame'); page.click('[data-action="sheet-close"]')
        page.wait_for_selector('.tabbar')
        check('Week 2' in page.inner_text('#screen'), 'hq: advanced to week 2 after the game')
        shot(page, f'{name}-17d-week2')
    # Practice (HQ grid) and the audit (Developer tools on the main menu); the match stays resumable.
    page.goto(f'http://127.0.0.1:{port}/index.html'); page.wait_for_selector('[data-action="continue"]'); page.click('[data-action="continue"]')
    page.wait_for_selector('.tabbar'); page.click('[data-action="go"][data-screen="practice"]')
    page.wait_for_selector('[data-action="run"]'); page.click('[data-action="run"]'); page.wait_for_timeout(900)
    no_overflow(page, 'practice'); shot(page, f'{name}-18-practice')
    page.click('[data-action="router-back"]'); page.click('[data-action="router-tab"][data-screen="more"]'); page.click('[data-action="menu"]'); page.wait_for_selector('[data-action="go"][data-screen="developer"]'); page.click('[data-action="go"][data-screen="developer"]'); page.click('[data-action="go"][data-screen="audit"]'); page.wait_for_selector('[data-action="sim"]'); page.click('[data-action="sim"]'); page.wait_for_timeout(100)
    no_overflow(page, 'audit'); shot(page, f'{name}-19-audit')
    page.click('[data-action="router-back"]'); page.click('[data-action="router-back"]'); page.click('[data-action="go"][data-screen="settings"]'); no_overflow(page, 'settings'); shot(page, f'{name}-20-settings')
    page.click('[data-action="router-back"]'); page.click('[data-action="continue"]'); page.wait_for_selector('.tabbar')
    page.click('[data-action="router-tab"][data-screen="league"]'); no_overflow(page, 'league'); shot(page, f'{name}-21a-league'); page.click('[data-action="go"][data-screen="playoffs"]'); no_overflow(page, 'playoffs'); shot(page, f'{name}-21b-playoffs'); page.click('[data-action="router-back"]'); page.click('[data-action="go"][data-screen="standings"]'); no_overflow(page, 'standings'); shot(page, f'{name}-21-standings')
    check(len(errors) == 0, f'no console errors ({errors[:3]})')
    browser.close()

def main():
    srv, port = serve()
    with sync_playwright() as pw:
        for w, h, name in SIZES:
            if os.environ.get('ONLY') and name != os.environ['ONLY']: continue
            run_size(pw, port, w, h, name)
    srv.shutdown()
    print('\nFAILURES:' if failures else '\nALL UI CHECKS PASSED', len(failures))
    for f in failures: print(' -', f)
    sys.exit(1 if failures else 0)

if __name__ == '__main__': main()
