import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';

import { cn } from '@shared/lib';
import { formatRelative } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '../hooks/useNotifications';
import type { AppNotification } from '../types/notification.types';

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: notifications } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const onItem = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const latestNotifications = useMemo(() => {
    const list = [...(notifications ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return list.slice(0, 5);
  }, [notifications]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-20 mt-2 w-96 animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Notifications
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Showing the latest 5 updates
                </p>
              </div>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="scrollbar-thin max-h-[26rem] overflow-y-auto">
              {latestNotifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  You’re all caught up.
                </p>
              ) : (
                latestNotifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onItem(n)}
                    className={cn(
                      'flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50',
                      !n.read && 'bg-brand-50/40',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-transparent',
                        n.read ? 'bg-transparent' : 'bg-brand-500',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500">{n.message}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">
                {notifications && notifications.length > 5
                  ? `${notifications.length - 5} more items in the full inbox`
                  : 'Everything is visible here'}
              </p>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate(ROUTES.notifications);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100 hover:bg-brand-50"
              >
                See all
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
