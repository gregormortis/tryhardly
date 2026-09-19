import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeWorkAlertPhone, WORK_ALERT_SMS_DISCLOSURE } from './workAlertConsent';

describe('work-alert SMS consent contract', () => {
  it('keeps the displayed disclosure, version and phone validation identical to the backend', () => {
    const withoutComment = (path: string) => readFileSync(path, 'utf8').split('\n').slice(1).join('\n');
    expect(withoutComment(resolve(__dirname, 'workAlertConsent.ts'))).toBe(
      withoutComment(resolve(__dirname, '../../backend/src/utils/workAlertConsent.ts')),
    );
  });

  it.each(['5305550123', '(530) 555-0123', '+1 530 555 0123', '1-530-555-0123'])(
    'normalizes %s for the US launch',
    (phone) => expect(normalizeWorkAlertPhone(phone)).toBe('+15305550123'),
  );

  it.each(['', '555', 'hello5305550123', '+445305550123', '1305550123', '5301550123', '5305550123 ext 2'])(
    'rejects %s',
    (phone) => expect(normalizeWorkAlertPhone(phone)).toBeNull(),
  );

  it('contains the disclosures before the user opts in', () => {
    expect(WORK_ALERT_SMS_DISCLOSURE).toContain('Message frequency varies.');
    expect(WORK_ALERT_SMS_DISCLOSURE).toContain('Message and data rates may apply.');
    expect(WORK_ALERT_SMS_DISCLOSURE).toContain('STOP');
    expect(WORK_ALERT_SMS_DISCLOSURE).toContain('HELP');
    expect(WORK_ALERT_SMS_DISCLOSURE).toContain('not a condition of purchase or getting work');
    const form = readFileSync(resolve(__dirname, '../app/work-alerts/WorkAlertsForm.tsx'), 'utf8');
    expect(form).not.toContain('{data.smsAlertsOptIn && (');
    expect(form).toContain('aria-describedby="sms-consent-disclosure"');
    expect(form).toContain('smsAlertsOptIn: false');
  });
});
