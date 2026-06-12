'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function CheckoutCancel() {
  const searchParams = useSearchParams();
  const questId = searchParams.get('quest') || '';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">
          <div className="text-5xl">↩️</div>
          <h1 className="text-2xl font-bold text-amber-400">Authorization canceled</h1>
          <div className="text-gray-300 space-y-3 text-sm leading-relaxed">
            <p>
              You canceled the payment method setup, so&mdash;
              <span className="text-white font-semibold"> no authorization was created and no final
              charge was made</span>. Nothing has been billed to your payment method.
            </p>
            <p>
              You can return to the quest and authorize a payment method whenever you&rsquo;re ready.
              A payment is only captured after the work is completed and confirmed.
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
              href="/questboard"
              className="inline-block bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Browse the questboard
            </Link>
          </div>
          <p className="pt-1">
            <Link href="/dashboard" className="text-amber-400 hover:text-amber-300 text-sm">
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
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <CheckoutCancel />
    </Suspense>
  );
}
