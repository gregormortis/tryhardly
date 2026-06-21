import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  createConnectedAccount,
  getOnboardingLink,
  getConnectStatus,
  createQuestCheckout,
  captureQuestPayment,
  cancelQuestAuthorization,
  initializeEscrow,
  releaseMilestonePayment,
  getEscrowStatus,
  getPaymentStatus,
  completeQuestPayment,
  cancelQuestPayment,
  handleWebhook,
} from '../controllers/paymentController';

const router = Router();

/**
 * Gate for the legacy escrow flow (hold-and-transfer / separate charges &
 * milestone releases). Stripe treats that pattern as escrow-like, which is the
 * thing we are migrating away from. The production/default path is the
 * non-escrow manual-capture marketplace flow (checkout → capture-on-completion).
 *
 * These routes are therefore disabled by default and return 410 Gone. They can
 * be re-enabled ONLY for an explicit internal migration by setting
 * ENABLE_LEGACY_ESCROW=true in the environment. The flag is read per-request so
 * it can be toggled without code changes, and so tests can exercise both modes.
 */
export function legacyEscrowGate(_req: Request, res: Response, next: NextFunction): void {
  if (process.env.ENABLE_LEGACY_ESCROW === 'true') {
    next();
    return;
  }
  res.status(410).json({
    error: 'Gone',
    message:
      'The escrow payment flow has been retired. Use the non-escrow marketplace ' +
      'flow: POST /api/payments/quest/:questId/checkout to authorize, capture on ' +
      'completion, and POST /api/payments/quest/:questId/cancel-authorization to void.',
  });
}

// --- Stripe Connect Onboarding ---
// Create a Stripe Connect Express account for the current user
router.post('/connect', authenticate, createConnectedAccount);

// Get an onboarding link for the current user's Stripe Connect account
router.get('/connect/onboarding', authenticate, getOnboardingLink);

// Read the current user's payout-account status from Stripe (charges/payouts/
// details + requirements due). Used by the UI to render connect/resume/complete.
router.get('/connect/status', authenticate, getConnectStatus);

// --- Marketplace Payment (destination charge via Checkout Session) ---
// Create a Checkout Session for a job (authorize-only, manual capture): the
// client's card is authorized — not charged — and the 12% fee + worker payout
// route on capture to the worker's connected account (quest giver only).
router.post('/quest/:questId/checkout', authenticate, createQuestCheckout);

// Capture the authorized payment for a completed task (quest giver or admin).
// The primary trigger is completion confirmation; this is an explicit fallback.
router.post('/quest/:questId/capture', authenticate, captureQuestPayment);

// Cancel/void the authorization for a canceled or uncompleted job (quest giver
// or admin). Does not "release funds" — there are none held; it voids the
// pending card authorization so the customer is never charged.
router.post('/quest/:questId/cancel-authorization', authenticate, cancelQuestAuthorization);

// --- Payment status (non-escrow marketplace flow) ---
// Lightweight, non-sensitive status read that prefers the new `paymentStatus`
// fields. Used by the UI; never initializes or mutates payment state.
router.get('/quest/:questId/payment-status', authenticate, getPaymentStatus);

// --- Legacy Escrow Management (DISABLED by default — see legacyEscrowGate) ---
// Initialize escrow for a quest (quest giver only)
router.post('/quest/:questId/escrow', authenticate, legacyEscrowGate, initializeEscrow);

// Get escrow status for a quest. Reads are non-sensitive and the gate is NOT
// applied so historic/legacy quests can still surface status; new code should
// prefer GET /quest/:questId/payment-status above.
router.get('/quest/:questId/status', authenticate, getEscrowStatus);

// Complete a quest and release all remaining funds (quest giver only)
router.post('/quest/:questId/complete', authenticate, legacyEscrowGate, completeQuestPayment);

// Cancel a quest and refund escrowed funds (quest giver only)
router.post('/quest/:questId/cancel', authenticate, legacyEscrowGate, cancelQuestPayment);

// --- Milestone Payments (legacy — DISABLED by default) ---
// Release payment for a specific milestone (quest giver only)
router.post('/milestone/:milestoneId/release', authenticate, legacyEscrowGate, releaseMilestonePayment);

// --- Stripe Webhook ---
// NOTE: This route uses raw body parsing (configured in app.ts).
// Do NOT apply express.json() middleware to this route.
router.post('/webhook', handleWebhook);

export default router;
