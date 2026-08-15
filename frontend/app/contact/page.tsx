import type { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: { absolute: 'Contact us' },
  description: 'Contact TryHardly for help with your account, a local job, or the marketplace in Redding.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
