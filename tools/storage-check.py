#!/usr/bin/env python3
"""Storage foundation check (GDD §43): headless Chromium with the browser's real IndexedDB, at phone widths.
  - migration: a v39.1 localStorage save (from --save, an export or a bare franchise) moves to IndexedDB on first start; the
    franchise reads back identically, the localStorage save is untouched, and a reload loads from IndexedDB;
  - timings: migration, a typical save, a large save (archive re-packed, as at a season transition), a load (reload to menu);
    repeated with Chrome's CPU throttling (4x) to approximate a mid-range phone;
  - Settings → Save data: status, storage meter, backups sheet, at 320/360/390/412 px with no horizontal overflow;
  - export: the .gbfranchise download verifies with validateImport; the toast never claims the download finished;
  - save failure: with the database closed under it, a save reports failure, the sheet offers Retry and Export, the franchise
    stays in memory; after reopening, Retry succeeds;
  - recovery: a damaged part stops the game at the recovery screen with the backups listed; restoring one returns to the menu.
Emulated browser, not a real device.
  python3 tools/storage-check.py --save=PATH [--shots=DIR] [--json=PATH]
"""
import sys, threading, socketserver, http.server, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
SAVE = args.get('save', os.path.join(ROOT, 'tests/fixtures/save-v31-season2.json')); SHOTS = args.get('shots'); OUTJSON = args.get('json')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
URL = f'http://127.0.0.1:{port}/'
problems, errors, report = [], [], {'widths': {}, 'timings': {}}
raw = json.load(open(SAVE)); fr = raw.get('franchise', raw)
if not fr.get('savedAt'): fr['savedAt'] = 1790000000000
LEGACY = json.dumps(fr, separators=(',', ':'))

def check(cond, msg):
    if not cond: problems.append(msg)
def shot(page, name, w):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); page.screenshot(path=os.path.join(SHOTS, f'{w}-{name}.png'))
def overflow(page, where):
    d = page.evaluate("() => Math.max(document.documentElement.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.sheet')].map(s => s.scrollWidth - s.clientWidth))")
    check(d <= 1, f'horizontal overflow on {where} ({d}px)')
def booted(page):
    page.wait_for_function("() => window.__gb && window.__gb.storage.mode !== 'starting' && document.querySelector('main.screen .hero, main.screen-recovery')", timeout=60000)
    page.wait_for_timeout(100)

def fresh(pw, w=390, throttle=None):
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    if throttle:
        cdp = ctx.new_cdp_session(page); cdp.send('Emulation.setCPUThrottlingRate', {'rate': throttle})
    # Seed the v39.1 save before the game's first start on this origin.
    page.goto(URL + 'manifest.webmanifest'); page.evaluate("(t) => { localStorage.clear(); localStorage.setItem('gridiron-beast-v6', t); }", LEGACY)
    return b, ctx, page

def timings(pw, label, throttle=None):
    b, ctx, page = fresh(pw, throttle=throttle)
    page.goto(URL); booted(page)
    t = page.evaluate("""async () => {
      const app = window.__gb; const st = app.storage.store; const out = { boot: app.bootInfo };
      let t = performance.now(); app.f.news.push({ text: 'timing' }); let r = await app.save({ immediate: true }); out.typicalSave = Math.round(performance.now() - t); out.typicalOk = r.ok;
      t = performance.now(); app.f.history[app.f.history.length - 1].timingProbe = Date.now(); r = await app.save({ immediate: true }); out.largeSave = Math.round(performance.now() - t); out.largeOk = r.ok;
      out.bytes = r.bytes; out.raw = JSON.stringify(app.f).length; return out; }""")
    t0 = page.evaluate('() => performance.now()'); page.reload(); booted(page)
    t['reloadBoot'] = page.evaluate('() => window.__gb.bootInfo')
    report['timings'][label] = t
    check(t['boot']['source'] == 'migrated', f'{label}: first start did not migrate ({t["boot"]})')
    check(t['typicalOk'] and t['largeOk'], f'{label}: a save failed')
    check(t['reloadBoot']['source'] == 'indexeddb', f'{label}: reload did not load from IndexedDB ({t["reloadBoot"]})')
    b.close()

with sync_playwright() as pw:
    # --- migration and identity
    b, ctx, page = fresh(pw)
    page.goto(URL); booted(page)
    m = page.evaluate("""async (legacy) => {
      const app = window.__gb; const f = app.f; const { uid, lifecycle, ...rest } = f; const orig = JSON.parse(legacy);
      const same = JSON.stringify(rest) === JSON.stringify(orig);
      const dbs = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : null;
      return { mode: app.storage.mode, source: app.bootInfo.source, same, uid, lifecycle, legacyKept: localStorage.getItem('gridiron-beast-v6') === legacy, dbs, ms: app.bootInfo.ms };
    }""", LEGACY)
    report['migration'] = m
    check(m['mode'] == 'indexeddb', f'storage mode {m["mode"]}'); check(m['source'] == 'migrated', f'first start source {m["source"]}')
    check(m['same'], 'migrated franchise differs from the v39.1 save'); check(m['legacyKept'], 'the v39.1 localStorage save was modified')
    check(not m['dbs'] or 'gridiron-beast' in m['dbs'], f'IndexedDB database missing ({m["dbs"]})')
    strip = "() => { const { savedAt, ...r } = window.__gb.f; return JSON.stringify(r); }"
    page.wait_for_timeout(500); before = page.evaluate(strip)
    page.reload(); booted(page)
    r = page.evaluate('() => ({ source: window.__gb.bootInfo.source })'); r['json'] = page.evaluate(strip)
    check(r['source'] == 'indexeddb', f'reload source {r["source"]}'); check(r['json'] == before, 'reloaded franchise differs')
    check(page.locator('[data-action="continue"]').count() == 1, 'menu has no Continue button after migration')

    # --- Settings → Save data at four widths
    for w in (320, 360, 390, 412):
        page.set_viewport_size({'width': w, 'height': 800})
        page.evaluate("() => { window.__gb.save({ immediate: true }); }"); page.wait_for_timeout(300)
        page.reload(); booted(page)
        page.click('[data-action="go"][data-screen="settings"]'); page.wait_for_selector('#save-data')
        page.wait_for_function("() => !document.querySelector('#storage-meter')?.textContent.includes('Measuring')", timeout=20000)
        page.evaluate("() => document.querySelector('#save-data').scrollIntoView({ block: 'start' })"); page.wait_for_timeout(150)
        info = page.evaluate("() => ({ status: document.querySelector('#save-status').textContent.trim(), meter: document.querySelector('#storage-meter').innerText })")
        report['widths'][w] = info
        check('Saved on this device' in info['status'], f'{w}px: status says "{info["status"]}"')
        check('This franchise' in info['meter'] and 'Backups' in info['meter'], f'{w}px: meter incomplete: {info["meter"][:120]}')
        overflow(page, f'settings at {w}px'); shot(page, 'settings-save-data', w)
        page.click('[data-action="backups"]'); page.wait_for_function("() => document.querySelector('.sheet-body') && !document.querySelector('.sheet-body').textContent.includes('Checking')", timeout=30000)
        rows = page.evaluate("() => [...document.querySelectorAll('.backup-row')].map((r) => r.innerText.split('\\n')[0])")
        report['widths'][w]['backups'] = rows
        check(any('Original save' in x for x in rows), f'{w}px: the protected v39.1 copy is not listed ({rows})')
        overflow(page, f'backups sheet at {w}px'); shot(page, 'backups-sheet', w)
        page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach((e) => e.remove())")

    # --- export
    page.set_viewport_size({'width': 390, 'height': 800})
    with page.expect_download() as dl:
        page.click('[data-action="export"]')
    d = dl.value; path = d.path(); text = open(path, encoding='utf-8').read()
    v = page.evaluate("async (t) => { const S = await import('./src/franchise/store.js'); const r = S.validateImport(t); return { ok: r.ok, problems: r.problems, same: r.ok && JSON.stringify(r.franchise) === JSON.stringify(window.__gb.f), name: S.exportFileName(window.__gb.f) }; }", text)
    toast = page.evaluate("() => document.querySelector('#toast')?.textContent || ''")
    report['export'] = {'file': d.suggested_filename, 'bytes': len(text.encode()), **v, 'toast': toast}
    check(v['ok'] and v['same'], f'export did not verify: {v["problems"]}'); check(d.suggested_filename.endswith('.gbfranchise'), f'export name {d.suggested_filename}')
    check('prepared' in toast and 'complete' not in toast.lower(), f'export toast claims too much: "{toast}"')

    # --- save failure: the browser refuses the write (as when storage is full)
    page.goto(URL); booted(page); page.click('[data-action="continue"]'); page.wait_for_timeout(300)
    f1 = page.evaluate("""async () => { const be = window.__gb.storage.store.backend; be.realRun = be.run; be.run = (s, mode, fn) => mode === 'readwrite' ? Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })) : be.realRun(s, mode, fn);
      window.__gb.f.owner.first = 'Unsaved'; const r = await window.__gb.save({ immediate: true }); return { ok: r.ok, code: r.error && r.error.code, msg: r.error && r.error.message, still: window.__gb.f.owner.first }; }""")
    page.wait_for_timeout(200)
    sheet = page.evaluate("() => { const s = document.querySelector('.sheet'); return s ? s.innerText : null; }")
    report['saveFailure'] = {**f1, 'sheet': (sheet or '')[:300]}
    check(f1['ok'] is False and f1['code'] == 'quota', f'a refused write was not reported as a quota failure: {f1}'); check(f1['still'] == 'Unsaved', 'the in-memory franchise changed after a failed save')
    check(sheet and 'Retry save' in sheet and 'Export franchise' in sheet, f'no save-failure sheet: {sheet}')
    page.set_viewport_size({'width': 320, 'height': 700}); page.wait_for_timeout(100); overflow(page, 'save-failure sheet at 320px'); shot(page, 'save-failure', 320)
    page.click('.sheet [data-action="retry"]'); page.wait_for_timeout(800)
    still = page.evaluate("() => ({ sheet: !!document.querySelector('.sheet'), status: window.__gb.storage.store.status().state })")
    check(still['sheet'] and still['status'] == 'error', f'retry while still failing did not stay honest: {still}')
    page.evaluate("() => { const be = window.__gb.storage.store.backend; be.run = be.realRun; }")
    page.click('.sheet [data-action="retry"]'); page.wait_for_timeout(1500)
    after = page.evaluate("() => ({ sheet: !!document.querySelector('.sheet'), status: window.__gb.storage.store.status().state })")
    report['saveFailure']['afterRetry'] = after
    check(after['status'] == 'saved' and not after['sheet'], f'retry after the browser recovered did not save: {after}')
    # the browser closing the connection under the game (storage cleared, another tab) is survived by reopening it
    rc = page.evaluate("async () => { const be = window.__gb.storage.store.backend; be.db.close(); be.closed = true; window.__gb.f.owner.first = 'Reopened'; const r = await window.__gb.save({ immediate: true }); return { ok: r.ok, reopened: be.reopened }; }")
    report['saveFailure']['reopen'] = rc; check(rc['ok'] and rc['reopened'] >= 1, f'a closed connection was not reopened: {rc}')

    # --- recovery: damage the live save's core part. The game is left first (its exit save commits), then the unload journal is
    # removed so it cannot supply a good copy, the part is damaged from a page of the same site without the game, and the game
    # is started again.
    page.set_viewport_size({'width': 360, 'height': 780})
    page.evaluate("() => { window.__gb.f.owner.first = 'Latest'; return window.__gb.save({ immediate: true }); }")
    page.goto(URL + 'manifest.webmanifest'); page.wait_for_timeout(1500)
    page.evaluate("""async () => { localStorage.removeItem('gridiron-beast-v7-journal'); const db = await new Promise((res, rej) => { const r = indexedDB.open('gridiron-beast', 1); r.onsuccess = () => res(r.result); r.onerror = rej; });
      await new Promise((res, rej) => { const tx = db.transaction(['saves', 'parts'], 'readwrite'); const s = tx.objectStore('saves').get('slot1'); s.onsuccess = () => { const sum = s.result.parts.core.sum; const g = tx.objectStore('parts').get(sum); g.onsuccess = () => { const p = g.result; p.data = new Uint8Array(p.data.length); tx.objectStore('parts').put(p, sum); }; }; tx.oncomplete = res; tx.onerror = rej; }); db.close(); }""")
    page.goto(URL); booted(page)
    rv = page.evaluate("() => ({ screen: !!document.querySelector('main.screen-recovery'), rows: [...document.querySelectorAll('.backup-row')].map((r) => r.innerText.split('\\n')[0]), f: !!window.__gb.f })")
    report['recovery'] = rv
    check(rv['screen'] and not rv['f'], f'a damaged save did not stop at recovery: {rv}'); check(len(rv['rows']) >= 2, f'recovery lists too few backups: {rv["rows"]}')
    overflow(page, 'recovery at 360px'); shot(page, 'recovery', 360)
    page.locator('.backup-row', has_text='Previous save').locator('[data-action="pick"]').click(timeout=10000); page.click('.sheet [data-action="yes"]')
    page.wait_for_selector('[data-action="continue"]', timeout=30000)
    rr = page.evaluate("async () => ({ first: window.__gb.f.owner.first, status: window.__gb.storage.store.status().state, quarantine: (await window.__gb.storage.store.listBackups()).some((b) => b.kind === 'quarantine') })")
    report['recovery']['restored'] = rr
    check(rr['status'] == 'saved', f'restore did not save: {rr}'); check(rr['quarantine'], 'the damaged save was not kept')
    b.close()

    # --- timings, normal and CPU-throttled
    timings(pw, 'desktop')
    timings(pw, 'cpu4x', throttle=4)

report['problems'] = problems; report['errors'] = errors
print(json.dumps(report, indent=1))
if OUTJSON: json.dump(report, open(OUTJSON, 'w'), indent=1)
print('STORAGE CHECK', 'FAILED' if problems or errors else 'PASSED', f'({len(problems)} problems, {len(errors)} page errors)')
sys.exit(1 if problems or errors else 0)
