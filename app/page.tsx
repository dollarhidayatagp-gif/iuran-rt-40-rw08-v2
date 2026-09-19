'use client';
import React, { useState, useEffect, useRef } from 'react';

// =====================================================================
// HELPER: RANDOM "BER-SEED" (SUPAYA DATA SIMULASI ACAK TAPI KONSISTEN)
// -----------------------------------------------------------
// Dipakai KHUSUS untuk membagi 50 KK data contoh/simulasi secara ACAK ke
// tiap blok (bukan pola tetap 2-3 KK berulang seperti sebelumnya). Pakai
// seed tetap supaya angkanya TIDAK berubah-ubah tiap kali komponen
// render ulang (kalau pakai Math.random() polos, angka KK per blok bisa
// "kedip"/berubah terus setiap ada interaksi lain di halaman).
// =====================================================================
function randomBerSeed(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Membagi `totalKK` secara ACAK (tapi konsisten, lihat randomBerSeed di atas)
// ke seluruh nama blok di `daftarBlok` - dipakai untuk data DUMMY/simulasi
// saja (Rekap Blok Rumah & Informasi Warga versi simulasi), supaya tampilan
// contoh terlihat wajar (ada blok yang ramai, ada yang masih kosong) persis
// seperti kondisi RT sungguhan, bukan data ASLI warga.
function distribusiRandomKKPerBlok(daftarBlok, totalKK, seed = 42) {
  const rand = randomBerSeed(seed);
  const hasil = {};
  daftarBlok.forEach((b) => { hasil[b] = 0; });
  for (let i = 0; i < totalKK; i++) {
    const idx = Math.floor(rand() * daftarBlok.length);
    hasil[daftarBlok[idx]] += 1;
  }
  return hasil;
}

// =====================================================================
// KOMPONEN: PILIHAN DROPDOWN (PENGGANTI <select> NATIVE)
// -----------------------------------------------------------
// PERBAIKAN: <select> bawaan HTML memakai tampilan "native" dari
// sistem operasi/browser masing-masing HP (contoh: Android menampilkan
// daftar radio besar warna gelap tanpa bisa diatur ukuran/font-nya,
// seperti pada laporan tampilan pilihan Blok & Nomor Rumah yang
// terlihat tidak rapi/proporsional saat daftar).
// Komponen di bawah ini membuat dropdown SENDIRI (bukan <select> bawaan)
// dengan gaya yang konsisten di semua perangkat (HP maupun laptop),
// mengikuti desain form yang sudah ada (rounded-xl, font rapi, dsb).
// =====================================================================
function PilihanDropdown({ value, options, onChange, placeholder = 'Pilih' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border p-2 rounded-xl bg-slate-50 font-bold text-xs text-left flex items-center justify-between gap-2 text-slate-800"
      >
        <span className={value ? '' : 'text-slate-400 font-semibold'}>{value || placeholder}</span>
        <svg className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 anim-pop">
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors duration-100 ${value === opt ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-emerald-50'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// KOMPONEN: GAMBAR BISA DI-ZOOM (KLIK -> BUKA LIGHTBOX FULL PAGE)
// -----------------------------------------------------------
// Dipakai untuk semua foto Agenda Utama, Agenda Kegiatan, dan foto
// Informasi Umum RT, baik di Web Utama (halaman publik), akun Warga,
// maupun akun Bendahara/Admin. Saat diklik/tap, foto akan terbuka besar
// di jendela pop-up (lightbox) lewat callback `onBuka`. Di laptop/desktop,
// mengarahkan kursor ke foto akan memperbesarnya sedikit (lihat CSS
// .zoomable-img-wrap) sebagai isyarat bahwa foto bisa diklik; di HP,
// cukup disentuh/tap langsung untuk membuka.
// =====================================================================
function GambarZoom({ src, alt, className = '', onBuka }) {
  if (!src) return null;
  return (
    <div
      className="zoomable-img-wrap w-full h-full"
      role="button"
      tabIndex={0}
      title="Klik untuk memperbesar foto"
      onClick={() => onBuka(src, alt)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBuka(src, alt); } }}
    >
      <img
        loading="lazy"
        decoding="async"
        src={src}
        alt={alt}
        className={className}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}

// =====================================================================
// KOMPONEN: ANGKA BERJALAN (COUNT-UP ANIMATION)
// -----------------------------------------------------------
// Menganimasikan angka dari nilai sebelumnya naik pelan-pelan menuju
// angka tertinggi/terbaru (bukan langsung "loncat" ganti angka),
// dipakai untuk kartu statistik Pengunjung.
// =====================================================================
function AngkaBerjalan({ value, className = '' }) {
  const [tampil, setTampil] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    if (value === null || value === undefined || Number.isNaN(value)) return;
    const dari = prevRef.current;
    const ke = value;
    if (dari === ke) { setTampil(ke); return; }
    const durasi = 1100;
    const mulai = performance.now();
    let frameId;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const progres = Math.min(1, (now - mulai) / durasi);
      const nilaiSekarang = Math.round(dari + (ke - dari) * easeOutCubic(progres));
      setTampil(nilaiSekarang);
      if (progres < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        prevRef.current = ke;
      }
    };
    frameId = requestAnimationFrame(step);
    return () => { if (frameId) cancelAnimationFrame(frameId); };
  }, [value]);
  return <span className={className}>{tampil.toLocaleString('id-ID')}</span>;
}

// =====================================================================
// KOMPONEN: SPARKLINE TREN (GRAFIK GARIS MINI)
// -----------------------------------------------------------
// Grafik garis kecil bergaya "sparkline" untuk memperlihatkan arah tren
// kunjungan beberapa hari terakhir, mirip kartu statistik ala dashboard.
// =====================================================================
function SparklineTren({ data, className = '' }) {
  if (!data || data.length < 2) return null;
  const w = 100, h = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return [x, y];
  });
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 2.6 : 1.8} fill="currentColor" opacity={i === pts.length - 1 ? 1 : 0.7} />
      ))}
    </svg>
  );
}

// =====================================================================
// KOMPONEN: PIE CHART DISTRIBUSI BLOK (INTERAKTIF, KLIK UNTUK ZOOM SLICE)
// -----------------------------------------------------------
// Dipakai di "Informasi Warga" (Admin) -> "Distribusi Warga per Blok",
// menggambar pie/donut chart murni pakai SVG (tanpa library luar) dari
// data [{ label, value, colorFrom, colorTo }]. Saat salah satu slice
// diklik/tap, slice tsb otomatis "meletup"/zoom keluar sedikit dari pusat
// lingkaran (exploded slice) & sedikit membesar, mirip pie chart di
// dashboard modern - klik lagi pada slice yang sama untuk kembali normal.
// =====================================================================
function PieChartBlok({ data, size = 220, unitLabel = 'KK' }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total <= 0) return null;

  const cx = size / 2, cy = size / 2;
  const rBase = size / 2 - 14; // radius normal
  const rZoom = rBase + 10; // radius saat slice sedang di-zoom/exploded

  const toXY = (angleDeg, r) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  let cursor = 0;
  const slices = data.map((d, i) => {
    const persen = d.value / total;
    const startAngle = cursor * 360;
    const endAngle = (cursor + persen) * 360;
    cursor += persen;
    return { ...d, i, persen, startAngle, endAngle };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        {slices.map((s) => {
          const isActive = activeIdx === s.i;
          const r = isActive ? rZoom : rBase;
          const midAngle = (s.startAngle + s.endAngle) / 2;
          // Offset "meletup keluar dari pusat" saat slice aktif/di-zoom
          const explodeOffset = isActive ? 10 : 0;
          const [ox, oy] = toXY(midAngle, explodeOffset);
          const [x1, y1] = [toXY(s.startAngle, r)[0] - (cx - ox), toXY(s.startAngle, r)[1] - (cy - oy)];
          const [x2, y2] = [toXY(s.endAngle, r)[0] - (cx - ox), toXY(s.endAngle, r)[1] - (cy - oy)];
          const largeArc = s.endAngle - s.startAngle > 180 ? 1 : 0;
          const pathD = `M${ox},${oy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
          const gradId = `pieGrad-${s.i}`;
          return (
            <g
              key={s.i}
              role="button"
              tabIndex={0}
              onClick={() => setActiveIdx(activeIdx === s.i ? null : s.i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveIdx(activeIdx === s.i ? null : s.i); } }}
              className="cursor-pointer transition-transform duration-200"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              <title>{`${s.label}: ${s.value} ${unitLabel} (${Math.round(s.persen * 100)}%)`}</title>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={s.colorFrom} />
                  <stop offset="100%" stopColor={s.colorTo} />
                </linearGradient>
              </defs>
              <path
                d={pathD}
                fill={`url(#${gradId})`}
                stroke="#fff"
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={activeIdx !== null && !isActive ? 0.45 : 1}
                className="transition-all duration-200"
              />
            </g>
          );
        })}
        {/* Lubang tengah (gaya donut chart) + total di tengah */}
        <circle cx={cx} cy={cy} r={rBase * 0.52} fill="#fff" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 15, fontWeight: 900 }}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.5 }}>TOTAL {unitLabel.toUpperCase()}</text>
      </svg>
      {/* LEGENDA - klik legenda juga bisa memicu zoom slice yang sama */}
      <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
        {slices.map((s) => (
          <button
            type="button"
            key={s.i}
            onClick={() => setActiveIdx(activeIdx === s.i ? null : s.i)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${activeIdx === s.i ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${s.colorFrom}, ${s.colorTo})` }}></span>
            {s.label} ({Math.round(s.persen * 100)}%)
          </button>
        ))}
      </div>
    </div>
  );
}


// Menyimpan "titik awal" (baseline) angka total pengunjung di tiap
// tanggal ke localStorage perangkat, lalu menghitung selisihnya untuk
// mendapatkan estimasi: Hari Ini, Kemarin, Minggu Ini & Minggu Lalu,
// plus 7 titik terakhir untuk grafik sparkline. Karena counter total
// bersifat kumulatif & dibagi bersama semua pengunjung, angka ini adalah
// ESTIMASI tren berbasis kapan saja perangkat ini membuka website,
// bukan pencatatan server terpisah per-hari.
// =====================================================================
function useTrenPengunjung(totalPengunjung) {
  const [tren, setTren] = useState({ hariIni: 0, kemarin: 0, mingguIni: 0, mingguLalu: 0, spark: [] });
  useEffect(() => {
    if (totalPengunjung === null || totalPengunjung === undefined || typeof window === 'undefined') return;
    try {
      const KUNCI = 'riwayat-harian-pengunjung-rt40';
      const now = new Date();
      const keyDari = (d) => d.toISOString().slice(0, 10);
      const todayKey = keyDari(now);

      const hariIndex = (now.getDay() + 6) % 7; // 0 = Senin
      const seninIni = new Date(now); seninIni.setDate(now.getDate() - hariIndex);
      const seninLalu = new Date(seninIni); seninLalu.setDate(seninIni.getDate() - 7);
      const kemarin = new Date(now); kemarin.setDate(now.getDate() - 1);
      const sebelumKemarin = new Date(now); sebelumKemarin.setDate(now.getDate() - 2);

      let riwayat = {};
      try { riwayat = JSON.parse(localStorage.getItem(KUNCI) || '{}') || {}; } catch (e) { riwayat = {}; }

      // Simpan baseline hari ini hanya sekali (kunjungan pertama hari ini di perangkat ini).
      // PENTING: baseline harus nilai SEBELUM kunjungan saat ini (totalPengunjung - 1),
      // bukan totalPengunjung itu sendiri - kalau tidak, kunjungan yang sedang berjalan ini
      // ikut "termakan" ke baseline dan Hari Ini/Minggu Ini selalu tampil 0.
      if (riwayat[todayKey] === undefined) riwayat[todayKey] = Math.max(0, totalPengunjung - 1);

      // Bersihkan riwayat lama supaya localStorage tidak membengkak
      const semuaTanggal = Object.keys(riwayat).sort();
      if (semuaTanggal.length > 20) {
        semuaTanggal.slice(0, semuaTanggal.length - 20).forEach((k) => delete riwayat[k]);
      }
      try { localStorage.setItem(KUNCI, JSON.stringify(riwayat)); } catch (e) { /* abaikan kalau storage penuh */ }

      const ambil = (key, fallback) => (riwayat[key] !== undefined ? riwayat[key] : fallback);
      const baseHariIni = riwayat[todayKey];
      const baseKemarin = ambil(keyDari(kemarin), baseHariIni);
      const baseSebelumKemarin = ambil(keyDari(sebelumKemarin), baseKemarin);
      const baseSeninIni = ambil(keyDari(seninIni), baseHariIni);
      const baseSeninLalu = ambil(keyDari(seninLalu), baseSeninIni);

      const hasilHariIni = Math.max(0, totalPengunjung - baseHariIni);
      const hasilKemarin = Math.max(0, baseHariIni - baseKemarin);
      // PERBAIKAN: "Minggu Ini" sengaja dibuat = Hari Ini + Kemarin (bukan
      // dihitung dari baseline hari Senin secara terpisah) supaya angka yang
      // ditampilkan di kartu selalu "nyambung"/konsisten secara matematis
      // dengan 2 angka di sebelahnya (Hari Ini & Kemarin), tidak membingungkan
      // warga yang membandingkan langsung angkanya di kartu Jumlah Pengunjung.
      const hasilMingguIni = hasilHariIni + hasilKemarin;
      const hasilMingguLalu = Math.max(0, baseSeninIni - baseSeninLalu);

      const spark = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const key = keyDari(d);
        spark.push(riwayat[key] !== undefined ? riwayat[key] : baseHariIni);
      }
      spark.push(totalPengunjung);

      setTren({ hariIni: hasilHariIni, kemarin: hasilKemarin, mingguIni: hasilMingguIni, mingguLalu: hasilMingguLalu, spark });
    } catch (e) {
      // biarkan nilai default kalau localStorage tidak tersedia (mis. mode privat)
    }
  }, [totalPengunjung]);
  return tren;
}

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
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwr2SnfxwirNXy1MKn9gy4GmT-oPkEMfP2QKirB2csLT5rGOUQXHHSVVg-xla6uShxb/exec';
// Kunci rahasia aplikasi - HARUS SAMA PERSIS dengan APP_SECRET di Code.gs.
// SUDAH DIGANTI dari 'tes123' (testing) ke string acak yang panjang & sulit
// ditebak, sesuai rekomendasi keamanan sebelum aplikasi dipublish ke warga.
// PENTING: kalau suatu saat mau ganti lagi, WAJIB update juga nilai yang
// SAMA PERSIS di APP_SECRET pada Code.gs, lalu Deploy ulang (New version) -
// kalau tidak sama persis, semua login & permintaan data akan ditolak server.
const APP_SECRET = 'ISFWkod0HCqvYLZkVsIeZquIGt82sQYeRoHtBKLa';

// =====================================================================
// SISTEM TEMA WARNA (PALET) - MENGIKUTI PERMINTAAN:
//  - Ada beberapa palet tema warna yang bisa dipilih lewat tombol "Tema"
//    di bar paling atas (tampil untuk pengunjung, warga, maupun admin).
//  - Tema BAWAAN diatur oleh ADMIN (disimpan di kolom `temaWarna` sheet
//    "Pengaturan" bersama pengaturan CMS lain). Kalau admin mengganti tema,
//    SEMUA pengunjung & warga otomatis ikut berganti.
//  - Pengunjung / warga yang mengganti tema HANYA mengubah tampilan di layar
//    mereka sendiri saat itu (tidak disimpan, kembali ke tema admin saat
//    halaman dibuka ulang).
//
// CARA KERJA: setiap tema = 2 ramp warna (11 tingkat, 50 - 950):
//   d = warna DASAR/gelap (dulu biru navy)   -> variabel --tm-d50 ... --tm-d950
//   a = warna AKSEN/tombol (dulu hijau zamrud) -> variabel --tm-a50 ... --tm-a950
// Variabel ini dipasang di elemen akar aplikasi. Kelas Tailwind lama
// (bg-blue-950, bg-emerald-600, dst) dialihkan ke variabel tsb lewat
// aturan CSS di buatCssTema() di bawah, jadi SELURUH halaman berubah warna
// tanpa perlu mengubah ribuan kelas satu per satu.
// =====================================================================
const TINGKAT_WARNA = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const RAMP_WARNA = {
  blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
  emerald: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
  green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
  violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'],
  fuchsia: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4a044e'],
  orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
  teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'],
  sky: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
  slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'],
  indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'],
};
const TEMA_WARNA = [
  { id: 'biru', nama: 'Biru Navy', d: 'blue', a: 'emerald' },
  { id: 'hijau', nama: 'Hijau Rimba', d: 'emerald', a: 'green' },
  { id: 'ungu', nama: 'Ungu Royal', d: 'violet', a: 'fuchsia' },
  { id: 'oranye', nama: 'Oranye Senja', d: 'orange', a: 'teal' },
  { id: 'tosca', nama: 'Tosca Laut', d: 'teal', a: 'sky' },
  { id: 'slate', nama: 'Slate Elegan', d: 'slate', a: 'indigo' },
];
const TEMA_DEFAULT_ID = 'biru';
const cariTema = (id) => TEMA_WARNA.find((t) => t.id === id) || TEMA_WARNA[0];
const idTemaValid = (id) => (TEMA_WARNA.some((t) => t.id === id) ? id : TEMA_DEFAULT_ID);
function buatVariabelTema(id) {
  const tema = cariTema(id);
  const vars = {};
  TINGKAT_WARNA.forEach((tingkat, i) => {
    vars[`--tm-d${tingkat}`] = RAMP_WARNA[tema.d][i];
    vars[`--tm-a${tingkat}`] = RAMP_WARNA[tema.a][i];
  });
  // Foto latar (biru) diberi lapisan warna tema; 0 = foto asli tanpa perubahan (tema Biru Navy).
  vars['--tm-tint'] = id === TEMA_DEFAULT_ID ? '0' : '0.88';
  return vars;
}
const swatchTema = (tema) => `linear-gradient(135deg, ${RAMP_WARNA[tema.d][9]} 0%, ${RAMP_WARNA[tema.d][7]} 48%, ${RAMP_WARNA[tema.a][5]} 52%, ${RAMP_WARNA[tema.a][6]} 100%)`;

// Daftar pengalihan kelas Tailwind lama -> variabel tema.
// Format: [kelas, properti CSS, ramp ('d' | 'a'), tingkat, opasitas% (opsional), pseudo (opsional)]
const TEMA_ATURAN = (() => {
  const r = [];
  const tambah = (prefixKelas, prop, ramp, tingkatList, extra = {}) => {
    tingkatList.forEach((t) => r.push([`${prefixKelas}-${t}`, prop, ramp, t, extra.alpha, extra.pseudo]));
  };
  // ---- ramp DASAR (dulu blue) ----
  tambah('bg-blue', 'background-color', 'd', [50, 100, 800, 900, 950]);
  tambah('text-blue', 'color', 'd', [50, 100, 200, 300, 700, 800, 950]);
  tambah('border-blue', 'border-color', 'd', [700, 800, 900]);
  [['bg-blue-950/60', 'background-color', 950, 60], ['bg-blue-950/70', 'background-color', 950, 70], ['bg-blue-950/50', 'background-color', 950, 50],
    ['bg-blue-900/60', 'background-color', 900, 60], ['bg-blue-800/70', 'background-color', 800, 70], ['bg-blue-800/60', 'background-color', 800, 60],
    ['text-blue-300/80', 'color', 300, 80], ['border-blue-900/60', 'border-color', 900, 60], ['border-blue-900/50', 'border-color', 900, 50],
    ['border-blue-800/60', 'border-color', 800, 60], ['border-blue-400/30', 'border-color', 400, 30], ['shadow-blue-950/30', '--tw-shadow-color', 950, 30],
    ['shadow-blue-900/30', '--tw-shadow-color', 900, 30], ['ring-blue-400/40', '--tw-ring-color', 400, 40],
  ].forEach(([k, p, t, a]) => r.push([k, p, 'd', t, a]));
  r.push(['hover:bg-blue-800/60', 'background-color', 'd', 800, 60, 'hover']);
  // ---- ramp AKSEN (dulu emerald) ----
  tambah('bg-emerald', 'background-color', 'a', [50, 100, 400, 500, 600, 700, 800, 900]);
  tambah('text-emerald', 'color', 'a', [50, 200, 300, 400, 500, 600, 700, 800, 950]);
  tambah('border-emerald', 'border-color', 'a', [100, 200, 300, 600, 800, 900]);
  [['shadow-emerald-900/40', '--tw-shadow-color', 900, 40], ['text-emerald-800/40', 'color', 800, 40], ['text-emerald-800/30', 'color', 800, 30], ['text-emerald-500/10', 'color', 500, 10]]
    .forEach(([k, p, t, a]) => r.push([k, p, 'a', t, a]));
  r.push(['accent-emerald-700', 'accent-color', 'a', 700]);
  r.push(['hover:bg-emerald-50', 'background-color', 'a', 50, undefined, 'hover']);
  r.push(['hover:bg-emerald-400', 'background-color', 'a', 400, undefined, 'hover']);
  r.push(['hover:text-emerald-700', 'color', 'a', 700, undefined, 'hover']);
  return r;
})();
function buatCssTema() {
  const esc = (s) => s.replace(/[:/.]/g, (m) => `\\${m}`);
  const aturan = TEMA_ATURAN.map(([kelas, prop, ramp, tingkat, alpha, pseudo]) => {
    const v = `var(--tm-${ramp}${tingkat})`;
    const nilai = alpha ? `color-mix(in srgb, ${v} ${alpha}%, transparent)` : v;
    return `.app-root .${esc(kelas)}${pseudo ? `:${pseudo}` : ''}{${prop}:${nilai} !important}`;
  });
  // Gradasi (bg-gradient-to-* from-blue-950 via-blue-900 to-blue-950 dst) ditulis
  // ulang langsung sebagai background-image supaya tidak bergantung pada versi
  // Tailwind (v3 / v4 menyimpan variabel gradasi dengan cara yang berbeda).
  const arah = { br: 'to bottom right', b: 'to bottom', r: 'to right', t: 'to top' };
  Object.entries(arah).forEach(([k, dir]) => {
    aturan.push(`.app-root .bg-gradient-to-${k}.from-blue-950{background-image:linear-gradient(${dir},var(--tm-d950),var(--tm-d900),var(--tm-d950)) !important}`);
  });
  aturan.push('.app-root .bg-gradient-to-br.from-blue-950.to-indigo-900{background-image:linear-gradient(to bottom right,var(--tm-d950),var(--tm-d900),var(--tm-a800)) !important}');
  aturan.push('.app-root .hover\\:from-blue-900:hover{background-image:linear-gradient(to right,var(--tm-d900),var(--tm-d800),var(--tm-d900)) !important}');
  aturan.push('.app-root .bg-gradient-to-t.from-emerald-700{background-image:linear-gradient(to top,var(--tm-a700),var(--tm-a400)) !important}');
  return aturan.join('\n');
}

// =====================================================================
// IKON SVG (SATU KUMPULAN IKON GARIS - TANPA LIBRARY TAMBAHAN)
// =====================================================================
const IKON_PATH = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M8 7h2M14 7h2M8 11h2M14 11h2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  userPlus: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  checkCircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  coin: <><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 18V6" /></>,
  percent: <><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
  trend: <><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></>,
  chart: <path d="M12 20V10M18 20V4M6 20v-4" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" /></>,
  megaphone: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  mapPin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  pencil: <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  chevL: <path d="m15 18-6-6 6-6" />,
  chevR: <path d="m9 18 6-6-6-6" />,
  palette: <><circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.12-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" /></>,
  landmark: <path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 3 7h18z" />,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 14h6M9 18h4" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" /><path d="M12 9v4M12 17h.01" /></>,
  receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" /><path d="M15.5 8.5h-5a1.75 1.75 0 1 0 0 3.5h3a1.75 1.75 0 1 1 0 3.5H8.5M12 6.5v11" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  refresh: <><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></>,
};
function Ikon({ nama, className = 'w-5 h-5', strokeWidth = 2 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {IKON_PATH[nama] || null}
    </svg>
  );
}
function IkonWhatsapp({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.59 5.93L0 24l6.37-1.67a11.8 11.8 0 0 0 5.66 1.44h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.36-8.45zM12.04 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.78.99 1.01-3.68-.24-.38a9.85 9.85 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 7c0 5.45-4.44 9.9-9.85 9.9zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

// =====================================================================
// LATAR FOTO PERUMAHAN (dipakai di Web Utama, banner Dashboard, kartu sapaan
// dan sidebar). Satu foto panorama (sudah dikompres & disematkan langsung di
// kode, jadi tidak perlu upload file gambar terpisah). Foto aslinya berwarna
// biru; untuk tema selain Biru Navy, foto diberi lapisan warna tema
// (mix-blend-mode: color) sehingga langit, danau, dan lengkung samping ikut
// berganti warna. variant hanya mengatur bagian foto mana yang ditampilkan:
//   'hero'    -> banner besar Web Utama
//   'sapaan'  -> kartu sapaan Dashboard (memudar ke kiri lewat mask di pemanggil)
//   'header'  -> banner tipis di atas halaman Dashboard
//   'sidebar' -> latar sidebar (lengkung biru-emas di sisi kiri foto)
// =====================================================================
const FOTO_LATAR_RT = 'data:image/jpeg;base64,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';
const POSISI_FOTO_LATAR = { hero: '72% 38%', header: '60% 14%', sapaan: '55% 12%', sidebar: '3% 50%' };
function AdeganPerumahan({ variant = 'header', className = '', style }) {
  return (
    <div className={className} style={{ isolation: 'isolate', overflow: 'hidden', ...style }} aria-hidden="true">
      <div className="absolute inset-0" style={{ backgroundImage: `url(${FOTO_LATAR_RT})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: POSISI_FOTO_LATAR[variant] || 'center' }} />
      <div className="absolute inset-0" style={{ background: 'var(--tm-d500)', mixBlendMode: 'color', opacity: 'var(--tm-tint)' }} />
      {variant === 'sidebar' && (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--tm-d950) 80%, transparent) 0%, color-mix(in srgb, var(--tm-d950) 60%, transparent) 50%, color-mix(in srgb, var(--tm-d950) 78%, transparent) 100%)' }} />
      )}
    </div>
  );
}

// Ilustrasi ponsel + gelembung WhatsApp (kartu "Hubungi Pengurus")
function IlustrasiWhatsapp({ className = '' }) {
  return (
    <svg viewBox="0 0 150 130" className={className} aria-hidden="true">
      <g transform="rotate(12 75 65)">
        <rect x="42" y="10" width="64" height="112" rx="12" style={{ fill: 'var(--tm-a600)' }} />
        <rect x="42" y="10" width="64" height="112" rx="12" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
        <rect x="49" y="20" width="50" height="86" rx="7" style={{ fill: 'var(--tm-a500)' }} />
        <circle cx="74" cy="114" r="3" fill="#fff" fillOpacity="0.8" />
      </g>
      <circle cx="78" cy="62" r="24" fill="#fff" fillOpacity="0.96" />
      <path d="M70 55c0 8 9 17 17 17l4-4-6-3-3 2c-3-1-6-4-7-7l2-3-3-6z" style={{ fill: 'var(--tm-a600)' }} />
      <path d="M78 42a20 20 0 0 0-17.3 30l-2.7 10 10.3-2.7A20 20 0 1 0 78 42z" fill="none" style={{ stroke: 'var(--tm-a600)' }} strokeWidth="3" />
      <circle cx="26" cy="30" r="5" style={{ fill: 'var(--tm-a300)' }} fillOpacity="0.7" />
      <circle cx="132" cy="96" r="7" style={{ fill: 'var(--tm-a300)' }} fillOpacity="0.55" />
    </svg>
  );
}

// =====================================================================
// PILIHAN PALET TEMA WARNA (TOMBOL "TEMA" DI BAR ATAS)
// =====================================================================
function PaletTema({ temaAktif, temaBawaan, adalahAdmin, onPilih, onReset }) {
  const [buka, setBuka] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    const klikLuar = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setBuka(false); };
    document.addEventListener('mousedown', klikLuar);
    document.addEventListener('touchstart', klikLuar);
    return () => { document.removeEventListener('mousedown', klikLuar); document.removeEventListener('touchstart', klikLuar); };
  }, []);
  const tema = cariTema(temaAktif);
  const sedangDiOverride = !adalahAdmin && temaAktif !== temaBawaan;
  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-label="Ganti tema warna"
        aria-expanded={buka}
        className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-bold text-white transition-colors"
      >
        <Ikon nama="palette" className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tema</span>
        <span className="w-3.5 h-3.5 rounded-full ring-2 ring-white/70" style={{ background: swatchTema(tema) }} />
      </button>
      {buka && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[88vw] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-[60] anim-pop font-semibold">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-black text-slate-900 flex items-center gap-1.5"><Ikon nama="palette" className="w-3.5 h-3.5" /> Palet Tema Warna</p>
            <button type="button" onClick={() => setBuka(false)} className="text-slate-400 hover:text-slate-700" aria-label="Tutup"><Ikon nama="x" className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TEMA_WARNA.map((t) => {
              const aktif = t.id === temaAktif;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => onPilih(t.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-150 ${aktif ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}
                >
                  <span className="relative w-9 h-9 rounded-full shadow-inner ring-2 ring-white" style={{ background: swatchTema(t) }}>
                    {aktif && <span className="absolute inset-0 flex items-center justify-center text-white"><Ikon nama="check" className="w-4 h-4" strokeWidth={3} /></span>}
                  </span>
                  <span className="text-[10px] leading-tight text-center text-slate-700 font-bold">{t.nama}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[10px] leading-relaxed text-slate-500 font-medium">
            {adalahAdmin ? (
              <><b className="text-slate-700">Mode Admin:</b> tema yang Anda pilih menjadi <b>tema bawaan</b> dan langsung berganti untuk <b>semua pengunjung &amp; warga</b>.</>
            ) : (
              <>Pilihan ini hanya mengubah tampilan <b>di layar Anda saat ini</b>. Tema bawaan untuk semua orang diatur oleh admin.</>
            )}
          </div>
          {sedangDiOverride && (
            <button type="button" onClick={() => { onReset(); setBuka(false); }} className="mt-2 w-full text-[10px] font-black text-slate-600 hover:text-slate-900 underline underline-offset-2">
              Kembali ke tema bawaan ({cariTema(temaBawaan).nama})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// PAGINASI BUKU KAS RT
// -----------------------------------------------------------
// Halaman 1 = 10 transaksi TERAKHIR (paling baru); halaman 2, 3, dst =
// 10 transaksi sebelumnya. Yang berganti hanya baris riwayat pencatatan;
// kotak "Sisa Saldo Kas RT" tetap di bawah dan selalu menampilkan saldo
// terkini (dihitung dari seluruh data, bukan dari halaman yang dibuka).
// Urutan baris di dalam satu halaman tetap kronologis (saldo berjalan
// terbaca dari atas ke bawah).
// =====================================================================
function PaginasiKas({ data, ukuran = 10, gaya = 'terang', children }) {
  const total = data.length;
  const totalHal = Math.max(1, Math.ceil(total / ukuran));
  const [hal, setHal] = useState(1);
  const halAman = Math.min(Math.max(1, hal), totalHal);
  useEffect(() => { if (hal > totalHal) setHal(totalHal); }, [hal, totalHal]);
  const akhir = total - (halAman - 1) * ukuran;
  const awal = Math.max(0, akhir - ukuran);
  const baris = data.slice(awal, akhir);

  // daftar nomor halaman (dengan titik-titik kalau terlalu banyak)
  const nomor = [];
  if (totalHal <= 7) { for (let i = 1; i <= totalHal; i++) nomor.push(i); }
  else {
    nomor.push(1);
    if (halAman > 3) nomor.push('...');
    for (let i = Math.max(2, halAman - 1); i <= Math.min(totalHal - 1, halAman + 1); i++) nomor.push(i);
    if (halAman < totalHal - 2) nomor.push('...');
    nomor.push(totalHal);
  }
  const gelap = gaya === 'gelap';
  const tombolDasar = gelap
    ? 'bg-blue-950/60 text-blue-100 border border-blue-800 hover:bg-blue-900'
    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
  const tombolAktif = gelap ? 'bg-emerald-500 text-white border border-emerald-400' : 'bg-emerald-600 text-white border border-emerald-600';
  const teksInfo = gelap ? 'text-blue-200' : 'text-slate-400';

  return (
    <>
      {children(baris, { awal, akhir, halaman: halAman })}
      {total > ukuran && (
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className={`text-[10px] font-semibold ${teksInfo} text-center sm:text-left`}>
            Halaman {halAman} dari {totalHal} • Transaksi ke-{awal + 1} s/d {akhir} dari {total}
            {halAman === 1 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${gelap ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>Terbaru</span>}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={halAman <= 1} onClick={() => setHal(halAman - 1)} aria-label="Halaman lebih baru" className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed ${tombolDasar}`}><Ikon nama="chevL" className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
            {nomor.map((n, i) => (n === '...'
              ? <span key={`t${i}`} className={`px-1 text-[11px] font-bold ${teksInfo}`}>…</span>
              : <button type="button" key={n} onClick={() => setHal(n)} className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[11px] font-black ${n === halAman ? tombolAktif : tombolDasar}`}>{n}</button>))}
            <button type="button" disabled={halAman >= totalHal} onClick={() => setHal(halAman + 1)} aria-label="Halaman lebih lama" className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed ${tombolDasar}`}><Ikon nama="chevR" className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
          </div>
        </div>
      )}
    </>
  );
}

// =====================================================================
// KARTU VISI / MISI (dipakai di Web Utama & Dashboard Warga)
// =====================================================================
function KartuVisiMisi({ judul, teks, ikon, ramp = 'd', panah = false, onKlik }) {
  const Pembungkus = onKlik ? 'button' : 'div';
  return (
    <Pembungkus
      {...(onKlik ? { type: 'button', onClick: onKlik } : {})}
      className={`relative overflow-hidden rounded-3xl border border-white shadow-md p-4 flex gap-3 text-left ${onKlik ? 'transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg' : ''}`}
      style={{ background: `linear-gradient(135deg, #ffffff 28%, var(--tm-${ramp}100))` }}
    >
      <svg className="absolute -right-4 -bottom-4 w-28 h-28 pointer-events-none" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="60" cy="60" r="42" fill="none" style={{ stroke: `var(--tm-${ramp}200)` }} strokeWidth="7" />
        <circle cx="60" cy="60" r="27" fill="none" style={{ stroke: `var(--tm-${ramp}200)` }} strokeWidth="7" />
        <circle cx="60" cy="60" r="12" style={{ fill: `var(--tm-${ramp}200)` }} />
      </svg>
      <div className="relative w-10 h-10 shrink-0 rounded-full grid place-items-center text-white shadow-lg ring-[3px] ring-white" style={{ background: `linear-gradient(135deg, var(--tm-${ramp}500), var(--tm-${ramp}700))` }}>
        <Ikon nama={ikon} className="w-5 h-5" />
      </div>
      <div className="relative min-w-0 flex-1 pr-6">
        <h4 className="text-[13px] font-black tracking-wide" style={{ color: `var(--tm-${ramp}800)` }}>{judul}</h4>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600 font-medium">{teks}</p>
      </div>
      {panah && (
        <span className="absolute top-3 right-3 w-6 h-6 rounded-full grid place-items-center bg-white shadow" style={{ color: `var(--tm-${ramp}600)` }}>
          <Ikon nama="arrowRight" className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      )}
    </Pembungkus>
  );
}

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
      /* Memaksa popup NATIVE browser (dropdown <select>, kalender <input type="date">,
         dst) selalu tampil TEMA TERANG/PUTIH dengan ukuran teks proporsional standar,
         terlepas dari HP pengguna sedang dalam mode gelap (dark mode) atau tidak.
         Tanpa ini, di sebagian browser Android/Chrome popup2 tsb ikut mode gelap HP
         (background hitam, teks besar tidak proporsional) walau tampilan web-nya sendiri
         sudah terang. */
      .app-root select, .app-root input, .app-root textarea { color-scheme: light; }
      @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes toastIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      .anim-fade { animation: fadeSlideIn 0.35s ease both; }
      .anim-toast { animation: toastIn 0.3s ease both; }
      .anim-pop { animation: popIn 0.25s ease both; }
      .app-root nav button, .app-root .menu-btn { transition: background-color 0.25s ease, color 0.25s ease, transform 0.15s ease; }
      .app-root nav button:active, .app-root .menu-btn:active { transform: scale(0.97); }
      /* RUNNING TEXT (MARQUEE) - dipakai di kotak hijau bawah jam digital Beranda,
         teks berjalan terus-menerus dari kanan ke kiri secara loop tanpa putus. */
      @keyframes marqueeBerjalan { from { transform: translateX(0%); } to { transform: translateX(-50%); } }
      .marquee-wrap { overflow: hidden; white-space: nowrap; }
      .marquee-track { display: inline-flex; width: max-content; animation: marqueeBerjalan 14s linear infinite; }
      .marquee-track span { padding-right: 3rem; }
      /* PROGRESS BAR ANIMASI di overlay "Menyiapkan data RT..." (loading awal) -
         gerakan bolak-balik terus-menerus (indeterminate), supaya kelihatan
         "hidup"/profesional walau durasi tarik data sesungguhnya bervariasi
         tergantung kecepatan koneksi. */
      @keyframes loadingBarAnim { 0% { transform: translateX(-100%); width: 40%; } 50% { width: 60%; } 100% { transform: translateX(250%); width: 40%; } }
      .loading-bar-anim { animation: loadingBarAnim 1.1s ease-in-out infinite; }
      /* GAMBAR BISA DI-ZOOM (KLIK UNTUK LIGHTBOX) - dipakai di semua foto Agenda,
         Agenda Utama, & Informasi Umum RT (Web Utama, akun Warga, akun Bendahara).
         Efek membesar (scale) saat kursor diarahkan HANYA aktif di perangkat yang
         benar-benar punya mouse/cursor presisi (laptop/desktop), lewat media query
         (hover: hover) & (pointer: fine), supaya di HP (layar sentuh) tidak ada efek
         hover yang "nyangkut" setelah foto disentuh - untuk HP cukup tap untuk buka. */
      .zoomable-img-wrap { cursor: zoom-in; }
      .zoomable-img-wrap img { transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
      @media (hover: hover) and (pointer: fine) {
        .zoomable-img-wrap:hover img { transform: scale(1.14); }
      }
      .zoomable-img-wrap:active img { transform: scale(1.06); }
      /* LIGHTBOX / POP-UP FOTO PENUH */
      @keyframes lightboxFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes lightboxPopIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
      .lightbox-overlay { animation: lightboxFadeIn 0.2s ease both; }
      .lightbox-img-box { animation: lightboxPopIn 0.25s ease both; }
      .lightbox-img { transition: transform 0.3s ease; cursor: zoom-in; }
      .lightbox-img.is-zoomed { cursor: zoom-out; }
      /* ===== TEMA WARNA: pengalihan kelas warna lama ke variabel tema (lihat buatCssTema) ===== */
      ${buatCssTema()}
      /* ===== TAMBAHAN TAMPILAN BARU ===== */
      .app-root .font-tulisan { font-family: 'Caveat', 'Segoe Script', 'Brush Script MT', cursive; }
      .app-root .menu-btn { display: flex; align-items: center; gap: 0.75rem; }
      .app-root .menu-aktif {
        background-image: linear-gradient(90deg, var(--tm-a600), var(--tm-a500)) !important;
        box-shadow: 0 0 0 1.5px rgba(255,255,255,0.55), 0 0 16px var(--tm-a400) !important;
        color: #fff !important;
      }
      .app-root nav .menu-btn.py-3 { padding-top: 0.55rem; padding-bottom: 0.55rem; }
      .app-root .tm-input:focus { outline: none; border-color: var(--tm-a500); box-shadow: 0 0 0 3px color-mix(in srgb, var(--tm-a500) 22%, transparent); }
      .app-root .tm-btn-utama { background-image: linear-gradient(90deg, var(--tm-d700), var(--tm-a600)); transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease; }
      .app-root .tm-btn-utama:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); box-shadow: 0 12px 24px -10px var(--tm-a600); }
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

  // ==========================================
  // LOGIN ADMIN/PANITIA - SEKARANG MENYATU DENGAN LOGIN WARGA
  // -----------------------------------------------------------
  // Sebelumnya akun Super Admin butuh tautan rahasia (?admin=1) supaya
  // tombol "Login Panitia/Admin" muncul, lalu login lewat form/modal
  // TERPISAH dari form warga. Sekarang tidak ada lagi tautan rahasia atau
  // form terpisah: SATU form "Login Akun Warga" di Web Utama dipakai untuk
  // SEMUA akun - baik warga biasa maupun Super Admin (username & password
  // bawaan admin/admin123, bisa diganti di menu "Ubah Login Admin Panel").
  // Lihat handleLogin di bawah untuk logika deteksinya.
  // ==========================================
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
  // COUNTER PENGUNJUNG WEB (SHARED/GLOBAL, BUKAN PER-BROWSER)
  // -----------------------------------------------------------
  // PENTING: TIDAK memakai Google Apps Script (Code.gs) sama sekali, sesuai
  // permintaan supaya backend Sheets tidak perlu diubah/deploy ulang.
  //
  // PERBAIKAN (versi sebelumnya belum tampil sama sekali di website
  // produksi Anda): `window.storage` yang dipakai sebelumnya HANYA
  // tersedia saat file ini dipratinjau LANGSUNG di dalam Claude.ai
  // (fitur "Artifacts"). Begitu kode ini di-deploy ke website Anda sendiri
  // (di luar Claude.ai), `window.storage` tidak pernah ada, sehingga
  // sebelumnya kode ini gagal (masuk jalur fallback yang keliru & bikin
  // angkanya kelihatan tidak jalan/tidak muncul).
  //
  // Sekarang alurnya jadi 3 lapis, otomatis dipilih sesuai tempat kode ini
  // berjalan:
  //   1) Kalau dipratinjau di Claude.ai -> tetap pakai window.storage.
  //   2) Kalau di website ASLI Anda (produksi) -> pakai layanan counter
  //      publik gratis "CounterAPI.dev" (https://counterapi.dev) lewat fetch
  //      biasa. Ini pihak ketiga gratis di luar Anthropic, TIDAK perlu
  //      server/Apps Script tambahan sama sekali, dan TIDAK perlu API key
  //      untuk versi v1 yang dipakai di sini.
  //   3) Kalau dua-duanya gagal (mis. sedang offline) -> fallback angka yang
  //      tersimpan di localStorage perangkat ini saja (supaya tetap naik
  //      tiap kunjungan baru di perangkat yang sama, walau tidak tersinkron
  //      ke pengunjung lain sampai koneksi normal kembali).
  // Contoh: User A buka -> lihat 131, User B buka -> otomatis 132, dst.
  // ==========================================
  const [totalPengunjung, setTotalPengunjung] = useState(null);
  useEffect(() => {
    let sudahDilepas = false;
    const KUNCI_PENGUNJUNG = 'total-pengunjung-web-utama';
    const ANGKA_AWAL = 130; // titik awal, supaya pengunjung pertama langsung lihat 131

    (async () => {
      // LAPIS 1: window.storage - hanya ada saat dipratinjau di Claude.ai
      try {
        if (typeof window !== 'undefined' && window.storage) {
          let angkaSekarang = ANGKA_AWAL;
          try {
            const existing = await window.storage.get(KUNCI_PENGUNJUNG, true);
            if (existing && existing.value !== undefined && existing.value !== null) {
              const parsed = parseInt(existing.value, 10);
              if (!Number.isNaN(parsed)) angkaSekarang = parsed;
            }
          } catch (errBaca) {
            angkaSekarang = ANGKA_AWAL; // key belum pernah dibuat
          }
          const angkaBaru = angkaSekarang + 1;
          await window.storage.set(KUNCI_PENGUNJUNG, String(angkaBaru), true);
          if (!sudahDilepas) setTotalPengunjung(angkaBaru);
          return;
        }
      } catch (errStorage) {
        // lanjut ke Lapis 2 di bawah
      }

      // LAPIS 2: DI WEBSITE PRODUKSI SUNGGUHAN - pakai CounterAPI.dev (gratis,
      // publik, tanpa perlu server sendiri, tanpa perlu API key untuk versi v1)
      // supaya angka SAMA & terus naik untuk SEMUA pengunjung sungguhan, tanpa
      // mengubah Apps Script. CATATAN: sebelumnya di sini memakai countapi.xyz,
      // tapi layanan itu SUDAH TUTUP/TIDAK AKTIF LAGI, makanya angka terlihat
      // tidak jalan - sekarang diganti ke CounterAPI.dev yang masih aktif.
      try {
        const namespace = 'rt40rw08-iuran-warga-perum-bumi-indah-proklamasi';
        const resp = await fetch(`https://api.counterapi.dev/v1/${namespace}/${KUNCI_PENGUNJUNG}/up`);
        const data = await resp.json();
        if (data && typeof data.value === 'number') {
          if (!sudahDilepas) setTotalPengunjung(data.value + ANGKA_AWAL);
          return;
        }
        throw new Error('Respons CounterAPI.dev tidak valid');
      } catch (errCounterApi) {
        // lanjut ke Lapis 3 (fallback lokal) di bawah
      }

      // LAPIS 3: FALLBACK TERAKHIR (mis. sedang offline / CounterAPI.dev juga
      // bermasalah) - angka disimpan di localStorage PERANGKAT INI supaya tidak
      // reset tiap kali halaman dimuat ulang (walau begitu, angka ini TIDAK
      // tersinkron dengan pengunjung dari perangkat lain sampai koneksi ke
      // CounterAPI.dev normal kembali).
      try {
        const KUNCI_FALLBACK_LOKAL = 'fallback-total-pengunjung-lokal';
        let angkaLokal = ANGKA_AWAL;
        const tersimpanLokal = localStorage.getItem(KUNCI_FALLBACK_LOKAL);
        if (tersimpanLokal !== null) {
          const parsedLokal = parseInt(tersimpanLokal, 10);
          if (!Number.isNaN(parsedLokal)) angkaLokal = parsedLokal;
        }
        angkaLokal += 1;
        localStorage.setItem(KUNCI_FALLBACK_LOKAL, String(angkaLokal));
        if (!sudahDilepas) setTotalPengunjung(angkaLokal);
      } catch (errLokal) {
        if (!sudahDilepas) setTotalPengunjung((prev) => (prev || ANGKA_AWAL) + 1);
      }
    })();

    return () => { sudahDilepas = true; };
  }, []);

  // Tren kunjungan (Hari Ini / Kemarin / Minggu Ini / Minggu Lalu + data sparkline)
  // dihitung otomatis dari totalPengunjung di atas.
  const trenPengunjung = useTrenPengunjung(totalPengunjung);

  // ==========================================
  // AUTO-HIDE KARTU "JUMLAH PENGUNJUNG" - kartu tren pengunjung otomatis
  // memudar & hilang sendiri ±12 detik setelah halaman dibuka, supaya tidak
  // memenuhi header terus-menerus (cukup dilihat sekilas di awal).
  // ==========================================
  const [pudarkanKartuPengunjung, setPudarkanKartuPengunjung] = useState(false);
  const [tampilkanKartuPengunjung, setTampilkanKartuPengunjung] = useState(true);
  useEffect(() => {
    const timerPudar = setTimeout(() => setPudarkanKartuPengunjung(true), 11500);
    const timerHilang = setTimeout(() => setTampilkanKartuPengunjung(false), 12000);
    return () => { clearTimeout(timerPudar); clearTimeout(timerHilang); };
  }, []);

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

  // TEMA WARNA LOKAL - pilihan pengunjung/warga yang HANYA berlaku di layar
  // mereka sendiri saat itu (tidak disimpan). null = ikut tema bawaan admin.
  const [temaLokal, setTemaLokal] = useState(null);
  // Banner "ini cuma simulasi" di Dashboard bisa ditutup (tombol X).
  const [tutupBannerSimulasi, setTutupBannerSimulasi] = useState(false);
  // Ikon mata (lihat/sembunyikan) pada kolom password form Login.
  const [lihatPasswordLogin, setLihatPasswordLogin] = useState(false);

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
    // TEMA WARNA BAWAAN (diatur Admin lewat tombol "Tema" di bar atas, ikut
    // tersimpan & tersinkron ke semua akun bersama pengaturan CMS lain).
    temaWarna: TEMA_DEFAULT_ID,
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
    // LABEL/KETERANGAN JABATAN pada kartu "Struktur Pengurus RW" di Web Utama.
    // Bisa diedit bebas oleh Admin lewat CMS Super Editor (tidak lagi hardcode
    // "Ketua RT"), default sekarang "Ketua RW".
    labelKetua: 'Ketua RW',
    labelSekretaris: 'Sekretaris',
    labelBendahara: 'Bendahara',
    labelHumas: 'Humas',
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
    asetRTList: ['Pos Ronda', 'Gapura Perumahan', 'Sound System', 'Tenda & Kursi Kegiatan Warga', 'Alat Kebersihan Lingkungan', 'Mobil Operasional RT'],
    // ==========================================
    // PILIHAN BLOK RUMAH & NOMOR RUMAH (dropdown Form Pendaftaran warga baru)
    // -----------------------------------------------------------
    // Sebelumnya daftar ini HARDCODE di kode (F1-F14, G1-G6 / nomor 1-25),
    // jadi kalau nama blok RT berubah, admin harus minta programmer edit kode.
    // Sekarang jadi bagian dari CMS Super Editor -> Admin bisa tambah/hapus/
    // ubah sendiri, tersimpan ke sheet "Pengaturan" sama seperti Aset RT &
    // Info Pengumuman, otomatis update di form pendaftaran untuk semua akun.
    daftarBlokRumahList: [
      ...Array.from({ length: 14 }, (_, i) => `F${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `G${i + 1}`),
    ],
    daftarNomorRumahList: [
      ...Array.from({ length: 11 }, (_, i) => String(i + 1)),
      '12A',
      ...Array.from({ length: 12 }, (_, i) => String(i + 14)),
    ],
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
  // SERBA-SERBI UMKM RT (GALERI PRODUK UMKM WARGA)
  // -----------------------------------------------------------
  // Dikelola Admin lewat CMS Super Editor (foto produk, nama produk,
  // deskripsi, & nomor WhatsApp pemilik produk), otomatis tampil di halaman
  // Beranda (Web Utama) untuk SEMUA akun sebagai dukungan UMKM warga RT.
  // Tombol "Chat WhatsApp" pada tiap kartu langsung terkoneksi ke nomor WA
  // pemilik produk masing-masing (pakai helper buatLinkWhatsapp yang sama
  // dengan kontak RT). Disediakan 4 slot contoh secara default.
  // ==========================================
  const [umkmList, setUmkmList] = useState([
    { id: 'UMKM-01', namaProduk: 'Contoh: Nasi Uduk Bu Sari', deskripsi: 'Contoh: Nasi uduk komplit, siap antar area RT (data simulasi)', noWa: '', foto: null },
    { id: 'UMKM-02', namaProduk: 'Contoh: Laundry Kiloan Berkah', deskripsi: 'Contoh: Cuci-setrika kiloan, ambil-antar gratis (data simulasi)', noWa: '', foto: null },
    { id: 'UMKM-03', namaProduk: 'Contoh: Snack Box Ibu-Ibu PKK', deskripsi: 'Contoh: Terima pesanan snack box untuk acara (data simulasi)', noWa: '', foto: null },
    { id: 'UMKM-04', namaProduk: 'Contoh: Bengkel Motor Pak Joko', deskripsi: 'Contoh: Servis & tambal ban, buka tiap hari (data simulasi)', noWa: '', foto: null },
  ]);
  const [formUmkmBaru, setFormUmkmBaru] = useState({ namaProduk: '', deskripsi: '', noWa: '', foto: null });
  const [editingUmkmId, setEditingUmkmId] = useState(null);

  // ==========================================
  // PERBAIKAN: nama Bendahara yang tampil & di-link ke Kuitansi Digital
  // -----------------------------------------------------------
  // SEBELUMNYA nama Bendahara di kuitansi diambil dari field teks terpisah
  // (cmsTeks.panitiaBendahara) yang sebenarnya bagian dari kartu "Struktur
  // Pengurus RW" di Beranda -> gampang salah/ketuker karena ada 2 tempat
  // input nama Bendahara (satu di Panitia RW, satu lagi di kartu foto
  // "Struktur Pengurus RT"), padahal yang benar-benar relevan untuk
  // kuitansi warga adalah Bendahara RT.
  // SEKARANG: nama Bendahara di kuitansi diambil OTOMATIS dari anggota
  // "Struktur Pengurus RT" (strukturRt, kartu yang ada fotonya) yang
  // jabatannya mengandung kata "Bendahara" (mis. Ahmad). Field
  // cmsTeks.panitiaBendahara tetap disimpan sebagai CADANGAN saja (fallback)
  // kalau belum ada anggota struktur RT berjabatan Bendahara.
  // ==========================================
  const getBendaharaRtNama = () => {
    const anggotaBendahara = strukturRt.find(d => (d.jabatan || '').toLowerCase().includes('bendahara'));
    return (anggotaBendahara && anggotaBendahara.nama) ? anggotaBendahara.nama : cmsTeks.panitiaBendahara;
  };

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
  const [editingRealisasiId, setEditingRealisasiId] = useState(null); // id baris Realisasi Belanja yang sedang diedit admin (null = mode tambah baru)
  const [previewLampiran, setPreviewLampiran] = useState(null); // { judul, url, namaFile, tipe: 'gambar'|'pdf' }

  // ==========================================
  // DAFTAR KATEGORI REALISASI BELANJA (BISA DIKELOLA ADMIN)
  // -----------------------------------------------------------
  // Sebelumnya daftar kategori (Kebersihan/Keamanan/dst) hardcode di dalam
  // <select>, sekarang disimpan sebagai state supaya admin bisa Tambah/Edit/
  // Hapus kategori sesuai kebutuhan RT lewat panel "Kelola Kategori Belanja".
  // ==========================================
  const [kategoriBelanjaList, setKategoriBelanjaList] = useState(['Kebersihan', 'Keamanan', 'Sosial', 'Operasional', 'Perbaikan Fasilitas', 'Lain-lain']);
  const [formKategoriBaru, setFormKategoriBaru] = useState('');
  const [editingKategoriIdx, setEditingKategoriIdx] = useState(null);
  const [formEditKategori, setFormEditKategori] = useState('');

  // DATA DUMMY TETAP (statis) khusus tampilan simulasi di Web Utama - TIDAK PERNAH
  // ikut sinkron ke Google Sheets, murni contoh gambaran bagi pengunjung.
  const DUMMY_REALISASI_SIMULASI = [
    { id: 'SIM-01', tanggal: '05 Jun 2026', kategori: 'Keamanan', keterangan: 'Contoh: Pembelian perlengkapan ronda malam (data simulasi)', nominal: 850000, kelompok: 'Simulasi', buktiUrl: null, buktiNamaFile: 'contoh_nota.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
    { id: 'SIM-02', tanggal: '12 Jun 2026', kategori: 'Kebersihan', keterangan: 'Contoh: Biaya angkut sampah lingkungan (data simulasi)', nominal: 350000, kelompok: 'Simulasi', buktiUrl: null, buktiNamaFile: 'contoh_nota2.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
    { id: 'SIM-03', tanggal: '15 Jun 2026', kategori: 'Sosial', keterangan: 'Contoh: Santunan warga & kegiatan sosial (data simulasi)', nominal: 320000, kelompok: 'Simulasi', buktiUrl: null, buktiNamaFile: 'contoh_nota3.jpg', dicatatOleh: 'Ahmad (Bendahara)' },
  ];

  // DATA DUMMY "BUKU KAS MASUK/KELUAR RT" KHUSUS SIMULASI - dipakai supaya
  // tabel Buku Kas juga bisa ditampilkan di menu "Laporan Belanja Kas RT"
  // versi akun Simulasi TANPA membocorkan angka kas RT yang ASLI. `saldoSetelah`
  // sudah dihitung manual berurutan (sama seperti getRiwayatKasRtDenganSaldo).
  const DUMMY_RIWAYAT_KAS_RT_SIMULASI = [
    { id: 'SIM-KRT-01', tanggal: '01 Jun 2026', keterangan: 'Contoh: Saldo awal kas RT periode berjalan (data simulasi)', jenis: 'Masuk', nominal: 17500000, saldoSetelah: 17500000 },
    { id: 'SIM-KRT-02', tanggal: '05 Jun 2026', keterangan: 'Contoh: Iuran bulanan warga terkumpul (data simulasi)', jenis: 'Masuk', nominal: 1350000, saldoSetelah: 18850000 },
    { id: 'SIM-KRT-03', tanggal: '05 Jun 2026', keterangan: 'Contoh: Pembelian perlengkapan pos ronda (data simulasi)', jenis: 'Keluar', nominal: 850000, saldoSetelah: 18000000 },
    { id: 'SIM-KRT-04', tanggal: '10 Jun 2026', keterangan: 'Contoh: Sewa mobil pick-up angkut sampah (data simulasi)', jenis: 'Keluar', nominal: 350000, saldoSetelah: 17650000 },
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

  // ==========================================
  // BULAN MULAI PERIODE (DISETTING ADMIN, TIDAK HARUS JANUARI)
  // -----------------------------------------------------------
  // Admin bisa mengatur tanggal mulai periode iuran lewat menu
  // "Manajemen Periode" (contoh: mulai Juli 2026 -> siklus 12 bulan
  // jadi Juli 2026 s/d Juni 2027, bukan wajib Jan-Des). Nilai ini
  // (1-12, 1=Januari) dipakai untuk menyusun urutan 12 bulan berjalan
  // di bawah (DAFTAR_BULAN) sehingga SELURUH akun (admin & warga)
  // otomatis mengikuti periode yang sama tanpa perlu diubah manual
  // satu per satu.
  // ==========================================
  const [periodeBulanMulai, setPeriodeBulanMulai] = useState(7); // default: Juli (mengikuti periode berjalan saat ini)

  // CONSTANT NAMA BULAN KALENDER (URUTAN TETAP JAN-DES, DIPAKAI UNTUK MENYUSUN DAFTAR_BULAN DI BAWAH)
  const NAMA_BULAN_KALENDER = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // DAFTAR_BULAN: 12 bulan BERJALAN sesuai periode yang diset admin (bukan selalu Jan-Des).
  // id 1-12 = urutan angsuran ke- dalam periode (dipertahankan supaya seluruh
  // kode lain yang sudah memakai bln.id / bln.nama tetap berjalan seperti biasa).
  // tahunOffset = 0 untuk bulan yang masih di tahun awal periode, 1 untuk bulan
  // yang sudah masuk tahun berikutnya (dipakai saat periode "menyeberang" tahun,
  // misal Juli 2026 - Juni 2027).
  const DAFTAR_BULAN = Array.from({ length: 12 }, (_, i) => {
    const bulanKalender = ((periodeBulanMulai - 1 + i) % 12) + 1;
    const tahunOffset = periodeBulanMulai - 1 + i >= 12 ? 1 : 0;
    return { id: i + 1, nama: NAMA_BULAN_KALENDER[bulanKalender - 1], bulanKalender, tahunOffset };
  });

  // ==========================================
  // DATA DUMMY KHUSUS SIMULASI "REKAP BLOK RUMAH" (TOTAL 50 KK)
  // -----------------------------------------------------------
  // PENTING - PERUBAHAN SESUAI PERMINTAAN: dataset 50 KK ini SEKARANG HANYA
  // dipakai saat isSimulatedSession === true (mode "🧪 Simulasi Akun
  // Pengguna" di Web Utama). TIDAK LAGI digabung ke `members`/database asli,
  // supaya akun user/admin yang BENAR-BENAR login tetap murni memakai data
  // ASLI dari Google Sheets (meski baru terisi sedikit atau masih kosong),
  // persis seperti pola yang sudah dipakai di menu "Informasi Warga",
  // "Anggota Keluarga", & "Laporan Belanja Kas RT" (lihat isSimulatedSession
  // di menu-menu tsb). Lihat pemakaiannya di bagian "REKAP BLOK RUMAH" di
  // bawah: anggotaSemuaUntukTampil = isSimulatedSession ? MEMBERS_DUMMY_REKAP_BLOK : members.
  // ==========================================
  const NAMA_BLOK_TAMBAHAN_FG = [
    ...Array.from({ length: 14 }, (_, i) => `Blok F${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `Blok G${i + 1}`),
  ];
  const NAMA_CONTOH_WARGA_FG = [
    'Budi Santoso', 'Dewi Kartika', 'Eko Prasetyo', 'Fitriani Handayani', 'Gunawan Wijaya', 'Hasan Basri',
    'Indah Permatasari', 'Joko Susilo', 'Kartini Wulandari', 'Lukman Hakim', 'Maya Sari', 'Nur Aini',
    'Oscar Pratama', 'Putri Ayu Lestari', 'Qori Fadillah', 'Rudi Hartono', 'Sri Wahyuni', 'Taufik Rahman',
    'Umi Kalsum', 'Vina Melati', 'Wahyu Nugroho', 'Xena Anindya', 'Yusuf Mahendra', 'Zahra Amelia',
  ];
  // TARGET JUMLAH KK PER BLOK (KHUSUS DATA DUMMY SIMULASI) - total = 50 KK,
  // dibagi ACAK (bukan pola tetap lagi) ke seluruh 22 blok (Blok A, Blok B,
  // F1-F14, G1-G6) memakai distribusiRandomKKPerBlok (seed tetap supaya
  // tidak berubah-ubah tiap render, tapi tetap terlihat acak/wajar - ada
  // blok yang ramai, ada yang masih 0/kosong, sama seperti RT sungguhan).
  const NAMA_SEMUA_BLOK_SIMULASI = ['Blok A', 'Blok B', ...NAMA_BLOK_TAMBAHAN_FG];
  const TARGET_KK_PER_BLOK_SIMULASI = distribusiRandomKKPerBlok(NAMA_SEMUA_BLOK_SIMULASI, 50, 42);
  // Susun daftar blok untuk tiap KK DUMMY yang perlu dibuat (nama blok
  // diulang sebanyak target KK-nya) - urutan ini juga dipakai sebagai idx
  // global supaya nama warga contoh & tanggal lahir anggota keluarga tetap
  // bervariasi antar KK.
  const DAFTAR_BLOK_UNTUK_KK_DUMMY = [];
  Object.keys(TARGET_KK_PER_BLOK_SIMULASI).forEach((namaBlok) => {
    for (let n = 0; n < TARGET_KK_PER_BLOK_SIMULASI[namaBlok]; n++) DAFTAR_BLOK_UNTUK_KK_DUMMY.push(namaBlok);
  });
  // DATASET UTAMA: 50 KK dummy, HANYA dipakai saat isSimulatedSession true.
  const MEMBERS_DUMMY_REKAP_BLOK = DAFTAR_BLOK_UNTUK_KK_DUMMY.map((namaBlok, idx) => {
    const namaDasar = NAMA_CONTOH_WARGA_FG[idx % NAMA_CONTOH_WARGA_FG.length];
    const kodeBlok = namaBlok.replace('Blok ', '');
    const namaKK = `${namaDasar} (${kodeBlok} - Simulasi)`;
    const jumlahAnak = idx % 3; // variasi 0-2 anak per KK contoh, supaya rekap usia bervariasi
    const anggotaKeluarga = [];
    if (idx % 2 === 0) {
      anggotaKeluarga.push({ id: `SIM-AK-${idx}-p`, nama: `Pasangan dari ${namaDasar}`, hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1988-05-10' });
    }
    if (idx % 9 === 0) {
      // sesekali tambahkan anggota lansia (60+) supaya kategori "Lansia" juga terisi di beberapa blok
      anggotaKeluarga.push({ id: `SIM-AK-${idx}-l`, nama: `Orang Tua dari ${namaDasar}`, hubungan: 'Mertua', jenisKelamin: idx % 2 === 0 ? 'Laki-laki' : 'Perempuan', tanggalLahir: '1958-03-20' });
    }
    for (let a = 0; a < jumlahAnak; a++) {
      const tahunLahir = 2008 + ((idx + a) % 18); // sebar rentang usia: balita s/d remaja
      anggotaKeluarga.push({ id: `SIM-AK-${idx}-a${a}`, nama: `Anak ke-${a + 1} ${namaDasar}`, hubungan: `Anak ke-${a + 1}`, jenisKelamin: a % 2 === 0 ? 'Laki-laki' : 'Perempuan', tanggalLahir: `${tahunLahir}-0${(a % 9) + 1}-15` });
    }
    return {
      id: `SIM-TR-${idx + 1}`,
      nama: namaKK,
      nomorRumah: `${namaBlok} No. ${(idx % 12) + 1}`,
      email: `${namaDasar.toLowerCase().replace(/\s+/g, '.')}${idx}@simulasi.mail.com`,
      wa: `0812${String(30000000 + idx * 1111).slice(-8)}`,
      alamat: `${namaBlok} No. ${(idx % 12) + 1}, Perum Bumi Indah Proklamasi, RT 40/RW 08`,
      target: 540000,
      bergabung: '01 Jul 2026',
      username: `simulasi${namaBlok.replace(/\s+/g, '').toLowerCase()}${idx}`,
      password: 'demo12345',
      statusAnggota: 'Aktif',
      kelompok: namaBlok,
      akses: 'user',
      statusRumah: idx % 2 === 0 ? 'Milik Sendiri' : 'Kontrak',
      pengurus: false,
      anggotaKeluarga,
    };
  });
  // DEFINISI BLOK (nama, jenis, kapasitas) F1-F14 & G1-G6 - ini TETAP masuk
  // ke `kelompokList` ASLI (bukan hanya simulasi), supaya blok-nya sendiri
  // sudah terdaftar & siap dipakai admin/warga real, hanya JUMLAH KK di
  // dalamnya yang masih 0 sampai ada pendaftar/​sinkron data asli.
  const kelompokTambahanBlokFG = NAMA_BLOK_TAMBAHAN_FG.map((namaBlok, idx) => ({
    id: `GRP-FG-${idx + 1}`,
    nama: namaBlok,
    jenis: 'Rumah',
    kapasitas: 50,
    noPengajuan: `${String(idx + 3).padStart(3, '0')}/VII/2026`,
    status: 'Progress',
    tglDibuat: '15 Jul 2026',
  }));
  // DAFTAR BLOK KHUSUS SIMULASI (BERDIRI SENDIRI, TIDAK IKUT `kelompokList`).
  // -----------------------------------------------------------
  // PENTING: `kelompokList` (state) SELALU ditimpa otomatis oleh data ASLI
  // dari Google Sheets begitu Sheets terhubung (lihat useEffect fetch di
  // atas: setKelompokList dipanggil tanpa syarat kosong/tidaknya array).
  // Karena itu daftar blok untuk tampilan SIMULASI tidak boleh ikut memakai
  // `kelompokList` - harus daftar sendiri (tetap 22 blok: Blok A, Blok B,
  // F1-F14, G1-G6) supaya kartu "Rekap Blok Rumah" versi simulasi selalu
  // lengkap 22 blok, tidak ikut berubah/berkurang mengikuti isi Sheet asli.
  // ==========================================
  const KELOMPOK_DUMMY_REKAP_BLOK = [
    { id: 'SIM-GRP-A', nama: 'Blok A', jenis: 'Rumah', kapasitas: 50, status: 'Progress', tglDibuat: '11 Jul 2026' },
    { id: 'SIM-GRP-B', nama: 'Blok B', jenis: 'Rumah', kapasitas: 50, status: 'Progress', tglDibuat: '11 Jul 2026' },
    ...kelompokTambahanBlokFG,
  ];
  // Diambil 2 contoh (1 dari Blok F manapun, 1 dari Blok G manapun) dari
  // dataset DUMMY di atas supaya tombol "Simulasi Akun Pengguna" di Web
  // Utama juga bisa langsung memperlihatkan tampilan Dashboard & Rekap Blok
  // Rumah untuk warga di Blok F/G, bukan cuma Blok A/B - murni untuk
  // pratinjau, TIDAK terhubung ke database `members` asli.
  // PENTING - PERBAIKAN BUG: dulu SENGAJA hardcode cari 'Blok F1' & 'Blok G1'
  // persis, tapi sekarang jumlah KK per blok dibagi ACAK (lihat
  // distribusiRandomKKPerBlok) sehingga blok F1/G1 BISA SAJA kebagian 0 KK -
  // .find() jadi balik `undefined` & bikin error "Cannot read properties of
  // undefined" saat dipakai di .map() (menu Simulasi landing page). Sekarang
  // dicari BLOK F/G MANAPUN yang benar-benar ada KK-nya (bukan cuma F1/G1
  // persis), plus fallback terakhir ke KK dummy pertama supaya TIDAK PERNAH
  // `undefined` walau seed acaknya kebetulan bikin semua Blok F/G kosong.
  const contohBlokF = MEMBERS_DUMMY_REKAP_BLOK.find(m => m.kelompok.startsWith('Blok F')) || MEMBERS_DUMMY_REKAP_BLOK[0];
  const contohBlokG = MEMBERS_DUMMY_REKAP_BLOK.find(m => m.kelompok.startsWith('Blok G')) || MEMBERS_DUMMY_REKAP_BLOK[0];
  const CONTOH_SIMULASI_TAMBAHAN_FG = [contohBlokF, contohBlokG].filter(Boolean);

  // ==========================================
  // 2. DATABASE MASTER ANGGOTA
  // -----------------------------------------------------------
  // HANYA berisi akun contoh untuk TESTING LOGIN REAL (Hidayat/Ahmad/Siti).
  // SENGAJA TIDAK digabung dengan data dummy 50 KK di atas, supaya akun
  // user/admin yang benar-benar login tetap memakai data ASLI (dari Google
  // Sheets begitu tersambung), bukan data contoh/simulasi.
  // ==========================================
  const [members, setMembers] = useState([
    { id: 'TR-01', nama: 'Hidayat', nomorRumah: 'Blok A No. 5', email: 'hidayat@mail.com', wa: '081234567890', alamat: 'Blok A No. 5, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '10 Jan 2026', username: 'hidayat123', password: 'password123', statusAnggota: 'Aktif', kelompok: 'Blok A', akses: 'admin', statusRumah: 'Milik Sendiri', pengurus: false, anggotaKeluarga: [
      { id: 'AK-01', nama: 'Ratna Sari', hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1990-04-12' },
      { id: 'AK-02', nama: 'Aditya Hidayat', hubungan: 'Anak ke-1', jenisKelamin: 'Laki-laki', tanggalLahir: '2015-08-20' },
    ] },
    { id: 'TR-02', nama: 'Ahmad Fauzi', nomorRumah: 'Blok A No. 8', email: 'fauzi@mail.com', wa: '082211112222', alamat: 'Blok A No. 8, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '12 Jan 2026', username: 'ahmadfauzi', password: 'password456', statusAnggota: 'Aktif', kelompok: 'Blok A', akses: 'user', statusRumah: 'Kontrak', pengurus: false, anggotaKeluarga: [
      { id: 'AK-03', nama: 'Dewi Lestari', hubungan: 'Istri', jenisKelamin: 'Perempuan', tanggalLahir: '1993-11-02' },
    ] },
    { id: 'TR-03', nama: 'Siti Aminah', nomorRumah: 'Blok B No. 3', email: 'siti@mail.com', wa: '085799998888', alamat: 'Blok B No. 3, Perum Bumi Indah Proklamasi, RT 40/RW 08', target: 540000, bergabung: '15 Jan 2026', username: 'sitiaminah', password: 'password789', statusAnggota: 'Pasif', kelompok: 'Blok B', akses: 'user', statusRumah: 'Milik Sendiri', pengurus: false, anggotaKeluarga: [] },
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

  // DATA DUMMY "TERBARU BERDASARKAN DAFTAR PORTAL RT 40" & "WARGA KELUAR"
  // -----------------------------------------------------------
  // Khusus untuk SIMULASI AKUN (isSimulatedSession) di menu Informasi Warga,
  // supaya pengunjung yang mencoba simulasi TIDAK melihat data warga ASLI
  // (nama & alamat sesungguhnya), melainkan contoh/dummy saja (1-5 data).
  const WARGA_TERBARU_DUMMY = [
    { id: 'SIM-WB-01', nama: 'Contoh Warga Baru 1 (Simulasi)', nomorRumah: 'Blok A No. 1', bergabung: '2026-07-20' },
    { id: 'SIM-WB-02', nama: 'Contoh Warga Baru 2 (Simulasi)', nomorRumah: 'Blok B No. 4', bergabung: '2026-07-14' },
    { id: 'SIM-WB-03', nama: 'Contoh Warga Baru 3 (Simulasi)', nomorRumah: 'Blok F5 No. 2', bergabung: '2026-07-05' },
  ];
  const WARGA_KELUAR_DUMMY = [
    { id: 'SIM-WK-01', nama: 'Contoh Warga Keluar 1 (Simulasi)', blok: 'Blok F2 No. 9', tanggalKeluar: '2026-06-18' },
    { id: 'SIM-WK-02', nama: 'Contoh Warga Keluar 2 (Simulasi)', blok: 'Blok G3 No. 6', tanggalKeluar: '2026-05-30' },
  ];

  // ==========================================
  // DATA DUMMY "INFORMASI WARGA" KHUSUS SIMULASI (50 KK)
  // -----------------------------------------------------------
  // Khusus untuk SIMULASI AKUN (isSimulatedSession), seluruh angka & grafik
  // di menu "Informasi Warga" (Total KK, Total Jiwa, Laki-laki, Perempuan,
  // Berdasarkan Usia, Status Rumah, Status Keanggotaan, Distribusi per Blok)
  // memakai CONTOH/dummy tetap (bukan data warga asli), supaya pengunjung
  // yang mencoba tombol Simulasi tidak melihat data pribadi warga sungguhan.
  // Akun yang benar-benar login (hasil pendaftaran & aktivasi admin) TETAP
  // memakai data ASLI dari `members` (lihat isSimulatedSession di bawah).
  // PENTING: sengaja memakai `DAFTAR_BLOK_UNTUK_KK_DUMMY` yang SAMA dengan
  // dataset "Rekap Blok Rumah" di atas (bukan daftar blok terpisah lagi),
  // supaya distribusi 50 KK acak per blok KONSISTEN di semua halaman
  // simulasi (Informasi Warga, Rekap Blok Rumah, dsb - bukan angka lain-lain).
  // ==========================================
  const INFORMASI_WARGA_DUMMY = Array.from({ length: 50 }, (_, idx) => {
    const namaKK = `Contoh Warga ${idx + 1} (Simulasi)`;
    const blokIni = DAFTAR_BLOK_UNTUK_KK_DUMMY[idx % DAFTAR_BLOK_UNTUK_KK_DUMMY.length];
    const jumlahAnak = idx % 3; // variasi 0-2 anak per KK, supaya Berdasarkan Usia bervariasi
    const anggotaKeluarga = [];
    if (idx % 2 === 0) {
      anggotaKeluarga.push({ id: `IWD-${idx}-p`, nama: `Pasangan ${namaKK}`, hubungan: 'Istri', jenisKelamin: idx % 4 === 0 ? 'Laki-laki' : 'Perempuan', tanggalLahir: '1988-05-10' });
    }
    for (let a = 0; a < jumlahAnak; a++) {
      const tahunLahir = 2006 + ((idx + a) % 20); // sebar rentang usia: balita s/d dewasa muda
      anggotaKeluarga.push({ id: `IWD-${idx}-a${a}`, nama: `Anak ke-${a + 1} ${namaKK}`, hubungan: `Anak ke-${a + 1}`, jenisKelamin: a % 2 === 0 ? 'Laki-laki' : 'Perempuan', tanggalLahir: `${tahunLahir}-0${(a % 9) + 1}-15` });
    }
    return {
      id: `IWD-${idx + 1}`,
      nama: namaKK,
      nomorRumah: `${blokIni} No. ${(idx % 12) + 1}`,
      kelompok: blokIni,
      statusAnggota: idx % 9 === 0 ? 'Pasif' : 'Aktif',
      statusRumah: idx % 3 === 0 ? 'Kontrak' : 'Milik Sendiri',
      anggotaKeluarga,
    };
  });
  const KELOMPOK_DUMMY_INFORMASI_WARGA = NAMA_SEMUA_BLOK_SIMULASI.map((nama, idx) => ({ id: `GRP-SIM-IW-${idx + 1}`, nama, jenis: 'Rumah' }));

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
  // expandedRekapAnggotaId: id anggota yang sedang dibuka "Rincian"-nya di
  // tabel "Rekap Per Anggota (Monitoring)" - menampilkan histori 12 bulan
  // periode berjalan yang masih belum lunas/open untuk anggota tsb.
  const [expandedRekapAnggotaId, setExpandedRekapAnggotaId] = useState(null);
  // PENCARIAN & SORT untuk tabel "Rekap Per Anggota (Monitoring)":
  // - cariRekapAnggota: ketik nama ATAU nomor rumah/blok (mis. "F3", "no 20",
  //   "dollar") untuk menyaring baris yang tampil, real-time tanpa perlu klik apa pun.
  // - sortRekapAnggotaBlok: kalau true, tabel diurutkan RAPI per Blok (F3 No.
  //   1, F3 No. 2, ..., F4 No. 1, dst - urut alfabet blok dulu lalu urut
  //   ANGKA nomor rumahnya, bukan urut teks biasa supaya "No. 2" tidak
  //   nyasar setelah "No. 19").
  const [cariRekapAnggota, setCariRekapAnggota] = useState('');
  const [sortRekapAnggotaBlok, setSortRekapAnggotaBlok] = useState(false);
  // FILTER BULAN DI DASHBOARD UTAMA (ADMIN) - 'Semua' (default) = kartu Total
  // Kas Global & Sisa Tagihan tetap tampil akumulasi sepanjang periode
  // berjalan seperti biasa. Kalau admin pilih bulan tertentu (mis. id=1 utk
  // bulan pertama periode), dua kartu itu HANYA menghitung bulan tsb, dan
  // muncul daftar KK yang belum lunas di bulan itu (termasuk tunggakan
  // bulan-bulan sebelumnya di periode berjalan yang masih nyangkut).
  const [adminFilterBulanDashboard, setAdminFilterBulanDashboard] = useState('Semua');

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
  // sedangMuatDataAwal: TRUE selama proses tarik data PERTAMA KALI dari
  // Google Sheets masih berjalan (bukan refresh diam-diam di latar
  // belakang). Dipakai untuk menampilkan overlay "masih dalam proses" yang
  // menahan klik apapun di website sampai proses ini beres, supaya warga
  // tidak salah pencet/salah kira web error padahal cuma masih menarik data.
  const [sedangMuatDataAwal, setSedangMuatDataAwal] = useState(true);
  // true kalau Google Sheets sudah mengirim data ANGGOTA ASLI (dataAnggota tidak
  // kosong) - dipakai untuk otomatis menyembunyikan tombol "Simulasi Akun
  // Pengguna" di Web Utama begitu website sudah punya data warga sungguhan,
  // supaya pengunjung tidak lagi disuguhi contoh/dummy setelah RT aktif pakai data asli.
  const [dataWargaAsliSudahMasuk, setDataWargaAsliSudahMasuk] = useState(false);
  const [sheetTesting, setSheetTesting] = useState(false);

  // PERBAIKAN CACHE: request GET ke Apps Script (?action=getXxx) rawan di-cache
  // oleh browser/HP (apalagi di HP, browser sering menyimpan hasil fetch GET
  // yang persis sama supaya hemat data) -> akibatnya data yang tampil kadang
  // masih versi LAMA walau Sheet-nya sudah di-update. Untuk request GET,
  // ditambahkan parameter waktu unik (_ts) di setiap panggilan + cache:'no-store',
  // supaya browser SELALU mengambil jawaban baru dari server, bukan dari cache.
  const sheetFetch = async (url, options) => {
    const metodeGet = !options || !options.method || options.method === 'GET';
    const urlFinal = metodeGet
      ? `${url}${url.includes('?') ? '&' : '?'}secret=${encodeURIComponent(APP_SECRET)}&_ts=${Date.now()}`
      : url;
    const optionsFinal = { ...(options || {}), cache: 'no-store' };
    if (!metodeGet && optionsFinal.body) {
      const bodyObj = JSON.parse(optionsFinal.body);
      optionsFinal.body = JSON.stringify({ ...bodyObj, secret: APP_SECRET });
    }
    const res = await fetch(urlFinal, optionsFinal);
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error('Respons Apps Script bukan JSON yang valid. Pastikan URL & secret benar, dan deployment "Anyone can access".'); }
  };

  // Jeda sederhana (dalam milidetik) - dipakai untuk auto-retry saat server
  // (Google Apps Script) sedang sibuk/terkunci proses lain (lihat
  // sheetFetchDenganRetryLock di bawah).
  const tunggu = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ==========================================
  // PEMBUNGKUS sheetFetch DENGAN AUTO-RETRY KHUSUS UNTUK ERROR "KUNCI"
  // -----------------------------------------------------------
  // Backend (Google Apps Script) memakai LockService supaya perubahan yang
  // menyentuh baris yang sama (mis. ganti password/reset password) tidak
  // saling tabrakan. Kalau ada 2+ permintaan datang HAMPIR bersamaan (mis.
  // beberapa warga sama-sama sedang aktif, atau auto-refresh & aksi admin
  // kebetulan tumpang tindih), salah satu permintaan bisa gagal dengan
  // pesan "Batas waktu penguncian habis: proses lain menahan kunci terlalu
  // lama" - ini SEMENTARA (bukan rusak), begitu proses lain selesai
  // (biasanya dalam hitungan detik), request yang sama biasanya langsung
  // berhasil kalau dicoba ulang. Daripada warga harus klik manual lagi,
  // fungsi ini otomatis MENCOBA ULANG beberapa kali dengan jeda singkat
  // sebelum benar-benar menyerah & menampilkan pesan gagal ke warga.
  // ==========================================
  const sheetFetchDenganRetryLock = async (url, options, opts = {}) => {
    const maxPercobaan = opts.maxPercobaan || 3;
    const jedaMs = opts.jedaMs || 1500;
    const onRetry = opts.onRetry; // dipanggil sebelum tiap percobaan ulang, dengan nomor percobaan
    let percobaanKe = 1;
    while (true) {
      const hasil = await sheetFetch(url, options);
      const pesanError = hasil && hasil.error ? String(hasil.error) : '';
      const iniErrorKunci = /kunci|lock/i.test(pesanError);
      if (!iniErrorKunci || percobaanKe >= maxPercobaan) {
        return hasil;
      }
      if (onRetry) onRetry(percobaanKe + 1, maxPercobaan);
      await tunggu(jedaMs * percobaanKe); // jeda makin lama tiap percobaan (1.5s, 3s, ...)
      percobaanKe += 1;
    }
  };

  // ==========================================
  // PERBAIKAN BUG: "data (foto) struktur RT tidak tersimpan padahal sudah
  // diupdate" - PENYEBAB: aplikasi ini auto-refresh data dari Google Sheet
  // secara diam-diam setiap kali tab/app ini kembali aktif (lihat useEffect
  // visibilitychange di bawah). Kalau proses SIMPAN (syncSheet, mis. saat
  // admin klik "Simpan Perubahan" foto struktur RT) BELUM SELESAI ketika
  // auto-refresh itu jalan, hasil GET yang masih data LAMA (proses simpan
  // ke Sheet belum "nyantol") bisa balik menimpa state lokal yang baru
  // saja diperbarui -> foto/nama yang baru diedit terlihat hilang/balik ke
  // versi lama, padahal sebenarnya cuma masalah waktu (race condition),
  // bukan gagal tersimpan. Ini terutama sering kejadian di HP: membuka
  // dialog "Choose File"/kamera, lalu kembali ke aplikasi, otomatis memicu
  // event focus/visibilitychange tepat saat proses simpan sedang berjalan.
  //
  // SOLUSI: hitung berapa banyak proses syncSheet yang sedang berjalan
  // (pendingSyncCountRef). Selama masih ada proses simpan yang berjalan,
  // auto-refresh diam-diam (sunyi=true) DITUNDA/DILEWATI dulu, supaya tidak
  // menimpa balik data yang baru saja disimpan.
  // ==========================================
  const pendingSyncCountRef = useRef(0);

  // PERBAIKAN BUG "warga baru/perubahan tiba-tiba hilang ketimpa balik"
  // (mis. akun Turitno hilang dari list Member, atau password hasil Reset
  // Password Riswan ketimpa balik ke versi lama):
  // -----------------------------------------------------------
  // AKAR MASALAH TERAKHIR yang tersisa: walau data di STATE REACT sudah
  // benar (lihat perbaikan `prev =>` di updateMembers & seluruh
  // pemanggilnya), setiap aksi admin tetap memicu 1 request POST terpisah
  // ke Google Apps Script yang MENIMPA TOTAL (overwrite penuh) isi sheet
  // terkait. Kalau admin melakukan 2 aksi berturut-turut dengan CEPAT
  // (mis. approve/aktivasi warga A, lalu detik berikutnya reset password
  // warga B), 2 request POST itu dikirim hampir bersamaan lewat jaringan -
  // TIDAK ADA JAMINAN keduanya tiba & diproses di server SESUAI URUTAN
  // dikirim. Kalau request YANG LEBIH LAMA datanya (belum termasuk
  // perubahan terbaru) kebetulan tiba BELAKANGAN di server, ia akan
  // MENIMPA BALIK hasil request yang lebih baru - persis gejala "warga
  // baru tiba-tiba hilang" / "password hasil reset balik ke versi lama".
  // SOLUSI: antrekan (queue) request POST PER NAMA SHEET, supaya request
  // berikutnya untuk sheet yang sama BARU dikirim setelah request
  // sebelumnya benar-benar selesai diproses server - menjamin urutan
  // sampai di server SAMA PERSIS dengan urutan aksi admin di layar.
  const antreanSyncRef = useRef({});
  const syncSheet = (sheetName, data, urlOverride) => {
    const urlTujuan = urlOverride || cmsTeks.appsScriptUrl;
    if (!urlTujuan) return Promise.resolve();

    const kirimSatuRequest = async () => {
      pendingSyncCountRef.current += 1;
      try {
        setSheetStatus('loading');
        await sheetFetch(urlTujuan, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight di Apps Script
          body: JSON.stringify({ sheet: sheetName, data })
        });
        setSheetStatus('synced');
      } catch (err) {
        console.error(err);
        setSheetStatus('error');
        showToast(`Gagal sinkron ke Google Sheets: ${err.message}`, 'error');
      } finally {
        pendingSyncCountRef.current = Math.max(0, pendingSyncCountRef.current - 1);
      }
    };

    // Sambungkan ke antrean PER SHEET (bukan 1 antrean global) - supaya
    // sinkron sheet "Anggota" & "Kegiatan" mis. tidak perlu saling menunggu
    // satu sama lain, tapi 2 sinkron "Anggota" berturut-turut TETAP
    // berurutan. `.catch(() => {})` di rantai supaya 1 request gagal tidak
    // menghentikan antrean permanen untuk request-request berikutnya.
    const antreanSebelumnya = antreanSyncRef.current[sheetName] || Promise.resolve();
    const antreanBaru = antreanSebelumnya.catch(() => {}).then(kirimSatuRequest);
    antreanSyncRef.current[sheetName] = antreanBaru;
    return antreanBaru;
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
  // Wrapper sinkronisasi khusus tunggakan (tagihan belum lunas lintas
  // periode) -> tersimpan di sheet "Tunggakan" (dibuat otomatis oleh Apps
  // Script bila belum ada, mengikuti pola sheet lain di aplikasi ini).
  const updateTunggakan = (updater) => {
    setTunggakanList(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('Tunggakan', next);
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
  const updateUmkm = (updater) => {
    setUmkmList(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncSheet('UMKM', next);
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

  // ==========================================
  // HELPER: COCOKKAN NAMA BLOK SECARA TOLERAN (trim spasi + tanpa
  // membedakan huruf besar/kecil).
  // -----------------------------------------------------------
  // SEBELUMNYA pencocokan blok (mis. anggota vs kartu blok, atau akun warga
  // vs kartu "Blok Rumah Mu") pakai perbandingan string PERSIS (===).
  // Akibatnya kalau ada sedikit saja perbedaan penulisan di Google Sheets
  // (misalnya kolom "kelompok" warga tertulis "blok a" / "Blok A " ada
  // spasi tambahan, sedangkan nama blok di sheet Kelompok tertulis
  // "Blok A"), datanya dianggap BEDA TOTAL - jumlah KK/Jiwa jadi 0 & kartu
  // "Blok Rumah Mu" (highlight navy) tidak pernah muncul, padahal secara
  // kasat mata sama. Sekarang dicocokkan lebih toleran: dibersihkan spasi
  // di ujung teks & diabaikan besar/kecil huruf, supaya perbedaan
  // pengetikan kecil di Sheets tidak bikin data "hilang".
  // ==========================================
  const cocokBlok = (a, b) => {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  };

  // ==========================================
  // URUTAN "PER BLOK" YANG RAPI (F3 No. 1, F3 No. 2, ..., F3 No. 19, F3
  // No. 20, lalu F4 No. 1, dst) UNTUK TABEL REKAP PER ANGGOTA (MONITORING)
  // -----------------------------------------------------------
  // Kalau nomorRumah cuma diurutkan sebagai TEKS biasa (localeCompare/sort
  // alfabet), hasilnya salah: "F3 No. 19" akan muncul SEBELUM "F3 No. 2"
  // (karena karakter '1' < '2' secara teks), padahal Blok F3 No. 2 mestinya
  // duluan. Fungsi ini memecah nomorRumah jadi 3 bagian yang dibandingkan
  // terpisah: (1) nama blok [huruf+angka blok, mis. "F3"/"G4"] diurutkan
  // alfabet, (2) nomor rumah [angka setelah "No."] diurutkan sebagai ANGKA
  // (bukan teks), supaya urutannya benar-benar 1, 2, 3, ... 19, 20 dst.
  // Data yang formatnya tidak sesuai pola "Blok X No. Y" (mis. data lama/
  // custom) tetap aman, otomatis ditaruh paling akhir memakai teks asli.
  // ==========================================
  const parseKunciUrutBlok = (nomorRumah) => {
    const teks = String(nomorRumah || '').trim();
    const cocok = teks.match(/blok\s+([a-z]+)\s*(\d*)\s*no\.?\s*(\d+)/i);
    if (!cocok) return { valid: false, blokHuruf: '', blokAngka: 0, nomor: 0, asli: teks };
    return {
      valid: true,
      blokHuruf: cocok[1].toUpperCase(),
      blokAngka: cocok[2] ? parseInt(cocok[2], 10) : 0,
      nomor: parseInt(cocok[3], 10) || 0,
      asli: teks,
    };
  };
  const bandingkanUrutBlok = (nomorA, nomorB) => {
    const a = parseKunciUrutBlok(nomorA);
    const b = parseKunciUrutBlok(nomorB);
    // Data yang formatnya tidak dikenali ditaruh paling belakang.
    if (a.valid !== b.valid) return a.valid ? -1 : 1;
    if (!a.valid && !b.valid) return a.asli.localeCompare(b.asli);
    if (a.blokHuruf !== b.blokHuruf) return a.blokHuruf.localeCompare(b.blokHuruf);
    if (a.blokAngka !== b.blokAngka) return a.blokAngka - b.blokAngka;
    return a.nomor - b.nomor;
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

  // ==========================================
  // PERBAIKAN: proses ambil-semua-data dijadikan FUNGSI (bukan cuma isi
  // useEffect sekali jalan), supaya bisa dipanggil ULANG kapan pun -
  // terutama saat user berpindah kembali ke tab/app ini (lihat useEffect
  // visibilitychange di bawah). Sebelumnya data cuma diambil SEKALI saat
  // aplikasi pertama dibuka, jadi kalau ada perubahan di Sheet (oleh admin
  // lain / dari HP lain) sementara tab ini tetap terbuka, perubahan itu
  // TIDAK PERNAH terlihat sampai halaman di-reload penuh secara manual.
  // Parameter `sunyi=true` dipakai untuk refresh di latar belakang supaya
  // tidak memunculkan toast "berhasil dimuat" berulang-ulang tiap kali
  // user pindah-pindah tab.
  // ==========================================
  const muatSemuaDataDariSheet = async (sunyi = false) => {
    if (!cmsTeks.appsScriptUrl) { setSedangMuatDataAwal(false); return; }
    // PERBAIKAN BUG (lihat catatan di pendingSyncCountRef/syncSheet di atas):
    // kalau ini refresh DIAM-DIAM (dipicu balik ke tab/app, bukan klik manual
    // tombol "Refresh Data") DAN masih ada proses simpan (syncSheet) yang
    // sedang berjalan, LEWATI dulu refresh ini. Kalau tidak, data LAMA hasil
    // GET bisa menimpa balik perubahan (mis. foto struktur RT) yang baru saja
    // disimpan admin tapi belum sempat "nyantol" di Google Sheet.
    if (sunyi && pendingSyncCountRef.current > 0) return;
    setSheetStatus('loading');
    try {
      // PERBAIKAN RELIABILITY: sebelumnya di sini ada 15 request GET paralel
      // (Promise.all) setiap kali halaman dibuka -> di koneksi HP yang lambat
      // ini rawan gagal sebagian/timeout, dan hasilnya beda-beda tiap device.
      // Sekarang cukup 1 request ke action "getAll" yang menggabungkan semua
      // sheet sekaligus di sisi server (lihat Code.gs), jauh lebih tahan
      // terhadap koneksi tidak stabil.
      const semua = await sheetFetch(`${cmsTeks.appsScriptUrl}?action=getAll`);
      if (semua && semua.error) throw new Error(semua.error);

      // PERBAIKAN BUG "kadang item yang sudah di-approve/aktivasi muncul lagi
      // seolah belum diproses" (Pending Iuran, Member Baru, dsb):
      // -----------------------------------------------------------
      // Pengecekan `pendingSyncCountRef` di ATAS (sebelum request GET ini
      // dikirim) TERNYATA tidak cukup - ada celah waktu: kalau ADMIN KLIK
      // "Setujui/Aktivasi" TEPAT SAAT request GET diam-diam ini SEDANG
      // BERJALAN (request GET sudah terlanjur dikirim SEBELUM klik admin),
      // maka begitu GET ini selesai, ia akan membawa data LAMA (dari SEBELUM
      // proses persetujuan) dan MENIMPA BALIK state lokal yang baru saja
      // diperbarui - membuat item yang sudah disetujui "muncul lagi" seolah
      // masih pending, padahal sebenarnya sudah tersimpan benar di server.
      // PERBAIKAN: cek ULANG di sini (SETELAH GET selesai, SEBELUM data
      // diterapkan) - kalau ternyata ADA proses simpan yang baru mulai
      // SELAMA GET ini berjalan, BATALKAN penerapan data (basi), biarkan
      // auto-refresh berikutnya yang mengambil data paling baru.
      if (sunyi && pendingSyncCountRef.current > 0) {
        setSedangMuatDataAwal(false);
        return;
      }

      const dataAnggota = semua.members || [];
      const dataIuran = semua.iuran || [];
      const dataKegiatan = semua.kegiatan || [];
      const dataKelompok = semua.kelompok || [];
      const dataPengajuan = semua.pengajuan || [];
      const dataStruktur = semua.strukturRT || [];
      const dataUmkm = semua.umkm || [];
      const dataPengaturan = semua.pengaturan || [];
      const dataPeriode = semua.periode || [];
      const dataRiwayatPeriode = semua.riwayatPeriode || [];
      const dataRiwayatKasRt = semua.riwayatKasRt || [];
      const dataRealisasi = semua.realisasiBelanja || [];
      const dataAgendaUtama = semua.agendaUtama || [];
      const dataNotifikasi = semua.notifikasi || [];
      const dataWargaKeluar = semua.wargaKeluar || [];
      const dataTunggakan = semua.tunggakan || [];

      if (Array.isArray(dataAnggota) && dataAnggota.length) {
        setMembers(dataAnggota.map(m => ({ ...m, target: Number(m.target) || 0, anggotaKeluarga: parseAnggotaKeluarga(m.anggotaKeluarga) })));
        setDataWargaAsliSudahMasuk(true);
      }
      if (Array.isArray(dataIuran)) {
        setIuranMatrix(dataIuran.map(i => ({ ...i, bulanId: Number(i.bulanId) || 0, nominal: Number(i.nominal) || 0 })));
      }
      // (lihat catatan perbaikan bug yang sama di dataStruktur di bawah) -
      // dataKegiatan & dataKelompok juga dikelola admin lewat tambah/hapus,
      // jadi kalau memang dikosongkan total di Sheet, tampilan harus ikut kosong.
      if (Array.isArray(dataKegiatan)) setKegiatanList(dataKegiatan.map(k => ({ ...k, foto: toDirectImageUrl(k.foto), jam: sanitizeJamAgenda(k.jam) })));
      if (Array.isArray(dataKelompok)) setKelompokList(dataKelompok.map(k => ({ ...k, kapasitas: Number(k.kapasitas) || 0 })));
      if (Array.isArray(dataPengajuan)) setPengajuanBaru(dataPengajuan.map(p => ({ ...p, target: Number(p.target) || 0, anggotaKeluarga: parseAnggotaKeluarga(p.anggotaKeluarga) })));
      // PERBAIKAN BUG: sebelumnya pakai syarat "dataStruktur.length" (harus ada
      // isinya) sebelum mau meng-update strukturRt. Akibatnya kalau Admin
      // menghapus SEMUA baris di sheet "StrukturRT" langsung dari Google
      // Sheets (jadi hasil GET-nya array kosong []), aplikasi TIDAK PERNAH
      // mengosongkan strukturRt di memori -> data lama/dummy tetap nyangkut
      // di state, dan setiap kali admin tambah anggota baru lewat form,
      // data lama itu ikut ter-sync ulang (atau kalau state browser belum
      // sempat sinkron sama sekali, entri baru terasa "tidak masuk" karena
      // ketimpa balik oleh state lama saat auto-refresh). Sekarang SELALU
      // ikuti apa pun isi sheet (termasuk kalau memang kosong).
      if (Array.isArray(dataStruktur)) setStrukturRt(dataStruktur.map(d => ({ ...d, foto: toDirectImageUrl(d.foto) })));
      // Galeri UMKM RT - sama seperti strukturRt, kalau memang isi sheet
      // "UMKM" kosong (Admin belum pernah isi / sudah dihapus semua), ikuti
      // apa adanya supaya tidak nyangkut data dummy contoh terus-menerus.
      if (Array.isArray(dataUmkm) && dataUmkm.length) setUmkmList(dataUmkm.map(u => ({ ...u, foto: toDirectImageUrl(u.foto) })));
      if (Array.isArray(dataPeriode) && dataPeriode.length) setPeriodeAktif(dataPeriode[0]);
      if (Array.isArray(dataRiwayatPeriode)) setRiwayatPeriode(dataRiwayatPeriode);
      if (Array.isArray(dataRiwayatKasRt) && dataRiwayatKasRt.length) setRiwayatKasRt(dataRiwayatKasRt.map(t => ({ ...t, nominal: Number(t.nominal) || 0 })));
      if (Array.isArray(dataRealisasi)) setRealisasiBelanja(dataRealisasi.map(r => ({ ...r, nominal: Number(r.nominal) || 0 })));
      if (Array.isArray(dataAgendaUtama) && dataAgendaUtama.length) {
        // PERBAIKAN BUG "JAM 1899-12-30": nilai "jam" yang datang mentah dari
        // Google Sheets dibersihkan dulu dengan sanitizeJamAgenda() SEBELUM
        // dipakai mengisi formAgendaUtama. Sebelumnya cuma tampilan baca
        // (formatAgendaLengkap) yang dibersihkan, sedangkan form EDIT-nya
        // langsung menampilkan nilai mentah dari Sheet -> makanya kotak input
        // "Jam" di form Kelola Agenda sempat kelihatan "1899-12-30".
        const agendaNormal = { ...dataAgendaUtama[0], foto: toDirectImageUrl(dataAgendaUtama[0].foto), jam: sanitizeJamAgenda(dataAgendaUtama[0].jam) };
        setAgendaUtama(agendaNormal);
        setFormAgendaUtama(agendaNormal);
      }
      if (Array.isArray(dataNotifikasi)) setNotifikasiList(dataNotifikasi);
      if (Array.isArray(dataWargaKeluar)) setWargaKeluarList(dataWargaKeluar);
      if (Array.isArray(dataTunggakan)) setTunggakanList(dataTunggakan.map(t => ({ ...t, bulanId: Number(t.bulanId) || 0, nominal: Number(t.nominal) || 0, tahunAsal: Number(t.tahunAsal) || t.tahunAsal })));
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
          daftarBlokRumahList: settingsRow.daftarBlokRumahList ? String(settingsRow.daftarBlokRumahList).split('|').filter(Boolean) : prev.daftarBlokRumahList,
          daftarNomorRumahList: settingsRow.daftarNomorRumahList ? String(settingsRow.daftarNomorRumahList).split('|').filter(Boolean) : prev.daftarNomorRumahList,
        }));
      }
      setSheetStatus('synced');
      if (!sunyi) showToast('Proses Completed.');
    } catch (err) {
      console.error(err);
      setSheetStatus('error');
      if (!sunyi) showToast(`Gagal memuat dari Google Sheets: ${err.message}`, 'error');
    } finally {
      // Begitu proses tarik data (apa pun hasilnya, berhasil/gagal) SELESAI,
      // overlay "masih dalam proses" otomatis hilang & website bisa diklik
      // normal. Aman dipanggil berkali-kali (refresh diam-diam di latar
      // belakang) karena state ini sudah false sejak load pertama beres.
      setSedangMuatDataAwal(false);
    }
  };

  // Ambil data dari Google Sheet saat aplikasi dibuka / saat URL Apps Script diisi & disimpan.
  useEffect(() => {
    if (!cmsTeks.appsScriptUrl) return;
    muatSemuaDataDariSheet(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsTeks.appsScriptUrl]);

  // =====================================================================
  // PERBAIKAN BUG BESAR: "Setelan CMS Admin balik lagi ke default setiap
  // kali bagian lain di-update"
  // -----------------------------------------------------------
  // AKAR MASALAH: `cmsForm` (state form di panel "CMS Super Editor") HANYA
  // di-inisialisasi SATU KALI dari `cmsTeks` saat komponen ini PERTAMA KALI
  // dirender (lihat `useState({...cmsTeks, ...})` di atas) - padahal saat
  // render pertama itu, data ASLI dari Google Sheets BELUM SELESAI ditarik
  // (proses `muatSemuaDataDariSheet` di atas masih berjalan async), jadi
  // `cmsForm` ke-"kunci" isinya dengan nilai DEFAULT/kosong SELAMANYA -
  // tidak pernah ikut ter-update lagi walau `cmsTeks` sendiri sudah benar
  // berisi data asli hasil fetch.
  //
  // AKIBATNYA: begitu admin buka "CMS Super Editor" dan mengetik/mengubah
  // SATU kolom saja (memicu auto-save `saveCms`), fungsi itu menggabungkan
  // `cmsTeks` (data asli, benar) dengan SEMUA field dari `cmsForm` (yang
  // ternyata masih nilai DEFAULT/lama) - hasilnya SEMUA field lain yang
  // terdaftar di `saveCms` ikut TERTIMPA balik ke default, bukan cuma
  // kolom yang sedang diedit admin.
  //
  // PERBAIKAN: begitu proses tarik data PERTAMA KALI dari Google Sheets
  // selesai (sedangMuatDataAwal berubah dari true -> false, lihat state di
  // atas), `cmsForm` di-SINKRON ULANG dari `cmsTeks` yang sudah benar -
  // TAPI HANYA SEKALI (dijaga oleh ref di bawah), supaya tidak menimpa
  // balik perubahan yang sedang aktif diketik admin kalau efek ini somehow
  // terpicu lagi di kemudian hari.
  // =====================================================================
  const cmsFormSudahDisinkronDariServerRef = useRef(false);
  useEffect(() => {
    if (sedangMuatDataAwal) return; // masih proses loading, tunggu dulu
    if (cmsFormSudahDisinkronDariServerRef.current) return; // sudah pernah sinkron sekali, jangan diulang
    cmsFormSudahDisinkronDariServerRef.current = true;
    setCmsForm({
      ...cmsTeks,
      syaratText: (cmsTeks.syaratList || []).join('\n'),
      ketentuanText: (cmsTeks.ketentuanList || []).join('\n'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedangMuatDataAwal]);

  // PERBAIKAN: kalau user meninggalkan tab/app ini (pindah aplikasi lain,
  // kunci layar HP, dsb) lalu KEMBALI lagi ke tab ini, aplikasi otomatis
  // mengambil ulang seluruh data dari Google Sheet secara diam-diam
  // (tanpa toast berisik). Ini memastikan setiap kali user "membuka lagi"
  // aplikasinya, data yang tampil sudah pasti versi terbaru dari Sheet -
  // bukan data lama yang nyangkut dari sesi sebelumnya.
  useEffect(() => {
    if (!cmsTeks.appsScriptUrl) return;
    const handleKembaliAktif = () => {
      if (document.visibilityState === 'visible') {
        muatSemuaDataDariSheet(true);
      }
    };
    document.addEventListener('visibilitychange', handleKembaliAktif);
    window.addEventListener('focus', handleKembaliAktif);
    return () => {
      document.removeEventListener('visibilitychange', handleKembaliAktif);
      window.removeEventListener('focus', handleKembaliAktif);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsTeks.appsScriptUrl]);

  // ==========================================
  // PERBAIKAN: TAMPILAN DI HP KADANG TIDAK IKUT BERUBAH PADAHAL SUDAH
  // DIUBAH DARI LAPTOP
  // -----------------------------------------------------------
  // Refresh via visibilitychange di atas HANYA jalan kalau HP-nya
  // sempat "ditinggal" (kunci layar/pindah app) lalu dibuka lagi. Kalau
  // layar HP dibiarkan tetap menyala & terbuka di aplikasi ini terus-
  // menerus tanpa pernah berpindah tab, visibilitychange TIDAK PERNAH
  // terpicu, jadi data lama bisa nyangkut lama sekali walau admin di
  // laptop sudah menyimpan perubahan. Solusinya: tambahkan polling ringan
  // (ambil ulang data tiap beberapa puluh detik) SELAMA tab sedang aktif
  // terlihat, supaya semua perangkat (HP, laptop, tab lain) otomatis
  // "menyusul" ke data terbaru tanpa perlu direfresh manual satu-satu.
  // ==========================================
  useEffect(() => {
    if (!cmsTeks.appsScriptUrl) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        muatSemuaDataDariSheet(true);
      }
    }, 45000); // setiap 45 detik, cukup ringan tapi tetap terasa "real-time"
    return () => clearInterval(interval);
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
  // 3A2. DATA IURAN & TUNGGAKAN KHUSUS SIMULASI AKUN (ISOLASI TOTAL)
  // -----------------------------------------------------------
  // PENTING - PERBAIKAN KEBOCORAN DATA: sebelumnya tombol "🧪 Simulasi Akun
  // Pengguna" (nama contoh "Hidayat") memakai NAMA YANG SAMA dengan salah satu
  // baris contoh di `iuranMatrix` ASLI di atas. Akibatnya saat pengunjung
  // mencoba simulasi & upload "bukti transfer", data itu ikut tertulis ke
  // `iuranMatrix` ASLI yang sama-sama dibaca oleh Dashboard Admin/Bendahara
  // (daftar Pending Verifikasi, total dana masuk, dst) dan bisa ikut
  // tersinkron ke Google Sheets sungguhan - padahal itu cuma iseng simulasi.
  // SEKARANG: seluruh data pembayaran & kuitansi untuk SIMULASI disimpan di
  // state terpisah ini (`simIuranMatrix` / `simTunggakanList`). Kapan pun
  // `isSimulatedSession === true`, SEMUA baca-tulis iuran/tunggakan/kuitansi
  // diarahkan ke sini saja - TIDAK PERNAH menyentuh `iuranMatrix`/`tunggakanList`
  // asli, TIDAK mengirim notifikasi ke Admin sungguhan, dan TIDAK sync ke
  // Google Sheets. Hanya akun warga yang benar-benar login resmi (sudah
  // didaftarkan & diverifikasi Admin) yang datanya terhubung ke Dashboard
  // Admin & Google Sheets yang sebenarnya.
  // ==========================================
  const [simIuranMatrix, setSimIuranMatrix] = useState([
    { userNama: 'Hidayat', bulanId: 1, bulanNama: 'Januari', nominal: 45000, status: 'LUNAS', tglBayar: '10 Januari 2026', waktuVerifikasi: '10 Januari 2026, 09.15 WIB', buktiUrl: buatBuktiDummy('Hidayat - Januari 2026 (Simulasi)'), buktiNamaFile: 'contoh_bukti_jan.jpg' },
    { userNama: 'Hidayat', bulanId: 2, bulanNama: 'Februari', nominal: 45000, status: 'LUNAS', tglBayar: '09 Februari 2026', waktuVerifikasi: '09 Februari 2026, 08.40 WIB', buktiUrl: buatBuktiDummy('Hidayat - Februari 2026 (Simulasi)'), buktiNamaFile: 'contoh_bukti_feb.jpg' },
    { userNama: 'Hidayat', bulanId: 3, bulanNama: 'Maret', nominal: 45000, status: 'MENUNGGU VERIFIKASI', tglBayar: '11 Juli 2026', buktiUrl: buatBuktiDummy('Hidayat - Maret 2026 (Simulasi)', '#b45309'), buktiNamaFile: 'contoh_bukti_mar.jpg' },
    { userNama: 'Siti Aminah', bulanId: 1, bulanNama: 'Januari', nominal: 45000, status: 'LUNAS', tglBayar: '12 Januari 2026', waktuVerifikasi: '12 Januari 2026, 10.05 WIB', buktiUrl: buatBuktiDummy('Siti Aminah - Januari 2026 (Simulasi)'), buktiNamaFile: 'contoh_bukti_siti.jpg' },
  ]);
  const [simTunggakanList, setSimTunggakanList] = useState([]);


  // ==========================================
  // 3B. TUNGGAKAN (TAGIHAN BELUM LUNAS YANG DIBAWA LINTAS PERIODE)
  // -----------------------------------------------------------
  // PENTING: sebelum perbaikan ini, saat admin menutup periode (lihat
  // handleTutupPeriode), SELURUH data iuranMatrix dikosongkan
  // (updateIuran([])) -- termasuk bulan yang statusnya masih "BELUM BAYAR"
  // / "MENUNGGU VERIFIKASI". Akibatnya tagihan warga yang belum lunas ikut
  // "hilang" begitu saja saat periode baru dibuka, padahal warga itu
  // sebenarnya masih berhutang/menunggak.
  //
  // Sekarang setiap kali admin menutup periode, seluruh baris iuran milik
  // warga yang BELUM berstatus LUNAS otomatis dipindahkan ke sini sebagai
  // "tunggakan" (tagihan berjalan terus, tidak ikut terhapus), lengkap
  // dengan keterangan periode & tahun asal supaya jelas ini tunggakan dari
  // periode yang mana. Warga tetap bisa upload bukti transfer untuk
  // melunasi tunggakan ini dari Dashboard-nya kapan saja walau periode
  // asalnya sudah ditutup, dan Admin punya halaman monitoring khusus
  // (menu "Monitoring Tunggakan") untuk memantau siapa saja yang masih
  // menunggak setelah periode ditutup.
  //
  // Struktur 1 baris tunggakan:
  // { id, userId, userNama, nomorRumah, kelompok, bulanId, bulanNama,
  //   nominal, status: 'BELUM BAYAR' | 'MENUNGGU VERIFIKASI' | 'LUNAS',
  //   tglBayar, buktiUrl, buktiNamaFile, waktuVerifikasi,
  //   noPeriodeAsal, tahunAsal }
  // ==========================================
  const [tunggakanList, setTunggakanList] = useState([]);

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

  // Form admin untuk mengatur TANGGAL MULAI periode iuran (menu Manajemen
  // Periode). Admin cukup isi 1 tanggal (mis. 01-07-2026 untuk "Juli 2026"),
  // lalu sistem otomatis menyusun siklus 12 bulan berjalan mulai dari bulan
  // tersebut (Juli 2026 - Juni 2027) untuk SEMUA akun, tidak wajib Jan-Des.
  const [formPengaturanPeriode, setFormPengaturanPeriode] = useState({ tanggalMulai: '2026-07-01' });

  const romawiBulan = (bulan) => ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][bulan - 1] || 'I';
  const buatNomorPeriode = (urut, tahun, bulan) => `${String(urut).padStart(3, '0')}/${romawiBulan(bulan)}/${tahun}`;
  const BULAN_BERJALAN = 7; // Juli 2026 (mengikuti tanggal simulasi aplikasi)

  // Label rentang periode berjalan, contoh: "Juli 2026 - Juni 2027" (otomatis
  // mengikuti tahunOffset kalau periode menyeberang tahun kalender).
  const labelRentangPeriode = `${DAFTAR_BULAN[0].nama} ${periodeTahun} - ${DAFTAR_BULAN[11].nama} ${periodeTahun + DAFTAR_BULAN[11].tahunOffset}`;

  // ==========================================
  // PERBAIKAN BUG: "Tahun bulan Januari-Juni tetap tertulis 2026, padahal
  // periode dimulai Juli 2026 jadi seharusnya Januari-Juni 2027".
  // -----------------------------------------------------------
  // Banyak tempat di tampilan (tabel Riwayat Pembayaran, Kuitansi Digital,
  // Verifikasi Pembayaran, dst) sebelumnya menulis "{namaBulan} {periodeTahun}"
  // secara langsung, padahal periodeTahun cuma tahun AWAL periode (mis. 2026).
  // Begitu periode menyeberang tahun kalender (mis. mulai Juli), bulan-bulan
  // Januari-Juni yang sebenarnya tahun BERIKUTNYA (2027) ikut tertulis 2026.
  // getTahunUntukBulan mencari tahunOffset bulan tsb di DAFTAR_BULAN dan
  // menambahkannya ke periodeTahun, supaya tahun yang tampil selalu benar.
  // ==========================================
  const getTahunUntukBulan = (namaBulan) => {
    const info = DAFTAR_BULAN.find(b => b.nama === namaBulan);
    return periodeTahun + (info ? info.tahunOffset : 0);
  };

  // Simpan pengaturan tanggal mulai periode baru dari form admin.
  const handleSimpanPengaturanPeriode = (e) => {
    e.preventDefault();
    if (!formPengaturanPeriode.tanggalMulai) {
      showToast('Isi dulu tanggal mulai periode.', 'error');
      return;
    }
    const [y, m, d] = formPengaturanPeriode.tanggalMulai.split('-').map(Number);
    if (!y || !m || !d) {
      showToast('Format tanggal tidak valid.', 'error');
      return;
    }
    setPeriodeBulanMulai(m);
    setPeriodeTahun(y);
    const noPeriodeBaru = buatNomorPeriode(nomorUrutPeriode, y, m);
    updatePeriode({ noPeriode: noPeriodeBaru, tahun: y, status: 'Berjalan', tanggalMulai: formatTanggalIndo(formPengaturanPeriode.tanggalMulai) });
    showToast(`Periode berjalan diset mulai ${formatTanggalIndo(formPengaturanPeriode.tanggalMulai)}. Siklus 12 bulan otomatis mengikuti dari bulan ini untuk seluruh akun.`);
  };

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
  // NAMA BLOK YANG SEDANG DIBUKA RINCIANNYA di menu "Informasi Warga" (khusus
  // Admin) - saat admin klik "Lihat Rincian" pada salah satu blok di
  // "Distribusi Warga per Blok", muncul daftar Anggota Keluarga tiap KK di
  // blok tersebut (format sama seperti tabel "Anggota Keluarga" akun user).
  // null = belum ada blok yang dibuka rinciannya.
  const [rincianBlokTerbuka, setRincianBlokTerbuka] = useState(null);
  // MODE PERSENTASE "Distribusi Warga per Blok" (Informasi Warga) - warga
  // bisa toggle apakah persentase yang ditampilkan (di badge & pie chart)
  // dihitung berdasarkan jumlah KK (Kepala Keluarga) atau jumlah Jiwa
  // (seluruh anggota keluarga termasuk KK). Default: 'kk'.
  const [modePersenBlok, setModePersenBlok] = useState('kk'); // 'kk' | 'jiwa'
  // NAMA BLOK YANG SEDANG DIBUKA RINCIANNYA khusus untuk daftar warga
  // "Pasif/Keluar" per blok (bagian terpisah dari rincianBlokTerbuka di
  // atas) - dipakai di section "Distribusi Warga Pasif / Keluar per Blok".
  const [rincianBlokPasifTerbuka, setRincianBlokPasifTerbuka] = useState(null);

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
  // LIGHTBOX FOTO (ZOOM GAMBAR AGENDA & INFORMASI UMUM)
  // -----------------------------------------------------------
  // State global untuk pop-up foto yang bisa dibuka dari mana saja (Web Utama,
  // akun Warga, akun Bendahara) lewat komponen <GambarZoom onBuka={bukaLightbox} />.
  // `lightboxZoomed` dipakai supaya foto di dalam pop-up bisa diperbesar lagi
  // dengan sekali klik (zoom in/out), dan tombol "Lihat Full Page" membuka foto
  // resolusi aslinya di tab baru browser.
  // ==========================================
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const bukaLightbox = (src, alt) => {
    if (!src) return;
    setLightboxImg({ src, alt: alt || 'Foto' });
    setLightboxZoomed(false);
  };
  const tutupLightbox = () => {
    setLightboxImg(null);
    setLightboxZoomed(false);
  };
  // Tombol ESC di keyboard (laptop) juga bisa menutup lightbox.
  useEffect(() => {
    if (!lightboxImg) return;
    const handleEsc = (e) => { if (e.key === 'Escape') tutupLightbox(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [lightboxImg]);

  // ==========================================
  // STATE MODAL, EMAIL SIMULASI & PENDAFTARAN BARU
  // ==========================================
  const [selectedKuitansi, setSelectedKuitansi] = useState(null);
  // Tombol ESC juga bisa menutup pop-up Kuitansi Digital (selain klik ✕ atau
  // klik area gelap di luar kartu kuitansi) - jaga-jaga tambahan supaya kuitansi
  // selalu bisa ditutup walau di layar kecil/kuitansi sedang panjang ke bawah.
  useEffect(() => {
    if (!selectedKuitansi) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setSelectedKuitansi(null); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedKuitansi]);
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
  // Diambil dari cmsTeks.daftarBlokRumahList / daftarNomorRumahList supaya
  // Admin bisa mengedit sendiri lewat CMS Super Editor (lihat panel "Pilihan
  // Blok & Nomor Rumah"), bukan lagi hardcode F1-F14/G1-G6 di kode.
  // ==========================================
  const DAFTAR_BLOK_RUMAH = (cmsTeks.daftarBlokRumahList && cmsTeks.daftarBlokRumahList.length) ? cmsTeks.daftarBlokRumahList : ['F1'];
  const DAFTAR_NOMOR_RUMAH = (cmsTeks.daftarNomorRumahList && cmsTeks.daftarNomorRumahList.length) ? cmsTeks.daftarNomorRumahList : ['1'];

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
  // "Kepala Keluarga" ditambahkan di urutan PALING AWAL supaya jadi pilihan
  // default baris pertama form pendaftaran (lihat FORM_DAFTAR_ANGGOTA_AWAL &
  // handleUserMendaftar) - warga sering lupa mengisi data dirinya sendiri
  // (kepala keluarga) & langsung ke istri/anak, jadi baris pertama kita kunci
  // sebagai Kepala Keluarga supaya tidak pernah terlewat lagi.
  const HUBUNGAN_KELUARGA_LIST = ['Kepala Keluarga', 'Suami', 'Istri', 'Anak ke-1', 'Anak ke-2', 'Anak ke-3', 'Anak ke-4', 'Anak ke-5', 'Mertua', 'Menantu', 'Saudara', 'Sepupu', 'Ipar', 'Paman', 'Bibi', 'Lainnya (Teman dll)'];
  // Pilihan hubungan untuk baris TAMBAHAN (istri/anak/dst) setelah baris
  // Kepala Keluarga yang sudah dikunci di awal form pendaftaran - sengaja
  // tidak menyertakan "Kepala Keluarga" lagi supaya tidak dobel per KK.
  const HUBUNGAN_KELUARGA_TAMBAHAN_LIST = HUBUNGAN_KELUARGA_LIST.filter(h => h !== 'Kepala Keluarga');
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

  // ==========================================
  // RINGKASAN JUMLAH KK & JIWA PER BLOK RUMAH (F1, F2, dst dari
  // DAFTAR_BLOK_RUMAH) - dipakai supaya calon warga yang MENDAFTAR (belum
  // login) bisa lihat keramaian tiap blok langsung di dekat dropdown "Blok
  // Rumah", tanpa perlu buka menu admin. SENGAJA HANYA MENAMPILKAN JUMLAH
  // (bukan nama warga) supaya data pribadi warga lain tidak bocor ke halaman
  // publik/pendaftaran - daftar nama lengkap tetap hanya ada di menu "Rekap
  // Blok Rumah" & khusus terlihat kalau akses === 'admin'.
  // -----------------------------------------------------------
  // Dicocokkan lewat awalan "Blok {blok} No." pada field nomorRumah supaya
  // sesuai dengan pilihan Blok Rumah yang dipilih warga sendiri saat
  // mendaftar (bukan field "kelompok" yang bisa diubah admin terpisah).
  // ==========================================
  const getRingkasanBlokRumah = () => {
    return DAFTAR_BLOK_RUMAH.map(blok => {
      const awalan = `Blok ${blok} No.`;
      const anggotaBlokIni = members.filter(m => (m.nomorRumah || '').startsWith(awalan));
      const jumlahKK = anggotaBlokIni.length;
      // PERBAIKAN BUG PENGHITUNGAN GANDA: array `anggotaKeluarga` tiap KK
      // SUDAH TERMASUK baris Kepala Keluarga itu sendiri (lihat
      // ID_BARIS_KEPALA_KELUARGA - baris pertama & terkunci di form
      // Pendaftaran/Anggota Keluarga, hubungan: "Kepala Keluarga"). Jadi
      // `jumlahJiwa` yang benar = jumlah SELURUH baris anggotaKeluarga saja
      // (bukan jumlahKK DITAMBAH jumlah anggotaKeluarga lagi, yang tanpa
      // sadar menghitung tiap Kepala Keluarga 2x: sekali sebagai KK, sekali
      // lagi sebagai baris pertama di anggotaKeluarga-nya sendiri).
      const jumlahJiwa = anggotaBlokIni.reduce((acc, m) => acc + (m.anggotaKeluarga || []).length, 0);
      return { blok, jumlahKK, jumlahJiwa };
    });
  };

  // ID TETAP untuk baris "Kepala Keluarga" yang dikunci di awal form
  // pendaftaran (lihat catatan HUBUNGAN_KELUARGA_LIST di atas). Dengan ID
  // tetap ini kita selalu bisa mengenali & mengunci baris pertama, apa pun
  // urutan baris lain yang ditambahkan warga.
  const ID_BARIS_KEPALA_KELUARGA = 'AK-KEPALA-KELUARGA';
  const buatBarisKepalaKeluargaKosong = () => ({ id: ID_BARIS_KEPALA_KELUARGA, nama: '', hubungan: 'Kepala Keluarga', jenisKelamin: 'Laki-laki', tanggalLahir: '' });

  const [formDaftar, setFormDaftar] = useState({ nama: '', blokRumah: DAFTAR_BLOK_RUMAH[0], nomorRumahUnit: DAFTAR_NOMOR_RUMAH[0], email: '', wa: '', alamat: '', statusRumah: 'Milik Sendiri', anggotaKeluarga: [buatBarisKepalaKeluargaKosong()] });

  // Nama pada baris "Kepala Keluarga" SELALU mengikuti isian "Nama Kepala
  // Keluarga" paling atas form - warga tidak perlu mengetik nama dua kali,
  // cukup lengkapi tanggal lahir & jenis kelamin di baris tersebut.
  const handleUbahNamaKepalaKeluarga = (nilai) => {
    setFormDaftar(prev => ({
      ...prev,
      nama: nilai,
      anggotaKeluarga: prev.anggotaKeluarga.map(a => a.id === ID_BARIS_KEPALA_KELUARGA ? { ...a, nama: nilai } : a),
    }));
  };

  // KELOLA BARIS ANGGOTA KELUARGA (ISTRI & ANAK) PADA FORM PENDAFTARAN.
  // Baris Kepala Keluarga (ID_BARIS_KEPALA_KELUARGA) SELALU ada di posisi
  // pertama & tidak bisa dihapus/diganti hubungannya - lihat catatan di
  // HUBUNGAN_KELUARGA_LIST kenapa ini dikunci (warga sering lupa mengisi
  // data dirinya sendiri sebelum mendaftar).
  const handleTambahBarisAnggotaDaftar = () => {
    setFormDaftar(prev => ({ ...prev, anggotaKeluarga: [...prev.anggotaKeluarga, { id: 'AK-' + Date.now() + '-' + Math.floor(Math.random() * 1000), nama: '', hubungan: HUBUNGAN_KELUARGA_TAMBAHAN_LIST[0], jenisKelamin: 'Perempuan', tanggalLahir: '' }] }));
  };
  const handleHapusBarisAnggotaDaftar = (id) => {
    if (id === ID_BARIS_KEPALA_KELUARGA) {
      showToast('Data Kepala Keluarga wajib ada & tidak bisa dihapus.', 'error');
      return;
    }
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
  // id anggota keluarga yang sedang diedit warga (null = mode tambah baru).
  // Sengaja disimpan terpisah dari editingWargaKeluarId (fitur admin lain)
  // supaya tidak bentrok.
  const [editingAnggotaKeluargaId, setEditingAnggotaKeluargaId] = useState(null);
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
    if (editingAnggotaKeluargaId) {
      // MODE EDIT: perbarui data anggota keluarga yang sudah ada (langsung
      // ikut tersimpan di data induk `members`, sehingga admin otomatis
      // melihat data terbaru tanpa langkah tambahan).
      const daftarBaru = (activeUserSession.anggotaKeluarga || []).map(a => a.id === editingAnggotaKeluargaId ? {
        ...a,
        nama: formTambahAnggotaUser.nama.trim(),
        hubungan: formTambahAnggotaUser.hubungan,
        jenisKelamin: formTambahAnggotaUser.jenisKelamin,
        tanggalLahir: formTambahAnggotaUser.tanggalLahir,
      } : a);
      updateMembers(prev => prev.map(m => m.id === activeUserSession.id ? { ...m, anggotaKeluarga: daftarBaru } : m));
      setActiveUserSession(prev => ({ ...prev, anggotaKeluarga: daftarBaru }));
      setEditingAnggotaKeluargaId(null);
      setFormTambahAnggotaUser({ nama: '', hubungan: 'Suami', jenisKelamin: 'Perempuan', tanggalLahir: '' });
      showToast('Data anggota keluarga berhasil diperbarui.');
      return;
    }
    const anggotaBaru = { id: 'AK-' + Date.now(), nama: formTambahAnggotaUser.nama.trim(), hubungan: formTambahAnggotaUser.hubungan, jenisKelamin: formTambahAnggotaUser.jenisKelamin, tanggalLahir: formTambahAnggotaUser.tanggalLahir };
    const daftarBaru = [...(activeUserSession.anggotaKeluarga || []), anggotaBaru];
    updateMembers(prev => prev.map(m => m.id === activeUserSession.id ? { ...m, anggotaKeluarga: daftarBaru } : m));
    setActiveUserSession(prev => ({ ...prev, anggotaKeluarga: daftarBaru }));
    setFormTambahAnggotaUser({ nama: '', hubungan: 'Suami', jenisKelamin: 'Perempuan', tanggalLahir: '' });
    showToast('Anggota keluarga berhasil ditambahkan.');
  };
  // Mulai mode edit: isi ulang form dengan data anggota keluarga terpilih.
  const handleMulaiEditAnggotaKeluargaUser = (a) => {
    if (isSimulatedSession) {
      showToast('Ini tampilan simulasi. Login dengan akun resmi untuk mengelola anggota keluarga.', 'error');
      return;
    }
    setEditingAnggotaKeluargaId(a.id);
    setFormTambahAnggotaUser({ nama: a.nama, hubungan: a.hubungan, jenisKelamin: a.jenisKelamin, tanggalLahir: a.tanggalLahir });
  };
  const handleBatalEditAnggotaKeluargaUser = () => {
    setEditingAnggotaKeluargaId(null);
    setFormTambahAnggotaUser({ nama: '', hubungan: 'Suami', jenisKelamin: 'Perempuan', tanggalLahir: '' });
  };
  const handleHapusAnggotaKeluargaUser = (id) => {
    if (isSimulatedSession) {
      showToast('Ini tampilan simulasi. Login dengan akun resmi untuk mengelola anggota keluarga.', 'error');
      return;
    }
    const daftarBaru = (activeUserSession.anggotaKeluarga || []).filter(a => a.id !== id);
    updateMembers(prev => prev.map(m => m.id === activeUserSession.id ? { ...m, anggotaKeluarga: daftarBaru } : m));
    setActiveUserSession(prev => ({ ...prev, anggotaKeluarga: daftarBaru }));
    if (editingAnggotaKeluargaId === id) handleBatalEditAnggotaKeluargaUser();
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
  // PERBAIKAN BUG "Ubah Password": sebelumnya tombol "Simpan Password Baru"
  // tidak dikunci selama proses ke server berjalan -> kalau warga tidak
  // sabar/koneksi lambat lalu KLIK BERKALI-KALI, beberapa REQUEST GANTI
  // PASSWORD terkirim BERSAMAAN. Request pertama bisa saja SUKSES mengganti
  // password lama -> password baru, tapi request kedua/ketiga yang masih
  // memakai "Password Lama" versi SEBELUM diganti otomatis DITOLAK server
  // (dianggap salah), padahal yang diketik warga sebenarnya benar. Ini juga
  // salah satu penyebab pesan/tampilan yang muncul kadang tidak konsisten
  // (pesan sukses dari request pertama bisa tertimpa pesan gagal dari
  // request susulan yang baru selesai belakangan).
  // SOLUSI: `sedangSimpanPassword` mengunci tombol (disabled) + menampilkan
  // status "Menyimpan..." begitu diklik, dan baru dibuka lagi setelah proses
  // (berhasil ataupun gagal) benar-benar selesai.
  const [sedangSimpanPassword, setSedangSimpanPassword] = useState(false);
  // lihatFormUbahPassword: menampilkan/menyembunyikan isi ketikan tiap kolom
  // password di form "Ubah Password" (ikon mata) - key = 'lama' | 'baru' |
  // 'konfirmasi', value = true kalau sedang ditampilkan sebagai teks biasa.
  // Murni tampilan lokal di layar warga sendiri, tidak dikirim/disimpan
  // ke mana pun.
  const [lihatFormUbahPassword, setLihatFormUbahPassword] = useState({ lama: false, baru: false, konfirmasi: false });

  // ==========================================
  // FORM LOGIN RESMI (USERNAME & PASSWORD) - WEB UTAMA
  // ==========================================
  const [formLogin, setFormLogin] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  // isLoggingIn: dipakai untuk menampilkan teks "Memuat data dari server, mohon
  // tunggu..." di form login Web Utama SELAMA proses login sedang menghubungi
  // server (Google Sheets). Mengantisipasi warga mengira web "gagal/error"
  // padahal sebenarnya cuma masih menunggu respons server (koneksi lambat dsb).
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // isDaftarLoading: form Pendaftaran Akun sedang proses submit (menunggu
  // verifikasi server) - dipakai untuk kunci tombol "Daftar Sebagai Warga"
  // supaya tidak bisa diklik dua kali berturut-turut (double submit), yang
  // dulu jadi salah satu penyebab 2 akun bisa nyangkut di 1 nomor rumah.
  const [isDaftarLoading, setIsDaftarLoading] = useState(false);

  // ==========================================
  // LOGIN ADMIN/PANITIA (TERPISAH DARI LOGIN WARGA)
  // Akses Admin Panel HANYA bisa didapat lewat login ini, bukan tombol bebas.
  // -----------------------------------------------------------
  // PERBAIKAN "PASSWORD SALAH SETELAH LOGIN ADMIN DI HIDE / TIDAK BISA
  // MASUK DARI LAPTOP & HP": sebelumnya username & password Admin HANYA
  // tersimpan di memori React (state), sama seperti kasus URL Apps Script
  // yang sudah pernah diperbaiki di atas. Akibatnya begitu halaman
  // di-refresh, ditutup, atau dibuka dari perangkat lain (laptop vs HP),
  // perubahan password Admin yang pernah disimpan hilang dan aplikasi
  // balik lagi ke bawaan admin/admin123 - atau sebaliknya, kalau device
  // itu masih menyimpan sesi lama, password baru dianggap tidak "nyambung"
  // ke device lain. Sekarang akun Admin disimpan juga ke localStorage
  // BROWSER MASING-MASING (persis seperti URL Apps Script di atas),
  // supaya begitu password diganti lewat menu "Ganti Password Admin",
  // perubahan itu konsisten dipakai setiap kali Admin Panel dibuka lagi
  // di browser yang sama. Kalau localStorage kosong/baru pertama kali
  // (device belum pernah dipakai login Admin), otomatis balik ke bawaan
  // admin/admin123 supaya Panitia tidak pernah terkunci total.
  // ==========================================
  const bacaAdminAccountTersimpan = () => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = window.localStorage.getItem('iuran_rt_admin_account');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username && parsed.password) return parsed;
      return null;
    } catch (e) {
      return null;
    }
  };
  const [adminAccount, setAdminAccount] = useState(() => bacaAdminAccountTersimpan() || { username: 'admin', password: 'admin123' });
  // adminLoggedIn: true bila akun yang sedang aktif adalah Super Admin (login
  // dengan username/password adminAccount lewat form Login Akun Warga yang sama).
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [formAdminAccount, setFormAdminAccount] = useState({ username: 'admin', password: '', passwordBaru: '', konfirmasiPassword: '' });
  const [adminAccountMsg, setAdminAccountMsg] = useState({ tipe: '', teks: '' });

  // ==========================================
  // PANEL KONTROL ANGGOTA - CENTANG UNTUK AKSI MASSAL
  // ==========================================
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  // passwordTerlihat: menyimpan password yang SEDANG DITAMPILKAN oleh admin
  // (fitur "Lihat Password" di Panel Kontrol Anggota) - key = id anggota,
  // value = password (string) atau 'memuat' selagi proses ambil dari
  // server. Default kosong = semua password tersembunyi (••••••••).
  const [passwordTerlihat, setPasswordTerlihat] = useState({});
  // sedangResetPassword: menandai anggota (id) yang tombol "Reset Password"-nya
  // SEDANG diproses - dipakai supaya tombol itu terkunci/disabled sesaat
  // setelah diklik, mencegah admin klik-klik cepat berkali-kali pada baris
  // yang sama (yang sebelumnya bisa memicu beberapa proses reset & pengiriman
  // WA/Email SEKALIGUS untuk warga yang sama, membuat data yang tampil
  // sempat tidak sinkron/tertukar sesaat dengan proses reset baris lain).
  const [sedangResetPassword, setSedangResetPassword] = useState({});

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
  const userRows = (isSimulatedSession ? simIuranMatrix : iuranMatrix).filter(item => item.userNama === activeUserSession.nama);
  // Tunggakan (tagihan belum lunas dari periode yang sudah ditutup admin) milik warga yang sedang login.
  // Simulasi -> selalu pakai simTunggakanList (terisolasi), TIDAK PERNAH baca tunggakanList asli.
  const userTunggakan = (isSimulatedSession ? simTunggakanList : tunggakanList).filter(item => item.userNama === activeUserSession.nama);
  const userTunggakanBelumLunas = userTunggakan.filter(item => item.status !== 'LUNAS');
  const userTotalTunggakan = userTunggakanBelumLunas.reduce((acc, t) => acc + Number(t.nominal || 0), 0);
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
  // -----------------------------------------------------------
  // Total Kas Global & Sisa Tagihan di Dashboard Utama HANYA menghitung
  // warga yang statusnya "Aktif" DAN bukan "Akun Pengurus" (lihat
  // handleTogglePengurus). Warga Pasif otomatis tidak dihitung karena
  // dianggap non-aktif/sudah tidak menghuni, sedangkan Akun Pengurus sengaja
  // dikecualikan dari Keuangan RT walau tetap dihitung di Informasi Warga.
  // ==========================================
  const anggotaUntukKeuanganRT = members.filter(m => m.statusAnggota !== 'Pasif' && !m.pengurus);
  const namaUntukKeuanganRT = new Set(anggotaUntukKeuanganRT.map(m => m.nama));
  const totalDanaMasukGlobal = iuranMatrix.filter(r => r.status === 'LUNAS' && namaUntukKeuanganRT.has(r.userNama)).reduce((acc, r) => acc + r.nominal, 0);
  const totalSisaGlobal = anggotaUntukKeuanganRT.reduce((acc, m) => acc + m.target, 0) - totalDanaMasukGlobal;
  const totalVerifPendingGlobal = iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').reduce((acc, r) => acc + r.nominal, 0);
  // Jumlah KK di kartu Dashboard Utama = KK Aktif (non-pengurus) + KK Pengurus
  // (pengurus tetap dihitung sebagai warga/KK, hanya dikecualikan dari
  // Keuangan RT). KK Pasif TIDAK ikut dihitung ke Jumlah KK, tapi tetap
  // ditampilkan terpisah sebagai info jumlahnya saja.
  const jumlahAktif = members.filter(m => m.statusAnggota === 'Aktif' && !m.pengurus).length;
  const jumlahPasif = members.filter(m => m.statusAnggota === 'Pasif').length;
  const jumlahPengurus = members.filter(m => m.pengurus).length;
  const jumlahKK = jumlahAktif + jumlahPengurus;

  // ==========================================
  // FILTER BULAN DI DASHBOARD UTAMA (ADMIN)
  // -----------------------------------------------------------
  // Dipakai kartu "Total Kas Global" & "Sisa Tagihan" saat admin memilih
  // bulan tertentu (bukan "Semua Bulan"/default). Warga Pasif & Akun
  // Pengurus tetap dikecualikan (pakai anggotaUntukKeuanganRT yang sama).
  // ==========================================
  const bulanTerpilihDashboard = adminFilterBulanDashboard === 'Semua' ? null : DAFTAR_BULAN.find(b => String(b.id) === String(adminFilterBulanDashboard));
  const labelBulanTerpilihDashboard = bulanTerpilihDashboard ? `${bulanTerpilihDashboard.nama} ${periodeTahun + bulanTerpilihDashboard.tahunOffset}` : null;
  const totalMasukBulanTerpilih = bulanTerpilihDashboard
    ? iuranMatrix.filter(r => r.bulanId === bulanTerpilihDashboard.id && r.status === 'LUNAS' && namaUntukKeuanganRT.has(r.userNama)).reduce((acc, r) => acc + r.nominal, 0)
    : null;
  const sisaTagihanBulanTerpilih = bulanTerpilihDashboard
    ? Math.max(0, (anggotaUntukKeuanganRT.length * IURAN_BULANAN) - totalMasukBulanTerpilih)
    : null;
  // Daftar KK yang BELUM LUNAS di bulan terpilih, LENGKAP dengan bulan-bulan
  // sebelumnya di periode berjalan (s.d. bulan terpilih) yang juga masih
  // belum lunas - supaya tunggakan lama tetap kelihatan, bukan cuma bulan itu.
  const bulanSampaiTerpilihDashboard = bulanTerpilihDashboard ? DAFTAR_BULAN.filter(b => b.id <= bulanTerpilihDashboard.id) : [];
  const daftarBelumBayarBulanTerpilih = bulanTerpilihDashboard
    ? anggotaUntukKeuanganRT
        .map(m => {
          const bulanBelumBayar = bulanSampaiTerpilihDashboard.filter(b => {
            const row = iuranMatrix.find(r => r.userNama === m.nama && r.bulanId === b.id);
            return !row || row.status !== 'LUNAS';
          });
          return { ...m, bulanBelumBayar };
        })
        .filter(m => m.bulanBelumBayar.length > 0)
    : [];

  // ==========================================
  // NOTIFIKASI MILIK AKUN YANG SEDANG AKTIF (USER atau ADMIN)
  // ==========================================
  const notifikasiSaya = notifikasiList.filter(n => n.untuk === (role === 'admin' ? 'admin' : activeUserSession.id));
  const jumlahNotifBelumDibaca = notifikasiSaya.filter(n => !n.dibaca).length;


  // Bulan yang SEDANG BERJALAN dalam periode 12 bulan (DAFTAR_BULAN), dicari
  // berdasarkan BULAN_BERJALAN (nomor bulan kalender 1-12, lihat definisi di
  // atas). Dipakai supaya status "Sudah Bayar"/"Belum Bayar" per anggota HANYA
  // mencerminkan bulan berjalan saat ini, bukan status lunas target 1 tahun.
  const bulanBerjalanObj = DAFTAR_BULAN.find(b => b.bulanKalender === BULAN_BERJALAN) || DAFTAR_BULAN[0];

  // ==========================================
  // REKAPAN PER NAMA UNTUK MONITORING ADMIN
  // ==========================================
  const rekapPerAnggota = members.map(m => {
    const rows = iuranMatrix.filter(r => r.userNama === m.nama);
    const dibayar = rows.filter(r => r.status === 'LUNAS').reduce((acc, r) => acc + r.nominal, 0);
    const pending = rows.filter(r => r.status === 'MENUNGGU VERIFIKASI').reduce((acc, r) => acc + r.nominal, 0);
    // Akun Pengurus dibebaskan dari iuran bulanan (free) & TIDAK masuk laporan
    // keuangan RT (lihat anggotaUntukKeuanganRT & rekapPerNomorPengajuan di
    // atas), jadi di tabel monitoring ini Sisa-nya juga harus tampil 0 &
    // Progress 100% (bukan ikut tampil "Sisa Rp540.000" seolah-olah nunggak).
    const sisa = m.pengurus ? 0 : Math.max(0, m.target - dibayar);
    const persen = m.pengurus ? 100 : Math.min(100, Math.round((dibayar / m.target) * 100));
    const bulanLunas = rows.filter(r => r.status === 'LUNAS').length;

    // STATUS BULAN BERJALAN: HANYA melihat status pembayaran di bulan yang
    // sedang berjalan saat ini (mis. Juli), BUKAN status lunas target 1 tahun.
    // Jadi kalau bulan berjalan Juli sudah dibayar -> "Sudah Bayar", walau
    // total setahun belum lunas semua. Sebaliknya kalau sudah masuk Agustus
    // & belum ada pembayaran Agustus -> "Belum Bayar" (bukan ikut menghitung
    // tunggakan bulan-bulan lama).
    const rowBulanIni = rows.find(r => r.bulanNama === bulanBerjalanObj.nama);
    const statusBulanIni = m.pengurus
      ? 'Bebas Iuran'
      : rowBulanIni
        ? (rowBulanIni.status === 'LUNAS' ? 'Sudah Bayar' : 'Menunggu Verifikasi')
        : 'Belum Bayar';

    // RIWAYAT BELUM LUNAS/OPEN: daftar bulan (dari 12 bulan periode berjalan)
    // yang statusnya MASIH belum lunas (belum ada pembayaran ATAU masih
    // menunggu verifikasi) - dipakai saat admin klik "Rincian" di tabel
    // Rekap Per Anggota (Monitoring).
    const riwayatBelumLunas = m.pengurus ? [] : DAFTAR_BULAN
      .map(bln => {
        const row = rows.find(r => r.bulanNama === bln.nama);
        return {
          bulanId: bln.id,
          bulanNama: bln.nama,
          tahun: periodeTahun + bln.tahunOffset,
          nominal: row ? row.nominal : IURAN_BULANAN,
          status: row ? row.status : 'BELUM BAYAR',
        };
      })
      .filter(r => r.status !== 'LUNAS');

    return { ...m, dibayar, pending, sisa, persen, bulanLunas, statusBulanIni, riwayatBelumLunas };
  });

  // ==========================================
  // TAMPILAN TABEL "REKAP PER ANGGOTA (MONITORING)" SETELAH DIFILTER
  // PENCARIAN (nama ATAU nomor rumah/blok) DAN/ATAU DIURUTKAN PER BLOK.
  // -----------------------------------------------------------
  // Pencarian dibuat toleran: mengabaikan besar/kecil huruf & boleh cocok
  // di NAMA atau di NOMOR RUMAH/BLOK sekaligus, jadi admin bisa mengetik
  // "F3", "no 20", atau nama warga dan tetap ketemu.
  // ==========================================
  const rekapPerAnggotaTampil = (() => {
    let hasil = rekapPerAnggota;
    const kataKunci = cariRekapAnggota.trim().toLowerCase();
    if (kataKunci) {
      hasil = hasil.filter(m =>
        (m.nama || '').toLowerCase().includes(kataKunci) ||
        (m.nomorRumah || '').toLowerCase().includes(kataKunci) ||
        (m.kelompok || '').toLowerCase().includes(kataKunci)
      );
    }
    if (sortRekapAnggotaBlok) {
      hasil = hasil.slice().sort((a, b) => bandingkanUrutBlok(a.nomorRumah || a.nama, b.nomorRumah || b.nama));
    }
    return hasil;
  })();

  // ==========================================
  // REKAP DANA MASUK PER NOMOR PENGAJUAN KELOMPOK (UTK SUMMARY + DRILL-DOWN)
  // Supaya kelihatan misal No. 001/VII/2026 seharusnya terkumpul Rp 1.000.000
  // tapi baru Rp 500.000 - lalu bisa di-drill-down anggota mana yang belum bayar.
  // "Akun Pengurus" TIDAK ikut masuk daftar/perhitungan di sini sama sekali
  // (bebas iuran bulanan, jadi tidak pernah muncul berstatus "Belum Bayar"),
  // begitu juga warga "Pasif" (dianggap sudah tidak menghuni/tidak aktif).
  // ==========================================
  const rekapPerNomorPengajuan = kelompokList.map(k => {
    const anggotaKelompok = rekapPerAnggota.filter(m => cocokBlok(m.kelompok, k.nama) && !m.pengurus && m.statusAnggota !== 'Pasif');
    const targetKelompok = anggotaKelompok.reduce((acc, m) => acc + m.target, 0);
    const masukKelompok = anggotaKelompok.reduce((acc, m) => acc + m.dibayar, 0);
    const pendingKelompok = anggotaKelompok.reduce((acc, m) => acc + m.pending, 0);
    const sisaKelompok = Math.max(0, targetKelompok - masukKelompok);
    const persenKelompok = targetKelompok > 0 ? Math.min(100, Math.round((masukKelompok / targetKelompok) * 100)) : 0;
    // PERBAIKAN: sebelumnya badge "⚠ N anggota belum lunas" memakai syarat
    // `m.sisa > 0` saja (sisa target SETAHUN) - akibatnya anggota yang SUDAH
    // bayar & diverifikasi Bendahara di BULAN BERJALAN (mis. Juli) tetap
    // dianggap "belum lunas" hanya karena bulan-bulan lain di tahun itu
    // belum lunas semua. Sekarang badge ini HANYA menghitung anggota yang: (1)
    // bulan berjalan MASIH belum dibayar (statusBulanIni === 'Belum Bayar'),
    // DAN (2) juga masih punya tunggakan dari bulan-bulan SEBELUMNYA (sisa
    // lebih besar dari 1x iuran bulanan, bukan cuma nunggak bulan ini saja).
    // Kalau bulan berjalan sudah dibayar (walau bulan lain masih ada yang
    // kosong), anggota TIDAK dihitung di sini lagi.
    const anggotaBelumLunas = anggotaKelompok.filter(m => m.statusBulanIni === 'Belum Bayar' && m.sisa > IURAN_BULANAN);
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

  // ==========================================
  // PERBAIKAN BUG: GENERATOR ID ANGGOTA BARU (DIJAMIN UNIK)
  // -----------------------------------------------------------
  // SEBELUMNYA: id dibuat dengan 'TR-' + Math.floor(10 + Math.random() * 90),
  // yang cuma punya 80 kemungkinan angka (TR-10 s/d TR-89). Untuk RT dengan
  // puluhan KK, peluang 2 warga BERBEDA kebagian id yang SAMA PERSIS sangat
  // tinggi (>90% begitu warga terdaftar sudah 20 orang). Kalau itu terjadi,
  // SELURUH aksi admin yang mengandalkan id unik (Reset Password, Lihat
  // Password, Toggle Status, Pindah Kelompok, Hapus Warga, dst - total 13
  // tempat di kode ini) jadi salah sasaran: klik di baris warga A bisa
  // ke-apply ke warga B yang kebetulan id-nya sama, dan password salah satu
  // dari mereka bisa ikut berubah diam-diam tanpa mereka tahu (persis kasus
  // "reset password muncul nama warga lain" & "password sudah benar tapi
  // tetap tidak bisa login").
  // PERBAIKAN: id sekarang digabung dari timestamp (basis-36, hampir pasti
  // beda tiap kali dipanggil) + angka acak, LALU dicek ulang terhadap semua
  // id yang sudah ada di `members` - kalau somehow masih bentrok (sangat
  // kecil kemungkinannya), generate ulang sampai benar-benar unik.
  // ==========================================
  const generateUniqueMemberId = (existingMembers) => {
    const existingIds = new Set((existingMembers || []).map(m => m.id));
    let id;
    do {
      const basisWaktu = Date.now().toString(36).toUpperCase().slice(-5);
      const acak = Math.floor(100 + Math.random() * 900);
      id = `TR-${basisWaktu}${acak}`;
    } while (existingIds.has(id));
    return id;
  };

  // HELPER: UBAH TANGGAL (ISO "2026-07-11" ATAU FORMAT SINGKAT "11 Jul 2026")
  // MENJADI FORMAT TANGGAL INDONESIA LENGKAP. Contoh: -> '11 Juli 2026'.
  const formatTanggalIndo = (input) => {
    if (!input) return '-';
    const teks = String(input).trim();
    if (!teks) return '-';
    const namaBulanLengkap = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let y, m, d;
    const cocokIso = teks.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const cocokSingkat = teks.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/);
    if (cocokIso) {
      y = Number(cocokIso[1]); m = Number(cocokIso[2]); d = Number(cocokIso[3]);
    } else if (cocokSingkat) {
      d = Number(cocokSingkat[1]);
      const idxBulan = PETA_BULAN_KE_INDEX[cocokSingkat[2].toLowerCase()];
      m = idxBulan !== undefined ? idxBulan + 1 : NaN;
      y = Number(cocokSingkat[3]);
    }
    if (!y || !m || !d || y < 1950) return teks; // tidak dikenali -> tampilkan apa adanya
    return `${d} ${namaBulanLengkap[m - 1]} ${y}`;
  };

  // HELPER: FORMAT TANGGAL SERAGAM UNTUK LAPORAN KAS & AGENDA KEGIATAN
  // -----------------------------------------------------------
  // Dipakai supaya tampilan tanggal SAMA PERSIS di semua tempat (Laporan Kas,
  // Agenda Kegiatan) baik di akun user maupun admin, contoh hasil: "28 July 2026".
  // Bisa menerima berbagai bentuk input yang mungkin ada di data:
  //  - ISO dari <input type="date"> / Google Sheets: "2026-07-28"
  //  - Format lama singkat: "11 Jul 2026" / "01 Jun 2026"
  //  - Sudah berupa teks lain -> dikembalikan apa adanya (fallback aman)
  // Juga otomatis menyaring "tanggal kosong" dari Google Sheets yang sering
  // terbaca sebagai epoch 1899-12-30 (bug umum saat sel tanggal kosong/rusak),
  // supaya tidak tampil tanggal aneh ke warga.
  const NAMA_BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const PETA_BULAN_KE_INDEX = {
    jan: 0, januari: 0, january: 0,
    feb: 1, februari: 1, february: 1,
    mar: 2, maret: 2, march: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5, june: 5,
    jul: 6, juli: 6, july: 6,
    agu: 7, agt: 7, agustus: 7, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    okt: 9, oktober: 9, oct: 9, october: 9,
    nov: 10, november: 10,
    des: 11, desember: 11, dec: 11, december: 11,
  };
  const formatTanggalLaporan = (input) => {
    if (!input) return '-';
    if (input instanceof Date) {
      if (isNaN(input.getTime())) return '-';
      const y = input.getFullYear(), m = input.getMonth() + 1, d = input.getDate();
      if (y < 1950) return '-'; // saring bug epoch Google Sheets (1899-12-30)
      return `${d} ${NAMA_BULAN_EN[m - 1]} ${y}`;
    }
    const teks = String(input).trim();
    if (!teks) return '-';
    let y, m, d;
    const cocokIso = teks.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const cocokIndo = teks.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/);
    if (cocokIso) {
      y = Number(cocokIso[1]); m = Number(cocokIso[2]); d = Number(cocokIso[3]);
    } else if (cocokIndo) {
      d = Number(cocokIndo[1]);
      const idxBulan = PETA_BULAN_KE_INDEX[cocokIndo[2].toLowerCase()];
      m = idxBulan !== undefined ? idxBulan + 1 : NaN;
      y = Number(cocokIndo[3]);
    }
    if (!y || !m || !d || y < 1950) return teks; // tidak dikenali -> tampilkan apa adanya
    return `${d} ${NAMA_BULAN_EN[m - 1]} ${y}`;
  };
  // HELPER: BERSIHKAN NILAI "JAM" AGENDA DARI BUG EPOCH GOOGLE SHEETS
  // -----------------------------------------------------------
  // Google Sheets menyimpan nilai WAKTU (jam) sebagai pecahan hari sejak
  // tanggal dasar 30 Desember 1899. Kalau kolom "Jam" di Spreadsheet terbaca
  // sebagai objek Date murni (bukan teks), hasilnya sering muncul sebagai
  // "1899-12-30" (tanpa jam) atau "1899-12-30T12:30:00.000Z" (dengan jam).
  // Fungsi ini mengenali pola tersebut dan mengembalikan jam bersih "12:30",
  // supaya tidak pernah tampil "1899" ke warga.
  const sanitizeJamAgenda = (jamMentah) => {
    if (!jamMentah) return '';
    const teks = String(jamMentah).trim();
    if (!teks) return '';
    // Sudah berupa jam wajar, contoh "19:30" / "07.00" -> pakai apa adanya.
    if (/^\d{1,2}[.:]\d{2}$/.test(teks)) return teks.replace('.', ':');
    // Format ISO lengkap dengan bagian jam, contoh "1899-12-30T12:30:00.000Z"
    const cocokIso = teks.match(/T(\d{2}):(\d{2})/);
    if (cocokIso) return `${cocokIso[1]}:${cocokIso[2]}`;
    // Bug epoch tanpa "T", contoh "1899-12-30" -> ambil 2 segmen terakhir
    // sebagai jam:menit ("12-30" -> "12:30").
    const cocokEpoch = teks.match(/^1899-(\d{2})-(\d{2})/);
    if (cocokEpoch) return `${cocokEpoch[1]}:${cocokEpoch[2]}`;
    return teks;
  };
  // HELPER: GABUNGAN TANGGAL + JAM UNTUK AGENDA KEGIATAN, format seragam:
  // "28 July 2026 Pukul 20:00 WIB". Kalau jam kosong, tampilkan tanggal saja.
  const formatAgendaLengkap = (tanggal, jam) => {
    const tgl = formatTanggalLaporan(tanggal);
    const jamBersih = sanitizeJamAgenda(jam);
    if (!jamBersih) return tgl;
    return `${tgl} Pukul ${jamBersih} WIB`;
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
  const saveCms = (opts = {}) => {
    const { silent = false } = opts;
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
      labelKetua: cmsForm.labelKetua,
      labelSekretaris: cmsForm.labelSekretaris,
      labelBendahara: cmsForm.labelBendahara,
      labelHumas: cmsForm.labelHumas,
      fotoRTUmum: cmsForm.fotoRTUmum,
      deskripsiRT: cmsForm.deskripsiRT,
      luasRT: cmsForm.luasRT,
      infoPengumumanList: cmsForm.infoPengumumanList,
      asetRTList: cmsForm.asetRTList,
      daftarBlokRumahList: cmsForm.daftarBlokRumahList,
      daftarNomorRumahList: cmsForm.daftarNomorRumahList,
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
        daftarBlokRumahList: (teksBaru.daftarBlokRumahList || []).join('|'),
        daftarNomorRumahList: (teksBaru.daftarNomorRumahList || []).join('|'),
      }], teksBaru.appsScriptUrl);
    }
    // AUTO-SAVE: kalau dipanggil otomatis (silent=true) dari efek debounce di
    // bawah, jangan munculkan toast besar tiap kali admin selesai mengetik satu
    // huruf - cukup update indikator kecil "✓ Tersimpan otomatis" di sebelah
    // tombol Simpan. Toast besar hanya muncul saat admin klik tombol manual.
    if (silent) {
      setCmsAutoSaveStatus('saved');
      setCmsLastSaved(new Date());
    } else {
      setCmsAutoSaveStatus('saved');
      setCmsLastSaved(new Date());
      showToast('Seluruh konten website berhasil disimpan & langsung tersinkron ke semua akun warga!');
    }
  };

  // ==========================================
  // AUTO-SAVE CMS SUPER EDITOR (SETIAP PERUBAHAN LANGSUNG TERSIMPAN)
  // -----------------------------------------------------------
  // SEBELUMNYA: admin HARUS menekan tombol "Simpan Perubahan Konten" secara
  // manual setelah mengedit, dan kalau lupa/klik pindah menu duluan, perubahan
  // bisa hilang - jadi kalau cuma mau update SATU kolom saja, admin tetap harus
  // ingat menekan simpan untuk SEMUA kolom.
  // SEKARANG: setiap kali `cmsForm` berubah (admin mengetik/upload/hapus salah
  // satu kolom), sistem otomatis menyimpan & menyinkronkan SELURUH form lagi
  // ke `cmsTeks` + Google Sheets setelah admin berhenti mengetik sejenak (jeda
  // 1.2 detik, memakai teknik "debounce" supaya tidak nyimpan di setiap
  // ketikan huruf yang bisa membebani koneksi). Dengan begini, satu pembaruan
  // kolom otomatis tersimpan sendiri tanpa perlu mengedit/menekan simpan ulang
  // untuk kolom-kolom lainnya. Tombol manual "💾 Simpan Perubahan Konten" tetap
  // ada sebagai cara memaksa simpan seketika (misalnya sebelum menutup tab).
  // ==========================================
  const [cmsAutoSaveStatus, setCmsAutoSaveStatus] = useState('idle'); // idle | saving | saved
  const [cmsLastSaved, setCmsLastSaved] = useState(null);
  const cmsFormPertamaKali = useRef(true);
  useEffect(() => {
    // Lewati auto-save pada saat pertama kali form dimuat (belum ada perubahan
    // dari admin sama sekali), supaya tidak langsung "menyimpan" data yang
    // baru saja dibaca dari Sheet/localStorage.
    if (cmsFormPertamaKali.current) {
      cmsFormPertamaKali.current = false;
      return;
    }
    // Hanya aktif saat admin sedang membuka panel CMS Super Editor, supaya
    // efek ini tidak ikut jalan waktu cmsForm disinkronkan ulang dari data
    // Sheet ketika admin sedang di menu lain.
    if (!(activeMenu === 'cms-setting' && role === 'admin')) return;
    setCmsAutoSaveStatus('saving');
    const timer = window.setTimeout(() => {
      saveCms({ silent: true });
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsForm]);

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

  // UPLOAD FOTO PRODUK UMKM RT (tampil di panel "Serba-Serbi UMKM RT" Web Utama)
  const handleFotoUmkmChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('Mengunggah foto produk UMKM...', 'sukses');
    const url = await uploadFotoKeDrive(file, 'UMKM-RT');
    setFormUmkmBaru(prev => ({ ...prev, foto: url }));
    e.target.value = '';
  };

  const handleTambahUmkm = (e) => {
    e.preventDefault();
    if (!formUmkmBaru.namaProduk.trim() || !formUmkmBaru.noWa.trim()) {
      showToast('Nama produk dan nomor WhatsApp pemilik produk wajib diisi.', 'error');
      return;
    }
    if (editingUmkmId) {
      updateUmkm(umkmList.map(u => u.id === editingUmkmId ? { ...u, namaProduk: formUmkmBaru.namaProduk.trim(), deskripsi: formUmkmBaru.deskripsi.trim(), noWa: formUmkmBaru.noWa.trim(), foto: formUmkmBaru.foto } : u));
      showToast('Produk UMKM berhasil diperbarui & langsung tampil di Web Utama.');
    } else {
      updateUmkm([...umkmList, { id: 'UMKM-' + Date.now(), namaProduk: formUmkmBaru.namaProduk.trim(), deskripsi: formUmkmBaru.deskripsi.trim(), noWa: formUmkmBaru.noWa.trim(), foto: formUmkmBaru.foto }]);
      showToast('Produk UMKM berhasil ditambahkan & langsung tampil di Web Utama untuk semua akun.');
    }
    setFormUmkmBaru({ namaProduk: '', deskripsi: '', noWa: '', foto: null });
    setEditingUmkmId(null);
  };

  const handleEditUmkm = (item) => {
    setEditingUmkmId(item.id);
    setFormUmkmBaru({ namaProduk: item.namaProduk, deskripsi: item.deskripsi, noWa: item.noWa, foto: item.foto });
  };

  const handleHapusUmkm = (id) => {
    updateUmkm(umkmList.filter(u => u.id !== id));
    if (editingUmkmId === id) { setEditingUmkmId(null); setFormUmkmBaru({ namaProduk: '', deskripsi: '', noWa: '', foto: null }); }
    showToast('Produk UMKM berhasil dihapus.', 'error');
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

  // KELOLA PILIHAN BLOK RUMAH (dropdown Form Pendaftaran) - tambah/hapus
  // sendiri oleh Admin lewat CMS Super Editor, menggantikan daftar F1-F14/
  // G1-G6 yang sebelumnya hardcode di kode.
  const [inputBlokRumahBaru, setInputBlokRumahBaru] = useState('');
  const handleTambahBlokRumah = (e) => {
    e.preventDefault();
    const nilaiBaru = inputBlokRumahBaru.trim();
    if (!nilaiBaru) return;
    if ((cmsForm.daftarBlokRumahList || []).includes(nilaiBaru)) {
      showToast('Blok tersebut sudah ada di daftar.', 'error');
      return;
    }
    setCmsForm(prev => ({ ...prev, daftarBlokRumahList: [...(prev.daftarBlokRumahList || []), nilaiBaru] }));
    setInputBlokRumahBaru('');
  };
  const handleHapusBlokRumah = (idx) => {
    setCmsForm(prev => ({ ...prev, daftarBlokRumahList: (prev.daftarBlokRumahList || []).filter((_, i) => i !== idx) }));
  };

  // KELOLA PILIHAN NOMOR RUMAH (dropdown Form Pendaftaran) - tambah/hapus
  // sendiri oleh Admin lewat CMS Super Editor.
  const [inputNomorRumahBaru, setInputNomorRumahBaru] = useState('');
  const handleTambahNomorRumah = (e) => {
    e.preventDefault();
    const nilaiBaru = inputNomorRumahBaru.trim();
    if (!nilaiBaru) return;
    if ((cmsForm.daftarNomorRumahList || []).includes(nilaiBaru)) {
      showToast('Nomor tersebut sudah ada di daftar.', 'error');
      return;
    }
    setCmsForm(prev => ({ ...prev, daftarNomorRumahList: [...(prev.daftarNomorRumahList || []), nilaiBaru] }));
    setInputNomorRumahBaru('');
  };
  const handleHapusNomorRumah = (idx) => {
    setCmsForm(prev => ({ ...prev, daftarNomorRumahList: (prev.daftarNomorRumahList || []).filter((_, i) => i !== idx) }));
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
    if (editingRealisasiId) {
      // MODE EDIT: simpan perubahan pada baris realisasi yang sudah ada (bukan menambah baris baru)
      updateRealisasiBelanja(prev => prev.map(r => r.id === editingRealisasiId ? {
        ...r,
        tanggal: formRealisasiBaru.tanggal ? formatTanggalIndo(formRealisasiBaru.tanggal) : r.tanggal,
        kategori: formRealisasiBaru.kategori,
        keterangan: formRealisasiBaru.keterangan.trim(),
        nominal: Number(formRealisasiBaru.nominal) || 0,
        kelompok: formRealisasiBaru.kelompok,
        buktiUrl: formRealisasiBaru.buktiUrl,
        buktiNamaFile: formRealisasiBaru.buktiNamaFile,
      } : r));
      showToast('Perubahan data realisasi belanja berhasil disimpan.');
      setEditingRealisasiId(null);
      setFormRealisasiBaru({ tanggal: '', kategori: 'Kebersihan', keterangan: '', nominal: '', kelompok: 'Semua', buktiUrl: null, buktiNamaFile: null });
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
      dicatatOleh: `${getBendaharaRtNama()} (Bendahara)`
    }]);
    showToast('Realisasi belanja kas RT berhasil dicatat & langsung tampil di Dashboard Warga.');
    setFormRealisasiBaru({ tanggal: '', kategori: 'Kebersihan', keterangan: '', nominal: '', kelompok: 'Semua', buktiUrl: null, buktiNamaFile: null });
  };

  const handleHapusRealisasiBelanja = (id) => {
    updateRealisasiBelanja(prev => prev.filter(r => r.id !== id));
    if (editingRealisasiId === id) handleBatalEditRealisasiBelanja();
    showToast('Data realisasi belanja dihapus.', 'error');
  };

  // Mulai mode edit satu baris realisasi belanja: isi ulang form dengan data baris terpilih.
  const handleEditRealisasiBelanja = (r) => {
    setEditingRealisasiId(r.id);
    setFormRealisasiBaru({
      tanggal: '', // tanggal dibiarkan kosong (opsional diisi ulang); kalau tidak diisi, tanggal lama tetap dipakai
      kategori: r.kategori,
      keterangan: r.keterangan,
      nominal: String(r.nominal),
      kelompok: r.kelompok || 'Semua',
      buktiUrl: r.buktiUrl || null,
      buktiNamaFile: r.buktiNamaFile || null,
    });
    showToast(`Mode edit aktif untuk data: "${r.keterangan}". Ubah field yang perlu lalu simpan.`, 'sukses');
  };

  const handleBatalEditRealisasiBelanja = () => {
    setEditingRealisasiId(null);
    setFormRealisasiBaru({ tanggal: '', kategori: 'Kebersihan', keterangan: '', nominal: '', kelompok: 'Semua', buktiUrl: null, buktiNamaFile: null });
  };

  // ==========================================
  // KELOLA KATEGORI REALISASI BELANJA (TAMBAH/EDIT/HAPUS)
  // -----------------------------------------------------------
  // Kategori disimpan di kategoriBelanjaList (state) supaya bisa disesuaikan
  // admin, bukan daftar tetap. Saat kategori di-EDIT (rename), seluruh data
  // realisasiBelanja yang sebelumnya memakai nama kategori lama otomatis ikut
  // diperbarui ke nama baru supaya data tetap konsisten/tidak "nyangkut".
  // ==========================================
  const handleTambahKategoriBelanja = (e) => {
    e.preventDefault();
    const nama = formKategoriBaru.trim();
    if (!nama) { showToast('Nama kategori wajib diisi.', 'error'); return; }
    if (kategoriBelanjaList.some(k => k.toLowerCase() === nama.toLowerCase())) {
      showToast(`Kategori "${nama}" sudah ada.`, 'error');
      return;
    }
    setKategoriBelanjaList(prev => [...prev, nama]);
    setFormKategoriBaru('');
    showToast(`Kategori "${nama}" berhasil ditambahkan.`);
  };

  const handleMulaiEditKategoriBelanja = (idx) => {
    setEditingKategoriIdx(idx);
    setFormEditKategori(kategoriBelanjaList[idx]);
  };

  const handleBatalEditKategoriBelanja = () => {
    setEditingKategoriIdx(null);
    setFormEditKategori('');
  };

  const handleSimpanEditKategoriBelanja = (idx) => {
    const namaBaru = formEditKategori.trim();
    if (!namaBaru) { showToast('Nama kategori wajib diisi.', 'error'); return; }
    const namaLama = kategoriBelanjaList[idx];
    if (kategoriBelanjaList.some((k, i) => i !== idx && k.toLowerCase() === namaBaru.toLowerCase())) {
      showToast(`Kategori "${namaBaru}" sudah ada.`, 'error');
      return;
    }
    setKategoriBelanjaList(prev => prev.map((k, i) => i === idx ? namaBaru : k));
    // Cascade: perbarui juga kategori pada data realisasi belanja yang sudah tercatat
    // memakai nama kategori lama, supaya tetap konsisten dengan nama yang baru.
    if (namaLama !== namaBaru) {
      updateRealisasiBelanja(prev => prev.map(r => r.kategori === namaLama ? { ...r, kategori: namaBaru } : r));
      if (formRealisasiBaru.kategori === namaLama) setFormRealisasiBaru(prev => ({ ...prev, kategori: namaBaru }));
    }
    setEditingKategoriIdx(null);
    setFormEditKategori('');
    showToast(`Kategori "${namaLama}" berhasil diubah menjadi "${namaBaru}".`);
  };

  const handleHapusKategoriBelanja = (idx) => {
    const nama = kategoriBelanjaList[idx];
    const jumlahDipakai = realisasiBelanja.filter(r => r.kategori === nama).length;
    const ok = window.confirm(`Hapus kategori "${nama}"?${jumlahDipakai > 0 ? `\n\n${jumlahDipakai} data realisasi belanja masih memakai kategori ini dan TIDAK akan ikut terhapus (kategorinya tetap tersimpan di data lama).` : ''}`);
    if (!ok) return;
    setKategoriBelanjaList(prev => prev.filter((_, i) => i !== idx));
    if (formRealisasiBaru.kategori === nama) {
      setFormRealisasiBaru(prev => ({ ...prev, kategori: kategoriBelanjaList.find((k, i) => i !== idx) || '' }));
    }
    showToast(`Kategori "${nama}" dihapus.`, 'error');
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
        daftarBlokRumahList: (teksBaru.daftarBlokRumahList || []).join('|'),
        daftarNomorRumahList: (teksBaru.daftarNomorRumahList || []).join('|'),
      }]);
    }
    showToast('Logo RT berhasil diperbarui & langsung tampil untuk semua akun.');
    e.target.value = '';
  };

  const handleUpdateUserGroup = (userId, kelompokBaru) => {
    const member = members.find(m => m.id === userId);
    if (!member) return;
    const kelompokLama = member.kelompok;
    // PERBAIKAN RACE CONDITION: bentuk fungsi (prev => ...) supaya array
    // selalu disusun dari state PALING BARU, bukan snapshot `members` lama
    // yang bisa ketinggalan kalau ada aksi admin lain terjadi hampir
    // bersamaan (lihat catatan lengkap di handleApproveMemberBaru).
    updateMembers(prev => prev.map(m => (m.id === userId ? { ...m, kelompok: kelompokBaru } : m)));
    if (activeUserSession.id === userId) setActiveUserSession(prev => ({ ...prev, kelompok: kelompokBaru }));

    if (kelompokLama !== kelompokBaru) {
      setRiwayatPindahKelompok(prev => [...prev, {
        id: 'MOV-' + Date.now(),
        memberNama: member.nama,
        dari: kelompokLama,
        ke: kelompokBaru,
        tanggal: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
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

  // Hapus 1 blok/kelompok dari daftar (mis. blok lama/tidak relevan seperti
  // sisa contoh "Kelompok Sapi A/B/C" dari data awal). Kalau masih ada warga
  // yang terdaftar di blok tsb, admin diminta memindahkan warganya dulu lewat
  // "Panel Kontrol Anggota" supaya tidak ada warga yang jadi "nyangkut" tanpa blok.
  const handleHapusKelompok = (k) => {
    const jumlahWargaDiBlok = members.filter(m => cocokBlok(m.kelompok, k.nama)).length;
    if (jumlahWargaDiBlok > 0) {
      showToast(`Tidak bisa menghapus "${k.nama}" karena masih ada ${jumlahWargaDiBlok} warga terdaftar di blok ini. Pindahkan warganya dulu lewat Panel Kontrol Anggota.`, 'error');
      return;
    }
    if (!window.confirm(`Hapus blok/kelompok "${k.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    updateKelompok(kelompokList.filter(x => x.id !== k.id));
    if (editingKelompokId === k.id) handleBatalEditKelompok();
    showToast(`Blok/kelompok "${k.nama}" berhasil dihapus.`, 'error');
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
  // tunggakanId (opsional): diisi kalau warga sedang melunasi TUNGGAKAN
  // (tagihan lama yang dibawa dari periode yang sudah ditutup admin),
  // bukan tagihan bulan berjalan biasa. Lihat bagian "TUNGGAKAN" di
  // Dashboard Warga untuk tempat tombol Upload Bukti tunggakan dipanggil.
  const handleUploadBayar = (e, bulanNama, tanggalBayar, nominal, tunggakanId = null) => {
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
    setKonfirmasiUploadBukti({ file, bulanNama, tanggalBayar, nominal, tunggakanId });
    e.target.value = '';
  };

  // Dijalankan setelah warga menekan tombol "Kirim" di modal konfirmasi upload bukti.
  const handleKonfirmasiKirimBukti = async () => {
    if (!konfirmasiUploadBukti) return;
    const { file, bulanNama, tanggalBayar, nominal, tunggakanId } = konfirmasiUploadBukti;
    setKonfirmasiUploadBukti(null);

    // ==========================================
    // JALUR SIMULASI (isSimulatedSession) - 100% LOKAL & TERISOLASI
    // -----------------------------------------------------------
    // TIDAK upload file ke Google Drive sungguhan, TIDAK menulis ke
    // iuranMatrix/tunggakanList asli, TIDAK mengirim notifikasi ke Admin asli,
    // dan TIDAK sync ke Google Sheets. Supaya pengunjung yang cuma mencoba
    // tombol "🧪 Simulasi Akun Pengguna" tetap bisa merasakan alur pembayaran
    // & kuitansi lengkap (Menunggu Verifikasi -> otomatis LUNAS -> Kuitansi),
    // tanpa data contohnya pernah nyangkut ke Dashboard Admin/Bendahara asli.
    // ==========================================
    if (isSimulatedSession) {
      showToast('(Simulasi) Mengunggah bukti transfer...', 'sukses');
      const buktiUrlSimulasi = buatBuktiDummy(`${activeUserSession.nama} - ${bulanNama} (Simulasi)`, '#b45309');

      if (tunggakanId) {
        setSimTunggakanList(prev => prev.map(t => t.id === tunggakanId ? {
          ...t,
          nominal: Number(nominal),
          status: 'MENUNGGU VERIFIKASI',
          tglBayar: formatTanggalIndo(tanggalBayar),
          buktiUrl: buktiUrlSimulasi,
          buktiNamaFile: file.name
        } : t));
        setFormBayarInput(prev => { const next = { ...prev }; delete next[`TGK-${tunggakanId}`]; return next; });
        showToast(`(Simulasi) Bukti pelunasan tunggakan ${bulanNama} terkirim! Menunggu verifikasi contoh Bendahara.`);
        // Auto-verifikasi lokal setelah beberapa detik supaya alur kuitansi
        // ikut bisa dicoba/didemokan, tanpa perlu admin sungguhan.
        window.setTimeout(() => {
          const waktuVerifikasi = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
          setSimTunggakanList(prev => prev.map(t => t.id === tunggakanId ? { ...t, status: 'LUNAS', waktuVerifikasi } : t));
          showToast(`(Simulasi) Pelunasan tunggakan ${bulanNama} otomatis diverifikasi contoh Bendahara demo. Kuitansi sudah bisa dilihat.`);
        }, 3500);
        return;
      }

      const recordBaruSimulasi = {
        userNama: activeUserSession.nama,
        bulanId: DAFTAR_BULAN.find(b => b.nama === bulanNama).id,
        bulanNama,
        nominal: Number(nominal),
        status: 'MENUNGGU VERIFIKASI',
        tglBayar: formatTanggalIndo(tanggalBayar),
        buktiUrl: buktiUrlSimulasi,
        buktiNamaFile: file.name
      };
      setSimIuranMatrix(prev => {
        const sudahAda = prev.some(item => item.userNama === activeUserSession.nama && item.bulanNama === bulanNama);
        return sudahAda
          ? prev.map(item => (item.userNama === activeUserSession.nama && item.bulanNama === bulanNama) ? recordBaruSimulasi : item)
          : [...prev, recordBaruSimulasi];
      });
      setFormBayarInput(prev => { const next = { ...prev }; delete next[bulanNama]; return next; });
      showToast(`(Simulasi) Bukti transfer ${bulanNama} terkirim! Menunggu verifikasi contoh Bendahara.`);
      // Auto-verifikasi lokal (bukan verifikasi Admin sungguhan) supaya status
      // LUNAS & tombol "Lihat Kuitansi" ikut bisa dicoba dalam mode simulasi.
      window.setTimeout(() => {
        const waktuVerifikasi = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
        setSimIuranMatrix(prev => prev.map(item => (item.userNama === activeUserSession.nama && item.bulanNama === bulanNama) ? { ...item, status: 'LUNAS', waktuVerifikasi } : item));
        showToast(`(Simulasi) Pembayaran ${bulanNama} otomatis diverifikasi contoh Bendahara demo. Kuitansi sudah bisa dilihat.`);
      }, 3500);
      return;
    }

    // ==========================================
    // JALUR AKUN ASLI (sudah terdaftar & login resmi) - TERHUBUNG ke Admin & Sheets
    // ==========================================
    showToast('Mengunggah bukti transfer...', 'sukses');
    // Bukti transfer diupload sebagai FILE ASLI ke Google Drive (folder "Bukti-Transfer"),
    // bukan base64 di sel Sheet, supaya file besar tidak gagal tersimpan (batas ~50.000
    // karakter/sel Google Sheets). Yang disimpan ke Sheet & state hanya URL Drive-nya.
    const buktiUrl = await uploadFotoKeDrive(file, 'Bukti-Transfer');

    // ALUR PELUNASAN TUNGGAKAN (tagihan lama lintas periode) - beda tabel
    // dari iuran bulan berjalan, lihat updateTunggakan di atas.
    if (tunggakanId) {
      updateTunggakan(prev => prev.map(t => t.id === tunggakanId ? {
        ...t,
        nominal: Number(nominal),
        status: 'MENUNGGU VERIFIKASI',
        tglBayar: formatTanggalIndo(tanggalBayar),
        buktiUrl,
        buktiNamaFile: file.name
      } : t));
      setFormBayarInput(prev => { const next = { ...prev }; delete next[`TGK-${tunggakanId}`]; return next; });
      tambahNotifikasi({
        untuk: 'admin',
        judul: 'Menunggu Verifikasi Tunggakan',
        pesan: `${activeUserSession.nama} mengupload bukti pelunasan TUNGGAKAN bulan ${bulanNama} sebesar Rp ${Number(nominal).toLocaleString('id-ID')}.`,
        tipe: 'pending'
      });
      showToast(`Bukti pelunasan tunggakan ${bulanNama} berhasil diunggah! Menunggu verifikasi Bendahara.`);
      return;
    }

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

  const handleApprovePembayaran = (userNama, bulanNama, tunggakanId = null) => {
    // Catat tanggal & jam pelunasan (waktu nyata saat Bendahara memverifikasi)
    // supaya bisa ditampilkan lengkap (tanggal + jam) di Kuitansi Digital & QR verifikasi.
    const waktuVerifikasi = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
    if (tunggakanId) {
      updateTunggakan(prev => prev.map(t => t.id === tunggakanId ? { ...t, status: 'LUNAS', waktuVerifikasi } : t));
    } else {
      updateIuran(iuranMatrix.map(item => (item.userNama === userNama && item.bulanNama === bulanNama) ? { ...item, status: 'LUNAS', waktuVerifikasi } : item));
    }
    const targetMember = members.find(m => m.nama === userNama);
    if (targetMember) {
      tambahNotifikasi({
        untuk: targetMember.id,
        judul: 'Pembayaran Disetujui ✅',
        pesan: tunggakanId
          ? `Pelunasan TUNGGAKAN bulan ${bulanNama} Anda telah diverifikasi & disetujui Bendahara. Dana sudah masuk.`
          : `Pembayaran iuran bulan ${bulanNama} Anda telah diverifikasi & disetujui Bendahara. Dana sudah masuk.`,
        tipe: 'sukses'
      });
    }
    showToast(`Pembayaran ${userNama} bulan ${bulanNama} disetujui.`);
  };

  const handleRejectPembayaran = (userNama, bulanNama, tunggakanId = null) => {
    if (tunggakanId) {
      // Tunggakan TIDAK dihapus baris-nya (supaya tagihan tetap tercatat &
      // termonitor) - cukup dikembalikan ke status "BELUM BAYAR" supaya
      // warga bisa upload ulang bukti transfer yang benar.
      updateTunggakan(prev => prev.map(t => t.id === tunggakanId ? { ...t, status: 'BELUM BAYAR', tglBayar: null, buktiUrl: null, buktiNamaFile: null } : t));
    } else {
      updateIuran(iuranMatrix.filter(item => !(item.userNama === userNama && item.bulanNama === bulanNama)));
    }
    const targetMember = members.find(m => m.nama === userNama);
    if (targetMember) {
      tambahNotifikasi({
        untuk: targetMember.id,
        judul: 'Pembayaran Ditolak ✕',
        pesan: tunggakanId
          ? `Bukti pelunasan TUNGGAKAN bulan ${bulanNama} Anda ditolak Bendahara. Silakan upload ulang bukti transfer yang sesuai.`
          : `Bukti transfer iuran bulan ${bulanNama} Anda ditolak Bendahara. Silakan upload ulang bukti transfer yang sesuai.`,
        tipe: 'gagal'
      });
    }
    showToast(`Pembayaran ${userNama} ditolak.`, 'error');
  };

  // Dipanggil saat admin/bendahara menekan "Ya, Sudah Sesuai" atau "Tidak, Tolak"
  // pada modal konfirmasi verifikasi pembayaran.
  const handleKonfirmasiVerifikasi = (sudahSesuai) => {
    if (!konfirmasiApprove) return;
    const { userNama, bulanNama, dariPreview, tunggakanId } = konfirmasiApprove;
    if (sudahSesuai) {
      handleApprovePembayaran(userNama, bulanNama, tunggakanId || null);
    } else {
      handleRejectPembayaran(userNama, bulanNama, tunggakanId || null);
    }
    setKonfirmasiApprove(null);
    if (dariPreview) setPreviewBukti(null);
  };

  // ==========================================
  // MONITORING TUNGGAKAN - HELPER RINGKASAN UNTUK ADMIN
  // -----------------------------------------------------------
  // Dipakai di menu "Monitoring Tunggakan" (khusus admin) supaya admin bisa
  // langsung lihat siapa saja yang masih menunggak setelah periode ditutup,
  // berapa total nilainya, dan dari periode mana tunggakan itu berasal.
  // ==========================================
  const tunggakanBelumLunas = tunggakanList.filter(t => t.status !== 'LUNAS');
  const totalTunggakanBelumLunas = tunggakanBelumLunas.reduce((acc, t) => acc + Number(t.nominal || 0), 0);
  const jumlahWargaMenunggak = new Set(tunggakanBelumLunas.map(t => t.userNama)).size;
  const rekapTunggakanPerWarga = () => {
    const map = {};
    tunggakanBelumLunas.forEach(t => {
      if (!map[t.userNama]) {
        map[t.userNama] = { userNama: t.userNama, nomorRumah: t.nomorRumah, kelompok: t.kelompok, items: [], total: 0 };
      }
      map[t.userNama].items.push(t);
      map[t.userNama].total += Number(t.nominal || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  };

  const toggleStatusAnggota = (id) => {
    updateMembers(prev => prev.map(m => m.id === id ? { ...m, statusAnggota: m.statusAnggota === 'Aktif' ? 'Pasif' : 'Aktif' } : m));
  };

  // ==========================================
  // HAPUS WARGA BERSTATUS PASIF (ADMIN)
  // -----------------------------------------------------------
  // Untuk menjaga data tidak terhapus tidak sengaja, admin HANYA bisa
  // menghapus permanen akun yang statusnya sudah "Pasif" (bukan Aktif).
  // Warga yang masih Aktif harus di-nonaktifkan (toggleStatusAnggota)
  // dulu sebelum bisa dihapus.
  // ==========================================
  const handleHapusMemberPasif = (member) => {
    if (member.statusAnggota !== 'Pasif') {
      showToast('Hanya warga berstatus Pasif yang bisa dihapus. Nonaktifkan dulu status warga ini.', 'error');
      return;
    }
    const ok = window.confirm(`Hapus PERMANEN akun "${member.nama}" (${member.nomorRumah || '-'})?\n\nSeluruh data profil warga ini (bukan riwayat iuran/kuitansi yang sudah tercatat) akan dihapus dan tidak bisa dikembalikan.`);
    if (!ok) return;
    updateMembers(prev => prev.filter(m => m.id !== member.id));
    setSelectedMemberIds(prev => prev.filter(id => id !== member.id));
    showToast(`Akun warga "${member.nama}" (Pasif) berhasil dihapus permanen.`, 'error');
  };

  // Hapus massal seluruh warga Pasif yang sedang tercentang admin.
  const handleHapusMemberPasifMassal = (idsTarget) => {
    const targetPasif = members.filter(m => idsTarget.includes(m.id) && m.statusAnggota === 'Pasif');
    if (targetPasif.length === 0) {
      showToast('Tidak ada warga berstatus Pasif pada centang saat ini. Hanya warga Pasif yang bisa dihapus.', 'error');
      return;
    }
    const ok = window.confirm(`Hapus PERMANEN ${targetPasif.length} akun warga berstatus Pasif yang dipilih?\n\nTindakan ini tidak bisa dibatalkan.`);
    if (!ok) return;
    const idPasif = new Set(targetPasif.map(m => m.id));
    updateMembers(prev => prev.filter(m => !idPasif.has(m.id)));
    setSelectedMemberIds(prev => prev.filter(id => !idPasif.has(id)));
    showToast(`${targetPasif.length} akun warga Pasif berhasil dihapus permanen.`, 'error');
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
    updateMembers(prev => prev.map(m => idsTarget.includes(m.id) ? { ...m, statusAnggota: statusBaru } : m));
    setSelectedMemberIds([]);
    showToast(`${idsTarget.length} anggota berhasil diubah menjadi status ${statusBaru}.`);
  };

  // ==========================================
  // LOGIN RESMI WARGA (USERNAME & PASSWORD) DARI WEB UTAMA
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    // ==========================================
    // LOGIN SUPER ADMIN - SATU FORM DENGAN LOGIN WARGA (WEB UTAMA)
    // -----------------------------------------------------------
    // Tidak ada lagi form/modal Admin Panel yang terpisah. Kalau username &
    // password yang diketik di form ini cocok dengan akun Super Admin
    // (adminAccount, bawaan admin/admin123, bisa diganti lewat menu "Ubah
    // Login Admin Panel"), sistem langsung memberi akses Admin penuh dari
    // sini juga - tanpa perlu tautan/tombol tersembunyi apa pun. Akun Admin
    // ini memang tidak disimpan di Google Sheets, jadi tetap dicek lokal.
    // .trim() dipakai di username & password supaya spasi tak sengaja dari
    // keyboard HP (autocorrect/autocapitalize) tidak bikin login gagal.
    // ==========================================
    if (
      formLogin.username.trim().toLowerCase() === adminAccount.username.trim().toLowerCase() &&
      formLogin.password.trim() === adminAccount.password.trim()
    ) {
      setRole('admin');
      setAdminLoggedIn(true);
      setIsSimulatedSession(false);
      setView('dashboard');
      setActiveMenu('dashboard');
      setFormLogin({ username: '', password: '' });
      showToast('Selamat datang, Admin/Bendahara! Anda login dengan akses Admin (penuh).');
      setIsLoggingIn(false);
      return;
    }

    // ==========================================
    // LOGIN WARGA - DIVERIFIKASI DI SERVER (Apps Script), BUKAN di browser.
    // -----------------------------------------------------------
    // PERBAIKAN KEAMANAN: sebelumnya seluruh daftar password warga harus
    // ikut dikirim ke browser SEMUA orang supaya bisa dicocokkan di sini
    // (members.find(...)). Sekarang password TIDAK PERNAH dikirim ke
    // browser - pencocokan username/password dilakukan di Code.gs, dan
    // yang dikembalikan ke sini hanya data profil warga tanpa password.
    // ==========================================
    if (!cmsTeks.appsScriptUrl) {
      setLoginError('Google Sheets belum tersambung, hubungi pengurus RT.');
      setIsLoggingIn(false);
      return;
    }

    try {
      const hasil = await sheetFetch(cmsTeks.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', username: formLogin.username.trim(), password: formLogin.password.trim() })
      });

      if (!hasil || hasil.error || !hasil.member) {
        setLoginError('Username atau password salah. Periksa kembali email aktivasi/reset password Anda.');
        return;
      }

      const found = { ...hasil.member, target: Number(hasil.member.target) || 0, anggotaKeluarga: parseAnggotaKeluarga(hasil.member.anggotaKeluarga) };
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
        setAdminLoggedIn(false);
      }
      setView('dashboard');
      setActiveMenu('dashboard');
      setFormLogin({ username: '', password: '' });
      showToast(`Selamat datang, ${found.nama}!${found.akses === 'admin' ? ' Anda login dengan akses Admin (penuh).' : ''}`);
    } catch (err) {
      setLoginError('Gagal menghubungi server, cek koneksi internet Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ==========================================
  // LOGOUT ADMIN/PANITIA
  // ==========================================
  const handleAdminLogout = () => {
    setAdminLoggedIn(false);
    setRole('user');
    setView('landing');
    setActiveMenu('dashboard');
    showToast('Berhasil keluar dari Admin Panel.');
  };

  // ==========================================
  // LOGOUT WARGA (AKUN USER)
  // -----------------------------------------------------------
  // Berlaku untuk warga yang BENAR-BENAR login (isSimulatedSession false),
  // bukan yang cuma sedang "coba lihat" lewat Simulasi Akun Pengguna.
  // Setelah logout: sesi dikembalikan ke mode simulasi (aman, tidak lagi
  // menampilkan data pribadi warga tsb di layar), dan halaman diarahkan
  // balik ke Web Utama supaya warga bisa login ulang lewat form Login
  // kalau perlu.
  // ==========================================
  const handleUserLogout = () => {
    setActiveUserSession(members[0]);
    setIsSimulatedSession(true);
    setRole('user');
    setView('landing');
    setActiveMenu('dashboard');
    setFormLogin({ username: '', password: '' });
    setFormUbahPassword({ lama: '', baru: '', konfirmasi: '' });
    setPasswordMsg({ tipe: '', teks: '' });
    showToast('Berhasil keluar dari akun.');
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
    const akunBaru = { username: formAdminAccount.username.trim() || adminAccount.username, password: formAdminAccount.passwordBaru };
    setAdminAccount(akunBaru);
    // SIMPAN KE LOCALSTORAGE - supaya login Admin dengan username/password
    // baru ini tetap berlaku setiap kali Admin Panel dibuka lagi di browser
    // yang sama (tidak balik ke admin/admin123 begitu halaman di-refresh).
    try {
      window.localStorage.setItem('iuran_rt_admin_account', JSON.stringify(akunBaru));
    } catch (err) { /* localStorage tidak tersedia, abaikan */ }
    setFormAdminAccount({ username: akunBaru.username, password: '', passwordBaru: '', konfirmasiPassword: '' });
    setAdminAccountMsg({ tipe: 'success', teks: 'Username & password login Admin Panel berhasil diperbarui.' });
    showToast('Akun login Admin Panel berhasil diperbarui.');
  };

  // ==========================================
  // RESET AKUN ADMIN KE BAWAAN (admin/admin123) - JALAN DARURAT
  // -----------------------------------------------------------
  // Kalau Panitia lupa password yang pernah diganti / password baru
  // ternyata tidak tersimpan di device tertentu, tombol ini menghapus
  // akun Admin yang tersimpan di localStorage browser tersebut dan
  // mengembalikannya ke bawaan admin/admin123, supaya tidak pernah
  // benar-benar terkunci dari Admin Panel.
  // ==========================================
  const handleResetAdminAccountKeDefault = () => {
    const akunDefault = { username: 'admin', password: 'admin123' };
    setAdminAccount(akunDefault);
    try {
      window.localStorage.removeItem('iuran_rt_admin_account');
    } catch (err) { /* abaikan */ }
    setFormAdminAccount({ username: akunDefault.username, password: '', passwordBaru: '', konfirmasiPassword: '' });
    setAdminAccountMsg({ tipe: 'success', teks: 'Akun login Admin Panel di browser ini dikembalikan ke bawaan (admin/admin123).' });
    showToast('Akun Admin dikembalikan ke bawaan admin/admin123.');
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

  // Kosongkan form (BUKAN data yang sudah tersimpan) supaya admin bisa mulai
  // mengisi Agenda Utama yang benar-benar BARU dari nol, tanpa harus
  // menghapus satu-satu isian lama dulu. Data lama tetap tampil di Beranda
  // sampai admin menekan "Simpan Agenda Utama" dengan isian yang baru ini.
  const handleBuatAgendaUtamaBaru = () => {
    setFormAgendaUtama({ judul: '', tanggal: '', jam: '', tempat: '', pembicara: '', detail: '', foto: null });
    showToast('Form dikosongkan, silakan isi Agenda Utama yang baru lalu tekan Simpan.');
  };

  // Menghapus Agenda Utama yang sedang aktif (mis. kegiatan sudah lewat &
  // belum ada penggantinya) -> kotak "Agenda Utama" otomatis hilang dari
  // Beranda sampai admin mengisi & menyimpan yang baru lagi.
  const handleHapusAgendaUtama = () => {
    if (!agendaUtama.judul) {
      showToast('Belum ada Agenda Utama yang tersimpan.', 'error');
      return;
    }
    const ok = window.confirm('Hapus Agenda Utama yang sedang tampil di Beranda? Kotak Agenda Utama akan hilang sampai diisi ulang.');
    if (!ok) return;
    const kosong = { judul: '', tanggal: '', jam: '', tempat: '', pembicara: '', detail: '', foto: null };
    updateAgendaUtama(kosong);
    setFormAgendaUtama(kosong);
    showToast('Agenda utama dihapus dari Beranda.', 'error');
  };

  const handleUserMendaftar = async (e) => {
    e.preventDefault();
    if (isDaftarLoading) return; // sudah ada proses submit berjalan, jangan proses lagi (anti double-submit)
    if (!formDaftar.blokRumah || !formDaftar.nomorRumahUnit) {
      showToast('Blok Rumah dan Nomor Rumah wajib dipilih.', 'error');
      return;
    }
    // ==========================================
    // KUNCI PENDAFTARAN GANDA (SATU BLOK + NOMOR RUMAH = SATU AKUN)
    // -----------------------------------------------------------
    // LAPISAN 1 (cepat, di browser): dicek dulu terhadap DUA sumber yang ada
    // di memori saat ini: (1) `members` -> akun yang sudah aktif, dan
    // (2) `pengajuanBaru` -> pendaftaran lain yang masih menunggu aktivasi
    // admin. Ini kasih feedback INSTAN ke warga tanpa perlu tunggu server.
    // PENGECUALIAN: kalau akun LAMA di Blok & Nomor Rumah itu sudah di-set
    // "Pasif" oleh admin (mis. penghuni lama sudah pindah/tidak aktif),
    // kunci ini OTOMATIS TERBUKA - warga baru/pengganti di alamat yang sama
    // tetap boleh mendaftar seperti biasa.
    //
    // LAPISAN 2 (pasti, di server - lihat prosesDaftarWargaBaru di Code.gs):
    // PERBAIKAN BUG - dua warga PERNAH lolos daftar di Blok+Nomor Rumah yang
    // SAMA karena keduanya submit HAMPIR BERSAMAAN, sebelum salah satu
    // pendaftaran sempat "terlihat" oleh browser yang satunya (race
    // condition khas validasi client-only). Makanya submit akhir SEKARANG
    // WAJIB lewat server (kalau Google Sheets sudah tersambung), yang
    // memakai LockService supaya permintaan diproses SATU PER SATU secara
    // berurutan & selalu membaca data TERBARU langsung dari Sheet - jadi
    // walau dua orang klik "Daftar" persis bersamaan, yang kedua akan
    // tetap ditolak dengan benar.
    // ==========================================
    const nomorRumahGabunganCek = `Blok ${formDaftar.blokRumah} No. ${formDaftar.nomorRumahUnit}`;
    const sudahAdaAkunAktif = members.some(m => (m.nomorRumah || '').trim().toLowerCase() === nomorRumahGabunganCek.trim().toLowerCase() && m.statusAnggota !== 'Pasif');
    const sudahAdaPengajuanLain = pengajuanBaru.some(r => (r.nomorRumah || '').trim().toLowerCase() === nomorRumahGabunganCek.trim().toLowerCase());
    if (sudahAdaAkunAktif || sudahAdaPengajuanLain) {
      showToast(`Blok dan nomor rumah sudah ada, silakan hubungi Pengurus RT untuk aktivasinya.`, 'error');
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
    // Baris Kepala Keluarga SELALU ada (dikunci di awal), jadi di sini cukup
    // dipastikan tanggal lahir & jenis kelaminnya sudah dilengkapi warga -
    // namanya sendiri sudah otomatis terisi dari "Nama Kepala Keluarga".
    const barisKK = formDaftar.anggotaKeluarga.find(a => a.id === ID_BARIS_KEPALA_KELUARGA);
    if (!barisKK || !barisKK.tanggalLahir) {
      showToast('Lengkapi tanggal lahir & jenis kelamin Kepala Keluarga (Anda) di bagian Anggota Keluarga.', 'error');
      return;
    }
    for (const a of formDaftar.anggotaKeluarga) {
      if (!a.nama.trim() || !a.tanggalLahir) {
        showToast('Nama dan tanggal lahir setiap anggota keluarga wajib diisi lengkap.', 'error');
        return;
      }
    }
    const nomorRumahGabungan = nomorRumahGabunganCek;
    const dataPendaftaran = {
      id: 'REQ-' + Math.floor(100 + Math.random() * 900),
      nama: formDaftar.nama, nomorRumah: nomorRumahGabungan, email: formDaftar.email, wa: formDaftar.wa, alamat: formDaftar.alamat, target: TARGET_TAHUNAN, tglDaftar: '11 Jul 2026',
      statusRumah: formDaftar.statusRumah, anggotaKeluarga: formDaftar.anggotaKeluarga
    };

    // LAPISAN 2: verifikasi & simpan lewat server (kalau Google Sheets sudah
    // tersambung) supaya aman dari race condition. Kalau BELUM tersambung
    // (mode demo/lokal), tetap lanjut simpan ke state lokal seperti biasa.
    if (cmsTeks.appsScriptUrl) {
      setIsDaftarLoading(true);
      try {
        const hasil = await sheetFetch(cmsTeks.appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'daftarWargaBaru',
            data: { ...dataPendaftaran, anggotaKeluarga: JSON.stringify(dataPendaftaran.anggotaKeluarga) },
          })
        });
        if (!hasil || hasil.error) {
          showToast((hasil && hasil.error) || 'Gagal mendaftar, silakan coba lagi.', 'error');
          return;
        }
      } catch (err) {
        showToast('Gagal menghubungi server, cek koneksi internet Anda.', 'error');
        return;
      } finally {
        setIsDaftarLoading(false);
      }
    }

    updatePengajuan([...pengajuanBaru, dataPendaftaran]);
    tambahNotifikasi({
      untuk: 'admin',
      judul: 'Pendaftaran Member Baru',
      pesan: `${formDaftar.nama} (Nomor Rumah/Blok: ${nomorRumahGabungan}, ${formDaftar.statusRumah}, ${formDaftar.anggotaKeluarga.length} anggota keluarga termasuk Kepala Keluarga) mendaftar sebagai calon warga baru. Menunggu aktivasi.`,
      tipe: 'pending'
    });
    showToast('Pendaftaran terkirim! Silakan menunggu aktivasi dari admin/bendahara.');
    setFormDaftar({ nama: '', blokRumah: DAFTAR_BLOK_RUMAH[0], nomorRumahUnit: DAFTAR_NOMOR_RUMAH[0], email: '', wa: '', alamat: '', statusRumah: 'Milik Sendiri', anggotaKeluarga: [buatBarisKepalaKeluargaKosong()] });
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
    // PERBAIKAN BUG TERKAIT: kalau ada 2 warga dgn NAMA SAMA, username
    // otomatis (nama tanpa spasi) juga bisa kembar -> bisa bikin sistem
    // login (yang dicocokkan lewat username) tertukar antar akun. Kalau
    // username dasar sudah dipakai warga lain, tambahkan angka urut di
    // belakang supaya tetap unik (mis. "riswanlusisinaga2").
    const usernameDasar = dataReq.nama.toLowerCase().replace(/\s+/g, '');
    const usernameTerpakai = new Set(members.map(m => (m.username || '').toLowerCase()));
    let usernameBaru = usernameDasar;
    let suffixUsername = 1;
    while (usernameTerpakai.has(usernameBaru)) {
      suffixUsername += 1;
      usernameBaru = `${usernameDasar}${suffixUsername}`;
    }
    const idMemberBaru = generateUniqueMemberId(members);
    // PERBAIKAN BUG: sebelumnya tanggal "bergabung" DI-HARDCODE ke string
    // tetap '11 Jul 2026' untuk SEMUA warga yang diaktivasi, apa pun hari
    // aktivasi sebenarnya - makanya daftar "Terbaru berdasarkan daftar
    // Portal RT 40" selalu menampilkan tanggal yang SAMA PERSIS untuk semua
    // warga baru. Sekarang diambil dari tanggal aktivasi SEBENARNYA (hari
    // ini, zona waktu Asia/Jakarta), format ISO "YYYY-MM-DD" supaya tetap
    // dikenali dengan benar oleh formatTanggalIndo/formatTanggalLaporan.
    const tanggalAktivasiHariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    // PERBAIKAN BUG "warga baru tiba-tiba hilang dari list Member" (mis.
    // kasus Turitno): sebelumnya array baru dihitung dari `members` yang
    // ditangkap SAAT FUNGSI INI DIPANGGIL (closure), lalu dikirim langsung
    // ke updateMembers sebagai NILAI JADI (bukan fungsi). Kalau ada aksi
    // admin LAIN yang terjadi hampir bersamaan (mis. reset password warga
    // lain, approve pengajuan lain, dobel klik) sebelum React sempat
    // re-render, aksi itu ikut memakai `members` LAMA yang sama (BELUM
    // termasuk warga yang baru saja diaktivasi ini) - dan overwrite PENUH
    // ke Google Sheet yang terjadi BELAKANGAN akan MENIMPA/MENGHAPUS balik
    // baris warga baru tsb, walau sebenarnya sudah sempat "masuk" sesaat.
    // SOLUSI: gunakan bentuk FUNGSI (prev => ...) supaya updateMembers
    // selalu menyusun array dari state PALING BARU (prev), bukan dari
    // snapshot lama - menghilangkan celah race condition "lost update" ini.
    updateMembers(prev => [...prev, {
      id: idMemberBaru,
      nama: dataReq.nama, nomorRumah: dataReq.nomorRumah || dataReq.nama, email: dataReq.email, wa: dataReq.wa, alamat: dataReq.alamat || '-', target: dataReq.target || TARGET_TAHUNAN,
      bergabung: tanggalAktivasiHariIni, username: usernameBaru, password: passwordBaru,
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
  // PERBAIKAN: dikunci per-baris (sedangResetPassword[memberId]) supaya kalau
  // admin klik "Reset Password" berkali-kali dengan cepat pada warga yang
  // sama (mis. koneksi lambat & dikira belum ke-klik), tidak memicu beberapa
  // proses reset SEKALIGUS untuk 1 warga yang sama - yang sebelumnya bisa
  // bikin beberapa password baru berbeda dibuat berurutan lalu WA/Email
  // terkirim tidak konsisten (isi pesan/nama yang tampil terasa "tertukar")
  // karena proses simpan ke Sheet & pengiriman notifikasi saling menyusul.
  const handleAdminResetPassword = (memberId) => {
    if (sedangResetPassword[memberId]) return;
    const target = members.find(m => m.id === memberId);
    if (!target) return;
    const ok = window.confirm(`Reset password untuk ${target.nama}? Password baru akan dikirim ke WA warga.`);
    if (!ok) return;

    setSedangResetPassword(prev => ({ ...prev, [memberId]: true }));
    const passwordBaru = generateRandomPassword();
    // PERBAIKAN BUG "reset password 1 warga malah kena ke warga lain" (mis.
    // reset password Riswan Lusi Sinaga tapi yang muncul/terkirim malah
    // punya Abas): SEBELUMNYA array baru dihitung dari `members` yang
    // ditangkap saat fungsi ini dipanggil, lalu dikirim sebagai NILAI JADI
    // (bukan fungsi) ke updateMembers. Kalau admin klik "Reset Password"
    // untuk 2 warga berbeda dengan cepat berturut-turut (atau reset password
    // + aksi admin lain hampir bersamaan), KEDUA proses menghitung array
    // dari `members` LAMA yang SAMA PERSIS, sehingga proses yang overwrite
    // ke Google Sheet PALING BELAKANGAN akan MENIMPA BALIK perubahan
    // password yang baru saja disimpan admin lain - password baru salah
    // satu warga jadi "hilang"/ketimpa nilai lama, atau notifikasi WA/Email
    // yang terkirim terasa tertukar antar warga. `target` (nama/WA/email
    // tujuan notifikasi di bawah) TETAP diambil per `memberId` yang benar,
    // jadi notifikasi tidak pernah salah orang - yang diperbaiki di sini
    // murni supaya password barunya benar-benar TERSIMPAN untuk warga yang
    // tepat, tidak ketimpa proses lain yang terjadi bersamaan.
    updateMembers(prev => prev.map(m => m.id === memberId ? { ...m, password: passwordBaru } : m));
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
    showToast(`Password untuk ${target.nama} berhasil direset & dikirim.`);
    // Buka kunci tombol ini lagi setelah proses simpan ke Sheet (syncSheet di
    // dalam updateMembers) diberi jeda singkat untuk mulai berjalan - dibuka
    // via pendingSyncCountRef supaya konsisten dengan status "sedang sinkron".
    setTimeout(() => {
      setSedangResetPassword(prev => { const next = { ...prev }; delete next[memberId]; return next; });
    }, 1200);
  };

  // ==========================================
  // ADMIN: LIHAT PASSWORD 1 ANGGOTA (fitur "Lihat Password")
  // -----------------------------------------------------------
  // Berbeda dengan Reset Password (bikin password BARU), fitur ini
  // menampilkan password anggota yang SUDAH ADA saat ini, tanpa
  // mengubahnya - jadi admin tidak perlu reset kalau cuma mau intip/
  // konfirmasi password warga. Memanggil server (action getPasswordAnggota)
  // karena backend Apps Script SENGAJA tidak pernah mengirim kolom password
  // lewat endpoint biasa (demi keamanan) - lihat KOLOM_RAHASIA_PER_SHEET.
  // ==========================================
  const handleLihatPassword = async (memberId) => {
    // Toggle: kalau sudah kebuka, tutup lagi tanpa perlu panggil server ulang.
    if (passwordTerlihat[memberId] !== undefined) {
      setPasswordTerlihat(prev => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      return;
    }
    if (!cmsTeks.appsScriptUrl) {
      showToast('Google Sheets belum tersambung, tidak bisa mengambil password dari server.', 'error');
      return;
    }
    setPasswordTerlihat(prev => ({ ...prev, [memberId]: 'memuat' }));
    try {
      const hasil = await sheetFetch(cmsTeks.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getPasswordAnggota', userId: memberId })
      });
      if (!hasil || hasil.error) {
        showToast((hasil && hasil.error) || 'Gagal mengambil password.', 'error');
        setPasswordTerlihat(prev => { const next = { ...prev }; delete next[memberId]; return next; });
        return;
      }
      setPasswordTerlihat(prev => ({ ...prev, [memberId]: hasil.password || '(kosong)' }));
    } catch (err) {
      showToast('Gagal menghubungi server, cek koneksi internet Anda.', 'error');
      setPasswordTerlihat(prev => { const next = { ...prev }; delete next[memberId]; return next; });
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
    updateMembers(prev => prev.map(m => m.id === memberId ? { ...m, akses: aksesBaru } : m));
    if (activeUserSession.id === memberId) setActiveUserSession({ ...activeUserSession, akses: aksesBaru });
    showToast(`Akses ${target.nama} berhasil diubah menjadi ${aksesBaru === 'admin' ? 'Admin (akses penuh)' : 'User (akses terbatas)'}.`);
  };

  // ==========================================
  // TANDAI/LEPAS "AKUN PENGURUS" (ADMIN)
  // -----------------------------------------------------------
  // Dipakai untuk warga yang menjabat pengurus RT (mis. Ketua RT, Sekretaris,
  // Seksi, dll) - status ini TERPISAH dari `akses` (Admin/User panel) supaya
  // seorang pengurus tetap bisa login sebagai akses "User" biasa. Efeknya
  // HANYA pada rekap KEUANGAN RT di Dashboard Utama (Total Kas Global &
  // Sisa Tagihan) - akun berlabel Pengurus TIDAK ikut dihitung target/kasnya
  // di sana (lihat totalDanaMasukGlobal/totalSisaGlobal), tetapi tetap ikut
  // dihitung penuh di menu Informasi Warga (data kependudukan tidak berubah).
  // ==========================================
  const handleTogglePengurus = (id) => {
    const target = members.find(m => m.id === id);
    if (!target) return;
    const statusBaru = !target.pengurus;
    const ok = window.confirm(`${statusBaru ? 'Tandai' : 'Lepas tanda'} "${target.nama}" sebagai Akun Pengurus?\n\n${statusBaru ? 'Target & pembayaran warga ini akan DIKELUARKAN dari rekap Keuangan RT di Dashboard Utama (Total Kas Global & Sisa Tagihan), tapi tetap dihitung penuh di Informasi Warga.' : 'Target & pembayaran warga ini akan MASUK KEMBALI ke rekap Keuangan RT di Dashboard Utama.'}`);
    if (!ok) return;
    updateMembers(prev => prev.map(m => m.id === id ? { ...m, pengurus: statusBaru } : m));
    if (activeUserSession.id === id) setActiveUserSession({ ...activeUserSession, pengurus: statusBaru });
    showToast(`"${target.nama}" ${statusBaru ? 'ditandai sebagai Akun Pengurus (dikecualikan dari Keuangan RT).' : 'sudah bukan Akun Pengurus lagi (masuk kembali ke Keuangan RT).'}`);
  };

  // GANTI PASSWORD OLEH USER SENDIRI
  // -----------------------------------------------------------
  // PERBAIKAN KEAMANAN: sebelumnya password lama dicocokkan di browser
  // (activeUserSession.password), yang berarti password harus ada di
  // memori client. Sekarang password TIDAK PERNAH ada di client sama
  // sekali - verifikasi password lama & update password baru dilakukan
  // sepenuhnya di server (Code.gs action "gantiPasswordUser"), dan hanya
  // menyentuh 1 baris/1 sel milik warga yang bersangkutan (tidak lewat
  // overwrite tabel penuh, jadi tidak mengganggu data warga lain).
  const handleUserGantiPassword = async (e) => {
    e.preventDefault();

    // PERBAIKAN: kalau proses sebelumnya masih berjalan (misal warga sudah
    // klik "Simpan Password Baru" lalu klik lagi karena dikira belum
    // ke-klik/loading terasa lama), ABAIKAN klik susulan ini sepenuhnya.
    // Ini mencegah 2+ request "gantiPasswordUser" terkirim bersamaan yang
    // bisa membuat request kedua ditolak server dengan alasan "password
    // lama salah" (padahal password lama sudah keburu berubah oleh request
    // pertama yang sukses lebih dulu).
    if (sedangSimpanPassword) return;

    setPasswordMsg({ tipe: '', teks: '' });

    if (formUbahPassword.baru.length < 6) {
      setPasswordMsg({ tipe: 'error', teks: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (formUbahPassword.baru !== formUbahPassword.konfirmasi) {
      setPasswordMsg({ tipe: 'error', teks: 'Konfirmasi password baru tidak sama.' });
      return;
    }
    if (!cmsTeks.appsScriptUrl) {
      setPasswordMsg({ tipe: 'error', teks: 'Google Sheets belum tersambung.' });
      return;
    }

    setSedangSimpanPassword(true);
    // Ikut menaikkan `pendingSyncCountRef` (mekanisme yang sama dipakai oleh
    // syncSheet, lihat catatan di atas) supaya auto-refresh DIAM-DIAM yang
    // jalan di latar belakang (pindah tab/kembali ke app) TIDAK menimpa
    // state sesi/akun aktif SELAGI proses ganti password ini masih
    // berlangsung - ini penyebab tulisan/nama akun yang tampil bisa
    // "berkedip" berubah sesaat (mis. dari akun A sempat terlihat data B)
    // kalau auto-refresh kebetulan jalan tepat di waktu yang sama.
    pendingSyncCountRef.current += 1;

    try {
      const hasil = await sheetFetchDenganRetryLock(cmsTeks.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'gantiPasswordUser',
          userId: activeUserSession.id,
          passwordLama: formUbahPassword.lama.trim(),
          passwordBaru: formUbahPassword.baru.trim(),
        })
      }, {
        maxPercobaan: 3,
        jedaMs: 1500,
        onRetry: (ke, total) => setPasswordMsg({ tipe: 'info', teks: `Server sedang sibuk, mencoba lagi... (${ke}/${total})` }),
      });

      if (!hasil || hasil.error) {
        const pesanAsli = (hasil && hasil.error) || 'Gagal mengganti password.';
        const iniErrorKunci = /kunci|lock/i.test(pesanAsli);
        setPasswordMsg({
          tipe: 'error',
          teks: iniErrorKunci
            ? 'Server sedang sibuk memproses permintaan lain. Silakan tunggu beberapa detik lalu coba "Simpan Password Baru" sekali lagi.'
            : pesanAsli,
        });
        return;
      }

      setFormUbahPassword({ lama: '', baru: '', konfirmasi: '' });
      setPasswordMsg({ tipe: 'sukses', teks: 'Password berhasil diperbarui. Gunakan password baru pada login berikutnya.' });
    } catch (err) {
      setPasswordMsg({ tipe: 'error', teks: 'Gagal menghubungi server, cek koneksi internet.' });
    } finally {
      pendingSyncCountRef.current = Math.max(0, pendingSyncCountRef.current - 1);
      setSedangSimpanPassword(false);
    }
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
    setFormKegiatan({ judul: k.judul, tanggal: k.tanggal, jam: sanitizeJamAgenda(k.jam) || '', tempat: k.tempat || '', pembicara: k.pembicara || '', detail: k.detail || '', foto: k.foto || null });
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

  // ==========================================
  // HITUNG TAGIHAN BELUM LUNAS (CALON TUNGGAKAN) SEBELUM PERIODE DITUTUP
  // -----------------------------------------------------------
  // Untuk SETIAP anggota & SETIAP bulan (Jan-Des) periode yang mau ditutup:
  // - Kalau baris iuran-nya sudah "LUNAS" -> aman, tidak perlu dibawa.
  // - Kalau statusnya "MENUNGGU VERIFIKASI" (sudah upload bukti tapi admin
  //   belum sempat verifikasi sebelum tutup periode) atau "BELUM BAYAR"
  //   (tidak ada baris sama sekali) -> ini tagihan yang masih terbuka,
  //   dibawa/carry-over sebagai tunggakan supaya TIDAK hilang & warga
  //   tetap bisa/wajib melunasinya walau periode sudah ditutup admin.
  // ==========================================
  const hitungCalonTunggakan = () => {
    const daftarTunggakanBaru = [];
    members.forEach((m) => {
      DAFTAR_BULAN.forEach((bln) => {
        const rowIuran = iuranMatrix.find(r => r.userNama === m.nama && r.bulanNama === bln.nama);
        const statusBulan = rowIuran ? rowIuran.status : 'BELUM BAYAR';
        if (statusBulan === 'LUNAS') return; // sudah lunas, tidak jadi tunggakan
        daftarTunggakanBaru.push({
          id: `TGK-${periodeAktif.noPeriode}-${m.id}-${bln.id}`,
          userId: m.id,
          userNama: m.nama,
          nomorRumah: m.nomorRumah || m.nama,
          kelompok: m.kelompok,
          bulanId: bln.id,
          bulanNama: bln.nama,
          nominal: rowIuran ? rowIuran.nominal : IURAN_BULANAN,
          status: statusBulan, // 'BELUM BAYAR' atau 'MENUNGGU VERIFIKASI'
          tglBayar: rowIuran ? (rowIuran.tglBayar || null) : null,
          buktiUrl: rowIuran ? (rowIuran.buktiUrl || null) : null,
          buktiNamaFile: rowIuran ? (rowIuran.buktiNamaFile || null) : null,
          noPeriodeAsal: periodeAktif.noPeriode,
          tahunAsal: getTahunUntukBulan(bln.nama),
        });
      });
    });
    return daftarTunggakanBaru;
  };

  const handleTutupPeriode = () => {
    const calonTunggakan = hitungCalonTunggakan();
    const pesanTunggakan = calonTunggakan.length > 0
      ? `\n\n⚠️ Terdeteksi ${calonTunggakan.length} tagihan bulan yang masih BELUM LUNAS. Tagihan ini TIDAK akan dihapus - otomatis dipindahkan menjadi "Tunggakan" yang tetap berjalan/harus dilunasi warga meski periode ini ditutup, dan bisa dipantau admin lewat menu "Monitoring Tunggakan".`
      : '';
    const ok = window.confirm(`Tutup periode ${periodeAktif.noPeriode} (Tahun ${periodeTahun}) sekarang?\n\nSeluruh data anggota, riwayat iuran, dan dokumentasi kegiatan periode ini akan diarsipkan PERMANEN sebagai riwayat/laporan (tidak akan hilang). Setelah itu periode baru otomatis dibuka dengan nomor baru.${pesanTunggakan}`);
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
      totalTunggakan: calonTunggakan.reduce((acc, t) => acc + t.nominal, 0),
      jumlahTunggakan: calonTunggakan.length,
      members,
      iuranMatrix,
      kegiatanList,
    };
    updateRiwayatPeriode(prev => [arsip, ...prev]);

    // Tagihan yang belum lunas DIBAWA (bukan dihapus) ke tunggakanList. Kalau
    // sebelumnya sudah ada baris tunggakan lama dengan id yang sama (jarang
    // terjadi, jaga-jaga tutup periode dobel), baris lama diganti baris baru.
    if (calonTunggakan.length > 0) {
      updateTunggakan(prev => {
        const idBaru = new Set(calonTunggakan.map(t => t.id));
        return [...prev.filter(t => !idBaru.has(t.id)), ...calonTunggakan];
      });
    }

    const urutBaru = nomorUrutPeriode + 1;
    const tahunBaru = periodeTahun + 1;
    const noPeriodeBaru = buatNomorPeriode(urutBaru, tahunBaru, periodeBulanMulai);
    setNomorUrutPeriode(urutBaru);
    setPeriodeTahun(tahunBaru);
    // Periode baru otomatis lanjut mulai dari bulan yang sama dengan pengaturan
    // admin sebelumnya (contoh: kalau periode berjalan mulai Juli, periode
    // berikutnya juga otomatis mulai Juli tahun depan). Admin tetap bisa
    // mengubah tanggal mulai ini kapan saja lewat form "Atur Tanggal Mulai
    // Periode" di menu Manajemen Periode.
    updatePeriode({ noPeriode: noPeriodeBaru, tahun: tahunBaru, status: 'Berjalan', tanggalMulai: `01 ${DAFTAR_BULAN[0].nama} ${tahunBaru}` });
    updateIuran([]);
    updateKegiatan([]);
    showToast(`Periode ${arsip.noPeriode} ditutup & diarsipkan. Periode baru ${noPeriodeBaru} resmi dibuka.${calonTunggakan.length > 0 ? ` ${calonTunggakan.length} tagihan belum lunas dipindahkan jadi tunggakan.` : ''}`);
  };

  // ==========================================
  // KOMPONEN KECIL: BADGE STATUS
  // ==========================================
  const BadgeStatus = ({ status }) => {
    const style = status === 'LUNAS'
      ? 'bg-[#d1fae5] text-[#047857]'
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
  // TEMA WARNA AKTIF
  // -----------------------------------------------------------
  // - Admin (adminLoggedIn): selalu melihat & mengatur TEMA BAWAAN. Memilih
  //   tema di palet = mengganti tema bawaan untuk SEMUA orang (disimpan ke
  //   cmsTeks.temaWarna + sheet "Pengaturan").
  // - Pengunjung / warga: memilih tema hanya mengubah `temaLokal` (sementara,
  //   hilang saat halaman dibuka ulang). Tema admin tetap jadi bawaan.
  // ==========================================
  const temaBawaan = idTemaValid(cmsTeks.temaWarna);
  const temaEfektif = adminLoggedIn ? temaBawaan : (temaLokal ? idTemaValid(temaLokal) : temaBawaan);
  const temaStyle = { ...buatVariabelTema(temaEfektif), backgroundColor: 'color-mix(in srgb, var(--tm-d50) 55%, #ffffff)' };
  const handlePilihTema = (idBaru) => {
    const id = idTemaValid(idBaru);
    if (adminLoggedIn) {
      const teksBaru = { ...cmsTeks, temaWarna: id };
      setCmsTeks(teksBaru);
      setCmsForm(prev => ({ ...prev, temaWarna: id }));
      setTemaLokal(null);
      if (teksBaru.appsScriptUrl) {
        syncSheet('Pengaturan', [{
          ...teksBaru,
          syaratList: (teksBaru.syaratList || []).join('|'),
          ketentuanList: (teksBaru.ketentuanList || []).join('|'),
          asetRTList: (teksBaru.asetRTList || []).join('|'),
          infoPengumumanList: (teksBaru.infoPengumumanList || []).join('|'),
          daftarBlokRumahList: (teksBaru.daftarBlokRumahList || []).join('|'),
          daftarNomorRumahList: (teksBaru.daftarNomorRumahList || []).join('|'),
        }]);
      }
      showToast(`Tema bawaan diganti ke "${cariTema(id).nama}" - langsung berlaku untuk semua pengunjung & warga.`);
    } else {
      setTemaLokal(id);
    }
  };

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
        className="relative w-11 h-11 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-md flex items-center justify-center text-blue-700 transition-colors duration-150"
      >
        <Ikon nama="bell" className="w-5 h-5" />
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
    <div className="app-root min-h-screen text-slate-800 antialiased font-sans" style={temaStyle}>
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
        href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&family=Caveat:wght@600;700&display=swap"
      />

      {/* OVERLAY "MASIH DALAM PROSES" - tampil SELAMA proses tarik data
          PERTAMA KALI dari Google Sheets belum selesai (sedangMuatDataAwal).
          Menutupi SELURUH halaman (z paling atas) supaya klik apapun di
          website (tombol, link, menu, dsb) tertahan di sini dulu & memberi
          tahu warga untuk menunggu, bukan diteruskan ke elemen di
          bawahnya - mencegah salah pencet/salah kira aplikasi error padahal
          cuma masih menyinkronkan data. Otomatis hilang begitu data selesai
          dimuat (lihat finally di muatSemuaDataDariSheet). */}
      {sedangMuatDataAwal && (
        <div
          onClick={() => showToast('Masih dalam proses, tunggu sampai proses completed.', 'error')}
          className="fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center px-6 cursor-wait"
        >
          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 border border-blue-800 rounded-2xl px-8 py-7 shadow-2xl max-w-xs w-full text-center">
            <div className="w-10 h-10 mx-auto mb-4 border-[3px] border-blue-700 border-t-amber-400 rounded-full animate-spin"></div>
            <p className="text-white font-black text-sm">Menyiapkan data RT...</p>
            <p className="text-blue-200 text-[11px] mt-1.5 leading-relaxed">Mohon tunggu sebentar, halaman akan bisa diklik begitu proses selesai.</p>
            <div className="mt-4 h-1.5 w-full bg-blue-900 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full loading-bar-anim"></div>
            </div>
          </div>
        </div>
      )}
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

      {/* LIGHTBOX FOTO GLOBAL - dipakai oleh semua <GambarZoom /> di Web Utama,
          akun Warga, & akun Bendahara (foto Agenda Utama, Agenda Kegiatan,
          dan foto Informasi Umum RT). Klik area gelap/​tombol ✕/tombol ESC untuk
          menutup; klik foto untuk zoom in-out; tombol "Lihat Full Page" membuka
          foto resolusi asli di tab baru browser. */}
      {lightboxImg && (
        <div
          className="lightbox-overlay fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={tutupLightbox}
        >
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); window.open(lightboxImg.src, '_blank', 'noopener,noreferrer'); }}
              className="bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-2 rounded-xl border border-white/20 backdrop-blur-sm transition-all duration-200 flex items-center gap-1.5"
            >
              <span>⛶</span><span className="hidden xs:inline sm:inline">Lihat Full Page</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); tutupLightbox(); }}
              className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold w-9 h-9 rounded-xl border border-white/20 backdrop-blur-sm transition-all duration-200 flex items-center justify-center"
              title="Tutup"
            >
              ✕
            </button>
          </div>
          <div
            className="lightbox-img-box w-full h-full flex items-center justify-center overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImg.src}
              alt={lightboxImg.alt}
              onClick={() => setLightboxZoomed((z) => !z)}
              className={`lightbox-img max-w-full max-h-[80vh] sm:max-h-[85vh] rounded-xl shadow-2xl select-none ${lightboxZoomed ? 'is-zoomed scale-125 sm:scale-150' : 'scale-100'}`}
            />
          </div>
          <p className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-[10px] sm:text-[11px] font-semibold text-center px-4 max-w-[92%]">
            {lightboxImg.alt} • Klik foto untuk {lightboxZoomed ? 'kembali normal' : 'perbesar'}, atau tekan "Lihat Full Page" untuk buka di tab baru.
          </p>
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
            PISAH TAMPILAN SESUAI LOGIN (SATU FORM LOGIN UNTUK SEMUA AKUN):
            - Belum login sama sekali -> hanya ada "Web Utama" & "Dashboard Warga" (warga login lewat form
              "Login Akun Warga" di halaman utama; Super Admin JUGA login lewat form yang SAMA memakai
              username/password admin - lihat handleLogin).
            - Sudah login sebagai Admin (adminLoggedIn true) -> hanya ada "Web Utama" & "Admin Panel"
              (tombol Dashboard Warga disembunyikan), plus tombol keluar.
          */}
          {!adminLoggedIn ? (
            <>
              <span className="text-slate-400 font-normal">Tampilan:</span>
              <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 p-0.5 rounded-lg border border-slate-800 flex">
                <button onClick={() => { setView('landing'); }} className={`px-3 py-1 rounded-md text-[11px] ${view === 'landing' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}>Web Utama</button>
                <button onClick={() => { setRole('user'); setView('dashboard'); setActiveMenu('dashboard'); }} className={`px-3 py-1 rounded-md text-[11px] ${role === 'user' && view === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}>Dashboard Warga</button>
              </div>
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
          <PaletTema
            temaAktif={temaEfektif}
            temaBawaan={temaBawaan}
            adalahAdmin={adminLoggedIn}
            onPilih={handlePilihTema}
            onReset={() => setTemaLokal(null)}
          />
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: LANDING PAGE / WEBSITE UTAMA
          ========================================================================= */}
      {view === 'landing' && (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 anim-fade">
          <div className="relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-4 px-5 sm:px-8 py-4 rounded-2xl shadow-lg border border-white/40 text-white">
            {/* LATAR FOTO + lapisan gelap (mengikuti tema) - sama dengan banner atas Dashboard */}
            <AdeganPerumahan variant="header" className="absolute inset-0 w-full h-full pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--tm-d950) 90%, transparent) 0%, color-mix(in srgb, var(--tm-d900) 72%, transparent) 34%, color-mix(in srgb, var(--tm-d900) 20%, transparent) 62%, color-mix(in srgb, var(--tm-d950) 45%, transparent) 100%)' }}></div>
            <div className="absolute inset-0 sm:hidden pointer-events-none" style={{ background: 'color-mix(in srgb, var(--tm-d950) 55%, transparent)' }}></div>
            <div className="relative flex items-center gap-3 w-full sm:w-auto">
              {cmsTeks.logoRT ? (
                <img loading="lazy" decoding="async" src={cmsTeks.logoRT} alt={`Logo ${cmsTeks.namaRT}`} className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-contain border bg-white shrink-0" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.insertAdjacentHTML('afterend', '<div class="bg-emerald-800 text-amber-400 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12">RT</div>'); }} />
              ) : (
                <div className="bg-emerald-800 text-amber-400 px-3 py-1.5 rounded-xl font-black text-xs shrink-0">RT</div>
              )}
              <div className="min-w-0">
                <h1 className="font-extrabold text-white text-sm truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">{cmsTeks.namaRT}</h1>
                <p className="text-[9px] text-blue-200 font-semibold truncate">📍 {cmsTeks.alamatRT}</p>
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest truncate">{cmsTeks.subJudulBeranda}</p>
              </div>
            </div>
            <div className="relative flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              {/* KARTU TREN PENGUNJUNG WEB - angka total SAMA untuk semua orang &
                  terus naik tiap kali ada yang membuka Web Utama (lihat useEffect
                  totalPengunjung), dilengkapi animasi hitung naik & grafik mini tren
                  (lihat useTrenPengunjung). Otomatis memudar & hilang sendiri
                  ±12 detik setelah halaman dibuka (lihat state tampilkanKartuPengunjung). */}
              {tampilkanKartuPengunjung && (
                <div className={`transition-opacity duration-700 ease-out ${pudarkanKartuPengunjung ? 'opacity-0' : 'opacity-100'}`}>
                  <p className="text-[9px] text-white/85 font-bold uppercase tracking-wide mb-1 text-center sm:text-left">Jumlah Pengunjung</p>
                  <div className="flex items-center gap-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-2xl px-3.5 py-2 shadow-md text-blue-300">
                    <SparklineTren data={trenPengunjung.spark} className="w-12 h-8 shrink-0" />
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="pr-2.5 border-r border-slate-700">
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide leading-none">Total</p>
                        <AngkaBerjalan value={totalPengunjung !== null ? totalPengunjung : 0} className="text-xs font-black text-white leading-tight" />
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide leading-none">Hari Ini</p>
                        <p className="text-xs font-black text-white leading-tight">{trenPengunjung.hariIni.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide leading-none">Kemarin</p>
                        <p className="text-xs font-black text-white leading-tight">{trenPengunjung.kemarin.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide leading-none">Mgg Ini</p>
                        <p className="text-xs font-black text-white leading-tight">{trenPengunjung.mingguIni.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide leading-none">Mgg Lalu</p>
                        <p className="text-xs font-black text-white leading-tight">{trenPengunjung.mingguLalu.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/50 text-white bg-blue-900">
                {/* LATAR: ilustrasi gerbang & rumah (mengikuti tema). Kalau admin sudah
                    upload Foto Latar di CMS, foto itu tampil di atas ilustrasi. */}
                <AdeganPerumahan variant="hero" label={(cmsTeks.namaRT || '').match(/^RT\s*\d+\s*RW\s*\d+/i)?.[0] || 'RT'} className="absolute inset-0 w-full h-full pointer-events-none select-none" />
                {cmsTeks.fotoLatarRT && (
                  <img loading="lazy" decoding="async" src={cmsTeks.fotoLatarRT} alt="RT" className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--tm-d950) 94%, transparent) 0%, color-mix(in srgb, var(--tm-d900) 78%, transparent) 42%, color-mix(in srgb, var(--tm-d900) 10%, transparent) 78%, transparent 100%)' }}></div>
                <div className="absolute inset-0 sm:hidden pointer-events-none" style={{ background: 'color-mix(in srgb, var(--tm-d950) 52%, transparent)' }}></div>
                <div className="relative p-5 sm:p-6 min-h-[240px] flex flex-col">
                  <div className="max-w-[27rem]">
                    <h2 className="text-[22px] sm:text-[26px] leading-[1.15] font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                      {(() => {
                        const judul = cmsTeks.judulBeranda || '';
                        const pisah = judul.match(/^(.*?)\s+(Lebih\s+)(.+)$/i);
                        const gayaSorot = { background: 'linear-gradient(90deg, var(--tm-a300), var(--tm-a400))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
                        if (!pisah) return judul;
                        return (
                          <>
                            <span className="block">{pisah[1]}</span>
                            <span className="block">{pisah[2]}<span style={gayaSorot}>{pisah[3]}</span></span>
                          </>
                        );
                      })()}
                    </h2>
                    <p className="mt-2 text-[12px] sm:text-[13px] text-white/85 font-medium leading-relaxed">{cmsTeks.tagline}</p>
                  </div>

                  {/* KOTAK INFO PEMBAYARAN + RUNNING TEXT PENGUMUMAN (dari CMS) + tombol panduan */}
                  <div className="mt-auto pt-4">
                  <div className="rounded-2xl border border-white/25 bg-white/10 backdrop-blur-md px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-3 lg:max-w-[82%]">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-white/15 border border-white/25 grid place-items-center"><Ikon nama="card" className="w-4 h-4" /></span>
                      {/* RUNNING TEXT (MARQUEE) - teks pengumuman berjalan terus-menerus dari
                          kanan ke kiri; durasi mengikuti panjang teks supaya kecepatannya wajar. */}
                      <div className="marquee-wrap flex-1 min-w-0 text-[12px] font-semibold text-white">
                        <div className="marquee-track leading-relaxed" style={{ animationDuration: `${Math.max(12, (cmsTeks.pengumuman || '').length * 0.09)}s` }}>
                          <span>{cmsTeks.pengumuman}</span>
                          <span>{cmsTeks.pengumuman}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { const el = document.getElementById('panduan-pembayaran'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-[11px] font-black px-3 py-2 shadow-lg transition-transform duration-150 hover:scale-[1.02]"
                    >
                      Lihat Panduan Pembayaran <Ikon nama="arrowRight" className="w-3.5 h-3.5" strokeWidth={2.6} />
                    </button>
                  </div>
                  {/* TEKS KECIL PROMOSI JASA WEBSITE */}
                  <p className="text-[9px] text-white/70 mt-3 leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                    Butuh Website untuk Usaha Kamu? Hubungi saya untuk diskusi konsep &amp; penawaran harga WA{' '}
                    <a href="https://wa.me/6282421117131" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-300 transition-colors">0822421117131</a>
                  </p>
                  </div>
                </div>
              </div>

              {/* REKENING PEMBAYARAN & KONTAK PANITIA */}
              <div id="panduan-pembayaran" className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs scroll-mt-4">
                <div className="relative overflow-hidden rounded-3xl border border-white shadow-md p-4" style={{ background: 'linear-gradient(135deg, #ffffff 45%, var(--tm-d100))' }}>
                  <span className="absolute -right-3 -bottom-3 pointer-events-none" style={{ color: 'var(--tm-d200)' }}><Ikon nama="landmark" className="w-24 h-24" strokeWidth={1.2} /></span>
                  <div className="relative flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl grid place-items-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--tm-d500), var(--tm-d800))' }}><Ikon nama="landmark" className="w-[18px] h-[18px]" /></span>
                    <h4 className="text-[14px] font-black text-slate-900 leading-tight">Rekening Pembayaran Resmi</h4>
                  </div>
                  <p className="relative mt-2.5 text-[12.5px] font-black leading-relaxed" style={{ color: 'var(--tm-d900)' }}>{cmsTeks.noRekening}</p>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard?.writeText(cmsTeks.noRekening); showToast('Nomor rekening berhasil disalin.'); }}
                    className="relative mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                  >
                    <Ikon nama="copy" className="w-3.5 h-3.5" /> Salin Nomor Rekening
                  </button>
                  <div className="relative mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-[10px] leading-relaxed text-slate-500 font-medium" style={{ background: 'var(--tm-a50)' }}>
                    <Ikon nama="info" className="w-4 h-4 shrink-0 mt-px text-emerald-600" />
                    <span>Pastikan hanya transfer ke rekening resmi di atas. Nomor ini diatur langsung oleh panitia lewat Admin Panel.</span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-white shadow-md p-4" style={{ background: 'linear-gradient(135deg, #ffffff 40%, var(--tm-a100))' }}>
                  <IlustrasiWhatsapp className="absolute right-0 bottom-0 w-28 h-24 pointer-events-none" />
                  <div className="relative flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl grid place-items-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--tm-d500), var(--tm-d800))' }}><Ikon nama="phone" className="w-[18px] h-[18px]" /></span>
                    <h4 className="text-[14px] font-black text-slate-900 leading-tight">Hubungi Pengurus</h4>
                  </div>
                  <p className="relative mt-2.5 text-[18px] font-black tracking-wide text-slate-900">{cmsTeks.infoKontak}</p>
                  <a
                    href={buatLinkWhatsapp(cmsTeks.infoKontak)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative mt-2.5 inline-flex items-center gap-2 rounded-xl text-white font-black text-[11.5px] pl-3 pr-3.5 py-2 shadow-lg transition-transform duration-150 hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(90deg, var(--tm-a600), var(--tm-a500))' }}
                  >
                    <IkonWhatsapp className="w-5 h-5" /> Chat via WhatsApp <Ikon nama="arrowRight" className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </a>
                </div>
              </div>

              {/* VISI & MISI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <KartuVisiMisi judul="VISI" teks={cmsTeks.visi} ikon="target" ramp="d" />
                <KartuVisiMisi judul="MISI" teks={cmsTeks.misi} ikon="users" ramp="a" />
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
                        <GambarZoom src={agendaUtama.foto} alt={agendaUtama.judul} className="w-full h-full object-cover" onBuka={bukaLightbox} />
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Belum ada foto agenda utama</span>
                      )}
                    </div>
                    <div className="p-5 text-xs">
                      <p className="text-slate-400 font-bold text-[11px]">{formatAgendaLengkap(agendaUtama.tanggal, agendaUtama.jam)}</p>
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
                          <GambarZoom src={k.foto} alt={k.judul} className="w-full h-full object-cover" onBuka={bukaLightbox} />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">Belum ada foto</span>
                        )}
                      </div>
                      <div className="p-3 text-xs">
                        <p className="text-slate-400 font-bold text-[10px]">{formatAgendaLengkap(k.tanggal, k.jam)}</p>
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
                      <GambarZoom src={cmsTeks.fotoRTUmum} alt={cmsTeks.namaRT} className="w-full h-full object-cover" onBuka={bukaLightbox} />
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
                    <div className="mt-3 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 rounded-xl py-3 px-4 text-center">
                      <p className="text-amber-400 font-black text-2xl tracking-widest font-mono">{jamSekarang}</p>
                      <p className="text-slate-300 text-[9px] font-bold mt-0.5 uppercase tracking-wide">{tanggalSekarang} • WIB</p>
                    </div>
                    {/* RUNNING TEXT (MARQUEE) - menggantikan teks statis, berjalan terus
                        menerus tanpa henti supaya kotak info selalu "hidup". Background
                        navy transparan + teks warna menyala supaya senada tema navy. */}
                    <div className="mt-2 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 border border-blue-800 rounded-xl py-2 px-3 flex items-center gap-2">
                      <span className="text-base shrink-0">🔔</span>
                      <div className="marquee-wrap flex-1 min-w-0">
                        <div className="marquee-track text-amber-300 text-[10px] font-black drop-shadow-[0_0_5px_rgba(252,211,77,0.65)]">
                          <span>Digitalisasi untuk kemudahan dan kecepatan informasi warga</span>
                          <span>Digitalisasi untuk kemudahan dan kecepatan informasi warga</span>
                        </div>
                      </div>
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

              {/* SERBA-SERBI UMKM RT (DIKELOLA ADMIN DARI CMS SUPER EDITOR)
                  DIPINDAH ke kolom KIRI, tepat di bawah kartu "Informasi Umum RT"
                  (di bawah jam/waktu & running text-nya) - supaya sekelompok
                  dengan info publik RT lainnya, bukan bercampur dengan kolom
                  Login/Pendaftaran. Terlihat oleh SEMUA akun (belum login, warga,
                  maupun admin lain). Khusus tampilan LAPTOP/desktop (lg+), setiap
                  kartu dibuat LANDSCAPE (foto di kiri, teks & tombol di kanan)
                  supaya lebih hemat tempat vertikal & enak dipindai matanya;
                  di HP tetap disusun vertikal (foto di atas) seperti biasa. */}
              {umkmList.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border shadow-xs h-fit">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-1">🛍️ Serba-Serbi UMKM {cmsTeks.namaRT}</h3>
                  <p className="text-[10px] text-slate-400 text-center mb-2">Dukung usaha warga - klik Chat WhatsApp untuk pesan langsung ke pemilik produk.</p>
                  {/* PROMOSI GRATIS UNTUK WARGA RT 40 RW 08 - mengajak warga yang punya
                      usaha/produk supaya mau ikut dipajang di galeri UMKM ini, TANPA BIAYA
                      apapun, cukup hubungi Pengurus RT. */}
                  <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center font-semibold leading-relaxed mb-4">
                    📢 Warga RT 40 RW 08 yang ingin produknya ikut dipajang di Web Utama ini bisa langsung hubungi Pengurus RT, <strong>GRATIS tanpa biaya apapun.</strong>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {umkmList.map(u => (
                      <div key={u.id} className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 border border-blue-800 rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-lg shadow-blue-950/30">
                        <div className="w-full h-24 sm:h-28 lg:w-2/5 lg:h-auto shrink-0 bg-blue-900/60 flex items-center justify-center overflow-hidden">
                          {u.foto ? (
                            <GambarZoom
                              src={toDirectImageUrl(u.foto)}
                              alt={u.namaProduk}
                              className="w-full h-full object-cover"
                              onBuka={bukaLightbox}
                            />
                          ) : (
                            <span className="text-[9px] text-blue-300 font-bold">Belum ada foto produk</span>
                          )}
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col">
                          <p className="text-amber-300 font-black text-[11px] leading-tight drop-shadow-[0_0_6px_rgba(252,211,77,0.55)]">{u.namaProduk}</p>
                          {u.deskripsi && (
                            <p className="text-blue-200 text-[9px] font-semibold leading-snug mt-1 flex-1">{u.deskripsi}</p>
                          )}
                          {u.noWa ? (
                            <a
                              href={`${buatLinkWhatsapp(u.noWa)}?text=${encodeURIComponent(`Halo, saya lihat produk "${u.namaProduk}" di Web Utama ${cmsTeks.namaRT}. Apakah masih tersedia?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-[9px] text-center py-1.5 rounded-lg tracking-wide transition-colors"
                            >
                              Chat WhatsApp
                            </a>
                          ) : (
                            <span className="mt-2 bg-blue-900/60 text-blue-300 font-bold text-[9px] text-center py-1.5 rounded-lg italic">Nomor WA belum diisi</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* KOLOM KANAN: LOGIN, PENDAFTARAN, & INFO MOTIVASI WARGA */}
            <div className="col-span-1 space-y-6">

              {/* FORM LOGIN RESMI (USERNAME & PASSWORD) - gaya kartu biru + isi putih */}
              <div className="bg-white rounded-3xl border border-white shadow-xl h-fit overflow-hidden">
                <div className="relative px-5 py-4 text-white overflow-hidden" style={{ background: 'linear-gradient(120deg, var(--tm-d950), var(--tm-d800) 62%, var(--tm-d600))' }}>
                  <span className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none"></span>
                  <span className="absolute right-10 -bottom-10 w-28 h-28 rounded-full bg-white/10 pointer-events-none"></span>
                  <div className="relative flex items-center gap-3">
                    <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/15 border border-white/25 grid place-items-center shadow-inner"><Ikon nama="user" className="w-6 h-6" /></span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-black leading-tight">Login Akun Warga / Admin</h3>
                      <p className="text-[10px] text-blue-100 mt-1 leading-snug">Satu form untuk semua akun: warga masuk dengan username &amp; password yang dikirim ke WA saat aktivasi, Panitia/Admin masuk dengan akun Super Admin.</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                <form onSubmit={handleLogin} className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <label className="flex items-center gap-1.5 mb-1.5 text-slate-700 font-black"><Ikon nama="user" className="w-3.5 h-3.5 text-emerald-600" />Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Ikon nama="user" className="w-4 h-4" /></span>
                      <input type="text" required placeholder="Masukkan username Anda" value={formLogin.username} onChange={(e) => setFormLogin({...formLogin, username: e.target.value})} className="tm-input w-full border border-slate-200 pl-9 pr-3 py-2.5 rounded-xl bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 mb-1.5 text-slate-700 font-black"><Ikon nama="lock" className="w-3.5 h-3.5 text-emerald-600" />Password</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Ikon nama="lock" className="w-4 h-4" /></span>
                      <input type={lihatPasswordLogin ? 'text' : 'password'} required placeholder="Masukkan password Anda" value={formLogin.password} onChange={(e) => setFormLogin({...formLogin, password: e.target.value})} className="tm-input w-full border border-slate-200 pl-9 pr-10 py-2.5 rounded-xl bg-slate-50" />
                      <button type="button" onClick={() => setLihatPasswordLogin(v => !v)} aria-label={lihatPasswordLogin ? 'Sembunyikan password' : 'Lihat password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><Ikon nama={lihatPasswordLogin ? 'eyeOff' : 'eye'} className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {isLoggingIn && <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5"><span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>Memuat data dari server, mohon tunggu...</p>}
                  {loginError && <p className="text-[11px] font-bold text-rose-600">{loginError}</p>}
                  <button type="submit" disabled={isLoggingIn} className="tm-btn-utama w-full text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                    <Ikon nama="key" className="w-4 h-4" />{isLoggingIn ? 'Memuat...' : 'Masuk ke Akun Saya'}<Ikon nama="arrowRight" className="w-4 h-4" strokeWidth={2.6} />
                  </button>
                </form>
                </div>
              </div>

              {/* FORM PENDAFTARAN - gaya kartu biru + isi putih, konsisten dengan kartu Login di atasnya. */}
              <div className="bg-white rounded-3xl border border-white shadow-xl h-fit overflow-hidden">
                <div className="relative px-5 py-4 text-white overflow-hidden" style={{ background: 'linear-gradient(120deg, var(--tm-d950), var(--tm-d800) 62%, var(--tm-d600))' }}>
                  <span className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none"></span>
                  <span className="absolute right-3 top-2 text-white/25 pointer-events-none"><Ikon nama="clipboard" className="w-20 h-20" strokeWidth={1.3} /></span>
                  <div className="relative flex items-center gap-3">
                    <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/15 border border-white/25 grid place-items-center shadow-inner"><Ikon nama="userPlus" className="w-6 h-6" /></span>
                    <div className="min-w-0 pr-16">
                      <h3 className="text-[15px] font-black leading-tight">Pendaftaran Akun</h3>
                      <p className="text-[10px] text-blue-100 mt-1 leading-snug">Setelah diaktivasi bendahara, username &amp; password acak akan dikirim ke WA Anda.</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                <form onSubmit={handleUserMendaftar} className="space-y-3 text-xs font-semibold">
                  <div>
                    <label className="flex items-center gap-1.5 mb-1.5 text-slate-700 font-black"><Ikon nama="user" className="w-3.5 h-3.5 text-emerald-600" />Nama Kepala Keluarga</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Ikon nama="user" className="w-4 h-4" /></span>
                      <input type="text" required placeholder="Masukkan nama kepala keluarga" value={formDaftar.nama} onChange={(e) => handleUbahNamaKepalaKeluarga(e.target.value)} className="tm-input w-full border border-slate-200 pl-9 pr-3 py-2.5 rounded-xl bg-slate-50" />
                    </div>
                  </div>
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
                      <PilihanDropdown value={formDaftar.blokRumah} options={DAFTAR_BLOK_RUMAH} onChange={(v) => setFormDaftar({...formDaftar, blokRumah: v})} placeholder="Pilih Blok" />
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-600">Nomor Rumah</label>
                      <PilihanDropdown value={formDaftar.nomorRumahUnit} options={DAFTAR_NOMOR_RUMAH} onChange={(v) => setFormDaftar({...formDaftar, nomorRumahUnit: v})} placeholder="Pilih Nomor" />
                    </div>
                  </div>

                  {/* KETERANGAN JUMLAH KK & JIWA TIAP BLOK - HANYA JUMLAH, TANPA
                      NAMA (lihat getRingkasanBlokRumah). Supaya calon warga bisa
                      lihat keramaian tiap blok sebelum memilih Blok Rumah. */}
                  <div className="bg-slate-50 border rounded-xl p-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Keterangan Jumlah Warga per Blok</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {getRingkasanBlokRumah().map(r => (
                        <div key={r.blok} className={`border rounded-lg px-2 py-1.5 text-[10px] ${formDaftar.blokRumah === r.blok ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600'}`}>
                          <span className="font-black block">Blok {r.blok}</span>
                          <span className={formDaftar.blokRumah === r.blok ? 'text-emerald-50' : 'text-slate-400'}>{r.jumlahKK} KK • {r.jumlahJiwa} Jiwa</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div><label className="block mb-1 text-slate-600">Email</label><input type="email" required placeholder="hidayat@mail.com" value={formDaftar.email} onChange={(e) => setFormDaftar({...formDaftar, email: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                  <div><label className="block mb-1 text-slate-600">WhatsApp</label><input type="text" required placeholder="08123" value={formDaftar.wa} onChange={(e) => setFormDaftar({...formDaftar, wa: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                  <div><label className="block mb-1 text-slate-600">Alamat Tinggal</label><textarea rows={2} required placeholder="Blok A No. 1, Perum Bumi Indah Proklamasi, RT 40/RW 08" value={formDaftar.alamat} onChange={(e) => setFormDaftar({...formDaftar, alamat: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>

                  {/* ANGGOTA KELUARGA (ISTRI & ANAK) - WAJIB MINIMAL 1, DATA INI YANG
                      NANTINYA MASUK KE TAB "ANGGOTA KELUARGA" DI AKUN USER SETELAH AKTIVASI */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-600">Anggota Keluarga</label>
                      <button type="button" onClick={handleTambahBarisAnggotaDaftar} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">+ Tambah</button>
                    </div>
                    <p className="text-[9px] text-slate-400 mb-2">Baris pertama (Kepala Keluarga) wajib & terkunci - namanya otomatis mengikuti "Nama Kepala Keluarga" di atas, tinggal lengkapi tanggal lahir &amp; jenis kelamin. Tekan "+ Tambah" untuk menambahkan istri/suami/anak. Usia dihitung otomatis dari tanggal lahir.</p>
                    <div className="space-y-2">
                      {formDaftar.anggotaKeluarga.map((a, i) => {
                        const terkunci = a.id === ID_BARIS_KEPALA_KELUARGA;
                        return (
                        <div key={a.id} className={`border rounded-xl p-2.5 space-y-1.5 ${terkunci ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase ${terkunci ? 'text-amber-600' : 'text-slate-400'}`}>{terkunci ? '🔒 Kepala Keluarga (Anda)' : `Anggota #${i}`}</span>
                            {!terkunci && <button type="button" onClick={() => handleHapusBarisAnggotaDaftar(a.id)} className="text-[10px] font-bold text-rose-600">Hapus</button>}
                          </div>
                          {terkunci ? (
                            <input type="text" disabled placeholder="Otomatis dari Nama Kepala Keluarga di atas" value={a.nama} className="w-full border p-2 rounded-lg bg-slate-100 text-[11px] text-slate-500" />
                          ) : (
                            <input type="text" required placeholder="Nama lengkap" value={a.nama} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'nama', e.target.value)} className="w-full border p-2 rounded-lg bg-white text-[11px]" />
                          )}
                          {terkunci ? (
                            <input type="text" disabled value="Kepala Keluarga" className="w-full border p-2 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500" />
                          ) : (
                            <select required value={a.hubungan} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'hubungan', e.target.value)} className="w-full border p-2 rounded-lg bg-white text-[11px] font-bold">
                              {HUBUNGAN_KELUARGA_TAMBAHAN_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          )}
                          <div className="grid grid-cols-2 gap-1.5">
                            <select required value={a.jenisKelamin} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'jenisKelamin', e.target.value)} className="w-full border p-2.5 rounded-lg bg-white text-[12px] font-bold">
                              <option value="Perempuan">Perempuan</option>
                              <option value="Laki-laki">Laki-laki</option>
                            </select>
                            <input type="date" required value={a.tanggalLahir} onChange={(e) => handleUbahBarisAnggotaDaftar(a.id, 'tanggalLahir', e.target.value)} className="w-full border p-2.5 rounded-lg bg-white text-[12px]" />
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px] text-emerald-800 font-bold text-center">Iuran ini mencakup kebersihan, keamanan, Kas RT</div>
                  <button type="submit" disabled={isDaftarLoading} className="tm-btn-utama w-full text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"><Ikon nama="userPlus" className="w-4 h-4" />{isDaftarLoading ? 'Memeriksa & mendaftarkan...' : 'Daftar Sekarang'}<Ikon nama="arrowRight" className="w-4 h-4" strokeWidth={2.6} /></button>
                </form>
                </div>
              </div>

              {/* BUKU KAS MASUK/KELUAR RT (TRANSPARANSI PUBLIK - TAMPIL DI BAWAH KARTU PENDAFTARAN AKUN) */}
              <div className="bg-white rounded-3xl border shadow-xs h-fit overflow-hidden">
                {/* HEADER NAVY + keterangan bahwa ini data REAL (bukan simulasi),
                    sudah diverifikasi Pengurus RT - supaya warga/pengunjung yakin
                    tabel ini transparan & bisa dipercaya, bukan sekadar contoh. */}
                <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 px-6 py-4">
                  <h3 className="text-sm font-black text-white text-center mb-1">📒 Buku Kas Masuk/Keluar RT</h3>
                  <p className="text-[10px] text-blue-200 text-center">Riwayat transaksi kas RT beserta saldo berjalan, transparan untuk seluruh warga.</p>
                  <p className="text-[9px] text-emerald-300 font-black text-center mt-1.5 flex items-center justify-center gap-1">✅ Data real yang sudah diverifikasi oleh Pengurus RT</p>
                </div>
                <div className="p-6 pt-4">
                <PaginasiKas data={getRiwayatKasRtDenganSaldo()} ukuran={10} gaya="terang">
                  {(baris) => (
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-[10px] sm:text-[11px]">
                        <thead>
                          <tr className="text-slate-400 border-b text-left">
                            <th className="py-1.5 px-2 font-bold">Tanggal</th>
                            <th className="py-1.5 px-2 font-bold">Keterangan</th>
                            <th className="py-1.5 px-2 font-bold text-right"><span className="text-emerald-600">▲</span> Masuk</th>
                            <th className="py-1.5 px-2 font-bold text-right"><span className="text-rose-500">▼</span> Keluar</th>
                            <th className="py-1.5 px-2 font-bold text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {baris.map(t => (
                            <tr key={t.id} className="border-b border-slate-50">
                              <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">{formatTanggalLaporan(t.tanggal)}</td>
                              <td className="py-1.5 px-2 text-slate-700 font-semibold min-w-[9rem]">{t.keterangan}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-[#047857] whitespace-nowrap">{t.jenis === 'Masuk' ? <>▲ Rp{Number(t.nominal).toLocaleString('id-ID')}</> : '-'}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-rose-600 whitespace-nowrap">{t.jenis === 'Keluar' ? <>▼ Rp{Number(t.nominal).toLocaleString('id-ID')}</> : '-'}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">Rp{t.saldoSetelah.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                          {baris.length === 0 && (
                            <tr><td colSpan={5} className="py-3 text-center text-slate-400 italic">Belum ada transaksi kas RT yang dicatat.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </PaginasiKas>
                <div className="mt-3 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 rounded-xl py-2.5 px-4 flex items-center justify-between">
                  <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wide">Sisa Saldo Kas RT</span>
                  <span className="text-amber-400 font-black text-sm">Rp{(getRiwayatKasRtDenganSaldo().slice(-1)[0]?.saldoSetelah ?? 0).toLocaleString('id-ID')}</span>
                </div>
                </div>
              </div>

              {/* INFO MOTIVASI KEBERSAMAAN WARGA (MENGISI RUANG KOSONG) */}
              <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white p-6 rounded-3xl border border-blue-800 shadow-xs h-fit">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest text-center mb-3">Kenapa Iuran Warga Penting?</h3>
                <div className="space-y-4 text-xs">
                  <div className="bg-blue-950/60 rounded-xl p-3 border border-blue-800">
                    <p className="italic text-blue-100 leading-relaxed">Iuran yang tertib membuat lingkungan lebih aman, bersih, dan nyaman untuk seluruh warga.</p>
                  </div>
                  <div className="bg-blue-950/60 rounded-xl p-3 border border-blue-800">
                    <p className="italic text-blue-100 leading-relaxed">Dana warga digunakan untuk keamanan (ronda), kebersihan lingkungan, dan kegiatan sosial bersama.</p>
                  </div>
                  <p className="text-blue-200 text-[10px] text-center leading-relaxed">Yuk bayar iuran tepat waktu, demi RT 40 RW 08 yang lebih baik bersama.</p>
                </div>
              </div>

              {/* SUSUNAN PENGURUS (DIEDIT ADMIN DARI CMS SUPER EDITOR) */}
              <div className="bg-white p-6 rounded-3xl border shadow-xs h-fit">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-4">Struktur Pengurus RW</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">{cmsTeks.labelKetua}</p>
                    <p className="font-black text-slate-900 mt-1">{cmsTeks.panitiaKetua}</p>
                  </div>
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">{cmsTeks.labelSekretaris}</p>
                    <p className="font-black text-slate-900 mt-1">{cmsTeks.panitiaSekretaris}</p>
                  </div>
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">{cmsTeks.labelBendahara}</p>
                    <p className="font-black text-slate-900 mt-1">{cmsTeks.panitiaBendahara}</p>
                  </div>
                  <div className="bg-slate-50 border rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">{cmsTeks.labelHumas}</p>
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
            <button onClick={() => { setSidebarOpen(true); window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Buka menu" className="w-9 h-9 rounded-lg bg-blue-800/70 flex items-center justify-center text-lg shrink-0">☰</button>
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
          <div className={`w-72 sm:w-60 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 text-blue-50 p-5 flex flex-col justify-between border-r border-blue-900/60 select-none shrink-0 h-screen overflow-y-auto fixed lg:sticky top-0 left-0 z-50 lg:z-auto transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-2 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0 group">
                    {cmsTeks.logoRT ? (
                      <img loading="lazy" decoding="async" src={cmsTeks.logoRT} alt="Logo" className="w-11 h-11 rounded-xl object-contain bg-white p-0.5 border border-white/30 shadow-lg shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-white/95 grid place-items-center text-emerald-700 font-black text-[11px] shadow-lg shrink-0">RT</div>
                    )}
                    {role === 'admin' && (
                      <label title="Ganti logo RT" className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[8px] font-black cursor-pointer border border-slate-900 opacity-90 hover:opacity-100">
                        ✎
                        <input type="file" accept="image/*" onChange={handleQuickLogoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="min-w-0">
                    {(() => {
                      const pecah = (cmsTeks.namaRT || '').match(/^(RT\s*\d+\s*RW\s*\d+)\s*(.*)$/i);
                      return (
                        <>
                          <p className="font-black text-[14px] leading-tight text-white">{pecah ? pecah[1] : cmsTeks.namaRT}</p>
                          {pecah && pecah[2] && <p className="text-[9.5px] font-bold leading-tight text-blue-100 mt-0.5">{pecah[2]}</p>}
                        </>
                      );
                    })()}
                    <p className="text-[7.5px] text-blue-300 font-medium leading-snug mt-1">{cmsTeks.alamatRT}</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} aria-label="Tutup menu" className="lg:hidden w-7 h-7 rounded-full bg-blue-800/70 text-blue-100 shrink-0 font-black text-xs">✕</button>
              </div>
              <div className="rounded-2xl p-2.5 mb-4 border border-white/15 bg-white/10 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-white/90 grid place-items-center text-blue-800 shrink-0"><Ikon nama="user" className="w-5 h-5" /></span>
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase text-blue-200 tracking-wide">User Aktif:</span>
                  <p className="font-black text-white text-[14px] leading-tight truncate">{role === 'admin' ? 'BENDAHARA' : activeUserSession.nama}</p>
                  <span className="inline-block mt-1 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white bg-emerald-800">
                    {role === 'admin' ? 'ALL GROUPS' : activeUserSession.kelompok}
                  </span>
                </div>
              </div>

              {/* AUTO-SCROLL KE ATAS: setiap kali warga/admin klik salah satu menu di
                  sidebar ini, halaman otomatis di-scroll ke posisi paling atas -
                  supaya tidak perlu scroll manual ke atas lagi untuk lihat konten
                  halaman baru kalau sebelumnya posisi scroll sudah jauh ke bawah.
                  Dipasang di <nav> (bukan di tiap tombol satu-satu) supaya otomatis
                  berlaku untuk SEMUA tombol menu di dalamnya lewat event bubbling. */}
              <nav onClick={() => { setSidebarOpen(false); window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="space-y-1 text-xs font-bold">
                <button onClick={() => setActiveMenu('dashboard')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'dashboard' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="home" className="w-[18px] h-[18px] shrink-0" /><span>Dashboard Utama</span></button>
                <button onClick={() => setActiveMenu('laporan-sapi')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'laporan-sapi' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="building" className="w-[18px] h-[18px] shrink-0" /><span>Rekap Blok Rumah</span></button>
                <button onClick={() => setActiveMenu('informasi-warga')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'informasi-warga' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="users" className="w-[18px] h-[18px] shrink-0" /><span>Informasi Warga</span></button>

                {role === 'user' && (
                  <>
                    <button onClick={() => setActiveMenu('anggota-keluarga')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'anggota-keluarga' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="user" className="w-[18px] h-[18px] shrink-0" /><span>Anggota Keluarga</span></button>
                    <button onClick={() => setActiveMenu('informasi-umum')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'informasi-umum' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="file" className="w-[18px] h-[18px] shrink-0" /><span>Informasi Umum</span></button>
                    <button onClick={() => setActiveMenu('laporan-belanja')} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'laporan-belanja' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="receipt" className="w-[18px] h-[18px] shrink-0" /><span>Laporan Belanja Kas RT</span></button>
                    <button onClick={() => { setActiveMenu('ubah-password'); setPasswordMsg({ tipe: '', teks: '' }); }} className={`menu-btn w-full text-left px-4 py-3 rounded-xl ${activeMenu === 'ubah-password' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="lock" className="w-[18px] h-[18px] shrink-0" /><span>Ubah Password</span></button>
                    {!isSimulatedSession && (
                      <button
                        onClick={() => { if (window.confirm('Yakin ingin keluar dari akun Anda?')) handleUserLogout(); }}
                        className="menu-btn w-full text-left px-4 py-3 rounded-xl bg-rose-600/90 text-rose-50 font-bold hover:bg-rose-600 transition-colors duration-150 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" /><path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.19l-2.72-2.72a.75.75 0 111.06-1.06l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 11-1.06-1.06l2.72-2.72H6.75A.75.75 0 016 10z" clipRule="evenodd" /></svg>
                        Logout
                      </button>
                    )}
                  </>
                )}

                {role === 'admin' && (
                  <div className="pt-4 mt-4 border-t border-blue-900/50 space-y-1">
                    <span className="text-[9px] text-blue-300 uppercase px-4 block mb-1">Bendahara Control</span>
                    <button onClick={() => setActiveMenu('pending-pembayaran')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl flex items-center justify-between ${activeMenu === 'pending-pembayaran' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>
                      <span className="flex items-center gap-3"><Ikon nama="clock" className="w-[18px] h-[18px] shrink-0" />Pending Iuran</span>
                      {(iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').length + tunggakanList.filter(t => t.status === 'MENUNGGU VERIFIKASI').length) > 0 && (
                        <span className="bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">{iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').length + tunggakanList.filter(t => t.status === 'MENUNGGU VERIFIKASI').length}</span>
                      )}
                    </button>
                    <button onClick={() => setActiveMenu('monitoring-tunggakan')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl flex items-center justify-between ${activeMenu === 'monitoring-tunggakan' ? 'bg-rose-600 text-white shadow-lg' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>
                      <span className="flex items-center gap-3"><Ikon nama="alert" className="w-[18px] h-[18px] shrink-0" />Monitoring Tunggakan</span>
                      {jumlahWargaMenunggak > 0 && (
                        <span className="bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">{jumlahWargaMenunggak}</span>
                      )}
                    </button>
                    <button onClick={() => setActiveMenu('realisasi-belanja')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'realisasi-belanja' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="card" className="w-[18px] h-[18px] shrink-0" /><span>Realisasi Belanja Kas RT</span></button>
                    <button onClick={() => setActiveMenu('notif-pengajuan')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl flex items-center justify-between ${activeMenu === 'notif-pengajuan' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}>
                      <span className="flex items-center gap-3"><Ikon nama="userPlus" className="w-[18px] h-[18px] shrink-0" />Member Baru</span>
                      {pengajuanBaru.length > 0 && (
                        <span className="bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">{pengajuanBaru.length}</span>
                      )}
                    </button>
                    <button onClick={() => setActiveMenu('kelola-kegiatan')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'kelola-kegiatan' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="calendar" className="w-[18px] h-[18px] shrink-0" /><span>Kelola Kegiatan / Agenda</span></button>
                    <button onClick={() => setActiveMenu('manajemen-periode')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'manajemen-periode' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="refresh" className="w-[18px] h-[18px] shrink-0" /><span>Manajemen Periode</span></button>
                    <button onClick={() => setActiveMenu('cms-setting')} className={`menu-btn w-full text-left px-4 py-2 rounded-xl ${activeMenu === 'cms-setting' ? 'menu-aktif bg-emerald-600 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:translate-x-0.5'}`}><Ikon nama="cog" className="w-[18px] h-[18px] shrink-0" /><span>CMS Super Editor</span></button>
                  </div>
                )}
              </nav>
            </div>
            <button onClick={() => setView('landing')} className="relative z-10 w-full text-center bg-blue-800/60 text-blue-200 py-2 rounded-xl text-xs font-bold hover:text-white transition-colors duration-200">← Ke Beranda Depan</button>
            <AdeganPerumahan variant="sidebar" className="absolute inset-0 w-full h-full pointer-events-none z-0" />
          </div>

          {/* MAIN CONTAINER WORKSPACE (SCROLL NORMAL, TIDAK TERPOTONG) */}
          <div key={activeMenu} className="flex-1 w-full min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8 anim-fade pb-20 overflow-x-auto">

            {/* BANNER ATAS DASHBOARD - latar ilustrasi perumahan (mengikuti tema), nomor
                periode + status, dan slogan. */}
            <div className="relative -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 mb-4 h-[60px] sm:h-[66px] overflow-hidden text-white">
              <AdeganPerumahan variant="header" className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--tm-d950) 40%, transparent), transparent 24%, color-mix(in srgb, var(--tm-d950) 52%, transparent) 52%, color-mix(in srgb, var(--tm-d950) 74%, transparent))' }}></div>
              <div className="relative h-full flex items-center justify-end gap-3 sm:gap-6 px-4 sm:px-8">
                <div className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-1 border border-white/25 text-[10.5px] font-bold">
                  <Ikon nama="calendar" className="w-3.5 h-3.5" />
                  <span>No. {periodeAktif.noPeriode}</span>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider uppercase text-white bg-emerald-500">{periodeAktif.status}</span>
                </div>
                <p className="hidden lg:block font-tulisan text-[19px] leading-[1.05] italic text-right whitespace-nowrap text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] -rotate-2">Bersama Warga<br />Untuk Lingkungan yang Lebih Baik</p>
              </div>
            </div>

            {/* BANNER MODE SIMULASI - tampil di ATAS SEMUA halaman/menu sidebar
                selama akun masih memakai data contoh (isSimulatedSession),
                supaya jelas & tidak membingungkan warga bahwa data yang
                dilihat BUKAN data asli. Begitu warga daftar & login memakai
                akun sungguhan, banner ini otomatis hilang & seluruh halaman
                langsung menampilkan data ASLI RT. Bahasa sengaja dibuat
                sesederhana mungkin. Bisa ditutup lewat tombol X. */}
            {isSimulatedSession && !tutupBannerSimulasi && (
              <div className="mb-3 rounded-xl border px-3.5 py-2 flex items-center gap-2.5 text-[11px] font-semibold shadow-sm" style={{ background: 'linear-gradient(90deg, var(--tm-a50), #ffffff)', borderColor: 'var(--tm-a200)', color: 'var(--tm-d900)' }}>
                <span className="w-5 h-5 rounded-full grid place-items-center text-white shrink-0" style={{ background: 'var(--tm-d600)' }}><Ikon nama="info" className="w-3.5 h-3.5" /></span>
                <span className="flex-1 leading-snug">Ini cuma contoh tampilan (simulasi), <b>bukan data asli warga</b>. Kalau sudah daftar &amp; login pakai akun sendiri, semua data di sini otomatis berganti jadi data asli.</span>
                <button type="button" onClick={() => setTutupBannerSimulasi(true)} aria-label="Tutup" className="shrink-0 text-slate-400 hover:text-slate-700"><Ikon nama="x" className="w-4 h-4" /></button>
              </div>
            )}

            {/* INFORMASI WARGA - DASHBOARD STATISTIK KEPENDUDUKAN (USER & ADMIN, HANYA SETELAH LOGIN) */}
            {activeMenu === 'informasi-warga' && (() => {
              // Sumber data: akun SIMULASI (isSimulatedSession) selalu pakai
              // contoh/dummy ±50 KK (INFORMASI_WARGA_DUMMY), sedangkan akun
              // yang benar-benar login (admin maupun user hasil pendaftaran
              // asli) sama-sama melihat SELURUH data warga RT yang sebenarnya
              // (bukan cuma blok sendiri) - hanya fitur "Lihat Rincian" &
              // tabel Informasi Keluarga (Seluruh KK) yang tetap khusus Admin.
              // Warga berstatus "Pasif" TIDAK ikut dihitung di seluruh rekap
              // kependudukan di bawah (Total KK, Total Jiwa, Laki-laki/
              // Perempuan, Berdasarkan Usia, Status Rumah, Distribusi per
              // Blok) - dianggap sudah tidak menghuni/tidak aktif. "Akun
              // Pengurus" TETAP dihitung penuh di sini (pengecualian pengurus
              // hanya berlaku di rekap Keuangan RT, bukan data kependudukan).
              const dataWargaSemua = isSimulatedSession ? INFORMASI_WARGA_DUMMY : members;
              const dataWarga = dataWargaSemua.filter(m => m.statusAnggota !== 'Pasif');
              const totalKK = dataWarga.length;
              const totalAnggotaKeluarga = dataWarga.reduce((acc, m) => acc + (m.anggotaKeluarga || []).length, 0);
              // PERBAIKAN BUG PENGHITUNGAN GANDA "Total Jiwa" vs "Laki-laki +
              // Perempuan" vs "Berdasarkan Usia" TIDAK NYAMBUNG (mis. 37+30=67
              // tapi Total Jiwa tertulis 90): array `anggotaKeluarga` tiap KK
              // SUDAH TERMASUK baris Kepala Keluarga itu sendiri (baris pertama
              // & terkunci, hubungan: "Kepala Keluarga", diisi saat Pendaftaran).
              // Jadi Total Jiwa yang benar = jumlah SELURUH baris anggotaKeluarga
              // saja, TANPA ditambah totalKK lagi (dulu setiap KK tanpa sadar
              // dihitung 2x: sekali sebagai "KK", sekali lagi sebagai baris
              // pertama di anggotaKeluarga miliknya sendiri). Dengan begini,
              // Total Jiwa sekarang otomatis SAMA PERSIS dengan penjumlahan
              // Laki-laki+Perempuan & rekap Berdasarkan Usia di bawahnya.
              const totalJiwa = totalAnggotaKeluarga;
              const jmlMilikSendiri = dataWarga.filter(m => m.statusRumah === 'Milik Sendiri').length;
              const jmlKontrak = dataWarga.filter(m => m.statusRumah !== 'Milik Sendiri').length;
              const jmlAktif = dataWargaSemua.filter(m => m.statusAnggota === 'Aktif').length;
              const jmlPasif = dataWargaSemua.filter(m => m.statusAnggota === 'Pasif').length;
              const jmlPerempuanTanggungan = dataWarga.reduce((acc, m) => acc + (m.anggotaKeluarga || []).filter(a => a.jenisKelamin === 'Perempuan').length, 0);
              const jmlLakiTanggungan = dataWarga.reduce((acc, m) => acc + (m.anggotaKeluarga || []).filter(a => a.jenisKelamin === 'Laki-laki').length, 0);
              const rekapUsiaRT = getRekapKategoriUsia(dataWarga);
              const totalUsiaTerdata = Object.values(rekapUsiaRT).reduce((a, b) => a + b, 0);
              // REKAP WARGA PER BLOK - jumlah KK & jumlah jiwa (KK + seluruh anggota
              // keluarga yang tercatat) per blok, SELALU seluruh blok RT (baik untuk
              // Admin maupun akun user asli). Khusus SIMULASI AKUN, dihitung dari
              // blok & data dummy (INFORMASI_WARGA_DUMMY), bukan blok/data asli.
              const perBlokSemua = (isSimulatedSession ? KELOMPOK_DUMMY_INFORMASI_WARGA : kelompokList).map(k => {
                const anggotaBlokIni = dataWarga.filter(m => cocokBlok(m.kelompok, k.nama));
                const jumlahKK = anggotaBlokIni.length;
                // (lihat catatan perbaikan double-count di atas) - anggotaKeluarga
                // tiap KK sudah termasuk baris KK itu sendiri.
                const jumlahJiwa = anggotaBlokIni.reduce((acc, m) => acc + (m.anggotaKeluarga || []).length, 0);
                return { ...k, jumlahKK, jumlahJiwa };
              });
              // Distribusi Warga per Blok: SEMUA blok ditampilkan baik untuk Admin
              // maupun akun user (warga) - user hanya tidak melihat tombol "Lihat
              // Rincian" & progress bar (dua fitur itu tetap khusus Admin).
              // Diurutkan otomatis PARETO: dari jumlah KK TERTINGGI ke TERENDAH,
              // supaya blok paling padat langsung terlihat di paling atas.
              const perBlok = [...perBlokSemua].sort((a, b) => b.jumlahKK - a.jumlahKK);
              // Warga Terbaru & Warga Keluar: SEMUA data RT ditampilkan baik untuk
              // Admin maupun akun user (warga) - supaya info warga masuk/keluar
              // otomatis konek & terlihat oleh seluruh warga, bukan hanya blok sendiri.
              // KHUSUS SIMULASI AKUN: pakai data dummy (1-5 contoh), BUKAN data asli.
              const wargaTerbaru = isSimulatedSession ? WARGA_TERBARU_DUMMY : members.slice(-5).reverse();
              const wargaKeluarTampil = isSimulatedSession ? WARGA_KELUAR_DUMMY : wargaKeluarList.slice(-5).reverse();

              return (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">📊 Informasi Warga</h3>
                    <p className="text-xs text-slate-400">
                      {role === 'admin' ? 'Ringkasan data kependudukan seluruh warga RT, khusus untuk pengurus.' : 'Ringkasan data kependudukan seluruh warga RT.'}
                      {isSimulatedSession ? ' (Data contoh/simulasi.)' : ''}
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Laki-laki</span>
                      <span className="text-2xl font-black text-indigo-700 block mt-1">{jmlLakiTanggungan}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Perempuan</span>
                      <span className="text-2xl font-black text-rose-600 block mt-1">{jmlPerempuanTanggungan}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* KOMPOSISI USIA */}
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-3">Berdasarkan Usia (Anggota Keluarga)</h4>
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

                  {/* DISTRIBUSI/REKAP WARGA PER BLOK - jumlah KK & jumlah jiwa.
                      Admin melihat semua blok, akun user (warga) hanya melihat
                      blok tempat tinggalnya sendiri, otomatis terhubung dengan
                      data Anggota (Google Sheet) tanpa perlu input manual. */}
                  <div className="bg-white p-5 rounded-2xl border shadow-xs">
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-1">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                        Distribusi Warga per Blok
                      </h4>
                      {/* TOGGLE DASAR PERSENTASE: KK (Kepala Keluarga) atau Jiwa (seluruh
                          anggota keluarga). Tersedia untuk Admin maupun akun user. */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[10px] font-black">
                        <button
                          type="button"
                          onClick={() => setModePersenBlok('kk')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${modePersenBlok === 'kk' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
                        >
                          Berdasarkan KK
                        </button>
                        <button
                          type="button"
                          onClick={() => setModePersenBlok('jiwa')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${modePersenBlok === 'jiwa' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
                        >
                          Berdasarkan Jiwa
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3">
                      *Persentase di bawah ini dihitung berdasarkan {modePersenBlok === 'kk' ? <><strong className="text-slate-600">jumlah KK (Kepala Keluarga)</strong> tiap blok dibagi total {totalKK} KK se-RT</> : <><strong className="text-slate-600">jumlah Jiwa</strong> (KK + seluruh anggota keluarga) tiap blok dibagi total {totalJiwa} Jiwa se-RT</>}.
                    </p>

                    {/* PIE CHART PEMETAAN WARGA BY BLOK (ADMIN & USER) - klik salah
                        satu bagian/legenda untuk otomatis "zoom" (exploded slice).
                        Mengikuti toggle KK/Jiwa di atas. Fitur "Lihat Rincian" tetap
                        khusus Admin, TIDAK ditampilkan untuk akun user. */}
                    {(() => {
                      const gradientColor = (i, n) => {
                        const hue = Math.round((360 / Math.max(n, 1)) * i);
                        return { from: `hsl(${hue}, 68%, 42%)`, to: `hsl(${hue}, 68%, 58%)` };
                      };
                      const nilaiBlok = (k) => (modePersenBlok === 'kk' ? k.jumlahKK : k.jumlahJiwa);
                      const blokDenganWarga = perBlok.filter(k => nilaiBlok(k) > 0);
                      const pieDataBlok = blokDenganWarga.map((k, idx) => {
                        const { from, to } = gradientColor(idx, blokDenganWarga.length);
                        return { label: k.nama, value: nilaiBlok(k), colorFrom: from, colorTo: to };
                      });
                      return pieDataBlok.length > 0 ? (
                        <div className="flex justify-center mb-5 pb-5 border-b">
                          <PieChartBlok data={pieDataBlok} unitLabel={modePersenBlok === 'kk' ? 'KK' : 'Jiwa'} />
                        </div>
                      ) : null;
                    })()}

                    <div className="space-y-3">
                      {perBlok.map(k => {
                        const persenKK = totalKK > 0 ? Math.round((k.jumlahKK / totalKK) * 100) : 0;
                        const persenJiwa = totalJiwa > 0 ? Math.round((k.jumlahJiwa / totalJiwa) * 100) : 0;
                        const persen = modePersenBlok === 'kk' ? persenKK : persenJiwa;
                        const rincianTerbuka = rincianBlokTerbuka === k.nama;
                        // Daftar KK & anggota keluarga di blok ini (khusus untuk rincian admin)
                        const kkDiBlokIni = role === 'admin' ? dataWarga.filter(m => cocokBlok(m.kelompok, k.nama)) : [];
                        return (
                          <div key={k.id} className="text-[11px] font-semibold">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-slate-600">{k.nama} <span className="text-slate-400 font-normal">({k.jenis})</span></span>
                              <span className="flex items-center gap-2">
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg font-black">{k.jumlahKK} KK</span>
                                <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-lg font-black">{k.jumlahJiwa} Jiwa</span>
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-black" title={`${persen}% berdasarkan ${modePersenBlok === 'kk' ? 'KK' : 'Jiwa'}`}>{persen}%</span>
                                {role === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => setRincianBlokTerbuka(rincianTerbuka ? null : k.nama)}
                                    className={`px-2 py-0.5 rounded-lg font-black text-[10px] transition-colors ${rincianTerbuka ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                  >
                                    {rincianTerbuka ? 'Tutup' : 'Lihat Rincian'}
                                  </button>
                                )}
                              </span>
                            </div>
                            {role === 'admin' && (
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${persen}%` }}></div>
                              </div>
                            )}

                            {/* RINCIAN ANGGOTA KELUARGA PER KK DI BLOK INI (ADMIN, KLIK "LIHAT RINCIAN") */}
                            {role === 'admin' && rincianTerbuka && (
                              <div className="mt-3 mb-1 space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3 anim-fade">
                                {kkDiBlokIni.length === 0 && (
                                  <p className="text-slate-400 italic text-[11px]">Belum ada KK tercatat di blok ini.</p>
                                )}
                                {kkDiBlokIni.map(kk => (
                                  <div key={kk.id} className="bg-white border rounded-xl p-3">
                                    <p className="text-[11px] font-black text-slate-900">{kk.nama} <span className="font-normal text-slate-400">— {kk.nomorRumah || kk.kelompok} • Status Rumah: {kk.statusRumah || '-'}</span></p>
                                    <div className="overflow-x-auto mt-2">
                                      <table className="w-full text-[10px] font-semibold">
                                        <thead>
                                          <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                                            <th className="py-1.5 pr-2">Nama</th>
                                            <th className="py-1.5 pr-2">Hubungan</th>
                                            <th className="py-1.5 pr-2">Jenis Kelamin</th>
                                            <th className="py-1.5 pr-2">Tanggal Lahir</th>
                                            <th className="py-1.5 pr-2">Usia</th>
                                            <th className="py-1.5 pr-2">Kategori</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(kk.anggotaKeluarga || []).map(a => {
                                            const usia = hitungUsia(a.tanggalLahir);
                                            return (
                                              <tr key={a.id} className="border-b last:border-0">
                                                <td className="py-1.5 pr-2 font-black text-slate-900">{a.nama}</td>
                                                <td className="py-1.5 pr-2 text-emerald-700 font-bold">{a.hubungan || '-'}</td>
                                                <td className="py-1.5 pr-2 text-slate-500">{a.jenisKelamin}</td>
                                                <td className="py-1.5 pr-2 text-slate-500">{formatTanggalIndo(a.tanggalLahir)}</td>
                                                <td className="py-1.5 pr-2 text-slate-700 font-bold">{usia !== null ? `${usia} tahun` : '-'}</td>
                                                <td className="py-1.5 pr-2"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">{kategoriUsia(usia)}</span></td>
                                              </tr>
                                            );
                                          })}
                                          {(kk.anggotaKeluarga || []).length === 0 && (
                                            <tr><td colSpan={6} className="py-2 text-center text-slate-400 italic">Belum ada anggota keluarga tercatat.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {perBlok.length === 0 && <p className="text-slate-400 italic text-[11px]">{role === 'admin' ? 'Belum ada blok terdaftar.' : 'Data blok Anda belum terdaftar.'}</p>}
                    </div>
                  </div>

                  {/* DISTRIBUSI WARGA PASIF / KELUAR PER BLOK (KHUSUS ADMIN)
                      Warga berstatus Pasif TIDAK ikut dihitung di "Distribusi
                      Warga per Blok" & rekap kependudukan di atas (lihat
                      dataWarga), jadi section ini khusus menampung mereka:
                      per blok, klik "Lihat Rincian" untuk lihat detail
                      anggota keluarganya (format sama seperti tabel Anggota
                      Keluarga) + Tanggal Keluar (diambil dari data yang
                      admin isi sendiri di menu "Kelola Warga Keluar", kalau
                      belum diisi tetap ditampilkan "-"). */}
                  {role === 'admin' && (() => {
                    const cariTanggalKeluar = (namaWarga) => {
                      const found = wargaKeluarList.find(w => w.nama === namaWarga);
                      return found ? found.tanggalKeluar : null;
                    };
                    const perBlokPasifSemua = (isSimulatedSession ? KELOMPOK_DUMMY_INFORMASI_WARGA : kelompokList).map(k => {
                      const pasifBlokIni = dataWargaSemua.filter(m => cocokBlok(m.kelompok, k.nama) && m.statusAnggota === 'Pasif');
                      return { ...k, pasifBlokIni };
                    });
                    const totalPasifSemua = dataWargaSemua.filter(m => m.statusAnggota === 'Pasif').length;
                    return (
                      <div className="bg-white p-5 rounded-2xl border shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase">Distribusi Warga Pasif / Keluar per Blok</h4>
                          <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg font-black text-[10px]">Jumlah Pasif/Keluar: {totalPasifSemua} KK</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3">Warga berstatus Pasif tidak ikut dihitung di rekap kependudukan &amp; keuangan RT lainnya. Klik "Lihat Rincian" untuk melihat detail anggota keluarga &amp; tanggal keluarnya (berdasarkan data di menu "Kelola Warga Keluar").</p>
                        <div className="space-y-3">
                          {perBlokPasifSemua.map(k => {
                            const rincianTerbuka = rincianBlokPasifTerbuka === k.nama;
                            return (
                              <div key={k.id} className="text-[11px] font-semibold">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-slate-600">{k.nama} <span className="text-slate-400 font-normal">({k.jenis})</span></span>
                                  <span className="flex items-center gap-2">
                                    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg font-black">{k.pasifBlokIni.length} KK Pasif</span>
                                    <button
                                      type="button"
                                      onClick={() => setRincianBlokPasifTerbuka(rincianTerbuka ? null : k.nama)}
                                      className={`px-2 py-0.5 rounded-lg font-black text-[10px] transition-colors ${rincianTerbuka ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                      {rincianTerbuka ? 'Tutup' : 'Lihat Rincian'}
                                    </button>
                                  </span>
                                </div>

                                {rincianTerbuka && (
                                  <div className="mt-3 mb-1 space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3 anim-fade">
                                    {k.pasifBlokIni.length === 0 && (
                                      <p className="text-slate-400 italic text-[11px]">Tidak ada warga Pasif/Keluar di blok ini.</p>
                                    )}
                                    {k.pasifBlokIni.map(kk => {
                                      const tglKeluar = cariTanggalKeluar(kk.nama);
                                      return (
                                        <div key={kk.id} className="bg-white border rounded-xl p-3">
                                          <p className="text-[11px] font-black text-slate-900">
                                            {kk.nama} <span className="font-normal text-slate-400">— {kk.nomorRumah || kk.kelompok} • Status Rumah: {kk.statusRumah || '-'}</span>
                                          </p>
                                          <p className="text-[10px] font-bold mt-0.5">
                                            <span className="text-slate-400 font-normal">Tanggal Keluar: </span>
                                            {tglKeluar ? <span className="text-rose-600">{tglKeluar}</span> : <span className="text-slate-400 italic font-normal">belum diisi admin (lihat menu Kelola Warga Keluar)</span>}
                                          </p>
                                          <div className="overflow-x-auto mt-2">
                                            <table className="w-full text-[10px] font-semibold">
                                              <thead>
                                                <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                                                  <th className="py-1.5 pr-2">Nama</th>
                                                  <th className="py-1.5 pr-2">Hubungan</th>
                                                  <th className="py-1.5 pr-2">Jenis Kelamin</th>
                                                  <th className="py-1.5 pr-2">Tanggal Lahir</th>
                                                  <th className="py-1.5 pr-2">Usia</th>
                                                  <th className="py-1.5 pr-2">Kategori</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {(kk.anggotaKeluarga || []).map(a => {
                                                  const usia = hitungUsia(a.tanggalLahir);
                                                  return (
                                                    <tr key={a.id} className="border-b last:border-0">
                                                      <td className="py-1.5 pr-2 font-black text-slate-900">{a.nama}</td>
                                                      <td className="py-1.5 pr-2 text-emerald-700 font-bold">{a.hubungan || '-'}</td>
                                                      <td className="py-1.5 pr-2 text-slate-500">{a.jenisKelamin}</td>
                                                      <td className="py-1.5 pr-2 text-slate-500">{formatTanggalIndo(a.tanggalLahir)}</td>
                                                      <td className="py-1.5 pr-2 text-slate-700 font-bold">{usia !== null ? `${usia} tahun` : '-'}</td>
                                                      <td className="py-1.5 pr-2"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-600">{kategoriUsia(usia)}</span></td>
                                                    </tr>
                                                  );
                                                })}
                                                {(kk.anggotaKeluarga || []).length === 0 && (
                                                  <tr><td colSpan={6} className="py-2 text-center text-slate-400 italic">Belum ada anggota keluarga tercatat.</td></tr>
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {perBlokPasifSemua.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada blok terdaftar.</p>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* DAFTAR ANGGOTA KELUARGA SELURUH KK (KHUSUS ADMIN) - format tabel
                      sama seperti tab "Anggota Keluarga" di akun user, supaya Admin bisa
                      lihat seluruh anggota keluarga tiap KK dalam satu halaman ini. */}
                  {role === 'admin' && (
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-3">👨‍👩‍👧‍👦 Informasi Keluarga (Seluruh KK)</h4>
                      <div className="space-y-4">
                        {dataWarga.map(kk => (
                          <div key={kk.id} className="border rounded-xl p-3">
                            <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                              <p className="text-[11px] font-black text-slate-900">{kk.nama} <span className="font-normal text-slate-400">— {kk.nomorRumah || kk.kelompok} • Status Rumah: {kk.statusRumah || '-'}</span></p>
                              <span className="text-[10px] font-bold text-slate-400">{(kk.anggotaKeluarga || []).length} anggota tercatat</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px] font-semibold">
                                <thead>
                                  <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                                    <th className="py-1.5 pr-2">Nama</th>
                                    <th className="py-1.5 pr-2">Hubungan</th>
                                    <th className="py-1.5 pr-2">Jenis Kelamin</th>
                                    <th className="py-1.5 pr-2">Tanggal Lahir</th>
                                    <th className="py-1.5 pr-2">Usia</th>
                                    <th className="py-1.5 pr-2">Kategori</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(kk.anggotaKeluarga || []).map(a => {
                                    const usia = hitungUsia(a.tanggalLahir);
                                    return (
                                      <tr key={a.id} className="border-b last:border-0">
                                        <td className="py-1.5 pr-2 font-black text-slate-900">{a.nama}</td>
                                        <td className="py-1.5 pr-2 text-emerald-700 font-bold">{a.hubungan || '-'}</td>
                                        <td className="py-1.5 pr-2 text-slate-500">{a.jenisKelamin}</td>
                                        <td className="py-1.5 pr-2 text-slate-500">{formatTanggalIndo(a.tanggalLahir)}</td>
                                        <td className="py-1.5 pr-2 text-slate-700 font-bold">{usia !== null ? `${usia} tahun` : '-'}</td>
                                        <td className="py-1.5 pr-2"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">{kategoriUsia(usia)}</span></td>
                                      </tr>
                                    );
                                  })}
                                  {(kk.anggotaKeluarga || []).length === 0 && (
                                    <tr><td colSpan={6} className="py-2 text-center text-slate-400 italic">Belum ada anggota keluarga tercatat.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                        {dataWarga.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada data KK tercatat.</p>}
                      </div>
                    </div>
                  )}

                  {/* WARGA TERBARU & WARGA KELUAR (dibagi 2 kolom berdampingan) */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-3">Terbaru berdasarkan daftar Portal RT 40</h4>
                      <ul className="divide-y text-[11px] font-semibold">
                        {wargaTerbaru.map(m => (
                          <li key={m.id} className="py-2 flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <span className="text-slate-900 font-black block truncate">{m.nama}</span>
                              <span className="text-slate-400 font-normal">{m.nomorRumah || m.kelompok}</span>
                            </div>
                            <span className="text-slate-400 shrink-0">{formatTanggalIndo(m.bergabung)}</span>
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
                            <span className="text-slate-400 shrink-0">{formatTanggalIndo(w.tanggalKeluar)}</span>
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
                  <div className="space-y-4 anim-fade">
                    {/* Catatan simulasi khusus halaman ini SUDAH DIHAPUS - sekarang
                        cukup pakai 1 banner simulasi global di paling atas halaman
                        (lihat isSimulatedSession di MAIN CONTAINER WORKSPACE) supaya
                        tidak dobel/tumpuk 2 kotak kuning. */}
                    {/* KARTU SAPAAN - latar ilustrasi perumahan (mengikuti tema) + lonceng notifikasi */}
                    <div className="relative rounded-3xl border border-white bg-white shadow-lg">
                      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                        <AdeganPerumahan variant="sapaan" className="absolute right-0 top-0 h-full w-full sm:w-[68%] opacity-30 sm:opacity-100" style={{ WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 42%)', maskImage: 'linear-gradient(90deg, transparent 0%, #000 42%)' }} />
                      </div>
                      <div className="relative flex items-center justify-between gap-3 p-4 sm:p-[18px]">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative shrink-0">
                            <span className="absolute inset-0 rounded-full blur-lg opacity-60" style={{ background: 'var(--tm-d400)' }}></span>
                            <div className="relative w-[52px] h-[52px] rounded-full grid place-items-center text-white shadow-xl ring-[3px] ring-white" style={{ background: 'linear-gradient(135deg, var(--tm-d500), var(--tm-d800))' }}>
                              <Ikon nama="home" className="w-6 h-6" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-base sm:text-[18px] font-black text-slate-900 leading-tight">Assalamu'alaikum, {activeUserSession.nama} 👋</h2>
                            <p className="text-[11.5px] sm:text-[12.5px] font-semibold mt-0.5" style={{ color: 'var(--tm-d700)' }}>Berikut ringkasan iuran Anda periode {periodeTahun}.</p>
                          </div>
                        </div>
                        <NotifikasiBell />
                      </div>
                    </div>

                    {/* 4 KARTU RINGKASAN */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { judul: 'Target Total', nilai: `Rp ${activeUserSession.target.toLocaleString('id-ID')}`, ikon: 'target', sudut: 'trend', tile: 'linear-gradient(135deg, var(--tm-d500), var(--tm-d700))', gelombang: 'var(--tm-d200)', sudutWarna: 'var(--tm-d400)', latar: 'var(--tm-d50)', warnaNilai: 'var(--tm-d950)' },
                        { judul: 'Sudah Dibayar', nilai: `Rp ${userDanaMasuk.toLocaleString('id-ID')}`, ikon: 'card', sudut: 'checkCircle', tile: 'linear-gradient(135deg, var(--tm-a500), var(--tm-a700))', gelombang: 'var(--tm-a200)', sudutWarna: 'var(--tm-a500)', latar: 'var(--tm-a50)', warnaNilai: 'var(--tm-a700)' },
                        { judul: 'Sisa Tagihan', nilai: `Rp ${userSisaTagihan.toLocaleString('id-ID')}`, ikon: 'coin', sudut: 'chart', tile: 'linear-gradient(135deg, #fb7185, #e11d48)', gelombang: '#fecdd3', sudutWarna: '#fb7185', latar: '#fff1f2', warnaNilai: '#e11d48' },
                        { judul: 'Persentase', nilai: `${persentaseCapaian}%`, ikon: 'percent', sudut: 'chart', tile: 'linear-gradient(135deg, #a78bfa, #7c3aed)', gelombang: '#ddd6fe', sudutWarna: '#a78bfa', latar: '#f5f3ff', warnaNilai: '#1e293b' },
                      ].map((k) => (
                        <div key={k.judul} className="relative overflow-hidden rounded-2xl border border-white shadow-md p-3.5 pb-9" style={{ background: `linear-gradient(180deg, #ffffff 35%, ${k.latar})` }}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <span className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl grid place-items-center text-white shadow-lg" style={{ background: k.tile }}><Ikon nama={k.ikon} className="w-6 h-6" /></span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">{k.judul}</p>
                              <p className="text-[16px] sm:text-[19px] font-black leading-tight" style={{ color: k.warnaNilai }}>{k.nilai}</p>
                            </div>
                          </div>
                          <span className="absolute top-3 right-3" style={{ color: k.sudutWarna }}><Ikon nama={k.sudut} className="w-4 h-4" /></span>
                          <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-7 pointer-events-none" aria-hidden="true">
                            <path d="M0 24 C36 4 78 42 128 22 S184 6 200 16 V40 H0 Z" style={{ fill: k.gelombang, opacity: 0.85 }} />
                          </svg>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                      <div className="lg:col-span-2 space-y-4 min-w-0">
                        {/* PROGRESS PEMBAYARAN + TIMELINE 12 BULAN */}
                        <div className="rounded-3xl border border-white bg-white shadow-md p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-11 h-11 shrink-0 rounded-2xl grid place-items-center" style={{ background: 'var(--tm-d50)', color: 'var(--tm-d600)' }}><Ikon nama="calendar" className="w-5 h-5" /></span>
                              <div className="min-w-0">
                                <h3 className="text-[15px] font-black text-slate-900 leading-tight">Progress Pembayaran</h3>
                                <p className="text-[12px] text-slate-500 font-medium mt-0.5">Anda telah menyelesaikan {userRows.filter(r => r.status === 'LUNAS').length} dari 12 angsuran.</p>
                              </div>
                            </div>
                            <span className="text-xl font-black shrink-0 text-emerald-600">{persentaseCapaian}%</span>
                          </div>
                          <div className="mt-4 h-3 rounded-full overflow-hidden" style={{ background: 'var(--tm-d100)' }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${persentaseCapaian}%`, background: 'linear-gradient(90deg, var(--tm-a600), var(--tm-a400))', boxShadow: '0 0 14px var(--tm-a400)' }}></div>
                          </div>
                          <h4 className="mt-5 mb-2.5 text-[11px] font-black uppercase tracking-wide text-slate-800">Timeline Pembayaran {labelRentangPeriode}</h4>
                          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                            {DAFTAR_BULAN.map((bln) => {
                              const baris = userRows.find(r => r.bulanNama === bln.nama);
                              const st = baris ? baris.status : 'BELUM BAYAR';
                              const lunas = st === 'LUNAS';
                              const menunggu = st === 'MENUNGGU VERIFIKASI';
                              const tahunBln = getTahunUntukBulan(bln.nama);
                              return (
                                <div key={bln.id} title={`${bln.nama} ${tahunBln}: ${st}`} className={`rounded-xl border pt-2 pb-2 px-1 text-center flex flex-col items-center gap-1.5 shadow-sm ${lunas ? 'border-emerald-200 bg-emerald-50' : menunggu ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                                  <div className="leading-tight">
                                    <p className={`text-[11px] font-black ${lunas ? 'text-emerald-700' : menunggu ? 'text-amber-700' : 'text-slate-700'}`}>{bln.nama.slice(0, 3)}</p>
                                    <p className="text-[9px] font-semibold text-slate-400">{tahunBln}</p>
                                  </div>
                                  {lunas ? (
                                    <span className="w-6 h-6 rounded-full grid place-items-center bg-emerald-600 text-white shadow"><Ikon nama="check" className="w-3.5 h-3.5" strokeWidth={3.2} /></span>
                                  ) : menunggu ? (
                                    <span className="w-6 h-6 rounded-full grid place-items-center bg-amber-400 text-white shadow"><Ikon nama="clock" className="w-3.5 h-3.5" strokeWidth={2.8} /></span>
                                  ) : (
                                    <span className="w-6 h-6 rounded-full grid place-items-center bg-slate-100"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span></span>
                                  )}
                                  <span className={`h-1.5 w-[80%] rounded-full ${lunas ? 'bg-emerald-600' : menunggu ? 'bg-amber-400' : 'bg-slate-200'}`}></span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* VISI & MISI */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <KartuVisiMisi judul="VISI" teks={cmsTeks.visi} ikon="eye" ramp="d" panah onKlik={() => { setActiveMenu('informasi-umum'); window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                          <KartuVisiMisi judul="MISI" teks={cmsTeks.misi} ikon="users" ramp="a" panah onKlik={() => { setActiveMenu('informasi-umum'); window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                        </div>
                      </div>

                      <div className="space-y-4 min-w-0">
                        {/* INFORMASI SAYA */}
                        <div className="rounded-3xl border border-white bg-white shadow-md p-5">
                          <div className="flex items-center justify-between gap-2 mb-3.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center" style={{ background: 'var(--tm-d50)', color: 'var(--tm-d600)' }}><Ikon nama="user" className="w-5 h-5" /></span>
                              <h3 className="text-[15px] font-black text-slate-900">Informasi Saya</h3>
                            </div>
                            {/* Perubahan data warga wajib dikonfirmasi ke pengurus RT (lihat Ketentuan Program) -
                                tombol Edit membuka WhatsApp Pengurus dengan pesan permintaan ubah data. */}
                            <a
                              href={`${buatLinkWhatsapp(cmsTeks.infoKontak)}?text=${encodeURIComponent(`Halo Pengurus RT, saya ${activeUserSession.nama} (${activeUserSession.nomorRumah || activeUserSession.kelompok || '-'}) ingin mengubah data saya di aplikasi Iuran Warga.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              <Ikon nama="pencil" className="w-3 h-3" /> Edit
                            </a>
                          </div>
                          <div className="space-y-2.5 text-[12px]">
                            {[
                              { ikon: 'user', label: 'Nama', nilai: activeUserSession.nama },
                              { ikon: 'home', label: 'Nomor Rumah/Blok', nilai: activeUserSession.nomorRumah || activeUserSession.nama },
                              { ikon: 'phone', label: 'No. WhatsApp', nilai: activeUserSession.wa },
                              { ikon: 'mapPin', label: 'Alamat', nilai: activeUserSession.alamat || '-' },
                              { ikon: 'calendar', label: 'Tanggal Bergabung', nilai: activeUserSession.bergabung },
                            ].map((b) => (
                              <div key={b.label} className="flex items-start gap-2">
                                <span className="w-[8.6rem] shrink-0 flex items-center gap-2 text-slate-500 font-semibold text-[11px]"><Ikon nama={b.ikon} className="w-4 h-4 shrink-0" />{b.label}</span>
                                <span className="font-bold text-slate-800 min-w-0 break-words">{b.nilai}</span>
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <span className="w-[8.6rem] shrink-0 flex items-center gap-2 text-slate-500 font-semibold text-[11px]"><Ikon nama="checkCircle" className="w-4 h-4 shrink-0" />Status</span>
                              <span className={`px-3 py-0.5 rounded-full text-[11px] font-black ${activeUserSession.statusAnggota === 'Aktif' ? 'bg-[#d1fae5] text-[#047857]' : 'bg-slate-200 text-slate-500'}`}>{activeUserSession.statusAnggota}</span>
                            </div>
                          </div>
                        </div>

                        {/* PENGUMUMAN & AGENDA TERBARU */}
                        <div className="rounded-3xl border border-white bg-white shadow-md p-5">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center" style={{ background: 'var(--tm-d50)', color: 'var(--tm-d600)' }}><Ikon nama="megaphone" className="w-[18px] h-[18px]" /></span>
                              <h3 className="text-[14px] font-black text-slate-900 leading-tight">Pengumuman &amp; Agenda Terbaru</h3>
                            </div>
                            <button type="button" onClick={() => { setActiveMenu('informasi-umum'); window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="shrink-0 text-[11px] font-bold text-blue-700 hover:underline">Lihat Semua</button>
                          </div>
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5 flex items-start gap-3">
                            <span className="w-10 h-10 shrink-0 rounded-xl grid place-items-center bg-white text-emerald-600 shadow-sm"><Ikon nama="calendar" className="w-5 h-5" /></span>
                            <div className="min-w-0 text-[12px] leading-relaxed text-slate-600 font-medium">
                              <p>{cmsTeks.pengumuman}</p>
                              {kegiatanList.length > 0 && (
                                <p className="mt-2 pt-2 border-t border-emerald-100">
                                  <span className="block font-black text-emerald-800 text-[11px]">{kegiatanList[kegiatanList.length - 1].judul}</span>
                                  <span className="block text-emerald-700 font-semibold text-[10px] mt-0.5">{formatAgendaLengkap(kegiatanList[kegiatanList.length - 1].tanggal, kegiatanList[kegiatanList.length - 1].jam)} — {kegiatanList[kegiatanList.length - 1].tempat}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TUNGGAKAN PERIODE SEBELUMNYA - tagihan belum lunas yang dibawa dari periode
                        yang sudah ditutup Admin. Tagihan ini TERUS BERLANJUT (tidak hilang) sampai
                        benar-benar dilunasi & diverifikasi Bendahara, walau periode asalnya sudah ditutup. */}
                    {userTunggakan.length > 0 && (
                      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl shadow-xs">
                        <div className="flex justify-between items-center border-b border-rose-200 pb-2 mb-4 flex-wrap gap-1">
                          <h3 className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">⚠️ Tunggakan Periode Sebelumnya</h3>
                          <p className="text-[10px] text-rose-500 font-bold">Total belum lunas: Rp {userTotalTunggakan.toLocaleString('id-ID')}</p>
                        </div>
                        <p className="text-[10px] text-rose-600 -mt-2 mb-3">Tagihan bulan-bulan berikut belum lunas sejak periode sebelumnya ditutup Admin. Tagihan ini tetap berjalan &amp; wajib dilunasi - upload bukti transfer kapan saja untuk melunasinya.</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] font-semibold">
                            <thead>
                              <tr className="text-rose-400 uppercase text-[9px] text-left border-b border-rose-200">
                                <th className="py-2 pr-2">Bulan / Tahun</th>
                                <th className="py-2 pr-2">Periode Asal</th>
                                <th className="py-2 pr-2">Nominal</th>
                                <th className="py-2 pr-2">Status</th>
                                <th className="py-2 pr-2">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userTunggakan.map((t) => {
                                const inputBayar = formBayarInput[`TGK-${t.id}`] || { tanggal: '', nominal: t.nominal || IURAN_BULANAN };
                                return (
                                  <tr key={t.id} className="border-b border-rose-100 last:border-0">
                                    <td className="py-2.5 pr-2 text-slate-900 font-black">{t.bulanNama} {t.tahunAsal}</td>
                                    <td className="py-2.5 pr-2 text-slate-500">{t.noPeriodeAsal}</td>
                                    <td className="py-2.5 pr-2 text-slate-700">
                                      {t.status === 'BELUM BAYAR' ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-400 font-normal">Rp</span>
                                          <input
                                            type="number"
                                            min="1"
                                            value={inputBayar.nominal}
                                            onChange={(e) => setFormBayarInput({ ...formBayarInput, [`TGK-${t.id}`]: { ...inputBayar, nominal: e.target.value } })}
                                            className="w-24 border p-1 rounded-lg bg-white font-bold"
                                          />
                                        </div>
                                      ) : (
                                        <>Rp {Number(t.nominal).toLocaleString('id-ID')}</>
                                      )}
                                      {t.status === 'BELUM BAYAR' && (
                                        <input
                                          type="date"
                                          value={inputBayar.tanggal}
                                          onChange={(e) => setFormBayarInput({ ...formBayarInput, [`TGK-${t.id}`]: { ...inputBayar, tanggal: e.target.value } })}
                                          className="border p-1 rounded-lg bg-white font-bold text-slate-700 mt-1 block"
                                        />
                                      )}
                                    </td>
                                    <td className="py-2.5 pr-2"><BadgeStatus status={t.status} /></td>
                                    <td className="py-2.5 pr-2 text-right">
                                      {t.status === 'BELUM BAYAR' && (() => {
                                        const belumLengkap = !inputBayar.tanggal || !inputBayar.nominal || Number(inputBayar.nominal) <= 0;
                                        return (
                                          <label
                                            title={belumLengkap ? 'Isi Tanggal Bayar & Nominal terlebih dahulu' : 'Klik untuk pilih file bukti transfer'}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] transition-transform whitespace-nowrap inline-block ${belumLengkap ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-br from-rose-700 via-rose-800 to-rose-900 text-white hover:scale-[1.03] cursor-pointer'}`}
                                          >
                                            Lunasi / Upload Bukti
                                            <input type="file" accept="image/*,.pdf" disabled={belumLengkap} className="hidden" onChange={(e) => handleUploadBayar(e, t.bulanNama, inputBayar.tanggal, inputBayar.nominal, t.id)} />
                                          </label>
                                        );
                                      })()}
                                      {t.status === 'MENUNGGU VERIFIKASI' && (
                                        <span className="text-amber-600 text-[10px] font-bold whitespace-nowrap">Menunggu Bendahara</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

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
                              <th className="py-2 pr-2">Pembayaran</th>
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
                                  <td className="py-2.5 pr-2 text-slate-900 font-black">{bln.nama} {getTahunUntukBulan(bln.nama)}</td>
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
                                        {status === 'BELUM BAYAR' && (() => {
                                          // KUNCI TOMBOL UPLOAD: sebelumnya warga bisa langsung buka
                                          // file picker & pilih file walau kolom "Tanggal Bayar" masih
                                          // kosong - baru ditolak SETELAH pilih file (toast error, harus
                                          // ulang). Sekarang tombol "Upload Bukti" otomatis TERKUNCI
                                          // (abu-abu, tidak bisa diklik) SEBELUM Tanggal Bayar & Nominal
                                          // diisi dengan benar, supaya warga tahu dulu apa yang kurang
                                          // tanpa perlu buka file picker berkali-kali.
                                          const belumLengkap = !inputBayar.tanggal || !inputBayar.nominal || Number(inputBayar.nominal) <= 0;
                                          return (
                                            <label
                                              title={belumLengkap ? 'Isi Tanggal Bayar & Nominal terlebih dahulu' : 'Klik untuk pilih file bukti transfer'}
                                              className={`px-3 py-1.5 rounded-lg text-[10px] transition-transform whitespace-nowrap ${belumLengkap ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white hover:scale-[1.03] cursor-pointer'}`}
                                            >
                                              Upload Bukti
                                              <input type="file" accept="image/*,.pdf" disabled={belumLengkap} className="hidden" onChange={(e) => handleUploadBayar(e, bln.nama, inputBayar.tanggal, inputBayar.nominal)} />
                                            </label>
                                          );
                                        })()}
                                        {status === 'MENUNGGU VERIFIKASI' && (
                                          <span className="text-amber-600 text-[10px] font-bold whitespace-nowrap">Menunggu Bendahara</span>
                                        )}
                                        {status === 'LUNAS' && (
                                          <button onClick={() => setSelectedKuitansi({ nama: activeUserSession.nama, nomorRumah: activeUserSession.nomorRumah || activeUserSession.nama, email: activeUserSession.email, bulan: bln.nama, angsuranKe: bln.id, nominal: matchRow ? matchRow.nominal : IURAN_BULANAN, tanggal: matchRow.tglBayar || '10 Jan 2026', waktuLunas: (matchRow && matchRow.waktuVerifikasi) || (matchRow && matchRow.tglBayar) || '10 Januari 2026', noKuitansi: `${isSimulatedSession ? 'SIMULASI' : 'IWR'}-${periodeTahun}-${String(bln.id).padStart(4, '0')}-${activeUserSession.id}`, isSimulasi: isSimulatedSession })} className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] transition-transform hover:scale-[1.03] whitespace-nowrap">Lihat Kuitansi</button>
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

                    <div className="bg-white p-4 rounded-2xl border flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase block">Filter Bulan Dashboard</span>
                        <span className="text-[10px] text-slate-400">Pilih bulan untuk lihat pemasukan &amp; siapa saja yang belum bayar di bulan itu (dan tunggakan bulan sebelumnya).</span>
                      </div>
                      <select
                        value={adminFilterBulanDashboard}
                        onChange={(e) => setAdminFilterBulanDashboard(e.target.value)}
                        className="border p-2 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs shrink-0"
                      >
                        <option value="Semua">Semua Bulan (Akumulasi Periode)</option>
                        {DAFTAR_BULAN.map(bln => (
                          <option key={bln.id} value={bln.id}>{bln.nama} {periodeTahun + bln.tahunOffset}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-bold">
                      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white p-5 rounded-2xl">
                        <span className="text-slate-400 block uppercase text-[10px]">{bulanTerpilihDashboard ? `Kas Masuk ${labelBulanTerpilihDashboard}` : 'Total Kas Global'}</span>
                        <p className="text-lg font-black">Rp {(bulanTerpilihDashboard ? totalMasukBulanTerpilih : totalDanaMasukGlobal).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">{bulanTerpilihDashboard ? `Sisa Tagihan ${labelBulanTerpilihDashboard}` : 'Sisa Tagihan'}</span>
                        <p className="text-lg font-black text-rose-500">Rp {(bulanTerpilihDashboard ? sisaTagihanBulanTerpilih : totalSisaGlobal).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Verifikasi Pending</span>
                        <p className="text-lg font-black text-amber-600">Rp {totalVerifPendingGlobal.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border">
                        <span className="text-slate-400 block uppercase text-[10px]">Jumlah KK</span>
                        <p className="text-lg font-black text-slate-900">{jumlahKK} KK</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded">Aktif: {jumlahAktif}</span>
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded">Pasif: {jumlahPasif}</span>
                          <span className="bg-sky-50 text-sky-700 text-[9px] font-black px-1.5 py-0.5 rounded">Pengurus: {jumlahPengurus}</span>
                        </div>
                      </div>
                      <button onClick={() => setActiveMenu('monitoring-tunggakan')} className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-left transition-transform hover:scale-[1.02]">
                        <span className="text-rose-500 block uppercase text-[10px]">⚠️ Tunggakan Periode Lalu</span>
                        <p className="text-lg font-black text-rose-700">Rp {totalTunggakanBelumLunas.toLocaleString('id-ID')}</p>
                        <span className="text-[9px] text-rose-500 font-semibold">{jumlahWargaMenunggak} warga menunggak →</span>
                      </button>
                    </div>

                    {/* DAFTAR KK BELUM BAYAR DI BULAN YANG DIFILTER (MUNCUL HANYA SAAT BUKAN "SEMUA BULAN") */}
                    {bulanTerpilihDashboard && (
                      <div className="bg-white p-5 rounded-2xl border shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase">Belum Bayar — {labelBulanTerpilihDashboard}</h4>
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-lg">{daftarBelumBayarBulanTerpilih.length} KK belum lunas</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3">Termasuk tunggakan bulan-bulan sebelumnya di periode berjalan (s.d. {labelBulanTerpilihDashboard}) yang masih belum lunas.</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] font-semibold">
                            <thead>
                              <tr className="text-slate-400 uppercase text-[9px] text-left border-b">
                                <th className="py-1.5 pr-2">Nama KK</th>
                                <th className="py-1.5 pr-2">Blok</th>
                                <th className="py-1.5 pr-2">Bulan Belum Bayar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {daftarBelumBayarBulanTerpilih.map(m => (
                                <tr key={m.id} className="border-b last:border-0 bg-rose-50/60">
                                  <td className="py-1.5 pr-2 font-black text-slate-900">{m.nama}</td>
                                  <td className="py-1.5 pr-2 text-slate-500">{m.nomorRumah || m.kelompok}</td>
                                  <td className="py-1.5 pr-2 text-rose-600">
                                    {m.bulanBelumBayar.map(b => `${b.nama} ${periodeTahun + b.tahunOffset}`).join(', ')}
                                  </td>
                                </tr>
                              ))}
                              {daftarBelumBayarBulanTerpilih.length === 0 && (
                                <tr><td colSpan={3} className="py-3 text-center text-slate-400 italic">🎉 Semua warga sudah lunas s.d. bulan ini.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 bg-white p-5 rounded-2xl border text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-black text-slate-900 uppercase text-[10px]">Timeline Pemasukan {labelRentangPeriode}</h4>
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
                            <p className="text-emerald-700 font-semibold text-[10px] mt-0.5">{formatAgendaLengkap(kegiatanList[kegiatanList.length - 1].tanggal, kegiatanList[kegiatanList.length - 1].jam)} — {kegiatanList[kegiatanList.length - 1].tempat}</p>
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
                                      {/* Kolom "Status" di sini SENGAJA hanya mencerminkan status pembayaran
                                          di BULAN BERJALAN saat ini (mis. Juli) - bukan status lunas target
                                          1 tahun (m.sisa). Jadi kalau bulan berjalan sudah dibayar -> "Sudah
                                          Bayar" walau tunggakan bulan-bulan lama masih ada; sebaliknya begitu
                                          masuk bulan berikutnya & belum bayar -> otomatis balik "Belum Bayar". */}
                                      {k.anggotaKelompok.map(m => (
                                        <tr key={m.id} className={`border-b last:border-0 ${m.statusBulanIni === 'Belum Bayar' ? 'bg-rose-50/60' : ''}`}>
                                          <td className="py-1.5 pr-2 font-black text-slate-900">{m.nama}</td>
                                          <td className="py-1.5 pr-2 text-slate-500">Rp {m.target.toLocaleString('id-ID')}</td>
                                          <td className="py-1.5 pr-2 text-emerald-700">Rp {m.dibayar.toLocaleString('id-ID')}</td>
                                          <td className="py-1.5 pr-2 text-rose-500">Rp {m.sisa.toLocaleString('id-ID')}</td>
                                          <td className="py-1.5 pr-2">
                                            {m.statusBulanIni === 'Sudah Bayar' ? (
                                              <span className="text-emerald-700 font-black">Sudah Bayar</span>
                                            ) : m.statusBulanIni === 'Menunggu Verifikasi' ? (
                                              <span className="text-amber-600 font-black">Menunggu Verifikasi</span>
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
                                  <td className="py-2.5 pr-2 text-slate-500">{r.bulanNama} {getTahunUntukBulan(r.bulanNama)}</td>
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
                      <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3 mb-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase">Rekap Per Anggota (Monitoring)</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Ringkasan capaian tiap warga dalam satu tabel untuk memudahkan pemantauan.</p>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <input
                            type="text"
                            value={cariRekapAnggota}
                            onChange={(e) => setCariRekapAnggota(e.target.value)}
                            placeholder="Cari nama / blok / no rumah..."
                            className="border p-2 rounded-xl bg-slate-50 text-slate-800 font-semibold w-52"
                          />
                          <button
                            onClick={() => setSortRekapAnggotaBlok(v => !v)}
                            className={`border p-2 rounded-xl whitespace-nowrap ${sortRekapAnggotaBlok ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700'}`}
                            title="Urutkan rapi per Blok (F3 No.1, F3 No.2, ... F4 No.1, dst)"
                          >
                            Sort Per Blok {sortRekapAnggotaBlok ? '✓' : ''}
                          </button>
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
                              <th className="py-2 pr-2">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rekapPerAnggotaTampil.map(m => (
                              <React.Fragment key={m.id}>
                              <tr className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 pr-2 text-slate-900 font-black">{m.nama}</td>
                                <td className="py-2.5 pr-2 text-emerald-700 font-bold">{m.nomorRumah || m.nama}</td>
                                <td className="py-2.5 pr-2 text-slate-500">{m.kelompok}</td>
                                <td className="py-2.5 pr-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${m.statusAnggota === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{m.statusAnggota}</span>
                                  {m.pengurus && (
                                    <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-700">Bebas Iuran</span>
                                  )}
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
                                <td className="py-2.5 pr-2">
                                  {m.pengurus ? (
                                    <span className="text-slate-300">—</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedRekapAnggotaId(expandedRekapAnggotaId === m.id ? null : m.id)}
                                      className="text-emerald-700 font-bold text-[10px] underline underline-offset-2 whitespace-nowrap"
                                    >
                                      {expandedRekapAnggotaId === m.id ? 'Tutup Rincian' : 'Lihat Rincian'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {expandedRekapAnggotaId === m.id && (
                                <tr className="bg-slate-50/70 border-b">
                                  <td colSpan={9} className="py-3 px-3">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Histori Belum Lunas/Open — {m.nama} (Periode {labelRentangPeriode})</p>
                                    {m.riwayatBelumLunas.length === 0 ? (
                                      <p className="text-[11px] text-emerald-700 font-bold italic">🎉 Semua 12 bulan periode ini sudah LUNAS, tidak ada tunggakan.</p>
                                    ) : (
                                      <table className="w-full text-[11px] font-semibold bg-white rounded-xl border overflow-hidden">
                                        <thead>
                                          <tr className="text-slate-400 uppercase text-[9px] text-left border-b bg-slate-100">
                                            <th className="py-1.5 px-2">Bulan</th>
                                            <th className="py-1.5 px-2">Nominal</th>
                                            <th className="py-1.5 px-2">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {m.riwayatBelumLunas.map(r => (
                                            <tr key={r.bulanId} className="border-b last:border-0">
                                              <td className="py-1.5 px-2 text-slate-800 font-bold">{r.bulanNama} {r.tahun}</td>
                                              <td className="py-1.5 px-2 text-slate-600">Rp {r.nominal.toLocaleString('id-ID')}</td>
                                              <td className="py-1.5 px-2">
                                                {r.status === 'MENUNGGU VERIFIKASI' ? (
                                                  <span className="text-amber-600 font-black">Menunggu Verifikasi</span>
                                                ) : (
                                                  <span className="text-rose-600 font-black">Belum Bayar / Open</span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </td>
                                </tr>
                              )}
                              </React.Fragment>
                            ))}
                            {rekapPerAnggotaTampil.length === 0 && (
                              <tr><td colSpan={9} className="py-4 text-center text-slate-400 italic">{cariRekapAnggota.trim() ? 'Tidak ada warga yang cocok dengan pencarian.' : 'Belum ada data anggota.'}</td></tr>
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
            {activeMenu === 'laporan-sapi' && (() => {
              // KHUSUS SIMULASI (tombol "🧪 Simulasi Akun Pengguna" dari Web Utama):
              // pakai dataset dummy 50 KK (MEMBERS_DUMMY_REKAP_BLOK). Akun yang
              // BENAR-BENAR login (isSimulatedSession === false) tetap memakai
              // `members` ASLI dari Google Sheets, walau datanya masih sedikit/kosong.
              const anggotaSemuaUntukTampil = isSimulatedSession ? MEMBERS_DUMMY_REKAP_BLOK : members;
              // PENTING: `kelompokList` (state) otomatis ditimpa data ASLI dari Google
              // Sheets begitu Sheets terhubung - jadi untuk tampilan SIMULASI, daftar
              // bloknya JUGA harus pakai daftar dummy sendiri (KELOMPOK_DUMMY_REKAP_BLOK,
              // tetap 22 blok), bukan `kelompokList` yang bisa saja sudah berubah
              // mengikuti isi Sheet asli (misalnya baru ada sebagian blok saja).
              const kelompokUntukTampil = isSimulatedSession ? KELOMPOK_DUMMY_REKAP_BLOK : kelompokList;
              return (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Daftar Blok Rumah RT</h3>
                    <p className="text-xs text-slate-400">Menampilkan seluruh database kelompok/blok beserta status, sama seperti tampilan pengurus.{isSimulatedSession ? ' (Data contoh/simulasi - 50 KK, bukan data warga asli.)' : ''}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
                    {kelompokUntukTampil.map(k => {
                      // Rekap Blok Rumah sekarang SAMA untuk Admin maupun akun user
                      // (warga) - menampilkan seluruh KK di tiap blok, bukan hanya
                      // keluarga sendiri, supaya warga bisa lihat data seluruh RT.
                      const anggotaKelompok = anggotaSemuaUntukTampil.filter(m => cocokBlok(m.kelompok, k.nama));
                      const rekapUsia = getRekapKategoriUsia(anggotaKelompok);
                      // (lihat catatan perbaikan double-count di getRingkasanBlokRumah)
                      const totalJiwa = anggotaKelompok.reduce((acc, m) => acc + (m.anggotaKeluarga || []).length, 0);
                      // BLOK RUMAH MU: khusus akun user (bukan admin), blok yang SAMA
                      // dengan blok tempat tinggalnya sendiri (activeUserSession.kelompok)
                      // ditandai beda - gradasi biru navy + label "Blok Rumah Mu", supaya
                      // langsung kelihatan tanpa harus mencari-cari di antara blok lain.
                      // BLOK RUMAH MU: berlaku untuk akun User ASLI maupun akun
                      // SIMULASI (bukan hanya user asli lagi) - selama role bukan
                      // admin & blok-nya sama dengan blok tempat tinggal akun yang
                      // sedang aktif (activeUserSession.kelompok), kartu blok itu
                      // ditandai beda (gradasi navy + label "Detail Informasi Blok
                      // Anda") supaya langsung kelihatan tanpa harus dicari-cari.
                      const isBlokSaya = role !== 'admin' && activeUserSession && cocokBlok(k.nama, activeUserSession.kelompok);
                      return (
                        <div key={k.id} className={`p-4 rounded-xl space-y-2 transition-all duration-200 ${isBlokSaya ? 'border border-blue-900 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white shadow-lg shadow-blue-900/30 ring-2 ring-blue-400/40' : 'border bg-slate-50'}`}>
                          {isBlokSaya && (
                            <span className="inline-flex items-center gap-1 bg-amber-400 text-blue-950 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-lg mb-1">🏠 Blok Rumah Mu</span>
                          )}
                          <div className={`flex justify-between items-start font-bold border-b pb-1.5 ${isBlokSaya ? 'border-blue-800/60 text-white' : 'text-emerald-950'}`}>
                            <div>
                              <span className="block">{k.nama}</span>
                              <span className={`block text-[10px] font-mono font-normal ${isBlokSaya ? 'text-blue-200' : 'text-slate-400'}`}>{isBlokSaya ? 'Detail Informasi Blok Anda' : `${k.jenis} • Kapasitas ${k.kapasitas} orang`}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] shrink-0 ${k.status === 'Progress' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}`}>{k.status}</span>
                          </div>
                          {/* RINGKASAN JUMLAH KK & JUMLAH JIWA BLOK INI (dihitung otomatis
                              dari data Anggota + Anggota Keluarga yang tersinkron Google Sheet) */}
                          <div className="flex gap-2 text-[10px]">
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-black flex-1 text-center">{anggotaKelompok.length} KK</span>
                            <span className="bg-sky-50 text-sky-700 px-2 py-1 rounded-lg font-black flex-1 text-center">{totalJiwa} Jiwa</span>
                          </div>
                          {/* DAFTAR NAMA KK - KHUSUS ADMIN. Akun user hanya lihat
                              jumlah (KK & Jiwa di atas), tanpa nama warga, supaya
                              privasi data warga lain tetap terjaga. */}
                          {role === 'admin' && (
                            <ul className="space-y-1 text-slate-700">
                              {anggotaKelompok.map((m, i) => <li key={i}>• {m.nama} <span className="text-slate-400 font-normal">({m.statusRumah || '-'}, {(m.anggotaKeluarga || []).length} anggota keluarga)</span></li>)}
                              {anggotaKelompok.length === 0 && <li className="text-slate-400 italic">Belum ada anggota</li>}
                            </ul>
                          )}
                          {/* KATEGORI USIA OTOMATIS (dihitung dari seluruh anggota keluarga di blok ini) */}
                          <div className={`pt-2 border-t ${isBlokSaya ? 'border-blue-800/60' : ''}`}>
                            <span className={`text-[9px] font-black uppercase tracking-wide block mb-1.5 ${isBlokSaya ? 'text-blue-200' : 'text-slate-400'}`}>Rekap Usia Otomatis</span>
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
                    {kelompokUntukTampil.length === 0 && <p className="text-slate-400 italic sm:col-span-2">Belum ada kelompok dibuat.</p>}
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
                                  {m.pengurus && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-sky-100 text-sky-700">Pengurus (di luar Keuangan RT)</span>
                                  )}
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
                                        <td className="py-1.5 pr-2 text-slate-500">{formatTanggalIndo(a.tanggalLahir)}</td>
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
              );
            })()}

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
                  {/* Catatan simulasi khusus halaman ini SUDAH DIHAPUS - cukup pakai
                      1 banner simulasi global di paling atas halaman, supaya tidak
                      dobel/tumpuk 2 kotak kuning. */}
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
                              <tr key={a.id} className={`border-b last:border-0 ${editingAnggotaKeluargaId === a.id ? 'bg-amber-50' : ''}`}>
                                <td className="py-2.5 pr-2 font-black text-slate-900">{a.nama}</td>
                                <td className="py-2.5 pr-2 text-emerald-700 font-bold">{a.hubungan || '-'}</td>
                                <td className="py-2.5 pr-2 text-slate-500">{a.jenisKelamin}</td>
                                <td className="py-2.5 pr-2 text-slate-500">{formatTanggalIndo(a.tanggalLahir)}</td>
                                <td className="py-2.5 pr-2 text-slate-700 font-bold">{usia !== null ? `${usia} tahun` : '-'}</td>
                                <td className="py-2.5 pr-2"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700">{kategoriUsia(usia)}</span></td>
                                <td className="py-2.5 pr-2 flex gap-2">
                                  <button onClick={() => handleMulaiEditAnggotaKeluargaUser(a)} className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded text-[10px] font-bold">Edit</button>
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

                  {/* TAMBAH / EDIT ANGGOTA KELUARGA */}
                  <div className="bg-white p-6 rounded-2xl border shadow-xs">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase">{editingAnggotaKeluargaId ? '✏️ Edit Anggota Keluarga' : '+ Tambah Anggota Keluarga'}</h4>
                      {editingAnggotaKeluargaId && (
                        <button type="button" onClick={handleBatalEditAnggotaKeluargaUser} className="text-[10px] font-bold text-amber-700 underline">Batalkan Edit</button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">{editingAnggotaKeluargaId ? 'Ubah data anggota keluarga yang sudah tercatat. Perubahan langsung tersimpan & terhubung ke data admin.' : 'Mis. ada anggota keluarga baru (anak baru lahir, dll). Data ini otomatis ikut terhitung di rekap usia untuk pengurus RT.'}</p>
                    <form onSubmit={handleTambahAnggotaKeluargaUser} className={`grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-semibold border rounded-xl p-3 ${editingAnggotaKeluargaId ? 'bg-amber-50 border-amber-300' : 'bg-slate-50'}`}>
                      <input type="text" required placeholder="Nama lengkap" value={formTambahAnggotaUser.nama} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, nama: e.target.value})} className="w-full border p-2 rounded-lg bg-white" />
                      <select required value={formTambahAnggotaUser.hubungan} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, hubungan: e.target.value})} className="w-full border p-2 rounded-lg bg-white font-bold">
                        {HUBUNGAN_KELUARGA_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select required value={formTambahAnggotaUser.jenisKelamin} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, jenisKelamin: e.target.value})} className="w-full border p-2.5 rounded-lg bg-white font-bold text-[13px]">
                        <option value="Perempuan">Perempuan</option>
                        <option value="Laki-laki">Laki-laki</option>
                      </select>
                      <input type="date" required value={formTambahAnggotaUser.tanggalLahir} onChange={(e) => setFormTambahAnggotaUser({...formTambahAnggotaUser, tanggalLahir: e.target.value})} className="w-full border p-2.5 rounded-lg bg-white text-[13px]" />
                      <button type="submit" className={`sm:col-span-4 text-white font-bold px-4 py-2 rounded-lg ${editingAnggotaKeluargaId ? 'bg-amber-600' : 'bg-emerald-700'}`}>{editingAnggotaKeluargaId ? '💾 Simpan Perubahan' : '+ Tambah Anggota'}</button>
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
                          <GambarZoom src={agendaUtama.foto} alt={agendaUtama.judul} className="w-full h-full object-cover" onBuka={bukaLightbox} />
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">Belum ada foto agenda utama</span>
                        )}
                      </div>
                      <div className="p-5 text-xs">
                        <p className="text-slate-400 font-bold text-[11px]">{formatAgendaLengkap(agendaUtama.tanggal, agendaUtama.jam)}</p>
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
                            <GambarZoom src={k.foto} alt={k.judul} className="w-full h-full object-cover" onBuka={bukaLightbox} />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Belum ada foto</span>
                          )}
                        </div>
                        <div className="p-3 text-xs">
                          <p className="text-slate-400 font-bold text-[10px]">{formatAgendaLengkap(k.tanggal, k.jam)}</p>
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
              // BUKU KAS MASUK/KELUAR RT - sekarang juga ditampilkan di halaman
              // warga/simulasi ini (sebelumnya cuma ada di Web Utama & Admin
              // Panel), supaya warga bisa lihat riwayat kas RT lengkap dengan
              // saldo berjalan, berdampingan dengan Realisasi Belanja.
              const dataKasRt = isSimulatedSession ? DUMMY_RIWAYAT_KAS_RT_SIMULASI : getRiwayatKasRtDenganSaldo();
              const saldoKasRtSaatIni = dataKasRt.length > 0 ? dataKasRt[dataKasRt.length - 1].saldoSetelah : 0;
              return (
                <div className="space-y-4">
                  {/* Catatan simulasi khusus halaman ini SUDAH DIHAPUS - cukup pakai
                      1 banner simulasi global di paling atas halaman, supaya tidak
                      dobel/tumpuk 2 kotak kuning (konsisten dengan halaman lain). */}
                  {/* LAYOUT 2 KOLOM BERDAMPINGAN (di layar sempit otomatis tumpuk 1
                      kolom): kiri = Realisasi/Laporan Belanja, kanan = Buku Kas
                      Masuk/Keluar RT lengkap dengan saldo berjalan. */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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
                              <p className="text-slate-400">{formatTanggalLaporan(r.tanggal)} • Rp {r.nominal.toLocaleString('id-ID')} • Dicatat oleh {r.dicatatOleh}</p>
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

                    {/* BUKU KAS MASUK/KELUAR RT (KOLOM KANAN) */}
                    <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white p-6 rounded-2xl border border-blue-800 shadow-xs">
                      <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                        <div>
                          <h3 className="text-sm font-black text-white">📒 Buku Kas Masuk/Keluar RT</h3>
                          <p className="text-[11px] text-blue-200 mt-0.5">Riwayat kas RT lengkap dengan saldo berjalan, urut dari transaksi paling lama.</p>
                        </div>
                      </div>
                      <PaginasiKas data={dataKasRt} ukuran={10} gaya="gelap">
                        {(baris) => (
                          <div className="overflow-x-auto pr-1">
                            <table className="w-full text-[11px] font-semibold">
                              <thead className="bg-blue-950">
                                <tr className="text-blue-300 uppercase text-[9px] text-left border-b border-blue-800">
                                  <th className="py-1.5 pr-2">Tanggal</th>
                                  <th className="py-1.5 pr-2">Keterangan</th>
                                  <th className="py-1.5 pr-2">Jenis</th>
                                  <th className="py-1.5 pr-2 text-right">Nominal</th>
                                  <th className="py-1.5 pl-2 text-right">Saldo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {baris.map(t => (
                                  <tr key={t.id} className="border-b border-blue-900/60 last:border-0">
                                    <td className="py-1.5 pr-2 text-blue-200 whitespace-nowrap">{t.tanggal}</td>
                                    <td className="py-1.5 pr-2 text-white min-w-[9rem]">{t.keterangan}</td>
                                    <td className="py-1.5 pr-2">
                                      <span className={`font-black ${t.jenis === 'Masuk' ? 'text-[#34d399]' : 'text-rose-400'}`}>{t.jenis === 'Masuk' ? '▲ Masuk' : '▼ Keluar'}</span>
                                    </td>
                                    <td className={`py-1.5 pr-2 text-right font-black whitespace-nowrap ${t.jenis === 'Masuk' ? 'text-[#34d399]' : 'text-rose-400'}`}>{t.jenis === 'Masuk' ? '+' : '-'}Rp{t.nominal.toLocaleString('id-ID')}</td>
                                    <td className="py-1.5 pl-2 text-right text-amber-300 font-bold whitespace-nowrap">Rp{t.saldoSetelah.toLocaleString('id-ID')}</td>
                                  </tr>
                                ))}
                                {baris.length === 0 && (
                                  <tr><td colSpan={5} className="py-3 text-center text-blue-300 italic">Belum ada transaksi kas RT yang dicatat.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </PaginasiKas>
                      <div className="mt-3 bg-blue-950/60 rounded-xl py-2.5 px-4 flex items-center justify-between border border-blue-800">
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wide">Sisa Saldo Kas RT</span>
                        <span className="text-amber-400 font-black text-sm">Rp{saldoKasRtSaatIni.toLocaleString('id-ID')}</span>
                      </div>
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
                    <div className="relative">
                      <input
                        type={lihatFormUbahPassword.lama ? 'text' : 'password'}
                        required
                        disabled={sedangSimpanPassword}
                        value={formUbahPassword.lama}
                        onChange={(e) => setFormUbahPassword({...formUbahPassword, lama: e.target.value})}
                        className="w-full border p-2 pr-10 rounded-xl bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setLihatFormUbahPassword(prev => ({ ...prev, lama: !prev.lama }))}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={lihatFormUbahPassword.lama ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {lihatFormUbahPassword.lama ? (
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.29 10.29 0 003.296-4.163.75.75 0 000-.552C17.897 6.045 14.42 3.25 10 3.25a9.72 9.72 0 00-4.522 1.114L3.28 2.22zM7.53 6.47l1.35 1.35a2.5 2.5 0 013.3 3.3l1.35 1.35a4 4 0 00-6-6zM3.09 6.09a10.28 10.28 0 00-2.303 3.535.75.75 0 000 .552C2.104 13.955 5.58 16.75 10 16.75c1.132 0 2.21-.183 3.203-.52l-1.703-1.702a4 4 0 01-5.278-5.278L3.09 6.089z" clipRule="evenodd" /></svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.25c-4.42 0-7.897 2.796-9.196 6.66a.75.75 0 000 .552C2.104 13.955 5.58 16.75 10 16.75s7.897-2.796 9.196-6.66a.75.75 0 000-.552C17.897 6.045 14.42 3.25 10 3.25zM10 13.5a3.25 3.25 0 110-6.5 3.25 3.25 0 010 6.5z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600">Password Baru</label>
                    <div className="relative">
                      <input
                        type={lihatFormUbahPassword.baru ? 'text' : 'password'}
                        required
                        disabled={sedangSimpanPassword}
                        value={formUbahPassword.baru}
                        onChange={(e) => setFormUbahPassword({...formUbahPassword, baru: e.target.value})}
                        className="w-full border p-2 pr-10 rounded-xl bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setLihatFormUbahPassword(prev => ({ ...prev, baru: !prev.baru }))}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={lihatFormUbahPassword.baru ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {lihatFormUbahPassword.baru ? (
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.29 10.29 0 003.296-4.163.75.75 0 000-.552C17.897 6.045 14.42 3.25 10 3.25a9.72 9.72 0 00-4.522 1.114L3.28 2.22zM7.53 6.47l1.35 1.35a2.5 2.5 0 013.3 3.3l1.35 1.35a4 4 0 00-6-6zM3.09 6.09a10.28 10.28 0 00-2.303 3.535.75.75 0 000 .552C2.104 13.955 5.58 16.75 10 16.75c1.132 0 2.21-.183 3.203-.52l-1.703-1.702a4 4 0 01-5.278-5.278L3.09 6.089z" clipRule="evenodd" /></svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.25c-4.42 0-7.897 2.796-9.196 6.66a.75.75 0 000 .552C2.104 13.955 5.58 16.75 10 16.75s7.897-2.796 9.196-6.66a.75.75 0 000-.552C17.897 6.045 14.42 3.25 10 3.25zM10 13.5a3.25 3.25 0 110-6.5 3.25 3.25 0 010 6.5z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <input
                        type={lihatFormUbahPassword.konfirmasi ? 'text' : 'password'}
                        required
                        disabled={sedangSimpanPassword}
                        value={formUbahPassword.konfirmasi}
                        onChange={(e) => setFormUbahPassword({...formUbahPassword, konfirmasi: e.target.value})}
                        className="w-full border p-2 pr-10 rounded-xl bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setLihatFormUbahPassword(prev => ({ ...prev, konfirmasi: !prev.konfirmasi }))}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={lihatFormUbahPassword.konfirmasi ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {lihatFormUbahPassword.konfirmasi ? (
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.29 10.29 0 003.296-4.163.75.75 0 000-.552C17.897 6.045 14.42 3.25 10 3.25a9.72 9.72 0 00-4.522 1.114L3.28 2.22zM7.53 6.47l1.35 1.35a2.5 2.5 0 013.3 3.3l1.35 1.35a4 4 0 00-6-6zM3.09 6.09a10.28 10.28 0 00-2.303 3.535.75.75 0 000 .552C2.104 13.955 5.58 16.75 10 16.75c1.132 0 2.21-.183 3.203-.52l-1.703-1.702a4 4 0 01-5.278-5.278L3.09 6.089z" clipRule="evenodd" /></svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.25c-4.42 0-7.897 2.796-9.196 6.66a.75.75 0 000 .552C2.104 13.955 5.58 16.75 10 16.75s7.897-2.796 9.196-6.66a.75.75 0 000-.552C17.897 6.045 14.42 3.25 10 3.25zM10 13.5a3.25 3.25 0 110-6.5 3.25 3.25 0 010 6.5z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {passwordMsg.teks && (
                    <p className={`text-[11px] font-bold ${passwordMsg.tipe === 'error' ? 'text-rose-600' : passwordMsg.tipe === 'info' ? 'text-amber-600' : 'text-emerald-700'}`}>{passwordMsg.teks}</p>
                  )}
                  <button
                    type="submit"
                    disabled={sedangSimpanPassword}
                    className="w-full bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold p-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {sedangSimpanPassword && (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    )}
                    {sedangSimpanPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
                  </button>
                </form>
              </div>
            )}

            {/* PENDING PEMBAYARAN BENDAHARA (IURAN BERJALAN + PELUNASAN TUNGGAKAN) */}
            {activeMenu === 'pending-pembayaran' && role === 'admin' && (
              <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900">List Verifikasi Pembayaran Pending</h3>
                <p className="text-[11px] text-slate-400 -mt-2">Klik "Lihat Bukti" untuk membuka foto/file transfer yang diunggah warga, lalu Setujui bila dana sudah masuk. Termasuk pelunasan tunggakan (ditandai label TUNGGAKAN).</p>
                <div className="space-y-2 text-xs font-semibold">
                  {iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').map((req, idx) => (
                    <div key={`iuran-${idx}`} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2">
                      <div><strong>{req.userNama}</strong><p className="text-slate-400">Bulan {req.bulanNama} {getTahunUntukBulan(req.bulanNama)} | Rp {req.nominal.toLocaleString('id-ID')} {req.buktiNamaFile ? `| File: ${req.buktiNamaFile}` : ''}</p></div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewBukti({ ...req })} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">Lihat Bukti</button>
                        <button onClick={() => handleRejectPembayaran(req.userNama, req.bulanNama)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg">Tolak</button>
                        <button onClick={() => setKonfirmasiApprove({ userNama: req.userNama, bulanNama: req.bulanNama, nominal: req.nominal, dariPreview: false })} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg">Setujui</button>
                      </div>
                    </div>
                  ))}
                  {tunggakanList.filter(t => t.status === 'MENUNGGU VERIFIKASI').map((req) => (
                    <div key={`tunggakan-${req.id}`} className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <strong>{req.userNama}</strong>
                        <span className="ml-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase align-middle">Tunggakan</span>
                        <p className="text-slate-400">Bulan {req.bulanNama} {req.tahunAsal} (periode {req.noPeriodeAsal}) | Rp {Number(req.nominal).toLocaleString('id-ID')} {req.buktiNamaFile ? `| File: ${req.buktiNamaFile}` : ''}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewBukti({ ...req, tunggakanId: req.id })} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">Lihat Bukti</button>
                        <button onClick={() => handleRejectPembayaran(req.userNama, req.bulanNama, req.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg">Tolak</button>
                        <button onClick={() => setKonfirmasiApprove({ userNama: req.userNama, bulanNama: req.bulanNama, nominal: req.nominal, dariPreview: false, tunggakanId: req.id })} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg">Setujui</button>
                      </div>
                    </div>
                  ))}
                  {iuranMatrix.filter(r => r.status === 'MENUNGGU VERIFIKASI').length === 0 && tunggakanList.filter(t => t.status === 'MENUNGGU VERIFIKASI').length === 0 && <p className="text-slate-400 italic">Antrean kosong.</p>}
                </div>
              </div>
            )}

            {/* MONITORING TUNGGAKAN (ADMIN) - PANTAU WARGA YANG MASIH MENUNGGAK
                SETELAH PERIODE DITUTUP. Menampilkan siapa saja yang masih punya
                tagihan belum lunas (baik yang masih BELUM BAYAR maupun yang sudah
                upload tapi MENUNGGU VERIFIKASI), berikut asal periode & tahunnya. */}
            {activeMenu === 'monitoring-tunggakan' && role === 'admin' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                  <div className="bg-gradient-to-br from-rose-800 via-rose-900 to-slate-950 text-white p-5 rounded-2xl">
                    <span className="text-rose-200 block uppercase text-[10px]">Total Tunggakan Belum Lunas</span>
                    <p className="text-lg font-black">Rp {totalTunggakanBelumLunas.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border">
                    <span className="text-slate-400 block uppercase text-[10px]">Warga Menunggak</span>
                    <p className="text-lg font-black text-rose-600">{jumlahWargaMenunggak} Warga</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border">
                    <span className="text-slate-400 block uppercase text-[10px]">Jumlah Bulan Tertunggak</span>
                    <p className="text-lg font-black text-slate-900">{tunggakanBelumLunas.length} Bulan</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 mb-1">Rekap Tunggakan per Warga</h3>
                  <p className="text-[11px] text-slate-400 mb-4">Tagihan ini otomatis dipindahkan ke sini saat Admin menutup periode dan bulan tersebut belum berstatus LUNAS. Tetap berjalan &amp; bisa dilunasi warga kapan saja lewat Dashboard-nya (menu "Tunggakan Periode Sebelumnya"), atau verifikasi buktinya lewat menu "Pending Iuran".</p>
                  {rekapTunggakanPerWarga().length === 0 ? (
                    <p className="text-slate-400 italic text-xs">🎉 Tidak ada warga yang menunggak saat ini.</p>
                  ) : (
                    <div className="space-y-3">
                      {rekapTunggakanPerWarga().map((w) => (
                        <div key={w.userNama} className="border rounded-xl p-4">
                          <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                            <div>
                              <p className="font-black text-slate-900 text-xs">{w.userNama}</p>
                              <p className="text-[10px] text-slate-400">{w.nomorRumah} • {w.kelompok}</p>
                            </div>
                            <span className="bg-rose-100 text-rose-700 text-[11px] font-black px-3 py-1 rounded-full">Rp {w.total.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {w.items.map((it) => (
                              <span key={it.id} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${it.status === 'MENUNGGU VERIFIKASI' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {it.bulanNama} {it.tahunAsal} ({it.noPeriodeAsal}) - {it.status === 'MENUNGGU VERIFIKASI' ? 'Menunggu Verifikasi' : 'Belum Bayar'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* REALISASI BELANJA KAS RT (BENDAHARA/ADMIN, BUKTI FOTO -> TAMPIL DI DASHBOARD WARGA ASLI) */}
            {activeMenu === 'realisasi-belanja' && role === 'admin' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Realisasi Belanja Kas RT</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Catat setiap pengeluaran panitia lengkap dengan bukti foto struk/nota. Data ini otomatis tampil di menu "Laporan Belanja Kas RT" pada Dashboard warga yang login dengan akun ASLI (bukan simulasi).</p>
                </div>

                {/* LAYOUT DUA KOLOM: KIRI = FORM TAMBAH/EDIT + KELOLA KATEGORI, KANAN = DAFTAR REALISASI */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {/* KOLOM KIRI */}
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border shadow-xs">
                      <form onSubmit={handleTambahRealisasiBelanja} className={`border rounded-xl p-4 space-y-2 text-xs font-semibold ${editingRealisasiId ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex justify-between items-center">
                          <p className={`font-black text-[11px] ${editingRealisasiId ? 'text-amber-700' : 'text-emerald-800'}`}>{editingRealisasiId ? '✏️ Edit Realisasi Belanja' : '+ Tambah Realisasi Belanja'}</p>
                          {editingRealisasiId && (
                            <button type="button" onClick={handleBatalEditRealisasiBelanja} className="text-[10px] font-bold text-amber-700 underline">Batalkan Edit</button>
                          )}
                        </div>
                        {editingRealisasiId && (
                          <p className="text-[10px] text-amber-700 -mt-1">Kosongkan field Tanggal kalau tidak ingin mengubah tanggal yang sudah tercatat.</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block mb-1 text-slate-600 text-[11px]">Tanggal</label>
                            <input type="date" value={formRealisasiBaru.tanggal} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, tanggal: e.target.value})} className="w-full border p-2 rounded-xl bg-white text-[12px]" />
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-600 text-[11px]">Kategori</label>
                            <select value={formRealisasiBaru.kategori} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, kategori: e.target.value})} className="w-full border p-2 rounded-xl bg-white font-bold text-[12px]">
                              {kategoriBelanjaList.map(k => <option key={k}>{k}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1 text-slate-600 text-[11px]">Keterangan</label>
                            <input type="text" placeholder="mis. Perbaikan pos ronda Blok A" value={formRealisasiBaru.keterangan} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, keterangan: e.target.value})} className="w-full border p-2 rounded-xl bg-white text-[12px]" />
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-600 text-[11px]">Nominal (Rp)</label>
                            <input type="number" min="0" placeholder="0" value={formRealisasiBaru.nominal} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, nominal: e.target.value})} className="w-full border p-2 rounded-xl bg-white text-[12px]" />
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-600 text-[11px]">Target Tampil</label>
                            <select value={formRealisasiBaru.kelompok} onChange={(e) => setFormRealisasiBaru({...formRealisasiBaru, kelompok: e.target.value})} className="w-full border p-2 rounded-xl bg-white font-bold text-[12px]">
                              <option value="Semua">Semua Kelompok</option>
                              {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1 text-slate-600 text-[11px]">Bukti Foto Struk/Nota <span className="text-slate-400 font-normal normal-case">(Opsional - transaksi tetap bisa disimpan tanpa foto)</span></label>
                            {/* SENGAJA TIDAK diberi atribut `required` - bukti foto boleh dilewati.
                                handleTambahRealisasiBelanja hanya mewajibkan keterangan & nominal,
                                jadi transaksi realisasi belanja tetap bisa disimpan tanpa foto. */}
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
                          <button type="submit" className={`text-white font-bold px-4 py-1.5 rounded-xl text-[11px] ${editingRealisasiId ? 'bg-amber-600' : 'bg-emerald-700'}`}>{editingRealisasiId ? '💾 Simpan Perubahan' : '+ Simpan Realisasi'}</button>
                        </div>
                      </form>
                    </div>

                    {/* KELOLA KATEGORI BELANJA (TAMBAH/EDIT/HAPUS) */}
                    <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-3">
                      <div>
                        <h4 className="text-[11px] font-black text-slate-900 uppercase">Kelola Kategori Belanja</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Sesuaikan pilihan kategori pada form di atas - tambah kategori baru, ubah nama, atau hapus yang tidak dipakai.</p>
                      </div>
                      <div className="space-y-1.5 text-xs font-semibold">
                        {kategoriBelanjaList.map((k, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 border rounded-lg px-2.5 py-1.5">
                            {editingKategoriIdx === idx ? (
                              <>
                                <input
                                  value={formEditKategori}
                                  onChange={(e) => setFormEditKategori(e.target.value)}
                                  className="flex-1 min-w-0 border p-1.5 rounded-lg text-[11px] bg-white"
                                  autoFocus
                                />
                                <button type="button" onClick={() => handleSimpanEditKategoriBelanja(idx)} className="text-emerald-700 font-black text-[10px] shrink-0">Simpan</button>
                                <button type="button" onClick={handleBatalEditKategoriBelanja} className="text-slate-400 font-bold text-[10px] shrink-0">Batal</button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 min-w-0 font-bold text-slate-700 text-[11px] truncate">{k}</span>
                                <button type="button" onClick={() => handleMulaiEditKategoriBelanja(idx)} className="text-amber-700 font-black text-[10px] shrink-0">Edit</button>
                                <button type="button" onClick={() => handleHapusKategoriBelanja(idx)} className="text-rose-600 font-black text-[10px] shrink-0">Hapus</button>
                              </>
                            )}
                          </div>
                        ))}
                        {kategoriBelanjaList.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada kategori. Tambahkan lewat form di bawah.</p>}
                      </div>
                      <form onSubmit={handleTambahKategoriBelanja} className="flex gap-2 pt-1">
                        <input
                          value={formKategoriBaru}
                          onChange={(e) => setFormKategoriBaru(e.target.value)}
                          placeholder="Nama kategori baru"
                          className="flex-1 min-w-0 border p-2 rounded-lg text-[11px] bg-white"
                        />
                        <button type="submit" className="bg-emerald-700 text-white font-black text-[10px] px-3 rounded-lg shrink-0">+ Tambah</button>
                      </form>
                    </div>
                  </div>

                  {/* KOLOM KANAN: DAFTAR REALISASI BELANJA */}
                  <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-3">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase">Daftar Realisasi Belanja</h4>
                    <div className="space-y-2 text-xs font-semibold max-h-[720px] overflow-y-auto pr-1">
                      {realisasiBelanja.map(r => (
                        <div key={r.id} className={`p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2 ${editingRealisasiId === r.id ? 'ring-2 ring-amber-400' : ''}`}>
                          <div className="min-w-0">
                            <span className="inline-block text-[9px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-1">{r.kategori}</span>
                            <p className="text-slate-900 font-bold text-[12px]">{r.keterangan}</p>
                            <p className="text-slate-400 text-[11px]">{formatTanggalLaporan(r.tanggal)} • Rp {r.nominal.toLocaleString('id-ID')} • Target: {r.kelompok}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {r.buktiUrl && (
                              <button onClick={() => setPreviewLampiran({ judul: r.keterangan, url: r.buktiUrl, namaFile: r.buktiNamaFile, tipe: 'gambar' })} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px]">📷 Bukti</button>
                            )}
                            <button onClick={() => handleEditRealisasiBelanja(r)} className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg font-black text-[11px]">Edit</button>
                            <button onClick={() => handleHapusRealisasiBelanja(r.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg text-[11px]">Hapus</button>
                          </div>
                        </div>
                      ))}
                      {realisasiBelanja.length === 0 && <p className="text-slate-400 italic">Belum ada realisasi belanja tercatat.</p>}
                    </div>
                  </div>
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
                    <p className="text-[11px] text-slate-400 mt-0.5">Atur tingkat akses tiap warga yang sudah aktif. Contoh: ubah akses <strong>Hidayat</strong> menjadi Admin agar mendapat akses penuh (Admin Panel), atau kembalikan ke User untuk akses terbatas (Dashboard Warga saja). Tandai <strong>Akun Pengurus</strong> untuk warga yang menjabat pengurus RT - target &amp; pembayaran mereka otomatis DIKELUARKAN dari rekap Keuangan RT di Dashboard Utama (Total Kas Global &amp; Sisa Tagihan), tapi tetap dihitung penuh di Informasi Warga.</p>
                  </div>
                  <div className="space-y-2 text-xs font-semibold">
                    {members.map(m => (
                      <div key={m.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <strong>{m.nama}</strong>
                          <p className="text-slate-400">{m.username} | {m.kelompok}</p>
                          <p className="text-slate-400 mt-0.5">Password: <span className="italic text-slate-300">tersembunyi (gunakan Reset Password)</span></p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {m.pengurus && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-100 text-sky-700">Akun Pengurus</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTogglePengurus(m.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors ${m.pengurus ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                          >
                            {m.pengurus ? 'Lepas Akun Pengurus' : 'Jadikan Akun Pengurus'}
                          </button>
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

                {/* KELOLA BLOK / KELOMPOK (TAMBAH, GANTI NAMA, TUTUP, HAPUS)
                    -----------------------------------------------------------
                    Sebelumnya daftar blok/kelompok TIDAK bisa dikelola sama
                    sekali dari Web Utama (cuma bisa dilihat sebagai dropdown
                    di form lain) - kalau ada nama blok lama/tidak relevan
                    (mis. sisa data awal "Kelompok Sapi A/B/C"), admin TIDAK
                    punya cara mengubahnya kecuali edit langsung di Google
                    Sheet. Panel ini melengkapi itu supaya admin bisa
                    menambah, mengganti nama, menutup, atau menghapus blok
                    langsung dari sini - otomatis tersinkron ke Google Sheet
                    tab "Kelompok" dan langsung terlihat oleh semua akun. */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase mb-1">Kelola Blok / Kelompok</h4>
                  <p className="text-[11px] text-slate-400 mb-4">Tambah blok baru, ganti nama blok yang sudah tidak relevan, tutup pendaftaran blok penuh, atau hapus blok yang tidak dipakai.</p>

                  <div className="space-y-2 mb-4">
                    {kelompokList.map(k => (
                      <div key={k.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border rounded-xl text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 truncate">{k.nama} <span className="text-slate-400 font-normal">({k.jenis})</span></p>
                          <p className="text-[10px] text-slate-400">{members.filter(m => cocokBlok(m.kelompok, k.nama)).length} KK terdaftar • No. {k.noPengajuan}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${k.status === 'Progress' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}`}>{k.status}</span>
                        <button type="button" onClick={() => handleToggleStatusKelompok(k.id)} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">{k.status === 'Progress' ? 'Tutup' : 'Buka'}</button>
                        <button type="button" onClick={() => handleEditKelompok(k)} className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Edit</button>
                        <button type="button" onClick={() => handleHapusKelompok(k)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Hapus</button>
                      </div>
                    ))}
                    {kelompokList.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada blok/kelompok yang ditambahkan.</p>}
                  </div>

                  <form onSubmit={handleTambahKelompok} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <p className="text-emerald-800 font-black text-[11px]">{editingKelompokId ? 'Edit Blok/Kelompok' : 'Tambah Blok/Kelompok Baru'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input type="text" placeholder="Nama Blok (mis. Blok H1)" value={formKelompokBaru.nama} onChange={(e) => setFormKelompokBaru({...formKelompokBaru, nama: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                      <select value={formKelompokBaru.jenis} onChange={(e) => setFormKelompokBaru({...formKelompokBaru, jenis: e.target.value})} className="w-full border p-2 rounded-xl bg-white">
                        <option value="Rumah">Rumah</option>
                        <option value="Ruko">Ruko</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                      <input type="text" placeholder="No. Pengajuan (opsional, otomatis jika kosong)" value={formKelompokBaru.noPengajuanManual} onChange={(e) => setFormKelompokBaru({...formKelompokBaru, noPengajuanManual: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-[11px]">{editingKelompokId ? 'Simpan Perubahan' : 'Tambah Blok'}</button>
                      {editingKelompokId && <button type="button" onClick={handleBatalEditKelompok} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-[11px]">Batal</button>}
                    </div>
                  </form>
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
                            <button onClick={() => handleHapusMemberPasifMassal(idsUntukAksi)} className="bg-rose-600 text-white px-3 py-1.5 rounded-lg transition-transform hover:scale-[1.03]">🗑️ Hapus Warga Pasif Terpilih</button>
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
                                  <span className="text-slate-400 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                    Username: <span className="font-mono text-slate-700">{m.username}</span>
                                    <span className="text-slate-300">|</span>
                                    Password: <span className="font-mono text-slate-700">
                                      {passwordTerlihat[m.id] === 'memuat' ? 'memuat...' : (passwordTerlihat[m.id] !== undefined ? passwordTerlihat[m.id] : '••••••••')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleLihatPassword(m.id)}
                                      disabled={passwordTerlihat[m.id] === 'memuat'}
                                      className="text-emerald-700 font-bold underline underline-offset-2 text-[10px] disabled:opacity-50"
                                    >
                                      {passwordTerlihat[m.id] !== undefined ? '🙈 Sembunyikan' : '👁️ Lihat Password'}
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
                                <button
                                  onClick={() => handleAdminResetPassword(m.id)}
                                  disabled={!!sedangResetPassword[m.id]}
                                  className="bg-rose-600 text-white px-2.5 py-1 rounded text-[10px] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {sedangResetPassword[m.id] ? 'Mereset...' : 'Reset Password'}
                                </button>
                                {m.statusAnggota === 'Pasif' && (
                                  <button onClick={() => handleHapusMemberPasif(m)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-black" title="Hapus permanen akun warga Pasif ini">🗑️ Hapus</button>
                                )}
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
                          <span className="text-slate-400 font-normal">{w.blok} • Keluar: {formatTanggalIndo(w.tanggalKeluar)}{w.keterangan ? ` • ${w.keterangan}` : ''}</span>
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
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase whitespace-nowrap ${
                        sheetStatus === 'synced' ? 'bg-emerald-100 text-emerald-700' :
                        sheetStatus === 'loading' ? 'bg-amber-100 text-amber-700' :
                        sheetStatus === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {sheetStatus === 'synced' ? '● Tersambung' : sheetStatus === 'loading' ? '● Menyinkron...' : sheetStatus === 'error' ? '● Gagal Tersambung' : '● Mode Lokal (belum disambungkan)'}
                      </span>
                      {/* PERBAIKAN: tombol paksa ambil ulang data terbaru dari Sheet, tanpa perlu reload halaman penuh */}
                      <button
                        type="button"
                        onClick={() => muatSemuaDataDariSheet(false)}
                        disabled={sheetStatus === 'loading'}
                        title="Ambil ulang data terbaru dari Google Sheets"
                        className="bg-slate-100 text-slate-700 font-black w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                      >⟳</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">URL Web App Google Apps Script</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="text" placeholder="https://script.google.com/macros/s/xxxxx/exec" value={cmsForm.appsScriptUrl} onChange={(e) => setCmsForm({...cmsForm, appsScriptUrl: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50 font-mono text-[11px]" />
                      <button type="button" onClick={handleTestKoneksiSheet} disabled={sheetTesting} className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl whitespace-nowrap disabled:opacity-50">{sheetTesting ? 'Menguji...' : '🔌 Tes Koneksi'}</button>
                      <button type="button" onClick={() => saveCms()} className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-4 py-2 rounded-xl whitespace-nowrap">💾 Simpan URL</button>
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
                      <p className="text-[11px] text-slate-400 mt-0.5">Setiap perubahan langsung tersimpan &amp; tersinkron otomatis ke halaman Beranda dan Informasi Umum seluruh warga - tidak perlu klik simpan berkali-kali kalau cuma mengubah satu kolom.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* INDIKATOR AUTO-SAVE - muncul kecil di samping tombol, memberi tahu
                          admin bahwa perubahan sudah otomatis tersimpan tanpa perlu diklik. */}
                      {cmsAutoSaveStatus !== 'idle' && (
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${cmsAutoSaveStatus === 'saving' ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {cmsAutoSaveStatus === 'saving' ? (
                            <>⏳ Menyimpan otomatis...</>
                          ) : (
                            <>✓ Tersimpan otomatis{cmsLastSaved ? ` • ${cmsLastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}</>
                          )}
                        </span>
                      )}
                      <button onClick={() => saveCms()} className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-6 py-2.5 rounded-xl whitespace-nowrap transition-transform duration-150 hover:scale-[1.02] shadow-lg">💾 Simpan Sekarang</button>
                    </div>
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

                  {/* SUSUNAN PANITIA (RW) */}
                  <div className="border-t pt-4">
                    <h4 className="text-slate-900 font-black text-xs mb-1">Susunan Panitia RW</h4>
                    <p className="text-[10px] text-slate-400 mb-3">Nama di sini otomatis tampil di kartu "Struktur Pengurus RW" halaman Beranda saja. <strong>Bukan</strong> sumber nama Bendahara di Kuitansi Digital - nama &amp; tanda tangan Bendahara di kuitansi sekarang otomatis diambil dari anggota berjabatan "Bendahara" pada daftar <strong>Foto Anggota Struktur RT</strong> di bawah, supaya tidak ketuker dengan Panitia RW.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><label className="block text-slate-600 mb-1">Ketua Panitia</label><input type="text" value={cmsForm.panitiaKetua} onChange={(e) => setCmsForm({...cmsForm, panitiaKetua: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Sekretaris</label><input type="text" value={cmsForm.panitiaSekretaris} onChange={(e) => setCmsForm({...cmsForm, panitiaSekretaris: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div>
                        <label className="block text-slate-600 mb-1">Bendahara <span className="text-slate-400">(cadangan saja)</span></label>
                        <input type="text" value={cmsForm.panitiaBendahara} onChange={(e) => setCmsForm({...cmsForm, panitiaBendahara: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" />
                      </div>
                      <div><label className="block text-slate-600 mb-1">Humas</label><input type="text" value={cmsForm.panitiaHumas} onChange={(e) => setCmsForm({...cmsForm, panitiaHumas: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    </div>

                    {/* KETERANGAN/LABEL JABATAN - teks kecil di atas nama pada kartu
                        "Struktur Pengurus RW" di Web Utama (mis. "Ketua RW", "Sekretaris",
                        dst). Dipisah dari nama supaya keterangan jabatan bisa diedit
                        bebas oleh Admin tanpa mengubah kode. */}
                    <p className="text-[10px] text-slate-400 mt-4 mb-2">Keterangan/label jabatan yang tampil di atas setiap nama pada kartu "Struktur Pengurus RW" Web Utama:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><label className="block text-slate-600 mb-1">Label Ketua</label><input type="text" value={cmsForm.labelKetua} onChange={(e) => setCmsForm({...cmsForm, labelKetua: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Label Sekretaris</label><input type="text" value={cmsForm.labelSekretaris} onChange={(e) => setCmsForm({...cmsForm, labelSekretaris: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Label Bendahara</label><input type="text" value={cmsForm.labelBendahara} onChange={(e) => setCmsForm({...cmsForm, labelBendahara: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                      <div><label className="block text-slate-600 mb-1">Label Humas</label><input type="text" value={cmsForm.labelHumas} onChange={(e) => setCmsForm({...cmsForm, labelHumas: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
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
                    <p className="text-[10px] text-slate-400 mb-3">Kelola foto & nama pengurus RT. Otomatis tampil sebagai galeri foto di halaman Beranda (Web Utama) untuk semua akun. Foto diupload langsung ke Google Drive panitia (bukan base64) begitu URL Apps Script sudah disambungkan. <span className="text-emerald-700 font-bold">Anggota berjabatan "Bendahara" di daftar ini otomatis jadi nama & tanda tangan yang tampil di Kuitansi Digital warga.</span></p>

                    <div className="space-y-2 mb-4">
                      {strukturRt.map(d => {
                        const isBendaharaKuitansi = (d.jabatan || '').toLowerCase().includes('bendahara') && d.nama === getBendaharaRtNama();
                        return (
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
                            {isBendaharaKuitansi && (
                              <p className="text-[9px] text-emerald-600 font-bold mt-0.5">✓ Terhubung ke Kuitansi Digital</p>
                            )}
                          </div>
                          <button type="button" onClick={() => handleEditAnggotaStruktur(d)} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Edit</button>
                          <button type="button" onClick={() => handleHapusAnggotaStruktur(d.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Hapus</button>
                        </div>
                      );})}
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

                  {/* SERBA-SERBI UMKM RT - galeri promosi produk UMKM warga, tampil
                      di halaman Beranda (Web Utama) di bawah kartu "Struktur
                      Pengurus RT", terlihat oleh SEMUA akun. */}
                  <div className="border-t pt-4">
                    <h4 className="text-slate-900 font-black text-xs mb-1">🛍️ Serba-Serbi UMKM RT</h4>
                    <p className="text-[10px] text-slate-400 mb-3">Kelola foto produk, nama produk, deskripsi singkat, & nomor WhatsApp pemilik produk. Otomatis tampil sebagai galeri kartu UMKM di halaman Beranda (Web Utama) untuk semua akun, lengkap dengan tombol Chat WhatsApp yang langsung terkoneksi ke nomor WA pemilik produk masing-masing.</p>

                    <div className="space-y-2 mb-4">
                      {umkmList.map(u => (
                        <div key={u.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border rounded-xl">
                          <div className="w-11 h-11 rounded-lg border bg-white overflow-hidden shrink-0 flex items-center justify-center relative">
                            <span className="text-slate-300 text-[9px]">Foto</span>
                            {u.foto && (
                              <img
                                loading="lazy"
                                decoding="async"
                                src={toDirectImageUrl(u.foto)}
                                alt={u.namaProduk}
                                className="w-full h-full object-cover absolute inset-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 truncate">{u.namaProduk}</p>
                            <p className="text-slate-500 text-[10px] truncate">{u.deskripsi}</p>
                            <p className="text-emerald-700 font-bold text-[10px]">{u.noWa ? `WA: ${u.noWa}` : 'Nomor WA belum diisi'}</p>
                          </div>
                          <button type="button" onClick={() => handleEditUmkm(u)} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Edit</button>
                          <button type="button" onClick={() => handleHapusUmkm(u.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Hapus</button>
                        </div>
                      ))}
                      {umkmList.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada produk UMKM yang ditambahkan.</p>}
                    </div>

                    <form onSubmit={handleTambahUmkm} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                      <p className="text-emerald-800 font-black text-[11px]">{editingUmkmId ? 'Edit Produk UMKM' : 'Tambah Produk UMKM Baru'}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="text" placeholder="Nama Produk (mis. Nasi Uduk Bu Sari)" value={formUmkmBaru.namaProduk} onChange={(e) => setFormUmkmBaru({...formUmkmBaru, namaProduk: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                        <input type="text" placeholder="Nomor WhatsApp Pemilik (mis. 081234567890)" value={formUmkmBaru.noWa} onChange={(e) => setFormUmkmBaru({...formUmkmBaru, noWa: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                        <input type="file" accept="image/*" onChange={handleFotoUmkmChange} className="w-full border p-2 rounded-xl bg-white text-[11px]" />
                      </div>
                      <textarea rows={2} placeholder="Deskripsi singkat produk" value={formUmkmBaru.deskripsi} onChange={(e) => setFormUmkmBaru({...formUmkmBaru, deskripsi: e.target.value})} className="w-full border p-2 rounded-xl bg-white" />
                      {formUmkmBaru.foto && (
                        <div className="flex items-center gap-2">
                          <img loading="lazy" decoding="async" src={formUmkmBaru.foto} alt="Preview" className="w-10 h-10 rounded-lg object-cover border" />
                          <button type="button" onClick={() => setFormUmkmBaru(prev => ({ ...prev, foto: null }))} className="text-[10px] font-bold text-rose-600">Hapus Foto</button>
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        {editingUmkmId && (
                          <button type="button" onClick={() => { setEditingUmkmId(null); setFormUmkmBaru({ namaProduk: '', deskripsi: '', noWa: '', foto: null }); }} className="bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[11px]">Batal</button>
                        )}
                        <button type="submit" className="bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-[11px]">{editingUmkmId ? 'Simpan Perubahan' : '+ Tambah Produk'}</button>
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

                  {/* PILIHAN BLOK RUMAH & NOMOR RUMAH (dropdown Form Pendaftaran warga
                      baru) - dulu hardcode F1-F14/G1-G6 & nomor 1-25 di kode, sekarang
                      bisa diedit bebas oleh Admin di sini (tambah/hapus), otomatis
                      langsung dipakai di form pendaftaran untuk semua pengunjung.
                      CATATAN: ini BEDA dengan menu "Kelola Blok / Kelompok" (Rekap Blok
                      Rumah) yang mengatur pengelompokan warga untuk iuran - daftar di
                      sini hanya untuk pilihan Blok & Nomor di form pendaftaran. */}
                  <div className="border-t pt-4">
                    <h4 className="text-slate-900 font-black text-xs mb-1">Pilihan Blok Rumah &amp; Nomor Rumah (Form Pendaftaran)</h4>
                    <p className="text-[10px] text-slate-400 mb-3">Daftar pilihan yang muncul di dropdown "Blok Rumah" &amp; "Nomor Rumah" saat warga baru mendaftar. Tambah, hapus, atau sesuaikan sendiri sesuai kondisi RT Anda - tidak perlu edit kode lagi.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 mb-1">Daftar Blok Rumah</label>
                        <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                          {(cmsForm.daftarBlokRumahList || []).map((b, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 border rounded-lg px-2 py-1">
                              <span className="truncate">{b}</span>
                              <button type="button" onClick={() => handleHapusBlokRumah(i)} className="text-rose-600 font-bold text-[10px] shrink-0 ml-2">Hapus</button>
                            </div>
                          ))}
                          {(!cmsForm.daftarBlokRumahList || cmsForm.daftarBlokRumahList.length === 0) && <p className="text-slate-400 italic text-[10px]">Belum ada pilihan blok.</p>}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="mis. F15 / Blok H1" value={inputBlokRumahBaru} onChange={(e) => setInputBlokRumahBaru(e.target.value)} className="flex-1 border p-2 rounded-xl bg-slate-50" />
                          <button type="button" onClick={handleTambahBlokRumah} className="bg-slate-200 text-slate-700 font-bold px-3 rounded-xl text-[11px]">+ Tambah</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Daftar Nomor Rumah</label>
                        <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                          {(cmsForm.daftarNomorRumahList || []).map((n, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 border rounded-lg px-2 py-1">
                              <span className="truncate">{n}</span>
                              <button type="button" onClick={() => handleHapusNomorRumah(i)} className="text-rose-600 font-bold text-[10px] shrink-0 ml-2">Hapus</button>
                            </div>
                          ))}
                          {(!cmsForm.daftarNomorRumahList || cmsForm.daftarNomorRumahList.length === 0) && <p className="text-slate-400 italic text-[10px]">Belum ada pilihan nomor.</p>}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="mis. 26 / 12B" value={inputNomorRumahBaru} onChange={(e) => setInputNomorRumahBaru(e.target.value)} className="flex-1 border p-2 rounded-xl bg-slate-50" />
                          <button type="button" onClick={handleTambahNomorRumah} className="bg-slate-200 text-slate-700 font-bold px-3 rounded-xl text-[11px]">+ Tambah</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 flex justify-end items-center gap-3 flex-wrap">
                    {cmsAutoSaveStatus !== 'idle' && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${cmsAutoSaveStatus === 'saving' ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {cmsAutoSaveStatus === 'saving' ? (
                          <>⏳ Menyimpan otomatis...</>
                        ) : (
                          <>✓ Tersimpan otomatis{cmsLastSaved ? ` • ${cmsLastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}</>
                        )}
                      </span>
                    )}
                    <button onClick={() => saveCms()} className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-8 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.02] shadow-lg">💾 Simpan Sekarang</button>
                  </div>
                </div>

                {/* BUKU KAS MASUK/KELUAR RT - tambah/edit/hapus transaksi, saldo berjalan otomatis */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs text-xs font-semibold space-y-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">📒 Buku Kas Masuk/Keluar RT</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Catat setiap transaksi kas masuk (iuran, infaq, dll) & keluar (operasional, dll). Saldo berjalan otomatis dihitung urut tanggal, langsung tampil di Web Utama.</p>
                  </div>

                  <PaginasiKas data={getRiwayatKasRtDenganSaldo()} ukuran={10} gaya="terang">
                    {(baris) => (
                      <div className="space-y-2">
                        {baris.map(t => (
                          <div key={t.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-900 truncate">{t.keterangan}</p>
                              <p className="text-[10px] text-slate-400">{formatTanggalLaporan(t.tanggal)} • Saldo setelah: Rp{t.saldoSetelah.toLocaleString('id-ID')}</p>
                            </div>
                            <span className={`font-bold text-[11px] shrink-0 ${t.jenis === 'Masuk' ? 'text-[#047857]' : 'text-rose-600'}`}>{t.jenis === 'Masuk' ? '+' : '-'}Rp{Number(t.nominal).toLocaleString('id-ID')}</span>
                            <button type="button" onClick={() => handleEditRiwayatKasRt(t)} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Edit</button>
                            <button type="button" onClick={() => handleHapusRiwayatKasRt(t.id)} className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-bold shrink-0">Hapus</button>
                          </div>
                        ))}
                        {riwayatKasRt.length === 0 && <p className="text-slate-400 italic text-[11px]">Belum ada transaksi kas RT yang dicatat.</p>}
                      </div>
                    )}
                  </PaginasiKas>

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
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Username &amp; password ini yang dipakai untuk masuk ke Admin Panel dari form "Login Akun Warga / Admin" di Web Utama (form yang sama dengan login warga).</p>
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
                    <div className="sm:col-span-2 flex justify-between items-center flex-wrap gap-2">
                      <button type="button" onClick={() => { if (window.confirm('Kembalikan username & password Admin Panel di browser ini ke bawaan admin/admin123?')) handleResetAdminAccountKeDefault(); }} className="text-rose-600 font-bold text-[11px] underline underline-offset-2">Reset ke Bawaan (admin/admin123)</button>
                      <button type="submit" className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-bold px-6 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.02]">💾 Simpan Login Admin</button>
                    </div>
                  </form>
                  <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">Catatan: username &amp; password Admin Panel tersimpan di browser perangkat ini (localStorage). Kalau login dari laptop &amp; HP berbeda, dan salah satu perangkat pernah dipakai mengganti password sebelum perbaikan ini, gunakan tombol "Reset ke Bawaan" di perangkat yang gagal login, lalu login ulang dengan admin/admin123 dan ganti password lagi supaya tersimpan konsisten.</p>
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
                      {agendaUtama.foto ? <GambarZoom src={agendaUtama.foto} alt={agendaUtama.judul} className="w-full h-full object-cover" onBuka={bukaLightbox} /> : <span className="text-[10px] text-slate-400 font-bold">Belum ada foto agenda utama</span>}
                    </div>
                    <div className="p-3">
                      <p className="text-slate-400 font-bold text-[10px]">{formatAgendaLengkap(agendaUtama.tanggal, agendaUtama.jam)}</p>
                      <h4 className="text-slate-900 font-bold text-[12px] mt-0.5">{agendaUtama.judul || 'Belum ada agenda utama'}</h4>
                    </div>
                  </div>

                  <form onSubmit={handleSimpanAgendaUtama} className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <h4 className="sm:col-span-2 text-slate-900 font-black text-xs -mb-1">Form Agenda Utama / Spesial</h4>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Judul / Agenda Spesial</label><input type="text" value={formAgendaUtama.judul} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, judul: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="Kerja Bakti & Silaturahmi Warga" /></div>
                    <div><label className="block text-slate-600 mb-1">Tanggal</label><input type="date" value={formAgendaUtama.tanggal} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, tanggal: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="17 Jun 2026" /></div>
                    {/* PERBAIKAN BUG "1899-12-30": pakai <input type="time"> (bukan text)
                        supaya nilai jam SELALU rapi format HH:MM, tidak akan pernah lagi
                        ketiban nilai serial tanggal mentah dari Google Sheets. Nilai yang
                        ditampilkan juga dibersihkan dulu lewat sanitizeJamAgenda() sebagai
                        lapisan pengaman tambahan kalau ada data lama yang masih kotor. */}
                    <div><label className="block text-slate-600 mb-1">Jam</label><input type="time" value={sanitizeJamAgenda(formAgendaUtama.jam)} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, jam: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="07:00" /></div>
                    <div><label className="block text-slate-600 mb-1">Tempat</label><input type="text" value={formAgendaUtama.tempat} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, tempat: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="RT Jami' Nurul Falah" /></div>
                    <div><label className="block text-slate-600 mb-1">Pembicara / Penanggung Jawab</label><input type="text" value={formAgendaUtama.pembicara} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, pembicara: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Deskripsi Agenda Utama</label><textarea rows={2} value={formAgendaUtama.detail} onChange={(e) => setFormAgendaUtama({...formAgendaUtama, detail: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" /></div>
                    <div className="sm:col-span-2"><label className="block text-slate-600 mb-1">Upload Foto Agenda Utama (ukuran lebih besar)</label><input type="file" accept="image/*" onChange={handleFotoAgendaUtamaChange} className="w-full border p-2 rounded-xl bg-slate-50" />
                      {formAgendaUtama.foto && <img loading="lazy" decoding="async" src={formAgendaUtama.foto} alt="preview" className="w-32 h-20 object-cover rounded-lg border mt-2" />}
                    </div>
                    <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2">
                      <button type="submit" className="flex-1 bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.01] shadow-lg">⭐ Simpan Agenda Utama</button>
                      {/* Ganti/edit ke agenda yang sama sekali baru: kosongkan dulu
                          form-nya (tidak menghapus data yang sedang tampil sampai
                          tombol Simpan di atas ditekan). */}
                      <button type="button" onClick={handleBuatAgendaUtamaBaru} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl border transition-transform duration-150 hover:scale-[1.01]">🔄 Ganti / Buat Baru</button>
                      {agendaUtama.judul && (
                        <button type="button" onClick={handleHapusAgendaUtama} className="bg-rose-50 text-rose-600 font-bold px-4 py-2.5 rounded-xl border border-rose-200 transition-transform duration-150 hover:scale-[1.01]">🗑️ Hapus</button>
                      )}
                    </div>
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
                          {k.foto ? <GambarZoom src={k.foto} alt={k.judul} className="w-full h-full object-cover" onBuka={bukaLightbox} /> : <span className="text-[10px] text-slate-400 font-bold">Belum ada foto</span>}
                        </div>
                        <div className="p-3">
                          <p className="text-slate-400 font-bold text-[10px]">{formatAgendaLengkap(k.tanggal, k.jam)}</p>
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
                    {/* PERBAIKAN BUG "1899-12-30" (sama seperti Agenda Utama): pakai
                        <input type="time"> + sanitizeJamAgenda() supaya jam kegiatan
                        biasa juga tidak pernah menampilkan nilai serial tanggal mentah. */}
                    <div><label className="block text-slate-600 mb-1">Jam</label><input type="time" value={sanitizeJamAgenda(formKegiatan.jam)} onChange={(e) => setFormKegiatan({...formKegiatan, jam: e.target.value})} className="w-full border p-2 rounded-xl bg-slate-50" placeholder="19:40" /></div>
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

                {/* ATUR TANGGAL MULAI PERIODE (TIDAK HARUS JANUARI-DESEMBER) */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs text-xs font-semibold">
                  <h3 className="text-sm font-black text-slate-900">Atur Tanggal Mulai Periode</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-lg">Cukup isi 1 tanggal mulai (contoh: 01-07-2026 untuk periode "Juli 2026"). Sistem otomatis menyusun siklus 12 bulan tagihan mulai dari bulan tersebut - <strong>tidak harus Januari-Desember</strong> - dan langsung berlaku otomatis di akun seluruh warga tanpa perlu diatur satu per satu. Periode berjalan saat ini: <strong className="text-emerald-700">{labelRentangPeriode}</strong>.</p>
                  <form onSubmit={handleSimpanPengaturanPeriode} className="flex flex-wrap items-end gap-3 mt-4">
                    <div>
                      <label className="block text-slate-600 mb-1">Tanggal Mulai Periode</label>
                      <input type="date" value={formPengaturanPeriode.tanggalMulai} onChange={(e) => setFormPengaturanPeriode({ tanggalMulai: e.target.value })} className="border p-2 rounded-xl bg-slate-50" required />
                    </div>
                    <button type="submit" className="bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition-transform duration-150 hover:scale-[1.01] shadow-lg">💾 Simpan Pengaturan Periode</button>
                  </form>
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
                <p className="text-[11px] text-slate-400 mt-0.5">Iuran Bulan {previewBukti.bulanNama} {getTahunUntukBulan(previewBukti.bulanNama)} • Rp {previewBukti.nominal.toLocaleString('id-ID')}</p>
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
                    <button onClick={() => { handleRejectPembayaran(previewBukti.userNama, previewBukti.bulanNama, previewBukti.tunggakanId || null); setPreviewBukti(null); }} className="flex-1 bg-rose-100 text-rose-700 font-bold py-2 rounded-xl text-[11px]">Tolak</button>
                    <button onClick={() => setKonfirmasiApprove({ userNama: previewBukti.userNama, bulanNama: previewBukti.bulanNama, nominal: previewBukti.nominal, dariPreview: true, tunggakanId: previewBukti.tunggakanId || null })} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-[11px]">✓ Setujui (Dana Masuk)</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW KUITANSI PROFESIONAL (DENGAN KOP RT) */}
      {selectedKuitansi && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 anim-fade"
          onClick={() => setSelectedKuitansi(null)}
        >
          {/* PERBAIKAN UKURAN MODAL: dibatasi max-h-[90vh] + flex-col supaya kuitansi
              yang kontennya panjang TIDAK PERNAH melebihi tinggi layar. Tombol ✕
              sengaja diletakkan di LUAR area scroll (sebagai sibling, bukan anak dari
              div yang overflow-y-auto) supaya selalu menempel & bisa diklik di pojok
              kanan-atas kapan pun, walau isi kuitansi di-scroll ke bawah. Klik area
              gelap di luar kartu, atau tombol ✕, sama-sama menutup kuitansi. */}
          <div
            className="bg-white w-full max-w-md max-h-[90vh] rounded-3xl relative border shadow-2xl anim-pop flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setSelectedKuitansi(null)} className="absolute top-3 right-3 bg-white text-slate-700 w-8 h-8 rounded-full font-black z-20 shadow-lg border border-slate-200 flex items-center justify-center transition-transform hover:scale-110">✕</button>

            <div className="overflow-y-auto">
              {/* KOP SURAT */}
              <div className="bg-emerald-800 text-white px-6 pt-6 pb-5 text-center">
                {cmsTeks.logoRT && (
                  <img loading="lazy" decoding="async" src={cmsTeks.logoRT} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg mx-auto mb-2 p-1" onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                {selectedKuitansi.isSimulasi && (
                  <span className="inline-block bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">🧪 Contoh / Simulasi - Bukan Kuitansi Asli</span>
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
                  <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Untuk pembayaran</span><strong>Iuran Warga Bln. {selectedKuitansi.bulan} {getTahunUntukBulan(selectedKuitansi.bulan)} (Angsuran Ke-{selectedKuitansi.angsuranKe})</strong></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Nominal</span><strong className="text-emerald-800">Rp {selectedKuitansi.nominal.toLocaleString('id-ID')}</strong></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Tanggal Pelunasan</span><strong>{pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).tanggal}</strong></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Jam Pelunasan</span><strong>{pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).jam}</strong></div>
                  <div className="flex justify-between items-center pt-1"><span className="text-slate-500">Status</span><span className="bg-emerald-700 text-white text-[10px] px-2 py-0.5 rounded font-sans font-bold">LUNAS</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="text-slate-500">Diverifikasi oleh</span><strong className="text-emerald-800">Bendahara RT {getBendaharaRtNama()}</strong></div>
                </div>

                <div className="flex justify-between items-end mt-6 font-sans">
                  <div className="text-center">
                    <div className="w-16 h-16 border-2 border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 p-1">
                      <img
                        loading="lazy"
                        decoding="async"
                        alt="QR Verifikasi Kuitansi"
                        className="w-full h-full object-contain"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(`KWITANSI RESMI ${selectedKuitansi.noKuitansi}\n${cmsTeks.namaRT}\nDiterima dari: ${selectedKuitansi.nama}\nNomor Rumah/Blok: ${selectedKuitansi.nomorRumah || selectedKuitansi.nama}\nBulan: ${selectedKuitansi.bulan} ${getTahunUntukBulan(selectedKuitansi.bulan)}\nNominal: Rp ${selectedKuitansi.nominal.toLocaleString('id-ID')}\nTanggal Pelunasan: ${pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).tanggal}\nJam Pelunasan: ${pisahTanggalJam(selectedKuitansi.waktuLunas || selectedKuitansi.tanggal).jam}\nStatus: LUNAS - Diverifikasi Bendahara RT ${getBendaharaRtNama()}`)}`}
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
                    <p className="text-[11px] font-bold border-t border-slate-400 pt-1 mt-1">{getBendaharaRtNama()}</p>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 mt-3 leading-relaxed text-center">Kuitansi ini sah dan diterbitkan otomatis oleh sistem tanpa memerlukan cap basah.</p>

                <button onClick={() => window.print && window.print()} className="w-full mt-5 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white font-sans font-bold py-2.5 rounded-xl text-xs transition-transform duration-150 hover:scale-[1.01]">Unduh / Cetak Kuitansi</button>
              </div>
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
              <p className="flex justify-between"><span className="text-slate-400">Bulan</span><span>{konfirmasiUploadBukti.bulanNama} {getTahunUntukBulan(konfirmasiUploadBukti.bulanNama)}</span></p>
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
              {konfirmasiApprove.tunggakanId && <span className="inline-block bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase mt-1">Pelunasan Tunggakan</span>}
              <p className="text-slate-400 mt-1">{konfirmasiApprove.userNama} • Bulan {konfirmasiApprove.bulanNama}{konfirmasiApprove.nominal ? ` • Rp ${Number(konfirmasiApprove.nominal).toLocaleString('id-ID')}` : ''}</p>
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
