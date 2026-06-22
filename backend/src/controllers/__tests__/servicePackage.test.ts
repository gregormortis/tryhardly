const mockPrisma = {
  servicePackage: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: { findUnique: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

import {
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  browseServicePackages,
  getPublicServicePackages,
  getServicePackage,
} from '../servicePackageController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

describe('createServicePackage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a title', async () => {
    const res = mockRes();
    await createServicePackage({ user: { id: 'u1' }, body: { title: '  ', category: 'yard' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.servicePackage.create).not.toHaveBeenCalled();
  });

  it('requires a category', async () => {
    const res = mockRes();
    await createServicePackage({ user: { id: 'u1' }, body: { title: 'Dump Run' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an invalid price type', async () => {
    const res = mockRes();
    await createServicePackage(
      { user: { id: 'u1' }, body: { title: 'x', category: 'yard', priceType: 'BOGUS' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.servicePackage.create).not.toHaveBeenCalled();
  });

  it('creates an inactive package scoped to the caller, normalizing fields', async () => {
    mockPrisma.servicePackage.create.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await createServicePackage(
      {
        user: { id: 'u1' },
        body: {
          title: ' Dump Run — Pickup Truck Load ',
          category: 'Hauling',
          priceType: 'flat_rate',
          startingPrice: '85',
          currency: 'usd',
        },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const arg = mockPrisma.servicePackage.create.mock.calls[0][0];
    expect(arg.data.userId).toBe('u1');
    expect(arg.data.title).toBe('Dump Run — Pickup Truck Load');
    expect(arg.data.category).toBe('hauling');
    expect(arg.data.priceType).toBe('FLAT_RATE');
    expect(arg.data.currency).toBe('USD');
    expect(String(arg.data.startingPrice)).toBe('85');
    // active defaults to false (not published) unless explicitly set true.
    expect(arg.data.active).toBe(false);
  });

  it('clears the price for QUOTE_NEEDED listings even if a number is sent', async () => {
    mockPrisma.servicePackage.create.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await createServicePackage(
      {
        user: { id: 'u1' },
        body: { title: 'Custom job', category: 'handyman', priceType: 'QUOTE_NEEDED', startingPrice: '50' },
      } as any,
      res,
    );
    const arg = mockPrisma.servicePackage.create.mock.calls[0][0];
    expect(arg.data.priceType).toBe('QUOTE_NEEDED');
    expect(arg.data.startingPrice).toBeNull();
  });

  it('drops a negative price to null', async () => {
    mockPrisma.servicePackage.create.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await createServicePackage(
      { user: { id: 'u1' }, body: { title: 'x', category: 'yard', startingPrice: '-10' } } as any,
      res,
    );
    const arg = mockPrisma.servicePackage.create.mock.calls[0][0];
    expect(arg.data.startingPrice).toBeNull();
  });
});

describe('updateServicePackage ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s when the package belongs to another user', async () => {
    mockPrisma.servicePackage.findUnique.mockResolvedValue({ id: 'p1', userId: 'someone-else' });
    const res = mockRes();
    await updateServicePackage(
      { user: { id: 'u1' }, params: { id: 'p1' }, body: { title: 'new' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.servicePackage.update).not.toHaveBeenCalled();
  });

  it('clears the price when switching an existing package to QUOTE_NEEDED', async () => {
    mockPrisma.servicePackage.findUnique.mockResolvedValue({
      id: 'p1', userId: 'u1', title: 'x', category: 'yard', priceType: 'FLAT_RATE',
      startingPrice: '85', currency: 'USD', description: null, includedScope: null,
      addOns: null, exclusions: null, materialsPolicy: null, serviceArea: null,
      availability: null, toolsProvided: null, imageUrl: null, active: true,
    });
    mockPrisma.servicePackage.update.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await updateServicePackage(
      { user: { id: 'u1' }, params: { id: 'p1' }, body: { priceType: 'QUOTE_NEEDED' } } as any,
      res,
    );
    const arg = mockPrisma.servicePackage.update.mock.calls[0][0];
    expect(arg.data.priceType).toBe('QUOTE_NEEDED');
    expect(arg.data.startingPrice).toBeNull();
  });
});

describe('deleteServicePackage ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s and does not delete another user’s package', async () => {
    mockPrisma.servicePackage.findUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
    const res = mockRes();
    await deleteServicePackage({ user: { id: 'u1' }, params: { id: 'p1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.servicePackage.delete).not.toHaveBeenCalled();
  });

  it('deletes the caller’s own package', async () => {
    mockPrisma.servicePackage.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    mockPrisma.servicePackage.delete.mockResolvedValue({});
    const res = mockRes();
    await deleteServicePackage({ user: { id: 'u1' }, params: { id: 'p1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(mockPrisma.servicePackage.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });
});

describe('browseServicePackages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only returns active packages and applies a category filter', async () => {
    mockPrisma.servicePackage.findMany.mockResolvedValue([]);
    const res = mockRes();
    await browseServicePackages({ query: { category: 'Yard' } } as any, res);
    const arg = mockPrisma.servicePackage.findMany.mock.calls[0][0];
    expect(arg.where.active).toBe(true);
    expect(arg.where.category).toBe('yard');
  });

  it('builds an OR search when q is provided', async () => {
    mockPrisma.servicePackage.findMany.mockResolvedValue([]);
    const res = mockRes();
    await browseServicePackages({ query: { q: 'mow' } } as any, res);
    const arg = mockPrisma.servicePackage.findMany.mock.calls[0][0];
    expect(arg.where.active).toBe(true);
    expect(Array.isArray(arg.where.OR)).toBe(true);
  });
});

describe('getPublicServicePackages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only queries active packages for the resolved user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrisma.servicePackage.findMany.mockResolvedValue([]);
    const res = mockRes();
    await getPublicServicePackages({ params: { username: 'bob' } } as any, res);
    const arg = mockPrisma.servicePackage.findMany.mock.calls[0][0];
    expect(arg.where.active).toBe(true);
    expect(arg.where.userId).toBe('u1');
  });

  it('404s for an unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await getPublicServicePackages({ params: { username: 'ghost' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('getServicePackage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s for an inactive package', async () => {
    mockPrisma.servicePackage.findUnique.mockResolvedValue({ id: 'p1', active: false });
    const res = mockRes();
    await getServicePackage({ params: { id: 'p1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns an active package', async () => {
    mockPrisma.servicePackage.findUnique.mockResolvedValue({ id: 'p1', active: true });
    const res = mockRes();
    await getServicePackage({ params: { id: 'p1' } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ id: 'p1', active: true });
  });
});
