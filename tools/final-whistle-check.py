#!/usr/bin/env python3
"""Final whistle check (v42.11.1): a real Sunday game played to the end in the match screen on a phone (touch), then Continue.
The result sheet must open, the game must be recorded exactly once (standings, results, news) even if Continue is tapped again,
Continue on the sheet returns to headquarters, and there are no page errors. Regular-season and playoff games (the playoff
banner must not call a conference game the Beast Bowl).
  python3 tools/final-whistle-check.py [--shots=DIR]"""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[1:]); SHOTS = args.get('shots')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'; problems, errors, notes = [], [], []
def check(c, m):
    (notes if c else problems).append(m); return c
SETUP = """async ([stopWeek, playoff]) => { const S = await import('/tools/franchise-soak.mjs'); const F = await import('/src/franchise/franchise.js');
  const { f } = S.runFranchise(playoff ? 1 : 3, { difficulty: 'rookie', seasons: 1, stopWeek });
  Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: true, mode: 'auto' }); f.scenes = []; f.achievementsBackfilled = true;
  if (playoff) { let g = 0; while (!F.playoffFixture(f) && g++ < 40) { if (F.inPlayoffs(f) && !F.playoffFixture(f)) break; const ar = F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } if (F.playoffFixture(f)) break; const m = F.sundayMatchup(f); if (!m) break; const game = F.simulatePlayerGame(f); F.finishSunday(f, game); } }
  F.autoRunToSunday(f); let guard = 0; while (F.isBye(f) && guard++ < 3) { F.takeBye(f); F.autoRunToSunday(f); }
  __gb.f = f; await __gb.save({ immediate: true });
  return { week: f.season.week, day: f.season.day, playoff: !!F.playoffFixture(f), tag: F.sundayMatchup(f)?.tag || null }; }"""
COUNT = "() => { const f = __gb.f; const r = f.season.records[f.club]; return { games: r.w + r.l + r.t, results: f.season.results.length, playoff: (f.season.playoffs?.results || []).filter((x) => x.home === f.club || x.away === f.club || x.winner === f.club).length, news: f.news.filter((n) => /^(WIN|LOSS) /.test(n.text)).length }; }"
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for label, stop, playoff in [('regular season', 3, False), ('playoff', 11, True)]:
        p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        p.on('pageerror', lambda e, l=label: errors.append(f'{l}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        info = p.evaluate(SETUP, [stop, playoff]); notes.append(f'{label}: {json.dumps(info)}')
        if playoff and not info.get('playoff'): notes.append('playoff: the test club missed the playoffs with this seed; skipped'); p.close(); continue
        before = p.evaluate(COUNT)
        p.evaluate("async () => { const M = await import('/src/ui/screens/match.js'); M.startSundayGame(__gb.f); }"); p.wait_for_timeout(800)
        for _ in range(80):
            if p.locator('[data-action="finish"]').count(): break
            hit = False
            for sel in ['.sheet [data-action="yes"]', '[data-action="simfinal"]', '[data-action="kickoff"]', '[data-action="otclash"]', '[data-action="continue"]']:
                loc = p.locator(sel)
                if loc.count() and loc.first.is_visible():
                    try: loc.first.tap(timeout=2000); hit = True; break
                    except Exception: pass
            p.wait_for_timeout(300 if hit else 500)
        if not check(p.locator('[data-action="finish"]').count() == 1, f'{label}: the game reaches the final whistle'): p.close(); continue
        if SHOTS: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, f'final-{label[:3]}-1.png'))
        p.locator('[data-action="finish"]').tap(); p.wait_for_timeout(800)
        sheet = p.evaluate("() => document.querySelector('.sheet')?.innerText || ''")
        check(bool(sheet) and ('Final' in sheet), f'{label}: Continue opens the result sheet ({sheet[:60]!r})')
        if playoff: check('BEAST BOWL' not in sheet or info.get('tag') == 'Beast Bowl', f'{label}: a {info.get("tag")} result is not called the Beast Bowl')
        if SHOTS: p.screenshot(path=os.path.join(SHOTS, f'final-{label[:3]}-2.png'))
        after = p.evaluate(COUNT)
        delta = {k: after[k] - before[k] for k in after}
        check(delta['news'] == 1 and (delta['games'] + delta['playoff']) == 1, f'{label}: the game is recorded once {delta}')
        # a second tap on anything left behind, or the finish path run twice, must not record it again
        p.evaluate("() => { try { document.querySelector('[data-action=finish]')?.click(); } catch (e) {} }"); p.wait_for_timeout(400)
        again = p.evaluate(COUNT); check(again == after, f'{label}: a second Continue records nothing more {again}')
        for _ in range(4): # the result, then a gym's handshake and badge if it was a badge game
            loc = p.locator('.sheet [data-action="shake"], .sheet [data-action="badge-ok"], .sheet .sheet-close, .sheet-head button')
            if not loc.count(): break
            loc.first.tap(); p.wait_for_timeout(600)
        scr = p.evaluate("async () => (await import('/src/ui/router.js')).currentScreen()?.name")
        check(scr in ('hq', 'ceremony', 'scene'), f'{label}: closing the result leaves the match for headquarters or its story scene ({scr})')
        p.close()
print('\n'.join('ok: ' + n for n in notes)); print(json.dumps({'problems': problems, 'errors': errors[:8]}, indent=1))
print('FINAL WHISTLE CHECK ' + ('PASSED' if not problems and not errors else 'FAILED'))
sys.exit(0 if not problems and not errors else 1)
