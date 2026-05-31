import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, LifeBuoy, ShieldCheck, ScrollText, HelpCircle, MapPin } from 'lucide-react';

const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Get help with TryHardly. Email support@tryhardly.com for account, quest, payment, or safety questions. Early access support for our local services marketplace.',
  alternates: { canonical: '/support' },
};

const helpTopics = [
  {
    icon: HelpCircle,
    title: 'Getting started',
    body: 'New here? Browse open work on the quest board, or post what you need done in about a minute — no account required.',
    href: '/request-help',
    cta: 'Request help',
  },
  {
    icon: ScrollText,
    title: 'Policies',
    body: 'Read how refunds, disputes, and the marketplace rules work before you start.',
    href: '/refunds',
    cta: 'Refund & dispute policy',
  },
  {
    icon: ShieldCheck,
    title: 'Safety & conduct',
    body: 'Our community guidelines keep things fair and safe for clients and adventurers alike.',
    href: '/community-guidelines',
    cta: 'Community guidelines',
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 mb-6">
            <LifeBuoy size={28} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Support
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            We&apos;re a small team in early access and we read every message. Reach us by
            email and we&apos;ll help you get unstuck.
          </p>
        </div>

        {/* Primary contact */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mb-4">
            <Mail size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Email us</h2>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-xl font-semibold text-amber-400 hover:text-amber-300 break-all"
          >
            {SUPPORT_EMAIL}
          </a>
          <p className="text-sm text-gray-400 mt-3">
            We typically reply within one business day. To help us move faster, include your
            account email and, if it&apos;s about a quest, the quest title or link.
          </p>
        </div>

        {/* Help topics */}
        <div className="grid gap-5 sm:grid-cols-3 mb-12">
          {helpTopics.map(({ icon: Icon, title, body, href, cta }) => (
            <div
              key={title}
              className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 flex flex-col"
            >
              <Icon className="text-amber-400 mb-3" size={22} />
              <h3 className="text-lg font-semibold text-gray-100 mb-2">{title}</h3>
              <p className="text-sm text-gray-400 flex-1">{body}</p>
              <Link
                href={href}
                className="text-sm text-amber-400 hover:text-amber-300 mt-4 inline-block"
              >
                {cta} →
              </Link>
            </div>
          ))}
        </div>

        {/* Honest early-access section */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-8">
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <MapPin size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">Early access</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Where things stand</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                We&apos;re launching locally in <strong>Redding, CA</strong> first, with
                starter quests seeded so the board isn&apos;t empty on day one.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                You can post a job or sign up for work alerts right now without an account.
                We line up local help and follow up by email.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                Marketplace payments (with payouts on task completion, processed by a
                third-party payment provider) may be enabled when available. We&apos;ll tell you
                clearly when your account can use them.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                Accounts and quests are reviewed by our team to keep early access safe. Email
                verification and admin moderation are in place.
              </span>
            </li>
          </ul>
          <p className="text-sm text-gray-400 mt-6">
            Found a bug or have feedback? That&apos;s exactly what early access is for — email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-400 hover:text-amber-300">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
