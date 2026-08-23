import {
  cityMatches,
  normalizeCity,
  parseQuestLocation,
  questCategorySlug,
  resolveQuestCity,
} from '../workerMatchService';

const ZIP_LOCATION_DESCRIPTION =
  'Location: 96003, CA · Pay: $1900 flat\n\n250 ft goat fence';

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
      const city = resolveQuestCity(ZIP_LOCATION_DESCRIPTION);

      expect(city).toBe('Redding');
      expect(normalizeCity(city)).toBe(normalizeCity('Redding'));
      expect(cityMatches(city, 'Redding')).toBe(true);
    });

    it('leaves city-style locations for normalizeCity to handle', () => {
      expect(
        resolveQuestCity('Location: Enterprise, Redding CA · Pay: $1900 flat'),
      ).toBe('Enterprise, Redding CA');
    });
  });

  describe('questCategorySlug', () => {
    it('falls back to other for legacy local-service-only tags', () => {
      expect(questCategorySlug(['96003', 'CA', 'flat', 'fencing'])).toBe('other');
    });

    it('returns a recognized UI category slug', () => {
      expect(questCategorySlug(['96003', 'CA', 'hourly', 'yard'])).toBe('yard');
    });

    it('ignores metadata tags when no category is present', () => {
      expect(questCategorySlug(['96003', 'CA', 'flat', 'photo:https://x/y'])).toBeNull();
    });
  });
});
