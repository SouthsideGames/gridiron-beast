// Offering a file to the player (the franchise export). Inside claude.ai a page cannot start a download itself: the file goes
// through the platform's `downloads` capability, where the player confirms it (the Claude iPhone app opens the share sheet).
// That capability accepts only some file types, `.json` among them but not `.gbfranchise`, so there the file is named
// `<name>.gbfranchise.json` (the import accepts both). Outside claude.ai (GitHub Pages, the installed app) the browser download
// is used as before. Found on a real iPhone during Stage 2 (GDD §43.7).

/** The name used inside claude.ai: an allowed extension, keeping the game's own name visible. */
export const claudeFileName = (name) => (/\.json$/i.test(name) ? name : `${name}.json`);

/**
 * Offer `text` as a file called `name`. Resolves:
 *   { ok: true, how: 'claude', status, name }   the player accepted and the platform took the file;
 *   { ok: false, how: 'claude', code }          declined, unavailable in this view, or another platform refusal;
 *   { ok: null, how: 'browser', name }          a browser download was started (the browser decides whether it is kept).
 */
export async function offerFile({ name, text, use = globalThis.claude?.use, doc = globalThis.document }) {
  if (typeof use === 'function') { // inside claude.ai
    let dl = null; try { dl = await use('downloads'); } catch { dl = null; }
    if (!dl || typeof dl.save !== 'function') return { ok: false, how: 'claude', code: 'unavailable' };
    const filename = claudeFileName(name);
    try { const r = await dl.save({ filename, data: text }); return { ok: true, how: 'claude', status: r?.status || 'saved', name: filename }; }
    catch (e) { return { ok: false, how: 'claude', code: e?.code || 'unavailable' }; }
  }
  const blob = new Blob([text], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const a = doc.createElement('a'); a.href = url; a.download = name; doc.body.appendChild(a); a.click(); a.remove();
  const t = setTimeout(() => URL.revokeObjectURL(url), 60000); t?.unref?.(); // never keeps a test runner alive
  return { ok: null, how: 'browser', name };
}
