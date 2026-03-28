'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const DIFFICULTY_COLORS: Record<string, string> = {
  Novice: 'text-green-400 border-green-400',
  Apprentice: 'text-blue-400 border-blue-400',
  Journeyman: 'text-purple-400 border-purple-400',
  Expert: 'text-orange-400 border-orange-400',
  Master: 'text-red-400 border-red-400',
};

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quest, setQuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    fetchQuest();
  }, [params.id]);

  const fetchQuest = async () => {
    try {
      const data = await api.request<any>(`/quests/${params.id}`);
      setQuest(data);
    } catch (err) {
      // Use mock data fallback
      setQuest({
        _id: params.id,
        title: 'Slay the Frontend Dragon',
        description: 'We need a seasoned warrior to vanquish the bugs plaguing our React application. The dragon has been terrorizing our users with 500 errors and memory leaks. Must be comfortable with hooks, context, and performance optimization.\n\nYou will work closely with our guild of backend engineers to ensure seamless API integration. The quest requires someone who can read ancient TypeScript scrolls and transform them into working code.',
        reward: 2500,
        difficulty: 'Expert',
        category: 'Frontend',
        skills: ['React', 'TypeScript', 'Performance Optimization', 'CSS'],
        status: 'open',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        poster: { username: 'dragonslayer_guild', adventurerClass: 'Wizard' },
        applicants: 3,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    setApplying(true);
    setError('');
    try {
      await api.request(`/applications`, {
        method: 'POST',
        body: JSON.stringify({ questId: params.id }),
      });
      setApplied(true);
    } catch (err: any) {
      setError(err.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Loading quest scroll...</div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">404</div>
          <p className="text-gray-400">This quest has vanished into the aether.</p>
          <Link href="/questboard" className="text-amber-400 hover:text-amber-300 mt-4 inline-block">Return to Questboard</Link>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((new Date(quest.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const difficultyColor = DIFFICULTY_COLORS[quest.difficulty] || 'text-gray-400 border-gray-400';

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link href="/questboard" className="text-gray-400 hover:text-amber-400 text-sm transition-colors flex items-center gap-2 mb-8">
          <span>&#8592;</span> Back to Questboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <span className={`text-xs font-medium px-2 py-1 rounded border ${difficultyColor}`}>
                  {quest.difficulty}
                </span>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{quest.category}</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">{quest.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Posted by <span className="text-amber-400">{quest.poster?.username}</span></span>
                <span>&#8226;</span>
                <span>{quest.applicants || 0} adventurers applied</span>
                <span>&#8226;</span>
                <span className={daysLeft <= 2 ? 'text-red-400' : 'text-gray-400'}>
                  {daysLeft > 0 ? `${daysLeft}d remaining` : 'Expired'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quest Details</h2>
              <div className="text-gray-300 leading-relaxed whitespace-pre-line">{quest.description}</div>
            </div>

            {/* Skills */}
            {quest.skills && quest.skills.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {quest.skills.map((skill: string) => (
                    <span key={skill} className="px-3 py-1 bg-gray-800 text-amber-400 text-sm rounded-full border border-gray-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reward card */}
            <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-amber-400">${quest.reward?.toLocaleString()}</div>
                <div className="text-gray-500 text-sm mt-1">Quest Reward</div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {applied ? (
                <div className="text-center p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400">
                  Application submitted! The quest giver will contact you.
                </div>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying || quest.status !== 'open'}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-black py-3 rounded-lg transition-colors text-lg"
                >
                  {applying ? 'Submitting...' : isLoggedIn ? 'Accept Quest' : 'Sign in to Apply'}
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={quest.status === 'open' ? 'text-green-400' : 'text-gray-400'}>
                    {quest.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Deadline</span>
                  <span className="text-gray-300">{new Date(quest.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Posted</span>
                  <span className="text-gray-300">{new Date(quest.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Quest giver */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quest Giver</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold">
                  {quest.poster?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-white font-medium">{quest.poster?.username}</div>
                  <div className="text-gray-500 text-xs">{quest.poster?.adventurerClass || 'Adventurer'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
