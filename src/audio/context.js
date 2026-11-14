// Shared context/buses. Device preferences are global, never franchise state.
const KEY='gridiron-beast-audio-v1';
const defaults={muted:false,music:.45,sfx:.7,crowd:.5,cries:.65};
let preferences={...defaults};try{const saved=JSON.parse(globalThis.localStorage?.getItem(KEY)||'{}');for(const k of ['music','sfx','crowd','cries'])if(Number.isFinite(saved[k]))preferences[k]=Math.max(0,Math.min(1,saved[k]));preferences.muted=saved.muted===true;}catch{}
let context=null,master=null;const buses={};
export const audioPreferences=()=>({...preferences});
export function audioContext(){
 if(!context){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;context=new AC();master=context.createGain();master.connect(context.destination);master.gain.value=preferences.muted?0:1;}
 return context;
}
export function audioBus(name){const ac=audioContext();if(!ac)return null;if(!buses[name]){const g=ac.createGain();g.gain.value=preferences[name]??1;g.connect(master);buses[name]=g;}return buses[name];}
export function setAudioPreferences(patch){
 if(typeof patch.muted==='boolean')preferences.muted=patch.muted;
 for(const k of ['music','sfx','crowd','cries'])if(Number.isFinite(patch[k]))preferences[k]=Math.max(0,Math.min(1,patch[k]));
 if(master)master.gain.setTargetAtTime(preferences.muted?0:1,context.currentTime,.025);
 for(const name of ['music','sfx','crowd','cries'])if(buses[name])buses[name].gain.setTargetAtTime(preferences[name],context.currentTime,.025);
 try{globalThis.localStorage?.setItem(KEY,JSON.stringify(preferences));return true;}catch{return false;}
}
export async function unlockAudio(){const ac=audioContext();if(!ac)return false;try{await ac.resume();return ac.state==='running';}catch{return false;}}
export function isAudioHidden(){return !!globalThis.document?.hidden;}
