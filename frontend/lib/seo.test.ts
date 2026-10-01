import { canonicalUrl, siteUrl } from './seo';

describe('siteUrl', () => {
  it('returns the www origin without a trailing slash', () => {
    expect(siteUrl()).toBe('https://www.tryhardly.com');
  });
});

describe('canonicalUrl', () => {
  it('gives the homepage a trailing slash', () => {
    expect(canonicalUrl('/')).toBe('https://www.tryhardly.com/');
  });

  it('builds absolute URLs for subpaths without a trailing slash', () => {
    expect(canonicalUrl('/jobs')).toBe('https://www.tryhardly.com/jobs');
    expect(canonicalUrl('/jobs/yard-work')).toBe('https://www.tryhardly.com/jobs/yard-work');
  });

  it('tolerates a missing leading slash', () => {
    expect(canonicalUrl('jobs')).toBe('https://www.tryhardly.com/jobs');
  });

  it('strips trailing slashes except on the homepage, matching sitemap.xml', () => {
    expect(canonicalUrl('/jobs/')).toBe('https://www.tryhardly.com/jobs');
    expect(canonicalUrl('/')).toBe('https://www.tryhardly.com/');
  });

  it('handles dynamic job URLs', () => {
    expect(canonicalUrl('/job/abc-123')).toBe('https://www.tryhardly.com/job/abc-123');
  });

  it('defaults empty input to the homepage', () => {
    expect(canonicalUrl('')).toBe('https://www.tryhardly.com/');
  });
});
