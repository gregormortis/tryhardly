'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Site-wide service status banner.
 *
 * WHY THIS EXISTS
 *   As of August 2026 the platform's payment processing is paused pending a
 *   processor review, while worker recruiting for the Redding launch is
 *   actively under way. Before this banner, nothing anywhere on the site said
 *   so — meanwhile /find-work-fast told workers their "eligible earnings" are
 *   "paid out after charge capture" and the payout-setup flow would fail for
 *   anyone who tried it.
 *
 *   Recruiting supply into a silent, broken payout flow is the fastest way to
 *   lose it. Gig marketplaces lose 60-70% of newly acquired workers within 90
 *   days under normal conditions; a worker who signs up, tries to connect a
 *   payout account, hits an unexplained error, and hears nothing does not come
 *   back. Saying it plainly up front costs a little conversion and keeps the
 *   trust, which is the only asset a pre-launch marketplace actually has.
 *
 * BEHAVIOUR
 *   Renders only when NEXT_PUBLIC_SERVICE_STATUS is set to a known key, so the
 *   default state is invisible and it disappears the moment the variable is
 *   cleared. No code change is needed to take it down.
 *
 *   Dismissal is stored in sessionStorage, not localStorage: a visitor can get
 *   it out of the way for the current visit, but it returns next time rather
 *   than being permanently hidden from someone who may be about to sign up.
 */

type StatusKey = 'payments_paused' | 'maintenance';

const STATUSES: Record<StatusKey, { headline: string; detail: string; href: string; cta: string }> =
  {
    payments_paused: {
      // Copy updated 2026-08-09: the processor review concluded and was
      // declined, so "completes a review" became untrue the moment it landed.
      // A status banner that is out of date is worse than none.
      headline: 'Booking and payouts are temporarily unavailable.',
      detail:
        'We are moving to a new payment processor. You can browse jobs, post a job, and join the worker list now, and everyone on the list gets an email the day booking reopens.',
      href: '/support',
      cta: 'Questions',
    },
    maintenance: {
      headline: 'TryHardly is undergoing scheduled maintenance.',
      detail: 'Some features may be briefly unavailable. Everything else works normally.',
      href: '/support',
      cta: 'Contact support',
    },
  };

const DISMISS_KEY = 'th_status_dismissed';

export default function ServiceStatusBanner() {
  const raw = process.env.NEXT_PUBLIC_SERVICE_STATUS as StatusKey | undefined;
  const status = raw && raw in STATUSES ? STATUSES[raw as StatusKey] : null;

  // Start hidden and reveal after mount. Rendering server-side then hiding on
  // the client would flash the banner for dismissed visitors.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!status) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) !== raw) setVisible(true);
    } catch {
      // Private mode or storage disabled — showing the banner is the safe default.
      setVisible(true);
    }
  }, [status, raw]);

  if (!status || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      if (raw) sessionStorage.setItem(DISMISS_KEY, raw);
    } catch {
      /* dismissal is a convenience, not a requirement */
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-accent/30 bg-accent/10 px-4 py-3 text-body sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
        />
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <span className="font-semibold text-strong">{status.headline}</span>{' '}
          <span className="text-muted">{status.detail}</span>{' '}
          <Link
            href={status.href}
            className="whitespace-nowrap font-medium text-accent-text underline underline-offset-2 hover:text-accent-text-hover"
          >
            {status.cta}
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this notice"
          className="-m-1.5 shrink-0 rounded p-1.5 text-subtle transition-colors hover:text-strong"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
