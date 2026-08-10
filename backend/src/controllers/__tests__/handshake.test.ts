/**
 * The Handshake is the commitment device that replaces the payment
 * authorization now that TryHardly does not process payments. Its whole value
 * is that it cannot be quietly rewritten, so the rules below are the product,
 * not incidental validation:
 *
 *   - only the OTHER side can agree (you cannot self-confirm)
 *   - AGREED terms are frozen
 *   - breaking an agreement requires a reason and is attributed
 *   - exactly one live handshake per job
 */
// The controller reads prisma from app; the service reads it from lib/prisma.
// Both point at the same mock so a single set of expectations covers the whole
// flow regardless of which module a given function lives in.
const mockDb = {
  quest: { findUnique: jest.fn(), update: jest.fn() },
  handshake: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../app', () => ({ prisma: mockDb }));
jest.mock('../../lib/prisma', () => ({ prisma: mockDb }));
jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

import {
  proposeHandshake,
  agreeHandshake,
  breakHandshake,
} from '../handshakeController';
import { honorHandshakeForQuest } from '../../services/handshakeService';
const mockPrisma = mockDb as any;

const POSTER = 'poster1';
const WORKER = 'worker1';
const ASSIGNED_QUEST = {
  id: 'q1',
  title: 'Clear the back yard',
  questGiverId: POSTER,
  assignedAdventurerId: WORKER,
  status: 'IN_PROGRESS',
};

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function req(userId: string, body: any = {}, params: any = {}) {
  return { user: { id: userId }, body, params } as any;
}

const VALID = {
  amount: '150',
  scope: 'Clear leaves and green waste from the back yard, haul away included.',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fn: any) =>
    fn({
      handshake: {
        update: mockPrisma.handshake.update,
        create: mockPrisma.handshake.create,
      },
    }),
  );
});

describe('proposeHandshake', () => {
  it('rejects someone who is not a party to the job', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(ASSIGNED_QUEST);
    const res = mockRes();
    await proposeHandshake(req('stranger', VALID, { questId: 'q1' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.handshake.create).not.toHaveBeenCalled();
  });

  it('requires a bid to be accepted first', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue({
      ...ASSIGNED_QUEST,
      assignedAdventurerId: null,
    });
    mockPrisma.handshake.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await proposeHandshake(req(POSTER, VALID, { questId: 'q1' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('requires a scope, because that is what disputes are actually about', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(ASSIGNED_QUEST);
    mockPrisma.handshake.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await proposeHandshake(req(POSTER, { amount: '150' }, { questId: 'q1' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/what is included/i);
  });

  it('rejects amounts outside the $20-$5,000 bounds', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(ASSIGNED_QUEST);
    mockPrisma.handshake.findFirst.mockResolvedValue(null);
    for (const amount of ['5', '19.99', '5000.01', '100000']) {
      const res = mockRes();
      await proposeHandshake(req(POSTER, { ...VALID, amount }, { questId: 'q1' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(mockPrisma.handshake.create).not.toHaveBeenCalled();
  });

  it('stores money in cents so the agreed figure cannot drift', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(ASSIGNED_QUEST);
    mockPrisma.handshake.findFirst.mockResolvedValue(null);
    mockPrisma.handshake.create.mockResolvedValue({ id: 'h1' });

    const res = mockRes();
    await proposeHandshake(req(POSTER, { ...VALID, amount: '150.55' }, { questId: 'q1' }), res);

    expect(mockPrisma.handshake.create.mock.calls[0][0].data.amountCents).toBe(15055);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('marks the proposer as already agreed, and only the proposer', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(ASSIGNED_QUEST);
    mockPrisma.handshake.findFirst.mockResolvedValue(null);
    mockPrisma.handshake.create.mockResolvedValue({ id: 'h1' });

    const res = mockRes();
    await proposeHandshake(req(WORKER, VALID, { questId: 'q1' }), res);

    const data = mockPrisma.handshake.create.mock.calls[0][0].data;
    expect(data.workerAgreedAt).toBeInstanceOf(Date);
    expect(data.posterAgreedAt).toBeNull();
  });

  it('refuses to edit terms that are already agreed', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(ASSIGNED_QUEST);
    mockPrisma.handshake.findFirst.mockResolvedValue({
      id: 'h1',
      status: 'AGREED',
      version: 1,
    });

    const res = mockRes();
    await proposeHandshake(req(POSTER, VALID, { questId: 'q1' }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockPrisma.handshake.create).not.toHaveBeenCalled();
  });

  it('supersedes an open proposal rather than editing it in place', async () => {
    mockPrisma.quest.findUnique.mockResolvedValue(ASSIGNED_QUEST);
    mockPrisma.handshake.findFirst.mockResolvedValue({
      id: 'old',
      status: 'PROPOSED',
      version: 1,
    });
    mockPrisma.handshake.create.mockResolvedValue({ id: 'h2' });

    const res = mockRes();
    await proposeHandshake(req(POSTER, VALID, { questId: 'q1' }), res);

    expect(mockPrisma.handshake.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'SUPERSEDED' } }),
    );
    const data = mockPrisma.handshake.create.mock.calls[0][0].data;
    expect(data.version).toBe(2);
    expect(data.supersededById).toBe('old');
  });
});

describe('agreeHandshake', () => {
  const PROPOSED = {
    id: 'h1',
    questId: 'q1',
    posterId: POSTER,
    workerId: WORKER,
    proposedById: POSTER,
    status: 'PROPOSED',
    quest: { id: 'q1', title: 'Clear the back yard' },
  };

  it('will not let the proposer agree with themselves', async () => {
    mockPrisma.handshake.findUnique.mockResolvedValue(PROPOSED);
    const res = mockRes();
    await agreeHandshake(req(POSTER, {}, { id: 'h1' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.handshake.update).not.toHaveBeenCalled();
  });

  it('lets the counterparty agree, freezing the terms', async () => {
    mockPrisma.handshake.findUnique.mockResolvedValue(PROPOSED);
    mockPrisma.handshake.update.mockResolvedValue({ id: 'h1', status: 'AGREED' });

    const res = mockRes();
    await agreeHandshake(req(WORKER, {}, { id: 'h1' }), res);

    const data = mockPrisma.handshake.update.mock.calls[0][0].data;
    expect(data.status).toBe('AGREED');
    expect(data.agreedAt).toBeInstanceOf(Date);
    expect(data.workerAgreedAt).toBeInstanceOf(Date);
  });

  it('rejects a stranger', async () => {
    mockPrisma.handshake.findUnique.mockResolvedValue(PROPOSED);
    const res = mockRes();
    await agreeHandshake(req('stranger', {}, { id: 'h1' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('cannot agree terms that are no longer open', async () => {
    mockPrisma.handshake.findUnique.mockResolvedValue({ ...PROPOSED, status: 'BROKEN' });
    const res = mockRes();
    await agreeHandshake(req(WORKER, {}, { id: 'h1' }), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('breakHandshake', () => {
  const AGREED = {
    id: 'h1',
    questId: 'q1',
    posterId: POSTER,
    workerId: WORKER,
    proposedById: POSTER,
    status: 'AGREED',
    quest: { id: 'q1', title: 'Clear the back yard' },
  };

  it('requires a real reason', async () => {
    mockPrisma.handshake.findUnique.mockResolvedValue(AGREED);
    for (const reason of [undefined, '', '   ', 'busy']) {
      const res = mockRes();
      await breakHandshake(req(WORKER, { reason }, { id: 'h1' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(mockPrisma.handshake.update).not.toHaveBeenCalled();
  });

  it('attributes the break to whoever did it', async () => {
    mockPrisma.handshake.findUnique.mockResolvedValue(AGREED);
    mockPrisma.handshake.update.mockResolvedValue({ id: 'h1', status: 'BROKEN' });

    const res = mockRes();
    await breakHandshake(
      req(WORKER, { reason: 'Truck broke down, cannot make Saturday.' }, { id: 'h1' }),
      res,
    );

    const data = mockPrisma.handshake.update.mock.calls[0][0].data;
    expect(data.status).toBe('BROKEN');
    expect(data.brokenById).toBe(WORKER);
    expect(data.brokenReason).toMatch(/truck broke down/i);
  });

  it('does nothing when there is no agreement in place', async () => {
    mockPrisma.handshake.findUnique.mockResolvedValue({ ...AGREED, status: 'PROPOSED' });
    const res = mockRes();
    await breakHandshake(req(WORKER, { reason: 'Changed my mind about it' }, { id: 'h1' }), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('honorHandshakeForQuest', () => {
  it('marks the live agreement honored', async () => {
    mockPrisma.handshake.findFirst.mockResolvedValue({ id: 'h1', status: 'AGREED' });
    mockPrisma.handshake.update.mockResolvedValue({});

    expect(await honorHandshakeForQuest('q1')).toBe(true);
    const data = mockPrisma.handshake.update.mock.calls[0][0].data;
    expect(data.status).toBe('HONORED');
    expect(data.honoredAt).toBeInstanceOf(Date);
  });

  it('is a no-op for a job with no agreement, and never throws', async () => {
    mockPrisma.handshake.findFirst.mockResolvedValue(null);
    expect(await honorHandshakeForQuest('q1')).toBe(false);
    expect(mockPrisma.handshake.update).not.toHaveBeenCalled();
  });

  it('swallows errors so completion is never blocked', async () => {
    mockPrisma.handshake.findFirst.mockRejectedValue(new Error('db down'));
    await expect(honorHandshakeForQuest('q1')).resolves.toBe(false);
  });
});
