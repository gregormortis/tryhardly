import {
  isPaymentAuthorized,
  isTestJobTitle,
  jobNextStep,
  lastActivityLabel,
  paymentStateView,
  primaryDashboardRole,
} from './dashboard';

describe('jobNextStep — poster', () => {
  const poster = { role: 'poster' as const };

  it('asks the poster to review bids only once bids exist', () => {
    expect(jobNextStep({ ...poster, questStatus: 'OPEN', applicationCount: 3 })).toMatchObject({
      label: '3 bids to review',
      cta: 'Review bids',
      actionRequired: true,
    });
    expect(jobNextStep({ ...poster, questStatus: 'OPEN', applicationCount: 0 })).toMatchObject({
      cta: 'Manage job',
      actionRequired: false,
    });
  });

  it('asks for an authorization on a booked job that has none', () => {
    expect(
      jobNextStep({ ...poster, questStatus: 'IN_PROGRESS', paymentStatus: 'NONE' })
    ).toMatchObject({
      label: 'Authorize payment to start the job',
      cta: 'Authorize payment',
      actionRequired: true,
    });
  });

  it('stops asking once the payment method is authorized', () => {
    expect(
      jobNextStep({ ...poster, questStatus: 'IN_PROGRESS', paymentStatus: 'AUTHORIZED' })
    ).toMatchObject({ cta: 'Manage job', actionRequired: false, tone: 'waiting' });
  });

  it('asks again after an authorization is canceled', () => {
    expect(
      jobNextStep({ ...poster, questStatus: 'IN_PROGRESS', paymentStatus: 'CANCELED' })
    ).toMatchObject({ cta: 'Authorize payment', actionRequired: true });
  });

  it('surfaces the completion handshake and then the review', () => {
    expect(jobNextStep({ ...poster, questStatus: 'IN_REVIEW' })).toMatchObject({
      cta: 'Confirm completion',
      actionRequired: true,
    });
    expect(jobNextStep({ ...poster, questStatus: 'COMPLETED' })).toMatchObject({
      cta: 'Leave review',
      actionRequired: true,
      hash: '#reviews',
    });
    expect(
      jobNextStep({ ...poster, questStatus: 'COMPLETED', viewerHasReviewed: true })
    ).toMatchObject({ actionRequired: false, tone: 'done' });
  });
});

describe('jobNextStep — worker', () => {
  const worker = { role: 'worker' as const };

  it('reads a pending bid as waiting on the poster', () => {
    expect(jobNextStep({ ...worker, applicationStatus: 'PENDING' })).toMatchObject({
      actionRequired: false,
      tone: 'waiting',
    });
  });

  it('does not ask the worker to start before payment is authorized', () => {
    expect(
      jobNextStep({
        ...worker,
        applicationStatus: 'ACCEPTED',
        questStatus: 'IN_PROGRESS',
        paymentStatus: 'NONE',
      })
    ).toMatchObject({
      label: 'Waiting on the poster to authorize payment',
      actionRequired: false,
    });
  });

  it('clears the worker to work once payment is authorized', () => {
    expect(
      jobNextStep({
        ...worker,
        applicationStatus: 'ACCEPTED',
        questStatus: 'IN_PROGRESS',
        paymentStatus: 'AUTHORIZED',
      })
    ).toMatchObject({ cta: 'Continue job', actionRequired: true });
  });

  it('keeps a submitted completion reachable while the poster confirms', () => {
    expect(
      jobNextStep({ ...worker, applicationStatus: 'ACCEPTED', questStatus: 'IN_REVIEW' })
    ).toMatchObject({ cta: 'View job', actionRequired: false });
  });

  it('prompts the worker for their own review', () => {
    expect(
      jobNextStep({ ...worker, applicationStatus: 'ACCEPTED', questStatus: 'COMPLETED' })
    ).toMatchObject({ cta: 'Leave review', actionRequired: true });
  });
});

describe('next-step priority', () => {
  // The action list is sorted on this, so the money and handshake steps have to
  // outrank an outstanding review.
  it('ranks the completion handshake and payment above housekeeping', () => {
    const rank = (input: Parameters<typeof jobNextStep>[0]) => jobNextStep(input).priority;
    const confirm = rank({ role: 'poster', questStatus: 'IN_REVIEW' });
    const authorize = rank({ role: 'poster', questStatus: 'IN_PROGRESS', paymentStatus: 'NONE' });
    const reviewBids = rank({ role: 'poster', questStatus: 'OPEN', applicationCount: 2 });
    const leaveReview = rank({ role: 'poster', questStatus: 'COMPLETED' });
    const waiting = rank({ role: 'worker', applicationStatus: 'PENDING' });

    expect(confirm).toBeLessThan(authorize);
    expect(authorize).toBeLessThan(reviewBids);
    expect(reviewBids).toBeLessThan(leaveReview);
    expect(leaveReview).toBeLessThan(waiting);
  });
});

describe('paymentStateView', () => {
  it('never uses hold/release/escrow wording', () => {
    const labels = (
      ['NONE', 'AUTHORIZED', 'CAPTURED', 'CANCELED', 'CAPTURE_FAILED'] as const
    ).flatMap(status =>
      (['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const).flatMap(questStatus =>
        (['poster', 'worker'] as const).map(
          role => paymentStateView(status, questStatus, role)?.label ?? ''
        )
      )
    );
    for (const label of labels) {
      expect(label).not.toMatch(/hold|release|escrow|custody|upfront/i);
    }
  });

  it('reports the authorization state through the job lifecycle', () => {
    expect(paymentStateView('AUTHORIZED', 'IN_PROGRESS', 'poster')?.label).toBe(
      'Payment authorized'
    );
    expect(paymentStateView('AUTHORIZED', 'IN_REVIEW', 'poster')?.label).toBe(
      'Ready for confirmation'
    );
    expect(paymentStateView('CAPTURED', 'COMPLETED', 'poster')?.label).toBe('Charge captured');
    expect(paymentStateView('CAPTURED', 'COMPLETED', 'worker')?.label).toBe('Payout processing');
  });

  it('omits a pill when there is no payment state yet', () => {
    expect(paymentStateView('NONE', 'OPEN', 'poster')).toBeNull();
    expect(paymentStateView('NONE', 'IN_PROGRESS', 'poster')).toBeNull();
    expect(paymentStateView(undefined, 'COMPLETED', 'worker')).toBeNull();
  });
});

describe('isPaymentAuthorized', () => {
  it('treats only a live authorization or capture as authorized', () => {
    expect(isPaymentAuthorized('AUTHORIZED')).toBe(true);
    expect(isPaymentAuthorized('CAPTURED')).toBe(true);
    expect(isPaymentAuthorized('NONE')).toBe(false);
    expect(isPaymentAuthorized('CANCELED')).toBe(false);
    expect(isPaymentAuthorized(undefined)).toBe(false);
  });
});

describe('primaryDashboardRole', () => {
  it('leads with the side the account actually uses', () => {
    expect(primaryDashboardRole(2, 0)).toBe('poster');
    expect(primaryDashboardRole(0, 3)).toBe('worker');
    expect(primaryDashboardRole(1, 4)).toBe('worker');
    expect(primaryDashboardRole(0, 0)).toBe('poster');
  });
});

describe('isTestJobTitle', () => {
  it('flags obvious QA rows', () => {
    expect(isTestJobTitle('TEST - ignore this job')).toBe(true);
    expect(isTestJobTitle('Fence repair (TEST)')).toBe(true);
    expect(isTestJobTitle('Do not work on this one')).toBe(true);
  });

  it('leaves real job titles alone', () => {
    expect(isTestJobTitle('Soil test for raised beds')).toBe(false);
    expect(isTestJobTitle('Testimonial video help')).toBe(false);
    expect(isTestJobTitle('')).toBe(false);
    expect(isTestJobTitle(undefined)).toBe(false);
  });
});

describe('lastActivityLabel', () => {
  const now = new Date('2026-07-26T12:00:00Z');

  it('omits the line when there is no timestamp to show', () => {
    expect(lastActivityLabel(undefined, now)).toBeNull();
    expect(lastActivityLabel('not-a-date', now)).toBeNull();
  });

  it('scales the unit with the age of the update', () => {
    expect(lastActivityLabel('2026-07-26T11:30:00Z', now)).toBe('Updated 30m ago');
    expect(lastActivityLabel('2026-07-26T09:00:00Z', now)).toBe('Updated 3h ago');
    expect(lastActivityLabel('2026-07-22T12:00:00Z', now)).toBe('Updated 4d ago');
  });
});
