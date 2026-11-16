import { recorder } from '../../testing/recorder.js';
import { esc, delegate, sheet, toast, confirmSheet } from '../dom.js';
import { offerFile } from '../file-offer.js';

export function flagProblem() {
  if (!recorder.active()) { toast('Start a Test Session in Developer Tools first.'); return; }
  const last = recorder.lastPlay(); // freeze which play is being reported when the sheet opens
  const { el, close } = sheet(`<p>${last ? `Report play ${last.id}: ${esc(last.result?.text || last.result?.kind || 'last play')}` : 'Report an issue with your current session.'}</p><label class="field">What went wrong? (optional)<textarea id="problem-note" maxlength="2000" rows="3" placeholder="For example: the zone appeared, but the defender did not slow down."></textarea></label><button class="btn primary block" data-action="flag-problem">Save Report</button>`, { title: 'Report Last Play / Issue' });
  el.querySelector('[data-action="flag-problem"]').addEventListener('click', () => { recorder.flag(el.querySelector('#problem-note').value, last?.id ?? null, last); close(); toast('Issue recorded. Export your Test Session to send it for review.', 'good'); });
}
export function registerTestSession(Router, app) {
  Router.registerScreen('test-session', {
    title: 'Test Session',
    render() {
      const s = recorder.status(), report = recorder.report();
      return `<div class="panel"><h2>Problem recorder: ${s.active ? 'Recording' : 'Off'}</h2><p>Play normally while the recorder collects recent plays, ability evidence, franchise actions, save failures, and unexpected errors. Nothing uploads automatically.</p><p class="dim">Automatic checks cover specific technical rules. They cannot identify every ability or visual bug. Use “Report Last Play” whenever something looks wrong.</p>
        ${s.startedAt ? `<p>Started ${esc(new Date(s.startedAt).toLocaleString())} · ${s.plays} recent steps · ${s.findings} findings</p>` : ''}
        ${s.storageError || s.stoppedReason ? `<p role="status">${esc(s.storageError || s.stoppedReason)}</p>` : ''}
        <div class="stack">${s.active ? '<button class="btn" data-action="test-stop">Stop Recording</button><button class="btn" data-action="test-flag">Report Last Play / Issue</button>' : '<button class="btn primary" data-action="test-start">Start New Test Session</button>'}
        ${s.exists ? `<label class="field row" style="gap:8px;align-items:center"><input type="checkbox" id="test-include-save" style="width:auto;min-height:0;margin:0"> Include current franchise save in export</label><p class="dim">Reports contain recent game state and device details. Including the full save adds your current franchise and its history.</p><button class="btn primary" data-action="test-export">Export Problem Report (.json)</button><button class="btn" data-action="test-clear">Delete Test Report</button>` : ''}</div></div>
        ${report?.findings.length ? `<div class="panel"><h3>Recorded findings</h3>${report.findings.slice().reverse().map((x) => `<div class="panel tight"><b>${esc(x.severity === 'manual' ? 'Your report' : x.severity === 'review' ? 'Needs review' : 'Automatic check')}: ${esc(x.message)}</b><p>${esc(x.evidence?.note || x.code)}${x.count > 1 ? ` (${x.count} occurrences)` : ''}${x.playId ? ` · play ${x.playId}` : ''}</p></div>`).join('')}</div>` : '<p class="dim">No findings recorded yet. This does not guarantee the session is bug-free.</p>'}`;
    },
    mount(root) {
      delegate(root, {
        'test-start': async () => {
          if (recorder.status().exists && !await confirmSheet('Starting a new session replaces the previous report. Export it first if you want to keep it.', { title: 'New Test Session', okLabel: 'Start New Session' })) return;
          recorder.start({ userAgent: navigator.userAgent, language: navigator.language, viewport: { width: window.innerWidth, height: window.innerHeight }, pixelRatio: window.devicePixelRatio });
          recorder.observeFranchise(app.f, 'session-start'); Router.render(); toast('Test Session started.');
        },
        'test-stop': () => { recorder.stop(); Router.render(); },
        'test-flag': flagProblem,
        'test-export': async () => {
          const payload = recorder.report({ franchise: app.f, includeSave: !!root.querySelector('#test-include-save')?.checked });
          if (!payload) return;
          try {
            const r = await offerFile({ name: `Gridiron_Beast_Problem_Report_${new Date(payload.startedAt).toISOString().replace(/[:.]/g, '-')}.json`, text: JSON.stringify(payload, null, 2) });
            toast(r.ok === false ? 'Export was not completed. Your report is still saved here.' : 'Report offered for saving. Attach the JSON file for review.', r.ok === false ? 'bad' : 'good');
          } catch { toast('Export failed. Your report is still available here.', 'bad'); }
        },
        'test-clear': async () => { if (await confirmSheet('Delete the recorded test report? Your franchise save is kept.', { title: 'Delete Test Report', okLabel: 'Delete', danger: true })) { recorder.clear(); Router.render(); } },
      });
    },
  });
}
