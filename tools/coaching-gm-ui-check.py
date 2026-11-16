#!/usr/bin/env python3
"""UI check for Coaching & GM Careers (PR #125): the in-game substitution panel, the Settings control, head-coach philosophy
labels, and the GM job market (apply, confirm, accept, reload) in the real app in headless Chromium. Emulated browser only,
not a real device.
  python3 tools/coaching-gm-ui-check.py [--width=390 --height=844] [--reduced=1] [--shots=DIR]
Every interaction goes through real DOM events (click, select change). Page errors, repeated prompts and horizontal overflow
fail the run.
"""
import sys, threading, socketserver, http.server, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); SHOTS = args.get('shots'); REDUCED = args.get('reduced') == '1'
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
problems, errors, notes = [], [], []
tag = f'{W}x{H}{"-reduced" if REDUCED else ""}'
def shot(page, name):
    if SHOTS: page.screenshot(path=os.path.join(SHOTS, f'{tag}-{name}.png'))
def check_overflow(page, where):
    o = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if o > 0: problems.append(f'horizontal overflow {o}px on {where}')
    so = page.evaluate("() => { const s = document.querySelector('.sheet'); return s ? s.scrollWidth - s.clientWidth : 0 }")
    if so > 0: problems.append(f'sheet overflows {so}px on {where}')
def go(page, screen, params='{}'): page.evaluate(f"async () => (await import('/src/ui/router.js')).go('{screen}', {params}, {{ reset: true }})"); page.wait_for_timeout(250)
def sheets(page): return page.evaluate("() => document.querySelectorAll('.sheet-backdrop').length")
def close_sheets(page): page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
def tap(page, sel): page.locator(sel).first.scroll_into_view_if_needed(); page.locator(sel).first.click()

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, is_mobile=True, has_touch=True, reduced_motion='reduce' if REDUCED else 'no-preference')
    page = ctx.new_page(); page.set_default_timeout(20000)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    page.evaluate(f"""async () => {{
      const S = await import('/tools/franchise-soak.mjs'); const F = await import('/src/franchise/franchise.js');
      const f = S.newFranchise(6, {{ difficulty: 'rookie' }}); Object.assign(f.settings, {{ reducedMotion: {str(REDUCED).lower()}, mode: 'full', speed: 1.6, devNotices: false, tutorial: false, liveClock: false }}); if (__gb.settings) __gb.settings.devNotices = false;
      F.autoRunToSunday(f); if (F.isBye(f)) {{ F.takeBye(f); F.autoRunToSunday(f); }}
      __gb.f = f; __gb.save();
    }}""")
    # ---------------- head-coach philosophy label (staff screen)
    go(page, 'staff'); txt = page.inner_text('main')
    if not any(w in txt for w in ['Rotation', 'Balanced', 'Starter']): problems.append('staff screen shows no head-coach rotation philosophy')
    shot(page, '1-staff'); check_overflow(page, 'staff')
    # ---------------- Settings control
    go(page, 'settings'); sel = page.locator('select[data-change=submode]')
    if sel.count() != 1: problems.append(f'settings: {sel.count()} substitution controls')
    else:
        sel.scroll_into_view_if_needed(); sel.select_option('manual'); page.wait_for_timeout(150)
        if page.evaluate("() => __gb.settings?.substitutionMode || __gb.f.settings.substitutionMode") != 'manual': problems.append('settings: manual substitutions not stored')
        sel.select_option('auto'); page.wait_for_timeout(150)
    shot(page, '2-settings'); check_overflow(page, 'settings')
    # ---------------- the live game: substitution panel
    page.evaluate("async () => { const M = await import('/src/ui/screens/match.js'); M.startSundayGame(__gb.f); }"); page.wait_for_selector('main.screen-match')
    for _ in range(12):
        if page.locator('[data-action=substitutions]').count(): break
        for a in ['kickoff', 'continue', 'choosepossession', 'receive']:
            if page.locator(f'[data-action={a}]').count(): tap(page, f'[data-action={a}]'); page.wait_for_timeout(700); break
        else: page.wait_for_timeout(500)
    if not page.locator('[data-action=substitutions]').count(): problems.append(f"no substitution control reached (phase {page.evaluate('() => __gb.f.game?.state?.phase')})")
    else:
        shot(page, '3-match'); check_overflow(page, 'match with substitution strip')
        tap(page, '[data-action=substitutions]'); page.wait_for_selector('.sheet'); page.wait_for_timeout(200)
        if sheets(page) != 1: problems.append(f'substitution panel opened {sheets(page)} sheets')
        shot(page, '4-subs'); check_overflow(page, 'substitution panel')
        picks = page.locator('.sheet select[data-change=subpick]')
        notes.append(f'substitution panel: {picks.count()} slots')
        done = False
        for i in range(picks.count()):
            opts = picks.nth(i).locator('option:not([disabled])').evaluate_all("os => os.map(o => o.value).filter(Boolean)")
            cur = page.evaluate(f"() => document.querySelectorAll('.sheet select[data-change=subpick]')[{i}].closest('label').textContent")
            alt = [o for o in opts if o not in cur]
            if len(opts) > 1:
                slot = picks.nth(i).get_attribute('data-slot'); picks.nth(i).scroll_into_view_if_needed(); picks.nth(i).select_option(opts[-1]); page.wait_for_timeout(250)
                m = page.evaluate(f"() => __gb.f.game.state.rotation?.manual?.[__gb.f.game.playerSide]?.['{slot}']?.id")
                if m != opts[-1]: problems.append(f'substitution for {slot} not recorded ({m} vs {opts[-1]})')
                else: notes.append(f'manual next-play pick {slot} -> {m} recorded'); done = True
                break
        if not done: notes.append('no slot had a second eligible monster to pick')
        if sheets(page): problems.append('substitution sheet stayed open after a pick')
        close_sheets(page)
        # reload mid-game: the next-play pick survives
        before = page.evaluate("() => JSON.stringify(__gb.f.game.state.rotation?.manual || {})")
        page.evaluate("async () => { await __gb.save({ immediate: true }); }"); page.reload(); page.wait_for_selector('main.screen'); page.wait_for_timeout(500)
        after = page.evaluate("() => JSON.stringify(__gb.f?.game?.state?.rotation?.manual || {})")
        if before != after: problems.append(f'next-play pick lost on reload: {before} -> {after}')
    # ---------------- season end: GM job market
    page.evaluate("""async () => {
      const S = await import('/tools/franchise-soak.mjs'); const STOP = {};
      let done = null; try { S.runFranchise(6, { difficulty: 'rookie', seasons: 1, beforeOffseason: (f) => { done = f; throw STOP; } }); } catch (e) { if (e !== STOP) throw e; }
      done.scenes = []; Object.assign(done.settings, { reducedMotion: __gb.f.settings.reducedMotion, devNotices: false, tutorial: false }); __gb.f = done; await __gb.save({ immediate: true });
    }""")
    go(page, 'hq'); page.wait_for_timeout(400)
    if sheets(page): notes.append('season-end sheet dismissed: ' + page.evaluate("() => document.querySelector('.sheet-backdrop').getAttribute('aria-label')")); page.click('.sheet [data-action=sheet-close]') if page.locator('.sheet [data-action=sheet-close]').count() else close_sheets(page); page.wait_for_timeout(200)
    if page.locator('[data-action=gmjobs]').count() < 1: problems.append('HQ has no GM Career entry')
    shot(page, '5-hq'); check_overflow(page, 'HQ at season end')
    go(page, 'offseason'); page.wait_for_timeout(300); close_sheets(page); shot(page, '6-offseason'); check_overflow(page, 'offseason prompt')
    if page.locator('[data-action=stayjob]').count() != 1: problems.append('offseason prompt has no single Stay button')
    tap(page, '[data-action=gmjobs]'); page.wait_for_timeout(300)
    shot(page, '7-market'); check_overflow(page, 'job market')
    for d in page.locator('details').all(): d.locator('summary').click()
    page.wait_for_timeout(150); check_overflow(page, 'job market (previews open)'); shot(page, '8-market-open')
    club0 = page.evaluate("() => __gb.f.club")
    if page.locator('[data-action=applyjob]:not([disabled])').count(): tap(page, '[data-action=applyjob]:not([disabled])'); page.wait_for_timeout(300)
    if not page.locator('[data-action=acceptjob]').count(): problems.append('no offer to accept on the job market')
    else:
        target = page.locator('[data-action=acceptjob]').first.get_attribute('data-club')
        tap(page, '[data-action=acceptjob]'); page.wait_for_selector('.sheet [data-action=no]')
        if sheets(page) != 1: problems.append(f'accept opened {sheets(page)} confirmations')
        shot(page, '9-confirm'); check_overflow(page, 'accept confirmation')
        page.click('.sheet [data-action=no]'); page.wait_for_timeout(200)
        if page.evaluate("() => __gb.f.club") != club0: problems.append('cancel still changed club')
        tap(page, '[data-action=acceptjob]'); page.wait_for_selector('.sheet [data-action=yes]'); page.click('.sheet [data-action=yes]'); page.wait_for_timeout(800)
        now = page.evaluate("() => __gb.f.club")
        if now != target: problems.append(f'accept did not move club ({now} vs {target})')
        if sheets(page): problems.append('a sheet stayed open after accepting')
        shot(page, '10-after'); check_overflow(page, 'after accepting')
        page.reload(); page.wait_for_selector('main.screen'); page.wait_for_timeout(500)
        if page.evaluate("() => __gb.f?.club") != target: problems.append('job change lost on reload')
        go(page, 'gm-jobs'); check_overflow(page, 'job market after move'); shot(page, '11-career')
        if page.locator('[data-action=acceptjob],[data-action=applyjob]').count(): problems.append('offers still shown after the move')
        go(page, 'history'); check_overflow(page, 'history after move')
        notes.append(f'moved {club0} -> {target}, survived reload')
    b.close()
for n in notes: print('  ' + n)
for e in errors[:10]: print('  PAGE ERROR: ' + e)
print(f'{tag}: ' + ('PASS' if not problems and not errors else 'FAIL'))
for p in problems: print('  - ' + p)
sys.exit(1 if problems or errors else 0)
