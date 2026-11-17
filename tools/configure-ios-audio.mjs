// The native project lives on the developer's Mac, outside this web repository.
// Run from the repository root after `npx cap add ios`, before building in Xcode.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MARKER = '// Gridiron Beast: mix game audio with other apps.';
export function configureIosAudio(source) {
  if (source.includes(MARKER)) return source;
  const launch = /func application\([\s\S]*?didFinishLaunchingWithOptions[\s\S]*?\)\s*->\s*Bool\s*\{/g;
  const matches = [...source.matchAll(launch)];
  if (matches.length !== 1) throw new Error('Expected one AppDelegate launch method; no files changed.');
  if (/setCategory\s*\(/.test(source)) throw new Error('An audio category is already configured; review it before changing it.');
  const at = matches[0].index + matches[0][0].length;
  source = source.slice(0, at) + `
        ${MARKER}
        // Ambient mixes with music/PiP and respects the iPhone silent switch.
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
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
    if (updated === original) console.log('iOS ambient audio is already configured.');
    else {
      // Exclusive backup: never overwrite the original backup on a repeated run.
      fs.writeFileSync(file + '.before-ambient', original, { flag: 'wx' });
      fs.writeFileSync(file, updated);
      console.log('Configured iOS ambient audio. Build and test in Xcode; original saved as AppDelegate.swift.before-ambient.');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
