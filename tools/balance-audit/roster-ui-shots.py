#!/usr/bin/env python3
"""Roster UI screenshots (emulated phone/desktop) over a disposable save. Marks one starter as a discovered Apex (disposable save only).
  python3 roster-shots.py SAVE OUTDIR TAG"""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = '/home/claude/gb-impl'; SAVE, OUT, TAG = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(OUT, exist_ok=True)
TEXT = open(SAVE).read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm || {}, { reset: n === 'hq' }))"
OVER = r"""() => { const W = innerWidth, out = []; if (document.documentElement.scrollWidth - W > 1) out.push('page overflow');
  const ctl = [...document.querySelectorAll('main button, main .chip, main .fat-pip, main .ovr')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height; });
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) { const a = ctl[i], b = ctl[j]; if (a.contains(b) || b.contains(a)) continue; const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
    if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1) out.push(`${(a.innerText||a.className).slice(0,16)} / ${(b.innerText||b.className).slice(0,16)}`); }
  return [...new Set(out)].slice(0, 12); }"""
res, errors = {}, []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h, mob in [(390, 844, True), (1280, 900, False)]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=mob, has_touch=mob); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const F = await import('./src/franchise/franchise.js'); const f = Save.importJson(t);
          const { buildDepthChart } = await import('./src/franchise/roster.js'); const ch = buildDepthChart(f.roster, f.lineupManual, f.depth);
          const qb = f.roster.find(m => m.id === ch.QB) || f.roster[0]; qb.dev = { ...(qb.dev||{}), apex: qb.dev?.apex || { tier: 1 } }; (f.discovery ||= {}); (f.discovery.apex ||= {})[qb.id] = { year: f.season?.year || 1, week: 1, via: 'roster', name: qb.name, shown: true };
          const lb = f.roster.find(m => m.position === 'WR' && m.id !== qb.id); if (lb) lb.fatigue = 72;
          const r = await window.__gb.importInto(2, f); const g = window.__gb.f; let n = 0; F.backfillAchievements(g); while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; if (g.season) { g.season.recapShown = true; g.season.awardsShown = true; } await window.__gb.save({ immediate: true }); }""", TEXT)
        p.evaluate(GO, ['roster', {}]); p.wait_for_timeout(600)
        p.screenshot(path=f'{OUT}/{TAG}-lineup-{w}.png', full_page=False); res[f'lineup-{w}'] = p.evaluate(OVER)
        p.click('main [data-action="view"][data-v="depth"]'); p.wait_for_timeout(500)
        p.screenshot(path=f'{OUT}/{TAG}-depth-{w}.png', full_page=False); res[f'depth-{w}'] = p.evaluate(OVER)
        p.evaluate("() => { const el = [...document.querySelectorAll('main .dc-group')].find(g => /WR/.test(g.querySelector('b')?.textContent||'')); el && el.scrollIntoView(); }"); p.wait_for_timeout(200)
        p.screenshot(path=f'{OUT}/{TAG}-depth-wr-{w}.png', full_page=False); res[f'depth-wr-{w}'] = p.evaluate(OVER)
        ctx.close()
print(json.dumps({'overlaps': res, 'errors': errors}, indent=1))
