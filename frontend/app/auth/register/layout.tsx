import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create a TryHardly account to post local jobs or start earning from gigs near you.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
