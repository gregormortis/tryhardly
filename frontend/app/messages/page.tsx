'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Thread {
  questId: string;
  questTitle: string;
  counterpartyId: string;
  lastMessage: string;
  lastAt: string;
  unread: boolean;
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get<Thread[]>('/messages/threads');
        if (!cancelled) setThreads(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load conversations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Messages</h1>
        <p className="text-sm text-gray-500 mb-6">Your quest conversations.</p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-red-400 text-sm py-16">{error}</div>
          ) : threads.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-gray-300 font-medium">No conversations yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Messages start when you apply to a quest or someone applies to yours.
              </p>
              <Link
                href="/questboard"
                className="inline-block mt-5 text-amber-400 hover:text-amber-300 text-sm font-medium"
              >
                Browse the questboard →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {threads.map((t) => (
                <li key={`${t.questId}:${t.counterpartyId}`}>
                  <Link
                    href={`/messages/${t.questId}/${t.counterpartyId}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">{t.questTitle}</p>
                        {t.unread && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{t.lastMessage}</p>
                    </div>
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      {new Date(t.lastAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
