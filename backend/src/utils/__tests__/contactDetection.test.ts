import {
  detectContactInfo,
  containsContactInfo,
  findContactInfoInFields,
  CONTACT_INFO_VALIDATION_MESSAGE,
} from '../contactDetection';

describe('detectContactInfo — flags off-platform contact attempts', () => {
  it.each([
    ['phone with dashes', 'call me at 555-123-4567', 'PHONE'],
    ['phone with parens', 'reach me (555) 123-4567', 'PHONE'],
    ['bare 10-digit phone', 'here is my number 5551234567', 'PHONE'],
    ['phone with +1', '+1 555 123 4567 works', 'PHONE'],
    ['email', 'send it to john.doe@gmail.com', 'EMAIL'],
    ['venmo', 'just venmo me the deposit', 'PAYMENT_APP'],
    ['cash app', 'I take CashApp', 'PAYMENT_APP'],
    ['zelle', 'pay via Zelle', 'PAYMENT_APP'],
    ['paypal', 'use my paypal', 'PAYMENT_APP'],
    ['text me solicitation', 'text me to set it up', 'CONTACT_SOLICITATION'],
    ['dm me solicitation', 'DM me for details', 'CONTACT_SOLICITATION'],
    ['call me solicitation', 'call me tomorrow', 'CONTACT_SOLICITATION'],
    ['pay directly', 'we can pay directly and skip the fee', 'CONTACT_SOLICITATION'],
    ['off-platform', "let's take this off platform", 'CONTACT_SOLICITATION'],
    ['external link', 'see my site at https://example.com/portfolio', 'EXTERNAL_LINK'],
    ['bare domain', 'portfolio at myworks.com', 'EXTERNAL_LINK'],
    ['social handle', 'find me @johndoe1', 'SOCIAL_HANDLE'],
  ])('flags %s', (_label, text, expectedType) => {
    const result = detectContactInfo(text);
    expect(result.hasContactInfo).toBe(true);
    expect(result.types).toContain(expectedType);
  });

  it('detects multiple types in one string', () => {
    const result = detectContactInfo('text me at 555-123-4567 or venmo me');
    expect(result.types).toEqual(expect.arrayContaining(['PHONE', 'PAYMENT_APP', 'CONTACT_SOLICITATION']));
  });
});

describe('detectContactInfo — does NOT flag legitimate marketplace text', () => {
  it.each([
    ['T-post material', 'I will install 12 T-posts along the fence line'],
    ['lumber sizes', 'Need twenty 2x4 boards and some 4x4 posts'],
    ['measurements', 'The deck is 10x12 and about 8 ft tall'],
    ['prices', 'Materials run about $120 and labor is $300'],
    ['hours/quantities', 'Estimated 6 hours, 3 bags of concrete'],
    ['plain scope note', 'I can haul away the old shed and level the ground'],
    ['timeline', 'Available next week, can finish in 2 days'],
    ['empty', ''],
  ])('does not flag %s', (_label, text) => {
    expect(containsContactInfo(text)).toBe(false);
  });

  it('treats non-string input as no match', () => {
    expect(containsContactInfo(undefined)).toBe(false);
    expect(containsContactInfo(null)).toBe(false);
    expect(containsContactInfo(42)).toBe(false);
  });

  it('does not double-count an email as a social handle', () => {
    const result = detectContactInfo('email me at jane@gmail.com');
    expect(result.types).toContain('EMAIL');
    expect(result.types).not.toContain('SOCIAL_HANDLE');
  });
});

describe('findContactInfoInFields', () => {
  it('returns the first offending field', () => {
    const hit = findContactInfoInFields({
      bidAmount: '500',
      toolsNeeded: 'drill, saw, ladder',
      bidNotes: 'call me at 555-123-4567',
    });
    expect(hit).not.toBeNull();
    expect(hit!.field).toBe('bidNotes');
    expect(hit!.result.types).toContain('PHONE');
  });

  it('returns null when all fields are clean', () => {
    const hit = findContactInfoInFields({
      toolsNeeded: 'drill, saw',
      bidNotes: 'I can start Monday, deck is 10x12',
    });
    expect(hit).toBeNull();
  });
});

describe('CONTACT_INFO_VALIDATION_MESSAGE', () => {
  it('is the Stripe-safe user-facing copy', () => {
    expect(CONTACT_INFO_VALIDATION_MESSAGE).toContain('keep contact details and payment arrangements on TryHardly');
  });
});
