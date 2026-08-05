'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{ message?: string }>('/auth/verify-email', { token });
        if (cancelled) return;
        setStatus('success');
        setMessage(res?.message || 'Email verified.');
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'This verification link is invalid or has expired.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">Confirm your email</h1>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-4">
          {status === 'checking' && <p className="text-gray-300">Verifying your email…</p>}
          {status === 'success' && (
            <>
              <div className="text-4xl">✅</div>
              <p className="text-gray-200">{message}</p>
              <Link
                href="/dashboard"
                className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                Go to dashboard
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-red-400">{message}</p>
              <p className="text-gray-400 text-sm">
                You can request a new verification link from your account settings.
              </p>
              <Link
                href="/auth/login"
                className="inline-block text-amber-400 hover:text-amber-300 text-sm font-medium"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
