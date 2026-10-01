(function(ns){
'use strict';
const CATEGORY={
  modalMesin:'Belanja Modal : Peralatan dan Mesin',
  modalLain:'Belanja Modal : Aset Tetap Lainya',
  operBarang:'Belanja Operasional : Barang dan Jasa',
  operPegawai:'Belanja Operasional : Pegawai'
};
function money(n){return typeof ns.formatMoney==='function'?ns.formatMoney(n):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);}
function sPMUItems(project){
  const state=project?.state||{};
  const rows=Array.isArray(state.rows)?state.rows:[];
  const drafts=state.suratByBukti&&typeof state.suratByBukti==='object'&&!Array.isArray(state.suratByBukti)?Object.values(state.suratByBukti):[];
  return drafts.filter(d=>d&&d.savedAt&&String(d.category||'').trim()).map(d=>{
    const no=String(d.bukti||'').trim();
    const row=rows.find(r=>{
      const a=typeof ns.normalizeNoBukti==='function'?ns.normalizeNoBukti(r?.noBukti||''):String(r?.noBukti||'').trim().toUpperCase();
      const b=typeof ns.normalizeNoBukti==='function'?ns.normalizeNoBukti(no):no.toUpperCase();
      return a&&b&&a===b;
    });
    const nominal=Math.max(0,Number(d.nominal??row?.pengeluaran)||0);
    return {category:String(d.category),nominal,bukti:no};
  });
}
function barHtml(label,value,max){
  const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;
  return `<div class="dash-bar-row"><div class="dash-bar-label"><span>${ns.esc(label)}</span><b>${money(value)}</b></div><div class="dash-bar-track"><i style="width:${pct}%;${value<=0?'min-width:0;':''}"></i></div></div>`;
}
async function renderDashboard(){
  const tbody=document.getElementById('dashboardTableBody');
  if(!tbody||typeof ns.getAllProjects!=='function')return;
  try{
    const projects=await ns.getAllProjects();
    const savedSPMUs=projects.flatMap(p=>sPMUItems(p).map(item=>({...item,projectName:p?.name||'Tanpa nama'})));
    const sums={[CATEGORY.modalMesin]:0,[CATEGORY.modalLain]:0,[CATEGORY.operBarang]:0,[CATEGORY.operPegawai]:0};
    savedSPMUs.forEach(item=>{if(item.category in sums)sums[item.category]+=item.nominal;});
    const taxSummary=typeof ns.getTaxSummary==='function'?ns.getTaxSummary(ns.state?.rawRows||[]):{grandTotal:0};
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
    set('dashProjectCount',savedSPMUs.length);set('dashModalTotal',money(sums[CATEGORY.modalMesin]+sums[CATEGORY.modalLain]));
    set('dashOperasionalTotal',money(sums[CATEGORY.operBarang]+sums[CATEGORY.operPegawai]));set('dashTaxTotal',money(taxSummary.grandTotal));
    const cm=document.getElementById('chartModal'),co=document.getElementById('chartOperasional');
    const categoryRows=Object.entries(sums); const categoryTotal=categoryRows.reduce((a,[,v])=>a+v,0);
    const dataBody=document.getElementById('categoryDataBody');
    if(dataBody)dataBody.innerHTML=categoryRows.map(([name,value])=>`<tr><td>${ns.esc(name)}</td><td class="num">${money(value)}</td><td class="num">${categoryTotal>0?(value/categoryTotal*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'0%'}</td></tr>`).join('');
    const mm=Math.max(sums[CATEGORY.modalMesin],sums[CATEGORY.modalLain]), om=Math.max(sums[CATEGORY.operBarang],sums[CATEGORY.operPegawai]);
    if(cm)cm.innerHTML=barHtml('Peralatan dan Mesin',sums[CATEGORY.modalMesin],mm)+barHtml('Aset Tetap Lainya',sums[CATEGORY.modalLain],mm);
    if(co)co.innerHTML=barHtml('Barang dan Jasa',sums[CATEGORY.operBarang],om)+barHtml('Pegawai',sums[CATEGORY.operPegawai],om);
    if(!savedSPMUs.length){tbody.innerHTML='<tr><td colspan="4" class="empty">Belum ada SPMU tersimpan. Simpan data SPMU dari Tab SURAT PERINTAH.</td></tr>';return;}
    tbody.innerHTML=savedSPMUs.map((item,i)=>{
      return `<tr><td>${i+1}</td><td>${ns.esc(item.projectName)}${item.bukti?`<div class="small">No. Bukti: ${ns.esc(item.bukti)}</div>`:''}</td><td>${ns.esc(item.category)}</td><td class="num">${money(item.nominal)}</td></tr>`;
    }).join('');
  }catch(e){
    if(tbody)tbody.innerHTML=`<tr><td colspan="4" class="empty">Gagal membaca rekap: ${ns.esc(e?.message||e)}</td></tr>`;
  }
}
document.querySelectorAll('.view-switch-btn').forEach(btn=>btn.addEventListener('click',()=>{
  const view=btn.dataset.view==='data'?'data':'chart';
  document.querySelectorAll('.view-switch-btn').forEach(b=>b.classList.toggle('active',b===btn));
  const chart=document.getElementById('categoryChartView'),data=document.getElementById('categoryDataView');
  if(chart)chart.hidden=view!=='chart';if(data)data.hidden=view!=='data';
}));
document.getElementById('dashboardRefreshBtn')?.addEventListener('click',renderDashboard);
Object.assign(ns,{renderDashboard});
})(window.SPMU=window.SPMU||{});
