'use client';

import { useRouter } from 'next/navigation';
import QuestDetailModal from '@/components/QuestDetailModal';

export default function QuestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  return (
    <QuestDetailModal
      questId={params.id}
      isOpen={true}
      onClose={() => router.push('/questboard')}
    />
  );
}
