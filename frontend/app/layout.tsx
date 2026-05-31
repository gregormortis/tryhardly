import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { DM_Mono, Syne } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../lib/auth';

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-syne',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';
const title = 'TryHardly — Local gigs, real people, real pay';
const description =
  'Post local jobs or find paid work near you. Marketplace payments, verified local workers, no middlemen.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'TryHardly',
  title: {
    default: title,
    template: '%s · TryHardly',
  },
  description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TryHardly',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'TryHardly',
    title,
    description,
    url: siteUrl,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${dmMono.variable} ${syne.variable}`}>
      <head>
        {/* Plausible Analytics */}
        <script defer data-domain="tryhardly.com" src="https://plausible.io/js/script.js" />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-68P7FQSY7L"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-68P7FQSY7L');
          `}
        </Script>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
