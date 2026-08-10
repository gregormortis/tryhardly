'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ConnectStatus {
  hasAccount: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: boolean;
  onboarded: boolean;
}

interface IdentityStatus {
  status: 'NONE' | 'PENDING' | 'VERIFIED' | 'FAILED';
  hasSession: boolean;
}

function OnboardingComplete() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [startingIdentity, setStartingIdentity] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<ConnectStatus>('/payments/connect/status'),
      api.get<IdentityStatus>('/payments/identity/status'),
    ])
      .then(([connectStatus, identityStatus]) => {
        setStatus(connectStatus);
        setIdentity(identityStatus);
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e?.message || 'Could not check your payout account status');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResume = async () => {
    setResuming(true);
    setError(null);
    try {
      const res = await api.get<{ url: string }>('/payments/connect/onboarding');
      window.location.href = res.url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to resume Stripe onboarding');
      setResuming(false);
    }
  };

  const handleStartIdentity = async () => {
    setStartingIdentity(true);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/payments/identity/verify', {});
      window.location.href = res.url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to start identity verification');
      setStartingIdentity(false);
    }
  };

  const complete = status?.onboarded === true;
  const identityVerified = identity?.status === 'VERIFIED';
  const identityFailed = identity?.status === 'FAILED';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <div className="w-full max-w-md text-center">
        <div className="bg-surface border border-line rounded-xl p-8 space-y-5">
          {loading ? (
            <>
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted text-sm">Checking your payout account...</p>
            </>
          ) : complete ? (
            identityVerified ? (
              <>
                <div className="text-5xl">&#9989;</div>
                <h1 className="text-2xl font-bold text-success">You&apos;re all set to get paid</h1>
                <div className="text-body space-y-3 text-sm leading-relaxed">
                  <p>
                    Your Stripe Connect setup and identity verification are both complete. You can now
                    receive payouts for completed quests, with TryHardly&apos;s flat 12% platform
                    service fee applied at capture.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl">&#128274;</div>
                <h1 className="text-2xl font-bold text-accent-text">One more step: verify your identity</h1>
                <div className="text-body space-y-3 text-sm leading-relaxed">
                  <p>
                    Your payout account is connected, but TryHardly now requires a quick identity
                    check (government ID + selfie, handled entirely by Stripe) before your first
                    payout. This protects every worker and job poster on the platform from fraud.
                  </p>
                  {identityFailed && (
                    <p className="text-danger">
                      Your last verification attempt did not go through. Please try again.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleStartIdentity}
                  disabled={startingIdentity}
                  className="w-full rounded-lg bg-success hover:bg-success disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-strong transition-colors"
                >
                  {startingIdentity ? 'Opening Stripe Identity...' : 'Verify my identity'}
                </button>
              </>
            )
          ) : (
            <>
              <div className="text-5xl">&#128221;</div>
              <h1 className="text-2xl font-bold text-accent-text">A few more details needed</h1>
              <div className="text-body space-y-3 text-sm leading-relaxed">
                <p>
                  Thanks for returning from Stripe. Your payout account still needs a little more
                  information before it can receive payouts. You can pick up right where you left off.
                </p>
              </div>
              <button
                onClick={handleResume}
                disabled={resuming}
                className="w-full rounded-lg bg-info hover:bg-info disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-strong transition-colors"
              >
                {resuming ? 'Opening Stripe...' : 'Continue Stripe onboarding'}
              </button>
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

export default function OnboardingCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <OnboardingComplete />
    </Suspense>
  );
}
