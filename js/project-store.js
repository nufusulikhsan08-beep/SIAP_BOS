(function(ns){
'use strict';

/*
 * SPMU Project Store V3
 * - Primary: IndexedDB (stores the original BKU file as Blob)
 * - Fallback: localStorage for smaller BKU files when IndexedDB is blocked
 * - Storage health check + clear error reporting
 * - No silent failure: every save reports the actual storage result
 */
const DB_NAME='SPMU_OTOMATIS_PROJECTS';
const DB_VERSION=3;
const STORE_NAME='projects';
const LS_PREFIX='SPMU_PROJECT_FALLBACK_V3_';
const LS_INDEX='SPMU_PROJECT_INDEX_V3';
const LS_MAX_BYTES=4*1024*1024;
let activeProjectId=null;
let activeProjectName='';
let autoSaveTimer=null;

function q(id){return ns.$?ns.$(id):document.getElementById(id)}
function setText(id,text){const el=q(id);if(el)el.textContent=text||''}
function setSaveStatus(text,kind){
  const el=q('projectSaveStatus');
  if(!el)return;
  el.textContent=text||'';
  el.className='project-save-status'+(kind?' '+kind:'');
}
function safeEsc(v){return typeof ns.esc==='function'?ns.esc(String(v)):String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function normalizeError(err){
  const msg=err?.message||String(err||'Kesalahan tidak diketahui.');
  if(/security|denied|not.?allowed/i.test(msg)) return 'Penyimpanan browser diblokir untuk halaman ini. Coba jalankan aplikasi melalui http/https, atau gunakan CADANGAN .SPMU.';
  return msg;
}

function openDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB tidak tersedia pada browser ini.'));
    let req;
    try{req=window.indexedDB.open(DB_NAME,DB_VERSION);}catch(e){reject(e);return;}
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
      const store=db.createObjectStore(STORE_NAME,{keyPath:'id'});
      store.createIndex('updatedAt','updatedAt',{unique:false});
      store.createIndex('name','name',{unique:false});
    };
    req.onsuccess=()=>{
      const db=req.result;
      db.onversionchange=()=>db.close();
      resolve(db);
    };
    req.onerror=()=>reject(req.error||new Error('Gagal membuka IndexedDB.'));
    req.onblocked=()=>reject(new Error('Penyimpanan sedang dikunci oleh tab aplikasi lain. Tutup tab SPMU lain lalu coba lagi.'));
  });
}

function txDone(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('Transaksi penyimpanan gagal.'));
    tx.onabort=()=>reject(tx.error||new Error('Transaksi penyimpanan dibatalkan.'));
  });
}

async function testIndexedDb(){
  const db=await openDb();
  const key='__storage_test__';
  try{
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).put({id:key,name:key,updatedAt:Date.now(),test:true});
    await txDone(tx);
    const tx2=db.transaction(STORE_NAME,'readwrite');
    tx2.objectStore(STORE_NAME).delete(key);
    await txDone(tx2);
    return true;
  }finally{try{db.close()}catch(_){} }
}

function getFallbackIndex(){
  try{
    const a=JSON.parse(localStorage.getItem(LS_INDEX)||'[]');
    return Array.isArray(a)?a:[];
  }catch(_){return []}
}
function setFallbackIndex(arr){
  localStorage.setItem(LS_INDEX,JSON.stringify(arr));
}
function putFallback(project){
  const json=JSON.stringify(project);
  const bytes=new Blob([json]).size;
  if(bytes>LS_MAX_BYTES) throw new Error(`BKU terlalu besar untuk fallback browser (${Math.ceil(bytes/1024/1024)} MB). Gunakan browser/server yang mengizinkan IndexedDB.`);
  localStorage.setItem(LS_PREFIX+project.id,json);
  const index=getFallbackIndex().filter(x=>x.id!==project.id);
  index.push({id:project.id,name:project.name,createdAt:project.createdAt,updatedAt:project.updatedAt,fileName:project.file?.name||'BKU',count:project.state?.rows?.length||0,backend:'localStorage'});
  setFallbackIndex(index.sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0)));
}
function getFallback(id){
  try{
    const raw=localStorage.getItem(LS_PREFIX+id);
    return raw?JSON.parse(raw):null;
  }catch(_){return null}
}
function deleteFallback(id){
  localStorage.removeItem(LS_PREFIX+id);
  setFallbackIndex(getFallbackIndex().filter(x=>x.id!==id));
}
function listFallback(){
  return getFallbackIndex().map(x=>({
    id:x.id,name:x.name,createdAt:x.createdAt,updatedAt:x.updatedAt,
    file:{name:x.fileName,size:0},state:{rows:Array(x.count||0)},backend:'localStorage',_fallback:true
  }));
}

async function getAllProjects(){
  let idb=[];
  try{
    const db=await openDb();
    idb=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readonly');
      const req=tx.objectStore(STORE_NAME).getAll();
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error||new Error('Gagal membaca daftar pekerjaan.'));
    });
    try{db.close()}catch(_){}
  }catch(_){/* fallback below */}
  const merged=new Map();
  [...listFallback(),...idb].forEach(p=>merged.set(p.id,p));
  return [...merged.values()].sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
}

async function getProject(id){
  try{
    const db=await openDb();
    const p=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readonly');
      const req=tx.objectStore(STORE_NAME).get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||new Error('Gagal membaca pekerjaan.'));
    });
    try{db.close()}catch(_){}
    if(p)return p;
  }catch(_){/* fallback */}
  return getFallback(id);
}

async function deleteProject(id){
  let deleted=false;
  try{
    const db=await openDb();
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    await txDone(tx);
    try{db.close()}catch(_){}
    deleted=true;
  }catch(_){/* fallback */}
  try{deleteFallback(id);deleted=true}catch(_){ }
  if(!deleted)throw new Error('Gagal menghapus pekerjaan.');
  ns.renderDashboard?.();
}

function activeTabName(){
  const map=[['tabBku','bku'],['tabSurat','surat'],['tabPajak','pajak']];
  for(const [id,name] of map){const el=q(id);if(el?.classList.contains('active'))return name}
  return 'bku';
}
function baseName(){
  const school=String(ns.state?.identity?.school||'').trim();
  const file=String(ns.state?.file?.name||'').replace(/\.[^.]+$/,'').trim();
  return school||file||'Pekerjaan BKU';
}
function cloneState(){
  const state={
    rows:Array.isArray(ns.state?.rows)?ns.state.rows:[],
    rawRows:Array.isArray(ns.state?.rawRows)?ns.state.rawRows:[],
    result:ns.state?.result||null,
    identity:ns.state?.identity||null,
    surat:ns.state?.surat||null,
    suratByBukti:ns.state?.suratByBukti||{},
    search:String(ns.state?.search||''),
    activeTab:activeTabName(),
    category:String(ns.state?.category||'')
  };
  // Force a plain JSON-compatible snapshot so IndexedDB never receives live/cyclic objects.
  try{return JSON.parse(JSON.stringify(state))}catch(e){throw new Error('Data pekerjaan tidak dapat diserialisasi untuk disimpan: '+(e?.message||e))}
}

async function fileToDataUrl(file){
  if(!file)throw new Error('File BKU tidak ada.');
  const ab=await file.arrayBuffer();
  const bytes=new Uint8Array(ab);
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  return 'data:'+(file.type||'application/octet-stream')+';base64,'+btoa(binary);
}
async function dataUrlToBlob(dataUrl,type){
  const parts=String(dataUrl||'').split(',');
  if(parts.length<2)throw new Error('Cadangan BKU tidak valid.');
  const bin=atob(parts[1]);
  const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return new Blob([out],{type:type||'application/octet-stream'});
}

async function buildPayload(name,id){
  if(!ns.state?.file)throw new Error('Belum ada file BKU yang dipilih. Pilih/upload BKU terlebih dahulu.');
  const now=Date.now();
  const file=ns.state.file;
  const blob=new Blob([await file.arrayBuffer()],{type:file.type||'application/octet-stream'});
  let createdAt=now;
  if(id){const old=await getProject(id);createdAt=old?.createdAt||now}
  return {
    id:id||('p_'+now+'_'+Math.random().toString(36).slice(2,10)),
    name:String(name||baseName()).trim()||'Pekerjaan BKU',
    createdAt,updatedAt:now,version:3,
    file:{name:file.name||'BKU',type:file.type||'',size:file.size||blob.size,lastModified:file.lastModified||now,blob},
    state:cloneState()
  };
}

async function writeProject(payload){
  let idbError=null;
  try{
    const db=await openDb();
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).put(payload);
    await txDone(tx);
    try{db.close()}catch(_){}
    return {backend:'IndexedDB',project:payload};
  }catch(e){idbError=e}

  // Fallback only for smaller files. Convert the BKU Blob to data URL.
  try{
    const dataUrl=await fileToDataUrl(ns.state.file);
    const fallback={...payload,file:{...payload.file,blob:undefined,dataUrl}};
    putFallback(fallback);
    return {backend:'Browser fallback (localStorage)',project:{...payload,file:{...payload.file,blob:await dataUrlToBlob(dataUrl,payload.file.type)}} ,fallback:true};
  }catch(e){
    throw new Error(`Penyimpanan gagal. IndexedDB: ${normalizeError(idbError)} Fallback: ${normalizeError(e)}`);
  }
}

async function putProject(name,id){
  const payload=await buildPayload(name,id);
  const result=await writeProject(payload);
  activeProjectId=payload.id;
  activeProjectName=payload.name;
  markSaved(payload,result.backend);ns.renderDashboard?.();
  return payload;
}

function markSaved(project,backend){
  setText('projectSaveName',project?.name?`Pekerjaan aktif: ${project.name}`:'Belum ada pekerjaan tersimpan.');
  setSaveStatus(`✓ TERSIMPAN • ${backend||'Browser'} • ${new Date(project.updatedAt||Date.now()).toLocaleString('id-ID')}`,'ok');
  if(ns.state)ns.state._projectDirty=false;
}
function markDirty(){
  if(!activeProjectId)return;
  if(ns.state)ns.state._projectDirty=true;
  setSaveStatus('● Ada perubahan yang belum disimpan','dirty');
}
function scheduleAutoSave(){
  markDirty();
  if(!activeProjectId)return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(async()=>{
    try{await putProject(activeProjectName||baseName(),activeProjectId)}catch(e){setSaveStatus('⚠ Auto-simpan gagal: '+normalizeError(e),'error')}
  },900);
}

async function saveCurrentFromUi(name){
  const p=await putProject(name||baseName(),activeProjectId);
  closeProjectDialog();
  await renderProjectList();
  return p;
}

async function saveActiveProjectNow(){
  if(!ns.state?.file)throw new Error('Belum ada file BKU yang dipilih.');
  const p=await putProject(activeProjectName||baseName(),activeProjectId);
  await renderProjectList();
  return p;
}

async function renderProjectList(){
  const box=q('projectList');if(!box)return;
  try{
    const arr=await getAllProjects();
    if(!arr.length){box.innerHTML='<div class="project-empty">Belum ada pekerjaan yang disimpan.<br><small>Setelah klik SIMPAN, pekerjaan akan muncul di sini.</small></div>';return}
    box.innerHTML=arr.map(p=>{
      const count=p.state?.rows?.length||0;
      const file=safeEsc(p.file?.name||'BKU');
      const name=safeEsc(p.name||'Tanpa nama');
      const when=new Date(p.updatedAt||0).toLocaleString('id-ID');
      const backend=p._fallback?'cadangan browser':'IndexedDB';
      const active=p.id===activeProjectId?' active':'';
      return `<div class="project-item${active}"><div class="project-main"><b>${name}</b><span>${file} • ${count} transaksi • ${when} • ${backend}</span></div><div class="project-actions"><button type="button" class="btn project-open-btn" data-action="open" data-id="${safeEsc(p.id)}">Buka</button><button type="button" class="btn project-download-btn" data-action="download" data-id="${safeEsc(p.id)}">Cadangan</button><button type="button" class="btn project-delete-btn" data-action="delete" data-id="${safeEsc(p.id)}">Hapus</button></div></div>`
    }).join('');
    box.querySelectorAll('button[data-action]').forEach(btn=>btn.addEventListener('click',async e=>{
      const action=e.currentTarget.dataset.action,id=e.currentTarget.dataset.id;
      try{
        if(action==='open'){await loadProject(id);closeProjectDialog();}
        else if(action==='download')await downloadProject(id);
        else if(action==='delete'){
          const p=await getProject(id);if(!p)return;
          if(window.confirm(`Hapus pekerjaan "${p.name}" dari penyimpanan browser?`)){
            await deleteProject(id);
            if(activeProjectId===id)detachActiveProject();
            await renderProjectList();
          }
        }
      }catch(err){window.alert(normalizeError(err));}
    }));
  }catch(e){box.innerHTML=`<div class="project-empty error">${safeEsc(normalizeError(e))}</div>`}
}

async function loadProject(id){
  let p=await getProject(id);
  if(!p)throw new Error('Pekerjaan tidak ditemukan.');
  let blob=p.file?.blob;
  if(!blob&&p.file?.dataUrl)blob=await dataUrlToBlob(p.file.dataUrl,p.file.type);
  if(!blob)throw new Error('File BKU pada pekerjaan ini tidak ditemukan.');
  const s=p.state||{};
  ns.state.category=String(s.category||'');
  ns.state.file=new File([blob],p.file.name||'BKU',{type:p.file.type||blob.type||'application/octet-stream',lastModified:p.file.lastModified||Date.now()});
  ns.state.rows=Array.isArray(s.rows)?s.rows:[];
  ns.state.rawRows=Array.isArray(s.rawRows)?s.rawRows:[];
  ns.state.result=s.result||null;
  ns.state.identity=s.identity||{school:'',kecamatan:'',alamat:'',npsn:'',headName:'',headNip:'',treasurerName:'',treasurerNip:'',kabupaten:'',provinsi:''};
  ns.state.surat={...(ns.state.surat||{}),...(s.surat||{})};
  ns.state.suratByBukti=(s.suratByBukti&&typeof s.suratByBukti==='object'&&!Array.isArray(s.suratByBukti))?s.suratByBukti:{};
  // Migrasi pekerjaan V3 lama: satu set isian surat dipindahkan ke No. Bukti aktif.
  if(Object.keys(ns.state.suratByBukti).length===0 && Array.isArray(ns.state.rows) && ns.state.rows.length){
    const idx=Number(ns.state.surat?.rowIndex);
    if(Number.isInteger(idx)&&idx>=0&&idx<ns.state.rows.length && (ns.state.surat?.kepada||ns.state.surat?.untukPembayaran)) {
      const no=ns.normalizeNoBukti?ns.normalizeNoBukti(ns.state.rows[idx]?.noBukti||''):String(ns.state.rows[idx]?.noBukti||'').trim().toUpperCase();
      const key=no?`bukti:${no}`:`row:${idx}`;
      ns.state.suratByBukti[key]={bukti:ns.state.rows[idx]?.noBukti||'',kepada:ns.state.surat.kepada||'',untukPembayaran:ns.state.surat.untukPembayaran||'',savedAt:Date.now()};
    }
  }
  ns.state.search=String(s.search||'');
  activeProjectId=p.id;activeProjectName=p.name||'';
  if(q('searchRows'))q('searchRows').value=ns.state.search;
  if(q('categorySelect'))q('categorySelect').value=ns.state.category||'';
  if(q('status'))q('status').textContent=`Pekerjaan dibuka: ${p.name}. File BKU dan hasil kerja telah dipulihkan.`;
  if(q('readBtn'))q('readBtn').disabled=!ns.state.file;
  if(ns.state.result&&ns.state.rows.length){
    ns.applyIdentityToSurat?.(ns.state.identity||{});
    ns.syncSurat?.();
    ns.enableSuratSection?.();
  }else ns.disableSuratSection?.();
  ns.syncSurat?.();
  for(const k of (ns.SURAT_FIELD_KEYS||[])){
    if(k==='bukti')continue;
    const el=ns.suratElement?.(k);if(el)el.value=ns.state.surat[k]??'';
  }
  if(ns.state.rows.length && Number.isInteger(ns.state.surat.rowIndex) && ns.state.surat.rowIndex>=0){
    const sel=ns.suratElement?.('bukti');if(sel)sel.value=String(ns.state.surat.rowIndex);
    ns.restoreSuratDraft?.(ns.state.surat.rowIndex);
  }
  ns.render?.();
  if(typeof ns.renderSurat==='function'&&ns.state.rows.length)ns.renderSurat();
  ns.renderTaxes?.();
  ns.setTab?.(s.activeTab||'bku');
  markSaved(p,p._fallback?'Browser fallback':'IndexedDB');
  await ns.refreshSuratSuggestions?.();
  return p;
}

async function makePortableObject(p){
  let dataUrl=p.file?.dataUrl;
  if(!dataUrl&&p.file?.blob){
    const pseudoFile=new File([p.file.blob],p.file.name||'BKU',{type:p.file.type||'application/octet-stream',lastModified:p.file.lastModified||Date.now()});
    dataUrl=await fileToDataUrl(pseudoFile);
  }
  return {
    format:'SPMU_PROJECT',version:3,
    id:p.id,name:p.name,createdAt:p.createdAt,updatedAt:p.updatedAt,
    file:{name:p.file?.name||'BKU',type:p.file?.type||'',size:p.file?.size||0,lastModified:p.file?.lastModified||Date.now(),dataUrl},
    state:p.state||{}
  };
}
async function downloadProject(id){
  const p=await getProject(id);if(!p)throw new Error('Pekerjaan tidak ditemukan.');
  const portable=await makePortableObject(p);
  const blob=new Blob([JSON.stringify(portable)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(String(p.name||'SPMU_Pekerjaan').replace(/[\\/:*?"<>|]+/g,'_')||'SPMU_Pekerjaan')+'.spmu';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function closeProjectDialog(){const o=q('projectModal');if(o){o.classList.remove('show');o.setAttribute('aria-hidden','true')}}
function showProjectDialog(mode){
  const overlay=q('projectModal');if(!overlay)return;
  overlay.dataset.mode=mode||'open';overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');
  const saveBox=q('projectSaveBox');
  const title=q('projectModalTitle');const subtitle=q('projectModalSubtitle');
  if(mode==='save'){
    title.textContent=activeProjectId?'Simpan Perubahan Pekerjaan':'Simpan Pekerjaan BKU';
    subtitle.textContent='Klik SIMPAN untuk menulis file BKU + seluruh hasil kerja ke penyimpanan browser.';
    if(saveBox)saveBox.style.display='block';
    const input=q('projectNameInput');if(input){input.value=activeProjectName||baseName();input.focus();input.select()}
  }else{
    title.textContent='Buka Pekerjaan Tersimpan';
    subtitle.textContent='Pekerjaan yang tersimpan di browser akan tampil di bawah.';
    if(saveBox)saveBox.style.display='none';
  }
  renderProjectList();
}

function detachActiveProject(){
  activeProjectId=null;activeProjectName='';clearTimeout(autoSaveTimer);
  if(ns.state)ns.state._projectDirty=false;
  setText('projectSaveName','Pekerjaan baru belum disimpan.');
  setSaveStatus('Pekerjaan baru — belum disimpan.','warn');
}
async function importProjectFile(file){
  if(!file)throw new Error('Pilih file .spmu terlebih dahulu.');
  const text=await file.text();
  const p=JSON.parse(text);
  if(p.format!=='SPMU_PROJECT'||!p.file?.dataUrl)throw new Error('File .spmu tidak valid.');
  const blob=await dataUrlToBlob(p.file.dataUrl,p.file.type);
  const payload={id:p.id||('p_'+Date.now()),name:p.name||'Pekerjaan BKU',createdAt:p.createdAt||Date.now(),updatedAt:Date.now(),version:3,file:{name:p.file.name||'BKU',type:p.file.type||'',size:p.file.size||blob.size,lastModified:p.file.lastModified||Date.now(),blob},state:p.state||{}};
  await writeProject(payload);
  activeProjectId=payload.id;activeProjectName=payload.name;markSaved(payload,'Import .SPMU');await loadProject(payload.id);ns.renderDashboard?.();return payload;
}

async function initProjectStore(){
  const close=q('projectModalClose');if(close)close.addEventListener('click',closeProjectDialog);
  const cancel=q('projectCancelBtn');if(cancel)cancel.addEventListener('click',closeProjectDialog);
  const saveBtn=q('projectConfirmSaveBtn');
  if(saveBtn)saveBtn.addEventListener('click',async()=>{
    const input=q('projectNameInput');
    try{
      saveBtn.disabled=true;await putProject(String(input?.value||'').trim()||baseName(),activeProjectId);
      await renderProjectList();
      closeProjectDialog();
    }catch(e){setSaveStatus('⚠ '+normalizeError(e),'error');window.alert(normalizeError(e));}
    finally{saveBtn.disabled=false}
  });
  const saveTrigger=q('saveProjectBtn');if(saveTrigger)saveTrigger.addEventListener('click',()=>{
    if(!ns.state?.file){window.alert('Pilih/upload file BKU terlebih dahulu.');return}
    showProjectDialog('save');
  });
  const openTrigger=q('openProjectBtn');if(openTrigger)openTrigger.addEventListener('click',()=>showProjectDialog('open'));
  const overlay=q('projectModal');if(overlay)overlay.addEventListener('click',e=>{if(e.target===overlay)closeProjectDialog()});
  const backupInput=q('projectImportInput');
  if(backupInput)backupInput.addEventListener('change',async e=>{try{await importProjectFile(e.target.files?.[0]);showProjectDialog('open')}catch(err){window.alert(normalizeError(err))}finally{e.target.value=''}});
  const backupButton=q('projectImportBtn');if(backupButton)backupButton.addEventListener('click',()=>backupInput?.click());
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProjectDialog()});

  try{
    const ok=await testIndexedDb();
    setSaveStatus(ok?'Penyimpanan aktif • IndexedDB OK':'Penyimpanan terbatas','ok');
  }catch(e){
    try{localStorage.setItem('__spmu_storage_test__','1');localStorage.removeItem('__spmu_storage_test__');setSaveStatus('Penyimpanan cadangan aktif • IndexedDB dibatasi','warn')}
    catch(_){setSaveStatus('⚠ Penyimpanan browser diblokir','error')}
  }
  await renderProjectList();
  ns.renderDashboard?.();
}

Object.assign(ns,{
  initProjectStore,showProjectDialog,closeProjectDialog,loadProject,saveCurrentFromUi,saveActiveProjectNow,
  markProjectDirty:markDirty,scheduleProjectAutoSave:scheduleAutoSave,scheduleAutoSave,
  getActiveProjectId:()=>activeProjectId,getAllProjects,getProject,detachActiveProject,importProjectFile
});
})(window.SPMU=window.SPMU||{});
