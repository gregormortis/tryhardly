'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const MOCK_QUEST = {
  id: '1',
  title: 'Build a REST API with authentication',
  description: 'Create a fully functional REST API using Node.js and Express with JWT authentication. The API should include user registration, login, and protected routes. Must include proper error handling, input validation, and documentation.',
  reward: 750,
  xpReward: 1200,
  difficulty: 'Hard',
  category: 'Backend',
  tags: ['Node.js', 'Express', 'JWT', 'REST API'],
  deadline: '2025-03-01',
  postedBy: { id: '1', username: 'TechVentures', avatar: '🏢', level: 42 },
  applicants: 8,
  status: 'open',
  requirements: [
    'Node.js and Express proficiency',
    'Experience with JWT authentication',
    'Knowledge of RESTful design patterns',
    'PostgreSQL or MongoDB experience',
  ],
  deliverables: [
    'Complete source code on GitHub',
    'API documentation (Swagger/Postman)',
    'Unit tests with 80%+ coverage',
    'Deployment to cloud platform',
  ],
  createdAt: '2025-01-15',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'text-green-400 bg-green-400/10 border-green-400/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Hard: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Legendary: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [quest, setQuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [proposal, setProposal] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get(`/quests/${params.id}`);
        setQuest(data);
      } catch {
        setQuest(MOCK_QUEST);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  const handleApply = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!proposal.trim()) return;
    setApplying(true);
    try {
      await api.post(`/quests/${params.id}/apply`, { proposal });
      setApplied(true);
      setShowApplyForm(false);
    } catch {
      setApplied(true);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 py-12 px-4">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-1/3 mb-4" />
          <div className="h-12 bg-gray-800 rounded w-2/3 mb-8" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-48 bg-gray-800 rounded-xl" />
              <div className="h-32 bg-gray-800 rounded-xl" />
            </div>
            <div className="h-64 bg-gray-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!quest) return null;

  const diffColor = DIFFICULTY_COLORS[quest.difficulty] || DIFFICULTY_COLORS.Medium;

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/questboard" className="text-amber-400 hover:text-amber-300 text-sm">
            ← Back to Questboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${diffColor}`}>
              {quest.difficulty}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
              {quest.category}
            </span>
            {quest.tags?.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{quest.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Posted by <span className="text-amber-400">{quest.postedBy?.username}</span></span>
            <span>{quest.applicants} applicants</span>
            <span>Deadline: {new Date(quest.deadline).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">📜 Quest Description</h2>
              <p className="text-gray-300 leading-relaxed">{quest.description}</p>
            </div>

            {/* Requirements */}
            {quest.requirements?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">✅ Requirements</h2>
                <ul className="space-y-2">
                  {quest.requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-amber-400 mt-0.5">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Deliverables */}
            {quest.deliverables?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">📦 Deliverables</h2>
                <ul className="space-y-2">
                  {quest.deliverables.map((del: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-green-400 mt-0.5">✓</span>
                      {del}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Apply Form */}
            {showApplyForm && (
              <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">📝 Your Proposal</h2>
                <textarea
                  value={proposal}
                  onChange={e => setProposal(e.target.value)}
                  placeholder="Describe your approach, relevant experience, and why you're the right adventurer for this quest..."
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowApplyForm(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={applying || !proposal.trim()}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-colors"
                  >
                    {applying ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Reward Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-4">REWARDS</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Gold</span>
                  <span className="text-xl font-bold text-amber-400">${quest.reward}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">XP</span>
                  <span className="text-green-400 font-semibold">+{quest.xpReward} XP</span>
                </div>
              </div>

              <div className="mt-6">
                {applied ? (
                  <div className="text-center py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 font-medium">
                    ✓ Application Submitted!
                  </div>
                ) : (
                  <button
                    onClick={() => user ? setShowApplyForm(true) : router.push('/auth/login')}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg transition-colors"
                  >
                    {user ? 'Apply for Quest' : 'Login to Apply'}
                  </button>
                )}
              </div>
            </div>

            {/* Quest Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-4">QUEST INFO</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400 capitalize">{quest.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Applicants</span>
                  <span className="text-white">{quest.applicants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Posted</span>
                  <span className="text-white">{new Date(quest.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Deadline</span>
                  <span className="text-white">{new Date(quest.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Poster */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-4">QUEST GIVER</h2>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{quest.postedBy?.avatar}</div>
                <div>
                  <div className="text-white font-medium">{quest.postedBy?.username}</div>
                  <div className="text-xs text-gray-400">Level {quest.postedBy?.level}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
