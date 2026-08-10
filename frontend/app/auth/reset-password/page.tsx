'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-text mb-2">Choose a new password</h1>
        </div>
        <div className="bg-surface border border-line rounded-xl p-8">
          {!token ? (
            <div className="text-center space-y-4">
              <p className="text-body">This reset link is missing its token or is invalid.</p>
              <Link
                href="/auth/forgot-password"
                className="inline-block text-accent-text hover:text-accent-text-hover text-sm font-medium"
              >
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="text-body">Password updated! Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-danger/30 border border-danger rounded-lg text-danger text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-body mb-1">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent disabled:bg-accent text-on-accent font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {loading ? 'Updating...' : 'Reset password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
