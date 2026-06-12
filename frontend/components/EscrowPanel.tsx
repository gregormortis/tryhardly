'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// Mirrors the backend GET /api/payments/quest/:id/payment-status response.
// This is the non-escrow marketplace flow: the customer's card is AUTHORIZED at
// booking and the final charge is CAPTURED for completed work. TryHardly never
// holds funds; worker payouts are routed through Stripe Connect on capture.
interface PaymentStatus {
  questId: string;
  paymentStatus: 'NONE' | 'AUTHORIZED' | 'CAPTURED' | 'CANCELED' | 'CAPTURE_FAILED';
  paymentAuthorizedAt: string | null;
  paymentCapturedAt: string | null;
  paymentCanceledAt: string | null;
  hasCheckoutSession: boolean;
  totalBudget: number; // cents
  platformFee: number; // cents
}

interface CheckoutResponse {
  sessionId: string;
  url: string;
  amount: number;
  applicationFeeAmount: number;
}

interface PaymentPanelProps {
  questId: string;
  isQuestGiver: boolean;
  questStatus: string;
}

const STATUS_STYLES: Record<string, string> = {
  CAPTURED: 'bg-emerald-500/20 text-emerald-400',
  AUTHORIZED: 'bg-blue-500/20 text-blue-400',
  CAPTURE_FAILED: 'bg-amber-500/20 text-amber-400',
  CANCELED: 'bg-red-500/20 text-red-400',
  NONE: 'bg-zinc-700 text-zinc-400',
};

// User-facing labels for the internal payment status values.
const STATUS_LABELS: Record<string, string> = {
  CAPTURED: 'CHARGE CAPTURED',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURE_FAILED: 'CAPTURE FAILED',
  CANCELED: 'CANCELED',
  NONE: 'NOT STARTED',
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Marketplace payment panel for the non-escrow manual-capture flow.
 *
 * Quest giver authorizes a payment method at booking via hosted Stripe Checkout
 * (POST /checkout). The final charge is captured automatically when the task is
 * confirmed complete (backend confirmCompletion → capture). Before capture, the
 * authorization can be voided via POST /cancel-authorization. This component
 * never calls the retired escrow routes (/escrow, /complete, /cancel).
 */
export default function PaymentPanel({ questId, isQuestGiver }: PaymentPanelProps) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentStatus = useCallback(async () => {
    try {
      const data = await api.get<PaymentStatus>(
        `/payments/quest/${questId}/payment-status`
      );
      setPayment(data);
    } catch {
      // No payment record yet — leave null and render the pre-authorization view.
      setPayment(null);
    }
  }, [questId]);

  useEffect(() => {
    fetchPaymentStatus();
  }, [fetchPaymentStatus]);

  // Start hosted Stripe Checkout to authorize the payment method (manual
  // capture). On success the browser is redirected to Stripe's hosted page.
  const handleAuthorize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<CheckoutResponse>(
        `/payments/quest/${questId}/checkout`,
        {}
      );
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setError('Could not start checkout. Please try again.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  // Void the pending authorization before capture. Nothing is "released" — no
  // funds were held; the customer is simply never charged.
  const handleCancelAuthorization = async () => {
    setActionLoading('cancel');
    setError(null);
    try {
      await api.post(`/payments/quest/${questId}/cancel-authorization`, {});
      await fetchPaymentStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to cancel authorization');
    } finally {
      setActionLoading(null);
    }
  };

  const status = payment?.paymentStatus ?? 'NONE';

  // ── No authorization yet ────────────────────────────────────────────────────
  if (!payment || status === 'NONE') {
    return (
      <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">Marketplace Payment</h3>
        {isQuestGiver ? (
          <div>
            <p className="text-sm text-zinc-400 mb-3">
              Authorize a payment method before work begins. Your payment method is authorized
              at booking — not charged. The final charge is captured for completed work, and the
              worker payout is processed after capture through Stripe Connect.
            </p>
            {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
            <button
              onClick={handleAuthorize}
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
            >
              {loading ? 'Starting checkout…' : 'Authorize payment method'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            Waiting for the quest giver to authorize a payment method. The payment method is
            authorized at booking; the final charge is captured for completed work, with the
            worker payout processed after capture through Stripe Connect. Canceled or uncompleted
            jobs are never charged.
          </p>
        )}
      </div>
    );
  }

  // ── Authorization exists ────────────────────────────────────────────────────
  // Cancellation (void) is only possible before capture.
  const canCancel = isQuestGiver && (status === 'AUTHORIZED' || status === 'CAPTURE_FAILED');

  return (
    <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-900 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Marketplace Payment</h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            STATUS_STYLES[status] ?? STATUS_STYLES.NONE
          }`}
        >
          {STATUS_LABELS[status] ?? STATUS_LABELS.NONE}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Total Budget</p>
          <p className="text-zinc-100 font-semibold">{dollars(payment.totalBudget)}</p>
        </div>
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Platform Fee</p>
          <p className="text-zinc-100 font-semibold">{dollars(payment.platformFee)}</p>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        {status === 'AUTHORIZED' &&
          'Payment method authorized at booking. The final charge is captured automatically when the task is confirmed complete.'}
        {status === 'CAPTURED' &&
          'Charge captured for completed work. The worker payout is processed through Stripe Connect.'}
        {status === 'CANCELED' && 'Authorization canceled. The customer was not charged.'}
        {status === 'CAPTURE_FAILED' &&
          'The charge could not be captured (the authorization may have expired). Re-authorize to try again.'}
      </p>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {canCancel && (
        <div className="flex gap-2">
          <button
            onClick={handleCancelAuthorization}
            disabled={actionLoading === 'cancel'}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white transition-colors"
          >
            {actionLoading === 'cancel' ? 'Canceling…' : 'Cancel Authorization'}
          </button>
        </div>
      )}
    </div>
  );
}
