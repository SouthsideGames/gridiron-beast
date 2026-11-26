#!/usr/bin/env python3
"""Balance audit R-18 (2026-11-26): save and load timing in the browser for disposable franchise exports (from
tools/balance-audit/save-audit.mjs --export=DIR). Emulated, not real devices: a phone profile (390 px, touch, CPU throttled 4x
through the DevTools protocol) and a desktop profile (1280 px, no throttle). For each export: import into slot 2, then the median
of 5 immediate saves (window.__gb.save) and of 3 cold reloads until the franchise is back, plus the stored bytes the store reports.
  python3 tools/balance-audit/save-browser-timing.py DIR [--json=OUT]"""
import sys, os, json, glob, threading, socketserver, http.server, statistics
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = sys.argv[1]; args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[2:] if '=' in a)
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
READY = "() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'"
out, errors = {}, []
files = sorted(glob.glob(os.path.join(D, 'season-*.json')), key=lambda p: int(p.rsplit('-', 1)[1].split('.')[0]))
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, w, mob, throttle in [('phone', 390, True, 4), ('desktop', 1280, False, 1)]:
        for path in files:
            ctx = b.new_context(viewport={'width': w, 'height': 844}, is_mobile=mob, has_touch=mob); p = ctx.new_page()
            p.on('pageerror', lambda e: errors.append(str(e)))
            p.goto(URL); p.wait_for_function(READY, timeout=120000)
            text = open(path).read()
            r = p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(t); const r = await window.__gb.importInto(2, f); return { ok: !!r.ok, reason: r.reason || null }; }""", text)
            cdp = ctx.new_cdp_session(p); cdp.send('Emulation.setCPUThrottlingRate', {'rate': throttle})
            saves = [p.evaluate("async () => { const a = performance.now(); await window.__gb.save({ immediate: true }); return performance.now() - a; }") for _ in range(5)]
            loads = []
            for _ in range(3):
                p.reload(); cdp = ctx.new_cdp_session(p); cdp.send('Emulation.setCPUThrottlingRate', {'rate': throttle})
                t0 = p.evaluate("() => performance.timeOrigin + performance.now()")
                p.wait_for_function("() => window.__gb && window.__gb.f && window.__gb.f.season", timeout=180000)
                loads.append(p.evaluate("(t0) => performance.timeOrigin + performance.now() - t0", t0))
            est = p.evaluate("async () => { try { const e = await navigator.storage.estimate(); return e.usage; } catch { return null; } }")
            key = f"{name}/{os.path.basename(path)}"
            out[key] = {'import': r, 'saveMsMedian': round(statistics.median(saves)), 'saveMs': [round(x) for x in saves], 'loadMsMedian': round(statistics.median(loads)), 'storageUsageKB': round(est / 1024) if est else None}
            print(key, json.dumps(out[key]), flush=True)
            ctx.close()
res = {'tool': 'balance-audit/save-browser-timing', 'emulated': True, 'results': out, 'errors': errors[:10]}
if args.get('json'): open(args['json'], 'w').write(json.dumps(res, indent=1))
print(json.dumps({'errors': errors[:5]}))
