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

function OnboardingComplete() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    api
      .get<ConnectStatus>('/payments/connect/status')
      .then(setStatus)
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

  const complete = status?.onboarded === true;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">
          {loading ? (
            <>
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 text-sm">Checking your payout account...</p>
            </>
          ) : complete ? (
            <>
              <div className="text-5xl">✅</div>
              <h1 className="text-2xl font-bold text-emerald-400">Payout account connected</h1>
              <div className="text-gray-300 space-y-3 text-sm leading-relaxed">
                <p>
                  Your Stripe Connect setup is complete. You can now receive payouts for completed
                  quests, with TryHardly&rsquo;s flat 12% platform service fee applied at capture.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl">📝</div>
              <h1 className="text-2xl font-bold text-amber-400">A few more details needed</h1>
              <div className="text-gray-300 space-y-3 text-sm leading-relaxed">
                <p>
                  Thanks for returning from Stripe. Your payout account still needs a little more
                  information before it can receive payouts. You can pick up right where you left off.
                </p>
              </div>
              <button
                onClick={handleResume}
                disabled={resuming}
                className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
              >
                {resuming ? 'Opening Stripe...' : 'Continue Stripe onboarding'}
              </button>
            </>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/profile"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Back to profile
            </Link>
            <Link
              href="/dashboard"
              className="inline-block bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold py-2.5 px-5 rounded-lg transition-colors"
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
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <OnboardingComplete />
    </Suspense>
  );
}
