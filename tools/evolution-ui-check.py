#!/usr/bin/env python3
"""Evolution scene check (GDD §51) in headless Chromium at 320/360/375/390/393/412/430 px over a disposable save
(tools/evolution-saves.mjs). At each width a monster is evolved from its page with the real Evolve button, then every stage
(A intro, B buildup, C silhouette / morph / flash, D reveal, E results) is visited and checked: full-screen, no horizontal
overflow, the sprite whole and inside the screen, buttons visible and touch-sized, no overlapping text, the attribute table
inside the screen. The evolution is committed once before the scene (stage +1, one timeline entry, saved); Skip, Replay,
Continue, a reload mid-animation and reduced motion are exercised; sound toggles the setting. At 390 px the stages are
screenshotted (full and reduced motion) and frame times are measured with the CPU throttled 4× (a lower-powered phone).
  python3 tools/evolution-ui-check.py --save=EXPORT.json [--shots=DIR]
Emulated browser, not a real device."""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
TEXT = open(args['save']).read(); SHOTS = args.get('shots')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
problems, errors, report = [], [], {'perf': {}, 'widths': {}}
def check(c, m):
    if not c: problems.append(m)
    return c
IMPORT = """async (t) => { const Save = await import('./src/franchise/save.js'); const F = await import('./src/franchise/franchise.js'); const r = await window.__gb.importInto(1, Save.importJson(t)); const g = window.__gb.f; F.backfillAchievements(g); let n = 0; while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; g.season.recapShown = g.season.awardsShown = true; await window.__gb.save({ immediate: true }); return r.ok; }"""
READY = """async () => { const M = await import('./src/data/monsters.js'); return window.__gb.f.roster.filter((m) => M.evolutionReady(m)).map((m) => ({ id: m.id, name: m.name, type: m.type, stage: m.stage || 0 })); }"""
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm))"
STATE = """(id) => { const m = window.__gb.f.roster.find((x) => x.id === id); return { name: m.name, stage: m.stage || 0, evo: (m.career?.ev || []).filter((e) => e.t === 'evolve' && !e.x?.before).length, potential: m.potential, attrs: m.attributes, injury: JSON.stringify(window.__gb.f.injuryHistory || null), chem: JSON.stringify(window.__gb.f.partnerships || null) }; }"""
LAYOUT = r"""() => { const W = innerWidth, H = innerHeight; const sc = document.querySelector('.evo-scene'); if (!sc) return { missing: true };
  const out = { overflow: [], sprite: [], buttons: [], overlap: [], full: null, stage: sc.dataset.stage };
  const r0 = sc.getBoundingClientRect(); out.full = Math.abs(r0.width - W) < 2 && Math.abs(r0.height - H) < 2;
  if (document.documentElement.scrollWidth - W > 1) out.overflow.push('page +' + (document.documentElement.scrollWidth - W));
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false; let x = e; while (x && x !== sc) { if (parseFloat(getComputedStyle(x).opacity) < 0.05) return false; x = x.parentElement; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const st = sc.dataset.stage; const area = st === 'E' ? sc.querySelector('.evo-results') : sc.querySelector('.evo-show');
  for (const e of [...area.querySelectorAll('*')].filter(vis)) { const r = e.getBoundingClientRect(); if (r.right > W + 1 || r.left < -1) out.overflow.push((e.className?.baseVal ?? e.className) + ' ' + e.tagName); }
  for (const s of [...sc.querySelectorAll('.evo-sprite svg, .evo-form svg')].filter(vis)) { const r = s.getBoundingClientRect(); if (r.left < 0 || r.right > W || (st !== 'E' && (r.top < 0 || r.bottom > H))) out.sprite.push(`${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`); }
  out.spriteSize = Math.round(sc.querySelector('.evo-sprite svg').getBoundingClientRect().width);
  for (const b of [...sc.querySelectorAll('.evo-top .evo-btn, .evo-bottom .evo-btn')].filter(vis)) { const r = b.getBoundingClientRect(); if (r.height < 43 || r.left < 0 || r.right > W || r.bottom > H || r.top < 0) out.buttons.push(b.textContent.trim() + ` ${Math.round(r.height)}h ${Math.round(r.right)}r ${Math.round(r.bottom)}b`); }
  const blocks = st === 'E' ? [] : [...sc.querySelectorAll('.evo-head, .evo-figure, .evo-banner, .evo-caption, .evo-top, .evo-bottom .evo-btn')].filter(vis);
  const text = [...sc.querySelectorAll('.evo-head, .evo-banner, .evo-caption, .evo-top .evo-btn, .evo-bottom .evo-btn')].filter(vis);
  for (let i = 0; i < text.length; i++) for (let j = i + 1; j < text.length; j++) { if (text[i].contains(text[j]) || text[j].contains(text[i])) continue; const a = text[i].getBoundingClientRect(), b = text[j].getBoundingClientRect(); if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.overlap.push(text[i].className + ' / ' + text[j].className); }
  if (st === 'E') { const res = sc.querySelector('.evo-results').getBoundingClientRect(); const bot = sc.querySelector('.evo-continue').getBoundingClientRect(); if (res.bottom > bot.top + 1) out.overlap.push('results under the buttons'); }
  return out; }"""
def stage_check(p, w, label):
    lay = p.evaluate(LAYOUT)
    if not check(not lay.get('missing'), f'{w} {label}: the scene is open'): return lay
    check(lay['full'], f'{w} {label}: full screen')
    for k in ['overflow', 'sprite', 'buttons', 'overlap']: check(not lay[k], f'{w} {label}: {k} {lay[k][:4]}')
    return lay
def open_monster(p, id):
    p.evaluate(GO, ['monster', {'id': id}]); p.wait_for_timeout(350)
    btn = p.locator('main [data-action="evolve"]')
    return btn
SHOT_STAGES = [('1-intro', 'A', None, 900), ('2-buildup', 'B', None, 1600), ('3a-silhouette', 'C', 'silhouette', 900), ('3b-morph', 'C', 'morph', 700), ('3c-flash', 'C', 'flash', 190), ('4-reveal', 'D', None, 1300), ('5-results', 'E', None, 1800)]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for wi, w in enumerate([320, 360, 375, 390, 393, 412, 430]):
        ctx = b.new_context(viewport={'width': w, 'height': 568 if w == 320 else 844}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        check(p.evaluate(IMPORT, TEXT), f'{w}: the disposable save imports')
        ready = p.evaluate(READY); check(len(ready) >= 4, f'{w}: ready monsters {len(ready)}')
        mon = ready[wi % len(ready)] if w != 390 else next((x for x in ready if x['type'] == 'Fire'), ready[0])
        s0 = p.evaluate(STATE, mon['id'])
        btn = open_monster(p, mon['id']); check(btn.count() == 1, f'{w}: the Evolve button')
        btn.evaluate('e => e.click()'); p.wait_for_timeout(250)
        s1 = p.evaluate(STATE, mon['id'])
        check(s1['stage'] == s0['stage'] + 1 and s1['evo'] == s0['evo'] + 1, f'{w}: evolved once before the scene ({s0["stage"]}→{s1["stage"]}, timeline {s0["evo"]}→{s1["evo"]})')
        check(s1['injury'] == s0['injury'] and s1['chem'] == s0['chem'], f'{w}: injury history and chemistry untouched')
        check(p.evaluate("() => document.querySelector('.evo-scene')?.dataset.stage") == 'A', f'{w}: opens on stage A')
        sizes = {}
        for name, st, sub, wait in SHOT_STAGES:
            p.evaluate("([s, sub]) => document.querySelector('.evo-scene').__evo.goto(s, sub)", [st, sub]); p.wait_for_timeout(wait)
            lay = stage_check(p, w, name); sizes[name] = lay.get('spriteSize')
            if SHOTS and w == 390: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, f'evo-{name}.png'))
            if SHOTS and w in (320, 430) and st in ('A', 'D', 'E'): os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, f'evo-{w}-{name}.png'))
        report['widths'][w] = {'monster': f"{mon['name']} ({mon['type']})", 'spriteSize': sizes.get('1-intro')}
        check((sizes.get('1-intro') or 0) >= 128, f'{w}: large sprite ({sizes.get("1-intro")} px)')
        # the full attribute comparison opens inside the screen
        p.click('.evo-all summary'); p.wait_for_timeout(250); stage_check(p, w, 'all attributes')
        if SHOTS and w == 390: p.screenshot(path=os.path.join(SHOTS, 'evo-6-all-attributes.png'))
        # Replay changes nothing, Continue closes and the page shows the new form
        p.click('.evo-replay'); p.wait_for_timeout(300); check(p.evaluate("() => document.querySelector('.evo-scene').dataset.stage") == 'A', f'{w}: Replay restarts')
        p.click('.evo-skip'); p.wait_for_timeout(200); check(p.evaluate("() => document.querySelector('.evo-scene').dataset.stage") == 'E', f'{w}: Skip goes to the results')
        s2 = p.evaluate(STATE, mon['id']); check(json.dumps(s2) == json.dumps(s1), f'{w}: replay and skip change nothing')
        p.click('.evo-continue'); p.wait_for_timeout(400)
        check(p.locator('.evo-scene').count() == 0, f'{w}: Continue closes the scene'); check(s1['name'] in p.locator('main').inner_text(), f'{w}: the page shows {s1["name"]}')
        check(not p.evaluate("() => document.documentElement.classList.contains('evo-open')"), f'{w}: scrolling restored')
        if w == 390:
            # sound toggle
            other = [x for x in ready if x['id'] != mon['id']]
            m2 = other[0]; open_monster(p, m2['id']).evaluate('e => e.click()'); p.wait_for_timeout(200)
            p.click('.evo-sound'); check(p.evaluate("() => window.__gb.f.settings.evoSound === true") and p.get_attribute('.evo-sound', 'aria-pressed') == 'true', '390: the sound toggle turns sound on and remembers it')
            p.click('.evo-sound'); check(p.evaluate("() => window.__gb.f.settings.evoSound === false"), '390: and off')
            # performance with the CPU throttled 4x, through B, C and D
            cdp = ctx.new_cdp_session(p); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
            p.evaluate("() => document.querySelector('.evo-scene').__evo.play()")
            perf = p.evaluate("""() => new Promise((res) => { const t = []; let last = 0; const t0 = performance.now(); function f(ts) { if (last) t.push(ts - last); last = ts; if (ts - t0 < 9000) requestAnimationFrame(f); else { t.sort((a, b) => a - b); const avg = t.reduce((a, b) => a + b, 0) / t.length; res({ frames: t.length, avgMs: Math.round(avg * 10) / 10, fps: Math.round(1000 / avg), p95Ms: Math.round(t[Math.floor(t.length * 0.95)]), worstMs: Math.round(t[t.length - 1]), fx: document.querySelector('.evo-scene').__evo.fx.stats() }); } } requestAnimationFrame(f); })""")
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1}); report['perf']['cpu4x'] = perf
            p.evaluate("() => document.querySelector('.evo-scene').__evo.play()")
            perf1 = p.evaluate("""() => new Promise((res) => { const t = []; let last = 0; const t0 = performance.now(); function f(ts) { if (last) t.push(ts - last); last = ts; if (ts - t0 < 9000) requestAnimationFrame(f); else { t.sort((a, b) => a - b); const avg = t.reduce((a, b) => a + b, 0) / t.length; res({ frames: t.length, avgMs: Math.round(avg * 10) / 10, fps: Math.round(1000 / avg), p95Ms: Math.round(t[Math.floor(t.length * 0.95)]), fx: document.querySelector('.evo-scene').__evo.fx.stats() }); } } requestAnimationFrame(f); })""")
            report['perf']['normal'] = perf1
            check(perf['fps'] >= 24, f"390: at least 24 fps with the CPU throttled 4x ({perf['fps']})")
            # reload in the middle of the animation: evolved once, no scene, no button again
            s3 = p.evaluate(STATE, m2['id']); p.evaluate("() => document.querySelector('.evo-scene').__evo.goto('B')"); p.wait_for_timeout(300)
            p.evaluate("() => window.__gb.save({ immediate: true })"); p.reload(); p.wait_for_function("() => window.__gb && window.__gb.f", timeout=60000); p.wait_for_timeout(500)
            s4 = p.evaluate(STATE, m2['id'])
            check(s4['stage'] == s3['stage'] and s4['evo'] == s3['evo'] and json.dumps(s4['attrs']) == json.dumps(s3['attrs']), '390: a reload mid-animation keeps the evolution exactly once')
            check(p.locator('.evo-scene').count() == 0, '390: no scene after the reload')
            # reduced motion
            m3 = other[1]; p.evaluate("() => { window.__gb.f.settings.reducedMotion = true; document.documentElement.dataset.reducedMotion = '1'; }")
            open_monster(p, m3['id']).evaluate('e => e.click()'); p.wait_for_timeout(200)
            check(p.evaluate("() => document.querySelector('.evo-scene').classList.contains('reduced')"), '390: reduced motion is applied')
            check(p.evaluate("() => getComputedStyle(document.querySelector('.evo-fx')).display === 'none' && getComputedStyle(document.querySelector('.evo-rings')).display === 'none' && getComputedStyle(document.querySelector('.evo-flash')).display === 'none'"), '390: reduced motion: no particles, rings or flash')
            for name, wait in [('1-intro', 500), ('3-crossfade', 1000), ('4-reveal', 1600), ('5-results', 2900)]:
                p.wait_for_timeout(wait); lay = stage_check(p, w, f'reduced {name}')
                if SHOTS: p.screenshot(path=os.path.join(SHOTS, f'evo-reduced-{name}.png'))
            check(p.evaluate("() => document.querySelector('.evo-scene').__evo.log.join('')") in ('ACDE', 'ACD', 'AC'), '390: reduced motion skips the buildup stage: ' + p.evaluate("() => document.querySelector('.evo-scene').__evo.log.join('')"))
            p.click('.evo-skip') if p.locator('.evo-skip').is_visible() else None; p.wait_for_timeout(200); p.click('.evo-continue'); p.wait_for_timeout(300)
        ctx.close()
report['problems'] = problems; report['errors'] = errors[:10]
print(json.dumps(report, indent=1)[:4000])
ok = not problems and not errors
print(('EVOLUTION UI CHECK PASSED' if ok else 'EVOLUTION UI CHECK FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(0 if ok else 1)
