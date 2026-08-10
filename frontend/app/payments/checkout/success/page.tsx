'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AUTHORIZATION_NOT_A_CHARGE } from '@/lib/paymentCopy';

function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const questId = searchParams.get('quest') || '';

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
