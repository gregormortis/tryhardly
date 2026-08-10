// Canonical user-facing wording for the marketplace payment model.
//
// TryHardly never holds funds. The poster's payment method is AUTHORIZED at
// booking, the charge is CAPTURED only after the poster confirms the completed
// work, and the worker payout is routed through Stripe Connect after capture.
//
// The same explanation used to be re-typed in every card that touched payment,
// which let the wording drift apart. Import from here instead so a poster reads
// the same promise everywhere.

export type PaymentStatusValue =
  | 'NONE'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'CANCELED'
  | 'CAPTURE_FAILED';

// The one-line version, for use directly under an authorize CTA.
export const AUTHORIZATION_NOT_A_CHARGE =
  'An authorization is not a final charge — the charge is captured after you confirm the completed work.';

// The full explanation, for the pre-authorization state where the poster is
// deciding whether to hand over a payment method at all.
export const AUTHORIZE_CAPTURE_PAYOUT =
  'Your payment method is authorized at booking — not charged. The final charge is captured after the completed work is confirmed, and the worker payout is processed after capture through Stripe Connect.';

// Worker-facing counterpart, shown while waiting on the poster.
export const AUTHORIZE_CAPTURE_PAYOUT_WORKER =
  'The poster authorizes a payment method at booking — that is not a final charge. The charge is captured after the completed work is confirmed, and your payout is processed after capture through Stripe Connect.';

// ─── Direct-settlement copy (the active mode) ───────────────────────────────
//
// TryHardly does not process payments. The customer and the worker agree an
// amount through the platform and settle it between themselves however they
// prefer. Everything below is written to be plain about that rather than
// apologetic — being upfront is the whole point, and a vague "payment arranged
// separately" line is exactly what makes people suspicious.
//
// One rule for anything added here: never imply TryHardly guarantees, insures,
// mediates, or backs the payment. It does not. What it does is keep the record
// of what was agreed, and hold both sides' reputation against it.

export const DIRECT_PAYMENT_SHORT =
  'You pay the worker directly. TryHardly does not process the payment or take a cut.';

export const DIRECT_PAYMENT_POSTER =
  'TryHardly does not handle payment. You and the worker settle the agreed amount directly — cash, Venmo, Zelle, check, whatever you both prefer. Agree on when you will pay before the work starts, and confirm the job here once it is done so the worker gets credit for it.';

export const DIRECT_PAYMENT_WORKER =
  'TryHardly does not handle payment. You collect the agreed amount from the customer directly, and you keep all of it — there is no marketplace fee. Agree on how and when you will be paid before you start, and ask the customer to confirm the job here afterward so it counts toward your record.';

// Shown where someone might reasonably expect a payment guarantee, so the limit
// of what the platform does is stated rather than left to be discovered.
export const DIRECT_PAYMENT_LIMIT =
  'Because payment happens directly between you, TryHardly cannot refund, reverse, or guarantee it. What we can do is keep the record of what was agreed and hold it against both sides\u2019 ratings.';

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Naming the amount on the button makes it clear what is being authorized, and
// keeps the verb "authorize" rather than implying an immediate charge.
export function authorizeButtonLabel(amountCents?: number | null): string {
  if (amountCents === undefined || amountCents === null || amountCents <= 0) {
    return 'Authorize payment method';
  }
  return `Authorize ${formatUsdFromCents(amountCents)}`;
}

// Headline + supporting line for the poster's "what happens next" banner, which
// has to track the live authorization state instead of always reading as though
// no payment method has been provided yet.
export function posterPaymentNextStep(status: PaymentStatusValue): {
  heading: string;
  detail: string;
} {
  switch (status) {
    case 'AUTHORIZED':
      return {
        heading: 'Payment authorized — the job can start',
        detail: `Your payment method is authorized for this job. ${AUTHORIZATION_NOT_A_CHARGE} You can cancel the authorization below any time before then.`,
      };
    case 'CAPTURED':
      return {
        heading: 'Payment captured for completed work',
        detail:
          'You confirmed the completed work, so the agreed charge has been captured. The worker payout is processed through Stripe Connect.',
      };
    case 'CANCELED':
      return {
        heading: 'Authorization canceled — authorize again to restart the job',
        detail: `You were not charged. ${AUTHORIZE_CAPTURE_PAYOUT}`,
      };
    case 'CAPTURE_FAILED':
      return {
        heading: 'The charge could not be captured',
        detail:
          'The authorization may have expired. Authorize a payment method again to complete payment for this job.',
      };
    case 'NONE':
    default:
      return {
        heading: 'Next step: authorize payment to start the job',
        detail: AUTHORIZE_CAPTURE_PAYOUT,
      };
  }
}
