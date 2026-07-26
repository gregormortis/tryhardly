import { recommendBudget } from './budgetInference';

const FENCE = '220 ft of wood privacy fence, 6 ft tall, replace old fence';

function fence(extra: Parameters<typeof recommendBudget>[0] = {}) {
  const rec = recommendBudget({ category: 'fencing', text: FENCE, ...extra });
  if (!rec.measured) throw new Error('expected the fencing heuristic to fire');
  return { rec, m: rec.measured };
}

describe('measured estimate: apply buttons', () => {
  it('suggests the middle of the total band, matching the labor line', () => {
    // Both "use this estimate" buttons have to mean the same kind of number;
    // applying the low end of the total band anchored bids way under the labor
    // suggestion sitting right above it.
    const { m } = fence();
    // Both land on the middle of their own band, give or take the $25 rounding
    // that keeps them reading like real prices.
    expect(m.laborSuggested).toBeCloseTo((m.laborMin + m.laborMax) / 2, -2);
    expect(m.totalSuggested).toBeCloseTo((m.totalMin! + m.totalMax!) / 2, -2);
    expect(m.totalSuggested).toBeGreaterThan(m.totalMin!);
    expect(m.totalSuggested).toBeLessThan(m.totalMax!);
  });

  it('has no total to suggest when the job has no materials', () => {
    const rec = recommendBudget({
      category: 'hauling',
      text: 'haul away 3 truckloads of junk from the garage',
    });
    expect(rec.measured?.totalMin).toBeUndefined();
    expect(rec.measured?.totalSuggested).toBeUndefined();
  });
});

describe('measured estimate: who supplies the materials', () => {
  it('budgets against the total when the worker buys the materials', () => {
    const { rec, m } = fence({ materialsBy: 'worker' });
    expect(m.primary).toBe('total');
    expect([rec.min, rec.max]).toEqual([m.totalMin, m.totalMax]);
  });

  it('budgets against labor when the poster supplies them or has not said', () => {
    expect(fence({ materialsBy: 'poster' }).m.primary).toBe('labor');
    expect(fence().m.primary).toBe('labor');
  });
});

describe('measured estimate: difficulty and urgency', () => {
  it('lifts a hard job above a standard one', () => {
    const base = fence().m;
    const hard = fence({ difficulty: 'hard' }).m;
    expect(hard.laborMin).toBeGreaterThan(base.laborMin);
    expect(hard.laborMax).toBeGreaterThan(base.laborMax);
    expect(hard.assumptions.join(' ')).toContain('hard');
  });

  it('scales labor without re-pricing the lumber', () => {
    const base = fence().m;
    const hard = fence({ difficulty: 'hard' }).m;
    expect(hard.totalMin! - hard.laborMin).toBe(base.totalMin! - base.laborMin);
    expect(hard.totalMax! - hard.laborMax).toBe(base.totalMax! - base.laborMax);
  });

  it('leaves a standard, flexible job untouched', () => {
    const base = fence().m;
    const plain = fence({ difficulty: 'moderate', urgency: 'flexible' }).m;
    expect([plain.laborMin, plain.laborMax]).toEqual([base.laborMin, base.laborMax]);
  });

  it('charges a little more for a rush', () => {
    expect(fence({ urgency: 'urgent' }).m.laborMax).toBeGreaterThan(fence().m.laborMax);
  });
});
