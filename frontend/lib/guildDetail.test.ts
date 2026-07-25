import {
  loadGuildDetail,
  guildWorkerCount,
  guildJobsCompleted,
  guildDetailStats,
  GuildDetailRecord,
} from './guildDetail';

const guild: GuildDetailRecord = {
  id: 'g1',
  name: 'Northside Trades',
  reputationScore: 1240,
  createdAt: '2026-01-15T00:00:00.000Z',
  _count: { members: 7 },
};

describe('loadGuildDetail', () => {
  it('returns the guild with its jobs when both endpoints succeed', async () => {
    const request = jest.fn(async (endpoint: string) =>
      endpoint.endsWith('/quests') ? [{ id: 'j1', status: 'OPEN' }] : guild
    ) as any;

    const result = await loadGuildDetail('g1', request);

    expect(result?.guild.name).toBe('Northside Trades');
    expect(result?.jobs).toEqual([{ id: 'j1', status: 'OPEN' }]);
  });

  it('still returns the guild when the jobs endpoint 404s', async () => {
    const request = jest.fn(async (endpoint: string) => {
      if (endpoint.endsWith('/quests')) throw new Error('Not Found');
      return guild;
    }) as any;

    const result = await loadGuildDetail('g1', request);

    expect(result?.guild.name).toBe('Northside Trades');
    expect(result?.jobs).toBeNull();
  });

  it('returns null when the guild itself cannot be loaded', async () => {
    const failing = (async () => {
      throw new Error('Guild not found');
    }) as any;
    expect(await loadGuildDetail('missing', failing)).toBeNull();

    const empty = (async () => null) as any;
    expect(await loadGuildDetail('missing', empty)).toBeNull();
  });

  it('treats an empty jobs response as no jobs posted, not unavailable', async () => {
    const request = (async (endpoint: string) =>
      endpoint.endsWith('/quests') ? null : guild) as any;

    expect((await loadGuildDetail('g1', request))?.jobs).toEqual([]);
  });
});

describe('guildWorkerCount', () => {
  it('prefers the counted members from the API', () => {
    expect(guildWorkerCount(guild)).toBe(7);
  });

  it('falls back to the included member list', () => {
    expect(guildWorkerCount({ id: 'g1', name: 'x', members: [{}, {}] })).toBe(2);
  });

  it('returns null when the API reported no membership data', () => {
    expect(guildWorkerCount({ id: 'g1', name: 'x' })).toBeNull();
  });
});

describe('guildJobsCompleted', () => {
  it('counts completed jobs from the loaded list', () => {
    expect(
      guildJobsCompleted([{ status: 'COMPLETED' }, { status: 'completed' }, { status: 'OPEN' }])
    ).toBe(2);
  });

  it('returns null when the jobs list is unavailable', () => {
    expect(guildJobsCompleted(null)).toBeNull();
  });
});

describe('guildDetailStats', () => {
  it('shows the practical team stats derived from the API', () => {
    expect(guildDetailStats(guild, [{ status: 'COMPLETED' }])).toEqual([
      { label: 'Workers', value: '7' },
      { label: 'Shared reputation', value: '1,240' },
      { label: 'Jobs completed', value: '1' },
      { label: 'Started', value: new Date(guild.createdAt as string).toLocaleDateString() },
    ]);
  });

  it('omits jobs completed when the jobs list could not be loaded', () => {
    expect(guildDetailStats(guild, null).map(s => s.label)).toEqual([
      'Workers',
      'Shared reputation',
      'Started',
    ]);
  });

  it('omits rows with no data instead of inventing numbers', () => {
    expect(guildDetailStats({ id: 'g1', name: 'x', createdAt: 'nonsense' }, null)).toEqual([]);
  });
});
