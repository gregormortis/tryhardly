'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import ImageUploader from '@/components/ImageUploader';

interface FormState {
  title: string;
  category: string;
  description: string;
  location: string;
  budget: string;
  timeline: string;
  name: string;
  email: string;
  phone: string;
  photoUrls: string;
  consent: boolean;
}

const initialState: FormState = {
  title: '',
  category: '',
  description: '',
  location: '',
  budget: '',
  timeline: '',
  name: '',
  email: '',
  phone: '',
  photoUrls: '',
  consent: false,
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

export default function RequestHelpForm() {
  const [data, setData] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const update = (field: keyof FormState, value: string | boolean) =>
    setData((prev) => ({ ...prev, [field]: value }));

  // Append a freshly uploaded URL to the comma-separated photoUrls field so it
  // flows through the existing lead payload and gallery logic unchanged.
  const appendPhotoUrl = (url: string) =>
    setData((prev) => {
      const existing = prev.photoUrls.trim();
      const next = existing ? `${existing}, ${url}` : url;
      return { ...prev, photoUrls: next.slice(0, 2000) };
    });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
  const canSubmit =
    data.title.trim().length > 0 && data.name.trim().length > 0 && validEmail && data.consent && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!data.title.trim()) return setError('Please add a short title for the job.');
    if (!data.name.trim()) return setError('Please add your name.');
    if (!validEmail) return setError('Please add a valid email so we can follow up.');
    if (!data.consent) return setError('Please agree to the terms to continue.');

    setSubmitting(true);
    try {
      await api.post('/leads/job-request', {
        title: data.title.trim(),
        category: data.category || undefined,
        description: data.description.trim() || undefined,
        location: data.location.trim() || undefined,
        budget: data.budget.trim() || undefined,
        timeline: data.timeline.trim() || undefined,
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || undefined,
        photoUrls: data.photoUrls.trim() || undefined,
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
          <h1 className="text-2xl font-bold text-white mb-3">Request received</h1>
          <p className="text-gray-400 leading-relaxed mb-6">
            Thanks{data.name ? `, ${data.name.split(' ')[0]}` : ''}! We&apos;ll line up local help for
            &ldquo;{data.title}&rdquo; and follow up at <span className="text-gray-200">{data.email}</span>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            We also emailed you a private link to check on and update your request — no account needed.
            Want to manage applicants yourself later? Creating an account is optional.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Create an account <ArrowRight size={16} />
            </Link>
            <Link
              href="/questboard"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-200 hover:border-amber-500 px-6 py-3 rounded-lg transition-colors"
            >
              Browse the questboard
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
          <h1 className="text-3xl font-bold text-white mb-2">Request help</h1>
          <p className="text-gray-400">
            Tell us what you need done. Takes about a minute — no account required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label required>What do you need done?</Label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => update('title', e.target.value.slice(0, 200))}
              className={inputClass}
              placeholder="e.g. Mow my front and back yard"
              required
            />
          </div>

          <div>
            <Label>Type of work</Label>
            <select
              value={data.category}
              onChange={(e) => update('category', e.target.value)}
              className={inputClass}
            >
              <option value="">Choose a category (optional)</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Details</Label>
            <textarea
              value={data.description}
              onChange={(e) => update('description', e.target.value.slice(0, 5000))}
              rows={4}
              className={inputClass}
              placeholder="Anything that helps a worker understand the job — size, access, what to bring, etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <input
                type="text"
                value={data.location}
                onChange={(e) => update('location', e.target.value.slice(0, 200))}
                className={inputClass}
                placeholder="City, ZIP, or neighborhood"
              />
            </div>
            <div>
              <Label>Budget</Label>
              <input
                type="text"
                value={data.budget}
                onChange={(e) => update('budget', e.target.value.slice(0, 120))}
                className={inputClass}
                placeholder="e.g. $50, or $40–60"
              />
            </div>
          </div>

          <div>
            <Label>Timeline / deadline</Label>
            <input
              type="text"
              value={data.timeline}
              onChange={(e) => update('timeline', e.target.value.slice(0, 200))}
              className={inputClass}
              placeholder="e.g. This weekend, or by next Friday"
            />
          </div>

          <div className="border-t border-gray-800 pt-5 space-y-4">
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

            <div>
              <Label>Phone (optional)</Label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => update('phone', e.target.value.slice(0, 40))}
                className={inputClass}
                placeholder="So a worker can reach you faster"
              />
            </div>

            <div>
              <Label>Photos (optional)</Label>
              <ImageUploader
                multiple
                onUploaded={appendPhotoUrl}
                disabled={submitting}
                className="mb-3"
              />
              <input
                type="text"
                value={data.photoUrls}
                onChange={(e) => update('photoUrls', e.target.value.slice(0, 2000))}
                className={inputClass}
                placeholder="Or paste image URLs, separated by commas"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={data.consent}
              onChange={(e) => update('consent', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-amber-400 hover:text-amber-300">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-amber-400 hover:text-amber-300">
                Privacy Policy
              </Link>
              .
            </span>
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
                <Loader2 size={18} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                Send request <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-600">
            Prefer to manage everything yourself?{' '}
            <Link href="/post-quest" className="text-amber-400 hover:text-amber-300">
              Post a quest with an account
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
