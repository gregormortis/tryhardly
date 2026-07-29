import { bandMidpoint, budgetAfterUnitChange, materialsHelperText } from './postJobPricing';

describe('budgetAfterUnitChange', () => {
  it('clears a budget entered under a different unit', () => {
    // $25/hour is not a $25 flat price for a fence job.
    expect(budgetAfterUnitChange('25', 'fixed:hourly', 'fixed:flat')).toBe('');
    expect(budgetAfterUnitChange('1400', 'fixed:flat', 'quote:flat')).toBe('');
  });

  it('keeps the budget when the unit did not change', () => {
    expect(budgetAfterUnitChange('1400', 'fixed:flat', 'fixed:flat')).toBe('1400');
  });

  it('leaves an empty budget empty', () => {
    expect(budgetAfterUnitChange('', 'fixed:flat', 'fixed:hourly')).toBe('');
  });
});

describe('bandMidpoint', () => {
  it('returns the middle of the band, not the low end', () => {
    expect(bandMidpoint(200, 600)).toBe(400);
    expect(bandMidpoint(60, 120)).toBe(90);
  });

  it('rounds to $5 so it reads like a real starting price', () => {
    expect(bandMidpoint(70, 161)).toBe(115);
  });

  it('never drops below the floor of the band', () => {
    expect(bandMidpoint(10, 10)).toBe(10);
  });
});

describe('materialsHelperText', () => {
  it('points at the labor-only estimate when the poster supplies materials', () => {
    expect(materialsHelperText('poster')).toContain('labor only');
  });

  it('points at the total when the worker supplies materials', () => {
    expect(materialsHelperText('worker')).toContain('materials + labor');
  });

  it('falls back to generic guidance when nothing is chosen', () => {
    expect(materialsHelperText('')).toContain('who buys the materials');
  });
});
