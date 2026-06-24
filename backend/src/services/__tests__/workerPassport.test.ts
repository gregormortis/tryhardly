const mockPrisma = {
  user: { findUniqueOrThrow: jest.fn() },
  application: { count: jest.fn() },
  servicePackage: { count: jest.fn() },
  professionalCredential: { count: jest.fn() },
  review: { aggregate: jest.fn() },
  quest: { groupBy: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

import { buildWorkerPassport, getWorkerPassport } from '../workerPassportService';

const BASE = {
  memberSince: new Date('2025-01-15T00:00:00Z'),
  completedJobs: 0,
  applicationsSubmitted: 0,
  activeServicePackages: 0,
  codeOfCraftPledged: false,
  payoutAccountConnected: false,
  verifiedCredentials: 0,
  pendingCredentials: 0,
  ratingCount: 0,
  averageRating: null,
  repeatCustomers: 0,
  guildName: null,
};

describe('buildWorkerPassport — pure builder', () => {
  it('always exposes completed jobs and member-since, even at zero', () => {
    const p = buildWorkerPassport(BASE);
    expect(p.completedJobs).toBe(0);
    expect(p.memberSince).toBe('2025-01-15T00:00:00.000Z');
    const completed = p.stats.find((s) => s.key === 'completedJobs');
    expect(completed).toMatchObject({ value: '0', available: true });
  });

  it('marks empty signals unavailable so the UI can hide them', () => {
    const p = buildWorkerPassport(BASE);
    const rating = p.stats.find((s) => s.key === 'rating')!;
    expect(rating.available).toBe(false);
    expect(rating.value).toBe('No reviews yet');
    expect(p.averageRating).toBeNull();
    expect(p.stats.find((s) => s.key === 'repeatCustomers')!.available).toBe(false);
  });

  it('formats real signals honestly', () => {
    const p = buildWorkerPassport({
      ...BASE,
      completedJobs: 12,
      applicationsSubmitted: 30,
      activeServicePackages: 2,
      codeOfCraftPledged: true,
      payoutAccountConnected: true,
      verifiedCredentials: 1,
      pendingCredentials: 2,
      ratingCount: 8,
      averageRating: 4.625,
      repeatCustomers: 3,
      guildName: 'Shasta Builders',
    });

    expect(p.stats.find((s) => s.key === 'rating')!.value).toBe('4.6★ (8 reviews)');
    expect(p.stats.find((s) => s.key === 'verifiedCredentials')!.value).toBe('1 verified · 2 pending');
    expect(p.stats.find((s) => s.key === 'codeOfCraft')).toMatchObject({ value: 'Pledged', available: true });
    expect(p.stats.find((s) => s.key === 'payoutConnected')).toMatchObject({ value: 'Connected', available: true });
    expect(p.stats.find((s) => s.key === 'guildPath')).toMatchObject({ value: 'Shasta Builders', available: true });
    expect(p.guildPath).toBe('Shasta Builders');
  });

  it('singularizes a single review', () => {
    const p = buildWorkerPassport({ ...BASE, ratingCount: 1, averageRating: 5 });
    expect(p.stats.find((s) => s.key === 'rating')!.value).toBe('5.0★ (1 review)');
  });
});

describe('getWorkerPassport — DB gatherer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reduces the Stripe account id to a boolean and counts repeat customers', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      createdAt: new Date('2025-03-01T00:00:00Z'),
      totalQuestsCompleted: 5,
      codeOfCraftPledgedAt: new Date('2025-04-01T00:00:00Z'),
      stripeAccountId: 'acct_123',
      guild: { name: 'North State Guild' },
    });
    mockPrisma.application.count.mockResolvedValue(9);
    mockPrisma.servicePackage.count.mockResolvedValue(1);
    mockPrisma.professionalCredential.count
      .mockResolvedValueOnce(2) // verified
      .mockResolvedValueOnce(0); // pending
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.8 }, _count: 4 });
    // Two posters: one with 3 jobs (repeat), one with 1 (not).
    mockPrisma.quest.groupBy.mockResolvedValue([
      { questGiverId: 'g1', _count: { _all: 3 } },
      { questGiverId: 'g2', _count: { _all: 1 } },
    ]);

    const p = await getWorkerPassport('worker1');

    expect(p.payoutAccountConnected).toBe(true);
    // No raw Stripe id should leak into the payload.
    expect(JSON.stringify(p)).not.toContain('acct_123');
    expect(p.completedJobs).toBe(5);
    expect(p.applicationsSubmitted).toBe(9);
    expect(p.repeatCustomers).toBe(1);
    expect(p.verifiedCredentials).toBe(2);
    expect(p.averageRating).toBe(4.8);
    expect(p.guildPath).toBe('North State Guild');
  });
});
