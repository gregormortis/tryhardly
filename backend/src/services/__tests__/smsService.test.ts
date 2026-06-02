/**
 * Unit tests for the SMS service. Focused on the env gating (Twilio disabled
 * unless all three vars are set), the disabled no-op behavior, and the compliant
 * message copy. The live Twilio HTTP call is not exercised here.
 */

import { readTwilioConfig, selectSmsProvider, smsTemplates } from '../smsService';

const FULL = {
  TWILIO_ACCOUNT_SID: 'ACxxxxxxxx',
  TWILIO_AUTH_TOKEN: 'secrettoken',
  TWILIO_FROM_NUMBER: '+15555550123',
} as NodeJS.ProcessEnv;

describe('readTwilioConfig', () => {
  it('returns config only when all three vars are present', () => {
    expect(readTwilioConfig(FULL)).toEqual({
      accountSid: 'ACxxxxxxxx',
      authToken: 'secrettoken',
      fromNumber: '+15555550123',
    });
  });

  it('returns null when any var is missing or blank', () => {
    expect(readTwilioConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(readTwilioConfig({ ...FULL, TWILIO_AUTH_TOKEN: '' })).toBeNull();
    expect(readTwilioConfig({ ...FULL, TWILIO_FROM_NUMBER: '   ' })).toBeNull();
    const { TWILIO_ACCOUNT_SID: _omit, ...noSid } = FULL;
    expect(readTwilioConfig(noSid)).toBeNull();
  });
});

describe('selectSmsProvider', () => {
  it('is disabled (no-op) when Twilio is not configured', async () => {
    const provider = selectSmsProvider({} as NodeJS.ProcessEnv);
    expect(provider.enabled).toBe(false);
    // A disabled send must resolve without throwing and without a network call.
    await expect(provider.send({ to: '+15555550123', body: 'hi' })).resolves.toBeUndefined();
  });

  it('is enabled when all Twilio vars are set', () => {
    const provider = selectSmsProvider(FULL);
    expect(provider.enabled).toBe(true);
  });
});

describe('smsTemplates.newLocalJobForWorker', () => {
  it('includes TryHardly identity, title, and the STOP notice', () => {
    const msg = smsTemplates.newLocalJobForWorker('+15555550123', { title: 'Yard cleanup' });
    expect(msg.to).toBe('+15555550123');
    expect(msg.body).toMatch(/TryHardly/);
    expect(msg.body).toMatch(/Yard cleanup/);
    expect(msg.body).toMatch(/Reply STOP to opt out\./);
  });

  it('includes city and budget when available', () => {
    const msg = smsTemplates.newLocalJobForWorker('+15555550123', {
      title: 'Yard cleanup',
      location: 'Redding, CA',
      budget: '$50',
    });
    expect(msg.body).toMatch(/Redding, CA/);
    expect(msg.body).toMatch(/\$50/);
  });

  it('omits missing city/budget gracefully', () => {
    const msg = smsTemplates.newLocalJobForWorker('+15555550123', { title: 'Yard cleanup' });
    expect(msg.body).not.toMatch(/\bin\b\s*$/);
    expect(msg.body).toContain('See work:');
  });
});
