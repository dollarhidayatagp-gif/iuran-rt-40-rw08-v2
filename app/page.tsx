// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
'use client';
import React, { useState, useEffect } from 'react';

// =====================================================================
// URL WEB APP APPS SCRIPT DEFAULT (BAWAAN, TERTANAM DI KODE)
// -----------------------------------------------------------
// PENTING - INI PERBAIKAN UTAMA MASALAH "DATA TIDAK MASUK KE GOOGLE SHEETS":
// Sebelumnya, URL ini HANYA tersimpan di localStorage browser admin sendiri.
// Akibatnya, pengunjung/warga lain yang membuka website dari HP/browser
// MEREKA SENDIRI (untuk mengisi Formulir Pendaftaran, atau lihat Kegiatan,
// dll) tidak pernah punya URL ini di browser mereka -> aplikasi otomatis
// membatalkan pengiriman data ke Google Sheets untuk mereka, data hilang
// begitu halaman ditutup/refresh.
//
// Dengan menaruh URL di sini (tertanam langsung di kode, bukan di
// localStorage), SEMUA orang yang membuka website - siapapun, dari
// perangkat manapun - otomatis pakai Google Sheet yang SAMA sejak
// halaman pertama kali dibuka, tanpa perlu admin login dulu di device itu.
//
// CARA ISI: tempel "Web app URL" hasil Deploy dari Apps Script (Code.gs)
// di antara tanda kutip di bawah ini, formatnya:
// 'https://script.google.com/macros/s/xxxxxxxxxxxxx/exec'
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwj360UDFOVK0bS-3Sx8iyFFQcHgo4DLuE6ly8eUgk4HbRPWzPWNnuZwaG3xRhUEfXPRw/exec';

export default function IuranWargaRTApp() {
  // ==========================================
  // GLOBAL STYLE (di-inject hanya di client, lihat penjelasan di komentar
  // dekat useEffect di bawah -> mencegah hydration mismatch)
  // ==========================================
  useEffect(() => {
    const STYLE_ID = 'app-root-global-style';
    if (document.getElementById(STYLE_ID)) return;
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      .app-root, .app-root * { font-family: 'Public Sans', 'Roboto', ui-sans-serif, sans-serif; }
      .app-root .font-serif { font-family: 'Roboto', 'Public Sans', serif; }
      @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes toastIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      .anim-fade { animation: fadeSlideIn 0.35s ease both; }
      .anim-toast { animation: toastIn 0.3s ease both; }
      .anim-pop { animation: popIn 0.25s ease both; }
      .app-root nav button, .app-root .menu-btn { transition: background-color 0.25s ease, color 0.25s ease, transform 0.15s ease; }
      .app-root nav button:active, .app-root .menu-btn:active { transform: scale(0.97); }
    `;
    document.head.appendChild(styleEl);
  }, []);

  // ==========================================
  // TICKING JAM BERJALAN - update setiap 1 detik, format HH:MM:SS WIB
  // ==========================================
  useEffect(() => {
    const updateJam = () => {
      const now = new Date();
      setJamSekarang(now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setTanggalSekarang(now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateJam();
    const interval = setInterval(updateJam, 1000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // STATE NAVIGASI & ROLE
  // ==========================================
  const [role, setRole] = useState('user');
  const [view, setView] = useState('landing');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // sidebar dashboard di mode HP (default tertutup)

  // ==========================================
  // JAM BERJALAN (REAL-TIME CLOCK) - WIB / ASIA JAKARTA
  // -----------------------------------------------------------
  // Ditampilkan di Web Utama tepat di bawah kotak Info &amp; Pengumuman RT, format
  // angka digital (HH:MM:SS) yang berjalan otomatis setiap detik mengikuti
  // waktu WIB (zona waktu Asia/Jakarta), berlaku untuk semua pengunjung
  // di manapun mereka berada, supaya jam yang tampil selalu sesuai waktu
  // DKI Jakarta & sekitarnya.
  // ==========================================
  const [jamSekarang, setJamSekarang] = useState('--:--:--');
  const [tanggalSekarang, setTanggalSekarang] = useState('');

  // ==========================================
  // NOTIFIKASI DALAM AKUN (BADGE "BELUM DIBACA") - USER & ADMIN
  // -----------------------------------------------------------
  // Setiap ada peristiwa penting (warga upload bukti transfer, admin
  // menyetujui/menolak pembayaran, ada pendaftaran member baru, admin
  // mengaktivasi/reset password member), sistem otomatis membuat 1 baris
  // notifikasi di sini. `untuk` diisi id anggota (kalau ditujukan ke user
  // tertentu) atau string 'admin' (kalau ditujukan ke Admin/Bendahara).
  // Badge angka di ikon lonceng dashboard dihitung dari notifikasi milik
  // akun yang sedang aktif dengan status dibaca:false.
  // ==========================================
  const [notifikasiList, setNotifikasiList] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // ==========================================
  // 1. STATE MANAGEMENT CMS WEBSITE
  // ==========================================
  const [cmsTeks, setCmsTeks] = useState({
    namaRT: 'RT 40 RW 08 Perum Bumi Indah Proklamasi',
    alamatRT: 'Perum Bumi Indah Proklamasi, RT 40/RW 08, Cikarang, Jawa Barat',
    noRekening: 'BCA 1234 5678 9012 3456 a.n. Bendahara RT 40 RW 08',
    judulBeranda: 'Iuran Warga RT 40 RW 08 Lebih Tertib & Transparan',
    subJudulBeranda: 'Program Iuran Bulanan Warga',
    tagline: 'Tertib bayar iuran, lingkungan nyaman, warga sejahtera bersama',
    pengumuman: 'Pembayaran iuran bulan berjalan sudah dibuka. Silakan melakukan pembayaran dan upload bukti transfer sebelum tanggal 10 setiap bulannya ke rekening resmi RT.',
    infoKontak: '0822-9728-1391',
    fotoLatarRT: null,
    logoRT: null,
    // TANDA TANGAN DIGITAL BENDAHARA RT - URL gambar tanda tangan (upload dari
    // Admin, lihat handleTandaTanganChange) yang tampil di Kuitansi Digital
    // menggantikan cap/stempel bulat lama. Kalau kosong (belum diupload),
    // kuitansi otomatis fallback memakai cap bulat SVG seperti sebelumnya.
    tandaTanganBendahara: null,
    // PENTING (perbaikan "foto hilang setelah login lagi"): URL Apps Script
    // dulunya HANYA tersimpan di memori React (state), jadi begitu halaman
    // di-refresh atau dibuka ulang, URL-nya balik kosong -> aplikasi tidak
    // pernah menarik ulang data dari Google Sheets/Drive, sehingga foto dan
    // data lain kelihatan "hilang" padahal sebenarnya masih aman tersimpan
    // di Sheet & Drive. Sekarang URL disimpan juga ke localStorage browser,
    // supaya begitu app dibuka lagi, otomatis tersambung & foto/data
    // langsung dimuat ulang tanpa perlu input ulang URL.
    appsScriptUrl: (typeof window !== 'undefined' && window.localStorage.getItem('iuran_rt_apps_script_url')) || DEFAULT_APPS_SCRIPT_URL,
    visi: 'Menjadi RT yang tertib administrasi, transparan dalam pengelolaan kas warga, dan nyaman untuk seluruh warga.',
    misi: 'Memfasilitasi pembayaran iuran bulanan tanpa ribet, menjaga akuntabilitas keuangan RT secara real-time, serta memastikan kas warga digunakan tepat sasaran untuk kepentingan bersama.',
    syaratList: [
      'Terdaftar sebagai warga/kepala keluarga di RT 40 RW 08',
      'Mengisi formulir pendaftaran warga',
      'Iuran bulanan sebesar Rp45.000 per rumah',
      'Pembayaran dilakukan setiap bulan melalui transfer ke rekening resmi RT',
      'Upload bukti transfer setelah melakukan pembayaran',
      'Pada saat mendaftar langsung membayar iuran bulan berjalan',
      'Setiap perubahan data (alamat/kontak) wajib dikonfirmasi ke pengurus RT'
    ],
    ketentuanList: [
      'Setiap warga/kepala keluarga wajib membayar iuran bulanan sebesar Rp45.000 setiap bulannya.',
      'Batas akhir pembayaran adalah tanggal 10 setiap bulan.',
      'Pembayaran dilakukan via transfer ke rekening resmi RT lalu upload bukti transfer melalui aplikasi.',
      'Bukti transfer akan diverifikasi oleh Bendahara RT sebelum berstatus LUNAS.',
      'Warga wajib mengisi formulir pendaftaran dengan data yang benar dan lengkap.',
      'Perubahan data warga (nama, alamat, kontak) wajib dikonfirmasi ke pengurus RT.',
      'Dana iuran digunakan untuk operasional, kebersihan, keamanan, dan kegiatan sosial warga RT 40 RW 08.',
      'Laporan penggunaan dana dapat dilihat warga melalui menu Realisasi/Laporan Belanja Kas RT.'
    ],
    // SUSUNAN PENGURUS - NAMA BENDAHARA DI SINI OTOMATIS TERHUBUNG KE TANDA TANGAN KUITANSI DIGITAL
    panitiaKetua: 'H. Ridwan Hakim',
    panitiaSekretaris: 'Fitriani',
    panitiaBendahara: 'Ahmad',
    panitiaHumas: 'Dedi Kurniawan',
    // ----- INFORMASI UMUM RT (diisi Admin lewat CMS Super Editor) -----
    fotoRTUmum: null,
    deskripsiRT: 'RT 40 RW 08 Perum Bumi Indah Proklamasi adalah lingkungan tempat tinggal warga yang aktif menyelenggarakan kegiatan kebersihan, keamanan (ronda), kerja bakti, serta program sosial kemasyarakatan lainnya melalui pengelolaan iuran bulanan warga yang transparan.',
    luasRT: '600 m²',
    // Papan pengumuman/info umum RT (dulunya Jadwal Sholat) - berisi info
    // singkat yang ingin ditonjolkan pengurus RT ke warga di halaman Beranda.
    infoPengumumanList: [
      'Kerja bakti rutin dilaksanakan setiap Minggu pagi pukul 07.00.',
      'Jadwal ronda malam bergilir sesuai jadwal yang dibagikan pengurus RT.',
      'Pembayaran iuran ditutup setiap tanggal 10, mohon tidak menunggu akhir bulan.'
    ],
    asetRTList: ['Pos Ronda', 'Gapura Perumahan', 'Sound System', 'Tenda & Kursi Kegiatan Warga', 'Alat Kebersihan Lingkungan', 'Mobil Operasional RT']
  });

  const [cmsForm, setCmsForm] = useState({
    ...cmsTeks,
    syaratText: cmsTeks.syaratList.join('\n'),
    ketentuanText: cmsTeks.ketentuanList.join('\n')
  });

  // ==========================================
  // 1B. STRUKTUR RT (FOTO ANGGOTA PENGURUS)
  // -----------------------------------------------------------
  // Daftar anggota struktur RT lengkap dengan foto. Dikelola dari Admin
  // Panel (CMS Super Editor) dan otomatis tampil di halaman Beranda (Web
  // Utama) untuk SEMUA akun (baik yang belum login, warga, maupun admin
  // lain) karena datanya bagian dari konten publik yang disinkronkan.
  // ==========================================
  const [strukturRt, setStrukturRt] = useState([
    { id: 'RT-01', jabatan: 'Ketua Panitia', nama: 'H. Ridwan Hakim', foto: null },
    { id: 'RT-02', jabatan: 'Sekretaris', nama: 'Fitriani', foto: null },
    { id: 'RT-03', jabatan: 'Bendahara', nama: 'Ahmad', foto: null },
    { id: 'RT-04', jabatan: 'Humas', nama: 'Dedi Kurniawan', foto: null },
  ]);
  const [formStrukturBaru, setFormStrukturBaru] = useState({ nama: '', jabatan: '', foto: null });
  const [editingStrukturId, setEditingStrukturId] = useState(null);

  // ==========================================
  // RIWAYAT KAS MASUK/KELUAR RT (BUKU KAS SEDERHANA)
  // -----------------------------------------------------------
  // Daftar transaksi kas keluar-masuk (pemasukan iuran/infaq, pengeluaran
  // operasional, dst) lengkap dengan keterangan. Saldo berjalan dihitung
  // OTOMATIS secara berurutan (kronologis) lewat getRiwayatKasRtDenganSaldo
  // di bawah, supaya admin tidak perlu menghitung manual saldo tiap baris.
  // Ditampilkan sebagai tabel publik di Web Utama (di bawah kartu
  // Pendaftaran Akun) supaya transparan untuk semua warga & pengunjung.
  // ==========================================
  const [riwayatKasRt, setRiwayatKasRt] = useState([
    { id: 'KRT-01', tanggal: '01 Jun 2026', keterangan: 'Saldo awal kas RT periode berjalan', jenis: 'Masuk', nominal: 17500000 },
    { id: 'KRT-02', tanggal: '05 Jun 2026', keterangan: 'Iuran bulanan warga bulan Mei (terkumpul)', jenis: 'Masuk', nominal: 1350000 },
    { id: 'KRT-03', tanggal: '05 Jun 2026', keterangan: 'Pembelian perlengkapan pos ronda Blok A', jenis: 'Keluar', nominal: 850000 },
    { id: 'KRT-04', tanggal: '10 Jun 2026', keterangan: 'Sewa mobil pick-up angkut sampah lingkungan', jenis: 'Keluar', nominal: 350000 },
    { id: 'KRT-05', tanggal: '12 Jun 2026', keterangan: 'Iuran bulanan warga bulan Juni (terkumpul)', jenis: 'Masuk', nominal: 1400000 },
  ]);
  const [formRiwayatKasRtBaru, setFormRiwayatKasRtBaru] = useState({ tanggal: '', keterangan: '', jenis: 'Masuk', nominal: '' });
  const [editingRiwayatKasRtId, setEditingRiwayatKasRtId] = useState(null);

  // Mengembalikan riwayatKasRt (urut tanggal input, dari yang paling lama)
  // dengan tambahan field `saldoSetelah` = saldo berjalan setelah transaksi
  // itu terjadi. Kas Masuk menambah saldo, Kas Keluar mengurangi saldo.
  const getRiwayatKasRtDenganSaldo = () => {
    let saldoBerjalan = 0;
    return riwayatKasRt.map(t => {
      saldoBerjalan += t.jenis === 'Masuk' ? Number(t.nominal) : -Number(t.nominal);
      return { ...t, saldoSetelah: saldoBerjalan };
    });
  };

  // ==========================================
  // 1D. REALISASI/LAPORAN BELANJA KAS RT (BUKTI PENGELUARAN BENDAHARA)
  // -----------------------------------------------------------
  // Diisi Bendahara/Admin lengkap dengan bukti foto struk/nota. Otomatis
  // tampil ke Dashboard Warga (data ASLI, hanya untuk akun yang benar-benar
  // login) dan ditampilkan versi DUMMY di Web Utama untuk tombol "Simulasi
  // Akun Pengguna Cepat" (lihat isSimulatedSession di bawah).
  // ==========================================
  const [realisasiBelanja, setRealisasiBelanja] = useState([
    { id: 'RB-01', tanggal: '05 Jun 2026', kategori: 'Keamanan', keterangan: 'Pembelian perlengkapan pos ronda Blok A', nominal: 850000, kelompok: 'Blok A', buktiUrl: null, buktiNamaFile: 'nota_ronda_a.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
    { id: 'RB-02', tanggal: '10 Jun 2026', kategori: 'Kebersihan', keterangan: 'Sewa mobil pick-up angkut sampah lingkungan', nominal: 350000, kelompok: 'Semua', buktiUrl: null, buktiNamaFile: 'nota_sewa.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
  ]);
  const [formRealisasiBaru, setFormRealisasiBaru] = useState({ tanggal: '', kategori: 'Kebersihan', keterangan: '', nominal: '', kelompok: 'Semua', buktiUrl: null, buktiNamaFile: null });
  const [previewLampiran, setPreviewLampiran] = useState(null); // { judul, url, namaFile, tipe: 'gambar'|'pdf' }

  // DATA DUMMY TETAP (statis) khusus tampilan simulasi di Web Utama - TIDAK PERNAH
  // ikut sinkron ke Google Sheets, murni contoh gambaran bagi pengunjung.
  const DUMMY_REALISASI_SIMULASI = [
    { id: 'SIM-01', tanggal: '05 Jun 2026', kategori: 'Keamanan', keterangan: 'Contoh: Pembelian perlengkapan ronda malam (data simulasi)', nominal: 850000, kelompok: 'Simulasi', buktiUrl: null, buktiNamaFile: 'contoh_nota.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
    { id: 'SIM-02', tanggal: '12 Jun 2026', kategori: 'Kebersihan', keterangan: 'Contoh: Biaya angkut sampah lingkungan (data simulasi)', nominal: 350000, kelompok: 'Simulasi', buktiUrl: null, buktiNamaFile: 'contoh_nota2.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
    { id: 'SIM-03', tanggal: '15 Jun 2026', kategori: 'Sosial', keterangan: 'Contoh: Santunan warga & kegiatan sosial (data simulasi)', nominal: 320000, kelompok: 'Simulasi', buktiUrl: null, buktiNamaFile: 'contoh_nota3.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
  ];

  // ==========================================
  // PENANDA SESI SIMULASI vs SESI LOGIN ASLI
  // -----------------------------------------------------------
  // true  = akun yang sedang aktif berasal dari tombol "Simulasi Akun Pengguna
  //         Cepat" di Web Utama -> seluruh laporan keuangan yang tampil di
  //         Dashboard memakai data CONTOH/dummy tetap, bukan data asli.
  // false = akun aktif berasal dari Login resmi (username & password) ->
  //         seluruh laporan keuangan memakai data ASLI dari Google Sheets.
  // ==========================================
  const [isSimulatedSession, setIsSimulatedSession] = useState(true);

  // CONSTANT KALENDER 2026
  const DAFTAR_BULAN = [
    { id: 1, nama: 'Januari' }, { id: 2, nama: 'Februari' }, { id: 3, nama: 'Maret' },
    { id: 4, nama: 'April' }, { id: 5, nama: 'Mei' }, { id: 6, nama: 'Juni' },
    { id: 7, nama: 'Juli' }, { id: 8, nama: 'Agustus' }, { id: 9, nama: 'September' },
    { id: 10, nama: 'Oktober' }, { id: 11, nama: 'November' }, { id: 12, nama: 'Desember' }
  ];

  // ==========================================
  // DATA SIMULASI TAMBAHAN: BLOK F1-F14 & G1-G6 (CONTOH/DUMMY)
  // -----------------------------------------------------------
  // Ditambahkan sebagai gambaran bagaimana "Rekap Blok Rumah" akan tampil
  // otomatis setelah admin membuat banyak blok & mengisi banyak data warga
  // (baik untuk role Admin yang melihat SELURUH blok, maupun role User
  // yang hanya melihat blok tempat tinggalnya sendiri). Data ini HANYA
  // dipakai saat aplikasi belum tersambung ke Google Sheets (mode demo) -
  // begitu appsScriptUrl diisi & Sheets terhubung, data ASLI dari Sheets
  // otomatis MENGGANTIKAN seluruh data contoh ini (lihat useEffect fetch
  // di atas: setMembers/setKelompokList hanya dipanggil kalau data Sheets
  // tidak kosong).
  // ==========================================
  const NAMA_BLOK_TAMBAHAN_FG = [
    ...Array.from({ length: 14 }, (_, i) => `Blok F${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `Blok G${i + 1}`),
  ];
  const NAMA_CONTOH_WARGA_FG = [
    'Budi Santoso', 'Dewi Kartika', 'Eko Prasetyo', 'Fitriani Handayani', 'Gunawan Wijaya', 'Hasan Basri',
    'Indah Permatasari', 'Joko Susilo', 'Kartini Wulandari', 'Lukman Hakim', 'Maya Sari', 'Nur Aini',
    'Oscar Pratama', 'Putri Ayu Lestari', 'Qori Fadillah', 'Rudi Hartono', 'Sri Wahyuni', 'Taufik Rahman',
    'Umi Kalsum', 'Vina Melati',
  ];
  const membersTambahanBlokFG = NAMA_BLOK_TAMBAHAN_FG.map((namaBlok, idx) => {
    const namaKK = NAMA_CONTOH_WARGA_FG[idx % NAMA_CONTOH_WARGA_FG.length];
    const jumlahAnak = idx % 3; // variasi 0-2 anak per KK contoh, supaya rekap usia bervariasi
    const anggotaKeluarga = [];
    if (idx % 2 === 0) {
      anggotaKeluarga.push({ id: `AKFG-${idx}-p`, nama: `Pasangan dari ${namaKK}`, hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1988-05-10' });
    }
    for (let a = 0; a < jumlahAnak; a++) {
      const tahunLahir = 2008 + ((idx + a) % 18); // sebar rentang usia: balita s/d remaja
      anggotaKeluarga.push({ id: `AKFG-${idx}-a${a}`, nama: `Anak ke-${a + 1} ${namaKK}`, hubungan: `Anak ke-${a + 1}`, jenisKelamin: a % 2 === 0 ? 'Laki-laki' : 'Perempuan', tanggalLahir: `${tahunLahir}-0${(a % 9) + 1}-15` });
    }
    return {
      id: `TR-FG-${idx + 1}`,
      nama: namaKK,
      nomorRumah: `${namaBlok} No. ${(idx % 12) + 1}`,
      email: `${namaKK.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
      wa: `0812${String(30000000 + idx * 1111).slice(-8)}`,
      alamat: `${namaBlok} No. ${(idx % 12) + 1}, Perum Bumi Indah Proklamasi, RT 40/RW 08`,
      target: 540000,
      bergabung: '01 Jul 2026',
      username: `warga${namaBlok.replace(/\s+/g, '').toLowerCase()}`,
      password: 'demo12345',
      statusAnggota: 'Aktif',
      kelompok: namaBlok,
      akses: 'user',
      statusRumah: idx % 2 === 0 ? 'Milik Sendiri' : 'Kontrak',
      anggotaKeluarga,
    };
  });
  const kelompokTambahanBlokFG = NAMA_BLOK_TAMBAHAN_FG.map((namaBlok, idx) => ({
    id: `GRP-FG-${idx + 1}`,
    nama: namaBlok,
    jenis: 'Rumah',
    kapasitas: 50,
    noPengajuan: `${String(idx + 3).padStart(3, '0')}/VII/2026`,
    status: 'Progress',
    tglDibuat: '15 Jul 2026',
  }));
  // Diambil 2 contoh (1 dari Blok F, 1 dari Blok G) supaya tombol "Simulasi
  // Akun Pengguna" di Web Utama juga bisa langsung memperlihatkan tampilan
  // Dashboard & Rekap Blok Rumah untuk warga di Blok F/G, bukan cuma Blok A/B.
  const CONTOH_SIMULASI_TAMBAHAN_FG = [membersTambahanBlokFG[0], membersTambahanBlokFG[14]];

  // ==========================================
  // 2. DATABASE MASTER ANGGOTA
  // ==========================================
  const [members, setMembers] = useState([
    { id: 'TR-01', nama: 'Hidayat', nomorRumah: 'Blok A No. 5', email: 'hidayat@mail.com', wa: '081234567890', alamat: 'Blok A No. 5, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '10 Jan 2026', username: 'hidayat123', password: 'password123', statusAnggota: 'Aktif', kelompok: 'Blok A', akses: 'admin', statusRumah: 'Milik Sendiri', anggotaKeluarga: [
      { id: 'AK-01', nama: 'Ratna Sari', hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1990-04-12' },
      { id: 'AK-02', nama: 'Aditya Hidayat', hubungan: 'Anak ke-1', jenisKelamin: 'Laki-laki', tanggalLahir: '2015-08-20' },
    ] },
    { id: 'TR-02', nama: 'Ahmad Fauzi', nomorRumah: 'Blok A No. 8', email: 'fauzi@mail.com', wa: '082211112222', alamat: 'Blok A No. 8, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '12 Jan 2026', username: 'ahmadfauzi', password: 'password456', statusAnggota: 'Aktif', kelompok: 'Blok A', akses: 'user', statusRumah: 'Kontrak', anggotaKeluarga: [
      { id: 'AK-03', nama: 'Dewi Lestari', hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1993-11-02' },
    ] },
    { id: 'TR-03', nama: 'Siti Aminah', nomorRumah: 'Blok B No. 3', email: 'siti@mail.com', wa: '085799998888', alamat: 'Blok B No. 3, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '15 Jan 2026', username: 'sitiaminah', password: 'password789', statusAnggota: 'Pasif', kelompok: 'Blok B', akses: 'user', statusRumah: 'Milik Sendiri', anggotaKeluarga: [] },
    ...membersTambahanBlokFG, // contoh/dummy warga Blok F1-F14 & G1-G6, otomatis diganti data asli begitu tersambung Google Sheets
  ]);

  // Daftar TETAP/STATIS untuk tombol "Simulasi Akun Pengguna" di landing page.
  // SENGAJA dipisah dari state `members` (data anggota ASLI) supaya:
  //  - Simulasi ini murni CONTOH tampilan Dashboard untuk pengunjung, TIDAK
  //    pernah terhubung ke data admin/user yang sebenarnya.
  //  - Kalau ada pendaftar baru yang di-ACC admin dan masuk jadi anggota asli,
  //    nama itu TIDAK akan ikut nambah/muncul di daftar simulasi ini.
  const CONTOH_SIMULASI_ANGGOTA = [
    { id: 'TR-01', nama: 'Hidayat', nomorRumah: 'Blok A No. 5', email: 'hidayat@mail.com', wa: '081234567890', alamat: 'Blok A No. 5, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '10 Jan 2026', username: 'hidayat123', password: 'password123', statusAnggota: 'Aktif', kelompok: 'Blok A', akses: 'admin', statusRumah: 'Milik Sendiri', anggotaKeluarga: [
      { id: 'AK-01', nama: 'Ratna Sari', hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1990-04-12' },
      { id: 'AK-02', nama: 'Aditya Hidayat', hubungan: 'Anak ke-1', jenisKelamin: 'Laki-laki', tanggalLahir: '2015-08-20' },
    ] },
    { id: 'TR-03', nama: 'Siti Aminah', nomorRumah: 'Blok B No. 3', email: 'siti@mail.com', wa: '085799998888', alamat: 'Blok B No. 3, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '15 Jan 2026', username: 'sitiaminah', password: 'password789', statusAnggota: 'Pasif', kelompok: 'Blok B', akses: 'user', statusRumah: 'Milik Sendiri', anggotaKeluarga: [] },
    ...CONTOH_SIMULASI_TAMBAHAN_FG, // contoh 1 warga Blok F & 1 warga Blok G, supaya tombol simulasi juga bisa memperlihatkan blok F/G
  ];

  // ==========================================
  // DATA WARGA KELUAR (WARGA YANG PINDAH/KELUAR DARI LINGKUNGAN RT)
  // -----------------------------------------------------------
  // Diisi & dikontrol penuh oleh ADMIN: nama warga + blok asal warga
  // yang sudah keluar/pindah. Data ini otomatis konek & tampil juga
  // di Dashboard akun warga (user), sinkron ke Google Sheet lewat
  // sheet "WargaKeluar" (pola sama seperti data Anggota/Kelompok lain).
  // ==========================================
  const [wargaKeluarList, setWargaKeluarList] = useState([
    { id: 'WK-01', nama: 'Contoh Bambang Sutrisno', blok: 'Blok A', tanggalKeluar: '01 Jul 2026', keterangan: 'Pindah rumah' },
  ]);
  const [formWargaKeluarBaru, setFormWargaKeluarBaru] = useState({ nama: '', blok: '', tanggalKeluar: '', keterangan: '' });
  const [editingWargaKeluarId, setEditingWargaKeluarId] = useState(null);

  const [activeUserSession, setActiveUserSession] = useState(members[0]);
  const [adminGroupFilter, setAdminGroupFilter] = useState('Semua');
  const [adminTimelineFilter, setAdminTimelineFilter] = useState('Semua');
  const [adminCariNama, setAdminCariNama] = useState('');
  const [adminSortNamaDir, setAdminSortNamaDir] = useState(null); // null | 'asc' | 'desc'
  const [adminFilterNomorPengajuan, setAdminFilterNomorPengajuan] = useState('Semua');
  const [expandedRekapKelompokId, setExpandedRekapKelompokId] = useState(null);

  // ==========================================
  // SINKRONISASI GOOGLE SHEETS (VIA GOOGLE APPS SCRIPT WEB APP)
  // -----------------------------------------------------------
  // Kalau admin sudah mengisi URL Web App Apps Script di CMS Super Editor,
  // data Anggota & Iuran otomatis:
  //  1) diambil dari Google Sheet saat aplikasi pertama dibuka (hydrate), dan
  //  2) dikirim ulang (overwrite) ke Google Sheet setiap kali ada perubahan,
  // sehingga SEMUA user (HP/PC/laptop, siapa pun yang buka link) melihat data
  // yang sama, tersimpan permanen di Google Sheet milik panitia.
  // Kalau URL belum diisi, aplikasi tetap jalan normal pakai data lokal (mode demo).
  // ==========================================
  const [sheetStatus, setSheetStatus] = useState('idle'); // idle | loading | synced | error
  // true kalau Google Sheets sudah mengirim data ANGGOTA ASLI (dataAnggota tidak
  // kosong) - dipakai untuk otomatis menyembunyikan tombol "Simulasi Akun
  // Pengguna" di Web Utama begitu website sudah punya data warga sungguhan,
  // supaya pengunjung tidak lagi disuguhi contoh/dummy setelah RT aktif pakai data asli.
  const [dataWargaAsliSudahMasuk, setDataWargaAsliSudahMasuk] = useState(false);
  const [sheetTesting, setSheetTesting] = useState(false);

  const sheetFetch = async (url: any, options?: any) => {
  const res = await fetch(url, options);
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error('Respons Apps Script bukan JSON yang valid. Pastikan URL benar dan deployment "Anyone can access".'); }
};

  // Kirim (overwrite) satu tabel penuh ke Google Sheet. Dipakai setelah setiap
  // perubahan Anggota/Iuran supaya Sheet selalu jadi cerminan data terbaru.
  const syncSheet = async (sheetName, data) => {
    if (!cmsTeks.appsScriptUrl) return;
    try {
      setSheetStatus('loading');
      await sheetFetch(cmsTeks.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight di Apps Script
        body: JSON.stringify({ sheet: sheetName, data })
      });
      setSheetStatus('synced');
    } catch (err) {
      console.error(err);
      setSheetStatus('error');
      showToast(`Gagal sinkron ke Google Sheets: ${err.message}`, 'error');
    }
  };

  // Anggota Keluarga tersimpan sebagai ARRAY OBJEK bersarang (nama, jenisKelamin,
  // tanggalLahir per anggota) - beda dengan kolom sheet lain yang cuma teks/angka
  // datar. Supaya aman dikirim ke Google Sheets (1 sel = 1 nilai teks) dan
  // dibaca balik dengan benar, dikonversi ke JSON string saat SYNC OUT, dan
  // di-parse balik jadi array saat data masuk (hydrate) dari sheet.
  const parseAnggotaKeluarga = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) {
      try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };
  const siapkanAnggotaKeluargaUntukSync = (daftar) => daftar.map(item => ({ ...item, anggotaKeluarga: JSON.stringify(item.anggotaKeluarga || []) }));

  // Wrapper pengganti setMembers/setIuranMatrix langsung -> update tampilan
  // seketika (tetap responsif) SEKALIGUS mendorong data terbaru ke Google Sheet.
  const updateMembers = (updater) => {
    setMembers(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Anggota', siapkanAnggotaKeluargaUntukSync(next));
      return next;
    });
  };
  const updateIuran = (updater) => {
    setIuranMatrix(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Iuran', next);
      return next;
    });
  };
  // Wrapper sinkronisasi untuk seluruh database lain di aplikasi ini (Kegiatan,
  // Kelompok, Pengajuan warga baru, Struktur RT, Periode & Riwayat Periode)
  // supaya SEMUA data -bukan cuma Anggota & Iuran- ikut tersimpan permanen &
  // sama di semua akun begitu ada perubahan dari Admin Panel.
  const updateKegiatan = (updater) => {
    setKegiatanList(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Kegiatan', next);
      return next;
    });
  };
  // Wrapper Agenda Utama - BUG SEBELUMNYA: setAgendaUtama dipanggil langsung
  // tanpa syncSheet(), jadi perubahan cuma tersimpan di browser sendiri &
  // hilang saat refresh/beda perangkat. Sekarang disimpan sebagai 1 baris
  // di sheet "AgendaUtama" (sama seperti pola Periode/KasRt).
  const updateAgendaUtama = (updater) => {
    setAgendaUtama(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('AgendaUtama', [next]);
      return next;
    });
  };
  const updateKelompok = (updater) => {
    setKelompokList(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Kelompok', next);
      return next;
    });
  };
  // Wrapper sinkronisasi data Warga Keluar - dikontrol Admin, otomatis
  // konek/tampil di Dashboard Warga (akun user) begitu tersimpan.
  const updateWargaKeluar = (updater) => {
    setWargaKeluarList(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('WargaKeluar', next);
      return next;
    });
  };
  const updatePengajuan = (updater) => {
    setPengajuanBaru(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Pengajuan', siapkanAnggotaKeluargaUntukSync(next));
      return next;
    });
  };
  const updateStruktur = (updater) => {
    setStrukturRt(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('StrukturRT', next);
      return next;
    });
  };
  const updatePeriode = (updater) => {
    setPeriodeAktif(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Periode', [next]);
      return next;
    });
  };
  const updateRiwayatPeriode = (updater) => {
    setRiwayatPeriode(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('RiwayatPeriode', next);
      return next;
    });
  };
  const updateRiwayatKasRt = (updater) => {
    setRiwayatKasRt(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('RiwayatKasRt', next);
      return next;
    });
  };
  const updateRealisasiBelanja = (updater) => {
    setRealisasiBelanja(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('RealisasiBelanja', next);
      return next;
    });
  };
  const updateNotifikasi = (updater) => {
    setNotifikasiList(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Notifikasi', next);
      return next;
    });
  };

  // ==========================================
  // UPLOAD FOTO KE GOOGLE DRIVE (VIA GOOGLE APPS SCRIPT)
  // -----------------------------------------------------------
  // Semua foto (logo, foto latar, bukti transfer, foto kegiatan, foto
  // struktur RT) TIDAK lagi disimpan sebagai base64 langsung di dalam sel
  // Google Sheets, karena 1 sel Sheets punya batas ~50.000 karakter -> foto
  // ukuran besar bisa gagal tersimpan / bikin Sheet berat & lambat.
  // Sebagai gantinya: file dibaca jadi base64 di browser (FileReader), lalu
  // dikirim ke Apps Script (action: 'uploadImage') yang menyimpannya sebagai
  // FILE ASLI ke folder Google Drive milik panitia, dan Apps Script
  // mengembalikan URL publik file tsb. URL (teks pendek) itulah yang disimpan
  // ke Google Sheets & ke state aplikasi, bukan data base64 raksasa.
  // Kalau URL Apps Script belum diisi admin (mode demo/offline), aplikasi
  // otomatis fallback memakai base64 seperti biasa supaya tetap bisa dicoba.
  // ==========================================
  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // ==========================================
  // PERBAIKAN: FOTO STRUKTUR RT/RW TIDAK TERBACA
  // -----------------------------------------------------------
  // Apps Script/Google Drive kadang mengembalikan link "halaman pratinjau"
  // (mis. https://drive.google.com/file/d/FILE_ID/view?usp=... atau
  // .../open?id=FILE_ID). Link seperti ini BUKAN link gambar langsung,
  // jadi kalau dipasang langsung ke <img src=...> hasilnya ikon gambar
  // rusak/patah (persis seperti kasus foto "Abbas"). Fungsi ini mengubah
  // link Drive apa pun menjadi link gambar langsung yang bisa dibaca
  // <img>. Link non-Drive (URL gambar biasa / base64) dibiarkan apa adanya.
  // ==========================================
  const toDirectImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=[a-z]+&id=)([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=s512`;
    }
    return url;
  };

  const uploadFotoKeDrive = async (file, folder = 'Umum') => {
    const dataUrl = await fileToDataUrl(file);
    if (!cmsTeks.appsScriptUrl) {
      // Mode demo/offline: URL Apps Script belum disambungkan, pakai base64 lokal.
      return dataUrl;
    }
    try {
      const hasil = await sheetFetch(cmsTeks.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'uploadImage', folder, fileName: file.name, dataUrl })
      });
      if (hasil && hasil.url) {
        return toDirectImageUrl(hasil.url);
      }
      throw new Error(hasil && hasil.error ? hasil.error : 'Upload ke Google Drive gagal, format respons tidak sesuai.');
    } catch (err) {
      console.error(err);
      showToast(`Gagal upload foto ke Google Drive: ${err.message}. Foto disimpan sementara di perangkat ini saja.`, 'error');
      return dataUrl; // fallback tetap tampil di layar walau gagal upload ke Drive
    }
  };

  // Ambil data dari Google Sheet saat aplikasi dibuka / saat URL Apps Script diisi & disimpan.
  useEffect(() => {
    if (!cmsTeks.appsScriptUrl) return;
    let batal = false;
    (async () => {
      setSheetStatus('loading');
      try {
        const [
          dataAnggota, dataIuran, dataKegiatan, dataKelompok,
          dataPengajuan, dataStruktur, dataPengaturan, dataPeriode, dataRiwayatPeriode,
          dataRiwayatKasRt, dataRealisasi, dataAgendaUtama, dataNotifikasi, dataWargaKeluar
        ] = await Promise.all([
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getMembers`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getIuran`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getKegiatan`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getKelompok`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getPengajuan`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getStrukturRT`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getPengaturan`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getPeriode`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getRiwayatPeriode`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getRiwayatKasRt`).catch(() => []),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getRealisasiBelanja`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getAgendaUtama`),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getNotifikasi`).catch(() => []),
          sheetFetch(`${cmsTeks.appsScriptUrl}?action=getWargaKeluar`).catch(() => [])
        ]);
        if (batal) return;
        if (Array.isArray(dataAnggota) && dataAnggota.length) {
          setMembers(dataAnggota.map(m => ({ ...m, target: Number(m.target) || 0, anggotaKeluarga: parseAnggotaKeluarga(m.anggotaKeluarga) })));
          setDataWargaAsliSudahMasuk(true);
        }
        if (Array.isArray(dataIuran)) {
          setIuranMatrix(dataIuran.map(i => ({ ...i, bulanId: Number(i.bulanId) || 0, nominal: Number(i.nominal) || 0 })));
        }
        if (Array.isArray(dataKegiatan) && dataKegiatan.length) setKegiatanList(dataKegiatan.map(k => ({ ...k, foto: toDirectImageUrl(k.foto) })));
        if (Array.isArray(dataKelompok) && dataKelompok.length) setKelompokList(dataKelompok.map(k => ({ ...k, kapasitas: Number(k.kapasitas) || 0 })));
        if (Array.isArray(dataPengajuan)) setPengajuanBaru(dataPengajuan.map(p => ({ ...p, target: Number(p.target) || 0, anggotaKeluarga: parseAnggotaKeluarga(p.anggotaKeluarga) })));
        if (Array.isArray(dataStruktur) && dataStruktur.length) setStrukturRt(dataStruktur.map(d => ({ ...d, foto: toDirectImageUrl(d.foto) })));
        if (Array.isArray(dataPeriode) && dataPeriode.length) setPeriodeAktif(dataPeriode[0]);
        if (Array.isArray(dataRiwayatPeriode)) setRiwayatPeriode(dataRiwayatPeriode);
        if (Array.isArray(dataRiwayatKasRt) && dataRiwayatKasRt.length) setRiwayatKasRt(dataRiwayatKasRt.map(t => ({ ...t, nominal: Number(t.nominal) || 0 })));
        if (Array.isArray(dataRealisasi)) setRealisasiBelanja(dataRealisasi.map(r => ({ ...r, nominal: Number(r.nominal) || 0 })));
        if (Array.isArray(dataAgendaUtama) && dataAgendaUtama.length) {
          const agendaNormal = { ...dataAgendaUtama[0], foto: toDirectImageUrl(dataAgendaUtama[0].foto) };
          setAgendaUtama(agendaNormal);
          setFormAgendaUtama(agendaNormal);
        }
        if (Array.isArray(dataNotifikasi)) setNotifikasiList(dataNotifikasi);
        if (Array.isArray(dataWargaKeluar) && dataWargaKeluar.length) setWargaKeluarList(dataWargaKeluar);
        if (Array.isArray(dataPengaturan) && dataPengaturan.length) {
          const settingsRow = dataPengaturan[0];
          setCmsTeks(prev => ({
            ...prev,
            ...settingsRow,
            appsScriptUrl: prev.appsScriptUrl, // jangan ditimpa, URL koneksi tetap dari sumber lokal
            logoRT: toDirectImageUrl(settingsRow.logoRT),
            fotoLatarRT: toDirectImageUrl(settingsRow.fotoLatarRT),
            fotoRTUmum: toDirectImageUrl(settingsRow.fotoRTUmum),
            tandaTanganBendahara: toDirectImageUrl(settingsRow.tandaTanganBendahara),
            syaratList: settingsRow.syaratList ? String(settingsRow.syaratList).split('|').filter(Boolean) : prev.syaratList,
            ketentuanList: settingsRow.ketentuanList ? String(settingsRow.ketentuanList).split('|').filter(Boolean) : prev.ketentuanList,
            asetRTList: settingsRow.asetRTList ? String(settingsRow.asetRTList).split('|').filter(Boolean) : prev.asetRTList,
            infoPengumumanList: settingsRow.infoPengumumanList ? String(settingsRow.infoPengumumanList).split('|').filter(Boolean) : prev.infoPengumumanList,
          }));
        }
        setSheetStatus('synced');
        showToast('Seluruh data website berhasil dimuat dari Google Sheets.');
      } catch (err) {
        if (batal) return;
        console.error(err);
        setSheetStatus('error');
        showToast(`Gagal memuat dari Google Sheets: ${err.message}`, 'error');
      }
    })();
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsTeks.appsScriptUrl]);

  const handleTestKoneksiSheet = async () => {
    if (!cmsForm.appsScriptUrl) {
      showToast('Isi dulu URL Web App Apps Script.', 'error');
      return;
    }
    setSheetTesting(true);
    try {
      const hasil = await sheetFetch(`${cmsForm.appsScriptUrl.trim()}?action=getMembers`);
      if (Array.isArray(hasil)) {
        showToast(`Koneksi berhasil! Sheet "Anggota" berisi ${hasil.length} baris data.`);
      } else {
        showToast('Koneksi terhubung, tapi format respons tidak sesuai. Cek kembali kode Apps Script.', 'error');
      }
    } catch (err) {
      showToast(`Tes koneksi gagal: ${err.message}`, 'error');
    } finally {
      setSheetTesting(false);
    }
  };


  // ==========================================
  // 3. DATABASE MATRIKS TRANSAKSI JAN - DES 2026
  // ==========================================
  // Helper: bikin placeholder gambar bukti transfer (data contoh saja) supaya
  // saat diklik "Lihat Bukti" langsung tampil, tidak broken image seperti
  // sebelumnya (dulu cuma nama file teks 'bukti_jan.jpg' yang filenya tidak ada).
  // Untuk upload sungguhan oleh user, buktiUrl otomatis diisi dataURL asli dari
  // hasil FileReader (lihat handleUploadBayar), placeholder ini tidak dipakai.
  const buatBuktiDummy = (label, warna = '#0f766e') => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='560'>
      <rect width='420' height='560' fill='#f1f5f9'/>
      <rect x='20' y='20' width='380' height='520' fill='#ffffff' stroke='#cbd5e1' stroke-width='2' rx='16'/>
      <rect x='20' y='20' width='380' height='90' fill='${warna}' rx='16'/>
      <rect x='20' y='90' width='380' height='20' fill='${warna}'/>
      <text x='210' y='65' font-family='Arial' font-size='20' font-weight='bold' fill='#ffffff' text-anchor='middle'>BUKTI TRANSFER (SIMULASI)</text>
      <text x='210' y='260' font-family='Arial' font-size='22' font-weight='bold' fill='#0f172a' text-anchor='middle'>${label}</text>
      <text x='210' y='300' font-family='Arial' font-size='13' fill='#64748b' text-anchor='middle'>Contoh data demo aplikasi</text>
      <text x='210' y='480' font-family='Arial' font-size='11' fill='#94a3b8' text-anchor='middle'>Upload bukti asli akan tampil sesuai file yang diunggah</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };

  const [iuranMatrix, setIuranMatrix] = useState([
    { userNama: 'Hidayat', bulanId: 1, bulanNama: 'Januari', nominal: 45000, status: 'LUNAS', tglBayar: '10 Januari 2026', buktiUrl: buatBuktiDummy('Hidayat - Januari 2026'), buktiNamaFile: 'bukti_jan.jpg' },
    { userNama: 'Hidayat', bulanId: 2, bulanNama: 'Februari', nominal: 45000, status: 'LUNAS', tglBayar: '09 Februari 2026', buktiUrl: buatBuktiDummy('Hidayat - Februari 2026'), buktiNamaFile: 'bukti_feb.jpg' },
    { userNama: 'Hidayat', bulanId: 3, bulanNama: 'Maret', nominal: 45000, status: 'MENUNGGU VERIFIKASI', tglBayar: '11 Juli 2026', buktiUrl: buatBuktiDummy('Hidayat - Maret 2026', '#b45309'), buktiNamaFile: 'bukti_mar.jpg' },
    { userNama: 'Ahmad Fauzi', bulanId: 1, bulanNama: 'Januari', nominal: 45000, status: 'LUNAS', tglBayar: '10 Januari 2026', buktiUrl: buatBuktiDummy('Ahmad Fauzi - Januari 2026'), buktiNamaFile: 'bukti_fauzi.jpg' },
    { userNama: 'Ahmad Fauzi', bulanId: 2, bulanNama: 'Februari', nominal: 45000, status: 'MENUNGGU VERIFIKASI', tglBayar: '11 Juli 2026', buktiUrl: buatBuktiDummy('Ahmad Fauzi - Februari 2026', '#b45309'), buktiNamaFile: 'bukti_fauzi2.jpg' },
  ]);

  // ==========================================
  // 4. KEGIATAN / DOKUMENTASI (DENGAN FOTO, TERARSIP PER TAHUN)
  // ==========================================
  const [periodeTahun, setPeriodeTahun] = useState(2026);

  // ==========================================
  // MANAJEMEN PERIODE (BUKA/TUTUP PROJECT PER TAHUN)
  // Setiap periode punya nomor resmi format No/Bulan(Romawi)/Tahun.
  // Saat admin menutup periode, seluruh data (anggota, iuran, kegiatan) diarsipkan
  // permanen ke riwayatPeriode (riwayat & laporan TIDAK hilang), lalu periode baru
  // otomatis dibuka dengan nomor baru dan status "Berjalan".
  // ==========================================
  const [nomorUrutPeriode, setNomorUrutPeriode] = useState(1);
  const [periodeAktif, setPeriodeAktif] = useState({ noPeriode: '001/VII/2026', tahun: 2026, status: 'Berjalan', tanggalMulai: '11 Jul 2026' });
  const [riwayatPeriode, setRiwayatPeriode] = useState([]);

  const romawiBulan = (bulan) => ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][bulan - 1] || 'I';
  const buatNomorPeriode = (urut, tahun, bulan) => `${String(urut).padStart(3, '0')}/${romawiBulan(bulan)}/${tahun}`;
  const BULAN_BERJALAN = 7; // Juli 2026 (mengikuti tanggal simulasi aplikasi)

  // ==========================================
  // MANAJEMEN BLOK RUMAH (PENGELOMPOKAN WILAYAH RT)
  // Setiap blok yang dibentuk admin mendapat KODE BLOK otomatis
  // format No/BulanRomawi/Tahun (mis. 001/VII/2026 utk blok pertama,
  // lalu 002/VII/2026 utk blok berikutnya, dst). Riwayat blok TIDAK
  // pernah dihapus, hanya ditutup (status Progress -> Closed) agar
  // histori tetap tersimpan permanen. Setiap perpindahan warga antar
  // blok juga dicatat di riwayatPindahKelompok sebagai log histori.
  // ==========================================
  const [nomorUrutKelompok, setNomorUrutKelompok] = useState(23); // 001-002 (Blok A/B) & 003-022 (contoh Blok F1-F14, G1-G6) sudah dipakai data awal
  const [kelompokList, setKelompokList] = useState([
    { id: 'GRP-01', nama: 'Blok A', jenis: 'Rumah', kapasitas: 50, noPengajuan: '001/VII/2026', status: 'Progress', tglDibuat: '11 Jul 2026' },
    { id: 'GRP-02', nama: 'Blok B', jenis: 'Rumah', kapasitas: 50, noPengajuan: '002/VII/2026', status: 'Progress', tglDibuat: '11 Jul 2026' },
    ...kelompokTambahanBlokFG, // contoh/dummy Blok F1-F14 & G1-G6
  ]);
  const [formKelompokBaru, setFormKelompokBaru] = useState({ nama: '', jenis: 'Rumah', noPengajuanManual: '' });
  // ID blok yang sedang diedit admin (null = mode tambah baru). Dipakai
  // supaya admin bisa mengubah nama blok & MENGETIK MANUAL Kode Blok
  // yang sudah ada (sebelumnya nomor hanya bisa dibuat otomatis).
  const [editingKelompokId, setEditingKelompokId] = useState(null);
  const [riwayatPindahKelompok, setRiwayatPindahKelompok] = useState([]);

  const getKelompokInfo = (namaKelompok) => kelompokList.find(k => k.nama === namaKelompok);

  const [kegiatanList, setKegiatanList] = useState([
    { id: 'KG-01', judul: 'Rapat Rutin Warga RT 40/08', tanggal: '01 Jun 2026', jam: '19:30', tempat: 'Balai Warga RT 40/08', pembicara: 'Ketua RT', detail: 'Membahas laporan iuran bulanan, rencana kegiatan, dan usulan warga.', foto: null },
    { id: 'KG-02', judul: 'Kerja Bakti Lingkungan', tanggal: '05 Jun 2026', jam: '08:00', tempat: 'Halaman RT', pembicara: 'Seluruh Warga', detail: 'Gotong royong membersihkan lingkungan RT 40/08 bersama seluruh warga.', foto: null },
    { id: 'KG-03', judul: 'Ronda Malam Bergilir', tanggal: '17 Jun 2026', jam: '21:00', tempat: 'Pos Ronda RT', pembicara: 'Pengurus Keamanan RT', detail: 'Jadwal ronda malam bergilir untuk menjaga keamanan lingkungan RT 40/08.', foto: null },
    { id: 'KG-04', judul: 'Pengajian Rutin "Manfaat Istigfar"', tanggal: '29 Jul 2026', jam: '19:40', tempat: "RT Jami' Nurul Falah", pembicara: "Ustad Sana'an", detail: 'Kajian rutin membahas keutamaan dan manfaat istigfar dalam kehidupan sehari-hari, terbuka untuk seluruh warga.', foto: null },
  ]);
  const [formKegiatan, setFormKegiatan] = useState({ judul: '', tanggal: '', jam: '', tempat: '', pembicara: '', detail: '', foto: null });
  const [editingKegiatanId, setEditingKegiatanId] = useState(null);


  // ==========================================
  // TOAST NOTIFIKASI (PENGGANTI ALERT, LEBIH PROFESIONAL)
  // ==========================================
  const [toast, setToast] = useState(null);
  const showToast = (teks, tipe = 'sukses') => {
    setToast({ teks, tipe });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3200);
  };

  // ==========================================
  // STATE MODAL, EMAIL SIMULASI & PENDAFTARAN BARU
  // ==========================================
  const [selectedKuitansi, setSelectedKuitansi] = useState(null);
  const [previewBukti, setPreviewBukti] = useState(null); // { userNama, bulanNama, nominal, tglBayar, buktiUrl, buktiNamaFile, status }
  const [showEmailModal, setShowEmailModal] = useState(null);
  const [konfirmasiUploadBukti, setKonfirmasiUploadBukti] = useState(null); // { file, bulanNama, tanggalBayar, nominal }
  const [konfirmasiApprove, setKonfirmasiApprove] = useState(null); // { userNama, bulanNama, nominal, dariPreview }
  const [pengajuanBaru, setPengajuanBaru] = useState([
    { id: 'REQ-99', nama: 'Budi Santoso', email: 'budi@mail.com', wa: '081399887766', nomorRumah: 'Blok C No. 2', target: 540000, tglDaftar: '11 Jul 2026', statusRumah: 'Kontrak', anggotaKeluarga: [
      { id: 'AK-04', nama: 'Nur Halimah', hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1995-02-14' },
      { id: 'AK-05', nama: 'Naila Putri', hubungan: 'Anak ke-1', jenisKelamin: 'Perempuan', tanggalLahir: '2020-06-09' },
    ] }
  ]);

  // ==========================================
  // DAFTAR PILIHAN BLOK & NOMOR RUMAH (dipakai di dropdown Form Pendaftaran)
  // -----------------------------------------------------------
  // Blok Rumah: F1 s/d F14, dan G1 s/d G6.
  // Nomor Rumah: 1 s/d 11, lalu 12A (menggantikan nomor 13), lalu 14 s/d 25.
  // ==========================================
  const DAFTAR_BLOK_RUMAH = [
    ...Array.from({ length: 14 }, (_, i) => `F${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `G${i + 1}`),
  ];
  const DAFTAR_NOMOR_RUMAH = [
    ...Array.from({ length: 11 }, (_, i) => String(i + 1)),
    '12A',
    ...Array.from({ length: 12 }, (_, i) => String(i + 14)),
  ];

  // ==========================================
  // USIA OTOMATIS & KATEGORI USIA (ANGGOTA KELUARGA)
  // -----------------------------------------------------------
  // hitungUsia: menghitung usia (tahun, otomatis mengikuti tanggal HARI INI)
  // dari tanggal lahir yang diinput. kategoriUsia: mengelompokkan usia ke
  // salah satu dari 5 kategori baku, dipakai di tab "Anggota Keluarga" user
  // maupun rekap otomatis per Blok Rumah untuk admin.
  // ==========================================
  const hitungUsia = (tanggalLahir) => {
    if (!tanggalLahir) return null;
    const lahir = new Date(tanggalLahir);
    if (isNaN(lahir.getTime())) return null;
    const now = new Date();
    let usia = now.getFullYear() - lahir.getFullYear();
    const belumUlangTahun = (now.getMonth() < lahir.getMonth()) || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
    if (belumUlangTahun) usia--;
    return Math.max(0, usia);
  };
  const KATEGORI_USIA_LIST = ['Balita (0-5)', 'Anak-anak (6-12)', 'Remaja (13-17)', 'Dewasa (18-59)', 'Lansia (60+)'];
  // Daftar pilihan hubungan keluarga untuk tiap anggota keluarga yang didaftarkan
  // (dipilih saat pendaftaran maupun saat menambah anggota baru di akun user).
  const HUBUNGAN_KELUARGA_LIST = ['Suami', 'Istri', 'Anak ke-1', 'Anak ke-2', 'Anak ke-3', 'Anak ke-4', 'Anak ke-5'];
  const kategoriUsia = (usia) => {
    if (usia === null || usia === undefined) return '-';
    if (usia <= 5) return 'Balita (0-5)';
    if (usia <= 12) return 'Anak-anak (6-12)';
    if (usia <= 17) return 'Remaja (13-17)';
    if (usia <= 59) return 'Dewasa (18-59)';
    return 'Lansia (60+)';
  };
  // Mengembalikan REKAP jumlah anggota keluarga per kategori usia untuk daftar
  // member tertentu (dipakai admin di panel Rekap Blok Rumah, per blok).
  const getRekapKategoriUsia = (daftarMember) => {
    const rekap = {}; KATEGORI_USIA_LIST.forEach(k => { rekap[k] = 0; });
    daftarMember.forEach(m => {
      (m.anggotaKeluarga || []).forEach(a => {
        const usia = hitungUsia(a.tanggalLahir);
        const kat = kategoriUsia(usia);
        if (rekap[kat] !== undefined) rekap[kat]++;
      });
    });
    return rekap;
  };

  const [formDaftar, setFormDaftar] = useState({ nama: '', blokRumah: DAFTAR_BLOK_RUMAH[0], nomorRumahUnit: DAFTAR_NOMOR_RUMAH[0], email: '', wa: '', alamat: '', statusRumah: 'Milik Sendiri', anggotaKeluarga: [] });

  // KELOLA BARIS ANGGOTA KELUARGA (ISTRI & ANAK) PADA FORM PENDAFTARAN
  const handleTambahBarisAnggotaDaftar = () => {
    setFormDaftar(prev => ({ ...prev, anggotaKeluarga: [...prev.anggotaKeluarga, { id: 'AK-' + Date.now() + '-' + Math.floor(Math.random() * 1000), nama: '', hubungan: HUBUNGAN_KELUARGA_LIST[0], jenisKelamin: 'Perempuan', tanggalLahir: '' }] }));
  };
  const handleHapusBarisAnggotaDaftar = (id) => {
    setFormDaftar(prev => ({ ...prev, anggotaKeluarga: prev.anggotaKeluarga.filter(a => a.id !== id) }));
  };
  const handleUbahBarisAnggotaDaftar = (id, field, value) => {
    setFormDaftar(prev => ({ ...prev, anggotaKeluarga: prev.anggotaKeluarga.map(a => a.id === id ? { ...a, [field]: value } : a) }));
  };

  // ==========================================
  // KELOLA ANGGOTA KELUARGA DARI DASHBOARD USER (tab "Anggota Keluarga")
  // -----------------------------------------------------------
  // User yang sudah login (bukan sesi simulasi) bisa menambah/menghapus
  // anggota keluarganya sendiri kapan saja setelah aktivasi (mis. anak baru
  // lahir). Perubahan langsung memperbarui `members` (via updateMembers,
  // otomatis sync ke Google Sheets) DAN `activeUserSession` supaya tampilan
  // di tab ini langsung update, serta otomatis ikut terhitung di rekap
  // kategori usia per Blok Rumah yang dilihat admin.
  // ==========================================
  const [formTambahAnggotaUser, setFormTambahAnggotaUser] = useState({ nama: '', hubungan: 'Suami', jenisKelamin: 'Perempuan', tanggalLahir: '' });
  const handleTambahAnggotaKeluargaUser = (e) => {
    e.preventDefault();
    if (isSimulatedSession) {
      showToast('Ini tampilan simulasi. Login dengan akun resmi untuk menambah anggota keluarga.', 'error');
      return;
    }
    if (!formTambahAnggotaUser.nama.trim() || !formTambahAnggotaUser.tanggalLahir) {
      showToast('Nama dan tanggal lahir anggota keluarga wajib diisi.', 'error');
      return;
    }
    const anggotaBaru = { id: 'AK-' + Date.now(), nama: formTambahAnggotaUser.nama.trim(), hubungan: formTambahAnggotaUser.hubungan, jenisKelamin: formTambahAnggotaUser.jenisKelamin, tanggalLahir: formTambahAnggotaUser.tanggalLahir };
    const daftarBaru = [...(activeUserSession.anggotaKeluarga || []), anggotaBaru];
    updateMembers(members.map(m => m.id === activeUserSession.id ? { ...m, anggotaKeluarga: daftarBaru } : m));
    setActiveUserSession(prev => ({ ...prev, anggotaKeluarga: daftarBaru }));
    setFormTambahAnggotaUser({ nama: '', hubungan: 'Suami', jenisKelamin: 'Perempuan', tanggalLahir: '' });
    showToast('Anggota keluarga berhasil ditambahkan.');
  };
  const handleHapusAnggotaKeluargaUser = (id) => {
    if (isSimulatedSession) {
      showToast('Ini tampilan simulasi. Login dengan akun resmi untuk mengelola anggota keluarga.', 'error');
      return;
    }
    const daftarBaru = (activeUserSession.anggotaKeluarga || []).filter(a => a.id !== id);
    updateMembers(members.map(m => m.id === activeUserSession.id ? { ...m, anggotaKeluarga: daftarBaru } : m));
    setActiveUserSession(prev => ({ ...prev, anggotaKeluarga: daftarBaru }));
    showToast('Anggota keluarga berhasil dihapus.', 'error');
  };

  // PILIHAN KELOMPOK PER PENGAJUAN SAAT ADMIN AKAN AKTIVASI (REQ-ID -> NAMA KELOMPOK)
  const [pilihanKelompokPengajuan, setPilihanKelompokPengajuan] = useState({});
  const [pilihanAksesPengajuan, setPilihanAksesPengajuan] = useState({}); // { [reqId]: 'user' | 'admin' } - pilihan akses saat aktivasi warga baru

  // FILTER TABEL "DATA SEMUA WARGA" (ADMIN) - pencarian nama & filter blok
  const [filterDataWargaNama, setFilterDataWargaNama] = useState('');
  const [filterDataWargaBlok, setFilterDataWargaBlok] = useState('Semua');
  const [formBayarInput, setFormBayarInput] = useState({}); // { [bulanNama]: { tanggal, nominal } } - input manual tanggal & nominal transaksi oleh warga

  // FORM UBAH PASSWORD (USER)
  const [formUbahPassword, setFormUbahPassword] = useState({ lama: '', baru: '', konfirmasi: '' });
  const [passwordMsg, setPasswordMsg] = useState({ tipe: '', teks: '' });

  // ==========================================
  // FORM LOGIN RESMI (USERNAME & PASSWORD) - WEB UTAMA
  // ==========================================
  const [formLogin, setFormLogin] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // ==========================================
  // LOGIN ADMIN/PANITIA (TERPISAH DARI LOGIN WARGA)
  // Akses Admin Panel HANYA bisa didapat lewat login ini, bukan tombol bebas.
  // ==========================================
  const [adminAccount, setAdminAccount] = useState({ username: 'admin', password: 'admin123' });
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [showAdminLoginForm, setShowAdminLoginForm] = useState(false);
  const [formAdminLogin, setFormAdminLogin] = useState({ username: '', password: '' });
  const [adminLoginError, setAdminLoginError] = useState('');
  const [formAdminAccount, setFormAdminAccount] = useState({ username: 'admin', password: '', passwordBaru: '', konfirmasiPassword: '' });
  const [adminAccountMsg, setAdminAccountMsg] = useState({ tipe: '', teks: '' });

  // ==========================================
  // PANEL KONTROL ANGGOTA - CENTANG UNTUK AKSI MASSAL
  // ==========================================
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // ==========================================
  // SHOW/HIDE PASSWORD (ADMIN) - AKSES PENUH ADMIN
  // Admin (akses penuh) bisa menampilkan password asli tiap warga maupun
  // password login Admin Panel miliknya sendiri, per baris (toggle mata).
  // ==========================================
  const [visiblePasswordIds, setVisiblePasswordIds] = useState([]);
  const togglePasswordVisibility = (id) => {
    setVisiblePasswordIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const [adminOwnPasswordVisible, setAdminOwnPasswordVisible] = useState(false);

  // ==========================================
  // AGENDA UTAMA / SPESIAL (TAMPIL LEBIH BESAR DARI KEGIATAN BIASA)
  // ==========================================
  const [agendaUtama, setAgendaUtama] = useState({
    judul: 'Kerja Bakti Akbar & Silaturahmi Warga RT 40/08',
    tanggal: '17 Agu 2026',
    jam: '07:00',
    tempat: 'Lapangan RT 40 RW 08',
    pembicara: 'Seluruh Pengurus RT',
    detail: 'Agenda gotong royong membersihkan lingkungan sekaligus silaturahmi antarwarga RT 40 RW 08. Seluruh warga dipersilakan hadir dan berpartisipasi.',
    foto: null
  });
  const [formAgendaUtama, setFormAgendaUtama] = useState({ ...agendaUtama });

  // IURAN_BULANAN: nominal iuran wajib bulanan untuk SETIAP warga/rumah,
  // besarnya SAMA RATA untuk semua warga (tidak ada pilihan "paket" lagi
  // seperti sebelumnya, karena ini iuran rutin
  // rutin bulanan warga RT 40 RW 08).
  const IURAN_BULANAN = 45000;
  // TARGET_TAHUNAN dipakai sebagai acuan "target" per anggota (dipertahankan
  // supaya seluruh logika persentase capaian & rekap yang sudah ada tetap
  // berjalan tanpa perlu diubah satu per satu): 12 bulan x Rp45.000.
  const TARGET_TAHUNAN = IURAN_BULANAN * 12;

  // ==========================================
  // REAL-TIME METRIC CALCULATION (USER)
  // ==========================================
  const userRows = iuranMatrix.filter(item => item.userNama === activeUserSession.nama);
  const userDanaMasuk = userRows.filter(r => r.status === 'LUNAS').reduce((acc, r) => acc + r.nominal, 0);
  const userSisaTagihan = Math.max(0, activeUserSession.target - userDanaMasuk);
  const persentaseCapaian = Math.min(100, Math.round((userDanaMasuk / activeUserSession.target) * 100));


  // CICILAN DINAMIS: setiap kali ada pembayaran dengan nominal custom (tidak sama dengan
  // cicilan standar), sisa tagihan dihitung ulang lalu dibagi rata ke bulan-bulan yang
  // masih "BELUM BAYAR" (belum ada catatan sama sekali). Jadi nominal yang tampil di kolom
  // "Nominal" bulan-bulan berikutnya otomatis menyesuaikan, bukan angka tetap 300rb lagi.
  const userTerbayarAtauPending = userRows
    .filter(r => r.status === 'LUNAS' || r.status === 'MENUNGGU VERIFIKASI')
    .reduce((acc, r) => acc + r.nominal, 0);
  const userSisaUntukDicicil = Math.max(0, activeUserSession.target - userTerbayarAtauPending);
  const userBulanBelumBayar = DAFTAR_BULAN.filter(bln => !userRows.find(r => r.bulanNama === bln.nama));
  const userCicilanSuggest = userBulanBelumBayar.length > 0
    ? Math.max(1000, Math.ceil((userSisaUntukDicicil / userBulanBelumBayar.length) / 1000) * 1000)
    : 0;

  // ==========================================
  // REAL-TIME METRIC CALCULATION (ADMIN)
  // ==========================================
  const totalDanaMasukGlobal = iuranMatrix.filter(r => r.status === 'LUNAS').reduce((acc, r) => acc + r.nominal, 0);
  const totalSisaGlobal = members.reduce((acc, m) => acc + m.target, 0) - totalDanaMasukGlobal;
  const totalVerifPendingGlobal = iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').reduce((acc, r) => acc + r.nominal, 0);
  const jumlahAktif = members.filter(m => m.statusAnggota === 'Aktif').length;

  // ==========================================
  // NOTIFIKASI MILIK AKUN YANG SEDANG AKTIF (USER atau ADMIN)
  // ==========================================
  const notifikasiSaya = notifikasiList.filter(n => n.untuk === (role === 'admin' ? 'admin' : activeUserSession.id));
  const jumlahNotifBelumDibaca = notifikasiSaya.filter(n => !n.dibaca).length;


  // ==========================================
  // REKAPAN PER NAMA UNTUK MONITORING ADMIN
  // ==========================================
  const rekapPerAnggota = members.map(m => {
    const rows = iuranMatrix.filter(r => r.userNama === m.nama);
    const dibayar = rows.filter(r => r.status === 'LUNAS').reduce((acc, r) => acc + r.nominal, 0);
    const pending = rows.filter(r => r.status === 'MENUNGGU VERIFIKASI').reduce((acc, r) => acc + r.nominal, 0);
    const sisa = Math.max(0, m.target - dibayar);
    const persen = Math.min(100, Math.round((dibayar / m.target) * 100));
    const bulanLunas = rows.filter(r => r.status === 'LUNAS').length;
    return { ...m, dibayar, pending, sisa, persen, bulanLunas };
  });

  // ==========================================
  // REKAP DANA MASUK PER NOMOR PENGAJUAN KELOMPOK (UTK SUMMARY + DRILL-DOWN)
  // Supaya kelihatan misal No. 001/VII/2026 seharusnya terkumpul Rp 1.000.000
  // tapi baru Rp 500.000 - lalu bisa di-drill-down anggota mana yang belum bayar.
  // ==========================================
  const rekapPerNomorPengajuan = kelompokList.map(k => {
    const anggotaKelompok = rekapPerAnggota.filter(m => m.kelompok === k.nama);
    const targetKelompok = anggotaKelompok.reduce((acc, m) => acc + m.target, 0);
    const masukKelompok = anggotaKelompok.reduce((acc, m) => acc + m.dibayar, 0);
    const pendingKelompok = anggotaKelompok.reduce((acc, m) => acc + m.pending, 0);
    const sisaKelompok = Math.max(0, targetKelompok - masukKelompok);
    const persenKelompok = targetKelompok > 0 ? Math.min(100, Math.round((masukKelompok / targetKelompok) * 100)) : 0;
    const anggotaBelumLunas = anggotaKelompok.filter(m => m.sisa > 0);
    return { ...k, anggotaKelompok, targetKelompok, masukKelompok, pendingKelompok, sisaKelompok, persenKelompok, anggotaBelumLunas };
  });

  // ==========================================
  // RIWAYAT PEMBAYARAN SELURUH WARGA: FILTER NAMA + SORT A-Z/Z-A UTK ADMIN
  // ==========================================
  const riwayatPembayaranAdminTampil = (() => {
    let rows = iuranMatrix.filter(r => adminTimelineFilter === 'Semua' || r.userNama === adminTimelineFilter);
    if (adminCariNama.trim()) {
      rows = rows.filter(r => r.userNama.toLowerCase().includes(adminCariNama.trim().toLowerCase()));
    }
    rows = rows.slice().reverse();
    if (adminSortNamaDir === 'asc') rows = rows.slice().sort((a, b) => a.userNama.localeCompare(b.userNama));
    if (adminSortNamaDir === 'desc') rows = rows.slice().sort((a, b) => b.userNama.localeCompare(a.userNama));
    return rows;
  })();

  // ==========================================
  // TIMELINE PEMBAYARAN JAN - DES (BISA DIFILTER PER WARGA)
  // ==========================================
  const getMonthlyTimeline = (filterNama) => {
    return DAFTAR_BULAN.map(bln => {
      const rows = iuranMatrix.filter(r => r.bulanNama === bln.nama && (!filterNama || filterNama === 'Semua' || r.userNama === filterNama));
      const totalMasuk = rows.filter(r => r.status === 'LUNAS').reduce((acc, r) => acc + r.nominal, 0);
      return { ...bln, totalMasuk, jumlahTransaksi: rows.filter(r => r.status === 'LUNAS').length };
    });
  };
  const userTimeline = getMonthlyTimeline(activeUserSession.nama);
  const adminTimeline = getMonthlyTimeline(adminTimelineFilter);
  const maxTimelineValue = Math.max(1, ...adminTimeline.map(b => b.totalMasuk), ...userTimeline.map(b => b.totalMasuk));

  const BarTimeline = ({ data }) => (
    <div className="flex items-end gap-2 h-32 mt-4">
      {data.map(bln => {
        const heightPct = Math.max(4, Math.round((bln.totalMasuk / maxTimelineValue) * 100));
        return (
          <div key={bln.id} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[9px] font-bold text-slate-400 group-hover:text-emerald-700">{bln.totalMasuk > 0 ? `${Math.round(bln.totalMasuk / 1000)}rb` : ''}</span>
            <div className="w-full bg-slate-100 rounded-md overflow-hidden flex items-end" style={{ height: '84px' }}>
              <div className="w-full bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t-md transition-all duration-500" style={{ height: `${heightPct}%` }}></div>
            </div>
            <span className="text-[9px] font-bold text-slate-500">{bln.nama.slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );

  // ==========================================
  // HELPER: GENERATOR PASSWORD ACAK
  // ==========================================
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  // HELPER: UBAH NILAI <input type="date"> (YYYY-MM-DD) MENJADI FORMAT TANGGAL INDONESIA
  // Contoh: '2026-07-11' -> '11 Juli 2026'
  const formatTanggalIndo = (isoDate) => {
    if (!isoDate) return '-';
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    const namaBulanLengkap = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d} ${namaBulanLengkap[m - 1]} ${y}`;
  };

  // HELPER: PISAHKAN "TANGGAL & JAM PELUNASAN" MENJADI DUA BAGIAN TERPISAH
  // Contoh input: '11 Juli 2026, 14.05 WIB' -> { tanggal: '11 Juli 2026', jam: '14.05 WIB' }
  // Kalau tidak ada koma (data lama/tanpa jam), jam ditampilkan '-'.
  const pisahTanggalJam = (waktu) => {
    if (!waktu) return { tanggal: '-', jam: '-' };
    const cocok = waktu.match(/(\d{1,2}[.:]\d{2}(?:\s*WIB)?)\s*$/i);
    if (cocok) {
      const jam = cocok[1].trim();
      const tanggal = waktu.slice(0, cocok.index).replace(/(,|pukul)+\s*$/i, '').trim();
      return { tanggal: tanggal || waktu.trim(), jam };
    }
    return { tanggal: waktu.trim(), jam: '-' };
  };

  // HELPER: PESAN PENGUMUMAN RT YANG SEDANG DITAMPILKAN
  // Menggantikan fitur "Jadwal Sholat" - menampilkan salah satu pengumuman
  // dari infoPengumumanList secara bergantian mengikuti detik berjalan,
  // supaya kotak info di Beranda selalu ada isinya.
  const getPengumumanBerjalan = () => {
    const daftar = cmsTeks.infoPengumumanList || [];
    if (!daftar.length) return 'Belum ada pengumuman dari pengurus RT.';
    const [, , detik] = jamSekarang.split(':').map(Number);
    const idx = Number.isNaN(detik) ? 0 : Math.floor(detik / 10) % daftar.length;
    return daftar[idx];
  };

  const kirimEmailSimulasi = ({ to, nama, subject, bodyLines }) => {
    const email = { to, nama, subject, bodyLines, waktu: '11 Jul 2026, 14:20 WIB' };
    setShowEmailModal(email);
  };

  // ==========================================
  // CONTROLLER ACTIONS - CMS
  // ==========================================
  const saveCms = () => {
    const teksBaru = {
      ...cmsTeks,
      namaRT: cmsForm.namaRT,
      alamatRT: cmsForm.alamatRT,
      noRekening: cmsForm.noRekening,
      judulBeranda: cmsForm.judulBeranda,
      subJudulBeranda: cmsForm.subJudulBeranda,
      tagline: cmsForm.tagline,
      pengumuman: cmsForm.pengumuman,
      infoKontak: cmsForm.infoKontak,
      visi: cmsForm.visi,
      misi: cmsForm.misi,
      syaratList: cmsForm.syaratText.split('\n').map(s => s.trim()).filter(Boolean),
      ketentuanList: cmsForm.ketentuanText.split('\n').map(s => s.trim()).filter(Boolean),
      fotoLatarRT: cmsForm.fotoLatarRT,
      logoRT: cmsForm.logoRT,
      tandaTanganBendahara: cmsForm.tandaTanganBendahara,
      appsScriptUrl: (cmsForm.appsScriptUrl || '').trim(),
      panitiaKetua: cmsForm.panitiaKetua,
      panitiaSekretaris: cmsForm.panitiaSekretaris,
      panitiaBendahara: cmsForm.panitiaBendahara,
      panitiaHumas: cmsForm.panitiaHumas,
      fotoRTUmum: cmsForm.fotoRTUmum,
      deskripsiRT: cmsForm.deskripsiRT,
      luasRT: cmsForm.luasRT,
      infoPengumumanList: cmsForm.infoPengumumanList,
      asetRTList: cmsForm.asetRTList,
    };
    setCmsTeks(teksBaru);
    // Simpan URL Apps Script ke localStorage browser ini, supaya saat app dibuka
    // ulang (refresh / login lagi) otomatis tersambung lagi ke Google Sheets &
    // semua foto/data yang sudah diupload tetap muncul (lihat catatan di state cmsTeks).
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('iuran_rt_apps_script_url', teksBaru.appsScriptUrl || '');
    }
    // Sinkronkan seluruh konten teks & URL foto (bukan base64, karena foto sudah
    // diupload ke Google Drive lewat uploadFotoKeDrive saat file dipilih) ke sheet
    // "Pengaturan" -> 1 baris tunggal yang jadi sumber kebenaran untuk semua akun.
    if (teksBaru.appsScriptUrl) {
      syncSheet('Pengaturan', [{
        ...teksBaru,
        syaratList: teksBaru.syaratList.join('|'),
        ketentuanList: teksBaru.ketentuanList.join('|'),
        asetRTList: (teksBaru.asetRTList || []).join('|'),
        infoPengumumanList: (teksBaru.infoPengumumanList || []).join('|'),
      }]);
    }
    showToast('Seluruh konten website berhasil disimpan & langsung tersinkron ke semua akun warga!');
  };

  const handleFotoLatarChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('Mengunggah foto latar...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Logo-Latar');
    setCmsForm(prev => ({ ...prev, fotoLatarRT: url }));
    e.target.value = '';
  };

  const handleLogoRTChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      showToast('Ukuran file logo maksimal 2MB, silakan kompres dulu.', 'error');
      return;
    }
    showToast('Mengunggah logo...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Logo-Latar');
    setCmsForm(prev => ({ ...prev, logoRT: url }));
    e.target.value = '';
  };

  // ==========================================
  // UPLOAD TANDA TANGAN DIGITAL BENDAHARA RT
  // -----------------------------------------------------------
  // Admin/Bendahara upload foto/scan tanda tangan asli (disarankan format
  // PNG latar transparan) lewat menu Informasi Umum -> Susunan Pengurus.
  // Gambar ini otomatis dipakai di Kuitansi Digital sebagai pengganti
  // cap/stempel bulat, menggantikan tanda tangan penanggung jawab pembayaran.
  // ==========================================
  const handleTandaTanganChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      showToast('Ukuran file tanda tangan maksimal 2MB, silakan kompres dulu.', 'error');
      return;
    }
    showToast('Mengunggah tanda tangan digital...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Tanda-Tangan-Bendahara');
    setCmsForm(prev => ({ ...prev, tandaTanganBendahara: url }));
    e.target.value = '';
  };

  // UPLOAD FOTO ANGGOTA STRUKTUR RT (tampil di Web Utama, terlihat di semua akun)
  const handleFotoStrukturChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('Mengunggah foto pengurus...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Struktur-RT');
    setFormStrukturBaru(prev => ({ ...prev, foto: url }));
    e.target.value = '';
  };

  const handleTambahAnggotaStruktur = (e) => {
    e.preventDefault();
    if (!formStrukturBaru.nama.trim() || !formStrukturBaru.jabatan.trim()) {
      showToast('Nama dan jabatan anggota struktur RT wajib diisi.', 'error');
      return;
    }
    if (editingStrukturId) {
      updateStruktur(strukturRt.map(d => d.id === editingStrukturId ? { ...d, nama: formStrukturBaru.nama, jabatan: formStrukturBaru.jabatan, foto: formStrukturBaru.foto } : d));
      showToast('Data anggota struktur RT berhasil diperbarui & langsung tampil di Web Utama.');
    } else {
      updateStruktur([...strukturRt, { id: 'RT-' + Date.now(), nama: formStrukturBaru.nama, jabatan: formStrukturBaru.jabatan, foto: formStrukturBaru.foto }]);
      showToast('Anggota struktur RT berhasil ditambahkan & langsung tampil di Web Utama untuk semua akun.');
    }
    setFormStrukturBaru({ nama: '', jabatan: '', foto: null });
    setEditingStrukturId(null);
  };

  const handleEditAnggotaStruktur = (item) => {
    setEditingStrukturId(item.id);
    setFormStrukturBaru({ nama: item.nama, jabatan: item.jabatan, foto: item.foto });
  };

  const handleHapusAnggotaStruktur = (id) => {
    updateStruktur(strukturRt.filter(d => d.id !== id));
    if (editingStrukturId === id) { setEditingStrukturId(null); setFormStrukturBaru({ nama: '', jabatan: '', foto: null }); }
    showToast('Anggota struktur RT berhasil dihapus.', 'error');
  };

  // UPLOAD FOTO UMUM RT (tampil di panel "Informasi Umum RT" Web Utama)
  const handleFotoRTUmumChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('Mengunggah foto RT...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Logo-Latar');
    setCmsForm(prev => ({ ...prev, fotoRTUmum: url }));
    e.target.value = '';
  };

  // KELOLA DAFTAR ASET RT (tambah/hapus baris pada CMS Super Editor)
  const [inputAsetBaru, setInputAsetBaru] = useState('');
  const handleTambahAsetRT = (e) => {
    e.preventDefault();
    if (!inputAsetBaru.trim()) return;
    setCmsForm(prev => ({ ...prev, asetRTList: [...(prev.asetRTList || []), inputAsetBaru.trim()] }));
    setInputAsetBaru('');
  };
  const handleHapusAsetRT = (idx) => {
    setCmsForm(prev => ({ ...prev, asetRTList: (prev.asetRTList || []).filter((_, i) => i !== idx) }));
  };

  // KELOLA DAFTAR INFO & PENGUMUMAN RT (tambah/hapus baris pada CMS Super Editor)
  const [inputPengumumanBaru, setInputPengumumanBaru] = useState('');
  const handleTambahPengumuman = (e) => {
    e.preventDefault();
    if (!inputPengumumanBaru.trim()) return;
    setCmsForm(prev => ({ ...prev, infoPengumumanList: [...(prev.infoPengumumanList || []), inputPengumumanBaru.trim()] }));
    setInputPengumumanBaru('');
  };
  const handleHapusPengumuman = (idx) => {
    setCmsForm(prev => ({ ...prev, infoPengumumanList: (prev.infoPengumumanList || []).filter((_, i) => i !== idx) }));
  };

  // KELOLA RIWAYAT KAS MASUK/KELUAR (buku kas) - tambah/edit/hapus baris
  // transaksi lewat CMS Super Editor, saldo berjalan dihitung otomatis.
  const handleTambahRiwayatKasRt = (e) => {
    e.preventDefault();
    if (!formRiwayatKasRtBaru.tanggal || !formRiwayatKasRtBaru.keterangan.trim() || formRiwayatKasRtBaru.nominal === '' || Number(formRiwayatKasRtBaru.nominal) <= 0) {
      showToast('Tanggal, keterangan, dan nominal (lebih dari 0) wajib diisi.', 'error');
      return;
    }
    const tanggalTampil = new Date(formRiwayatKasRtBaru.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (editingRiwayatKasRtId) {
      updateRiwayatKasRt(riwayatKasRt.map(t => t.id === editingRiwayatKasRtId ? { ...t, tanggal: tanggalTampil, keterangan: formRiwayatKasRtBaru.keterangan.trim(), jenis: formRiwayatKasRtBaru.jenis, nominal: Number(formRiwayatKasRtBaru.nominal) } : t));
      showToast('Transaksi kas RT berhasil diperbarui.');
    } else {
      updateRiwayatKasRt([...riwayatKasRt, { id: 'KRT-' + Date.now(), tanggal: tanggalTampil, keterangan: formRiwayatKasRtBaru.keterangan.trim(), jenis: formRiwayatKasRtBaru.jenis, nominal: Number(formRiwayatKasRtBaru.nominal) }]);
      showToast('Transaksi kas RT baru berhasil dicatat & langsung tampil di Web Utama.');
    }
    setFormRiwayatKasRtBaru({ tanggal: '', keterangan: '', jenis: 'Masuk', nominal: '' });
    setEditingRiwayatKasRtId(null);
  };

  const handleEditRiwayatKasRt = (item) => {
    setEditingRiwayatKasRtId(item.id);
    setFormRiwayatKasRtBaru({ tanggal: '', keterangan: item.keterangan, jenis: item.jenis, nominal: item.nominal });
  };

  const handleHapusRiwayatKasRt = (id) => {
    updateRiwayatKasRt(riwayatKasRt.filter(t => t.id !== id));
    if (editingRiwayatKasRtId === id) { setEditingRiwayatKasRtId(null); setFormRiwayatKasRtBaru({ tanggal: '', keterangan: '', jenis: 'Masuk', nominal: '' }); }
    showToast('Transaksi kas RT berhasil dihapus.', 'error');
  };

  // ==========================================
  // CONTROLLER: REALISASI/LAPORAN BELANJA KAS RT (BUKTI FOTO, DARI BENDAHARA/ADMIN)
  // ==========================================
  const handleFotoRealisasiChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('Mengunggah bukti foto realisasi belanja...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Realisasi-Belanja');
    setFormRealisasiBaru(prev => ({ ...prev, buktiUrl: url, buktiNamaFile: file.name }));
    e.target.value = '';
  };

  const handleTambahRealisasiBelanja = (e) => {
    e.preventDefault();
    if (!formRealisasiBaru.keterangan.trim() || !formRealisasiBaru.nominal) {
      showToast('Keterangan dan nominal realisasi belanja wajib diisi.', 'error');
      return;
    }
    updateRealisasiBelanja(prev => [...prev, {
      id: 'RB-' + Date.now(),
      tanggal: formRealisasiBaru.tanggal ? formatTanggalIndo(formRealisasiBaru.tanggal) : '11 Jul 2026',
      kategori: formRealisasiBaru.kategori,
      keterangan: formRealisasiBaru.keterangan.trim(),
      nominal: Number(formRealisasiBaru.nominal) || 0,
      kelompok: formRealisasiBaru.kelompok,
      buktiUrl: formRealisasiBaru.buktiUrl,
      buktiNamaFile: formRealisasiBaru.buktiNamaFile,
      dicatatOleh: `${cmsTeks.panitiaBendahara} (Bendahara)`
    }]);
    showToast('Realisasi belanja kas RT berhasil dicatat & langsung tampil di Dashboard Warga.');
    setFormRealisasiBaru({ tanggal: '', kategori: 'Kebersihan', keterangan: '', nominal: '', kelompok: 'Semua', buktiUrl: null, buktiNamaFile: null });
  };

  const handleHapusRealisasiBelanja = (id) => {
    updateRealisasiBelanja(prev => prev.filter(r => r.id !== id));
    showToast('Data realisasi belanja dihapus.', 'error');
  };

  // UPLOAD LOGO CEPAT LANGSUNG DARI HEADER DASHBOARD (khusus Admin, tanpa perlu
  // buka menu CMS Super Editor dulu) - langsung tersimpan & tersinkron ke semua akun.
  const handleQuickLogoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      showToast('Ukuran file logo maksimal 2MB, silakan kompres dulu.', 'error');
      return;
    }
    showToast('Mengunggah logo...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Logo-Latar');
    const teksBaru = { ...cmsTeks, logoRT: url };
    setCmsTeks(teksBaru);
    setCmsForm(prev => ({ ...prev, logoRT: url }));
    if (teksBaru.appsScriptUrl) {
      syncSheet('Pengaturan', [{
        ...teksBaru,
        syaratList: teksBaru.syaratList.join('|'),
        ketentuanList: teksBaru.ketentuanList.join('|'),
        asetRTList: (teksBaru.asetRTList || []).join('|'),
        infoPengumumanList: (teksBaru.infoPengumumanList || []).join('|'),
      }]);
    }
    showToast('Logo RT berhasil diperbarui & langsung tampil untuk semua akun.');
    e.target.value = '';
  };

  const handleUpdateUserGroup = (userId, kelompokBaru) => {
    const member = members.find(m => m.id === userId);
    if (!member) return;
    const kelompokLama = member.kelompok;
    const updated = members.map(m => (m.id === userId ? { ...m, kelompok: kelompokBaru } : m));
    updateMembers(updated);
    const currentEdit = updated.find(m => m.id === activeUserSession.id);
    if (currentEdit) setActiveUserSession(currentEdit);

    if (kelompokLama !== kelompokBaru) {
      setRiwayatPindahKelompok(prev => [...prev, {
        id: 'MOV-' + Date.now(),
        memberNama: member.nama,
        dari: kelompokLama,
        ke: kelompokBaru,
        tanggal: '11 Jul 2026'
      }]);
      showToast(`${member.nama} dipindahkan dari "${kelompokLama}" ke "${kelompokBaru}".`);
    }
  };

  // ==========================================
  // CONTROLLER: KELOLA BLOK RUMAH
  // ==========================================
  const handleTambahKelompok = (e) => {
    e.preventDefault();
    if (!formKelompokBaru.nama.trim()) {
      showToast('Nama kelompok wajib diisi.', 'error');
      return;
    }
    const namaBentrok = kelompokList.some(k =>
      k.nama.toLowerCase() === formKelompokBaru.nama.trim().toLowerCase() && k.id !== editingKelompokId
    );
    if (namaBentrok) {
      showToast('Nama kelompok sudah ada, gunakan nama lain.', 'error');
      return;
    }
    const nomorManual = formKelompokBaru.noPengajuanManual.trim();
    // Kalau admin mengetik nomor manual, pastikan belum dipakai kelompok lain.
    if (nomorManual) {
      const nomorBentrok = kelompokList.some(k => k.noPengajuan === nomorManual && k.id !== editingKelompokId);
      if (nomorBentrok) {
        showToast('No. Pengajuan tersebut sudah dipakai kelompok lain.', 'error');
        return;
      }
    }
    const kapasitas = 50; // maksimal rumah per blok (dapat disesuaikan admin di kemudian hari)

    if (editingKelompokId) {
      // ---- MODE EDIT: ubah kelompok yang sudah ada ----
      updateKelompok(kelompokList.map(k => k.id === editingKelompokId ? {
        ...k,
        nama: formKelompokBaru.nama.trim(),
        jenis: formKelompokBaru.jenis,
        kapasitas,
        noPengajuan: nomorManual || k.noPengajuan,
      } : k));
      showToast(`Kelompok "${formKelompokBaru.nama.trim()}" berhasil diperbarui.`);
      setEditingKelompokId(null);
    } else {
      // ---- MODE TAMBAH: nomor otomatis, kecuali admin isi manual ----
      const noPengajuanBaru = nomorManual || buatNomorPeriode(nomorUrutKelompok, periodeTahun, BULAN_BERJALAN);
      updateKelompok([...kelompokList, {
        id: 'GRP-' + Date.now(),
        nama: formKelompokBaru.nama.trim(),
        jenis: formKelompokBaru.jenis,
        kapasitas,
        noPengajuan: noPengajuanBaru,
        status: 'Progress',
        tglDibuat: '11 Jul 2026'
      }]);
      if (!nomorManual) setNomorUrutKelompok(nomorUrutKelompok + 1);
      showToast(`Kelompok "${formKelompokBaru.nama.trim()}" berhasil diajukan dengan No. ${noPengajuanBaru}.`);
    }
    setFormKelompokBaru({ nama: '', jenis: 'Rumah', noPengajuanManual: '' });
  };

  // Isi form dengan data kelompok terpilih supaya admin bisa mengedit nama,
  // jenis, maupun MENGETIK ULANG (override manual) No. Pengajuan-nya.
  const handleEditKelompok = (k) => {
    setEditingKelompokId(k.id);
    setFormKelompokBaru({ nama: k.nama, jenis: k.jenis, noPengajuanManual: k.noPengajuan });
    showToast(`Mengedit kelompok "${k.nama}". Ubah data lalu klik "Simpan Perubahan".`);
  };

  const handleBatalEditKelompok = () => {
    setEditingKelompokId(null);
    setFormKelompokBaru({ nama: '', jenis: 'Rumah', noPengajuanManual: '' });
  };

  const handleToggleStatusKelompok = (id) => {
    updateKelompok(kelompokList.map(k => k.id === id ? { ...k, status: k.status === 'Progress' ? 'Closed' : 'Progress' } : k));
  };

  // ==========================================
  // HANDLER: PANEL KONTROL WARGA KELUAR (KHUSUS ADMIN)
  // -----------------------------------------------------------
  // Admin mengisi nama warga & blok yang keluar/pindah dari RT. Begitu
  // disimpan, data otomatis konek & tampil di Dashboard Warga (akun user)
  // lewat wargaKeluarList + updateWargaKeluar (sinkron Google Sheet).
  // ==========================================
  const handleSimpanWargaKeluar = () => {
    if (!formWargaKeluarBaru.nama.trim()) { showToast('Nama warga yang keluar wajib diisi.', 'error'); return; }
    if (!formWargaKeluarBaru.blok) { showToast('Blok warga yang keluar wajib dipilih.', 'error'); return; }
    const tanggalTampil = formWargaKeluarBaru.tanggalKeluar
      ? formatTanggalIndo(formWargaKeluarBaru.tanggalKeluar)
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    if (editingWargaKeluarId) {
      updateWargaKeluar(prev => prev.map(w => w.id === editingWargaKeluarId ? {
        ...w, nama: formWargaKeluarBaru.nama.trim(), blok: formWargaKeluarBaru.blok,
        tanggalKeluar: tanggalTampil, keterangan: formWargaKeluarBaru.keterangan.trim(),
      } : w));
      showToast(`Data warga keluar "${formWargaKeluarBaru.nama.trim()}" berhasil diperbarui.`);
    } else {
      updateWargaKeluar(prev => [...prev, {
        id: 'WK-' + Date.now(), nama: formWargaKeluarBaru.nama.trim(), blok: formWargaKeluarBaru.blok,
        tanggalKeluar: tanggalTampil, keterangan: formWargaKeluarBaru.keterangan.trim(),
      }]);
      showToast(`"${formWargaKeluarBaru.nama.trim()}" berhasil dicatat sebagai warga keluar dari ${formWargaKeluarBaru.blok}.`);
    }
    setFormWargaKeluarBaru({ nama: '', blok: '', tanggalKeluar: '', keterangan: '' });
    setEditingWargaKeluarId(null);
  };

  const handleEditWargaKeluar = (w) => {
    setEditingWargaKeluarId(w.id);
    setFormWargaKeluarBaru({ nama: w.nama, blok: w.blok, tanggalKeluar: '', keterangan: w.keterangan || '' });
    showToast(`Mengedit data warga keluar "${w.nama}". Ubah data lalu klik "Simpan Perubahan".`);
  };

  const handleBatalEditWargaKeluar = () => {
    setEditingWargaKeluarId(null);
    setFormWargaKeluarBaru({ nama: '', blok: '', tanggalKeluar: '', keterangan: '' });
  };

  const handleHapusWargaKeluar = (id) => {
    const target = wargaKeluarList.find(w => w.id === id);
    updateWargaKeluar(prev => prev.filter(w => w.id !== id));
    if (editingWargaKeluarId === id) handleBatalEditWargaKeluar();
    showToast(`Data warga keluar "${target ? target.nama : ''}" dihapus.`);
  };

  // Upload bukti transfer dari file ASLI yang dipilih user (hp/laptop/PC).
  // File dibaca jadi dataURL lalu disimpan di iuranMatrix (buktiUrl) sehingga
  // tersimpan permanen di riwayat -> bisa dilihat lagi oleh user yg bersangkutan
  // maupun admin/bendahara (rekapan per user) kapan pun, tanpa perlu upload ulang.
  // tanggal & nominal sekarang diisi manual oleh warga (lihat formBayarInput),
  // bukan lagi nilai baku/hardcode.
  const handleUploadBayar = (e, bulanNama, tanggalBayar, nominal) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!tanggalBayar) {
      showToast('Tanggal transaksi wajib diisi sebelum upload bukti.', 'error');
      e.target.value = '';
      return;
    }
    if (!nominal || Number(nominal) <= 0) {
      showToast('Jumlah/nominal transaksi wajib diisi dengan benar.', 'error');
      e.target.value = '';
      return;
    }
    const maksUkuranMB = 5;
    if (file.size > maksUkuranMB * 1024 * 1024) {
      showToast(`Ukuran file maksimal ${maksUkuranMB}MB.`, 'error');
      e.target.value = '';
      return;
    }
    // JANGAN langsung upload - tampilkan dulu modal konfirmasi "mohon cek kembali
    // sebelum kirim" supaya warga bisa memastikan data sudah benar.
    setKonfirmasiUploadBukti({ file, bulanNama, tanggalBayar, nominal });
    e.target.value = '';
  };

  // Dijalankan setelah warga menekan tombol "Kirim" di modal konfirmasi upload bukti.
  const handleKonfirmasiKirimBukti = async () => {
    if (!konfirmasiUploadBukti) return;
    const { file, bulanNama, tanggalBayar, nominal } = konfirmasiUploadBukti;
    setKonfirmasiUploadBukti(null);
    showToast('Mengunggah bukti transfer...', 'sukses');
    // Bukti transfer diupload sebagai FILE ASLI ke Google Drive (folder "Bukti-Transfer"),
    // bukan base64 di sel Sheet, supaya file besar tidak gagal tersimpan (batas ~50.000
    // karakter/sel Google Sheets). Yang disimpan ke Sheet & state hanya URL Drive-nya.
    const buktiUrl = await uploadFotoKeDrive(file, 'Bukti-Transfer');
    const recordBaru = {
      userNama: activeUserSession.nama,
      bulanId: DAFTAR_BULAN.find(b => b.nama === bulanNama).id,
      bulanNama,
      nominal: Number(nominal),
      status: 'MENUNGGU VERIFIKASI',
      tglBayar: formatTanggalIndo(tanggalBayar),
      buktiUrl,
      buktiNamaFile: file.name
    };
    // PENTING: ganti record lama untuk user+bulan yang sama (kalau ada), jangan selalu
    // "push" baru. Kalau di-push terus, bisa ada 2 record utk bulan yang sama, lalu
    // .find() di tabel selalu ambil yang PALING LAMA -> nominal & tanggal tampil salah
    // (inilah sebab nominal & tanggal custom yang diinput tidak muncul sebelumnya).
    updateIuran(prev => {
      const sudahAda = prev.some(item => item.userNama === activeUserSession.nama && item.bulanNama === bulanNama);
      return sudahAda
        ? prev.map(item => (item.userNama === activeUserSession.nama && item.bulanNama === bulanNama) ? recordBaru : item)
        : [...prev, recordBaru];
    });
    setFormBayarInput(prev => { const next = { ...prev }; delete next[bulanNama]; return next; });
    tambahNotifikasi({
      untuk: 'admin',
      judul: 'Menunggu Verifikasi Pembayaran',
      pesan: `${activeUserSession.nama} mengupload bukti transfer iuran bulan ${bulanNama} sebesar Rp ${Number(nominal).toLocaleString('id-ID')}.`,
      tipe: 'pending'
    });
    showToast(`Bukti transfer ${bulanNama} berhasil diunggah! Menunggu verifikasi Bendahara.`);
  };

  const handleApprovePembayaran = (userNama, bulanNama) => {
    // Catat tanggal & jam pelunasan (waktu nyata saat Bendahara memverifikasi)
    // supaya bisa ditampilkan lengkap (tanggal + jam) di Kuitansi Digital & QR verifikasi.
    const waktuVerifikasi = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
    updateIuran(iuranMatrix.map(item => (item.userNama === userNama && item.bulanNama === bulanNama) ? { ...item, status: 'LUNAS', waktuVerifikasi } : item));
    const targetMember = members.find(m => m.nama === userNama);
    if (targetMember) {
      tambahNotifikasi({
        untuk: targetMember.id,
        judul: 'Pembayaran Disetujui ✅',
        pesan: `Pembayaran iuran bulan ${bulanNama} Anda telah diverifikasi & disetujui Bendahara. Dana sudah masuk.`,
        tipe: 'sukses'
      });
    }
    showToast(`Pembayaran ${userNama} bulan ${bulanNama} disetujui.`);
  };

  const handleRejectPembayaran = (userNama, bulanNama) => {
    updateIuran(iuranMatrix.filter(item => !(item.userNama === userNama && item.bulanNama === bulanNama)));
    const targetMember = members.find(m => m.nama === userNama);
    if (targetMember) {
      tambahNotifikasi({
        untuk: targetMember.id,
        judul: 'Pembayaran Ditolak ✕',
        pesan: `Bukti transfer iuran bulan ${bulanNama} Anda ditolak Bendahara. Silakan upload ulang bukti transfer yang sesuai.`,
        tipe: 'gagal'
      });
    }
    showToast(`Pembayaran ${userNama} ditolak.`, 'error');
  };

  // Dipanggil saat admin/bendahara menekan "Ya, Sudah Sesuai" atau "Tidak, Tolak"
  // pada modal konfirmasi verifikasi pembayaran.
  const handleKonfirmasiVerifikasi = (sudahSesuai) => {
    if (!konfirmasiApprove) return;
    const { userNama, bulanNama, dariPreview } = konfirmasiApprove;
    if (sudahSesuai) {
      handleApprovePembayaran(userNama, bulanNama);
    } else {
      handleRejectPembayaran(userNama, bulanNama);
    }
    setKonfirmasiApprove(null);
    if (dariPreview) setPreviewBukti(null);
  };

  const toggleStatusAnggota = (id) => {
    updateMembers(members.map(m => m.id === id ? { ...m, statusAnggota: m.statusAnggota === 'Aktif' ? 'Pasif' : 'Aktif' } : m));
  };

  // ==========================================
  // PANEL KONTROL ANGGOTA - AKSI MASSAL (CENTANG / PILIH SEMUA / UBAH STATUS SEKALIGUS)
  // ==========================================
  const toggleSelectMember = (id) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAllMembers = (idsTampil) => {
    const semuaTerpilih = idsTampil.every(id => selectedMemberIds.includes(id));
    if (semuaTerpilih) {
      setSelectedMemberIds(prev => prev.filter(id => !idsTampil.includes(id)));
    } else {
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...idsTampil])));
    }
  };

  // Ubah status seluruh anggota yang sedang tercentang (atau seluruh anggota yang tampil bila tak ada centang)
  const handleUbahStatusMassal = (idsTarget, statusBaru) => {
    if (idsTarget.length === 0) {
      showToast('Pilih minimal satu anggota terlebih dahulu (centang), atau gunakan filter kelompok.', 'error');
      return;
    }
    const ok = window.confirm(`Ubah status ${idsTarget.length} anggota menjadi "${statusBaru}"?`);
    if (!ok) return;
    updateMembers(members.map(m => idsTarget.includes(m.id) ? { ...m, statusAnggota: statusBaru } : m));
    setSelectedMemberIds([]);
    showToast(`${idsTarget.length} anggota berhasil diubah menjadi status ${statusBaru}.`);
  };

  // ==========================================
  // LOGIN RESMI WARGA (USERNAME & PASSWORD) DARI WEB UTAMA
  // ==========================================
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const found = members.find(m => m.username.toLowerCase() === formLogin.username.trim().toLowerCase() && m.password === formLogin.password);
    if (!found) {
      setLoginError('Username atau password salah. Periksa kembali email aktivasi/reset password Anda.');
      return;
    }
    if (found.statusAnggota === 'Pasif') {
      setLoginError('Akun Anda berstatus Pasif. Silakan hubungi Bendahara/Panitia untuk mengaktifkan kembali.');
      return;
    }
    setActiveUserSession(found);
    setIsSimulatedSession(false); // login resmi -> seluruh laporan memakai data ASLI
    // Jika akses warga ini "admin" (diatur lewat Manajemen Akses), berikan akses penuh
    // setara Admin Panel. Jika "user" (default), akses tetap terbatas ke Dashboard Warga.
    if (found.akses === 'admin') {
      setRole('admin');
      setAdminLoggedIn(true);
    } else {
      setRole('user');
    }
    setView('dashboard');
    setActiveMenu('dashboard');
    setFormLogin({ username: '', password: '' });
    showToast(`Selamat datang, ${found.nama}!${found.akses === 'admin' ? ' Anda login dengan akses Admin (penuh).' : ''}`);
  };

  // ==========================================
  // LOGIN & LOGOUT ADMIN/PANITIA (TERPISAH)
  // ==========================================
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setAdminLoginError('');
    if (
      formAdminLogin.username.trim().toLowerCase() === adminAccount.username.toLowerCase() &&
      formAdminLogin.password === adminAccount.password
    ) {
      setAdminLoggedIn(true);
      setIsSimulatedSession(false);
      setRole('admin');
      setView('dashboard');
      setActiveMenu('dashboard');
      setShowAdminLoginForm(false);
      setFormAdminLogin({ username: '', password: '' });
      showToast('Selamat datang, Panitia/Admin!');
    } else {
      setAdminLoginError('Username atau password admin salah.');
    }
  };

  const handleAdminLogout = () => {
    setAdminLoggedIn(false);
    setRole('user');
    setView('landing');
    setActiveMenu('dashboard');
    showToast('Berhasil keluar dari Admin Panel.');
  };

  const handleSaveAdminAccount = (e) => {
    e.preventDefault();
    setAdminAccountMsg({ tipe: '', teks: '' });
    if (formAdminAccount.password !== adminAccount.password) {
      setAdminAccountMsg({ tipe: 'error', teks: 'Password saat ini salah.' });
      return;
    }
    if (!formAdminAccount.passwordBaru || formAdminAccount.passwordBaru.length < 6) {
      setAdminAccountMsg({ tipe: 'error', teks: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (formAdminAccount.passwordBaru !== formAdminAccount.konfirmasiPassword) {
      setAdminAccountMsg({ tipe: 'error', teks: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    setAdminAccount({ username: formAdminAccount.username.trim() || adminAccount.username, password: formAdminAccount.passwordBaru });
    setFormAdminAccount({ username: formAdminAccount.username.trim() || adminAccount.username, password: '', passwordBaru: '', konfirmasiPassword: '' });
    setAdminAccountMsg({ tipe: 'success', teks: 'Username & password login Admin Panel berhasil diperbarui.' });
    showToast('Akun login Admin Panel berhasil diperbarui.');
  };

  // ==========================================
  // HELPER: LINK WHATSAPP LANGSUNG DARI NOMOR KONTAK CMS
  // Mengubah 0812xxxx / +62812xxxx / 62812xxxx menjadi link wa.me yang valid
  // ==========================================
  const buatLinkWhatsapp = (nomor) => {
    if (!nomor) return '#';
    const digitSaja = String(nomor).replace(/[^0-9]/g, '');
    const nomorInternasional = digitSaja.startsWith('0') ? `62${digitSaja.slice(1)}` : digitSaja;
    return `https://wa.me/${nomorInternasional}`;
  };

  // ==========================================
  // HELPER: TAMBAH NOTIFIKASI KE AKUN (BADGE "BELUM DIBACA")
  // -----------------------------------------------------------
  // untuk: id anggota (mis. 'TR-02') untuk notifikasi ke warga tertentu,
  //        atau string 'admin' untuk notifikasi ke Admin/Bendahara.
  // ==========================================
  const tambahNotifikasi = ({ untuk, judul, pesan, tipe = 'info' }) => {
    updateNotifikasi(prev => [{
      id: 'NTF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      untuk, judul, pesan, tipe,
      waktu: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB',
      dibaca: false
    }, ...prev]);
  };

  const tandaiNotifikasiDibaca = (id) => {
    updateNotifikasi(prev => prev.map(n => n.id === id ? { ...n, dibaca: true } : n));
  };

  const tandaiSemuaNotifikasiDibaca = (untukSiapa) => {
    updateNotifikasi(prev => prev.map(n => n.untuk === untukSiapa ? { ...n, dibaca: true } : n));
  };

  // ==========================================
  // HELPER: KIRIM NOTIFIKASI WHATSAPP OTOMATIS KE NOMOR WARGA
  // -----------------------------------------------------------
  // PENTING - KETERBATASAN TEKNIS: karena aplikasi ini berjalan di browser
  // (tanpa server/backend WhatsApp Business API berbayar), pesan TIDAK bisa
  // benar-benar terkirim sendiri tanpa sentuhan sama sekali. Yang dilakukan
  // fungsi ini: otomatis MEMBUKA tab WhatsApp (wa.me) ke nomor warga yang
  // dituju dengan teks pesan yang SUDAH TERISI PENUH (nama, username,
  // password baru, dsb) - Admin/Bendahara tinggal menekan tombol kirim (▶)
  // satu kali di WhatsApp untuk benar-benar mengirimkannya. Ini adalah cara
  // paling realistis & gratis untuk "kirim WA otomatis" tanpa API berbayar.
  // ==========================================
  const kirimWaOtomatis = (nomor, pesan) => {
    if (!nomor) return;
    const link = `${buatLinkWhatsapp(nomor)}?text=${encodeURIComponent(pesan)}`;
    if (typeof window !== 'undefined') window.open(link, '_blank');
  };

  // ==========================================
  // CONTROLLER ACTIONS - AGENDA UTAMA / SPESIAL
  // ==========================================
  const handleFotoAgendaUtamaChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('Mengunggah foto agenda...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Kegiatan');
    setFormAgendaUtama(prev => ({ ...prev, foto: url }));
    e.target.value = '';
  };

  const handleSimpanAgendaUtama = (e) => {
    e.preventDefault();
    if (!formAgendaUtama.judul.trim()) {
      showToast('Judul agenda utama wajib diisi.', 'error');
      return;
    }
    updateAgendaUtama({ ...formAgendaUtama });
    showToast('Agenda utama berhasil disimpan & langsung tampil besar di halaman Beranda.');
  };

  const handleUserMendaftar = (e) => {
    e.preventDefault();
    if (!formDaftar.blokRumah || !formDaftar.nomorRumahUnit) {
      showToast('Blok Rumah dan Nomor Rumah wajib dipilih.', 'error');
      return;
    }
    if (!formDaftar.alamat.trim()) {
      showToast('Alamat tinggal wajib diisi.', 'error');
      return;
    }
    if (!formDaftar.statusRumah) {
      showToast('Status rumah (Kontrak/Milik Sendiri) wajib dipilih.', 'error');
      return;
    }
    if (formDaftar.anggotaKeluarga.length === 0) {
      showToast('Tambahkan minimal 1 anggota keluarga (istri/anak) sebelum mendaftar.', 'error');
      return;
    }
    for (const a of formDaftar.anggotaKeluarga) {
      if (!a.nama.trim() || !a.tanggalLahir) {
        showToast('Nama dan tanggal lahir setiap anggota keluarga wajib diisi lengkap.', 'error');
        return;
      }
    }
    const nomorRumahGabungan = `Blok ${formDaftar.blokRumah} No. ${formDaftar.nomorRumahUnit}`;
    updatePengajuan([...pengajuanBaru, {
      id: 'REQ-' + Math.floor(100 + Math.random() * 900),
      nama: formDaftar.nama, nomorRumah: nomorRumahGabungan, email: formDaftar.email, wa: formDaftar.wa, alamat: formDaftar.alamat, target: TARGET_TAHUNAN, tglDaftar: '11 Jul 2026',
      statusRumah: formDaftar.statusRumah, anggotaKeluarga: formDaftar.anggotaKeluarga
    }]);
    tambahNotifikasi({
      untuk: 'admin',
      judul: 'Pendaftaran Member Baru',
      pesan: `${formDaftar.nama} (Nomor Rumah/Blok: ${nomorRumahGabungan}, ${formDaftar.statusRumah}, ${formDaftar.anggotaKeluarga.length} anggota keluarga) mendaftar sebagai calon warga baru. Menunggu aktivasi.`,
      tipe: 'pending'
    });
    showToast('Pendaftaran terkirim! Silakan menunggu aktivasi dari admin/bendahara.');
    setFormDaftar({ nama: '', blokRumah: DAFTAR_BLOK_RUMAH[0], nomorRumahUnit: DAFTAR_NOMOR_RUMAH[0], email: '', wa: '', alamat: '', statusRumah: 'Milik Sendiri', anggotaKeluarga: [] });
  };

  // AKTIVASI WARGA BARU -> GENERATE PASSWORD ACAK -> SIMULASI KIRIM EMAIL
  // Admin memilih kelompok tujuan DAN tingkat akses (User/Admin) lewat dropdown
  // di daftar pengajuan sebelum menekan Aktivasi.
  const handleApproveMemberBaru = (id) => {
    const dataReq = pengajuanBaru.find(r => r.id === id);
    if (!dataReq) return;
    const kelompokTerpilih = pilihanKelompokPengajuan[id] || (kelompokList[0] && kelompokList[0].nama) || '';
    if (!kelompokTerpilih) {
      showToast('Buat blok terlebih dahulu di menu Kelola Blok sebelum aktivasi.', 'error');
      return;
    }
    const aksesTerpilih = pilihanAksesPengajuan[id] || 'user';
    const passwordBaru = generateRandomPassword();
    const usernameBaru = dataReq.nama.toLowerCase().replace(/\s+/g, '');
    const idMemberBaru = 'TR-' + Math.floor(10 + Math.random() * 90);
    updateMembers([...members, {
      id: idMemberBaru,
      nama: dataReq.nama, nomorRumah: dataReq.nomorRumah || dataReq.nama, email: dataReq.email, wa: dataReq.wa, alamat: dataReq.alamat || '-', target: dataReq.target || TARGET_TAHUNAN,
      bergabung: '11 Jul 2026', username: usernameBaru, password: passwordBaru,
      statusAnggota: 'Aktif', kelompok: kelompokTerpilih, akses: aksesTerpilih,
      statusRumah: dataReq.statusRumah || 'Milik Sendiri', anggotaKeluarga: dataReq.anggotaKeluarga || []
    }]);
    updatePengajuan(pengajuanBaru.filter(r => r.id !== id));
    kirimEmailSimulasi({
      to: dataReq.email,
      nama: dataReq.nama,
      subject: 'Akun Anda Telah Diaktivasi - Iuran Warga RT 40 RW 08',
      bodyLines: [
        `Assalamu'alaikum ${dataReq.nama},`,
        'Akun iuran warga Anda telah diaktivasi oleh Bendahara. Berikut detail akun Anda:',
        `Username: ${usernameBaru}`,
        `Password: ${passwordBaru}`,
        `Tingkat Akses: ${aksesTerpilih === 'admin' ? 'Admin (akses penuh)' : 'User (akses terbatas)'}`,
        'Demi keamanan, segera ubah password Anda setelah login pertama melalui menu "Ubah Password".'
      ]
    });
    tambahNotifikasi({
      untuk: idMemberBaru,
      judul: 'Akun Anda Telah Diaktivasi ✅',
      pesan: `Selamat! Pendaftaran Anda telah diverifikasi & diaktivasi oleh Bendahara. Silakan login dengan username: ${usernameBaru}.`,
      tipe: 'sukses'
    });
    // Kirim notifikasi WA otomatis langsung ke nomor HP yang diisi warga saat mendaftar
    if (dataReq.wa) {
      kirimWaOtomatis(dataReq.wa, `Assalamu'alaikum ${dataReq.nama},\nAkun iuran warga Anda di *${cmsTeks.namaRT}* telah *DIAKTIVASI* oleh Bendahara.\n\nUsername: ${usernameBaru}\nPassword: ${passwordBaru}\n\nSegera login & ganti password Anda demi keamanan. Terima kasih.`);
    }
    showToast(`${dataReq.nama} berhasil diaktivasi dengan akses ${aksesTerpilih === 'admin' ? 'Admin (penuh)' : 'User (terbatas)'}.`);
  };

  // TOLAK PENGAJUAN MEMBER BARU
  const handleTolakMemberBaru = (id) => {
    const dataReq = pengajuanBaru.find(r => r.id === id);
    if (!dataReq) return;
    const ok = window.confirm(`Tolak pendaftaran ${dataReq.nama}? Pengajuan ini akan dihapus dari antrean.`);
    if (!ok) return;
    updatePengajuan(pengajuanBaru.filter(r => r.id !== id));
    showToast(`Pendaftaran ${dataReq.nama} ditolak.`, 'error');
  };

  // RESET PASSWORD OLEH ADMIN (PER ANGGOTA)
  const handleAdminResetPassword = (memberId) => {
    const target = members.find(m => m.id === memberId);
    if (!target) return;
    const ok = window.confirm(`Reset password untuk ${target.nama}? Password baru akan dikirim ke WA warga.`);
    if (!ok) return;
    const passwordBaru = generateRandomPassword();
    const updated = members.map(m => m.id === memberId ? { ...m, password: passwordBaru } : m);
    updateMembers(updated);
    if (activeUserSession.id === memberId) setActiveUserSession({ ...activeUserSession, password: passwordBaru });
    kirimEmailSimulasi({
      to: target.email,
      nama: target.nama,
      subject: 'Password Anda Telah Direset - Iuran Warga RT 40 RW 08',
      bodyLines: [
        `Assalamu'alaikum ${target.nama},`,
        'Password akun Anda telah direset oleh Bendahara. Berikut password baru Anda:',
        `Username: ${target.username}`,
        `Password: ${passwordBaru}`,
        'Segera login dan ganti password Anda melalui menu "Ubah Password".'
      ]
    });
    tambahNotifikasi({
      untuk: target.id,
      judul: 'Password Anda Direset 🔑',
      pesan: `Password akun Anda telah direset oleh Bendahara. Silakan cek WhatsApp/email Anda untuk password baru.`,
      tipe: 'info'
    });
    // Kirim notifikasi WA otomatis langsung ke nomor HP warga yang bersangkutan
    if (target.wa) {
      kirimWaOtomatis(target.wa, `Assalamu'alaikum ${target.nama},\nPassword akun Iuran Warga *${cmsTeks.namaRT}* Anda telah *DIRESET* oleh Bendahara.\n\nUsername: ${target.username}\nPassword baru: ${passwordBaru}\n\nSegera login & ganti password Anda demi keamanan. Terima kasih.`);
    }
  };

  // MANAJEMEN AKSES WARGA (ADMIN <-> USER) OLEH ADMIN
  // Admin memilih tingkat akses tiap warga: 'admin' = akses penuh (setara Admin Panel),
  // 'user' = akses terbatas (hanya Dashboard Warga). Contoh: mengubah akses "Hidayat".
  const handleUbahAksesMember = (memberId, aksesBaru) => {
    const target = members.find(m => m.id === memberId);
    if (!target) return;
    if ((target.akses || 'user') === aksesBaru) return;
    const ok = window.confirm(`Ubah akses ${target.nama} menjadi "${aksesBaru === 'admin' ? 'Admin (akses penuh)' : 'User (akses terbatas)'}"?`);
    if (!ok) return;
    updateMembers(members.map(m => m.id === memberId ? { ...m, akses: aksesBaru } : m));
    if (activeUserSession.id === memberId) setActiveUserSession({ ...activeUserSession, akses: aksesBaru });
    showToast(`Akses ${target.nama} berhasil diubah menjadi ${aksesBaru === 'admin' ? 'Admin (akses penuh)' : 'User (akses terbatas)'}.`);
  };

  // GANTI PASSWORD OLEH USER SENDIRI
  const handleUserGantiPassword = (e) => {
    e.preventDefault();
    if (formUbahPassword.lama !== activeUserSession.password) {
      setPasswordMsg({ tipe: 'error', teks: 'Password lama yang Anda masukkan salah.' });
      return;
    }
    if (formUbahPassword.baru.length < 6) {
      setPasswordMsg({ tipe: 'error', teks: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (formUbahPassword.baru !== formUbahPassword.konfirmasi) {
      setPasswordMsg({ tipe: 'error', teks: 'Konfirmasi password baru tidak sama.' });
      return;
    }
    const updated = members.map(m => m.id === activeUserSession.id ? { ...m, password: formUbahPassword.baru } : m);
    updateMembers(updated);
    setActiveUserSession({ ...activeUserSession, password: formUbahPassword.baru });
    setFormUbahPassword({ lama: '', baru: '', konfirmasi: '' });
    setPasswordMsg({ tipe: 'sukses', teks: 'Password berhasil diperbarui. Gunakan password baru pada login berikutnya.' });
  };

  // ==========================================
  // CONTROLLER ACTIONS - KEGIATAN (DENGAN FOTO)
  // ==========================================
  const handleFotoKegiatanChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('Mengunggah foto kegiatan...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'Kegiatan');
    setFormKegiatan(prev => ({ ...prev, foto: url }));
    e.target.value = '';
  };

  const handleTambahKegiatan = (e) => {
    e.preventDefault();
    if (!formKegiatan.judul.trim()) {
      showToast('Judul / agenda kegiatan wajib diisi.', 'error');
      return;
    }
    if (editingKegiatanId) {
      updateKegiatan(kegiatanList.map(k => k.id === editingKegiatanId ? { ...k, ...formKegiatan } : k));
      showToast('Kegiatan berhasil diperbarui dan langsung tampil di seluruh halaman informasi warga.');
      setEditingKegiatanId(null);
    } else {
      updateKegiatan([...kegiatanList, {
        id: 'KG-' + Math.floor(100 + Math.random() * 900),
        judul: formKegiatan.judul,
        tanggal: formKegiatan.tanggal || '11 Jul 2026',
        jam: formKegiatan.jam,
        tempat: formKegiatan.tempat || cmsTeks.namaRT,
        pembicara: formKegiatan.pembicara,
        detail: formKegiatan.detail,
        foto: formKegiatan.foto
      }]);
      showToast('Kegiatan berhasil ditambahkan dan langsung tampil di halaman Informasi Umum warga.');
    }
    setFormKegiatan({ judul: '', tanggal: '', jam: '', tempat: '', pembicara: '', detail: '', foto: null });
  };

  const handleEditKegiatan = (k) => {
    setEditingKegiatanId(k.id);
    setFormKegiatan({ judul: k.judul, tanggal: k.tanggal, jam: k.jam || '', tempat: k.tempat || '', pembicara: k.pembicara || '', detail: k.detail || '', foto: k.foto || null });
    window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBatalEditKegiatan = () => {
    setEditingKegiatanId(null);
    setFormKegiatan({ judul: '', tanggal: '', jam: '', tempat: '', pembicara: '', detail: '', foto: null });
  };

  const handleHapusKegiatan = (id) => {
    updateKegiatan(kegiatanList.filter(k => k.id !== id));
    if (editingKegiatanId === id) handleBatalEditKegiatan();
    showToast('Kegiatan dihapus dari daftar.', 'error');
  };

  const handleTutupPeriode = () => {
    const ok = window.confirm(`Tutup periode ${periodeAktif.noPeriode} (Tahun ${periodeTahun}) sekarang?\n\nSeluruh data anggota, riwayat iuran, dan dokumentasi kegiatan periode ini akan diarsipkan PERMANEN sebagai riwayat/laporan (tidak akan hilang). Setelah itu periode baru otomatis dibuka dengan nomor baru.`);
    if (!ok) return;

    const totalTerkumpul = iuranMatrix.filter(r => r.status === 'LUNAS').reduce((acc, r) => acc + r.nominal, 0);
    const arsip = {
      noPeriode: periodeAktif.noPeriode,
      tahun: periodeTahun,
      status: 'Ditutup',
      tanggalDitutup: '11 Jul 2026',
      jumlahAnggota: members.length,
      jumlahKegiatan: kegiatanList.length,
      totalTerkumpul,
      members,
      iuranMatrix,
      kegiatanList,
    };
    updateRiwayatPeriode(prev => [arsip, ...prev]);

    const urutBaru = nomorUrutPeriode + 1;
    const tahunBaru = periodeTahun + 1;
    const noPeriodeBaru = buatNomorPeriode(urutBaru, tahunBaru, 1);
    setNomorUrutPeriode(urutBaru);
    setPeriodeTahun(tahunBaru);
    updatePeriode({ noPeriode: noPeriodeBaru, tahun: tahunBaru, status: 'Berjalan', tanggalMulai: `01 Jan ${tahunBaru}` });
    updateIuran([]);
    updateKegiatan([]);
    showToast(`Periode ${arsip.noPeriode} ditutup & diarsipkan. Periode baru ${noPeriodeBaru} resmi dibuka.`);
  };

  // ==========================================
  // KOMPONEN KECIL: BADGE STATUS
  // ==========================================
  const BadgeStatus = ({ status }) => {
    const style = status === 'LUNAS'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'MENUNGGU VERIFIKASI'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-500';
    return <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wide ${style}`}>{status}</span>;
  };

  // KOMPONEN DEKORATIF: SIRAM SVG RT (JIKA BELUM ADA FOTO UPLOAD)
  const RTSilhouette = ({ className }) => (
    <svg viewBox="0 0 600 260" className={className} preserveAspectRatio="xMidYMax slice">
      <g fill="currentColor">
        <rect x="40" y="170" width="520" height="90" />
        <rect x="70" y="120" width="60" height="140" />
        <rect x="470" y="120" width="60" height="140" />
        <circle cx="100" cy="105" r="16" />
        <circle cx="500" cy="105" r="16" />
        <rect x="96" y="60" width="8" height="45" />
        <rect x="496" y="60" width="8" height="45" />
        <path d="M180 170 C180 100 420 100 420 170 Z" />
        <rect x="270" y="60" width="60" height="30" />
        <path d="M270 60 C270 20 330 20 330 60 Z" />
        <rect x="296" y="10" width="8" height="30" />
        <circle cx="300" cy="8" r="7" />
        <rect x="150" y="200" width="26" height="60" />
        <path d="M150 200 C150 180 176 180 176 200 Z" />
        <rect x="424" y="200" width="26" height="60" />
        <path d="M424 200 C424 180 450 180 450 200 Z" />
        <rect x="220" y="210" width="30" height="50" />
        <path d="M220 210 C220 192 250 192 250 210 Z" />
        <rect x="350" y="210" width="30" height="50" />
        <path d="M350 210 C350 192 380 192 380 210 Z" />
      </g>
    </svg>
  );

  // ==========================================
  // KOMPONEN: IKON LONCENG NOTIFIKASI + BADGE ANGKA BELUM DIBACA + DROPDOWN
  // -----------------------------------------------------------
  // Dipakai di header Dashboard Warga (role user) & Admin Panel (role
  // admin). Badge angka merah muncul kalau ada notifikasi berstatus
  // dibaca:false. Klik salah satu notifikasi otomatis menandainya dibaca.
  // ==========================================
  const NotifikasiBell = () => (
    <div className="relative shrink-0">
      <button
        onClick={() => setShowNotifDropdown(prev => !prev)}
        aria-label="Notifikasi"
        className="relative w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-lg transition-colors duration-150"
      >
        🔔
        {jumlahNotifBelumDibaca > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center border-2 border-white anim-pop">
            {jumlahNotifBelumDibaca > 9 ? '9+' : jumlahNotifBelumDibaca}
          </span>
        )}
      </button>

      {showNotifDropdown && (
        <>
          <div onClick={() => setShowNotifDropdown(false)} className="fixed inset-0 z-40"></div>
          <div className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-white border rounded-2xl shadow-2xl z-50 overflow-hidden anim-pop">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <p className="font-black text-xs text-slate-900">Notifikasi</p>
              {jumlahNotifBelumDibaca > 0 && (
                <button onClick={() => tandaiSemuaNotifikasiDibaca(role === 'admin' ? 'admin' : activeUserSession.id)} className="text-[10px] font-bold text-emerald-700">Tandai semua dibaca</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {notifikasiSaya.length === 0 && (
                <p className="text-slate-400 italic text-[11px] p-5 text-center">Belum ada notifikasi.</p>
              )}
              {notifikasiSaya.map(n => (
                <button
                  key={n.id}
                  onClick={() => tandaiNotifikasiDibaca(n.id)}
                  className={`w-full text-left px-4 py-3 text-[11px] transition-colors duration-150 ${n.dibaca ? 'bg-white' : 'bg-emerald-50'} hover:bg-slate-50`}
                >
                  <div className="flex items-start gap-2">
                    {!n.dibaca && <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0"></span>}
                    <div className="min-w-0">
                      <p className={`font-black ${n.dibaca ? 'text-slate-600' : 'text-slate-900'}`}>{n.judul}</p>
                      <p className="text-slate-500 font-medium mt-0.5 leading-relaxed">{n.pesan}</p>
                      <p className="text-slate-400 text-[9px] font-bold mt-1">{n.waktu}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="app-root bg-slate-50 min-h-screen text-slate-800 antialiased font-sans">
      {/*
        FONT DIMUAT LEWAT <link>, BUKAN @import DI DALAM <style>.
        Sebelumnya @import url(...) diletakkan di dalam teks <style>, dan proxy preview
        (webcontainer) menulis-ulang URL tersebut secara berbeda saat render di server vs
        saat hydrate di browser -> teks <style> jadi tidak sama persis -> React menganggap
        ini "Text content does not match server-rendered HTML" (hydration error).
        Memindahkan pemuatan font ke tag <link> menghilangkan mismatch ini karena kontennya
        tidak lagi berupa teks yang dibandingkan Untuk React.
      */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap"
      />
      {/*
        Gaya global TIDAK lagi dirender lewat elemen <style> di JSX (yang teksnya
        dibandingkan saat hydration dan bisa mismatch di proxy webcontainer/StackBlitz).
        Sebagai gantinya, style di-inject langsung ke <head> lewat useEffect di bawah,
        yang hanya berjalan di browser -> tidak ada teks server vs client yang
        dibandingkan sama sekali -> hydration error hilang total.
      */}

      {/* TOAST NOTIFIKASI GLOBAL */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] anim-toast px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border ${toast.tipe === 'error' ? 'bg-rose-600 text-white border-rose-700' : 'bg-emerald-700 text-white border-emerald-800'}`}>
          <span>{toast.tipe === 'error' ? '⚠' : '✓'}</span>
          <span>{toast.teks}</span>
        </div>
      )}

      {/* SIMULATOR SWITCHER HEADER */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white px-3 sm:px-6 py-2.5 text-xs font-bold flex flex-wrap justify-between items-center gap-y-2 border-b border-emerald-900 shadow-md">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="text-emerald-400 truncate hidden sm:inline">Sistem Aplikasi Iuran Warga {cmsTeks.namaRT} Periode {periodeTahun}</span>
          <span className="text-emerald-400 truncate sm:hidden">{cmsTeks.namaRT}</span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">No. {periodeAktif.noPeriode}</span>
          <span className="bg-emerald-900 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">{periodeAktif.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/*
            PISAH TAMPILAN SESUAI LOGIN:
            - Belum login admin  -> hanya ada "Web Utama" & "Dashboard Warga" (warga login lewat form di halaman utama).
            - Sudah login admin  -> hanya ada "Web Utama" & "Admin Panel" (tombol Dashboard Warga disembunyikan),
              plus tombol keluar. Admin Panel HANYA bisa diakses lewat handleAdminLogin (bukan tombol bebas lagi).
          */}
          {!adminLoggedIn ? (
            <>
              <span className="text-slate-400 font-normal">Tampilan:</span>
              <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 p-0.5 rounded-lg border border-slate-800 flex">
                <button onClick={() => { setView('landing'); }} className={`px-3 py-1 rounded-md text-[11px] ${view === 'landing' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}>Web Utama</button>
                <button onClick={() => { setRole('user'); setView('dashboard'); setActiveMenu('dashboard'); }} className={`px-3 py-1 rounded-md text-[11px] ${role === 'user' && view === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}>Dashboard Warga</button>
              </div>
              <button onClick={() => setShowAdminLoginForm(true)} className="text-[10px] font-bold text-slate-500 hover:text-amber-400 underline underline-offset-2 ml-1">Login Panitia/Admin</button>
            </>
          ) : (
            <>
              <span className="text-slate-400 font-normal">Tampilan:</span>
              <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 p-0.5 rounded-lg border border-slate-800 flex">
                <button onClick={() => { setView('landing'); }} className={`px-3 py-1 rounded-md text-[11px] ${view === 'landing' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}>Web Utama</button>
                <button onClick={() => { setRole('admin'); setView('dashboard'); setActiveMenu('dashboard'); }} className={`px-3 py-1 rounded-md text-[11px] ${role === 'admin' && view === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}>Admin Panel</button>
              </div>
              <button onClick={handleAdminLogout} className="text-[10px] font-bold text-slate-500 hover:text-rose-400 underline underline-offset-2 ml-1">Keluar Admin</button>
            </>
          )}
        </div>
      </div>

      {/* MODAL LOGIN ADMIN/PANITIA - TERPISAH DARI LOGIN WARGA */}
      {showAdminLoginForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 relative border shadow-2xl anim-pop">
            <button onClick={() => { setShowAdminLoginForm(false); setAdminLoginError(''); }} className="absolute top-3 right-3 bg-slate-100 text-slate-700 w-7 h-7 rounded-full font-black text-xs">✕</button>
            <h3 className="text-sm font-black text-slate-900 text-center mb-1">Login Panitia / Admin</h3>
            <p className="text-[10px] text-slate-400 text-center mb-4">Khusus panitia. Akses Admin Panel tidak muncul sebelum login berhasil di sini.</p>
            <form onSubmit={handleAdminLogin} className="space-y-3 text-xs font-semibold">
              <div><label className="block mb-1 text-slate-600">Username Admin</label><input type="text" required value={formAdminLogin.username} onChange={(e) => setFormAdminLogin({...formAdminLogin, username: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
              <div><label className="block mb-1 text-slate-600">Password Admin</label><input type="password" required value={formAdminLogin.password} onChange={(e) => setFormAdminLogin({...formAdminLogin, password: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
              {adminLoginError && <p className="text-[11px] font-bold text-rose-600">{adminLoginError}</p>}
              <button type="submit" className="w-full bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold p-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.01]">🔑 Masuk Admin Panel</button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: LANDING PAGE / WEBSITE UTAMA
          ========================================================================= */}
      {view === 'landing' && (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 anim-fade">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white px-5 sm:px-8 py-4 rounded-2xl shadow-xs border">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {cmsTeks.logoRT ? (
                <img loading="lazy" decoding="async" src={cmsTeks.logoRT} alt={`Logo ${cmsTeks.namaRT}`} className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-contain border bg-white shrink-0" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.insertAdjacentHTML('afterend', '<div class="bg-emerald-800 text-amber-400 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12">RT</div>'); }} />
              ) : (
                <div className="bg-emerald-800 text-amber-400 px-3 py-1.5 rounded-xl font-black text-xs shrink-0">RT</div>
              )}
              <div className="min-w-0">
                <h1 className="font-extrabold text-slate-900 text-sm truncate">{cmsTeks.namaRT}</h1>
                <p className="text-[9px] text-slate-400 font-semibold truncate">📍 {cmsTeks.alamatRT}</p>
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest truncate">{cmsTeks.subJudulBeranda}</p>
              </div>
            </div>
            <a href={buatLinkWhatsapp(cmsTeks.infoKontak)} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto justify-center text-xs font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-full border transition-colors duration-200">
              <span className="text-emerald-600">●</span> Hubungi Kami: {cmsTeks.infoKontak}
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white p-8 rounded-3xl border shadow-xl overflow-hidden">
                {cmsTeks.fotoLatarRT ? (
                  <img loading="lazy" decoding="async" src={cmsTeks.fotoLatarRT} alt="RT" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none select-none" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <RTSilhouette className="absolute -bottom-4 right-0 w-2/3 h-40 text-emerald-500/10 pointer-events-none select-none" />
                )}
                {/* Overlay gelap dibuat ~20% lebih transparan dari sebelumnya (60%->40% & 80%->60%)
                    supaya foto latar yang diupload admin lebih terlihat jelas, teks tetap dijaga
                    kontrasnya lewat drop-shadow & kotak pengumuman semi-solid di bawah. */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent pointer-events-none"></div>
                <div className="relative">
                  <h2 className="text-xl font-black text-amber-300 mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{cmsTeks.judulBeranda}</h2>
                  <p className="text-[11px] text-emerald-300 font-bold uppercase tracking-widest mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{cmsTeks.tagline}</p>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">{cmsTeks.pengumuman}</p>
                </div>
              </div>

              {/* REKENING PEMBAYARAN & KONTAK PANITIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-5 rounded-2xl border">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Rekening Pembayaran Resmi</h4>
                  <p className="text-emerald-800 font-black text-sm leading-relaxed">{cmsTeks.noRekening}</p>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard?.writeText(cmsTeks.noRekening); showToast('Nomor rekening berhasil disalin.'); }}
                    className="mt-2 text-[10px] font-bold text-slate-500 hover:text-emerald-700 underline underline-offset-2"
                  >
                    📋 Salin Nomor Rekening
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2">Pastikan hanya transfer ke rekening resmi di atas. Nomor ini diatur langsung oleh panitia lewat Admin Panel.</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Hubungi Panitia</h4>
                  <p className="text-slate-700 font-bold">{cmsTeks.infoKontak}</p>
                  <a
                    href={buatLinkWhatsapp(cmsTeks.infoKontak)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-full transition-colors duration-200"
                  >
                    💬 Chat via WhatsApp
                  </a>
                </div>
              </div>

              {/* VISI & MISI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-5 rounded-2xl border">
                  <h4 className="font-black text-emerald-800 uppercase tracking-wider mb-2">Visi</h4>
                  <p className="text-slate-600 leading-relaxed font-medium">{cmsTeks.visi}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border">
                  <h4 className="font-black text-emerald-800 uppercase tracking-wider mb-2">Misi</h4>
                  <p className="text-slate-600 leading-relaxed font-medium">{cmsTeks.misi}</p>
                </div>
              </div>

              {/* SYARAT & KETENTUAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Syarat Mengikuti Program</h4>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    {cmsTeks.syaratList.map((s, i) => (
                      <li key={i} className="flex gap-2"><span className="text-emerald-600">✔</span><span>{s}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-5 rounded-2xl border">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Ketentuan Program</h4>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    {cmsTeks.ketentuanList.map((s, i) => (
                      <li key={i} className="flex gap-2"><span className="text-emerald-600">✔</span><span>{s}</span></li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* AGENDA UTAMA / SPESIAL - UKURAN FOTO & KOTAK LEBIH BESAR */}
              {agendaUtama.judul && (
                <div className="bg-white p-6 rounded-2xl border-2 border-amber-400 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider">⭐ Agenda Utama Periode {periodeTahun}</h3>
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Agenda Spesial</span>
                  </div>
                  <div className="rounded-2xl border overflow-hidden bg-slate-50 anim-fade">
                    <div className="w-full h-64 bg-slate-200 flex items-center justify-center overflow-hidden">
                      {agendaUtama.foto ? (
                        <img loading="lazy" decoding="async" src={agendaUtama.foto} alt={agendaUtama.judul} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Belum ada foto agenda utama</span>
                      )}
                    </div>
                    <div className="p-5 text-xs">
                      <p className="text-slate-400 font-bold text-[11px]">{agendaUtama.tanggal}{agendaUtama.jam ? ` • ${agendaUtama.jam} WIB` : ''}</p>
                      <h4 className="text-slate-900 font-black text-base mt-1">{agendaUtama.judul}</h4>
                      {(agendaUtama.tempat || agendaUtama.pembicara) && (
                        <p className="text-emerald-700 font-bold mt-1.5 text-[11px]">{agendaUtama.tempat}{agendaUtama.tempat && agendaUtama.pembicara ? ' • ' : ''}{agendaUtama.pembicara ? `Bersama: ${agendaUtama.pembicara}` : ''}</p>
                      )}
                      <p className="text-slate-500 font-normal mt-2 leading-relaxed">{agendaUtama.detail}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PANEL KEGIATAN DENGAN FOTO */}
              <div className="bg-white p-6 rounded-2xl border shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Agenda Kegiatan &amp; Dokumentasi Periode {periodeTahun}</h3>
                  <span className="text-[10px] font-bold text-slate-400">{kegiatanList.length} kegiatan tercatat</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {kegiatanList.map(k => (
                    <div key={k.id} className="rounded-xl border overflow-hidden bg-slate-50 anim-fade">
                      <div className="w-full h-28 bg-slate-200 flex items-center justify-center overflow-hidden">
                        {k.foto ? (
                          <img loading="lazy" decoding="async" src={k.foto} alt={k.judul} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">Belum ada foto</span>
                        )}
                      </div>
                      <div className="p-3 text-xs">
                        <p className="text-slate-400 font-bold text-[10px]">{k.tanggal}{k.jam ? ` • ${k.jam} WIB` : ''}</p>
                        <h4 className="text-slate-900 font-bold mt-0.5">{k.judul}</h4>
                        {(k.tempat || k.pembicara) && (
                          <p className="text-emerald-700 font-bold mt-1 text-[10px]">{k.tempat}{k.tempat && k.pembicara ? ' • ' : ''}{k.pembicara ? `Pembicara: ${k.pembicara}` : ''}</p>
                        )}
                        <p className="text-slate-500 font-normal mt-1 leading-relaxed">{k.detail}</p>
                      </div>
                    </div>
                  ))}
                  {kegiatanList.length === 0 && (
                    <p className="text-slate-400 italic text-xs col-span-3">Belum ada kegiatan tercatat pada periode ini.</p>
                  )}
                </div>
              </div>

              {/* ================= INFORMASI UMUM RT (DIISI ADMIN DI CMS SUPER EDITOR) ================= */}
              <div className="bg-white p-6 rounded-3xl border shadow-xs">
                <h3 className="text-sm font-black text-slate-900 mb-4">ℹ️ Informasi Umum {cmsTeks.namaRT}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-2xl overflow-hidden border bg-slate-100 h-56 flex items-center justify-center">
                    {cmsTeks.fotoRTUmum ? (
                      <img loading="lazy" decoding="async" src={cmsTeks.fotoRTUmum} alt={cmsTeks.namaRT} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.insertAdjacentHTML('afterend', '<span class="text-xs text-slate-400 font-bold">Belum ada foto RT</span>'); }} />
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">Belum ada foto RT</span>
                    )}
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Deskripsi</h4>
                      <p className="text-slate-600 leading-relaxed font-medium">{cmsTeks.deskripsiRT}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Luas RT</h4>
                      <p className="text-slate-700 font-bold">{cmsTeks.luasRT}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  <div className="bg-slate-50 border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">📢 Info &amp; Pengumuman RT</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {(cmsTeks.infoPengumumanList && cmsTeks.infoPengumumanList.length > 0) ? cmsTeks.infoPengumumanList.map((info, i) => (
                        <li key={i} className="bg-white border rounded-xl py-2 px-3 text-[11px] text-slate-700 font-semibold flex items-start gap-1.5"><span className="text-emerald-600">▪</span>{info}</li>
                      )) : (
                        <li className="text-slate-400 italic text-[11px]">Belum ada pengumuman dari pengurus RT.</li>
                      )}
                    </ul>
                    {/* JAM BERJALAN DIGITAL - WAKTU WIB (ASIA/JAKARTA), UPDATE OTOMATIS TIAP DETIK */}
                    <div className="mt-3 bg-emerald-950 rounded-xl py-3 px-4 text-center">
                      <p className="text-amber-400 font-black text-2xl tracking-widest font-mono">{jamSekarang}</p>
                      <p className="text-slate-300 text-[9px] font-bold mt-0.5 uppercase tracking-wide">{tanggalSekarang} • WIB</p>
                    </div>
                    <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3 text-center">
                      <p className="text-emerald-800 text-[10px] font-black">📣 {getPengumumanBerjalan()}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border rounded-2xl p-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">🏷️ Aset RT</h4>
                    {cmsTeks.asetRTList && cmsTeks.asetRTList.length > 0 ? (
                      <ul className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {cmsTeks.asetRTList.map((a, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-slate-700 font-semibold"><span className="text-emerald-600">▪</span>{a}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">Belum ada data aset.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* KOLOM KANAN: LOGIN, PENDAFTARAN, & INFO MOTIVASI WARGA */}
            <div className="col-span-1 space-y-6">

              {/* FORM LOGIN RESMI (USERNAME & PASSWORD) */}
              <div className="bg-white p-6 rounded-3xl border shadow-xs h-fit">
                <h3 className="text-sm font-black text-slate-900 text-center mb-1">Login Akun Warga</h3>
                <p className="text-[10px] text-slate-400 text-center mb-4">Masuk menggunakan username &amp; password yang dikirim ke WA Anda saat aktivasi.</p>
                <form onSubmit={handleLogin} className="space-y-3 text-xs font-semibold">
                  <div><label className="block mb-1 text-slate-600">Username</label><input type="text" required placeholder="hidayat123" value={formLogin.username} onChange={(e) => setFormLogin({...formLogin, username: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                  <div><label className="block mb-1 text-slate-600">Password</label><input type="password" required placeholder="••••••••" value={formLogin.password} onChange={(e) => setFormLogin({...formLogin, password: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                  {loginError && <p className="text-[11px] font-bold text-rose-600">{loginError}</p>}
                  <button type="submit" className="w-full bg-emerald-700 text-white font-bold p-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.01]">🔑 Masuk ke Akun Saya</button>
                </form>
              </div>

              {/* FORM PENDAFTARAN */}
              <div className="bg-white p-6 rounded-3xl border shadow-xs h-fit">
                <h3 className="text-sm font-black text-slate-900 text-center mb-1">Pendaftaran Akun</h3>
                <p className="text-[10px] text-slate-400 text-center mb-4">Setelah diaktivasi bendahara, username &amp; password acak akan dikirim ke WA Anda.</p>
                <form onSubmit={handleUserMendaftar} className="space-y-3 text-xs font-semibold">
                  <div><label className="block mb-1 text-slate-600">Nama Kepala Keluarga</label><input type="text" required placeholder="Hidayat" value={formDaftar.nama} onChange={(e) => setFormDaftar({...formDaftar, nama: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                  <div>
                    <label className="block mb-1 text-slate-600">Status Rumah</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Milik Sendiri', 'Kontrak'].map(s => (
                        <button type="button" key={s} onClick={() => setFormDaftar({...formDaftar, statusRumah: s})} className={`p-2 rounded-xl border font-bold text-center transition-colors duration-150 ${formDaftar.statusRumah === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-500'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 text-slate-600">Blok Rumah</label>
                      <select required value={formDaftar.blokRumah} onChange={(e) => setFormDaftar({...formDaftar, blokRumah: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50 font-bold">
                        {DAFTAR_BLOK_RUMAH.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-600">Nomor Rumah</label>
                      <select required value={formDaftar.nomorRumahUnit} onChange={(e) => setFormDaftar({...formDaftar, nomorRumahUnit: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50 font-bold">
                        {DAFTAR_NOMOR_RUMAH.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="block mb-1 text-slate-600">Email</label><input type="email" required placeholder="hidayat@mail.com" value={formDaftar.email} onChange={(e) => setFormDaftar({...formDaftar, email: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                  <div><label className="block mb-1 text-slate-600">WhatsApp</label><input type="text" required placeholder="08123" value={formDaftar.wa} onChange={(e) => setFormDaftar({...formDaftar, wa: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                  <div><label className="block mb-1 text-slate-600">Alamat Tinggal</label><textarea rows={2} required placeholder="Blok A No. 1, Perum Bumi Indah Proklamasi, RT 40/RW 08" value={formDaftar.alamat} onChange={(e) => setFormDaftar({...formDaftar, alamat: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>

                  {/* ANGGOTA KELUARGA (ISTRI & ANAK) - WAJIB MINIMAL 1, DATA INI YANG
                      NANTINYA MASUK KE TAB "ANGGOTA KELUARGA" DI AKUN USER SETELAH AKTIVASI */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-600">Anggota Keluarga (Istri &amp; Anak)</label>
                      <button type="button" onClick={handleTambahBarisAnggotaDaftar} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">+ Tambah</button>
                    </div>
                    <p className="text-[9px] text-slate-400 mb-2">Wajib diisi minimal 1 anggota (istri/anak). Usia dihitung otomatis dari tanggal lahir.</p>
                    <div className="space-y-2">
                      {formDaftar.anggotaKeluarga.map((a, i) => (
                        <div key={a.id} className="bg-slate-50 border rounded-xl p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Anggota #{i + 1}</span>
                            <button type="button" onClick={() => handleHapusBarisAnggotaDaftar(a.id)} className="text-[10px] font-bold text-rose-600">Hapus</button>
                          </div>
                          <input type="text" required placeholder="Nama lengkap" value={a.nama} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'nama', e.target.value)} className="w-full border p-2 rounded-lg bg-white text-[11px]" />
                          <select required value={a.hubungan} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'hubungan', e.target.value)} className="w-full border p-2 rounded-lg bg-white text-[11px] font-bold">
                            {HUBUNGAN_KELUARGA_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <div className="grid grid-cols-2 gap-1.5">
                            <select required value={a.jenisKelamin} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'jenisKelamin', e.target.value)} className="w-full border p-2 rounded-lg bg-white text-[11px] font-bold">
                              <option value="Perempuan">Perempuan</option>
                              <option value="Laki-laki">Laki-laki</option>
                            </select>
                            <input type="date" required value={a.tanggalLahir} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'tanggalLahir', e.target.value)} className="w-full border p-2 rounded-lg bg-white text-[11px]" />
                          </div>
                        </div>
                      ))}
                      {formDaftar.anggotaKeluarga.length === 0 && (
                        <p className="text-slate-400 italic text-[10px] text-center py-2">Belum ada anggota keluarga ditambahkan.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px] text-emerald-800 font-bold text-center">Iuran bulanan: Rp{IURAN_BULANAN.toLocaleString('id-ID')} / rumah, sama rata untuk semua warga.</div>
                  <button type="submit" className="w-full bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold p-2.5 rounded-xl">Daftar Sebagai Warga</button>
                </form>
              </div>

              {/* BUKU KAS MASUK/KELUAR RT (TRANSPARANSI PUBLIK - TAMPIL DI BAWAH KARTU PENDAFTARAN AKUN) */}
              <div className="bg-white p-6 rounded-3xl border shadow-xs h-fit">
                <h3 className="text-sm font-black text-slate-900 text-center mb-1">📒 Buku Kas Masuk/Keluar RT</h3>
                <p className="text-[10px] text-slate-400 text-center mb-4">Riwayat transaksi kas RT beserta saldo berjalan, transparan untuk seluruh warga.</p>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-[10px] sm:text-[11px]">
                    <thead>
                      <tr className="text-slate-400 border-b text-left">
                        <th className="py-1.5 px-2 font-bold">Tanggal</th>
                        <th className="py-1.5 px-2 font-bold">Keterangan</th>
                        <th className="py-1.5 px-2 font-bold text-right">Masuk</th>
                        <th className="py-1.5 px-2 font-bold text-right">Keluar</th>
                        <th className="py-1.5 px-2 font-bold text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRiwayatKasRtDenganSaldo().map(t => (
                        <tr key={t.id} className="border-b border-slate-50">
                          <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">{t.tanggal}</td>
                          <td className="py-1.5 px-2 text-slate-700 font-semibold">{t.keterangan}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-emerald-700">{t.jenis === 'Masuk' ? `Rp${Number(t.nominal).toLocaleString('id-ID')}` : '-'}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-rose-600">{t.jenis === 'Keluar' ? `Rp${Number(t.nominal).toLocaleString('id-ID')}` : '-'}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">Rp{t.saldoSetelah.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                      {riwayatKasRt.length === 0 && (
                        <tr><td colSpan={5} className="py-3 text-center text-slate-400 italic">Belum ada transaksi kas RT yang dicatat.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 rounded-xl py-2.5 px-4 flex items-center justify-between">
                  <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wide">Sisa Saldo Kas RT</span>
                  <span className="text-amber-400 font-black text-sm">Rp{(getRiwayatKasRtDenganSaldo().slice(-1)[0]?.saldoSetelah ?? 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* INFO MOTIVASI KEBERSAMAAN WARGA (MENGISI RUANG KOSONG) */}
              <div className="bg-emerald-900 text-white p-6 rounded-3xl border border-emerald-800 shadow-xs h-fit">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest text-center mb-3">Kenapa Iuran Warga Penting?</h3>
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-950/60 rounded-xl p-3 border border-emerald-800">
                    <p className="italic text-emerald-100 leading-relaxed">Iuran yang tertib membuat lingkungan lebih aman, bersih, dan nyaman untuk seluruh warga.</p>
                  </div>
                  <div className="bg-emerald-950/60 rounded-xl p-3 border border-emerald-800">
                    <p className="italic text-emerald-100 leading-relaxed">Dana warga digunakan untuk keamanan (ronda), kebersihan lingkungan, dan kegiatan sosial bersama.</p>
                  </div>
                  <p className="text-emerald-200 text-[10px] text-center leading-relaxed">Yuk bayar iuran tepat waktu, demi RT 40 RW 08 yang lebih baik bersama.</p>
                </div>
              </div>

              {/* SUSUNAN PENGURUS (DIEDIT ADMIN DARI CMS SUPER EDITOR) */}
              <div className="bg-white p-6 rounded-3xl border shadow-xs h-fit">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-4">Struktur Pengurus RW</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Ketua RT</p>
                    <p className="font-black text-slate-900 mt-1">{cmsTeks.panitiaKetua}</p>
                  </div>
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Sekretaris</p>
                    <p className="font-black text-slate-900 mt-1">{cmsTeks.panitiaSekretaris}</p>
                  </div>
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Bendahara</p>
                    <p className="font-black text-slate-900 mt-1">{cmsTeks.panitiaBendahara}</p>
                  </div>
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Humas</p>
                    <p className="font-black text-slate-900 mt-1">{cmsTeks.panitiaHumas}</p>
                  </div>
                </div>
              </div>

              {/* GALERI FOTO ANGGOTA STRUKTUR RT (DIKELOLA ADMIN DARI CMS SUPER EDITOR)
                  Terlihat oleh SEMUA akun yang membuka Web Utama, baik belum login,
                  warga, maupun admin lain, karena bagian dari konten publik Beranda. */}
              {strukturRt.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border shadow-xs h-fit">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-4">Struktur Pengurus RT</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {strukturRt.map(d => (
                      <div key={d.id} className="bg-slate-50 border rounded-xl p-3 text-center">
                        <div className="w-14 h-14 mx-auto rounded-full border-2 border-emerald-100 bg-white overflow-hidden flex items-center justify-center mb-2 relative">
                          <span className="text-emerald-800/30 font-black text-lg">{(d.nama || '?').charAt(0)}</span>
                          {d.foto && (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={toDirectImageUrl(d.foto)}
                              alt={d.nama}
                              className="w-full h-full object-cover absolute inset-0"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                        </div>
                        <p className="font-black text-slate-900 leading-tight">{d.nama}</p>
                        <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide mt-0.5">{d.jabatan}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SIMULATOR SESSION LOGIN FAST CHOICE - otomatis disembunyikan begitu
                  data warga ASLI dari Google Sheets sudah masuk, supaya pengunjung
                  tidak lagi melihat contoh/dummy setelah RT resmi pakai data sungguhan. */}
              {!dataWargaAsliSudahMasuk && (
                <div className="bg-white p-4 rounded-xl border text-xs">
                  <span className="text-slate-400 font-bold block mb-1">🧪 Simulasi Akun Pengguna (contoh tampilan Dashboard Warga untuk pengunjung):</span>
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2 leading-relaxed">
                    Data di bawah ini hanya <strong>contoh/dummy</strong> untuk memperlihatkan tampilan Dashboard. Data yang sebenarnya (tersambung ke Google Sheets & akun admin resmi) hanya muncul setelah <strong>Login Akun Resmi</strong> memakai username &amp; password asli.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {CONTOH_SIMULASI_ANGGOTA.map(m => (
                      <button key={m.id} onClick={() => { setActiveUserSession(m); setIsSimulatedSession(true); setRole('user'); setView('dashboard'); setActiveMenu('dashboard'); showToast(`Simulasi tampilan sebagai ${m.nama} (${m.kelompok}) - ini contoh, bukan data asli.`); }} className={`p-2 border rounded-lg font-bold text-[11px] transition-all duration-200 hover:scale-[1.03] ${activeUserSession.nama === m.nama ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-white'}`}>
                        {m.nama} ({m.kelompok})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DASHBOARD
          ========================================================================= */}
      {view === 'dashboard' && (
        <div className="flex flex-col lg:flex-row items-start anim-fade min-h-screen lg:min-w-0">

          {/* TOP BAR KHUSUS MODE HP (HAMBURGER TOGGLE SIDEBAR) */}
          <div className="lg:hidden sticky top-0 z-30 w-full bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 text-white px-4 py-3 flex items-center gap-3 border-b border-blue-900/60 shadow-md">
            <button onClick={() => setSidebarOpen(true)} aria-label="Buka menu" className="w-9 h-9 rounded-lg bg-blue-800/70 flex items-center justify-center text-lg shrink-0">☰</button>
            {cmsTeks.logoRT ? (
              <img loading="lazy" decoding="async" src={cmsTeks.logoRT} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="bg-emerald-800 text-amber-400 px-2 py-1 rounded-lg font-black text-[10px] shrink-0">RT</div>
            )}
            <p className="font-extrabold text-[11px] leading-tight truncate">{cmsTeks.namaRT}</p>
          </div>

          {/* OVERLAY BACKDROP SAAT SIDEBAR TERBUKA DI HP */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-slate-950/60 z-40 anim-fade"></div>
          )}

          {/* SIDEBAR NAVIGATION (STICKY DI DESKTOP, DRAWER DI HP) */}
          <div className={`w-72 sm:w-64 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 text-blue-50 p-5 flex flex-col justify-between border-r border-blue-900/60 select-none shrink-0 h-screen overflow-y-auto fixed lg:sticky top-0 left-0 z-50 lg:z-auto transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0 group">
                    {cmsTeks.logoRT ? (
                      <img loading="lazy" decoding="async" src={cmsTeks.logoRT} alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white border border-blue-800/60 shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="bg-emerald-800 text-amber-400 px-2.5 py-1.5 rounded-lg font-black text-[10px] shrink-0">RT</div>
                    )}
                    {role === 'admin' && (
                      <label title="Ganti logo RT" className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[8px] font-black cursor-pointer border border-slate-900 opacity-90 hover:opacity-100">
                        ✎
                        <input type="file" accept="image/*" onChange={handleQuickLogoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-[11px] leading-tight text-blue-50 truncate">{cmsTeks.namaRT}</p>
                    <p className="text-[8px] text-blue-300 font-semibold truncate">📍 {cmsTeks.alamatRT}</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} aria-label="Tutup menu" className="lg:hidden w-7 h-7 rounded-full bg-blue-800/70 text-blue-100 shrink-0 font-black text-xs">✕</button>
              </div>
              <div className="bg-blue-950/70 p-3 rounded-xl border border-blue-900/60 text-xs mb-4">
                <span className="text-blue-300 font-bold block text-[9px] uppercase">User Aktif:</span>
                <p className="font-black text-amber-400 text-sm truncate">{role === 'admin' ? 'BENDAHARA' : activeUserSession.nama}</p>
                <span className="bg-emerald-900 text-white font-mono text-[9px] px-2 py-0.5 rounded mt-1 inline-block uppercase">
                  {role === 'admin' ? 'ALL GROUPS' : activeUserSession.kelompok}
                </span>
              </div>

              <nav onClick={() => setSidebarOpen(false)} className="space-y-1 text-xs font-bold">
                <button onClick={() => setActiveMenu('dashboard')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Dashboard Utama</button>
                <button onClick={() => setActiveMenu('laporan-sapi')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'laporan-sapi' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Rekap Blok Rumah</button>
                <button onClick={() => setActiveMenu('informasi-warga')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'informasi-warga' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Informasi Warga</button>

                {role === 'user' && (
                  <>
                    <button onClick={() => setActiveMenu('anggota-keluarga')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'anggota-keluarga' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Anggota Keluarga</button>
                    <button onClick={() => setActiveMenu('informasi-umum')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'informasi-umum' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Informasi Umum</button>
                    <button onClick={() => setActiveMenu('laporan-belanja')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'laporan-belanja' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Laporan Belanja Kas RT</button>
                    <button onClick={() => { setActiveMenu('ubah-password'); setPasswordMsg({ tipe: '', teks: '' }); }} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'ubah-password' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Ubah Password</button>
                  </>
                )}

                {role === 'admin' && (
                  <div className="pt-4 mt-4 border-t border-blue-900/50 space-y-1">
                    <span className="text-[9px] text-blue-300 uppercase px-4 block mb-1">Bendahara Control</span>
                    <button onClick={() => setActiveMenu('pending-pembayaran')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl flex items-center justify-between ${activeMenu === 'pending-pembayaran' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>
                      <span>Pending Iuran</span>
                      {iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').length > 0 && (
                        <span className="bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">{iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').length}</span>
                      )}
                    </button>
                    <button onClick={() => setActiveMenu('realisasi-belanja')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'realisasi-belanja' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Realisasi Belanja Kas RT</button>
                    <button onClick={() => setActiveMenu('notif-pengajuan')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl flex items-center justify-between ${activeMenu === 'notif-pengajuan' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>
                      <span>Member Baru</span>
                      {pengajuanBaru.length > 0 && (
                        <span className="bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">{pengajuanBaru.length}</span>
                      )}
                    </button>
                    <button onClick={() => setActiveMenu('kelola-kegiatan')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'kelola-kegiatan' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Kelola Kegiatan / Agenda</button>
                    <button onClick={() => setActiveMenu('manajemen-periode')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'manajemen-periode' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>Manajemen Periode</button>
                    <button onClick={() => setActiveMenu('cms-setting')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'cms-setting' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>CMS Super Editor</button>
                  </div>
                )}
              </nav>
            </div>
            <button onClick={() => setView('landing')} className="w-full text-center bg-blue-800/60 text-blue-200 py-2 rounded-xl text-xs font-bold hover:text-white transition-colors duration-200">← Ke Beranda Depan</button>
          </div>

          {/* MAIN CONTAINER WORKSPACE (SCROLL NORMAL, TIDAK TERPOTONG) */}
          <div key={activeMenu} className="flex-1 w-full min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8 anim-fade pb-20 overflow-x-auto">

            {/* INFORMASI WARGA - DASHBOARD STATISTIK KEPENDUDUKAN (USER & ADMIN, HANYA SETELAH LOGIN) */}
            {activeMenu === 'informasi-warga' && (() => {
              const dataWarga = role === 'admin' ? members : members.filter(m => m.kelompok === activeUserSession.kelompok);
              const totalKK = dataWarga.length;
              const totalAnggotaKeluarga = dataWarga.reduce((acc, m) => acc + (m.anggotaKeluarga || []).length, 0);
              const totalJiwa = totalKK + totalAnggotaKeluarga;
              const jmlMilikSendiri = dataWarga.filter(m => m.statusRumah === 'Milik Sendiri').length;
              const jmlKontrak = dataWarga.filter(m => m.statusRumah !== 'Milik Sendiri').length;
              const jmlAktif = dataWarga.filter(m => m.statusAnggota === 'Aktif').length;
              const jmlPasif = dataWarga.filter(m => m.statusAnggota === 'Pasif').length;
              const jmlPerempuanTanggungan = dataWarga.reduce((acc, m) => acc + (m.anggotaKeluarga || []).filter(a => a.jenisKelamin === 'Perempuan').length, 0);
              const jmlLakiTanggungan = dataWarga.reduce((acc, m) => acc + (m.anggotaKeluarga || []).filter(a => a.jenisKelamin === 'Laki-laki').length, 0);
              const rekapUsiaRT = getRekapKategoriUsia(dataWarga);
              const totalUsiaTerdata = Object.values(rekapUsiaRT).reduce((a, b) => a + b, 0);
              const perBlok = kelompokList.map(k => ({ ...k, jumlahKK: members.filter(m => m.kelompok === k.nama).length }));
              const wargaTerbaru = dataWarga.slice(-5).reverse();
              // Warga Keluar: Admin lihat semua blok, akun user (warga) hanya
              // lihat warga keluar dari bloknya sendiri - otomatis konek dengan
              // data yang diisi Admin lewat Panel Kontrol Warga Keluar.
              const wargaKeluarTampil = (role === 'admin' ? wargaKeluarList : wargaKeluarList.filter(w => w.blok === activeUserSession.kelompok)).slice(-5).reverse();

              return (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">📊 Informasi Warga</h3>
                    <p className="text-xs text-slate-400">
                      {role === 'admin' ? 'Ringkasan data kependudukan seluruh warga RT, khusus untuk pengurus.' : `Ringkasan data kependudukan warga di ${activeUserSession.kelompok}.`}
                    </p>
                  </div>

                  {/* STAT CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Kepala Keluarga</span>
                      <span className="text-2xl font-black text-emerald-700 block mt-1">{totalKK}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Jiwa</span>
                      <span className="text-2xl font-black text-sky-700 block mt-1">{totalJiwa}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tanggungan Laki-laki</span>
                      <span className="text-2xl font-black text-indigo-700 block mt-1">{jmlLakiTanggungan}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tanggungan Perempuan</span>
                      <span className="text-2xl font-black text-rose-600 block mt-1">{jmlPerempuanTanggungan}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* KOMPOSISI USIA */}
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-3">Komposisi Usia (Anggota Keluarga)</h4>
                      <div className="space-y-2">
                        {KATEGORI_USIA_LIST.map(kat => {
                          const jml = rekapUsiaRT[kat] || 0;
                          const persen = totalUsiaTerdata > 0 ? Math.round((jml / totalUsiaTerdata) * 100) : 0;
                          return (
                            <div key={kat} className="text-[11px] font-semibold">
                              <div className="flex justify-between mb-1">
                                <span className="text-slate-600">{kat}</span>
                                <span className="text-slate-900 font-black">{jml} ({persen}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${persen}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                        {totalUsiaTerdata === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada data anggota keluarga.</p>}
                      </div>
                    </div>

                    {/* STATUS KEPENDUDUKAN */}
                    <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-2">Status Rumah</h4>
                        <div className="flex items-center gap-3 text-[11px] font-semibold">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1"><span className="text-slate-600">🏠 Milik Sendiri</span><span className="font-black">{jmlMilikSendiri}</span></div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-sky-600 h-full" style={{ width: `${totalKK > 0 ? (jmlMilikSendiri / totalKK) * 100 : 0}%` }}></div></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-semibold mt-2">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1"><span className="text-slate-600">🔑 Kontrak</span><span className="font-black">{jmlKontrak}</span></div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{ width: `${totalKK > 0 ? (jmlKontrak / totalKK) * 100 : 0}%` }}></div></div>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t">
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-2">Status Keanggotaan</h4>
                        <div className="flex gap-3 text-[11px] font-semibold">
                          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-black">Aktif: {jmlAktif}</span>
                          <span className="bg-slate-200 text-slate-500 px-2.5 py-1 rounded-lg font-black">Pasif: {jmlPasif}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DISTRIBUSI PER BLOK (KHUSUS ADMIN) */}
                  {role === 'admin' && (
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-3">Distribusi Warga per Blok</h4>
                      <div className="space-y-2">
                        {perBlok.map(k => {
                          const persen = totalKK > 0 ? Math.round((k.jumlahKK / totalKK) * 100) : 0;
                          return (
                            <div key={k.id} className="text-[11px] font-semibold">
                              <div className="flex justify-between mb-1">
                                <span className="text-slate-600">{k.nama} <span className="text-slate-400 font-normal">({k.jenis})</span></span>
                                <span className="text-slate-900 font-black">{k.jumlahKK} KK</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${persen}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                        {perBlok.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada blok terdaftar.</p>}
                      </div>
                    </div>
                  )}

                  {/* WARGA TERBARU & WARGA KELUAR (dibagi 2 kolom berdampingan) */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-3">Warga Terbaru</h4>
                      <ul className="divide-y text-[11px] font-semibold">
                        {wargaTerbaru.map(m => (
                          <li key={m.id} className="py-2 flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <span className="text-slate-900 font-black block truncate">{m.nama}</span>
                              <span className="text-slate-400 font-normal">{m.nomorRumah || m.kelompok}</span>
                            </div>
                            <span className="text-slate-400 shrink-0">{m.bergabung}</span>
                          </li>
                        ))}
                        {wargaTerbaru.length === 0 && <li className="py-2 text-slate-400 italic">Belum ada data warga.</li>}
                      </ul>
                    </div>

                    {/* WARGA KELUAR - diisi Admin, otomatis konek & tampil di akun Dashboard Warga (user) */}
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-3">Warga Keluar</h4>
                      <ul className="divide-y text-[11px] font-semibold">
                        {wargaKeluarTampil.map(w => (
                          <li key={w.id} className="py-2 flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <span className="text-slate-900 font-black block truncate">{w.nama}</span>
                              <span className="text-slate-400 font-normal">{w.blok}</span>
                            </div>
                            <span className="text-slate-400 shrink-0">{w.tanggalKeluar}</span>
                          </li>
                        ))}
                        {wargaKeluarTampil.length === 0 && <li className="py-2 text-slate-400 italic">Belum ada data warga keluar.</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeMenu === 'dashboard' && (
              <div className="space-y-6">

                {/* USER INTERFACE VIEW */}
                {role === 'user' && (
                  <div className="space-y-6 anim-fade">
                    <div className="bg-white p-5 rounded-2xl border flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900">Assalamu'alaikum, {activeUserSession.nama} 👋</h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">Berikut ringkasan iuran Anda periode {periodeTahun}.</p>
                      </div>
                      <NotifikasiBell />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold">
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Target Total</span>
                        <p className="text-lg font-black text-slate-900">Rp {activeUserSession.target.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Sudah Dibayar</span>
                        <p className="text-lg font-black text-emerald-600">Rp {userDanaMasuk.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Sisa Tagihan</span>
                        <p className="text-lg font-black text-rose-500">Rp {userSisaTagihan.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Persentase</span>
                        <p className="text-lg font-black text-emerald-700">{persentaseCapaian}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 bg-white p-5 rounded-2xl border text-xs">
                        <div className="flex justify-between font-bold mb-1">
                          <span>Progress Pembayaran</span>
                          <span className="text-emerald-700">{persentaseCapaian}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full transition-all duration-700" style={{ width: `${persentaseCapaian}%` }}></div>
                        </div>
                        <p className="text-slate-400 font-medium mt-2">Anda telah menyelesaikan {userRows.filter(r => r.status === 'LUNAS').length} dari 12 angsuran.</p>
                        <h4 className="font-black text-slate-900 uppercase text-[10px] mt-4 mb-1">Timeline Pembayaran Jan - Des {periodeTahun}</h4>
                        <BarTimeline data={userTimeline} />
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border text-xs">
                          <h4 className="font-black text-slate-900 text-[11px] mb-2">Informasi Saya</h4>
                          <div className="space-y-1 text-slate-500 font-semibold">
                            <p>Nama: <span className="text-slate-800">{activeUserSession.nama}</span></p>
                            <p>Nomor Rumah/Blok: <span className="text-slate-800">{activeUserSession.nomorRumah || activeUserSession.nama}</span></p>
                            <p>No. WhatsApp: <span className="text-slate-800">{activeUserSession.wa}</span></p>
                            <p>Alamat: <span className="text-slate-800">{activeUserSession.alamat || '-'}</span></p>
                            <p>Tanggal Bergabung: <span className="text-slate-800">{activeUserSession.bergabung}</span></p>
                            <p>Status: <span className="text-emerald-700">{activeUserSession.statusAnggota}</span></p>
                          </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border text-xs">
                          <h4 className="font-black text-slate-900 text-[11px] mb-2">Pengumuman &amp; Agenda Terbaru</h4>
                          <p className="text-slate-500 font-medium leading-relaxed mb-2">{cmsTeks.pengumuman}</p>
                          {kegiatanList.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                              <p className="text-emerald-800 font-black text-[10px]">{kegiatanList[kegiatanList.length - 1].judul}</p>
                              <p className="text-emerald-700 font-semibold text-[10px] mt-0.5">{kegiatanList[kegiatanList.length - 1].tanggal}{kegiatanList[kegiatanList.length - 1].jam ? `, ${kegiatanList[kegiatanList.length - 1].jam} WIB` : ''} — {kegiatanList[kegiatanList.length - 1].tempat}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIWAYAT PEMBAYARAN + UPLOAD BUKTI (SATU TEMPAT, TIDAK DOBLE) */}
                    <div className="bg-white p-6 rounded-2xl border shadow-xs">
                      <div className="flex justify-between items-center border-b pb-2 mb-4 flex-wrap gap-1">
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Riwayat Pembayaran {periodeTahun}</h3>
                        <p className="text-[10px] text-slate-400">Isi tanggal &amp; jumlah transaksi, lalu upload bukti transfer (foto/PDF) di baris bulan yang belum dibayar. Nominal default otomatis menyesuaikan sisa tagihan dibagi sisa bulan.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-semibold">
                          <thead>
                            <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                              <th className="py-2 pr-2">Bulan</th>
                              <th className="py-2 pr-2">Angsuran</th>
                              <th className="py-2 pr-2">Nominal</th>
                              <th className="py-2 pr-2">Status</th>
                              <th className="py-2 pr-2">Tanggal Bayar</th>
                              <th className="py-2 pr-2 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {DAFTAR_BULAN.map(bln => {
                              const matchRow = userRows.find(r => r.bulanNama === bln.nama);
                              const status = matchRow ? matchRow.status : 'BELUM BAYAR';
                              const inputBayar = formBayarInput[bln.nama] || { tanggal: '', nominal: userCicilanSuggest || IURAN_BULANAN };
                              return (
                                <tr key={bln.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 pr-2 text-slate-900 font-black">{bln.nama} {periodeTahun}</td>
                                  <td className="py-2.5 pr-2 text-slate-500">Ke-{bln.id}</td>
                                  <td className="py-2.5 pr-2 text-slate-700">
                                    {status === 'BELUM BAYAR' ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-400 font-normal">Rp</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={inputBayar.nominal}
                                          onChange={(e) => setFormBayarInput({ ...formBayarInput, [bln.nama]: { ...inputBayar, nominal: e.target.value } })}
                                          className="w-24 border p-1 rounded-lg bg-slate-50 font-bold"
                                        />
                                      </div>
                                    ) : (
                                      <>Rp {(matchRow ? matchRow.nominal : IURAN_BULANAN).toLocaleString('id-ID')}</>
                                    )}
                                  </td>
                                  <td className="py-2.5 pr-2"><BadgeStatus status={status} /></td>
                                  <td className="py-2.5 pr-2 text-slate-400">
                                    {status === 'BELUM BAYAR' ? (
                                      <input
                                        type="date"
                                        value={inputBayar.tanggal}
                                        onChange={(e) => setFormBayarInput({ ...formBayarInput, [bln.nama]: { ...inputBayar, tanggal: e.target.value } })}
                                        className="border p-1 rounded-lg bg-slate-50 font-bold text-slate-700"
                                      />
                                    ) : (
                                      matchRow && matchRow.tglBayar ? matchRow.tglBayar : '-'
                                    )}
                                  </td>
                                  <td className="py-2.5 pr-2 text-right">
                                    {/* Dua slot LEBAR TETAP (Aksi Utama & Lihat Bukti) supaya tombol
                                        tidak "geser" antar baris walau salah satu slot kosong. */}
                                    <div className="flex justify-end items-center gap-1.5">
                                      <div className="min-w-[126px] flex justify-end">
                                        {status === 'BELUM BAYAR' && (
                                          <label className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white px-3 py-1.5 rounded-lg text-[10px] transition-transform hover:scale-[1.03] cursor-pointer whitespace-nowrap">
                                            Upload Bukti
                                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleUploadBayar(e, bln.nama, inputBayar.tanggal, inputBayar.nominal)} />
                                          </label>
                                        )}
                                        {status === 'MENUNGGU VERIFIKASI' && (
                                          <span className="text-amber-600 text-[10px] font-bold whitespace-nowrap">Menunggu Bendahara</span>
                                        )}
                                        {status === 'LUNAS' && (
                                          <button onClick={() => setSelectedKuitansi({ nama: activeUserSession.nama, nomorRumah: activeUserSession.nomorRumah || activeUserSession.nama, email: activeUserSession.email, bulan: bln.nama, angsuranKe: bln.id, nominal: matchRow ? matchRow.nominal : IURAN_BULANAN, tanggal: matchRow.tglBayar || '10 Jan 2026', waktuLunas: (matchRow && matchRow.waktuVerifikasi) || (matchRow && matchRow.tglBayar) || '10 Januari 2026', noKuitansi: `IWR-${periodeTahun}-${String(bln.id).padStart(4, '0')}-${activeUserSession.id}` })} className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] transition-transform hover:scale-[1.03] whitespace-nowrap">Lihat Kuitansi</button>
                                        )}
                                      </div>
                                      <div className="min-w-[84px] flex justify-end">
                                        {(status === 'MENUNGGU VERIFIKASI' || (status === 'LUNAS' && matchRow && matchRow.buktiUrl)) && (
                                          <button onClick={() => setPreviewBukti({ ...matchRow })} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap">Lihat Bukti</button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADMIN INTERFACE VIEW */}
                {role === 'admin' && (
                  <div className="space-y-6 anim-fade">
                    <div className="bg-white p-5 rounded-2xl border flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900">Assalamu'alaikum, Bendahara 👋</h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">Ringkasan seluruh iuran warga periode {periodeTahun}.</p>
                      </div>
                      <NotifikasiBell />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold">
                      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white p-5 rounded-2xl">
                        <span className="text-slate-400 block uppercase text-[10px]">Total Kas Global</span>
                        <p className="text-lg font-black">Rp {totalDanaMasukGlobal.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Sisa Tagihan</span>
                        <p className="text-lg font-black text-rose-500">Rp {totalSisaGlobal.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Verifikasi Pending</span>
                        <p className="text-lg font-black text-amber-600">Rp {totalVerifPendingGlobal.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Total Warga</span>
                        <p className="text-lg font-black text-slate-900">{jumlahAktif} Jiwa</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 bg-white p-5 rounded-2xl border text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-black text-slate-900 uppercase text-[10px]">Timeline Pemasukan Jan - Des {periodeTahun}</h4>
                          <select value={adminTimelineFilter} onChange={(e) => setAdminTimelineFilter(e.target.value)} className="border p-1.5 rounded-lg bg-slate-50 font-bold text-[10px]">
                            <option value="Semua">Semua Warga</option>
                            {members.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
                          </select>
                        </div>
                        <p className="text-slate-400 font-medium text-[10px]">Total masuk {adminTimelineFilter === 'Semua' ? 'seluruh warga' : adminTimelineFilter}: Rp {adminTimeline.reduce((a, b) => a + b.totalMasuk, 0).toLocaleString('id-ID')}</p>
                        <BarTimeline data={adminTimeline} />
                      </div>
                      <div className="bg-white p-5 rounded-2xl border text-xs">
                        <h4 className="font-black text-slate-900 text-[11px] mb-2">Pengumuman &amp; Agenda Terbaru</h4>
                        <p className="text-slate-500 font-medium leading-relaxed mb-2">{cmsTeks.pengumuman}</p>
                        {kegiatanList.length > 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                            <p className="text-emerald-800 font-black text-[10px]">{kegiatanList[kegiatanList.length - 1].judul}</p>
                            <p className="text-emerald-700 font-semibold text-[10px] mt-0.5">{kegiatanList[kegiatanList.length - 1].tanggal}{kegiatanList[kegiatanList.length - 1].jam ? `, ${kegiatanList[kegiatanList.length - 1].jam} WIB` : ''} — {kegiatanList[kegiatanList.length - 1].tempat}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RINGKASAN DANA MASUK PER BLOK/KELOMPOK (DI BAWAH TIMELINE) */}
                    <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase">Ringkasan Dana Masuk per Blok</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Bandingkan target vs dana masuk tiap kelompok. Klik "Lihat Rincian Anggota" untuk drill-down siapa saja yang belum bayar.</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span>Filter Blok:</span>
                          <select value={adminFilterNomorPengajuan} onChange={(e) => setAdminFilterNomorPengajuan(e.target.value)} className="border p-2 rounded-xl bg-slate-100 text-slate-800">
                            <option value="Semua">Semua Blok</option>
                            {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {rekapPerNomorPengajuan
                          .filter(k => adminFilterNomorPengajuan === 'Semua' || k.nama === adminFilterNomorPengajuan)
                          .map(k => (
                            <div key={k.id} className="border rounded-xl p-4 bg-slate-50">
                              <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-700 font-bold text-xs">{k.nama}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${k.status === 'Progress' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{k.status}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1">{k.jenis} • {k.anggotaKelompok.length}/{k.kapasitas} anggota</p>
                                </div>
                                {k.anggotaBelumLunas.length > 0 && (
                                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-1 rounded-lg">⚠ {k.anggotaBelumLunas.length} anggota belum lunas</span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-[11px] font-semibold">
                                <div><span className="text-slate-400 block text-[9px] uppercase">Target</span><span className="text-slate-900 font-black">Rp {k.targetKelompok.toLocaleString('id-ID')}</span></div>
                                <div><span className="text-slate-400 block text-[9px] uppercase">Dana Masuk</span><span className="text-emerald-700 font-black">Rp {k.masukKelompok.toLocaleString('id-ID')}</span></div>
                                <div><span className="text-slate-400 block text-[9px] uppercase">Sisa Kurang</span><span className="text-rose-500 font-black">Rp {k.sisaKelompok.toLocaleString('id-ID')}</span></div>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${k.persenKelompok}%` }}></div>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] text-slate-400">{k.persenKelompok}% terkumpul{k.pendingKelompok > 0 ? ` • Rp ${k.pendingKelompok.toLocaleString('id-ID')} menunggu verifikasi` : ''}</span>
                                <button onClick={() => setExpandedRekapKelompokId(expandedRekapKelompokId === k.id ? null : k.id)} className="text-emerald-700 font-bold text-[10px] underline underline-offset-2">
                                  {expandedRekapKelompokId === k.id ? 'Tutup Rincian' : 'Lihat Rincian Anggota'}
                                </button>
                              </div>

                              {expandedRekapKelompokId === k.id && (
                                <div className="mt-3 pt-3 border-t overflow-x-auto">
                                  <table className="w-full text-[11px] font-semibold">
                                    <thead>
                                      <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                                        <th className="py-1.5 pr-2">Nama Anggota</th>
                                        <th className="py-1.5 pr-2">Target</th>
                                        <th className="py-1.5 pr-2">Dibayar</th>
                                        <th className="py-1.5 pr-2">Sisa</th>
                                        <th className="py-1.5 pr-2">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {k.anggotaKelompok.map(m => (
                                        <tr key={m.id} className={`border-b last:border-0 ${m.sisa > 0 ? 'bg-rose-50/60' : ''}`}>
                                          <td className="py-1.5 pr-2 font-black text-slate-900">{m.nama}</td>
                                          <td className="py-1.5 pr-2 text-slate-500">Rp {m.target.toLocaleString('id-ID')}</td>
                                          <td className="py-1.5 pr-2 text-emerald-700">Rp {m.dibayar.toLocaleString('id-ID')}</td>
                                          <td className="py-1.5 pr-2 text-rose-500">Rp {m.sisa.toLocaleString('id-ID')}</td>
                                          <td className="py-1.5 pr-2">
                                            {m.sisa === 0 ? (
                                              <span className="text-emerald-700 font-black">Lunas</span>
                                            ) : m.pending > 0 ? (
                                              <span className="text-amber-600 font-black">Ada Menunggu Verifikasi</span>
                                            ) : (
                                              <span className="text-rose-600 font-black">Belum Bayar</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                      {k.anggotaKelompok.length === 0 && (
                                        <tr><td colSpan={5} className="py-3 text-center text-slate-400 italic">Belum ada anggota di kelompok ini.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))}
                        {rekapPerNomorPengajuan.filter(k => adminFilterNomorPengajuan === 'Semua' || k.nama === adminFilterNomorPengajuan).length === 0 && (
                          <p className="text-slate-400 italic text-xs">Tidak ada kelompok yang cocok dengan filter.</p>
                        )}
                      </div>
                    </div>
                    {/* RIWAYAT PEMBAYARAN SELURUH WARGA */}
                    <div className="bg-white p-6 rounded-2xl border shadow-xs">
                      <div className="flex justify-between items-center flex-wrap gap-2 mb-4 border-b pb-3">
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Riwayat Pembayaran {adminTimelineFilter === 'Semua' ? 'Seluruh Warga' : adminTimelineFilter}</h3>
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <input
                            type="text"
                            value={adminCariNama}
                            onChange={(e) => setAdminCariNama(e.target.value)}
                            placeholder="Cari nama warga..."
                            className="border p-2 rounded-xl bg-slate-50 text-slate-800 font-semibold w-40"
                          />
                          <button
                            onClick={() => setAdminSortNamaDir(adminSortNamaDir === 'asc' ? 'desc' : adminSortNamaDir === 'desc' ? null : 'asc')}
                            className="border p-2 rounded-xl bg-slate-50 text-slate-700 whitespace-nowrap"
                            title="Urutkan berdasarkan nama"
                          >
                            Sort Nama {adminSortNamaDir === 'asc' ? '(A-Z) ▲' : adminSortNamaDir === 'desc' ? '(Z-A) ▼' : '(Terbaru)'}
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-[11px] font-semibold">
                          <thead className="sticky top-0 bg-white">
                            <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                              <th className="py-2 pr-2">Nama</th>
                              <th className="py-2 pr-2">Bulan</th>
                              <th className="py-2 pr-2">Nominal</th>
                              <th className="py-2 pr-2">Status</th>
                              <th className="py-2 pr-2">Tanggal Bayar</th>
                              <th className="py-2 pr-2">Bukti</th>
                            </tr>
                          </thead>
                          <tbody>
                            {riwayatPembayaranAdminTampil.map((r, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 pr-2 text-slate-900 font-black">{r.userNama}</td>
                                  <td className="py-2.5 pr-2 text-slate-500">{r.bulanNama} {periodeTahun}</td>
                                  <td className="py-2.5 pr-2 text-slate-700">Rp {r.nominal.toLocaleString('id-ID')}</td>
                                  <td className="py-2.5 pr-2"><BadgeStatus status={r.status} /></td>
                                  <td className="py-2.5 pr-2 text-slate-400">{r.tglBayar || '-'}</td>
                                  <td className="py-2.5 pr-2">
                                    {r.buktiUrl ? (
                                      <button onClick={() => setPreviewBukti({ ...r })} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">Lihat</button>
                                    ) : <span className="text-slate-300">-</span>}
                                  </td>
                                </tr>
                              ))}
                            {riwayatPembayaranAdminTampil.length === 0 && (
                              <tr><td colSpan={6} className="py-4 text-center text-slate-400 italic">Belum ada transaksi.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Catatan: "Panel Kontrol Anggota" dipindahkan ke tab "Member Baru"
                        (paling bawah) sesuai permintaan admin, supaya pengelolaan anggota
                        terpusat di satu halaman bersama Antrean Aktivasi & Manajemen Akses. */}

                    {/* REKAPAN PER NAMA UNTUK MONITORING */}
                    <div className="bg-white p-6 rounded-2xl border shadow-xs">
                      <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase">Rekap Per Anggota (Monitoring)</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Ringkasan capaian tiap warga dalam satu tabel untuk memudahkan pemantauan.</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-[11px] font-semibold">
                          <thead className="sticky top-0 bg-white">
                            <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                              <th className="py-2 pr-2">Nama</th>
                              <th className="py-2 pr-2">Nomor Rumah/Blok</th>
                              <th className="py-2 pr-2">Kelompok</th>
                              <th className="py-2 pr-2">Status</th>
                              <th className="py-2 pr-2">Bulan Lunas</th>
                              <th className="py-2 pr-2">Dibayar</th>
                              <th className="py-2 pr-2">Sisa</th>
                              <th className="py-2 pr-2">Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rekapPerAnggota.map(m => (
                              <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 pr-2 text-slate-900 font-black">{m.nama}</td>
                                <td className="py-2.5 pr-2 text-emerald-700 font-bold">{m.nomorRumah || m.nama}</td>
                                <td className="py-2.5 pr-2 text-slate-500">{m.kelompok}</td>
                                <td className="py-2.5 pr-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${m.statusAnggota === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{m.statusAnggota}</span>
                                </td>
                                <td className="py-2.5 pr-2 text-slate-700">{m.bulanLunas} / 12</td>
                                <td className="py-2.5 pr-2 text-emerald-700">Rp {m.dibayar.toLocaleString('id-ID')}</td>
                                <td className="py-2.5 pr-2 text-rose-500">Rp {m.sisa.toLocaleString('id-ID')}</td>
                                <td className="py-2.5 pr-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-emerald-600 h-full" style={{ width: `${m.persen}%` }}></div>
                                    </div>
                                    <span className="text-slate-500">{m.persen}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {rekapPerAnggota.length === 0 && (
                              <tr><td colSpan={8} className="py-4 text-center text-slate-400 italic">Belum ada data anggota.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REKAP BLOK RUMAH */}
            {activeMenu === 'laporan-sapi' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Daftar Blok Rumah RT</h3>
                    <p className="text-xs text-slate-400">
                      {role === 'user' ? `Menampilkan informasi internal ${activeUserSession.kelompok} saja.` : 'Menampilkan seluruh database kelompok beserta status untuk pengurus.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
                    {kelompokList.filter(k => role === 'admin' || activeUserSession.kelompok === k.nama).map(k => {
                      const anggotaKelompok = members.filter(m => m.kelompok === k.nama);
                      const rekapUsia = getRekapKategoriUsia(anggotaKelompok);
                      const totalJiwa = anggotaKelompok.length + anggotaKelompok.reduce((acc, m) => acc + (m.anggotaKeluarga || []).length, 0);
                      return (
                        <div key={k.id} className="border p-4 rounded-xl bg-slate-50 space-y-2">
                          <div className="flex justify-between items-start font-bold border-b pb-1.5 text-emerald-950">
                            <div>
                              <span className="block">{k.nama}</span>
                              <span className="block text-[10px] font-mono text-slate-400 font-normal">{k.jenis} • Kapasitas {k.kapasitas} orang</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] shrink-0 ${k.status === 'Progress' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}`}>{k.status}</span>
                          </div>
                          <ul className="space-y-1 text-slate-700">
                            {anggotaKelompok.map((m, i) => <li key={i}>• {m.nama} <span className="text-slate-400 font-normal">({m.statusRumah || '-'}, {(m.anggotaKeluarga || []).length} anggota keluarga)</span></li>)}
                            {anggotaKelompok.length === 0 && <li className="text-slate-400 italic">Belum ada anggota</li>}
                          </ul>
                          {/* KATEGORI USIA OTOMATIS (dihitung dari seluruh anggota keluarga di blok ini) */}
                          <div className="pt-2 border-t">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block mb-1.5">Rekap Usia Otomatis • Total {totalJiwa} jiwa</span>
                            <div className="grid grid-cols-1 gap-1">
                              {KATEGORI_USIA_LIST.map(kat => (
                                <div key={kat} className="flex items-center justify-between bg-white border rounded-lg px-2 py-1 text-[10px]">
                                  <span className="text-slate-500">{kat}</span>
                                  <span className="font-black text-emerald-700">{rekapUsia[kat]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {kelompokList.length === 0 && <p className="text-slate-400 italic sm:col-span-2">Belum ada kelompok dibuat.</p>}
                  </div>
                </div>

                {/* DATA SEMUA WARGA (KHUSUS ADMIN) - per Kepala Keluarga, lengkap dengan anggota keluarga */}
                {role === 'admin' && (() => {
                  const dataTerfilter = members.filter(m =>
                    m.nama.toLowerCase().includes(filterDataWargaNama.toLowerCase()) ||
                    (m.alamat || '').toLowerCase().includes(filterDataWargaNama.toLowerCase())
                  );
                  return (
                    <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase">📋 Data Semua Warga</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Data per Kepala Keluarga (KK) lengkap dengan anggota keluarga, usia, tanggal lahir & kategori usia.</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          placeholder="🔍 Cari nama KK atau alamat..."
                          value={filterDataWargaNama}
                          onChange={(e) => setFilterDataWargaNama(e.target.value)}
                          className="flex-1 min-w-[180px] border p-2 rounded-xl bg-slate-50 text-xs font-semibold"
                        />
                        {filterDataWargaNama && (
                          <button type="button" onClick={() => setFilterDataWargaNama('')} className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">Reset Filter</button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {dataTerfilter.map(m => (
                          <div key={m.id} className="border rounded-xl p-4 bg-slate-50">
                            <div className="flex justify-between items-start flex-wrap gap-2 border-b pb-2 mb-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 text-xs">{m.nama}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Kepala Keluarga</span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${m.statusAnggota === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{m.statusAnggota}</span>
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-slate-200 text-slate-600 capitalize">{m.akses}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">📍 {m.alamat || m.nomorRumah} • Status Rumah: {m.statusRumah || '-'}</p>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] font-semibold">
                                <thead>
                                  <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                                    <th className="py-1.5 pr-2">Nama Anggota</th>
                                    <th className="py-1.5 pr-2">Hubungan</th>
                                    <th className="py-1.5 pr-2">Tanggal Lahir</th>
                                    <th className="py-1.5 pr-2">Usia</th>
                                    <th className="py-1.5 pr-2">Kategori Usia</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(m.anggotaKeluarga || []).map(a => {
                                    const usia = hitungUsia(a.tanggalLahir);
                                    return (
                                      <tr key={a.id} className="border-b last:border-0">
                                        <td className="py-1.5 pr-2 font-black text-slate-900">{a.nama}</td>
                                        <td className="py-1.5 pr-2 text-emerald-700 font-bold">{a.hubungan || '-'}</td>
                                        <td className="py-1.5 pr-2 text-slate-500">{a.tanggalLahir}</td>
                                        <td className="py-1.5 pr-2 text-slate-700 font-bold">{usia !== null ? `${usia} tahun` : '-'}</td>
                                        <td className="py-1.5 pr-2"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700">{kategoriUsia(usia)}</span></td>
                                      </tr>
                                    );
                                  })}
                                  {(m.anggotaKeluarga || []).length === 0 && (
                                    <tr><td colSpan={5} className="py-2 text-slate-400 italic">Belum ada anggota keluarga tercatat.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                        {dataTerfilter.length === 0 && (
                          <p className="text-slate-400 italic text-xs text-center py-3">Tidak ada warga yang cocok dengan filter.</p>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">Menampilkan {dataTerfilter.length} dari {members.length} total KK.</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ANGGOTA KELUARGA (USER) */}
            {activeMenu === 'anggota-keluarga' && role === 'user' && (() => {
              const daftarKeluarga = isSimulatedSession
                ? [
                    { id: 'SIM-AK-01', nama: 'Contoh Istri (Simulasi)', hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1992-05-10' },
                    { id: 'SIM-AK-02', nama: 'Contoh Anak (Simulasi)', hubungan: 'Anak ke-1', jenisKelamin: 'Laki-laki', tanggalLahir: '2018-09-15' },
                  ]
                : (activeUserSession.anggotaKeluarga || []);
              return (
                <div className="space-y-6">
                  {isSimulatedSession && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-semibold leading-relaxed">
                      🧪 <strong>Ini tampilan simulasi</strong> — data di bawah adalah contoh, bukan data keluarga yang sesungguhnya. Setelah Anda <strong>Login Akun Resmi</strong>, halaman ini menampilkan data keluarga ASLI dan Anda bisa menambah/menghapus anggota.
                    </div>
                  )}
                  <div className="bg-white p-6 rounded-2xl border shadow-xs">
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">👨‍👩‍👧‍👦 Anggota Keluarga</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Kepala Keluarga: <strong className="text-slate-700">{activeUserSession.nama}</strong> • {activeUserSession.alamat || activeUserSession.nomorRumah} • Status Rumah: {activeUserSession.statusRumah || '-'}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{daftarKeluarga.length} anggota tercatat</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] font-semibold">
                        <thead>
                          <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                            <th className="py-2 pr-2">Nama</th>
                            <th className="py-2 pr-2">Hubungan</th>
                            <th className="py-2 pr-2">Jenis Kelamin</th>
                            <th className="py-2 pr-2">Tanggal Lahir</th>
                            <th className="py-2 pr-2">Usia</th>
                            <th className="py-2 pr-2">Kategori</th>
                            <th className="py-2 pr-2">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daftarKeluarga.map(a => {
                            const usia = hitungUsia(a.tanggalLahir);
                            return (
                              <tr key={a.id} className="border-b last:border-0">
                                <td className="py-2.5 pr-2 font-black text-slate-900">{a.nama}</td>
                                <td className="py-2.5 pr-2 text-emerald-700 font-bold">{a.hubungan || '-'}</td>
                                <td className="py-2.5 pr-2 text-slate-500">{a.jenisKelamin}</td>
                                <td className="py-2.5 pr-2 text-slate-500">{a.tanggalLahir}</td>
                                <td className="py-2.5 pr-2 text-slate-700 font-bold">{usia !== null ? `${usia} tahun` : '-'}</td>
                                <td className="py-2.5 pr-2"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700">{kategoriUsia(usia)}</span></td>
                                <td className="py-2.5 pr-2">
                                  <button onClick={() => handleHapusAnggotaKeluargaUser(a.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-bold">Hapus</button>
                                </td>
                              </tr>
                            );
                          })}
                          {daftarKeluarga.length === 0 && (
                            <tr><td colSpan={7} className="py-3 text-center text-slate-400 italic">Belum ada anggota keluarga tercatat.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TAMBAH ANGGOTA KELUARGA BARU */}
                  <div className="bg-white p-6 rounded-2xl border shadow-xs">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-1">+ Tambah Anggota Keluarga</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Mis. ada anggota keluarga baru (anak baru lahir, dll). Data ini otomatis ikut terhitung di rekap usia untuk pengurus RT.</p>
                    <form onSubmit={handleTambahAnggotaKeluargaUser} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-semibold bg-slate-50 border rounded-xl p-3">
                      <input type="text" required placeholder="Nama lengkap" value={formTambahAnggotaUser.nama} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, nama: e.target.value})} className="w-full border p-2 rounded-lg bg-white" />
                      <select required value={formTambahAnggotaUser.hubungan} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, hubungan: e.target.value})} className="w-full border p-2 rounded-lg bg-white font-bold">
                        {HUBUNGAN_KELUARGA_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select required value={formTambahAnggotaUser.jenisKelamin} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, jenisKelamin: e.target.value})} className="w-full border p-2 rounded-lg bg-white font-bold">
                        <option value="Perempuan">Perempuan</option>
                        <option value="Laki-laki">Laki-laki</option>
                      </select>
                      <input type="date" required value={formTambahAnggotaUser.tanggalLahir} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, tanggalLahir: e.target.value})} className="w-full border p-2 rounded-lg bg-white" />
                      <button type="submit" className="sm:col-span-4 bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg">+ Tambah Anggota</button>
                    </form>
                  </div>
                </div>
              );
            })()}

            {/* INFORMASI UMUM (USER) */}
            {activeMenu === 'informasi-umum' && role === 'user' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 mb-1">{cmsTeks.namaRT}</h3>
                  <p className="text-xs text-slate-500">{cmsTeks.alamatRT}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Kontak: <a href={buatLinkWhatsapp(cmsTeks.infoKontak)} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline underline-offset-2">{cmsTeks.infoKontak} (Chat WA)</a>
                    &nbsp;|&nbsp; Rekening: <span className="font-bold text-slate-700">{cmsTeks.noRekening}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border">
                    <h4 className="font-black text-emerald-800 uppercase tracking-wider mb-2 text-xs">Visi</h4>
                    <p className="text-slate-600 leading-relaxed font-medium text-xs">{cmsTeks.visi}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border">
                    <h4 className="font-black text-emerald-800 uppercase tracking-wider mb-2 text-xs">Misi</h4>
                    <p className="text-slate-600 leading-relaxed font-medium text-xs">{cmsTeks.misi}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Syarat Mengikuti Program</h4>
                    <ul className="space-y-2 text-xs font-semibold text-slate-700">
                      {cmsTeks.syaratList.map((s, i) => (
                        <li key={i} className="flex gap-2"><span className="text-emerald-600">✔</span><span>{s}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Ketentuan Program</h4>
                    <ul className="space-y-2 text-xs font-semibold text-slate-700">
                      {cmsTeks.ketentuanList.map((s, i) => (
                        <li key={i} className="flex gap-2"><span className="text-emerald-600">✔</span><span>{s}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>

                {agendaUtama.judul && (
                  <div className="bg-white p-6 rounded-2xl border-2 border-amber-400 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider">⭐ Agenda Utama Periode {periodeTahun}</h3>
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Agenda Spesial</span>
                    </div>
                    <div className="rounded-2xl border overflow-hidden bg-slate-50 anim-fade">
                      <div className="w-full h-64 bg-slate-200 flex items-center justify-center overflow-hidden">
                        {agendaUtama.foto ? (
                          <img loading="lazy" decoding="async" src={agendaUtama.foto} alt={agendaUtama.judul} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">Belum ada foto agenda utama</span>
                        )}
                      </div>
                      <div className="p-5 text-xs">
                        <p className="text-slate-400 font-bold text-[11px]">{agendaUtama.tanggal}{agendaUtama.jam ? ` • ${agendaUtama.jam} WIB` : ''}</p>
                        <h4 className="text-slate-900 font-black text-base mt-1">{agendaUtama.judul}</h4>
                        {(agendaUtama.tempat || agendaUtama.pembicara) && (
                          <p className="text-emerald-700 font-bold mt-1.5 text-[11px]">{agendaUtama.tempat}{agendaUtama.tempat && agendaUtama.pembicara ? ' • ' : ''}{agendaUtama.pembicara ? `Bersama: ${agendaUtama.pembicara}` : ''}</p>
                        )}
                        <p className="text-slate-500 font-normal mt-2 leading-relaxed">{agendaUtama.detail}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Dokumentasi Kegiatan Periode {periodeTahun}</h3>
                    <span className="text-[10px] font-bold text-slate-400">{kegiatanList.length} kegiatan tercatat</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {kegiatanList.map(k => (
                      <div key={k.id} className="rounded-xl border overflow-hidden bg-slate-50 anim-fade">
                        <div className="w-full h-28 bg-slate-200 flex items-center justify-center overflow-hidden">
                          {k.foto ? (
                            <img loading="lazy" decoding="async" src={k.foto} alt={k.judul} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Belum ada foto</span>
                          )}
                        </div>
                        <div className="p-3 text-xs">
                          <p className="text-slate-400 font-bold text-[10px]">{k.tanggal}{k.jam ? ` • ${k.jam} WIB` : ''}</p>
                          <h4 className="text-slate-900 font-bold mt-0.5">{k.judul}</h4>
                          {(k.tempat || k.pembicara) && (
                            <p className="text-emerald-700 font-bold mt-1 text-[10px]">{k.tempat}{k.tempat && k.pembicara ? ' • ' : ''}{k.pembicara ? `Pembicara: ${k.pembicara}` : ''}</p>
                          )}
                          <p className="text-slate-500 font-normal mt-1 leading-relaxed">{k.detail}</p>
                        </div>
                      </div>
                    ))}
                    {kegiatanList.length === 0 && (
                      <p className="text-slate-400 italic text-xs col-span-3">Belum ada kegiatan tercatat pada periode ini.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LAPORAN BELANJA KAS RT (REALISASI PENGELUARAN DARI BENDAHARA, DENGAN BUKTI FOTO) */}
            {activeMenu === 'laporan-belanja' && role === 'user' && (() => {
              const dataTampil = isSimulatedSession
                ? DUMMY_REALISASI_SIMULASI
                : realisasiBelanja.filter(r => r.kelompok === 'Semua' || r.kelompok === activeUserSession.kelompok);
              const totalBelanja = dataTampil.reduce((acc, r) => acc + r.nominal, 0);
              return (
                <div className="space-y-4">
                  {isSimulatedSession && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-semibold leading-relaxed">
                      🧪 <strong>Ini tampilan simulasi</strong> — data di bawah adalah contoh, bukan realisasi belanja yang sesungguhnya. Setelah Anda <strong>Login Akun Resmi</strong> memakai username &amp; password asli, halaman ini otomatis menampilkan data ASLI yang diinput Bendahara dari Google Sheets.
                    </div>
                  )}
                  <div className="bg-white p-6 rounded-2xl border shadow-xs">
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Laporan Belanja Kas RT</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Realisasi pengeluaran panitia/bendahara, lengkap dengan bukti foto struk/nota.</p>
                      </div>
                      <span className="text-[11px] font-black text-rose-600">Total Belanja: Rp {totalBelanja.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="space-y-2 text-xs font-semibold">
                      {dataTampil.map(r => (
                        <div key={r.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2">
                          <div className="min-w-0">
                            <span className="inline-block text-[9px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-1">{r.kategori}</span>
                            <p className="text-slate-900 font-bold">{r.keterangan}</p>
                            <p className="text-slate-400">{r.tanggal} • Rp {r.nominal.toLocaleString('id-ID')} • Dicatat oleh {r.dicatatOleh}</p>
                          </div>
                          {r.buktiUrl ? (
                            <button onClick={() => setPreviewLampiran({ judul: r.keterangan, url: r.buktiUrl, namaFile: r.buktiNamaFile, tipe: 'gambar' })} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg shrink-0">📷 Lihat Bukti</button>
                          ) : (
                            <span className="text-slate-400 italic text-[10px] shrink-0">Bukti belum diunggah</span>
                          )}
                        </div>
                      ))}
                      {dataTampil.length === 0 && <p className="text-slate-400 italic">Belum ada realisasi belanja tercatat.</p>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* UBAH PASSWORD (USER) */}
            {activeMenu === 'ubah-password' && role === 'user' && (
              <div className="bg-white p-6 rounded-2xl border shadow-xs max-w-md">
                <h3 className="text-sm font-black text-slate-900 mb-1">Ubah Password</h3>
                <p className="text-[11px] text-slate-400 mb-4">Akun: {activeUserSession.username}</p>
                <form onSubmit={handleUserGantiPassword} className="space-y-3 text-xs font-semibold">
                  <div>
                    <label className="block mb-1 text-slate-600">Password Lama</label>
                    <input type="password" required value={formUbahPassword.lama} onChange={(e) => setFormUbahPassword({...formUbahPassword, lama: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600">Password Baru</label>
                    <input type="password" required value={formUbahPassword.baru} onChange={(e) => setFormUbahPassword({...formUbahPassword, baru: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600">Konfirmasi Password Baru</label>
                    <input type="password" required value={formUbahPassword.konfirmasi} onChange={(e) => setFormUbahPassword({...formUbahPassword, konfirmasi: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" />
                  </div>
                  {passwordMsg.teks && (
                    <p className={`text-[11px] font-bold ${passwordMsg.tipe === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>{passwordMsg.teks}</p>
                  )}
                  <button type="submit" className="w-full bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold p-2.5 rounded-xl">Simpan Password Baru</button>
                </form>
              </div>
            )}

            {/* PENDING PEMBAYARAN BENDAHARA */}
            {activeMenu === 'pending-pembayaran' && role === 'admin' && (
              <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900">List Verifikasi Pembayaran Pending</h3>
                <p className="text-[11px] text-slate-400 -mt-2">Klik "Lihat Bukti" untuk membuka foto/file transfer yang diunggah warga, lalu Setujui bila dana sudah masuk.</p>
                <div className="space-y-2 text-xs font-semibold">
                  {iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').map((req, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2">
                      <div><strong>{req.userNama}</strong><p className="text-slate-400">Bulan {req.bulanNama} | Rp {req.nominal.toLocaleString('id-ID')} {req.buktiNamaFile ? `| File: ${req.buktiNamaFile}` : ''}</p></div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewBukti({ ...req })} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">Lihat Bukti</button>
                        <button onClick={() => handleRejectPembayaran(req.userNama, req.bulanNama)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg">Tolak</button>
                        <button onClick={() => setKonfirmasiApprove({ userNama: req.userNama, bulanNama: req.bulanNama, nominal: req.nominal, dariPreview: false })} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg">Setujui</button>
                      </div>
                    </div>
                  ))}
                  {iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').length === 0 && <p className="text-slate-400 italic">Antrean kosong.</p>}
                </div>
              </div>
            )}

            {/* REALISASI BELANJA KAS RT (BENDAHARA/ADMIN, BUKTI FOTO -> TAMPIL DI DASHBOARD WARGA ASLI) */}
            {activeMenu === 'realisasi-belanja' && role === 'admin' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Realisasi Belanja Kas RT</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Catat setiap pengeluaran panitia lengkap dengan bukti foto struk/nota. Data ini otomatis tampil di menu "Laporan Belanja Kas RT" pada Dashboard warga yang login dengan akun ASLI (bukan simulasi).</p>
                  </div>
                  <div className="space-y-2 text-xs font-semibold">
                    {realisasiBelanja.map(r => (
                      <div key={r.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2">
                        <div className="min-w-0">
                          <span className="inline-block text-[9px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-1">{r.kategori}</span>
                          <p className="text-slate-900 font-bold">{r.keterangan}</p>
                          <p className="text-slate-400">{r.tanggal} • Rp {r.nominal.toLocaleString('id-ID')} • Target: {r.kelompok}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {r.buktiUrl && (
                            <button onClick={() => setPreviewLampiran({ judul: r.keterangan, url: r.buktiUrl, namaFile: r.buktiNamaFile, tipe: 'gambar' })} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">📷 Bukti</button>
                          )}
                          <button onClick={() => handleHapusRealisasiBelanja(r.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg">Hapus</button>
                        </div>
                      </div>
                    ))}
                    {realisasiBelanja.length === 0 && <p className="text-slate-400 italic">Belum ada realisasi belanja tercatat.</p>}
                  </div>

                  <form onSubmit={handleTambahRealisasiBelanja} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                    <p className="text-emerald-800 font-black text-[11px]">+ Tambah Realisasi Belanja</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 text-slate-600">Tanggal</label>
                        <input type="date" value={formRealisasiBaru.tanggal} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, tanggal: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">Kategori</label>
                        <select value={formRealisasiBaru.kategori} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, kategori: e.target.value})} className="w-full border p-2 rounded-xl bg-white font-bold">
                          <option>Kebersihan</option>
                          <option>Keamanan</option>
                          <option>Sosial</option>
                          <option>Operasional</option>
                          <option>Perbaikan Fasilitas</option>
                          <option>Lain-lain</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block mb-1 text-slate-600">Keterangan</label>
                        <input type="text" placeholder="mis. Perbaikan pos ronda Blok A" value={formRealisasiBaru.keterangan} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, keterangan: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">Nominal (Rp)</label>
                        <input type="number" min="0" placeholder="0" value={formRealisasiBaru.nominal} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, nominal: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">Target Tampil</label>
                        <select value={formRealisasiBaru.kelompok} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, kelompok: e.target.value})} className="w-full border p-2 rounded-xl bg-white font-bold">
                          <option value="Semua">Semua Kelompok</option>
                          {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block mb-1 text-slate-600">Bukti Foto Struk/Nota</label>
                        <input type="file" accept="image/*" onChange={handleFotoRealisasiChange} className="w-full border p-2 rounded-xl bg-white text-[11px]" />
                        {formRealisasiBaru.buktiUrl && (
                          <div className="mt-2 flex items-center gap-2">
                            <img loading="lazy" decoding="async" src={formRealisasiBaru.buktiUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover border" />
                            <button type="button" onClick={() => setFormRealisasiBaru(prev => ({ ...prev, buktiUrl: null, buktiNamaFile: null }))} className="text-[10px] font-bold text-rose-600">Hapus Foto</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button type="submit" className="bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-[11px]">+ Simpan Realisasi</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* NOTIFIKASI MEMBER BARU */}
            {activeMenu === 'notif-pengajuan' && role === 'admin' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Antrean Aktivasi Warga Baru</h3>
                  <p className="text-[11px] text-slate-400 -mt-2">Pilih kelompok tujuan dan tingkat akses untuk tiap warga, lalu klik Aktivasi untuk membuat akun; username &amp; password acak otomatis dikirim ke WA warga.</p>
                  <div className="space-y-2 text-xs font-semibold">
                    {pengajuanBaru.map(req => (
                      <div key={req.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <strong>{req.nama}</strong>
                          <p className="text-slate-400">{req.email}</p>
                          {req.nomorRumah && <p className="text-emerald-700 font-bold">Nomor Rumah/Blok: {req.nomorRumah}</p>}
                          {req.alamat && <p className="text-slate-400">Alamat: {req.alamat}</p>}
                          {req.statusRumah && <p className="text-slate-400">Status Rumah: <span className="font-bold text-slate-600">{req.statusRumah}</span></p>}
                          {req.anggotaKeluarga && req.anggotaKeluarga.length > 0 && (
                            <p className="text-slate-400">Anggota Keluarga ({req.anggotaKeluarga.length}): {req.anggotaKeluarga.map(a => a.nama).join(', ')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500 font-bold text-[11px]">Kelompok:</span>
                          <select
                            value={pilihanKelompokPengajuan[req.id] || (kelompokList[0] && kelompokList[0].nama) || ''}
                            onChange={(e) => setPilihanKelompokPengajuan({ ...pilihanKelompokPengajuan, [req.id]: e.target.value })}
                            className="border p-1.5 rounded-lg bg-white font-black text-emerald-800 text-[11px]"
                          >
                            {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama} {k.status === 'Closed' ? '- Closed' : ''}</option>)}
                          </select>
                          <span className="text-slate-500 font-bold text-[11px]">Akses:</span>
                          <select
                            value={pilihanAksesPengajuan[req.id] || 'user'}
                            onChange={(e) => setPilihanAksesPengajuan({ ...pilihanAksesPengajuan, [req.id]: e.target.value })}
                            className="border p-1.5 rounded-lg bg-white font-black text-[11px] text-amber-700"
                          >
                            <option value="user">User (Akses Terbatas)</option>
                            <option value="admin">Admin (Akses Penuh)</option>
                          </select>
                          <button onClick={() => handleTolakMemberBaru(req.id)} className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg">Tolak</button>
                          <button onClick={() => handleApproveMemberBaru(req.id)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg">Aktivasi</button>
                        </div>
                      </div>
                    ))}
                    {pengajuanBaru.length === 0 && <p className="text-slate-400 italic">Tidak ada pengajuan baru.</p>}
                  </div>
                </div>

                {/* MANAJEMEN AKSES WARGA (UBAH AKSES ANGGOTA YANG SUDAH AKTIF, MIS. HIDAYAT) */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Manajemen Akses Warga</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Atur tingkat akses tiap warga yang sudah aktif. Contoh: ubah akses <strong>Hidayat</strong> menjadi Admin agar mendapat akses penuh (Admin Panel), atau kembalikan ke User untuk akses terbatas (Dashboard Warga saja).</p>
                  </div>
                  <div className="space-y-2 text-xs font-semibold">
                    {members.map(m => (
                      <div key={m.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <strong>{m.nama}</strong>
                          <p className="text-slate-400">{m.username} | {m.kelompok}</p>
                          <p className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                            Password: <span className="font-mono font-bold text-slate-700">{visiblePasswordIds.includes(m.id) ? m.password : '••••••••'}</span>
                            <button type="button" onClick={() => togglePasswordVisibility(m.id)} className="text-emerald-700 font-bold text-[10px] underline underline-offset-2">
                              {visiblePasswordIds.includes(m.id) ? 'Sembunyikan' : 'Lihat'}
                            </button>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${(m.akses || 'user') === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            {(m.akses || 'user') === 'admin' ? 'Admin • Akses Penuh' : 'User • Akses Terbatas'}
                          </span>
                          <select
                            value={m.akses || 'user'}
                            onChange={(e) => handleUbahAksesMember(m.id, e.target.value)}
                            className="border p-1.5 rounded-lg bg-white font-black text-[11px]"
                          >
                            <option value="user">User (Akses Terbatas)</option>
                            <option value="admin">Admin (Akses Penuh)</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && <p className="text-slate-400 italic">Belum ada warga aktif.</p>}
                  </div>
                </div>

                {/* PANEL KONTROL & PLOTTING + RESET PASSWORD ANGGOTA
                    (Dipindahkan dari tab Dashboard Utama ke sini, paling bawah tab Member Baru,
                    sesuai permintaan admin, supaya seluruh pengelolaan anggota terpusat di sini.) */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <div className="flex justify-between items-center border-b pb-3 mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase">Panel Kontrol Anggota</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Kelola kelompok, status (Aktif/Pasif) massal, dan akses akun (lihat/reset password) tiap warga.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span>Filter Tampilan Kelompok:</span>
                      <select value={adminGroupFilter} onChange={(e) => { setAdminGroupFilter(e.target.value); setSelectedMemberIds([]); }} className="border p-2 rounded-xl bg-slate-100 text-slate-800">
                        <option value="Semua">Semua Kelompok</option>
                        {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const daftarTampil = members.filter(m => adminGroupFilter === 'Semua' || m.kelompok === adminGroupFilter);
                    const idsTampil = daftarTampil.map(m => m.id);
                    const semuaTerpilih = idsTampil.length > 0 && idsTampil.every(id => selectedMemberIds.includes(id));
                    const idsUntukAksi = selectedMemberIds.length > 0 ? selectedMemberIds : idsTampil;
                    return (
                      <>
                        {/* TOOLBAR AKSI MASSAL */}
                        <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 border rounded-xl p-3 mb-4 text-[11px] font-bold">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={semuaTerpilih} onChange={() => toggleSelectAllMembers(idsTampil)} className="w-4 h-4 accent-emerald-700" />
                            <span>{selectedMemberIds.length > 0 ? `${selectedMemberIds.length} anggota dicentang` : 'Pilih Semua yang Tampil'}</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-normal">Ubah status {selectedMemberIds.length > 0 ? 'anggota tercentang' : 'SEMUA anggota yang tampil'}:</span>
                            <button onClick={() => handleUbahStatusMassal(idsUntukAksi, 'Aktif')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-transform hover:scale-[1.03]">Set Aktif</button>
                            <button onClick={() => handleUbahStatusMassal(idsUntukAksi, 'Pasif')} className="bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-transform hover:scale-[1.03]">Set Pasif</button>
                          </div>
                        </div>

                        <div className="space-y-3 text-xs font-semibold">
                          {daftarTampil.map(m => (
                            <div key={m.id} className="p-4 bg-slate-50 rounded-xl border flex justify-between items-center flex-wrap gap-3">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleSelectMember(m.id)} className="w-4 h-4 accent-emerald-700" />
                                <div>
                                  <span className="text-sm font-black text-slate-900 block">{m.nama}</span>
                                  <span className="text-slate-400 font-normal">{m.nomorRumah} | Status: <span className={m.statusAnggota === 'Aktif' ? 'text-emerald-700 font-bold' : 'text-rose-500 font-bold'}>{m.statusAnggota}</span></span>
                                  <span className="text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
                                    Username: <span className="font-mono text-slate-700">{m.username}</span> | Password: <span className="font-mono font-bold text-slate-700">{visiblePasswordIds.includes(m.id) ? m.password : '••••••••'}</span>
                                    <button type="button" onClick={() => togglePasswordVisibility(m.id)} className="text-emerald-700 font-bold text-[10px] underline underline-offset-2">
                                      {visiblePasswordIds.includes(m.id) ? 'Sembunyikan' : 'Lihat'}
                                    </button>
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 font-bold">Pindah Kelompok:</span>
                                <select value={m.kelompok} onChange={(e) => handleUpdateUserGroup(m.id, e.target.value)} className="border p-1.5 rounded-lg bg-white font-black text-emerald-800 text-[11px]">
                                  {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                                </select>
                                <button onClick={() => toggleStatusAnggota(m.id)} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[10px]">Toggle Status</button>
                                <button onClick={() => handleAdminResetPassword(m.id)} className="bg-rose-600 text-white px-2.5 py-1 rounded text-[10px]">Reset Password</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* PANEL KONTROL WARGA KELUAR (KHUSUS ADMIN)
                    Admin isi nama & blok warga yang keluar/pindah dari RT.
                    Otomatis konek & tampil di Dashboard akun Warga (user),
                    lihat kartu "Warga Keluar" di menu Informasi Warga. */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <div className="border-b pb-3 mb-4">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Panel Kontrol Warga Keluar</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Catat nama & blok warga yang sudah keluar/pindah dari lingkungan RT. Data otomatis tersambung dan tampil di Dashboard akun warga (user) sesuai bloknya masing-masing.</p>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-2 mb-3 text-xs font-semibold">
                    <input type="text" placeholder="Nama warga yang keluar" value={formWargaKeluarBaru.nama} onChange={(e) => setFormWargaKeluarBaru({...formWargaKeluarBaru, nama: e.target.value})} className="border p-2 rounded-xl bg-slate-50" />
                    <select value={formWargaKeluarBaru.blok} onChange={(e) => setFormWargaKeluarBaru({...formWargaKeluarBaru, blok: e.target.value})} className="border p-2 rounded-xl bg-slate-50 font-bold">
                      <option value="">Pilih Blok</option>
                      {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                    </select>
                    <input type="date" value={formWargaKeluarBaru.tanggalKeluar} onChange={(e) => setFormWargaKeluarBaru({...formWargaKeluarBaru, tanggalKeluar: e.target.value})} className="border p-2 rounded-xl bg-slate-50" />
                    <input type="text" placeholder="Keterangan (opsional)" value={formWargaKeluarBaru.keterangan} onChange={(e) => setFormWargaKeluarBaru({...formWargaKeluarBaru, keterangan: e.target.value})} className="border p-2 rounded-xl bg-slate-50" />
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button onClick={handleSimpanWargaKeluar} className="bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-transform hover:scale-[1.02]">{editingWargaKeluarId ? 'Simpan Perubahan' : '+ Catat Warga Keluar'}</button>
                    {editingWargaKeluarId && (
                      <button onClick={handleBatalEditWargaKeluar} className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs">Batal</button>
                    )}
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    {wargaKeluarList.map(w => (
                      <div key={w.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <span className="text-sm font-black text-slate-900 block">{w.nama}</span>
                          <span className="text-slate-400 font-normal">{w.blok} • Keluar: {w.tanggalKeluar}{w.keterangan ? ` • ${w.keterangan}` : ''}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditWargaKeluar(w)} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px]">Edit</button>
                          <button onClick={() => handleHapusWargaKeluar(w.id)} className="bg-rose-600 text-white px-2.5 py-1 rounded text-[10px]">Hapus</button>
                        </div>
                      </div>
                    ))}
                    {wargaKeluarList.length === 0 && <p className="text-slate-400 italic">Belum ada data warga keluar.</p>}
                  </div>
                </div>
              </div>
            )}


            {/* SUPER CMS EDITOR (KHUSUS TEKS & KOP WEBSITE) */}
            {activeMenu === 'cms-setting' && role === 'admin' && (
              <div className="space-y-6">

                {/* PANEL KONEKSI DATABASE GOOGLE SHEETS (ANGGOTA & IURAN) */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs text-xs font-semibold space-y-3">
                  <div className="flex justify-between items-center gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">🔗 Koneksi Database Google Sheets</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Data Anggota & Iuran akan tersimpan di Google Sheet panitia, bisa diakses semua user dari HP maupun PC/laptop.</p>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase whitespace-nowrap ${
                      sheetStatus === 'synced' ? 'bg-emerald-100 text-emerald-700' :
                      sheetStatus === 'loading' ? 'bg-amber-100 text-amber-700' :
                      sheetStatus === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sheetStatus === 'synced' ? '● Tersambung' : sheetStatus === 'loading' ? '● Menyinkron...' : sheetStatus === 'error' ? '● Gagal Tersambung' : '● Mode Lokal (belum disambungkan)'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">URL Web App Google Apps Script</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="text" placeholder="https://script.google.com/macros/s/xxxxx/exec" value={cmsForm.appsScriptUrl} onChange={(e) => setCmsForm({...cmsForm, appsScriptUrl: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50 font-mono text-[11px]" />
                      <button type="button" onClick={handleTestKoneksiSheet} disabled={sheetTesting} className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl whitespace-nowrap disabled:opacity-50">{sheetTesting ? 'Menguji...' : '🔌 Tes Koneksi'}</button>
                      <button type="button" onClick={saveCms} className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-4 py-2 rounded-xl whitespace-nowrap">💾 Simpan URL</button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Belum punya URL-nya? Buat Google Sheet baru → menu <strong>Extensions &gt; Apps Script</strong> → tempel kode backend yang sudah disiapkan → <strong>Deploy &gt; New deployment &gt; Web app</strong> (Execute as: Me, Who has access: Anyone) → salin URL yang diakhiri <code>/exec</code> ke sini. Setelah URL disimpan, data Anggota &amp; Iuran akan otomatis dimuat dari Sheet, dan setiap perubahan akan otomatis tersimpan kembali ke Sheet.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border shadow-xs text-xs font-semibold space-y-4">
                  <div className="flex justify-between items-center gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">CMS Super Editor - Konten Website Utama</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Setiap perubahan di sini otomatis tersinkron ke halaman Beranda dan Informasi Umum seluruh warga.</p>
                    </div>
                    <button onClick={saveCms} className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-6 py-2.5 rounded-xl whitespace-nowrap transition-transform duration-150 hover:scale-[1.02] shadow-lg">💾 Simpan Perubahan Konten</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Logo RT (tampil di Header Web Utama)</label>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 shrink-0 rounded-xl border bg-white flex items-center justify-center overflow-hidden">
                            {cmsForm.logoRT ? (
                              <img loading="lazy" decoding="async" src={cmsForm.logoRT} alt="Preview Logo" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-emerald-800/40 font-black text-[9px] text-center leading-tight">LOGO</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <input type="file" accept="image/*" onChange={handleLogoRTChange} className="w-full border p-2 rounded-xl bg-slate-50 text-[11px]" />
                            {cmsForm.logoRT && (
                              <button type="button" onClick={() => setCmsForm({...cmsForm, logoRT: null})} className="text-[10px] font-bold text-rose-600">Hapus Logo</button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Format PNG/JPG, disarankan latar transparan, maks. 2MB. Jika kosong, header memakai badge teks "RT" bawaan.</p>
                      </div>
                      <div><label className="block text-slate-600 mb-1">Nama RT (KOP)</label><input type="text" value={cmsForm.namaRT} onChange={(e) => setCmsForm({...cmsForm, namaRT: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Alamat RT (KOP)</label><input type="text" value={cmsForm.alamatRT} onChange={(e) => setCmsForm({...cmsForm, alamatRT: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">No. Rekening (tampil di Web Utama)</label><input type="text" value={cmsForm.noRekening} onChange={(e) => setCmsForm({...cmsForm, noRekening: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">No. WhatsApp Kontak (tombol Chat WA otomatis mengikuti nomor ini)</label><input type="text" placeholder="08xxxxxxxxxx" value={cmsForm.infoKontak} onChange={(e) => setCmsForm({...cmsForm, infoKontak: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Judul Banner Utama</label><input type="text" value={cmsForm.judulBeranda} onChange={(e) => setCmsForm({...cmsForm, judulBeranda: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Nama Program / Subjudul</label><input type="text" value={cmsForm.subJudulBeranda} onChange={(e) => setCmsForm({...cmsForm, subJudulBeranda: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Papan Pengumuman</label><textarea rows={2} value={cmsForm.pengumuman} onChange={(e) => setCmsForm({...cmsForm, pengumuman: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div>
                        <label className="block text-slate-600 mb-1">Foto Latar RT (Transparan di Banner Utama)</label>
                        <input type="file" accept="image/*" onChange={handleFotoLatarChange} className="w-full border p-2 rounded-xl bg-slate-50" />
                        {cmsForm.fotoLatarRT && (
                          <div className="mt-2 flex items-center gap-2">
                            <img loading="lazy" decoding="async" src={cmsForm.fotoLatarRT} alt="Preview" className="w-16 h-12 object-cover rounded-lg border" />
                            <button type="button" onClick={() => setCmsForm({...cmsForm, fotoLatarRT: null})} className="text-[10px] font-bold text-rose-600">Hapus Foto</button>
                          </div>
                        )}
                        {!cmsForm.fotoLatarRT && <p className="text-[10px] text-slate-400 mt-1">Belum ada foto, banner memakai ilustrasi RT bawaan.</p>}
                      </div>
                      <div><label className="block text-slate-600 mb-1">Visi RT</label><input type="text" value={cmsForm.visi} onChange={(e) => setCmsForm({...cmsForm, visi: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Misi RT</label><input type="text" value={cmsForm.misi} onChange={(e) => setCmsForm({...cmsForm, misi: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    </div>
                    <div className="space-y-3">
                      <div><label className="block text-slate-600 mb-1">Syarat Program (satu baris = satu poin)</label><textarea rows={7} value={cmsForm.syaratText} onChange={(e) => setCmsForm({...cmsForm, syaratText: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Ketentuan Program (satu baris = satu poin)</label><textarea rows={7} value={cmsForm.ketentuanText} onChange={(e) => setCmsForm({...cmsForm, ketentuanText: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    </div>
                  </div>

                  {/* SUSUNAN PANITIA */}
                  <div className="border-t pt-4">
                    <h4 className="text-slate-900 font-black text-xs mb-1">Susunan Panitia</h4>
                    <p className="text-[10px] text-slate-400 mb-3">Nama di sini otomatis tampil di halaman Beranda. Khusus nama Bendahara RT, akan otomatis ikut tampil di setiap Kuitansi Digital warga bersama tanda tangan digitalnya.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><label className="block text-slate-600 mb-1">Ketua Panitia</label><input type="text" value={cmsForm.panitiaKetua} onChange={(e) => setCmsForm({...cmsForm, panitiaKetua: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Sekretaris</label><input type="text" value={cmsForm.panitiaSekretaris} onChange={(e) => setCmsForm({...cmsForm, panitiaSekretaris: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div>
                        <label className="block text-slate-600 mb-1">Bendahara RT <span className="text-emerald-700">(link ke kuitansi)</span></label>
                        <input type="text" value={cmsForm.panitiaBendahara} onChange={(e) => setCmsForm({...cmsForm, panitiaBendahara: e.target.value})} className="w-full border p-2 rounded-xl bg-emerald-50 border-emerald-200 font-bold text-emerald-900" />
                      </div>
                      <div><label className="block text-slate-600 mb-1">Humas</label><input type="text" value={cmsForm.panitiaHumas} onChange={(e) => setCmsForm({...cmsForm, panitiaHumas: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    </div>

                    {/* TANDA TANGAN DIGITAL BENDAHARA RT - dipakai di Kuitansi Digital
                        menggantikan cap/stempel bulat. Upload foto/scan tanda tangan asli,
                        disarankan PNG latar transparan. */}
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <label className="block text-slate-600 mb-1 font-bold">✍️ Tanda Tangan Digital Bendahara RT <span className="text-emerald-700 font-normal">(tampil di Kuitansi, ganti cap/stempel)</span></label>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-14 shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                          {cmsForm.tandaTanganBendahara ? (
                            <img loading="lazy" decoding="async" src={cmsForm.tandaTanganBendahara} alt="Preview Tanda Tangan" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-emerald-800/40 font-black text-[9px] text-center leading-tight px-1">BELUM ADA<br/>TTD</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <input type="file" accept="image/*" onChange={handleTandaTanganChange} className="w-full border p-2 rounded-xl bg-white text-[11px]" />
                          {cmsForm.tandaTanganBendahara && (
                            <button type="button" onClick={() => setCmsForm({...cmsForm, tandaTanganBendahara: null})} className="text-[10px] font-bold text-rose-600">Hapus Tanda Tangan</button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">Format PNG/JPG, disarankan latar transparan, maks. 2MB. Jika belum diupload, kuitansi otomatis memakai cap bulat bawaan sebagai gantinya.</p>
                    </div>
                  </div>

                  {/* FOTO ANGGOTA STRUKTUR RT - tampil sebagai galeri foto di halaman Beranda,
                      terlihat oleh SEMUA akun (belum login, warga, maupun admin lain). */}
                  <div className="border-t pt-4">
                    <h4 className="text-slate-900 font-black text-xs mb-1">Foto Anggota Struktur RT</h4>
                    <p className="text-[10px] text-slate-400 mb-3">Kelola foto & nama pengurus RT. Otomatis tampil sebagai galeri foto di halaman Beranda (Web Utama) untuk semua akun. Foto diupload langsung ke Google Drive panitia (bukan base64) begitu URL Apps Script sudah disambungkan.</p>

                    <div className="space-y-2 mb-4">
                      {strukturRt.map(d => (
                        <div key={d.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border rounded-xl">
                          <div className="w-11 h-11 rounded-full border bg-white overflow-hidden shrink-0 flex items-center justify-center relative">
                            <span className="text-slate-300 text-[9px]">Foto</span>
                            {d.foto && (
                              <img
                                loading="lazy"
                                decoding="async"
                                src={toDirectImageUrl(d.foto)}
                                alt={d.nama}
                                className="w-full h-full object-cover absolute inset-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 truncate">{d.nama}</p>
                            <p className="text-emerald-700 font-bold text-[10px] uppercase tracking-wide">{d.jabatan}</p>
                          </div>
                          <button type="button" onClick={() => handleEditAnggotaStruktur(d)} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Edit</button>
                          <button type="button" onClick={() => handleHapusAnggotaStruktur(d.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Hapus</button>
                        </div>
                      ))}
                      {strukturRt.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada anggota struktur RT yang ditambahkan.</p>}
                    </div>

                    <form onSubmit={handleTambahAnggotaStruktur} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                      <p className="text-emerald-800 font-black text-[11px]">{editingStrukturId ? 'Edit Anggota Struktur' : 'Tambah Anggota Struktur Baru'}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="text" placeholder="Nama Lengkap" value={formStrukturBaru.nama} onChange={(e) => setFormStrukturBaru({...formStrukturBaru, nama: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                        <input type="text" placeholder="Jabatan (mis. Anggota Seksi Konsumsi)" value={formStrukturBaru.jabatan} onChange={(e) => setFormStrukturBaru({...formStrukturBaru, jabatan: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                        <input type="file" accept="image/*" onChange={handleFotoStrukturChange} className="w-full border p-2 rounded-xl bg-white text-[11px]" />
                      </div>
                      {formStrukturBaru.foto && (
                        <div className="flex items-center gap-2">
                          <img loading="lazy" decoding="async" src={formStrukturBaru.foto} alt="Preview" className="w-10 h-10 rounded-full object-cover border" />
                          <button type="button" onClick={() => setFormStrukturBaru(prev => ({ ...prev, foto: null }))} className="text-[10px] font-bold text-rose-600">Hapus Foto</button>
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        {editingStrukturId && (
                          <button type="button" onClick={() => { setEditingStrukturId(null); setFormStrukturBaru({ nama: '', jabatan: '', foto: null }); }} className="bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[11px]">Batal</button>
                        )}
                        <button type="submit" className="bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-[11px]">{editingStrukturId ? 'Simpan Perubahan' : '+ Tambah Anggota'}</button>
                      </div>
                    </form>
                  </div>

                  {/* INFORMASI UMUM RT - tampil di Web Utama & menu Informasi Umum warga */}
                  <div className="border-t pt-4">
                    <h4 className="text-slate-900 font-black text-xs mb-1">Informasi Umum RT</h4>
                    <p className="text-[10px] text-slate-400 mb-3">Tampil di halaman Beranda (Web Utama) pada panel "Informasi Umum {cmsTeks.namaRT}", untuk semua akun.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-slate-600 mb-1">Foto RT (Umum)</label>
                          <input type="file" accept="image/*" onChange={handleFotoRTUmumChange} className="w-full border p-2 rounded-xl bg-slate-50 text-[11px]" />
                          {cmsForm.fotoRTUmum && (
                            <div className="mt-2 flex items-center gap-2">
                              <img loading="lazy" decoding="async" src={cmsForm.fotoRTUmum} alt="Preview" className="w-20 h-14 object-cover rounded-lg border" />
                              <button type="button" onClick={() => setCmsForm({...cmsForm, fotoRTUmum: null})} className="text-[10px] font-bold text-rose-600">Hapus Foto</button>
                            </div>
                          )}
                        </div>
                        <div><label className="block text-slate-600 mb-1">Luas RT</label><input type="text" placeholder="mis. 600 m²" value={cmsForm.luasRT} onChange={(e) => setCmsForm({...cmsForm, luasRT: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                        <div><label className="block text-slate-600 mb-1">Deskripsi RT</label><textarea rows={4} value={cmsForm.deskripsiRT} onChange={(e) => setCmsForm({...cmsForm, deskripsiRT: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-slate-600 mb-1">Info &amp; Pengumuman RT</label>
                          <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                            {(cmsForm.infoPengumumanList || []).map((p, i) => (
                              <div key={i} className="flex items-center justify-between bg-slate-50 border rounded-lg px-2 py-1">
                                <span className="truncate">{p}</span>
                                <button type="button" onClick={() => handleHapusPengumuman(i)} className="text-rose-600 font-bold text-[10px] shrink-0 ml-2">Hapus</button>
                              </div>
                            ))}
                            {(!cmsForm.infoPengumumanList || cmsForm.infoPengumumanList.length === 0) && <p className="text-slate-400 italic text-[10px]">Belum ada pengumuman.</p>}
                          </div>
                          <div className="flex gap-2">
                            <input type="text" placeholder="mis. Kerja bakti Minggu pukul 07.00" value={inputPengumumanBaru} onChange={(e) => setInputPengumumanBaru(e.target.value)} className="flex-1 border p-2 rounded-xl bg-slate-50" />
                            <button type="button" onClick={handleTambahPengumuman} className="bg-slate-200 text-slate-700 font-bold px-3 rounded-xl text-[11px]">+ Tambah</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Aset RT</label>
                          <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                            {(cmsForm.asetRTList || []).map((a, i) => (
                              <div key={i} className="flex items-center justify-between bg-slate-50 border rounded-lg px-2 py-1">
                                <span className="truncate">{a}</span>
                                <button type="button" onClick={() => handleHapusAsetRT(i)} className="text-rose-600 font-bold text-[10px] shrink-0 ml-2">Hapus</button>
                              </div>
                            ))}
                            {(!cmsForm.asetRTList || cmsForm.asetRTList.length === 0) && <p className="text-slate-400 italic text-[10px]">Belum ada aset.</p>}
                          </div>
                          <div className="flex gap-2">
                            <input type="text" placeholder="mis. Sound System" value={inputAsetBaru} onChange={(e) => setInputAsetBaru(e.target.value)} className="flex-1 border p-2 rounded-xl bg-slate-50" />
                            <button type="button" onClick={handleTambahAsetRT} className="bg-slate-200 text-slate-700 font-bold px-3 rounded-xl text-[11px]">+ Tambah</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 flex justify-end">
                    <button onClick={saveCms} className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-8 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.02] shadow-lg">💾 Simpan Perubahan Konten</button>
                  </div>
                </div>

                {/* BUKU KAS MASUK/KELUAR RT - tambah/edit/hapus transaksi, saldo berjalan otomatis */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs text-xs font-semibold space-y-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">📒 Buku Kas Masuk/Keluar RT</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Catat setiap transaksi kas masuk (iuran, infaq, dll) & keluar (operasional, dll). Saldo berjalan otomatis dihitung urut tanggal, langsung tampil di Web Utama.</p>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getRiwayatKasRtDenganSaldo().map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 truncate">{t.keterangan}</p>
                          <p className="text-[10px] text-slate-400">{t.tanggal} • Saldo setelah: Rp{t.saldoSetelah.toLocaleString('id-ID')}</p>
                        </div>
                        <span className={`font-bold text-[11px] shrink-0 ${t.jenis === 'Masuk' ? 'text-emerald-700' : 'text-rose-600'}`}>{t.jenis === 'Masuk' ? '+' : '-'}Rp{Number(t.nominal).toLocaleString('id-ID')}</span>
                        <button type="button" onClick={() => handleEditRiwayatKasRt(t)} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Edit</button>
                        <button type="button" onClick={() => handleHapusRiwayatKasRt(t.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Hapus</button>
                      </div>
                    ))}
                    {riwayatKasRt.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada transaksi kas RT yang dicatat.</p>}
                  </div>

                  <form onSubmit={handleTambahRiwayatKasRt} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <p className="text-emerald-800 font-black text-[11px]">{editingRiwayatKasRtId ? 'Edit Transaksi Kas RT' : 'Catat Transaksi Kas RT Baru'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="date" value={formRiwayatKasRtBaru.tanggal} onChange={(e) => setFormRiwayatKasRtBaru({...formRiwayatKasRtBaru, tanggal: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                      <select value={formRiwayatKasRtBaru.jenis} onChange={(e) => setFormRiwayatKasRtBaru({...formRiwayatKasRtBaru, jenis: e.target.value})} className="w-full border p-2 rounded-xl bg-white font-bold">
                        <option value="Masuk">Kas Masuk</option>
                        <option value="Keluar">Kas Keluar</option>
                      </select>
                      <input type="text" placeholder="Keterangan (mis. Iuran bulan Juli terkumpul)" value={formRiwayatKasRtBaru.keterangan} onChange={(e) => setFormRiwayatKasRtBaru({...formRiwayatKasRtBaru, keterangan: e.target.value})} className="w-full border p-2 rounded-xl bg-white sm:col-span-2" />
                      <input type="number" min="0" placeholder="Nominal (mis. 500000)" value={formRiwayatKasRtBaru.nominal} onChange={(e) => setFormRiwayatKasRtBaru({...formRiwayatKasRtBaru, nominal: e.target.value})} className="w-full border p-2 rounded-xl bg-white sm:col-span-2" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      {editingRiwayatKasRtId && (
                        <button type="button" onClick={() => { setEditingRiwayatKasRtId(null); setFormRiwayatKasRtBaru({ tanggal: '', keterangan: '', jenis: 'Masuk', nominal: '' }); }} className="bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[11px]">Batal</button>
                      )}
                      <button type="submit" className="bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-[11px]">{editingRiwayatKasRtId ? 'Simpan Perubahan' : '+ Catat Transaksi'}</button>
                    </div>
                  </form>
                </div>

                {/* UBAH USERNAME & PASSWORD LOGIN ADMIN PANEL */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs text-xs font-semibold">
                  <h3 className="text-sm font-black text-slate-900">Ubah Login Admin Panel</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Username &amp; password ini yang dipakai untuk masuk ke Admin Panel dari tombol "Login Panitia/Admin" di Web Utama.</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-amber-800">Username &amp; password admin saat ini (akses admin penuh): <strong className="font-mono">{adminAccount.username}</strong> / <strong className="font-mono">{adminOwnPasswordVisible ? adminAccount.password : '••••••••'}</strong></span>
                    <button type="button" onClick={() => setAdminOwnPasswordVisible(v => !v)} className="text-emerald-700 font-bold text-[11px] underline underline-offset-2 shrink-0">
                      {adminOwnPasswordVisible ? 'Sembunyikan Password' : 'Lihat Password'}
                    </button>
                  </div>
                  <form onSubmit={handleSaveAdminAccount} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Username Admin Baru</label><input type="text" defaultValue={adminAccount.username} onChange={(e) => setFormAdminAccount({...formAdminAccount, username: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div><label className="block text-slate-600 mb-1">Password Saat Ini</label><input type="password" required value={formAdminAccount.password} onChange={(e) => setFormAdminAccount({...formAdminAccount, password: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div><label className="block text-slate-600 mb-1">Password Baru</label><input type="password" required value={formAdminAccount.passwordBaru} onChange={(e) => setFormAdminAccount({...formAdminAccount, passwordBaru: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Konfirmasi Password Baru</label><input type="password" required value={formAdminAccount.konfirmasiPassword} onChange={(e) => setFormAdminAccount({...formAdminAccount, konfirmasiPassword: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    {adminAccountMsg.teks && <p className={`sm:col-span-2 text-[11px] font-bold ${adminAccountMsg.tipe === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>{adminAccountMsg.teks}</p>}
                    <div className="sm:col-span-2 flex justify-end">
                      <button type="submit" className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-6 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.02]">💾 Simpan Login Admin</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* KELOLA KEGIATAN / AGENDA - HALAMAN TERSENDIRI, MUDAH DITEMUKAN */}
            {activeMenu === 'kelola-kegiatan' && role === 'admin' && (
              <div className="space-y-6">

                {/* KELOLA AGENDA UTAMA / SPESIAL */}
                <div className="bg-white p-6 rounded-2xl border-2 border-amber-400 shadow-xs text-xs font-semibold space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="text-sm font-black text-amber-600">⭐ Kelola Agenda Utama / Spesial</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Agenda ini tampil paling atas &amp; dengan kotak foto lebih besar dibanding kegiatan biasa di halaman Beranda. Hanya ada satu Agenda Utama aktif pada satu waktu.</p>
                  </div>

                  <div className="rounded-xl border overflow-hidden bg-slate-50">
                    <div className="w-full h-40 bg-slate-200 flex items-center justify-center overflow-hidden">
                      {agendaUtama.foto ? <img loading="lazy" decoding="async" src={agendaUtama.foto} alt={agendaUtama.judul} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} /> : <span className="text-[10px] text-slate-400 font-bold">Belum ada foto agenda utama</span>}
                    </div>
                    <div className="p-3">
                      <p className="text-slate-400 font-bold text-[10px]">{agendaUtama.tanggal}{agendaUtama.jam ? ` • ${agendaUtama.jam} WIB` : ''}</p>
                      <h4 className="text-slate-900 font-bold text-[12px] mt-0.5">{agendaUtama.judul || 'Belum ada agenda utama'}</h4>
                    </div>
                  </div>

                  <form onSubmit={handleSimpanAgendaUtama} className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <h4 className="sm:col-span-2 text-slate-900 font-black text-xs -mb-1">Form Agenda Utama / Spesial</h4>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Judul / Agenda Spesial</label><input type="text" value={formAgendaUtama.judul} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, judul: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="Kerja Bakti & Silaturahmi Warga" /></div>
                    <div><label className="block text-slate-600 mb-1">Tanggal</label><input type="text" value={formAgendaUtama.tanggal} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, tanggal: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="17 Jun 2026" /></div>
                    <div><label className="block text-slate-600 mb-1">Jam</label><input type="text" value={formAgendaUtama.jam} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, jam: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="07:00" /></div>
                    <div><label className="block text-slate-600 mb-1">Tempat</label><input type="text" value={formAgendaUtama.tempat} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, tempat: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="RT Jami' Nurul Falah" /></div>
                    <div><label className="block text-slate-600 mb-1">Pembicara / Penanggung Jawab</label><input type="text" value={formAgendaUtama.pembicara} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, pembicara: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Deskripsi Agenda Utama</label><textarea rows={2} value={formAgendaUtama.detail} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, detail: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Upload Foto Agenda Utama (ukuran lebih besar)</label><input type="file" accept="image/*" onChange={handleFotoAgendaUtamaChange} className="w-full border p-2 rounded-xl bg-slate-50" />
                      {formAgendaUtama.foto && <img loading="lazy" decoding="async" src={formAgendaUtama.foto} alt="preview" className="w-32 h-20 object-cover rounded-lg border mt-2" />}
                    </div>
                    <button type="submit" className="sm:col-span-2 bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.01] shadow-lg">⭐ Simpan Agenda Utama</button>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-2xl border shadow-xs text-xs font-semibold space-y-4">
                  <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Kelola Kegiatan &amp; Agenda</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Periode berjalan: {periodeTahun}. Setiap kegiatan yang ditambahkan/diedit di sini langsung tampil di Beranda &amp; Informasi Umum seluruh warga.</p>
                    </div>
                    <button onClick={() => setActiveMenu('manajemen-periode')} className="bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl whitespace-nowrap transition-transform duration-150 hover:scale-[1.02]">Tutup / Buka Periode →</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {kegiatanList.map(k => (
                      <div key={k.id} className={`rounded-xl border overflow-hidden bg-slate-50 anim-fade ${editingKegiatanId === k.id ? 'ring-2 ring-amber-400' : ''}`}>
                        <div className="w-full h-24 bg-slate-200 flex items-center justify-center overflow-hidden">
                          {k.foto ? <img loading="lazy" decoding="async" src={k.foto} alt={k.judul} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} /> : <span className="text-[10px] text-slate-400 font-bold">Belum ada foto</span>}
                        </div>
                        <div className="p-3">
                          <p className="text-slate-400 font-bold text-[10px]">{k.tanggal}{k.jam ? ` • ${k.jam} WIB` : ''}</p>
                          <h4 className="text-slate-900 font-bold text-[11px] mt-0.5">{k.judul}</h4>
                          {(k.tempat || k.pembicara) && (
                            <p className="text-emerald-700 font-bold mt-1 text-[10px] leading-relaxed">{k.tempat}{k.tempat && k.pembicara ? ' • ' : ''}{k.pembicara ? `Pembicara: ${k.pembicara}` : ''}</p>
                          )}
                          <div className="flex gap-3 mt-2">
                            <button onClick={() => handleEditKegiatan(k)} className="text-[10px] font-bold text-emerald-700">Edit</button>
                            <button onClick={() => handleHapusKegiatan(k.id)} className="text-[10px] font-bold text-rose-600">Hapus</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {kegiatanList.length === 0 && <p className="text-slate-400 italic col-span-3">Belum ada kegiatan pada periode ini.</p>}
                  </div>

                  <form onSubmit={handleTambahKegiatan} className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <h4 className="sm:col-span-2 text-slate-900 font-black text-xs -mb-1">{editingKegiatanId ? 'Edit Kegiatan Terpilih' : 'Tambah Kegiatan / Agenda Baru'}</h4>
                    {editingKegiatanId && (
                      <div className="sm:col-span-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 text-[11px] font-bold flex justify-between items-center">
                        <span>Mode edit kegiatan aktif.</span>
                        <button type="button" onClick={handleBatalEditKegiatan} className="underline">Batalkan</button>
                      </div>
                    )}
                    <div><label className="block text-slate-600 mb-1">Judul / Agenda</label><input type="text" value={formKegiatan.judul} onChange={(e) => setFormKegiatan({...formKegiatan, judul: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="Pengajian Rutin &quot;Manfaat Istigfar&quot;" /></div>
                    <div><label className="block text-slate-600 mb-1">Tanggal</label><input type="text" value={formKegiatan.tanggal} onChange={(e) => setFormKegiatan({...formKegiatan, tanggal: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="29 Jul 2026" /></div>
                    <div><label className="block text-slate-600 mb-1">Jam</label><input type="text" value={formKegiatan.jam} onChange={(e) => setFormKegiatan({...formKegiatan, jam: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="19:40" /></div>
                    <div><label className="block text-slate-600 mb-1">Tempat</label><input type="text" value={formKegiatan.tempat} onChange={(e) => setFormKegiatan({...formKegiatan, tempat: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="RT Jami' Nurul Falah" /></div>
                    <div><label className="block text-slate-600 mb-1">Pembicara</label><input type="text" value={formKegiatan.pembicara} onChange={(e) => setFormKegiatan({...formKegiatan, pembicara: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="Ustad Sana'an" /></div>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Deskripsi Kegiatan</label><textarea rows={2} value={formKegiatan.detail} onChange={(e) => setFormKegiatan({...formKegiatan, detail: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Upload Foto Kegiatan</label><input type="file" accept="image/*" onChange={handleFotoKegiatanChange} className="w-full border p-2 rounded-xl bg-slate-50" />
                      {formKegiatan.foto && <img loading="lazy" decoding="async" src={formKegiatan.foto} alt="preview" className="w-20 h-14 object-cover rounded-lg border mt-2" />}
                    </div>
                    <button type="submit" className="sm:col-span-2 bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.01] shadow-lg">{editingKegiatanId ? '💾 Simpan Perubahan Kegiatan' : '+ Tambah Kegiatan'}</button>
                  </form>
                </div>
              </div>
            )}

            {/* MANAJEMEN PERIODE - BUKA/TUTUP PROJECT PER TAHUN, RIWAYAT & LAPORAN TETAP ADA */}
            {activeMenu === 'manajemen-periode' && role === 'admin' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Periode Aktif Saat Ini</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">Menutup periode akan mengarsipkan seluruh data anggota, iuran, dan kegiatan periode ini secara permanen (riwayat &amp; laporan tidak hilang), lalu otomatis membuka periode baru dengan nomor baru.</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">● {periodeAktif.status}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 text-xs">
                    <div className="bg-slate-50 border rounded-xl p-4">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">No. Periode</span>
                      <p className="font-black text-slate-900 text-base mt-1">{periodeAktif.noPeriode}</p>
                    </div>
                    <div className="bg-slate-50 border rounded-xl p-4">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Tahun Berjalan</span>
                      <p className="font-black text-slate-900 text-base mt-1">{periodeTahun}</p>
                    </div>
                    <div className="bg-slate-50 border rounded-xl p-4">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Mulai Berjalan</span>
                      <p className="font-black text-slate-900 text-base mt-1">{periodeAktif.tanggalMulai}</p>
                    </div>
                  </div>
                  <button onClick={handleTutupPeriode} className="mt-5 bg-rose-600 hover:bg-rose-700 text-white font-black px-6 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.02] shadow-lg">🔒 Tutup Periode Ini &amp; Buka Periode Baru</button>
                </div>

                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 mb-1">Riwayat Periode (Arsip Permanen)</h3>
                  <p className="text-[11px] text-slate-400 mb-4">Setiap periode yang sudah ditutup tetap tersimpan di sini lengkap dengan laporan ringkasnya, meskipun data kerja periode baru sudah dimulai dari nol.</p>
                  {riwayatPeriode.length === 0 ? (
                    <p className="text-slate-400 italic text-xs">Belum ada periode yang ditutup. Riwayat akan muncul di sini setelah periode pertama ditutup.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-400 uppercase text-[9px] border-b">
                            <th className="py-2 pr-2">No. Periode</th>
                            <th className="py-2 pr-2">Tahun</th>
                            <th className="py-2 pr-2">Status</th>
                            <th className="py-2 pr-2">Tgl Ditutup</th>
                            <th className="py-2 pr-2">Jml Anggota</th>
                            <th className="py-2 pr-2">Jml Kegiatan</th>
                            <th className="py-2 pr-2">Total Terkumpul</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riwayatPeriode.map((p, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2.5 pr-2 font-black text-slate-900">{p.noPeriode}</td>
                              <td className="py-2.5 pr-2">{p.tahun}</td>
                              <td className="py-2.5 pr-2"><span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{p.status}</span></td>
                              <td className="py-2.5 pr-2">{p.tanggalDitutup}</td>
                              <td className="py-2.5 pr-2">{p.jumlahAnggota}</td>
                              <td className="py-2.5 pr-2">{p.jumlahKegiatan}</td>
                              <td className="py-2.5 pr-2 font-bold text-emerald-700">Rp {p.totalTerkumpul.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL PREVIEW LAMPIRAN UMUM (PDF LAPORAN KAS RT / BUKTI FOTO REALISASI BELANJA) */}
      {previewLampiran && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl p-0 relative border shadow-2xl anim-pop flex flex-col overflow-hidden">
            <button onClick={() => setPreviewLampiran(null)} className="absolute top-4 right-4 bg-white/90 text-slate-700 w-8 h-8 rounded-full font-black z-20 shadow transition-transform hover:scale-110">✕</button>
            <div className="overflow-y-auto">
              <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white px-6 pt-6 pb-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Pratinjau Lampiran</p>
                <h4 className="font-black text-base mt-1 pr-10">{previewLampiran.judul}</h4>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className="border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[300px] max-h-[60vh]">
                  {previewLampiran.tipe === 'pdf' ? (
                    <iframe title={previewLampiran.judul} src={previewLampiran.url} className="w-full h-[60vh]"></iframe>
                  ) : (
                    <img loading="lazy" decoding="async" src={previewLampiran.url} alt={previewLampiran.judul} className="max-h-[60vh] w-full object-contain" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.insertAdjacentHTML('afterend', '<p class="text-rose-500 italic p-6 text-center">Gagal memuat lampiran.</p>'); }} />
                  )}
                </div>
                {previewLampiran.namaFile && <p className="text-slate-400 text-[10px]">File: {previewLampiran.namaFile}</p>}
                <a href={previewLampiran.url} target="_blank" rel="noopener noreferrer" className="block text-center bg-emerald-600 text-white font-bold py-2 rounded-xl text-[11px]">⤢ Buka Penuh di Tab Baru</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW BUKTI TRANSFER (BISA LANGSUNG SETUJUI/TOLAK UTK ADMIN) */}
      {previewBukti && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade">
          <div className="bg-white w-full max-w-md max-h-[90vh] rounded-3xl p-0 relative border shadow-2xl anim-pop flex flex-col overflow-hidden">
            <button onClick={() => setPreviewBukti(null)} className="absolute top-4 right-4 bg-white/90 text-slate-700 w-8 h-8 rounded-full font-black z-20 shadow transition-transform hover:scale-110">✕</button>

            <div className="overflow-y-auto">
              <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white px-6 pt-6 pb-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Bukti Transfer</p>
                <h4 className="font-black text-base mt-1 pr-10">{previewBukti.userNama}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Iuran Bulan {previewBukti.bulanNama} {periodeTahun} • Rp {previewBukti.nominal.toLocaleString('id-ID')}</p>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <div className="border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[220px] max-h-[45vh]">
                  {previewBukti.buktiUrl ? (
                    previewBukti.buktiUrl.startsWith('data:application/pdf') ? (
                      <a href={previewBukti.buktiUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline p-6 block text-center">📄 Buka File PDF Bukti Transfer</a>
                    ) : previewBukti.buktiUrl.includes('/preview') ? (
                      <iframe title="Bukti Transfer PDF" src={previewBukti.buktiUrl} className="w-full h-[45vh]"></iframe>
                    ) : (
                      <img
                        src={previewBukti.buktiUrl}
                        alt="Bukti Transfer"
                        className="max-h-[45vh] w-full object-contain"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.insertAdjacentHTML('afterend', '<p class="text-rose-500 italic p-6 text-center">Gagal memuat gambar bukti transfer.</p>'); }}
                      />
                    )
                  ) : (
                    <p className="text-slate-400 italic p-6">Tidak ada file bukti.</p>
                  )}
                </div>
                {previewBukti.buktiNamaFile && <p className="text-slate-400 text-[10px]">File: {previewBukti.buktiNamaFile}</p>}
                <div className="flex justify-between border-t pt-2"><span className="text-slate-500">Tanggal Upload</span><strong>{previewBukti.tglBayar || '-'}</strong></div>
                <div className="flex justify-between items-center"><span className="text-slate-500">Status</span><BadgeStatus status={previewBukti.status} /></div>

                {role === 'admin' && previewBukti.status === 'MENUNGGU VERIFIKASI' && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { handleRejectPembayaran(previewBukti.userNama, previewBukti.bulanNama); setPreviewBukti(null); }} className="flex-1 bg-rose-100 text-rose-700 font-bold py-2 rounded-xl text-[11px]">Tolak</button>
                    <button onClick={() => setKonfirmasiApprove({ userNama: previewBukti.userNama, bulanNama: previewBukti.bulanNama, nominal: previewBukti.nominal, dariPreview: true })} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-[11px]">✓ Setujui (Dana Masuk)</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW KUITANSI PROFESIONAL (DENGAN KOP RT) */}
      {selectedKuitansi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade">
          <div className="bg-white w-full max-w-md rounded-3xl p-0 relative border overflow-hidden shadow-2xl anim-pop">
            <button onClick={() => setSelectedKuitansi(null)} className="absolute top-4 right-4 bg-white/90 text-slate-700 w-8 h-8 rounded-full font-black z-10 shadow transition-transform hover:scale-110">✕</button>

            {/* KOP SURAT */}
            <div className="bg-emerald-800 text-white px-6 pt-6 pb-5 text-center">
              {cmsTeks.logoRT && (
                <img loading="lazy" decoding="async" src={cmsTeks.logoRT} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg mx-auto mb-2 p-1" onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <p className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold">Bendahara Iuran Warga</p>
              <h4 className="font-black tracking-wide text-base mt-1">{cmsTeks.namaRT}</h4>
              <p className="text-[10px] text-emerald-200 mt-1 leading-relaxed">{cmsTeks.alamatRT}</p>
              <p className="text-[10px] text-emerald-200">Kontak: {cmsTeks.infoKontak}</p>
            </div>

            <div className="px-6 py-5 font-serif text-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h5 className="font-black tracking-widest text-sm">KWITANSI RESMI</h5>
                <span className="text-[10px] font-sans font-bold text-slate-400">No. {selectedKuitansi.noKuitansi}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Sudah diterima dari</span><strong>{selectedKuitansi.nama}</strong></div>
                <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Nomor Rumah/Blok</span><strong className="text-emerald-800">{selectedKuitansi.nomorRumah || selectedKuitansi.nama}</strong></div>
                <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Untuk pembayaran</span><strong>Iuran Warga Bln. {selectedKuitansi.bulan} {periodeTahun} (Angsuran Ke-{selectedKuitansi.angsuranKe})</strong></div>
                <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Nominal</span><strong className="text-emerald-800">Rp {selectedKuitansi.nominal.toLocaleString('id-ID')}</strong></div>
                <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Tanggal Pelunasan</span><strong>{pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).tanggal}</strong></div>
                <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Jam Pelunasan</span><strong>{pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).jam}</strong></div>
                <div className="flex justify-between items-center pt-1"><span className="text-slate-500">Status</span><span className="bg-emerald-700 text-white text-[10px] px-2 py-0.5 rounded font-sans font-bold">LUNAS</span></div>
              </div>

              <div className="flex justify-between items-end mt-6 font-sans">
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 p-1">
                    <img
                      loading="lazy"
                      decoding="async"
                      alt="QR Verifikasi Kuitansi"
                      className="w-full h-full object-contain"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(`KWITANSI RESMI ${selectedKuitansi.noKuitansi}\n${cmsTeks.namaRT}\nDiterima dari: ${selectedKuitansi.nama}\nNomor Rumah/Blok: ${selectedKuitansi.nomorRumah || selectedKuitansi.nama}\nBulan: ${selectedKuitansi.bulan} ${periodeTahun}\nNominal: Rp ${selectedKuitansi.nominal.toLocaleString('id-ID')}\nTanggal Pelunasan: ${pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).tanggal}\nJam Pelunasan: ${pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).jam}\nStatus: LUNAS - Diverifikasi Bendahara RT ${cmsTeks.panitiaBendahara}`)}`}
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 max-w-[80px] leading-tight">Scan QR untuk verifikasi tanggal, jam &amp; status pelunasan</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 mb-1">Bendahara RT</p>
                  {cmsTeks.tandaTanganBendahara ? (
                    <div className="w-28 h-16 mx-auto flex items-end justify-center">
                      <img loading="lazy" decoding="async" src={cmsTeks.tandaTanganBendahara} alt="Tanda Tangan Bendahara RT" className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  ) : (
                    <svg viewBox="0 0 100 100" className="w-20 h-20 mx-auto -rotate-6 opacity-90">
                      <polygon points="50,4 89.85,27 89.85,73 50,96 10.15,73 10.15,27" fill="none" stroke="#7f1d1d" strokeWidth="3" strokeLinejoin="round" />
                      <polygon points="50,13 82.2,31.5 82.2,68.5 50,87 17.8,68.5 17.8,31.5" fill="none" stroke="#7f1d1d" strokeWidth="1.3" strokeLinejoin="round" />
                      <text x="50" y="27" textAnchor="middle" fill="#7f1d1d" fontSize="5.2" fontWeight="900" letterSpacing="0.2">BENDAHARA RT</text>
                      <text x="50" y="59" textAnchor="middle" fill="#7f1d1d" fontSize="18" fontWeight="900" fontFamily="serif" letterSpacing="1">LUNAS</text>
                      <text x="50" y="78" textAnchor="middle" fill="#7f1d1d" fontSize="5" fontWeight="800" letterSpacing="0.2">SAH &amp; TERVERIFIKASI</text>
                    </svg>
                  )}
                  <p className="text-[11px] font-bold border-t border-slate-400 pt-1 mt-1">{cmsTeks.panitiaBendahara}</p>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-3 leading-relaxed text-center">Kuitansi ini sah dan diterbitkan otomatis oleh sistem tanpa memerlukan cap basah.</p>

              <button onClick={() => window.print && window.print()} className="w-full mt-5 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-sans font-bold py-2.5 rounded-xl text-xs transition-transform duration-150 hover:scale-[1.01]">Unduh / Cetak Kuitansi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI SEBELUM KIRIM BUKTI TRANSFER (WARGA) */}
      {konfirmasiUploadBukti && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative border shadow-2xl font-sans text-xs space-y-3 anim-pop">
            <button onClick={() => setKonfirmasiUploadBukti(null)} className="absolute top-4 right-4 bg-slate-100 text-slate-700 w-8 h-8 rounded-full font-black transition-transform hover:scale-110">✕</button>
            <div className="text-center pt-2">
              <span className="text-3xl">📤</span>
              <h4 className="font-black text-slate-900 text-sm mt-2">Mohon cek kembali sebelum kirim</h4>
            </div>
            <div className="bg-slate-50 border rounded-xl p-3 space-y-1.5 text-slate-600 font-semibold">
              <p className="flex justify-between"><span className="text-slate-400">Bulan</span><span>{konfirmasiUploadBukti.bulanNama} {periodeTahun}</span></p>
              <p className="flex justify-between"><span className="text-slate-400">Tanggal Transaksi</span><span>{formatTanggalIndo(konfirmasiUploadBukti.tanggalBayar)}</span></p>
              <p className="flex justify-between"><span className="text-slate-400">Nominal</span><span className="text-emerald-700">Rp {Number(konfirmasiUploadBukti.nominal).toLocaleString('id-ID')}</span></p>
              <p className="flex justify-between"><span className="text-slate-400">File</span><span className="truncate max-w-[160px]">{konfirmasiUploadBukti.file?.name}</span></p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setKonfirmasiUploadBukti(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl">Batal</button>
              <button onClick={handleKonfirmasiKirimBukti} className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-transform hover:scale-[1.02]">Kirim</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI VERIFIKASI PEMBAYARAN (ADMIN/BENDAHARA) */}
      {konfirmasiApprove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative border shadow-2xl font-sans text-xs space-y-3 anim-pop">
            <button onClick={() => setKonfirmasiApprove(null)} className="absolute top-4 right-4 bg-slate-100 text-slate-700 w-8 h-8 rounded-full font-black transition-transform hover:scale-110">✕</button>
            <div className="text-center pt-2">
              <span className="text-3xl">🔎</span>
              <h4 className="font-black text-slate-900 text-sm mt-2">Apakah jumlah sudah sesuai?</h4>
              <p className="text-slate-400 mt-1">{konfirmasiApprove.userNama} • Bulan {konfirmasiApprove.bulanNama} {periodeTahun}{konfirmasiApprove.nominal ? ` • Rp ${Number(konfirmasiApprove.nominal).toLocaleString('id-ID')}` : ''}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => handleKonfirmasiVerifikasi(false)} className="flex-1 bg-rose-100 text-rose-700 font-bold py-2.5 rounded-xl">Tidak, Tolak</button>
              <button onClick={() => handleKonfirmasiVerifikasi(true)} className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-transform hover:scale-[1.02]">Ya, Verifikasi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SIMULASI EMAIL TERKIRIM (AKTIVASI / RESET PASSWORD) */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative border shadow-2xl font-sans text-xs space-y-3 anim-pop">
            <button onClick={() => setShowEmailModal(null)} className="absolute top-4 right-4 bg-slate-100 text-slate-700 w-8 h-8 rounded-full font-black transition-transform hover:scale-110">✕</button>
            <p className="font-bold text-slate-400 bg-slate-50 p-2 rounded">Simulasi Kotak Masuk Email</p>
            <p className="font-black text-slate-900">Iuran Warga RT 40/08 &lt;no-reply@iuranrt.id&gt;</p>
            <p className="text-slate-400">Kepada: {showEmailModal.to}</p>
            <p className="text-slate-400">{showEmailModal.waktu}</p>
            <p className="font-bold text-slate-900">{showEmailModal.subject}</p>
            <div className="bg-slate-50 border rounded-xl p-3 space-y-1.5 text-slate-700">
              {showEmailModal.bodyLines.map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <button onClick={() => setShowEmailModal(null)} className="w-full bg-emerald-700 text-white font-bold py-2 rounded-xl">Tutup</button>
          </div>
        </div>
      )}

    </div>
  );
}
