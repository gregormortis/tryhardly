const mockPrisma = {
  proofOfWork: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  quest: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

import {
  createProof,
  updateProof,
  deleteProof,
  getPublicProof,
} from '../proofController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

describe('createProof', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a title', async () => {
    const res = mockRes();
    await createProof({ user: { id: 'u1' }, body: { title: '  ' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.proofOfWork.create).not.toHaveBeenCalled();
  });

  it('creates a visible item scoped to the caller, cleaning arrays', async () => {
    mockPrisma.proofOfWork.create.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await createProof(
      {
        user: { id: 'u1' },
        body: {
          title: ' Built a deck ',
          imageUrls: [' https://img/1 ', 'https://img/1', '  ', 'https://img/2'],
          skillTags: ['carpentry', 'carpentry', 'framing'],
        },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const arg = mockPrisma.proofOfWork.create.mock.calls[0][0];
    expect(arg.data.userId).toBe('u1');
    expect(arg.data.title).toBe('Built a deck');
    // de-duped + trimmed + blanks dropped
    expect(arg.data.imageUrls).toEqual(['https://img/1', 'https://img/2']);
    expect(arg.data.skillTags).toEqual(['carpentry', 'framing']);
    expect(arg.data.visible).toBe(true);
    expect(arg.data.questId).toBeNull();
  });

  it('only links a questId the caller actually worked on', async () => {
    // Quest does not belong to the caller → resolveQuestLink returns null.
    mockPrisma.quest.findFirst.mockResolvedValue(null);
    mockPrisma.proofOfWork.create.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await createProof(
      { user: { id: 'u1' }, body: { title: 'x', questId: 'someone-elses-quest' } } as any,
      res,
    );
    const findArg = mockPrisma.quest.findFirst.mock.calls[0][0];
    expect(findArg.where.OR).toEqual([
      { assignedAdventurerId: 'u1' },
      { questGiverId: 'u1' },
    ]);
    const createArg = mockPrisma.proofOfWork.create.mock.calls[0][0];
    expect(createArg.data.questId).toBeNull();
  });

  it('keeps a questId the caller did work on', async () => {
    mockPrisma.quest.findFirst.mockResolvedValue({ id: 'q9' });
    mockPrisma.proofOfWork.create.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await createProof(
      { user: { id: 'u1' }, body: { title: 'x', questId: 'q9' } } as any,
      res,
    );
    const createArg = mockPrisma.proofOfWork.create.mock.calls[0][0];
    expect(createArg.data.questId).toBe('q9');
  });
});

describe('updateProof ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s when the item belongs to another user', async () => {
    mockPrisma.proofOfWork.findUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
    const res = mockRes();
    await updateProof({ user: { id: 'u1' }, params: { id: 'p1' }, body: { title: 'new' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.proofOfWork.update).not.toHaveBeenCalled();
  });

  it('updates only provided fields', async () => {
    mockPrisma.proofOfWork.findUnique.mockResolvedValue({
      id: 'p1', userId: 'u1', title: 'Old', description: 'desc',
      imageUrls: ['https://a'], skillTags: ['x'], visible: true, questId: null,
    });
    mockPrisma.proofOfWork.update.mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await updateProof(
      { user: { id: 'u1' }, params: { id: 'p1' }, body: { visible: false } } as any,
      res,
    );
    const arg = mockPrisma.proofOfWork.update.mock.calls[0][0];
    expect(arg.data.visible).toBe(false);
    expect(arg.data.title).toBe('Old');
    expect(arg.data.imageUrls).toEqual(['https://a']);
  });
});

describe('deleteProof ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404s and does not delete another user’s item', async () => {
    mockPrisma.proofOfWork.findUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
    const res = mockRes();
    await deleteProof({ user: { id: 'u1' }, params: { id: 'p1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.proofOfWork.delete).not.toHaveBeenCalled();
  });

  it('deletes the caller’s own item', async () => {
    mockPrisma.proofOfWork.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    mockPrisma.proofOfWork.delete.mockResolvedValue({});
    const res = mockRes();
    await deleteProof({ user: { id: 'u1' }, params: { id: 'p1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('getPublicProof', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only returns visible items for the named user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrisma.proofOfWork.findMany.mockResolvedValue([]);
    const res = mockRes();
    await getPublicProof({ params: { username: 'bob' } } as any, res);
    const arg = mockPrisma.proofOfWork.findMany.mock.calls[0][0];
    expect(arg.where.visible).toBe(true);
    expect(arg.where.userId).toBe('u1');
  });

  it('404s for an unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await getPublicProof({ params: { username: 'ghost' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
