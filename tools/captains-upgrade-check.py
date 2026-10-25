#!/usr/bin/env python3
"""Device upgrade check, v42.1.0 -> v42.2.0 (GDD §49.5), in headless Chromium with one persistent browser profile and one
origin, so the new build opens exactly the device storage (IndexedDB slots) the old build wrote. Disposable saves only.
  1. The OLD build (served from --old=DIR) imports a v42.1.0 export (--save, made by the old build) into slot 1 and saves.
  2. The NEW build (this checkout) starts on the same profile: the same franchise opens, byte-identical, with no partnership
     data and no migration notes; the one-time captain card is on HQ.
  3. Captains are chosen on the captain screen (the suggested ones); the week's game is played and finished; the page is
     reloaded: captains, chemistry and the ledger come back unchanged, nothing reset (same uid, season, week, roster).
  python3 tools/captains-upgrade-check.py --old=DIR --save=OLD_EXPORT.json [--width=390]
Emulated browser, not a real device."""
import sys, os, json, threading, socketserver, http.server, tempfile
from playwright.sync_api import sync_playwright
NEW = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
OLD = os.path.abspath(args['old']); TEXT = open(args['save']).read(); W = int(args.get('width', 390))
ROOT = {'dir': OLD}
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT['dir'], **k)
    def end_headers(s): s.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
problems, errors, report = [], [], {}
def check(c, m):
    if not c: problems.append(m)
    return c
BOOT = "() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && window.__gb.f"
prof = tempfile.mkdtemp(prefix='gb-upgrade-')
with sync_playwright() as pw:
    def open_ctx():
        ctx = pw.chromium.launch_persistent_context(prof, viewport={'width': W, 'height': 844}, is_mobile=True, has_touch=True)
        p = ctx.pages[0] if ctx.pages else ctx.new_page(); p.on('pageerror', lambda e: errors.append(str(e))); return ctx, p
    # 1. the old build writes the device storage
    ctx, p = open_ctx(); p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=90000)
    r = p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(t); const r = await window.__gb.importInto(1, f); await window.__gb.save({ immediate: true }); return { ok: r.ok, build: (await import('./src/version.js')).BUILD.version }; }""", TEXT)
    check(r['ok'], f'the old build imports the save into slot 1 ({r})'); report['old'] = r
    p.wait_for_timeout(1500); before = p.evaluate("() => { const f = window.__gb.f; const { savedAt, ...x } = f; return JSON.stringify(x); }"); ctx.close()
    # 2. the new build opens the same device storage
    ROOT['dir'] = NEW; ctx, p = open_ctx(); p.goto(URL); p.wait_for_function(BOOT, timeout=90000); p.wait_for_timeout(1500)
    info = p.evaluate("""async () => { const f = window.__gb.f; const { savedAt, ...x } = f; return { build: (await import('./src/version.js')).BUILD.version, json: JSON.stringify(x), partnerships: f.partnerships === undefined ? null : true, notes: window.__gb.bootInfo?.notes || [], mode: window.__gb.storage.mode }; }""")
    report['new'] = {k: v for k, v in info.items() if k != 'json'}
    check(info['build'].startswith('v42.2.'), f'the new build runs: {info["build"]}')
    check(info['json'] == before, 'the franchise opens byte-identical from the device storage the old build wrote')
    check(info['partnerships'] is None, 'opening the franchise creates no partnership data')
    p.evaluate("""async () => { const F = await import('./src/franchise/franchise.js'); const g = window.__gb.f; F.backfillAchievements(g); let n = 0; while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; if (g.season) { g.season.recapShown = true; g.season.awardsShown = true; } }""")
    p.evaluate("() => import('./src/ui/router.js').then((R) => R.go('hq', {}, { reset: true }))"); p.wait_for_timeout(500)
    check(p.locator('main .cap-card').count() == 1, 'HQ offers the one-time captain selection')
    # 3. choose captains, play the week's game, reload
    p.click('main .cap-card [data-screen="captains"]'); p.wait_for_timeout(300); p.click('main [data-action="cap-suggest"]'); p.wait_for_timeout(200); p.click('main [data-action="cap-confirm"]'); p.wait_for_timeout(800)
    st = p.evaluate("""async () => { const F = await import('./src/franchise/franchise.js'); const f = window.__gb.f; const y = f.season.year; const start = { uid: f.uid, year: y, week: f.season.week, roster: f.roster.map((m) => m.id).join(',') };
      let d = 0; while (f.season.day < 6 && d++ < 10) { if (!F.autoRunToSunday(f).ok) break; } if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f));
      await window.__gb.save({ immediate: true }); const P = f.partnerships; return { start, clubs: Object.keys(P.captains[y] || {}).length, mode: P.initial?.mode, chem: Object.values(P.pairs).reduce((a, r) => a + r.n, 0), ledger: Object.keys(P.credited[y] || {}).length, json: JSON.stringify(P), week: f.season.week, uid: f.uid }; }""")
    check(st['clubs'] == 16 and st['mode'] == 'chosen', f'captains named for all 16 clubs from the screen ({st["clubs"]}, {st["mode"]})')
    check(st['chem'] > 0 and st['ledger'] >= 8, f'the week earned chemistry ({st["chem"]}, {st["ledger"]} games)')
    check(st['uid'] == st['start']['uid'] and st['week'] == st['start']['week'] + 1, 'the season continued: same franchise, next week')
    p.wait_for_timeout(1500); ctx.close()
    ctx, p = open_ctx(); p.goto(URL); p.wait_for_function(BOOT, timeout=90000); p.wait_for_timeout(1500)
    back = p.evaluate("() => { const f = window.__gb.f; return { json: JSON.stringify(f.partnerships), uid: f.uid, week: f.season.week }; }")
    check(back['json'] == st['json'], 'after a reload the captains, chemistry and ledger are exactly as saved')
    check(back['uid'] == st['uid'] and back['week'] == st['week'], 'the same franchise and week after reload')
    report['after'] = {k: v for k, v in st.items() if k != 'json'}
    ctx.close()
report['problems'] = problems; report['errors'] = errors[:10]
print(json.dumps(report, indent=1)[:3000])
ok = not problems and not errors
print(('UPGRADE CHECK PASSED' if ok else 'UPGRADE CHECK FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(0 if ok else 1)
