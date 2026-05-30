'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface ClaimLead {
  id: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'IGNORED';
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  budget: string | null;
  timeline: string | null;
  photoUrls: string[];
  convertedQuestId: string | null;
  createdAt: string;
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none';

const STATUS_COPY: Record<ClaimLead['status'], { label: string; tone: string }> = {
  NEW: { label: 'Received — lining up help', tone: 'bg-amber-500/15 text-amber-300 border-amber-600/40' },
  CONTACTED: { label: 'We’ve reached out', tone: 'bg-sky-500/15 text-sky-300 border-sky-600/40' },
  CONVERTED: { label: 'Picked up — now a live quest', tone: 'bg-green-500/15 text-green-300 border-green-600/40' },
  IGNORED: { label: 'Closed', tone: 'bg-gray-600/20 text-gray-400 border-gray-600/40' },
};

function StatusBadge({ status }: { status: ClaimLead['status'] }) {
  const s = STATUS_COPY[status] ?? STATUS_COPY.NEW;
  return (
    <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border ${s.tone}`}>
      {s.label}
    </span>
  );
}

function ManageRequest() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [lead, setLead] = useState<ClaimLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Edit form state (contact + scheduling only — what's safe to self-serve).
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [timeline, setTimeline] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  // Resend flow (used when there's no/invalid token).
  const [resendEmail, setResendEmail] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resending, setResending] = useState(false);

  const hydrate = (l: ClaimLead) => {
    setLead(l);
    setPhone(l.phone || '');
    setLocation(l.location || '');
    setTimeline(l.timeline || '');
    setDescription(l.description || '');
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError('This link is missing its token.');
      return;
    }
    let active = true;
    (async () => {
      try {
        const { lead: l } = await api.get<{ lead: ClaimLead }>(
          `/leads/claim?token=${encodeURIComponent(token)}`,
        );
        if (active) hydrate(l);
      } catch (err: unknown) {
        if (active) setLoadError(err instanceof Error ? err.message : 'This link is invalid or has expired.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveMsg('');
    setSaving(true);
    try {
      const { lead: l } = await api.put<{ lead: ClaimLead }>(
        `/leads/claim?token=${encodeURIComponent(token)}`,
        {
          phone: phone.trim(),
          location: location.trim(),
          timeline: timeline.trim(),
          description: description.trim(),
        },
      );
      hydrate(l);
      setSaveMsg('Your changes have been saved.');
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResending(true);
    setResendMsg('');
    try {
      const { message } = await api.post<{ message: string }>('/leads/claim/resend', {
        email: resendEmail.trim(),
      });
      setResendMsg(message);
    } catch {
      // The endpoint is intentionally generic; show a generic line on error too.
      setResendMsg('If we have a request for that email, a fresh manage link is on its way.');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-400 inline-flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> Loading your request…
        </p>
      </div>
    );
  }

  // No valid lead: show a friendly explainer + a resend-by-email option.
  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-3 text-center">Manage your request</h1>
          <p className="text-gray-400 text-center mb-6">{loadError || 'This link is invalid or has expired.'}</p>
          <form onSubmit={handleResend} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <p className="text-sm text-gray-300">
              Enter the email you used and we’ll send you a fresh, private manage link.
            </p>
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value.slice(0, 254))}
              className={inputClass}
              placeholder="you@example.com"
              required
            />
            <button
              type="submit"
              disabled={resending}
              className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold py-3 rounded-lg transition-colors"
            >
              {resending ? <Loader2 size={18} className="animate-spin" /> : 'Send me a new link'}
            </button>
            {resendMsg && <p className="text-sm text-green-300 text-center">{resendMsg}</p>}
          </form>
          <p className="text-center text-xs text-gray-600 mt-6">
            <Link href="/request-help" className="text-amber-400 hover:text-amber-300">
              Start a new request
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const converted = lead.status === 'CONVERTED' || !!lead.convertedQuestId;

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{lead.title || 'Your request'}</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={lead.status} />
            <span className="text-xs text-gray-500">
              Submitted {new Date(lead.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {converted && (
          <div className="mb-6 bg-green-900/20 border border-green-700/50 rounded-lg p-4">
            <p className="text-green-200 text-sm mb-3">
              Good news — your request has been picked up and turned into a live quest.
            </p>
            {lead.convertedQuestId && (
              <Link
                href={`/quests/${lead.convertedQuestId}`}
                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium text-sm"
              >
                View the quest <ArrowRight size={15} />
              </Link>
            )}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Your details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Name</dt>
              <dd className="text-gray-200 text-right">{lead.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-200 text-right">{lead.email}</dd>
            </div>
            {lead.budget && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Budget</dt>
                <dd className="text-gray-200 text-right">{lead.budget}</dd>
              </div>
            )}
            {lead.category && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Category</dt>
                <dd className="text-gray-200 text-right">{lead.category}</dd>
              </div>
            )}
          </dl>
        </div>

        {converted ? (
          <p className="text-sm text-gray-500">
            This request has been picked up, so its details are now locked. Reach out via the quest if
            anything changes.
          </p>
        ) : (
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Update your request</h2>

            <div>
              <label className="block text-gray-300 mb-1.5 text-sm font-medium">Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                rows={4}
                className={inputClass}
                placeholder="Anything that helps a worker understand the job"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-1.5 text-sm font-medium">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.slice(0, 40))}
                  className={inputClass}
                  placeholder="So a worker can reach you"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1.5 text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value.slice(0, 200))}
                  className={inputClass}
                  placeholder="City, ZIP, or neighborhood"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-1.5 text-sm font-medium">Timeline / deadline</label>
              <input
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value.slice(0, 200))}
                className={inputClass}
                placeholder="e.g. This weekend"
              />
            </div>

            {saveError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                {saveError}
              </div>
            )}
            {saveMsg && (
              <div className="inline-flex items-center gap-2 text-green-300 text-sm">
                <CheckCircle size={16} /> {saveMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold py-3 rounded-lg transition-colors"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save changes'}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-gray-800 pt-6 text-center">
          <p className="text-sm text-gray-400 mb-3">Want to manage applicants yourself?</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-100 font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Create a free account <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ManageRequestClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <p className="text-gray-400">Loading…</p>
        </div>
      }
    >
      <ManageRequest />
    </Suspense>
  );
}
