#!/usr/bin/env python3
"""Captain Partnerships interface check (GDD §27.4B): headless Chromium at 320/360/390/412 px over disposable saves.
  1. One-time initial selection (pre.json, an existing save without partnership data): the HQ card, the captain screen
     (slots, the choosing sheet, "Use suggested captains", Confirm), then all 16 clubs have captains and the card is gone.
  2. In season (season.json): the lineup's partnership strips and "C" badges, the locked captain screen, the post-game
     partnership rows, the Career Profile's Partnerships card, and the release warning for a captain (cancelled).
  3. Offseason (offseason.json): the captain screen in offseason mode saves next season's pick.
  Every view at every width: no horizontal overflow, no overlapping controls, no clipped text, no page errors; Back works.
  python3 tools/captains-ui-check.py --saves=DIR [--shots=DIR] [--json=OUT]     (DIR from tools/captains-saves.mjs)
Emulated browser, not a real device."""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
D = args.get('saves') or os.path.join(ROOT, 'tools', 'out', 'captains'); SHOTS = args.get('shots'); OUTJSON = args.get('json')
SAVES = {k: open(os.path.join(D, f'{k}.json')).read() for k in ['pre', 'season', 'offseason']}
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
problems, errors, report = [], [], {'views': {}}
def check(c, m):
    if not c: problems.append(m)
    return c
LAYOUT = r"""(sel) => { const W = innerWidth; const root = document.querySelector(sel || 'main'); if (!root) return { overflow: ['no ' + sel], overlap: [], clipped: [] }; const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const scrollable = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) return true; } return false; };
  const out = { overflow: [], overlap: [], clipped: [] }; const all = [...root.querySelectorAll('*')].filter(vis);
  if (document.documentElement.scrollWidth - W > 1) out.overflow.push('page +' + (document.documentElement.scrollWidth - W));
  for (const e of all) { const r = e.getBoundingClientRect(); if (r.right > W + 1 && !scrollable(e)) out.overflow.push((e.className || e.tagName) + ''); }
  const ctl = all.filter((e) => e.matches('button, a, select, [data-action]'));
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) { const a = ctl[i], b = ctl[j]; if (a.contains(b) || b.contains(a)) continue; const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > 2 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 2) out.overlap.push(`${(a.innerText || a.className).slice(0, 18)} / ${(b.innerText || b.className).slice(0, 18)}`); }
  for (const e of all.filter((e) => e.matches('.btn, .chip, .cap-slot-name'))) { const cs = getComputedStyle(e); if (e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.overflow !== 'visible') out.clipped.push((e.innerText || '').slice(0, 20)); }
  const small = ctl.filter((e) => e.matches('.cap-slot, .cap-strip, .cap-pick, [data-action^="cap-"]')).filter((e) => e.getBoundingClientRect().height < 40).map((e) => (e.innerText || e.className).slice(0, 18));
  out.small = [...new Set(small)].slice(0, 5);
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 5); return out; }"""
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm || {}, { reset: n === 'hq' }))"
CUR = "() => import('./src/ui/router.js').then((R) => R.currentScreen()?.name)"
def view(p, w, name, sel=None):
    lay = p.evaluate(LAYOUT, sel)
    for k in ['overflow', 'overlap', 'clipped', 'small']:
        check(not lay[k], f'{w} {name}: {k} {lay[k]}')
    report['views'].setdefault(name, []).append(w)
    if SHOTS and w == 360: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, f'{name}.png'), full_page=True)
def load(p, key):
    r = p.evaluate("""async ([t, slot]) => { const Save = await import('./src/franchise/save.js'); const F = await import('./src/franchise/franchise.js'); const f = Save.importJson(t); const r = await window.__gb.importInto(slot, f);
      const g = window.__gb.f; let n = 0; F.backfillAchievements(g); while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; if (g.season) { g.season.recapShown = true; g.season.awardsShown = true; } await window.__gb.save({ immediate: true }); return { ok: r.ok, reason: r.reason || null }; }""", [SAVES[key], {'pre': 1, 'season': 2, 'offseason': 3}[key]])
    check(r['ok'], f'{key}: the disposable save imports ({r})')
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [320, 360, 390, 412]:
        ctx = b.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        # 1. the one-time initial selection
        load(p, 'pre'); p.evaluate(GO, ['hq', {}]); p.wait_for_timeout(400)
        check(p.locator('main .cap-card').count() == 1, f'{w}: HQ offers the one-time captain pick'); view(p, w, 'hq-initial')
        check(p.evaluate("() => window.__gb.f.partnerships === undefined"), f'{w}: opening HQ creates no partnership data')
        p.click('main .cap-card [data-screen="captains"]'); p.wait_for_timeout(300)
        check(p.evaluate(CUR) == 'captains', f'{w}: the card opens the captain screen'); view(p, w, 'captains-initial')
        check(p.locator('main .cap-slot').count() == 4 and 'One-time pick' in p.inner_text('main'), f'{w}: four slots and the one-time explanation')
        p.click('main .cap-slot[data-side="offense"][data-i="1"]'); p.wait_for_timeout(300)
        check(p.locator('.sheet .cap-pick').count() >= 1, f'{w}: the choosing sheet lists eligible partners'); view(p, w, 'captains-sheet', '.sheet')
        p.locator('.sheet .cap-pick').first.click(); p.wait_for_timeout(300)
        p.click('main [data-action="cap-suggest"]'); p.wait_for_timeout(200); check(p.locator('main .chip.accent', has_text='Suggested').count() == 2, f'{w}: "Use suggested captains" fills both sides')
        p.click('main [data-action="cap-confirm"]'); p.wait_for_timeout(500)
        st = p.evaluate("() => { const f = window.__gb.f; const y = f.season.year; return { clubs: Object.keys(f.partnerships?.captains?.[y] || {}).length, mode: f.partnerships?.initial?.mode, screen: null }; }")
        check(st['clubs'] == 16 and st['mode'] == 'chosen', f'{w}: confirming names captains for all 16 clubs ({st})')
        p.evaluate(GO, ['hq', {}]); p.wait_for_timeout(300); check(p.locator('main .cap-card').count() == 0, f'{w}: the one-time card is gone')
        p.evaluate(GO, ['captains', {}]); p.wait_for_timeout(300); check('locked through the playoffs' in p.inner_text('main'), f'{w}: captains are shown locked'); view(p, w, 'captains-locked-new')
        # 2. in season
        load(p, 'season'); p.evaluate(GO, ['hq', {}]); p.wait_for_timeout(300)
        p.evaluate(GO, ['roster', {}]); p.wait_for_timeout(400)
        check(p.locator('main .cap-strip').count() == 1 and p.locator('main .cap-badge').count() >= 1, f'{w}: the lineup shows the partnership strip and captain badges'); view(p, w, 'lineup-offense')
        p.click('main [data-action="side"][data-v="defense"]'); p.wait_for_timeout(300); check(p.locator('main .cap-strip').count() == 1, f'{w}: defense strip'); view(p, w, 'lineup-defense')
        p.click('main .cap-strip'); p.wait_for_timeout(300); check(p.evaluate(CUR) == 'captains', f'{w}: the strip opens the captains'); view(p, w, 'captains-locked')
        p.click('[data-action="router-back"]'); p.wait_for_timeout(300); check(p.evaluate(CUR) == 'roster', f'{w}: Back returns to the lineup')
        p.click('main [data-action="view"][data-v="depth"]'); p.wait_for_timeout(300); view(p, w, 'depth')
        p.evaluate("async () => { const { sheet } = await import('./src/ui/dom.js'); const U = await import('./src/ui/captains-ui.js'); const f = window.__gb.f; window.__capClose = sheet(U.postGameHtml(f, f.lastGame?.partnerships || []) || '<p>none</p>', { title: 'Final' }).close; }"); p.wait_for_timeout(300)
        check(p.locator('.sheet .cap-post-row').count() >= 1, f'{w}: the post-game partnership rows'); view(p, w, 'postgame', '.sheet')
        p.evaluate("() => window.__capClose()"); p.wait_for_timeout(300)
        cap = p.evaluate("() => { const f = window.__gb.f; const e = f.partnerships.captains[f.season.year][f.club]; return e.offense.a; }")
        p.evaluate(GO, ['career', {'id': cap}]); p.wait_for_timeout(400)
        check(p.locator('main .cap-hist').count() >= 1, f'{w}: the Career Profile shows Partnerships'); view(p, w, 'career-partnerships')
        before = p.evaluate("() => JSON.stringify(window.__gb.f)")
        p.evaluate(GO, ['monster', {'id': cap}]); p.wait_for_timeout(400); p.click('main [data-action="release"]'); p.wait_for_timeout(300)
        check('team captain' in p.inner_text('.sheet'), f'{w}: releasing a captain warns first'); view(p, w, 'release-warning', '.sheet')
        p.locator('.sheet button', has_text='Cancel').first.click(); p.wait_for_timeout(200)
        check(p.evaluate("() => JSON.stringify(window.__gb.f)") == before, f'{w}: viewing and a cancelled release changed nothing')
        # 3. offseason
        load(p, 'offseason'); p.evaluate(GO, ['hq', {}]); p.wait_for_timeout(300)
        if not check(p.locator('main .cap-card').count() == 1, f'{w}: HQ offers next season\'s captains ({p.evaluate(CUR)}: {p.inner_text("main")[:160]!r})'): ctx.close(); continue
        p.click('main .cap-card [data-screen="captains"]'); p.wait_for_timeout(300); view(p, w, 'captains-offseason')
        p.click('main [data-action="cap-confirm"]'); p.wait_for_timeout(400)
        pk = p.evaluate("() => { const f = window.__gb.f; return f.partnerships?.pick?.year === f.season.year + 1 && f.partnerships.pick.offense.length === 2; }")
        check(pk, f'{w}: the offseason pick is saved for next season')
        ctx.close()
report['problems'] = problems; report['errors'] = errors[:10]
print(json.dumps(report, indent=1, ensure_ascii=False)[:3000])
if OUTJSON: json.dump(report, open(OUTJSON, 'w'), indent=1)
ok = not problems and not errors
print(('CAPTAINS UI CHECK PASSED' if ok else 'CAPTAINS UI CHECK FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(0 if ok else 1)
