/**
 * TryHardly runs in direct-settlement mode: the customer and worker settle
 * payment between themselves and the platform never touches the money.
 *
 * The card-accepting endpoints must therefore be unreachable, not merely
 * unused. This matters more than it sounds: on 2026-08-04 an authenticated
 * actor drove 82 charges through the checkout endpoint in about 25 minutes. An
 * endpoint that can open a Checkout Session is an endpoint that can be
 * attacked, and the cheapest way to survive that class of attack is to not
 * expose the endpoint at all while it serves no purpose.
 *
 * The gate must also fail CLOSED. If PAYMENTS_MODE is unset, misspelled, or
 * mangled by a deploy, the safe outcome is no payments — never accidentally
 * live card acceptance on a platform with no processor.
 *
 * The route module pulls in the payment controller (and transitively Stripe /
 * Prisma), so those are mocked to keep this a pure unit test of the gate.
 */
jest.mock('../../app', () => ({ prisma: {} }));
jest.mock('../../services/stripeService', () => ({}));
jest.mock('../../services/escrowService', () => ({}));
jest.mock('../../middleware/authMiddleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

import { platformPaymentsGate } from '../paymentRoutes';
import { getPaymentsMode, isPlatformPaymentsEnabled } from '../../config/paymentsMode';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const ORIGINAL = process.env.PAYMENTS_MODE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.PAYMENTS_MODE;
  else process.env.PAYMENTS_MODE = ORIGINAL;
});

describe('paymentsMode config', () => {
  it('defaults to direct when PAYMENTS_MODE is unset', () => {
    delete process.env.PAYMENTS_MODE;
    expect(getPaymentsMode()).toBe('direct');
    expect(isPlatformPaymentsEnabled()).toBe(false);
  });

  it('only enables platform payments on the exact string "platform"', () => {
    for (const value of ['Platform', 'PLATFORM', 'true', '1', 'yes', 'platfrom', '']) {
      process.env.PAYMENTS_MODE = value;
      expect(isPlatformPaymentsEnabled()).toBe(false);
    }
    process.env.PAYMENTS_MODE = 'platform';
    expect(isPlatformPaymentsEnabled()).toBe(true);
  });

  it('is read per call so the mode can flip without a restart', () => {
    process.env.PAYMENTS_MODE = 'platform';
    expect(isPlatformPaymentsEnabled()).toBe(true);
    process.env.PAYMENTS_MODE = 'direct';
    expect(isPlatformPaymentsEnabled()).toBe(false);
  });
});

describe('platformPaymentsGate', () => {
  it('returns 410 Gone and does not call next() by default', () => {
    delete process.env.PAYMENTS_MODE;
    const res = mockRes();
    const next = jest.fn();

    platformPaymentsGate({} as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json.mock.calls[0][0].error).toBe('Gone');
  });

  it('explains the direct-settlement model rather than just refusing', () => {
    delete process.env.PAYMENTS_MODE;
    const res = mockRes();
    platformPaymentsGate({} as any, res, jest.fn());

    const { message } = res.json.mock.calls[0][0];
    expect(message).toMatch(/directly/i);
    // A caller must not be told the whole platform is down; posting, bidding
    // and completion all still work.
    expect(message).toMatch(/bidding/i);
  });

  it('never leaks retired payment vocabulary to API consumers', () => {
    delete process.env.PAYMENTS_MODE;
    const res = mockRes();
    platformPaymentsGate({} as any, res, jest.fn());

    const body = JSON.stringify(res.json.mock.calls[0][0]).toLowerCase();
    for (const banned of ['escrow', 'custodial', 'held funds', 'wallet', 'stored value']) {
      expect(body).not.toContain(banned);
    }
  });

  it('fails closed on an unrecognized PAYMENTS_MODE value', () => {
    process.env.PAYMENTS_MODE = 'PLATFORM'; // wrong case, e.g. a fat-fingered env var
    const res = mockRes();
    const next = jest.fn();

    platformPaymentsGate({} as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
  });

  it('passes through when platform payments are explicitly enabled', () => {
    process.env.PAYMENTS_MODE = 'platform';
    const res = mockRes();
    const next = jest.fn();

    platformPaymentsGate({} as any, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
