'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function OnboardingRefresh() {
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">
          <div className="text-5xl">🔄</div>
          <h1 className="text-2xl font-bold text-amber-400">Resume payout setup</h1>
          <div className="text-gray-300 space-y-3 text-sm leading-relaxed">
            <p>
              Your Stripe onboarding link expired or was interrupted before setup finished. No
              changes were lost&mdash;you can pick up right where you left off.
            </p>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            onClick={handleResume}
            disabled={resuming}
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
          >
            {resuming ? 'Opening Stripe...' : 'Resume Stripe onboarding'}
          </button>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/profile"
              className="inline-block bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Back to profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingRefreshPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <OnboardingRefresh />
    </Suspense>
  );
}
