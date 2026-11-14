import { audioContext, audioBus, audioPreferences, isAudioHidden } from './context.js';
// Procedural retro voice drafts. Pure recipe/PCM creation: never consumes gameplay RNG.
import { FAMILIES, FORMS } from '../data/beast-dex.js';
import { SPECIES_DEX } from '../data/species.js';
import { evolvedSpec } from '../data/monsters.js';
export const CRY_REVISION = 3;
export const CRY_RATE = 22050;
const families = new Map(FAMILIES.map(f => [f.id, f]));
const species = new Map(SPECIES_DEX.map(f => [f.id, f]));
export const cryCatalog = FORMS.map(f => ({ ...f, family: families.get(f.familyId), appearance: evolvedSpec(species.get(f.familyId), f.stage) }));
const hash = s => { let h=2166136261; for(const c of s) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; };
const random = seed => () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
const TYPES = { Fire:[.11,19], Water:[.06,9], Nature:[.08,14], Electric:[.17,45], Earth:[.14,12], Ice:[.05,29], Wind:[.08,24], Dark:[.10,17], Light:[.03,34], Metal:[.08,40], Psychic:[.03,11], Dragon:[.13,23] };
export function cryRecipe(id) {
 const row=cryCatalog.find(x=>x.id===id); if(!row) throw new Error('Unknown monster form');
 const {family:f,appearance:a,stage}=row, desc=f.description.toLowerCase();
 const r=random(hash(f.id+':voice')); const seed=hash(JSON.stringify([CRY_REVISION,id,f.description,a.size,a.look,a.features]));
 // Anatomy from the description takes priority over rendering body shortcuts (e.g. blobs that are toads).
 let voice=/toad|frog/.test(desc)?'croak':/owl/.test(desc)?'hoot':/bird|finch|sparrow|crow|hawk|phoenix|thunderbird|wyvern/.test(desc)||a.body==='avian'?'chirrup':/beetle|bug|fly|moth|spider/.test(desc)||a.body==='insectoid'?'buzz':/machine|clockwork|iron|steel|tin-|brass|kettle|clanks|squeaky/.test(desc)?'mechanical':/eel|snake|serpent|wyrm|fish|minnow|newt|skink/.test(desc)||a.body==='serpent'?'rattle':/wisp|spirit|orb|sunbeam/.test(desc)?'warble':/stump|tree|seed|acorn|coal|stone|mountain|ingot|iceberg/.test(desc)?'creak':a.body==='blob'?'burble':'rasp';
 const shy=/shy|quiet|silence|patient|thoughtful|calm|pensive|dreamy|dozes/.test(desc);
 const eager=/jitter|impatient|nervous|twitch|bounc|can’t sit|playful|curious|zips/.test(desc);
 const singer=/sings|songbird|whistles|squeaky/.test(desc);
 if(singer) voice='chirrup';
 const size={small:1,medium:.78,large:.57}[a.size]||.8;
 const center=(220+r()*230)*size;
 const formants=[450+size*520+r()*180,1300+size*950+r()*250];
 const rhythm=[.11+r()*.06,.20+r()*.07]; // inherited tiny cadence, not an inherited whole waveform
 let events=[];
 const add=(at,dur,points,kind=voice,amp=.8,rough=.1)=>events.push({at,dur,points,kind,amp,rough});
 const chirp=1.15+r()*.4;
 // Distinct articulation and ordering per form, not one rescaled recording.
 if(stage===0){add(0,shy?.23:.14,[center*.8,center*chirp,center]);add(rhythm[1],eager?.16:.34,[center*1.3,center*.87,center*.72]);if(eager||a.look==='cute')add(.66,.13,[center*1.1,center*1.5,center]);}
 else if(stage===1){add(0,.12,[center*.8,center*1.2],'rasp',.55,.18);add(.17,.38,[center,center*1.4,center*.8]);add(.63,.22,[center*1.2,center*.7,center*.9],voice,.85,.18);}
 else {add(0,.36,[center*.7,center*1.2,center*.95],voice,.8,.22);add(.43,.47,[center*1.2,center,center*.65],voice,.9,.30);add(1.03,.17,[center*1.3,center*.8],voice,.7,.15);}
 if(!stage&&f.rarity==='legendary'){events=[];add(0,.32,[center*.7,center*1.2],voice,.85,.22);add(.38,.62,[center,center*1.35,center*.65],voice,.95,.27);add(1.08,.21,[center*1.1,center*.8]);}
 // Description-directed individual identity. These affect both timing and synthesis.
 if(/squeaky/.test(desc)) events.forEach(e=>{e.kind='chirrup';e.points=e.points.map(v=>v*1.35);e.dur*=.68;});
 if(/clockwork|perfect time/.test(desc)) events=Array.from({length:3},(_,i)=>({at:i*.23,dur:.16,points:[center*(i===1?1.35:1),center*.8],kind:'mechanical',amp:.7,rough:.04}));
 if(/sings before|songbird/.test(desc)) events=Array.from({length:4},(_,i)=>({at:i*.19,dur:.17,points:[center*[1,1.25,1.5,1.1][i],center*[1.1,1.4,1.2,.9][i]],kind:'chirrup',amp:.7,rough:.02}));
 if(/baby dragon/.test(desc)) {
  // Baby overconfidence -> agile adult snarl -> broad, horned challenge. Each composed independently.
  events= stage===0 ? [
   {at:0,dur:.14,points:[410,640,500],kind:'chirrup',amp:.7,rough:.04},
   {at:.21,dur:.36,points:[270,350,290,190],kind:'rasp',amp:.9,rough:.22},
   {at:.62,dur:.08,points:[720,850,480],kind:'chirrup',amp:.5,rough:.02},
   {at:.76,dur:.13,points:[420,330,400],kind:'burble',amp:.5,rough:.12}]
   :stage===1?[
   {at:0,dur:.13,points:[240,450,290],kind:'rattle',amp:.7,rough:.16},
   {at:.19,dur:.32,points:[330,460,220],kind:'rasp',amp:.9,rough:.23},
   {at:.58,dur:.30,points:[280,320,180],kind:'rasp',amp:.8,rough:.16},
   {at:.94,dur:.12,points:[480,600,370],kind:'chirrup',amp:.45,rough:.05}]
   :[
   {at:0,dur:.22,points:[160,240,210],kind:'creak',amp:.6,rough:.18},
   {at:.24,dur:.57,points:[195,290,230,150],kind:'roar',amp:1,rough:.31},
   {at:.88,dur:.35,points:[210,320,180],kind:'roar',amp:.85,rough:.22},
   {at:1.25,dur:.16,points:[390,500,270],kind:'rattle',amp:.55,rough:.08}];
 }
 const notes=[`${a.size}, ${a.look} ${a.body}`,a.features.join(', '),shy?'Reserved delivery':eager?'Restless delivery':'Assertive delivery',`Voice: ${voice}`,stage?'Inherited cadence with independently composed adult articulation':'Species-specific cadence and articulation'];
 return {id,revision:CRY_REVISION,seed,voice,formants,element:f.type,features:a.features,description:f.description,notes,events};
}
export function renderCry(recipe,rate=CRY_RATE) {
 if(rate<8000||rate>48000) throw new Error('Unsupported sample rate');
 const rnd=random(recipe.seed), duration=Math.max(...recipe.events.map(e=>e.at+e.dur))+.07;
 const out=new Float32Array(Math.ceil(duration*rate));
 for(const e of recipe.events){let phase=0,low=0,previous=0;const n=Math.round(e.dur*rate),start=Math.round(e.at*rate);
  for(let i=0;i<n;i++) {const t=i/rate,u=i/n,p=u*(e.points.length-1),j=Math.floor(p),frequency=e.points[j]*(1-(p-j))+(e.points[Math.min(j+1,e.points.length-1)]||e.points[j])*(p-j);
   phase+=frequency*(1+.018*Math.sin(2*Math.PI*31*t))/rate;
   const ph=phase*2*Math.PI, tri=2/Math.PI*Math.asin(Math.sin(ph)), pulse=Math.sin(ph)>(.23+.1*Math.sin(t*39))?1:-1;
   let v;
   switch(e.kind){case'chirrup':v=Math.sin(ph+1.8*Math.sin(ph*2))*.65+pulse*.25;break;
    case'buzz':v=pulse*(.6+.4*Math.sin(t*380));break;
    case'mechanical':v=Math.sin(ph+3*Math.sin(ph*2.71))*.65+tri*.3;break;
    case'burble':v=Math.sin(ph+3*Math.sin(t*60))*(.6+.4*Math.sin(t*48));break;
    case'croak':v=(tri*.6+pulse*.4)*(.3+.7*Math.pow(Math.sin(t*65),2));break;
    case'hoot':v=Math.sin(ph)*.8+Math.sin(ph*2)*.16;break;
    case'warble':v=Math.sin(ph+2*Math.sin(t*43));break;
    case'creak':v=(pulse*.5+tri*.5)*(.65+.35*Math.sin(t*130));break;
    case'roar':v=pulse*.4+Math.sin(ph*.501)*.3+Math.sin(ph+3.8*Math.sin(ph*1.49))*.3;break;
    case'rattle':v=tri*.5+Math.sin(ph+2.4*Math.sin(ph*1.02))*.5;break;
    default:v=pulse*.45+Math.sin(ph+3*Math.sin(ph*1.01))*.55;
   }
   // Formant-related modulation, shaped noise, feature-specific articulations.
   v*=.80+.12*Math.sin(2*Math.PI*recipe.formants[0]*t)+.08*Math.sin(2*Math.PI*recipe.formants[1]*t);
   const [grit,flutter]=TYPES[recipe.element];v+= (rnd()*2-1)*(e.rough+grit)*(.6+.4*Math.sin(t*flutter));
   if(recipe.features.includes('wings'))v*=.91+.09*Math.sin(t*81);
   if(recipe.features.includes('plates')||recipe.features.includes('shell'))v+=.05*Math.sin(ph*2.73)*Math.exp(-u*12);
   if(recipe.features.includes('spikes')||recipe.features.includes('fangs'))v+=.05*Math.sin(ph*3.9)*(.5+.5*Math.sin(t*103));
   low+=.55*(v-low);const bright=low-.12*previous;previous=low;
   const env=Math.min(1,t/.007)*Math.min(1,(e.dur-t)/.025)*Math.exp(-u*.4);
   out[start+i]+=Math.round(Math.tanh(bright)*96)/96*env*e.amp;
  }
 }
 let sum=0;for(const v of out)sum+=v*v;
 const gain=.16/Math.max(Math.sqrt(sum/out.length),.001);
 for(let i=0;i<out.length;i++)out[i]=Math.tanh(out[i]*gain);
 return out;
}
// Reviewer only: user gesture unlock, bounded PCM cache, one voice, cancellation and hidden-page stop.
let ctx=null,node=null,serial=0;const cache=new Map();
export function stopCry(){serial++;const source=node;node=null;if(source){try{source.stop();}catch{}source.disconnect();}}
export async function playCry(id,volume=.5){
 stopCry();const ticket=serial;
 if(isAudioHidden()||audioPreferences().muted)return false;
 if(!ctx){ctx=audioContext();if(!ctx)throw new Error('Audio is unavailable in this browser.');globalThis.document?.addEventListener('visibilitychange',()=>{if(document.hidden)stopCry();});globalThis.addEventListener?.('pagehide',stopCry);globalThis.addEventListener?.('gb-app-state',event=>{if(event.detail?.isActive===false)stopCry();});}
 await ctx.resume();if(ticket!==serial)return false;if(ctx.state!=='running')throw new Error('Tap Play again to enable audio.');
 let data=cache.get(id);if(!data){data=renderCry(cryRecipe(id));cache.set(id,data);if(cache.size>12)cache.delete(cache.keys().next().value);}
 const buffer=ctx.createBuffer(1,data.length,CRY_RATE);buffer.copyToChannel(data,0);
 const source=ctx.createBufferSource(),gain=ctx.createGain();gain.gain.value=Math.max(0,Math.min(1,volume));source.buffer=buffer;source.connect(gain).connect(audioBus('cries'));node=source;
 return new Promise(resolve=>{source.onended=()=>{if(node===source)node=null;source.disconnect();gain.disconnect();resolve(ticket===serial);};source.start();});
}
