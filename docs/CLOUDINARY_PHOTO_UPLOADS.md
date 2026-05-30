# Photo Uploads (Cloudinary)

This guide covers enabling real job-photo uploads for TryHardly using
**Cloudinary direct unsigned uploads** from the browser. It requires **no
backend secrets**, no schema changes, and no changes to payment/escrow logic.

When the two public env vars below are **absent**, the app continues to work
exactly as before: the photo-URL text inputs remain, and no upload button is
shown. Uploads are purely additive — they write their resulting `https://…`
URL into the same fields/tags the URL inputs already use, so quest detail,
manage-request, and admin galleries keep rendering unchanged.

---

## How it works

- Frontend helper: [`frontend/lib/cloudinary.ts`](../frontend/lib/cloudinary.ts)
  — env detection, client-side validation, and the unsigned upload (with
  progress) via Cloudinary's public upload API.
- Reusable component: [`frontend/components/ImageUploader.tsx`](../frontend/components/ImageUploader.tsx)
  — file picker, validation, progress bar, error states. Renders **nothing**
  when Cloudinary is not configured.
- Wired into:
  - `/request-help` ([`RequestHelpForm.tsx`](../frontend/app/request-help/RequestHelpForm.tsx))
    — appends each uploaded URL to the comma-separated `photoUrls` field.
  - Post-quest form ([`PostQuestForm.tsx`](../frontend/components/PostQuestForm.tsx))
    — sets the single `photoUrl`, which is encoded as a `photo:<url>` tag.

No secret is ever sent from the browser. The **unsigned upload preset** is what
authorizes the upload; the cloud name and preset name are public by design.

---

## 1. Create a Cloudinary account

1. Sign up at <https://cloudinary.com> (the free tier is sufficient to start).
2. After signing in, open the **Dashboard**. Note your **Cloud name** (e.g.
   `tryhardly`). This is the value for `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.

## 2. Create an unsigned upload preset

1. Go to **Settings → Upload → Upload presets**.
2. Click **Add upload preset**.
3. Set **Signing Mode** to **Unsigned**.
4. Give it a name (e.g. `tryhardly_jobs`). This is the value for
   `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
5. Recommended constraints (see Security below):
   - **Folder**: set a dedicated folder such as `tryhardly/jobs` so uploads are
     isolated.
   - **Allowed formats**: restrict to `jpg, png, webp, gif, heic`.
   - **Max file size**: set a server-side cap (e.g. 10 MB) to match the
     client-side limit.
6. Save the preset.

## 3. Set Vercel environment variables

In your Vercel project → **Settings → Environment Variables**, add for the
**Production** (and Preview, if desired) environments:

| Variable                                | Example value     |
| --------------------------------------- | ----------------- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`     | `tryhardly`       |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`  | `tryhardly_jobs`  |

> Both are `NEXT_PUBLIC_*` because they are read in the browser. They are not
> secrets. Do **not** add your Cloudinary API key/secret — they are not used
> and must not be exposed client-side.

## 4. Redeploy

Trigger a redeploy in Vercel (or push to the deployed branch) so the new env
vars are baked into the client bundle. After deploy, the **Upload** controls
appear automatically on `/request-help` and the post-quest form.

---

## Security & hardening (recommended)

- **Unsigned, but constrained**: an unsigned preset means anyone with the cloud
  name + preset can upload. Mitigate by:
  - Restricting **allowed formats** to images only (done in the preset).
  - Setting a **max file size** on the preset (server-enforced) in addition to
    the client-side 8 MB check in `lib/cloudinary.ts`.
  - Uploading into a **dedicated folder** so job photos are easy to scope,
    moderate, or purge.
- **Moderation (later)**: Cloudinary offers add-ons (e.g. AWS Rekognition / WebPurify)
  for automatic moderation of incoming images. Enable on the preset when ready.
- **Rotation**: if a preset is abused, delete it and create a new one, then
  update the Vercel env var and redeploy.
- **Client-side validation** is convenience/UX only — always keep the
  server-side preset constraints as the real enforcement.

---

## Verifying locally

```bash
# in frontend/
export NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud
export NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
npm run dev
```

- Visit `/request-help` and the post-quest form — an **Upload** button appears.
- Pick an image; watch the progress bar; on success the resulting `https://…`
  URL is added to the photo field.
- Unset the env vars and reload — the upload button disappears and the URL
  inputs still work (the production fallback).
