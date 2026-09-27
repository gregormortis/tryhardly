import type { Metadata } from 'next';
import WorkersLanding from './WorkersLanding';

const title = 'Find local work in Redding — bid your price, keep 100%';
const description =
  'Why try hard when you can TryHardly? Browse open gigs in Redding, CA — yard work, hauling, cleaning, moving, handyman, errands — with the pay listed up front. Free to sign up, one-tap applications, and you keep 100% of what you earn.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/workers' },
  keywords: [
    'find work Redding CA',
    'side gigs Redding',
    'odd jobs for cash Redding',
    'yard work jobs near me',
    'hauling jobs Redding',
    'cleaning gigs',
    'handyman work Redding CA',
    'get paid for local work',
    'worker sign up',
  ],
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/workers',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${title} · TryHardly`,
    description,
  },
};

export default function WorkersPage() {
  return <WorkersLanding />;
}
