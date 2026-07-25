import { timingLabel, bidCountLabel } from './questCardCopy';

const DAY = 86400000;

// Midday avoids DST/rounding edges when the helper compares calendar days.
function atNoonInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

describe('timingLabel', () => {
  it('reads as flexible when the poster set no deadline', () => {
    expect(timingLabel(null)).toBe('Flexible timing');
    expect(timingLabel(undefined)).toBe('Flexible timing');
    expect(timingLabel('not-a-date')).toBe('Flexible timing');
  });

  it('describes near-term deadlines in plain language', () => {
    expect(timingLabel(atNoonInDays(0))).toBe('Needed today');
    expect(timingLabel(atNoonInDays(1))).toBe('Needed by tomorrow');
    expect(timingLabel(atNoonInDays(5))).toBe('Needed within 5 days');
  });

  it('treats a deadline later the same day as today, not tomorrow', () => {
    const inSixHours = new Date(Date.now() + 6 * 3600000);
    const stillToday = inSixHours.getDate() === new Date().getDate();
    if (stillToday) expect(timingLabel(inSixHours.toISOString())).toBe('Needed today');
  });

  it('falls back to a date for far-off deadlines', () => {
    const far = new Date(Date.now() + 60 * DAY);
    expect(timingLabel(far.toISOString())).toBe(`Needed by ${far.toLocaleDateString()}`);
  });

  it('flags a deadline that has already passed', () => {
    expect(timingLabel(new Date(Date.now() - 3 * DAY).toISOString())).toBe('Deadline passed');
  });
});

describe('bidCountLabel', () => {
  it('says a job is uncontested rather than showing a bare zero', () => {
    expect(bidCountLabel(0)).toBe('No bids yet');
  });

  it('pluralizes', () => {
    expect(bidCountLabel(1)).toBe('1 bid');
    expect(bidCountLabel(4)).toBe('4 bids');
  });
});
