import { cleanWebsiteUrl } from '../websiteUrl';

describe('cleanWebsiteUrl', () => {
  it('passes undefined through (field not provided)', () => {
    expect(cleanWebsiteUrl(undefined)).toBeUndefined();
  });

  it('treats null and blank strings as cleared', () => {
    expect(cleanWebsiteUrl(null)).toBeNull();
    expect(cleanWebsiteUrl('')).toBeNull();
    expect(cleanWebsiteUrl('   ')).toBeNull();
  });

  it('accepts personal sites and social profile URLs', () => {
    expect(cleanWebsiteUrl('https://acme-handyman.com')).toBe('https://acme-handyman.com/');
    expect(cleanWebsiteUrl('https://www.facebook.com/acmehandyman')).toBe(
      'https://www.facebook.com/acmehandyman'
    );
    expect(cleanWebsiteUrl('http://instagram.com/acme.handyman')).toBe(
      'http://instagram.com/acme.handyman'
    );
  });

  it('trims surrounding whitespace', () => {
    expect(cleanWebsiteUrl('  https://acme-handyman.com  ')).toBe('https://acme-handyman.com/');
  });

  it('rejects malformed URLs and non-http schemes', () => {
    expect(() => cleanWebsiteUrl('not a url')).toThrow('must be a valid URL');
    expect(() => cleanWebsiteUrl('ftp://example.com/x')).toThrow('must start with http');
    expect(() => cleanWebsiteUrl('javascript:alert(1)')).toThrow();
  });

  it('rejects non-string input and overlong URLs', () => {
    expect(() => cleanWebsiteUrl(123)).toThrow('must be a URL string');
    expect(() => cleanWebsiteUrl('https://example.com/' + 'a'.repeat(600))).toThrow('too long');
  });
});
