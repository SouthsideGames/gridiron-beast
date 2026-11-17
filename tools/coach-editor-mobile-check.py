#!/usr/bin/env python3
"""Check the real shared appearance editor at phone/tablet widths.
Run: python3 tools/coach-editor-mobile-check.py
Optional: CHROMIUM_EXECUTABLE=/path/to/chromium
This check needs Playwright and its browser; it is not a real-device test.
"""
import http.server
import json
import os
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)
    def log_message(self, *args):
        pass

server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_address[1]}/'
try:
    with sync_playwright() as pw:
        launch = {'executable_path': os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}
        browser = pw.chromium.launch(**launch)
        checks = []
        for width, height in [(320, 568), (375, 667), (390, 844), (440, 900), (768, 900)]:
            page = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
            # Serve a minimal page using the real stylesheet and shared renderer.
            # Avoid unrelated startup/network behavior masking editor geometry failures.
            page.route('**/__coach_editor_check__', lambda route: route.fulfill(
                content_type='text/html',
                body='<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles/app.css"></head><body><div id="app"><header class="topbar"><h1>Appearance</h1></header><main class="screen"><div style="height:180px"></div><div id="fixture"></div><div style="height:300px"></div></main></div></body></html>'))
            page.goto(url + '__coach_editor_check__')
            for tab in ['face', 'hair', 'outfit', 'extras', 'build']:
                page.evaluate("""async (tab) => {
                  const {coachEditorHtml, coachEditorActions} = await import('/src/ui/coach-editor.js');
                  const {DEFAULT_LOOK} = await import('/src/ui/coach-portrait.js');
                  window.scrollTo(0, 0);
                  const state = { look: { ...DEFAULT_LOOK }, tab };
                  const redraw = () => { const y = window.scrollY; document.querySelector('#fixture').innerHTML = coachEditorHtml(state.look, {
                    tab, teamColor: '#2255aa',
                    teamNote: 'Team colors follow the club you pick next. You can change your look any time from My Office.'
                  }); window.scrollTo(0, y); };
                  const actions = coachEditorActions(state, redraw);
                  document.querySelector('#fixture').onclick = (e) => { const b = e.target.closest('[data-action]'); if (b) actions[b.dataset.action]?.(b); };
                  redraw();
                }""", tab)
                page.evaluate('() => document.fonts.ready')
                result = page.evaluate("""() => {
                  const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
                  const inside = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
                  const frame = rect('.ce-preview'), portrait = rect('.ce-preview svg'), side = rect('.ce-side');
                  const controls = [...document.querySelectorAll('.ce-tab, .ce-stepper, .ce-chip')];
                  return {
                    contained: inside(portrait, frame),
                    separated: portrait.right <= side.left + 1 || portrait.bottom <= side.top + 1,
                    controlsFit: controls.every((el) => {
                      const r = el.getBoundingClientRect();
                      return r.left >= -1 && r.right <= innerWidth + 1;
                    }),
                    tabsVisible: [...document.querySelectorAll('.ce-tab')].length === 5,
                    tabsDoNotScroll: document.querySelector('.ce-tabs').scrollWidth <= document.querySelector('.ce-tabs').clientWidth + 1,
                    pageFits: document.documentElement.scrollWidth <= innerWidth + 1
                  };
                }""")
                assert all(result.values()), (width, tab, result)
                if tab == 'face':
                    page.locator('.ce-body').evaluate('(el) => window.scrollTo(0, el.offsetTop + 100)')
                    pinned = page.evaluate("""() => {
                      const header = document.querySelector('.topbar').getBoundingClientRect();
                      const p = document.querySelector('.ce-preview').getBoundingClientRect();
                      return p.top >= header.bottom - 1 && p.bottom < innerHeight / 2;
                    }""")
                    assert pinned, (width, height, 'portrait must stay below the header while scrolling')
                    before = page.locator('.ce-preview').inner_html()
                    page.locator('[data-action="ce-set"][data-k="nose"]').last.click()
                    after = page.locator('.ce-preview').inner_html()
                    assert before != after, (width, 'preview updates while scrolled')
                    assert page.locator('.ce-preview').evaluate('(el) => el.getBoundingClientRect().top >= 48')
                checks.append({'width': width, 'height': height, 'tab': tab})
            labels = page.evaluate("""async () => {
              const {BACKGROUNDS} = await import('/src/data/staff.js');
              const {temperSummary} = await import('/src/data/temper.js');
              const {t} = await import('/src/text/index.js');
              return {labels: Object.values(BACKGROUNDS).map((b) => b.label),
                      unknown: temperSummary(null).name,
                      onboarding: t('onboarding.his_temper_how_efficiently_he_trains')};
            }""")
            assert labels['labels'] == ['Former Player', 'Former Scout', 'Analyst', 'Agent'], labels
            assert labels['unknown'] == '???' and labels['onboarding'] == 'Temper: ???', labels
            page.close()
        browser.close()
        print(json.dumps({'passed': True, 'geometryScenarios': checks}))
finally:
    server.shutdown()
