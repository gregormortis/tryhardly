const mockPrisma = {
  quest: { findUnique: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  proofOfWork: { create: jest.fn() },
};

jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

const mockCreateNotification = jest.fn();
jest.mock('../../services/notificationService', () => ({
  createNotification: (...args: any[]) => mockCreateNotification(...args),
}));

const mockAwardCompletionXp = jest.fn();
jest.mock('../../services/progressionService', () => ({
  awardCompletionXp: (...args: any[]) => mockAwardCompletionXp(...args),
}));

const mockSendEmail = jest.fn();
jest.mock('../../services/mailerService', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  emailTemplates: {
    completionSubmitted: jest.fn(() => ({ to: 't', subject: 's', text: 'x' })),
    completionConfirmed: jest.fn(() => ({ to: 't', subject: 's', text: 'x' })),
    completionChangesRequested: jest.fn(() => ({ to: 't', subject: 's', text: 'x' })),
  },
}));

import { submitCompletion, confirmCompletion, requestChanges } from '../completionController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const IN_PROGRESS_QUEST = {
  id: 'q1',
  title: 'Build a deck',
  status: 'IN_PROGRESS',
  questGiverId: 'giver',
  assignedAdventurerId: 'worker',
  tags: ['carpentry', 'photo:https://x/1'],
  completionProofUrls: [],
  completionNote: null,
};

const IN_REVIEW_QUEST = { ...IN_PROGRESS_QUEST, status: 'IN_REVIEW' };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.quest.update.mockImplementation(({ data }: any) => ({ id: 'q1', ...data }));
  mockPrisma.user.findUnique.mockResolvedValue({ email: 'e@x.com', username: 'worker' });
  mockPrisma.user.update.mockResolvedValue({});
  mockPrisma.proofOfWork.create.mockResolvedValue({ id: 'p1' });
  mockAwardCompletionXp.mockResolvedValue(null);
});

describe('submitCompletion (worker)', () => {
  it('404s for a missing quest', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await submitCompletion({ user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('403s when caller is not the assigned worker', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_PROGRESS_QUEST);
    const res = mockRes();
    await submitCompletion({ user: { id: 'giver' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.quest.update).not.toHaveBeenCalled();
  });

  it('400s on a completed quest', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ ...IN_PROGRESS_QUEST, status: 'COMPLETED' });
    const res = mockRes();
    await submitCompletion({ user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400s on an OPEN quest (not in progress)', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({ ...IN_PROGRESS_QUEST, status: 'OPEN' });
    const res = mockRes();
    await submitCompletion({ user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('moves the quest to IN_REVIEW with cleaned note + proof and notifies the giver', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_PROGRESS_QUEST);
    const res = mockRes();
    await submitCompletion(
      {
        user: { id: 'worker' },
        params: { id: 'q1' },
        body: { note: '  all done  ', proofUrls: [' https://a ', 'https://a', 'https://b'] },
      } as any,
      res,
    );
    const arg = mockPrisma.quest.update.mock.calls[0][0];
    expect(arg.data.status).toBe('IN_REVIEW');
    expect(arg.data.completionNote).toBe('all done');
    expect(arg.data.completionProofUrls).toEqual(['https://a', 'https://b']);
    expect(arg.data.completionRequestedAt).toBeInstanceOf(Date);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'giver', type: 'COMPLETION_SUBMITTED' }),
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('allows resubmission from IN_REVIEW (after a change request)', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_REVIEW_QUEST);
    const res = mockRes();
    await submitCompletion({ user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(mockPrisma.quest.update).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});

describe('confirmCompletion (giver)', () => {
  it('403s when caller is not the quest giver', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_REVIEW_QUEST);
    const res = mockRes();
    await confirmCompletion({ user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.quest.update).not.toHaveBeenCalled();
  });

  it('400s when no completion request is awaiting review (still IN_PROGRESS)', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_PROGRESS_QUEST);
    const res = mockRes();
    await confirmCompletion({ user: { id: 'giver' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('completes the quest, awards XP, increments counter, and notifies the worker', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_REVIEW_QUEST);
    const res = mockRes();
    await confirmCompletion({ user: { id: 'giver' }, params: { id: 'q1' }, body: {} } as any, res);
    const arg = mockPrisma.quest.update.mock.calls[0][0];
    expect(arg.data.status).toBe('COMPLETED');
    expect(arg.data.completedAt).toBeInstanceOf(Date);
    expect(arg.data.completionConfirmedAt).toBeInstanceOf(Date);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalQuestsCompleted: { increment: 1 } } }),
    );
    expect(mockAwardCompletionXp).toHaveBeenCalledWith('q1');
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'worker', type: 'COMPLETION_CONFIRMED' }),
    );
  });

  it('creates a proof-of-work item only when proof was submitted', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      ...IN_REVIEW_QUEST,
      completionProofUrls: ['https://a', 'https://b'],
      completionNote: 'done',
    });
    const res = mockRes();
    await confirmCompletion({ user: { id: 'giver' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(mockPrisma.proofOfWork.create).toHaveBeenCalled();
    const arg = mockPrisma.proofOfWork.create.mock.calls[0][0];
    expect(arg.data.userId).toBe('worker');
    expect(arg.data.questId).toBe('q1');
    expect(arg.data.imageUrls).toEqual(['https://a', 'https://b']);
    // photo: tags are stripped from skill tags
    expect(arg.data.skillTags).toEqual(['carpentry']);
  });

  it('does not create a proof item when no proof was submitted', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_REVIEW_QUEST);
    const res = mockRes();
    await confirmCompletion({ user: { id: 'giver' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(mockPrisma.proofOfWork.create).not.toHaveBeenCalled();
  });
});

describe('requestChanges (giver)', () => {
  it('403s when caller is not the quest giver', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_REVIEW_QUEST);
    const res = mockRes();
    await requestChanges({ user: { id: 'worker' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('400s when the quest is not IN_REVIEW', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_PROGRESS_QUEST);
    const res = mockRes();
    await requestChanges({ user: { id: 'giver' }, params: { id: 'q1' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('sends the quest back to IN_PROGRESS, increments the count, and notifies the worker', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(IN_REVIEW_QUEST);
    const res = mockRes();
    await requestChanges(
      { user: { id: 'giver' }, params: { id: 'q1' }, body: { note: 'fix the railing' } } as any,
      res,
    );
    const arg = mockPrisma.quest.update.mock.calls[0][0];
    expect(arg.data.status).toBe('IN_PROGRESS');
    expect(arg.data.changeRequestCount).toEqual({ increment: 1 });
    expect(arg.data.changeRequestNote).toBe('fix the railing');
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'worker', type: 'COMPLETION_CHANGES_REQUESTED' }),
    );
    // Never marks complete.
    expect(arg.data.status).not.toBe('COMPLETED');
  });
});
