/**
 * Unit tests for stripeService — no live Stripe calls.
 *
 * The `stripe` package is mocked so we can assert on the exact params we send
 * to the Stripe API without any network access or real keys.
 */

const mockPaymentIntentsCreate = jest.fn();
const mockTransfersCreate = jest.fn();
const mockConstructEvent = jest.fn();
const mockAccountsCreate = jest.fn();
const mockCheckoutSessionsCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockPaymentIntentsCreate },
    transfers: { create: mockTransfersCreate },
    accounts: { create: mockAccountsCreate },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    webhooks: { constructEvent: mockConstructEvent },
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

  describe('calculatePlatformFee', () => {
    it('is 12% of the amount, rounded to cents', () => {
      const svc = require('../stripeService');
      // 12% of 10000 = 1200.
      expect(svc.calculatePlatformFee(10000)).toBe(1200);
      // 12% of 12345 = 1481.4 → rounds to 1481.
      expect(svc.calculatePlatformFee(12345)).toBe(1481);
    });

    it('never exceeds the amount and leaves at least 1 cent for the worker', () => {
      const svc = require('../stripeService');
      // Degenerate 1-cent job: 12% rounds to 0, clamp keeps it >= 0 and < amount.
      expect(svc.calculatePlatformFee(1)).toBe(0);
      // The fee is always strictly less than the amount.
      for (const amt of [1, 2, 5, 8, 100, 9999]) {
        expect(svc.calculatePlatformFee(amt)).toBeLessThan(amt);
        expect(svc.calculatePlatformFee(amt)).toBeGreaterThanOrEqual(0);
      }
    });

    it('returns 0 for non-positive or invalid amounts', () => {
      const svc = require('../stripeService');
      expect(svc.calculatePlatformFee(0)).toBe(0);
      expect(svc.calculatePlatformFee(-500)).toBe(0);
      expect(svc.calculatePlatformFee(NaN)).toBe(0);
    });
  });

  describe('createCheckoutSession', () => {
    it('sets application_fee_amount and transfer_data.destination on the destination charge', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout' });
      const svc = require('../stripeService');

      await svc.createCheckoutSession({
        questId: 'quest-1',
        title: 'Mow the lawn',
        amountCents: 10000,
        workerAccountId: 'acct_worker',
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
      const params = mockCheckoutSessionsCreate.mock.calls[0][0];

      expect(params.mode).toBe('payment');
      // Authorize-only: the destination charge uses manual capture so completing
      // Checkout authorizes the card; the charge is captured later on completion.
      expect(params.payment_intent_data.capture_method).toBe('manual');
      // 12% of $100.00 => 1200 cents application fee.
      expect(params.payment_intent_data.application_fee_amount).toBe(1200);
      expect(params.payment_intent_data.transfer_data.destination).toBe('acct_worker');
      // The destination-charge PI carries the worker account in metadata so the
      // webhook can distinguish it from the legacy escrow PaymentIntent.
      expect(params.payment_intent_data.metadata.tryhardly_worker_account).toBe('acct_worker');
      // Line item uses the job title and amount — never a placeholder product.
      const lineItem = params.line_items[0];
      expect(lineItem.price_data.unit_amount).toBe(10000);
      expect(lineItem.price_data.product_data.name).toBe('Mow the lawn');
      expect(JSON.stringify(params).toLowerCase()).not.toContain('cookie');
      expect(params.success_url).toBe('https://app/success');
      expect(params.cancel_url).toBe('https://app/cancel');
    });

    it('rejects non-positive amounts', async () => {
      const svc = require('../stripeService');
      await expect(
        svc.createCheckoutSession({
          questId: 'q',
          title: 't',
          amountCents: 0,
          workerAccountId: 'acct',
          successUrl: 's',
          cancelUrl: 'c',
        })
      ).rejects.toThrow('positive integer');
    });
  });

  describe('createConnectedAccount', () => {
    it('creates an Express account with card_payments + transfers for destination charges', async () => {
      mockAccountsCreate.mockResolvedValue({ id: 'acct_1' });
      const svc = require('../stripeService');

      await svc.createConnectedAccount('user-1', 'worker@example.com', {
        displayName: 'Worker One',
      });

      const params = mockAccountsCreate.mock.calls[0][0];
      expect(params.type).toBe('express');
      expect(params.capabilities.transfers.requested).toBe(true);
      expect(params.capabilities.card_payments.requested).toBe(true);
      expect(params.country).toBe('US');
      expect(params.email).toBe('worker@example.com');
      expect(params.business_profile.name).toBe('Worker One');
      expect(params.metadata.tryhardly_user_id).toBe('user-1');
    });

    it('does NOT set a custom controller (losses/fees) — avoids the platform-profile loss-liability rejection', async () => {
      mockAccountsCreate.mockResolvedValue({ id: 'acct_1' });
      const svc = require('../stripeService');

      await svc.createConnectedAccount('user-1', 'worker@example.com');

      const params = mockAccountsCreate.mock.calls[0][0];
      // The custom controller with platform-owned losses/fees is what triggered
      // "review the responsibilities of managing losses for connected accounts".
      // type:'express' must inherit the platform-profile defaults instead.
      expect(params.controller).toBeUndefined();
    });

    it('honors STRIPE_ACCOUNT_COUNTRY override', async () => {
      process.env.STRIPE_ACCOUNT_COUNTRY = 'gb';
      mockAccountsCreate.mockResolvedValue({ id: 'acct_2' });
      const svc = require('../stripeService');

      await svc.createConnectedAccount('user-2', 'gb@example.com');

      expect(mockAccountsCreate.mock.calls[0][0].country).toBe('GB');
    });
  });

  describe('constructWebhookEventFromSecrets', () => {
    const body = Buffer.from('{"id":"evt_1"}');
    const sig = 't=1,v1=abc';

    it('returns the event when the FIRST secret matches', () => {
      mockConstructEvent.mockReturnValueOnce({ id: 'evt_1', type: 'ping' });
      const svc = require('../stripeService');

      const event = svc.constructWebhookEventFromSecrets(body, sig, [
        'whsec_test',
        'whsec_live',
      ]);

      expect(event).toEqual({ id: 'evt_1', type: 'ping' });
      expect(mockConstructEvent).toHaveBeenCalledTimes(1);
      expect(mockConstructEvent).toHaveBeenCalledWith(body, sig, 'whsec_test');
    });

    it('falls through to the SECOND secret when the first fails', () => {
      mockConstructEvent
        .mockImplementationOnce(() => {
          throw new Error('No signatures found matching the expected signature for payload');
        })
        .mockReturnValueOnce({ id: 'evt_2', type: 'ping' });
      const svc = require('../stripeService');

      const event = svc.constructWebhookEventFromSecrets(body, sig, [
        'whsec_test',
        'whsec_live',
      ]);

      expect(event).toEqual({ id: 'evt_2', type: 'ping' });
      expect(mockConstructEvent).toHaveBeenCalledTimes(2);
      expect(mockConstructEvent).toHaveBeenLastCalledWith(body, sig, 'whsec_live');
    });

    it('throws the last error when NO secret matches', () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });
      const svc = require('../stripeService');

      expect(() =>
        svc.constructWebhookEventFromSecrets(body, sig, ['whsec_test', 'whsec_live'])
      ).toThrow('No signatures found matching');
      expect(mockConstructEvent).toHaveBeenCalledTimes(2);
    });
  });
});
