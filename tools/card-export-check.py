#!/usr/bin/env python3
"""Career-card export check (GDD §41.6): what the game says against what actually happened.
  A. A normal page: Download for both layouts fires a real download; the files are PNGs of the right size; the game says
     "Download requested", never "Saved". Copy image (clipboard permission granted) reports a copy only when it succeeded.
  B. A sandboxed iframe without allow-downloads (how an embedded artifact preview runs): Download produces no file; the game
     says the preview may block downloads and how to save the card instead. Copy, blocked there, says so.
Headless Chromium has no system share sheet, so Share is hidden here (it appears where navigator.canShare accepts files).
Not a real device.
  python3 tools/card-export-check.py [--width=390 --height=844] [--out=DIR]
"""
import sys, threading, socketserver, http.server, os, json, struct
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); OUT = args.get('out')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
base = f'http://127.0.0.1:{port}/'
problems, errors, notes = [], [], []
SETUP = """async () => { const S = await import('/tools/franchise-soak.mjs'); const { f } = S.runFranchise(1, { difficulty: 'rookie', seasons: 2 });
  Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: true }); f.scenes = []; f.achievementsBackfilled = true; __gb.f = f; __gb.save();
  const m = f.roster.slice().sort((a, b) => (b.stats?.career?.reg?.games || 0) - (a.stats?.career?.reg?.games || 0))[0];
  (await import('/src/ui/router.js')).go('monster', { id: m.id }); return m.name; }"""
def png(path):
    b = open(path, 'rb').read(); return (struct.unpack('>II', b[16:24]) if b[:8] == b'\x89PNG\r\n\x1a\n' else None), len(b)
def open_card(fr):
    fr.wait_for_timeout(500); fr.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
    fr.evaluate("() => { const b = document.querySelector('#timeline [data-action=cc-open]'); b.scrollIntoView({ block: 'center' }); b.click(); }")
    fr.wait_for_selector('.cc-img', timeout=10000); fr.wait_for_timeout(300)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    # A: a normal page
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=base[:-1])
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base); page.wait_for_selector('main.screen'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    name = page.evaluate(SETUP); open_card(page)
    sup = page.evaluate("async () => (await import('/src/ui/career-card.js')).exportSupport()"); notes.append(f'A support: {sup}')
    if page.query_selector('[data-cc=share]'): notes.append('A: Share offered')
    else: notes.append('A: Share hidden (no file sharing in headless Chromium)')
    for fmt, size in [('portrait', (1080, 1350)), ('square', (1080, 1080))]:
        page.click(f'[data-cc-format={fmt}]'); page.wait_for_function(f"() => document.querySelector('.cc-preview')?.dataset.format === '{fmt}' && !document.querySelector('[data-cc=save]').disabled", timeout=10000)
        with page.expect_download(timeout=8000) as dl: page.click('[data-cc=save]')
        p = dl.value.path(); dims, n = png(p); msg = page.evaluate("() => document.querySelector('.cc-status').textContent")
        if OUT: dl.value.save_as(os.path.join(OUT, dl.value.suggested_filename))
        notes.append(f'A {fmt}: downloaded {dl.value.suggested_filename} {dims} {n // 1024} KB; the game said: "{msg}"')
        if dims != size: problems.append(f'A {fmt}: file is {dims}, expected {size}')
        if 'Saved' in msg or 'requested' not in msg: problems.append(f'A {fmt}: wording "{msg}"')
    page.click('[data-cc=copy]'); page.wait_for_timeout(600)
    msg = page.evaluate("() => document.querySelector('.cc-status').textContent"); typ = page.evaluate("async () => { try { const it = await navigator.clipboard.read(); return it[0]?.types || []; } catch (e) { return 'unreadable: ' + e.name; } }")
    notes.append(f'A copy: "{msg}"; clipboard holds {typ}')
    if 'copied' in msg and not (isinstance(typ, list) and 'image/png' in typ): problems.append('A: said copied but the clipboard has no image')
    ctx.close()
    # B: inside a sandboxed iframe without allow-downloads
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append('B: ' + str(e)))
    downloads = []; page.on('download', lambda d: downloads.append(d.suggested_filename))
    page.goto(base + 'manifest.webmanifest')  # same origin, then host the game in a sandboxed frame
    page.set_content(f'<iframe id="g" src="{base}" sandbox="allow-scripts allow-same-origin allow-modals" style="width:{W}px;height:{H}px;border:0"></iframe>')
    fr = page.frame_locator('#g'); frame = page.frames[1]; frame.wait_for_selector('main.screen', timeout=15000)
    frame.evaluate('() => localStorage.clear()'); frame.evaluate(SETUP); open_card(frame)
    sup = frame.evaluate("async () => (await import('/src/ui/career-card.js')).exportSupport()"); notes.append(f'B support: {sup}')
    if not sup['embedded']: problems.append('B: the frame did not know it was embedded')
    frame.evaluate("() => document.querySelector('[data-cc=save]').click()"); page.wait_for_timeout(2500)
    msg = frame.evaluate("() => document.querySelector('.cc-status').textContent")
    notes.append(f'B download: {len(downloads)} file(s) arrived; the game said: "{msg}"')
    if downloads: notes.append('B: this Chromium allowed the download from the sandboxed frame')
    if 'Saved' in msg or 'may block' not in msg: problems.append(f'B: wording "{msg}"')
    if frame.query_selector('[data-cc=copy]'):
        frame.evaluate("() => document.querySelector('[data-cc=copy]').click()"); page.wait_for_timeout(600)
        msg = frame.evaluate("() => document.querySelector('.cc-status').textContent"); notes.append(f'B copy: "{msg}"')
        if 'copied' in msg.lower() and 'blocked' not in msg.lower(): notes.append('B: the clipboard accepted the image in the frame')
    ctx.close(); b.close()
srv.shutdown()
print(json.dumps({'width': W, 'problems': problems, 'errors': errors[:6], 'notes': notes}, indent=1))
sys.exit(1 if problems or errors else 0)
