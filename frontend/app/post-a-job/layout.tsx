import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

// post-a-job/page.tsx is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'Post a job in Redding — free | TryHardly',
  description:
    'Post your local job free in about a minute: yard work, hauling, cleaning, moving, repairs, errands. Local workers bid; you pick, you pay them directly.',
  alternates: { canonical: canonicalUrl('/post-a-job') },
};

export default function PostAJobLayout({ children }: { children: React.ReactNode }) {
  return children;
}
