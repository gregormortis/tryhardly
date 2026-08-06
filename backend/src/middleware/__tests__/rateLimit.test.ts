import { rateLimit } from '../rateLimit';

function mockReqRes(overrides: any = {}) {
  const req: any = {
    headers: {},
    ip: '1.2.3.4',
    socket: { remoteAddress: '1.2.3.4' },
    ...overrides,
  };
  const res: any = {};
  res.setHeader = jest.fn();
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  const next = jest.fn();
  return { req, res, next };
}

describe('rateLimit', () => {
  it('keys by IP by default, allowing different users behind different IPs independently', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1, keyPrefix: 'test-ip' });

    const a = mockReqRes({ ip: '1.1.1.1', user: { id: 'userA' } });
    const b = mockReqRes({ ip: '2.2.2.2', user: { id: 'userB' } });

    limiter(a.req, a.res, a.next);
    limiter(b.req, b.res, b.next);

    expect(a.next).toHaveBeenCalledTimes(1);
    expect(b.next).toHaveBeenCalledTimes(1);
    expect(a.res.status).not.toHaveBeenCalled();
    expect(b.res.status).not.toHaveBeenCalled();
  });

  it('keys by user id when keyBy is "user", limiting one account across different IPs', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1, keyPrefix: 'test-user', keyBy: 'user' });

    const first = mockReqRes({ ip: '1.1.1.1', user: { id: 'same-user' } });
    const second = mockReqRes({ ip: '9.9.9.9', user: { id: 'same-user' } }); // different IP, same user

    limiter(first.req, first.res, first.next);
    limiter(second.req, second.res, second.next);

    expect(first.next).toHaveBeenCalledTimes(1);
    // Second request from the SAME user but a DIFFERENT IP should still be blocked.
    expect(second.next).not.toHaveBeenCalled();
    expect(second.res.status).toHaveBeenCalledWith(429);
  });

  it('does not block a different user sharing the same limiter when keyBy is "user"', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1, keyPrefix: 'test-user2', keyBy: 'user' });

    const userA = mockReqRes({ user: { id: 'userA' } });
    const userB = mockReqRes({ user: { id: 'userB' } });

    limiter(userA.req, userA.res, userA.next);
    limiter(userB.req, userB.res, userB.next);

    expect(userA.next).toHaveBeenCalledTimes(1);
    expect(userB.next).toHaveBeenCalledTimes(1);
  });

  it('blocks after exceeding max within the window and includes Retry-After', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2, keyPrefix: 'test-max' });
    const calls = [mockReqRes(), mockReqRes(), mockReqRes()];

    calls.forEach(({ req, res, next }) => limiter(req, res, next));

    expect(calls[0].next).toHaveBeenCalledTimes(1);
    expect(calls[1].next).toHaveBeenCalledTimes(1);
    expect(calls[2].next).not.toHaveBeenCalled();
    expect(calls[2].res.status).toHaveBeenCalledWith(429);
    expect(calls[2].res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});
