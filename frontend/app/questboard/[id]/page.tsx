'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Quest, Application } from '@/lib/types';

const DIFFICULTY_COLORS: Record<string, string> = {
  NOVICE: 'text-green-400 border-green-400',
  APPRENTICE: 'text-blue-400 border-blue-400',
  JOURNEYMAN: 'text-yellow-400 border-yellow-400',
  EXPERT: 'text-orange-400 border-orange-400',
  MASTER: 'text-red-400 border-red-400',
  LEGENDARY: 'text-purple-400 border-purple-400',
};

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuest();
  }, [params.id]);

  const fetchQuest = async () => {
    setLoading(true);
    try {
      const data = await api.get<Quest>(`/quests/${params.id}`);
      setQuest(data);

      // Check if current user already applied
      if (data.applications && user) {
        const alreadyApplied = data.applications.some(app => app.adventurerId === user.id);
        if (alreadyApplied) setApplied(true);
      }
    } catch {
      setQuest(null);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user && quest && quest.questGiverId === user.id;

  const handleApply = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setApplying(true);
    setError('');
    try {
      await api.post(`/quests/${params.id}/apply`, {
        coverLetter: coverLetter || undefined,
      });
      setApplied(true);
      toast.success('Application submitted! The quest giver will review it.');
    } catch (err: any) {
      const msg = err.message || 'Failed to apply';
      setError(msg);
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading quest details...</p>
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📜</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Quest Not Found</h2>
          <p className="text-gray-400 mb-6">This quest has vanished into the aether.</p>
          <Link href="/questboard" className="text-amber-400 hover:text-amber-300 font-medium">
            ← Return to Questboard
          </Link>
        </div>
      </div>
    );
  }

  const poster = quest.questGiver;
  const daysLeft = quest.deadline
    ? Math.ceil((new Date(quest.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const difficultyColor = DIFFICULTY_COLORS[quest.difficulty] || 'text-gray-400 border-gray-400';

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link href="/questboard" className="text-gray-400 hover:text-amber-400 text-sm transition-colors flex items-center gap-2 mb-8">
          <span>←</span> Back to Questboard
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
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                {poster && (
                  <span>Posted by <span className="text-amber-400">{poster.username}</span></span>
                )}
                <span>•</span>
                <span>{quest._count?.applications || 0} adventurers applied</span>
                {daysLeft !== null && (
                  <>
                    <span>•</span>
                    <span className={daysLeft <= 2 ? 'text-red-400' : 'text-gray-400'}>
                      {daysLeft > 0 ? `${daysLeft}d remaining` : 'Expired'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quest Details</h2>
              <div className="text-gray-300 leading-relaxed whitespace-pre-line">{quest.description}</div>
            </div>

            {/* Tags */}
            {quest.tags && quest.tags.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {quest.tags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-gray-800 text-amber-400 text-sm rounded-full border border-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Applications (visible to quest owner) */}
            {isOwner && quest.applications && quest.applications.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Applications ({quest.applications.length})
                </h2>
                <div className="space-y-3">
                  {quest.applications.map((app: Application) => (
                    <div key={app.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm">
                          {app.adventurer?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{app.adventurer?.username}</p>
                          <p className="text-xs text-gray-500">
                            Lv.{app.adventurer?.level} • {app.adventurer?.adventurerClass || 'Adventurer'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        app.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                        app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {app.status}
                      </span>
                    </div>
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
                {quest.xpReward && (
                  <div className="text-sm text-yellow-400 mt-1">+{quest.xpReward} XP</div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {isOwner ? (
                <div className="text-center p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-400 text-sm">
                  This is your quest
                </div>
              ) : applied ? (
                <div className="text-center p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400">
                  ✓ Application submitted!
                </div>
              ) : (
                <div className="space-y-3">
                  {user && (
                    <textarea
                      value={coverLetter}
                      onChange={e => setCoverLetter(e.target.value)}
                      placeholder="Optional: Tell the quest giver why you're perfect for this..."
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 resize-none"
                    />
                  )}
                  <button
                    onClick={handleApply}
                    disabled={applying || quest.status !== 'OPEN'}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-black py-3 rounded-lg transition-colors text-lg"
                  >
                    {applying ? 'Submitting...' : user ? 'Accept Quest' : 'Sign in to Apply'}
                  </button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={quest.status === 'OPEN' ? 'text-green-400' : 'text-gray-400'}>
                    {quest.status?.replace('_', ' ')}
                  </span>
                </div>
                {quest.deadline && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Deadline</span>
                    <span className="text-gray-300">{new Date(quest.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Posted</span>
                  <span className="text-gray-300">{new Date(quest.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Quest giver */}
            {poster && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quest Giver</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold">
                    {poster.avatarUrl ? (
                      <img src={poster.avatarUrl} alt={poster.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      poster.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">{poster.username}</div>
                    {poster.level && <div className="text-amber-400 text-xs">Level {poster.level}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
