'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { readLeadSource, type LeadSource } from '@/lib/leadSource';

interface FormState {
  name: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  availability: string;
  hasTools: boolean;
}

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  location: '',
  skills: [],
  availability: '',
  hasTools: false,
};

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none';

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-gray-300 mb-1.5 text-sm font-medium">
      {children}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
  );
}

export default function WorkAlertsForm() {
  const [data, setData] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Capture acquisition attribution from the URL once on mount so it survives
  // any in-app navigation before the user submits the form.
  const leadSource = useRef<LeadSource>({});
  useEffect(() => {
    leadSource.current = readLeadSource();
  }, []);

  const update = (field: keyof FormState, value: string | boolean | string[]) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const toggleSkill = (slug: string) =>
    setData((prev) => ({
      ...prev,
      skills: prev.skills.includes(slug)
        ? prev.skills.filter((s) => s !== slug)
        : [...prev.skills, slug],
    }));

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
  const canSubmit = data.name.trim().length > 0 && validEmail && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!data.name.trim()) return setError('Please add your name.');
    if (!validEmail) return setError('Please add a valid email so we can send you alerts.');

    setSubmitting(true);
    try {
      await api.post('/leads/worker-alert', {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || undefined,
        location: data.location.trim() || undefined,
        skills: data.skills,
        availability: data.availability.trim() || undefined,
        hasTools: data.hasTools,
        ...leadSource.current,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-3">You&apos;re on the list</h1>
          <p className="text-gray-400 leading-relaxed mb-6">
            Thanks{data.name ? `, ${data.name.split(' ')[0]}` : ''}! We&apos;ll email{' '}
            <span className="text-gray-200">{data.email}</span> when local jobs that match come up.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Want to start now? Live jobs are on the questboard — applying takes an account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/questboard"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Browse the questboard <ArrowRight size={16} />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-200 hover:border-amber-500 px-6 py-3 rounded-lg transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Get local work alerts</h1>
          <p className="text-gray-400">
            Tell us what you do and where. We&apos;ll email you when matching jobs come up — no account
            required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Your name</Label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => update('name', e.target.value.slice(0, 120))}
                className={inputClass}
                placeholder="First name is fine"
                required
              />
            </div>
            <div>
              <Label required>Email</Label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => update('email', e.target.value.slice(0, 254))}
                className={inputClass}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Phone (optional)</Label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => update('phone', e.target.value.slice(0, 40))}
                className={inputClass}
                placeholder="For faster job offers"
              />
            </div>
            <div>
              <Label>Where you work</Label>
              <input
                type="text"
                value={data.location}
                onChange={(e) => update('location', e.target.value.slice(0, 200))}
                className={inputClass}
                placeholder="City, ZIP, or area"
              />
            </div>
          </div>

          <div>
            <Label>What kind of work?</Label>
            <div className="grid grid-cols-2 gap-2">
              {JOB_CATEGORIES.map((c) => {
                const active = data.skills.includes(c.slug);
                return (
                  <button
                    type="button"
                    key={c.slug}
                    onClick={() => toggleSkill(c.slug)}
                    className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Availability</Label>
            <input
              type="text"
              value={data.availability}
              onChange={(e) => update('availability', e.target.value.slice(0, 200))}
              className={inputClass}
              placeholder="e.g. Weekends, evenings, or full-time"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={data.hasTools}
              onChange={(e) => update('hasTools', e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
            />
            I have my own tools / truck
          </label>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold py-3 rounded-lg transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Signing up…
              </>
            ) : (
              <>
                Sign up for alerts <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-600">
            By signing up you agree to our{' '}
            <Link href="/terms" className="text-amber-400 hover:text-amber-300">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-amber-400 hover:text-amber-300">Privacy Policy</Link>.
          </p>

          <p className="text-center text-xs text-gray-600">
            Want to apply to jobs right now?{' '}
            <Link href="/questboard" className="text-amber-400 hover:text-amber-300">
              Browse the live questboard
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
