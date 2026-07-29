// Pricing-side rules for the post-a-job form, kept pure so each one is
// unit-testable on its own.

import type { MaterialsBy } from './postJobDraft';

/**
 * The budget to keep after the poster changes what the number *means* — flat
 * vs hourly, or a fixed budget vs letting workers quote.
 *
 * Carrying the old amount across is worse than clearing it: an hourly $25 left
 * behind as a flat budget publishes a large job at $25 and anchors every bid
 * against a number the poster never meant. Returns the amount unchanged when
 * the unit didn't actually change.
 */
export function budgetAfterUnitChange<T>(reward: string, current: T, next: T): string {
  return current === next ? reward : '';
}

/**
 * The amount an "apply this estimate" button fills in for a plain min–max band.
 *
 * Every apply button in the flow lands on the middle of the band it sits under,
 * so a poster can't get a low-end number from one button and a midpoint from
 * the next. Rounded to $5 to read like a real starting price.
 */
export function bandMidpoint(min: number, max: number): number {
  return Math.max(min, Math.round((min + max) / 2 / 5) * 5);
}

/** Helper copy under the Materials picker, matching the current selection. */
export function materialsHelperText(materialsBy: MaterialsBy): string {
  switch (materialsBy) {
    case 'poster':
      return 'Bids should cover labor only — budget against the labor-only estimate, and say in the details what you will have on site.';
    case 'worker':
      return 'Bids should include what the materials cost — budget against the materials + labor total.';
    default:
      return 'Saying who buys the materials, dump fees, or supplies keeps bids comparable.';
  }
}
