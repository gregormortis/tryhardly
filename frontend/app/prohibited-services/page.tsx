import type { Metadata } from 'next';
import Link from 'next/link';

const LAST_UPDATED = 'June 11, 2026';
const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Prohibited Services Policy',
  description:
    'What you can and cannot offer or request on TryHardly. We support everyday local task-based work and prohibit services that are illegal, unsafe, regulated, deceptive, or restricted by our payment partners.',
  alternates: { canonical: '/prohibited-services' },
};

export default function ProhibitedServicesPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Prohibited Services Policy
        </h1>
        <div className="text-gray-300 space-y-6 leading-relaxed">
          <p className="text-sm text-gray-400">Last Updated: {LAST_UPDATED}</p>

          <p>
            TryHardly is a marketplace for everyday local help — the kind of task-based work
            neighbors hire each other for. To keep the community safe and to stay within the
            rules of our payment partners, some services are not allowed. This page explains, in
            plain language, what you can offer or request and what you can&apos;t. It works
            alongside our{' '}
            <Link href="/terms" className="text-amber-400 hover:text-amber-300">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/community-guidelines" className="text-amber-400 hover:text-amber-300">Community Guidelines</Link>.
          </p>

          <p>
            We may remove any listing, decline a transaction, or restrict an account when work
            appears to be illegal, unsafe, regulated, deceptive, high-risk, or restricted by the
            payment providers we rely on to move money. When we&apos;re unsure, we err on the side
            of caution to protect everyone involved.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">What&apos;s welcome on TryHardly</h2>
            <p className="mb-2">
              Most ordinary local tasks are exactly what TryHardly is for, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Yard work, gardening, and seasonal cleanup</li>
              <li>Hauling, junk removal, and moving help</li>
              <li>Home and office cleaning</li>
              <li>Basic handyman tasks and small repairs</li>
              <li>Errands, pickups, deliveries, and help tasks</li>
              <li>Assembly, organizing, and general odd jobs</li>
            </ul>
            <p className="mt-3">
              All work is welcome only when it follows the law, is performed safely, and is done by
              someone with any license, permit, or insurance that the work legally requires. If a
              task in your area needs a licensed professional, hire one.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Services we don&apos;t allow</h2>
            <p className="mb-4">
              You may not offer, request, or arrange any of the following on TryHardly:
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Illegal services</h3>
            <p className="mb-4">
              Anything that breaks federal, state, or local law, or that helps someone else break
              the law.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Adult or sexual services</h3>
            <p className="mb-4">
              Escort or companionship-for-pay arrangements, sexual services, adult entertainment,
              or sexually explicit content of any kind.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Gambling, betting, and wagering</h3>
            <p className="mb-4">
              Running, staffing, or facilitating gambling, betting pools, sports wagering, lotteries,
              raffles, or games of chance played for money.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Weapons, firearms, explosives, and dangerous materials</h3>
            <p className="mb-4">
              Buying, selling, transporting, building, or modifying firearms, ammunition, explosives,
              fireworks, or other hazardous or dangerous materials.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Drugs, cannabis, CBD, tobacco, and vape</h3>
            <p className="mb-4">
              Illegal drugs or paraphernalia, and the sale, delivery, or distribution of cannabis,
              CBD, tobacco, nicotine, or vaping products — even where some of these are legal locally,
              because they are restricted by our payment partners.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Financial services and money handling</h3>
            <p className="mb-4">
              Loans, credit repair, debt relief or collection, check cashing, money transfer,
              cryptocurrency or digital-asset services, gift cards, prepaid or stored-value products,
              and similar money-related services.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Medical and healthcare services requiring licensure</h3>
            <p className="mb-4">
              Medical, dental, nursing, mental-health, or other healthcare services, treatments, or
              advice that legally require a licensed professional.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Legal services requiring attorney licensure</h3>
            <p className="mb-4">
              Legal advice, representation, or document preparation that legally requires a licensed
              attorney.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Government, identity, and document services</h3>
            <p className="mb-4">
              Passport, visa, immigration, DMV, voter, or other government or identity-document
              services, and anything involving the creation or alteration of identification documents.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Travel booking, freight forwarding, and shipping broker services</h3>
            <p className="mb-4">
              Acting as a travel agency, tour operator, freight forwarder, or shipping or customs
              broker, or reselling travel or transportation on others&apos; behalf.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Intellectual property infringement</h3>
            <p className="mb-4">
              Counterfeiting, piracy, or any work that copies or distributes content, brands, or
              software in violation of someone else&apos;s intellectual property rights.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Deceptive, fraudulent, or abusive work</h3>
            <p className="mb-4">
              Scams, fake reviews, impersonation, phishing, harassment, or any task designed to
              deceive, defraud, or harm another person.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Unsafe work requiring licenses, permits, or insurance</h3>
            <p className="mb-4">
              Work that legally requires a license, permit, certification, or insurance you don&apos;t
              have — for example, certain electrical, plumbing, gas, roofing, tree-felling, or other
              high-risk jobs. Hire a qualified, licensed professional for work like this.
            </p>

            <h3 className="text-lg font-semibold text-white mb-1">Off-platform payment or circumvention</h3>
            <p className="mb-4">
              Arranging payment outside TryHardly to avoid fees or oversight after connecting through
              the platform, or otherwise circumventing how the marketplace is meant to work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">How we enforce this policy</h2>
            <p>
              This list isn&apos;t exhaustive — if a service is illegal, unsafe, deceptive, or
              restricted by our payment partners, it isn&apos;t allowed even if it isn&apos;t named
              above. We may remove listings, decline transactions, warn users, or suspend accounts
              for violations, and we may notify law enforcement when there is a risk to someone&apos;s
              safety.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Questions or reports</h2>
            <p>
              Not sure whether a task is allowed, or want to report something? Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-400 hover:text-amber-300">
                {SUPPORT_EMAIL}
              </a>
              {' '}or use the in-app report option. When in doubt, ask before you post.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
