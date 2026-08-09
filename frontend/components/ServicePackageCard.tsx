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
    <div className="group flex flex-col bg-surface border border-line rounded-xl overflow-hidden transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5">
      {pkg.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pkg.imageUrl}
          alt={pkg.title}
          loading="lazy"
          className="w-full h-44 object-cover border-b border-line bg-raised"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-28 border-b border-line bg-gradient-to-br from-raised/60 to-surface">
          <Package size={28} className="text-subtle" />
        </div>
      )}

      <div className="flex flex-col flex-1 p-5">
        {/* Category + title */}
        <span className="inline-flex self-start text-[12px] font-medium px-2 py-0.5 rounded-full bg-raised text-body mb-2.5">
          {categoryLabel(pkg.category)}
        </span>

        <h3 className="text-strong font-semibold text-[15px] leading-snug break-words">{pkg.title}</h3>

        {showWorker && workerName && (
          <p className="text-xs text-subtle mt-1">
            by{' '}
            {pkg.user?.username ? (
              <Link
                href={`/profile/${pkg.user.username}`}
                className="text-muted hover:text-accent-text transition-colors"
              >
                {workerName}
              </Link>
            ) : (
              <span className="text-muted">{workerName}</span>
            )}
          </p>
        )}

        {/* Price — the key trust signal, given prominence */}
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-accent-text">{price}</span>
          {price === 'Quote needed' && (
            <span className="text-[12px] text-subtle">· priced after details</span>
          )}
        </div>

        {pkg.description && (
          <p className="text-sm text-muted mt-3 line-clamp-3 leading-relaxed">{pkg.description}</p>
        )}

        {/* Meta: service area + availability */}
        {(pkg.serviceArea || pkg.availability) && (
          <div className="mt-3 space-y-1.5">
            {pkg.serviceArea && (
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <MapPin size={13} className="mt-0.5 shrink-0 text-subtle" />
                <span>{pkg.serviceArea}</span>
              </p>
            )}
            {pkg.availability && (
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <Clock size={13} className="mt-0.5 shrink-0 text-subtle" />
                <span>{pkg.availability}</span>
              </p>
            )}
          </div>
        )}

        {pkg.includedScope && (
          <p className="text-xs text-subtle mt-3 leading-relaxed">
            <span className="font-medium text-muted">Includes:</span> {pkg.includedScope}
          </p>
        )}

        {showContractorNote && (
          <p className="flex items-start gap-1.5 text-[12px] text-accent-text mt-3 leading-relaxed">
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
            className="inline-flex items-center justify-center gap-2 w-full bg-accent hover:bg-accent text-on-accent font-semibold px-4 py-2.5 rounded-lg transition-colors group-hover:gap-3"
          >
            Request this service <ArrowRight size={15} className="transition-all" />
          </Link>
          <p className="text-center text-[12px] text-subtle mt-2">
            Starts a normal job request — no payment is taken now.
          </p>
        </div>
      </div>
    </div>
  );
}
