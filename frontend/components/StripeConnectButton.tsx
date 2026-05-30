'use client';

import { useState } from 'react';
import { api } from '../lib/api';

interface StripeConnectButtonProps {
  stripeAccountId?: string | null;
  onboarded?: boolean;
}

export default function StripeConnectButton({ stripeAccountId, onboarded }: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!stripeAccountId) {
        // Step 1: Create connected account
        await api.post('/payments/connect', {});
      }
      // Step 2: Get onboarding link. Redirect URLs are derived from FRONTEND_URL
      // on the backend, so no query params are needed here.
      const res = await api.get<{ url: string }>('/payments/connect/onboarding');
      window.location.href = res.url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to start Stripe onboarding');
      setLoading(false);
    }
  };

  if (onboarded) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <span className="text-emerald-400 text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-emerald-400">Payout Account Connected</p>
          <p className="text-xs text-zinc-400">You can receive payments for completed quests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-amber-400">Payout Account Required</p>
        <p className="text-xs text-zinc-400 mt-1">
          Connect your bank account to receive payments when quests are completed.
        </p>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
      >
        {loading ? 'Connecting...' : stripeAccountId ? 'Resume Stripe Onboarding' : 'Connect Payout Account'}
      </button>
    </div>
  );
}
