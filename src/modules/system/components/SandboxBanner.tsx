import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

import { useAuthStore } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';
import { ROUTES } from '@app/router/paths';

import { useSandboxStatus } from '../hooks/useSystem';

/**
 * The DEV SERVER tag, across the top of every page on the dev server.
 *
 * Both sites look alike and the dev one holds a copy of real people, so it
 * must be impossible to mistake one for the other: a striped bar that names
 * the data copy, and "[DEV]" in the browser tab. Renders nothing live.
 */
export function SandboxBanner() {
  const { data } = useSandboxStatus();
  const role = useAuthStore((s) => s.user?.role);
  const { data: perms } = useMyPermissions();
  const canManage = role === 'admin' || Boolean(perms?.isSuperUser);
  const on = Boolean(data?.enabled);

  useEffect(() => {
    if (!on) return;
    const base = document.title.replace(/^\[DEV\] /, '');
    document.title = `[DEV] ${base}`;
  }, [on]);

  if (!on) return null;
  const day = data?.date
    ? new Date(`${data.date}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'unknown day';

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[repeating-linear-gradient(135deg,#f59e0b_0_14px,#fbbf24_14px_28px)] px-3 py-1.5 text-center text-xs font-semibold text-amber-950">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950 px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-amber-300">
        <FlaskConical className="h-3.5 w-3.5" /> Dev server
      </span>
      <span>Data copied from live on {day} · nothing is emailed or sent out</span>
      {canManage && (
        <Link to={ROUTES.devTools} className="underline underline-offset-2 hover:text-amber-800">
          Dev tools
        </Link>
      )}
    </div>
  );
}
