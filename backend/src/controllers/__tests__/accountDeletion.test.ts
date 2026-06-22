const mockPrisma = {
  user: { findUnique: jest.fn() },
  accountDeletionRequest: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('../../services/mailerService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailTemplates: {
    accountDeletionRequested: jest.fn(() => ({ to: 'u@e.com', subject: 's', text: 't' })),
    accountDeletionSupportAlert: jest.fn(() => ({ to: 's@e.com', subject: 's', text: 't' })),
  },
}));

import {
  requestAccountDeletion,
  cancelMyDeletionRequest,
  updateDeletionRequest,
} from '../accountDeletionController';
import { sendEmail } from '../../services/mailerService';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

describe('requestAccountDeletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPPORT_EMAIL;
  });

  it('404s when the user is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await requestAccountDeletion({ user: { id: 'u1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.accountDeletionRequest.create).not.toHaveBeenCalled();
  });

  it('is idempotent: returns the existing pending request without creating', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'u@e.com', username: 'u' });
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue({
      id: 'd1',
      status: 'PENDING',
      createdAt: new Date('2026-06-01'),
    });
    const res = mockRes();
    await requestAccountDeletion({ user: { id: 'u1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'd1', status: 'PENDING', alreadyRequested: true }),
    );
    expect(mockPrisma.accountDeletionRequest.create).not.toHaveBeenCalled();
  });

  it('creates a request and sends the user confirmation but no support alert when SUPPORT_EMAIL is unset', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'u@e.com', username: 'u' });
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
    mockPrisma.accountDeletionRequest.create.mockResolvedValue({
      id: 'd2',
      status: 'PENDING',
      createdAt: new Date('2026-06-02'),
    });
    const res = mockRes();
    await requestAccountDeletion({ user: { id: 'u1' }, body: { reason: '  bye  ' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const createArg = mockPrisma.accountDeletionRequest.create.mock.calls[0][0];
    expect(createArg.data.reason).toBe('bye');
    expect(createArg.data.userId).toBe('u1');
    // Only the user-confirmation email; no support alert without SUPPORT_EMAIL.
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('also sends a support alert when SUPPORT_EMAIL is configured', async () => {
    process.env.SUPPORT_EMAIL = 'ops@example.com';
    jest.resetModules();
    // Re-import so the module picks up the env var at load time.
    const ctrl = require('../accountDeletionController');
    const mailer = require('../../services/mailerService');
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'u@e.com', username: 'u' });
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
    mockPrisma.accountDeletionRequest.create.mockResolvedValue({
      id: 'd3',
      status: 'PENDING',
      createdAt: new Date('2026-06-03'),
    });
    const res = mockRes();
    await ctrl.requestAccountDeletion({ user: { id: 'u1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mailer.sendEmail).toHaveBeenCalledTimes(2);
  });
});

describe('cancelMyDeletionRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s when there is no pending request', async () => {
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await cancelMyDeletionRequest({ user: { id: 'u1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.accountDeletionRequest.update).not.toHaveBeenCalled();
  });

  it('cancels the pending request and returns 204', async () => {
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue({ id: 'd1', status: 'PENDING' });
    mockPrisma.accountDeletionRequest.update.mockResolvedValue({ id: 'd1', status: 'CANCELLED' });
    const res = mockRes();
    await cancelMyDeletionRequest({ user: { id: 'u1' } } as any, res);
    expect(mockPrisma.accountDeletionRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'd1' }, data: { status: 'CANCELLED' } }),
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('updateDeletionRequest (admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid status', async () => {
    const res = mockRes();
    await updateDeletionRequest({ user: { id: 'a' }, params: { id: 'd1' }, body: { status: 'WAT' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404s when the request is missing', async () => {
    mockPrisma.accountDeletionRequest.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await updateDeletionRequest(
      { user: { id: 'a' }, params: { id: 'd1' }, body: { status: 'COMPLETED' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('stamps handler fields on a terminal status', async () => {
    mockPrisma.accountDeletionRequest.findUnique.mockResolvedValue({ id: 'd1', handlerNote: null });
    mockPrisma.accountDeletionRequest.update.mockResolvedValue({ id: 'd1', status: 'COMPLETED' });
    const res = mockRes();
    await updateDeletionRequest(
      { user: { id: 'admin' }, params: { id: 'd1' }, body: { status: 'completed', handlerNote: ' done ' } } as any,
      res,
    );
    const arg = mockPrisma.accountDeletionRequest.update.mock.calls[0][0];
    expect(arg.data.status).toBe('COMPLETED');
    expect(arg.data.handledById).toBe('admin');
    expect(arg.data.handledAt).toBeInstanceOf(Date);
    expect(arg.data.handlerNote).toBe('done');
  });
});
