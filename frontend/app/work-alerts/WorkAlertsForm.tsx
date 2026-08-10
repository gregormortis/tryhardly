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
  emailAlertsOptIn: boolean;
  smsAlertsOptIn: boolean;
  budgetMin: string;
  budgetMax: string;
}

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  location: '',
  skills: [],
  availability: '',
  hasTools: false,
  emailAlertsOptIn: true,
  smsAlertsOptIn: false,
  budgetMin: '',
  budgetMax: '',
};

const inputClass =
  'w-full bg-raised border border-line-strong rounded-lg px-4 py-3 text-strong placeholder-subtle focus:border-accent focus:outline-none';

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-body mb-1.5 text-sm font-medium">
      {children}
      {required && <span className="text-danger ml-1">*</span>}
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
        emailAlertsOptIn: data.emailAlertsOptIn,
        smsAlertsOptIn: data.smsAlertsOptIn,
        budgetMin: data.budgetMin.trim() || undefined,
        budgetMax: data.budgetMax.trim() || undefined,
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
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <CheckCircle size={48} className="text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-strong mb-3">You&apos;re on the list</h1>
          <p className="text-muted leading-relaxed mb-6">
            Thanks{data.name ? `, ${data.name.split(' ')[0]}` : ''}! We&apos;ll email{' '}
            <span className="text-body">{data.email}</span> when local jobs that match come up.
          </p>
          <p className="text-sm text-subtle mb-8">
            Want to start now? Live jobs are on the job board — applying takes an account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent text-on-accent font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Browse the job board <ArrowRight size={16} />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 border border-line-strong text-body hover:border-accent px-6 py-3 rounded-lg transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-strong mb-2">Get local work alerts</h1>
          <p className="text-muted">
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
                        ? 'border-accent bg-accent/10 text-accent-text-hover'
                        : 'border-line-strong text-body hover:border-line-strong'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Minimum pay you&apos;ll take (optional)</Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={data.budgetMin}
                onChange={(e) => update('budgetMin', e.target.value.slice(0, 9))}
                className={inputClass}
                placeholder="Min $"
                aria-label="Minimum pay"
              />
              <span className="text-subtle text-sm">to</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={data.budgetMax}
                onChange={(e) => update('budgetMax', e.target.value.slice(0, 9))}
                className={inputClass}
                placeholder="Max $ (optional)"
                aria-label="Maximum pay"
              />
            </div>
            <p className="text-xs text-subtle mt-1">
              We&apos;ll skip alerts for jobs that pay below your minimum.
            </p>
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

          <label className="flex items-center gap-3 text-sm text-body">
            <input
              type="checkbox"
              checked={data.hasTools}
              onChange={(e) => update('hasTools', e.target.checked)}
              className="h-4 w-4 rounded border-line-strong bg-raised text-accent-text focus:ring-accent"
            />
            I have my own tools / truck
          </label>

          <fieldset className="border border-line rounded-lg p-4 space-y-3">
            <legend className="px-1 text-sm font-medium text-body">How should we reach you?</legend>

            <label className="flex items-start gap-3 text-sm text-body">
              <input
                type="checkbox"
                checked={data.emailAlertsOptIn}
                onChange={(e) => update('emailAlertsOptIn', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line-strong bg-raised text-accent-text focus:ring-accent"
              />
              <span>
                Email me when matching jobs come up
                <span className="block text-xs text-subtle">Recommended — this is how alerts are sent today.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-body">
              <input
                type="checkbox"
                checked={data.smsAlertsOptIn}
                onChange={(e) => update('smsAlertsOptIn', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line-strong bg-raised text-accent-text focus:ring-accent"
              />
              <span>
                Text me job alerts
                <span className="block text-xs text-subtle">
                  Add your phone above and we&apos;ll include you when text alerts go live. Email alerts start right away.
                </span>
              </span>
            </label>

            {data.smsAlertsOptIn && (
              <p className="text-[12px] leading-relaxed text-subtle border-t border-line pt-3">
                By opting in you agree to receive recurring automated job-alert texts from TryHardly at
                the number you provide. Consent is not a condition of getting work. Message &amp; data
                rates may apply. Reply <span className="text-muted font-medium">STOP</span> to cancel
                or <span className="text-muted font-medium">HELP</span> for help. See our{' '}
                <Link href="/terms" className="text-accent-text hover:text-accent-text-hover">Terms</Link> and{' '}
                <Link href="/privacy" className="text-accent-text hover:text-accent-text-hover">Privacy Policy</Link>.
              </p>
            )}
          </fieldset>

          {error && (
            <div className="bg-danger/30 border border-danger rounded-lg p-3 text-danger text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-semibold py-3 rounded-lg transition-colors"
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

          <p className="text-center text-xs text-subtle">
            By signing up you agree to our{' '}
            <Link href="/terms" className="text-accent-text hover:text-accent-text-hover">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-accent-text hover:text-accent-text-hover">Privacy Policy</Link>.
          </p>

          <p className="text-center text-xs text-subtle">
            Want to apply to jobs right now?{' '}
            <Link href="/jobs" className="text-accent-text hover:text-accent-text-hover">
              Browse the live job board
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
