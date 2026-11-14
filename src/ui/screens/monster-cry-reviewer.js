import { cryCatalog, cryRecipe, playCry, stopCry } from '../../audio/monster-cries.js';
import { cryReviews, cryVerdict, saveCryReview } from '../../audio/cry-reviews.js';
import { esc, delegate, toast, sheet } from '../dom.js';
import { sprite16 } from '../sprite16.js';
export function registerMonsterCryReviewer(Router){
 const state={family:'drakeling',element:'All',filter:'all',volume:.5};let generation=0;
 const rows=()=>cryCatalog.filter(x=>(state.element==='All'||x.family.type===state.element)&&(state.filter==='all'||cryVerdict(x.id)===state.filter));
 const familyRows=()=>cryCatalog.filter(x=>x.familyId===state.family);
 const saveDraft=root=>{for(const el of root.querySelectorAll('[data-cry-note]')){const id=el.dataset.cryNote;const old=cryReviews()[id];if(el.value!==(old?.notes||'')){if(!saveCryReview(id,cryVerdict(id),el.value))toast('Notes could not be saved on this device. Keep this page open and copy the report.','bad');}}};
 Router.registerScreen('monster-cry-reviewer',{
  title:'Monster Cry Reviewer',tabs:false,
  render(){
   const all=rows();const ids=[...new Set(all.map(x=>x.familyId))];if(!ids.includes(state.family))state.family=ids[0]||'';
   const counts={pending:0,approved:0,revision:0};for(const row of cryCatalog)counts[cryVerdict(row.id)]++;
   const forms=familyRows(),fam=forms[0]?.family;
   return `<p class="muted">Procedural retro cry drafts · ${cryCatalog.length} forms. Audition with each monster's description and appearance. Approvals are per form and return to Pending if its recipe changes. Review notes stay on this device; copy the report to share them. No franchise data changes.</p>
    <div class="panel tight">${counts.pending} pending · ${counts.approved} approved · ${counts.revision} need revision</div>
    <label class="field">Element<select data-change="element">${['All',...new Set(cryCatalog.map(x=>x.family.type))].map(v=>`<option ${v===state.element?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="field">Status<select data-change="filter">${['all','pending','approved','revision'].map(v=>`<option ${v===state.filter?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="field">Family<select data-change="family">${ids.map(id=>{const x=cryCatalog.find(x=>x.familyId===id);return `<option value="${id}" ${id===state.family?'selected':''}>${esc(x.family.name)} · ${esc(x.family.type)}</option>`;}).join('')}</select></label>
    <label class="field">Audition volume <input type="range" min="0" max="1" step="0.05" value="${state.volume}" data-change="volume"></label>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-action="family-play" ${forms.length?'':'disabled'}>▶ Play family</button><button class="btn" data-action="stop">Stop</button><button class="btn" data-action="next">Next family →</button><button class="btn" data-action="report">Copy review report</button></div>
    ${fam?`<p><b>${esc(fam.name)}</b> — ${esc(fam.description)}</p>`:'<p>No monsters match these filters.</p>'}
    ${forms.map(row=>{const recipe=cryRecipe(row.id),a=row.appearance,review=cryReviews()[row.id];return `<section class="panel" style="margin-top:12px" data-cry-form="${row.id}"><div class="row" style="gap:12px">${sprite16(a,72)}<div><b>${esc(row.name)}</b><div>${esc(a.size)} · ${esc(a.look)} · ${esc(row.family.type)}</div><div class="dim">${esc(a.features.join(', '))}</div></div></div><p class="dim">${recipe.notes.map(esc).join(' · ')}</p><p><b data-cry-status>${cryVerdict(row.id)}</b> · recipe v${recipe.revision}</p><button class="btn primary" data-action="play" data-id="${row.id}">▶ Play ${esc(row.name)}</button><label class="field">Revision notes<textarea data-cry-note="${row.id}" rows="3" maxlength="4000">${esc(review?.notes||'')}</textarea></label><div class="row" style="gap:6px;flex-wrap:wrap">${[['approved','Approve'],['revision','Needs revision'],['pending','Reset to pending']].map(([v,l])=>`<button class="btn" data-action="verdict" data-id="${row.id}" data-status="${v}">${l}</button>`).join('')}</div></section>`;}).join('')}`;
  },
  mount(root){
   const stop=()=>{generation++;stopCry();};
   const change=()=>{saveDraft(root);stop();Router.render();};
   root.querySelectorAll('[data-cry-note]').forEach(el=>el.addEventListener('change',()=>saveDraft(root)));
   const play=async ids=>{stop();const token=generation;try{for(const id of ids){if(token!==generation)break;const complete=await playCry(id,state.volume);if(!complete)break;await new Promise(r=>setTimeout(r,350));}}catch(e){toast(e.message,'bad');}};
   delegate(root,{
    element:el=>{state.element=el.value;change();},filter:el=>{state.filter=el.value;change();},family:el=>{state.family=el.value;change();},volume:el=>{state.volume=Number(el.value);},
    play:el=>play([el.dataset.id]),'family-play':()=>play(familyRows().map(x=>x.id)),stop,
    next:()=>{const ids=[...new Set(rows().map(x=>x.familyId))];state.family=ids[(ids.indexOf(state.family)+1)%ids.length]||'';change();},
    verdict:el=>{const note=root.querySelector(`[data-cry-note="${el.dataset.id}"]`).value;saveDraft(root);if(!saveCryReview(el.dataset.id,el.dataset.status,note)){toast('Review could not be saved on this device. Copy the report before leaving.','bad');return;}stop();Router.render();},
    report:async()=>{saveDraft(root);const text=JSON.stringify({reviewer:'Monster Cry Reviewer',reviews:cryReviews()},null,2);try{await navigator.clipboard.writeText(text);toast('Review report copied.','good');}catch{sheet(`<p>Copy this report:</p><textarea readonly rows="12" style="width:100%">${esc(text)}</textarea>`,{title:'Monster cry review report'});}},
   });
  },
  unmount(){generation++;stopCry();},
 });
}
