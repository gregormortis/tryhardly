import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find paid local work — Quest board',
  description: 'Browse local paid jobs near you. Lawn, moving, handyman, cleaning, errands, and more — claim work in minutes.',
};

export default function QuestboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
