# Stripe Compliance: Public Language Review

Internal checklist supporting a Stripe review/appeal. Summarizes the public-facing
copy cleanup performed to ensure TryHardly is represented as a **marketplace**, not
an escrow / custodial / fund-holding service.

## What changed

All user-facing website, marketing, policy, and in-app copy was reviewed and reworded:

- Removed "escrow", "escrow-protected", "escrow-ready", "payment-ready flow",
  "funds held / held in escrow / held until", and "card payments are rolling out"
  from public copy.
- Replaced with Stripe-safe marketplace language: "marketplace payments",
  "payouts on task completion", "paid after completion", "marketplace payout flow",
  "Stripe Connect marketplace payments", "clear rewards", "payment status".
- Homepage, fast landing pages (post-job-fast, find-work-fast), pricing, about,
  FAQ, support, manifest/PWA + page metadata, and the in-app payment panel now
  describe a marketplace payout model.

## Positioning statement (now reflected in copy)

TryHardly is a **marketplace** connecting people who need local help with people
who do the work. Marketplace payment features, when enabled, are processed by
third-party payment providers (Stripe). Payouts may occur after task completion
according to the provider's and platform's flow. **TryHardly is not a bank, escrow
agent, or money transmitter and does not take custody of user funds.** This
disclaimer appears in the Terms and the Refund & Dispute Policy.

## Public-facing language now avoids

| Removed (risky)                         | Replacement (Stripe-safe)                          |
|-----------------------------------------|----------------------------------------------------|
| Escrow / escrow-protected / escrow-ready| Marketplace payments / marketplace payout flow     |
| Funds are held in escrow until ...      | Payouts on task completion / paid after completion |
| Payment-ready flow                      | Clear marketplace payouts / payment status         |
| We hold / funds held / platform-managed | Processed by Stripe; payout to the worker          |
| Card payments are rolling out           | Marketplace payments, when enabled                 |

## Remaining "escrow" occurrences are internal-only (not user-facing)

These are implementation details and do **not** render as public positioning copy:

- Frontend component names/imports: `EscrowPanel`, `EscrowPaymentForm`, and the
  JSX comments referencing them. Rendered headings now read "Marketplace Payment";
  the visible status pill maps internal statuses (e.g. `FUNDED`/`RELEASED`) to
  user labels (`AUTHORIZED`/`PAID OUT`).
- Frontend type/field names: `escrowStatus`, `EscrowStatus`, `totalEscrowed`.
- Backend service/controller/route identifiers and logic: `escrowService`,
  `createEscrowPayment`, `/payments/quest/:questId/escrow`, internal `escrowStatus`
  enum values, and backend API `message`/`error` strings. These were intentionally
  left untouched to avoid altering payment processing logic, routes, env vars, or
  the DB schema. They are server-side identifiers, not marketing or positioning.

The only public Terms/Refunds occurrences of the word "escrow" are in the explicit
disclaimer "TryHardly is not a bank, escrow agent, or money transmitter," which
reinforces non-custody.

## Recommended post-deploy smoke / grep checks

After deploying, verify on the live site:

1. View source / rendered text on `/`, `/pricing`, `/faq`, `/about`, `/terms`,
   `/refunds`, `/support`, `/post-job-fast`, `/find-work-fast` — confirm no
   "escrow", "funds held", or "card payments rolling out" appears.
2. Check `/manifest.webmanifest` description — should say "Marketplace payments".
3. Open a quest as the quest giver and confirm the payment panel header reads
   "Marketplace Payment" and the status pill shows the user-facing labels.
4. Suggested grep against the rendered HTML of public pages:
   `curl -s https://tryhardly.com/<path> | grep -iE 'escrow|funds held|held in escrow|payment-ready|card payments rolling'`
   — should return nothing on public pages (the only allowed hit is the
   "not a bank, escrow agent, or money transmitter" disclaimer on /terms and /refunds).
