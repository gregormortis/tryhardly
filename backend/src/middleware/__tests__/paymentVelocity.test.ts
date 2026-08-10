import { createVelocityBreaker, checkJobAmount } from '../paymentVelocity';

function mockReqRes() {
  const req: any = { headers: {}, ip: '1.2.3.4', socket: { remoteAddress: '1.2.3.4' } };
  const res: any = {};
  res.setHeader = jest.fn();
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  const next = jest.fn();
  return { req, res, next };
}

describe('platform velocity breaker', () => {
  it('allows traffic up to the limit and refuses beyond it', () => {
    const breaker = createVelocityBreaker({ windowMs: 60_000, max: 3, onTrip: () => {} });

    for (let i = 0; i < 3; i++) {
      const { req, res, next } = mockReqRes();
      breaker(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }

    const blocked = mockReqRes();
    breaker(blocked.req, blocked.res, blocked.next);
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.status).toHaveBeenCalledWith(503);
    expect(blocked.res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('counts every caller together, unlike the per-IP and per-user limiters', () => {
    const breaker = createVelocityBreaker({ windowMs: 60_000, max: 2, onTrip: () => {} });

    // Three different IPs and three different users. Each would pass its own
    // per-IP and per-user limiter; together they exceed the platform ceiling.
    for (const ip of ['1.1.1.1', '2.2.2.2']) {
      const { req, res, next } = mockReqRes();
      req.ip = ip;
      req.user = { id: `user-${ip}` };
      breaker(req, res, next);
      expect(next).toHaveBeenCalled();
    }

    const third = mockReqRes();
    third.req.ip = '3.3.3.3';
    third.req.user = { id: 'user-3' };
    breaker(third.req, third.res, third.next);
    expect(third.res.status).toHaveBeenCalledWith(503);
  });

  it('alerts once per window, not on every blocked request', () => {
    const onTrip = jest.fn();
    const breaker = createVelocityBreaker({ windowMs: 60_000, max: 1, onTrip });

    for (let i = 0; i < 5; i++) {
      const { req, res, next } = mockReqRes();
      breaker(req, res, next);
    }

    expect(onTrip).toHaveBeenCalledTimes(1);
    expect(onTrip).toHaveBeenCalledWith(
      expect.objectContaining({ max: 1, label: expect.any(String) }),
    );
  });

  it('recovers automatically once the window rolls over', () => {
    jest.useFakeTimers();
    try {
      const breaker = createVelocityBreaker({ windowMs: 1_000, max: 1, onTrip: () => {} });

      const first = mockReqRes();
      breaker(first.req, first.res, first.next);
      expect(first.next).toHaveBeenCalled();

      const blocked = mockReqRes();
      breaker(blocked.req, blocked.res, blocked.next);
      expect(blocked.res.status).toHaveBeenCalledWith(503);

      jest.advanceTimersByTime(1_500);

      const after = mockReqRes();
      breaker(after.req, after.res, after.next);
      expect(after.next).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('would have stopped the 2026-08-04 attack well short of 82 charges', () => {
    // The real attack: 82 checkout initiations in ~25 minutes. With a 25/hour
    // platform ceiling, initiation 26 onward is refused.
    const breaker = createVelocityBreaker({ windowMs: 60 * 60 * 1000, max: 25, onTrip: () => {} });

    let allowed = 0;
    let refused = 0;
    for (let i = 0; i < 82; i++) {
      const { req, res, next } = mockReqRes();
      breaker(req, res, next);
      if (next.mock.calls.length) allowed++;
      else refused++;
    }

    expect(allowed).toBe(25);
    expect(refused).toBe(57);
  });
});

describe('checkJobAmount', () => {
  it('rejects the $10 amount used in the card-testing attack', () => {
    const result = checkJobAmount(1000);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('below_min');
  });

  it('rejects Stripe-minimum dust amounts', () => {
    expect(checkJobAmount(50).ok).toBe(false);
  });

  it('accepts a realistic local job', () => {
    expect(checkJobAmount(15000).ok).toBe(true); // $150 junk removal
    expect(checkJobAmount(8000).ok).toBe(true); // $80 yard work
  });

  it('accepts the largest real job posted to date', () => {
    expect(checkJobAmount(190000).ok).toBe(true); // $1,900 fencing
  });

  it('sends implausibly large jobs to manual review', () => {
    const result = checkJobAmount(2000000); // $20,000
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('above_max');
    expect(result.message).toContain('support@tryhardly.com');
  });
});
