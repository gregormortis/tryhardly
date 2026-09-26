import type { Metadata } from 'next';
import QuestboardClient from './QuestboardClient';

// The board previously inherited the homepage's title tag, so Google saw two
// different pages with the same title. This gives /jobs its own title and
// description targeting local job-intent queries ("yard work jobs redding").
export const metadata: Metadata = {
  title: 'Open gig jobs in Redding, CA — yard work, hauling, cleaning',
  description:
    'Browse open local jobs in Redding, California: yard work, hauling, moving help, handyman, cleaning and errands. Bid your price; workers keep 100%.',
  alternates: { canonical: '/jobs' },
};

export default function JobsPage() {
  return <QuestboardClient />;
}
