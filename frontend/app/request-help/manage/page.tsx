import type { Metadata } from 'next';
import ManageRequestClient from './ManageRequestClient';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Manage your request',
  description: 'View and update the help request you submitted — no account needed.',
  alternates: { canonical: canonicalUrl('/request-help/manage') },
  // Private, token-gated page — keep it out of search indexes.
  robots: { index: false, follow: false },
};

export default function ManageRequestPage() {
  return <ManageRequestClient />;
}
