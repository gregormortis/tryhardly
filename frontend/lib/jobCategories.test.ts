import { JOB_CATEGORIES, jobCategoryFromTags, resolveCategoryAlias } from './jobCategories';

describe('jobCategoryFromTags', () => {
  it('reads the category slug the posting form wrote into tags', () => {
    expect(jobCategoryFromTags(['fencing', 'hourly']).slug).toBe('fencing');
    expect(jobCategoryFromTags(['flat', 'labor']).label).toBe('Labor Only');
  });

  it('falls back to the catch-all category when no slug is present', () => {
    expect(jobCategoryFromTags([]).slug).toBe('other');
    expect(jobCategoryFromTags(undefined).slug).toBe('other');
    expect(jobCategoryFromTags(['quote-needed', 'photo:https://x/y.jpg']).slug).toBe('other');
  });
});

describe('JOB_CATEGORIES', () => {
  it('gives every category a chip-sized label', () => {
    for (const category of JOB_CATEGORIES) {
      expect(category.shortLabel.length).toBeGreaterThan(0);
      expect(category.shortLabel.length).toBeLessThanOrEqual(category.label.length);
    }
  });
});

describe('resolveCategoryAlias', () => {
  it('maps friendly URL variants to the canonical slug', () => {
    expect(resolveCategoryAlias('yard-work')).toBe('yard');
    expect(resolveCategoryAlias('pressure-washing')).toBe('pressure');
    expect(resolveCategoryAlias('junk-removal')).toBe('hauling');
    expect(resolveCategoryAlias('general-labor')).toBe('labor');
  });

  it('passes canonical slugs through untouched', () => {
    expect(resolveCategoryAlias('yard')).toBe('yard');
    expect(resolveCategoryAlias('fencing')).toBe('fencing');
  });

  it('is case-insensitive and leaves unknown slugs alone', () => {
    expect(resolveCategoryAlias('Yard-Work')).toBe('yard');
    expect(resolveCategoryAlias('tree-trimming')).toBe('tree-trimming');
  });
});
