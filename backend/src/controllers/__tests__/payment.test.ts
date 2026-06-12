/**
 * Tests for the non-escrow marketplace payment controller:
 *   - webhook state transitions for the manual-capture flow
 *   - capture-on-completion behavior
 *
 * Stripe and Prisma are mocked; no network or DB access.
 */

const mockPrisma = {
  quest: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

const mockStripe = {
  constructWebhookEventFromSecrets: jest.fn(),
  getPaymentIntent: jest.fn(),
  capturePayment: jest.fn(),
  cancelPaymentIntent: jest.fn(),
};
jest.mock('../../services/stripeService', () => mockStripe);

// escrowService is imported by the controller but unused in these tests.
jest.mock('../../services/escrowService', () => ({}));

import {
  handleWebhook,
  captureAuthorizedPayment,
} from '../paymentController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function webhookReq(event: any) {
  return {
    headers: { 'stripe-signature': 't=1,v1=abc' },
    body: Buffer.from('{}'),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  mockPrisma.quest.update.mockResolvedValue({});
});

describe('handleWebhook — non-escrow manual-capture flow', () => {
  it('checkout.session.completed marks the quest AUTHORIZED (not captured) and stores IDs, no escrowStatus', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ id: 'q1', paymentStatus: 'NONE' });
    mockStripe.constructWebhookEventFromSecrets.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          payment_intent: 'pi_1',
          metadata: { tryhardly_quest_id: 'q1', tryhardly_worker_account: 'acct_w' },
        },
      },
    });

    const res = mockRes();
    await handleWebhook(webhookReq({}), res);

    expect(mockPrisma.quest.update).toHaveBeenCalledTimes(1);
    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(data.checkoutSessionId).toBe('cs_1');
    expect(data.paymentIntentId).toBe('pi_1');
    expect(data.paymentStatus).toBe('AUTHORIZED');
    expect(data.paymentAuthorizedAt).toBeInstanceOf(Date);
    // The new flow must NOT write the legacy escrowStatus field.
    expect(data).not.toHaveProperty('escrowStatus');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('checkout.session.completed does NOT downgrade an already CAPTURED quest', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ id: 'q1', paymentStatus: 'CAPTURED' });
    mockStripe.constructWebhookEventFromSecrets.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          payment_intent: 'pi_1',
          metadata: { tryhardly_quest_id: 'q1', tryhardly_worker_account: 'acct_w' },
        },
      },
    });

    const res = mockRes();
    await handleWebhook(webhookReq({}), res);

    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    // IDs are still recorded, but paymentStatus is NOT reset to AUTHORIZED.
    expect(data.paymentStatus).toBeUndefined();
  });

  it('payment_intent.succeeded with a worker-account marks CAPTURED (destination charge)', async () => {
    mockStripe.constructWebhookEventFromSecrets.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          metadata: { tryhardly_quest_id: 'q1', tryhardly_worker_account: 'acct_w' },
        },
      },
    });

    const res = mockRes();
    await handleWebhook(webhookReq({}), res);

    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(data.paymentStatus).toBe('CAPTURED');
    expect(data.paymentCapturedAt).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty('escrowStatus');
  });

  it('payment_intent.succeeded WITHOUT a worker-account uses the legacy escrow path', async () => {
    mockStripe.constructWebhookEventFromSecrets.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_legacy',
          metadata: { tryhardly_quest_id: 'q1', tryhardly_adventurer_account: 'acct_a' },
        },
      },
    });

    const res = mockRes();
    await handleWebhook(webhookReq({}), res);

    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    // Legacy path is preserved unchanged.
    expect(data.escrowStatus).toBe('FUNDED');
    expect(data).not.toHaveProperty('paymentStatus');
  });

  it('payment_intent.amount_capturable_updated marks AUTHORIZED', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ id: 'q1', paymentStatus: 'NONE' });
    mockStripe.constructWebhookEventFromSecrets.mockReturnValue({
      type: 'payment_intent.amount_capturable_updated',
      data: {
        object: {
          id: 'pi_1',
          amount_capturable: 10000,
          metadata: { tryhardly_quest_id: 'q1', tryhardly_worker_account: 'acct_w' },
        },
      },
    });

    const res = mockRes();
    await handleWebhook(webhookReq({}), res);

    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(data.paymentStatus).toBe('AUTHORIZED');
  });
});

describe('captureAuthorizedPayment', () => {
  it('captures a requires_capture PaymentIntent and marks CAPTURED', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      paymentIntentId: 'pi_1',
      paymentStatus: 'AUTHORIZED',
    });
    mockStripe.getPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'requires_capture' });
    mockStripe.capturePayment.mockResolvedValue({ id: 'pi_1', status: 'succeeded' });

    const result = await captureAuthorizedPayment('q1');

    expect(mockStripe.capturePayment).toHaveBeenCalledWith('pi_1');
    expect(result.captured).toBe(true);
    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(data.paymentStatus).toBe('CAPTURED');
    expect(data.paymentCapturedAt).toBeInstanceOf(Date);
  });

  it('no-ops when there is no payment intent (e.g. legacy/escrow or unpaid quest)', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ id: 'q1', paymentIntentId: null });
    const result = await captureAuthorizedPayment('q1');
    expect(result.captured).toBe(false);
    expect(result.reason).toBe('no_payment_intent');
    expect(mockStripe.capturePayment).not.toHaveBeenCalled();
  });

  it('no-ops when already captured', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      paymentIntentId: 'pi_1',
      paymentStatus: 'CAPTURED',
    });
    const result = await captureAuthorizedPayment('q1');
    expect(result.captured).toBe(false);
    expect(result.reason).toBe('already_captured');
    expect(mockStripe.capturePayment).not.toHaveBeenCalled();
  });

  it('reconciles without a second capture when Stripe already shows succeeded', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      paymentIntentId: 'pi_1',
      paymentStatus: 'AUTHORIZED',
    });
    mockStripe.getPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'succeeded' });

    const result = await captureAuthorizedPayment('q1');

    expect(mockStripe.capturePayment).not.toHaveBeenCalled();
    expect(result.reason).toBe('already_captured_upstream');
    expect(mockPrisma.quest.update.mock.calls[0][0].data.paymentStatus).toBe('CAPTURED');
  });

  it('records CAPTURE_FAILED and rethrows when capture errors', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      paymentIntentId: 'pi_1',
      paymentStatus: 'AUTHORIZED',
    });
    mockStripe.getPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'requires_capture' });
    mockStripe.capturePayment.mockRejectedValue(new Error('authorization expired'));

    await expect(captureAuthorizedPayment('q1')).rejects.toThrow('authorization expired');
    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(data.paymentStatus).toBe('CAPTURE_FAILED');
  });
});
