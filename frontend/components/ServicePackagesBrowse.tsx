'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, PackageOpen } from 'lucide-react';
import { api } from '@/lib/api';
import type { ServicePackage } from '@/lib/types';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import ServicePackageCard from '@/components/ServicePackageCard';

// Illustrative service ideas shown only on the empty state so the page never
// reads as dead. These are clearly labelled examples — not real listings and
// not requestable — to help posters picture what they can ask for and to nudge
// workers to publish.
const EXAMPLE_IDEAS: { title: string; price: string; area: string }[] = [
  { title: 'Dump Run — Pickup Truck Load', price: 'From $85', area: 'Hauling & junk removal' },
  { title: '2-Hour Yard Cleanup', price: 'From $60', area: 'Lawn & yard' },
  { title: 'Move One Couch or Appliance', price: 'Flat $75', area: 'Moving help' },
];

function CardSkeleton() {
  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden animate-pulse">
      <div className="h-28 bg-raised" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-20 bg-raised rounded-full" />
        <div className="h-4 w-3/4 bg-raised rounded" />
        <div className="h-5 w-24 bg-raised rounded" />
        <div className="h-3 w-full bg-raised rounded" />
        <div className="h-3 w-5/6 bg-raised rounded" />
        <div className="h-10 w-full bg-raised rounded-lg mt-4" />
      </div>
    </div>
  );
}

export default function ServicePackagesBrowse() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const q = search.trim();
      if (q) params.set('q', q);
      const qs = params.toString();
      const data = await api.get<ServicePackage[]>(`/service-packages${qs ? `?${qs}` : ''}`);
      setPackages(Array.isArray(data) ? data : []);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when the category filter changes; the search box uses a submit.
  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const hasFilters = category !== '' || search.trim() !== '';

  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-strong mb-2 tracking-tight">Service packages</h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            Browse repeatable local services from workers near you — yard work, hauling, moving help,
            cleaning, and more. Request one to start a normal job; you agree on details and price before any
            payment is made.
          </p>
        </div>

        {/* Filters */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPackages();
          }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-surface border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
          >
            <option value="">All categories</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services or area"
              className="w-full bg-surface border border-line-strong rounded-lg pl-10 pr-4 py-2.5 text-strong placeholder-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
          </div>
          <button
            type="submit"
            className="bg-accent hover:bg-accent text-on-accent font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {!loading && packages.length > 0 && (
          <p className="text-sm text-subtle mb-4">
            {packages.length} {packages.length === 1 ? 'service' : 'services'} available
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="border border-dashed border-line rounded-xl bg-surface p-8 sm:p-10">
            <div className="text-center max-w-xl mx-auto">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-raised mb-4">
                <PackageOpen size={22} className="text-muted" />
              </div>
              <p className="text-strong font-semibold text-lg">
                {hasFilters ? 'No services match your search yet' : 'No services listed here yet'}
              </p>
              <p className="text-muted text-sm mt-2 leading-relaxed">
                {hasFilters
                  ? 'Try a broader category or a different area. You can also describe the job and we’ll line up a worker.'
                  : 'TryHardly is growing locally. Tell us what you need and we’ll match you with a worker — or list your own service if you do this work.'}
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('');
                      setSearch('');
                    }}
                    className="border border-line-strong hover:border-line-strong text-body font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                <Link
                  href="/request-help"
                  className="bg-accent hover:bg-accent text-on-accent font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  Request help
                </Link>
                <Link
                  href="/post-a-job"
                  className="border border-line-strong hover:border-accent hover:text-accent-text text-body font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  Post a job
                </Link>
              </div>
            </div>

            {/* Illustrative examples — clearly not real listings. */}
            <div className="mt-9 max-w-2xl mx-auto">
              <p className="text-center text-[12px] font-semibold tracking-widest uppercase text-subtle mb-3">
                Examples of services workers list
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EXAMPLE_IDEAS.map((ex) => (
                  <div
                    key={ex.title}
                    className="rounded-lg border border-line bg-surface p-4 opacity-80"
                  >
                    <span className="inline-block text-[12px] font-medium px-2 py-0.5 rounded-full bg-raised text-muted mb-2">
                      Example
                    </span>
                    <p className="text-sm font-medium text-body leading-snug">{ex.title}</p>
                    <p className="text-sm font-bold text-accent-text mt-1.5">{ex.price}</p>
                    <p className="text-xs text-subtle mt-1">{ex.area}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-subtle mt-3">
                Do this kind of work?{' '}
                <Link href="/profile" className="text-accent-text hover:text-accent-text-hover font-medium">
                  List your service
                </Link>{' '}
                from your profile.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((p) => (
              <ServicePackageCard key={p.id} pkg={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
