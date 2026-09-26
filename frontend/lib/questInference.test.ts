import { inferQuestFromText } from './questInference';

// Regression tests for the "Use this" AI suggestion on the post-a-job flow:
// the guessed title must read like a title (never cut mid-word) and the
// category guess must follow the weight of the evidence, not the first
// keyword that happens to match.

const YARD_JOB =
  'Need the front and back yard cleaned up — mow the lawn and haul away the clippings';

describe('inferQuestFromText: title', () => {
  it('strips leading filler and starts at the work', () => {
    const { title } = inferQuestFromText(YARD_JOB);
    expect(title).toBe('Front and back yard cleaned up');
  });

  it('never cuts a title mid-word', () => {
    const { title } = inferQuestFromText(
      'Looking for someone to pressure wash the entire driveway and walkway before Saturday'
    );
    expect(title).not.toBeNull();
    // No dangling word fragment: the title must end on a word boundary of
    // the source's first clause, not a slice point.
    expect(title).toBe('Pressure wash the entire driveway and walkway before');
    expect(title!.length).toBeLessThanOrEqual(60);
  });

  it('handles "I need" phrasing and capitalization', () => {
    const { title } = inferQuestFromText('i need my gutters cleaned this weekend');
    expect(title).toBe('My gutters cleaned this weekend');
  });

  it('returns null for empty input', () => {
    expect(inferQuestFromText('   ').title).toBeNull();
  });
});

describe('inferQuestFromText: category', () => {
  it('a yard job mentioning hauling stays yard work (weight of evidence)', () => {
    // "haul away the clippings" is one hauling signal against three yard
    // signals (yard, mow, lawn). First-match-wins used to miscategorize this
    // as Hauling & Junk.
    const { category, categoryLabel } = inferQuestFromText(YARD_JOB);
    expect(category).toBe('yard');
    expect(categoryLabel).toBe('Lawn & Yard');
  });

  it('a genuine hauling job still matches hauling', () => {
    const { category } = inferQuestFromText(
      'haul away 3 truckloads of junk from the garage, need a dump run'
    );
    expect(category).toBe('hauling');
  });

  it('ties break toward the more specific category', () => {
    // One signal each: pressure washing is declared before handyman and wins.
    const { category } = inferQuestFromText('pressure wash the deck, and fix the loose boards');
    expect(category).toBe('pressure');
  });

  it('returns null category when nothing matches', () => {
    expect(inferQuestFromText('do something for me please').category).toBeNull();
  });
});

describe('inferQuestFromText: existing behaviors intact', () => {
  it('still detects recurring cadence and timing', () => {
    const inf = inferQuestFromText('mow my lawn every week, starting tomorrow');
    expect(inf.category).toBe('yard');
    expect(inf.isRecurring).toBe(true);
    expect(inf.cadence).toBe('WEEKLY');
    expect(inf.timing?.phrase).toBe('Tomorrow');
  });
});
