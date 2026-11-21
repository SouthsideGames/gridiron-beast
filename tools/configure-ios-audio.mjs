// The native project lives on the developer's Mac, outside this web repository.
// Run from the repository root after `npx cap add ios`, before building in Xcode.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MARKER = '// Gridiron Beast: audible game audio mixed with other apps (v2).';
const OLD_MARKER = '// Gridiron Beast: mix game audio with other apps.';
export function configureIosAudio(source) {
  if (source.includes(MARKER)) return source;
  if (source.includes(OLD_MARKER)) {
    const oldCategory = 'setCategory(.ambient, mode: .default)';
    if (!source.includes(oldCategory)) throw new Error('Previous audio setup was customized; no files changed.');
    return source.replace(OLD_MARKER, MARKER).replace(oldCategory, 'setCategory(.playback, mode: .default, options: [.mixWithOthers])').replace('// Ambient mixes with music/PiP and respects the iPhone silent switch.', '// In-game audio settings control sound, including when the iPhone is silent.');
  }
  const launch = /func application\([\s\S]*?didFinishLaunchingWithOptions[\s\S]*?\)\s*->\s*Bool\s*\{/g;
  const matches = [...source.matchAll(launch)];
  if (matches.length !== 1) throw new Error('Expected one AppDelegate launch method; no files changed.');
  if (/setCategory\s*\(/.test(source)) throw new Error('An audio category is already configured; review it before changing it.');
  const at = matches[0].index + matches[0][0].length;
  source = source.slice(0, at) + `
        ${MARKER}
        // In-game audio settings control sound; other apps can keep playing.
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
        } catch {
            NSLog("Gridiron Beast audio session setup failed: %@", String(describing: error))
        }
` + source.slice(at);
  // AVFoundation, not AVFAudio: AVFAudio.framework exists only from iOS 14.5, so importing it would stop the app launching on older
  // supported iPhones (Capacitor 6 supports iOS 13). AVFoundation re-exports AVAudioSession on every version.
  if (!/^import (AVFAudio|AVFoundation)\b/m.test(source)) source = 'import AVFoundation\n' + source;
  return source;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const file = path.resolve('ios/App/App/AppDelegate.swift');
  try {
    const original = fs.readFileSync(file, 'utf8');
    const updated = configureIosAudio(original);
    if (updated === original) console.log('iOS game audio is already configured.');
    else {
      // Exclusive backup: never overwrite the original backup on a repeated run.
      if (!fs.existsSync(file + '.before-audio-v2')) fs.writeFileSync(file + '.before-audio-v2', original, { flag: 'wx' });
      fs.writeFileSync(file, updated);
      console.log('Configured audible iOS game audio with mixing. Build and test in Xcode; original saved as AppDelegate.swift.before-audio-v2.');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
