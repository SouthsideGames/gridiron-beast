#!/usr/bin/env python3
# Usage: python3 tools/clash-continuous-check.py <repo root> <screenshot dir> [width] [height]
# Task 10: continuous Beast Clash in a real browser (phone viewport, touch). A fresh franchise scouts a region, enters a Watch encounter,
# and the script watches the exchange counter, taps reserves, checks for prompts and restarts, and repeats at 1x, 2x and 4x.
import sys, threading, socketserver, http.server, os, json
from playwright.sync_api import sync_playwright
ROOT = sys.argv[1]; OUT = sys.argv[2]; W = int(sys.argv[3]) if len(sys.argv) > 3 else 390; H = int(sys.argv[4]) if len(sys.argv) > 4 else 844
os.makedirs(OUT, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
errors, problems, notes = [], [], []
SETUP = """async ({ seed, speed }) => {
  const F = await import('/src/franchise/franchise.js');
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  F.hireDefaultStaff(f); let g = 0; while (F.creationDraftPending(f) && g++ < 400) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else F.advanceDraft ? F.advanceDraft(f) : F.passDraftPick(f); }
  Object.assign(f.settings, { devNotices: false, tutorial: false, clash: { mode: 'watch', speed } }); f.scenes = []; f.achievementsBackfilled = true;
  F.scoutRegion(f, 'Coral Coast'); __gb.f = f; return { day: f.season.day, prospects: f.week.prospects.length, draft: F.creationDraftPending(f) };
}"""
def run(page, speed, seed, tag):
    info = page.evaluate(SETUP, { 'seed': seed, 'speed': speed }); notes.append(f'{tag}: setup {info}')
    page.evaluate("async () => (await import('/src/ui/router.js')).go('clash-battle', { kind: 'encounter', i: 0 }, { reset: true })"); page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, f'{tag}-0-setup.png'), full_page=True)
    if page.query_selector('[data-action="enter"][data-v="watch"][disabled]'): page.click('[data-action="autol"]'); page.wait_for_timeout(300)
    page.click('[data-action="enter"][data-v="watch"]'); page.wait_for_selector('#cl-subs .cl-sub', timeout=8000); page.wait_for_timeout(600)
    page.screenshot(path=os.path.join(OUT, f'{tag}-1-battle-start.png'), full_page=True)
    seen, taps, ok_taps, refused, prompts, restarts, last = [], 0, 0, 0, 0, 0, 0
    for step in range(400):
        if page.query_selector('.sheet [data-rot]') or page.query_selector('[data-action="rotprompt"]'): prompts += 1
        done = page.evaluate("() => !document.querySelector('#cl-subs') || !!document.querySelector('[data-action=done], [data-action=accept], [data-action=decline], [data-action=pitch], [data-action=choose]')")
        if done: break
        ex = page.evaluate("() => Number(document.querySelector('.cl-ex b')?.textContent || 0)")
        if ex < last: restarts += 1; problems.append(f'{tag}: exchange counter went back from {last} to {ex}')
        last = max(last, ex); seen.append(ex)
        if step % 6 == 3:
            btn = page.query_selector('#cl-subs .cl-sub:not(.active):not(.ko):not([aria-disabled])')
            if btn:
                try: btn.tap(timeout=1500)
                except Exception as ex: notes.append(f'{tag}: tap skipped ({str(ex)[:60]})'); continue
                taps += 1; page.wait_for_timeout(120)
                note = page.evaluate("() => document.querySelector('.cl-sub-note')?.textContent || ''")
                if 'comes in' in note: ok_taps += 1
                elif 'Next switch' in note: refused += 1
                if ok_taps == 1 and taps == 1: page.screenshot(path=os.path.join(OUT, f'{tag}-2-queued.png'), full_page=True)
        page.wait_for_timeout(450 // speed + 60)
    page.wait_for_timeout(800)
    page.screenshot(path=os.path.join(OUT, f'{tag}-3-result.png'), full_page=True)
    rec = page.evaluate("() => { const e = __gb.f.week.encounter; return { status: e.status, winner: e.result?.winner, exchanges: e.result?.exchanges, decisions: e.decisions?.a, policies: e.policies, reached: e.reachedEx } }")
    xp = page.evaluate("() => [...document.querySelectorAll('#screen .mono')].map(e => e.textContent).filter(t => /XP/.test(t))")
    rotations = sum(1 for k, v in (rec.get('decisions') or {}).items() if v not in ('stay', 'auto'))
    notes.append(f"{tag}: exchanges seen {sorted(set(seen))[:3]}..{max(seen) if seen else 0} | taps {taps} (queued {ok_taps}, refused for cooldown {refused}) | prompts {prompts} | restarts {restarts} | record {rec} | recorded switches {rotations} | XP lines {xp[:3]}")
    if prompts: problems.append(f'{tag}: a rotation prompt appeared')
    if rec.get('status') == 'battle': problems.append(f'{tag}: the battle did not finish')
    if any('.' in x.split('XP')[0] for x in xp): problems.append(f'{tag}: XP shown with decimals: {xp}')
    over = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if over > 1: problems.append(f'{tag}: horizontal overflow {over}px')
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for speed, seed in [(4, 21), (2, 22), (1, 23)]:
        ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, is_mobile=True, has_touch=True); page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
        page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('main.screen')
        run(page, speed, seed, f'{W}-x{speed}'); ctx.close()
    b.close()
print(json.dumps({ 'errors': errors[:10], 'problems': problems, 'notes': notes }, indent=1))
