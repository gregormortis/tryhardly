import { jobLocationLabel, parseLocationLine } from './jobLocation';

describe('parseLocationLine', () => {
  it('reads the neighborhood, city and pay type off the first line', () => {
    const parsed = parseLocationLine('Location: 96001, CA · Pay: $120 flat\nFix the gate.');
    expect(parsed).toMatchObject({ neighborhood: '96001', city: 'CA', payType: 'flat' });
    expect(parsed.bodyText).toBe('Fix the gate.');
  });

  it('handles hourly pay and a location with no city half', () => {
    expect(parseLocationLine('Location: Online / Remote · Pay: $40 hourly')).toMatchObject({
      neighborhood: 'Online / Remote',
      city: '',
      payType: 'hourly',
    });
  });

  it('leaves a description without a location line untouched', () => {
    expect(parseLocationLine('Just a description')).toMatchObject({
      neighborhood: '',
      city: '',
      bodyText: 'Just a description',
    });
  });
});

describe('jobLocationLabel', () => {
  it('joins the parts it has and returns null when it has none', () => {
    expect(jobLocationLabel('Location: Enterprise, Redding CA · Pay: $200 flat')).toBe(
      'Enterprise · Redding CA'
    );
    expect(jobLocationLabel('Location: Redding CA · Pay: $200 flat')).toBe('Redding CA');
    expect(jobLocationLabel('No location line here')).toBeNull();
    expect(jobLocationLabel(undefined)).toBeNull();
  });
});
