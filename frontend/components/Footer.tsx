import Link from "next/link";

// The footer used to carry 23 links across four columns, including several
// pages that only make sense once you are already a worker (Code of Craft,
// Verified Pro, Trade standards) and two competing versions of the same funnel
// (post-job-fast, request-help, service-packages). Those pages still exist and
// are linked from where they are relevant — /trust and /how-it-works — but on a
// site-wide footer they read as the main thing TryHardly is about, which buried
// the two things a visitor is actually here to do.

const columns: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Get started",
    links: [
      { href: "/post-a-job", label: "Post a job free" },
      { href: "/jobs", label: "Browse local jobs" },
      { href: "/work-alerts", label: "Get work alerts by email" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/redding", label: "TryHardly in Redding" },
      { href: "/trust", label: "Trust & safety" },
      { href: "/faq", label: "Common questions" },
      { href: "/support", label: "Get help" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/refunds", label: "Refunds & disputes" },
      { href: "/community-guidelines", label: "Community guidelines" },
      { href: "/prohibited-services", label: "What is not allowed" },
      { href: "/account-deletion", label: "Delete your account" },
    ],
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="text-xl font-bold text-strong">
              Try<span className="text-accent-text">hardly</span>
            </Link>
            <p className="mt-4 text-base leading-relaxed text-body">
              Local work, hired directly. We introduce you to people nearby and
              keep the record of what was agreed. You pay each other.
            </p>
            <p className="mt-4 text-base text-body">
              <a
                href="mailto:support@tryhardly.com"
                className="font-semibold text-accent-text underline underline-offset-2 hover:text-accent-text-hover"
              >
                support@tryhardly.com
              </a>
            </p>
          </div>

          {columns.map(({ heading, links }) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="mb-4 text-base font-bold text-strong">{heading}</h2>
              <ul className="space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-base text-body underline-offset-4 transition-colors hover:text-accent-text hover:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 space-y-2 border-t border-line pt-8 text-sm text-body">
          <p>
            TryHardly is a marketplace. We are not the service provider, we do
            not process payments, and we cannot refund or reverse money paid
            between a customer and a worker.
          </p>
          <p>&copy; {currentYear} TryHardly. Redding, California.</p>
        </div>
      </div>
    </footer>
  );
}
