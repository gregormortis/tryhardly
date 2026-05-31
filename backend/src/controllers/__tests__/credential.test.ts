const mockPrisma = {
  professionalCredential: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: { findUnique: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

const mockCreateNotification = jest.fn();
jest.mock('../../services/notificationService', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

import {
  createCredential,
  updateCredential,
  deleteCredential,
  getPublicCredentials,
  reviewCredential,
} from '../credentialController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

describe('createCredential', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid type', async () => {
    const res = mockRes();
    await createCredential(
      { user: { id: 'u1' }, body: { type: 'BOGUS', title: 'x' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.professionalCredential.create).not.toHaveBeenCalled();
  });

  it('requires a title', async () => {
    const res = mockRes();
    await createCredential({ user: { id: 'u1' }, body: { type: 'LICENSE', title: '  ' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a PENDING credential scoped to the caller with a normalized type', async () => {
    mockPrisma.professionalCredential.create.mockResolvedValue({ id: 'c1', status: 'PENDING' });
    const res = mockRes();
    await createCredential(
      { user: { id: 'u1' }, body: { type: 'license', title: ' C-10 Electrical ', issuer: ' CSLB ' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const arg = mockPrisma.professionalCredential.create.mock.calls[0][0];
    expect(arg.data.userId).toBe('u1');
    expect(arg.data.type).toBe('LICENSE');
    expect(arg.data.title).toBe('C-10 Electrical');
    expect(arg.data.issuer).toBe('CSLB');
    // status is not set explicitly — DB default PENDING applies.
    expect(arg.data.status).toBeUndefined();
  });
});

describe('updateCredential ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s when the credential belongs to another user', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue({ id: 'c1', userId: 'someone-else' });
    const res = mockRes();
    await updateCredential(
      { user: { id: 'u1' }, params: { id: 'c1' }, body: { title: 'new' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.professionalCredential.update).not.toHaveBeenCalled();
  });

  it('resets a VERIFIED credential to PENDING when a substantive field changes', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue({
      id: 'c1', userId: 'u1', status: 'VERIFIED', type: 'LICENSE', title: 'Old',
      issuer: null, credentialNumber: null, jurisdiction: null, expirationDate: null,
      proofUrl: null, notes: null,
    });
    mockPrisma.professionalCredential.update.mockResolvedValue({ id: 'c1', status: 'PENDING' });
    const res = mockRes();
    await updateCredential(
      { user: { id: 'u1' }, params: { id: 'c1' }, body: { title: 'New title' } } as any,
      res,
    );
    const arg = mockPrisma.professionalCredential.update.mock.calls[0][0];
    expect(arg.data.status).toBe('PENDING');
    expect(arg.data.verifiedAt).toBeNull();
    expect(arg.data.verifiedById).toBeNull();
  });

  it('keeps a VERIFIED credential verified when only notes change', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue({
      id: 'c1', userId: 'u1', status: 'VERIFIED', type: 'LICENSE', title: 'Same',
      issuer: 'CSLB', credentialNumber: '123', jurisdiction: 'CA', expirationDate: null,
      proofUrl: 'https://example.com', notes: 'old',
    });
    mockPrisma.professionalCredential.update.mockResolvedValue({ id: 'c1', status: 'VERIFIED' });
    const res = mockRes();
    await updateCredential(
      { user: { id: 'u1' }, params: { id: 'c1' }, body: { notes: 'a fresh note' } } as any,
      res,
    );
    const arg = mockPrisma.professionalCredential.update.mock.calls[0][0];
    expect(arg.data.status).toBeUndefined();
    expect(arg.data.notes).toBe('a fresh note');
  });
});

describe('deleteCredential ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s and does not delete another user’s credential', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue({ id: 'c1', userId: 'other' });
    const res = mockRes();
    await deleteCredential({ user: { id: 'u1' }, params: { id: 'c1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.professionalCredential.delete).not.toHaveBeenCalled();
  });

  it('deletes the caller’s own credential', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue({ id: 'c1', userId: 'u1' });
    mockPrisma.professionalCredential.delete.mockResolvedValue({});
    const res = mockRes();
    await deleteCredential({ user: { id: 'u1' }, params: { id: 'c1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(mockPrisma.professionalCredential.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});

describe('getPublicCredentials', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only queries VERIFIED credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrisma.professionalCredential.findMany.mockResolvedValue([]);
    const res = mockRes();
    await getPublicCredentials({ params: { username: 'bob' } } as any, res);
    const arg = mockPrisma.professionalCredential.findMany.mock.calls[0][0];
    expect(arg.where.status).toBe('VERIFIED');
    expect(arg.where.userId).toBe('u1');
  });

  it('404s for an unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await getPublicCredentials({ params: { username: 'ghost' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('reviewCredential (admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid status', async () => {
    const res = mockRes();
    await reviewCredential({ user: { id: 'admin' }, params: { id: 'c1' }, body: { status: 'WAT' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404s when the credential is missing', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await reviewCredential(
      { user: { id: 'admin' }, params: { id: 'c1' }, body: { status: 'VERIFIED' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('stamps verifier fields and notifies the owner on VERIFIED', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue({ id: 'c1', userId: 'owner', title: 'License' });
    mockPrisma.professionalCredential.update.mockResolvedValue({ id: 'c1', status: 'VERIFIED', rejectionReason: null });
    const res = mockRes();
    await reviewCredential(
      { user: { id: 'admin' }, params: { id: 'c1' }, body: { status: 'verified' } } as any,
      res,
    );
    const arg = mockPrisma.professionalCredential.update.mock.calls[0][0];
    expect(arg.data.status).toBe('VERIFIED');
    expect(arg.data.verifiedById).toBe('admin');
    expect(arg.data.verifiedAt).toBeInstanceOf(Date);
    expect(arg.data.rejectionReason).toBeNull();
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0][0].type).toBe('CREDENTIAL_VERIFIED');
    expect(mockCreateNotification.mock.calls[0][0].userId).toBe('owner');
  });

  it('stores rejectionReason and notifies on REJECTED', async () => {
    mockPrisma.professionalCredential.findUnique.mockResolvedValue({ id: 'c1', userId: 'owner', title: 'License' });
    mockPrisma.professionalCredential.update.mockResolvedValue({
      id: 'c1', status: 'REJECTED', rejectionReason: 'blurry photo',
    });
    const res = mockRes();
    await reviewCredential(
      { user: { id: 'admin' }, params: { id: 'c1' }, body: { status: 'rejected', rejectionReason: ' blurry photo ' } } as any,
      res,
    );
    const arg = mockPrisma.professionalCredential.update.mock.calls[0][0];
    expect(arg.data.status).toBe('REJECTED');
    expect(arg.data.verifiedById).toBeNull();
    expect(arg.data.rejectionReason).toBe('blurry photo');
    expect(mockCreateNotification.mock.calls[0][0].type).toBe('CREDENTIAL_REJECTED');
  });
});
