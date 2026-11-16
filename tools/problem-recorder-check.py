#!/usr/bin/env python3
"""Phone-sized browser check: recorder controls, live-play capture, export, reload, errors, and opt-out."""
import os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{srv.server_address[1]}/'
with sync_playwright() as p:
    browser = p.chromium.launch(**({'executable_path': os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}))
    page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_function("() => window.__gb && __gb.storage.mode !== 'starting'")
    page.locator('[data-screen="developer"]').tap()
    page.locator('[data-screen="test-session"]').tap()
    page.locator('[data-action="test-start"]').tap()
    assert 'Recording' in page.locator('h2').inner_text()
    # Real seeded franchise and first Sunday. No multi-season simulation needed.
    page.evaluate("""async () => {
      const {newFranchise} = await import('/tools/franchise-soak.mjs');
      const F = await import('/src/franchise/franchise.js'); const f = newFranchise(3);
      Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: true, mode: 'watch', replays: false });
      f.scenes = []; f.achievementsBackfilled = true; F.autoRunToSunday(f); __gb.f = f;
      await __gb.save({immediate:true}); const M = await import('/src/ui/screens/match.js'); M.startSundayGame(f);
    }""")
    page.wait_for_selector('[data-action="test-report-issue"]')
    # Kickoff works for either receiver: the actual match button supplies all choices.
    page.locator('[data-action="kickoff"]').tap()
    page.wait_for_timeout(250)
    report = page.evaluate("async () => (await import('/src/testing/recorder.js')).recorder.report()")
    assert len(report['plays']) == 1, report
    assert report['plays'][0].get('replay'), report['plays'][0].get('replayOmitted')
    assert not report['findings'], report['findings']
    page.locator('[data-action="test-report-issue"]').tap()
    page.locator('#problem-note').fill('The zone looked wrong <script>test</script>')
    page.locator('[data-action="flag-problem"]').tap()
    page.screenshot(path='/tmp/problem-recorder-match.png')
    page.evaluate("async () => (await import('/src/ui/router.js')).go('test-session')")
    assert page.locator('script', has_text='test</script>').count() == 0
    assert 'The zone looked wrong' in page.locator('main').inner_text()
    page.evaluate("() => window.dispatchEvent(new ErrorEvent('error', {message: 'Recorder check: synthetic error'}))")
    page.evaluate("async () => { const {recorder} = await import('/src/testing/recorder.js'); recorder.observeSave({ok:false,error:{code:'quota',message:'Synthetic save failure'}}); recorder.flush(); }")
    # main.screen is already in index.html's loading placeholder: wait for the app itself to start, then navigate by taps.
    page.reload(); page.wait_for_function("() => window.__gb && __gb.storage.mode !== 'starting'")
    assert page.evaluate("async () => (await import('/src/testing/recorder.js')).recorder.active()")
    page.locator('[data-screen="developer"]').tap()
    page.locator('[data-screen="test-session"]').tap()
    with page.expect_download() as download:
        page.locator('[data-action="test-export"]').tap()
    payload = json.load(open(download.value.path()))
    # Phone layout: the include-save checkbox sits on the same line as its label (it took the 44px input height before)
    cb = page.locator('#test-include-save').bounding_box(); lab = page.locator('label:has(#test-include-save)').bounding_box()
    assert abs((cb['y'] + cb['height'] / 2) - (lab['y'] + lab['height'] / 2)) < 6 and lab['height'] < 40, (cb, lab)
    assert page.evaluate("() => document.documentElement.scrollWidth <= innerWidth"), 'Test Session scrolls sideways'
    assert payload['schemaVersion'] == 1
    assert payload['build']['version'] == 'v43.18.0-problem-recorder-preview'
    assert {x['code'] for x in payload['findings']} >= {'player-report','runtime-error','save-failed'}
    assert 'franchiseSave' not in payload
    assert payload['plays'][0]['replay']['state']['rngState']
    page.locator('#test-include-save').check()
    with page.expect_download() as download:
        page.locator('[data-action="test-export"]').tap()
    assert 'franchiseSave' in json.load(open(download.value.path()))
    page.screenshot(path='/tmp/problem-recorder-screen.png')
    page.locator('[data-action="test-stop"]').tap()
    before = page.evaluate("async () => (await import('/src/testing/recorder.js')).recorder.report().events.length")
    page.evaluate("async () => (await import('/src/testing/recorder.js')).recorder.record('should-not-record')")
    assert before == page.evaluate("async () => (await import('/src/testing/recorder.js')).recorder.report().events.length")
    assert not errors, errors
    print(json.dumps({'passed': True, 'checks': ['developer navigation', 'start', 'live kickoff and replay inputs', 'manual report', 'escaped notes', 'runtime error', 'save failure', 'reload recovery', 'JSON download', 'optional save export', 'stop'], 'reportBytes': len(json.dumps(payload)), 'findings': [x['code'] for x in payload['findings']]}))
    browser.close()
srv.shutdown()
