import test from 'node:test';
import assert from 'node:assert/strict';
import { configureIosAudio } from '../tools/configure-ios-audio.mjs';
const source=`import UIKit
import Capacitor
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    return true
  }
}`;
test('native audio patch is idempotent and preserves the launch method and existing app configuration',()=>{
 const out=configureIosAudio(source);
 assert.match(out,/^import AVFoundation$/m);assert.doesNotMatch(out,/import AVFAudio/,'AVFAudio.framework is iOS 14.5+ only: importing it breaks launch on older supported iPhones');assert.match(out,/setCategory\(\.playback, mode: \.default, options: \[\.mixWithOthers\]\)/);
 assert.match(out,/return true/);assert.match(out,/var window: UIWindow\?/);
 assert.equal(configureIosAudio(out),out);assert.doesNotMatch(out,/setActive|duckOthers/);
});
test('unrecognized or already customized delegates fail without guessing a patch',()=>{
 assert.throws(()=>configureIosAudio('import UIKit'),/Expected one/);
 assert.throws(()=>configureIosAudio(source.replace('return true','try? AVAudioSession.sharedInstance().setCategory(.playback)\n return true')),/already configured/);
});

test('the previous marked ambient setup upgrades once and leaves unrelated custom categories alone',()=>{
 const current=configureIosAudio(source);
 const old=current.replace('// Gridiron Beast: audible game audio mixed with other apps (v2).','// Gridiron Beast: mix game audio with other apps.').replace('setCategory(.playback, mode: .default, options: [.mixWithOthers])','setCategory(.ambient, mode: .default)');
 const upgraded=configureIosAudio(old);
 assert.match(upgraded,/setCategory\(\.playback, mode: \.default, options: \[\.mixWithOthers\]\)/);
 assert.equal(configureIosAudio(upgraded),upgraded);
 assert.throws(()=>configureIosAudio(old.replace('setCategory(.ambient, mode: .default)','setCategory(.soloAmbient)')),/customized/);
});
