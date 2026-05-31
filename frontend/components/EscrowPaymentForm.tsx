'use client';

import { useState } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { getStripe, isStripeConfigured } from '../lib/stripe';

interface EscrowPaymentFormProps {
  clientSecret: string;
  onConfirmed: () => void;
}

/**
 * Inner form: renders the Stripe PaymentElement and confirms the escrow
 * PaymentIntent client-side. The PaymentIntent is created with manual capture
 * on the backend, so confirming here authorizes the funds (status moves to
 * `requires_capture`); the backend captures later on quest completion.
 */
function InnerForm({ onConfirmed }: { onConfirmed: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment confirmation failed');
      setSubmitting(false);
      return;
    }

    // Manual-capture intents land on `requires_capture` once authorized.
    if (
      paymentIntent &&
      (paymentIntent.status === 'requires_capture' ||
        paymentIntent.status === 'succeeded' ||
        paymentIntent.status === 'processing')
    ) {
      onConfirmed();
    } else {
      setError(`Unexpected payment status: ${paymentIntent?.status ?? 'unknown'}`);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
      >
        {submitting ? 'Confirming…' : 'Confirm Payment'}
      </button>
    </form>
  );
}

/**
 * Wrapper: loads Stripe.js and provides the Elements context for a given
 * clientSecret. Fails gracefully (no crash) when the publishable key is not
 * configured.
 */
export default function EscrowPaymentForm({
  clientSecret,
  onConfirmed,
}: EscrowPaymentFormProps) {
  const stripePromise = getStripe();

  if (!isStripeConfigured || !stripePromise) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-amber-400">Stripe not configured</p>
        <p className="text-xs text-zinc-400 mt-1">
          Set <code className="text-amber-300">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{' '}
          (a test-mode <code className="text-amber-300">pk_test_…</code> key) in the
          frontend environment to confirm the marketplace payment.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerForm onConfirmed={onConfirmed} />
    </Elements>
  );
}
