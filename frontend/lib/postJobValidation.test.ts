import { validatePostJobStep, type PostJobDraft } from './postJobValidation';

const MIN_DEADLINE = '2026-08-01';

function draft(overrides: Partial<PostJobDraft> = {}): PostJobDraft {
  return {
    title: 'Mow front and back lawn',
    category: 'yard',
    areaZip: '95677',
    state: 'CA',
    description: 'Front and back lawn mowed, hedges trimmed, clippings hauled away.',
    reward: '80',
    budgetMode: 'fixed',
    deadline: '2026-08-10',
    photoUrl: '',
    ...overrides,
  };
}

function fields(step: number, overrides: Partial<PostJobDraft>) {
  return validatePostJobStep(step, draft(overrides), MIN_DEADLINE).map((i) => i.field);
}

describe('validatePostJobStep — job details', () => {
  it('passes a complete first step', () => {
    expect(validatePostJobStep(1, draft(), MIN_DEADLINE)).toEqual([]);
  });

  it('flags a title that is too short to tell a worker anything', () => {
    expect(fields(1, { title: 'Mow lawn' })).toEqual(['title']);
  });

  it('requires a category', () => {
    expect(fields(1, { category: '' })).toEqual(['category']);
  });

  it('accepts a 3-digit area code or a 5-digit ZIP and nothing else', () => {
    expect(fields(1, { areaZip: '916' })).toEqual([]);
    expect(fields(1, { areaZip: '95677' })).toEqual([]);
    expect(fields(1, { areaZip: '9567' })).toEqual(['areaZip']);
    expect(fields(1, { areaZip: '1600 Main St' })).toEqual(['areaZip']);
    expect(fields(1, { areaZip: '' })).toEqual(['areaZip']);
  });

  it('requires a 2-letter state code', () => {
    expect(fields(1, { state: 'ca' })).toEqual([]);
    expect(fields(1, { state: 'California' })).toEqual(['state']);
    expect(fields(1, { state: '' })).toEqual(['state']);
  });

  it('reports every bad field at once so the poster fixes them in one pass', () => {
    expect(fields(1, { title: '', category: '', areaZip: '', state: '' })).toEqual([
      'title',
      'category',
      'areaZip',
      'state',
    ]);
  });
});

describe('validatePostJobStep — scope and budget', () => {
  it('passes a complete second step', () => {
    expect(validatePostJobStep(2, draft(), MIN_DEADLINE)).toEqual([]);
  });

  it('requires enough detail for a worker to bid on', () => {
    expect(fields(2, { description: 'Mow the lawn please' })).toEqual(['description']);
  });

  it('requires a fixed budget of at least $10', () => {
    expect(fields(2, { reward: '' })).toEqual(['reward']);
    expect(fields(2, { reward: '5' })).toEqual(['reward']);
    expect(fields(2, { reward: 'abc' })).toEqual(['reward']);
    expect(fields(2, { reward: '10' })).toEqual([]);
  });

  it('skips the budget check when workers are asked to quote', () => {
    expect(fields(2, { budgetMode: 'quote', reward: '' })).toEqual([]);
  });

  it('requires a date far enough out for workers to bid', () => {
    expect(fields(2, { deadline: '' })).toEqual(['deadline']);
    expect(fields(2, { deadline: '2026-07-25' })).toEqual(['deadline']);
    expect(fields(2, { deadline: MIN_DEADLINE })).toEqual([]);
  });

  it('only rejects a photo link when one is given and it is not http(s)', () => {
    expect(fields(2, { photoUrl: '' })).toEqual([]);
    expect(fields(2, { photoUrl: 'https://example.com/yard.jpg' })).toEqual([]);
    expect(fields(2, { photoUrl: 'yard.jpg' })).toEqual(['photoUrl']);
  });
});
