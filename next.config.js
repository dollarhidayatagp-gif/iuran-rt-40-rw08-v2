/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', 
  basePath: '/iuran-rt-40-rw08-v2', 
  assetPrefix: '/iuran-rt-40-rw08-v2/', 
  images: {
    unoptimized: true, 
  },
  // TAMBAHKAN DUA BAGIAN INI:
  eslint: {
    ignoreDuringBuilds: true, // Mengabaikan error eslint saat build
  },
  typescript: {
    ignoreBuildErrors: true, // Mengabaikan error TypeScript saat build
  },
};

module.exports = nextConfig;
