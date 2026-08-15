'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AUTHORIZATION_NOT_A_CHARGE } from '@/lib/paymentCopy';
import { PLATFORM_PAYMENTS_ENABLED } from '@/lib/paymentsMode';

// This page is unreachable through any real flow in direct-settlement mode —
// nothing creates a checkout session — but the URL is still typeable and
// crawlable, and it was telling anyone who landed on it that their card had
// been authorized and that TryHardly applies a 12% platform fee. Neither is
// true today. Guarded rather than deleted so the platform-mode copy survives
// intact behind PAYMENTS_MODE.
function DirectSettlementNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md text-center">
        <div className="card space-y-5">
          <h1 className="text-2xl font-bold text-strong">
            TryHardly does not take payments
          </h1>
          <p className="text-base leading-relaxed text-body">
            There is no checkout on TryHardly and nothing has been charged. You
            and your worker agree a price on the job page, and then you pay each
            other directly.
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-center">
            <Link href="/how-it-works" className="btn-primary">
              How this works
            </Link>
            <Link href="/jobs" className="btn-secondary">
              Browse jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const questId = searchParams.get('quest') || '';

  if (!PLATFORM_PAYMENTS_ENABLED) return <DirectSettlementNotice />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <div className="w-full max-w-md text-center">
        <div className="bg-surface border border-line rounded-xl p-8 space-y-5">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-accent-text">Payment method authorized</h1>
          <div className="text-body space-y-3 text-sm leading-relaxed">
            <p>
              Your payment method has been authorized for this job&mdash;
              <span className="text-strong font-semibold"> you have not been charged yet</span>. An
              authorization is not a final charge, and may appear as a pending transaction on your
              statement.
            </p>
            <p>
              {AUTHORIZATION_NOT_A_CHARGE} Once captured, the worker payout is processed through
              Stripe Connect, with TryHardly&rsquo;s flat 12% platform service fee applied.
            </p>
            <p>
              If the job is canceled before the work is confirmed, the authorization is voided and
              no final charge is created.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {questId && (
              <Link
                href={`/job/${questId}`}
                className="inline-block bg-accent hover:bg-accent text-on-accent font-semibold py-2.5 px-5 rounded-lg transition-colors"
              >
                Back to job
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-block bg-raised hover:bg-raised-2 text-strong font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
          <p className="pt-1">
            <Link href="/jobs" className="text-accent-text hover:text-accent-text-hover text-sm">
              Browse the job board
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <CheckoutSuccess />
    </Suspense>
  );
}
