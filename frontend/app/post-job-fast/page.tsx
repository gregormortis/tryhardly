import type { Metadata } from 'next';
import PostJobFastLanding from './PostJobFastLanding';

const title = 'Post your job in 60 seconds';
const description =
  'Need yard work, hauling, cleaning, moving, handyman help, or errands done? Post your job free on TryHardly instead of burying it in a Facebook group — get local workers applying in one organized place, with profiles and reviews.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/post-job-fast' },
  keywords: [
    'post a local job',
    'hire help near me',
    'yard work help',
    'hauling and junk removal',
    'moving help',
    'handyman near me',
    'odd jobs',
    'alternative to Facebook group help wanted',
  ],
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/post-job-fast',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${title} · TryHardly`,
    description,
  },
};

export default function PostJobFastPage() {
  return <PostJobFastLanding />;
}
