import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface text-muted">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="text-lg font-bold text-strong">
              Try<span className="text-accent-text">hardly</span>
            </Link>
            <p className="text-sm">
              The marketplace AI can&apos;t touch. Real work. Real money. Real
              local.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-strong">Marketplace</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/jobs"
                  className="transition-colors hover:text-strong"
                >
                  Browse jobs
                </Link>
              </li>
              <li>
                <Link
                  href="/post-a-job"
                  className="transition-colors hover:text-strong"
                >
                  Post a job
                </Link>
              </li>
              <li>
                <Link
                  href="/post-job-fast"
                  className="transition-colors hover:text-strong"
                >
                  Post your job in 60 seconds
                </Link>
              </li>
              <li>
                <Link
                  href="/find-work-fast"
                  className="transition-colors hover:text-strong"
                >
                  Find local work
                </Link>
              </li>
              <li>
                <Link
                  href="/service-packages"
                  className="transition-colors hover:text-strong"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="/request-help"
                  className="transition-colors hover:text-strong"
                >
                  Request help (no account)
                </Link>
              </li>
              <li>
                <Link
                  href="/work-alerts"
                  className="transition-colors hover:text-strong"
                >
                  Get work alerts
                </Link>
              </li>
              <li>
                <Link
                  href="/redding"
                  className="transition-colors hover:text-strong"
                >
                  Redding launch
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="transition-colors hover:text-strong"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* The ratings & badges page and Leaderboards are intentionally not linked
              here. They are worker-reputation pages, and on the site-wide footer
              they read as the main thing TryHardly is about. Both routes still
              exist and stay linked from pricing, trade standards, and the code of
              craft, where a worker is already reading about how ranking works. */}
          <div>
            <h3 className="mb-4 font-semibold text-strong">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/code-of-craft"
                  className="transition-colors hover:text-strong"
                >
                  Code of Craft
                </Link>
              </li>
              <li>
                <Link
                  href="/verified-pro"
                  className="transition-colors hover:text-strong"
                >
                  Verified Pro
                </Link>
              </li>
              <li>
                <Link
                  href="/standards"
                  className="transition-colors hover:text-strong"
                >
                  Trade standards
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="transition-colors hover:text-strong"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-strong"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-strong"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="transition-colors hover:text-strong"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-strong">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-strong"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-strong"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/refunds"
                  className="transition-colors hover:text-strong"
                >
                  Refunds &amp; Disputes
                </Link>
              </li>
              <li>
                <Link
                  href="/trust"
                  className="transition-colors hover:text-strong"
                >
                  Trust &amp; Safety
                </Link>
              </li>
              <li>
                <Link
                  href="/community-guidelines"
                  className="transition-colors hover:text-strong"
                >
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link
                  href="/prohibited-services"
                  className="transition-colors hover:text-strong"
                >
                  Prohibited Services
                </Link>
              </li>
              <li>
                <Link
                  href="/account-deletion"
                  className="transition-colors hover:text-strong"
                >
                  Delete Account &amp; Data
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-8 text-center text-sm">
          <p>&copy; {currentYear} Tryhardly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
