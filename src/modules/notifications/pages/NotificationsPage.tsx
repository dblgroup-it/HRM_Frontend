import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from '@shared/components/ui';
import { formatRelative } from '@shared/utils';

import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '../hooks/useNotifications';
import type { AppNotification } from '../types/notification.types';

type FilterKey = 'all' | 'unread' | 'read';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const [filter, setFilter] = useState<FilterKey>('all');

  const ordered = useMemo(() => {
    return [...(notifications ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') return ordered.filter((n) => !n.read);
    if (filter === 'read') return ordered.filter((n) => n.read);
    return ordered;
  }, [filter, ordered]);

  const openNotification = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const total = ordered.length;
  const readCount = Math.max(total - unread, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="All alerts, approvals and system updates in one place."
        actions={
          <Button
            variant="outline"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => markAllRead.mutate()}
            disabled={unread === 0}
          >
            Mark all read
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={total} icon={Bell} accent="brand" />
        <StatCard label="Unread" value={unread} icon={Inbox} accent="amber" />
        <StatCard label="Read" value={readCount} icon={CheckCheck} accent="emerald" />
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-medium text-slate-900">Inbox</h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse the latest activity or focus only on unread items.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={
                  item.key === filter
                    ? 'rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm'
                    : 'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900'
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visibleNotifications.length === 0 ? (
          <EmptyState
            title={
              filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'
            }
            description={
              filter === 'unread'
                ? 'Everything has already been reviewed.'
                : 'New alerts and approvals will show up here.'
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleNotifications.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <span
                  className={
                    n.read
                      ? 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200'
                      : 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500'
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge tone={n.read ? 'neutral' : 'brand'}>
                      {n.read ? 'Read' : 'Unread'}
                    </Badge>
                    {n.link && <Badge tone="info">Openable</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
