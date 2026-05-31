import type { Metadata } from 'next';
import Flyer from '../Flyer';
import { links, shortLinks } from '../../config';

export const metadata: Metadata = {
  title: 'Redding flyer — Need help with a job?',
  description: 'Printable flyer for posting local jobs in Redding, CA on TryHardly.',
  alternates: { canonical: '/redding/flyer/request-help' },
  robots: { index: false, follow: false },
};

export default function ReddingRequestFlyerPage() {
  return (
    <Flyer
      backHref="/redding"
      eyebrow="Local help in Redding, CA"
      headline="Need a hand getting it done?"
      subhead="Post a local job and get matched with reliable local help."
      bullets={[
        'Yard work & hauling',
        'Moving help & junk removal',
        'Cleaning & handyman jobs',
        'Errands & pickups',
      ]}
      qrUrl={links.flyerRequestHelpTarget}
      shortUrl={shortLinks.requestHelp}
      callToAction="Post your job — it's free"
      footnote="New in Redding — early access. We're connecting real local jobs with dependable local people. Takes about a minute, no account needed to post."
    />
  );
}
