'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const questId = searchParams.get('quest') || '';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-amber-400">Payment method authorized</h1>
          <div className="text-gray-300 space-y-3 text-sm leading-relaxed">
            <p>
              Your payment method has been authorized for this quest&mdash;
              <span className="text-white font-semibold"> you have not been charged yet</span>. An
              authorization is a temporary hold, not a completed payment, and may appear as a
              pending transaction on your statement.
            </p>
            <p>
              The final charge is captured only when the work is completed and confirmed. Once
              captured, the worker payout is processed through Stripe Connect, with TryHardly&rsquo;s
              flat 12% platform service fee applied.
            </p>
            <p>
              If the quest is canceled before the work is confirmed, the authorization is voided and
              no final charge is created.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {questId && (
              <Link
                href={`/questboard/${questId}`}
                className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2.5 px-5 rounded-lg transition-colors"
              >
                Back to quest
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-block bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
          <p className="pt-1">
            <Link href="/questboard" className="text-amber-400 hover:text-amber-300 text-sm">
              Browse the questboard
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
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <CheckoutSuccess />
    </Suspense>
  );
}
