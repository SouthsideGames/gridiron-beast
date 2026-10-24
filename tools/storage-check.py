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
      const app = window.__gb; const f = app.f; const { uid, lifecycle, league, leagueOffseason, schemaVersion, ...rest } = f; const orig = JSON.parse(legacy);
      // Phase 3 (GDD §42.6): the capture adds the league registry (schema 8) and re-reads the preseason expectations from it; nothing else changes.
      rest.season = { ...rest.season, expectations: null }; orig.season = { ...orig.season, expectations: null }; delete orig.schemaVersion; delete orig.uid; delete orig.lifecycle; delete orig.leagueOffseason;
      delete rest.savedAt; delete orig.savedAt; // the capture is saved at once
      const same = JSON.stringify(rest) === JSON.stringify(orig);
      const differing = same ? [] : [...new Set([...Object.keys(rest), ...Object.keys(orig)])].filter((k) => JSON.stringify(rest[k]) !== JSON.stringify(orig[k]));
      const R = await import('./src/franchise/league-registry.js'); const leagueOk = R.hasLeague(f) && R.verifyLeague(f).length === 0 && schemaVersion === 8;
      const dbs = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : null;
      return { mode: app.storage.mode, source: app.bootInfo.source, same, differing, leagueOk, uid, lifecycle, legacyKept: localStorage.getItem('gridiron-beast-v6') === legacy, dbs, ms: app.bootInfo.ms };
    }""", LEGACY)
    report['migration'] = m
    check(m['mode'] == 'indexeddb', f'storage mode {m["mode"]}'); check(m['source'] == 'migrated', f'first start source {m["source"]}')
    check(m['same'], f'migrated franchise differs from the v39.1 save: {m.get("differing")}'); check(m['leagueOk'], 'the league registry was not built on first start'); check(m['legacyKept'], 'the v39.1 localStorage save was modified')
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

    # --- restore safety (PR #43 corrections): with a simulated cloud mirror, a failed restore changes nothing (active franchise,
    # stored save, cloud) and ordinary saving continues; a successful restore is committed, then adopted, then mirrored.
    FAKE_CLOUD = """(() => { const docs = new Map(); window.__cloudMetas = []; window.__cloudDocs = docs; // full path -> JSON
      const isCommit = (p) => /\\/cloud\\/snaps\\/[^/~]+$/.test(p);
      const doc = (p) => ({ id: p.split('/').pop(), get: async () => ({ exists: docs.has(p), data: () => JSON.parse(docs.get(p)) }),
        set: async (v) => { docs.set(p, JSON.stringify(v)); if (isCommit(p)) window.__cloudMetas.push(v); }, delete: async () => { docs.delete(p); } });
      const coll = (c, filters = [], lim = 0) => ({ doc: (id) => doc(c + '/' + id), where: (f, op, v) => coll(c, [...filters, [f, op, v]], lim), limit: (n) => coll(c, filters, n),
        get: async () => { let ks = [...docs.keys()].filter((k) => k.startsWith(c + '/') && !k.slice(c.length + 1).includes('/')).sort();
          ks = ks.filter((k) => filters.every(([f, op, v]) => { const x = JSON.parse(docs.get(k))[f]; return op === 'not-in' ? !v.includes(x) : op === '==' ? x === v : true; }));
          if (lim) ks = ks.slice(0, lim); return { docs: ks.map((k) => ({ id: k.slice(c.length + 1), data: () => JSON.parse(docs.get(k)) })) }; } });
      window.claude = { use: async (n) => (n === 'db' ? { collection: (c) => coll(c), doc } : n === 'user' ? { id: async () => 'viewer-1' } : null) }; })()"""
    b2 = pw.chromium.launch(); ctx2 = b2.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx2.add_init_script(FAKE_CLOUD); page = ctx2.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL + 'manifest.webmanifest'); page.evaluate("(t) => { localStorage.clear(); localStorage.setItem('gridiron-beast-v6', t); }", LEGACY)
    page.goto(URL); booted(page); page.wait_for_timeout(1500)
    report['initialCloud'] = page.evaluate("""async () => { const st = window.__gb.storage.store; const m = await st.readManifest(); const metas = window.__cloudMetas;
      return { uploads: metas.length, savedAt: metas.length ? metas[metas.length - 1].savedAt : null, storedAt: m && m.savedAt, gen: metas.length ? !!metas[metas.length - 1].gen : false }; }""")
    ic = report['initialCloud']; check(ic['uploads'] >= 1 and ic['savedAt'] == ic['storedAt'] and ic['gen'], f'an empty cloud did not receive the committed save at start: {ic}')
    page.evaluate("""async () => { const app = window.__gb; for (const n of ['A', 'B', 'C']) { app.f.owner.first = n; await app.save({ immediate: true }); } await new Promise((r) => setTimeout(r, 300)); }""")
    page.click('[data-action="go"][data-screen="settings"]'); page.wait_for_selector('#save-data')
    rs = {}
    # 1. quota while committing the restored franchise
    rs['quota'] = page.evaluate("""async () => { const app = window.__gb; const be = app.storage.store.backend; const real = be.run; const before = app.f; const metas = window.__cloudMetas.length;
      be.run = (s, mode, fn) => (mode === 'readwrite' && s.includes('saves') ? Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })) : real.call(be, s, mode, fn));
      const r = await app.restoreBackup('1:roll1'); be.run = real; await new Promise((x) => setTimeout(x, 300));
      const stored = await app.storage.store.loadManifest(await app.storage.store.readManifest());
      return { ok: r.ok, code: r.error && r.error.code, stage: r.stage, sameObject: app.f === before, active: app.f.owner.first, stored: stored.owner.first, cloudWrites: window.__cloudMetas.length - metas }; }""")
    # 2. the safety copy fails (quota on the backups store)
    rs['copy'] = page.evaluate("""async () => { const app = window.__gb; const be = app.storage.store.backend; const real = be.run; const before = app.f; const metas = window.__cloudMetas.length;
      be.run = (s, mode, fn) => (mode === 'readwrite' && s.length === 1 && s[0] === 'backups' ? Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })) : real.call(be, s, mode, fn));
      const r = await app.restoreBackup('1:roll1'); be.run = real; await new Promise((x) => setTimeout(x, 300));
      app.f.owner.first = 'KeptPlaying'; const s = await app.save({ immediate: true }); await new Promise((x) => setTimeout(x, 300));
      const stored = await app.storage.store.loadManifest(await app.storage.store.readManifest());
      return { ok: r.ok, stage: r.stage, sameObject: app.f === before, saveAfter: s.ok, stored: stored.owner.first, cloudLast: window.__cloudMetas.length > metas ? 'mirrored ordinary save' : 'none' }; }""")
    # 3. the UI path of a failed restore (toast wording) and of a successful one
    page.evaluate("""() => { const be = window.__gb.storage.store.backend; be.__real = be.run; be.run = (s, mode, fn) => (mode === 'readwrite' && s.includes('saves') ? Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })) : be.__real.call(be, s, mode, fn)); }""")
    page.click('[data-action="backups"]'); page.wait_for_function("() => document.querySelector('.backup-row [data-action=pick]')", timeout=30000)
    page.locator('.backup-row', has_text='Previous save').locator('[data-action="pick"]').click(); page.click('.sheet [data-action="yes"]'); page.wait_for_timeout(1200)
    rs['uiFailToast'] = page.evaluate("() => document.querySelector('#toast')?.textContent || ''")
    rs['uiButtonBack'] = page.evaluate("() => [...document.querySelectorAll('.backup-row [data-action=pick]')].every((b) => !b.disabled && b.textContent === 'Restore')")
    overflow(page, 'backups sheet after a failed restore at 360px'); shot(page, 'restore-failed', 360)
    page.evaluate("() => { const be = window.__gb.storage.store.backend; be.run = be.__real; }")
    metas0 = page.evaluate('() => window.__cloudMetas.length')
    page.locator('.backup-row', has_text='Previous save').locator('[data-action="pick"]').click(); page.click('.sheet [data-action="yes"]')
    page.wait_for_function("() => (document.querySelector('#toast')?.textContent || '').includes('restored and saved')", timeout=30000); page.wait_for_timeout(600)
    rs['success'] = page.evaluate("""async (m0) => { const app = window.__gb; const stored = await app.storage.store.loadManifest(await app.storage.store.readManifest()); const metas = window.__cloudMetas.slice(m0);
      return { active: app.f.owner.first, stored: stored.owner.first, storedAt: stored.savedAt, cloudAfter: metas.length, cloudSavedAt: metas.length ? metas[metas.length - 1].savedAt : null, status: app.storage.store.status().state }; }""", metas0)
    rs['afterSuccessSave'] = page.evaluate("""async () => { const app = window.__gb; app.f.owner.first = 'AfterRestore'; const r = await app.save({ immediate: true }); const stored = await app.storage.store.loadManifest(await app.storage.store.readManifest()); return { ok: r.ok, stored: stored.owner.first }; }""")
    report['restoreSafety'] = rs
    q = rs['quota']; check(q['ok'] is False and q['code'] == 'quota' and q['sameObject'] and q['active'] == 'C' and q['stored'] == 'C' and q['cloudWrites'] == 0, f'failed restore (quota) changed state: {q}')
    c = rs['copy']; check(c['ok'] is False and c['stage'] == 'copy' and c['sameObject'] and c['saveAfter'] and c['stored'] == 'KeptPlaying', f'failed safety copy broke saving: {c}')
    check('Nothing was changed' in rs['uiFailToast'] or 'unchanged' in rs['uiFailToast'], f'failed-restore toast: "{rs["uiFailToast"]}"'); check(rs['uiButtonBack'], 'restore buttons stayed disabled after a failure')
    sc = rs['success']; check(sc['active'] == sc['stored'] and sc['status'] == 'saved' and sc['cloudAfter'] >= 1 and sc['cloudSavedAt'] == sc['storedAt'], f'successful restore not committed-then-mirrored: {sc}')
    check(rs['afterSuccessSave']['ok'] and rs['afterSuccessSave']['stored'] == 'AfterRestore', f'ordinary saving after a restore failed: {rs["afterSuccessSave"]}')
    # --- delayed cloud upload (second review): the throttled upload carries the committed state, not later changes
    dc = page.evaluate("""async () => { const app = window.__gb; app.f.owner.first = 'CommittedForCloud'; app.lastSig = app.lastSig; const r = await app.save(); // ordinary, throttled cloud
      const metas0 = window.__cloudMetas.length; app.f.owner.first = 'ChangedAfter-NotSaved'; await new Promise((x) => setTimeout(x, 4600));
      const m = window.__cloudMetas.slice(metas0); if (!m.length) return { ok: r.ok, uploads: 0 };
      const last = m[m.length - 1]; let txt = ''; for (let i = 0; i < last.n; i++) txt += JSON.parse(window.__cloudDocs.get('data/users/viewer-1/cloud/chunks/' + last.gen + '_c' + i)).s;
      const up = JSON.parse(txt); return { ok: r.ok, uploads: m.length, owner: up.owner.first, savedAt: up.savedAt, committedAt: r.savedAt }; }""")
    report['delayedCloud'] = dc
    check(dc.get('uploads', 0) >= 1 and dc.get('owner') == 'CommittedForCloud' and dc.get('savedAt') == dc.get('committedAt'), f'delayed cloud upload carried uncommitted state: {dc}')
    page.evaluate("() => { window.__gb.f.owner.first = 'CommittedForCloud'; return window.__gb.save({ immediate: true }); }")
    # --- cross-tab deletion (second review): tab A deletes, stale tab B cannot recreate the franchise
    pageB = ctx2.new_page(); pageB.on('pageerror', lambda e: errors.append('tab B: ' + str(e))); pageB.goto(URL); booted(pageB)
    page.goto(URL); booted(page)
    xt = {}
    page.wait_for_function("() => [...window.__cloudDocs.keys()].some((k) => k.includes('/cloud/snaps/') && !k.endsWith('~w'))", timeout=20000)  # its start-up upload landed
    xt['delete'] = page.evaluate("async () => { const r = await window.__gb.reset(); return r; }")
    # the cloud side of the deletion (snapshot design): this page uploaded its franchise at start; deleting writes a marker
    # and removes that franchise's snapshots, and the empty device does not adopt anything from the cloud
    xt['cloudDelete'] = page.evaluate("""async () => { const ks = [...window.__cloudDocs.keys()]; const C = await import('./src/franchise/cloud-save.js');
      return { markers: ks.filter((k) => k.includes('/cloud/deleted/')).length, commits: ks.filter((k) => /\\/cloud\\/snaps\\/[^/~]+$/.test(k)).length,
        chunks: ks.filter((k) => k.includes('/cloud/chunks/')).length, adopted: !!(await C.cloudLoad(null)) }; }""")
    cd_ = xt['cloudDelete']; check(cd_['markers'] == 1 and cd_['commits'] == 0 and cd_['chunks'] == 0 and not cd_['adopted'], f'cloud side of deleting the franchise: {cd_}')
    xt['staleSave'] = pageB.evaluate("""async () => { const app = window.__gb; app.f.owner.first = 'GhostFromTabB'; const r = await app.save({ immediate: true }); await new Promise((x) => setTimeout(x, 300));
      const m = await app.storage.store.readManifest(); return { ok: r.ok, code: r.error && r.error.code, msg: r.error && r.error.message, manifest: !!m, sheet: !!document.querySelector('.sheet') && document.querySelector('.sheet').innerText.includes('another tab') }; }""")
    pageB.reload(); booted(pageB)
    xt['afterReload'] = pageB.evaluate("async () => ({ hasFranchise: !!window.__gb.f, deletedCopy: (await window.__gb.storage.store.listBackups()).filter((b) => b.kind === 'deleted' && b.ok).length })")
    report['crossTab'] = xt
    st_ = xt['staleSave']; check(xt['delete'].get('ok') and st_['ok'] is False and st_['code'] == 'newer-elsewhere' and not st_['manifest'] and st_['sheet'], f'stale tab after deletion: {xt}')
    check(not xt['afterReload']['hasFranchise'] and xt['afterReload']['deletedCopy'] >= 1, f'deleted franchise came back or its copy is gone: {xt["afterReload"]}')
    pageB.set_viewport_size({'width': 320, 'height': 700}); overflow(pageB, 'menu after cross-tab deletion at 320px')
    b2.close()
    # --- final audit (third round): an idle tab never locks out the played tab; a changed-elsewhere tab is told on return;
    # onboarding commits before switching; emergency export always downloads
    b3 = pw.chromium.launch(); ctx3 = b3.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    pa = ctx3.new_page(); pa.on('pageerror', lambda e: errors.append('A: ' + str(e)))
    pa.goto(URL + 'manifest.webmanifest'); pa.evaluate("(t) => { localStorage.clear(); localStorage.setItem('gridiron-beast-v6', t); }", LEGACY)
    pa.goto(URL); booted(pa)
    pb = ctx3.new_page(); pb.on('pageerror', lambda e: errors.append('B: ' + str(e))); pb.goto(URL); booted(pb)
    fa = {}
    fa['idleB'] = pb.evaluate("async () => { const r = await window.__gb.save({ immediate: true }); return { ok: r.ok, unchanged: !!r.unchanged }; }")  # B hidden, nothing changed
    fa['activeA'] = pa.evaluate("async () => { const app = window.__gb; app.f.owner.first = 'PlayedInA'; const r = await app.save({ immediate: true }); return { ok: r.ok, code: r.error && r.error.code }; }")
    fa['bWasStale'] = pb.evaluate("async () => { window.__gb.f.owner.first = 'StaleB'; const r = await window.__gb.save({ immediate: true }); return { ok: r.ok, code: r.error && r.error.code }; }")  # B is behind A now: refused
    pb.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach((e) => e.remove())")
    pb.reload(); booted(pb)
    fa['bChanges'] = pb.evaluate("async () => { window.__gb.f.owner.first = 'ChangedInB'; const r = await window.__gb.save({ immediate: true }); return r.ok; }")  # B, now current, really changes it
    pa.evaluate("() => window.dispatchEvent(new Event('focus'))"); pa.wait_for_timeout(600)
    fa['staleSheet'] = pa.evaluate("() => { const s = document.querySelector('.sheet'); return s ? s.innerText.slice(0, 160) : null; }")
    pa.set_viewport_size({'width': 320, 'height': 700}); overflow(pa, 'stale-tab sheet at 320px'); shot(pa, 'stale-tab', 320)
    with pa.expect_download() as dl:
        pa.click('.sheet [data-action="exp"]')
    fa['staleExport'] = dl.value.suggested_filename
    pa.close(); pb.reload(); booted(pb)
    # onboarding / new franchise: the safety copy fails, so nothing switches
    fa['newFranchiseFail'] = pb.evaluate("""async () => { const app = window.__gb; const be = app.storage.store.backend; const real = be.run; const before = app.f;
      be.run = (s, mode, fn) => (mode === 'readwrite' && s.length === 1 && s[0] === 'backups' ? Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })) : real.call(be, s, mode, fn));
      const fresh = JSON.parse(JSON.stringify(app.f)); delete fresh.uid; fresh.owner.first = 'BrandNew'; fresh.createdAt = new Date().toISOString();
      const r = await app.setFranchise(fresh); be.run = real;
      const stored = await app.storage.store.loadManifest(await app.storage.store.readManifest());
      const s2 = await app.save({ immediate: true });
      return { ok: r.ok, stage: r.stage, sameObject: app.f === before, active: app.f.owner.first, stored: stored.owner.first, saveAfter: s2.ok }; }""")
    # emergency export of a franchise that fails its own check (two monsters sharing an id) still downloads
    pb.evaluate("() => { const f = window.__gb.f; f.__savedId = f.roster[1].id; f.roster[1].id = f.roster[0].id; }")
    pb.click('[data-action="go"][data-screen="settings"]'); pb.wait_for_selector('#save-data')
    with pb.expect_download() as dl2:
        pb.click('[data-action="export"]')
    fa['unverifiedExport'] = {'file': dl2.value.suggested_filename, 'toast': pb.evaluate("() => document.querySelector('#toast')?.textContent || ''")}
    pb.evaluate("() => { const f = window.__gb.f; f.roster[1].id = f.__savedId; delete f.__savedId; }")
    report['finalAudit'] = fa
    check(fa['idleB']['ok'] and fa['idleB']['unchanged'], f'idle tab wrote a save: {fa["idleB"]}')
    check(fa['activeA']['ok'], f'the played tab was locked out by an idle tab: {fa["activeA"]}')
    check(fa['bWasStale']['ok'] is False and fa['bWasStale']['code'] == 'newer-elsewhere' and fa['bChanges'], f'tab B (behind A) was not refused, or could not save after reloading: {fa}')
    check(fa['staleSheet'] and 'another tab' in fa['staleSheet'], f'no warning when returning to a tab changed elsewhere: {fa["staleSheet"]}')
    check(fa['staleExport'].endswith('.gbfranchise'), f'stale-tab export: {fa["staleExport"]}')
    nf = fa['newFranchiseFail']; check(nf['ok'] is False and nf['stage'] == 'copy' and nf['sameObject'] and nf['stored'] == nf['active'] and nf['saveAfter'], f'new franchise switched despite a failed copy: {nf}')
    ue = fa['unverifiedExport']; check(ue['file'].endswith('-unverified.gbfranchise') and 'did not pass' in ue['toast'], f'emergency export refused or unlabelled: {ue}')
    b3.close()

    # --- Phase 2 (GDD §42.5, §42.7): three slots, switching, the delete flow with its typed confirmation and undo, import into an
    # empty slot, the archive and the read-only Legacy shell, at every width; a v39.0 device arrives as slot 1 of three.
    NEW_FRANCHISE = """async (seed) => { const F = await import('./src/franchise/franchise.js'); const M = await import('./src/data/monsters.js');
      const f = F.createFranchise({ owner: { first: 'Slot', last: 'Two', gender: 'Female', portrait: 1, hometown: '' }, club: 'Glacier Guardians', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed, settings: { difficulty: 'rookie' } });
      F.hireDefaultStaff(f); let g = 0; while (f.draft && !f.draft.done && g++ < 40) { if (F.onTheClock(f) === f.club) { const d = f.draft; const best = (d.class || []).filter((m) => (d.available || []).includes(m.id)).sort((a, b) => M.monsterOverall(b) - M.monsterOverall(a))[0]; if (best) F.myDraftPick(f, best.id); else F.passDraftPick(f); } else break; }
      f.settings.tutorial = false; f.welcomed = true; return f; }"""
    p2 = {}
    def to_franchises(pg):  # the Franchises screen is reached from the main menu; a reload boots there (and re-reads every slot)
        pg.goto(URL); booted(pg); pg.click('[data-action="go"][data-screen="franchises"]'); pg.wait_for_selector('.slot-card[data-slot="3"]')
    for w in [320, 360, 390, 412]:
        b4 = pw.chromium.launch(); ctx4 = b4.new_context(viewport={'width': w, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
        pg = ctx4.new_page(); pg.on('pageerror', lambda e: errors.append(f'P2 {w}: ' + str(e)))
        pg.goto(URL + 'manifest.webmanifest'); pg.evaluate("(t) => { localStorage.clear(); localStorage.setItem('gridiron-beast-v6', t); }", LEGACY)
        pg.goto(URL); booted(pg)
        p2[f'slots{w}'] = pg.evaluate("async () => (await window.__gb.slotSummaries()).map((s) => s.state)")
        check(p2[f'slots{w}'] == ['active', 'empty', 'empty'], f'{w}px: a v39.0 device did not arrive as slot 1 of three: {p2[f"slots{w}"]}')
        pg.click('[data-action="go"][data-screen="franchises"]'); pg.wait_for_selector('.slot-card[data-slot="3"]'); pg.wait_for_function("() => document.querySelectorAll('.slot-card').length === 3", timeout=10000)
        overflow(pg, f'Franchises screen at {w}px'); shot(pg, 'franchises', w)
        check(pg.locator('.slot-card').count() == 3, f'{w}px: {pg.locator(".slot-card").count()} slot cards')
        if w == 360:
            # a second franchise in slot 2, created through the app's own path; the first is untouched
            club1 = pg.evaluate("() => window.__gb.f.club")
            r = pg.evaluate("async () => { const app = window.__gb; const r0 = await app.createIn(2); if (!r0.ok) return r0; const f = await (" + NEW_FRANCHISE + ")(7); const r = await app.setFranchise(f); return { ok: r.ok, slot: app.slot, club: app.f?.club, uid: app.f?.uid }; }")
            p2['create2'] = r; check(r.get('ok') and r.get('slot') == 2 and r.get('club') == 'Glacier Guardians', f'creating in slot 2: {r}')
            summ = pg.evaluate("async () => (await window.__gb.slotSummaries()).map((s) => [s.state, s.meta && s.meta.club])")
            check(summ[0] == ['active', club1] and summ[1] == ['active', 'Glacier Guardians'] and summ[2][0] == 'empty', f'slots after creating in 2: {summ}')
            # switch back and forth: each slot's franchise is its own
            sw = pg.evaluate("async () => { const app = window.__gb; const a = await app.switchSlot(1); const c1 = app.f && app.f.club; const b = await app.switchSlot(2); return { c1, c2: app.f && app.f.club, ok: a.ok && b.ok }; }")
            check(sw['ok'] and sw['c1'] == club1 and sw['c2'] == 'Glacier Guardians', f'switching slots: {sw}')
            # the delete flow: a plain tap never deletes; the button stays disabled until the club name is typed; undo brings it back
            to_franchises(pg); pg.wait_for_selector('.slot-card[data-slot="2"] [data-action="delete"]')
            pg.click('.slot-card[data-slot="2"] [data-action="delete"]'); pg.wait_for_selector('#del-confirm')
            p2['deleteDisabled'] = pg.evaluate("() => document.querySelector('.sheet [data-action=delete]').disabled")
            pg.fill('#del-confirm', 'wrong name'); p2['deleteWrong'] = pg.evaluate("() => document.querySelector('.sheet [data-action=delete]').disabled")
            pg.fill('#del-confirm', 'Glacier Guardians'); p2['deleteTyped'] = pg.evaluate("() => document.querySelector('.sheet [data-action=delete]').disabled")
            overflow(pg, 'delete sheet'); shot(pg, 'delete-sheet', w)
            pg.click('.sheet [data-action="delete"]'); pg.wait_for_function("() => !document.querySelector('#del-confirm')", timeout=20000); pg.wait_for_timeout(500)
            summ2 = pg.evaluate("async () => (await window.__gb.slotSummaries()).map((s) => s.state)")
            check(p2['deleteDisabled'] and p2['deleteWrong'] and not p2['deleteTyped'] and summ2 == ['active', 'empty', 'empty'], f'delete flow: {p2["deleteDisabled"]}/{p2["deleteWrong"]}/{p2["deleteTyped"]} -> {summ2}')
            pg.wait_for_selector('[data-action="undo"]', timeout=10000); pg.click('[data-action="undo"]'); pg.wait_for_timeout(800)
            summ3 = pg.evaluate("async () => (await window.__gb.slotSummaries()).map((s) => [s.state, s.meta && s.meta.club])")
            check(summ3[1] == ['active', 'Glacier Guardians'], f'undo delete: {summ3}')
            # export then import the slot-2 franchise into slot 3 through the file input (a copy: same uid is in slot 2)
            to_franchises(pg); pg.wait_for_selector('.slot-card[data-slot="3"] [data-change="import"]')
            text = pg.evaluate("async () => { const S = await import('./src/franchise/store.js'); return S.exportFranchise(window.__gb.f); }")
            pg.set_input_files('.slot-card[data-slot="3"] [data-change="import"]', {'name': 'copy.gbfranchise', 'mimeType': 'application/json', 'buffer': text.encode()})
            pg.wait_for_selector('.sheet [data-action="copy"]', timeout=10000); overflow(pg, 'import sheet'); shot(pg, 'import-sheet', w)
            pg.click('.sheet [data-action="copy"]'); pg.wait_for_selector('.sheet [data-action="into"]'); pg.click('.sheet [data-action="into"]'); pg.wait_for_timeout(800)
            summ4 = pg.evaluate("async () => { const l = await window.__gb.slotSummaries(); return l.map((s) => [s.state, s.meta && s.meta.club, s.uid]); }")
            check(summ4[2][0] == 'active' and summ4[2][1] == 'Glacier Guardians' and summ4[2][2] != summ4[1][2], f'import as a copy into slot 3: {summ4}')
            # the archive (slot 1 is a settled season from the fixture): retire, then the Legacy shell is read-only
            arch = pg.evaluate("async () => { const app = window.__gb; await app.switchSlot(1); const L = await import('./src/franchise/lifecycle.js'); const F = await import('./src/franchise/franchise.js'); while (app.f.scenes && app.f.scenes.length) F.dismissScene(app.f); const check = L.retirementChecklist(app.f); if (!check.ready) return { ready: false, missing: check.missing }; const r = await app.archive({ reason: 'voluntary' }); let blocked = null; try { F.takeBye(app.f); } catch (e) { blocked = e.code; } const s2 = await app.save({ immediate: true }); return { ready: true, ok: r.ok, status: app.f.lifecycle.status, blocked, saveRefused: s2.ok === false && s2.error && s2.error.code, legacySeasons: app.f.lifecycle.legacy && app.f.lifecycle.legacy.seasons.length }; }")
            p2['archive'] = arch
            check(arch.get('ready') and arch.get('ok') and arch.get('status') == 'retired' and arch.get('blocked') == 'read-only' and arch.get('saveRefused') == 'read-only', f'archive: {arch}')
            pg.goto(URL); booted(pg)  # a fresh start lands on the menu; Continue opens the Legacy, not HQ
            p2['menuContinue'] = pg.evaluate("() => document.querySelector('[data-action=continue]')?.textContent || ''")
            check('Legacy' in p2['menuContinue'], f'menu Continue for an archive: {p2["menuContinue"]}')
            pg.click('[data-action="continue"]'); pg.wait_for_selector('.legacy-head', timeout=20000)
            for t in ['legacy', 'seasons', 'league', 'roster', 'careers']:
                pg.click(f'[data-action="tab"][data-tab="{t}"]'); pg.wait_for_timeout(150); overflow(pg, f'Legacy shell tab {t} at {w}px')
            shot(pg, 'legacy', w)
            p2['archivedSlots'] = pg.evaluate("async () => (await window.__gb.slotSummaries()).map((s) => s.state)")
            check(p2['archivedSlots'] == ['retired', 'active', 'active'], f'slots after archiving: {p2["archivedSlots"]}')
            # HQ redirects an archive to the Legacy shell
            to_franchises(pg); pg.wait_for_selector('.slot-card[data-slot="1"] [data-action="legacy"]'); shot(pg, 'franchises-archived', w)
        b4.close()
    report['phase2'] = p2

    # --- timings, normal and CPU-throttled
    timings(pw, 'desktop')
    timings(pw, 'cpu4x', throttle=4)

report['problems'] = problems; report['errors'] = errors
print(json.dumps(report, indent=1))
if OUTJSON: json.dump(report, open(OUTJSON, 'w'), indent=1)
print('STORAGE CHECK', 'FAILED' if problems or errors else 'PASSED', f'({len(problems)} problems, {len(errors)} page errors)')
sys.exit(1 if problems or errors else 0)
