import type { CapacitorConfig } from '@capacitor/cli';

// TryHardly mobile shell.
//
// Strategy: the native iOS/Android apps are thin shells that load the live
// production web app (https://www.tryhardly.com) via `server.url`. The app is
// a dynamic Next.js 14 app (API rewrites, auth, sockets, Stripe) that cannot
// be statically exported, so a remote-URL shell is the safe path that reuses
// the deployed site verbatim without touching the web build or backend.
//
// `webDir` points at a small bundled fallback page (mobile/www) used only when
// `cap sync` copies web assets and as an offline placeholder. See MOBILE_APP.md.
const config: CapacitorConfig = {
  appId: 'com.tryhardly.app',
  appName: 'TryHardly',
  webDir: 'mobile/www',
  server: {
    url: 'https://www.tryhardly.com',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#09090b',
  },
};

export default config;
