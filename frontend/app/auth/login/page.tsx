'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, logout, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectParam = searchParams.get('redirect');
  const redirect = redirectParam && redirectParam.startsWith('/') ? redirectParam : null;

  // Tailor the heading/subtext to where the user was headed so a login wall
  // never feels like a generic dead end. Keep copy practical (post a job).
  const context =
    redirect === '/post-a-job'
      ? {
          heading: 'Sign in to post your job',
          sub: 'Posting is free. An account is what lets you receive bids, message workers, and choose who does the work. Any job details you already filled in are saved.',
        }
      : redirect && redirect.startsWith('/jobs')
      ? {
          heading: 'Sign in to bid on this job',
          sub: 'A free account lets you send the poster a detailed bid. If you get the job, agree on payment directly with the poster before you start.',
        }
      : {
          heading: 'Welcome back',
          sub: 'Sign in or create an account to continue.',
        };

  const registerHref = redirect
    ? `/auth/register?redirect=${encodeURIComponent(redirect)}`
    : '/auth/register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      // A returning user's own jobs, bids, and new-bid activity are the reason
      // they signed in. Landing on the public board buried all of it behind the
      // account menu. An explicit ?redirect= still wins.
      router.push(redirect ?? '/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-text mb-2">{context.heading}</h1>
          <p className="text-body">{context.sub}</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-8">
          {/* One browser session is shared across accounts, so someone who is
              already signed in needs to see whose session they are about to
              replace rather than silently acting as the wrong account. */}
          {user && (
            <div className="mb-5 rounded-lg border border-line-strong bg-raised p-3 text-sm">
              <p className="text-body">
                Already signed in as{' '}
                <span className="font-medium text-accent-text">{user.email}</span>.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push(redirect ?? '/dashboard')}
                  className="text-accent-text hover:text-accent-text-hover"
                >
                  Continue as {user.username}
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-muted hover:text-body"
                >
                  Sign out and use another account
                </button>
              </div>
            </div>
          )}
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
                autoComplete="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent disabled:bg-accent text-on-accent font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/auth/forgot-password" className="text-muted hover:text-accent-text-hover">
              Forgot your password?
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-line">
            <p className="text-center text-muted text-sm mb-3">New to TryHardly?</p>
            <Link
              href={registerHref}
              className="block w-full text-center border border-accent/50 text-accent-text hover:bg-accent/10 font-semibold py-2.5 rounded-lg transition-colors"
            >
              Create a free account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
