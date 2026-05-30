/**
 * Unit tests for passwordResetController — prisma and the mailer are mocked, so
 * no DB or email vendor is required.
 */

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  passwordResetToken: {
    deleteMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('../../services/mailerService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailTemplates: { passwordReset: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })) },
}));

import { requestPasswordReset, resetPassword } from '../passwordResetController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('requestPasswordReset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a generic success even when the email is unknown (no account leak)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await requestPasswordReset({ body: { email: 'nobody@example.com' } } as any, res);

    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('reset link') }),
    );
    // Must not 404 / reveal the account does not exist.
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  it('creates a hashed token for a known email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({});
    mockPrisma.passwordResetToken.create.mockResolvedValue({});
    const res = mockRes();
    await requestPasswordReset({ body: { email: 'a@b.com' } } as any, res);

    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const createArg = mockPrisma.passwordResetToken.create.mock.calls[0][0];
    // The stored value must be a hash, never the raw token.
    expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArg.data.userId).toBe('u1');
  });

  it('rejects a missing email', async () => {
    const res = mockRes();
    await requestPasswordReset({ body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('resetPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an expired token', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() - 1000),
    });
    const res = mockRes();
    await resetPassword({ body: { token: 'abc', password: 'longenough' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an already-used token', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: new Date(), expiresAt: new Date(Date.now() + 100000),
    });
    const res = mockRes();
    await resetPassword({ body: { token: 'abc', password: 'longenough' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a short password', async () => {
    const res = mockRes();
    await resetPassword({ body: { token: 'abc', password: 'short' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('resets the password for a valid token', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() + 100000),
    });
    mockPrisma.$transaction.mockResolvedValue([]);
    const res = mockRes();
    await resetPassword({ body: { token: 'abc', password: 'longenough' } } as any, res);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('reset') }),
    );
  });
});
