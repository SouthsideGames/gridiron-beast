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
 constructor({context=audioContext,bus=()=>audioBus('sfx'),preferences=audioPreferences,hidden=isAudioHidden,fetcher=(p)=>fetch(p),now=()=>Date.now(),defer=queueMicrotask}={}){
  Object.assign(this,{context,bus,preferences,hidden,fetcher,now,defer});this.buffers=new Map();this.loading=null;this.waking=null;this.pending=null;this.current=null;this.serial=0;this.action=0;this.lastAt=-Infinity;this.lastPriority=-1;
 }
 preload(){
  if(this.loading)return this.loading;
  const ac=this.context();if(!ac)return Promise.resolve();
  this.loading=Promise.all(Object.entries(UI_SOUNDS).map(async([id,path])=>{
   try{const r=await this.fetcher(path);if(!r.ok)throw Error('Sound unavailable');const b=await ac.decodeAudioData(await r.arrayBuffer());this.buffers.set(id,b);}catch{ /* audio must never block an action */ }
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
 async preview(id='confirm'){
  const ac=this.context();if(!ac)return false;
  const ticket=this.serial;
  // An explicit Settings preview may wait for decoding; ordinary feedback is
  // short-lived and is discarded after 250 ms, never replayed as a backlog.
  await Promise.all([ac.resume(),this.preload()]);
  if(ticket!==this.serial||!this.buffers.has(id)||this.hidden())return false;
  this.play(id);return ac.state==='running';
 }
 play(id){
  const p=this.preferences(),ac=this.context();if(this.hidden()||p.muted||p.sfx<=0||!ac||ac.state!=='running')return;
  const at=this.now(),priority=PRIORITY[id];if(at-this.lastAt<70&&priority<=this.lastPriority)return;
  const buffer=this.buffers.get(id);if(!buffer)return;
  this.stopVoice();const source=ac.createBufferSource();source.buffer=buffer;source.connect(this.bus());this.current=source;
  source.onended=()=>{source.disconnect();if(this.current===source)this.current=null;};source.start();this.lastAt=at;this.lastPriority=priority;
 }
 stopVoice(){if(this.current){const s=this.current;this.current=null;try{s.stop();}catch{}s.disconnect();}}
 stop(){++this.serial;this.pending=null;this.stopVoice();}
}
export const uiSounds=new UiSoundPlayer();
export const uiSound=id=>uiSounds.request(id);
export function soundForControl(el){
 if(!el||el.disabled||el.dataset?.busy||el.getAttribute?.('aria-disabled')==='true'||el.closest?.('[data-ui-sound="none"]'))return null;
 if(el.dataset?.uiSound)return el.dataset.uiSound;
 const a=el.dataset?.action;
 if(['back','router-back','sheet-close','close','cancel','no','undo'].includes(a))return 'back';
 if(a==='yes')return 'confirm';
 return 'tap';
}
let installed=false;
const presentedScenes=new WeakSet();
export function uiSceneSound(name,ctx){
 const scene=name==='scene'&&ctx.f?.scenes?.[0];
 if(scene&&typeof scene==='object'&&!presentedScenes.has(scene)){presentedScenes.add(scene);uiSound('achievement');}
}
export function installUiSounds(doc=globalThis.document){
 if(installed||!doc)return;installed=true;void uiSounds.preload();
 const wake=()=>{const p=audioPreferences();if(isAudioHidden()||p.muted||p.sfx<=0)return;const ac=audioContext();if(ac&&ac.state!=='running')void ac.resume().catch(()=>{});void uiSounds.preload();};
 doc.addEventListener('pointerdown',wake,{capture:true,passive:true});
 doc.addEventListener('touchend',wake,{capture:true,passive:true});
 doc.addEventListener('keydown',wake,{capture:true});
 doc.addEventListener('click',event=>{
  const el=event.target.closest?.('button,[role="button"],[data-action],a[data-screen]');
  const id=soundForControl(el);if(id)uiSound(id);
 },{capture:true});
 doc.addEventListener('change',event=>{const el=event.target;if(['checkbox','radio'].includes(el?.type)&&!el.disabled)uiSound('tap');});
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)uiSounds.stop();});
 globalThis.addEventListener?.('pagehide',()=>uiSounds.stop());
 globalThis.addEventListener?.('gb-app-state',e=>{if(e.detail?.isActive===false)uiSounds.stop();});
}
