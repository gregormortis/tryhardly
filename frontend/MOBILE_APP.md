# TryHardly Mobile App (Capacitor)

The TryHardly iOS and Android apps are native shells built with
[Capacitor](https://capacitorjs.com/) that load the live production web app.
They reuse the deployed Next.js site verbatim — no backend, payment, or auth
logic is duplicated or changed.

- **App ID:** `com.tryhardly.app`
- **App name:** `TryHardly`
- **Capacitor:** 6.x
- **Native projects:** `frontend/ios`, `frontend/android`

---

## Strategy: remote server URL (not static export)

The web app is a dynamic Next.js 14 app that **cannot be statically exported**:

- `next.config.js` uses `rewrites` (API proxy) and `redirects` — unsupported by `output: 'export'`.
- Pages are server-rendered on demand (`/questboard/[id]`, `/guilds/[id]`, `/api/quests`, etc.).
- Runtime needs live API + auth, Socket.IO, and Stripe.

So the native apps point Capacitor's `server.url` at the production site:

```ts
// frontend/capacitor.config.ts
server: { url: 'https://www.tryhardly.com', androidScheme: 'https', iosScheme: 'https' }
```

`webDir: 'mobile/www'` holds a tiny bundled fallback page (a branded "connecting…"
screen that redirects to the live site). It is what `cap sync` copies into the
native projects and what shows briefly before the remote site loads.

### Tradeoffs

| | Remote URL (chosen) | Static export |
|---|---|---|
| Reuses live web app | ✅ exactly, instantly | ❌ would need a build pipeline |
| Works with API/auth/sockets/Stripe | ✅ | ❌ not without rearchitecting |
| Offline support | ❌ requires network (fallback page only) | ✅ partial |
| App Store review risk | ⚠️ Apple may flag "thin wrapper" apps (see below) | lower |
| Touches web build/backend | ❌ none | ✅ requires `output: export` + config changes |

The remote-URL approach is the only one verifiable here without altering the
web build or backend. To reduce App Store "minimal functionality" risk later,
add native capabilities (push notifications, share, camera, biometric login)
via Capacitor plugins before submitting.

---

## Local setup

Requires Node 20+. From `frontend/`:

```bash
npm install            # installs Capacitor + web deps
npm run mobile:sync    # copy config + web assets into ios/ and android/
npm run mobile:doctor  # validate Capacitor setup
```

The native projects are already committed; `mobile:sync` regenerates the
synced/ignored files (web assets, `capacitor.config.json`, Pods).

### npm scripts

| Script | Action |
|---|---|
| `npm run mobile:sync` | `cap sync` — copy web assets + update both platforms |
| `npm run mobile:copy` | `cap copy` — copy web assets only |
| `npm run mobile:ios` | `cap sync ios` |
| `npm run mobile:android` | `cap sync android` |
| `npm run mobile:open:ios` | open the Xcode project |
| `npm run mobile:open:android` | open the Android Studio project |
| `npm run mobile:doctor` | `cap doctor` — environment check |

---

## iOS (Xcode)

Requires macOS + Xcode + CocoaPods (`sudo gem install cocoapods`).

```bash
cd frontend
npm run mobile:sync          # runs pod install on macOS
npm run mobile:open:ios
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities**.
2. Set your **Team** and a unique **Bundle Identifier** (`com.tryhardly.app`).
3. Pick a simulator or a connected device and press **Run**.

> CocoaPods/Xcode are not available in CI/sandbox, so `pod install` is skipped
> there. Run the steps above on a Mac to produce a working build.

## Android (Android Studio)

Requires Android Studio + JDK 17 + Android SDK.

```bash
cd frontend
npm run mobile:sync
npm run mobile:open:android
```

In Android Studio:
1. Let Gradle sync finish.
2. **Run ▶** on an emulator or device for a debug build.
3. For a signed release: **Build → Generate Signed Bundle / APK**, create or
   select a keystore, choose **release**, and build an `.aab`.

---

## App icons & splash

The bundled fallback reuses the existing PWA icon (`public/icons/icon-512.png`).
Capacitor generated default launcher icons in the native projects. To regenerate
launcher icons/splash from the PWA assets, use
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets):

```bash
npx @capacitor/assets generate --iconBackgroundColor '#09090b' --splashBackgroundColor '#09090b'
```

(Provide a `1024x1024` `assets/icon.png` and `2732x2732` `assets/splash.png` first.)

---

## Store submission — remaining work (not done here)

This branch sets up the app shells only. To actually ship:

### Apple App Store
- Apple Developer Program membership ($99/yr).
- Register the App ID `com.tryhardly.app` and create an App Store Connect record.
- Provisioning profiles + distribution certificate (managed signing in Xcode).
- App privacy details, screenshots, age rating, description.
- **Mitigate Guideline 4.2 "Minimum Functionality":** add native features so the
  app is more than a website wrapper (push, camera, biometrics, share, etc.).
- Archive in Xcode → upload to App Store Connect → TestFlight → submit for review.

### Google Play Store
- Google Play Developer account ($25 one-time).
- Create the app in Play Console; set `applicationId = com.tryhardly.app`.
- Generate an upload keystore and enable Play App Signing.
- Build a signed `.aab`, complete the data-safety form, content rating,
  store listing, and screenshots.
- Upload to internal/closed testing, then promote to production.

### Both
- Decide whether the remote-URL approach is acceptable for review, or move to a
  hybrid (bundle a static shell + native plugins) if reviewers push back.
- Add deep-link / universal-link handling if you want `tryhardly.com` URLs to
  open the app.
