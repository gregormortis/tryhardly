'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiRequestError } from '../lib/api';
import {
  AUTHORIZATION_NOT_A_CHARGE,
  AUTHORIZE_CAPTURE_PAYOUT,
  AUTHORIZE_CAPTURE_PAYOUT_WORKER,
  authorizeButtonLabel,
  formatUsdFromCents,
  type PaymentStatusValue,
} from '../lib/paymentCopy';

// Mirrors the backend GET /api/payments/quest/:id/payment-status response.
// This is the non-escrow marketplace flow: the customer's card is AUTHORIZED at
// booking and the final charge is CAPTURED for completed work. TryHardly never
// holds funds; worker payouts are routed through Stripe Connect on capture.
interface PaymentStatus {
  questId: string;
  paymentStatus: PaymentStatusValue;
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
  // Lets an enclosing card describe the same authorization state instead of
  // guessing from the quest status alone.
  onStatusChange?: (status: PaymentStatusValue) => void;
}

const STATUS_STYLES: Record<string, string> = {
  CAPTURED: 'bg-success/20 text-success',
  AUTHORIZED: 'bg-info/20 text-info',
  CAPTURE_FAILED: 'bg-accent/20 text-accent-text',
  CANCELED: 'bg-danger/20 text-danger',
  NONE: 'bg-raised-2 text-muted',
};

// User-facing labels for the internal payment status values.
const STATUS_LABELS: Record<string, string> = {
  CAPTURED: 'CHARGE CAPTURED',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURE_FAILED: 'CAPTURE FAILED',
  CANCELED: 'CANCELED',
  NONE: 'NOT STARTED',
};

/**
 * Marketplace payment panel for the non-escrow manual-capture flow.
 *
 * Quest giver authorizes a payment method at booking via hosted Stripe Checkout
 * (POST /checkout). The final charge is captured automatically when the task is
 * confirmed complete (backend confirmCompletion → capture). Before capture, the
 * authorization can be voided via POST /cancel-authorization. This component
 * never calls the retired escrow routes (/escrow, /complete, /cancel).
 */
export default function PaymentPanel({
  questId,
  isQuestGiver,
  onStatusChange,
}: PaymentPanelProps) {
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

  useEffect(() => {
    onStatusChange?.(payment?.paymentStatus ?? 'NONE');
  }, [payment?.paymentStatus, onStatusChange]);

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
      if (err instanceof ApiRequestError && err.workerPayoutNotReady) {
        setError(
          `${err.message} The worker connects their payout account from their dashboard under payout setup.`
        );
      } else {
        const e = err as { message?: string };
        setError(e?.message || 'Failed to start checkout');
      }
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
      <div className="mt-6 p-4 rounded-lg border border-line-strong bg-surface">
        <h3 className="text-base font-semibold text-strong mb-2">Marketplace Payment</h3>
        {isQuestGiver ? (
          <div>
            <p className="text-sm text-muted mb-3">{AUTHORIZE_CAPTURE_PAYOUT}</p>
            {error && <p className="text-xs text-danger mb-2">{error}</p>}
            <button
              onClick={handleAuthorize}
              disabled={loading}
              className="w-full rounded-lg bg-info hover:bg-info disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-strong transition-colors"
            >
              {loading ? 'Starting checkout…' : authorizeButtonLabel(payment?.totalBudget)}
            </button>
            <p className="mt-2 text-xs text-subtle">{AUTHORIZATION_NOT_A_CHARGE}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Waiting for the poster to authorize a payment method.{' '}
            {AUTHORIZE_CAPTURE_PAYOUT_WORKER}
          </p>
        )}
      </div>
    );
  }

  // ── Authorization exists ────────────────────────────────────────────────────
  // Cancellation (void) is only possible before capture.
  const canCancel = isQuestGiver && (status === 'AUTHORIZED' || status === 'CAPTURE_FAILED');

  return (
    <div className="mt-6 p-4 rounded-lg border border-line-strong bg-surface space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-strong">Marketplace Payment</h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            STATUS_STYLES[status] ?? STATUS_STYLES.NONE
          }`}
        >
          {STATUS_LABELS[status] ?? STATUS_LABELS.NONE}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-raised rounded p-2">
          <p className="text-subtle text-xs">Total Budget</p>
          <p className="text-strong font-semibold">{formatUsdFromCents(payment.totalBudget)}</p>
        </div>
        <div className="bg-raised rounded p-2">
          <p className="text-subtle text-xs">Platform Fee</p>
          <p className="text-strong font-semibold">{formatUsdFromCents(payment.platformFee)}</p>
        </div>
      </div>

      <p className="text-xs text-subtle">
        {status === 'AUTHORIZED' &&
          `Payment method authorized at booking. ${AUTHORIZATION_NOT_A_CHARGE}`}
        {status === 'CAPTURED' &&
          'Charge captured for completed work. The worker payout is processed through Stripe Connect.'}
        {status === 'CANCELED' && 'Authorization canceled. The customer was not charged.'}
        {status === 'CAPTURE_FAILED' &&
          'The charge could not be captured (the authorization may have expired). Re-authorize to try again.'}
      </p>

      {error && <p className="text-xs text-danger">{error}</p>}

      {canCancel && (
        <div className="flex gap-2">
          <button
            onClick={handleCancelAuthorization}
            disabled={actionLoading === 'cancel'}
            className="flex-1 rounded-lg bg-danger hover:bg-danger disabled:opacity-50 px-3 py-2 text-xs font-bold text-strong transition-colors"
          >
            {actionLoading === 'cancel' ? 'Canceling…' : 'Cancel Authorization'}
          </button>
        </div>
      )}
    </div>
  );
}
