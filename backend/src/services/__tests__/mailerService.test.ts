/**
 * Unit tests for mailerService provider selection — no live email calls.
 *
 * `fetch` is mocked so we can assert on what the Resend provider sends without
 * any network access or real API key.
 */

describe('mailerService', () => {
  const OLD_ENV = process.env;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.NODE_ENV;
    (global as any).fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('does not call fetch for the log provider', async () => {
    process.env.EMAIL_PROVIDER = 'log';
    const { sendEmail } = require('../mailerService');
    await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'body' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not call fetch for the noop provider', async () => {
    process.env.EMAIL_PROVIDER = 'noop';
    const { sendEmail } = require('../mailerService');
    await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'body' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends via Resend with the API key and From address when configured', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.EMAIL_FROM = 'TryHardly <no-reply@example.com>';
    const { sendEmail } = require('../mailerService');

    await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'body', html: '<p>body</p>' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(opts.headers.Authorization).toBe('Bearer re_test_123');
    const payload = JSON.parse(opts.body);
    expect(payload).toMatchObject({
      from: 'TryHardly <no-reply@example.com>',
      to: 'a@b.com',
      subject: 'Hi',
      text: 'body',
      html: '<p>body</p>',
    });
  });

  it('falls back to a non-sending provider when EMAIL_PROVIDER=resend but no key is set', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.NODE_ENV = 'production';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { sendEmail } = require('../mailerService');

    await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'body' });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('swallows provider errors so sending never breaks the primary action', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_123';
    mockFetch.mockResolvedValue({ ok: false, status: 422, text: async () => 'bad domain' });
    const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { sendEmail } = require('../mailerService');

    await expect(
      sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'body' }),
    ).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
