// Client-side mirror of backend/src/config/paymentsMode.ts. See that file for
// the full reasoning; the short version is that TryHardly currently matches
// people and keeps the record, and the customer and worker settle payment
// between themselves.
//
// Kept as a module rather than reading process.env inline so there is exactly
// one place to flip, and so no component has to know the env var's name.

export type PaymentsMode = 'direct' | 'platform';

export const PAYMENTS_MODE: PaymentsMode =
  process.env.NEXT_PUBLIC_PAYMENTS_MODE === 'platform' ? 'platform' : 'direct';

export const PLATFORM_PAYMENTS_ENABLED = PAYMENTS_MODE === 'platform';
export const DIRECT_PAYMENTS = PAYMENTS_MODE === 'direct';
