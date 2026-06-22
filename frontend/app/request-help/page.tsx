import type { Metadata } from 'next';
import { Suspense } from 'react';
import RequestHelpForm from './RequestHelpForm';

const title = 'Request help — no account needed';
const description =
  'Tell us what you need done and where. Post a help request in about a minute — no login required. We line up local workers and email you. Yard work, hauling, moving, cleaning, handyman jobs, and errands.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/request-help' },
  keywords: [
    'request local help',
    'hire help near me no account',
    'post a job without signing up',
    'yard work help',
    'hauling help',
    'moving help',
    'handyman near me',
  ],
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/request-help',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${title} · TryHardly`,
    description,
  },
};

export default function RequestHelpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <RequestHelpForm />
    </Suspense>
  );
}
