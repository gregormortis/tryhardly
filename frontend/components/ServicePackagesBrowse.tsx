'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, PackageOpen } from 'lucide-react';
import { api } from '@/lib/api';
import type { ServicePackage } from '@/lib/types';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import ServicePackageCard from '@/components/ServicePackageCard';

function CardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
      <div className="h-28 bg-gray-800/60" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-20 bg-gray-800 rounded-full" />
        <div className="h-4 w-3/4 bg-gray-800 rounded" />
        <div className="h-5 w-24 bg-gray-800 rounded" />
        <div className="h-3 w-full bg-gray-800/70 rounded" />
        <div className="h-3 w-5/6 bg-gray-800/70 rounded" />
        <div className="h-10 w-full bg-gray-800 rounded-lg mt-4" />
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

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Service packages</h1>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
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
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
          >
            <option value="">All categories</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services or areas (e.g. mowing, 96001)"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
            />
          </div>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {!loading && packages.length > 0 && (
          <p className="text-sm text-gray-500 mb-4">
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
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl bg-gray-900/40">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800/80 mb-4">
              <PackageOpen size={22} className="text-gray-500" />
            </div>
            <p className="text-gray-300 font-medium">No service packages match yet.</p>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              TryHardly is growing locally. Need something done?{' '}
              <Link href="/request-help" className="text-amber-400 hover:text-amber-300 font-medium">
                Request help
              </Link>{' '}
              and we&apos;ll line up a worker.
            </p>
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
