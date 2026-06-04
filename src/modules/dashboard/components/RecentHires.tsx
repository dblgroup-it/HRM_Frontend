import { Card, CardHeader, CardTitle, CardBody, Avatar } from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import type { RecentHire } from '../types/dashboard.types';

export function RecentHires({ hires }: { hires: RecentHire[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Hires</CardTitle>
      </CardHeader>
      <CardBody className="space-y-1">
        {hires.map((hire) => (
          <div
            key={hire.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
          >
            <Avatar name={hire.name} src={hire.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {hire.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {hire.jobTitle} · {hire.department}
              </p>
            </div>
            <span className="ml-auto whitespace-nowrap text-xs text-slate-400">
              {formatDate(hire.joinedAt)}
            </span>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
