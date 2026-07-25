import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse local paid jobs — Job board',
  description: 'Browse local paid jobs posted by neighbors: yard work, hauling, moving help, handyman jobs, cleaning, and errands. Open a job to see the details and send the poster your bid.',
};

export default function QuestboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
