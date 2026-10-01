(function(ns){
'use strict';
const {$,state,SURAT_FIELD_KEYS,suratElement,resetAutoIdentity,render,setTab}=ns;

const workspaceShell=document.querySelector('.workspace-shell');
const setSidebarCollapsed=(collapsed)=>{
  const isCollapsed=!!collapsed;
  workspaceShell?.classList.toggle('sidebar-collapsed',isCollapsed);
  const toggle=$('sidebarToggle');
  if(toggle){
    toggle.setAttribute('aria-label',isCollapsed?'Buka sidebar':'Sembunyikan sidebar');
    toggle.setAttribute('aria-expanded',String(!isCollapsed));
    toggle.setAttribute('title',isCollapsed?'Buka sidebar':'Tutup sidebar');
  }
};
$('sidebarToggle')?.addEventListener('click',()=>setSidebarCollapsed(!workspaceShell?.classList.contains('sidebar-collapsed')));
$('tabDashboardBtn')?.addEventListener('click',()=>{setTab('dashboard');ns.renderDashboard?.();});
$('tabBkuBtn').addEventListener('click',()=>{setTab('bku');ns.markProjectDirty?.();});
$('fileInput').addEventListener('change',e=>{ns.detachActiveProject?.();state.file=e.target.files?.[0]||null;state.category='';if($('categorySelect'))$('categorySelect').value='';state.rows=[];state.rawRows=[];state.result=null;state.surat.bukti='';state.surat.rowIndex=-1;state.surat.kepada='';state.surat.untukPembayaran='';state.suratByBukti={};resetAutoIdentity();$('readBtn').disabled=!state.file;$('status').textContent=state.file?`File dipilih: ${state.file.name}. Tekan BACA DATA untuk menjalankan MR. LOADING.`:'Siap. Pilih dokumen BKU.';ns.disableSuratSection();render();});
$('categorySelect')?.addEventListener('change',e=>{state.category=String(e.target.value||'');if(state.surat?.rowIndex>=0){ns.captureCurrentSuratDraft?.();}ns.markProjectDirty?.();});
$('tabSuratBtn').addEventListener('click',()=>{if(!$('tabSuratBtn').disabled){ns.readSuratFields();setTab('surat');ns.renderSurat();}});
$('tabPajakBtn').addEventListener('click',()=>{if(!$('tabPajakBtn').disabled){setTab('pajak');ns.renderTaxes();}});
$('searchRows').addEventListener('input',e=>{state.search=e.target.value||'';render();ns.scheduleProjectAutoSave?.();});
$('readBtn').addEventListener('click',ns.extractBkuData);
$('exportBtn').addEventListener('click',ns.exportXlsx);
$('exportRawBtn').addEventListener('click',ns.exportRawXlsx);
$('suratBukti').addEventListener('change',()=>{ns.captureCurrentSuratDraft?.();ns.fillSurat();ns.scheduleProjectAutoSave?.();});
$('suratPrevBtn').addEventListener('click',()=>{ns.prevSurat();ns.scheduleProjectAutoSave?.();});
$('suratPreviewBtn').addEventListener('click',()=>ns.setDocMode('surat'));
$('kwitansiPreviewBtn').addEventListener('click',()=>ns.setDocMode('kwitansi'));
$('suratNextBtn').addEventListener('click',()=>{ns.nextSurat();ns.scheduleProjectAutoSave?.();});
$('suratPrintBtn').addEventListener('click',ns.printSurat);
$('suratBatchPrintBtn')?.addEventListener('click',()=>ns.openBatchPrintDialog?.());
$('batchPrintCancel2')?.addEventListener('click',()=>{const m=$('batchPrintModal');if(m){m.style.display='none';m.setAttribute('aria-hidden','true');}});
$('suratSaveDataBtn')?.addEventListener('click',async()=>{
  const btn=$('suratSaveDataBtn');
  try{
    if(btn)btn.disabled=true;
    await ns.saveCurrentSuratData?.();
  }catch(e){
    window.alert(e?.message||String(e));
    const st=$('suratDraftSaveStatus');if(st){st.textContent='⚠ Gagal menyimpan data: '+(e?.message||e);st.className='surat-draft-save-status error';}
  }finally{if(btn)btn.disabled=false;}
});
for(const key of SURAT_FIELD_KEYS.filter(k=>k!=='bukti')){
  const el=suratElement(key);
  if(el){const sync=()=>{state.surat[key]=el.value;if(key==='kepada'||key==='untukPembayaran')ns.captureCurrentSuratDraft?.();ns.renderSurat();ns.scheduleProjectAutoSave?.();};el.addEventListener('input',sync);el.addEventListener('change',sync);}
}
function isRealPng(file){
  return new Promise((resolve,reject)=>{
    if(!file){resolve(false);return;}
    if(file.type!=='image/png' && !/\.png$/i.test(file.name)){resolve(false);return;}
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Gagal membaca file logo.'));
    reader.onload=()=>{try{const bytes=new Uint8Array(reader.result);const sig=[137,80,78,71,13,10,26,10];resolve(bytes.length>=8&&sig.every((v,i)=>bytes[i]===v));}catch(_){resolve(false);}};
    reader.readAsArrayBuffer(file.slice(0,8));
  });
}
$('suratLogoSekolah').addEventListener('change',async e=>{
  const file=e.target.files?.[0]; const status=$('logoSekolahStatus');
  if(!file){state.surat.logoSekolah='';if(status)status.textContent='Belum ada logo sekolah. Pilih file PNG untuk menampilkannya di sisi kanan kop surat.';ns.renderSurat();return;}
  try{
    const valid=await isRealPng(file); if(!valid)throw new Error('Logo sekolah wajib berupa file PNG yang valid.');
    const reader=new FileReader(); reader.onload=()=>{state.surat.logoSekolah=String(reader.result||'');if(status)status.textContent=`✓ Logo PNG siap: ${file.name}`;ns.renderSurat();ns.scheduleProjectAutoSave?.();};
    reader.onerror=()=>{e.target.value='';state.surat.logoSekolah='';if(status)status.textContent='⚠ Gagal membaca logo sekolah.';ns.renderSurat();ns.scheduleProjectAutoSave?.();};
    reader.readAsDataURL(file);
  }catch(err){e.target.value='';state.surat.logoSekolah='';if(status)status.textContent='⚠ '+(err?.message||'Logo sekolah harus PNG yang valid.');ns.renderSurat();}
});
$('suratTandaTangan').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file){state.surat.tandaTangan='';ns.renderSurat();return;}const reader=new FileReader();reader.onload=()=>{state.surat.tandaTangan=String(reader.result||'');ns.renderSurat();ns.scheduleProjectAutoSave?.();};reader.readAsDataURL(file);});
$('suratTandaTanganBendahara').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file){state.surat.tandaTanganBendahara='';ns.renderSurat();return;}const reader=new FileReader();reader.onload=()=>{state.surat.tandaTanganBendahara=String(reader.result||'');ns.renderSurat();ns.scheduleProjectAutoSave?.();};reader.readAsDataURL(file);});
$('clearBtn').addEventListener('click',()=>{ns.detachActiveProject?.();state.file=null;state.category='';if($('categorySelect'))$('categorySelect').value='';state.rows=[];state.rawRows=[];state.result=null;state.search='';state.surat.bukti='';state.surat.rowIndex=-1;state.surat.kepada='';state.surat.untukPembayaran='';state.suratByBukti={};state.surat.tandaTangan='';state.surat.tandaTanganBendahara='';state.surat.logoSekolah='';resetAutoIdentity();$('suratTandaTangan').value='';$('suratTandaTanganBendahara').value='';$('suratLogoSekolah').value='';if($('logoSekolahStatus'))$('logoSekolahStatus').textContent='Belum ada logo sekolah. Pilih file PNG untuk menampilkannya di sisi kanan kop surat.';$('searchRows').value='';$('fileInput').value='';['suratUraian','suratUntukPembayaran'].forEach(id=>{const el=$(id);if(el)el.value='';});$('status').textContent='Siap. Pilih dokumen BKU lalu tekan BACA DATA.';ns.disableSuratSection();render();});
resetAutoIdentity();
setTab('dashboard');
render();
ns.renderDashboard?.();
ns.disableSuratSection();
ns.initProjectStore?.();
})(window.SPMU=window.SPMU||{});
