import { formatBidDelay, countRecent } from './timeFormat';

describe('formatBidDelay', () => {
  test('null for invalid input', () => {
    expect(formatBidDelay(NaN)).toBeNull();
    expect(formatBidDelay(Infinity)).toBeNull();
    expect(formatBidDelay(-1)).toBeNull();
  });

  test('sub-minute delays', () => {
    expect(formatBidDelay(0)).toBe('under a minute');
    expect(formatBidDelay(29_999)).toBe('under a minute');
  });

  test('minutes round to the nearest minute', () => {
    expect(formatBidDelay(60_000)).toBe('1 minute');
    expect(formatBidDelay(12 * 60_000)).toBe('12 minutes');
    expect(formatBidDelay(59 * 60_000)).toBe('59 minutes');
    // 59.5 minutes rounds up into the hours branch.
    expect(formatBidDelay(59 * 60_000 + 30_000)).toBe('1 hour');
  });

  test('hours up to 24', () => {
    expect(formatBidDelay(60 * 60_000)).toBe('1 hour');
    expect(formatBidDelay(3 * 60 * 60_000)).toBe('3 hours');
    expect(formatBidDelay(23 * 60 * 60_000)).toBe('23 hours');
  });

  test('days from 24 hours on', () => {
    expect(formatBidDelay(24 * 60 * 60_000)).toBe('1 day');
    expect(formatBidDelay(36 * 60 * 60_000)).toBe('2 days');
    expect(formatBidDelay(5 * 24 * 60 * 60_000)).toBe('5 days');
  });
});

describe('countRecent', () => {
  const NOW = new Date('2026-09-26T12:00:00Z').getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const items = [
    { at: iso(NOW - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
    { at: iso(NOW - 6 * 24 * 60 * 60 * 1000) }, // 6 days ago
    { at: iso(NOW - 8 * 24 * 60 * 60 * 1000) }, // 8 days ago
    { at: null },
    { at: 'not-a-date' },
  ];

  test('counts only items within the window', () => {
    expect(countRecent(items, (i) => i.at, 7, NOW)).toBe(2);
    expect(countRecent(items, (i) => i.at, 30, NOW)).toBe(3);
    expect(countRecent(items, (i) => i.at, 1, NOW)).toBe(1);
  });

  test('boundary is inclusive', () => {
    const edge = [{ at: iso(NOW - 7 * 24 * 60 * 60 * 1000) }];
    expect(countRecent(edge, (i) => i.at, 7, NOW)).toBe(1);
  });

  test('empty list', () => {
    expect(countRecent([], (i: { at: string }) => i.at, 7, NOW)).toBe(0);
  });
});
