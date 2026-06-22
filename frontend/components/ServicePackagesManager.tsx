'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ServicePackage, ServicePriceType } from '@/lib/types';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import {
  PRICE_TYPE_OPTIONS,
  categoryLabel,
  formatPackagePrice,
  requiresContractorNote,
} from '@/lib/servicePackages';

interface FormState {
  title: string;
  category: string;
  description: string;
  priceType: ServicePriceType;
  startingPrice: string;
  includedScope: string;
  addOns: string;
  exclusions: string;
  materialsPolicy: string;
  serviceArea: string;
  availability: string;
  toolsProvided: string;
  imageUrl: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  category: 'yard',
  description: '',
  priceType: 'STARTING_AT',
  startingPrice: '',
  includedScope: '',
  addOns: '',
  exclusions: '',
  materialsPolicy: '',
  serviceArea: '',
  availability: '',
  toolsProvided: '',
  imageUrl: '',
  active: false,
};

function toForm(p: ServicePackage): FormState {
  return {
    title: p.title || '',
    category: p.category || 'yard',
    description: p.description || '',
    priceType: p.priceType || 'STARTING_AT',
    startingPrice: p.startingPrice != null ? String(p.startingPrice) : '',
    includedScope: p.includedScope || '',
    addOns: p.addOns || '',
    exclusions: p.exclusions || '',
    materialsPolicy: p.materialsPolicy || '',
    serviceArea: p.serviceArea || '',
    availability: p.availability || '',
    toolsProvided: p.toolsProvided || '',
    imageUrl: p.imageUrl || '',
    active: !!p.active,
  };
}

export default function ServicePackagesManager() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPackages = async () => {
    try {
      const data = await api.get<ServicePackage[]>('/service-packages/me');
      setPackages(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load service packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (p: ServicePackage) => {
    setEditingId(p.id);
    setForm(toForm(p));
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
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        priceType: form.priceType,
        startingPrice:
          form.priceType === 'QUOTE_NEEDED' || form.startingPrice.trim() === ''
            ? null
            : form.startingPrice.trim(),
        includedScope: form.includedScope.trim(),
        addOns: form.addOns.trim(),
        exclusions: form.exclusions.trim(),
        materialsPolicy: form.materialsPolicy.trim(),
        serviceArea: form.serviceArea.trim(),
        availability: form.availability.trim(),
        toolsProvided: form.toolsProvided.trim(),
        imageUrl: form.imageUrl.trim(),
        active: form.active,
      };
      if (editingId) {
        await api.put(`/service-packages/me/${editingId}`, payload);
        toast.success('Service package updated');
      } else {
        await api.post('/service-packages/me', payload);
        toast.success('Service package created');
      }
      await fetchPackages();
      closeForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save service package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service package? This cannot be undone.')) return;
    try {
      await api.delete(`/service-packages/me/${id}`);
      setPackages((prev) => prev.filter((p) => p.id !== id));
      toast.success('Service package deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete service package');
    }
  };

  const toggleActive = async (p: ServicePackage) => {
    try {
      const updated = await api.put<ServicePackage>(`/service-packages/me/${p.id}`, { active: !p.active });
      setPackages((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      toast.success(updated.active ? 'Package published' : 'Package unpublished');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update package');
    }
  };

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500';

  const priceDisabled = form.priceType === 'QUOTE_NEEDED';
  const showContractorNote = requiresContractorNote(form.category);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-200">Service packages ({packages.length})</h2>
        {!showForm && (
          <button
            onClick={openAdd}
            className="text-sm border border-gray-700 hover:border-amber-500 hover:text-amber-400 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add package
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Publish repeatable local services clients can browse and request — e.g.{' '}
        <span className="text-gray-400">&ldquo;Dump Run — Pickup Truck Load&rdquo;</span>,{' '}
        <span className="text-gray-400">&ldquo;2-Hour Yard Cleanup&rdquo;</span>, or{' '}
        <span className="text-gray-400">&ldquo;Move One Couch or Appliance.&rdquo;</span> Packages are
        listings only — requesting one starts a normal job. No payment is taken from a package; you and the
        client agree on details and price before any payment, exactly as you do today. Only{' '}
        <span className="text-gray-400">published</span> packages appear on your public profile and the
        services page.
      </p>

      {/* Add/Edit form */}
      {showForm && (
        <div className="mb-6 p-4 border border-gray-800 rounded-lg space-y-4 bg-gray-950/40">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 200) })}
                className={inputClass}
                placeholder="e.g. Dump Run — Pickup Truck Load"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {JOB_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Pricing</label>
              <select
                value={form.priceType}
                onChange={(e) => setForm({ ...form, priceType: e.target.value as ServicePriceType })}
                className={inputClass}
              >
                {PRICE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                {PRICE_TYPE_OPTIONS.find((o) => o.value === form.priceType)?.hint}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Price {priceDisabled ? '(not used for quotes)' : '(USD)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.startingPrice}
                onChange={(e) => setForm({ ...form, startingPrice: e.target.value })}
                className={inputClass}
                placeholder={priceDisabled ? '—' : 'e.g. 85'}
                disabled={priceDisabled}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 5000) })}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="What this service is and who it's for."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">What&apos;s included</label>
            <textarea
              value={form.includedScope}
              onChange={(e) => setForm({ ...form, includedScope: e.target.value.slice(0, 2000) })}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="e.g. Up to one truck load, loading and disposal fees included."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Add-ons</label>
              <textarea
                value={form.addOns}
                onChange={(e) => setForm({ ...form, addOns: e.target.value.slice(0, 2000) })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="e.g. Extra load +$40; stairs/heavy items by quote."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Exclusions</label>
              <textarea
                value={form.exclusions}
                onChange={(e) => setForm({ ...form, exclusions: e.target.value.slice(0, 2000) })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="e.g. No hazardous materials, paint, or tires."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Materials policy</label>
            <input
              type="text"
              value={form.materialsPolicy}
              onChange={(e) => setForm({ ...form, materialsPolicy: e.target.value.slice(0, 1000) })}
              className={inputClass}
              placeholder="e.g. Disposal fees included; materials billed at cost."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Service area</label>
              <input
                type="text"
                value={form.serviceArea}
                onChange={(e) => setForm({ ...form, serviceArea: e.target.value.slice(0, 300) })}
                className={inputClass}
                placeholder="e.g. Redding & within 20 mi (96001, 96002, 96003)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Availability</label>
              <input
                type="text"
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value.slice(0, 300) })}
                className={inputClass}
                placeholder="e.g. Weekends and weekday evenings"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tools / equipment provided</label>
            <input
              type="text"
              value={form.toolsProvided}
              onChange={(e) => setForm({ ...form, toolsProvided: e.target.value.slice(0, 500) })}
              className={inputClass}
              placeholder="e.g. Pickup truck, dolly, and straps provided"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Photo URL</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value.slice(0, 1000) })}
              className={inputClass}
              placeholder="https://link-to-a-photo (optional)"
            />
          </div>

          {showContractorNote && (
            <p className="text-xs text-amber-500/90 leading-relaxed border border-amber-500/20 bg-amber-500/5 rounded-lg p-3">
              Some work in this category may require a licensed and insured contractor depending on scope and
              local rules. You are responsible for only offering services you are legally qualified to perform
              and for meeting any licensing requirements in your area.
            </p>
          )}

          <label className="flex items-start gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
            />
            <span>
              Publish this package
              <span className="block text-xs text-gray-500 mt-0.5">
                Published packages appear on your public profile and the services page. Leave unchecked to keep
                it as a draft.
              </span>
            </span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create package'}
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

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading service packages...</p>
      ) : packages.length === 0 ? (
        !showForm && (
          <div className="text-center py-10 border border-dashed border-gray-800 rounded-lg bg-gray-950/30">
            <p className="text-sm text-gray-300 font-medium">No service packages yet</p>
            <p className="text-xs text-gray-500 mt-1 mb-4 max-w-sm mx-auto leading-relaxed">
              Add one to let clients find and request your local services from your profile and the
              services page.
            </p>
            <button
              onClick={openAdd}
              className="text-sm bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + Add your first package
            </button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {packages.map((p) => (
            <div
              key={p.id}
              className="p-4 bg-gray-800/70 border border-gray-800 rounded-lg transition-colors hover:border-gray-700"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        p.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-green-400' : 'bg-gray-500'}`}
                      />
                      {p.active ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      {categoryLabel(p.category)}
                    </span>
                    <span className="text-xs font-semibold text-amber-400">{formatPackagePrice(p)}</span>
                  </div>
                  <p className="text-white font-medium mt-2">{p.title}</p>
                  {p.serviceArea && <p className="text-xs text-gray-500 mt-1">{p.serviceArea}</p>}
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(p)}
                    className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-green-500 hover:text-green-400"
                  >
                    {p.active ? 'Unpublish' : 'Publish'}
                  </button>
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
  );
}
