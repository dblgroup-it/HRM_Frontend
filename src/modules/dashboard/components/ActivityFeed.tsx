import { CalendarDays, UserPlus, Wallet, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardBody } from '@shared/components/ui';
import { formatRelative } from '@shared/utils';

import type { ActivityItem } from '../types/dashboard.types';

const ICONS: Record<ActivityItem['type'], LucideIcon> = {
  leave: CalendarDays,
  hire: UserPlus,
  payroll: Wallet,
  attendance: Clock,
};

const TONES: Record<ActivityItem['type'], string> = {
  leave: 'bg-amber-50 text-amber-600',
  hire: 'bg-emerald-50 text-emerald-600',
  payroll: 'bg-brand-50 text-brand-600',
  attendance: 'bg-sky-50 text-sky-600',
};

export function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardBody>
        <ol className="space-y-4">
          {activity.map((item) => {
            const Icon = ICONS[item.type];
            return (
              <li key={item.id} className="flex gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[item.type]}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm text-slate-700">{item.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatRelative(item.timestamp)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
