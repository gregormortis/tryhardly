'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ProfessionalCredential, CredentialType } from '@/lib/types';

const CREDENTIAL_TYPES: { value: CredentialType; label: string }[] = [
  { value: 'LICENSE', label: 'License' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'BOND', label: 'Bond' },
  { value: 'BACKGROUND_CHECK', label: 'Background check' },
  { value: 'TRADE_MEMBERSHIP', label: 'Trade membership' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-warning/20 text-warning',
  VERIFIED: 'bg-success/20 text-success',
  REJECTED: 'bg-danger/20 text-danger',
  EXPIRED: 'bg-raised-2 text-body',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending admin review',
  VERIFIED: 'Verified',
  REJECTED: 'Not verified',
  EXPIRED: 'Expired',
};

interface FormState {
  type: CredentialType;
  title: string;
  issuer: string;
  credentialNumber: string;
  jurisdiction: string;
  expirationDate: string;
  proofUrl: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  type: 'LICENSE',
  title: '',
  issuer: '',
  credentialNumber: '',
  jurisdiction: '',
  expirationDate: '',
  proofUrl: '',
  notes: '',
};

// Map a credential record to the editable form (dates trimmed to yyyy-mm-dd).
function toForm(c: ProfessionalCredential): FormState {
  return {
    type: c.type,
    title: c.title || '',
    issuer: c.issuer || '',
    credentialNumber: c.credentialNumber || '',
    jurisdiction: c.jurisdiction || '',
    expirationDate: c.expirationDate ? c.expirationDate.slice(0, 10) : '',
    proofUrl: c.proofUrl || '',
    notes: c.notes || '',
  };
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CredentialsManager() {
  const [credentials, setCredentials] = useState<ProfessionalCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCredentials = async () => {
    try {
      const data = await api.get<ProfessionalCredential[]>('/users/me/credentials');
      setCredentials(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c: ProfessionalCredential) => {
    setEditingId(c.id);
    setForm(toForm(c));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        issuer: form.issuer.trim(),
        credentialNumber: form.credentialNumber.trim(),
        jurisdiction: form.jurisdiction.trim(),
        expirationDate: form.expirationDate || null,
        proofUrl: form.proofUrl.trim(),
        notes: form.notes.trim(),
      };
      if (editingId) {
        await api.put(`/users/me/credentials/${editingId}`, payload);
        toast.success('Credential updated');
      } else {
        await api.post('/users/me/credentials', payload);
        toast.success('Credential submitted for review');
      }
      await fetchCredentials();
      closeForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential? This cannot be undone.')) return;
    try {
      await api.delete(`/users/me/credentials/${id}`);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      toast.success('Credential deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete credential');
    }
  };

  const inputClass =
    'w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent';

  return (
    <div className="bg-surface border border-line rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-body">Professional credentials ({credentials.length})</h2>
        {!showForm && (
          <button
            onClick={openAdd}
            className="text-sm border border-line-strong hover:border-accent hover:text-accent-text text-body px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add credential
          </button>
        )}
      </div>

      <p className="text-xs text-subtle mb-4 leading-relaxed">
        Add licenses, insurance, certifications and other proof of your work. New or edited entries are marked
        <span className="text-warning"> &ldquo;Pending admin review&rdquo;</span> until an admin verifies the details.
        Verification means TryHardly reviewed the submitted credential details — it is not a guarantee of legal
        compliance. <span className="text-muted">Do not upload sensitive documents unless necessary</span>; share a
        link to proof rather than private files.
      </p>

      {/* Add/Edit form */}
      {showForm && (
        <div className="mb-6 p-4 border border-line rounded-lg space-y-4 bg-canvas">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-body mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CredentialType })}
                className={inputClass}
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Title / name *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                placeholder="e.g. C-10 Electrical Contractor License"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Issuer</label>
              <input
                type="text"
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                className={inputClass}
                placeholder="e.g. CSLB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Credential number</label>
              <input
                type="text"
                value={form.credentialNumber}
                onChange={(e) => setForm({ ...form, credentialNumber: e.target.value })}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Jurisdiction</label>
              <input
                type="text"
                value={form.jurisdiction}
                onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                className={inputClass}
                placeholder="e.g. CA, Federal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Expiration date</label>
              <input
                type="date"
                value={form.expirationDate}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-body mb-1">Proof URL</label>
            <input
              type="url"
              value={form.proofUrl}
              onChange={(e) => setForm({ ...form, proofUrl: e.target.value })}
              className={inputClass}
              placeholder="https://link-to-public-license-lookup"
            />
            <p className="text-xs text-subtle mt-1">
              Prefer a public verification/lookup link. Do not share private documents.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-body mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Anything the reviewer should know"
            />
          </div>
          {editingId && (
            <p className="text-xs text-warning/80">
              Editing details (other than notes) sends a verified credential back to pending review.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-accent hover:bg-accent disabled:opacity-50 text-on-accent font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Submit for review'}
            </button>
            <button
              onClick={closeForm}
              className="border border-line-strong hover:border-line-strong text-body px-5 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-subtle">Loading credentials...</p>
      ) : credentials.length === 0 ? (
        !showForm && <p className="text-sm text-subtle">No credentials yet. Add one to build trust with clients.</p>
      ) : (
        <div className="space-y-3">
          {credentials.map((c) => {
            const typeLabel = CREDENTIAL_TYPES.find((t) => t.value === c.type)?.label || c.type;
            return (
              <div key={c.id} className="p-4 bg-raised rounded-lg">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-raised-2 text-body">{typeLabel}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] || 'bg-raised-2 text-body'}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </div>
                    <p className="text-strong font-medium mt-2">{c.title}</p>
                    <p className="text-xs text-subtle mt-1">
                      {[c.issuer, c.jurisdiction, c.credentialNumber ? `#${c.credentialNumber}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {c.expirationDate && (
                      <p className="text-xs text-subtle mt-0.5">Expires {fmtDate(c.expirationDate)}</p>
                    )}
                    {c.proofUrl && (
                      <a
                        href={c.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent-text hover:text-accent-text-hover underline mt-1 inline-block"
                      >
                        Proof link
                      </a>
                    )}
                    {c.status === 'REJECTED' && c.rejectionReason && (
                      <p className="text-xs text-danger mt-1">Reason: {c.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-accent hover:text-accent-text"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs px-2 py-1 rounded border border-line-strong text-body hover:border-danger hover:text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
