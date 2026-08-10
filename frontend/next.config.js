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
      // --- Temporary gate: pages whose only content is seed/demo data ---
      // The leaderboard, guild directory, and progression ladder render
      // placeholder and stale test records rather than real activity. They
      // stay redirected until there is genuine completed-job data behind
      // them. Delete this block to re-enable the pages.
      //
      // These point straight at /jobs rather than /questboard so they do not
      // chain through the rename redirect below.
      {
        source: '/leaderboard',
        destination: '/jobs',
        permanent: false,
      },
      {
        source: '/leaderboards',
        destination: '/jobs',
        permanent: false,
      },
      {
        source: '/progression',
        destination: '/jobs',
        permanent: false,
      },
      {
        source: '/guilds/:path*',
        destination: '/jobs',
        permanent: false,
      },
      {
        source: '/guilds',
        destination: '/jobs',
        permanent: false,
      },

      // --- Marketplace URL rename (permanent) ---
      // The board, job detail and posting flow moved off RPG slugs and onto
      // plain marketplace paths: /jobs, /job/:id, /post-a-job. These are 301s
      // so the old URLs pass their link equity to the new ones.
      {
        source: '/questboard',
        destination: '/jobs',
        permanent: true,
      },
      {
        source: '/questboard/:id',
        destination: '/job/:id',
        permanent: true,
      },
      {
        source: '/post-quest',
        destination: '/post-a-job',
        permanent: true,
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
        destination: '/post-a-job',
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
