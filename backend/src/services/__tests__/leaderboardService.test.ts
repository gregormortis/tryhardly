import {
  orderTopWorkers,
  orderRisingWorkers,
  withRanks,
  WorkerQualitySignals,
} from '../leaderboardService';

function worker(overrides: Partial<WorkerQualitySignals>): WorkerQualitySignals {
  return {
    id: overrides.id ?? 'id',
    username: overrides.username ?? 'user',
    displayName: overrides.displayName ?? 'User',
    avatarUrl: null,
    reputationScore: 0,
    averageRating: null,
    ratingCount: 0,
    completedJobs: 0,
    verifiedCredentials: 0,
    topSkillBadges: 0,
    verified: false,
    guild: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('orderTopWorkers', () => {
  it('ranks by reputation first', () => {
    const a = worker({ id: 'a', reputationScore: 100 });
    const b = worker({ id: 'b', reputationScore: 500 });
    const c = worker({ id: 'c', reputationScore: 250 });
    expect(orderTopWorkers([a, b, c]).map((w) => w.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks reputation ties by average rating', () => {
    const a = worker({ id: 'a', reputationScore: 100, averageRating: 4.2, ratingCount: 5 });
    const b = worker({ id: 'b', reputationScore: 100, averageRating: 4.9, ratingCount: 5 });
    expect(orderTopWorkers([a, b]).map((w) => w.id)).toEqual(['b', 'a']);
  });

  it('sorts an unrated worker below a rated one at equal reputation', () => {
    const rated = worker({ id: 'rated', reputationScore: 100, averageRating: 3.0, ratingCount: 1 });
    const unrated = worker({ id: 'unrated', reputationScore: 100, averageRating: null });
    expect(orderTopWorkers([unrated, rated]).map((w) => w.id)).toEqual(['rated', 'unrated']);
  });

  it('breaks rating ties by review count then completed jobs then credentials', () => {
    const a = worker({ id: 'a', reputationScore: 50, averageRating: 4.5, ratingCount: 10, completedJobs: 5 });
    const b = worker({ id: 'b', reputationScore: 50, averageRating: 4.5, ratingCount: 20, completedJobs: 5 });
    const c = worker({ id: 'c', reputationScore: 50, averageRating: 4.5, ratingCount: 20, completedJobs: 9 });
    expect(orderTopWorkers([a, b, c]).map((w) => w.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input array', () => {
    const input = [worker({ id: 'a', reputationScore: 1 }), worker({ id: 'b', reputationScore: 2 })];
    const before = input.map((w) => w.id);
    orderTopWorkers(input);
    expect(input.map((w) => w.id)).toEqual(before);
  });
});

describe('orderRisingWorkers', () => {
  const now = new Date('2026-05-31T00:00:00Z');
  const recent = new Date('2026-04-01T00:00:00Z'); // within 90 days
  const old = new Date('2025-01-01T00:00:00Z'); // outside the window

  it('excludes workers with no completed jobs or no ratings', () => {
    const noJobs = worker({ id: 'noJobs', createdAt: recent, completedJobs: 0, ratingCount: 1, averageRating: 5 });
    const noRatings = worker({ id: 'noRatings', createdAt: recent, completedJobs: 3, ratingCount: 0 });
    const ok = worker({ id: 'ok', createdAt: recent, completedJobs: 2, ratingCount: 2, averageRating: 4.5 });
    const ids = orderRisingWorkers([noJobs, noRatings, ok], now).map((w) => w.id);
    expect(ids).toEqual(['ok']);
  });

  it('excludes accounts older than the rising window', () => {
    const oldStar = worker({ id: 'old', createdAt: old, completedJobs: 50, ratingCount: 50, averageRating: 5 });
    const newcomer = worker({ id: 'new', createdAt: recent, completedJobs: 2, ratingCount: 2, averageRating: 4 });
    const ids = orderRisingWorkers([oldStar, newcomer], now).map((w) => w.id);
    expect(ids).toEqual(['new']);
  });

  it('ranks eligible newcomers by quality momentum', () => {
    const strong = worker({ id: 'strong', createdAt: recent, completedJobs: 6, ratingCount: 6, averageRating: 4.9 });
    const weak = worker({ id: 'weak', createdAt: recent, completedJobs: 2, ratingCount: 2, averageRating: 3.5 });
    expect(orderRisingWorkers([weak, strong], now).map((w) => w.id)).toEqual(['strong', 'weak']);
  });
});

describe('withRanks', () => {
  it('assigns 1-based ranks and projects the public shape', () => {
    const ranked = withRanks([
      worker({ id: 'a', reputationScore: 9, averageRating: 4.5, ratingCount: 3 }),
      worker({ id: 'b', reputationScore: 8 }),
    ]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[0]).not.toHaveProperty('createdAt');
    expect(ranked[0].averageRating).toBe(4.5);
  });
});
