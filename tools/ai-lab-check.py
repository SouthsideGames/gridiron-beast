#!/usr/bin/env python3
"""AI Testing Lab check (GDD §53.8, v42.6 controls), headless Chromium as a phone (touch, 390x844 full flow; 320/375/430 layout):
  Main Menu -> Developer -> AI Testing Lab by taps; the chosen play's own offensive art before the snap (the exact Franchise Mode
  renderer output) and none after it; no defensive art, name or coverage before the play is over, revealed afterwards; tapping a
  receiving monster on the field throws to that monster, tapping the quarterback scrambles, tapping a defender does nothing; holding
  the ball lets the rush get home (a fixed, reproducible situation; recorded as 'hold', ends in a sack); Live and Paused modes; the rotation: no defense repeated within a cycle,
  progress kept per offensive play across play switches and a reload; records, comparison, export/clear/import; no Throw-away
  anywhere; no franchise created or changed; no horizontal overflow, the Snap button on screen with the field; no page errors.
  python3 tools/ai-lab-check.py [--shots=DIR]"""
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
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, n + '.png'))
GO = "([n]) => import('./src/ui/router.js').then((R) => R.go(n, {}))"
COUNT = "() => import('./src/lab/lab-store.js').then((S) => S.labAll()).then((r) => r.length)"
LAB = "() => { const L = window.__gbLab; return { phase: L.phase, off: L.sit?.offense, def: L.sit?.defense, i: L.i, rec: L.rec && { action: L.rec.human.action, target: L.rec.human.target, targetId: L.rec.human.targetId, def: L.rec.situation.defensePlay }, hs: L.humanSim && { result: L.humanSim.result, target: L.humanSim.stats?.target, scramble: L.humanSim.events.some((e) => e.kind === 'scramble'), dec: L.humanSim.qb?.decision && { by: L.humanSim.qb.decision.by, action: L.humanSim.qb.decision.action, slot: L.humanSim.qb.decision.slot } } }; }"
# Screen position of a slot in the frame being shown (the same mapping the field uses), for a real tap.
POS = """(slot) => { const L = window.__gbLab; const svg = document.querySelector('#labfield'); const f = L.hold.frames[Math.min(L.i, L.hold.frames.length - 1)];
  const side = f.off.find((p) => p[0] === slot) ? f.off : f.def; const p = side.find((q) => q[0] === slot); if (!p) return null; const top = L.sit.ballOn + 36;
  const pt = svg.createSVGPoint(); pt.x = p[2]; pt.y = top - (L.sit.ballOn + p[1]) - 0.6; const s = pt.matrixTransform(svg.getScreenCTM()); return { x: s.x, y: s.y }; }"""
ART = """async () => { const L = window.__gbLab; const { assignmentLines } = await import('./src/ui/play-art.js'); const { PLAYS } = await import('./src/data/playbook.js'); const { boundsFor } = await import('./src/core/field.js');
  const ballOn = L.sit.ballOn, top = ballOn + 36; const proj = { p: ([x, y]) => [y, top - (ballOn + x)] }; const art = (id) => assignmentLines(PLAYS[id], proj, { limitX: boundsFor(ballOn, 0).endLine - 0.8, offenseAlign: PLAYS[L.sit.offense].align, referenceOffense: L.sit.offense });
  const norm = (m) => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = m; return g.innerHTML; }; const html = document.querySelector('#labfield').innerHTML; const o = norm(art(L.sit.offense)); const d = norm(art(L.sit.defense));
  return { offArt: o.length > 200 && html.includes(o), defArt: html.includes(d) || /fill-opacity="0.16"/.test(html) || /stroke-dasharray="0.3 1.4"/.test(html) }; }"""
SECRET = """async () => { const L = window.__gbLab; const { PLAYS } = await import('./src/data/playbook.js'); const t = document.querySelector('main').innerText.toLowerCase(); const d = PLAYS[L.sit.defense];
  return { name: t.includes(d.name.toLowerCase()), id: document.querySelector('main').innerHTML.includes(d.id), words: /coverage|blitz|the defense was/.test(t) }; }"""
LAYOUT = r"""() => { const W = innerWidth; const bad = [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1; }).length; const f = document.querySelector('#labwrap')?.getBoundingClientRect(); const snap = document.querySelector('[data-action="lab-snap"]')?.getBoundingClientRect(); return { over: document.documentElement.scrollWidth - W, bad, field: f ? [Math.round(f.width), Math.round(f.height)] : null, snapBottom: snap ? Math.round(snap.bottom + scrollY) : null, vh: innerHeight }; }"""
def wait_phase(p, phases, ms=15000):
    p.wait_for_function("(ph) => ph.includes(window.__gbLab.phase)", arg=phases, timeout=ms)
def tap_slot(p, slot):
    xy = p.evaluate(POS, slot); p.touchscreen.tap(xy['x'], xy['y']); return xy
def progress(p): return p.locator('.lab-progress').inner_text() if p.locator('.lab-progress').count() else ''

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [390, 320, 375, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}')); p.on('console', lambda m, w=w: errors.append(f'{w} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        franchise0 = p.evaluate("() => JSON.stringify(window.__gb.f || null)")
        p.evaluate(GO, ['menu']); p.wait_for_timeout(300)
        p.locator('main [data-screen="developer"]').first.tap(); p.wait_for_timeout(300)
        check(p.locator('main [data-screen="ai-lab"]').count() == 1, f'{w}: AI Testing Lab is in Developer Tools'); p.locator('main [data-screen="ai-lab"]').tap(); p.wait_for_timeout(400)
        opts = p.evaluate("() => [...document.querySelectorAll('[data-change=lab-off] option')].map((o) => o.value)")
        real = p.evaluate("async () => { const { PLAYS, OFFENSE_IDS } = await import('./src/data/playbook.js'); return OFFENSE_IDS.filter((id) => PLAYS[id].type === 'pass'); }")
        check(opts[0] == 'random' and opts[1:] == real, f'{w}: the play list is Random + every live pass play ({len(opts) - 1}/{len(real)})')
        if w != 390:
            p.select_option('[data-change=lab-off]', real[0]); p.wait_for_timeout(200); p.locator('[data-action="lab-next"]').tap(); wait_phase(p, ['ready'])
            lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: no overflow {lay}'); check(lay['snapBottom'] and lay['snapBottom'] <= lay['vh'], f'{w}: Snap on screen with the field {lay}')
            p.locator('[data-action="lab-snap"]').tap(); wait_phase(p, ['live']); p.wait_for_timeout(1300); tap_slot(p, 'QB'); wait_phase(p, ['after'])
            lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and lay['bad'] == 0, f'{w}: results fit {lay}'); shot(p, f'lab-{w}-after'); ctx.close(); continue
        # --- full flow at 390
        rb_play = p.evaluate("async () => { const { PLAYS, OFFENSE_IDS } = await import('./src/data/playbook.js'); return OFFENSE_IDS.find((id) => PLAYS[id].type === 'pass' && PLAYS[id].assignments.RB?.a === 'route' && PLAYS[id].progression.at(-1) === 'RB'); }") # the back is the last read: a tap must still go to him
        p.select_option('[data-change=lab-off]', rb_play); p.wait_for_timeout(200); p.locator('[data-action="lab-next"]').tap(); wait_phase(p, ['ready'])
        st = p.evaluate(LAB); check(st['off'] == rb_play, f'the chosen play is the one set up ({st["off"]})')
        a = p.evaluate(ART); check(a['offArt'], 'pre-snap: the chosen play\'s exact offensive art'); check(not a['defArt'], 'pre-snap: no defensive art')
        sec = p.evaluate(SECRET); check(not any(sec.values()), f'pre-snap: defense hidden {sec}')
        check('throw away' not in p.locator('main').inner_text().lower(), 'no Throw-away anywhere'); check(p.locator('.lab-actions').count() == 0, 'no decision buttons under the field')
        lay = p.evaluate(LAYOUT); check(lay['over'] <= 1 and lay['bad'] == 0 and lay['snapBottom'] <= lay['vh'], f'390: layout {lay}'); shot(p, 'lab-1-presnap')
        p.locator('[data-action="lab-snap"]').tap(); wait_phase(p, ['live']); p.wait_for_timeout(500)
        a = p.evaluate(ART); check(not a['offArt'] and not a['defArt'], 'after the snap: the play art is gone'); sec = p.evaluate(SECRET); check(not any(sec.values()), f'during the play: defense hidden {sec}')
        shot(p, 'lab-2-live')
        # a defender tap does nothing; then tap a receiver who is not the first read (the RB) on the field
        p.wait_for_timeout(700); dslot = p.evaluate("() => window.__gbLab.hold.frames[window.__gbLab.i].def.find((d) => Math.abs(d[2]) > 8 && d[1] > 6)?.[0] || null")
        if dslot:
            tap_slot(p, dslot); p.wait_for_timeout(120); check(p.evaluate(LAB)['phase'] == 'live', f'tapping a defender ({dslot}) is not a decision')
        tap_slot(p, 'RB'); wait_phase(p, ['after'])
        st = p.evaluate(LAB); check(st['rec']['action'] == 'throw' and st['rec']['target'] == 'RB' and st['hs']['dec']['slot'] == 'RB' and (st['hs']['target'] == 'RB' or st['hs']['rushed']), f'tapping the RB throws to the RB (or the rush reaches him in the wind-up) {st}')
        check(bool(st['rec']['targetId']), 'the record keeps the tapped monster\'s id')
        sec = p.evaluate(SECRET); check(sec['name'], 'after the play the defense is revealed'); def1 = st['def']
        check(p.locator('.lab-compare .lab-vs').count() >= 2 and p.locator('.lab-reveal svg').count() == 1, 'comparison and defensive diagram shown after the play')
        check('1/26' in progress(p), f'progress after one situation: {progress(p)}'); shot(p, 'lab-3-after'); p.screenshot(path=os.path.join(SHOTS, 'lab-3-after-full.png'), full_page=True) if SHOTS else None
        # Next situation: a different defense, progress counts on
        seen = [def1]
        for k in range(2):
            p.locator('[data-action="lab-next"]').first.tap(); wait_phase(p, ['ready']); d = p.evaluate(LAB)['def']; check(d not in seen, f'next situation brings an untested defense ({d})'); seen.append(d)
            p.locator('[data-action="lab-snap"]').tap(); wait_phase(p, ['live']); p.wait_for_timeout(900); tap_slot(p, 'QB'); wait_phase(p, ['after'])
            st = p.evaluate(LAB); check(st['rec']['action'] == 'scramble' and st['hs']['scramble'], f'tapping the QB scrambles {st["rec"]}')
        check('3/26' in progress(p), f'progress after three: {progress(p)}')
        # switch plays and come back: each play keeps its own rotation
        p.locator('[data-action="lab-next"]').first.tap(); wait_phase(p, ['ready']); pending = p.evaluate(LAB)['def']
        other = next(x for x in real if x != rb_play); p.select_option('[data-change=lab-off]', other); wait_phase(p, ['ready']); p.wait_for_timeout(200)
        check(p.evaluate(LAB)['off'] == other and '0/26' in progress(p), f'another play has its own rotation: {progress(p)}')
        p.select_option('[data-change=lab-off]', rb_play); wait_phase(p, ['ready']); p.wait_for_timeout(200)
        check('3/26' in progress(p) and p.evaluate(LAB)['def'] == pending, f'back on the first play: progress and the pending defense kept ({progress(p)})')
        # Paused mode: runs to the decision point, freezes, a tap resumes with the decision
        p.locator('[data-action="lab-mode"][data-v="paused"]').tap(); wait_phase(p, ['ready']); p.locator('[data-action="lab-snap"]').tap(); wait_phase(p, ['frozen'], 20000)
        fz = p.evaluate("() => ({ i: window.__gbLab.i, at: window.__gbLab.pauseAt })"); check(fz['i'] > 3, f'paused: the play ran before freezing {fz}'); shot(p, 'lab-4-frozen')
        tgt = p.evaluate("async () => { const Lab = await import('./src/lab/qb-lab.js'); const b = Lab.receiverButtons(window.__gbLab.sit); return b[b.length - 1].slot; }")
        tap_slot(p, tgt); wait_phase(p, ['after']); st = p.evaluate(LAB); check(st['rec']['action'] == 'throw' and st['rec']['target'] == tgt and (st['hs']['target'] == tgt or st['hs']['rushed']), f'paused: tap on {tgt} throws there {st["rec"]}')
        # Holding the ball: the rush gets home. One fixed, reproducible situation (the Lab's random generator is seeded from the
        # clock, so the check pins this play): quick slants against the all-out blitz, situation seed 3. The check loads it and
        # replays it with the Lab's own "Same situation" button; the held play must end in a real sack.
        p.locator('[data-action="lab-mode"][data-v="live"]').tap(); held = []
        p.evaluate("async () => { const Lab = await import('./src/lab/qb-lab.js'); window.__gbLab.sit = Lab.makeSituation({ offense: 'quick_slants', defense: 'all_out', ballOn: 35, seed: 3 }); }")
        p.locator('[data-action="lab-again"]').tap(); wait_phase(p, ['ready'])
        st = p.evaluate(LAB); check(st['off'] == 'quick_slants' and st['def'] == 'all_out', f'holding the ball: the fixed situation is loaded ({st["off"]} vs {st["def"]})')
        p.locator('[data-action="lab-snap"]').tap(); wait_phase(p, ['after'], 30000)
        st = p.evaluate(LAB); held.append((st['rec']['action'], st['hs']['result']))
        check(held == [('hold', 'sack')], f'holding the ball: recorded as hold, sacked {held}')
        check(all(x[1] != 'throwaway' for x in held), 'never a throw-away')
        n1 = p.evaluate(COUNT); check(n1 >= 5, f'{n1} decisions stored'); prog = progress(p)
        # reload: records and the rotation persist
        p.reload(); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        p.evaluate(GO, ['ai-lab']); p.wait_for_timeout(600); p.select_option('[data-change=lab-off]', rb_play); p.wait_for_timeout(200); p.locator('[data-action="lab-next"]').tap(); wait_phase(p, ['ready'])
        check(progress(p) == prog and p.evaluate(COUNT) == n1, f'after a reload: progress {progress(p)} (was {prog}), records {n1}')
        # Data tab, export, clear, import
        p.locator('[data-action="lab-tab"][data-v="data"]').tap(); p.wait_for_timeout(500)
        dt = p.locator('main').inner_text().lower(); check('agree with ai' in dt and 'matchups played' in dt, 'the Data tab shows the analysis'); shot(p, 'lab-5-data')
        with p.expect_download() as dl: p.locator('[data-action="lab-export"]').click()
        path = dl.value.path(); data = json.load(open(path)); check(data.get('count') == n1, f'export carries every record ({data.get("count")})')
        old = dict(data); old['records'] = data['records'] + [dict(data['records'][0], id='legacy-throwaway', human=dict(data['records'][0]['human'], action='throwaway', target=None))]
        legacy = os.path.join(os.path.dirname(path), 'legacy.json'); json.dump(old, open(legacy, 'w'))
        p.locator('[data-action="lab-clear"]').click(); p.wait_for_timeout(200); p.locator('.sheet [data-action="yes"]').click(); p.wait_for_timeout(500); check(p.evaluate(COUNT) == 0, 'clear empties the Lab')
        p.set_input_files('input[data-change="lab-import"]', legacy); p.wait_for_timeout(800); check(p.evaluate(COUNT) == n1 + 1, 'import restores the records, including an older throw-away record')
        p.locator('[data-action="lab-tab"][data-v="decide"]').tap(); p.wait_for_timeout(300); p.locator('[data-action="lab-tab"][data-v="data"]').tap(); p.wait_for_timeout(300)
        check('older records include throw-aways' in p.locator('main').inner_text().lower(), 'older throw-away records are counted, labelled as no longer an option')
        check(p.evaluate("() => JSON.stringify(window.__gb.f || null)") == franchise0, 'no franchise created or changed')
        ctx.close()
print('\n'.join('ok: ' + n for n in notes)); print(json.dumps({'problems': problems, 'errors': errors[:8]}, indent=1))
print('AI LAB CHECK ' + ('PASSED' if not problems and not errors else 'FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(0 if not problems and not errors else 1)
