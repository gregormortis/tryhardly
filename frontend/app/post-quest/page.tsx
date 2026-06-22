'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import PostQuestForm from '@/components/PostQuestForm';

export default function PostQuestPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirect=/post-quest');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-300">
            {loading ? 'Loading…' : 'Sign in to post a job — taking you there…'}
          </p>
        </div>
      </div>
    );
  }

  return <PostQuestForm currentUserId={user.id} />;
}
