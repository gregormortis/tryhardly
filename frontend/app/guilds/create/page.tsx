'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { JOB_CATEGORIES } from '@/lib/jobCategories';

// Skill focus options come from the shared job-category config so a guild's
// stated focus lines up with the work actually posted on the board.
const SPECIALTIES = JOB_CATEGORIES.map(c => c.shortLabel);

export default function CreateGuildPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    tag: '',
    description: '',
    specialty: '',
    isRecruiting: true,
    maxMembers: 20,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-strong mb-2">Login Required</h2>
          <p className="text-muted mb-6">You need an account to start a guild.</p>
          <Link href="/auth/login" className="bg-accent hover:bg-accent text-on-accent font-semibold px-6 py-3 rounded-lg">
            Login
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Guild name is required');
    if (!form.tag.trim() || form.tag.length > 5) return setError('Tag must be 1-5 characters');
    if (!form.description.trim()) return setError('Description is required');

    setLoading(true);
    try {
      const data = await api.post('/guilds', form) as { id: string };
      router.push(`/guilds/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create guild');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/guilds" className="text-accent-text hover:text-accent-text-hover text-sm flex items-center gap-1 mb-4">
            ← Back to all guilds
          </Link>
          <h1 className="text-3xl font-bold text-strong">Start a guild</h1>
          <p className="text-muted mt-1">Bring workers together to share standards, mentor each other, and take on local jobs as a team</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-danger/30 border border-danger/30 text-danger px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Guild name */}
          <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-strong">Identity</h2>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Guild name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="North Side Trades"
                maxLength={50}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-3 text-strong placeholder-subtle focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Guild tag * <span className="text-subtle">(2-5 uppercase letters)</span>
              </label>
              <input
                type="text"
                value={form.tag}
                onChange={e => setForm({ ...form, tag: e.target.value.toUpperCase().slice(0, 5) })}
                placeholder="ICS"
                maxLength={5}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-3 text-strong placeholder-subtle focus:outline-none focus:border-accent font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What work does your team take on, and what kind of workers are you looking for?"
                rows={4}
                maxLength={500}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-3 text-strong placeholder-subtle focus:outline-none focus:border-accent resize-none"
              />
              <div className="text-right text-xs text-subtle mt-1">{form.description.length}/500</div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-strong">Settings</h2>

            <div>
              <label className="block text-sm font-medium text-body mb-2">Skill focus</label>
              <div className="grid grid-cols-3 gap-2">
                {SPECIALTIES.map(spec => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setForm({ ...form, specialty: form.specialty === spec ? '' : spec })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.specialty === spec
                        ? 'bg-accent border-accent text-on-accent'
                        : 'bg-raised border-line-strong text-body hover:border-accent/50'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Maximum workers</label>
              <input
                type="number"
                value={form.maxMembers}
                onChange={e => setForm({ ...form, maxMembers: parseInt(e.target.value) || 20 })}
                min={2}
                max={100}
                className="w-full bg-raised border border-line-strong rounded-lg px-4 py-3 text-strong focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isRecruiting: !form.isRecruiting })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  form.isRecruiting ? 'bg-success' : 'bg-raised-2'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-surface transition-transform ${
                  form.isRecruiting ? 'left-7' : 'left-1'
                }`} />
              </button>
              <div>
                <div className="text-strong font-medium">Open to new members</div>
                <div className="text-xs text-subtle">Let workers ask to join your team</div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href="/guilds"
              className="flex-1 text-center bg-raised hover:bg-raised-2 text-body font-semibold px-6 py-4 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent hover:bg-accent disabled:opacity-50 text-on-accent font-bold px-6 py-4 rounded-xl transition-colors"
            >
              {loading ? 'Creating...' : 'Create guild'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
