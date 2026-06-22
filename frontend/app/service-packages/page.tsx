import type { Metadata } from 'next';
import ServicePackagesBrowse from '@/components/ServicePackagesBrowse';

export const metadata: Metadata = {
  title: 'Service Packages — Local Services on TryHardly',
  description:
    'Browse repeatable local services from workers near you — yard work, hauling, moving help, cleaning, and more. Request a service to start a job. No payment is taken until you agree on details.',
  alternates: { canonical: '/service-packages' },
  openGraph: {
    title: 'Service Packages · TryHardly',
    description: 'Browse repeatable local services from workers near you and request the help you need.',
    url: '/service-packages',
  },
};

export default function ServicePackagesPage() {
  return <ServicePackagesBrowse />;
}
