(function(ns){
'use strict';
const {$,state,SURAT_FIELD_KEYS,suratElement,esc,clean,formatMoney,normalizeNoBukti,normalizeKecamatan,dateToInput,dateDisplay,setSuratTabLocked,setPajakTabLocked}=ns;

function suratRow(){
  const el=$('suratBukti');
  const idx=Number(el?.value);
  if(Number.isInteger(idx) && idx>=0 && idx<state.rows.length)return state.rows[idx];
  return null;
}
function enableSuratSection(){
  const ready=Boolean(state.result && state.rows.length>0);
  $('suratBukti').disabled=!ready;
  $('suratPreviewBtn').disabled=!ready;
  $('suratPrintBtn').disabled=!ready;
  updateSuratNextInfo();
  setSuratTabLocked(!ready);
  if(!ready)$('suratBukti').innerHTML='<option value="">Tidak ada transaksi BKU yang dapat dibuatkan surat</option>';
  setPajakTabLocked(!ready);
}
function disableSuratSection(){
  $('suratBukti').disabled=true;$('suratPreviewBtn').disabled=true;$('suratPrintBtn').disabled=true;$('suratPrevBtn').disabled=true;$('suratNextBtn').disabled=true;
  $('suratBukti').innerHTML='<option value="">Baca data BKU terlebih dahulu</option>';
  $('suratPreview').style.display='none';
  try{ns.suratViewerUpdate();}catch(_){}
  setSuratTabLocked(true); setPajakTabLocked(true);
}
function rawRowsForSurat(){
  const r=suratRow(); if(!r)return [];
  const key=normalizeNoBukti(r.noBukti||'');
  const matches=(state.rawRows||[]).filter(x=>key?normalizeNoBukti(x.noBukti||'')===key:(x.tanggal===r.tanggal&&clean(x.uraian)===clean(r.uraian)));
  return matches.length?matches:[r];
}
function suratUraianText(){return rawRowsForSurat().map(x=>clean(x.uraian)).filter(Boolean).join('; ');}
function moneyWords(n){n=Math.round(Number(n)||0);if(!n)return 'nol rupiah';const a=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];function w(x){if(x<12)return a[x];if(x<20)return w(x-10)+' belas';if(x<100)return w(Math.floor(x/10))+' puluh'+(x%10?' '+w(x%10):'');if(x<200)return 'seratus'+(x%100?' '+w(x%100):'');if(x<1000)return w(Math.floor(x/100))+' ratus'+(x%100?' '+w(x%100):'');if(x<2000)return 'seribu'+(x%1000?' '+w(x%1000):'');if(x<1000000)return w(Math.floor(x/1000))+' ribu'+(x%1000?' '+w(x%1000):'');if(x<1000000000)return w(Math.floor(x/1000000))+' juta'+(x%1000000?' '+w(x%1000000):'');return String(n);}return w(n)+' rupiah';}
function roman(m){return ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][m-1]||'';}
function suratData(){const r=suratRow();const d=state.surat;const raw=rawRowsForSurat();return {...d,bukti:r?.noBukti||d.bukti,tanggal:r?.tanggal||d.tanggal,uraian:raw.map(x=>clean(x.uraian)).filter(Boolean).join('; '),rawItems:raw,nominal:r?.pengeluaran||0,kepada:d.kepada||'',untukPembayaran:d.untukPembayaran||''};}
function syncSurat(){
  const ready=Boolean(state.result && state.rows.length>0);
  const opts=ready?['<option value="">Pilih transaksi hasil ekstraksi BKU</option>',...state.rows.map((r,i)=>`<option value="${i}">${esc(r.noBukti||'Tanpa No. Bukti')} — ${esc(r.tanggal)} — ${esc(r.uraian.slice(0,100))}${r._count>1?` (${r._count} baris digabung)`:''}</option>` )]:['<option value="">Baca data BKU terlebih dahulu</option>'];
  $('suratBukti').innerHTML=opts.join('');
  $('suratBukti').disabled=!ready;
  if(ready && state.surat.rowIndex>=0 && state.surat.rowIndex<state.rows.length){
    $('suratBukti').value=String(state.surat.rowIndex);
  } else if(ready && state.surat.bukti){
    const idx=state.rows.findIndex(r=>normalizeNoBukti(r.noBukti)===normalizeNoBukti(state.surat.bukti));
    if(idx>=0){state.surat.rowIndex=idx;$('suratBukti').value=String(idx);}
  }
  $('suratPreviewBtn').disabled=!ready;
  $('suratPrintBtn').disabled=!ready;
  updateSuratNextInfo();
  setSuratTabLocked(!ready);
}
function readSuratFields(){
  for(const k of SURAT_FIELD_KEYS){
    const el=suratElement(k);
    if(!el)continue;
    // No. Bukti adalah SELECT berbasis index transaksi, bukan nilai No. Bukti.
    // Jangan menimpa rowIndex/state.bukti dengan value option saat render.
    if(k==='bukti'){
      const idx=Number(el.value);
      if(Number.isInteger(idx)&&idx>=0&&idx<state.rows.length){
        state.surat.rowIndex=idx;
        state.surat.bukti=state.rows[idx].noBukti||'';
      }
      continue;
    }
    state.surat[k]=el.value;
  }
}
function updateSuratNextInfo(){
  const info=$('suratNextInfo');
  if(!info)return;
  const total=state.rows.length;
  const currentIndex=Number.isInteger(state.surat.rowIndex)?state.surat.rowIndex:-1;
  if(!total){
    info.innerHTML='Pilih transaksi BKU untuk mengaktifkan perpindahan surat otomatis.';
    return;
  }
  if(currentIndex<0 || currentIndex>=total){
    info.innerHTML=`${total} transaksi tersedia. Pilih transaksi pertama untuk memulai.`;
    $('suratPrevBtn').disabled=true;
    $('suratNextBtn').disabled=true;
    return;
  }
  const atFirst=currentIndex===0;
  const atLast=currentIndex===total-1;
  const prev=atFirst?null:state.rows[currentIndex-1];
  const next=atLast?null:state.rows[currentIndex+1];
  info.innerHTML=`Surat <b>${currentIndex+1}</b> dari <b>${total}</b> • ${atFirst?'Sudah di awal.':'Sebelumnya: <b>'+esc(prev.noBukti||'Tanpa No. Bukti')+'</b>'} • ${atLast?'Sudah di akhir.':'Berikutnya: <b>'+esc(next.noBukti||'Tanpa No. Bukti')+'</b>'}`;
  const ready=Boolean(state.result&&total>1);
  $('suratPrevBtn').disabled=!ready || atFirst;
  $('suratNextBtn').disabled=!ready || atLast;
}
function nextSurat(){
  const total=state.rows.length;
  if(total<2)return;
  readSuratFields();
  const currentIndex=Number.isInteger(state.surat.rowIndex)?state.surat.rowIndex:-1;
  if(currentIndex<0){
    const el=suratElement('bukti');
    if(el)el.value='0';
    fillSurat();
    return;
  }
  if(currentIndex>=total-1){
    updateSuratNextInfo();
    return;
  }
  const nextIndex=currentIndex+1;
  const buktiEl=suratElement('bukti');
  if(buktiEl)buktiEl.value=String(nextIndex);
  fillSurat();
}
function prevSurat(){
  const total=state.rows.length;
  if(total<2)return;
  readSuratFields();
  const currentIndex=Number.isInteger(state.surat.rowIndex)?state.surat.rowIndex:-1;
  if(currentIndex<=0){
    updateSuratNextInfo();
    return;
  }
  const prevIndex=currentIndex-1;
  const buktiEl=suratElement('bukti');
  if(buktiEl)buktiEl.value=String(prevIndex);
  fillSurat();
}
function fillSurat(){
  const el=suratElement('bukti');
  const idx=Number(el?.value);
  const r=(Number.isInteger(idx)&&idx>=0&&idx<state.rows.length)?state.rows[idx]:null;
  if(!r)return;
  state.surat.rowIndex=idx;
  state.surat.bukti=r.noBukti||'';
  state.surat.tanggal=dateToInput(r.tanggal);
  state.surat.uraian=suratUraianText();
  const buktiEl=suratElement('bukti'), tanggalEl=suratElement('tanggal'), uraianEl=suratElement('uraian');
  if(buktiEl)buktiEl.value=String(idx);
  if(tanggalEl)tanggalEl.value=state.surat.tanggal;
  if(uraianEl)uraianEl.value=state.surat.uraian;
  renderSurat();
  updateSuratNextInfo();
}

function normalizeSchoolName(v){return clean(v).toLocaleUpperCase('id-ID');}
function addressWithKecamatan(address,kecamatan){
  let a=clean(address);
  const k=normalizeKecamatan(kecamatan);
  if(!a)return '';
  if(/kecamatan\s+[^,;]+?(?=\s+kabupaten|\s+kab\.|$)/i.test(a)){
    a=a.replace(/kecamatan\s+[^,;]+?(?=\s+kabupaten|\s+kab\.|$)/i,`Kecamatan ${k}`);
  }else if(k && !new RegExp(`\\bkecamatan\\s+${k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(a)){
    a += ` Kecamatan ${k}`;
  }
  return a;
}
function splitUraianItems(text){
  const src=clean(text||'');
  if(!src)return [];
  const base=src.split(/\s*;\s*/).map(x=>clean(x)).filter(Boolean);
  const out=[];
  for(const part of (base.length?base:[src])){
    // Uraian yang sangat panjang dipecah pada batas kata agar tidak pernah
    // hilang ketika satu item saja lebih tinggi dari ruang halaman.
    const words=part.split(/\s+/).filter(Boolean);
    let chunk='';
    for(const word of words){
      const test=chunk?`${chunk} ${word}`:word;
      if(test.length>420 && chunk){
        out.push(chunk);
        chunk=word;
      }else{
        chunk=test;
      }
    }
    if(chunk)out.push(chunk);
  }
  return out;
}
function renderUraianHtml(text){
  const items=splitUraianItems(text);
  if(!items.length)return '<span class="muted-dash">—</span>';
  return '<div class="uraian-list">'+items.map((item,i)=>`<div class="uraian-item"><span class="uraian-no">${i+1}.</span><span class="uraian-text">${esc(item)}</span></div>`).join('')+'</div>';
}

function suratBlock(html, cls=''){
  return `<div class="page-block ${cls}">${html}</div>`;
}
function buildSuratBlocks(d, num, dateText, tandaTangan, logoSekolah, logoKabupaten){
  const blocks=[];
  const kabSrc=logoKabupaten||'assets/logo_kabupaten_serang.png';
  const schoolLogo=clean(logoSekolah)?`<img class="kop-logo kop-logo-sekolah" src="${esc(logoSekolah)}" alt="Logo Sekolah">`:'';
  blocks.push(suratBlock(`<div class="kop"><img class="kop-logo kop-logo-kabupaten" src="${esc(kabSrc)}" alt="Logo Kabupaten Serang">${schoolLogo}<div class="prov">PEMERINTAH KABUPATEN SERANG</div><div class="school">${esc([d.sd,d.kecamatan].filter(Boolean).join(' ').replace(/\s+/g,' ').toLocaleUpperCase('id-ID')||'SD NEGERI KRIAN LEBAK WANGI')}</div><div class="kab">KABUPATEN SERANG</div><div class="addr">Alamat : ${esc(d.alamat||'')}</div><div class="mail">E-Mail : ${esc(d.email||'')} &nbsp;&nbsp; NPSN: ${esc(d.npsn||'')} &nbsp;&nbsp; NSS: ${esc(d.nss||'')}</div></div>`,'kop-block'));
  blocks.push(suratBlock(`<h2>SURAT PERINTAH MENGELUARKAN UANG</h2><div class="nomor">Nomor : ${esc(num)}</div>`,'title-block'));
  blocks.push(suratBlock(`<p>Kepala ${esc(d.sd||'SDN KRIAN')} Kecamatan ${esc(d.kecamatan||'Lebak Wangi')} Kabupaten Serang memerintahkan kepada:</p>`,'intro-block'));
  blocks.push(suratBlock(`<div class="identity"><div class="line"><b>Nama</b><span class="colon">:</span><span>${esc(d.bendahara)}</span></div><div class="line"><b>NIP</b><span class="colon">:</span><span>${esc(d.nipBendahara)}</span></div><div class="line"><b>Jabatan</b><span class="colon">:</span><span>Bendahara BOSP ${esc(d.sd||'SDN KRIAN')}</span></div></div>`,'identity-block'));
  blocks.push(suratBlock(`<p class="payment-heading"><b>Untuk mengeluarkan uang :</b></p>`,'payment-title-block'));
  blocks.push(suratBlock(`<div class="payment"><div class="row"><b>Harap dibayar kepada</b><span class="colon">:</span><span>${esc(d.kepada||'........................................................')}</span></div></div>`,'payment-row-block'));
  blocks.push(suratBlock(`<div class="payment"><div class="row"><b>Uang Sebesar</b><span class="colon">:</span><span class="amount">Rp&nbsp;${formatMoney(d.nominal)}</span></div></div>`,'payment-row-block'));
  blocks.push(suratBlock(`<div class="payment"><div class="row"><b>Terbilang</b><span class="colon">:</span><span class="terbilang">${esc(moneyWords(d.nominal))}</span></div></div>`,'payment-row-block'));
  blocks.push(suratBlock(`<div class="payment"><div class="row"><b>Untuk Pembayaran</b><span class="colon">:</span><span class="manual-text">${esc(d.untukPembayaran||'........................................................')}</span></div></div>`,'payment-row-block'));
  blocks.push(suratBlock(`<div class="payment"><div class="row uraian-label-row"><b>Uraian</b><span class="colon">:</span><div></div></div></div>`,'uraian-heading-block'));
  const rawItems=(d.rawItems||[]).filter(x=>clean(x.uraian));
  if(rawItems.length){
    const rowsHtml=rawItems.map((item,i)=>`<tr><td>${i+1}</td><td>${esc(item.uraian)}</td><td>${formatMoney(item.pengeluaran)}</td></tr>`).join('');
    const total=rawItems.reduce((s,x)=>s+(Number(x.pengeluaran)||0),0);
    blocks.push(suratBlock(`<div class="surat-uraian-table-wrap"><table class="surat-uraian-table"><thead><tr><th>NO</th><th>NAMA BARANG / KEGIATAN</th><th>HARGA</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr><td colspan="2">TOTAL</td><td>${formatMoney(total)}</td></tr></tfoot></table></div>`,'uraian-table-block'));
  }else{
    blocks.push(suratBlock(`<div class="surat-uraian-table-wrap"><table class="surat-uraian-table"><thead><tr><th>NO</th><th>NAMA BARANG / KEGIATAN</th><th>HARGA</th></tr></thead><tbody><tr><td>1</td><td>—</td><td>0</td></tr></tbody></table></div>`,'uraian-table-block'));
  }
  blocks.push(suratBlock(`<div class="sign"><div>${esc(d.kecamatan||'................................')}, ${esc(dateText||'................................')}</div><div>Kepala Sekolah</div><img src="${esc(tandaTangan)}" alt="Tanda tangan Kepala Sekolah"><div class="name">${esc(d.kepala)}</div><div>NIP: ${esc(d.nipKepala)}</div></div>`,'sign-block'));
  return blocks;
}

function createSuratPage(){
  const page=document.createElement('div');
  page.className='surat-page';
  page.innerHTML='<div class="surat-page-content"></div><div class="surat-page-footer"></div>';
  return page;
}

function paginateSurat(blocks){
  const host=document.createElement('div');
  host.className='surat-pages';

  // Pengukuran dilakukan memakai DOM asli browser agar pagination mengikuti
  // font, ukuran layar, dan wrapping yang benar-benar dipakai saat cetak.
  host.style.position='absolute';
  host.style.left='-100000px';
  host.style.top='0';
  host.style.width='210mm';
  host.style.visibility='hidden';
  document.body.appendChild(host);

  let page=createSuratPage();
  host.appendChild(page);
  let content=page.querySelector('.surat-page-content');

  const isOverflow=()=>content.scrollHeight>content.clientHeight+1;

  function newPage(){
    page=createSuratPage();
    host.appendChild(page);
    content=page.querySelector('.surat-page-content');
  }

  // Tabel Uraian sengaja dipaginasi PER BARIS. Sebelumnya tabel diperlakukan
  // sebagai satu blok utuh sehingga saat seluruh tabel tidak muat di halaman 1,
  // browser memindahkannya seluruhnya ke halaman 2.
  function appendUraianTablePaginated(block){
    const sourceTable=block.querySelector('.surat-uraian-table');
    if(!sourceTable){
      content.appendChild(block);
      if(isOverflow() && content.children.length>1){
        content.removeChild(block);
        newPage();
        content.appendChild(block);
      }
      return;
    }

    const sourceHead=sourceTable.querySelector('thead');
    const sourceBodyRows=[...sourceTable.querySelectorAll('tbody > tr')];
    const sourceFoot=sourceTable.querySelector('tfoot');
    if(!sourceBodyRows.length){
      content.appendChild(block);
      if(isOverflow() && content.children.length>1){
        content.removeChild(block);
        newPage();
        content.appendChild(block);
      }
      return;
    }

    let tableBlock=null;
    let table=null;
    let tbody=null;

    const startChunk=()=>{
      tableBlock=block.cloneNode(true);
      table=tableBlock.querySelector('.surat-uraian-table');
      tbody=table.querySelector('tbody');
      tbody.innerHTML='';
      const oldFoot=table.querySelector('tfoot');
      if(oldFoot)oldFoot.remove();
      content.appendChild(tableBlock);

      // Pastikan header tabel sendiri tidak memaksa seluruh tabel ke halaman berikutnya.
      if(isOverflow() && content.children.length>1){
        content.removeChild(tableBlock);
        newPage();
        tableBlock=block.cloneNode(true);
        table=tableBlock.querySelector('.surat-uraian-table');
        tbody=table.querySelector('tbody');
        tbody.innerHTML='';
        const foot=table.querySelector('tfoot');
        if(foot)foot.remove();
        content.appendChild(tableBlock);
      }
    };

    const moveChunkToNextPage=()=>{
      // Chunk yang sudah penuh harus tetap tinggal di halaman sebelumnya.
      // Hanya baris berikutnya yang dimulai pada halaman baru.
      newPage();
      startChunk();
    };

    startChunk();

    for(const row of sourceBodyRows){
      const candidate=row.cloneNode(true);
      tbody.appendChild(candidate);

      if(isOverflow()){
        tbody.removeChild(candidate);
        if(tbody.children.length>0){
          moveChunkToNextPage();
          tbody.appendChild(candidate);
        }else{
          // Tidak ada baris di chunk saat ini: pindahkan chunk ke halaman baru,
          // sehingga halaman sebelumnya tidak dipaksa menerima seluruh tabel.
          if(content.children.length>1){
            if(tableBlock.parentNode===content)content.removeChild(tableBlock);
            newPage();
            startChunk();
          }
          tbody.appendChild(candidate);
        }
      }
    }

    // TOTAL hanya ditambahkan pada chunk terakhir. Jika tidak muat,
    // pindahkan baris terakhir + TOTAL ke halaman berikutnya.
    if(sourceFoot){
      const totalCandidate=sourceFoot.cloneNode(true);
      table.appendChild(totalCandidate);

      if(isOverflow()){
        table.removeChild(totalCandidate);
        const rows=[...tbody.children];
        const lastRow=rows.pop();
        if(lastRow)tbody.removeChild(lastRow);

        if(tbody.children.length===0 && tableBlock.parentNode===content){
          content.removeChild(tableBlock);
        }

        newPage();
        startChunk();
        if(lastRow)tbody.appendChild(lastRow);
        table.appendChild(totalCandidate);
      }
    }
  }

  for(const blockHtml of blocks){
    const holder=document.createElement('div');
    holder.innerHTML=blockHtml;
    const block=holder.firstElementChild;

    if(block && block.classList.contains('uraian-table-block')){
      appendUraianTablePaginated(block);
      continue;
    }

    content.appendChild(block);

    if(isOverflow() && content.children.length>1){
      content.removeChild(block);
      newPage();
      content.appendChild(block);
    }
  }

  // Tanda tangan tidak boleh tertinggal/terpotong. Jika tidak cukup ruang,
  // pindahkan seluruh blok tanda tangan ke halaman berikutnya.
  const lastPage=host.querySelector('.surat-page:last-child');
  if(lastPage){
    const c=lastPage.querySelector('.surat-page-content');
    const sign=lastPage.querySelector('.sign-block');
    if(sign && c.scrollHeight>c.clientHeight+1){
      sign.remove();
      const np=createSuratPage();
      host.appendChild(np);
      np.querySelector('.surat-page-content').appendChild(sign);
    }
  }

  const finalPages=[...host.querySelectorAll('.surat-page')];
  finalPages.forEach((p,i)=>{
    p.querySelector('.surat-page-footer').textContent=`Halaman ${i+1} dari ${finalPages.length}`;
  });

  host.style.position='';
  host.style.left='';
  host.style.top='';
  host.style.width='';
  host.style.visibility='';
  return host;
}

function renderSurat(){
  if(!state.rows.length){$('suratPreview').style.display='none';ns.suratViewerUpdate();return;}
  readSuratFields();
  const d=suratData();
  d.sd=normalizeSchoolName(d.sd);
  d.kecamatan=normalizeKecamatan(d.kecamatan);
  d.alamat=clean(d.alamat);
  const dt=dateToInput(d.tanggal).split('-');
  const dateText=dt.length===3?`${dt[2]}-${dt[1]}-${dt[0]}`:dateDisplay(d.tanggal);
  const nomorUrut=clean(d.nomor||'').replace(/^400\.3\.5\s*\/\s*/i,'').replace(/\s+/g,'');
  const jenisBukti=clean(d.bukti||'BPU').toLocaleUpperCase('id-ID');
  const bulan=dt.length===3?roman(Number(dt[1])):'I';
  const tahun=dt.length===3?dt[0]:'2026';
  const num=`400.3.5/${nomorUrut||'001'}/${jenisBukti}/${bulan}/${tahun}`;
  const tandaTangan=state.surat.tandaTangan||'assets/s_perintah_img_2.png';
  const logoSekolah=state.surat.logoSekolah||'';
  const logoKabupaten=state.surat.logoKabupaten||'assets/logo_kabupaten_serang.png';

  const blocks=buildSuratBlocks(d,num,dateText,tandaTangan,logoSekolah,logoKabupaten);
  const pages=paginateSurat(blocks);
  {
    const noBku=clean(d.bukti||'')||'-';
    const allPages=[...pages.querySelectorAll('.surat-page')];
    allPages.forEach((pg,i)=>{
      // Footer sengaja hanya memuat nomor halaman. Identitas BKU tidak diulang di footer.
      pg.querySelector('.surat-page-footer').innerHTML=`<span class="sf-page">Halaman ${i+1} dari ${allPages.length}</span>`;
    });
    // Kotak BNU/BPU hanya boleh muncul dan tercetak pada halaman pertama.
    const firstPage=allPages[0];
    if(firstPage){
      const box=document.createElement('div');
      box.className='surat-bku-box';
      box.textContent=noBku;
      firstPage.appendChild(box);
    }
  }

  $('suratPreview').innerHTML='';
  $('suratPreview').appendChild(pages);
  $('suratPreview').style.display='block';
  ns.suratViewerUpdate();
}

Object.assign(ns,{
  dateToInput,dateDisplay,suratRow,enableSuratSection,disableSuratSection,rawRowsForSurat,suratUraianText,moneyWords,roman,suratData,syncSurat,readSuratFields,updateSuratNextInfo,nextSurat,prevSurat,fillSurat,
  normalizeSchoolName,addressWithKecamatan,splitUraianItems,renderUraianHtml,suratBlock,buildSuratBlocks,createSuratPage,paginateSurat,renderSurat
});
})(window.SPMU=window.SPMU||{});
