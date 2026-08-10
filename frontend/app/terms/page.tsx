import type { Metadata } from 'next';
import Link from 'next/link';

const LAST_UPDATED = 'August 4, 2026';
const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of TryHardly, a local services marketplace. Plain-language startup terms — not legal advice.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-strong">
          Terms of Service
        </h1>
        <div className="text-body space-y-6 leading-relaxed">
          <p className="text-sm text-muted">Last Updated: {LAST_UPDATED}</p>
          <p className="text-sm text-muted">
            These terms are written in plain language for an early-access startup and are not
            legal advice. By using TryHardly you agree to them, along with our{' '}
            <Link href="/privacy" className="text-accent-text hover:text-accent-text-hover">Privacy Policy</Link>,{' '}
            <Link href="/refunds" className="text-accent-text hover:text-accent-text-hover">Refund &amp; Dispute Policy</Link>, and{' '}
            <Link href="/community-guidelines" className="text-accent-text hover:text-accent-text-hover">Community Guidelines</Link>.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TryHardly, you agree to be bound by these Terms. If you do
              not agree, please do not use the service. You must be at least 18 years old to
              use TryHardly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">2. What TryHardly Is</h2>
            <p>
              TryHardly is a marketplace that connects people who need local help
              (&quot;job posters&quot; or clients) with people who can do the work
              (&quot;workers&quot; or providers). We provide the platform that helps you find each
              other and coordinate work. We do not employ workers, and we are not a party to the
              agreements made between users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">3. Accounts</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are responsible for keeping your login credentials secure.</li>
              <li>Provide accurate information and keep it up to date.</li>
              <li>You may also use certain features (such as posting a help request) without an account; those submissions are still governed by these Terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">4. SMS / Text Messaging</h2>
            <p className="mb-2">
              By providing your mobile number and opting in, you consent to receive SMS messages
              from TryHardly, including one-time verification passcodes, account and gig status
              notifications, appointment and job reminders, and service updates. Message frequency
              varies. Message and data rates may apply. Reply STOP to unsubscribe at any time, or
              HELP for help. See our{' '}
              <Link href="/privacy" className="text-accent-text hover:text-accent-text-hover">Privacy Policy</Link>{' '}
              for details on how we handle mobile opt-in information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">5. Payments &amp; Fees</h2>
            <p className="mb-2">
              <span className="text-strong font-semibold">TryHardly does not process payments.</span>{' '}
              We introduce job posters to workers and maintain the record of jobs, ratings,
              and reviews. Payment for any job is arranged and settled{' '}
              <span className="text-strong font-semibold">directly between the job poster and
              the worker</span>, by whatever method they agree. TryHardly is not a party to
              that payment, does not receive it, does not hold it at any point, and is not a
              bank, money transmitter, or payment processor.
            </p>
            <p className="mb-2">
              Because TryHardly is not a party to the payment, TryHardly{' '}
              <span className="text-strong font-semibold">cannot refund, reverse, recover, or
              guarantee</span> any amount paid or owed between a job poster and a worker. Job
              posters and workers are solely responsible for agreeing the amount, the timing,
              and the method of payment, and for any tax obligations arising from it. Workers
              are independent contractors and are not employees, agents, or subcontractors of
              TryHardly.
            </p>
            <p>
              Posting a job is free. Creating a worker account and bidding on jobs is free.
              TryHardly currently charges no fee to either side and takes no commission on any
              job. If TryHardly introduces fees in future, they will be disclosed in advance
              and will not apply retroactively. Disputes are handled under our{' '}
              <Link href="/refunds" className="text-accent-text hover:text-accent-text-hover">Refund &amp; Dispute Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">6. Your Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Job posters must describe the work accurately and pay for work delivered as agreed.</li>
              <li>Workers must deliver work that matches what was agreed.</li>
              <li>Both parties must follow our <Link href="/community-guidelines" className="text-accent-text hover:text-accent-text-hover">Community Guidelines</Link> and all applicable laws, licenses, and local regulations.</li>
              <li>You are responsible for your own taxes and any required insurance or permits.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">7. Prohibited Conduct</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Post fraudulent, misleading, or illegal job listings.</li>
              <li>Offer or request prohibited services, including anything illegal, unlicensed work that requires a license, weapons, regulated substances, adult services, or work that endangers safety. See our <Link href="/prohibited-services" className="text-accent-text hover:text-accent-text-hover">Prohibited Services Policy</Link> for details.</li>
              <li>Harass, threaten, or discriminate against other users.</li>
              <li>Circumvent platform payments or fees, or arrange payment off-platform to avoid the service fee, after connecting through TryHardly.</li>
              <li>Scrape, attack, or interfere with the platform or other users&apos; accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">8. Intellectual Property</h2>
            <p>
              Unless the job agreement between the parties says otherwise, work products created
              through TryHardly belong to the job poster upon full payment for that work. The TryHardly name,
              brand, and platform remain our property.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">9. Disclaimers</h2>
            <p>
              TryHardly is provided &quot;as is&quot; during early access. We do not guarantee that work
              posted or performed will meet your expectations, and we do not vet every user.
              Use good judgment, especially for in-person work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, TryHardly is not liable for any indirect,
              incidental, special, or consequential damages arising from your use of the
              service or from disputes between users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">11. Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these Terms or our Community
              Guidelines. You may stop using the service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of California, United States,
              without regard to conflict-of-law rules. Disputes will be handled in the state
              or federal courts located in California, unless applicable local law requires
              otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">13. Changes to These Terms</h2>
            <p>
              We may update these Terms as the product evolves. We will update the date above
              when we do. Continued use after changes means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">14. Contact</h2>
            <p>
              Questions about these Terms? Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent-text hover:text-accent-text-hover">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
