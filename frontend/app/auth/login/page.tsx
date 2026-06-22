'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectParam = searchParams.get('redirect');
  const redirect = redirectParam && redirectParam.startsWith('/') ? redirectParam : null;

  // Tailor the heading/subtext to where the user was headed so a login wall
  // never feels like a generic dead end. Keep copy practical (post a job).
  const context =
    redirect === '/post-quest'
      ? {
          heading: 'Sign in to post a job',
          sub: 'Sign in or create a free account to post a job and start receiving bids.',
        }
      : redirect && redirect.startsWith('/questboard')
      ? {
          heading: 'Sign in to continue',
          sub: 'Sign in or create an account to bid on this job.',
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
      router.push(redirect ?? '/questboard');
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
          <h1 className="text-3xl font-bold text-amber-400 mb-2">{context.heading}</h1>
          <p className="text-gray-300">{context.sub}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 text-black font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/auth/forgot-password" className="text-gray-400 hover:text-amber-300">
              Forgot your password?
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-gray-800">
            <p className="text-center text-gray-400 text-sm mb-3">New to TryHardly?</p>
            <Link
              href={registerHref}
              className="block w-full text-center border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 font-semibold py-2.5 rounded-lg transition-colors"
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
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
