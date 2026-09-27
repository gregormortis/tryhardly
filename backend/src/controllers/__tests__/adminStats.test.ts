const mockPrisma = {
  user: { count: jest.fn() },
  quest: { count: jest.fn() },
  application: { count: jest.fn(), findMany: jest.fn() },
  // $transaction echoes the array of operation results, like Prisma does for an
  // array of promises.
  $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
// The VM's @prisma/client stub has no generated enums (no engine binaries
// offline); stub the ones adminController references. Real CI uses the
// generated client.
jest.mock('@prisma/client', () => ({
  QuestStatus: { OPEN: 'OPEN', COMPLETED: 'COMPLETED' },
}));

import { getStats } from '../adminController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('getStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns totals plus 24h/7d trends and the worker count', async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(42) // users
      .mockResolvedValueOnce(5) // newUsers24h
      .mockResolvedValueOnce(11); // newUsers7d
    mockPrisma.quest.count
      .mockResolvedValueOnce(30) // quests
      .mockResolvedValueOnce(3) // openQuests
      .mockResolvedValueOnce(20) // completedQuests
      .mockResolvedValueOnce(4); // newQuests7d
    mockPrisma.application.count.mockResolvedValue(55);
    mockPrisma.application.findMany.mockResolvedValue([
      // Prisma applies distinct:['adventurerId'] before returning these.
      { adventurerId: 'u1' },
      { adventurerId: 'u2' },
    ]);

    const res = mockRes();
    await getStats({} as any, res);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(9);
    expect(res.json).toHaveBeenCalledWith({
      users: 42,
      quests: 30,
      openQuests: 3,
      completedQuests: 20,
      applications: 55,
      newUsers24h: 5,
      newUsers7d: 11,
      newQuests7d: 4,
      workers: 2,
    });
  });

  it('returns 500 when a count fails', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('db down'));
    const res = mockRes();
    await getStats({} as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch stats' });
  });
});
