(() => {
'use strict';
const STORAGE_KEY='gardenJournal.csv.v3';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let model, pages=[], state={entries:{},photos:{},handoffs:{},updatedAt:null}, active='welcome', saveTimer;

Promise.all([
 fetchCSV('content/settings.csv'),
 fetchCSV('content/sections.csv'),
 fetchCSV('content/items.csv')
]).then(([settings,sections,items])=>{
 model=buildModel(settings,sections,items);
 pages=buildPages(model.sections);
 render();
 loadState();
 importHandoff();
 restore();
 attach();
 openHash();
 $('#loading').hidden=true;
 $('#main').hidden=false;
}).catch(err=>{
 $('#loading').hidden=true;
 const e=$('#error'); e.hidden=false;
 e.innerHTML='<h1>The journal could not load its content files.</h1><p>Open this journal through GitHub Pages or a local web server.</p>';
 console.error(err);
});

async function fetchCSV(path){
 const r=await fetch(path,{cache:'no-store'});
 if(!r.ok) throw new Error(path);
 return parseCSV(await r.text());
}
function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],n=text[i+1];
  if(c==='"'&&quoted&&n==='"'){cell+='"';i++}
  else if(c==='"'){quoted=!quoted}
  else if(c===','&&!quoted){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&n==='\n')i++;
   row.push(cell); if(row.some(v=>v!==''))rows.push(row); row=[];cell=''
  } else cell+=c
 }
 if(cell||row.length){row.push(cell);rows.push(row)}
 const headers=rows.shift().map(h=>h.replace(/^\uFEFF/,'').trim());
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
}
function buildModel(settingsRows,sectionRows,itemRows){
 const settings=Object.fromEntries(settingsRows.map(r=>[r.setting,r.value]));
 const sections=sectionRows.sort((a,b)=>+a.order-+b.order).map(s=>({
  ...s,
  include_date_weather:s.include_date_weather==='yes',
  allow_photo:s.allow_photo==='yes',
  items:itemRows.filter(i=>i.section_id===s.section_id).sort((a,b)=>+a.order-+b.order)
 }));
 return {settings,sections};
}

/* Turn module sections containing heading rows into separate activity pages. */
function buildPages(sections){
 const result=[];
 sections.forEach(sec=>{
  const headings=sec.items.filter(i=>i.item_type==='heading');
  if(!headings.length){
   result.push({
    id:sec.section_id,
    moduleId:null,
    moduleTitle:null,
    navTitle:sec.navigation_title,
    title:sec.page_title,
    note:'',
    section:sec,
    items:sec.items
   });
   return;
  }

  let current=null;
  sec.items.forEach(item=>{
   if(item.item_type==='heading'){
    current={
     id:`${sec.section_id}--${item.item_id}`,
     moduleId:sec.section_id,
     moduleTitle:sec.page_title,
     navTitle:item.label,
     title:item.label,
     note:item.help_text||'',
     section:sec,
     items:[]
    };
    result.push(current);
   }else if(current){
    current.items.push(item);
   }
  });
 });
 return result;
}

function el(tag,cls,text){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!=null)n.textContent=text;
 return n;
}

function render(){
 const s=model.settings;
 document.title=s.journal_title||'Garden Observation Journal';
 $('#course-title').textContent=s.course_title||'';
 $('#journal-title').textContent=s.journal_title||'';
 $('#journal-subtitle').textContent=s.journal_subtitle||'';
 $('#welcome-heading').textContent=s.welcome_heading||'Welcome';
 [s.welcome_text_1,s.welcome_text_2,s.welcome_text_3].filter(Boolean).forEach(t=>$('#welcome-text').append(el('p','',t)));
 $('#footer-text').textContent=s.footer_text||'';

 renderNavigation();

 pages.forEach((page,index)=>$('#journal-form').append(renderPage(page,index)));

 const o=el('option','','Welcome');o.value='welcome';$('#section-picker').append(o);
 pages.forEach(page=>{
  const opt=el('option','',page.moduleTitle?`${page.moduleTitle} — ${page.navTitle}`:page.navTitle);
  opt.value=page.id;$('#section-picker').append(opt)
 });
 const so=el('option','','Observation Summary');so.value='summary';$('#section-picker').append(so);
}

function renderNavigation(){
 const nav=$('#notebook-nav');
 const welcome=el('button','nav-home','Welcome');welcome.type='button';welcome.dataset.target='welcome';nav.append(welcome);

 const standaloneBefore=pages.filter(p=>!p.moduleId && p.id==='my-garden');
 standaloneBefore.forEach(p=>nav.append(navButton(p,'nav-standalone')));

 const moduleIds=[...new Set(pages.filter(p=>p.moduleId).map(p=>p.moduleId))];
 moduleIds.forEach(mid=>{
  const modulePages=pages.filter(p=>p.moduleId===mid);
  if(!modulePages.length)return;
  const group=el('section','nav-module');
  const title=el('h3','nav-module-title',modulePages[0].moduleTitle);
  const ul=el('ul','activity-list');
  modulePages.forEach(p=>{
   const li=el('li');li.append(navButton(p,'activity-link'));ul.append(li)
  });
  group.append(title,ul);nav.append(group)
 });

 pages.filter(p=>!p.moduleId && p.id!=='my-garden').forEach(p=>nav.append(navButton(p,'nav-standalone')));

 const summary=el('button','nav-standalone','📈 Observation Summary');
 summary.type='button';summary.dataset.target='summary';
 const st=el('span','nav-status','Review patterns');st.dataset.status='summary';summary.append(st);
 nav.append(summary);
}
function navButton(page,cls){
 const b=el('button',cls,page.navTitle);b.type='button';b.dataset.target=page.id;
 const st=el('span','nav-status','Not started');st.dataset.status=page.id;b.append(st);
 return b;
}

function renderPage(page,index){
 const sec=page.section;
 const s=el('section','journal-page');s.id=page.id;s.hidden=true;

 if(page.moduleTitle){
  const context=el('div','activity-context');
  context.append(el('span','module-pill',page.moduleTitle));
  s.append(context,el('p','kicker','Activity journal entry'),el('h2','',page.title));
  if(page.note){
   const note=el('div','activity-note');note.append(el('p','',page.note));s.append(note)
  }
  if(page.id==='module-2--memory-evidence-heading'){
   const h=el('div','memory-handoff');h.id='memory-handoff';s.append(h);
  }
 }else{
  s.append(el('p','kicker',sec.page_label),el('h2','',page.title));
  if(sec.introduction)s.append(el('p','intro',sec.introduction));
  if(sec.observation_challenge){
   const c=el('div','challenge');c.append(el('strong','','Observe'),el('p','',sec.observation_challenge));s.append(c)
  }
 }

 /* Date/weather and photo appear only on standalone pages or the first activity in a module,
    avoiding repeated clutter on every activity entry. */
 const isFirstModulePage=page.moduleId && pages.find(p=>p.moduleId===page.moduleId)?.id===page.id;
 if(sec.include_date_weather && (!page.moduleId || isFirstModulePage)){
  const g=el('div','field-grid');
  g.append(
   field(page.id,'date','Observation date','', 'date'),
   field(page.id,'weather','Weather or conditions','Optional.', 'text')
  );
  s.append(g);
 }

 renderItems(page,s);

 if(sec.allow_photo && (!page.moduleId || isFirstModulePage))s.append(photo(page.id));

 const a=el('div','page-actions');
 const prev=el('button','button','Previous entry');
 const next=el('button','button primary',index===pages.length-1?'View summary':'Save and continue');
 prev.type=next.type='button';prev.dataset.prev=page.id;next.dataset.next=page.id;
 a.append(prev,next);s.append(a);
 return s;
}

function renderItems(page,container){
 let i=0;
 while(i<page.items.length){
  const item=page.items[i];

  if(item.item_type==='prompt'){
   container.append(field(page.id,item.item_id,item.label,item.help_text,'textarea'));
   i++;continue;
  }

  if(item.item_type==='checklist'){
   const group=[];
   while(i<page.items.length && page.items[i].item_type==='checklist'){
    group.push(page.items[i]);i++
   }
   const fs=el('fieldset','checklist');
   fs.append(el('legend','','Choose the response that fits'));
   const g=el('div','check-grid');
   group.forEach(it=>{
    const lab=el('label','check-item'),inp=el('input');
    inp.type='checkbox';inp.dataset.key=`${page.id}__${it.item_id}`;
    lab.append(inp,el('span','',it.label));g.append(lab)
   });
   fs.append(g);container.append(fs);continue;
  }

  i++;
 }
}

function field(pageId,id,label,help,type){
 const w=el('div','field'),key=`${pageId}__${id}`,l=el('label','',label);
 l.htmlFor=key;w.append(l);
 if(help)w.append(el('p','help',help));
 const input=type==='textarea'?el('textarea'):el('input');
 if(type!=='textarea')input.type=type;
 input.id=key;input.dataset.key=key;w.append(input);return w
}
function photo(pageId){
 const w=el('div','field photo'),key=`${pageId}__photo`,l=el('label','','Capture an optional photo');
 l.htmlFor=key;const i=el('input');i.type='file';i.accept='image/*';i.id=key;i.dataset.photo=key;
 const img=el('img','preview');img.id=key+'-preview';img.alt='Observation photo';
 const r=el('button','button remove-photo','Remove photo');r.type='button';r.dataset.remove=key;
 w.append(l,el('p','help','The image is compressed and stored only in this browser.'),i,img,r);return w
}

function attach(){
 $('#notebook-nav').onclick=e=>{const b=e.target.closest('[data-target]');if(b)show(b.dataset.target,true)};
 $('#section-picker').onchange=e=>show(e.target.value,true);
 $('#start').onclick=()=>show(pages[0].id,true);

 $('#journal-form').oninput=e=>{
  const t=e.target;if(!t.dataset.key)return;
  state.entries[t.dataset.key]=t.type==='checkbox'?t.checked:t.value;
  grow(t);queueSave();statuses()
 };
 $('#journal-form').onchange=async e=>{
  const t=e.target;if(!t.dataset.photo||!t.files[0])return;
  try{setStatus('Preparing photo…');state.photos[t.dataset.photo]=await compress(t.files[0]);showPhoto(t.dataset.photo);save();statuses()}
  catch{alert('The photo could not be added. Try a smaller image.')}
  t.value=''
 };
 $('#journal-form').onclick=e=>{
  const r=e.target.closest('[data-remove]');
  if(r){delete state.photos[r.dataset.remove];showPhoto(r.dataset.remove);save();return}
  const n=e.target.closest('[data-next]');
  if(n){
   const i=pages.findIndex(p=>p.id===n.dataset.next);
   show(i===pages.length-1?'summary':pages[i+1].id,true);return
  }
  const p=e.target.closest('[data-prev]');
  if(p){
   const i=pages.findIndex(x=>x.id===p.dataset.prev);
   show(i<=0?'welcome':pages[i-1].id,true)
  }
 };
 $('#print-top').onclick=$('#print-bottom').onclick=()=>{renderSummary();window.print()};
 $('#download').onclick=download;$('#restore').onchange=restoreBackup;
 $('#clear').onclick=()=>{if(confirm('Clear all entries saved in this browser?')){localStorage.removeItem(STORAGE_KEY);location.reload()}};
 window.onhashchange=openHash
}

function show(id,hash){
 active=id;
 $('#welcome').hidden=id!=='welcome';
 $$('.journal-page').forEach(s=>s.hidden=s.id!==id);
 $('#summary').hidden=id!=='summary';
 if(id==='summary')renderSummary();
 $$('[data-target]').forEach(b=>b.dataset.target===id?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
 $('#section-picker').value=id;
 if(hash)history.replaceState(null,'','#'+id);
 window.scrollTo({top:0,behavior:'smooth'})
}
function openHash(){
 const id=location.hash.slice(1);
 const valid=['welcome','summary',...pages.map(p=>p.id)];
 show(valid.includes(id)?id:'welcome',false)
}

function decodeHandoff(encoded){
 const normalized=encoded.replace(/-/g,'+').replace(/_/g,'/');
 const padded=normalized+'='.repeat((4-normalized.length%4)%4);
 const binary=atob(padded);
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 return JSON.parse(new TextDecoder().decode(bytes))
}
function importHandoff(){
 const raw=location.hash.startsWith('#handoff=')?location.hash.slice(9):'';
 if(!raw)return;
 try{
  const data=decodeHandoff(raw);
  if(data.source!=='climate-memory-evidence')return;
  state.handoffs=state.handoffs||{};
  state.handoffs.climateMemory={
   observation:data.observation||'',
   patternAnswers:Array.isArray(data.patternAnswers)?data.patternAnswers:[],
   path:data.path||'',
   reflectionNotes:data.reflectionNotes||'',
   notes:data.notes||'',
   verdict:data.verdict||'',
   changed:data.changed||'',
   changedComment:data.changedComment||''
  };
  state.updatedAt=new Date().toISOString();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  history.replaceState(null,'',location.pathname+location.search+'#module-2--memory-evidence-heading')
 }catch(err){
  console.warn('Journal handoff could not be imported.',err);
  history.replaceState(null,'',location.pathname+location.search)
 }
}
function loadState(){
 try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));if(x)state=x}catch{}
}
function restore(){
 $$('[data-key]').forEach(i=>{
  const v=state.entries[i.dataset.key];
  i.type==='checkbox'?i.checked=!!v:i.value=v||'';grow(i)
 });
 renderMemoryHandoff();
  Object.keys(state.photos).forEach(showPhoto);statuses();
 setStatus(state.updatedAt?'Saved '+new Date(state.updatedAt).toLocaleString():'Saved on this device')
}
function renderMemoryHandoff(){
 const wrap=$('#memory-handoff');if(!wrap)return;
 const d=state.handoffs&&state.handoffs.climateMemory;
 wrap.innerHTML='';
 if(!d){
  const empty=el('div','handoff-empty');
  empty.append(el('strong','','Complete the Climate Memory + Evidence activity to fill this entry automatically.'),el('p','','Your observation, guided data answers, optional notes, and final comparison will appear here.'));
  wrap.append(empty);return;
 }
 const card=el('div','handoff-card');
 const obs=el('section','handoff-section');obs.append(el('h3','','Observation I investigated'),el('p','handoff-observation',d.observation||'—'));card.append(obs);
 if(d.reflectionNotes){const rn=el('section','handoff-section');rn.append(el('h3','',d.path==='interview'?'Interview notes':'Reflection notes'),el('p','handoff-response',d.reflectionNotes));card.append(rn);}
 const ans=el('section','handoff-section');ans.append(el('h3','','What I found in the climate record'));
 (d.patternAnswers||[]).forEach((a,i)=>{const q=el('div','handoff-answer');q.append(el('p','handoff-question',`${i+1}. ${a.question}`),el('p','handoff-response',a.answer||'—'),...(a.detail?[el('p','handoff-detail',a.detail)]:[]));ans.append(q)});card.append(ans);
 const notes=el('section','handoff-section');notes.append(el('h3','','My notes'),el('p','handoff-notes',d.notes||'No notes added.'));card.append(notes);
 const v={supports:'The climate record generally supports the observation',mixed:'The climate record partly supports it, but the story is more complicated',unclear:'The climate record does not clearly support the observation','more-info':'I need more information to tell'};
 const c={yes:'Yes','a-little':'A little',no:'No','not-sure':'I’m not sure yet'};
 const comp=el('section','handoff-section');comp.append(el('h3','','How the record compares with the observation'),el('p','handoff-response',v[d.verdict]||'—'),el('p','handoff-question','Did the data change how I think about the original observation?'),el('p','handoff-response',c[d.changed]||'—'));if(d.changedComment){comp.append(el('p','handoff-question','My reflection'),el('p','handoff-response',d.changedComment));}card.append(comp);
 wrap.append(card)
}

function queueSave(){setStatus('Saving…');clearTimeout(saveTimer);saveTimer=setTimeout(save,350)}
function save(){
 state.updatedAt=new Date().toISOString();
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setStatus('Saved '+new Date(state.updatedAt).toLocaleString())}
 catch{setStatus('Storage full—download a backup');alert('Browser storage is full. Remove photos and download a backup.')}
}
function setStatus(t){$('#save-status').textContent=t}
function statuses(){
 pages.forEach(p=>{
  const pre=p.id+'__';
  const vals=Object.entries(state.entries).filter(([k])=>k.startsWith(pre)).map(([,v])=>v);
  const filled=vals.filter(v=>v===true||(typeof v==='string'&&v.trim())).length+(state.photos[pre+'photo']?1:0);
  const st=$(`[data-status="${p.id}"]`);if(st)st.textContent=filled===0?'Not started':filled<2?'In progress':'Entry added'
 });
}
function renderSummary(){
 const root=$('#summary-content');root.innerHTML='';let any=false;
 pages.forEach(p=>{
  const chosen=p.items.filter(i=>i.item_type==='checklist'&&state.entries[`${p.id}__${i.item_id}`]);
  if(!chosen.length)return;
  any=true;const sec=el('section'),h=el('h3','',p.title),ul=el('ul');
  chosen.forEach(i=>ul.append(el('li','',i.label)));sec.append(h,ul);root.append(sec)
 });
 if(!any)root.append(el('p','help','Complete one or more journal entries to create this summary.'))
}
function grow(t){if(t.tagName==='TEXTAREA'){t.style.height='auto';t.style.height=Math.max(125,t.scrollHeight)+'px'}}
function showPhoto(key){const img=$('#'+CSS.escape(key)+'-preview'),src=state.photos[key]||'';if(!img)return;img.src=src;img.classList.toggle('visible',!!src)}
async function compress(file){
 const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
 const image=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=data});
 const scale=Math.min(1,1200/image.width),c=document.createElement('canvas');
 c.width=image.width*scale;c.height=image.height*scale;c.getContext('2d').drawImage(image,0,0,c.width,c.height);
 return c.toDataURL('image/jpeg',.78)
}
function download(){
 save();const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');
 a.href=u;a.download='garden-journal-backup.json';a.click();URL.revokeObjectURL(u)
}
async function restoreBackup(e){
 const f=e.target.files[0];e.target.value='';if(!f)return;
 try{
  const x=JSON.parse(await f.text());if(!x.entries)throw 0;
  if(confirm('Replace the entries currently saved in this browser?')){localStorage.setItem(STORAGE_KEY,JSON.stringify(x));location.reload()}
 }catch{alert('That file is not a valid journal backup.')}
}
})();
