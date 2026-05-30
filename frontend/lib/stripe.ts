import { loadStripe, Stripe } from '@stripe/stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/**
 * Singleton Stripe.js promise. Returns null when the publishable key is not
 * configured so callers can fail gracefully with an actionable message instead
 * of throwing. Never uses a live key — whatever is in
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is what is used.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> | null {
  if (!publishableKey) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

export const isStripeConfigured = Boolean(publishableKey);
