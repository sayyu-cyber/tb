const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/** @returns {import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  // Static export builds always compile through .next in Next 14.
  // Keep the live development cache separate from that build workspace.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : process.env.THAASBAI_BUILD_DIR || '.next',
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ["lh3.googleusercontent.com", "firebasestorage.googleapis.com"],
  },
});

module.exports = nextConfig;
