/**
 * Unit tests for the worker-match alert service. The pure matching helpers are
 * tested directly; notifyMatchingWorkers is tested with injected prisma + mailer
 * fakes so no DB or email vendor is required.
 */

import {
  normalizeCity,
  cityMatches,
  skillMatches,
  matchesWorker,
  parseBudget,
  budgetMatches,
  smsEligible,
  notifyMatchingWorkers,
  DEFAULT_MAX_WORKER_EMAILS,
} from '../workerMatchService';

describe('normalizeCity', () => {
  it('returns empty for blank/nullish input', () => {
    expect(normalizeCity('')).toBe('');
    expect(normalizeCity(null)).toBe('');
    expect(normalizeCity(undefined)).toBe('');
    expect(normalizeCity('   ')).toBe('');
  });

  it('strips a "City, ST" suffix down to the city', () => {
    expect(normalizeCity('Redding, CA')).toBe('redding');
    expect(normalizeCity('Redding California')).toBe('redding');
  });

  it('strips ZIP codes and punctuation', () => {
    expect(normalizeCity('Redding, CA 96001')).toBe('redding');
    expect(normalizeCity('Redding 96001-1234')).toBe('redding');
  });

  it('handles multi-word cities', () => {
    expect(normalizeCity('San Francisco, CA')).toBe('san francisco');
    expect(normalizeCity('Los Angeles')).toBe('los angeles');
  });

  it('returns empty for a lone state token (no real city)', () => {
    expect(normalizeCity('CA')).toBe('');
    expect(normalizeCity('California')).toBe('');
  });
});

describe('cityMatches', () => {
  it('matches the same normalized city', () => {
    expect(cityMatches('Redding, CA', 'redding')).toBe(true);
    expect(cityMatches('Redding California', 'Redding, CA 96001')).toBe(true);
  });

  it('does not match different cities', () => {
    expect(cityMatches('Redding, CA', 'Sacramento, CA')).toBe(false);
  });

  it('never matches when either side is blank or state-only (conservative)', () => {
    expect(cityMatches('Redding, CA', '')).toBe(false);
    expect(cityMatches('Redding, CA', null)).toBe(false);
    expect(cityMatches('', 'redding')).toBe(false);
    expect(cityMatches('Redding, CA', 'CA')).toBe(false);
  });
});

describe('skillMatches', () => {
  it('matches when the worker lists the job category', () => {
    expect(skillMatches('yard', ['yard', 'hauling'])).toBe(true);
    expect(skillMatches('YARD', ['Yard'])).toBe(true);
  });

  it('matches "other" workers for any category (open to anything)', () => {
    expect(skillMatches('handyman', ['other'])).toBe(true);
  });

  it('does not match unrelated skills', () => {
    expect(skillMatches('yard', ['cleaning', 'moving'])).toBe(false);
  });

  it('with no job category, only "other" workers match', () => {
    expect(skillMatches(null, ['other'])).toBe(true);
    expect(skillMatches(undefined, ['yard'])).toBe(false);
  });

  it('does not match a worker with no skills', () => {
    expect(skillMatches('yard', [])).toBe(false);
    expect(skillMatches('yard', null)).toBe(false);
  });
});

describe('parseBudget', () => {
  it('reads a number out of common budget strings', () => {
    expect(parseBudget('$50')).toBe(50);
    expect(parseBudget('1,200')).toBe(1200);
    expect(parseBudget('around 80 bucks')).toBe(80);
    expect(parseBudget('50/hr')).toBe(50);
  });

  it('returns null for non-numeric / non-positive / nullish input', () => {
    expect(parseBudget(null)).toBeNull();
    expect(parseBudget(undefined)).toBeNull();
    expect(parseBudget('')).toBeNull();
    expect(parseBudget('negotiable')).toBeNull();
    expect(parseBudget('$0')).toBeNull();
  });
});

describe('budgetMatches', () => {
  it('passes everything when the worker has no minimum', () => {
    expect(budgetMatches('$10', null)).toBe(true);
    expect(budgetMatches('$10', undefined)).toBe(true);
    expect(budgetMatches('$10', 0)).toBe(true);
  });

  it('excludes only a known job budget strictly below the worker floor', () => {
    expect(budgetMatches('$40', 50)).toBe(false);
    expect(budgetMatches('$50', 50)).toBe(true); // exactly at floor is fine
    expect(budgetMatches('$80', 50)).toBe(true);
  });

  it('never excludes a job with an unknown/unparseable budget', () => {
    expect(budgetMatches(null, 50)).toBe(true);
    expect(budgetMatches('negotiable', 50)).toBe(true);
  });
});

describe('matchesWorker', () => {
  it('requires city, skill, AND the worker budget floor to match', () => {
    const job = { location: 'Redding, CA', category: 'yard', budget: '$50' };
    expect(matchesWorker(job, { location: 'redding', skills: ['yard'] })).toBe(true);
    // right city, wrong skill
    expect(matchesWorker(job, { location: 'redding', skills: ['moving'] })).toBe(false);
    // right skill, wrong city
    expect(matchesWorker(job, { location: 'sacramento', skills: ['yard'] })).toBe(false);
    // right skill, blank city
    expect(matchesWorker(job, { location: '', skills: ['yard'] })).toBe(false);
    // city + skill match but the job pays below the worker's floor
    expect(matchesWorker(job, { location: 'redding', skills: ['yard'], budgetMin: 100 })).toBe(false);
    // floor satisfied
    expect(matchesWorker(job, { location: 'redding', skills: ['yard'], budgetMin: 25 })).toBe(true);
  });
});

describe('smsEligible', () => {
  const consent = new Date('2026-01-01T00:00:00Z');

  it('requires opt-in, a non-blank phone, AND a consent timestamp', () => {
    expect(smsEligible({ smsAlertsOptIn: true, phone: '+15555550123', smsConsentAt: consent })).toBe(true);
  });

  it('is false without explicit opt-in', () => {
    expect(smsEligible({ smsAlertsOptIn: false, phone: '+15555550123', smsConsentAt: consent })).toBe(false);
    expect(smsEligible({ phone: '+15555550123', smsConsentAt: consent })).toBe(false);
  });

  it('is false without a usable phone', () => {
    expect(smsEligible({ smsAlertsOptIn: true, phone: null, smsConsentAt: consent })).toBe(false);
    expect(smsEligible({ smsAlertsOptIn: true, phone: '   ', smsConsentAt: consent })).toBe(false);
  });

  it('is false without a recorded consent timestamp', () => {
    expect(smsEligible({ smsAlertsOptIn: true, phone: '+15555550123', smsConsentAt: null })).toBe(false);
    expect(smsEligible({ smsAlertsOptIn: true, phone: '+15555550123' })).toBe(false);
  });
});

// ─── notifyMatchingWorkers (orchestration) ────────────────────────────────────

function makeDeps(workers: any[], opts: { smsEnabled?: boolean } = {}) {
  const created: any[] = [];
  const sent: any[] = [];
  const texted: any[] = [];
  // Default every worker to email-opted-in so existing email tests keep their
  // meaning; individual tests can override emailAlertsOptIn/smsAlertsOptIn.
  const normalized = workers.map((w) => ({ emailAlertsOptIn: true, ...w }));
  const prisma = {
    lead: { findMany: jest.fn().mockResolvedValue(normalized) },
    leadMatchNotification: {
      create: jest.fn(async ({ data }: any) => {
        // Emulate the unique (jobLeadId, workerLeadId) constraint.
        const dup = created.find(
          (c) => c.jobLeadId === data.jobLeadId && c.workerLeadId === data.workerLeadId,
        );
        if (dup) throw new Error('Unique constraint failed');
        created.push(data);
        return data;
      }),
    },
  } as any;
  const sendEmail = jest.fn(async (m: any) => {
    sent.push(m);
  });
  const emailTemplates = {
    newLocalJobForWorker: jest.fn((to: string) => ({ to, subject: 's', text: 't' })),
  } as any;
  const sendSms = jest.fn(async (m: any) => {
    texted.push(m);
    return true;
  });
  const smsEnabled = jest.fn(() => opts.smsEnabled ?? false);
  const smsTemplates = {
    newLocalJobForWorker: jest.fn((to: string) => ({ to, body: 'b' })),
  } as any;
  return {
    deps: { prisma, sendEmail, emailTemplates, sendSms, smsEnabled, smsTemplates },
    created,
    sent,
    texted,
    prisma,
    sendEmail,
    sendSms,
  };
}

const JOB = {
  id: 'job1',
  title: 'Yard cleanup',
  location: 'Redding, CA',
  category: 'yard',
  budget: '$50',
  timeline: 'this weekend',
};

describe('notifyMatchingWorkers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('emails only matching workers', async () => {
    const { deps, sent } = makeDeps([
      { id: 'w1', name: 'A', email: 'a@x.com', location: 'redding', skills: ['yard'] },
      { id: 'w2', name: 'B', email: 'b@x.com', location: 'sacramento', skills: ['yard'] }, // wrong city
      { id: 'w3', name: 'C', email: 'c@x.com', location: 'redding', skills: ['moving'] }, // wrong skill
      { id: 'w4', name: 'D', email: 'd@x.com', location: 'Redding, CA', skills: ['other'] }, // other matches
    ]);
    const res = await notifyMatchingWorkers(JOB, deps);
    expect(res.notified).toBe(2);
    expect(sent.map((s) => s.to).sort()).toEqual(['a@x.com', 'd@x.com']);
  });

  it('does not email the same worker twice for the same job (dedupe)', async () => {
    const { deps, sent } = makeDeps([
      { id: 'w1', name: 'A', email: 'a@x.com', location: 'redding', skills: ['yard'] },
    ]);
    await notifyMatchingWorkers(JOB, deps);
    // Second run for the same job hits the unique constraint and sends nothing.
    const res2 = await notifyMatchingWorkers(JOB, deps);
    expect(res2.notified).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it('caps the number of emails per job request', async () => {
    const many = Array.from({ length: DEFAULT_MAX_WORKER_EMAILS + 10 }, (_, i) => ({
      id: `w${i}`,
      name: `W${i}`,
      email: `w${i}@x.com`,
      location: 'redding',
      skills: ['yard'],
    }));
    const { deps, sent } = makeDeps(many);
    const res = await notifyMatchingWorkers(JOB, deps);
    expect(res.notified).toBe(DEFAULT_MAX_WORKER_EMAILS);
    expect(sent).toHaveLength(DEFAULT_MAX_WORKER_EMAILS);
  });

  it('applies a tighter cap and broad "other"-only match when job has no category', async () => {
    const workers = Array.from({ length: 10 }, (_, i) => ({
      id: `w${i}`,
      name: `W${i}`,
      email: `w${i}@x.com`,
      location: 'redding',
      skills: ['other'],
    }));
    // Add a non-"other" worker who must NOT match a category-less job.
    workers.push({ id: 'wYard', name: 'Y', email: 'y@x.com', location: 'redding', skills: ['yard'] } as any);
    const { deps, sent } = makeDeps(workers);
    const res = await notifyMatchingWorkers({ ...JOB, category: null }, deps);
    expect(res.notified).toBe(5); // tighter cap of 5 for category-less jobs
    expect(sent.every((s) => s.to !== 'y@x.com')).toBe(true);
  });

  it('skips workers whose pay floor is above the job budget', async () => {
    const { deps, sent } = makeDeps([
      { id: 'w1', name: 'A', email: 'a@x.com', location: 'redding', skills: ['yard'], budgetMin: 25 },
      { id: 'w2', name: 'B', email: 'b@x.com', location: 'redding', skills: ['yard'], budgetMin: 100 },
    ]);
    const res = await notifyMatchingWorkers(JOB, deps); // JOB budget is $50
    expect(res.notified).toBe(1);
    expect(sent.map((s) => s.to)).toEqual(['a@x.com']);
  });

  it('queries worker leads opted into either channel', async () => {
    const { deps, prisma } = makeDeps([]);
    await notifyMatchingWorkers(JOB, deps);
    const where = prisma.lead.findMany.mock.calls[0][0].where;
    expect(where.type).toBe('WORKER_ALERT');
    expect(where.OR).toEqual([{ emailAlertsOptIn: true }, { smsAlertsOptIn: true }]);
  });

  it('never throws and returns zeros if prisma fails', async () => {
    const prisma = {
      lead: { findMany: jest.fn().mockRejectedValue(new Error('db down')) },
      leadMatchNotification: { create: jest.fn() },
    } as any;
    const res = await notifyMatchingWorkers(JOB, { prisma } as any);
    expect(res).toEqual({ matched: 0, notified: 0, texted: 0 });
  });

  const CONSENT = new Date('2026-01-01T00:00:00Z');

  it('does not text anyone when SMS is disabled (no Twilio config)', async () => {
    const { deps, sent, texted } = makeDeps(
      [
        {
          id: 'w1',
          name: 'A',
          email: 'a@x.com',
          location: 'redding',
          skills: ['yard'],
          smsAlertsOptIn: true,
          phone: '+15555550123',
          smsConsentAt: CONSENT,
        },
      ],
      { smsEnabled: false },
    );
    const res = await notifyMatchingWorkers(JOB, deps);
    // Email still goes out; SMS is suppressed entirely.
    expect(res.notified).toBe(1);
    expect(res.texted).toBe(0);
    expect(sent).toHaveLength(1);
    expect(texted).toHaveLength(0);
  });

  it('texts a matching worker with full SMS consent when SMS is enabled', async () => {
    const { deps, texted, sendSms } = makeDeps(
      [
        {
          id: 'w1',
          name: 'A',
          email: 'a@x.com',
          location: 'redding',
          skills: ['yard'],
          smsAlertsOptIn: true,
          phone: '+15555550123',
          smsConsentAt: CONSENT,
        },
      ],
      { smsEnabled: true },
    );
    const res = await notifyMatchingWorkers(JOB, deps);
    expect(res.texted).toBe(1);
    expect(texted).toHaveLength(1);
    expect(sendSms.mock.calls[0][0].to).toBe('+15555550123');
  });

  it('does NOT text a matching worker missing any consent piece', async () => {
    const base = { location: 'redding', skills: ['yard'], email: 'x@x.com' };
    const { deps, texted } = makeDeps(
      [
        { id: 'noOptIn', name: 'A', ...base, smsAlertsOptIn: false, phone: '+15555550001', smsConsentAt: CONSENT },
        { id: 'noPhone', name: 'B', ...base, smsAlertsOptIn: true, phone: null, smsConsentAt: CONSENT },
        { id: 'noConsent', name: 'C', ...base, smsAlertsOptIn: true, phone: '+15555550003', smsConsentAt: null },
      ],
      { smsEnabled: true },
    );
    const res = await notifyMatchingWorkers(JOB, deps);
    // All three still get emails (email-opted-in by default), none get texts.
    expect(res.notified).toBe(3);
    expect(res.texted).toBe(0);
    expect(texted).toHaveLength(0);
  });

  it('sends SMS to an SMS-only worker (email opt-out) without emailing them', async () => {
    const { deps, sent, texted } = makeDeps(
      [
        {
          id: 'smsOnly',
          name: 'A',
          email: 'a@x.com',
          location: 'redding',
          skills: ['yard'],
          emailAlertsOptIn: false,
          smsAlertsOptIn: true,
          phone: '+15555550123',
          smsConsentAt: CONSENT,
        },
      ],
      { smsEnabled: true },
    );
    const res = await notifyMatchingWorkers(JOB, deps);
    expect(res.notified).toBe(1);
    expect(res.texted).toBe(1);
    expect(sent).toHaveLength(0); // email opt-out -> no email
    expect(texted).toHaveLength(1);
  });

  it('does not re-notify (email or SMS) the same worker for the same job', async () => {
    const worker = {
      id: 'w1',
      name: 'A',
      email: 'a@x.com',
      location: 'redding',
      skills: ['yard'],
      smsAlertsOptIn: true,
      phone: '+15555550123',
      smsConsentAt: CONSENT,
    };
    const { deps, sent, texted } = makeDeps([worker], { smsEnabled: true });
    await notifyMatchingWorkers(JOB, deps);
    const res2 = await notifyMatchingWorkers(JOB, deps);
    expect(res2.notified).toBe(0);
    expect(res2.texted).toBe(0);
    expect(sent).toHaveLength(1);
    expect(texted).toHaveLength(1);
  });
});
