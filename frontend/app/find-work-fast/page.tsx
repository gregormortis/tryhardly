import type { Metadata } from 'next';
import FindWorkFastLanding from './FindWorkFastLanding';

const title = 'Find local work you can actually do';
const description =
  'Looking for local gigs, side jobs, or extra cash? Find nearby yard work, hauling, cleaning, moving help, handyman jobs, and errands on TryHardly — with the pay listed up front, one-tap applications, and a profile that gets you picked.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/find-work-fast' },
  keywords: [
    'find local work',
    'side gigs near me',
    'odd jobs for cash',
    'yard work jobs',
    'lawn care gigs',
    'hauling and moving jobs',
    'cleaning gigs',
    'handyman work near me',
    'delivery and errand jobs',
    'alternative to Facebook group gigs',
  ],
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/find-work-fast',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${title} · TryHardly`,
    description,
  },
};

export default function FindWorkFastPage() {
  return <FindWorkFastLanding />;
}
