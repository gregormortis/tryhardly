'use client';

import Link from 'next/link';
import StripeConnectButton, { type ConnectStatus } from './StripeConnectButton';
import { AUTHORIZE_CAPTURE_PAYOUT_WORKER } from '@/lib/paymentCopy';

interface PaymentsPayoutsPanelProps {
  stripeAccountId?: string | null;
  onStatusChange?: (status: ConnectStatus | null) => void;
}

// The money module for the logged-in dashboard and anywhere else the same
// question comes up: is my payout account ready, and when do I actually get
// paid? The Stripe status widget on its own answered the first question and left
// the second to guesswork, which is where payout anxiety comes from.
export default function PaymentsPayoutsPanel({
  stripeAccountId,
  onStatusChange,
}: PaymentsPayoutsPanelProps) {
  return (
    <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-zinc-100">Payments &amp; payouts</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Your Stripe payout account and how money moves on a job.
          </p>
        </div>
        <Link
          href="/profile"
          className="shrink-0 text-xs text-amber-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 rounded"
        >
          Payout settings
        </Link>
      </div>

      <StripeConnectButton stripeAccountId={stripeAccountId} onStatusChange={onStatusChange} />

      <p className="text-xs text-zinc-500 mt-3 leading-relaxed">{AUTHORIZE_CAPTURE_PAYOUT_WORKER}</p>
    </section>
  );
}
