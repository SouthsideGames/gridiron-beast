import { audioContext,audioBus,unlockAudio,isAudioHidden } from './context.js';
export const MUSIC_TRACKS=Object.freeze({main:'assets/audio/music/main.mp3',clash:'assets/audio/music/clash.mp3',championship:'assets/audio/music/championship.mp3',pregame:'assets/audio/music/pregame.mp3'});
// undefined preserves the current track (Settings); null is a deliberate quiet scene.
export function musicForScreen(name){
 if(name==='settings')return undefined;
 if(name==='match'||name==='developer'||/reviewer|preview|audit|lab/.test(name))return null;
 return name==='pregame'?'pregame':name==='clash-battle'?'clash':name==='ceremony'?'championship':'main';
}
export class MusicPlayer {
 constructor({context=audioContext,bus=()=>audioBus('music'),createMedia=()=>new Audio(),hidden=isAudioHidden,fadeMs=900}={}){Object.assign(this,{getContext:context,getBus:bus,createMedia,hidden,fadeMs});this.desired=null;this.current=null;this.outgoing=null;this.pending=null;this.ticket=0;this.timer=null;this.positions=new Map();}
 dispose(p){if(!p)return;if(p.media.currentTime>0)this.positions.set(p.id,p.media.currentTime);try{p.media.pause();p.media.removeAttribute('src');p.media.load();p.source.disconnect();p.gain.disconnect();}catch{}}
 ramp(p,value,ms){if(!p)return;const ac=this.getContext(),g=p.gain.gain;if(g.cancelAndHoldAtTime)g.cancelAndHoldAtTime(ac.currentTime);else{const v=g.value;g.cancelScheduledValues(ac.currentTime);g.setValueAtTime(v,ac.currentTime);}g.linearRampToValueAtTime(value,ac.currentTime+ms/1000);}
 async select(id,{restart=false,fadeMs=this.fadeMs}={}){
  if(id!==null&&!MUSIC_TRACKS[id])throw new Error('Unknown music track');
  const previous=this.desired;this.desired=id;
  if(!restart&&previous===id&&(id===null||this.current?.id===id||this.pending?.id===id))return;
  if(this.hidden())return;
  const ac=this.getContext();if(!ac||ac.state!=='running')return;
  if(!restart&&this.pending?.id===id)return;
  if(!restart&&this.current?.id===id){++this.ticket;clearTimeout(this.timer);this.dispose(this.pending);this.pending=null;this.dispose(this.outgoing);this.outgoing=null;this.ramp(this.current,1,fadeMs);return;}
  const ticket=++this.ticket;clearTimeout(this.timer);this.dispose(this.pending);this.pending=null;this.dispose(this.outgoing);this.outgoing=null;
  if(id===null){const old=this.current;this.current=null;this.outgoing=old;this.ramp(old,0,fadeMs);this.timer=setTimeout(()=>{if(ticket===this.ticket){this.dispose(this.outgoing);this.outgoing=null;}},fadeMs+40);return;}
  const media=this.createMedia();media.preload='auto';media.src=MUSIC_TRACKS[id];media.loop=false;
  const source=ac.createMediaElementSource(media),gain=ac.createGain();gain.gain.value=0;source.connect(gain).connect(this.getBus());
  const next={id,media,source,gain};this.pending=next;
  const position=restart?0:(this.positions.get(id)||0);if(position)media.addEventListener('loadedmetadata',()=>{if(Number.isFinite(media.duration)&&position<media.duration-.5)try{media.currentTime=position;}catch{}},{once:true});
  media.addEventListener('timeupdate',()=>{if(this.current===next&&!this.pending&&Number.isFinite(media.duration)&&media.duration-media.currentTime<.38)this.select(id,{restart:true,fadeMs:300});});
  media.addEventListener('ended',()=>{if(this.current===next&&!this.pending)this.select(id,{restart:true,fadeMs:120});});
  try{await media.play();}catch{if(this.pending===next)this.pending=null;this.dispose(next);return;}
  if(ticket!==this.ticket||this.hidden()){this.dispose(next);return;}
  this.pending=null;const old=this.current;this.current=next;this.outgoing=old;this.ramp(next,1,fadeMs);this.ramp(old,0,fadeMs);
  this.timer=setTimeout(()=>{if(ticket===this.ticket){this.dispose(this.outgoing);this.outgoing=null;}},fadeMs+40);
 }
 pause(){++this.ticket;clearTimeout(this.timer);this.dispose(this.pending);this.pending=null;this.dispose(this.outgoing);this.outgoing=null;this.dispose(this.current);this.current=null;}
}
export const music=new MusicPlayer();
let installed=false;
export function installAudioLifecycle(){
 if(installed||!globalThis.document)return;installed=true;
 const unlock=async()=>{if(!isAudioHidden()&&await unlockAudio())music.select(music.desired);};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();audioContext()?.suspend().catch(()=>{});}else unlock();});
 globalThis.addEventListener?.('pagehide',()=>music.pause());
 const nativeApp=globalThis.Capacitor?.Plugins?.App;if(nativeApp?.addListener)try{Promise.resolve(nativeApp.addListener('appStateChange',state=>globalThis.dispatchEvent(new CustomEvent('gb-app-state',{detail:state})))).catch(()=>{});}catch{}
 // Capacitor is optional in this web build; its App plugin can forward native lifecycle events here.
 globalThis.addEventListener?.('gb-app-state',event=>{if(event.detail?.isActive===false){music.pause();audioContext()?.suspend().catch(()=>{});}else unlock();});
}
