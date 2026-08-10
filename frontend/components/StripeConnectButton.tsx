'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface StripeConnectButtonProps {
  stripeAccountId?: string | null;
  // Lifts the fetched payout status to a parent that needs the same answer (the
  // dashboard asks whether payout setup is still outstanding), so the status
  // endpoint is still only hit once per mount.
  onStatusChange?: (status: ConnectStatus | null) => void;
}

export interface ConnectStatus {
  hasAccount: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: boolean;
  onboarded: boolean;
}

export default function StripeConnectButton({
  stripeAccountId,
  onStatusChange,
}: StripeConnectButtonProps) {
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
        if (cancelled) return;
        setStatus(s);
        onStatusChange?.(s);
      })
      .catch(() => {
        // Non-fatal: fall back to the id-only heuristic below.
        if (!cancelled) onStatusChange?.(null);
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onStatusChange]);

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
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
        <div className="w-4 h-4 border-2 border-line-strong border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted">Checking payout account...</p>
      </div>
    );
  }

  // Setup complete: charges + payouts enabled, details submitted, nothing due.
  if (status?.onboarded) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
        <span className="text-success text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-success">Payout account connected</p>
          <p className="text-xs text-muted">
            You can be paid for the local jobs you complete
          </p>
        </div>
      </div>
    );
  }

  // Has an account but Stripe still needs more info → resume onboarding.
  const hasAccount = status?.hasAccount || !!stripeAccountId;
  const needsMoreInfo = hasAccount && (status?.requirementsDue || !status?.onboarded);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
        <p className="text-sm font-semibold text-accent-text">
          {needsMoreInfo ? 'Finish your payout account setup' : 'Payout account required'}
        </p>
        <p className="text-xs text-muted mt-1">
          {needsMoreInfo
            ? 'Stripe still needs a few more details before you can receive payouts.'
            : 'Connect your bank account so you can be paid for completed jobs.'}
        </p>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full rounded-lg bg-info hover:bg-info disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-strong transition-colors"
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
