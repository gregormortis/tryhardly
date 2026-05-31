import type { Metadata } from 'next';
import Flyer from '../Flyer';
import { links, shortLinks } from '../../config';

export const metadata: Metadata = {
  title: 'Redding flyer — Looking for local work?',
  description: 'Printable flyer for finding local work and job alerts in Redding, CA on TryHardly.',
  alternates: { canonical: '/redding/flyer/workers' },
  robots: { index: false, follow: false },
};

export default function ReddingWorkerFlyerPage() {
  return (
    <Flyer
      backHref="/redding"
      eyebrow="Local work in Redding, CA"
      headline="Looking for local work?"
      subhead="Get alerts for nearby jobs and build a profile that gets you picked."
      bullets={[
        'Free profile & reviews',
        'Alerts for local jobs',
        'Yard work, hauling, moving, cleaning',
        'Handyman gigs & errands',
      ]}
      qrUrl={links.flyerWorkersTarget}
      shortUrl={shortLinks.workAlerts}
      callToAction="Get local job alerts"
      footnote="New in Redding — early access. Listings are just starting to come online. Get in early, build your profile, and be first in line as jobs roll in."
    />
  );
}
