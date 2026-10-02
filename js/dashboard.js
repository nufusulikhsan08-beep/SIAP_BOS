(function(ns){
'use strict';
const CATEGORY={
  modalMesin:'Belanja Modal : Peralatan dan Mesin',
  modalLain:'Belanja Modal : Aset Tetap Lainya',
  operBarang:'Belanja Operasional : Barang dan Jasa',
  operPegawai:'Belanja Operasional : Pegawai'
};
const CAT_CLS={[CATEGORY.modalMesin]:'c1',[CATEGORY.modalLain]:'c2',[CATEGORY.operBarang]:'c3',[CATEGORY.operPegawai]:'c4'};
const CAT_SHORT={[CATEGORY.modalMesin]:'Modal: Peralatan & Mesin',[CATEGORY.modalLain]:'Modal: Aset Tetap Lainnya',[CATEGORY.operBarang]:'Operasional: Barang & Jasa',[CATEGORY.operPegawai]:'Operasional: Pegawai'};
function pill(n){return `<span class="cat-pill ${CAT_CLS[n]||''}">${ns.esc(n)}</span>`;}
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
    return {category:String(d.category),nominal,bukti:no,untukPembayaran:String(d.untukPembayaran||''),savedAt:Number(d.savedAt)||0};
  });
}
function barHtml(label,value,max){
  const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;
  return `<div class="dash-bar-row"><div class="dash-bar-label"><span>${ns.esc(label)}</span><b>${money(value)}</b></div><div class="dash-bar-track"><i style="width:${pct}%;${value<=0?'min-width:0;':''}"></i></div></div>`;
}
let allItems=[];
function drawTable(){
  const tbody=document.getElementById('dashboardTableBody');if(!tbody)return;
  const q=(document.getElementById('dashSearch')?.value||'').trim().toLowerCase();
  const items=allItems.filter(it=>!q||[it.projectName,it.untukPembayaran,it.category,it.bukti].join(' ').toLowerCase().includes(q));
  if(!allItems.length){tbody.innerHTML='<tr><td colspan="6" class="empty">Belum ada SPMU tersimpan. Simpan data SPMU dari Tab SURAT PERINTAH.</td></tr>';return;}
  if(!items.length){tbody.innerHTML='<tr><td colspan="6" class="empty">Tidak ada data yang cocok dengan pencarian.</td></tr>';return;}
  const total=items.reduce((a,x)=>a+x.nominal,0);
  tbody.innerHTML=items.map((item,i)=>`<tr><td>${i+1}</td><td><div class="dash-job-name">${ns.esc(item.projectName)}</div>${item.bukti?`<div class="small">No. Bukti: ${ns.esc(item.bukti)}</div>`:''}</td><td><div class="dash-payment-purpose">${ns.esc(item.untukPembayaran||'— Belum diisi —')}</div></td><td>${pill(item.category)}</td><td>${item.savedAt?new Date(item.savedAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'-'}</td><td class="num">${money(item.nominal)}</td></tr>`).join('')+`<tr class="dash-total-row"><td colspan="5">Total ${items.length} SPMU</td><td class="num">${money(total)}</td></tr>`;
}
document.getElementById('dashSearch')?.addEventListener('input',drawTable);
async function renderDashboard(){
  const tbody=document.getElementById('dashboardTableBody');
  if(!tbody||typeof ns.getAllProjects!=='function')return;
  try{
    const projects=await ns.getAllProjects();
    const savedSPMUs=projects.flatMap(p=>sPMUItems(p).map(item=>({...item,projectName:p?.name||'Tanpa nama'}))).sort((a,b)=>b.savedAt-a.savedAt);
    const sums={[CATEGORY.modalMesin]:0,[CATEGORY.modalLain]:0,[CATEGORY.operBarang]:0,[CATEGORY.operPegawai]:0};
    savedSPMUs.forEach(item=>{if(item.category in sums)sums[item.category]+=item.nominal;});
    const taxSummary=projects.reduce((a,p)=>{const t=typeof ns.getTaxSummary==='function'?ns.getTaxSummary(Array.isArray(p?.state?.rawRows)?p.state.rawRows:[]):{};a.siplah+=Number(t.siplahTotal)||0;a.non+=Number(t.nonSiplahTotal)||0;a.grandTotal+=Number(t.grandTotal)||0;return a;},{siplah:0,non:0,grandTotal:0});
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
    set('dashProjectCount',savedSPMUs.length);set('dashModalTotal',money(sums[CATEGORY.modalMesin]+sums[CATEGORY.modalLain]));
    set('dashOperasionalTotal',money(sums[CATEGORY.operBarang]+sums[CATEGORY.operPegawai]));set('dashTaxTotal',money(taxSummary.grandTotal));set('dashTaxDetail','Akumulasi dari '+projects.length+' BKU tersimpan • SIPLah '+money(taxSummary.siplah)+' • Non SIPLah '+money(taxSummary.non));set('dashUpdated','Diperbarui '+new Date().toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' • '+projects.length+' pekerjaan');
    const cm=document.getElementById('chartModal'),co=document.getElementById('chartOperasional');
    const categoryRows=Object.entries(sums); const categoryTotal=categoryRows.reduce((a,[,v])=>a+v,0);
    const dataBody=document.getElementById('categoryDataBody');
    if(dataBody)dataBody.innerHTML=categoryRows.map(([name,value])=>`<tr><td>${pill(name)}</td><td class="num">${money(value)}</td><td class="num">${categoryTotal>0?(value/categoryTotal*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'0%'}</td></tr>`).join('')+`<tr class="dash-total-row"><td>Total</td><td class="num">${money(categoryTotal)}</td><td class="num">${categoryTotal>0?'100%':'0%'}</td></tr>`;
    const COL={c1:'#3159d9',c2:'#8b5cf6',c3:'#0ea5a4',c4:'#f59e0b'};
    const pct=v=>categoryTotal>0?(v/categoryTotal*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'0%';
    const modalSum=sums[CATEGORY.modalMesin]+sums[CATEGORY.modalLain],operSum=sums[CATEGORY.operBarang]+sums[CATEGORY.operPegawai];
    set('dashModalPct',pct(modalSum)+' dari total');set('dashOperPct',pct(operSum)+' dari total');
    set('dashProjectHint',savedSPMUs.length?'Total nilai '+money(categoryTotal):'Belum ada data');
    const comp=document.getElementById('dashComposition');
    if(comp){
      if(categoryTotal>0){
        let acc=0;const stops=categoryRows.map(([n,v])=>{const s=acc,e=acc+v/categoryTotal*100;acc=e;return COL[CAT_CLS[n]]+' '+s+'% '+e+'%';}).join(',');
        comp.innerHTML=`<div class="dx-donut-wrap"><div class="dx-donut" style="background:conic-gradient(${stops})"><div class="dx-donut-hole"><span>Total</span><b>${money(categoryTotal)}</b></div></div><ul class="dx-legend">${categoryRows.map(([n,v])=>`<li><s style="background:${COL[CAT_CLS[n]]}"></s><span>${ns.esc(CAT_SHORT[n])}</span><b>${pct(v)}</b></li>`).join('')}</ul></div>`;
      }else comp.innerHTML='<div class="comp-empty">Belum ada SPMU tersimpan, komposisi akan tampil setelah ada data.</div>';
    }
    const trendEl=document.getElementById('dashTrend');
    if(trendEl){
      const byMonth={};savedSPMUs.forEach(it=>{if(!it.savedAt)return;const d=new Date(it.savedAt),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');byMonth[k]=(byMonth[k]||0)+it.nominal;});
      const keys=Object.keys(byMonth).sort().slice(-6),mx=Math.max(0,...keys.map(k=>byMonth[k]));
      trendEl.innerHTML=keys.length?`<div class="dx-trend">${keys.map(k=>{const [y,m]=k.split('-');const lbl=new Date(+y,+m-1,1).toLocaleDateString('id-ID',{month:'short',year:'2-digit'});return `<div class="dx-col" title="${lbl}: ${money(byMonth[k])}"><em>${money(byMonth[k]).replace('Rp','').trim()}</em><i style="height:${mx>0?Math.max(6,byMonth[k]/mx*100):6}%"></i><span>${lbl}</span></div>`;}).join('')}</div>`:'<div class="comp-empty">Tren akan tampil setelah ada SPMU tersimpan.</div>';
    }
    const mm=Math.max(sums[CATEGORY.modalMesin],sums[CATEGORY.modalLain]), om=Math.max(sums[CATEGORY.operBarang],sums[CATEGORY.operPegawai]);
    if(cm)cm.innerHTML=barHtml('Peralatan dan Mesin',sums[CATEGORY.modalMesin],mm)+barHtml('Aset Tetap Lainya',sums[CATEGORY.modalLain],mm);
    if(co)co.innerHTML=barHtml('Barang dan Jasa',sums[CATEGORY.operBarang],om)+barHtml('Pegawai',sums[CATEGORY.operPegawai],om);
    allItems=savedSPMUs;drawTable();
  }catch(e){
    if(tbody)tbody.innerHTML=`<tr><td colspan="6" class="empty">Gagal membaca rekap: ${ns.esc(e?.message||e)}</td></tr>`;
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
