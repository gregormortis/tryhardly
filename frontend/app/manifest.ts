import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest by Next.js.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TryHardly — Local help in Redding, hired directly',
    short_name: 'TryHardly',
    description:
      'Post local jobs or find paid work in Redding. You and your worker settle directly. TryHardly takes no cut.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Warm charcoal --canvas from the .dark block in tokens.css. Was zinc-950,
    // which no longer matches any surface in the app.
    background_color: '#191714',
    theme_color: '#191714',
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
