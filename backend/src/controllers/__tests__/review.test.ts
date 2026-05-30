const mockPrisma = {
  quest: { findUnique: jest.fn() },
  review: { findUnique: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
  user: { update: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

import { createReview } from '../reviewController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const COMPLETED_QUEST = {
  id: 'q1',
  status: 'COMPLETED',
  questGiverId: 'giver',
  assignedAdventurerId: 'adv',
};

describe('createReview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an out-of-range rating', async () => {
    const res = mockRes();
    await createReview({ user: { id: 'giver' }, params: { questId: 'q1' }, body: { rating: 9, comment: 'x' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects reviewing a non-completed quest', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ ...COMPLETED_QUEST, status: 'IN_PROGRESS' });
    const res = mockRes();
    await createReview({ user: { id: 'giver' }, params: { questId: 'q1' }, body: { rating: 5, comment: 'great' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a non-participant', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(COMPLETED_QUEST);
    const res = mockRes();
    await createReview({ user: { id: 'stranger' }, params: { questId: 'q1' }, body: { rating: 5, comment: 'great' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('prevents a duplicate review', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(COMPLETED_QUEST);
    mockPrisma.review.findUnique.mockResolvedValue({ id: 'existing' });
    const res = mockRes();
    await createReview({ user: { id: 'giver' }, params: { questId: 'q1' }, body: { rating: 5, comment: 'great' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });

  it('creates a review attributed to the counterparty and updates reputation', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(COMPLETED_QUEST);
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue({ id: 'rev1' });
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: 1 });
    mockPrisma.user.update.mockResolvedValue({});
    const res = mockRes();
    await createReview({ user: { id: 'giver' }, params: { questId: 'q1' }, body: { rating: 5, comment: 'great' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const arg = mockPrisma.review.create.mock.calls[0][0];
    expect(arg.data.revieweeId).toBe('adv'); // giver reviews the adventurer
    expect(arg.data.reviewerId).toBe('giver');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'adv' }, data: { reputationScore: 100 } }),
    );
  });
});
