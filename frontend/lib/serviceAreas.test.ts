import { SERVICE_AREAS, getServiceArea, formatCitySlug, PRIMARY_AREA } from './serviceAreas';

describe('SERVICE_AREAS', () => {
  it('has unique slugs', () => {
    const slugs = SERVICE_AREAS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every area a non-empty local blurb', () => {
    for (const area of SERVICE_AREAS) {
      expect(area.blurb.length).toBeGreaterThan(40);
    }
  });

  it('has positive populations and exactly one primary area', () => {
    for (const area of SERVICE_AREAS) {
      expect(area.population).toBeGreaterThan(0);
    }
    expect(SERVICE_AREAS.filter((a) => a.primary)).toHaveLength(1);
    expect(PRIMARY_AREA.slug).toBe('redding-ca');
  });

  it('covers the expected Shasta County towns', () => {
    const slugs = SERVICE_AREAS.map((a) => a.slug);
    for (const expected of [
      'redding-ca',
      'anderson-ca',
      'shasta-lake-ca',
      'cottonwood-ca',
      'palo-cedro-ca',
      'red-bluff-ca',
      'bella-vista-ca',
      'mountain-gate-ca',
      'centerville-ca',
    ]) {
      expect(slugs).toContain(expected);
    }
  });
});

describe('getServiceArea', () => {
  it('finds areas case-insensitively', () => {
    expect(getServiceArea('Redding-CA')?.city).toBe('Redding');
    expect(getServiceArea('bella-vista-ca')?.city).toBe('Bella Vista');
  });

  it('returns undefined for unknown slugs', () => {
    expect(getServiceArea('nowhere-ca')).toBeUndefined();
  });
});

describe('formatCitySlug', () => {
  it('renders known areas as "City, ST"', () => {
    expect(formatCitySlug('redding-ca')).toBe('Redding, CA');
    expect(formatCitySlug('mountain-gate-ca')).toBe('Mountain Gate, CA');
  });

  it('title-cases unknown slugs and treats a trailing 2-letter token as a state', () => {
    expect(formatCitySlug('rocklin-ca')).toBe('Rocklin, CA');
    expect(formatCitySlug('shingletown')).toBe('Shingletown');
  });

  it('returns empty string for an empty slug', () => {
    expect(formatCitySlug('')).toBe('');
  });
});
