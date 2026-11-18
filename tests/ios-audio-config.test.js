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
 assert.match(out,/^import AVFoundation$/m);assert.doesNotMatch(out,/import AVFAudio/,'AVFAudio.framework is iOS 14.5+ only: importing it breaks launch on older supported iPhones');assert.match(out,/setCategory\(\.ambient, mode: \.default\)/);
 assert.match(out,/return true/);assert.match(out,/var window: UIWindow\?/);
 assert.equal(configureIosAudio(out),out);assert.doesNotMatch(out,/setActive|\.playback|duckOthers/);
});
test('unrecognized or already customized delegates fail without guessing a patch',()=>{
 assert.throws(()=>configureIosAudio('import UIKit'),/Expected one/);
 assert.throws(()=>configureIosAudio(source.replace('return true','try? AVAudioSession.sharedInstance().setCategory(.playback)\n return true')),/already configured/);
});
