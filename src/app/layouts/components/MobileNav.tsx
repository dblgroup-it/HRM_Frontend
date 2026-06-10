import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  MoreHorizontal,
  UserSearch,
  Users,
} from 'lucide-react';

import { cn } from '@shared/lib';
import { useMyPermissions } from '@modules/rbac';
import { canAccessRecruitment } from '@modules/candidates';
import { ROUTES } from '@app/router/paths';

/**
 * App-style bottom navigation for phones/tablets. The "More" button opens the
 * full slide-over drawer (the sidebar) for everything else.
 */
export function MobileNav({ onMore }: { onMore: () => void }) {
  const { data: perms } = useMyPermissions();
  const canRecruit = canAccessRecruitment(perms);

  const items = [
    { label: 'Home', to: ROUTES.dashboard, icon: LayoutDashboard, end: true },
    { label: 'Requisitions', to: ROUTES.requisitions, icon: ClipboardList },
    ...(canRecruit
      ? [{ label: 'Candidates', to: ROUTES.candidates, icon: UserSearch }]
      : []),
    { label: 'Employees', to: ROUTES.employees, icon: Users },
  ].slice(0, 4);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div
        className="mx-2 mb-2 flex items-stretch justify-around rounded-2xl border border-slate-200/70 bg-white/95 px-1 py-1.5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.45)] backdrop-blur"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium"
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-8 w-full max-w-[3.75rem] items-center justify-center rounded-full transition-colors',
                    isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-500',
                  )}
                >
                  <it.icon className="h-5 w-5" />
                </span>
                <span className={isActive ? 'text-brand-700' : 'text-slate-500'}>
                  {it.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={onMore}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium text-slate-500"
        >
          <span className="flex h-8 w-full max-w-[3.75rem] items-center justify-center rounded-full">
            <MoreHorizontal className="h-5 w-5" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
