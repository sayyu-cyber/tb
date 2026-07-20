/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ["lh3.googleusercontent.com", "firebasestorage.googleapis.com"],
  },
};

module.exports = nextConfig;
