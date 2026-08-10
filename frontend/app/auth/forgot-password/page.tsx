'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      // The backend always returns a generic success (no account enumeration),
      // so we show the same confirmation regardless of whether the email exists.
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-text mb-2">Reset your password</h1>
          <p className="text-muted">We&apos;ll email you a link to choose a new password</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <p className="text-body">
                If an account exists for <span className="text-accent-text">{email}</span>, a reset
                link is on its way. Check your inbox (and spam folder).
              </p>
              <Link
                href="/auth/login"
                className="inline-block text-accent-text hover:text-accent-text-hover text-sm font-medium"
              >
                ← Back to sign in
              </Link>
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
                  <label className="block text-sm font-medium text-body mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent disabled:bg-accent text-on-accent font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
              <p className="mt-6 text-center text-subtle text-sm">
                Remembered it?{' '}
                <Link href="/auth/login" className="text-accent-text hover:text-accent-text-hover">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
