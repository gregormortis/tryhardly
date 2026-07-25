// A worker whose bid was accepted has to be able to get back into the job, but
// the quest leaves the public board the moment it starts. The worker dashboard
// therefore links straight to the quest detail page using the ids and statuses
// returned here. These tests pin that contract so trimming a `select` or adding
// a status guard can't silently strand assigned workers again.

const mockPrisma = {
  quest: {
    findUnique: jest.fn(),
  },
  application: {
    findMany: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
  },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

import { getMyApplications } from '../applicationController';
import { getQuestById } from '../questController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('getMyApplications — worker dashboard link data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.review.findMany.mockResolvedValue([]);
  });

  it('selects the quest id and status the dashboard needs to build a job link', async () => {
    mockPrisma.application.findMany.mockResolvedValue([]);

    await getMyApplications({ user: { id: 'worker1' } } as any, mockRes());

    const args = mockPrisma.application.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ adventurerId: 'worker1' });
    expect(args.include.quest.select).toMatchObject({ id: true, status: true });
  });

  it('returns accepted assignments on quests that have left the public board', async () => {
    const accepted = {
      id: 'a1',
      questId: 'q1',
      status: 'ACCEPTED',
      quest: { id: 'q1', title: 'Fencing 100 ft', status: 'IN_PROGRESS', reward: '1200' },
    };
    mockPrisma.application.findMany.mockResolvedValue([accepted]);

    const res = mockRes();
    await getMyApplications({ user: { id: 'worker1' } } as any, res);

    expect(res.json).toHaveBeenCalledWith([
      { ...accepted, quest: { ...accepted.quest, viewerHasReviewed: false } },
    ]);
  });
});

describe('getQuestById — access for assigned workers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serves a quest that is no longer OPEN, without a status filter', async () => {
    const quest = {
      id: 'q1',
      status: 'IN_PROGRESS',
      questGiverId: 'owner1',
      assignedAdventurerId: 'worker1',
    };
    mockPrisma.quest.findUnique.mockResolvedValue(quest);

    const res = mockRes();
    await getQuestById({ params: { id: 'q1' } } as any, res);

    expect(mockPrisma.quest.findUnique.mock.calls[0][0].where).toEqual({ id: 'q1' });
    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(quest);
  });

  it('exposes assignedAdventurerId so the client can render worker-only actions', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      status: 'IN_REVIEW',
      assignedAdventurerId: 'worker1',
    });

    const res = mockRes();
    await getQuestById({ params: { id: 'q1' } } as any, res);

    expect(res.json.mock.calls[0][0].assignedAdventurerId).toBe('worker1');
  });
});
