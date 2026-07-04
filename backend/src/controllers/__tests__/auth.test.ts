/**
 * Unit tests for authController.login and the authenticate middleware, focused on
 * the account-deletion guard: a finalized (soft-deleted) account must not be able
 * to log in or use an outstanding JWT. prisma, bcrypt and jwt are mocked.
 */

const mockPrisma = {
  user: { findUnique: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(() => 'signed.jwt.token'), verify: jest.fn() }));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { login } from '../authController';
import { authenticate } from '../../middleware/authMiddleware';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const activeUser = {
  id: 'u1',
  email: 'projhub10x@gmail.com',
  username: 'projhub10x',
  passwordHash: 'hash',
  role: 'USER',
  accountStatus: 'ACTIVE',
  deletedAt: null,
  level: 1,
  xp: 0,
  displayName: 'Proj Hub',
  adventurerClass: 'WARRIOR',
};

describe('login (account-deletion guard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('issues a token for an active account with a valid password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(activeUser);
    const res = mockRes();
    await login({ body: { email: activeUser.email, password: 'pw' } } as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'signed.jwt.token' }));
  });

  it('rejects a finalized (deletedAt) account even with the correct password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, deletedAt: new Date(), accountStatus: 'DELETED' });
    const res = mockRes();
    await login({ body: { email: activeUser.email, password: 'pw' } } as any, res);
    // Same generic 401 as bad credentials — no disclosure that the account existed.
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('rejects an account flagged DELETED without a deletedAt timestamp', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, accountStatus: 'DELETED' });
    const res = mockRes();
    await login({ body: { email: activeUser.email, password: 'pw' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});

describe('authenticate middleware (account-deletion guard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'u1' });
  });

  it('passes an active user through', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(activeUser);
    const req: any = { headers: { authorization: 'Bearer tok' } };
    const res = mockRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(expect.objectContaining({ id: 'u1' }));
  });

  it('rejects an outstanding JWT for a soft-deleted user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, deletedAt: new Date(), accountStatus: 'DELETED' });
    const req: any = { headers: { authorization: 'Bearer tok' } };
    const res = mockRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
