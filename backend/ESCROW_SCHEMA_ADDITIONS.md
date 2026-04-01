# Escrow Schema Additions

These changes are required for the escrow/payment system (`stripeService.ts`, `escrowService.ts`, `paymentController.ts`).

> ⚠️ **DO NOT apply these manually** — the schema agent will integrate them into `prisma/schema.prisma`.

---

## New Enum: `EscrowStatus`

```prisma
enum EscrowStatus {
  NONE                // No escrow initiated
  PENDING             // PaymentIntent created, awaiting confirmation/capture
  FUNDED              // Funds captured and held in escrow
  PARTIALLY_RELEASED  // Some milestones paid out, others remaining
  RELEASED            // All funds released to adventurer
  REFUNDED            // Quest cancelled, funds refunded to quest giver
}
```

## User Model Additions

```prisma
model User {
  // ... existing fields ...

  // Stripe integration
  stripeAccountId   String?   // Stripe Connect Express account ID (for receiving payouts)
  stripeCustomerId  String?   // Stripe Customer ID (for making payments as quest giver)
}
```

## Quest Model Additions

```prisma
model Quest {
  // ... existing fields ...

  // Escrow / payment tracking
  escrowStatus    EscrowStatus  @default(NONE)   // Current state of the escrow lifecycle
  paymentIntentId String?                         // Stripe PaymentIntent ID for this quest's escrow
}
```

---

## Field Descriptions

| Model | Field | Type | Purpose |
|-------|-------|------|---------|
| `User` | `stripeAccountId` | `String?` | Stripe Connect Express account for receiving milestone payouts |
| `User` | `stripeCustomerId` | `String?` | Stripe Customer for the quest giver's payment method |
| `Quest` | `escrowStatus` | `EscrowStatus` | Tracks the lifecycle of the escrow: NONE → PENDING → FUNDED → PARTIALLY_RELEASED → RELEASED (or REFUNDED) |
| `Quest` | `paymentIntentId` | `String?` | The Stripe PaymentIntent ID used for the escrowed funds |

## Lifecycle

```
Quest Posted (escrowStatus: NONE)
    │
    ▼
Application Accepted → initializeEscrow()
    │  Creates PaymentIntent (manual capture)
    ▼  escrowStatus: PENDING
    │
Quest Giver Confirms Payment (frontend)
    │  payment_intent.succeeded webhook fires
    ▼  escrowStatus: FUNDED
    │
    ├──► Milestone completed → releaseMilestonePayment()
    │      escrowStatus: PARTIALLY_RELEASED
    │      (repeat for each milestone)
    │
    ├──► All milestones paid
    │      escrowStatus: RELEASED
    │
    └──► Quest cancelled → cancelQuest()
           escrowStatus: REFUNDED
```

## Environment Variables Needed

```env
STRIPE_SECRET_KEY=sk_test_...          # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Stripe webhook endpoint signing secret
FRONTEND_URL=http://localhost:3000     # For Connect onboarding redirect URLs
```
