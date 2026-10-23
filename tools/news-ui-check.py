#!/usr/bin/env python3
"""League News and Clash lineup UI check (GDD §39, v38.1): headless Chromium at a phone size. Plays a season headless in the
page, opens HQ and checks the League News panel (headlines, scoreboard, the folded club notes, the full sheet), then opens a
pregame Clash setup and removes every monster: the lineup must stay empty (no refill) until a monster is added or Auto lineup
is tapped. No page errors, no horizontal overflow. Emulated browser, not a real device.
  python3 tools/news-ui-check.py [--width=390 --height=844] [--shots=DIR]
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
def shot(page, name):
    if SHOTS: page.screenshot(path=os.path.join(SHOTS, f'{W}-{name}.png'), full_page=False)
def overflow(page, where):
    if page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth") > 0: problems.append(f'horizontal overflow on {where}')
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    # A season played to week 6 (mid-season: scores, headlines, the award race), then HQ.
    info = page.evaluate("""async () => {
      const S = await import('/tools/franchise-soak.mjs'); const F = await import('/src/franchise/franchise.js');
      const { f } = S.runFranchise(9, { difficulty: 'pro', seasons: 1, stopWeek: 6 });
      Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: true }); f.scenes = []; f.achievementsBackfilled = true; __gb.f = f; __gb.save();
      return { week: f.season.week, items: (f.leagueNews || []).length, club: (f.news || []).length };
    }""")
    notes.append(f"week {info['week']}: {info['items']} league news items, {info['club']} club notes")
    page.evaluate("async () => (await import('/src/ui/router.js')).go('hq', {}, { reset: true })"); page.wait_for_timeout(500)
    page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
    p = page.evaluate("() => { const n = document.querySelector('.league-news'); return n ? { games: n.querySelectorAll('.ln-game').length, heads: n.querySelectorAll('.ln-head').length, mine: n.querySelectorAll('.ln-game.mine').length, race: n.querySelectorAll('.ln-race-row').length, clubOpen: n.querySelector('details.clublog')?.open, levelups: [...n.querySelectorAll('.ln-head, .news li')].filter(x => / reached level /.test(x.textContent)).length } : null }")
    if not p: problems.append('no League News panel on HQ')
    else:
        notes.append(f"HQ panel: {p}")
        if p['games'] < 1: problems.append('no scoreboard on HQ')
        if p['clubOpen']: problems.append('club notes should start folded')
        if p['levelups']: problems.append('level-up lines in the news')
    if not p:
        notes.append('screen: ' + page.evaluate("() => (document.querySelector('main.screen')?.innerText || '').slice(0, 300)"))
        print(json.dumps({'problems': problems, 'errors': errors[:6], 'notes': notes}, indent=1)); sys.exit(1)
    page.evaluate("() => document.querySelector('.league-news').scrollIntoView({ block: 'start' })"); page.wait_for_timeout(300); shot(page, 'news-1-hq'); overflow(page, 'HQ')
    sizes = page.evaluate("() => [...document.querySelectorAll('.league-news button')].map(b => Math.round(b.getBoundingClientRect().height))")
    if any(h < 30 for h in sizes): problems.append(f'small touch targets {sizes}')
    page.click('.league-news [data-action=leaguenews]'); page.wait_for_timeout(400)
    weeks = page.evaluate("() => document.querySelectorAll('.ln-week').length")
    if weeks < 2: problems.append(f'the full sheet shows {weeks} weeks')
    notes.append(f'sheet weeks: {weeks}'); shot(page, 'news-2-sheet'); overflow(page, 'the news sheet')
    page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
    page.click('.league-news details.clublog summary'); page.wait_for_timeout(150)
    if not page.evaluate("() => document.querySelector('details.clublog').open"): problems.append('club notes do not open')
    shot(page, 'news-3-club')
    # Clash lineup: a fresh club on Sunday, the pregame Clash setup; remove every monster.
    ok = page.evaluate("""async () => {
      const F = await import('/src/franchise/franchise.js');
      const f = F.createFranchise({ owner: { first: 'U', last: 'I', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 12 });
      F.hireDefaultStaff(f); while (F.creationDraftPending(f) && F.onTheClock(f) === f.club) F.passDraftPick(f); while (F.creationDraftPending(f)) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
      Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: true }); f.season.day = 6; __gb.f = f; __gb.save();
      return F.pregamePreview(f);
    }""")
    if not ok.get('ok'): problems.append(f"no pregame Clash to set up: {ok.get('reason')}")
    else:
        page.evaluate("async () => (await import('/src/ui/router.js')).go('clash-battle', { kind: 'pregame' })"); page.wait_for_timeout(400)
        page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
        n0 = page.evaluate("() => document.querySelectorAll('.cl-setup:not(.theirs) [data-action=remove]').length")
        for _ in range(n0):
            page.click('.cl-setup:not(.theirs) [data-action=remove] >> nth=0'); page.wait_for_timeout(120)
        n1 = page.evaluate("() => document.querySelectorAll('.cl-setup:not(.theirs) [data-action=remove]').length")
        enter = page.evaluate("() => [...document.querySelectorAll('[data-action=enter]')].every(b => b.disabled)")
        notes.append(f'lineup {n0} -> {n1} after removing all; enter disabled: {enter}')
        if n1 != 0: problems.append(f'lineup refilled to {n1} after removing every monster')
        if not enter: problems.append('Enter is not disabled with an empty lineup')
        shot(page, 'clash-1-empty'); overflow(page, 'the Clash setup')
        page.click('.cl-setup [data-action=add] >> nth=0'); page.wait_for_timeout(120)
        n2 = page.evaluate("() => document.querySelectorAll('.cl-setup:not(.theirs) [data-action=remove]').length")
        if n2 != 1: problems.append(f'adding one monster gave {n2}')
        page.click('.cl-setup [data-action=autol]'); page.wait_for_timeout(120)
        n3 = page.evaluate("() => document.querySelectorAll('.cl-setup:not(.theirs) [data-action=remove]').length")
        if n3 != n0: problems.append(f'Auto lineup gave {n3}, expected {n0}')
        notes.append(f'add one -> {n2}; auto lineup -> {n3}'); shot(page, 'clash-2-auto')
    b.close()
srv.shutdown()
print(json.dumps({'width': W, 'height': H, 'problems': problems, 'errors': errors[:6], 'notes': notes}, indent=1))
sys.exit(1 if problems or errors else 0)
