(function(ns){
'use strict';
const {$,state,SURAT_FIELD_KEYS,suratElement,resetAutoIdentity,render,setTab}=ns;

$('fileInput').addEventListener('change',e=>{state.file=e.target.files?.[0]||null;state.rows=[];state.rawRows=[];state.result=null;state.surat.bukti='';resetAutoIdentity();$('readBtn').disabled=!state.file;$('status').textContent=state.file?`File dipilih: ${state.file.name}. Tekan BACA DATA untuk menjalankan MR. LOADING.`:'Siap. Pilih dokumen BKU.';ns.disableSuratSection();render();});
$('tabBkuBtn').addEventListener('click',()=>setTab('bku'));
$('tabSuratBtn').addEventListener('click',()=>{if(!$('tabSuratBtn').disabled){ns.readSuratFields();setTab('surat');ns.renderSurat();}});
$('tabPajakBtn').addEventListener('click',()=>{if(!$('tabPajakBtn').disabled){setTab('pajak');ns.renderTaxes();}});
$('searchRows').addEventListener('input',e=>{state.search=e.target.value||'';render();});
$('readBtn').addEventListener('click',ns.extractBkuData);
$('exportBtn').addEventListener('click',ns.exportXlsx);
$('exportRawBtn').addEventListener('click',ns.exportRawXlsx);
$('suratBukti').addEventListener('change',ns.fillSurat);
$('suratPrevBtn').addEventListener('click',ns.prevSurat);
$('suratPreviewBtn').addEventListener('click',ns.renderSurat);
$('suratNextBtn').addEventListener('click',ns.nextSurat);
$('suratPrintBtn').addEventListener('click',ns.printSurat);
for(const key of SURAT_FIELD_KEYS.filter(k=>k!=='bukti')){
  const el=suratElement(key);
  if(el){const sync=()=>{state.surat[key]=el.value;ns.renderSurat();};el.addEventListener('input',sync);el.addEventListener('change',sync);}
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
    const reader=new FileReader(); reader.onload=()=>{state.surat.logoSekolah=String(reader.result||'');if(status)status.textContent=`✓ Logo PNG siap: ${file.name}`;ns.renderSurat();};
    reader.onerror=()=>{e.target.value='';state.surat.logoSekolah='';if(status)status.textContent='⚠ Gagal membaca logo sekolah.';ns.renderSurat();};
    reader.readAsDataURL(file);
  }catch(err){e.target.value='';state.surat.logoSekolah='';if(status)status.textContent='⚠ '+(err?.message||'Logo sekolah harus PNG yang valid.');ns.renderSurat();}
});
$('suratTandaTangan').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file){state.surat.tandaTangan='';ns.renderSurat();return;}const reader=new FileReader();reader.onload=()=>{state.surat.tandaTangan=String(reader.result||'');ns.renderSurat();};reader.readAsDataURL(file);});
$('clearBtn').addEventListener('click',()=>{state.file=null;state.rows=[];state.rawRows=[];state.result=null;state.search='';state.surat.bukti='';state.surat.rowIndex=-1;state.surat.tandaTangan='';state.surat.logoSekolah='';resetAutoIdentity();$('suratTandaTangan').value='';$('suratLogoSekolah').value='';if($('logoSekolahStatus'))$('logoSekolahStatus').textContent='Belum ada logo sekolah. Pilih file PNG untuk menampilkannya di sisi kanan kop surat.';$('searchRows').value='';$('fileInput').value='';['suratUraian','suratUntukPembayaran'].forEach(id=>{const el=$(id);if(el)el.value='';});$('status').textContent='Siap. Pilih dokumen BKU lalu tekan BACA DATA.';ns.disableSuratSection();render();});
resetAutoIdentity();
render();
ns.disableSuratSection();
})(window.SPMU=window.SPMU||{});
