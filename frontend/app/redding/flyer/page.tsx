import type { Metadata } from 'next';
import Link from 'next/link';
import { Printer, ArrowRight } from 'lucide-react';
import { routes } from '../config';

export const metadata: Metadata = {
  title: 'Redding launch flyers',
  description: 'Printable flyers for the TryHardly launch in Redding, CA.',
  alternates: { canonical: '/redding/flyer' },
  robots: { index: false, follow: false },
};

const flyers = [
  {
    href: routes.flyerRequestHelp,
    title: 'Need help — requester flyer',
    desc: 'For people who want to post a local job (yard work, hauling, moving, cleaning, handyman, errands).',
  },
  {
    href: routes.flyerWorkers,
    title: 'Find work — worker flyer',
    desc: 'For people looking for local work who want job alerts and a profile.',
  },
];

export default function ReddingFlyerIndex() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/redding"
          className="text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300"
        >
          ← Back to Redding launch
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Printable flyers</h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          One-page, high-contrast flyers with a QR code and short link. Open one, then hit
          <span className="font-semibold text-zinc-200"> Print this flyer</span> (or Ctrl/Cmd + P).
        </p>

        <div className="mt-8 grid gap-4">
          {flyers.map(({ href, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6 transition-colors hover:border-amber-500/50 hover:bg-zinc-900/70"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Printer className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2 font-semibold text-zinc-100">
                  {title}
                  <ArrowRight className="h-4 w-4 text-amber-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="mt-1 block text-sm text-zinc-400">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
