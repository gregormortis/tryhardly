'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      // Silent: notifications are non-critical chrome.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && !notifications.length) await fetchNotifications();
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-body transition-colors hover:bg-raised"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[12px] font-bold text-on-accent">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold text-strong">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-accent-text hover:text-accent-text-hover">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-subtle">Loading...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-subtle">No notifications yet.</div>
            )}
            {!loading && notifications.map((n) => (
              <div
                key={n.id}
                className={`border-b border-line/60 px-4 py-3 last:border-b-0 ${n.read ? '' : 'bg-accent/5'}`}
              >
                <p className="text-sm font-medium text-strong">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                <p className="mt-1 text-[12px] text-subtle">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
