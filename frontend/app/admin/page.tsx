'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CADENCE_OPTIONS, cadenceLabel } from '@/lib/recurrence';
import type { RecurrenceCadence } from '@/lib/types';

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
  isRecurring?: boolean;
  recurrenceCadence?: RecurrenceCadence | null;
  recurrenceInterval?: number;
  recurrenceEndDate?: string | null;
  recurrenceCount?: number | null;
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

interface AdminDeletionRequest {
  id: string;
  email: string;
  reason?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  handlerNote?: string | null;
  handledAt?: string | null;
  createdAt: string;
  user?: { id: string; username: string; email: string } | null;
  handledBy?: { id: string; username: string } | null;
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
  const [deletionRequests, setDeletionRequests] = useState<AdminDeletionRequest[]>([]);
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
      const [s, u, q, r, l, c, d] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<AdminUser[]>('/admin/users'),
        api.get<AdminQuest[]>('/admin/quests'),
        api.get<AdminReport[]>('/admin/reports').catch(() => [] as AdminReport[]),
        api
          .get<LeadsResponse>('/admin/leads')
          .catch(() => ({ leads: [], sourceSummary: [] } as LeadsResponse)),
        api.get<AdminCredential[]>('/admin/credentials').catch(() => [] as AdminCredential[]),
        api
          .get<AdminDeletionRequest[]>('/admin/deletion-requests')
          .catch(() => [] as AdminDeletionRequest[]),
      ]);
      setStats(s);
      setUsers(u);
      setQuests(q);
      setReports(r);
      setLeads(l.leads);
      // Prefill the per-lead recurring selection from any recurrence intent the
      // homeowner captured on the public form, so the admin's convert control
      // defaults to carrying it forward. Admin can still toggle it off.
      setRecurringLeadCadence((prev) => {
        const next = { ...prev };
        for (const lead of l.leads) {
          if (lead.isRecurring && lead.recurrenceCadence && !(lead.id in next)) {
            next[lead.id] = lead.recurrenceCadence;
          }
        }
        return next;
      });
      setLeadSources(l.sourceSummary);
      setCredentials(c);
      setDeletionRequests(d);
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

  const handleDeletionRequest = async (
    id: string,
    status: 'COMPLETED' | 'CANCELLED',
    handlerNote?: string,
  ) => {
    try {
      const updated = await api.put<AdminDeletionRequest>(`/admin/deletion-requests/${id}`, {
        status,
        handlerNote,
      });
      setDeletionRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      toast.success(status === 'COMPLETED' ? 'Deletion completed — account disabled' : 'Request cancelled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update deletion request');
    }
  };

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-strong mb-2">Admin access required</h1>
          <p className="text-muted mb-6">You don&apos;t have permission to view this page.</p>
          <Link href="/dashboard" className="text-accent-text hover:text-accent-text-hover font-medium">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-strong mb-8">Admin Dashboard</h1>

        {error && (
          <div className="mb-6 p-3 bg-danger/30 border border-danger rounded-lg text-danger text-sm">
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
              <div key={card.label} className="bg-surface border border-line rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-accent-text">{card.value}</div>
                <div className="text-xs text-subtle uppercase tracking-wider mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Quests */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-strong mb-4">Recent quests</h2>
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            {quests.length === 0 ? (
              <p className="p-6 text-sm text-subtle">No quests found.</p>
            ) : (
              <div className="divide-y divide-line">
                {quests.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <Link href={`/job/${q.id}`} className="text-strong font-medium hover:text-accent-text truncate block">
                        {q.title}
                      </Link>
                      <p className="text-xs text-subtle">
                        {q.questGiver?.username || 'Unknown'} · {q.category} · {q._count?.applications ?? 0} applicants
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        q.status === 'OPEN' ? 'bg-success/20 text-success' :
                        q.status === 'CANCELLED' ? 'bg-danger/20 text-danger' :
                        'bg-raised-2 text-body'
                      }`}>
                        {q.status}
                      </span>
                      {q.status !== 'CANCELLED' && q.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleCancelQuest(q.id)}
                          className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-danger hover:text-danger"
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
          <h2 className="text-lg font-semibold text-strong mb-4">
            Leads <span className="text-sm font-normal text-subtle">({leads.length})</span>
          </h2>
          {leadSources.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {leadSources.map((s) => (
                <span
                  key={s.source}
                  className="text-xs px-2.5 py-1 rounded-full bg-raised border border-line-strong text-body"
                >
                  {s.source}: <span className="text-strong font-medium">{s.count}</span>
                </span>
              ))}
            </div>
          )}
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            {leads.length === 0 ? (
              <p className="p-6 text-sm text-subtle">
                No leads yet. Submissions from /request-help and /work-alerts show up here.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {leads.map((l) => {
                  const isJob = l.type === 'JOB_REQUEST';
                  const statusColor =
                    l.status === 'NEW' ? 'bg-warning/20 text-warning' :
                    l.status === 'CONTACTED' ? 'bg-info/20 text-info' :
                    l.status === 'CONVERTED' ? 'bg-success/20 text-success' :
                    'bg-raised-2 text-body';
                  return (
                    <div key={l.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isJob ? 'bg-accent/20 text-accent-text' : 'bg-info/20 text-info'}`}>
                              {isJob ? 'Job request' : 'Worker alert'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{l.status}</span>
                            {l.source && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-info/20 text-info">
                                Source: {l.source}
                              </span>
                            )}
                            {isJob && l.isRecurring && l.recurrenceCadence && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-info/20 text-info">
                                🔁 Repeat: {cadenceLabel(l.recurrenceCadence, l.recurrenceInterval)}
                                {l.recurrenceCount ? ` · ${l.recurrenceCount}×` : ''}
                                {l.recurrenceEndDate
                                  ? ` · until ${new Date(l.recurrenceEndDate).toLocaleDateString()}`
                                  : ''}
                              </span>
                            )}
                          </div>
                          {isJob && l.title && (
                            <p className="text-strong font-medium mt-2">{l.title}</p>
                          )}
                          <p className="text-sm text-body mt-1">
                            {l.name} · <a href={`mailto:${l.email}`} className="text-accent-text hover:text-accent-text-hover">{l.email}</a>
                            {l.phone ? ` · ${l.phone}` : ''}
                          </p>
                          <p className="text-xs text-subtle mt-1">
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
                            <p className="text-sm text-muted mt-1 whitespace-pre-line">{l.description}</p>
                          )}
                          {isJob && l.photoUrls && l.photoUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {l.photoUrls.map((u, i) => (
                                <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="text-xs text-subtle hover:text-accent-text underline">
                                  photo {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                          {l.utm && Object.keys(l.utm).length > 0 && (
                            <p className="text-xs text-subtle mt-1">
                              {Object.entries(l.utm).map(([k, v]) => `${k}=${v}`).join(' · ')}
                            </p>
                          )}
                          {isJob && typeof l.workerAlertsNotified === 'number' && l.workerAlertsNotified > 0 && (
                            <p className="text-xs text-info mt-1">
                              🔔 {l.workerAlertsNotified} worker alert{l.workerAlertsNotified === 1 ? '' : 's'} notified
                            </p>
                          )}
                          {l.convertedQuestId && (
                            <Link href={`/job/${l.convertedQuestId}`} className="text-xs text-success hover:text-success mt-1 inline-block">
                              View created quest →
                            </Link>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {l.status === 'NEW' && (
                            <button
                              onClick={() => handleLeadStatus(l.id, 'CONTACTED')}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-info hover:text-info"
                            >
                              Mark contacted
                            </button>
                          )}
                          {isJob && l.status !== 'CONVERTED' && (
                            <div className="flex flex-col gap-1 rounded border border-line-strong p-2">
                              <label className="flex items-center gap-1.5 text-xs text-body">
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
                                  className="h-3.5 w-3.5 rounded border-line-strong bg-raised text-accent-text focus:ring-accent"
                                />
                                Recurring
                              </label>
                              {recurringLeadCadence[l.id] && (
                                <select
                                  value={recurringLeadCadence[l.id]}
                                  onChange={(e) =>
                                    setRecurringLeadCadence((prev) => ({ ...prev, [l.id]: e.target.value }))
                                  }
                                  className="text-xs bg-raised border border-line-strong rounded px-1.5 py-1 text-body"
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
                                className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-success hover:text-success"
                              >
                                Convert to quest
                              </button>
                            </div>
                          )}
                          {l.status !== 'IGNORED' && l.status !== 'CONVERTED' && (
                            <button
                              onClick={() => handleLeadStatus(l.id, 'IGNORED')}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-danger hover:text-danger"
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
          <h2 className="text-lg font-semibold text-strong mb-4">
            Credentials <span className="text-sm font-normal text-subtle">({credentials.length})</span>
          </h2>
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            {credentials.length === 0 ? (
              <p className="p-6 text-sm text-subtle">
                No credentials submitted. Professionals add these from their profile page.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {credentials.map((c) => {
                  const statusColor =
                    c.status === 'PENDING' ? 'bg-warning/20 text-warning' :
                    c.status === 'VERIFIED' ? 'bg-success/20 text-success' :
                    c.status === 'REJECTED' ? 'bg-danger/20 text-danger' :
                    'bg-raised-2 text-body';
                  return (
                    <div key={c.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-raised text-body">{c.type}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{c.status}</span>
                          </div>
                          <p className="text-strong font-medium mt-2">{c.title}</p>
                          <p className="text-sm text-body mt-1">
                            {c.user ? (
                              <Link href={`/profile/${c.user.username}`} className="text-accent-text hover:text-accent-text-hover">
                                {c.user.username}
                              </Link>
                            ) : 'unknown'}
                          </p>
                          <p className="text-xs text-subtle mt-1">
                            {[
                              c.issuer,
                              c.jurisdiction,
                              c.credentialNumber ? `#${c.credentialNumber}` : null,
                              c.expirationDate ? `expires ${new Date(c.expirationDate).toLocaleDateString()}` : null,
                            ].filter(Boolean).join(' · ')}
                            {' · '}submitted {new Date(c.createdAt).toLocaleDateString()}
                          </p>
                          {c.notes && <p className="text-sm text-muted mt-1 whitespace-pre-line">{c.notes}</p>}
                          {c.proofUrl && (
                            <a href={c.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-text hover:text-accent-text-hover underline mt-1 inline-block">
                              Proof link →
                            </a>
                          )}
                          {c.status === 'REJECTED' && c.rejectionReason && (
                            <p className="text-xs text-danger mt-1">Reason: {c.rejectionReason}</p>
                          )}
                          {c.verifiedBy && (
                            <p className="text-xs text-subtle mt-1">Verified by {c.verifiedBy.username}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {c.status !== 'VERIFIED' && (
                            <button
                              onClick={() => handleReviewCredential(c.id, 'VERIFIED')}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-success hover:text-success"
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
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-danger hover:text-danger"
                            >
                              Reject
                            </button>
                          )}
                          {c.status !== 'EXPIRED' && (
                            <button
                              onClick={() => handleReviewCredential(c.id, 'EXPIRED')}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-line-strong hover:text-body"
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

        {/* Account deletion requests — the source of truth for actioning
            deletions (email notifications are best-effort only). */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-strong mb-4">
            Account deletion requests{' '}
            <span className="text-sm font-normal text-subtle">
              ({deletionRequests.filter((d) => d.status === 'PENDING').length} pending)
            </span>
          </h2>
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            {deletionRequests.length === 0 ? (
              <p className="p-6 text-sm text-subtle">
                No deletion requests. When a user requests account/data deletion, it appears here for review.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {deletionRequests.map((d) => {
                  const statusColor =
                    d.status === 'PENDING' ? 'bg-warning/20 text-warning' :
                    d.status === 'COMPLETED' ? 'bg-success/20 text-success' :
                    'bg-raised-2 text-body';
                  return (
                    <div key={d.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{d.status}</span>
                          </div>
                          <p className="text-sm text-body mt-2">
                            {d.user ? (
                              <Link href={`/profile/${d.user.username}`} className="text-accent-text hover:text-accent-text-hover">
                                {d.user.username}
                              </Link>
                            ) : 'deleted user'}
                            {' · '}
                            <a href={`mailto:${d.email}`} className="text-accent-text hover:text-accent-text-hover">{d.email}</a>
                          </p>
                          <p className="text-xs text-subtle mt-1">
                            Requested {new Date(d.createdAt).toLocaleDateString()}
                            {d.handledAt ? ` · handled ${new Date(d.handledAt).toLocaleDateString()}` : ''}
                            {d.handledBy ? ` by ${d.handledBy.username}` : ''}
                          </p>
                          {d.reason && (
                            <p className="text-sm text-muted mt-1 whitespace-pre-line">Reason: {d.reason}</p>
                          )}
                          {d.handlerNote && (
                            <p className="text-xs text-subtle mt-1 whitespace-pre-line">Note: {d.handlerNote}</p>
                          )}
                        </div>
                        {d.status === 'PENDING' && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                if (!window.confirm(
                                  'Complete deletion? This permanently disables the account so it can no longer log in. Historical quest/payment records are retained. This cannot be undone.',
                                )) return;
                                const note = window.prompt('Note (optional) — e.g. record of what was deleted:') ?? undefined;
                                handleDeletionRequest(d.id, 'COMPLETED', note);
                              }}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-success hover:text-success"
                            >
                              Complete deletion
                            </button>
                            <button
                              onClick={() => {
                                const note = window.prompt('Reason for cancelling (optional):') ?? undefined;
                                handleDeletionRequest(d.id, 'CANCELLED', note);
                              }}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-danger hover:text-danger"
                            >
                              Cancel request
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

        {/* Reports */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-strong mb-4">Reports</h2>
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            {reports.length === 0 ? (
              <p className="p-6 text-sm text-subtle">No reports filed.</p>
            ) : (
              <div className="divide-y divide-line">
                {reports.map((r) => {
                  const targetHref =
                    r.targetType === 'QUEST'
                      ? `/job/${r.targetId}`
                      : r.targetType === 'USER'
                        ? `/profile/${r.targetId}`
                        : null;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-raised text-body">{r.targetType}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-danger/20 text-danger">{r.reason}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              r.status === 'OPEN' ? 'bg-warning/20 text-warning' :
                              r.status === 'REVIEWING' ? 'bg-info/20 text-info' :
                              r.status === 'RESOLVED' ? 'bg-success/20 text-success' :
                              'bg-raised-2 text-body'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-sm text-body mt-2">
                            Reported by{' '}
                            <Link href={`/profile/${r.reporter?.username}`} className="text-accent-text hover:text-accent-text-hover">
                              {r.reporter?.username || 'unknown'}
                            </Link>{' '}
                            · {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                          {r.details && <p className="text-sm text-muted mt-1 whitespace-pre-line">{r.details}</p>}
                          {targetHref ? (
                            <Link href={targetHref} className="text-xs text-subtle hover:text-accent-text mt-1 inline-block">
                              View {r.targetType.toLowerCase()} →
                            </Link>
                          ) : (
                            <p className="text-xs text-subtle mt-1">Target: {r.targetType} {r.targetId}</p>
                          )}
                          {r.resolvedBy && (
                            <p className="text-xs text-subtle mt-1">Resolved by {r.resolvedBy.username}</p>
                          )}
                        </div>
                        {r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {r.status === 'OPEN' && (
                              <button
                                onClick={() => handleResolveReport(r.id, 'REVIEWING')}
                                className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-info hover:text-info"
                              >
                                Mark reviewing
                              </button>
                            )}
                            <button
                              onClick={() => handleResolveReport(r.id, 'RESOLVED')}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-success hover:text-success"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                              className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-danger hover:text-danger"
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
          <h2 className="text-lg font-semibold text-strong mb-4">Recent users</h2>
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            {users.length === 0 ? (
              <p className="p-6 text-sm text-subtle">No users found.</p>
            ) : (
              <div className="divide-y divide-line">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <Link href={`/profile/${u.username}`} className="text-strong font-medium hover:text-accent-text">
                        {u.username}
                      </Link>
                      <p className="text-xs text-subtle truncate">
                        {u.email} · Lv.{u.level} · {u.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {u.verified && (
                        <span className="text-xs px-2 py-1 rounded-full bg-info/20 text-info">Verified</span>
                      )}
                      <button
                        onClick={() => handleToggleVerify(u)}
                        className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-accent hover:text-accent-text"
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
