import type { Metadata } from 'next';
import FAQPageClient from './FAQPageClient';

export const metadata: Metadata = {
  title: { absolute: 'Frequently asked questions' },
  description: 'Answers about posting local jobs, finding work, direct payment, and using TryHardly in Redding.',
  alternates: { canonical: '/faq' },
};

export default function FAQPage() {
  return <FAQPageClient />;
}
