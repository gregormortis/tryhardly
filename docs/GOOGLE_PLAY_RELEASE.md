# Google Play Release & Readiness

How to build, sign, and submit the TryHardly Android app to Google Play, plus
draft answers for the Play Console questionnaires (Data Safety, account
deletion, content/UGC). This is an operational checklist — it does not commit
any secrets.

The Android app is a thin [Capacitor](https://capacitorjs.com/) shell that loads
the live production web app at `https://www.tryhardly.com`. See
[`frontend/MOBILE_APP.md`](../frontend/MOBILE_APP.md) for the architecture.

- **App ID / package:** `com.tryhardly.app`
- **App name:** `TryHardly`
- **Remote URL:** `https://www.tryhardly.com`
- **compileSdk / targetSdk:** 35 (`frontend/android/variables.gradle`)
- **minSdk:** 22

---

## 1. Prerequisites

- A Google Play Console developer account (one-time fee, owned by the business).
- JDK 17 and Android SDK (Android Studio recommended).
- Node + the project deps installed in `frontend/` (`npm install`).

---

## 2. Sync the web shell into the native project

```bash
cd frontend
npm install
npx cap sync android
```

`cap sync` copies the Capacitor config and the bundled fallback page
(`mobile/www`) into the Android project and updates native plugins.

---

## 3. Generate an upload keystore (one time — keep it private)

Google Play uses **Play App Signing**: you upload an AAB signed with your
**upload key**, and Google manages the final app-signing key. Generate the
upload keystore once and store it somewhere safe (a password manager or secrets
vault). **Never commit the keystore or its passwords to git.**

```bash
keytool -genkey -v \
  -keystore tryhardly-upload.keystore \
  -alias tryhardly-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for a keystore password, a key password, and a distinguished
name. Record these in your secrets manager. If you lose the upload key you can
reset it via the Play Console, but treat it as non-recoverable.

`*.keystore`, `*.jks`, and `keystore.properties` are already covered by
`.gitignore` — verify before committing if you place them in the repo tree.

---

## 4. Wire signing into Gradle without committing secrets

Create `frontend/android/keystore.properties` (git-ignored) locally / in CI:

```properties
storeFile=/absolute/path/to/tryhardly-upload.keystore
storePassword=__from_secrets_manager__
keyAlias=tryhardly-upload
keyPassword=__from_secrets_manager__
```

Then reference it in `frontend/android/app/build.gradle` (add a `signingConfigs`
block that reads the properties file if present, and point the `release`
buildType at it). Keep the file out of version control — the values live only on
the build machine / in CI secrets. Alternatively, sign the release in **Android
Studio** via *Build → Generate Signed Bundle / APK*, which prompts for the
keystore interactively and never writes secrets into the repo.

---

## 5. Build the release AAB

Android App Bundle (`.aab`) is required for Play.

```bash
cd frontend/android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

Quick sanity / build checks (no signing needed):

```bash
./gradlew :app:lint        # Android lint
./gradlew assembleDebug    # compile a debug APK
```

Bump `versionCode` (integer, must increase every upload) and `versionName`
(user-facing string) in `frontend/android/app/build.gradle` for each release.

---

## 6. Play Console submission checklist

- [ ] Create the app in Play Console (`com.tryhardly.app`).
- [ ] Enroll in **Play App Signing** (recommended; default for new apps).
- [ ] Upload the signed AAB to **Internal testing** first.
- [ ] **Store listing:** title, short + full description, screenshots (phone +
      7" / 10" tablet), feature graphic, app icon (512×512). Use the brand "TH"
      mark — same art as `frontend/public/icons/icon-512.png`.
- [ ] **Privacy Policy URL:** `https://www.tryhardly.com/privacy`
- [ ] **Account deletion URL:** `https://www.tryhardly.com/account-deletion`
- [ ] Complete the **Data Safety** form (draft answers below).
- [ ] Complete **Content rating** questionnaire.
- [ ] Declare **Target audience** = adults (18+); the app is not for children.
- [ ] **Ads:** declare "No ads" (the app shows no ads today).
- [ ] **Financial features / payments:** payments are processed by Stripe
      (third-party); the app does not use Google Play Billing because it sells
      real-world local services, not digital goods.
- [ ] Roll out Internal → Closed → Production.

---

## 7. Data Safety — draft answers

These reflect the current app. Confirm against the live build before final
submission; update if data practices change.

**Data collected & shared**

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Email address | Yes | No (processors only) | Account, auth, transactional email | Required |
| Phone number | Yes (when provided) | No (processors only) | Contact, notifications, lead matching | Optional |
| Name / username | Yes | Yes (shown to other users on profiles/quests) | Account, profile, marketplace | Required |
| Approximate location (user-entered) | Yes | Yes (city/service area shown publicly) | Matching local jobs & workers | Optional |
| App activity / messages & other UGC | Yes | Yes (to the other party in a quest) | Core marketplace messaging | Required for messaging |
| Photos (profile / proof of work) | Yes (when uploaded) | Yes (shown publicly) | Profile, proof of work | Optional |
| Payment info | Handled by Stripe | Processed by Stripe | Paying for / getting paid for quests | Required to transact |

- **Payment processing:** card and payout data is collected and processed by
  **Stripe**, not stored on TryHardly servers. Disclose Stripe as a third-party
  processor.
- **Encryption in transit:** Yes — all traffic is HTTPS/TLS
  (`androidScheme: 'https'`, `cleartext: false`).
- **Data deletion:** Yes — users can request account & data deletion in-app
  (profile settings → Delete account & data), on the web at
  `/account-deletion`, or by emailing support. URL to declare:
  `https://www.tryhardly.com/account-deletion`.
- **Data is not sold** to third parties.

---

## 8. User-generated content (UGC) policy readiness

Play requires a UGC moderation story for apps with user content (profiles,
messages, quest posts). TryHardly provides:

- **In-app reporting:** a "Report" control on quest pages, on messages, and on
  user profiles (`frontend/components/ReportButton.tsx`). Reports POST to
  `/api/reports` and create a moderation record reviewed by admins
  (`/api/admin/reports`).
- **Public policy:** [`/community-guidelines`](https://www.tryhardly.com/community-guidelines)
  and [`/prohibited-services`](https://www.tryhardly.com/prohibited-services)
  explain acceptable use, how to report, and enforcement (content removal,
  account restriction, bans, and law-enforcement referral when safety is at
  risk).
- **Contact:** `support@tryhardly.com` for reports that can't be filed in-app.

---

## 9. What still requires the account owner (not code)

- A Google Play Console developer account.
- Generating and safely storing the **upload keystore + passwords** (never in
  git).
- Building and uploading the **signed AAB**.
- Store-listing assets: **screenshots**, feature graphic, descriptions.
- Final submission of the **Data Safety**, content-rating, and target-audience
  forms in the Console (drafts above are a starting point, not a substitute).
