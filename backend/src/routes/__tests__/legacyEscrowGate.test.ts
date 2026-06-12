/**
 * The legacy escrow routes (/escrow, /complete, /cancel, /milestone/:id/release)
 * are retired in production. They must be gated off by default and only opened
 * for an explicit internal migration via ENABLE_LEGACY_ESCROW=true.
 *
 * The route module pulls in the payment controller (and transitively Stripe /
 * Prisma), so we mock those to keep this a pure unit test of the gate.
 */
jest.mock('../../app', () => ({ prisma: {} }));
jest.mock('../../services/stripeService', () => ({}));
jest.mock('../../services/escrowService', () => ({}));
jest.mock('../../middleware/authMiddleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

import { legacyEscrowGate } from '../paymentRoutes';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const ORIGINAL = process.env.ENABLE_LEGACY_ESCROW;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ENABLE_LEGACY_ESCROW;
  else process.env.ENABLE_LEGACY_ESCROW = ORIGINAL;
});

describe('legacyEscrowGate', () => {
  it('returns 410 Gone and does not call next() by default (flag unset)', () => {
    delete process.env.ENABLE_LEGACY_ESCROW;
    const res = mockRes();
    const next = jest.fn();

    legacyEscrowGate({} as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('Gone');
    expect(body.message).toMatch(/checkout/i);
  });

  it('returns 410 when the flag is any value other than the literal "true"', () => {
    process.env.ENABLE_LEGACY_ESCROW = '1';
    const res = mockRes();
    const next = jest.fn();

    legacyEscrowGate({} as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
  });

  it('calls next() (allows the legacy handler) only when ENABLE_LEGACY_ESCROW=true', () => {
    process.env.ENABLE_LEGACY_ESCROW = 'true';
    const res = mockRes();
    const next = jest.fn();

    legacyEscrowGate({} as any, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
