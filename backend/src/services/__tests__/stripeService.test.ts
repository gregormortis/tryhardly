/**
 * Unit tests for stripeService — no live Stripe calls.
 *
 * The `stripe` package is mocked so we can assert on the exact params we send
 * to the Stripe API without any network access or real keys.
 */

const mockPaymentIntentsCreate = jest.fn();
const mockTransfersCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockPaymentIntentsCreate },
    transfers: { create: mockTransfersCreate },
  }));
});

describe('stripeService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, STRIPE_SECRET_KEY: 'sk_test_dummy' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('does NOT throw at import time when STRIPE_SECRET_KEY is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => require('../stripeService')).not.toThrow();
  });

  it('throws only when a Stripe call is made without a key', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const svc = require('../stripeService');
    await expect(
      svc.createEscrowPayment('q1', 1000, 'cus_1', 'acct_1')
    ).rejects.toThrow('STRIPE_SECRET_KEY');
  });

  it('createEscrowPayment uses manual capture and NO auto-transfer (no double-pay)', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_1', client_secret: 'cs_1' });
    const svc = require('../stripeService');

    await svc.createEscrowPayment('quest-1', 10000, 'cus_1', 'acct_adv');

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    const params = mockPaymentIntentsCreate.mock.calls[0][0];
    expect(params.capture_method).toBe('manual');
    expect(params.amount).toBe(10000);
    // The escrow charge must NOT auto-transfer or auto-deduct a fee — payouts
    // happen later via explicit Transfers.
    expect(params.transfer_data).toBeUndefined();
    expect(params.application_fee_amount).toBeUndefined();
  });

  it('releaseMilestonePayment transfers net-of-fee from the CHARGE id', async () => {
    mockTransfersCreate.mockResolvedValue({ id: 'tr_1' });
    const svc = require('../stripeService');

    // 12% fee on $100.00 (10000 cents) => fee 1200, net 8800.
    await svc.releaseMilestonePayment('ms_1', 10000, 'acct_adv', 'ch_123');

    const params = mockTransfersCreate.mock.calls[0][0];
    expect(params.amount).toBe(8800);
    expect(params.destination).toBe('acct_adv');
    // Must reference a charge for source_transaction, not a PaymentIntent.
    expect(params.source_transaction).toBe('ch_123');
    expect(params.metadata.platform_fee).toBe('1200');
  });
});
