const mockPrisma = {
  quest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../../services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../../services/progressionService', () => ({ awardCompletionXp: jest.fn() }));

import { createQuest, generateNextOccurrence } from '../questController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const BASE_BODY = {
  title: 'Weekly lawn mowing',
  description: 'Mow front and back',
  category: 'OTHER',
  difficulty: 'NOVICE',
  reward: 50,
  xpReward: 0,
  tags: [],
};

describe('createQuest recurrence handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a non-recurring quest by default', async () => {
    mockPrisma.quest.create.mockResolvedValue({ id: 'q1' });
    const res = mockRes();
    await createQuest({ user: { id: 'u1' }, body: { ...BASE_BODY } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const data = mockPrisma.quest.create.mock.calls[0][0].data;
    expect(data.isRecurring).toBe(false);
    expect(data.nextOccurrenceAt).toBeNull();
  });

  it('persists a valid recurring quest and computes nextOccurrenceAt', async () => {
    mockPrisma.quest.create.mockResolvedValue({ id: 'q2' });
    const res = mockRes();
    await createQuest(
      {
        user: { id: 'u1' },
        body: {
          ...BASE_BODY,
          deadline: '2026-07-01T00:00:00.000Z',
          isRecurring: true,
          recurrenceCadence: 'WEEKLY',
        },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const data = mockPrisma.quest.create.mock.calls[0][0].data;
    expect(data.isRecurring).toBe(true);
    expect(data.recurrenceCadence).toBe('WEEKLY');
    expect(new Date(data.nextOccurrenceAt).toISOString()).toBe('2026-07-08T00:00:00.000Z');
  });

  it('rejects a recurring quest without a cadence', async () => {
    const res = mockRes();
    await createQuest(
      { user: { id: 'u1' }, body: { ...BASE_BODY, isRecurring: true } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.quest.create).not.toHaveBeenCalled();
  });

  it('ignores client-supplied recurrenceParentId on create', async () => {
    mockPrisma.quest.create.mockResolvedValue({ id: 'q3' });
    const res = mockRes();
    await createQuest(
      { user: { id: 'u1' }, body: { ...BASE_BODY, recurrenceParentId: 'attacker' } } as any,
      res,
    );
    const data = mockPrisma.quest.create.mock.calls[0][0].data;
    expect(data.recurrenceParentId).toBeUndefined();
  });
});

describe('generateNextOccurrence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('403s when the caller is not the owner', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 't1', questGiverId: 'someone-else', isRecurring: true, recurrenceCadence: 'WEEKLY',
    });
    const res = mockRes();
    await generateNextOccurrence({ user: { id: 'u1' }, params: { id: 't1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('400s when the quest is not recurring', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 't1', questGiverId: 'u1', isRecurring: false, recurrenceCadence: null,
    });
    const res = mockRes();
    await generateNextOccurrence({ user: { id: 'u1' }, params: { id: 't1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('409s when the occurrence cap is reached', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 't1', questGiverId: 'u1', isRecurring: true, recurrenceCadence: 'WEEKLY',
      recurrenceInterval: 1, recurrenceCount: 3, nextOccurrenceAt: new Date('2026-07-08T00:00:00Z'),
      recurrenceEndDate: null, deadline: null,
    });
    mockPrisma.quest.count.mockResolvedValue(2); // 2 children + template = 3, at cap
    const res = mockRes();
    await generateNextOccurrence({ user: { id: 'u1' }, params: { id: 't1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('creates a linked occurrence and advances the template pointer', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 't1', questGiverId: 'u1', isRecurring: true, recurrenceCadence: 'WEEKLY',
      recurrenceInterval: 1, recurrenceCount: null, recurrenceEndDate: null,
      nextOccurrenceAt: new Date('2026-07-08T00:00:00Z'),
      title: 'Mow', description: 'd', category: 'OTHER', difficulty: 'NOVICE',
      reward: 50, currency: 'USD', xpReward: 0, tags: [], maxApplications: null, deadline: null,
    });
    const tx = {
      quest: {
        create: jest.fn().mockResolvedValue({ id: 'occ1', recurrenceParentId: 't1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(tx));
    const res = mockRes();
    await generateNextOccurrence({ user: { id: 'u1' }, params: { id: 't1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(tx.quest.create).toHaveBeenCalled();
    const created = tx.quest.create.mock.calls[0][0].data;
    expect(created.recurrenceParentId).toBe('t1');
    expect(created.isRecurring).toBe(false);
    expect(created.status).toBe('OPEN');
    // Template pointer advanced one week from 2026-07-08.
    const updated = tx.quest.update.mock.calls[0][0].data;
    expect(new Date(updated.nextOccurrenceAt).toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });
});
