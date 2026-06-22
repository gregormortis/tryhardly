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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Logged-in entry point for requesting account/data deletion. Shown on the
// public /account-deletion page and linked from the profile page. Requests are
// queued for review in the admin deletion queue (the source of truth); we don't
// promise email delivery. Visitors who aren't signed in get a prompt to log in.
export default function AccountDeletionRequest() {
  const { user, loading: authLoading } = useAuth();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

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
      const res = await api.post<{ id: string; status: string; createdAt?: string }>(
        '/account/deletion-request',
        { reason: reason.trim() || undefined },
      );
      setPending({ id: res.id, status: res.status, createdAt: res.createdAt ?? new Date().toISOString() });
      setConfirming(false);
      toast.success('Request received — it’s queued for review.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      await api.delete('/account/deletion-request');
      setPending(null);
      toast.success('Deletion request withdrawn.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to withdraw request');
    } finally {
      setWithdrawing(false);
    }
  };

  if (authLoading || loading) {
    return <div className="h-10 w-48 bg-gray-800 rounded animate-pulse" />;
  }

  if (!user) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-gray-300 mb-3">
          To request deletion of your account,{' '}
          <Link href="/auth/login" className="text-amber-400 hover:text-amber-300">log in</Link>{' '}
          and use the button on this page. Your request is logged for our team to review and action.
        </p>
        <p className="text-sm text-gray-500">
          Prefer not to sign in? Email{' '}
          <a href="mailto:support@tryhardly.com" className="text-amber-400 hover:text-amber-300">
            support@tryhardly.com
          </a>{' '}
          from the address on your account. The fastest, most reliable route is the in-app request above.
        </p>
      </div>
    );
  }

  if (pending) {
    const requested = pending.createdAt ? formatDate(pending.createdAt) : '';
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
        <h3 className="font-semibold text-amber-300 mb-1">Request received</h3>
        <p className="text-sm text-gray-300">
          Your deletion request is <span className="font-medium text-amber-200">queued for review</span> by our
          team{requested ? ` (requested ${requested})` : ''}. It’s recorded in our system — you don’t need to do
          anything else. We aim to process requests within 30 days, and you’ll be notified at your account email
          once it’s complete.
        </p>
        <p className="text-sm text-gray-400 mt-3">
          Changed your mind? You can withdraw this request while it’s still pending.
        </p>
        <button
          type="button"
          onClick={withdraw}
          disabled={withdrawing}
          className="mt-3 px-4 py-2 text-sm font-medium rounded-lg border border-gray-700 text-gray-300 hover:border-amber-500 hover:text-amber-300 disabled:opacity-50"
        >
          {withdrawing ? 'Withdrawing…' : 'Withdraw request'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      {!confirming ? (
        <>
          <p className="text-gray-300 mb-4">
            Requesting deletion removes your profile and personal data from TryHardly. Your request is logged for
            our team to review and action — records tied to completed quests or payments may be retained where the
            law requires.
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
