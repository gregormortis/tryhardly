// ─── Payments mode ──────────────────────────────────────────────────────────
//
// TryHardly runs in one of two payment modes. This module is the single source
// of truth for which one is active.
//
//   'direct'   — the customer and the worker settle payment between themselves,
//                however they like. TryHardly matches, keeps the record, and
//                carries reputation, but never touches the money. No card is
//                accepted, no fee is taken, no payout is made.
//
//   'platform' — the marketplace flow: the customer's payment method is
//                authorized at booking, the charge is captured for completed
//                work, and worker payouts are processed through Stripe Connect
//                after capture, less the platform service fee.
//
// Why 'direct' is the default
// ---------------------------
// Stripe closed the platform account on 2026-08-09 and declined the appeal.
// Beyond that immediate fact, the arithmetic does not currently support
// platform payments at all: a PayFac-as-a-Service replacement runs $250–500 per
// month in fixed cost, which moves break-even from roughly 10 completed jobs a
// month to somewhere between 29 and 48. TryHardly has not completed its first
// job yet. Paying a monthly minimum to split payments that do not exist spends
// the runway on the one thing that was never the bottleneck.
//
// So the platform path is switched off rather than deleted. The code, the
// schema, the webhooks, and the capture-on-completion handshake all remain
// intact and tested. When completed-job volume clears roughly 33 a month, a
// processor becomes fundable out of revenue instead of runway, and this flips
// back with an environment variable rather than a rewrite.
//
// Nothing here changes the completion protocol. Workers still submit completed
// work, posters still confirm it, and XP, reviews, and proof-of-work all still
// fire. The only step that goes away is the money.

export type PaymentsMode = 'direct' | 'platform';

export function getPaymentsMode(): PaymentsMode {
  return process.env.PAYMENTS_MODE === 'platform' ? 'platform' : 'direct';
}

// True when TryHardly is accepting cards and moving money on behalf of users.
// Read per-request rather than cached at import so the mode can be flipped
// without a redeploy, and so tests can exercise both paths.
export function isPlatformPaymentsEnabled(): boolean {
  return getPaymentsMode() === 'platform';
}
