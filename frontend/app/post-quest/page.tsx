'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const CATEGORIES = ['Frontend', 'Backend', 'Design', 'DevOps', 'Mobile', 'Data', 'Security', 'Other'];
const DIFFICULTIES = ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master'];
const SKILLS_OPTIONS = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'GraphQL', 'Next.js', 'Vue.js', 'Kubernetes', 'Rust', 'Go', 'Java', 'Swift', 'Figma'];

export default function PostQuestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward: '',
    difficulty: 'Apprentice',
    category: 'Frontend',
    skills: [] as string[],
    deadline: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
    }
  }, []);

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.reward || !form.deadline) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const quest = await api.request<any>('/quests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          reward: Number(form.reward),
        }),
      });
      router.push(`/questboard/${quest._id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to post quest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Post a Quest</h1>
          <p className="text-gray-400">Describe your quest and find the adventurer to complete it.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Quest Title <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Slay the Frontend Dragon"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Quest Description <span className="text-amber-400">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the quest in detail. What needs to be done? What does success look like?"
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Reward & Deadline */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Reward (USD) <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={form.reward}
                  onChange={e => setForm({ ...form, reward: e.target.value })}
                  placeholder="500"
                  min="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Deadline <span className="text-amber-400">*</span>
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Category & Difficulty */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={e => setForm({ ...form, difficulty: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-medium mb-3">Required Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILLS_OPTIONS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    form.skills.includes(skill)
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-black py-4 rounded-xl transition-colors text-lg"
          >
            {loading ? 'Posting Quest...' : 'Post Quest'}
          </button>
        </form>
      </div>
    </div>
  );
}
