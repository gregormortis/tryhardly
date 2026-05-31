import type { Metadata } from 'next';
import ReddingLanding from './ReddingLanding';

const title = 'Post jobs and find local work in Redding';
const description =
  'TryHardly is launching in Redding, CA. Post local jobs — yard work, hauling, moving help, cleaning, handyman work, and errands — or sign up to get alerts for nearby work and build your profile. Early access: our goal is matching real local jobs with reliable local help.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/redding' },
  keywords: [
    'Redding CA local jobs',
    'hire help in Redding',
    'yard work Redding',
    'hauling and junk removal Redding',
    'moving help Redding',
    'cleaning jobs Redding',
    'handyman Redding',
    'errands Redding',
    'find local work Redding',
    'gig work Redding California',
  ],
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/redding',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${title} · TryHardly`,
    description,
  },
};

export default function ReddingPage() {
  return <ReddingLanding />;
}
