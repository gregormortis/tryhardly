'use client';

import { useState } from 'react';
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

interface ReportButtonProps {
  targetType: TargetType;
  targetId: string;
  label?: string;
  className?: string;
}

export default function ReportButton({ targetType, targetId, label = 'Report', className }: ReportButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('SPAM');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reporting requires an account so admins can follow up.
  if (!user) return null;

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
        className={className || 'text-xs text-gray-500 hover:text-red-400 transition-colors'}
      >
        ⚑ {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-1">Report this {targetType.toLowerCase()}</h3>
            <p className="text-sm text-gray-500 mb-4">Tell us what&apos;s wrong. Reports are confidential.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-500"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Details (optional)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add any context that helps us understand the issue…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500/90 hover:bg-red-400 text-white disabled:opacity-50"
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
