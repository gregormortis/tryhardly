const mockPrisma = {
  quest: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  application: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  // $transaction echoes the array of operation results, like Prisma does for an
  // array of promises. Each element here is already the resolved value we set on
  // the individual mocks.
  $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn(async () => undefined),
}));
jest.mock('../../services/mailerService', () => ({
  sendEmail: jest.fn(async () => undefined),
  emailTemplates: {
    newApplication: jest.fn(() => ({})),
    applicationAccepted: jest.fn(() => ({})),
    applicationRejected: jest.fn(() => ({})),
  },
}));

import { applyToQuest, acceptApplication } from '../applicationController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const OPEN_QUEST = {
  id: 'q1',
  status: 'OPEN',
  questGiverId: 'owner1',
  title: 'Build a fence',
};

describe('applyToQuest — detailed bid payload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists the full bid (amounts, materials, walkthrough) and ignores invalid values', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.application.findFirst.mockResolvedValue(null);
    mockPrisma.application.create.mockResolvedValue({
      id: 'a1',
      adventurer: { username: 'worker1' },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'owner@example.com' });

    const res = mockRes();
    await applyToQuest(
      {
        params: { questId: 'q1' },
        user: { id: 'worker1' },
        body: {
          bidAmount: '750',
          materialCostEstimate: 300,
          laborCostEstimate: 450,
          estimatedLaborHours: 12,
          // Negative cost should be dropped by sanitization, name kept.
          materialItems: [
            { name: 'Cedar picket', quantity: '50', unit: 'ea', estimatedCost: '6' },
            { name: '', quantity: 5 }, // dropped: no name
            { name: 'Concrete', estimatedCost: -10 }, // cost dropped, item kept
          ],
          toolsNeeded: 'Post-hole digger, drill',
          timeline: 'Start Monday, ~2 days',
          walkthroughType: 'in_person',
          proposedWalkthroughTimes: 'Sat AM',
          bidNotes: 'Includes haul-away.',
          legalQualificationAck: true,
        },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.application.create).toHaveBeenCalledTimes(1);
    const data = mockPrisma.application.create.mock.calls[0][0].data;

    expect(data.bidAmount).toBe(750);
    expect(data.materialCostEstimate).toBe(300);
    expect(data.laborCostEstimate).toBe(450);
    expect(data.estimatedLaborHours).toBe(12);
    expect(data.toolsNeeded).toBe('Post-hole digger, drill');
    expect(data.walkthroughRequested).toBe(true);
    expect(data.walkthroughType).toBe('IN_PERSON');
    expect(data.proposedWalkthroughTimes).toBe('Sat AM');
    expect(data.legalQualificationAck).toBe(true);

    // Two valid material rows survive; the nameless one is dropped.
    expect(data.materialItems).toHaveLength(2);
    expect(data.materialItems[0]).toMatchObject({ name: 'Cedar picket', quantity: 50, estimatedCost: 6 });
    expect(data.materialItems[1]).toMatchObject({ name: 'Concrete', estimatedCost: null });
  });

  it('rejects an empty application (no cover letter, no bid)', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.application.findFirst.mockResolvedValue(null);

    const res = mockRes();
    await applyToQuest(
      { params: { questId: 'q1' }, user: { id: 'worker1' }, body: {} } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.application.create).not.toHaveBeenCalled();
  });

  it('blocks a bid whose notes share off-platform contact info', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.application.findFirst.mockResolvedValue(null);

    const res = mockRes();
    await applyToQuest(
      {
        params: { questId: 'q1' },
        user: { id: 'worker1' },
        body: { bidAmount: '500', bidNotes: 'Call me at 555-123-4567 to arrange.' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'For safety, keep contact details and payment arrangements on TryHardly until a bid is accepted.',
    });
    expect(mockPrisma.application.create).not.toHaveBeenCalled();
  });

  it('allows a bid with legitimate material/measurement notes', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.application.findFirst.mockResolvedValue(null);
    mockPrisma.application.create.mockResolvedValue({ id: 'a3', adventurer: { username: 'w' } });
    mockPrisma.user.findUnique.mockResolvedValue({ email: null });

    const res = mockRes();
    await applyToQuest(
      {
        params: { questId: 'q1' },
        user: { id: 'worker1' },
        body: {
          bidAmount: '500',
          bidNotes: 'Includes 12 T-posts and twenty 2x4 boards; deck is 10x12, about 8 ft tall.',
        },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.application.create).toHaveBeenCalledTimes(1);
  });

  it('defaults walkthrough fields when none requested', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.application.findFirst.mockResolvedValue(null);
    mockPrisma.application.create.mockResolvedValue({ id: 'a2', adventurer: { username: 'w' } });
    mockPrisma.user.findUnique.mockResolvedValue({ email: null });

    const res = mockRes();
    await applyToQuest(
      {
        params: { questId: 'q1' },
        user: { id: 'worker1' },
        body: { coverLetter: 'I can do this.' },
      } as any,
      res
    );

    const data = mockPrisma.application.create.mock.calls[0][0].data;
    expect(data.walkthroughRequested).toBe(false);
    expect(data.walkthroughType).toBe('NONE');
    expect(data.bidAmount).toBeUndefined();
  });
});

describe('acceptApplication — multi-bid selection + payment handoff', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets quest.reward to the accepted bid and rejects only the other bids', async () => {
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'a1',
      adventurerId: 'worker1',
      questId: 'q1',
      bidAmount: 825,
      quest: { id: 'q1', questGiverId: 'owner1', title: 'Build a fence' },
    });
    mockPrisma.application.update.mockResolvedValue({ id: 'a1', status: 'ACCEPTED' });
    mockPrisma.quest.update.mockResolvedValue({ id: 'q1' });
    mockPrisma.application.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'worker@example.com' });

    const res = mockRes();
    await acceptApplication(
      { params: { id: 'a1' }, user: { id: 'owner1' } } as any,
      res
    );

    // Quest is assigned to the chosen worker and the reward becomes the bid.
    const questPatch = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(questPatch.status).toBe('IN_PROGRESS');
    expect(questPatch.assignedAdventurerId).toBe('worker1');
    expect(questPatch.reward).toBe(825);

    // The selected bid is accepted; every OTHER bid is rejected (id != a1).
    expect(mockPrisma.application.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: 'ACCEPTED' },
    });
    const rejectArgs = mockPrisma.application.updateMany.mock.calls[0][0];
    expect(rejectArgs.where).toMatchObject({ questId: 'q1', id: { not: 'a1' } });
    expect(rejectArgs.data).toEqual({ status: 'REJECTED' });
  });

  it('leaves reward unchanged when the accepted application carried no amount', async () => {
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'a9',
      adventurerId: 'worker9',
      questId: 'q9',
      bidAmount: null,
      proposedRate: null,
      quest: { id: 'q9', questGiverId: 'owner1', title: 'Legacy job' },
    });
    mockPrisma.application.update.mockResolvedValue({ id: 'a9', status: 'ACCEPTED' });
    mockPrisma.quest.update.mockResolvedValue({ id: 'q9' });
    mockPrisma.application.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.user.findUnique.mockResolvedValue({ email: null });

    const res = mockRes();
    await acceptApplication(
      { params: { id: 'a9' }, user: { id: 'owner1' } } as any,
      res
    );

    const questPatch = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(questPatch.reward).toBeUndefined();
    expect(questPatch.status).toBe('IN_PROGRESS');
  });

  it('sets reward correctly when the bid amount arrives as a Decimal-like string', async () => {
    // Prisma Decimal columns are objects whose String()/Number() coercion is
    // exact; a string stand-in here verifies the Number(selectedAmount) > 0
    // guard accepts non-plain-number bid amounts.
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'a5',
      adventurerId: 'worker5',
      questId: 'q5',
      bidAmount: '1200.50',
      quest: { id: 'q5', questGiverId: 'owner1', title: 'Deck rebuild' },
    });
    mockPrisma.application.update.mockResolvedValue({ id: 'a5', status: 'ACCEPTED' });
    mockPrisma.quest.update.mockResolvedValue({ id: 'q5' });
    mockPrisma.application.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ email: null });

    const res = mockRes();
    await acceptApplication(
      { params: { id: 'a5' }, user: { id: 'owner1' } } as any,
      res
    );

    const questPatch = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(questPatch.reward).toBe('1200.50');
    expect(questPatch.status).toBe('IN_PROGRESS');
    expect(questPatch.assignedAdventurerId).toBe('worker5');
  });

  it('forbids a non-owner from accepting a bid', async () => {
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'a1',
      quest: { questGiverId: 'owner1' },
    });

    const res = mockRes();
    await acceptApplication(
      { params: { id: 'a1' }, user: { id: 'someone-else' } } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
