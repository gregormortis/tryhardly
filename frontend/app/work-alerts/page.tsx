import type { Metadata } from 'next';
import WorkAlertsForm from './WorkAlertsForm';

const title = 'Get local work alerts — no account needed';
const description =
  'Sign up for alerts when local jobs that match your skills come up. Yard work, hauling, moving, cleaning, handyman jobs, and more. Takes 30 seconds — no login required.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/work-alerts' },
  keywords: [
    'local work alerts',
    'gig work near me',
    'find local jobs no account',
    'yard work jobs',
    'hauling jobs',
    'handyman work near me',
    'odd jobs for cash',
  ],
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/work-alerts',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${title} · TryHardly`,
    description,
  },
};

export default function WorkAlertsPage() {
  return <WorkAlertsForm />;
}
