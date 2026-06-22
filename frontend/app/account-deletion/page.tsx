import type { Metadata } from 'next';
import Link from 'next/link';
import AccountDeletionRequest from '@/components/AccountDeletionRequest';

const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Account & Data Deletion',
  description:
    'How to delete your TryHardly account and personal data. Request deletion from the app or web, or by email.',
  alternates: { canonical: '/account-deletion' },
};

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Delete Your Account &amp; Data
        </h1>

        <div className="text-gray-300 space-y-6 leading-relaxed">
          <p>
            You can ask us to delete your TryHardly account and the personal data associated with
            it at any time. This page explains what gets deleted, what may be retained, and how to
            make the request.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-3">How to request deletion</h2>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>
                <span className="text-gray-100 font-medium">In the app or on the web (recommended):</span> sign
                in, then use the button below or the &ldquo;Delete account&rdquo; option in your{' '}
                <Link href="/profile" className="text-amber-400 hover:text-amber-300">profile settings</Link>.
                Your request is logged immediately and queued for our team to review — this is the most reliable
                way to reach us.
              </li>
              <li>
                <span className="text-gray-100 font-medium">By email:</span> you can also write to{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-400 hover:text-amber-300">
                  {SUPPORT_EMAIL}
                </a>{' '}
                from the email address on your account. If you don&apos;t hear back, please use the in-app request
                above so your request is recorded in our system.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-3">What gets deleted</h2>
            <p className="mb-2">When your request is processed, we remove or anonymize:</p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>Your profile (name, username, bio, avatar, location/service area)</li>
              <li>Your contact details (email, phone)</li>
              <li>Account credentials and login information</li>
              <li>Messages and other content you posted, where removal doesn&apos;t break another user&apos;s records</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-3">What may be retained</h2>
            <p>
              Some records may be kept where the law requires it or to protect other users — for
              example, transaction and payout records needed for tax, accounting, fraud-prevention,
              and dispute purposes. Payment processing is handled by our payment provider; their
              retention is governed by their own policies. Retained records are limited to what is
              necessary and are not used to re-create your profile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-3">How long it takes</h2>
            <p>
              When you submit the in-app request, it&apos;s recorded right away and shown as
              &ldquo;Request received&rdquo; — there&apos;s nothing else you need to do. We aim to process
              deletion requests within 30 days and will notify you at your account email once it&apos;s
              complete. See our{' '}
              <Link href="/privacy" className="text-amber-400 hover:text-amber-300">Privacy Policy</Link>{' '}
              for more on how we handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-3">Request deletion now</h2>
            <AccountDeletionRequest />
          </section>
        </div>
      </div>
    </div>
  );
}
