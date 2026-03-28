'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import Link from 'next/link';

const CATEGORIES = ['Development', 'Design', 'Writing', 'Marketing', 'Data', 'Video', 'Audio', 'DevOps', 'Mobile', 'Other'];
const DIFFICULTIES = [
  { value: 'NOVICE', label: 'Novice', desc: 'Entry level task' },
  { value: 'APPRENTICE', label: 'Apprentice', desc: 'Some experience needed' },
  { value: 'JOURNEYMAN', label: 'Journeyman', desc: 'Solid skills required' },
  { value: 'EXPERT', label: 'Expert', desc: 'Advanced expertise' },
  { value: 'MASTER', label: 'Master', desc: 'Top-tier talent only' },
];
const SKILLS_OPTIONS = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'GraphQL', 'Next.js', 'Vue.js', 'Figma', 'Photoshop', 'SEO', 'Copywriting', 'Video Editing', 'Tableau', 'SQL'];

export default function PostQuestPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward: '',
    difficulty: 'APPRENTICE',
    category: 'Development',
    tags: [] as string[],
    deadline: '',
    xpReward: '',
  });

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/auth/login'); return; }
    setSubmitting(true);
    setError('');
    try {
      const quest = await api.post<{ quest: { id: string } }>('/quests', {
        ...form,
        reward: parseFloat(form.reward),
        xpReward: form.xpReward ? parseInt(form.xpReward) : Math.floor(parseFloat(form.reward) / 5),
        deadline: form.deadline || undefined,
      });
      router.push(`/questboard/${quest.quest.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post quest');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You must be signed in to post a quest.</p>
          <Link href="/auth/login" className="bg-amber-500 text-black font-semibold px-6 py-2.5 rounded-lg">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">➕ Post a Quest</h1>
        <p className="text-gray-400 mt-1">Find the perfect adventurer for your task</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-gray-200 mb-1">Quest Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quest Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Build a REST API for our marketplace"
              required
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Describe your quest in detail — requirements, deliverables, timeline..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Deadline (optional)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-gray-200 mb-1">Difficulty & Reward</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm({ ...form, difficulty: d.value })}
                  className={`p-2 rounded-lg border text-center text-xs transition-colors ${
                    form.difficulty === d.value
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">{d.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reward (USD) *</label>
              <input
                type="number"
                value={form.reward}
                onChange={e => setForm({ ...form, reward: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="500"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">XP Reward (optional)</label>
              <input
                type="number"
                value={form.xpReward}
                onChange={e => setForm({ ...form, xpReward: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="Auto-calculated"
                min="1"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-200 mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {SKILLS_OPTIONS.map(skill => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleTag(skill)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  form.tags.includes(skill)
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 text-black font-bold py-3 rounded-xl transition-colors text-lg"
        >
          {submitting ? 'Posting Quest...' : '⚔️ Post Quest'}
        </button>
      </form>
    </div>
  );
}
