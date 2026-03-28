'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const SPECIALTIES = [
  'Web Development', 'Mobile Development', 'Game Development',
  'Data Science', 'AI/ML', 'DevOps', 'Design', 'Content Creation',
  'Video Production', 'Writing', 'Marketing', '3D Art',
];

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏰</div>
          <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400 mb-6">You must be logged in to found a guild.</p>
          <Link href="/auth/login" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-lg">
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
      const data = await api.post('/guilds', form);
      router.push(`/guilds/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create guild');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/guilds" className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1 mb-4">
            ← Back to Guilds
          </Link>
          <h1 className="text-3xl font-bold text-white">Found a Guild</h1>
          <p className="text-gray-400 mt-1">Build your crew of adventurers and tackle quests together</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Guild Name */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Identity</h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Guild Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Iron Code Syndicate"
                maxLength={50}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Guild Tag * <span className="text-gray-500">(2-5 uppercase letters)</span>
              </label>
              <input
                type="text"
                value={form.tag}
                onChange={e => setForm({ ...form, tag: e.target.value.toUpperCase().slice(0, 5) })}
                placeholder="ICS"
                maxLength={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What does your guild specialize in? What kind of adventurers are you looking for?"
                rows={4}
                maxLength={500}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{form.description.length}/500</div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Specialty</label>
              <div className="grid grid-cols-3 gap-2">
                {SPECIALTIES.map(spec => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setForm({ ...form, specialty: form.specialty === spec ? '' : spec })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.specialty === spec
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-amber-500/50'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max Members</label>
              <input
                type="number"
                value={form.maxMembers}
                onChange={e => setForm({ ...form, maxMembers: parseInt(e.target.value) || 20 })}
                min={2}
                max={100}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isRecruiting: !form.isRecruiting })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  form.isRecruiting ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  form.isRecruiting ? 'left-7' : 'left-1'
                }`} />
              </button>
              <div>
                <div className="text-white font-medium">Open Recruiting</div>
                <div className="text-xs text-gray-500">Allow adventurers to apply to join</div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href="/guilds"
              className="flex-1 text-center bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-4 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold px-6 py-4 rounded-xl transition-colors"
            >
              {loading ? 'Founding...' : '⚔️ Found Guild'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
