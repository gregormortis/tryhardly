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
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="eyebrow mb-1">Messages</p>
        <h1 className="text-xl font-bold text-strong mb-1">Messages</h1>
        <p className="text-base text-subtle mb-6">Conversations about your local jobs.</p>

        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-danger text-base py-16">We couldn’t load your messages. Please try again.</div>
          ) : threads.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-base font-semibold text-strong">No conversations yet</p>
              <p className="text-base text-subtle mt-1">
                Messages start when you bid on a job or someone bids on yours.
              </p>
              <Link
                href="/jobs"
                className="btn-primary mt-5"
              >
                Browse local jobs
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {threads.map((t) => (
                <li key={`${t.questId}:${t.counterpartyId}`}>
                  <Link
                    href={`/messages/${t.questId}/${t.counterpartyId}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-raised transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-strong font-medium truncate">{t.questTitle}</p>
                        {t.unread && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-subtle truncate">{t.lastMessage}</p>
                    </div>
                    <span className="text-sm text-subtle flex-shrink-0">
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
