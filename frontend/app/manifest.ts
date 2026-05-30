import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest by Next.js.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TryHardly — Local gigs, real people, real pay',
    short_name: 'TryHardly',
    description:
      'Post local jobs or find paid work near you. Escrow-protected, verified local workers, no middlemen.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#09090b',
    categories: ['business', 'productivity', 'shopping'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
