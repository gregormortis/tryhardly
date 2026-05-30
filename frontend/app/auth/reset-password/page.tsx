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
          <h1 className="text-3xl font-bold text-amber-400 mb-2">Choose a new password</h1>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          {!token ? (
            <div className="text-center space-y-4">
              <p className="text-gray-300">This reset link is missing its token or is invalid.</p>
              <Link
                href="/auth/forgot-password"
                className="inline-block text-amber-400 hover:text-amber-300 text-sm font-medium"
              >
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="text-gray-200">Password updated! Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 text-black font-semibold py-2.5 rounded-lg transition-colors"
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
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
