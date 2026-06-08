import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';

import { cn } from '@shared/lib';
import { APP_META } from '@shared/constants';
import { Logo } from '@shared/components/ui';
import { useAuth } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';
import { canAccessRecruitment } from '@modules/candidates';
import { NAVIGATION } from '@app/config/navigation';

interface SidebarProps {
  /** Mobile drawer open state. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const role = user?.role;
  const { data: perms } = useMyPermissions();
  const canSeeRecruitment = canAccessRecruitment(perms);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Logo size="sm" />
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAVIGATION.map((section) => {
            const items = section.items.filter(
              (item) =>
                (!item.roles || (role && item.roles.includes(role))) &&
                (!item.requiresRecruitment || canSeeRecruitment)
            );
            if (items.length === 0) return null;

            return (
              <div key={section.heading}>
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {section.heading}
                </p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 text-xs text-slate-400">
          v1.0.0 · {APP_META.company}
        </div>
      </aside>
    </>
  );
}
