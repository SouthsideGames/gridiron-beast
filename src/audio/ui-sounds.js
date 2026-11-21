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
 constructor({context=audioContext,bus=()=>audioBus('sfx'),preferences=audioPreferences,hidden=isAudioHidden,fetcher=(p)=>fetch(p),now=()=>Date.now(),defer=(fn)=>queueMicrotask(fn)}={}){
  Object.assign(this,{context,bus,preferences,hidden,fetcher,now,defer});this.buffers=new Map();this.loading=null;this.waking=null;this.pending=null;this.current=null;this.currentTap=null;this.tapSerial=0;this.serial=0;this.action=0;this.lastAt=-Infinity;this.lastPriority=-1;
 }
 preload(){
  if(this.loading)return this.loading;
  const ac=this.context();if(!ac)return Promise.resolve();
  this.loading=Promise.all(Object.entries(UI_SOUNDS).map(async([id,path])=>{
   try{const r=await this.fetcher(path);if(!r.ok)throw Error('Sound unavailable');const b=decodeUiWav(ac,await r.arrayBuffer());this.buffers.set(id,b);}catch{ /* audio must never block an action */ }
  })).finally(()=>{if(this.buffers.size<Object.keys(UI_SOUNDS).length)this.loading=null;});return this.loading;
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
