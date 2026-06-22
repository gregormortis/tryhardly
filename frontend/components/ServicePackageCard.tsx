'use client';

import Link from 'next/link';
import { MapPin, Clock, ShieldCheck, ArrowRight, Package } from 'lucide-react';
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
  const price = formatPackagePrice(pkg);

  return (
    <div className="group flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5">
      {pkg.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pkg.imageUrl}
          alt={pkg.title}
          loading="lazy"
          className="w-full h-44 object-cover border-b border-gray-800 bg-gray-800"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-28 border-b border-gray-800 bg-gradient-to-br from-gray-800/60 to-gray-900">
          <Package size={28} className="text-gray-700" />
        </div>
      )}

      <div className="flex flex-col flex-1 p-5">
        {/* Category + title */}
        <span className="inline-flex self-start text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 mb-2.5">
          {categoryLabel(pkg.category)}
        </span>

        <h3 className="text-white font-semibold text-[15px] leading-snug">{pkg.title}</h3>

        {showWorker && workerName && (
          <p className="text-xs text-gray-500 mt-1">
            by{' '}
            {pkg.user?.username ? (
              <Link
                href={`/profile/${pkg.user.username}`}
                className="text-gray-400 hover:text-amber-400 transition-colors"
              >
                {workerName}
              </Link>
            ) : (
              <span className="text-gray-400">{workerName}</span>
            )}
          </p>
        )}

        {/* Price — the key trust signal, given prominence */}
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-amber-400">{price}</span>
          {price === 'Quote needed' && (
            <span className="text-[11px] text-gray-500">· priced after details</span>
          )}
        </div>

        {pkg.description && (
          <p className="text-sm text-gray-400 mt-3 line-clamp-3 leading-relaxed">{pkg.description}</p>
        )}

        {/* Meta: service area + availability */}
        {(pkg.serviceArea || pkg.availability) && (
          <div className="mt-3 space-y-1.5">
            {pkg.serviceArea && (
              <p className="flex items-start gap-1.5 text-xs text-gray-400">
                <MapPin size={13} className="mt-0.5 shrink-0 text-gray-500" />
                <span>{pkg.serviceArea}</span>
              </p>
            )}
            {pkg.availability && (
              <p className="flex items-start gap-1.5 text-xs text-gray-400">
                <Clock size={13} className="mt-0.5 shrink-0 text-gray-500" />
                <span>{pkg.availability}</span>
              </p>
            )}
          </div>
        )}

        {pkg.includedScope && (
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            <span className="font-medium text-gray-400">Includes:</span> {pkg.includedScope}
          </p>
        )}

        {showContractorNote && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-500/80 mt-3 leading-relaxed">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            <span>
              A licensed contractor may be required for some work in this category. Workers offer only
              services they are legally qualified to perform.
            </span>
          </p>
        )}

        <div className="mt-auto pt-4">
          <Link
            href={requestHelpHref(pkg)}
            className="inline-flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-4 py-2.5 rounded-lg transition-colors group-hover:gap-3"
          >
            Request this service <ArrowRight size={15} className="transition-all" />
          </Link>
          <p className="text-center text-[11px] text-gray-600 mt-2">
            Starts a normal job request — no payment is taken now.
          </p>
        </div>
      </div>
    </div>
  );
}
