import Link from 'next/link';
import { qrSvg } from '../../../lib/qr';
import PrintButton from './PrintButton';

export interface FlyerProps {
  eyebrow: string;
  headline: string;
  subhead: string;
  bullets: string[];
  qrUrl: string;
  shortUrl: string;
  callToAction: string;
  footnote: string;
  backHref: string;
}

export default function Flyer({
  eyebrow,
  headline,
  subhead,
  bullets,
  qrUrl,
  shortUrl,
  callToAction,
  footnote,
  backHref,
}: FlyerProps) {
  // High error correction so the printed code still scans if slightly smudged.
  const svg = qrSvg(qrUrl, { ecl: 'H', margin: 2, size: 600, dark: '#000000', light: '#ffffff' });

  return (
    <div className="flyer-screen min-h-screen bg-zinc-950 text-zinc-100">
      {/* Screen-only toolbar */}
      <div className="no-print mx-auto flex max-w-[8.5in] items-center justify-between px-6 py-5">
        <Link
          href={backHref}
          className="text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300"
        >
          ← Back to Redding launch
        </Link>
        <PrintButton />
      </div>

      {/* The printable sheet — 1 page, high contrast */}
      <div className="flyer-sheet">
        <div className="flyer-inner">
          <p className="flyer-eyebrow">{eyebrow}</p>
          <h1 className="flyer-headline">{headline}</h1>
          <p className="flyer-subhead">{subhead}</p>

          <ul className="flyer-bullets">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>

          <div className="flyer-qr-wrap">
            <div className="flyer-qr" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="flyer-qr-text">
              <p className="flyer-cta">{callToAction}</p>
              <p className="flyer-scan">Scan the code, or go to:</p>
              <p className="flyer-url">{shortUrl}</p>
            </div>
          </div>

          <p className="flyer-footnote">{footnote}</p>
          <p className="flyer-brand">
            Try<span>hardly</span> · Local work in Redding, CA
          </p>
        </div>
      </div>
    </div>
  );
}
