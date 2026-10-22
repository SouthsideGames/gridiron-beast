#!/usr/bin/env python3
"""Mobile UI walkthrough (GDD §28, test plan §UI): drive the real app in headless Chromium at phone sizes from a brand-new
franchise through onboarding, the creation draft, weeks of play (scouting, Tuesday Beast Clash encounters in Skip / Auto / Play,
training, game plans, Sunday games with the pregame Clash), the end of the season, the offseason (contracts, draft, free agency)
and into Season 2, by clicking what a player would click. After every step it checks for page errors, horizontal overflow and
a stuck screen. This is an emulated browser, not a real device.

  python3 tools/ui-walkthrough.py [--width=390 --height=844] [--weeks=99] [--shots=DIR] [--assist=guided|standard|expert]
Exit 1 on any page error, overflow or dead end.
"""
import sys, threading, socketserver, http.server, json, re, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); SHOTS = args.get('shots'); ASSIST = args.get('assist')
MAX_STEPS = int(args.get('steps', 1400)); TARGET_YEAR = int(args.get('seasons', 2))
NEVER = {'reset', 'retire', 'release', 'releasemon', 'dexreset', 'dexall', 'import-legacy', 'tutreset', 'export', 'restore', 'new', 'fire'}

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]

problems, errors, visited, encounter_modes = [], [], {}, []
clash_wait = [0]; history = []; tips_seen = set(); help_screens = set(); help_opened = set(); tour_done = [False]
HELP_EXPECTED = {'monster', 'league', 'playbook', 'hq', 'scout', 'recruit', 'clash-battle', 'training', 'scoutopp', 'gameplan', 'lineup', 'pregame', 'roster', 'offseason', 'draft', 'draftclass', 'welcome', 'hire'}
def screen_name(page): return page.evaluate("() => (document.querySelector('main.screen')?.className.match(/screen-([a-z0-9-]+)/) || [])[1] || '?'")
def state(page): return page.evaluate("() => { const f = globalThis.__gb?.f; return f ? { year: f.season?.year, week: f.season?.week, day: f.season?.day, finished: !!f.season?.finished, off: !!f.offseason, roster: f.roster?.length, draft: !!f.draft && !f.draft.done } : null }")
def overflow(page): return page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
def visible(page, sel): return page.evaluate("(s) => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null && !e.disabled).length", sel)
def click(page, sel):
    try:
        el = page.query_selector(f"{sel}:not([disabled])")
        if not el or not el.is_visible(): return False
        el.scroll_into_view_if_needed(); el.click(timeout=3000); page.wait_for_timeout(150); return True
    except Exception:
        page.wait_for_timeout(200); return False

def step(page, n):
    sn = screen_name(page)
    # An open sheet first: its primary button, a confirm, or close it.
    if visible(page, '.sheet'):
        if visible(page, '.sheet [data-rel]'): return 'sheet:release' if click(page, '.sheet [data-rel]') else 'sheet:release-failed'  # roster full: choose who leaves
        if visible(page, '.sheet [data-pick]'): problems.append(f'step {n}: a swap-decision sheet appeared (battles must run without decisions)')
        for sel in ['.sheet [data-action="badge-ok"]', '.sheet [data-action="shake"]', '.sheet [data-action="reply"]', '.sheet [data-action="yes"]', '.sheet .btn.primary', '.sheet [data-action="sheet-close"]']:
            if click(page, sel): return f'sheet:{sel}'
        page.keyboard.press('Escape'); page.wait_for_timeout(100)
        if visible(page, '.sheet'): page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
        return 'sheet:closed'
    if sn == 'menu':
        if click(page, '[data-action="continue"]'): return 'continue'
        return 'menu:new' if click(page, '[data-action="new"]') else None
    if sn == 'welcome' and ASSIST and visible(page, f'[data-action="assist-mode"][data-v="{ASSIST}"]:not(.on)'):
        click(page, f'[data-action="assist-mode"][data-v="{ASSIST}"]'); return f'welcome:assist-{ASSIST}'
    if sn == 'hq' and not tour_done[0] and visited.get('hq', 0) >= 6:
        tour_done[0] = True
        for tab, inner in [('roster', '[data-action="monster"]'), ('league', None), ('playbook', None), ('hq', None)]:
            click(page, f'[data-action="router-tab"][data-screen="{tab}"]'); page.wait_for_timeout(250)
            s2 = screen_name(page); visited[s2] = visited.get(s2, 0) + 1
            if visible(page, '.topbar [data-action="assist-help"]'): help_screens.add(s2)
            if overflow(page) > 1: problems.append(f'tour {s2}: horizontal overflow')
            if inner and click(page, inner):
                s3 = screen_name(page); visited[s3] = visited.get(s3, 0) + 1
                if visible(page, '.topbar [data-action="assist-help"]'): help_screens.add(s3)
                if overflow(page) > 1: problems.append(f'tour {s3}: horizontal overflow')
                page.go_back() if False else click(page, '[data-action="router-back"]')
        return 'tour'
    if sn == 'onboarding':
        if page.query_selector('#first'):
            page.fill('#first', 'Test'); page.fill('#last', 'Owner')
        for sel in ['[data-action="club"]', '[data-action="pick"]']:
            if visible(page, sel) and not visible(page, '.choice.selected'): click(page, sel); break
        return 'onboarding:next' if click(page, '[data-action="next"]') else 'onboarding:retry'  # a slow machine: try again (the stuck check still catches a real dead end)
    if sn == 'clash-battle':
        if visible(page, '[data-action="enter"][data-v="watch"]'):  # the one selection phase: reorder, then watch (fastest) or skip
            mode = ['skip', 'watch'][len(encounter_modes) % 2]; encounter_modes.append(mode)
            if visible(page, '[data-action="movedown"][data-i="0"]'): click(page, '[data-action="movedown"][data-i="0"]')
            if len(encounter_modes) % 3 == 0 and visible(page, '[data-action="remove"]'): click(page, '[data-action="remove"]'); click(page, '[data-action="add"]')
            click(page, '[data-action="speed"][data-v="4"]')
            return f'clash:{mode}' if click(page, f'[data-action="enter"][data-v="{mode}"]') else None
        if visible(page, '[data-cl="watch"]') and not visible(page, '[data-action="accept"], [data-action="decline"], [data-action="pitch"], [data-action="choose"], [data-action="kickoff"], [data-action="final"], [data-action="done"]'):
            if encounter_modes and encounter_modes[-1] == 'watch' and clash_wait[0] < 40: clash_wait[0] += 1; page.wait_for_timeout(700); return 'clash:watching'
            clash_wait[0] = 0
            if click(page, '[data-cl="skip"]'): return 'clash:skip-arena'
        clash_wait[0] = 0
        signs = len([m for m in encounter_modes])
        for sel in (['[data-action="accept"]', '[data-action="decline"]'] if signs % 2 else ['[data-action="decline"]', '[data-action="accept"]']) + ['[data-action="pitch"]', '[data-action="choose"][data-v="receive"]', '[data-action="kickoff"]', '[data-action="final"]', '[data-action="done"]']:
            if click(page, sel): return f'clash:{sel}'
    if sn == 'match':
        for sel in ['[data-action="toss"]', '[data-action="simfinal"]', '[data-action="otclash"]', '[data-action="finish"]', '[data-action="continue"]', '[data-action="hq"]']:
            if click(page, sel): return f'match:{sel}'
    if sn == 'draft' and (state(page) or {}).get('roster', 0) >= 38 and visible(page, '[data-action="pass"]'):
        return 'draft:pass' if click(page, '[data-action="pass"]') else None
    if sn in ('draft', 'draftclass') and visible(page, '[data-action="pick"]') and not visible(page, '[data-action="start"]'):
        if click(page, '[data-action="pick"]'): return 'draft:pick'
    manual = (state(page) or {}).get('week', 1) % 2 == 1  # odd weeks by hand (every weekday screen), even weeks by the staff
    if sn == 'scout' and click(page, '[data-action="region"]'): return 'scout:region'
    if sn == 'recruit':
        if click(page, '[data-action="enter"]'): return 'recruit:enter'
        if click(page, '[data-action="skip"]'): return 'recruit:skip'
    if sn == 'training':
        if not page.query_selector('[data-action="focus"].selected, [data-action="focus"].on'): click(page, '[data-action="focus"]')
    if sn == 'scoutopp' and click(page, '[data-action="side"]'): return 'scoutopp:side'
    if sn == 'lineup':
        for q in page.query_selector_all('[data-action="answer"]'):
            pass
        qs = page.evaluate("() => [...new Set([...document.querySelectorAll('[data-action=answer]')].map(e => e.dataset.q))]")
        for q in qs: click(page, f'[data-action="answer"][data-q="{q}"][data-a="0"]')
    if sn == 'hq' and not manual and visible(page, '[data-action="autorun"]'):
        return 'hq:autorun' if click(page, '[data-action="autorun"]') else None
    if sn == 'postseason' and click(page, '[data-action="choose"]'): return 'postseason:choose'
    if sn == 'legend' and click(page, '[data-action="pick"]'): return 'legend:pick'
    if sn == 'offseason':
        if click(page, '[data-action="signall"]'): return 'offseason:signall'
        st0 = state(page)
        if st0 and st0['roster'] < 26 and not st0['draft'] and visible(page, '[data-action="fa"]'): click(page, '[data-action="fa"]'); return 'offseason:fa'
    if sn == 'draft' and not visible(page, '[data-action="pick"]') and visible(page, '[data-action="prospect"]'):
        if click(page, '[data-action="prospect"]'): return 'draft:prospect'
    if sn == 'goals' and click(page, '[data-action="goal"]'): return 'goals:first'
    if sn == 'contracts' and click(page, '[data-action="signall"]'): return 'contracts:signall'
    # Otherwise the screen's main call to action.
    for el in page.query_selector_all('main .btn.primary:not([disabled]), main .btn.big:not([disabled])'):
        a = el.get_attribute('data-action') or ''
        if a in NEVER or not el.is_visible(): continue
        try: label = a or el.inner_text()[:20]; el.scroll_into_view_if_needed(); el.click(timeout=3000); page.wait_for_timeout(150); return f'{sn}:{label}'
        except Exception: page.wait_for_timeout(200); return 'retry'
    return None

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('framenavigated', lambda fr: history.append('NAVIGATED ' + fr.url) if fr == page.main_frame else None)
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    last, same, n = None, 0, 0
    configured = False; start_year = None
    while n < MAX_STEPS:
        n += 1
        st = state(page); sn = screen_name(page); visited[sn] = visited.get(sn, 0) + 1
        if st and not configured:
            page.evaluate("(a) => { const s = __gb.f.settings; s.reducedMotion = true; s.speed = 1.6; s.clash = { mode: 'ask', speed: 4 }; if (a) { s.assist = { ...(s.assist || {}), mode: a }; } __gb.save(); }", ASSIST); configured = True
        if st and start_year is None: start_year = st['year']
        if st and start_year is not None and st['year'] >= start_year + TARGET_YEAR - 1 and TARGET_YEAR > 1 and st['week'] >= 2 and not st['off']: break
        ov = overflow(page)
        tip = page.evaluate("() => document.querySelector('main .tip')?.dataset.tip || (document.querySelector('.sheet-head strong')?.innerText.match(/^(📘|🧭)/) ? 'sheet:' + document.querySelector('.sheet-head strong').innerText : null)")
        if tip: tips_seen.add(tip)
        if tip and ASSIST == 'expert' and (sn != 'welcome' or visible(page, '[data-action="assist-mode"][data-v="expert"].on')): problems.append(f'step {n} {sn}: a tip appeared in Expert ({tip})')
        if visible(page, '.topbar [data-action="assist-help"]'):
            help_screens.add(sn)
            if sn not in help_opened and not visible(page, '.sheet'):
                help_opened.add(sn); click(page, '.topbar [data-action="assist-help"]')
                if not visible(page, '.sheet'): problems.append(f'step {n} {sn}: ? Help did not open')
                else:
                    if overflow(page) > 1: problems.append(f'step {n} {sn}: help sheet overflows')
                    click(page, '.sheet [data-action="sheet-close"]')
        if ov > 1: problems.append(f'step {n} {sn}: horizontal overflow {ov}px')
        if SHOTS and visited[sn] == 1: page.screenshot(path=f'{SHOTS}/{len(visited):02d}-{sn}.png')
        sig = (sn, page.evaluate("() => document.querySelector('main.screen')?.innerText.length"), json.dumps(st))
        try: did = step(page, n)
        except Exception as ex: did = 'error'; problems.append(f'step {n} {sn}: walker error {str(ex)[:200]}'); page.wait_for_timeout(500)
        history.append(f'{sn}:{did}'); del history[:-12]
        if did is None:
            dbg = page.evaluate("() => [...document.querySelectorAll('[data-action]')].filter(e => e.offsetParent).slice(0, 15).map(e => e.dataset.action + ':' + e.innerText.slice(0, 30) + (e.disabled ? '(disabled)' : ''))")
            problems.append(f'step {n}: no way forward on screen "{sn}" (state {st}) {json.dumps(dbg)}'); break
        same = same + 1 if sig == last else 0; last = sig
        if same > 25:
            dbg = page.evaluate("() => ({ sheet: document.querySelector('.sheet')?.innerText.slice(0, 300), buttons: [...document.querySelectorAll('main [data-action]')].filter(e => e.offsetParent).slice(0, 12).map(e => e.dataset.action + ':' + e.innerText.slice(0, 30)) })")
            problems.append(f'step {n}: stuck on "{sn}" (last action {did}, state {st}) {json.dumps(dbg)}'); break
    final = state(page)
    if SHOTS: page.screenshot(path=f'{SHOTS}/zz-final.png')
    b.close()
seen_errors = sorted(set(errors))
for sc in sorted(HELP_EXPECTED - help_screens - {'welcome', 'hire'}):
    if visited.get(sc): problems.append(f'no ? Help on {sc}')
print(json.dumps({'size': f'{W}x{H}', 'steps': n, 'final': final, 'start_year': start_year, 'encounters': encounter_modes, 'assist': ASSIST, 'tips': sorted(tips_seen), 'help_missing': sorted(HELP_EXPECTED - help_screens - {'welcome', 'hire'}), 'help_on': sorted(help_screens), 'screens': visited, 'problems': problems[:20], 'last_actions': history, 'errors': seen_errors[:20]}, indent=1))
sys.exit(1 if problems or seen_errors else 0)
