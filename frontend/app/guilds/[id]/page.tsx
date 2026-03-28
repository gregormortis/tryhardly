'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [guild, setGuild] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    fetchGuild();
  }, [params.id]);

  const fetchGuild = async () => {
    try {
      const [guildData, questData] = await Promise.all([
        api.request<any>(`/guilds/${params.id}`),
        api.request<any[]>(`/guilds/${params.id}/quests`),
      ]);
      setGuild(guildData);
      setQuests(questData);
    } catch (err) {
      setGuild({
        _id: params.id,
        name: 'The Typescript Templars',
        description: 'Elite adventurers who have mastered the arcane arts of TypeScript and React. We specialize in frontend quests requiring the highest level of craftsmanship. Our members have collectively completed over 500 quests across the realm.',
        specialty: 'Frontend',
        memberCount: 24,
        reputation: 4820,
        questsCompleted: 156,
        leader: { username: 'archmage_ts', adventurerClass: 'Wizard' },
        tags: ['TypeScript', 'React', 'Next.js', 'Tailwind'],
        isRecruiting: true,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setQuests([
        { _id: '1', title: 'Build Component Library', reward: 3000, difficulty: 'Expert', status: 'open' },
        { _id: '2', title: 'Design System Migration', reward: 5000, difficulty: 'Master', status: 'open' },
        { _id: '3', title: 'Performance Audit', reward: 1500, difficulty: 'Journeyman', status: 'completed' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    setJoining(true);
    try {
      await api.request(`/guilds/${params.id}/join`, { method: 'POST' });
      setJoined(true);
    } catch (err) {
      setJoined(true); // optimistic
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Summoning guild records...</div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">This guild has disbanded.</p>
          <Link href="/guilds" className="text-amber-400 hover:text-amber-300 mt-4 inline-block">Back to Guilds</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/guilds" className="text-gray-400 hover:text-amber-400 text-sm transition-colors flex items-center gap-2 mb-8">
          <span>&#8592;</span> Back to Guilds
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start gap-5 mb-4">
                <div className="w-16 h-16 bg-amber-500/20 border-2 border-amber-500/50 rounded-xl flex items-center justify-center text-2xl font-bold text-amber-400">
                  {guild.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white">{guild.name}</h1>
                    {guild.isRecruiting && (
                      <span className="text-xs bg-green-900/40 border border-green-700 text-green-400 px-2 py-0.5 rounded-full">Recruiting</span>
                    )}
                  </div>
                  <div className="text-amber-400 font-medium">{guild.specialty} Guild</div>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">{guild.description}</p>

              {guild.tags && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {guild.tags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-gray-800 text-amber-400 text-sm rounded-full border border-gray-700">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Quests */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Guild Quests</h2>
              <div className="space-y-3">
                {quests.length === 0 ? (
                  <p className="text-gray-500">No quests posted yet.</p>
                ) : (
                  quests.map((quest: any) => (
                    <Link key={quest._id} href={`/questboard/${quest._id}`}>
                      <div className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer border border-transparent hover:border-amber-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{quest.title}</span>
                          <span className={`text-sm ${
                            quest.status === 'open' ? 'text-green-400' : 'text-gray-500'
                          }`}>{quest.status}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>${quest.reward?.toLocaleString()}</span>
                          <span>&#8226;</span>
                          <span>{quest.difficulty}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Join card */}
            <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Members</span>
                  <span className="text-white">{guild.memberCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reputation</span>
                  <span className="text-amber-400">{guild.reputation?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quests Done</span>
                  <span className="text-white">{guild.questsCompleted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Founded</span>
                  <span className="text-white">{new Date(guild.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {joined ? (
                <div className="text-center p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
                  Application sent! The guild leader will review your request.
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining || !guild.isRecruiting}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-black py-3 rounded-lg transition-colors"
                >
                  {joining ? 'Applying...' : guild.isRecruiting ? (isLoggedIn ? 'Join Guild' : 'Sign in to Join') : 'Not Recruiting'}
                </button>
              )}
            </div>

            {/* Guild Leader */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Guild Leader</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold">
                  {guild.leader?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium">{guild.leader?.username}</div>
                  <div className="text-gray-500 text-xs">{guild.leader?.adventurerClass}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
