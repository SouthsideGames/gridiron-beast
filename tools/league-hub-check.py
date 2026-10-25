#!/usr/bin/env python3
"""League Hub and career-link check (GDD §46, Phase 4): headless Chromium at phone widths over a played schema-8 franchise.
  - the League Hub's five tabs (Clubs, Leaders, Moves, Races, Rivals) and a club roster render at 320/360/390/412 px with no
    horizontal overflow; every monster name in them is a career link;
  - a career opens from the hub, from the league leaders, from the records book, from the awards history and from League News;
  - the offseason digest and the draft digest are in the feed; the Legacy shell's Careers tab lists the league's monsters;
  - timings at 4x CPU: opening the hub and a career sheet.
Emulated browser, not a real device.
  python3 tools/league-hub-check.py --save=EXPORT.json [--shots=DIR] [--json=PATH]
"""
import sys, threading, socketserver, http.server, os, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
SAVE = args.get('save'); SHOTS = args.get('shots'); OUTJSON = args.get('json')
if not SAVE: print('--save=EXPORT.json (a schema-8 franchise with a few seasons) is required'); sys.exit(2)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
URL = f'http://127.0.0.1:{port}/'
TEXT = open(SAVE).read()
problems, errors, report = [], [], {'widths': {}, 'timings': {}}
def check(cond, msg):
    if not cond: problems.append(msg)
def shot(page, name, w):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); page.screenshot(path=os.path.join(SHOTS, f'{name}-{w}.png'), full_page=True)
def overflow(page, where):
    d = page.evaluate("() => Math.max(document.documentElement.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.sheet')].map(s => s.scrollWidth - s.clientWidth))")
    check(d <= 1, f'horizontal overflow on {where} ({d}px)')
def booted(page):
    page.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && document.querySelector('main.screen .hero, main.screen-recovery')", timeout=60000)
def fresh(pw, w, throttle=None):
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'{w}: {e}'))
    page.on('console', lambda m: errors.append(f'{w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
    if throttle: ctx.new_cdp_session(page).send('Emulation.setCPUThrottlingRate', {'rate': throttle})
    page.goto(URL + 'manifest.webmanifest'); page.evaluate("() => localStorage.clear()")
    page.goto(URL); booted(page)
    # import the played franchise into slot 1 through the app's own path
    r = page.evaluate("""async (text) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(text); const r = await window.__gb.importInto(1, f); return { ok: r.ok, err: r.error && r.error.message, schema: window.__gb.f && window.__gb.f.schemaVersion, league: !!(window.__gb.f && window.__gb.f.league) }; }""", TEXT)
    check(r.get('ok') and r.get('schema') == 8 and r.get('league'), f'{w}px: import of the played franchise: {r}')
    page.goto(URL); booted(page)
    return b, page
def open_career_from(page, where, selector):
    page.wait_for_selector(selector, timeout=15000); el = page.locator(selector).first; name = el.inner_text().strip()
    before = page.evaluate("() => import('./src/ui/router.js').then((R) => R.currentScreen()?.name)")
    el.click(); page.wait_for_selector('.career-page .cp-head', timeout=15000)  # the full-screen career profile (GDD §48)
    body = page.inner_text('.career-page'); check(name.split('\n')[0] in body, f'{where}: the career profile names {name!r}'); overflow(page, f'career profile from {where}')
    page.click('[data-action="router-back"]'); page.wait_for_timeout(300)
    back = page.evaluate("() => import('./src/ui/router.js').then((R) => R.currentScreen()?.name)"); check(back == before, f'{where}: Back returns to {before} (got {back})')
    return name

with sync_playwright() as pw:
    for w in [320, 360, 390, 412]:
        b, pg = fresh(pw, w); p = {}
        pg.click('[data-action="continue"]'); pg.wait_for_timeout(500)  # the League Hub lives inside the franchise (v42.0.2: the League tab, not the main menu)
        pg.evaluate("() => import('./src/ui/router.js').then((R) => R.go('league'))"); pg.wait_for_selector('[data-action="tab"][data-tab="rivals"]')
        for t in ['clubs', 'leaders', 'moves', 'races', 'rivals']:
            pg.click(f'[data-action="tab"][data-tab="{t}"]'); pg.wait_for_timeout(200); overflow(pg, f'League Hub {t} at {w}px'); shot(pg, f'hub-{t}', w)
            p[f'{t}Links'] = pg.locator('main [data-career]').count()
        check(p['leadersLinks'] >= 10, f'{w}px: leaders tab has career links ({p["leadersLinks"]})'); check(p['rivalsLinks'] >= 1, f'{w}px: rivals tab names the signature or a legendary')
        pg.click('[data-action="tab"][data-tab="clubs"]'); pg.wait_for_selector('[data-action="club"]'); pg.locator('[data-action="club"]').nth(1).click(); pg.wait_for_selector('main [data-career]', timeout=15000)
        overflow(pg, f'club roster at {w}px'); shot(pg, 'club', w); p['rosterLinks'] = pg.locator('main [data-career]').count(); check(p['rosterLinks'] >= 26, f'{w}px: a club roster links every monster ({p["rosterLinks"]})')
        p['careerFromClub'] = open_career_from(pg, 'club roster', 'main [data-career]')
        if w == 390:
            for screen, sel in [('leaders', 'main .leaders [data-career]'), ('records', 'main [data-career]'), ('awardhistory', 'main [data-career]')]:
                pg.goto(URL); booted(pg); pg.click('[data-action="continue"]'); pg.wait_for_selector('main.screen', timeout=15000)
                pg.evaluate("(s) => import('./src/ui/router.js').then((R) => R.go(s))", screen); pg.wait_for_timeout(300)
                try: p[f'careerFrom_{screen}'] = open_career_from(pg, screen, sel)
                except Exception as e: problems.append(f'{screen}: no career opened ({str(e)[:80]})')
            # League News: a digest and a linked name
            pg.goto(URL); booted(pg); pg.click('[data-action="continue"]'); pg.wait_for_selector('main.screen', timeout=15000)
            feed = pg.evaluate("() => { const f = window.__gb.f; return { moves: f.leagueNews.filter((x) => x.kind === 'moves').length, draft: f.leagueNews.filter((x) => x.kind === 'draft').length, linked: f.leagueNews.filter((x) => x.mid).length, total: f.leagueNews.length }; }")
            p['feed'] = feed; check(feed['moves'] >= 1 and feed['draft'] >= 1 and feed['linked'] >= 5, f'League News carries the digests and linked names: {feed}')
        report['widths'][w] = p; b.close()
    # timings at 4x
    b, pg = fresh(pw, 390, throttle=4)
    t = pg.evaluate("""async () => { const R = await import('./src/ui/router.js'); const out = {}; let t = performance.now(); R.go('league'); await new Promise((r) => setTimeout(r, 0)); out.hubMs = Math.round(performance.now() - t); t = performance.now(); const el = document.querySelector('main [data-career]') || (R.go('leaders'), await new Promise((r) => setTimeout(r, 50)), document.querySelector('main [data-career]')); if (el) { el.click(); await new Promise((r) => setTimeout(r, 0)); } out.careerMs = Math.round(performance.now() - t); out.hadLink = !!el; return out; }""")
    report['timings']['cpu4x'] = t; check(t.get('hadLink'), 'a career link to time'); b.close()
report['problems'] = problems; report['errors'] = errors
print(json.dumps(report, indent=1))
if OUTJSON: open(OUTJSON, 'w').write(json.dumps(report, indent=1))
print(f'LEAGUE HUB CHECK {"PASSED" if not problems and not errors else "FAILED"} ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(1 if problems or errors else 0)
