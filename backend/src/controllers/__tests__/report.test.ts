const mockPrisma = {
  report: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

import { createReport, updateReport } from '../reportController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('createReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid targetType', async () => {
    const res = mockRes();
    await createReport(
      { user: { id: 'u1' }, body: { targetType: 'BOGUS', targetId: 'x', reason: 'SPAM' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.report.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid reason', async () => {
    const res = mockRes();
    await createReport(
      { user: { id: 'u1' }, body: { targetType: 'USER', targetId: 'x', reason: 'NOPE' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a report with normalized enums', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r1', status: 'OPEN' });
    const res = mockRes();
    await createReport(
      { user: { id: 'u1' }, body: { targetType: 'quest', targetId: 'q1', reason: 'scam', details: ' bad ' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const arg = mockPrisma.report.create.mock.calls[0][0];
    expect(arg.data.targetType).toBe('QUEST');
    expect(arg.data.reason).toBe('SCAM');
    expect(arg.data.details).toBe('bad');
    expect(arg.data.reporterId).toBe('u1');
  });
});

describe('updateReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid status', async () => {
    const res = mockRes();
    await updateReport({ user: { id: 'admin' }, params: { id: 'r1' }, body: { status: 'WAT' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404s when the report is missing', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await updateReport({ user: { id: 'admin' }, params: { id: 'r1' }, body: { status: 'RESOLVED' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('stamps resolver fields on a terminal status', async () => {
    mockPrisma.report.findUnique.mockResolvedValue({ id: 'r1', resolutionNote: null });
    mockPrisma.report.update.mockResolvedValue({ id: 'r1', status: 'RESOLVED' });
    const res = mockRes();
    await updateReport(
      { user: { id: 'admin' }, params: { id: 'r1' }, body: { status: 'resolved', resolutionNote: 'handled' } } as any,
      res,
    );
    const arg = mockPrisma.report.update.mock.calls[0][0];
    expect(arg.data.status).toBe('RESOLVED');
    expect(arg.data.resolvedById).toBe('admin');
    expect(arg.data.resolvedAt).toBeInstanceOf(Date);
    expect(arg.data.resolutionNote).toBe('handled');
  });
});
