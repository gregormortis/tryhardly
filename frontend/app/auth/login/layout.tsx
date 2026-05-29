import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your TryHardly account to post jobs or find paid local work.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
