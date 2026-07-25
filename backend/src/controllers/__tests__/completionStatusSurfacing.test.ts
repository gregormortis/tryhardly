// An accepted application keeps status ACCEPTED for the whole life of the job,
// so both dashboards have to label the row from the *quest's* work status
// (IN_PROGRESS → IN_REVIEW → COMPLETED) plus "have I reviewed this yet". These
// tests pin the payload those labels are built from, and the transitions that
// move a job between those states.

const mockPrisma = {
  quest: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  application: { findMany: jest.fn() },
  review: { findMany: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  proofOfWork: { create: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../../services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../../services/progressionService', () => ({ awardCompletionXp: jest.fn() }));
jest.mock('../../services/mailerService', () => ({
  sendEmail: jest.fn(),
  emailTemplates: new Proxy({}, { get: () => () => ({}) }),
}));

const captureAuthorizedPayment = jest.fn();
jest.mock('../paymentController', () => ({
  captureAuthorizedPayment: (...args: unknown[]) => captureAuthorizedPayment(...args),
}));

import { getMyApplications } from '../applicationController';
import { getQuests } from '../questController';
import { submitCompletion, confirmCompletion } from '../completionController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.review.findMany.mockResolvedValue([]);
  mockPrisma.user.findUnique.mockResolvedValue(null);
  captureAuthorizedPayment.mockResolvedValue({ captured: true });
});

describe('worker completion changes the status the dashboard reads', () => {
  it('moves an in-progress quest to IN_REVIEW when the worker submits', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      title: 'Fencing 100 ft',
      status: 'IN_PROGRESS',
      questGiverId: 'poster',
      assignedAdventurerId: 'worker',
    });
    mockPrisma.quest.update.mockResolvedValue({ id: 'q1', status: 'IN_REVIEW' });

    const res = mockRes();
    await submitCompletion({ user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any, res);

    expect(mockPrisma.quest.update.mock.calls[0][0].data.status).toBe('IN_REVIEW');
    expect(res.json.mock.calls[0][0].status).toBe('IN_REVIEW');
  });

  it('never captures payment off the worker action — confirmation is the trigger', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      title: 'Fencing 100 ft',
      status: 'IN_PROGRESS',
      questGiverId: 'poster',
      assignedAdventurerId: 'worker',
    });
    mockPrisma.quest.update.mockResolvedValue({ id: 'q1', status: 'IN_REVIEW' });

    await submitCompletion(
      { user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any,
      mockRes(),
    );

    expect(captureAuthorizedPayment).not.toHaveBeenCalled();
  });
});

describe('poster confirmation completes the job and unlocks reviews', () => {
  it('moves the quest to COMPLETED and captures the authorized payment', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      id: 'q1',
      title: 'Fencing 100 ft',
      status: 'IN_REVIEW',
      questGiverId: 'poster',
      assignedAdventurerId: 'worker',
      completionProofUrls: [],
      tags: [],
    });
    mockPrisma.quest.update.mockResolvedValue({ id: 'q1', status: 'COMPLETED' });

    const res = mockRes();
    await confirmCompletion({ user: { id: 'poster' }, params: { id: 'q1' } } as any, res);

    const data = mockPrisma.quest.update.mock.calls[0][0].data;
    expect(data.status).toBe('COMPLETED');
    expect(data.completionConfirmedAt).toBeInstanceOf(Date);
    expect(captureAuthorizedPayment).toHaveBeenCalledWith('q1');
    expect(res.json.mock.calls[0][0].status).toBe('COMPLETED');
  });
});

describe('getMyApplications — status payload for the worker dashboard', () => {
  it('carries the work status and completion timestamps, not just the bid status', async () => {
    mockPrisma.application.findMany.mockResolvedValue([]);

    await getMyApplications({ user: { id: 'worker' } } as any, mockRes());

    const select = mockPrisma.application.findMany.mock.calls[0][0].include.quest.select;
    expect(select).toMatchObject({
      status: true,
      questGiverId: true,
      assignedAdventurerId: true,
      completionRequestedAt: true,
      completedAt: true,
    });
  });

  it('flags a completed job the worker has not reviewed yet', async () => {
    mockPrisma.application.findMany.mockResolvedValue([
      { id: 'a1', questId: 'q1', status: 'ACCEPTED', quest: { id: 'q1', status: 'COMPLETED' } },
    ]);

    const res = mockRes();
    await getMyApplications({ user: { id: 'worker' } } as any, res);

    expect(res.json.mock.calls[0][0][0].quest.viewerHasReviewed).toBe(false);
  });

  it('flags a completed job the worker already reviewed', async () => {
    mockPrisma.application.findMany.mockResolvedValue([
      { id: 'a1', questId: 'q1', status: 'ACCEPTED', quest: { id: 'q1', status: 'COMPLETED' } },
    ]);
    mockPrisma.review.findMany.mockResolvedValue([{ questId: 'q1' }]);

    const res = mockRes();
    await getMyApplications({ user: { id: 'worker' } } as any, res);

    expect(mockPrisma.review.findMany.mock.calls[0][0].where).toEqual({
      reviewerId: 'worker',
      questId: { in: ['q1'] },
    });
    expect(res.json.mock.calls[0][0][0].quest.viewerHasReviewed).toBe(true);
  });
});

describe('getQuests — status payload for the poster dashboard', () => {
  it('flags which posted quests the poster still owes a review on', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      [
        { id: 'q1', status: 'COMPLETED' },
        { id: 'q2', status: 'COMPLETED' },
      ],
      2,
    ]);
    mockPrisma.review.findMany.mockResolvedValue([{ questId: 'q1' }]);

    const res = mockRes();
    await getQuests(
      { query: { mine: 'true', status: 'any' }, user: { id: 'poster' } } as any,
      res,
    );

    const byId = Object.fromEntries(res.json.mock.calls[0][0].data.map((q: any) => [q.id, q]));
    expect(byId.q1.viewerHasReviewed).toBe(true);
    expect(byId.q2.viewerHasReviewed).toBe(false);
  });

  it('leaves the payload untouched for an anonymous caller', async () => {
    mockPrisma.$transaction.mockResolvedValue([[{ id: 'q1', status: 'OPEN' }], 1]);

    const res = mockRes();
    await getQuests({ query: {} } as any, res);

    expect(mockPrisma.review.findMany).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data[0]).not.toHaveProperty('viewerHasReviewed');
  });
});
