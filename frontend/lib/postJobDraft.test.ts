import {
  EMPTY_POST_JOB_VALUES,
  parsePostJobDraft,
  serializePostJobDraft,
  type PostJobDraft,
} from './postJobDraft';

const draft: PostJobDraft = {
  needText: 'Need my lawn mowed every Friday',
  values: {
    ...EMPTY_POST_JOB_VALUES,
    title: 'Mow front and back lawn',
    category: 'yard-work',
    areaZip: '95677',
    state: 'CA',
    description: 'About 2,000 sq ft of grass plus hedges along the driveway.',
    reward: '90',
    payType: 'hourly',
    deadline: '2026-08-01',
    difficulty: 'moderate',
    urgency: 'soon',
    materialsBy: 'poster',
    isRecurring: true,
    recurrenceCadence: 'BIWEEKLY',
  },
};

describe('parsePostJobDraft', () => {
  it('round-trips a draft', () => {
    expect(parsePostJobDraft(serializePostJobDraft(draft))).toEqual(draft);
  });

  it('returns null for missing, empty, or non-JSON input', () => {
    expect(parsePostJobDraft(null)).toBeNull();
    expect(parsePostJobDraft('')).toBeNull();
    expect(parsePostJobDraft('not json')).toBeNull();
    expect(parsePostJobDraft('"a string"')).toBeNull();
  });

  it('returns null when the values object is missing', () => {
    expect(parsePostJobDraft(JSON.stringify({ needText: 'hi' }))).toBeNull();
  });

  it('falls back to safe defaults for unknown enum values', () => {
    const parsed = parsePostJobDraft(
      JSON.stringify({
        values: {
          budgetMode: 'free',
          payType: 'salary',
          difficulty: 'impossible',
          urgency: 'yesterday',
          materialsBy: 'neighbor',
          recurrenceCadence: 'HOURLY',
        },
      }),
    );
    expect(parsed?.values).toEqual(EMPTY_POST_JOB_VALUES);
  });

  it('drops non-string field values instead of trusting them', () => {
    const parsed = parsePostJobDraft(
      JSON.stringify({ needText: 42, values: { title: { evil: true }, reward: 500 } }),
    );
    expect(parsed?.needText).toBe('');
    expect(parsed?.values.title).toBe('');
    expect(parsed?.values.reward).toBe('');
  });

  it('never restores XP from a draft', () => {
    const parsed = parsePostJobDraft(JSON.stringify({ values: { xpReward: 99999 } }));
    expect(parsed?.values.xpReward).toBe(0);
  });

  it('only treats an explicit true as a recurring job', () => {
    expect(parsePostJobDraft(JSON.stringify({ values: { isRecurring: 'yes' } }))?.values.isRecurring)
      .toBe(false);
    expect(parsePostJobDraft(JSON.stringify({ values: { isRecurring: true } }))?.values.isRecurring)
      .toBe(true);
  });
});
