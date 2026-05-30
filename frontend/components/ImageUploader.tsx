'use client';

import { useRef, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import {
  isCloudinaryConfigured,
  uploadImageToCloudinary,
  validateImageFile,
  MAX_UPLOAD_BYTES,
} from '@/lib/cloudinary';

interface UploadingItem {
  id: string;
  name: string;
  progress: number;
}

export interface ImageUploaderProps {
  /** Called with the Cloudinary secure URL each time an upload finishes. */
  onUploaded: (url: string) => void;
  /** Allow selecting/uploading more than one file at a time. */
  multiple?: boolean;
  /** Optional label rendered above the drop button. */
  label?: string;
  className?: string;
  disabled?: boolean;
}

const maxMb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);

/**
 * Reusable image uploader for Cloudinary unsigned uploads. Renders nothing when
 * Cloudinary is not configured, so callers can keep their existing photo-URL
 * input as the fallback without a broken button appearing in production.
 */
export default function ImageUploader({
  onUploaded,
  multiple = false,
  label,
  className,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadingItem[]>([]);
  const [error, setError] = useState('');

  // Graceful fallback: without env vars, the upload UI simply doesn't render.
  if (!isCloudinaryConfigured) return null;

  const updateProgress = (id: string, progress: number) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));

  const removeItem = (id: string) => setUploads((prev) => prev.filter((u) => u.id !== id));

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError('');

    const files = Array.from(fileList);
    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((prev) => [...prev, { id, name: file.name, progress: 0 }]);

      try {
        const url = await uploadImageToCloudinary(file, {
          onProgress: (p) => updateProgress(id, p),
        });
        onUploaded(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        removeItem(id);
      }
    }

    // Allow re-selecting the same file.
    if (inputRef.current) inputRef.current.value = '';
  }

  const busy = uploads.length > 0;

  return (
    <div className={className}>
      {label && (
        <p className="text-xs text-gray-400 mb-1.5 font-medium">{label}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || busy}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        className="w-full inline-flex items-center justify-center gap-2 border border-dashed border-gray-600 hover:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 text-sm rounded-lg px-4 py-3 transition-colors"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <UploadCloud size={16} />
            {multiple ? 'Upload photos' : 'Upload a photo'}
          </>
        )}
      </button>

      <p className="text-[11px] text-gray-600 mt-1.5">
        JPG, PNG, WebP, GIF or HEIC · up to {maxMb}MB each.
      </p>

      {uploads.map((u) => (
        <div key={u.id} className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-150"
              style={{ width: `${u.progress}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-500 w-9 text-right">{u.progress}%</span>
          <X size={12} className="text-gray-600" />
        </div>
      ))}

      {error && (
        <p className="text-xs text-rose-400 mt-2">{error}</p>
      )}
    </div>
  );
}
