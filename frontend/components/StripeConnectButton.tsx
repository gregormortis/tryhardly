'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface StripeConnectButtonProps {
  stripeAccountId?: string | null;
}

interface ConnectStatus {
  hasAccount: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: boolean;
  onboarded: boolean;
}

export default function StripeConnectButton({ stripeAccountId }: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch live payout-account status from Stripe. The DB only stores the account
  // id, so the enabled/requirements flags can only be known by asking the
  // backend (which asks Stripe). This is what lets us show "connected" instead
  // of always prompting to resume onboarding once an account id exists.
  useEffect(() => {
    let cancelled = false;
    api
      .get<ConnectStatus>('/payments/connect/status')
      .then(s => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        // Non-fatal: fall back to the id-only heuristic below.
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!stripeAccountId && !status?.hasAccount) {
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

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
        <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Checking payout account...</p>
      </div>
    );
  }

  // Setup complete: charges + payouts enabled, details submitted, nothing due.
  if (status?.onboarded) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <span className="text-emerald-400 text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-emerald-400">Payout account connected</p>
          <p className="text-xs text-zinc-400">You can receive payments for completed quests</p>
        </div>
      </div>
    );
  }

  // Has an account but Stripe still needs more info → resume onboarding.
  const hasAccount = status?.hasAccount || !!stripeAccountId;
  const needsMoreInfo = hasAccount && (status?.requirementsDue || !status?.onboarded);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-amber-400">
          {needsMoreInfo ? 'Finish your payout account setup' : 'Payout account required'}
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          {needsMoreInfo
            ? 'Stripe still needs a few more details before you can receive payouts.'
            : 'Connect your bank account to receive payments when quests are completed.'}
        </p>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
      >
        {loading
          ? 'Connecting...'
          : hasAccount
            ? 'Resume Stripe onboarding'
            : 'Connect Payout Account'}
      </button>
    </div>
  );
}
