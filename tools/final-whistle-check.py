#!/usr/bin/env python3
"""Final whistle check (v42.11.1): a real Sunday game played to the end in the match screen on a phone (touch), then Continue.
The result sheet must open, the game must be recorded exactly once (both clubs' standings, the results or the playoff results, one
headline filed for this game with its score; the 60-item feed limit holds) even if Continue is tapped again, it must survive a save
and reload, Continue on the sheet returns to headquarters, and there are no page errors. Regular-season and playoff games (the playoff
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
# What a played game leaves behind. The news feed keeps the latest 60 items (franchise.js `news`), so a busy week (an overtime Clash,
# captains, badges) can push an older WIN/LOSS line out of it: count the headlines filed for THIS game's week instead of every
# headline in the feed, and check the persistent records (the club's and the opponent's standings, the results list, the playoff
# results) directly. `wk` and `yr` are the game's week and year, `opp` the opponent's name (taken before the game).
COUNT = """([wk, yr, opp]) => { const f = __gb.f; const rec = (c) => { const r = f.season.records[c]; return r ? r.w + r.l + r.t : null; }; const mine = (x) => x.home === f.club || x.away === f.club;
  const heads = f.news.filter((n) => /^(WIN|LOSS) /.test(n.text));
  return { games: rec(f.club), oppGames: opp ? rec(opp) : null, results: f.season.results.filter(mine).length, leagueResults: f.season.results.length,
    playoff: (f.season.playoffs?.results || []).filter((x) => mine(x) || x.winner === f.club).length,
    headlines: heads.filter((n) => n.week === wk && n.year === yr).length, latest: heads[0]?.text || null, feed: f.news.length,
    result: (() => { const g = [...(f.season.playoffs?.results || []), ...f.season.results].filter(mine).filter((x) => x.week === wk || x.round != null).at(-1); if (!g) return null;
      const home = g.home === f.club, me = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore; return { won: g.winner ? g.winner === f.club : me > them, me, them, opponent: opp }; })() }; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for label, stop, playoff in [('regular season', 3, False), ('playoff', 11, True)]:
        p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        p.on('pageerror', lambda e, l=label: errors.append(f'{l}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        info = p.evaluate(SETUP, [stop, playoff]); notes.append(f'{label}: {json.dumps(info)}')
        if playoff and not info.get('playoff'): notes.append('playoff: the test club missed the playoffs with this seed; skipped'); p.close(); continue
        game = p.evaluate("async () => { const F = await import('/src/franchise/franchise.js'); const f = __gb.f; const m = F.sundayMatchup(f); return [f.season.week, f.season.year, m ? m.opponent : null]; }")
        before = p.evaluate(COUNT, game)
        p.evaluate("async () => { const M = await import('/src/ui/screens/match.js'); M.startSundayGame(__gb.f); }"); p.wait_for_timeout(800)
        for _ in range(80):
            if p.locator('[data-action="finish"]').count(): break
            hit = False
            for sel in ['.sheet [data-action="yes"]', '[data-action="simfinal"]', '[data-action="kickoff"]', '[data-action="otclash"]', '[data-action="enter"][data-v="skip"]', '[data-action="final"]', '[data-action="continue"]']:
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
        after = p.evaluate(COUNT, game)
        delta = {k: after[k] - before[k] for k in ('games', 'oppGames', 'results', 'leagueResults', 'playoff', 'headlines') if isinstance(after[k], int) and isinstance(before[k], int)}
        if playoff: check(delta.get('games') == 0 and delta.get('results') == 0 and delta.get('playoff') == 1, f'{label}: the game is recorded once, as a playoff result (standings untouched) {delta}')
        else: check(delta.get('games') == 1 and delta.get('oppGames') == 1 and delta.get('results') == 1 and delta.get('playoff') == 0, f'{label}: the game is recorded once in the standings (both clubs) and the results {delta}')
        r = after['result'] or {}; head = f"{'WIN' if r.get('won') else 'LOSS'} {r.get('me')}-{r.get('them')} vs {r.get('opponent')}"
        check(before['headlines'] == 0 and after['headlines'] == 1 and (after['latest'] or '').startswith(head), f'{label}: one headline for this game, the newest, with its score ({after["latest"]!r}; expected {head!r}...)')
        check(after['feed'] <= 60, f'{label}: the news feed keeps its 60-item limit ({after["feed"]})')
        # a second tap on anything left behind, or the finish path run twice, must not record it again
        p.evaluate("() => { try { document.querySelector('[data-action=finish]')?.click(); } catch (e) {} }"); p.wait_for_timeout(400)
        again = p.evaluate(COUNT, game); check(again == after, f'{label}: a second Continue records nothing more {again}')
        for _ in range(4): # the result, then a gym's handshake and badge if it was a badge game
            loc = p.locator('.sheet [data-action="shake"], .sheet [data-action="badge-ok"], .sheet .sheet-close, .sheet-head button')
            if not loc.count(): break
            loc.first.tap(); p.wait_for_timeout(600)
        scr = p.evaluate("async () => (await import('/src/ui/router.js')).currentScreen()?.name")
        check(scr in ('hq', 'ceremony', 'scene'), f'{label}: closing the result leaves the match for headquarters or its story scene ({scr})')
        # persistent: the saved franchise, reloaded, carries the same records, results and headline
        p.evaluate("async () => { await __gb.save({ immediate: true }); }"); p.reload()
        p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && window.__gb.f", timeout=60000)
        kept = p.evaluate(COUNT, game); same = {k: (kept[k], after[k]) for k in ('games', 'oppGames', 'results', 'leagueResults', 'playoff', 'headlines', 'latest') if kept[k] != after[k]}
        check(not same, f'{label}: after a save and reload the records, results and headline are unchanged {same or ""}')
        p.close()
print('\n'.join('ok: ' + n for n in notes)); print(json.dumps({'problems': problems, 'errors': errors[:8]}, indent=1))
print('FINAL WHISTLE CHECK ' + ('PASSED' if not problems and not errors else 'FAILED'))
sys.exit(0 if not problems and not errors else 1)
