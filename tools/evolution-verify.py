#!/usr/bin/env python3
"""Evolution pre-merge verification (GDD §51), headless Chromium at 390 px with the browser's autoplay rule set to require a tap,
over a disposable save (tools/evolution-saves.mjs). It checks, with page reloads standing in for closing and reopening the game:
  1. the evolution is saved exactly once (stage +1, one timeline entry, the same after a reload);
  2. Skip, Replay (three times) and Continue add nothing;
  3. Captain Partnerships and Injury History are byte-identical across the evolution;
  4. with sound off the whole sequence plays (A–E) and no audio context is ever created;
  5. the sound preference persists across reloads (Settings and the scene's button), audio starts only inside a tap, cues
     play when on and nothing plays when off;
  6. reduced motion: the calm sequence, no particles, rings or flash;
  7. every number on the results panel equals the monster's real change (all 12 attributes, overall, potential, forms);
  python3 tools/evolution-verify.py --save=EXPORT.json"""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
TEXT = open(args['save']).read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
problems, errors, report = [], [], {}
def check(c, m):
    if not c: problems.append(m)
    return c
AUDIO_SPY = """(() => { const R = window.__audio = { made: 0, inTap: 0, outTap: 0, tones: 0 }; const Real = window.AudioContext || window.webkitAudioContext; if (!Real) return;
  class Spy extends Real { constructor(...a) { super(...a); R.made++; if (navigator.userActivation && navigator.userActivation.isActive) R.inTap++; else R.outTap++; const o = this.createOscillator.bind(this); this.createOscillator = () => { const x = o(); const st = x.start.bind(x); x.start = (...b) => { R.tones++; return st(...b); }; return x; }; } }
  window.AudioContext = Spy; window.webkitAudioContext = Spy; })();"""
IMPORT = """async (t) => { const Save = await import('./src/franchise/save.js'); const F = await import('./src/franchise/franchise.js'); const r = await window.__gb.importInto(1, Save.importJson(t)); const g = window.__gb.f; F.backfillAchievements(g); let n = 0; while (F.nextScene(g) && n++ < 40) F.dismissScene(g); g.achievementsBackfilled = true; g.season.recapShown = g.season.awardsShown = true; await window.__gb.save({ immediate: true }); return r.ok; }"""
READY = """async () => { const M = await import('./src/data/monsters.js'); return window.__gb.f.roster.filter((m) => M.evolutionReady(m)).map((m) => m.id); }"""
SNAP = """async (id) => { const M = await import('./src/data/monsters.js'); const f = window.__gb.f; const m = f.roster.find((x) => x.id === id); return { name: m.name, stage: m.stage || 0, level: m.level, xp: m.xp, potential: m.potential, salary: m.salary, attrs: { ...m.attributes }, ovr: M.monsterOverall(m), evo: (m.career?.ev || []).filter((e) => e.t === 'evolve' && !e.x?.before).length, chem: JSON.stringify(f.partnerships || null), inj: JSON.stringify(f.injuryHistory || null), rosterIds: f.roster.map((x) => x.id).join(','), sound: !!f.settings.evoSound }; }"""
PANEL = """() => { const sc = document.querySelector('.evo-scene'); const rows = [...sc.querySelectorAll('.evo-table.full tbody tr')].map((tr) => { const td = tr.querySelectorAll('td'); return { label: tr.querySelector('th').textContent.trim(), from: Number(td[0].textContent.trim()), to: Number(td[1].textContent.trim().split(' ')[0]), delta: (td[1].textContent.match(/\\(([+-]\\d+)\\)/) || [])[1] || null }; });
  const tiles = [...sc.querySelectorAll('.evo-tile')].map((t) => ({ label: t.querySelector('.lbl').textContent, nums: [...t.querySelector('.val').textContent.matchAll(/\\d+/g)].map(Number), d: t.querySelector('.evo-d')?.textContent || null }));
  const names = [...sc.querySelectorAll('.evo-form .nm')].map((e) => e.textContent); const keyRows = sc.querySelectorAll('.evo-attrs > .evo-table tbody tr').length; return { rows, tiles, names, keyRows, facts: sc.querySelector('.evo-facts').innerText }; }"""
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm))"
LABEL = {'speed': 'Speed', 'agility': 'Agility', 'strength': 'Strength', 'awareness': 'Awareness', 'catching': 'Catching', 'arm': 'Arm', 'accuracy': 'Accuracy', 'blocking': 'Blocking', 'tackling': 'Tackling', 'coverage': 'Coverage', 'durability': 'Durability', 'kicking': 'Kicking'}
def boot(p, imp=False):
    p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && (!window.__gb.f || window.__gb.f.roster)", timeout=60000)
    if imp: check(p.evaluate(IMPORT, TEXT), 'the disposable save imports')
def reload(p): p.evaluate("() => window.__gb.save({ immediate: true })"); p.reload(); boot(p); p.wait_for_function("() => window.__gb.f && window.__gb.f.roster", timeout=60000); p.wait_for_timeout(300)
def evolve(p, id):
    p.evaluate(GO, ['monster', {'id': id}]); p.wait_for_timeout(350)
    p.locator('main [data-action="evolve"]').evaluate('e => e.click()'); p.wait_for_timeout(250)
stage = lambda p: p.evaluate("() => document.querySelector('.evo-scene')?.dataset.stage || null")
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--autoplay-policy=user-gesture-required'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); ctx.add_init_script(AUDIO_SPY); p = ctx.new_page()
    p.on('pageerror', lambda e: errors.append(str(e)))
    p.goto(URL); boot(p, imp=True)
    ready = p.evaluate(READY); check(len(ready) >= 4, f'ready monsters: {len(ready)}')
    # --- 1, 2, 3, 4, 7: sound off (the default), a full unattended play
    a = ready[0]; s0 = p.evaluate(SNAP, a); check(not s0['sound'], 'sound is off by default')
    evolve(p, a); s1 = p.evaluate(SNAP, a)
    check(s1['stage'] == s0['stage'] + 1 and s1['evo'] == s0['evo'] + 1, f'1: evolved once ({s0["stage"]}→{s1["stage"]}, timeline {s0["evo"]}→{s1["evo"]})')
    check(s1['chem'] == s0['chem'] and s1['inj'] == s0['inj'] and s1['rosterIds'] == s0['rosterIds'], '3: Captain Partnerships, Injury History and the roster intact')
    p.wait_for_timeout(11200); log = p.evaluate("() => document.querySelector('.evo-scene').__evo.log.join('')")
    check(log == 'ABCDE' and stage(p) == 'E', f'4: with sound off the whole sequence plays unattended ({log})')
    check(p.evaluate("() => window.__audio.made") == 0, f'4: sound off: no audio context is ever created ({p.evaluate("() => window.__audio")})')
    panel = p.evaluate(PANEL); report['panel'] = {'names': panel['names'], 'tiles': panel['tiles'], 'keyRows': panel['keyRows']}
    for k, lab in LABEL.items():
        row = next((r for r in panel['rows'] if r['label'] == lab), None)
        if not check(row, f'7: {lab} row'): continue
        d = s1['attrs'][k] - s0['attrs'][k]
        check(row['from'] == s0['attrs'][k] and row['to'] == s1['attrs'][k] and (row['delta'] == (f'+{d}' if d > 0 else None if d == 0 else str(d))), f'7: {lab} {row} vs {s0["attrs"][k]}→{s1["attrs"][k]}')
    ovr = next(t for t in panel['tiles'] if t['label'] == 'Overall'); pot = next(t for t in panel['tiles'] if t['label'] == 'Potential')
    check(ovr['nums'][:2] == [s0['ovr'], s1['ovr']], f'7: overall {ovr} vs {s0["ovr"]}→{s1["ovr"]}'); check(pot['nums'][:2] == [s0['potential'], s1['potential']], f'7: potential {pot}')
    check(panel['names'] == [s0['name'], s1['name']], f'7: forms {panel["names"]}'); check('Salary unchanged' in panel['facts'] and s1['salary'] == s0['salary'], '7: salary unchanged, as shown')
    # --- 2: replay three times, skip, continue; then reload
    for _ in range(3): p.click('.evo-replay') if stage(p) == 'E' else None; p.wait_for_timeout(400); p.click('.evo-skip'); p.wait_for_timeout(200)
    p.click('.evo-continue'); p.wait_for_timeout(300); s2 = p.evaluate(SNAP, a)
    check(json.dumps(s2) == json.dumps(s1), '2: Replay ×3, Skip and Continue add nothing')
    reload(p); s3 = p.evaluate(SNAP, a); check(json.dumps(s3) == json.dumps(s1), '1: after closing and reopening, exactly one evolution is saved')
    check(p.evaluate("async (id) => (await import('./src/franchise/franchise.js')).evolveMonster(window.__gb.f, id).ok", a) is False, '2: evolving again is refused')
    # --- 5: preference from Settings persists, audio starts inside the tap, cues play
    p.evaluate(GO, ['settings', {}]); p.wait_for_timeout(400)
    box = p.locator('input[data-change="evosound"]')
    if check(box.count() == 1, '5: the Settings switch exists'):
        check(not box.is_checked(), '5: Settings shows off'); box.check(); p.wait_for_timeout(200)
    reload(p); check(p.evaluate("() => window.__gb.f.settings.evoSound") is True, '5: the Settings choice persists across a reload')
    p.evaluate(GO, ['settings', {}]); p.wait_for_timeout(300); check(p.locator('input[data-change="evosound"]').is_checked(), '5: Settings shows it on after the reload')
    bm = ready[1]; evolve(p, bm); au = p.evaluate("() => window.__audio")
    check(au['made'] == 1 and au['inTap'] == 1 and au['outTap'] == 0, f'5: with sound on, audio starts inside the Evolve tap ({au})')
    check(p.get_attribute('.evo-sound', 'aria-pressed') == 'true', '5: the scene shows sound on')
    p.wait_for_timeout(9000); au2 = p.evaluate("() => window.__audio"); report['audio_on'] = au2
    check(au2['tones'] >= 10 and au2['outTap'] == 0, f'5: the three cues play ({au2["tones"]} tones), never an audio context outside a tap')
    p.click('.evo-skip') if stage(p) != 'E' else None; p.wait_for_timeout(200)
    p.click('.evo-sound'); p.wait_for_timeout(100); check(p.evaluate("() => window.__gb.f.settings.evoSound") is False, '5: the scene button turns it off')
    t0 = p.evaluate("() => window.__audio.tones"); p.click('.evo-replay'); p.wait_for_timeout(9000)
    check(p.evaluate("() => window.__audio.tones") == t0, '5: turned off, a replay plays nothing')
    p.click('.evo-skip') if stage(p) != 'E' else None; p.wait_for_timeout(200); p.click('.evo-continue'); p.wait_for_timeout(300)
    reload(p); check(p.evaluate("() => window.__gb.f.settings.evoSound") is False, '5: the scene choice persists across a reload')
    # --- 6: reduced motion
    cm = ready[2]; p.evaluate("() => { window.__gb.f.settings.reducedMotion = true; document.documentElement.dataset.reducedMotion = '1'; }")
    evolve(p, cm); check(p.evaluate("() => document.querySelector('.evo-scene').classList.contains('reduced')"), '6: reduced motion applied')
    check(p.evaluate("() => ['.evo-fx', '.evo-rings', '.evo-flash'].every((s) => getComputedStyle(document.querySelector(s)).display === 'none')"), '6: no particles, rings or flash')
    p.wait_for_timeout(6200); log = p.evaluate("() => document.querySelector('.evo-scene').__evo.log.join('')")
    check(log == 'ACDE', f'6: the calm sequence plays to the results ({log})'); check(p.evaluate("() => document.querySelector('.evo-scene').__evo.fx.stats().particles") == 0, '6: no particles drawn')
    p.click('.evo-continue'); p.wait_for_timeout(300)
    ctx.close()
report['problems'] = problems; report['errors'] = errors[:10]
print(json.dumps(report, indent=1)[:3000])
ok = not problems and not errors
print(('EVOLUTION VERIFY PASSED' if ok else 'EVOLUTION VERIFY FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(0 if ok else 1)
