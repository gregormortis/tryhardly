const mockPrisma = {
  user: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

import { getMyPledge, pledgeCodeOfCraft, withdrawPledge } from '../professionalismController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('getMyPledge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports not pledged when timestamp is null', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ codeOfCraftPledgedAt: null });
    const res = mockRes();
    await getMyPledge({ user: { id: 'u1' } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ pledged: false, pledgedAt: null });
  });

  it('reports pledged with the timestamp when set', async () => {
    const at = new Date('2026-01-01T00:00:00Z');
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ codeOfCraftPledgedAt: at });
    const res = mockRes();
    await getMyPledge({ user: { id: 'u1' } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ pledged: true, pledgedAt: at });
  });
});

describe('pledgeCodeOfCraft', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records a new pledge timestamp', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ codeOfCraftPledgedAt: null });
    mockPrisma.user.update.mockResolvedValue({ codeOfCraftPledgedAt: new Date() });
    const res = mockRes();
    await pledgeCodeOfCraft({ user: { id: 'u1' } } as any, res);
    expect(mockPrisma.user.update).toHaveBeenCalled();
    const arg = mockPrisma.user.update.mock.calls[0][0];
    expect(arg.data.codeOfCraftPledgedAt).toBeInstanceOf(Date);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('is idempotent — preserves an existing pledge date', async () => {
    const at = new Date('2025-06-01T00:00:00Z');
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ codeOfCraftPledgedAt: at });
    const res = mockRes();
    await pledgeCodeOfCraft({ user: { id: 'u1' } } as any, res);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ pledged: true, pledgedAt: at });
  });
});

describe('withdrawPledge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears the pledge timestamp', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'u1' });
    const res = mockRes();
    await withdrawPledge({ user: { id: 'u1' } } as any, res);
    const arg = mockPrisma.user.update.mock.calls[0][0];
    expect(arg.data.codeOfCraftPledgedAt).toBeNull();
    expect(res.json).toHaveBeenCalledWith({ pledged: false, pledgedAt: null });
  });
});
