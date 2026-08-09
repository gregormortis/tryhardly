'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface IdentityStatus {
  status: 'NONE' | 'PENDING' | 'VERIFIED' | 'FAILED';
  hasSession: boolean;
}

function IdentityComplete() {
  const [identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    api
      .get<IdentityStatus>('/payments/identity/status')
      .then(setIdentity)
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e?.message || 'Could not check your identity verification status');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/payments/identity/verify', {});
      window.location.href = res.url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to restart identity verification');
      setRetrying(false);
    }
  };

  const status = identity?.status;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <div className="w-full max-w-md text-center">
        <div className="bg-surface border border-line rounded-xl p-8 space-y-5">
          {loading ? (
            <>
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted text-sm">Checking your verification status...</p>
            </>
          ) : status === 'VERIFIED' ? (
            <>
              <div className="text-5xl">&#9989;</div>
              <h1 className="text-2xl font-bold text-success">Identity verified</h1>
              <p className="text-body text-sm leading-relaxed">
                You&apos;re all set. You can now be paid for completed quests.
              </p>
            </>
          ) : status === 'FAILED' ? (
            <>
              <div className="text-5xl">&#9888;</div>
              <h1 className="text-2xl font-bold text-accent-text">Verification did not go through</h1>
              <p className="text-body text-sm leading-relaxed">
                Stripe was unable to verify your identity from what was submitted. This can happen
                with a blurry photo or a lighting issue &mdash; you can try again.
              </p>
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full rounded-lg bg-success hover:bg-success disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-strong transition-colors"
              >
                {retrying ? 'Opening Stripe Identity...' : 'Try again'}
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl">&#8987;</div>
              <h1 className="text-2xl font-bold text-accent-text">Verification in progress</h1>
              <p className="text-body text-sm leading-relaxed">
                Stripe is reviewing what you submitted. This usually finishes within a few minutes
                &mdash; check back shortly.
              </p>
            </>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/profile"
              className="inline-block bg-accent hover:bg-accent text-on-accent font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Back to profile
            </Link>
            <Link
              href="/dashboard"
              className="inline-block bg-raised hover:bg-raised-2 text-strong font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IdentityCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <IdentityComplete />
    </Suspense>
  );
}
