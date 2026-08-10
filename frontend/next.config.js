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
      // The leaderboard, guild directory, and progression ladder currently
      // render placeholder and stale test records rather than real activity.
      // They stay redirected until there is genuine completed-job data behind
      // them. Remove these four entries to re-enable the pages.
      {
        source: '/leaderboard',
        destination: '/questboard',
        permanent: false,
      },
      {
        source: '/leaderboards',
        destination: '/questboard',
        permanent: false,
      },
      {
        source: '/progression',
        destination: '/questboard',
        permanent: false,
      },
      {
        source: '/guilds/:path*',
        destination: '/questboard',
        permanent: false,
      },
      {
        source: '/guilds',
        destination: '/questboard',
        permanent: false,
      },
      {
        source: '/jobs',
        destination: '/questboard',
        permanent: false,
      },
      {
        // Job history moved onto the guild detail page; this path has no page of its own.
        source: '/guilds/:id/quests',
        destination: '/guilds/:id',
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
