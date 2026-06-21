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
3. For a signed release you can either use **Build → Generate Signed Bundle / APK**
   (Android Studio manages the keystore for you), or configure the command-line
   signing described below and run `./gradlew bundleRelease`.

---

## Release signing & building a signed AAB

The release build reads its upload-keystore credentials from **non-committed**
sources — nothing secret lives in the repo. `app/build.gradle` looks for
credentials in this order:

1. `frontend/android/keystore.properties` (gitignored)
2. `TRYHARDLY_UPLOAD_*` environment variables (override / fill in the above)

If neither is present, **debug builds are unaffected** and any release task
(`bundleRelease` / `assembleRelease`) **fails fast** with a message telling you
exactly what to set. (A release built without signing is left unsigned and is
only useful for local inspection.)

### 1. Generate an upload keystore (one time)

Use the JDK's `keytool`. Run from `frontend/android/` so the file lands next to
the Gradle project (it is gitignored). Pick strong passwords and **store them in
a password manager — if you lose them you lose the ability to update the app**
(unless you have Play App Signing key reset available).

```bash
cd frontend/android
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` will prompt for a keystore password, your name/org details, and a key
password. Keep `-alias upload` consistent with the config below.

### 2a. Provide credentials via `keystore.properties` (recommended for local dev)

```bash
cd frontend/android
cp keystore.properties.example keystore.properties
# then edit keystore.properties with your real values:
#   storeFile=upload-keystore.jks      # relative to frontend/android/
#   storePassword=...
#   keyAlias=upload
#   keyPassword=...
```

`keystore.properties` and `*.jks`/`*.keystore` are gitignored — never commit them.

### 2b. …or provide credentials via environment variables (recommended for CI)

```bash
export TRYHARDLY_UPLOAD_STORE_FILE="$PWD/upload-keystore.jks"   # absolute path is safest in CI
export TRYHARDLY_UPLOAD_STORE_PASSWORD="…"
export TRYHARDLY_UPLOAD_KEY_ALIAS="upload"
export TRYHARDLY_UPLOAD_KEY_PASSWORD="…"
```

Env vars take precedence over `keystore.properties`. `storeFile` may be relative
(resolved from `frontend/android/`) or absolute.

### 3. Sync web assets and build the signed bundle

```bash
cd frontend
npm install            # first time only
npm run mobile:sync    # copies web assets + capacitor config into android/
cd android
./gradlew bundleRelease
```

### 4. Locate the `.aab`

```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```

Verify it is signed with your upload key:

```bash
# Option A: jarsigner (bundled with the JDK)
jarsigner -verify -verbose -certs \
  app/build/outputs/bundle/release/app-release.aab

# Option B: Android build-tools apksigner (works on AAB too)
# apksigner verify --print-certs app/build/outputs/bundle/release/app-release.aab
```

Upload `app-release.aab` to **Play Console → your app → Testing → Internal
testing → Create release**. Enable **Play App Signing** when prompted (Google
holds the app-signing key; your keystore is only the *upload* key).

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
