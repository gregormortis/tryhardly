import type { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: { absolute: 'Contact us' },
  description: 'Contact TryHardly for help with your account, a local job, or the marketplace in Redding.',
  alternates: { canonical: canonicalUrl('/contact') },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
