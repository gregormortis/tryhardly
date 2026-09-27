/**
 * Unit tests for admin messaging: admins can read/send in any quest thread and
 * start direct (non-quest) threads with anyone, without needing to bid.
 * Prisma, notifications, and the mailer are mocked — no DB required.
 */

const mockPrisma = {
  quest: { findUnique: jest.fn() },
  application: { findFirst: jest.fn() },
  message: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));
jest.mock('../../services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../../services/mailerService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailTemplates: {
    newMessage: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
    newDirectMessage: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
  },
}));

import {
  getQuestThread,
  sendQuestMessage,
  sendDirectMessage,
  getDirectThread,
  getMyThreads,
} from '../messageController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const adminReq = (overrides: any = {}) =>
  ({
    user: { id: 'admin1', username: 'admin', role: 'ADMIN' },
    ...overrides,
  } as any);

const userReq = (overrides: any = {}) =>
  ({
    user: { id: 'u2', username: 'worker', role: 'USER' },
    ...overrides,
  } as any);

const OPEN_QUEST = { id: 'q1', questGiverId: 'u1', assignedAdventurerId: null, status: 'OPEN' };

describe('admin quest-thread access', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets an admin read a quest thread without bidding', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });
    const res = mockRes();
    await getQuestThread(adminReq({ params: { questId: 'q1', userId: 'u1' } }), res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('still blocks a non-participant non-admin from the thread', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.application.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await getQuestThread(userReq({ params: { questId: 'q1', userId: 'u1' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No access to this quest thread' });
  });

  it('lets an admin message a quest participant they have no bid with', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.message.create.mockResolvedValue({ id: 'm1' });
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'kelly@x.com' });
    const res = mockRes();
    await sendQuestMessage(
      adminReq({ params: { questId: 'q1' }, body: { recipientId: 'u1', content: 'Hi!' } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    // Recipient-participant check is skipped for admins: no application lookup.
    expect(mockPrisma.application.findFirst).not.toHaveBeenCalled();
  });

  it('skips the contact-info scan for admins', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.message.create.mockResolvedValue({ id: 'm1' });
    mockPrisma.user.findUnique.mockResolvedValue({ email: null });
    const res = mockRes();
    await sendQuestMessage(
      adminReq({
        params: { questId: 'q1' },
        body: { recipientId: 'u1', content: 'Call me at 555-123-4567' },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('still scans contact info for non-admin bidders', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(OPEN_QUEST);
    mockPrisma.application.findFirst.mockResolvedValue({ id: 'a1' }); // bidder
    const res = mockRes();
    await sendQuestMessage(
      userReq({
        params: { questId: 'q1' },
        body: { recipientId: 'u1', content: 'Call me at 555-123-4567' },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });
});

describe('direct messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets an admin start a direct thread with anyone', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u9' }); // validate + email
    mockPrisma.message.create.mockResolvedValue({ id: 'm1', questId: null });
    const res = mockRes();
    await sendDirectMessage(
      adminReq({ body: { recipientId: 'u9', content: 'Hello from TryHardly' } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senderId: 'admin1', recipientId: 'u9', questId: null }),
      }),
    );
    // No prior thread needed for admins: no thread lookup.
    expect(mockPrisma.message.findFirst).not.toHaveBeenCalled();
  });

  it('blocks a non-admin from starting a direct thread with a stranger', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u9' });
    mockPrisma.message.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await sendDirectMessage(
      userReq({ body: { recipientId: 'u9', content: 'Hi' } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });

  it('lets a non-admin reply inside an existing direct thread', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin1' });
    mockPrisma.message.findFirst.mockResolvedValue({ id: 'm0' }); // thread exists
    mockPrisma.message.create.mockResolvedValue({ id: 'm2', questId: null });
    const res = mockRes();
    await sendDirectMessage(
      userReq({ body: { recipientId: 'admin1', content: 'Thanks, here are details' } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects self-messages and unknown recipients', async () => {
    const selfRes = mockRes();
    await sendDirectMessage(adminReq({ body: { recipientId: 'admin1', content: 'Hi' } }), selfRes);
    expect(selfRes.status).toHaveBeenCalledWith(400);

    mockPrisma.user.findUnique.mockResolvedValue(null);
    const unknownRes = mockRes();
    await sendDirectMessage(
      adminReq({ body: { recipientId: 'ghost', content: 'Hi' } }),
      unknownRes,
    );
    expect(unknownRes.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });

  it('returns the direct thread and marks inbound as read', async () => {
    mockPrisma.message.findMany.mockResolvedValue([{ id: 'm1', content: 'Hi' }]);
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });
    const res = mockRes();
    await getDirectThread(adminReq({ params: { userId: 'u9' } }), res);
    expect(res.json).toHaveBeenCalledWith([{ id: 'm1', content: 'Hi' }]);
    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ questId: null }) }),
    );
  });

  it('blocks a non-admin from reading a direct thread they are not in', async () => {
    mockPrisma.message.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await getDirectThread(userReq({ params: { userId: 'u9' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('getMyThreads', () => {
  beforeEach(() => jest.clearAllMocks());

  it('includes direct threads labeled with the counterparty username', async () => {
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 'm1',
        questId: null,
        senderId: 'admin1',
        recipientId: 'u9',
        content: 'Hello from TryHardly',
        createdAt: new Date('2026-09-27T12:00:00Z'),
        read: false,
        quest: null,
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'u9', username: 'kelly' }]);
    const res = mockRes();
    await getMyThreads(adminReq(), res);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        questId: null,
        questTitle: 'kelly',
        counterpartyId: 'u9',
        lastMessage: 'Hello from TryHardly',
      }),
    ]);
  });
});
