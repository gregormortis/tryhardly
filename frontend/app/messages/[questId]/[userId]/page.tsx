'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import ReportButton from '@/components/ReportButton';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; username: string; avatarUrl?: string };
}

export default function MessageThreadPage() {
  const params = useParams();
  const questId = params.questId as string;
  const otherId = params.userId as string;
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); setError('Please sign in to view messages.'); return; }
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, questId, otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchThread = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Message[]>(`/messages/quest/${questId}/with/${otherId}`);
      setMessages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/messages/quest/${questId}`, {
        recipientId: otherId,
        content,
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={`/questboard/${questId}`} className="text-gray-400 hover:text-amber-400 text-sm transition-colors flex items-center gap-2 mb-6">
          <span>←</span> Back to quest
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-[70vh]">
          <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-white">Messages</h1>
              <p className="text-xs text-gray-500">Quest conversation · text only</p>
            </div>
            <ReportButton targetType="USER" targetId={otherId} label="Report user" />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && error && (
              <div className="text-center text-red-400 text-sm pt-10">{error}</div>
            )}

            {!loading && !error && messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm pt-10">
                No messages yet. Say hello to get started.
              </div>
            )}

            {!loading && !error && messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-100'
                  }`}>
                    <p className="whitespace-pre-line break-words">{m.content}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-gray-800' : 'text-gray-500'}`}>
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {user && !error && (
            <form onSubmit={handleSend} className="border-t border-gray-800 p-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-semibold rounded-lg text-sm"
              >
                {sending ? '...' : 'Send'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
