'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-on-accent transition-colors hover:bg-accent"
    >
      <Printer className="h-4 w-4" /> Print this flyer
    </button>
  );
}
