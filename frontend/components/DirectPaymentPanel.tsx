'use client';

import { Banknote } from 'lucide-react';
import {
  DIRECT_PAYMENT_LIMIT,
  DIRECT_PAYMENT_POSTER,
  DIRECT_PAYMENT_WORKER,
} from '../lib/paymentCopy';

// Stands in for EscrowPanel wherever the marketplace payment CTA used to be,
// while TryHardly runs in direct-settlement mode.
//
// The design goal is that nobody is surprised later. Someone reaching this
// point has accepted a bid and is looking for the "pay now" button, so the
// panel has to answer three questions immediately and without hedging: what
// the agreed amount is, who pays whom, and what TryHardly will and will not do
// about it. The last one is the easiest to fudge and the most damaging to get
// wrong — a poster who believes the platform will back a payment, and finds out
// otherwise during a dispute, is a worse outcome than one who never believed it.
//
// Deliberately not a form. There is nothing to submit; the money moves outside
// the product. The one action that still matters is confirming the completed
// work, which lives in the completion panel and is unaffected.

interface DirectPaymentPanelProps {
  isQuestGiver: boolean;
  // Agreed amount in whole dollars — the accepted bid where one exists, or the
  // posted budget before a bid is accepted. Omitted when neither is known yet.
  agreedAmount?: number | null;
}

function money(n: number): string {
  return `$${n.toLocaleString()}`;
}

export default function DirectPaymentPanel({
  isQuestGiver,
  agreedAmount,
}: DirectPaymentPanelProps) {
  const hasAmount = typeof agreedAmount === 'number' && agreedAmount > 0;

  return (
    <div className="mt-6 rounded-lg border border-line-strong bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Banknote className="h-4 w-4 text-accent-text" aria-hidden="true" />
        <h3 className="text-base font-semibold text-strong">Paying for this job</h3>
      </div>

      {hasAmount && (
        <div className="mb-3 rounded bg-raised p-3">
          <p className="text-xs text-subtle">Agreed amount</p>
          <p className="text-2xl font-bold text-strong">{money(agreedAmount as number)}</p>
          <p className="mt-1 text-xs text-subtle">
            {isQuestGiver
              ? 'What you and the worker agreed. Settle this amount directly.'
              : 'What you and the customer agreed. You keep all of it.'}
          </p>
        </div>
      )}

      <p className="text-sm text-muted">
        {isQuestGiver ? DIRECT_PAYMENT_POSTER : DIRECT_PAYMENT_WORKER}
      </p>

      <p className="mt-3 border-t border-line pt-3 text-xs text-subtle">
        {DIRECT_PAYMENT_LIMIT}
      </p>
    </div>
  );
}
