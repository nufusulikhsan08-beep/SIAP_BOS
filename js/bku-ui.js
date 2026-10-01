(function(ns){
'use strict';
const {
  $,state,esc,formatMoney,clean,groupRowsByBukti,validateBkuKecamatan,finalizeBkuIdentity,applyIdentityToSurat,
  readPdf,readExcel,resetAutoIdentity,normalizeNoBukti,getTaxRows,getTaxSummary,sanitizeUraian,
  pdfColumns,detectPdfColumns,groupPdfLines,lineText,extractPdfIdentityPage,extractPdfSignatures,
  extractColumnText,extractColumnMoney,findPdfDateRows,buildPdfRowBands,isInternalMovement
}=ns;
const syncSurat=()=>ns.syncSurat();
const enableSuratSection=()=>ns.enableSuratSection();
const disableSuratSection=()=>ns.disableSuratSection();

function renderRawRows(){
  const tb=$('rawTbody'), rows=state.rawRows||[];
  $('rawTotal').textContent=formatMoney(rows.reduce((s,r)=>s+(Number(r.pengeluaran)||0),0));
  $('exportRawBtn').disabled=!rows.length;
  if(!rows.length){tb.innerHTML='<tr><td colspan="5" class="empty">Belum ada data murni.</td></tr>';return;}
  tb.innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.tanggal||'—')}</td><td>${esc(r.noBukti||'—')}</td><td>${esc(r.uraian||'—')}</td><td class="num">${formatMoney(r.pengeluaran)}</td></tr>`).join('');
}
function renderTaxes(){
  const all=getTaxRows(), s=all.filter(x=>x.siplah), n=all.filter(x=>!x.siplah);
  const summary=getTaxSummary();
  const st=summary.siplahTotal, nt=summary.nonSiplahTotal;
  $('taxSiplahTotal').textContent=formatMoney(st); $('taxNonSiplahTotal').textContent=formatMoney(nt); $('taxGrandTotal').textContent=formatMoney(summary.grandTotal); $('taxCount').textContent=summary.count;
  $('taxSiplahFooter').textContent=formatMoney(st); $('taxNonSiplahFooter').textContent=formatMoney(nt);
  const paint=(rows,el)=>{
    if(!rows.length){el.innerHTML='<tr><td colspan="6" class="empty">Tidak ada transaksi pajak pada kategori ini.</td></tr>';return;}
    el.innerHTML=rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.row.tanggal||'—')}</td><td>${esc(x.row.noBukti||'—')}</td><td><span class="tax-type">${esc(x.type)}</span></td><td>${esc(x.row.uraian||'—')}</td><td class="num">${formatMoney(x.amount)}</td></tr>`).join('');
  };
  paint(s,$('taxSiplahBody')); paint(n,$('taxNonSiplahBody'));
}
function render(){
  // Ringkasan metrik mFile/mPages/mRows/mTotal/mIncome ada pada layout lama,
  // tetapi memang tidak ditampilkan pada layout FIXED. Jangan biarkan elemen
  // opsional yang hilang menghentikan seluruh render, ekstraksi, dan Project Store.
  const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
  setText('mFile',state.file?.name||'—');
  setText('mPages',state.result?.pages??0);
  setText('mRows',state.rows.length);
  setText('mTotal',formatMoney(state.rows.reduce((s,r)=>s+r.pengeluaran,0)));
  setText('mIncome',formatMoney(state.result?.excludedIncome||0));
  $('sourceInfo').textContent=state.result?`${state.result.blocks} blok/baris diperiksa • ${state.result.rawRowCount??state.rows.length} transaksi murni → ${state.rows.length} rincian setelah penggabungan kode BPU/BNU • ${state.result.ignoredRows} diabaikan`:'Belum ada file dibaca.';
  const tb=$('tbody'); const shown=state.rows.map((r,i)=>({...r,_index:i})).filter(r=>!state.search||`${r.tanggal} ${r.noBukti} ${r.uraian}`.toLowerCase().includes(state.search.toLowerCase()));
  if(!shown.length)tb.innerHTML=`<tr><td colspan="5" class="empty">${state.rows.length?'Tidak ada transaksi yang cocok dengan pencarian.':'Belum ada data. Impor dokumen untuk memulai.'}</td></tr>`;
  else tb.innerHTML=shown.map(r=>`<tr><td>${r._index+1}</td><td>${esc(r.tanggal)}</td><td>${esc(r.noBukti||'—')}</td><td>${esc(r.uraian)}</td><td class="num">${formatMoney(r.pengeluaran)}</td></tr>`).join('');
  const w=state.result?.warnings||[]; $('warnings').innerHTML=w.length?w.map(x=>`<div class="warn">${esc(x)}</div>`).join(''):'';
  $('exportBtn').disabled=!state.rows.length;
  renderRawRows(); renderTaxes();
}
function mrLoading(stage,detail,progress){
  const ov=$('mrLoadingOverlay');
  if(!ov)return;
  ov.classList.remove('success','error'); ov.classList.add('show'); ov.setAttribute('aria-hidden','false');
  $('mrLoadingText').textContent=stage||'MR. LOADING sedang bekerja…';
  $('mrLoadingDetail').textContent=detail||'Mohon tunggu, data sedang dibaca dengan teliti.';
  $('mrLoadingProgress').style.width=Math.max(4,Math.min(100,Number(progress)||4))+'%';
  $('mrLoadingAvatar').innerHTML='<div class="mr-spinner"></div><div class="mr-face">👨‍💼</div>';
}
function mrLoadingSuccess(detail){
  const ov=$('mrLoadingOverlay');
  if(!ov)return Promise.resolve();
  ov.classList.remove('error');ov.classList.add('show','success');ov.setAttribute('aria-hidden','false');
  $('mrLoadingText').textContent='MR. LOADING BERHASIL MEMBACA DATA BKU';
  $('mrLoadingDetail').textContent=detail||'Data BKU berhasil dibaca dan divalidasi.';
  $('mrLoadingProgress').style.width='100%';
  $('mrLoadingAvatar').innerHTML='<div class="mr-face">👍</div>';
  return new Promise(resolve=>setTimeout(()=>{ov.classList.remove('show');ov.setAttribute('aria-hidden','true');resolve();},1300));
}
function mrLoadingError(detail){
  const ov=$('mrLoadingOverlay');
  if(!ov)return;
  ov.classList.remove('success');ov.classList.add('show','error');ov.setAttribute('aria-hidden','false');
  $('mrLoadingText').textContent='MR. LOADING GAGAL MEMBACA DATA';
  $('mrLoadingDetail').textContent=detail||'Pembacaan berhenti. Periksa file dan coba lagi.';
  $('mrLoadingProgress').style.width='100%';
  $('mrLoadingAvatar').innerHTML='<div class="mr-face">❌</div>';
  setTimeout(()=>{ov.classList.remove('show');ov.setAttribute('aria-hidden','true');},2200);
}

async function extractBkuData(){
  if(!state.file)return;
  const isPdf=state.file.name.toLowerCase().endsWith('.pdf');
  $('readBtn').disabled=true;$('exportBtn').disabled=true;
  $('status').textContent='MR. LOADING: menyiapkan mesin pembacaan…';
  mrLoading('MR. LOADING SEDANG MEMBACA BKU', isPdf?'Membuka PDF dan menyiapkan halaman untuk dibaca satu per satu.':'Membuka file dan menyiapkan lembar data untuk dibaca.',8);
  state.rows=[];state.rawRows=[];state.result=null;state.surat.rowIndex=-1;state.surat.bukti='';render();syncSurat();
  try{
    await new Promise(r=>setTimeout(r,120));
    mrLoading('MR. LOADING MEMBACA STRUKTUR DOKUMEN', isPdf?'Mendeteksi kolom tanggal, uraian, bukti, penerimaan, pengeluaran, dan saldo.':'Mendeteksi kolom tanggal, uraian, bukti, dan pengeluaran.',18);
    const rawResult=isPdf?await readPdfWithProgress(state.file,(page,total)=>{
      const pct=22+Math.round((page/Math.max(total,1))*62);
      mrLoading(`MR. LOADING MEMBACA HALAMAN ${page}/${total}`,`Menganalisis teks dan posisi kolom halaman ${page}.`,pct);
      $('status').textContent=`Membaca BKU: halaman ${page} dari ${total}…`;
    }):await readExcel(state.file);
    const evidenceText=[rawResult?.identity?.rawAddress, ...(rawResult?.identity?Object.values(rawResult.identity):[]), rawResult?.locationEvidence||''].map(v=>String(v||'')).join(' | ');
    rawResult.identity=validateBkuKecamatan(finalizeBkuIdentity(rawResult.identity||{}), evidenceText);
    if(rawResult.identity.locationWarning){
      rawResult.warnings=rawResult.warnings||[];
      rawResult.warnings.unshift('⚠ '+rawResult.identity.locationWarning);
    }
    const rawRows=rawResult.rows||[];
    rawResult.rawRowCount=rawRows.length;
    rawResult.groupedRowCount=groupRowsByBukti(rawRows).length;
    state.rawRows=rawRows.map(r=>({...r}));
    state.rows=groupRowsByBukti(rawRows);
    state.result=rawResult;
    applyIdentityToSurat(rawResult.identity||{});
    state.result.identity=state.identity;
    state.result.groupedByBukti=true;
    syncSurat();
    render();
    if(!state.rows.length)throw new Error('Dokumen terbaca, tetapi tidak ditemukan transaksi pengeluaran yang bisa diproses.');
    const v=state.result.validation;
    if(v?.ok)$('status').textContent=`Ekstraksi BKU selesai. ${state.rows.length} transaksi pengeluaran valid. Total ${formatMoney(v.actualIncluded ?? v.rawExpenseTotal ?? 0)}.`;
    else $('status').textContent=`Ekstraksi BKU selesai. ${state.rows.length} transaksi pengeluaran berhasil dipetakan.`;
    if(v && typeof v==='object' && v.rawExpenseTotal!==undefined && v.declaredTotal!==undefined && v.rawExpenseTotal===v.declaredTotal){
      state.result.warnings.unshift(`Validasi PDF OK: total Pengeluaran tercetak ${formatMoney(v.declaredTotal)} = total seluruh baris transaksi. Tarik Tunai ${formatMoney(v.internalTransferTotal)} dikeluarkan sebagai pemindahan dana internal; total biaya kegiatan ${formatMoney(v.actualIncluded)}.`);
    }
    syncSurat();
    enableSuratSection();
    ns.scheduleProjectAutoSave?.();
    const identityReady=!!(state.identity.school&&state.identity.headName&&state.identity.headNip&&state.identity.treasurerName&&state.identity.treasurerNip);
    await mrLoadingSuccess(`${state.rows.length} transaksi terbaca${identityReady?' • identitas sekolah, Kepala Sekolah, dan Bendahara ikut terbaca otomatis.':'.'}`);
  }catch(e){
    $('status').textContent='Gagal membaca BKU: '+(e?.message||e);
    $('warnings').innerHTML='<div class="danger">'+esc(e?.message||'Pastikan file PDF/Excel valid.')+'</div>';
    disableSuratSection();
    mrLoadingError(e?.message||'Pastikan file PDF/Excel valid.');
  }finally{$('readBtn').disabled=!state.file;render();}
}

/* Satu-satunya pembaca PDF ada di bku-parser.js (readPdf). Fungsi ini hanya meneruskan progress,
   agar perbaikan parser tidak perlu dilakukan di dua tempat dan hasilnya selalu konsisten. */
function readPdfWithProgress(file,onProgress){return readPdf(file,onProgress);}

Object.assign(ns,{renderRawRows,renderTaxes,render,mrLoading,mrLoadingSuccess,mrLoadingError,extractBkuData,readPdfWithProgress});
})(window.SPMU=window.SPMU||{});
