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
      // --- Funnel consolidation ---
      // There were six front doors for two actions: the homepage,
      // /post-job-fast, /find-work-fast, /redding, /request-help and
      // /work-alerts. Every one of them restated the same pitch with a
      // different headline, which is the single biggest reason the site felt
      // like a pile of pages rather than a product. There are now two: post a
      // job, or browse jobs. The Facebook/Craigslist campaign landers redirect
      // into them rather than competing with them.
      //
      // The page files are still in the tree. Deleting these four entries
      // brings them back if a campaign genuinely needs its own lander.
      {
        source: '/post-job-fast',
        destination: '/post-a-job',
        permanent: false,
      },
      {
        source: '/find-work-fast',
        destination: '/jobs',
        permanent: false,
      },
      // /service-packages renders raw seed data in production (a "trim" listing
      // at $9/hr described as "trimtrim"). Nothing kills trust faster than test
      // records on a live marketplace. Gated until there are real packages.
      {
        source: '/service-packages',
        destination: '/jobs',
        permanent: false,
      },
      {
        source: '/facebook',
        destination: '/post-a-job',
        permanent: false,
      },
      {
        source: '/workers',
        destination: '/jobs',
        permanent: false,
      },
      {
        source: '/find-work',
        destination: '/jobs',
        permanent: false,
      },
      // Routes people type or that other pages implied but which never existed.
      // /signup and /how-it-works were both hard 404s from the live site.
      {
        source: '/signup',
        destination: '/auth/register',
        permanent: false,
      },
      {
        source: '/join',
        destination: '/auth/register',
        permanent: false,
      },
      {
        source: '/sign-up',
        destination: '/auth/register',
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
