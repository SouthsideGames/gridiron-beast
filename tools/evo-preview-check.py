#!/usr/bin/env python3
"""Preview Evolution check, headless Chromium as a phone (touch) at 320/375/390/430 px: Main Menu → Developer Tools → Preview
Evolution by taps; every listed monster really evolves and Legendaries are absent; a two-stage species offers both transitions;
Start Preview opens the game's own evolution scene (.evo-scene from openEvolutionScene) with the chosen forms; every stage (A–E)
passes the same layout probe as tools/evolution-ui-check.py (full screen, sprites whole and on screen, buttons touch-sized and
visible, no overlapping text, results above the buttons); the scene's Replay and Continue work; Replay Evolution reopens it,
repeatedly; Return goes back to Developer Tools; the scene's sound button changes no saved setting; with and without a
franchise loaded, nothing in the save or in browser storage changes; no page errors.
  python3 tools/evo-preview-check.py [--save=EXPORT.json] [--shots=DIR]"""
import sys, os, re, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:]); SHOTS = args.get('shots'); SAVE = args.get('save')
LAYOUT = re.search(r'LAYOUT = r"""(.*?)"""', open(os.path.join(ROOT, 'tools/evolution-ui-check.py')).read(), re.S).group(1) # the evolution scene's own layout probe
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'; problems, errors, notes = [], [], []
def check(c, m):
    (notes if c else problems).append(m); return c
def shot(p, n):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, n + '.png'))
GO = "([n]) => import('./src/ui/router.js').then((R) => R.go(n, {}))"
# Everything persistent the game could write: browser storage, every IndexedDB store's records, and the loaded franchise.
FINGER = """async () => { const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  const dbs = {}; for (const d of (await indexedDB.databases?.()) || []) { dbs[d.name] = await new Promise((res) => { const r = indexedDB.open(d.name); r.onsuccess = async () => { const db = r.result; const out = {}; for (const s of db.objectStoreNames) out[s] = await new Promise((ok) => { const q = db.transaction(s, 'readonly').objectStore(s).getAll(); q.onsuccess = () => ok(JSON.stringify(q.result)); q.onerror = () => ok('?'); }); db.close(); res(out); }; r.onerror = () => res('?'); }); }
  return JSON.stringify({ ls, dbs, f: window.__gb.f ? JSON.stringify(window.__gb.f) : null, settings: JSON.stringify(window.__gb.settings || null) }); }"""
IMPORT = """async (t) => { const Save = await import('./src/franchise/save.js'); const r = await window.__gb.importInto(1, Save.importJson(t)); await window.__gb.save({ immediate: true }); return r.ok; }"""
def stage_tour(p, w):
    for st in ['A', 'B', 'C', 'D', 'E']:
        p.evaluate("(s) => document.querySelector('.evo-scene').__evo.goto(s)", st); p.wait_for_timeout(350)
        lay = p.evaluate(LAYOUT)
        check(lay.get('full') and not lay['overflow'] and not lay['sprite'] and not lay['buttons'] and not lay['overlap'], f'{w}: stage {st} layout {json.dumps({k: lay[k] for k in ("overflow", "sprite", "buttons", "overlap")})}')
        if SHOTS and w == 390: shot(p, f'evp-stage-{st}')
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [390, 320, 375, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}')); p.on('console', lambda m, w=w: errors.append(f'{w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        loaded = False
        if SAVE and w == 390:
            loaded = p.evaluate(IMPORT, open(SAVE).read()); p.reload(); p.wait_for_function("() => window.__gb && window.__gb.f", timeout=60000); check(loaded, 'a franchise save is loaded for the no-mutation check')
        p.evaluate(GO, ['menu']); p.wait_for_timeout(300); p.locator('main [data-screen="developer"]').first.tap(); p.wait_for_timeout(900)
        before = p.evaluate(FINGER) # taken in Developer Tools: opening it records its own "new to review" toast, which is not the preview's doing
        check(p.locator('main [data-screen="evo-preview"]').count() == 1, f'{w}: Preview Evolution is in Developer Tools'); p.locator('main [data-screen="evo-preview"]').tap(); p.wait_for_timeout(400)
        opts = p.evaluate("() => [...document.querySelectorAll('[data-change=evp-species] option')].map((o) => o.value)")
        valid = p.evaluate("async () => { const { SPECIES_DEX } = await import('./src/data/species.js'); return SPECIES_DEX.filter((s) => s.rarity !== 'legendary' && (s.evolution || []).length).map((s) => s.id); }")
        legends = p.evaluate("async () => { const { SPECIES_DEX } = await import('./src/data/species.js'); return SPECIES_DEX.filter((s) => s.rarity === 'legendary' || !(s.evolution || []).length).map((s) => s.id); }")
        check(sorted(opts) == sorted(valid) and not set(opts) & set(legends), f'{w}: the list is exactly the {len(valid)} species that evolve (no Legendary, no standalone)')
        lay = p.evaluate("() => ({ over: document.documentElement.scrollWidth - innerWidth, bad: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length })")
        check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: preview screen fits {lay}')
        two = p.evaluate("async () => { const { SPECIES_DEX } = await import('./src/data/species.js'); return SPECIES_DEX.find((s) => (s.evolution || []).length === 2).id; }")
        p.select_option('[data-change=evp-species]', two); p.wait_for_timeout(250)
        check(p.locator('[data-action="evp-stage"]').count() == 2, f'{w}: a two-stage species offers both transitions')
        p.locator('[data-action="evp-stage"]').nth(1).tap(); p.wait_for_timeout(250)
        names = p.evaluate("() => [...document.querySelectorAll('.evp-form b')].map((e) => e.textContent)")
        if SHOTS and w == 390: shot(p, 'evp-0-screen')
        p.locator('[data-action="evp-start"]').tap(); p.wait_for_selector('.evo-scene', timeout=5000)
        label = p.evaluate("() => document.querySelector('.evo-scene').getAttribute('aria-label')")
        check(label == f'Evolution: {names[0]} into {names[1]}', f'{w}: the real evolution scene opens on the chosen transition ({label})')
        same = p.evaluate("""async () => { const M = await import('./src/ui/pixel-monster.js'); const P = await import('./src/lab/evo-preview.js'); const S = await import('./src/ui/evolution-scene.js');
          const sc = document.querySelector('.evo-scene'); const sel = document.querySelector('[data-change=evp-species]')?.value; return !!sc.__evo && typeof S.openEvolutionScene === 'function'; }""")
        check(same, f'{w}: it is the gameplay scene (openEvolutionScene with its controller)')
        stage_tour(p, w)
        sound0 = p.evaluate("() => JSON.stringify(window.__gb.settings?.evoSound ?? null) + '|' + JSON.stringify(window.__gb.f?.settings?.evoSound ?? null)")
        p.locator('.evo-scene [data-evo="sound"]').tap(); p.wait_for_timeout(150)
        check(p.evaluate("() => JSON.stringify(window.__gb.settings?.evoSound ?? null) + '|' + JSON.stringify(window.__gb.f?.settings?.evoSound ?? null)") == sound0, f'{w}: the scene sound button changes no saved setting')
        p.locator('.evo-scene .evo-replay').tap(); p.wait_for_timeout(300); check(p.evaluate("() => document.querySelector('.evo-scene')?.dataset.stage") == 'A', f'{w}: the scene Replay restarts it')
        p.evaluate("() => document.querySelector('.evo-scene').__evo.goto('E')"); p.wait_for_timeout(250); p.locator('.evo-scene .evo-continue').tap(); p.wait_for_timeout(300)
        check(p.locator('.evo-scene').count() == 0 and p.locator('[data-action="evp-replay"]:not([disabled])').count() == 1, f'{w}: Continue returns to the preview screen with Replay ready')
        for k in range(3):
            p.locator('[data-action="evp-replay"]').tap(); p.wait_for_selector('.evo-scene', timeout=5000)
            ok = p.evaluate("() => document.querySelector('.evo-scene').getAttribute('aria-label')") == label
            p.evaluate("() => document.querySelector('.evo-scene').__evo.goto('E')"); p.wait_for_timeout(200); p.locator('.evo-scene .evo-continue').tap(); p.wait_for_timeout(250)
            check(ok and p.locator('.evo-scene').count() == 0, f'{w}: Replay Evolution #{k + 1} plays the same evolution and closes cleanly')
        # another species, a one-stage one, straight after
        one = p.evaluate("async () => { const { SPECIES_DEX } = await import('./src/data/species.js'); return SPECIES_DEX.find((s) => (s.evolution || []).length === 1).id; }")
        p.select_option('[data-change=evp-species]', one); p.wait_for_timeout(250); check(p.locator('[data-action="evp-stage"]').count() == 0, f'{w}: a one-stage species shows its single transition')
        p.locator('[data-action="evp-start"]').tap(); p.wait_for_selector('.evo-scene', timeout=5000); p.evaluate("() => document.querySelector('.evo-scene').__evo.goto('E')"); p.wait_for_timeout(250); p.locator('.evo-scene .evo-continue').tap(); p.wait_for_timeout(250)
        p.locator('[data-action="go"][data-screen="developer"]').tap(); p.wait_for_timeout(300)
        check(p.locator('main [data-screen="evo-preview"]').count() == 1, f'{w}: Return to Developer Tools works')
        p.wait_for_timeout(600)
        after = p.evaluate(FINGER)
        if after != before:
            A, B = json.loads(before), json.loads(after)
            for part in ['ls', 'dbs']:
                for k in set(A[part]) | set(B[part]):
                    if A[part].get(k) != B[part].get(k): print('DIFF', w, part, k, str(A[part].get(k))[:300], '=>', str(B[part].get(k))[:300])
            if A['f'] != B['f']: print('DIFF', w, 'franchise')
            if A['settings'] != B['settings']: print('DIFF', w, 'settings', A['settings'][:200], '=>', B['settings'][:200])
        check(after == before, f'{w}: nothing persistent changed (browser storage, every IndexedDB store, {"the loaded franchise" if loaded else "no franchise"})')
        ctx.close()
print('\n'.join('ok: ' + n for n in notes)); print(json.dumps({'problems': problems, 'errors': errors[:8]}, indent=1))
print('EVO PREVIEW CHECK ' + ('PASSED' if not problems and not errors else 'FAILED'))
sys.exit(0 if not problems and not errors else 1)
