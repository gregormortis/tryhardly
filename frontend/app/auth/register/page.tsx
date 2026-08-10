'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { GUILD_PATHS } from '../../../lib/guildPath';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', adventurerClass: 'WARRIOR' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectParam = searchParams.get('redirect');
  const redirect = redirectParam && redirectParam.startsWith('/') ? redirectParam : null;
  const loginHref = redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login';

  // Someone arriving from the last step of the post-a-job wizard already filled
  // the form out, so say what the account is for and that their draft is waiting.
  const context =
    redirect === '/post-a-job'
      ? {
          heading: 'Create a free account to post your job',
          sub: 'Posting is free. The account is what lets you receive bids, message workers, and choose who does the work. Your job details are saved — you’ll come straight back to them.',
        }
      : {
          heading: 'Create your account',
          sub: 'Join TryHardly to post jobs or earn from local gigs',
        };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form.username, form.email, form.password);
      router.push(redirect ?? '/jobs');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-text mb-2">{context.heading}</h1>
          <p className="text-muted">{context.sub}</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-danger/30 border border-danger rounded-lg text-danger text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                placeholder="yourname"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Email</label>
              <input
                type="email"
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
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">What kind of work do you do?</label>
              <p className="text-xs text-subtle mb-2">Optional — helps us match you to the right jobs. Skip this if you&apos;re here to hire someone.</p>
              <div className="grid grid-cols-2 gap-2">
                {GUILD_PATHS.map(cls => (
                  <button
                    key={cls.value}
                    type="button"
                    onClick={() => setForm({ ...form, adventurerClass: cls.value })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      form.adventurerClass === cls.value
                        ? 'border-accent bg-accent/10'
                        : 'border-line-strong hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <span className="w-5 shrink-0 text-center">{cls.icon}</span>
                      <span>{cls.label}</span>
                    </div>
                    <div className="text-xs text-subtle">{cls.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent disabled:bg-accent text-on-accent font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-center text-muted text-sm">
            Already have an account?{' '}
            <Link href={loginHref} className="text-accent-text hover:text-accent-text-hover font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
