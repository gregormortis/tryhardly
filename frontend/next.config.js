/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'tryhardly.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/jobs',
        destination: '/questboard',
        permanent: false,
      },
      {
        source: '/facebook',
        destination: '/post-job-fast',
        permanent: false,
      },
      {
        source: '/workers',
        destination: '/find-work-fast',
        permanent: false,
      },
      {
        source: '/find-work',
        destination: '/find-work-fast',
        permanent: false,
      },
      {
        source: '/post-job',
        destination: '/post-quest',
        permanent: false,
      },
      {
        source: '/checkout/success',
        destination: '/payments/checkout/success',
        permanent: false,
      },
      {
        source: '/checkout/cancel',
        destination: '/payments/checkout/cancel',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
