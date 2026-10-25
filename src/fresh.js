// Release freshness (v42.4.1). index.html maps every game module to its ?v=<release> URL with an import map (written by
// tools/stamp-release.mjs), so a phone that cached an older release fetches the new files. This tiny module has no imports and
// runs before main.js. If the map is not in effect (a browser that ignores it), it re-fetches every listed file from the network
// once per release and reloads, and tells main.js to wait so nothing is read or saved with a mix of old and new files.
// `globalThis.__gbFiles` reports 'mapped' | 'refreshed' | 'refreshing' for the Settings build line.
const want = new URL(import.meta.url).searchParams.get('v');
let mapped = false;
try { mapped = !!want && typeof import.meta.resolve === 'function' && import.meta.resolve('./main.js').includes(`?v=${want}`); } catch { /* unsupported */ }
globalThis.__gbFiles = mapped ? 'mapped' : 'refreshed';
if (want && !mapped) {
  let again = true; try { again = sessionStorage.getItem('gb-refresh') === want; if (!again) sessionStorage.setItem('gb-refresh', want); } catch { /* no storage: never loop */ }
  if (!again) {
    globalThis.__gbRefreshing = true; globalThis.__gbFiles = 'refreshing';
    let urls = []; try { urls = Object.keys(JSON.parse(document.getElementById('gb-modules')?.textContent || '{}').imports || {}); } catch { /* no list */ }
    urls.push('./styles/app.css');
    Promise.all(urls.map((u) => fetch(u, { cache: 'reload' }).catch(() => null))).finally(() => location.reload());
  }
}
