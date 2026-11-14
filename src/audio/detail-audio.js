import { cryCatalog,playCry,stopCry } from './monster-cries.js';
import { audioPreferences,isAudioHidden } from './context.js';
export function monsterCryId(monster){
 if(!monster)return null;const family=typeof monster==='string'?monster:monster.species||monster.id;
 const base=cryCatalog.find(x=>x.familyId===family)?.familyId;
 if(!base)return null;const stage=typeof monster==='string'?0:Number(monster.stage)||0;
 return cryCatalog.find(x=>x.familyId===base&&x.stage===stage)?.id||`${base}:0`;
}
export function playMonsterCry(monster){
 stopCry();const prefs=audioPreferences();if(prefs.muted||prefs.cries===0||isAudioHidden())return;
 const id=monsterCryId(monster);if(!id)return;
 // Browsers may block sound before a tap: never replay a backlog of missed cries.
 void playCry(id,1).catch(()=>{});
}
export function routeDetailAudio(name,ctx,{play=playMonsterCry,stop=stopCry}={}){
 if(!ctx.entering)return;
 if(name==='career')return;
 stop();if(name==='monster'){const monster=ctx.f?.roster.find(m=>m.id===ctx.params.id);if(monster)play(monster);}
}
