'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface PendingRequest {
  id: string;
  status: string;
  createdAt: string;
}

// Logged-in entry point for requesting account/data deletion. Shown on the
// public /account-deletion page and linked from the profile page. Visitors who
// aren't signed in get a prompt to log in (or email support) instead.
export default function AccountDeletionRequest() {
  const { user, loading: authLoading } = useAuth();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get<PendingRequest | null>('/account/deletion-request')
      .then((r) => setPending(r))
      .catch(() => setPending(null))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<{ id: string; status: string }>('/account/deletion-request', {
        reason: reason.trim() || undefined,
      });
      setPending({ id: res.id, status: res.status, createdAt: new Date().toISOString() });
      setConfirming(false);
      toast.success("Deletion request submitted. We'll follow up by email.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="h-10 w-48 bg-gray-800 rounded animate-pulse" />;
  }

  if (!user) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-gray-300 mb-3">
          To request deletion from your account, please{' '}
          <Link href="/auth/login" className="text-amber-400 hover:text-amber-300">log in</Link>.
        </p>
        <p className="text-sm text-gray-500">
          You can also email{' '}
          <a href="mailto:support@tryhardly.com" className="text-amber-400 hover:text-amber-300">
            support@tryhardly.com
          </a>{' '}
          from the address on your account and we&apos;ll process your request.
        </p>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
        <h3 className="font-semibold text-amber-300 mb-1">Deletion request received</h3>
        <p className="text-sm text-gray-300">
          We have a pending deletion request for your account. Our team will process it and follow
          up at your account email. If you change your mind, contact{' '}
          <a href="mailto:support@tryhardly.com" className="text-amber-400 hover:text-amber-300">
            support@tryhardly.com
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      {!confirming ? (
        <>
          <p className="text-gray-300 mb-4">
            Requesting deletion removes your profile and personal data from TryHardly. Records tied
            to completed quests or payments may be retained where the law requires.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-red-500/90 hover:bg-red-400 text-white"
          >
            Request account deletion
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-200 font-medium">Are you sure you want to request deletion?</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Anything you'd like us to know…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500/90 hover:bg-red-400 text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Confirm deletion request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
