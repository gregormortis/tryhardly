const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Cloudinary direct unsigned upload is only enabled when both the cloud name and
 * an unsigned upload preset are present as public env vars. When either is
 * missing, callers should fall back to the existing photo-URL input — no upload
 * UI, no broken button, no backend secrets required.
 */
export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
];

/** Returns a client-side validation error message, or null when the file is OK. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Only image files are allowed.';
  }
  if (ALLOWED_IMAGE_TYPES.length && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Unsupported image format. Use JPG, PNG, WebP, GIF, or HEIC.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
    return `Image is too large. Max ${mb}MB.`;
  }
  return null;
}

export interface UploadOptions {
  /** Called with 0–100 as the upload progresses. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Uploads a single image to Cloudinary using an unsigned preset and resolves to
 * the returned secure (https) URL. Uses XHR so we can surface real upload
 * progress. Never sends any secret — the unsigned preset is what authorizes the
 * upload, and the cloud name/preset are public by design.
 */
export function uploadImageToCloudinary(file: File, opts: UploadOptions = {}): Promise<string> {
  if (!isCloudinaryConfigured) {
    return Promise.reject(new Error('Image uploads are not configured.'));
  }

  const validationError = validateImageFile(file);
  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset as string);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.secure_url) {
            resolve(res.secure_url as string);
          } else {
            reject(new Error('Upload succeeded but no URL was returned.'));
          }
        } catch {
          reject(new Error('Could not read the upload response.'));
        }
      } else {
        let message = `Upload failed (${xhr.status}).`;
        try {
          const res = JSON.parse(xhr.responseText);
          if (res?.error?.message) message = res.error.message;
        } catch {
          /* keep default message */
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(formData);
  });
}
