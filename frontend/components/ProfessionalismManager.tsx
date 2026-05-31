'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { PledgeStatus, ProofOfWorkItem, VerifiedProStatus } from '@/lib/types';

// Authenticated profile surface for the professionalism layer: the Code of Craft
// pledge, the Verified Pro checklist, and the proof-of-work gallery manager.
// `userId` is the current user's id, used to read their public-keyed Verified Pro
// status (which is derived server-side from real signals).

interface Props {
  userId: string;
}

interface ProofFormState {
  title: string;
  description: string;
  imageUrls: string; // newline/comma separated in the textarea
  skillTags: string; // comma separated
  visible: boolean;
}

const EMPTY_PROOF: ProofFormState = {
  title: '',
  description: '',
  imageUrls: '',
  skillTags: '',
  visible: true,
};

function splitList(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toForm(p: ProofOfWorkItem): ProofFormState {
  return {
    title: p.title || '',
    description: p.description || '',
    imageUrls: (p.imageUrls || []).join('\n'),
    skillTags: (p.skillTags || []).join(', '),
    visible: p.visible !== false,
  };
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500';

export default function ProfessionalismManager({ userId }: Props) {
  const [pledge, setPledge] = useState<PledgeStatus | null>(null);
  const [pledging, setPledging] = useState(false);
  const [verifiedPro, setVerifiedPro] = useState<VerifiedProStatus | null>(null);
  const [proof, setProof] = useState<ProofOfWorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProofFormState>(EMPTY_PROOF);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, pr] = await Promise.all([
      api.get<PledgeStatus>('/users/me/pledge').catch(() => ({ pledged: false, pledgedAt: null })),
      api.get<ProofOfWorkItem[]>('/users/me/proof').catch(() => []),
    ]);
    setPledge(p);
    setProof(Array.isArray(pr) ? pr : []);
    // Verified Pro is keyed by user id and derived server-side; load separately.
    api
      .get<VerifiedProStatus>(`/users/${encodeURIComponent(userId)}/verified-pro`)
      .then((v) => setVerifiedPro(v))
      .catch(() => setVerifiedPro(null));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const togglePledge = async () => {
    setPledging(true);
    try {
      if (pledge?.pledged) {
        await api.delete('/users/me/pledge');
        toast.success('Pledge withdrawn');
      } else {
        await api.post('/users/me/pledge', {});
        toast.success('You pledged to the Code of Craft');
      }
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pledge');
    } finally {
      setPledging(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_PROOF);
    setShowForm(true);
  };

  const openEdit = (p: ProofOfWorkItem) => {
    setEditingId(p.id);
    setForm(toForm(p));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_PROOF);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        imageUrls: splitList(form.imageUrls),
        skillTags: splitList(form.skillTags),
        visible: form.visible,
      };
      if (editingId) {
        await api.put(`/users/me/proof/${editingId}`, payload);
        toast.success('Proof updated');
      } else {
        await api.post('/users/me/proof', payload);
        toast.success('Proof added');
      }
      await load();
      closeForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save proof');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proof item? This cannot be undone.')) return;
    try {
      await api.delete(`/users/me/proof/${id}`);
      setProof((prev) => prev.filter((p) => p.id !== id));
      toast.success('Proof deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete proof');
    }
  };

  return (
    <div className="space-y-8">
      {/* Code of Craft pledge */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-200">Code of Craft</h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xl">
              Pledge to professional standards — show up, communicate clearly, protect property, document
              work, honor scope, clean up, respect people, and resolve issues professionally.{' '}
              <Link href="/code-of-craft" className="text-amber-400 hover:underline">
                Read the Code of Craft
              </Link>
              . Your public profile shows the pledge only while it&apos;s active.
            </p>
          </div>
          <button
            onClick={togglePledge}
            disabled={pledging || loading}
            className={`flex-shrink-0 font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              pledge?.pledged
                ? 'border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400'
                : 'bg-amber-500 hover:bg-amber-600 text-black'
            }`}
          >
            {pledging
              ? 'Saving...'
              : pledge?.pledged
                ? 'Withdraw pledge'
                : 'Pledge to the Code of Craft'}
          </button>
        </div>
        {pledge?.pledged && (
          <p className="text-xs text-emerald-400 mt-3">
            ✓ Pledged{pledge.pledgedAt ? ` on ${new Date(pledge.pledgedAt).toLocaleDateString()}` : ''}
          </p>
        )}
      </div>

      {/* Verified Pro progress */}
      {verifiedPro && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h2 className="font-semibold text-gray-200">
              Verified Pro{' '}
              {verifiedPro.eligible ? (
                <span className="ml-2 text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded px-2 py-0.5">
                  Eligible
                </span>
              ) : (
                <span className="ml-2 text-xs font-mono text-gray-500">
                  {verifiedPro.metCount}/{verifiedPro.totalCount} complete
                </span>
              )}
            </h2>
            <Link href="/verified-pro" className="text-xs text-amber-400 hover:underline">
              What is Verified Pro?
            </Link>
          </div>
          {/* progress bar */}
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(verifiedPro.metCount / verifiedPro.totalCount) * 100}%` }}
            />
          </div>
          <ul className="space-y-2">
            {verifiedPro.checklist.map((c) => (
              <li key={c.key} className="flex items-start gap-2.5 text-sm">
                <span className={c.met ? 'text-emerald-400' : 'text-gray-600'}>{c.met ? '✓' : '○'}</span>
                <span>
                  <span className={c.met ? 'text-gray-300' : 'text-gray-400'}>{c.label}</span>
                  <span className="text-gray-600"> — {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proof-of-work gallery */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200">Proof of work ({proof.length})</h2>
          {!showForm && (
            <button
              onClick={openAdd}
              className="text-sm border border-gray-700 hover:border-amber-500 hover:text-amber-400 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add proof
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Showcase honest photos of past work on your public profile. Share{' '}
          <span className="text-gray-400">links to images you host</span> — we store only URLs, never files.
          Only post work you actually did. Hidden items stay private to you.
        </p>

        {showForm && (
          <div className="mb-6 p-4 border border-gray-800 rounded-lg space-y-4 bg-gray-950/40">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                placeholder="e.g. Backyard fence rebuild"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="What you did, materials, timeframe…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Image URLs</label>
              <textarea
                value={form.imageUrls}
                onChange={(e) => setForm({ ...form, imageUrls: e.target.value })}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder={'https://your-image-host/photo-1.jpg\nhttps://your-image-host/photo-2.jpg'}
              />
              <p className="text-xs text-gray-600 mt-1">One URL per line (or comma-separated). Up to 8.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Skill tags</label>
              <input
                type="text"
                value={form.skillTags}
                onChange={(e) => setForm({ ...form, skillTags: e.target.value })}
                className={inputClass}
                placeholder="carpentry, fencing, hauling"
              />
              <p className="text-xs text-gray-600 mt-1">Comma-separated.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                className="accent-amber-500"
              />
              Show on my public profile
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add proof'}
              </button>
              <button
                onClick={closeForm}
                className="border border-gray-700 hover:border-gray-600 text-gray-300 px-5 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : proof.length === 0 ? (
          !showForm && (
            <p className="text-sm text-gray-500">
              No proof of work yet. Add photos of past work to help clients trust your skill claims.
            </p>
          )
        ) : (
          <div className="space-y-3">
            {proof.map((p) => (
              <div key={p.id} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{p.title}</span>
                      {p.visible === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                          Hidden
                        </span>
                      )}
                      {p.quest?.title && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                          {p.quest.title}
                        </span>
                      )}
                    </div>
                    {p.description && <p className="text-sm text-gray-400 mt-1">{p.description}</p>}
                    {p.skillTags.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{p.skillTags.join(' · ')}</p>
                    )}
                    {p.imageUrls.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        {p.imageUrls.length} image{p.imageUrls.length === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-amber-500 hover:text-amber-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
