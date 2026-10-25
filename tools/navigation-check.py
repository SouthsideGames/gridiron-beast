#!/usr/bin/env python3
"""Navigation and scroll-restoration check (GDD §41.5): headless Chromium at a phone size, on a franchise three seasons in
(the offseason, with free agents and a held draft). The ten scenarios of the v39.1 brief:
  1 Roster → Monster card → Back            (scroll and roster view restored)
  2 Roster → monster → timeline detail → Close (card, filter and fold unchanged; no page scroll)
  3 League News → career → Open card → Back (HQ position restored)
  4 Awards → career → Open card → Back      (award history position restored)
  5 Free agency → career → close            (offseason list unchanged)
  6 Draft room → career → close             (unchanged)
  7 More → a menu screen → Back             (More restored)
  8 Tabs after scrolling                    (a new tab starts at the top; no stale position is restored)
  9 Modal sheets                            (open/close and scrolling inside never move the page)
 10 After a weekly action                   (a fresh flow starts at the top; Back still restores afterwards)
plus sticky headers and jump targets never hidden under the top bar, and the last item never under the tab bar.
Emulated browser, not a real device.
  python3 tools/navigation-check.py [--width=390 --height=844] [--shots=DIR]
"""
import sys, threading, socketserver, http.server, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); SHOTS = args.get('shots')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
problems, errors, notes = [], [], []
def ok(cond, msg):
    if not cond: problems.append(msg)
    return cond
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    page.evaluate("""async () => { const S = await import('/tools/franchise-soak.mjs'); const { f } = S.runFranchise(1, { difficulty: 'rookie', seasons: 3 });
      Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: true }); f.scenes = []; f.achievementsBackfilled = true; __gb.f = f; __gb.save(); }""")
    R = "(await import('/src/ui/router.js'))"
    go = lambda name, params='{}', opts='{}': page.evaluate(f"async () => {R}.go('{name}', {params}, {opts})")
    back = lambda: page.evaluate(f"async () => {R}.back()")
    screen = lambda: page.evaluate(f"async () => {R}.currentScreen()?.name")
    y = lambda: page.evaluate('() => Math.round(window.scrollY)')
    settle = lambda ms=350: page.wait_for_timeout(ms)
    def close_all(): page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
    def scroll_to(px): page.evaluate(f'() => window.scrollTo(0, {px})'); settle(120); return y()
    def click_js(sel, i=0): return page.evaluate(f"() => {{ const e = document.querySelectorAll({json.dumps(sel)})[{i}]; if (!e) return false; e.scrollIntoView({{ block: 'center' }}); e.click(); return true; }}")
    def open_career_from(sel):
        # a career link: scroll it to the middle of the screen, remember the page position, tap it
        page.evaluate(f"() => document.querySelector({json.dumps(sel)})?.scrollIntoView({{ block: 'center' }})"); settle(120); y0 = y()
        page.evaluate(f"() => document.querySelector({json.dumps(sel)})?.click()"); settle(300); return y0
    # 1 Roster → Monster card → Back
    go('roster', '{}', '{ reset: true }'); settle(); close_all()
    page.evaluate("() => document.querySelector('[data-action=view][data-v=depth]')?.click()"); settle(200)
    view_depth = page.evaluate("() => !!document.querySelector('[data-action=view][data-v=depth].primary')")
    page.evaluate("() => { const all = [...document.querySelectorAll('#screen [data-action=monster], #screen .depth-line, #screen [data-id]')].filter(x => x.dataset.action === 'monster'); const b = all[Math.min(4, all.length - 1)]; b?.scrollIntoView({ block: 'center' }); }"); settle(120)
    y1 = y(); opened = click_js('#screen [data-action=monster]', 4) or click_js('#screen [data-action=monster]', 0); settle()
    if opened and screen() == 'monster':
        back(); settle()
        ok(screen() == 'roster', f'1: Back went to {screen()}'); ok(abs(y() - y1) <= 4, f'1: roster scroll {y1} -> {y()}')
        ok(page.evaluate("() => !!document.querySelector('[data-action=view][data-v=depth].primary')") == view_depth, '1: the roster view (Lineup/Depth) changed')
        notes.append(f'1 roster→card→back: scroll {y1}→{y()}, view kept')
    else: problems.append('1: could not open a monster from the roster')
    page.evaluate("() => document.querySelector('[data-action=view][data-v=field]')?.click()"); settle(150)
    # 2 Roster → monster → timeline detail → Close
    mid = page.evaluate("() => __gb.f.roster.slice().sort((a, b) => (b.career?.ev?.length || 0) - (a.career?.ev?.length || 0))[0].id")
    go('monster', json.dumps({'id': mid})); settle(); close_all()
    click_js('#timeline [data-action=tl-filter][data-v=highlights]'); settle(150)
    if page.query_selector('#timeline [data-action=tl-more]'): click_js('#timeline [data-action=tl-more]'); settle(400)
    page.evaluate("() => document.querySelector('#timeline [data-action=tl-open]')?.scrollIntoView({ block: 'center' })"); settle(150); y2 = y()
    st = lambda: page.evaluate("() => ({ hl: document.querySelector('#timeline [data-v=highlights]').classList.contains('on'), more: document.querySelector('#timeline [data-action=tl-more]')?.textContent || '', items: document.querySelectorAll('#timeline .tl-item').length })")
    s0 = st(); page.evaluate("() => document.querySelector('#timeline [data-action=tl-open]').click()"); settle(250)
    ok(page.query_selector('.sheet .dt-hero, .sheet .dt-evo') is not None, '2: the detail did not open')
    page.evaluate("() => { const b = document.querySelector('.sheet-body'); if (b) b.scrollTop = 99999; }"); page.mouse.wheel(0, 800); settle(150)
    ok(abs(y() - y2) <= 2, f'2: scrolling inside the sheet moved the card {y2} -> {y()}')
    page.mouse.move(W // 2, 20); page.mouse.wheel(0, 900); settle(150)  # a wheel on the dimmed backdrop above the sheet
    ok(abs(y() - y2) <= 2, f'2: scrolling the backdrop moved the card {y2} -> {y()}')
    page.click('.sheet [data-action=sheet-close]'); settle(200)
    ok(abs(y() - y2) <= 2, f'2: closing moved the card {y2} -> {y()}'); ok(st() == s0, f'2: filter/fold changed {s0} -> {st()}')
    notes.append(f'2 detail open/close: card stayed at {y()}, {s0}')
    # sticky season header below the top bar; jump target below the top bar
    # scroll until the first season header has reached the top: a sticky header must stop below the top bar, not under it
    page.evaluate("() => { const h = document.querySelector('#timeline .tl-season'); window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY + 300); }"); settle(150)
    hdr = page.evaluate("() => { const tb = document.querySelector('.topbar').getBoundingClientRect().bottom; const hs = [...document.querySelectorAll('#timeline .tl-season')].map((h) => h.getBoundingClientRect()).filter((r) => r.top < tb + 60 && r.bottom > 0); return { tb: Math.round(tb), tops: hs.map((r) => Math.round(r.top)) } }")
    ok(len(hdr['tops']) > 0, f'no stuck season header found to check {hdr}')
    ok(all(t >= hdr['tb'] - 1 for t in hdr['tops']), f'sticky season header under the top bar {hdr}')
    scroll_to(0); click_js('[data-action=career-jump]'); settle(500)
    jt = page.evaluate("() => ({ t: Math.round(document.querySelector('#timeline').getBoundingClientRect().top), tb: Math.round(document.querySelector('.topbar').getBoundingClientRect().bottom) })")
    ok(jt['t'] >= jt['tb'] - 1, f'Career jump lands under the top bar {jt}')
    notes.append(f'sticky header tops {hdr["tops"]} vs top bar {hdr["tb"]}; jump target {jt}')
    page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)"); settle(200)
    tail = page.evaluate("() => { const tab = document.querySelector('.tabbar'); const main = document.querySelector('#screen'); const last = main.lastElementChild?.getBoundingClientRect(); return tab && last ? { lastBottom: Math.round(last.bottom), tabTop: Math.round(tab.getBoundingClientRect().top) } : null }")
    if tail: ok(tail['lastBottom'] <= tail['tabTop'] + 1, f'the last block is hidden under the tab bar {tail}')
    # 3-6: a career link opens the full-screen career profile (GDD §48); Back returns to the same screen and scroll
    def career_and_back(sel, where, label):
        pre = page.evaluate("() => document.documentElement.classList.contains('sheet-open')")
        if pre: notes.append(f'{label}: the lock was already set before the link (left by close_all removing a sheet directly)')
        y0 = open_career_from(sel); opened = screen()
        ok(opened == 'career', f'{label}: the career link opened {opened}, not the career profile')
        back(); settle()
        ok(screen() == where and abs(y() - y0) <= 4, f'{label}: Back went to {screen()} at {y()} (was {where} at {y0})')
        lock = page.evaluate("() => ({ locked: document.documentElement.classList.contains('sheet-open'), sheets: [...document.querySelectorAll('.sheet-head strong')].map((x) => x.textContent) })")
        ok(not lock['locked'] or lock['sheets'], f'{label}: the page is left scroll-locked with no sheet open {lock}')
        if lock['sheets']: notes.append(f'{label}: back on {where}, the screen opened its own sheet {lock["sheets"]}')
        notes.append(f'{label}: {where}→career→back {y0}→{y()}')
    # 3 League News on HQ
    go('hq', '{}', '{ reset: true }'); settle(); close_all()
    if page.query_selector('.league-news [data-career]'): career_and_back('.league-news [data-career]', 'hq', '3 League News')
    else: notes.append('3: no career link on the HQ card this week (covered by the presentation check)')
    # 4 Award history
    go('awardhistory'); settle(); close_all()
    if page.query_selector('#screen [data-career]'): career_and_back('#screen [data-career]', 'awardhistory', '4 awards')
    # 5 Free agency: the career link sits in the free agent's sheet; the sheet closes and Back returns to the market
    go('offseason', '{}', '{ reset: true }'); settle(); close_all()
    if page.query_selector('#screen [data-action=fa]'):
        page.evaluate("() => { const l = document.querySelectorAll('#screen [data-action=fa]'); l[Math.min(3, l.length - 1)].scrollIntoView({ block: 'center' }); }"); settle(150); y5 = y()
        page.evaluate("() => { const l = document.querySelectorAll('#screen [data-action=fa]'); l[Math.min(3, l.length - 1)].click(); }"); settle(300)
        if page.query_selector('.sheet .career-block [data-career]'):
            page.evaluate("() => document.querySelector('.sheet .career-block [data-career]').click()"); settle(300)
            ok(screen() == 'career' and page.evaluate("() => document.querySelectorAll('.sheet').length") == 0, f'5: the free agent\'s career link opened {screen()} and left sheets open')
            back(); settle()
        else:
            for _ in range(3): page.evaluate("() => [...document.querySelectorAll('.sheet [data-action=sheet-close]')].pop()?.click()"); settle(150)
        ok(abs(y() - y5) <= 4 and screen() == 'offseason', f'5: free agency moved {y5} -> {y()} on {screen()}')
        notes.append(f'5 free agency→career→back: {y5}→{y()}')
    # 6 Draft room
    go('draft'); settle(); close_all()
    if page.query_selector('#screen [data-career]'): career_and_back('#screen [data-career]', 'draft', '6 draft')
    # 7 More → menu screen → Back
    go('more', '{}', '{ reset: true }'); settle(); close_all(); y7 = scroll_to(300)
    if click_js('#screen [data-action=go][data-screen=achievements]') or click_js('#screen [data-screen=hof]') or click_js('#screen [data-action=go]'):
        settle(); name = screen(); back(); settle()
        ok(screen() == 'more' and abs(y() - y7) <= 4, f'7: back from {name} to {screen()} at {y()} (was {y7})')
        notes.append(f'7 More→{name}→back: {y7}→{y()}')
    # 8 Tabs after scrolling: a new tab starts at the top, and returning by tab does not restore an old position
    go('roster', '{}', '{ reset: true }'); settle(); close_all(); scroll_to(500)
    page.evaluate("() => document.querySelector('[data-action=router-tab][data-screen=league]').click()"); settle()
    ok(y() == 0 and screen() == 'league', f'8: league tab opened at {y()}')
    page.evaluate("() => document.querySelector('[data-action=router-tab][data-screen=roster]').click()"); settle()
    ok(y() == 0, f'8: roster tab restored a stale position {y()}')
    ok(page.evaluate(f"async () => {R}.currentScreen() && document.querySelector('.back') === null"), '8: a tab root shows a Back button')
    notes.append('8 tabs: each tab opens at the top; no stale restore')
    # 9 Modal sheets: open, scroll inside, close: the page does not move
    y9 = scroll_to(400)
    page.evaluate("async () => { const d = await import('/src/ui/dom.js'); d.sheet('<div style=\"height:2400px\">tall</div>', { title: 'Probe' }); }"); settle(200)
    page.evaluate("() => { document.querySelector('.sheet-body').scrollTop = 99999; }"); page.mouse.wheel(0, 1200); settle(200)
    ok(abs(y() - y9) <= 2, f'9: a sheet scrolled the page {y9} -> {y()}')
    page.click('.sheet [data-action=sheet-close]'); settle(150); ok(abs(y() - y9) <= 2, f'9: closing a sheet moved the page {y9} -> {y()}')
    notes.append(f'9 modal: page stayed at {y()}')
    # 10 After a weekly action: a fresh flow at the top, then Back restores again
    go('hq', '{}', '{ reset: true }'); settle(); close_all(); scroll_to(300)
    go('schedule'); settle(); go('hq', '{}', '{ reset: true }'); settle()
    ok(y() == 0, f'10: a reset flow opened HQ at {y()}')
    ok(page.evaluate(f"async () => {R}.currentScreen().name") == 'hq' and not page.query_selector('.topbar .back'), '10: a reset flow kept a back stack')
    go('roster', '{}', '{ reset: true }'); settle(); close_all(); page.evaluate("() => { const l = document.querySelectorAll('#screen [data-action=monster]'); l[Math.min(2, l.length - 1)]?.scrollIntoView({ block: 'center' }); }"); settle(120); y10 = y()
    click_js('#screen [data-action=monster]', 2); settle(); back(); settle()
    ok(abs(y() - y10) <= 4, f'10: Back after a new flow restored {y()} (was {y10})')
    notes.append(f'10 after a week action: fresh flow at 0; later back {y10}→{y()}')
    b.close()
srv.shutdown()
print(json.dumps({'width': W, 'height': H, 'problems': problems, 'errors': errors[:8], 'notes': notes}, indent=1))
sys.exit(1 if problems or errors else 0)
