#!/usr/bin/env python3
"""Cache upgrade check (v42.4.1): a phone that cached the previous release opens the new one. Headless Chromium against a
local server that lets the page be rechecked but caches every game file for a day (as aggressive as a phone may be). The browser loads OLD,
the server switches to NEW on the same URLs, the page is reloaded; the check reports which release's modules actually ran.
  1. NEW without its import map (the v42.4.0 scheme): shows old cached modules mixed in (the problem; informational);
  2. NEW as stamped: every module must be the new release;
  3. NEW whose import map the browser cannot use: the backstop must refresh the files and land on the new release.
  python3 tools/cache-upgrade-check.py --old=DIR --new=DIR"""
import sys, os, json, re, threading, socketserver, http.server, shutil, tempfile
from playwright.sync_api import sync_playwright
args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[1:])
state = {'root': None}
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(s, p): return os.path.join(state['root'], p.split('?')[0].lstrip('/'))
    def end_headers(s): s.send_header('Cache-Control', 'no-cache' if s.path.split('?')[0].endswith('.html') else 'max-age=86400'); super().end_headers() # the page is rechecked; the game files are cached for a day
    def do_GET(s):
        if 'If-Modified-Since' in s.headers: del s.headers['If-Modified-Since'] # never 304: a changed file is always sent
        super().do_GET()
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/index.html'
def variant(src, mode):
    d = tempfile.mkdtemp(); shutil.copytree(src, d, dirs_exist_ok=True, copy_function=shutil.copy); p = os.path.join(d, 'index.html'); h = open(p).read()
    if mode == 'nomap': h = re.sub(r'<script type="importmap" id="gb-modules">[\s\S]*?</script>\n?', '', h)
    if mode == 'brokenmap': h = h.replace('type="importmap" id="gb-modules"', 'type="application/json" id="gb-modules"') # the list is there, the browser does not apply it
    open(p, 'w').write(h); return d
PROBE = """async () => { const v = (await import('./src/version.js')).BUILD.version; const menu = await (await fetch('./src/ui/screens/menu.js', { cache: 'force-cache' })).text();
  return { page: document.querySelector('script[src*="main.js"]')?.getAttribute('src'), hasMap: !!document.getElementById('gb-modules'), files: globalThis.__gbFiles || null, version: v, settingsHasSound: !!document.querySelector('[data-change="evosound"]'), menuInCache: menu.includes('evosound') }; }"""
def run(newmode):
    with sync_playwright() as pw:
        b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); p = ctx.new_page()
        state['root'] = variant(args['old'], 'asis'); p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage", timeout=60000)
        old = p.evaluate("async () => (await import('./src/version.js')).BUILD.version")
        state['root'] = variant(args['new'], newmode); p.reload(); p.wait_for_timeout(1500)
        try: p.wait_for_function("() => window.__gb && window.__gb.storage", timeout=30000)
        except Exception: pass
        p.wait_for_timeout(800); p.evaluate("() => import('./src/ui/router.js').then((R) => R.go('settings', {}))"); p.wait_for_timeout(500)
        r = p.evaluate(PROBE); r['old'] = old; b.close(); return r
out = {'1 without the map (v42.4.0 scheme)': run('nomap'), '2 stamped (v42.4.1)': run('asis'), '3 map not applied (backstop)': run('brokenmap')}
print(json.dumps(out, indent=1))
ok = all(out[k]['settingsHasSound'] and out[k]['version'].startswith('v42.4.1') for k in ['2 stamped (v42.4.1)', '3 map not applied (backstop)'])
print('CACHE UPGRADE CHECK ' + ('PASSED' if ok else 'FAILED')); sys.exit(0 if ok else 1)
