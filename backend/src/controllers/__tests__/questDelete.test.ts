const mockPrisma = {
  quest: {
    findUnique: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  application: { deleteMany: jest.fn() },
  milestone: { deleteMany: jest.fn() },
  review: { deleteMany: jest.fn() },
  skillRating: { deleteMany: jest.fn() },
  message: { deleteMany: jest.fn() },
  proofOfWork: { deleteMany: jest.fn() },
  handshake: { deleteMany: jest.fn() },
  // $transaction echoes the array of operation results, like Prisma does for an
  // array of promises.
  $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
};

jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../../services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../../services/progressionService', () => ({ awardCompletionXp: jest.fn() }));
jest.mock('../../services/reviewStatusService', () => ({ findQuestIdsReviewedBy: jest.fn() }));
jest.mock('../../services/workerMatchService', () => ({ notifyMatchingWorkersForQuest: jest.fn() }));

import { deleteQuest } from '../questController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const OPEN_QUEST = { id: 'q1', questGiverId: 'u1', status: 'OPEN' };

describe('deleteQuest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes an open quest and its child rows in one transaction', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    const res = mockRes();
    await deleteQuest({ user: { id: 'u1' }, params: { id: 'q1' } } as any, res);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    // 7 child-table deletes + unlinking recurrence children + the quest delete.
    expect(ops).toHaveLength(9);
    expect(res.json).toHaveBeenCalledWith({ message: 'Quest deleted' });
  });

  it('returns 404 when the quest does not exist', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await deleteQuest({ user: { id: 'u1' }, params: { id: 'nope' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 403 when the requester is not the owner', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    const res = mockRes();
    await deleteQuest({ user: { id: 'u2' }, params: { id: 'q1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses to delete a quest that is in progress', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ ...OPEN_QUEST, status: 'IN_PROGRESS' });
    const res = mockRes();
    await deleteQuest({ user: { id: 'u1' }, params: { id: 'q1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses to delete a completed quest (reviews are trust records)', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ ...OPEN_QUEST, status: 'COMPLETED' });
    const res = mockRes();
    await deleteQuest({ user: { id: 'u1' }, params: { id: 'q1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows deleting a cancelled quest', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ ...OPEN_QUEST, status: 'CANCELLED' });
    const res = mockRes();
    await deleteQuest({ user: { id: 'u1' }, params: { id: 'q1' } } as any, res);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Quest deleted' });
  });
});
