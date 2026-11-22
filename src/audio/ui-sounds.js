import { decodeUiWav } from './decode-ui-wav.js';
import { audioContext, audioBus, audioPreferences, isAudioHidden } from './context.js';
// Exact WAV masters approved by the owner. Preview MP3s were encoded from these files.
export const UI_SOUNDS = Object.freeze({
 tap:'assets/audio/ui/01_Tap.wav', back:'assets/audio/ui/02_Back_Close.wav',
 confirm:'assets/audio/ui/03_Confirm.wav', unavailable:'assets/audio/ui/04_Unavailable.wav',
 notification:'assets/audio/ui/05_Notification.wav', reward:'assets/audio/ui/06_Reward.wav',
 achievement:'assets/audio/ui/07_Major_Achievement.wav',
});
const PRIORITY={tap:0,back:1,confirm:2,notification:3,unavailable:4,reward:5,achievement:6};
export class UiSoundPlayer {
 constructor({context=audioContext,bus=()=>audioBus('sfx'),preferences=audioPreferences,hidden=isAudioHidden,fetcher=(p)=>fetch(p),requester=requestBytes,now=()=>Date.now(),defer=(fn)=>queueMicrotask(fn)}={}){
  Object.assign(this,{context,bus,preferences,hidden,fetcher,requester,now,defer});this.buffers=new Map();this.problems=new Map();this.loading=null;this.waking=null;this.pending=null;this.current=null;this.currentTap=null;this.tapSerial=0;this.serial=0;this.action=0;this.lastAt=-Infinity;this.lastPriority=-1;
 }
 preload(){
  if(this.loading)return this.loading;
  const ac=this.context();if(!ac)return Promise.resolve();
  this.loading=Promise.all(Object.entries(UI_SOUNDS).map(async([id,path])=>{
   try{this.buffers.set(id,await this.load(ac,path));this.problems.delete(id);}catch(e){this.problems.set(id,e?.message||String(e)); /* audio must never block an action */ }
  })).finally(()=>{if(this.buffers.size<Object.keys(UI_SOUNDS).length)this.loading=null;});return this.loading;
 }
 // One sound file, read every way this platform offers. Inside the phone app the page is served by the app itself, where
 // fetch() can refuse a bundled file or report it without a normal status; a plain request is tried next, and the browser's
 // own decoder if the samples cannot be read directly. Each failure is kept so the Settings test can say what went wrong.
 async load(ac,path){
  const tried=[];let bytes=null;
  try{const r=await this.fetcher(path);if(!r.ok&&r.status!==0)throw Error(`status ${r.status}`);bytes=await r.arrayBuffer();if(!bytes?.byteLength)throw Error('empty file');}catch(e){tried.push(`fetch: ${e?.message||e}`);bytes=null;}
  if(!bytes)try{bytes=await this.requester(path);if(!bytes?.byteLength)throw Error('empty file');}catch(e){tried.push(`request: ${e?.message||e}`);bytes=null;}
  if(!bytes)throw Error(tried.join('; '));
  try{return decodeUiWav(ac,bytes);}catch(e){tried.push(`read: ${e?.message||e}`);}
  try{const b=await ac.decodeAudioData(bytes.slice(0));if(!b)throw Error('no audio');return b;}catch(e){tried.push(`decode: ${e?.message||e}`);}
  throw Error(tried.join('; '));
 }
 /** Why a UI sound cannot play right now, in a few words (null: nothing is known to be wrong). For the Settings test button. */
 problem(id='confirm'){
  const ac=this.context();if(!ac)return 'this device has no audio engine';
  if(!this.buffers.has(id))return `the sound file did not load${this.problems.has(id)?`: ${this.problems.get(id)}`:''}`;
  if(ac.state!=='running')return `the audio engine is ${ac.state}`;
  return null;
 }
 wake(ac){
  if(!this.waking)this.waking=Promise.resolve(ac.resume()).finally(()=>{this.waking=null;});
  return this.waking;
 }
 request(id){
  const p=this.preferences();if(!(id in UI_SOUNDS)||this.hidden()||p.muted||p.sfx<=0)return;
  const ac=this.context();if(!ac)return;
  // Resume inside the gesture. WebKit resolves this asynchronously; playing in
  // the next microtask alone can still find a suspended context and drop a tap.
  const ready=[];
  if(ac.state!=='running')try{ready.push(this.wake(ac));}catch{return;}
  if(!this.buffers.has(id))ready.push(this.preload());
  const first=!this.pending;if(first||PRIORITY[id]>=PRIORITY[this.pending.id])this.pending={id,at:this.now()};
  if(first){const ticket=this.serial,action=++this.action;this.defer(()=>{
   if(ticket!==this.serial)return;
   const sound=this.pending;this.pending=null;if(!sound)return;
   const play=()=>{if(ticket===this.serial&&action===this.action&&this.now()-sound.at<=250)this.play(sound.id);};
   if(ready.length)void Promise.all(ready).then(play).catch(()=>{});else play();
  });}
 }
 // Button feedback has its own bounded voice, so a reward/confirmation cannot replace the tap.
 tap(){
  const p=this.preferences();if(this.hidden()||p.muted||p.sfx<=0)return;
  const ac=this.context();if(!ac)return;
  const ticket=++this.tapSerial,at=this.now(),ready=[];
  if(ac.state!=='running')try{ready.push(this.wake(ac));}catch{return;}
  if(!this.buffers.has('tap'))ready.push(this.preload());
  const play=()=>{if(ticket===this.tapSerial&&this.now()-at<=1000)this.play('tap',{force:true,tap:true});};
  if(ready.length)void Promise.all(ready).then(play).catch(()=>{});else play();
 }
 async preview(id='confirm'){
  const ac=this.context();if(!ac)return false;
  const ticket=this.serial;
  // An explicit Settings preview may wait for decoding; ordinary feedback is
  // short-lived and is discarded after 250 ms, never replayed as a backlog.
  try { await Promise.all([ac.state==='running'?null:this.wake(ac),this.preload()]); } catch { return false; }
  if(ticket!==this.serial||!this.buffers.has(id)||this.hidden())return false;
  return this.play(id, {force:true});
 }
 play(id, {force=false,tap=false}={}){
  const p=this.preferences(),ac=this.context();if(this.hidden()||p.muted||p.sfx<=0||!ac||ac.state!=='running')return false;
  const at=this.now(),priority=PRIORITY[id];if(!force&&at-this.lastAt<70&&priority<=this.lastPriority)return false;
  const buffer=this.buffers.get(id);if(!buffer)return false;
  this.stopVoice(tap);let source;const voice=tap?'currentTap':'current';
  try { source=ac.createBufferSource();source.buffer=buffer;source.connect(this.bus());this[voice]=source;
  source.onended=()=>{source.disconnect();if(this[voice]===source)this[voice]=null;};source.start();if(!tap){this.lastAt=at;this.lastPriority=priority;}return true;
  } catch {try{source?.disconnect();}catch{}if(this[voice]===source)this[voice]=null;return false;}
 }
 stopVoice(tap=false){const voice=tap?'currentTap':'current';if(this[voice]){const s=this[voice];this[voice]=null;try{s.stop();}catch{}s.disconnect();}}
 stop({preserveTap=false}={}){++this.serial;this.pending=null;this.stopVoice();if(!preserveTap){++this.tapSerial;this.stopVoice(true);}}

}
/** A plain request for a bundled file. Status 0 with a body is a successful read of an app-bundled file. */
function requestBytes(path){
 return new Promise((resolve,reject)=>{
  const X=globalThis.XMLHttpRequest;if(!X){reject(Error('unavailable'));return;}
  const x=new X();x.open('GET',path);x.responseType='arraybuffer';
  x.onload=()=>{const ok=x.status===0||(x.status>=200&&x.status<300);if(ok&&x.response?.byteLength)resolve(x.response);else reject(Error(`status ${x.status}`));};
  x.onerror=()=>reject(Error('could not be read'));x.send();
 });
}
export const uiSounds=new UiSoundPlayer();
export const uiSound=id=>uiSounds.request(id);
export function soundForControl(el){
 if(!el||el.disabled||el.getAttribute?.('aria-disabled')==='true')return null;
 return 'tap';
}
const installed=new WeakSet();
const presentedScenes=new WeakSet();
export function uiSceneSound(name,ctx){
 const scene=name==='scene'&&ctx.f?.scenes?.[0];
 if(scene&&typeof scene==='object'&&!presentedScenes.has(scene)){presentedScenes.add(scene);uiSound('achievement');}
}
export function installUiSounds(doc=globalThis.document){
 if(!doc||installed.has(doc))return;installed.add(doc);void uiSounds.preload();
 const wake=()=>{const p=audioPreferences();if(isAudioHidden()||p.muted||p.sfx<=0)return;const ac=audioContext();if(ac&&ac.state!=='running')void uiSounds.wake(ac).catch(()=>{});void uiSounds.preload();};
 doc.addEventListener('pointerdown',wake,{capture:true,passive:true});
 doc.addEventListener('touchend',wake,{capture:true,passive:true});
 doc.addEventListener('keydown',wake,{capture:true});
 doc.addEventListener('click',event=>{
  const el=event.target.closest?.('button,[role="button"],[data-action],a[href],a[data-screen],summary,input[type="checkbox"],input[type="radio"]');
  if(soundForControl(el))uiSounds.tap();
 },{capture:true});
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)uiSounds.stop();});
 globalThis.addEventListener?.('pagehide',()=>uiSounds.stop());
 globalThis.addEventListener?.('gb-app-state',e=>{if(e.detail?.isActive===false)uiSounds.stop();});
}
