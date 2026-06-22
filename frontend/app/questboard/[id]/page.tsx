'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Quest, Application } from '@/lib/types';
import EscrowPanel from '@/components/EscrowPanel';
import ReportButton from '@/components/ReportButton';
import QuestReviews from '@/components/QuestReviews';
import CompletionPanel from '@/components/CompletionPanel';
import TradeStandardChecklist from '@/components/TradeStandardChecklist';
import BidForm, { type BidPayload } from '@/components/BidForm';
import BidComparison from '@/components/BidComparison';
import { resolveTradeStandard } from '@/lib/tradeStandards';
import { recurrenceSummary } from '@/lib/recurrence';

// Dollar floor above which a fixed-price job reads as contractor-scale, matching
// the poster-side LARGE_JOB_REWARD threshold. Used to surface the legal-
// qualification acknowledgement on the worker's bid form.
const CONTRACTOR_SCALE_REWARD = 500;

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
  const [error, setError] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [generatingOccurrence, setGeneratingOccurrence] = useState(false);

  useEffect(() => {
    fetchQuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, user?.id]);

  const fetchQuest = async () => {
    setLoading(true);
    try {
      const data = await api.get<Quest>(`/quests/${params.id}`);
      setQuest(data);

      // The quest giver can load applications to manage them. Adventurers can
      // only see their own application status, which we infer from the list
      // the owner sees — so we just fetch when owner.
      if (user && data.questGiverId === user.id) {
        try {
          const apps = await api.get<Application[]>(`/quests/${params.id}/applications`);
          setApplications(apps);
        } catch {
          setApplications([]);
        }
      }
    } catch {
      setQuest(null);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user && quest && quest.questGiverId === user.id;

  const handleAccept = async (appId: string) => {
    setActioningId(appId);
    try {
      await api.put(`/users/applications/${appId}/accept`, {});
      toast.success('Bid accepted. The job is now in progress.');
      await fetchQuest();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept bid');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (appId: string) => {
    setActioningId(appId);
    try {
      await api.put(`/users/applications/${appId}/reject`, {});
      toast.success('Bid set aside.');
      await fetchQuest();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bid');
    } finally {
      setActioningId(null);
    }
  };

  const handleGenerateOccurrence = async () => {
    setGeneratingOccurrence(true);
    try {
      const next = await api.post<Quest>(`/quests/${params.id}/next-occurrence`, {});
      toast.success('Next visit posted to your board.');
      router.push(`/questboard/${next.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not post the next occurrence');
    } finally {
      setGeneratingOccurrence(false);
    }
  };

  const handleApply = async (payload: BidPayload) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setApplying(true);
    setError('');
    try {
      await api.post(`/quests/${params.id}/apply`, payload);
      setApplied(true);
      toast.success('Bid submitted! The client will review it.');
    } catch (err: any) {
      const msg = err.message || 'Failed to submit bid';
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

  // Photo URLs are encoded as `photo:<url>` tags (no cloud storage). Split them
  // out so they render as images while the rest stay as skill/location tags.
  const allTags = quest.tags || [];
  const photoUrls = allTags
    .filter((t) => t.startsWith('photo:'))
    .map((t) => t.slice('photo:'.length))
    .filter(Boolean);
  const skillTags = allTags.filter((t) => !t.startsWith('photo:'));
  const tradeStandard = resolveTradeStandard(quest.category, skillTags);

  // Quote-needed jobs are flagged with the `quote-needed` tag at posting time;
  // the poster's `reward` is then just a placeholder for workers to refine via a
  // bid. Either a quote-needed flag or a large fixed budget makes the job read as
  // contractor-scale, which surfaces the legal-qualification acknowledgement.
  const isQuoteMode = skillTags.includes('quote-needed');
  const isContractorScale =
    isQuoteMode || (quest.reward ?? 0) >= CONTRACTOR_SCALE_REWARD;

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
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{quest.category}</span>
                  {!isOwner && <ReportButton targetType="QUEST" targetId={quest.id} />}
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">{quest.title}</h1>
              {quest.isRecurring && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                    🔁 {recurrenceSummary(quest) || 'Recurring'}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                {poster && (
                  <span>Posted by <span className="text-amber-400">{poster.username}</span></span>
                )}
                <span>•</span>
                <span>{quest._count?.applications || 0} bids</span>
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

            {/* Suggested trade standard / completion checklist */}
            <TradeStandardChecklist standard={tradeStandard} defaultCollapsed />

            {/* Photos */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Photos</h2>
              {photoUrls.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt="Quest photo"
                      className="w-full max-h-64 object-cover rounded-lg border border-gray-800"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/30 px-4 py-8 text-center">
                  <div className="text-3xl mb-2">🖼️</div>
                  <p className="text-sm text-gray-400">No photos yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Photos can be added by URL when posting a quest.</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {skillTags.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Details &amp; Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skillTags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-gray-800 text-amber-400 text-sm rounded-full border border-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Work completion handshake — role-aware actions for the worker and
                giver, plus shared status/proof history. Only relevant once the
                quest has started (assigned), so the component self-hides otherwise. */}
            {user && (isOwner || user.id === quest.assignedAdventurerId) && (
              <CompletionPanel
                quest={quest}
                isQuestGiver={!!isOwner}
                isAssignedWorker={user.id === quest.assignedAdventurerId}
                onChange={fetchQuest}
              />
            )}

            {/* Reviews — anyone can read; participants on a completed quest can write. */}
            <QuestReviews
              questId={quest.id}
              canReview={
                !!user &&
                quest.status === 'COMPLETED' &&
                (user.id === quest.questGiverId || user.id === quest.assignedAdventurerId)
              }
              // Only the quest giver rates the worker's individual skills.
              canRateSkills={
                !!user &&
                quest.status === 'COMPLETED' &&
                user.id === quest.questGiverId &&
                !!quest.assignedAdventurerId
              }
              suggestedSkills={allTags.filter((t: string) => !t.startsWith('photo:'))}
            />

            {/* Bids (visible to quest owner) — full breakdown + comparison. */}
            {isOwner && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-1">
                  Bids ({applications.length})
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Compare bids and accept one. Accepting a bid assigns that worker and sets the
                  agreed amount — no payment is arranged until you choose.
                </p>
                <BidComparison
                  applications={applications}
                  questId={quest.id}
                  actioningId={actioningId}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget / quote card */}
            <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-6">
              <div className="text-center mb-6">
                {isQuoteMode ? (
                  <>
                    <div className="text-2xl font-bold text-amber-400">Open to bids</div>
                    <div className="text-gray-500 text-sm mt-1">
                      Quote needed — workers set the price
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-amber-400">
                      ${quest.reward?.toLocaleString()}
                    </div>
                    <div className="text-gray-500 text-sm mt-1">Client budget</div>
                    <div className="text-gray-600 text-xs mt-1">Workers can bid with their own estimate</div>
                  </>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {isOwner ? (
                <div className="text-center p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-400 text-sm">
                  This is your job
                </div>
              ) : applied ? (
                <div className="text-center p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400">
                  ✓ Bid submitted! The client will review it.
                </div>
              ) : !user ? (
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-gray-900 font-black py-3 rounded-lg transition-colors text-lg"
                >
                  Sign in to bid
                </button>
              ) : quest.status !== 'OPEN' ? (
                <div className="text-center p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm">
                  This job is no longer open for bids.
                </div>
              ) : (
                <BidForm
                  contractorScale={isContractorScale}
                  submitting={applying}
                  onSubmit={handleApply}
                />
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

            {/* Recurring booking management (owner only) */}
            {isOwner && quest.isRecurring && (
              <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  🔁 Recurring job
                </h3>
                <p className="text-sm text-gray-400 mb-1">{recurrenceSummary(quest)}</p>
                {quest.nextOccurrenceAt ? (
                  <p className="text-xs text-gray-500 mb-4">
                    Suggested next visit: {new Date(quest.nextOccurrenceAt).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mb-4">
                    This series has reached its end date.
                  </p>
                )}
                <button
                  onClick={handleGenerateOccurrence}
                  disabled={generatingOccurrence}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-semibold py-2.5 rounded-lg transition-colors text-sm"
                >
                  {generatingOccurrence ? 'Posting…' : 'Post next visit'}
                </button>
                <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                  Posts a fresh copy of this job to the board. You confirm and pay for each visit
                  on completion — nothing is charged in advance.
                </p>
              </div>
            )}

            {/* Quest giver */}
            {poster && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quest Giver</h3>
                <Link href={`/profile/${poster.username}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold">
                    {poster.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster.avatarUrl} alt={poster.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      poster.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium group-hover:text-amber-400">{poster.username}</div>
                    {poster.level && <div className="text-amber-400 text-xs">Level {poster.level}</div>}
                  </div>
                </Link>

                {/* Assigned adventurer can message the poster about the quest. */}
                {user && quest.assignedAdventurerId === user.id && (
                  <Link
                    href={`/messages/${quest.id}/${poster.id}`}
                    className="mt-4 block text-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-700 text-gray-300 hover:border-amber-500 hover:text-amber-400"
                  >
                    Message quest giver
                  </Link>
                )}
              </div>
            )}

            {/* Marketplace payment panel — visible to the quest giver and the
                assigned adventurer once the quest is no longer just OPEN. */}
            {user &&
              (isOwner || user.id === quest.assignedAdventurerId) &&
              quest.status !== 'OPEN' && (
                <EscrowPanel
                  questId={quest.id}
                  isQuestGiver={!!isOwner}
                  questStatus={quest.status}
                />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
