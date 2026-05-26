'use client';

import AdventurerProfile from '@/components/AdventurerProfile';

export default function ProfilePage({ params }: { params: { id: string } }) {
  return <AdventurerProfile userId={params.id} />;
}
