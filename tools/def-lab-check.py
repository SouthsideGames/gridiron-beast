#!/usr/bin/env python3
"""Defensive scenario check (Defensive AI audit, v42.9), headless Chromium as a phone (touch) at 390/320/430 px: Developer Tools →
Attribute Testing Lab → Defensive scenario; a preset (man coverage, ball forced to WR1) runs on the real engine and the table shows
the engine's own numbers (cross-checked headless); custom plays/defense/subject/QB can be chosen; the side-by-side watch draws the
developer overlay (assignment lines, zones, intended path, actual path, decision labels) and a decision list; Pause, frame step and
0.25×/0.5×/1× work; the overlay toggles and the one-defender focus work; a run scenario and a rush scenario run; the overlay never
appears on the ordinary attribute trial; no franchise created or changed; nothing overflows; no page errors.
  python3 tools/def-lab-check.py [--shots=DIR]"""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[1:]); SHOTS = args.get('shots')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'; problems, errors, notes = [], [], []
def check(c, m):
    (notes if c else problems).append(m); return c
def shot(p, n):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, n + '.png'), full_page=True)
GO = "([n]) => import('./src/ui/router.js').then((R) => R.go(n, {}))"
TABLE = "() => [...document.querySelectorAll('.attr-results .lab-table tr')].slice(1).map((tr) => [...tr.children].map((c) => c.innerText.trim()))"
LAYOUT = "() => ({ over: document.documentElement.scrollWidth - innerWidth, bad: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).map((e) => e.className || e.tagName).slice(0, 4) })"
OV = "(k) => { const s = document.querySelector('#attrfield' + k); return s ? { ov: s.querySelectorAll('.def-overlay').length, man: s.querySelectorAll('.def-overlay line[stroke=\"#ff9f43\"]').length, zone: s.querySelectorAll('.def-overlay circle[stroke=\"#ffd166\"]').length, aim: s.querySelectorAll('.def-overlay line[stroke=\"#7cf3ff\"]').length, path: s.querySelectorAll('.def-overlay polyline').length, text: s.querySelectorAll('.def-overlay text').length } : null; }"
def num(s): return float(''.join(ch for ch in s if ch.isdigit() or ch in '.-') or 'nan')
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [390, 320, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}')); p.on('console', lambda m, w=w: errors.append(f'{w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        franchise0 = p.evaluate("() => JSON.stringify(window.__gb.f || null)")
        p.evaluate(GO, ['menu']); p.wait_for_timeout(300); p.locator('main [data-screen="developer"]').first.tap(); p.wait_for_timeout(300)
        p.locator('main [data-screen="attr-lab"]').tap(); p.wait_for_timeout(400)
        check(p.locator('[data-action="lab-mode"][data-v="def"]').count() == 1, f'{w}: the Attribute Testing Lab offers a Defensive scenario mode'); p.locator('[data-action="lab-mode"][data-v="def"]').tap(); p.wait_for_timeout(300)
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and not lay['bad'], f'{w}: setup fits {lay}')
        p.select_option('[data-change=def-preset]', 'man_go'); p.wait_for_timeout(200); p.select_option('[data-change=attr-n]', '25')
        p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000)
        rows = p.evaluate(TABLE); by = {r[0].lower(): r for r in rows}
        key = 'separation when the ball arrives'
        check(key in by and num(by[key][1]) > num(by[key][2]), f'{w}: Coverage 95 stays closer on the go route {by.get(key)}')
        exp = p.evaluate("async () => { const D = await import('./src/lab/def-scenario.js'); const sc = D.PRESETS.find((x) => x.id === 'man_go'); const agg = (v) => D.aggregate(Array.from({ length: 25 }, (_, i) => D.measureScenario(D.runScenario(sc, v, 1000 + i)))); return [agg(50).arriveSep, agg(95).arriveSep]; }")
        check(abs(num(by[key][1]) - exp[0]) < 0.06 and abs(num(by[key][2]) - exp[1]) < 0.06, f'{w}: the table shows the engine\'s own numbers {by[key][1:3]} vs {exp}')
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and not lay['bad'], f'{w}: results fit {lay}')
        p.locator('[data-action="attr-watch"]').first.tap(); p.wait_for_timeout(1200)
        o = p.evaluate(OV, 0); check(o and o['ov'] == 1 and o['man'] >= 3 and o['zone'] >= 1 and o['aim'] >= 4 and o['path'] >= 4 and o['text'] >= 6, f'{w}: overlay shows man lines, the zone, intended and actual paths, decisions {o}')
        check(p.evaluate(OV, 1)['ov'] == 1, f'{w}: both fields carry the overlay')
        check(p.locator('#defdecisions li').count() >= 12, f'{w}: the decision list names every defender\'s assignment and decision')
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and not lay['bad'], f'{w}: watch fits {lay}')
        if w == 390: shot(p, 'def-1-watch')
        p.locator('[data-action="def-pause"]').tap(); p.wait_for_timeout(150); c1 = p.locator('#attrclock0').inner_text(); p.wait_for_timeout(500); c2 = p.locator('#attrclock0').inner_text()
        check(c1 == c2 and p.locator('[data-action="def-pause"]').inner_text().strip().endswith('Play'), f'{w}: Pause holds the frame ({c1} → {c2})')
        p.locator('[data-action="def-step"][data-d="1"]').tap(); p.wait_for_timeout(100); p.locator('[data-action="def-step"][data-d="1"]').tap(); p.wait_for_timeout(100); c3 = p.locator('#attrclock0').inner_text()
        p.locator('[data-action="def-step"][data-d="-1"]').tap(); p.wait_for_timeout(100); c4 = p.locator('#attrclock0').inner_text()
        check(num(c3) > num(c2) and num(c4) < num(c3), f'{w}: frame step forward and back ({c2} → {c3} → {c4})')
        p.locator('[data-action="def-speed"][data-v="0.25"]').tap(); p.locator('[data-action="def-pause"]').tap(); p.wait_for_timeout(1000); a = num(p.locator('#attrclock0').inner_text())
        p.locator('[data-action="def-speed"][data-v="1"]').tap(); p.wait_for_timeout(1000); bb = num(p.locator('#attrclock0').inner_text())
        check(0.1 <= a - num(c4) <= 0.5 and bb - a >= 0.6, f'{w}: slow motion 0.25× then 1× ({c4} → {a} → {bb})')
        p.locator('[data-action="def-pause"]').tap(); p.wait_for_timeout(100)
        for k in ['assign', 'aim', 'path', 'labels']: p.locator(f'[data-change="def-show"][data-k="{k}"]').uncheck(); p.wait_for_timeout(60)
        o = p.evaluate(OV, 0); check(o['man'] == 0 and o['zone'] == 0 and o['aim'] == 0 and o['path'] == 0 and o['text'] == 0, f'{w}: each overlay layer can be switched off {o}')
        for k in ['assign', 'aim', 'path', 'labels']: p.locator(f'[data-change="def-show"][data-k="{k}"]').check(); p.wait_for_timeout(60)
        p.select_option('[data-change=def-focus]', 'CB1'); p.wait_for_timeout(150); o = p.evaluate(OV, 0)
        li = p.locator('#defdecisions li').count(); check(o['text'] == 1 and li == 2, f'{w}: focus on one defender {o} list {li}')
        if w != 390: ctx.close(); continue
        shot(p, 'def-2-focus')
        # custom: a run, a rush test, a zone call with a single subject, the real QB
        p.select_option('[data-change=def-off]', 'inside_zone'); p.wait_for_timeout(150); p.select_option('[data-change=def-def]', 'cover_3'); p.wait_for_timeout(150)
        p.select_option('[data-change=def-subject]', 'LB1'); p.select_option('[data-change=def-attr]', 'awareness'); p.wait_for_timeout(150); p.select_option('[data-change=def-qb]', 'ai'); p.wait_for_timeout(150); p.select_option('[data-change=attr-n]', '25')
        p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000); rows = p.evaluate(TABLE); by = {r[0].lower(): r for r in rows}
        check('yards per carry (runs)' in by and 'completion allowed (when thrown)' not in by, f'run scenario shows run measures {[r[0] for r in rows]}')
        p.locator('[data-action="attr-watch"]').first.tap(); p.wait_for_timeout(1500)
        check(p.evaluate("() => [...document.querySelectorAll('#attrfield0 .def-overlay text')].some((t) => /run fit|pursue|run read/.test(t.textContent))"), 'run decisions are labelled (run fit / pursue / run read)')
        p.select_option('[data-change=def-preset]', 'rush_hold'); p.wait_for_timeout(150); p.select_option('[data-change=attr-n]', '25'); p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000)
        rows = p.evaluate(TABLE); by = {r[0].lower(): r for r in rows}; check('sacks' in by and 'time to pressure' in by, f'rush scenario measures sacks and pressure {[r[0] for r in rows]}')
        shot(p, 'def-3-rush')
        # zone reads (v42.12): levels vs Tampa 2 with the real QB; mid-play the zone defenders show the receivers in their zone
        # (yellow dots), the one each is playing (green), and the decision list says why and how many are in his zone
        p.select_option('[data-change=def-preset]', 'zone_levels'); p.wait_for_timeout(150); p.select_option('[data-change=attr-n]', '25'); p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000)
        p.locator('[data-action="attr-watch"]').first.tap(); p.wait_for_timeout(300); p.locator('[data-action="def-pause"]').tap(); p.wait_for_timeout(100)
        if p.locator('[data-change=def-focus]').count(): p.select_option('[data-change=def-focus]', ''); p.wait_for_timeout(100)
        ZR = """() => { const s = document.querySelector('#attrfield0'); return { tgt: s.querySelectorAll(".def-overlay line[stroke='#6ee7a0']").length, seen: s.querySelectorAll(".def-overlay line[stroke='#ffd166']").length, why: [...document.querySelectorAll('#defdecisions li')].filter((li) => /in zone/.test(li.textContent)).length }; }"""
        best = {'tgt': 0, 'seen': 0, 'why': 0}
        for _ in range(40):
            p.locator('[data-action="def-step"][data-d="1"]').tap(); p.wait_for_timeout(40); z = p.evaluate(ZR)
            for k in best: best[k] = max(best[k], z[k])
        check(best['tgt'] >= 2 and best['why'] >= 2, f'zone overlay shows whom each zone defender plays and why {best}')
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and not lay['bad'], f'zone watch fits {lay}')
        shot(p, 'def-4-zone')
        # pursuit (v42.13): the ball carrier's Speed is the tested attribute; the pursuers' labels show their effort, gap and angle and
        # a red line to the carrier
        p.select_option('[data-change=def-preset]', 'pursuit_bubble'); p.wait_for_timeout(150); p.select_option('[data-change=attr-n]', '25'); p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000)
        rows = p.evaluate(TABLE); by = {r[0].lower(): r for r in rows}; check('touchdowns' in by and 'yards allowed' in by, f'pursuit scenario measures yards and touchdowns {[r[0] for r in rows]}')
        check('ball carrier wr3' in p.locator('.lab-setup').inner_text().lower(), 'the setup names the ball carrier as the tested monster')
        p.locator('[data-action="attr-watch"]').first.tap(); p.wait_for_timeout(300); p.locator('[data-action="def-pause"]').tap(); p.wait_for_timeout(100)
        if p.locator('[data-change=def-focus]').count(): p.select_option('[data-change=def-focus]', ''); p.wait_for_timeout(100)
        PU = """() => { const s = document.querySelector('#attrfield0'); return { red: s.querySelectorAll(".def-overlay line[stroke='#ff6b6b']").length, lab: [...document.querySelectorAll('#defdecisions li')].filter((t) => /×1\\.0\\d vs ×0\\.94 · \\d/.test(t.textContent)).length }; }"""
        bestp = {'red': 0, 'lab': 0}
        for _ in range(50):
            p.locator('[data-action="def-step"][data-d="1"]').tap(); p.wait_for_timeout(30); z = p.evaluate(PU)
            for k in bestp: bestp[k] = max(bestp[k], z[k])
        check(bestp['red'] >= 1 and bestp['lab'] >= 1, f'pursuers show the carrier line and their effort / gap / angle {bestp}')
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and not lay['bad'], f'pursuit watch fits {lay}')
        shot(p, 'def-5-pursuit')
        # the ordinary attribute trial never draws the overlay
        p.locator('[data-action="lab-mode"][data-v="attr"]').tap(); p.wait_for_timeout(200); p.select_option('[data-change=attr-attr]', 'coverage'); p.wait_for_timeout(150); p.select_option('[data-change=attr-n]', '25')
        p.locator('[data-action="attr-run"]').tap(); p.wait_for_selector('.attr-results', timeout=60000); p.locator('[data-action="attr-watch"]').first.tap(); p.wait_for_timeout(800)
        check(p.evaluate("() => document.querySelectorAll('.def-overlay').length") == 0, 'attribute trials draw no developer overlay')
        check(p.evaluate("() => JSON.stringify(window.__gb.f || null)") == franchise0, 'no franchise created or changed')
        ctx.close()
print('\n'.join('ok: ' + n for n in notes)); print(json.dumps({'problems': problems, 'errors': errors[:8]}, indent=1))
print('DEF LAB CHECK ' + ('PASSED' if not problems and not errors else 'FAILED'))
sys.exit(0 if not problems and not errors else 1)
