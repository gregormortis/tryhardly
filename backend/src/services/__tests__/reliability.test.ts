/**
 * Reliability is the signal that gives the Handshake teeth. Two rules matter
 * more than the arithmetic:
 *
 *   1. No score until there is evidence. A worker with one honoured job is not
 *      "100% reliable". Over-claiming a screening standard is what cost Angi
 *      $100,000 in Vermont in October 2025, and the same logic applies here.
 *   2. Nobody is punished for the other side's failure.
 */
jest.mock('../../lib/prisma', () => ({
  prisma: { handshake: { count: jest.fn(), findMany: jest.fn() } },
}));

import { getReliability, getReliabilityForMany, MIN_EVENTS_FOR_SCORE } from '../reliabilityService';
import { prisma } from '../../lib/prisma';

const mockPrisma = prisma as any;
beforeEach(() => jest.clearAllMocks());

describe('getReliability', () => {
  // count() is called as [honored, brokenByUser, brokenAgainstUser]
  function counts(honored: number, brokenBy: number, brokenAgainst = 0) {
    mockPrisma.handshake.count
      .mockResolvedValueOnce(honored)
      .mockResolvedValueOnce(brokenBy)
      .mockResolvedValueOnce(brokenAgainst);
  }

  it('returns no score below the evidence threshold', async () => {
    counts(2, 0);
    const r = await getReliability('u1');
    expect(r.total).toBeLessThan(MIN_EVENTS_FOR_SCORE);
    expect(r.score).toBeNull();
    expect(r.label).toBeNull();
  });

  it('scores once there is enough history', async () => {
    counts(9, 1);
    const r = await getReliability('u1');
    expect(r.score).toBe(90);
    expect(r.label).toBe('Reliable');
  });

  it('never counts the other side breaking against you', async () => {
    // Five honoured, none broken by this user, but three broken against them.
    counts(5, 0, 3);
    const r = await getReliability('u1');
    expect(r.score).toBe(100);
    expect(r.broken).toBe(0);
  });

  it('labels a poor record honestly rather than softening it', async () => {
    counts(5, 5);
    const r = await getReliability('u1');
    expect(r.score).toBe(50);
    expect(r.label).toBe('Mixed record');
  });
});

describe('getReliabilityForMany', () => {
  it('attributes each break only to the party that caused it', async () => {
    mockPrisma.handshake.findMany.mockResolvedValue([
      { posterId: 'p1', workerId: 'w1', status: 'HONORED', brokenById: null },
      { posterId: 'p1', workerId: 'w1', status: 'HONORED', brokenById: null },
      { posterId: 'p1', workerId: 'w1', status: 'HONORED', brokenById: null },
      // The worker walked away from this one; the poster should not suffer.
      { posterId: 'p1', workerId: 'w1', status: 'BROKEN', brokenById: 'w1' },
    ]);

    const out = await getReliabilityForMany(['p1', 'w1']);
    expect(out.p1.score).toBe(100);
    expect(out.p1.broken).toBe(0);
    expect(out.w1.score).toBe(75);
    expect(out.w1.broken).toBe(1);
  });

  it('returns an empty map for no input without querying', async () => {
    expect(await getReliabilityForMany([])).toEqual({});
    expect(mockPrisma.handshake.findMany).not.toHaveBeenCalled();
  });

  it('gives users with no history a null score, not zero', async () => {
    mockPrisma.handshake.findMany.mockResolvedValue([]);
    const out = await getReliabilityForMany(['new1']);
    expect(out.new1.score).toBeNull();
    expect(out.new1.total).toBe(0);
  });
});
