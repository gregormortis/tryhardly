import {
  cityMatches,
  matchesWorker,
  normalizeCity,
  parseQuestLocation,
  questCategorySlug,
  resolveCity,
  resolveQuestCity,
} from '../workerMatchService';

const ZIP_LOCATION_DESCRIPTION =
  'Location: 96003, CA · Pay: $1900 flat\n\n250 ft goat fence';
const REDDING_JOB = resolveQuestCity(ZIP_LOCATION_DESCRIPTION);

describe('board quest worker-alert helpers', () => {
  describe('parseQuestLocation', () => {
    it('extracts the raw location before the pay suffix', () => {
      expect(parseQuestLocation(ZIP_LOCATION_DESCRIPTION)).toBe('96003, CA');
    });

    it('returns empty when no Location line is present', () => {
      expect(parseQuestLocation('250 ft goat fence')).toBe('');
    });

    it('does not return remote posts as local work', () => {
      expect(parseQuestLocation('Location: Online / Remote · Pay: $40 hourly')).toBe('');
    });
  });

  describe('resolveQuestCity', () => {
    it('maps a supported ZIP to its city so a city-entered worker location matches', () => {
      expect(REDDING_JOB).toBe('Redding');
      expect(normalizeCity(REDDING_JOB)).toBe(normalizeCity('Redding'));
      expect(cityMatches(REDDING_JOB, 'Redding')).toBe(true);
    });

    it('leaves city-style locations for normalizeCity to handle', () => {
      expect(
        resolveQuestCity('Location: Enterprise, Redding CA · Pay: $1900 flat'),
      ).toBe('Enterprise, Redding CA');
    });
  });

  describe('resolveCity and cityMatches', () => {
    it('matches real bare ZIP worker entries for a Redding job', () => {
      expect(cityMatches(resolveQuestCity(ZIP_LOCATION_DESCRIPTION), '96003')).toBe(true);
      expect(cityMatches(resolveQuestCity(ZIP_LOCATION_DESCRIPTION), '96001')).toBe(true);
    });

    it('uses the deliberately bounded Redding launch area for nearby local alerts', () => {
      expect(cityMatches(REDDING_JOB, 'Anderson ca 96007')).toBe(true);
      expect(cityMatches(REDDING_JOB, 'Shasta County')).toBe(true);
    });

    it('does not broaden matching beyond the Redding launch area or usable locations', () => {
      expect(cityMatches(REDDING_JOB, 'Red Bluff, Ca 96080')).toBe(false);
      expect(cityMatches(REDDING_JOB, 'Kent')).toBe(false);
      expect(cityMatches(REDDING_JOB, '9602')).toBe(false);
      expect(cityMatches(REDDING_JOB, null)).toBe(false);
      expect(cityMatches(REDDING_JOB, '')).toBe(false);
    });

    it('only resolves bare ZIPs within the explicitly supported launch area', () => {
      expect(resolveCity('96003')).toBe('redding');
      expect(resolveCity('40220')).toBe('');
    });
  });

  describe('questCategorySlug', () => {
    it('preserves matchable legacy local-service slugs', () => {
      expect(questCategorySlug(['96003', 'CA', 'flat', 'fencing'])).toBe('fencing');
    });

    it('returns a recognized UI category slug', () => {
      expect(questCategorySlug(['96003', 'CA', 'hourly', 'yard'])).toBe('yard');
    });

    it('ignores metadata tags when no category is present', () => {
      expect(questCategorySlug(['96003', 'CA', 'flat', 'photo:https://x/y'])).toBeNull();
    });
  });

  it('matches a Redding fencing job to a bare-ZIP worker with fencing skills', () => {
    expect(
      matchesWorker(
        { location: REDDING_JOB, category: 'fencing', budget: '1900' },
        {
          location: '96003',
          skills: ['fencing', 'handyman', 'hauling', 'painting', 'labor'],
          budgetMin: 75,
        },
      ),
    ).toBe(true);
  });
});
