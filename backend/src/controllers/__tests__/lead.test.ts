/**
 * Unit tests for leadController. Prisma and the mailer are mocked so no DB or
 * email vendor is required — mirrors the public no-account acquisition flows.
 */

const mockPrisma = {
  lead: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  quest: { create: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../../services/mailerService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailTemplates: {
    jobRequestReceived: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
    workerAlertReceived: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
  },
}));

import {
  createJobRequest,
  createWorkerAlert,
  updateLead,
  convertLead,
} from '../leadController';
import { sendEmail } from '../../services/mailerService';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('createJobRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects when title is missing', async () => {
    const res = mockRes();
    await createJobRequest({ body: { name: 'A', email: 'a@b.com' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.lead.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const res = mockRes();
    await createJobRequest({ body: { title: 'Mow lawn', name: 'A', email: 'nope' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a JOB_REQUEST lead and sends a confirmation', async () => {
    mockPrisma.lead.create.mockResolvedValue({ id: 'l1', status: 'NEW' });
    const res = mockRes();
    await createJobRequest(
      { body: { title: 'Mow lawn', name: 'Pat', email: 'Pat@B.com', budget: '$50', photoUrls: 'http://a,http://b' } } as any,
      res,
    );
    expect(mockPrisma.lead.create).toHaveBeenCalledTimes(1);
    const arg = mockPrisma.lead.create.mock.calls[0][0];
    expect(arg.data.type).toBe('JOB_REQUEST');
    expect(arg.data.email).toBe('pat@b.com'); // normalized lowercase
    expect(arg.data.photoUrls).toEqual(['http://a', 'http://b']);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('createWorkerAlert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a WORKER_ALERT lead with skills + tools flag', async () => {
    mockPrisma.lead.create.mockResolvedValue({ id: 'w1', status: 'NEW' });
    const res = mockRes();
    await createWorkerAlert(
      { body: { name: 'Sam', email: 'sam@b.com', skills: ['yard', 'hauling'], hasTools: 'true' } } as any,
      res,
    );
    const arg = mockPrisma.lead.create.mock.calls[0][0];
    expect(arg.data.type).toBe('WORKER_ALERT');
    expect(arg.data.skills).toEqual(['yard', 'hauling']);
    expect(arg.data.hasTools).toBe(true);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects when name is missing', async () => {
    const res = mockRes();
    await createWorkerAlert({ body: { email: 'sam@b.com' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('updateLead', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid status', async () => {
    const res = mockRes();
    await updateLead({ params: { id: 'l1' }, body: { status: 'BOGUS' }, user: { id: 'admin' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates status and records the handling admin', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({ id: 'l1', adminNote: null });
    mockPrisma.lead.update.mockResolvedValue({ id: 'l1', status: 'CONTACTED' });
    const res = mockRes();
    await updateLead(
      { params: { id: 'l1' }, body: { status: 'contacted', adminNote: 'called' }, user: { id: 'admin' } } as any,
      res,
    );
    const arg = mockPrisma.lead.update.mock.calls[0][0];
    expect(arg.data.status).toBe('CONTACTED');
    expect(arg.data.handledById).toBe('admin');
    expect(arg.data.adminNote).toBe('called');
  });
});

describe('convertLead', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refuses to convert a worker-alert lead', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({ id: 'w1', type: 'WORKER_ALERT' });
    const res = mockRes();
    await convertLead({ params: { id: 'w1' }, body: {}, user: { id: 'admin' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('converts a job-request lead into a quest', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'l1', type: 'JOB_REQUEST', title: 'Mow lawn', description: 'big yard',
      budget: '$50', category: 'yard', convertedQuestId: null,
    });
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        quest: { create: jest.fn().mockResolvedValue({ id: 'q1' }) },
        lead: { update: jest.fn().mockResolvedValue({ id: 'l1', status: 'CONVERTED', convertedQuestId: 'q1' }) },
      }),
    );
    const res = mockRes();
    await convertLead({ params: { id: 'l1' }, body: {}, user: { id: 'admin' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ questId: 'q1' }));
  });

  it('refuses to re-convert an already-converted lead', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({ id: 'l1', type: 'JOB_REQUEST', convertedQuestId: 'q9' });
    const res = mockRes();
    await convertLead({ params: { id: 'l1' }, body: {}, user: { id: 'admin' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
