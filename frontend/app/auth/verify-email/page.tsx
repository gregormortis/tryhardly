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
          <h1 className="text-3xl font-bold text-accent-text mb-2">Confirm your email</h1>
        </div>
        <div className="bg-surface border border-line rounded-xl p-8 text-center space-y-4">
          {status === 'checking' && <p className="text-body">Verifying your email…</p>}
          {status === 'success' && (
            <>
              <div className="text-4xl">✅</div>
              <p className="text-body">{message}</p>
              <Link
                href="/dashboard"
                className="inline-block bg-accent hover:bg-accent text-on-accent font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                Go to dashboard
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-danger">{message}</p>
              <p className="text-muted text-sm">
                You can request a new verification link from your account settings.
              </p>
              <Link
                href="/auth/login"
                className="inline-block text-accent-text hover:text-accent-text-hover text-sm font-medium"
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
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
