'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CADENCE_OPTIONS } from '@/lib/recurrence';

interface Stats {
  users: number;
  quests: number;
  openQuests: number;
  completedQuests: number;
  applications: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  level: number;
  reputationScore: number;
  verified: boolean;
  totalQuestsPosted: number;
  totalQuestsCompleted: number;
  createdAt: string;
}

interface AdminQuest {
  id: string;
  title: string;
  status: string;
  category: string;
  reward: number;
  createdAt: string;
  questGiver?: { id: string; username: string };
  _count?: { applications: number };
}

interface AdminReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  status: string;
  resolutionNote?: string | null;
  createdAt: string;
  reporter?: { id: string; username: string };
  resolvedBy?: { id: string; username: string } | null;
}

interface AdminLead {
  id: string;
  type: 'JOB_REQUEST' | 'WORKER_ALERT';
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'IGNORED';
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  budget?: string | null;
  timeline?: string | null;
  photoUrls?: string[];
  skills?: string[];
  availability?: string | null;
  hasTools?: boolean;
  adminNote?: string | null;
  convertedQuestId?: string | null;
  workerAlertsNotified?: number;
  source?: string | null;
  utm?: Record<string, string> | null;
  createdAt: string;
}

interface LeadSourceCount {
  source: string;
  count: number;
}

interface LeadsResponse {
  leads: AdminLead[];
  sourceSummary: LeadSourceCount[];
}

interface AdminCredential {
  id: string;
  type: string;
  title: string;
  issuer?: string | null;
  credentialNumber?: string | null;
  jurisdiction?: string | null;
  expirationDate?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  user?: { id: string; username: string; displayName?: string };
  verifiedBy?: { id: string; username: string } | null;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  // Per-lead recurring selection for conversion. Maps lead id → cadence; absent
  // means convert as a normal one-off quest.
  const [recurringLeadCadence, setRecurringLeadCadence] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceCount[]>([]);
  const [credentials, setCredentials] = useState<AdminCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (!isAdmin) { setLoading(false); return; }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, u, q, r, l, c] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<AdminUser[]>('/admin/users'),
        api.get<AdminQuest[]>('/admin/quests'),
        api.get<AdminReport[]>('/admin/reports').catch(() => [] as AdminReport[]),
        api
          .get<LeadsResponse>('/admin/leads')
          .catch(() => ({ leads: [], sourceSummary: [] } as LeadsResponse)),
        api.get<AdminCredential[]>('/admin/credentials').catch(() => [] as AdminCredential[]),
      ]);
      setStats(s);
      setUsers(u);
      setQuests(q);
      setReports(r);
      setLeads(l.leads);
      setLeadSources(l.sourceSummary);
      setCredentials(c);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQuest = async (id: string) => {
    try {
      await api.put(`/admin/quests/${id}/cancel`, {});
      toast.success('Quest cancelled');
      setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'CANCELLED' } : q)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel quest');
    }
  };

  const handleToggleVerify = async (u: AdminUser) => {
    try {
      const res = await api.put<{ id: string; verified: boolean }>(`/admin/users/${u.id}/verify`, {
        verified: !u.verified,
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, verified: res.verified } : x)));
      toast.success(res.verified ? 'User verified' : 'Verification removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  const handleResolveReport = async (id: string, status: 'RESOLVED' | 'DISMISSED' | 'REVIEWING') => {
    try {
      const updated = await api.put<AdminReport>(`/admin/reports/${id}`, { status });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      toast.success(`Report ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update report');
    }
  };

  const handleLeadStatus = async (id: string, status: AdminLead['status']) => {
    try {
      const updated = await api.put<AdminLead>(`/admin/leads/${id}`, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      toast.success(`Lead marked ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    }
  };

  const handleConvertLead = async (id: string, recurring?: { cadence: string }) => {
    try {
      const body = recurring
        ? { isRecurring: true, recurrenceCadence: recurring.cadence }
        : {};
      const res = await api.post<{ questId: string; lead: AdminLead }>(`/admin/leads/${id}/convert`, body);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...res.lead } : l)));
      toast.success(recurring ? 'Converted to a recurring quest' : 'Converted to a quest');
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert lead');
    }
  };

  const handleReviewCredential = async (
    id: string,
    status: AdminCredential['status'],
    rejectionReason?: string,
  ) => {
    try {
      const updated = await api.put<AdminCredential>(`/admin/credentials/${id}`, { status, rejectionReason });
      setCredentials((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      toast.success(`Credential ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update credential');
    }
  };

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Admin access required</h1>
          <p className="text-gray-400 mb-6">You don&apos;t have permission to view this page.</p>
          <Link href="/dashboard" className="text-amber-400 hover:text-amber-300 font-medium">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            {[
              { label: 'Users', value: stats.users },
              { label: 'Quests', value: stats.quests },
              { label: 'Open', value: stats.openQuests },
              { label: 'Completed', value: stats.completedQuests },
              { label: 'Applications', value: stats.applications },
            ].map((card) => (
              <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-amber-400">{card.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Quests */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Recent quests</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {quests.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No quests found.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {quests.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <Link href={`/questboard/${q.id}`} className="text-white font-medium hover:text-amber-400 truncate block">
                        {q.title}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {q.questGiver?.username || 'Unknown'} · {q.category} · {q._count?.applications ?? 0} applicants
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        q.status === 'OPEN' ? 'bg-green-500/20 text-green-400' :
                        q.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {q.status}
                      </span>
                      {q.status !== 'CANCELLED' && q.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleCancelQuest(q.id)}
                          className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Leads */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Leads <span className="text-sm font-normal text-gray-500">({leads.length})</span>
          </h2>
          {leadSources.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {leadSources.map((s) => (
                <span
                  key={s.source}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300"
                >
                  {s.source}: <span className="text-white font-medium">{s.count}</span>
                </span>
              ))}
            </div>
          )}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {leads.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                No leads yet. Submissions from /request-help and /work-alerts show up here.
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {leads.map((l) => {
                  const isJob = l.type === 'JOB_REQUEST';
                  const statusColor =
                    l.status === 'NEW' ? 'bg-yellow-500/20 text-yellow-400' :
                    l.status === 'CONTACTED' ? 'bg-blue-500/20 text-blue-400' :
                    l.status === 'CONVERTED' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-700 text-gray-300';
                  return (
                    <div key={l.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isJob ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-300'}`}>
                              {isJob ? 'Job request' : 'Worker alert'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{l.status}</span>
                            {l.source && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                                Source: {l.source}
                              </span>
                            )}
                          </div>
                          {isJob && l.title && (
                            <p className="text-white font-medium mt-2">{l.title}</p>
                          )}
                          <p className="text-sm text-gray-300 mt-1">
                            {l.name} · <a href={`mailto:${l.email}`} className="text-amber-400 hover:text-amber-300">{l.email}</a>
                            {l.phone ? ` · ${l.phone}` : ''}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {[
                              l.location,
                              isJob ? l.budget : null,
                              isJob ? l.timeline : l.availability,
                              isJob ? l.category : (l.skills && l.skills.length ? l.skills.join(', ') : null),
                              !isJob && l.hasTools ? 'has tools/truck' : null,
                            ].filter(Boolean).join(' · ')}
                            {' · '}{new Date(l.createdAt).toLocaleDateString()}
                          </p>
                          {isJob && l.description && (
                            <p className="text-sm text-gray-400 mt-1 whitespace-pre-line">{l.description}</p>
                          )}
                          {isJob && l.photoUrls && l.photoUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {l.photoUrls.map((u, i) => (
                                <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-amber-400 underline">
                                  photo {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                          {l.utm && Object.keys(l.utm).length > 0 && (
                            <p className="text-xs text-gray-600 mt-1">
                              {Object.entries(l.utm).map(([k, v]) => `${k}=${v}`).join(' · ')}
                            </p>
                          )}
                          {isJob && typeof l.workerAlertsNotified === 'number' && l.workerAlertsNotified > 0 && (
                            <p className="text-xs text-purple-300 mt-1">
                              🔔 {l.workerAlertsNotified} worker alert{l.workerAlertsNotified === 1 ? '' : 's'} notified
                            </p>
                          )}
                          {l.convertedQuestId && (
                            <Link href={`/questboard/${l.convertedQuestId}`} className="text-xs text-green-400 hover:text-green-300 mt-1 inline-block">
                              View created quest →
                            </Link>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {l.status === 'NEW' && (
                            <button
                              onClick={() => handleLeadStatus(l.id, 'CONTACTED')}
                              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                            >
                              Mark contacted
                            </button>
                          )}
                          {isJob && l.status !== 'CONVERTED' && (
                            <div className="flex flex-col gap-1 rounded border border-gray-700 p-2">
                              <label className="flex items-center gap-1.5 text-xs text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={!!recurringLeadCadence[l.id]}
                                  onChange={(e) =>
                                    setRecurringLeadCadence((prev) => {
                                      const next = { ...prev };
                                      if (e.target.checked) next[l.id] = 'WEEKLY';
                                      else delete next[l.id];
                                      return next;
                                    })
                                  }
                                  className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                                />
                                Recurring
                              </label>
                              {recurringLeadCadence[l.id] && (
                                <select
                                  value={recurringLeadCadence[l.id]}
                                  onChange={(e) =>
                                    setRecurringLeadCadence((prev) => ({ ...prev, [l.id]: e.target.value }))
                                  }
                                  className="text-xs bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-gray-200"
                                >
                                  {CADENCE_OPTIONS.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={() =>
                                  handleConvertLead(
                                    l.id,
                                    recurringLeadCadence[l.id]
                                      ? { cadence: recurringLeadCadence[l.id] }
                                      : undefined,
                                  )
                                }
                                className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-green-500 hover:text-green-400"
                              >
                                Convert to quest
                              </button>
                            </div>
                          )}
                          {l.status !== 'IGNORED' && l.status !== 'CONVERTED' && (
                            <button
                              onClick={() => handleLeadStatus(l.id, 'IGNORED')}
                              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400"
                            >
                              Ignore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Professional credentials review queue */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Credentials <span className="text-sm font-normal text-gray-500">({credentials.length})</span>
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {credentials.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                No credentials submitted. Professionals add these from their profile page.
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {credentials.map((c) => {
                  const statusColor =
                    c.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                    c.status === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
                    c.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-700 text-gray-300';
                  return (
                    <div key={c.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{c.type}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{c.status}</span>
                          </div>
                          <p className="text-white font-medium mt-2">{c.title}</p>
                          <p className="text-sm text-gray-300 mt-1">
                            {c.user ? (
                              <Link href={`/profile/${c.user.username}`} className="text-amber-400 hover:text-amber-300">
                                {c.user.username}
                              </Link>
                            ) : 'unknown'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {[
                              c.issuer,
                              c.jurisdiction,
                              c.credentialNumber ? `#${c.credentialNumber}` : null,
                              c.expirationDate ? `expires ${new Date(c.expirationDate).toLocaleDateString()}` : null,
                            ].filter(Boolean).join(' · ')}
                            {' · '}submitted {new Date(c.createdAt).toLocaleDateString()}
                          </p>
                          {c.notes && <p className="text-sm text-gray-400 mt-1 whitespace-pre-line">{c.notes}</p>}
                          {c.proofUrl && (
                            <a href={c.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:text-amber-300 underline mt-1 inline-block">
                              Proof link →
                            </a>
                          )}
                          {c.status === 'REJECTED' && c.rejectionReason && (
                            <p className="text-xs text-red-400 mt-1">Reason: {c.rejectionReason}</p>
                          )}
                          {c.verifiedBy && (
                            <p className="text-xs text-gray-600 mt-1">Verified by {c.verifiedBy.username}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {c.status !== 'VERIFIED' && (
                            <button
                              onClick={() => handleReviewCredential(c.id, 'VERIFIED')}
                              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-green-500 hover:text-green-400"
                            >
                              Verify
                            </button>
                          )}
                          {c.status !== 'REJECTED' && (
                            <button
                              onClick={() => {
                                const reason = window.prompt('Reason for rejection (optional):') ?? undefined;
                                handleReviewCredential(c.id, 'REJECTED', reason);
                              }}
                              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400"
                            >
                              Reject
                            </button>
                          )}
                          {c.status !== 'EXPIRED' && (
                            <button
                              onClick={() => handleReviewCredential(c.id, 'EXPIRED')}
                              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-200"
                            >
                              Mark expired
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Reports */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Reports</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {reports.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No reports filed.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {reports.map((r) => {
                  const targetHref =
                    r.targetType === 'QUEST'
                      ? `/questboard/${r.targetId}`
                      : r.targetType === 'USER'
                        ? `/profile/${r.targetId}`
                        : null;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{r.targetType}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{r.reason}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              r.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-400' :
                              r.status === 'REVIEWING' ? 'bg-blue-500/20 text-blue-400' :
                              r.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mt-2">
                            Reported by{' '}
                            <Link href={`/profile/${r.reporter?.username}`} className="text-amber-400 hover:text-amber-300">
                              {r.reporter?.username || 'unknown'}
                            </Link>{' '}
                            · {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                          {r.details && <p className="text-sm text-gray-400 mt-1 whitespace-pre-line">{r.details}</p>}
                          {targetHref ? (
                            <Link href={targetHref} className="text-xs text-gray-500 hover:text-amber-400 mt-1 inline-block">
                              View {r.targetType.toLowerCase()} →
                            </Link>
                          ) : (
                            <p className="text-xs text-gray-600 mt-1">Target: {r.targetType} {r.targetId}</p>
                          )}
                          {r.resolvedBy && (
                            <p className="text-xs text-gray-600 mt-1">Resolved by {r.resolvedBy.username}</p>
                          )}
                        </div>
                        {r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {r.status === 'OPEN' && (
                              <button
                                onClick={() => handleResolveReport(r.id, 'REVIEWING')}
                                className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                              >
                                Mark reviewing
                              </button>
                            )}
                            <button
                              onClick={() => handleResolveReport(r.id, 'RESOLVED')}
                              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-green-500 hover:text-green-400"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Users */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Recent users</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {users.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No users found.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <Link href={`/profile/${u.username}`} className="text-white font-medium hover:text-amber-400">
                        {u.username}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">
                        {u.email} · Lv.{u.level} · {u.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {u.verified && (
                        <span className="text-xs px-2 py-1 rounded-full bg-sky-500/20 text-sky-400">Verified</span>
                      )}
                      <button
                        onClick={() => handleToggleVerify(u)}
                        className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-amber-500 hover:text-amber-400"
                      >
                        {u.verified ? 'Unverify' : 'Verify'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
