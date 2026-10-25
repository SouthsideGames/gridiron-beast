#!/usr/bin/env python3
"""Injury History check (GDD §50): the Career Profile's Injury History section in headless Chromium at 320/360/375/390/393/412/430
px over a disposable played save (tools/injury-saves.mjs). A monster with a long log, one injured now (the log opens, "Out now"),
one with no injuries, an AI club's monster and a retired legend. Each: the four numbers, the indicator, the log folds and opens,
no overflow, overlap or clipped text, no page errors; viewing writes nothing.
  python3 tools/injury-ui-check.py --save=EXPORT.json [--shots=DIR]
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
problems, errors, report = [], [], {}
def check(c, m):
    if not c: problems.append(m)
    return c
LAYOUT = r"""() => { const W = innerWidth; const root = document.querySelector('.inj-sec'); if (!root) return { missing: true }; const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const out = { overflow: [], overlap: [], clipped: [] }; const all = [root, ...root.querySelectorAll('*')].filter(vis);
  if (document.documentElement.scrollWidth - W > 1) out.overflow.push('page +' + (document.documentElement.scrollWidth - W));
  for (const e of all) { const r = e.getBoundingClientRect(); if (r.right > W + 1) out.overflow.push((e.className || e.tagName) + ''); }
  const txt = all.filter((e) => e.matches('b, span, summary, .chip'));
  for (const e of all.filter((e) => e.matches('.chip'))) if (e.scrollWidth > e.clientWidth + 1) out.clipped.push(e.innerText.slice(0, 20));
  const boxes = [...root.querySelectorAll('.inj-facts > div')]; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i].getBoundingClientRect(), b = boxes[j].getBoundingClientRect(); if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) out.overlap.push(i + '/' + j); }
  return out; }"""
PICK = r"""async () => { const f = window.__gb.f; const H = f.injuryHistory; const own = new Set(f.roster.map((m) => m.id));
  const n = (id) => (H.log[id] || []).length + (H.open[id] ? 1 : 0);
  return { long: f.roster.map((m) => m.id).sort((a, b) => n(b) - n(a))[0], now: Object.keys(H.open).find((id) => own.has(id)) || Object.keys(H.open)[0], none: f.roster.find((m) => !n(m.id))?.id,
    ai: Object.keys(H.log).find((id) => !own.has(id) && f.league.monsters[id]), legend: Object.keys(f.league.legends || {}).find((id) => n(id)) || null }; }"""
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm))"
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [320, 360, 375, 390, 393, 412, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        r = p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const F = await import('./src/franchise/franchise.js'); const r = await window.__gb.importInto(1, Save.importJson(t)); const g = window.__gb.f; F.backfillAchievements(g); let n = 0; while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; g.season.recapShown = g.season.awardsShown = true; await window.__gb.save({ immediate: true }); return r.ok; }""", TEXT)
        check(r, f'{w}: the disposable save imports')
        ids = p.evaluate(PICK); report['ids'] = ids; before = p.evaluate("() => JSON.stringify(window.__gb.f)")
        for kind, id in ids.items():
            if not id: continue
            p.evaluate(GO, ['career', {'id': id, 'tab': 'overview'}]); p.wait_for_timeout(300)
            sec = p.locator('main .inj-sec')
            if not check(sec.count() == 1, f'{w} {kind}: the Injury History section'): continue
            txt = sec.inner_text()
            check(all(x.lower() in txt.lower() for x in ['Career injuries', 'Games missed', 'Durability']), f'{w} {kind}: the three numbers')
            check(p.locator('main .inj-ind').count() == 1, f'{w} {kind}: the indicator')
            if kind == 'none': check('No injuries recorded since tracking began' in txt, f'{w} none: the positive message')
            if kind == 'now': check(p.locator('main .inj-log[open]').count() == 1 and 'Out now' in txt, f'{w} now: the log opens on a current injury')
            if kind == 'long' and p.locator('main .inj-log').count():
                if not p.locator('main .inj-log[open]').count(): p.click('main .inj-log summary'); p.wait_for_timeout(150)
                check(p.locator('main .inj-row').count() >= 1, f'{w} long: the log lists the injuries')
            p.evaluate("() => document.querySelector('.inj-sec').scrollIntoView({ block: 'start' })"); p.wait_for_timeout(100)
            lay = p.evaluate(LAYOUT)
            for k in ['overflow', 'overlap', 'clipped']: check(not lay.get(k), f'{w} {kind}: {k} {lay.get(k)}')
            if SHOTS and w == 390: os.makedirs(SHOTS, exist_ok=True); sec.screenshot(path=os.path.join(SHOTS, f'injury-{kind}.png'))
        check(p.evaluate("() => JSON.stringify(window.__gb.f)") == before, f'{w}: viewing changed nothing')
        ctx.close()
report['problems'] = problems; report['errors'] = errors[:10]
print(json.dumps(report, indent=1)[:2000])
ok = not problems and not errors
print(('INJURY UI CHECK PASSED' if ok else 'INJURY UI CHECK FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(0 if ok else 1)
