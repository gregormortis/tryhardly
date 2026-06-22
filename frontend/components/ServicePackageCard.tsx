'use client';

import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import type { ServicePackage } from '@/lib/types';
import {
  categoryLabel,
  formatPackagePrice,
  requestHelpHref,
  requiresContractorNote,
} from '@/lib/servicePackages';

interface ServicePackageCardProps {
  pkg: ServicePackage;
  // Hide the worker line when the card already renders under a worker's profile.
  showWorker?: boolean;
}

// Public-facing card for a service package. Shows title, worker, category,
// price (or "Quote needed"), service area, and a "Request this service" CTA
// that routes into /request-help with the package as context — never a payment.
export default function ServicePackageCard({ pkg, showWorker = true }: ServicePackageCardProps) {
  const workerName = pkg.user?.displayName || pkg.user?.username || null;
  const showContractorNote = requiresContractorNote(pkg.category);

  return (
    <div className="flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-amber-500/40 transition-colors">
      {pkg.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pkg.imageUrl}
          alt={pkg.title}
          loading="lazy"
          className="w-full h-40 object-cover border-b border-gray-800 bg-gray-800"
        />
      )}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
            {categoryLabel(pkg.category)}
          </span>
          <span className="text-xs font-medium text-amber-400">{formatPackagePrice(pkg)}</span>
        </div>

        <h3 className="text-white font-semibold leading-snug">{pkg.title}</h3>

        {showWorker && workerName && (
          <p className="text-xs text-gray-500 mt-1">
            by{' '}
            {pkg.user?.username ? (
              <Link href={`/profile/${pkg.user.username}`} className="text-gray-400 hover:text-amber-400">
                {workerName}
              </Link>
            ) : (
              <span className="text-gray-400">{workerName}</span>
            )}
          </p>
        )}

        {pkg.description && (
          <p className="text-sm text-gray-400 mt-2 line-clamp-3 leading-relaxed">{pkg.description}</p>
        )}

        {pkg.serviceArea && (
          <p className="flex items-center gap-1 text-xs text-gray-500 mt-3">
            <MapPin size={12} /> {pkg.serviceArea}
          </p>
        )}

        {pkg.includedScope && (
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-gray-400">Includes:</span> {pkg.includedScope}
          </p>
        )}

        {showContractorNote && (
          <p className="text-[11px] text-amber-500/80 mt-3 leading-relaxed">
            A licensed contractor may be required for some work in this category. Workers offer only services
            they are legally qualified to perform.
          </p>
        )}

        <div className="mt-auto pt-4">
          <Link
            href={requestHelpHref(pkg)}
            className="inline-flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Request this service <ArrowRight size={15} />
          </Link>
          <p className="text-center text-[11px] text-gray-600 mt-2">
            Starts a normal job request — no payment is taken now.
          </p>
        </div>
      </div>
    </div>
  );
}
