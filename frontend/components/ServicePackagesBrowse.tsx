'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ServicePackage } from '@/lib/types';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import ServicePackageCard from '@/components/ServicePackageCard';

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
          <h1 className="text-3xl font-bold text-white mb-2">Service packages</h1>
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
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">All categories</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services or areas (e.g. mowing, 96001)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {loading ? (
          <p className="text-gray-500">Loading service packages...</p>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 border border-gray-800 rounded-xl bg-gray-900/40">
            <p className="text-gray-400">No service packages match yet.</p>
            <p className="text-gray-600 text-sm mt-2">
              TryHardly is growing locally. Need something done?{' '}
              <Link href="/request-help" className="text-amber-400 hover:text-amber-300">
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
