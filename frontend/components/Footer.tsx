import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900 text-zinc-400">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="text-lg font-bold text-zinc-100">
              Try<span className="text-amber-400">hardly</span>
            </Link>
            <p className="text-sm">
              The marketplace AI can&apos;t touch. Real work. Real money. Real
              local.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-zinc-100">Marketplace</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/questboard"
                  className="transition-colors hover:text-zinc-100"
                >
                  Browse jobs
                </Link>
              </li>
              <li>
                <Link
                  href="/post-quest"
                  className="transition-colors hover:text-zinc-100"
                >
                  Post a job
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="transition-colors hover:text-zinc-100"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-zinc-100">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/faq"
                  className="transition-colors hover:text-zinc-100"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-zinc-100"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-zinc-100"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-zinc-100">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-zinc-100"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-zinc-100"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-sm">
          <p>&copy; {currentYear} Tryhardly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
