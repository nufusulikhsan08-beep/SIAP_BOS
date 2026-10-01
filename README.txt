APLIKASI PENGELOLAAN BKU, SURAT PERINTAH & HITUNG PAJAK
Versi: v17 — DUAL EKSTRAKSI + URAIAN HARGA PER ITEM + HITUNG PAJAK + DUAL LOGO KOP SURAT

ALUR APLIKASI
1. TAB "EKSTRAKSI BKU" adalah tab awal.
2. Pilih PDF/XLS/XLSX lalu tekan BACA DATA. MR. LOADING akan tampil selama proses pembacaan.
3. Data BKU dibaca halaman demi halaman, divalidasi, dan ditampilkan di tabel. Progress pembacaan ditampilkan oleh MR. LOADING.
4. TAB "SURAT PERINTAH" tetap TERKUNCI selama BKU belum berhasil diekstrak.
5. Setelah tersedia transaksi BKU hasil ekstraksi, TAB "SURAT PERINTAH" otomatis terbuka.
6. Pilih transaksi BPU/BNU lalu isi/ubah data surat.
7. Nama SD, Kecamatan, alamat, email, NPSN, NSS, bendahara, kepala sekolah, dan data surat lainnya dirender ulang secara langsung ketika diubah.
8. Setelah berhasil, MR. LOADING menampilkan ikon 👍 dan konfirmasi bahwa data BKU berhasil dibaca. Cetak/Simpan PDF menggunakan format A4 portrait 210 x 297 mm.

PERBAIKAN VERSI INI
- Segmen EKSTRAKSI BKU dan SURAT PERINTAH dipisahkan menggunakan TAB.
- TAB SURAT PERINTAH disabled/terkunci sebelum ekstraksi BKU berhasil menghasilkan transaksi.
- Reset, memilih file baru, atau kegagalan ekstraksi akan mengunci kembali TAB SURAT PERINTAH.
- Nama SD diperbaiki agar selalu mengambil nilai terbaru dari input dan dipakai konsisten pada kop, nomor surat, isi, jabatan bendahara, dan tanda tangan.
- Seluruh field surat dibuat reaktif terhadap perubahan input, bukan hanya Nama SD.
- Ditambahkan INPUT KECAMATAN.
- Kecamatan dipakai pada kalimat surat: "Kepala [Nama SD] Kecamatan [Kecamatan] Kabupaten Serang ...".
- Pemilihan transaksi hanya mengubah field yang berasal dari BKU (No. Bukti, tanggal, dan uraian pembayaran), sehingga perubahan data identitas sekolah tidak tertimpa saat transaksi diganti.
- Format surat tetap A4 portrait 210 x 297 mm.

UKURAN FONT SURAT
- Isi dokumen: Times New Roman 12 pt
- PEMERINTAH KABUPATEN SERANG: 14 pt
- NAMA SD: 16 pt
- KABUPATEN SERANG: 14 pt
- Alamat, E-Mail, NPSN, NSS: 10 pt

CATATAN CETAK PDF
- Pilih Paper Size: A4.
- Gunakan Scale: 100% / Actual Size jika browser menampilkan opsi tersebut.
- Margin browser diatur oleh CSS @page menjadi 0; layout surat sendiri memiliki margin fisik internal dalam mm.

PEMBARUAN MODUL SURAT PERINTAH (versi modifikasi)
- Nama sekolah, kecamatan, alamat, NPSN, nama kepala sekolah + NIP, serta nama bendahara + NIP sekarang dibaca otomatis dari PDF BKU.
- Field identitas utama tetap otomatis dari BKU; khusus Alamat Sekolah sekarang dapat diedit pengguna sebelum cetak.
- Parser membaca identitas sekolah dari header BKU dan membaca pasangan tanda tangan Kepala Sekolah/Bendahara berdasarkan posisi kolom kiri/kanan pada halaman penutup BKU.
- Alamat dinormalisasi agar tidak mengambil teks rusak/duplikat seperti "Kecamatan ebak Wa, Kec. Lebak Wangi"; hasil dibentuk dari alamat BKU + kabupaten + provinsi.
- Cetak/Simpan PDF Surat Perintah dipindahkan ke jendela cetak khusus dengan @page A4 portrait (210 x 297 mm) dan ukuran kertas CSS yang sama, sehingga tidak ikut terpengaruh layout aplikasi utama.
- Gambar kop dan tanda tangan diubah ke URL absolut saat jendela cetak dibuat agar tetap muncul pada PDF.
- Email dan NSS tetap menjadi input manual karena data tersebut tidak tersedia pada BKU sumber yang dipakai untuk uji.

PEMBARUAN PEMBACAAN v12
- Diperbaiki error pada pembacaan PDF yang menghentikan proses karena objek identitas belum diinisialisasi.
- Pembacaan PDF sekarang menggunakan fungsi yang melaporkan progress per halaman.
- MR. LOADING menjadi indikator wajib selama BACA DATA: membaca struktur, membaca halaman, validasi, lalu sukses.
- Saat sukses, MR. LOADING menampilkan ikon jempol 👍 dan pesan "MR. LOADING BERHASIL MEMBACA DATA BKU".
- Saat gagal, MR. LOADING menampilkan indikator ❌ dan pesan kesalahan sebelum menutup overlay.
- Pembacaan identitas tanda tangan Kepala Sekolah dan Bendahara tetap memakai posisi kolom kiri/kanan pada halaman penutup.
- Uji pasangan identitas BKU contoh menghasilkan: MAJIJET, S.Pd / NIP 197703072008012006 sebagai Kepala Sekolah; NANI KURNIASIH, S.Pd / NIP 198710082022212023 sebagai Bendahara.


PERUBAHAN v13:
- Uraian Surat Perintah mengambil teks transaksi dari BKU secara otomatis.
- Untuk Pembayaran menjadi input manual dan tidak mengambil alih isi uraian BKU.
- Tampilan uraian/pembayaran dirapikan agar teks panjang membungkus dengan baik saat preview dan PDF A4.

UPDATE v14
- Urutan pada Surat Perintah: UNTUK PEMBAYARAN ditampilkan sebelum URAIAN.
- UNTUK PEMBAYARAN tetap 100% INPUT MANUAL.
- URAIAN tetap otomatis dari BKU.
- URAIAN pada surat dicetak sebagai daftar bernomor 1, 2, 3, ... ke bawah agar rapi dan mudah diperiksa.
- Item URAIAN dipisahkan berdasarkan tanda titik koma (;) dari BKU, kemudian dibungkus otomatis mengikuti lebar kolom A4.


UPDATE v15
- VERSI 1 tetap mempertahankan perilaku lama: transaksi dengan No. Bukti BPU/BNU yang sama digabung untuk tampilan, ekspor utama, dan pemilihan Surat Perintah.
- VERSI 2 ditambahkan sebagai DATA MURNI: seluruh baris hasil pembacaan sebelum proses penggabungan disimpan dan ditampilkan apa adanya, sehingga BPU/BNU yang sama tidak digabung.
- Ditambahkan EXPORT DATA MURNI ke file BKU_DATA_MURNI_TANPA_GABUNG.xlsx.
- Surat Perintah sekarang menggunakan DATA MURNI untuk bagian URAIAN, sehingga setiap baris murni ditampilkan dalam tabel:
  | NO | NAMA BARANG / KEGIATAN | HARGA |
  Harga diambil langsung dari nominal Pengeluaran pada baris murni dan tidak ditebak/dibagi secara artifisial.
- Nilai UANG SEBESAR pada Surat Perintah tetap menggunakan total transaksi Versi 1, sehingga fungsi lama tidak diubah.
- Ditambahkan TAB "HITUNG PAJAK". Tab ini hanya menampilkan transaksi yang teridentifikasi sebagai PPh/PPN/Pajak.
- Pajak dipisahkan menjadi SIPLah dan Non SIPLah berdasarkan keterangan transaksi yang memuat kata "SIPLah".
- Ditampilkan daftar pajak, jumlah transaksi pajak, total Pajak SIPLah, total Pajak Non SIPLah, dan total seluruh pajak.
- Tidak ada tarif pajak yang diasumsikan; nominal pajak mengikuti angka Pengeluaran yang benar-benar diekstrak dari BKU.
- Semua fitur lama tetap dipertahankan.


UPDATE v16 — LOGO KOP SURAT
- Ditambahkan upload Logo Sekolah pada modul Surat Perintah.
- Logo Sekolah wajib berupa PNG valid dan ditempatkan otomatis di sisi kanan kop surat.
- Logo Kabupaten Serang ditempatkan otomatis di sisi kiri kop surat.
- Logo Kabupaten Serang bawaan aplikasi disimpan dalam format PNG (assets/logo_kabupaten_serang.png).
- Preview dan Cetak/Simpan PDF memakai tata letak dua logo yang sama.
- Validasi logo sekolah memeriksa signature file PNG (89504E47 0D0A1A0A), sehingga file hanya berganti nama menjadi .png tidak akan diterima.


UPDATE v17 — VALIDASI KECAMATAN + UI RINGKAS + PAGINASI TABEL URAIAN
- BKU yang diterima aplikasi dibatasi hanya untuk Kecamatan Lebak Wangi. Jika kecamatan tidak terbaca atau berbeda, ekstraksi ditolak dan Tab Surat Perintah/Hitung Pajak tetap terkunci.
- Data hasil ekstraksi pada Tab Ekstraksi BKU ditampilkan di kontainer bergulir dengan tinggi maksimum agar jumlah transaksi besar tidak membuat halaman aplikasi memanjang.
- Tabel Uraian Surat Perintah dipaginasi per baris berdasarkan ruang A4 yang tersedia. Jika halaman pertama masih menyisakan ruang, sebagian baris tetap berada di halaman pertama; halaman berikutnya melanjutkan baris sisanya dengan header tabel diulang.
- Alamat Sekolah pada Tab Surat Perintah tetap diisi otomatis dari BKU, tetapi dapat disesuaikan pengguna sebelum preview/cetak.
- Judul aplikasi diperjelas menjadi "APLIKASI PENGELOLAAN BKU, SURAT PERINTAH & HITUNG PAJAK".


UPDATE v19 — HOTFIX ERROR pdfColumns + MODULARISASI
- Kotak nomor BNU/BPU pada Surat Perintah diperkecil menjadi 22 mm x 6 mm, diposisikan lebih ke kanan, dan hanya dibuat pada HALAMAN 1. Karena elemen tersebut hanya dibuat pada page pertama dari renderer, elemen yang sama juga yang dipakai saat preview dan saat jendela cetak/PDF dibuat.
- Tombol transaksi "Sebelumnya" dan "Berikutnya" sekarang berhenti pada batas data: pada transaksi pertama tombol Sebelumnya dinonaktifkan, pada transaksi terakhir tombol Berikutnya dinonaktifkan. Tidak ada lagi perpindahan melingkar dari transaksi terakhir ke transaksi pertama atau sebaliknya.
- Footer Surat Perintah tidak lagi menampilkan label/teks "BKU". Footer hanya menampilkan nomor halaman.
- CSS tidak lagi disimpan di dalam index.html. Seluruh stylesheet aplikasi dipindahkan ke styles.css.
- JavaScript monolitik tidak lagi disimpan di index.html. Kode dipisahkan menjadi modul klasik yang tetap kompatibel dengan pembukaan aplikasi secara portable/file lokal:
  js/core.js           → state, DOM helper, tab, field mapping, escaping
  js/bku-parser.js     → parser PDF/Excel, validasi BKU, identitas, grouping, pajak
  js/surat.js          → data surat, navigasi transaksi, renderer dan pagination A4
  js/bku-ui.js         → render tabel/status dan proses ekstraksi + progress
  js/surat-viewer.js   → viewer halaman/zoom dan cetak PDF
  js/export.js         → ekspor Excel
  js/main.js           → bootstrap dan event handler UI
- index.html sekarang berfungsi sebagai struktur/tampilan utama, sedangkan logika aplikasi dan style dipelihara di file terpisah agar lebih mudah dimodifikasi.

- Hotfix runtime: `js/bku-ui.js` sekarang mengambil seluruh helper parser PDF yang dipakai (`pdfColumns`, grouping baris, pembacaan kolom, identitas, dan helper terkait) dari namespace `SPMU`. Ini memperbaiki error `ReferenceError: pdfColumns is not defined` saat tombol BACA DATA dijalankan.
- Tidak ada perubahan pada logika batas navigasi, footer Surat Perintah, atau aturan kotak BNU/BPU halaman pertama.


UPDATE v20 — HOTFIX DUA ReferenceError (BACA DATA & CETAK/PDF)
- Memperbaiki error "sanitizeUraian is not defined" yang membuat MR. LOADING gagal saat tombol BACA DATA ditekan.
  Penyebab: js/bku-ui.js (readPdfWithProgress) memakai sanitizeUraian tetapi tidak mengambilnya dari namespace SPMU.
  Perbaikan: sanitizeUraian ditambahkan ke daftar helper yang diambil dari SPMU di js/bku-ui.js.
- Memperbaiki potensi error "renderSurat is not defined" pada tombol Cetak / PDF.
  Penyebab: js/surat-viewer.js memanggil renderSurat() tanpa mengambilnya dari namespace SPMU.
  Perbaikan: pemanggilan diubah menjadi ns.renderSurat() di js/surat-viewer.js.
- Tidak ada perubahan pada logika ekstraksi, penggabungan BPU/BNU, data murni, hitung pajak, renderer/pagination Surat Perintah,
  navigasi transaksi, footer, kotak BNU/BPU, logo, maupun ekspor Excel. Hanya dua baris kode yang diubah.


UPDATE v21 — FITUR KWITANSI (otomatis mengikuti No. Bukti)
- Tombol "Kwitansi" ditambahkan di samping tombol "Surat" pada pratinjau Tab Surat Perintah.
- Kwitansi otomatis mengikuti transaksi/No. Bukti yang sedang dipilih (dropdown, tombol Sebelumnya/Berikutnya).
- Isi kwitansi: Nomor = <No. Bukti>/BOS/<Tahun>; Sudah Terima Dari = KEPALA <Nama Sekolah>;
  Banyaknya Uang = terbilang dalam huruf; Untuk Pembayaran = isian manual Surat Perintah
  (jika kosong memakai uraian BKU); kotak Terbilang: Rp ...,-; tanda tangan Kepala Sekolah,
  Bendahara, dan Yang Menerima Uang (nama dari "Harap Dibayar Kepada").
- Cetak / PDF mengikuti dokumen yang sedang tampil (Surat atau Kwitansi), A4 portrait.
- Cetak / PDF Massal: pilihan dokumen "Surat Perintah", "Kwitansi", atau "Surat + Kwitansi".
- File baru: js/kwitansi.js. Perubahan kecil: index.html, main.js, surat.js, surat-viewer.js, styles.css.

=== PERBAIKAN MESIN EKSTRAKSI v2 ===
- Excel: header BKU kini dikenali lebih fleksibel (Tanggal/Tgl, Uraian/Keterangan/Rincian, Pengeluaran/Belanja/Keluar/Debit, dsb.).
- Excel: mendukung header bertingkat sampai beberapa baris dan tanggal yang kosong pada baris lanjutan dengan meneruskan tanggal sebelumnya.
- Excel: No. Bukti BPU/BNU tidak wajib; transaksi dengan Pengeluaran tetap dipertahankan.
- Excel: tersedia pemulihan untuk format satu-baris/teks gabungan bila struktur kolom tidak normal.
- PDF: posisi kolom dapat dideteksi dari header halaman dan tetap memiliki fallback ke geometri BKU standar.
- PDF: validasi total hanya dijalankan bila baris Jumlah benar-benar ditemukan, sehingga PDF tanpa baris total tidak dianggap gagal.
- PDF/Excel: format tanggal dan nominal Indonesia dibaca lebih toleran.
- Dashboard tetap menjadi halaman pertama dan sidebar memiliki mode kompak biru dengan teks FORSITAS KECAMATAN LEBAK WANGI.


PERBAIKAN FITUR BACA DATA - 1 OKTOBER 2026
- Tombol BACA DATA tetap memproses Excel/PDF walaupun identitas kecamatan belum terbaca sempurna.
- Validasi kecamatan hanya menolak bila dokumen secara eksplisit menunjukkan kecamatan selain LEBAK WANGI.
- Excel menggunakan tiga lapis pembacaan: header standar, pemulihan baris, dan fallback pola isi.
- No. Bukti BPU/BNU tidak menjadi syarat wajib transaksi.
- Nominal Pengeluaran dan tanggal yang valid diprioritaskan agar transaksi tidak hilang hanya karena format kolom berbeda.
- PDF.js dan XLSX memiliki URL CDN cadangan (jsDelivr) bila CDN utama tidak tersedia.
- Bila dijalankan tanpa internet, pustaka PDF/Excel tetap memerlukan salinan vendor lokal; aplikasi akan menampilkan pesan yang jelas saat mesin belum tersedia.

PERBAIKAN CRITICAL - 1 OKTOBER 2026
- Memperbaiki crash pada fungsi render: layout FIXED memang tidak lagi memiliki metrik mFile/mPages/mRows/mTotal/mIncome, tetapi bku-ui.js masih mengakses elemen tersebut secara langsung. Sekarang elemen metrik lama bersifat opsional sehingga tidak menghentikan aplikasi.
- Dampak bug sebelumnya: render awal gagal -> inisialisasi Project Store tidak pernah selesai -> tombol BUKA PEKERJAAN tidak mendapat event handler -> proses BACA DATA juga berhenti saat render dipanggil.
- Layout Dashboard/sidebar dan fitur yang sudah ada dipertahankan; perbaikan hanya pada kompatibilitas render dengan layout FIXED.
- Mesin ekstraksi PDF/Excel versi FIXED tetap dipertahankan sebagai dasar, bukan diganti dengan layout atau implementasi dari SPMU_OTOMATIS_V2-main.
