/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sembunyikan badge/indicator dev Next.js agar tidak menutupi elemen UI
  // (mengganggu klik tombol di pojok layar saat preview & automated test).
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  // Semua halaman dirender sebagai SPA (react-router di client), jadi tidak perlu
  // image optimization server-side.
  images: { unoptimized: true },
  serverExternalPackages: ['mongodb', 'bcryptjs'],
};

module.exports = nextConfig;
