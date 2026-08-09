'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type TargetType = 'QUEST' | 'USER' | 'MESSAGE';

const REASONS: { value: string; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'SCAM', label: 'Scam / fraud' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'OTHER', label: 'Something else' },
];

const TARGET_NOUN: Record<TargetType, string> = {
  QUEST: 'job',
  USER: 'profile',
  MESSAGE: 'message',
};

interface ReportButtonProps {
  targetType: TargetType;
  targetId: string;
  label?: string;
  className?: string;
}

export default function ReportButton({ targetType, targetId, label = 'Report', className }: ReportButtonProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('SPAM');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const noun = TARGET_NOUN[targetType];
  const linkClassName = className || 'text-xs text-subtle hover:text-danger transition-colors';

  if (loading) return null;

  // Submitting a report requires an account so the moderation team can follow
  // up with the reporter, so signed-out visitors get a sign-in link instead of
  // a dead-end button.
  if (!user) {
    return (
      <Link
        href={`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`}
        className={linkClassName}
      >
        ⚑ Sign in to report this {noun}
      </Link>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reports', { targetType, targetId, reason, details: details.trim() || undefined });
      toast.success('Report submitted. Our team will review it.');
      setOpen(false);
      setDetails('');
      setReason('SPAM');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={linkClassName}
      >
        ⚑ {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-strong/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface border border-line rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-strong mb-1">Report this {noun}</h3>
            <p className="text-sm text-subtle mb-4">Tell us what&apos;s wrong. Reports are confidential.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-raised border border-line-strong rounded-lg px-3 py-2 text-strong focus:outline-none focus:border-accent"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Details (optional)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add any context that helps us understand the issue…"
                  className="w-full bg-raised border border-line-strong rounded-lg px-3 py-2 text-strong text-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-body border border-line-strong rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-danger/90 hover:bg-danger text-strong disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
