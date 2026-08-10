'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function CheckoutCancel() {
  const searchParams = useSearchParams();
  const questId = searchParams.get('quest') || '';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <div className="w-full max-w-md text-center">
        <div className="bg-surface border border-line rounded-xl p-8 space-y-5">
          <div className="text-5xl">↩️</div>
          <h1 className="text-2xl font-bold text-accent-text">Authorization canceled</h1>
          <div className="text-body space-y-3 text-sm leading-relaxed">
            <p>
              You canceled the payment method setup, so&mdash;
              <span className="text-strong font-semibold"> no authorization was created and no final
              charge was made</span>. Nothing has been billed to your payment method.
            </p>
            <p>
              You can return to the job and authorize a payment method whenever you&rsquo;re ready.
              A payment is only captured after the work is completed and confirmed.
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
              href="/jobs"
              className="inline-block bg-raised hover:bg-raised-2 text-strong font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Browse the job board
            </Link>
          </div>
          <p className="pt-1">
            <Link href="/dashboard" className="text-accent-text hover:text-accent-text-hover text-sm">
              Go to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <CheckoutCancel />
    </Suspense>
  );
}
