'use client';

import { useAuth } from '../../lib/auth';
import PostQuestForm from '@/components/PostQuestForm';

// Posting is free and the whole wizard is open to logged-out visitors — the form
// asks for an account only at the final publish step, and keeps the draft across
// that round trip. Sending people to a login wall first hid the form from every
// first-time visitor.
export default function PostQuestPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body">Loading…</p>
        </div>
      </div>
    );
  }

  return <PostQuestForm currentUserId={user?.id ?? null} />;
}
