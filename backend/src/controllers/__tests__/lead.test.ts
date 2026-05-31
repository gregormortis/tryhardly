/**
 * Unit tests for leadController. Prisma and the mailer are mocked so no DB or
 * email vendor is required — mirrors the public no-account acquisition flows.
 */

const mockPrisma = {
  lead: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  leadMatchNotification: { create: jest.fn() },
  quest: { create: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../../services/mailerService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailTemplates: {
    jobRequestReceived: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
    jobRequestClaimLink: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
    workerAlertReceived: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
    newLocalJobForWorker: jest.fn(() => ({ to: 'x', subject: 's', text: 't' })),
  },
}));

import {
  createJobRequest,
  createWorkerAlert,
  updateLead,
  convertLead,
  getLeadByClaimToken,
  updateLeadByClaimToken,
  resendClaimLink,
} from '../leadController';
import { sendEmail, emailTemplates } from '../../services/mailerService';

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

  it('creates a JOB_REQUEST lead, stores a hashed claim token, and sends confirmation + manage link', async () => {
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
    // A claim token hash is stored, not a raw token, and it has an expiry.
    expect(typeof arg.data.claimTokenHash).toBe('string');
    expect(arg.data.claimTokenHash).toHaveLength(64); // sha256 hex
    expect(arg.data.claimTokenExpiresAt).toBeInstanceOf(Date);
    // The raw token must never appear anywhere in the persisted payload.
    const rawToken = (emailTemplates.jobRequestClaimLink as jest.Mock).mock.calls[0][3];
    const manageUrl = String(rawToken);
    const tokenFromUrl = manageUrl.split('token=')[1];
    expect(JSON.stringify(arg.data)).not.toContain(tokenFromUrl);
    // Both the confirmation and the secure manage link are sent.
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(emailTemplates.jobRequestClaimLink).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('captures and trims source + allowlisted utm params', async () => {
    mockPrisma.lead.create.mockResolvedValue({ id: 'l1', status: 'NEW' });
    const res = mockRes();
    await createJobRequest(
      {
        body: {
          title: 'Mow lawn', name: 'Pat', email: 'pat@b.com',
          source: '  flyer-requester  ',
          utm_source: 'facebook', utm_medium: 'social', ref: 'qr',
          // Not on the allowlist — must be dropped, not persisted.
          utm_evil: 'x', notAUtm: 'y',
        },
      } as any,
      res,
    );
    const arg = mockPrisma.lead.create.mock.calls[0][0];
    expect(arg.data.source).toBe('flyer-requester'); // trimmed
    expect(arg.data.utm).toEqual({ utm_source: 'facebook', utm_medium: 'social', ref: 'qr' });
    expect(arg.data.utm.utm_evil).toBeUndefined();
    expect(arg.data.utm.notAUtm).toBeUndefined();
  });

  it('caps an oversized source and stores no utm when none supplied', async () => {
    mockPrisma.lead.create.mockResolvedValue({ id: 'l1', status: 'NEW' });
    const res = mockRes();
    await createJobRequest(
      { body: { title: 'Mow lawn', name: 'Pat', email: 'pat@b.com', source: 'x'.repeat(500) } } as any,
      res,
    );
    const arg = mockPrisma.lead.create.mock.calls[0][0];
    expect(arg.data.source).toHaveLength(120); // length-capped
    expect(arg.data.utm).toBeUndefined();
  });

  it('preserves the existing flow when no source param is present', async () => {
    mockPrisma.lead.create.mockResolvedValue({ id: 'l1', status: 'NEW' });
    const res = mockRes();
    await createJobRequest({ body: { title: 'Mow lawn', name: 'Pat', email: 'pat@b.com' } } as any, res);
    const arg = mockPrisma.lead.create.mock.calls[0][0];
    expect(arg.data.source).toBeNull();
    expect(arg.data.utm).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('getLeadByClaimToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 generic error for an unknown token', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await getLeadByClaimToken({ query: { token: 'deadbeef' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 for an expired token', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'l1', type: 'JOB_REQUEST', claimTokenExpiresAt: new Date(Date.now() - 1000),
    });
    const res = mockRes();
    await getLeadByClaimToken({ query: { token: 'abc' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns a sanitized lead and omits admin-only fields', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'l1', type: 'JOB_REQUEST', status: 'NEW', name: 'Pat', email: 'pat@b.com',
      phone: null, location: 'Austin', title: 'Mow lawn', description: 'big yard',
      category: 'yard', budget: '$50', timeline: 'weekend', photoUrls: [],
      convertedQuestId: null, createdAt: new Date(), claimedAt: null,
      claimTokenExpiresAt: new Date(Date.now() + 1000),
      adminNote: 'SECRET', handledById: 'admin-1', claimTokenHash: 'HASH',
    });
    mockPrisma.lead.update.mockResolvedValue({});
    const res = mockRes();
    await getLeadByClaimToken({ query: { token: 'abc' } } as any, res);
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.lead.title).toBe('Mow lawn');
    expect(payload.lead.adminNote).toBeUndefined();
    expect(payload.lead.handledById).toBeUndefined();
    expect(payload.lead.claimTokenHash).toBeUndefined();
    // First view records claimedAt.
    expect(mockPrisma.lead.update).toHaveBeenCalledTimes(1);
  });
});

describe('updateLeadByClaimToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refuses to edit a converted lead', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'l1', type: 'JOB_REQUEST', status: 'CONVERTED', convertedQuestId: 'q1',
      claimTokenExpiresAt: new Date(Date.now() + 1000),
    });
    const res = mockRes();
    await updateLeadByClaimToken({ query: { token: 'abc' }, body: { phone: '555' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
  });

  it('updates only the whitelisted contact/scheduling fields', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'l1', type: 'JOB_REQUEST', status: 'NEW', convertedQuestId: null,
      claimTokenExpiresAt: new Date(Date.now() + 1000),
    });
    mockPrisma.lead.update.mockResolvedValue({
      id: 'l1', status: 'NEW', name: 'Pat', email: 'pat@b.com', phone: '555',
      location: null, title: 't', description: null, category: null, budget: null,
      timeline: null, photoUrls: [], convertedQuestId: null, createdAt: new Date(),
    });
    const res = mockRes();
    await updateLeadByClaimToken(
      { query: { token: 'abc' }, body: { phone: '555', status: 'CONVERTED', email: 'evil@x.com' } } as any,
      res,
    );
    const arg = mockPrisma.lead.update.mock.calls[0][0];
    expect(arg.data.phone).toBe('555');
    // status/email must be ignored — not editable via the public claim flow.
    expect(arg.data.status).toBeUndefined();
    expect(arg.data.email).toBeUndefined();
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('rejects when no editable fields are provided', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'l1', type: 'JOB_REQUEST', status: 'NEW', convertedQuestId: null,
      claimTokenExpiresAt: new Date(Date.now() + 1000),
    });
    const res = mockRes();
    await updateLeadByClaimToken({ query: { token: 'abc' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('resendClaimLink', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a generic message and sends no email for an unknown email', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await resendClaimLink({ body: { email: 'nobody@b.com' } } as any, res);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  it('issues a fresh token and emails a link when a lead exists', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      id: 'l1', email: 'pat@b.com', name: 'Pat', title: 'Mow lawn',
    });
    mockPrisma.lead.update.mockResolvedValue({});
    const res = mockRes();
    await resendClaimLink({ body: { email: 'Pat@B.com' } } as any, res);
    // A new token hash is written.
    const arg = mockPrisma.lead.update.mock.calls[0][0];
    expect(typeof arg.data.claimTokenHash).toBe('string');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(emailTemplates.jobRequestClaimLink).toHaveBeenCalledTimes(1);
  });

  it('returns generic success even for an invalid email (no enumeration)', async () => {
    const res = mockRes();
    await resendClaimLink({ body: { email: 'not-an-email' } } as any, res);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
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

  it('captures source + utm attribution on a worker alert', async () => {
    mockPrisma.lead.create.mockResolvedValue({ id: 'w1', status: 'NEW' });
    const res = mockRes();
    await createWorkerAlert(
      { body: { name: 'Sam', email: 'sam@b.com', source: 'flyer-worker', utm_campaign: 'redding-launch' } } as any,
      res,
    );
    const arg = mockPrisma.lead.create.mock.calls[0][0];
    expect(arg.data.source).toBe('flyer-worker');
    expect(arg.data.utm).toEqual({ utm_campaign: 'redding-launch' });
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
