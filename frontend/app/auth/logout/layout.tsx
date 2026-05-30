import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign out',
  description: 'Sign out of your TryHardly account.',
};

export default function LogoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
