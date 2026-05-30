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

describe('matchesWorker', () => {
  it('requires BOTH city and skill to match', () => {
    const job = { location: 'Redding, CA', category: 'yard' };
    expect(matchesWorker(job, { location: 'redding', skills: ['yard'] })).toBe(true);
    // right city, wrong skill
    expect(matchesWorker(job, { location: 'redding', skills: ['moving'] })).toBe(false);
    // right skill, wrong city
    expect(matchesWorker(job, { location: 'sacramento', skills: ['yard'] })).toBe(false);
    // right skill, blank city
    expect(matchesWorker(job, { location: '', skills: ['yard'] })).toBe(false);
  });
});

// ─── notifyMatchingWorkers (orchestration) ────────────────────────────────────

function makeDeps(workers: any[]) {
  const created: any[] = [];
  const sent: any[] = [];
  const prisma = {
    lead: { findMany: jest.fn().mockResolvedValue(workers) },
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
  return { deps: { prisma, sendEmail, emailTemplates }, created, sent, prisma, sendEmail };
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

  it('never throws and returns zeros if prisma fails', async () => {
    const prisma = {
      lead: { findMany: jest.fn().mockRejectedValue(new Error('db down')) },
      leadMatchNotification: { create: jest.fn() },
    } as any;
    const res = await notifyMatchingWorkers(JOB, { prisma } as any);
    expect(res).toEqual({ matched: 0, notified: 0 });
  });
});
