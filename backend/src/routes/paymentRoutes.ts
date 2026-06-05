import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  createConnectedAccount,
  getOnboardingLink,
  createQuestCheckout,
  initializeEscrow,
  releaseMilestonePayment,
  getEscrowStatus,
  completeQuestPayment,
  cancelQuestPayment,
  handleWebhook,
} from '../controllers/paymentController';

const router = Router();

// --- Stripe Connect Onboarding ---
// Create a Stripe Connect Express account for the current user
router.post('/connect', authenticate, createConnectedAccount);

// Get an onboarding link for the current user's Stripe Connect account
router.get('/connect/onboarding', authenticate, getOnboardingLink);

// --- Marketplace Payment (destination charge via Checkout Session) ---
// Create a Checkout Session for a job: client pays, 12% platform fee is taken,
// net is routed to the worker's connected account (quest giver only).
router.post('/quest/:questId/checkout', authenticate, createQuestCheckout);

// --- Escrow Management ---
// Initialize escrow for a quest (quest giver only)
router.post('/quest/:questId/escrow', authenticate, initializeEscrow);

// Get escrow status for a quest
router.get('/quest/:questId/status', authenticate, getEscrowStatus);

// Complete a quest and release all remaining funds (quest giver only)
router.post('/quest/:questId/complete', authenticate, completeQuestPayment);

// Cancel a quest and refund escrowed funds (quest giver only)
router.post('/quest/:questId/cancel', authenticate, cancelQuestPayment);

// --- Milestone Payments ---
// Release payment for a specific milestone (quest giver only)
router.post('/milestone/:milestoneId/release', authenticate, releaseMilestonePayment);

// --- Stripe Webhook ---
// NOTE: This route uses raw body parsing (configured in app.ts).
// Do NOT apply express.json() middleware to this route.
router.post('/webhook', handleWebhook);

export default router;
