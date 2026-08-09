import type { Metadata } from 'next';
import Link from 'next/link';

const LAST_UPDATED = 'June 9, 2026';
const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Refund & Dispute Policy',
  description:
    'How refunds, cancellations, and disputes work on TryHardly. Honest, plain-language policy for our local services marketplace.',
  alternates: { canonical: '/refunds' },
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-canvas py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-strong">
          Refund &amp; Dispute Policy
        </h1>
        <div className="text-body space-y-6 leading-relaxed">
          <p className="text-sm text-muted">Last Updated: {LAST_UPDATED}</p>

          <p className="text-sm text-muted">
            This is a plain-language summary of how we handle money, cancellations, and
            disagreements. It is not legal advice. Where it conflicts with our{' '}
            <Link href="/terms" className="text-accent-text hover:text-accent-text-hover">
              Terms of Service
            </Link>
            , the Terms control.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">1. How payments work</h2>
            <p>
              TryHardly is a marketplace that connects people who need local help (job posters,
              or clients) with people who can do the work (workers). We are a marketplace facilitator —{' '}
              <span className="text-strong font-semibold">we are not the service provider</span>, and we are not a
              bank or money transmitter. All payments are processed directly by{' '}
              <span className="text-strong font-semibold">Stripe</span>, and worker payouts are handled through{' '}
              <span className="text-strong font-semibold">Stripe Connect</span> after completed-job payment
              capture. Posting a job is free; TryHardly charges workers a flat 12% platform
              service fee on completed paid jobs. TryHardly does not provide regulated financial
              services.
            </p>
            <p className="mt-2">
              When a job poster selects a worker, TryHardly may obtain a payment authorization
              for the quoted amount. A payment authorization is not a completed charge and may
              appear as a temporary pending transaction on your statement. TryHardly captures
              payment when the job is confirmed completed, or is deemed completed under the
              platform&rsquo;s confirmation rules. If a job is canceled or does not proceed,
              TryHardly may void or cancel the authorization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">2. Cancellations before work starts</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>A job poster may cancel before the worker begins work; if a payment authorization was obtained, it is voided or canceled and the job poster is not charged.</li>
              <li>A worker may withdraw before starting at no penalty.</li>
              <li>If no payment authorization was obtained, canceling simply closes the job listing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">3. Refunds after work has started</h2>
            <p className="mb-2">
              Once work is underway, refunds are handled case by case based on what was
              actually delivered:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>If the work was not delivered or does not match what was agreed, the job poster may request a full or partial refund.</li>
              <li>If the work was delivered as agreed, the worker is entitled to payment for what was completed.</li>
              <li>Partial work generally means a partial refund proportional to what remains undone.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">4. Platform &amp; processing fees</h2>
            <p>
              When a refund is issued, the TryHardly platform service fee associated with the
              refunded amount is returned as well. Stripe payment-processing fees, where they
              apply, may be non-refundable in line with Stripe&apos;s standard practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">5. Filing a dispute</h2>
            <p className="mb-2">
              If a job poster and worker cannot agree, either party can open a dispute:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                Email{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent-text hover:text-accent-text-hover">
                  {SUPPORT_EMAIL}
                </a>{' '}
                within 14 days of the disputed work, with the job details and what went wrong.
              </li>
              <li>Include any photos, messages, or deliverables that show the agreed scope and the result.</li>
              <li>We review both sides and aim to respond within 5 business days.</li>
              <li>Our decision on any refund of amounts processed through the platform is final.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">6. Chargebacks &amp; card disputes</h2>
            <p>
              Card payments are processed by Stripe. If you dispute a charge with your bank or
              card issuer, that dispute is handled through Stripe&apos;s standard process, and we
              may submit evidence such as messages, photos, the agreed scope, and proof of
              completed work on the relevant party&apos;s behalf. Please contact us before
              initiating a chargeback — most issues are resolved faster directly, and as an
              intermediary we are well placed to help. Fraudulent or abusive chargebacks may
              result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">7. Our role &amp; jurisdiction</h2>
            <p>
              TryHardly is a US-based marketplace and intermediary. We are not the service
              provider and are not a party to the work agreement between job posters and
              workers; our role is to connect the two and to facilitate payments through
              Stripe. This policy is governed by the laws of the State of California, United
              States. Consumer-protection laws in your state may grant you additional rights
              that this policy does not limit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">8. Contact</h2>
            <p>
              Questions about refunds or a dispute? Email{' '}
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
