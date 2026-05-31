'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TradeStandard } from '@/lib/tradeStandards';

interface SectionDef {
  key: keyof Pick<
    TradeStandard,
    'goodWork' | 'document' | 'clarify' | 'completionProof' | 'safety'
  >;
  title: string;
  hint: string;
}

const SECTIONS: SectionDef[] = [
  { key: 'goodWork', title: 'What good work includes', hint: 'The bar for a job well done.' },
  { key: 'document', title: 'What to document', hint: 'Notes and photos that build trust.' },
  { key: 'clarify', title: 'What clients should clarify', hint: 'Settle these before work starts.' },
  { key: 'completionProof', title: 'Completion proof', hint: 'How to show the job is done.' },
  { key: 'safety', title: 'Safety & property respect', hint: 'Protect people and the property.' },
];

interface Props {
  standard: TradeStandard;
  // When true the panel starts collapsed (used inline on quest detail pages).
  defaultCollapsed?: boolean;
  // Show the "general guide" note when the standard is a fallback.
  showLink?: boolean;
}

export default function TradeStandardChecklist({
  standard,
  defaultCollapsed = false,
  showLink = true,
}: Props) {
  const [open, setOpen] = useState(!defaultCollapsed);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-6 text-left"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400 mb-1">
            Trade standard
          </p>
          <h2 className="text-lg font-semibold text-white">
            Suggested checklist · {standard.label}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            A practical guide for this type of work — not a requirement to apply.
          </p>
        </div>
        <span
          className={`text-gray-400 text-xl transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-5">
          {SECTIONS.map(({ key, title, hint }) => (
            <div key={key}>
              <h3 className="text-sm font-semibold text-amber-200">{title}</h3>
              <p className="text-xs text-gray-500 mb-2">{hint}</p>
              <ul className="space-y-1.5">
                {standard[key].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {showLink && (
            <p className="text-xs text-gray-500 pt-1">
              See all{' '}
              <Link href={`/standards/${standard.slug}`} className="text-amber-400 hover:underline">
                {standard.label} standards
              </Link>{' '}
              or browse the full{' '}
              <Link href="/standards" className="text-amber-400 hover:underline">
                work standards
              </Link>
              . These are practical guidelines, not legal advice or a guarantee.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
