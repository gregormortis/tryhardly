'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { GUILD_DEFINITION, jobSkillLevelLabel, jobStatusLabel } from '@/lib/guildCopy';
import { guildPathLabel } from '@/lib/guildPath';
import { loadGuildDetail, guildDetailStats } from '@/lib/guildDetail';

export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [guild, setGuild] = useState<any>(null);
  // null means the jobs list could not be loaded at all.
  const [jobs, setJobs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchGuild = useCallback(async () => {
    // This page used to fall back to a hardcoded sample guild with invented
    // member and job counts. Showing an unavailable state is the honest
    // alternative: nothing here should look like a real team's record. Only the
    // guild record is required though — a failing jobs endpoint degrades the
    // Jobs section alone instead of hiding the whole team.
    const data = await loadGuildDetail(String(params.id), api.request);
    setGuild(data?.guild ?? null);
    setJobs(data?.jobs ?? null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    fetchGuild();
  }, [fetchGuild]);

  const handleJoin = async () => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    setJoining(true);
    try {
      await api.request(`/guilds/${params.id}/join`, { method: 'POST' });
      setJoined(true);
    } catch {
      setJoined(true); // optimistic
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Loading guild details...</div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">This guild is not available right now.</p>
          <Link href="/guilds" className="text-amber-400 hover:text-amber-300 mt-4 inline-block">Back to all guilds</Link>
        </div>
      </div>
    );
  }

  // Public guilds accept join requests; the backend has no separate recruiting
  // flag, so the page must not claim one exists.
  const acceptingMembers = guild.isPublic !== false;

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/guilds" className="text-gray-400 hover:text-amber-400 text-sm transition-colors flex items-center gap-2 mb-8">
          <span>&#8592;</span> Back to all guilds
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
                    {acceptingMembers && (
                      <span className="text-xs bg-green-900/40 border border-green-700 text-green-400 px-2 py-0.5 rounded-full">Accepting new members</span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Worker-led team{guild.specialty ? <> &#183; Skill focus: <span className="text-amber-400">{guild.specialty}</span></> : null}
                  </div>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">{guild.description}</p>
              <p className="text-gray-500 text-sm mt-4 pt-4 border-t border-gray-800">{GUILD_DEFINITION}</p>

              {guild.tags && guild.tags.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {guild.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-gray-800 text-amber-400 text-sm rounded-full border border-gray-700">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Jobs */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Jobs from this guild</h2>
              <p className="text-gray-500 text-sm mb-4">Work this team has posted or taken on.</p>
              <div className="space-y-3">
                {jobs === null ? (
                  <p className="text-gray-500">Job history for this guild is not available right now.</p>
                ) : jobs.length === 0 ? (
                  <p className="text-gray-500">No jobs posted yet.</p>
                ) : (
                  jobs.map((job: any) => {
                    const skillLevel = jobSkillLevelLabel(job.difficulty);
                    const status = jobStatusLabel(job.status);
                    return (
                      <Link key={job._id} href={`/job/${job._id}`}>
                        <div className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer border border-transparent hover:border-amber-500/30">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white font-medium">{job.title}</span>
                            {status && (
                              <span className={`text-sm ${status === 'Open' ? 'text-green-400' : 'text-gray-500'}`}>{status}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span>${job.reward?.toLocaleString()}</span>
                            {skillLevel && (
                              <>
                                <span>&#8226;</span>
                                <span>{skillLevel}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Join card */}
            <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-6">
              <div className="space-y-3 mb-6">
                {guildDetailStats(guild, jobs).map(stat => (
                  <div key={stat.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{stat.label}</span>
                    <span className={stat.label === 'Shared reputation' ? 'text-amber-400' : 'text-white'}>{stat.value}</span>
                  </div>
                ))}
              </div>

              {joined ? (
                <div className="text-center p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
                  Request sent. The team lead will review it and get back to you.
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining || !acceptingMembers}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-black py-3 rounded-lg transition-colors"
                >
                  {joining ? 'Sending request...' : acceptingMembers ? (isLoggedIn ? 'Ask to join' : 'Sign in to join') : 'Not accepting members'}
                </button>
              )}
            </div>

            {/* Team lead */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Team lead</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold">
                  {guild.leader?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium">{guild.leader?.username}</div>
                  <div className="text-gray-500 text-xs">{guildPathLabel(guild.leader?.adventurerClass)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
