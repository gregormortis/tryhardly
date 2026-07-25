// The quest detail page hides its "Leave a review" prompt once the viewer has
// already reviewed, but it can only do that if the detail endpoint reports the
// same `viewerHasReviewed` signal the list endpoints already send. Reviews are
// unique per (quest, reviewer), so a second attempt is a hard error — the button
// must never be offered twice.

const mockPrisma = {
  quest: { findUnique: jest.fn() },
  review: { findMany: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

import { getQuestById } from '../questController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.quest.findUnique.mockResolvedValue({
    id: 'q1',
    title: 'Fence repair',
    status: 'COMPLETED',
    questGiverId: 'poster',
    assignedAdventurerId: 'worker',
  });
  mockPrisma.review.findMany.mockResolvedValue([]);
});

describe('getQuestById review state', () => {
  it('reports viewerHasReviewed=true once the caller has reviewed the quest', async () => {
    mockPrisma.review.findMany.mockResolvedValue([{ questId: 'q1' }]);

    const res = mockRes();
    await getQuestById({ params: { id: 'q1' }, user: { id: 'poster' } } as any, res);

    expect(res.json.mock.calls[0][0].viewerHasReviewed).toBe(true);
  });

  it('reports viewerHasReviewed=false when the caller has not reviewed yet', async () => {
    const res = mockRes();
    await getQuestById({ params: { id: 'q1' }, user: { id: 'poster' } } as any, res);

    expect(res.json.mock.calls[0][0].viewerHasReviewed).toBe(false);
  });

  it('still serves the quest to an anonymous viewer', async () => {
    const res = mockRes();
    await getQuestById({ params: { id: 'q1' } } as any, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].id).toBe('q1');
    expect(mockPrisma.review.findMany).not.toHaveBeenCalled();
  });
});
