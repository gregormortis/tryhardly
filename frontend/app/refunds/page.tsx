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
            <h2 className="text-2xl font-bold text-accent-text mb-4">1. How payment works</h2>
            <p>
              TryHardly connects people who need local help (job posters, or clients) with
              people who can do the work (workers).{' '}
              <span className="text-strong font-semibold">We are not the service provider and
              we do not process payments.</span> Payment for a job is agreed and settled
              directly between the job poster and the worker, by whatever method they choose.
              TryHardly is not a party to that payment and is not a bank, money transmitter,
              or payment processor.
            </p>
            <p className="mt-2">
              This has a direct consequence for refunds, and we would rather state it plainly
              here than have you discover it during a dispute:{' '}
              <span className="text-strong font-semibold">TryHardly cannot issue a refund,
              reverse a payment, or recover money on your behalf.</span> We never receive the
              money, so there is nothing for us to return. Posting a job and bidding on jobs
              are both free, and TryHardly currently charges no fees of any kind.
            </p>
            <p className="mt-2">
              Before work begins, agree the amount and the payment method with the other party
              and keep that agreement in TryHardly messages. On larger jobs, consider paying
              in a way that leaves a record, and consider splitting payment so that part of it
              follows completion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">2. Cancellations</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>A job poster may cancel before the worker begins work. Because no payment is taken by TryHardly, canceling simply closes the job listing.</li>
              <li>A worker may withdraw before starting at no penalty.</li>
              <li>Repeated last-minute cancellations by either side are recorded and may result in removal from the platform.</li>
              <li>If money has already changed hands between the poster and the worker, any return of it is a matter between those two parties. TryHardly cannot reverse it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">3. Refunds after work has started</h2>
            <p className="mb-2">
              Once work is underway, refunds are handled case by case based on what was
              actually delivered:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>If the work was not delivered or does not match what was agreed, the job poster should raise it with the worker first, in TryHardly messages so there is a record.</li>
              <li>If the work was delivered as agreed, the worker is owed the agreed amount.</li>
              <li>Partial work generally warrants partial payment, proportional to what was completed.</li>
              <li>TryHardly cannot enforce any of this or move money, but the outcome is recorded against both accounts and is visible to future counterparties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">4. Platform fees</h2>
            <p>
              There are none. Posting a job, creating a worker account, and bidding are all
              free, and TryHardly takes no commission on any job. Because we charge nothing
              and receive nothing, there is no TryHardly fee to refund.
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
              <li>We record the outcome against both accounts. We cannot order or issue a refund, because we never held the money — but a pattern of reports leads to removal from the platform.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">6. What we can and cannot do</h2>
            <p className="mb-2">
              <span className="text-strong font-semibold">We cannot</span> refund you, reverse
              a payment, recover money, hold money pending a decision, or compel either party
              to pay. We are not in the payment chain at any point.
            </p>
            <p>
              <span className="text-strong font-semibold">We can</span> review the messages
              and photos attached to a job, record the outcome on both accounts so it is
              visible to everyone they deal with afterward, remove accounts with a pattern of
              complaints, and give you a copy of the job record if you pursue the matter
              yourself. If you paid by a method with its own protections, such as a card or
              certain payment apps, raise the dispute with that provider directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">7. Our role &amp; jurisdiction</h2>
            <p>
              TryHardly is a US-based marketplace and intermediary. We are not the service
              provider and are not a party to the work agreement or the payment between job
              posters and workers; our role is to connect the two and keep the record of what
              happened. This policy is governed by the laws of the State of California, United
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
