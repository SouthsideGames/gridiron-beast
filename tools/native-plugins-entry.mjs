// Bundled only for the native checkout by prepare-mobile.mjs, never shipped to the website.
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
globalThis.gbNativeBridgeInstalled = true;
void App.addListener('appStateChange', state => globalThis.dispatchEvent(new CustomEvent('gb-app-state', { detail: state }))).catch(() => {});
void App.addListener('backButton', () => globalThis.dispatchEvent(new Event('gb-native-back'))).catch(() => {});
globalThis.gbNativeShare = async ({ name, text }) => {
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  try {
    const { uri } = await Filesystem.writeFile({ path: `exports/${Date.now()}-${safeName}`, directory: Directory.Cache, encoding: Encoding.UTF8, data: text, recursive: true });
    const result = await Share.share({ title: name, dialogTitle: name, files: [uri] });
    // Some platforms return no activity identifier even after sharing. Be honest.
    return { ok: result.activityType ? true : null, how: 'capacitor-share', name };
  } catch (error) { return { ok: false, how: 'capacitor-share', code: error?.code || 'cancelled-or-unavailable', name }; }
};
