import {
  EXCLUSION_REASONS,
  classifyQuestExclusion,
  redactCardNumbers,
} from '../../../scripts/flag-non-real-quests';

describe('quest exclusion classification', () => {
  it.each([
    [['40220', 'KY', 'flat', 'other'], EXCLUSION_REASONS.CARD_TESTING_ATTACK],
    [['28277', 'NC', 'flat', 'yard'], EXCLUSION_REASONS.CARD_TESTING_ATTACK],
    [['68701', 'NE', 'flat', 'other'], EXCLUSION_REASONS.CARD_TESTING_ATTACK],
    [['96003', 'CA', 'flat', 'fencing'], null],
  ])('classifies tags %j', (tags, expected) => {
    expect(classifyQuestExclusion(tags, 'Location: Redding')).toBe(expected);
  });

  it('classifies legacy remote descriptions', () => {
    expect(classifyQuestExclusion([], 'Location: Online / Remote · Pay: $40 hourly')).toBe(
      EXCLUSION_REASONS.LEGACY_REMOTE,
    );
  });
});

describe('card-data redaction', () => {
  it('redacts only 13- to 19-digit runs', () => {
    const cardLengthDigits = '4'.repeat(16);
    expect(redactCardNumbers(cardLengthDigits)).toBe('[redacted]');
    expect(redactCardNumbers('250 ft fencing')).toBe('250 ft fencing');
    expect(redactCardNumbers('96003')).toBe('96003');
  });
});
