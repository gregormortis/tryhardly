/**
 * Unit tests for emailVerificationController — prisma and the mailer are
 * mocked, so no DB or email vendor is required.
 */

const mockPrisma = {
  user: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
  emailVerificationToken: {
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
  emailTemplates: { verifyEmail: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })) },
}));

import {
  verifyEmail,
  resendVerification,
  issueVerificationEmail,
} from '../emailVerificationController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('issueVerificationEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('invalidates outstanding tokens and creates a fresh hashed token', async () => {
    mockPrisma.emailVerificationToken.deleteMany.mockResolvedValue({});
    mockPrisma.emailVerificationToken.create.mockResolvedValue({});

    await issueVerificationEmail('u1', 'a@b.com');

    expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', usedAt: null },
    });
    expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);
    const createArg = mockPrisma.emailVerificationToken.create.mock.calls[0][0];
    // The stored value must be a hash, never the raw token.
    expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArg.data.userId).toBe('u1');
  });
});

describe('verifyEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing token', async () => {
    const res = mockRes();
    await verifyEmail({ body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an expired token', async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() - 1000),
    });
    const res = mockRes();
    await verifyEmail({ body: { token: 'abc' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an already-used token', async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: new Date(), expiresAt: new Date(Date.now() + 100000),
    });
    const res = mockRes();
    await verifyEmail({ body: { token: 'abc' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('marks the email verified for a valid token', async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() + 100000),
    });
    mockPrisma.$transaction.mockResolvedValue([]);
    const res = mockRes();
    await verifyEmail({ body: { token: 'abc' } } as any, res);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('verified') }),
    );
  });
});

describe('resendVerification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('short-circuits with a friendly message when already verified', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1', email: 'a@b.com', emailVerifiedAt: new Date(),
    });
    const res = mockRes();
    await resendVerification({ user: { id: 'u1' } } as any, res);

    expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('already verified') }),
    );
  });

  it('issues a new verification email when not yet verified', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1', email: 'a@b.com', emailVerifiedAt: null,
    });
    mockPrisma.emailVerificationToken.deleteMany.mockResolvedValue({});
    mockPrisma.emailVerificationToken.create.mockResolvedValue({});
    const res = mockRes();
    await resendVerification({ user: { id: 'u1' } } as any, res);

    expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('sent') }),
    );
  });
});
