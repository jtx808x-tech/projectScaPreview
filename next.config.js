/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Semua halaman dirender sebagai SPA (react-router di client), jadi tidak perlu
  // image optimization server-side.
  images: { unoptimized: true },
  serverExternalPackages: ['mongodb', 'bcryptjs'],
};

module.exports = nextConfig;
