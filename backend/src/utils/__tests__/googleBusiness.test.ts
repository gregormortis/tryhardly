import { cleanGoogleBusinessUrl } from '../googleBusiness';

describe('cleanGoogleBusinessUrl', () => {
  it('passes undefined through (field not provided)', () => {
    expect(cleanGoogleBusinessUrl(undefined)).toBeUndefined();
  });

  it('treats null and blank strings as cleared', () => {
    expect(cleanGoogleBusinessUrl(null)).toBeNull();
    expect(cleanGoogleBusinessUrl('')).toBeNull();
    expect(cleanGoogleBusinessUrl('   ')).toBeNull();
  });

  it('accepts google.com maps/business links', () => {
    expect(cleanGoogleBusinessUrl('https://www.google.com/maps/place/Acme+Plumbing')).toBe(
      'https://www.google.com/maps/place/Acme+Plumbing'
    );
    expect(cleanGoogleBusinessUrl('https://business.google.com/v/acme-plumbing')).toBe(
      'https://business.google.com/v/acme-plumbing'
    );
  });

  it('accepts g.page and goo.gl short links', () => {
    expect(cleanGoogleBusinessUrl('https://g.page/acme-plumbing')).toBe('https://g.page/acme-plumbing');
    expect(cleanGoogleBusinessUrl('https://goo.gl/maps/abc123')).toBe('https://goo.gl/maps/abc123');
  });

  it('trims surrounding whitespace', () => {
    expect(cleanGoogleBusinessUrl('  https://g.page/acme  ')).toBe('https://g.page/acme');
  });

  it('rejects non-Google hosts', () => {
    expect(() => cleanGoogleBusinessUrl('https://yelp.com/biz/acme')).toThrow(
      'must point to a Google business page'
    );
    expect(() => cleanGoogleBusinessUrl('https://fakegoogle.com/maps')).toThrow(
      'must point to a Google business page'
    );
    // subdomain of a non-google domain that merely contains "google"
    expect(() => cleanGoogleBusinessUrl('https://google.evil.com/x')).toThrow(
      'must point to a Google business page'
    );
  });

  it('rejects malformed URLs and non-http schemes', () => {
    expect(() => cleanGoogleBusinessUrl('not a url')).toThrow('must be a valid URL');
    expect(() => cleanGoogleBusinessUrl('ftp://google.com/x')).toThrow('must start with http');
    expect(() => cleanGoogleBusinessUrl('javascript:alert(1)')).toThrow();
  });

  it('rejects non-string input and overlong URLs', () => {
    expect(() => cleanGoogleBusinessUrl(123)).toThrow('must be a URL string');
    expect(() => cleanGoogleBusinessUrl('https://g.page/' + 'a'.repeat(600))).toThrow('too long');
  });
});
