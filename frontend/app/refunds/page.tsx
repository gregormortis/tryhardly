import type { Metadata } from 'next';
import Link from 'next/link';

const LAST_UPDATED = 'May 30, 2026';
const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Refund & Dispute Policy',
  description:
    'How refunds, cancellations, and disputes work on TryHardly. Honest, plain-language policy for our local services marketplace.',
  alternates: { canonical: '/refunds' },
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Refund &amp; Dispute Policy
        </h1>
        <div className="text-gray-300 space-y-6 leading-relaxed">
          <p className="text-sm text-gray-400">Last Updated: {LAST_UPDATED}</p>

          <p className="text-sm text-gray-400">
            This is a plain-language summary of how we handle money, cancellations, and
            disagreements. It is not legal advice. Where it conflicts with our{' '}
            <Link href="/terms" className="text-amber-400 hover:text-amber-300">
              Terms of Service
            </Link>
            , the Terms control.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">1. How payments work today</h2>
            <p>
              TryHardly is a marketplace that connects people who need local help (clients)
              with people who can do the work (adventurers). During early access, some
              arrangements are made directly between the two parties. Marketplace payment
              features, when enabled, are processed by third-party payment providers, with
              payouts on task completion. TryHardly is not a bank or money transmitter and
              does not provide regulated financial services. We will never claim a payment
              feature is live before it is.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">2. Cancellations before work starts</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>A client may cancel a quest before an adventurer begins work for a full refund of any amount already paid.</li>
              <li>An adventurer may withdraw before starting at no penalty.</li>
              <li>If no funds were collected, cancelling simply closes the quest.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">3. Refunds after work has started</h2>
            <p className="mb-2">
              Once work is underway, refunds are handled case by case based on what was
              actually delivered:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>If the work was not delivered or does not match what was agreed, the client may request a full or partial refund.</li>
              <li>If the work was delivered as agreed, the adventurer is entitled to payment for what was completed.</li>
              <li>Partial work generally means a partial refund proportional to what remains undone.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">4. Platform fees</h2>
            <p>
              When a refund is issued, any platform commission associated with the refunded
              amount is returned as well. Third-party payment processing fees, where they
              apply, may be non-refundable depending on the processor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">5. Filing a dispute</h2>
            <p className="mb-2">
              If a client and adventurer cannot agree, either party can open a dispute:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                Email{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-400 hover:text-amber-300">
                  {SUPPORT_EMAIL}
                </a>{' '}
                within 14 days of the disputed work, with the quest details and what went wrong.
              </li>
              <li>Include any photos, messages, or deliverables that show the agreed scope and the result.</li>
              <li>We review both sides and aim to respond within 5 business days.</li>
              <li>Our decision on any refund of amounts processed through the platform is final.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">6. Chargebacks</h2>
            <p>
              Please contact us before initiating a card chargeback — most issues are resolved
              faster directly. Fraudulent chargebacks may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">7. Jurisdiction</h2>
            <p>
              This policy is governed by the laws of [STATE/COUNTRY OF INCORPORATION].
              Consumer protection laws in your location may grant you additional rights that
              this policy does not limit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">8. Contact</h2>
            <p>
              Questions about refunds or a dispute? Email{' '}
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
