import type { Metadata } from 'next';
import Link from 'next/link';

const LAST_UPDATED = 'June 9, 2026';
const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of TryHardly, a local services marketplace. Plain-language startup terms — not legal advice.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Terms of Service
        </h1>
        <div className="text-gray-300 space-y-6 leading-relaxed">
          <p className="text-sm text-gray-400">Last Updated: {LAST_UPDATED}</p>
          <p className="text-sm text-gray-400">
            These terms are written in plain language for an early-access startup and are not
            legal advice. By using TryHardly you agree to them, along with our{' '}
            <Link href="/privacy" className="text-amber-400 hover:text-amber-300">Privacy Policy</Link>,{' '}
            <Link href="/refunds" className="text-amber-400 hover:text-amber-300">Refund &amp; Dispute Policy</Link>, and{' '}
            <Link href="/community-guidelines" className="text-amber-400 hover:text-amber-300">Community Guidelines</Link>.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TryHardly, you agree to be bound by these Terms. If you do
              not agree, please do not use the service. You must be at least 18 years old to
              use TryHardly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">2. What TryHardly Is</h2>
            <p>
              TryHardly is a marketplace that connects people who need local help (clients, or
              &quot;quest posters&quot;) with people who can do the work (adventurers). We provide the
              platform that helps you find each other and coordinate work. We do not employ
              adventurers, and we are not a party to the agreements made between users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">3. Accounts</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are responsible for keeping your login credentials secure.</li>
              <li>Provide accurate information and keep it up to date.</li>
              <li>You may also use certain features (such as posting a help request) without an account; those submissions are still governed by these Terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">4. Payments, Fees &amp; Payouts</h2>
            <p className="mb-2">
              Payments on TryHardly are processed by{' '}
              <span className="text-white font-semibold">Stripe</span>, and worker payouts are handled through{' '}
              <span className="text-white font-semibold">Stripe Connect</span> after completed-task payment capture.
              TryHardly is a marketplace facilitator: we facilitate payments between clients
              and adventurers but we are not the service provider. TryHardly is not a bank or
              money transmitter and does not provide regulated financial services. All payments
              are processed directly by Stripe.
            </p>
            <p className="mb-2">
              At booking, TryHardly may obtain a payment authorization for the quoted amount. A
              payment authorization is not a completed charge and may appear as a temporary
              pending transaction on your statement. TryHardly captures payment when a task is
              completed or deemed completed under the platform&rsquo;s confirmation rules. If a
              booking is canceled or does not proceed, TryHardly may void or cancel the
              authorization, and you are not charged. Worker payouts are initiated after
              payment capture for completed tasks through Stripe Connect.
            </p>
            <p>
              Posting a job is free for clients. TryHardly charges workers a flat 12% platform
              service fee on completed paid jobs. The fee does not change with rank, and
              applicable fees are shown before you commit to a transaction. Refunds and
              disputes are handled under our{' '}
              <Link href="/refunds" className="text-amber-400 hover:text-amber-300">Refund &amp; Dispute Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">5. Your Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Quest posters must describe work accurately and pay for work delivered as agreed.</li>
              <li>Adventurers must deliver work that matches what was agreed.</li>
              <li>Both parties must follow our <Link href="/community-guidelines" className="text-amber-400 hover:text-amber-300">Community Guidelines</Link> and all applicable laws, licenses, and local regulations.</li>
              <li>You are responsible for your own taxes and any required insurance or permits.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">6. Prohibited Conduct</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Post fraudulent, misleading, or illegal quests.</li>
              <li>Offer or request prohibited services, including anything illegal, unlicensed work that requires a license, weapons, regulated substances, adult services, or work that endangers safety. See our <Link href="/prohibited-services" className="text-amber-400 hover:text-amber-300">Prohibited Services Policy</Link> for details.</li>
              <li>Harass, threaten, or discriminate against other users.</li>
              <li>Circumvent platform payments or fees, or arrange payment off-platform to avoid the service fee, after connecting through TryHardly.</li>
              <li>Scrape, attack, or interfere with the platform or other users&apos; accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">7. Intellectual Property</h2>
            <p>
              Unless a quest agreement says otherwise, work products created through TryHardly
              belong to the quest poster upon full payment for that work. The TryHardly name,
              brand, and platform remain our property.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">8. Disclaimers</h2>
            <p>
              TryHardly is provided &quot;as is&quot; during early access. We do not guarantee that work
              posted or performed will meet your expectations, and we do not vet every user.
              Use good judgment, especially for in-person work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, TryHardly is not liable for any indirect,
              incidental, special, or consequential damages arising from your use of the
              service or from disputes between users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">10. Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these Terms or our Community
              Guidelines. You may stop using the service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of California, United States,
              without regard to conflict-of-law rules. Disputes will be handled in the state
              or federal courts located in California, unless applicable local law requires
              otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">12. Changes to These Terms</h2>
            <p>
              We may update these Terms as the product evolves. We will update the date above
              when we do. Continued use after changes means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">13. Contact</h2>
            <p>
              Questions about these Terms? Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-400 hover:text-amber-300">
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
