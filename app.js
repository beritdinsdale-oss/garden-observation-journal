(() => {
'use strict';
const STORAGE_KEY='gardenJournal.csv.v2';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let model, state={entries:{},photos:{},updatedAt:null}, active='welcome', saveTimer;

Promise.all([
 fetchCSV('content/settings.csv'),
 fetchCSV('content/sections.csv'),
 fetchCSV('content/items.csv')
]).then(([settings,sections,items])=>{
 model=buildModel(settings,sections,items);
 render(); loadState(); restore(); attach(); openHash();
 $('#loading').hidden=true; $('#main').hidden=false;
}).catch(err=>{
 $('#loading').hidden=true; const e=$('#error'); e.hidden=false;
 e.innerHTML='<h1>The journal could not load its content files.</h1><p>Open this package through GitHub Pages or a local web server. Opening index.html directly from a folder may block CSV loading.</p>';
 console.error(err);
});

async function fetchCSV(path){
 const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error(path);
 return parseCSV(await r.text());
}
function parseCSV(text){
 const rows=[]; let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(c==='"'&&quoted&&n==='"'){cell+='"';i++;}
  else if(c==='"'){quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row);}
 const headers=rows.shift().map(h=>h.replace(/^\uFEFF/,'').trim());
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
}
function buildModel(settingsRows,sectionRows,itemRows){
 const settings=Object.fromEntries(settingsRows.map(r=>[r.setting,r.value]));
 const sections=sectionRows.sort((a,b)=>+a.order-+b.order).map(s=>({
  ...s, include_date_weather:s.include_date_weather==='yes', allow_photo:s.allow_photo==='yes',
  items:itemRows.filter(i=>i.section_id===s.section_id).sort((a,b)=>+a.order-+b.order)
 }));
 return {settings,sections};
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function render(){
 const s=model.settings;
 document.title=s.journal_title||'Garden Observation Journal';
 $('#course-title').textContent=s.course_title||''; $('#journal-title').textContent=s.journal_title||'';
 $('#journal-subtitle').textContent=s.journal_subtitle||''; $('#welcome-heading').textContent=s.welcome_heading||'Welcome';
 [s.welcome_text_1,s.welcome_text_2,s.welcome_text_3].filter(Boolean).forEach(t=>$('#welcome-text').append(el('p','',t)));
 $('#footer-text').textContent=s.footer_text||'';
 addNav('welcome','Welcome');
 model.sections.forEach((sec,i)=>{addNav(sec.section_id,sec.navigation_title);$('#journal-form').append(renderSection(sec,i));});
 addNav('summary','📈 Observation Summary');
}
function addNav(id,title){
 const li=el('li'),b=el('button','',title);b.type='button';b.dataset.target=id;
 const st=el('span','status','Not started');st.dataset.status=id;b.append(st);li.append(b);$('#nav-list').append(li);
 const o=el('option','',title);o.value=id;$('#section-picker').append(o);
}
function renderSection(sec,index){
 const s=el('section','journal-section');s.id=sec.section_id;s.hidden=true;
 s.append(el('p','kicker',sec.page_label),el('h2','',sec.page_title),el('p','intro',sec.introduction));
 if(sec.observation_challenge){const c=el('div','challenge');c.append(el('strong','','Observe'),el('p','',sec.observation_challenge));s.append(c);}
 const checks=sec.items.filter(i=>i.item_type==='checklist');
 if(checks.length){const fs=el('fieldset','checklist'),lg=el('legend','', 'Notice');fs.append(lg);const g=el('div','check-grid');
  checks.forEach(i=>{const lab=el('label','check-item'),inp=el('input');inp.type='checkbox';inp.dataset.key=`${sec.section_id}__${i.item_id}`;lab.append(inp,el('span','',i.label));g.append(lab);});fs.append(g);s.append(fs);}
 if(sec.include_date_weather){const g=el('div','field-grid');g.append(field(sec.section_id,'date','Observation date','', 'date'),field(sec.section_id,'weather','Weather or conditions','Optional.', 'text'));s.append(g);}
 sec.items.filter(i=>i.item_type==='prompt').forEach(i=>s.append(field(sec.section_id,i.item_id,i.label,i.help_text,'textarea')));
 if(sec.allow_photo)s.append(photo(sec.section_id));
 const a=el('div','section-actions'),p=el('button','button','Previous section'),n=el('button','button primary',index===model.sections.length-1?'View summary':'Save and continue');
 p.type=n.type='button';p.dataset.prev=sec.section_id;n.dataset.next=sec.section_id;a.append(p,n);s.append(a);return s;
}
function field(sec,id,label,help,type){const w=el('div','field'),key=`${sec}__${id}`,l=el('label','',label);l.htmlFor=key;w.append(l);if(help)w.append(el('p','help',help));
 const input=type==='textarea'?el('textarea'):el('input');if(type!=='textarea')input.type=type;input.id=key;input.dataset.key=key;w.append(input);return w;}
function photo(sec){const w=el('div','field photo'),key=`${sec}__photo`,l=el('label','','Capture an optional photo');l.htmlFor=key;const i=el('input');i.type='file';i.accept='image/*';i.id=key;i.dataset.photo=key;const img=el('img','preview');img.id=key+'-preview';img.alt='Observation photo';const r=el('button','button remove-photo','Remove photo');r.type='button';r.dataset.remove=key;w.append(l,el('p','help','The image is compressed and stored only in this browser.'),i,img,r);return w;}
function attach(){
 $('#nav-list').onclick=e=>{const b=e.target.closest('[data-target]');if(b)show(b.dataset.target,true)};
 $('#section-picker').onchange=e=>show(e.target.value,true);$('#start').onclick=()=>show(model.sections[0].section_id,true);
 $('#journal-form').oninput=e=>{const t=e.target;if(!t.dataset.key)return;state.entries[t.dataset.key]=t.type==='checkbox'?t.checked:t.value;grow(t);queueSave();statuses();};
 $('#journal-form').onchange=async e=>{const t=e.target;if(!t.dataset.photo||!t.files[0])return;try{setStatus('Preparing photo…');state.photos[t.dataset.photo]=await compress(t.files[0]);showPhoto(t.dataset.photo);save();statuses();}catch{alert('The photo could not be added. Try a smaller image.')}t.value='';};
 $('#journal-form').onclick=e=>{const r=e.target.closest('[data-remove]');if(r){delete state.photos[r.dataset.remove];showPhoto(r.dataset.remove);save();return;}
  const n=e.target.closest('[data-next]');if(n){const i=model.sections.findIndex(s=>s.section_id===n.dataset.next);show(i===model.sections.length-1?'summary':model.sections[i+1].section_id,true);return;}
  const p=e.target.closest('[data-prev]');if(p){const i=model.sections.findIndex(s=>s.section_id===p.dataset.prev);show(i<=0?'welcome':model.sections[i-1].section_id,true);}};
 $('#print-top').onclick=$('#print-bottom').onclick=()=>{renderSummary();window.print()};$('#download').onclick=download;
 $('#restore').onchange=restoreBackup;$('#clear').onclick=()=>{if(confirm('Clear all entries saved in this browser?')){localStorage.removeItem(STORAGE_KEY);location.reload();}};
 window.onhashchange=openHash;
}
function show(id,hash){active=id;$('#welcome').hidden=id!=='welcome';$$('.journal-section').forEach(s=>s.hidden=s.id!==id);$('#summary').hidden=id!=='summary';if(id==='summary')renderSummary();
 $$('[data-target]').forEach(b=>b.dataset.target===id?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));$('#section-picker').value=id;if(hash)history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'});}
function openHash(){const id=location.hash.slice(1),valid=['welcome','summary',...model.sections.map(s=>s.section_id)];show(valid.includes(id)?id:'welcome',false);}
function loadState(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));if(x)state=x}catch{}}
function restore(){$$('[data-key]').forEach(i=>{const v=state.entries[i.dataset.key];i.type==='checkbox'?i.checked=!!v:i.value=v||'';grow(i)});Object.keys(state.photos).forEach(showPhoto);statuses();setStatus(state.updatedAt?'Saved '+new Date(state.updatedAt).toLocaleString():'Saved on this device');}
function queueSave(){setStatus('Saving…');clearTimeout(saveTimer);saveTimer=setTimeout(save,350)}
function save(){state.updatedAt=new Date().toISOString();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setStatus('Saved '+new Date(state.updatedAt).toLocaleString())}catch{setStatus('Storage full—download a backup');alert('Browser storage is full. Remove photos and download a backup.');}}
function setStatus(t){$('#save-status').textContent=t}
function statuses(){model.sections.forEach(s=>{const pre=s.section_id+'__',vals=Object.entries(state.entries).filter(([k])=>k.startsWith(pre)).map(([,v])=>v),filled=vals.filter(v=>v===true||(typeof v==='string'&&v.trim())).length+(state.photos[pre+'photo']?1:0),st=$(`[data-status="${s.section_id}"]`);st.textContent=filled===0?'Not started':filled<2?'In progress':'Entry added'});$('[data-status="welcome"]').textContent='';$('[data-status="summary"]').textContent='Review patterns';}
function renderSummary(){const root=$('#summary-content');root.innerHTML='';let any=false;model.sections.forEach(s=>{const chosen=s.items.filter(i=>i.item_type==='checklist'&&state.entries[`${s.section_id}__${i.item_id}`]);if(!chosen.length)return;any=true;const sec=el('section'),h=el('h3','',s.page_title),ul=el('ul');chosen.forEach(i=>ul.append(el('li','',i.label)));sec.append(h,ul);root.append(sec)});if(!any)root.append(el('p','help','Complete one or more Notice checklists to create this summary.'));}
function grow(t){if(t.tagName==='TEXTAREA'){t.style.height='auto';t.style.height=Math.max(125,t.scrollHeight)+'px'}}
function showPhoto(key){const img=$('#'+CSS.escape(key)+'-preview'),src=state.photos[key]||'';if(!img)return;img.src=src;img.classList.toggle('visible',!!src)}
async function compress(file){const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)}),image=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=data}),scale=Math.min(1,1200/image.width),c=document.createElement('canvas');c.width=image.width*scale;c.height=image.height*scale;c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.78)}
function download(){save();const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='garden-journal-backup.json';a.click();URL.revokeObjectURL(u)}
async function restoreBackup(e){const f=e.target.files[0];e.target.value='';if(!f)return;try{const x=JSON.parse(await f.text());if(!x.entries)throw 0;if(confirm('Replace the entries currently saved in this browser?')){localStorage.setItem(STORAGE_KEY,JSON.stringify(x));location.reload()}}catch{alert('That file is not a valid journal backup.')}}
})();