'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const CLASS_ICONS: Record<string, string> = {
  Warrior: 'assets/icons/warrior.svg',
  Wizard: 'assets/icons/wizard.svg',
  Rogue: 'assets/icons/rogue.svg',
  Paladin: 'assets/icons/paladin.svg',
  Ranger: 'assets/icons/ranger.svg',
  Bard: 'assets/icons/bard.svg',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quests' | 'applications'>('quests');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [userData, questData, appData] = await Promise.all([
        api.request<any>('/users/me'),
        api.request<any[]>('/users/me/quests'),
        api.request<any[]>('/users/me/applications'),
      ]);
      setUser(userData);
      setQuests(questData);
      setApplications(appData);
    } catch (err) {
      // Mock data fallback
      setUser({
        username: 'shadow_rogue',
        email: 'rogue@tryhardly.gg',
        adventurerClass: 'Rogue',
        bio: 'Full-stack adventurer specializing in stealthy bug fixes and rapid deployments. 5 years of dungeon crawling experience.',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        reputation: 847,
        questsCompleted: 23,
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setQuests([
        { _id: '1', title: 'Fix Authentication Bug', status: 'completed', reward: 500, difficulty: 'Apprentice' },
        { _id: '2', title: 'Build Dashboard Widget', status: 'in_progress', reward: 1200, difficulty: 'Journeyman' },
      ]);
      setApplications([
        { _id: '1', quest: { title: 'Optimize Database Queries', reward: 2000 }, status: 'pending', appliedAt: new Date().toISOString() },
        { _id: '2', quest: { title: 'Design Mobile UI', reward: 800 }, status: 'accepted', appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Loading adventurer profile...</div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: 'text-green-400',
    completed: 'text-blue-400',
    in_progress: 'text-amber-400',
    cancelled: 'text-red-400',
    pending: 'text-yellow-400',
    accepted: 'text-green-400',
    rejected: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500/50 rounded-full flex items-center justify-center text-3xl font-bold text-amber-400">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{user?.username}</h1>
                <div className="text-amber-400 font-medium">{user?.adventurerClass}</div>
                <div className="text-gray-500 text-sm mt-1">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 text-sm transition-colors border border-gray-700 hover:border-red-700 px-4 py-2 rounded-lg"
            >
              Sign Out
            </button>
          </div>

          {user?.bio && (
            <p className="mt-6 text-gray-300 leading-relaxed">{user.bio}</p>
          )}

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{user?.reputation || 0}</div>
              <div className="text-gray-500 text-xs mt-1">Reputation</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{user?.questsCompleted || 0}</div>
              <div className="text-gray-500 text-xs mt-1">Quests Done</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {Math.floor((Date.now() - new Date(user?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-gray-500 text-xs mt-1">Days Active</div>
            </div>
          </div>

          {/* Skills */}
          {user?.skills && user.skills.length > 0 && (
            <div className="mt-6">
              <div className="text-gray-400 text-sm mb-2">Skills</div>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill: string) => (
                  <span key={skill} className="px-3 py-1 bg-gray-800 text-amber-400 text-sm rounded-full border border-gray-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div>
          <div className="flex border-b border-gray-800 mb-6">
            <button
              onClick={() => setActiveTab('quests')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'quests'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              My Quests ({quests.length})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'applications'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Applications ({applications.length})
            </button>
          </div>

          {activeTab === 'quests' && (
            <div className="space-y-4">
              {quests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No quests posted yet.</p>
                  <Link href="/post-quest" className="text-amber-400 hover:text-amber-300 mt-2 inline-block">Post your first quest</Link>
                </div>
              ) : (
                quests.map((quest: any) => (
                  <Link key={quest._id} href={`/questboard/${quest._id}`}>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-amber-500/40 transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">{quest.title}</h3>
                        <span className={`text-sm font-medium ${statusColors[quest.status] || 'text-gray-400'}`}>
                          {quest.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>${quest.reward?.toLocaleString()}</span>
                        <span>{quest.difficulty}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No applications yet.</p>
                  <Link href="/questboard" className="text-amber-400 hover:text-amber-300 mt-2 inline-block">Browse quests</Link>
                </div>
              ) : (
                applications.map((app: any) => (
                  <div key={app._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">{app.quest?.title}</h3>
                      <span className={`text-sm font-medium capitalize ${statusColors[app.status] || 'text-gray-400'}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>${app.quest?.reward?.toLocaleString()}</span>
                      <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
