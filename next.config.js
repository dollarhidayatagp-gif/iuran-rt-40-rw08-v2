/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // PENTING: Mengubah build menjadi HTML/CSS statis
  basePath: '/iuran-rt-40-rw08-v2', // Ganti dengan nama repositori kamu
  assetPrefix: '/iuran-rt-40-rw08-v2/', 
  images: {
    unoptimized: true, // PENTING: GitHub Pages tidak mendukung optimasi gambar bawaan Next.js
  },
};

module.exports = nextConfig;
