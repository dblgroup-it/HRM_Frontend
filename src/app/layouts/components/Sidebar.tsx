import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';

import { cn } from '@shared/lib';
import { APP_META } from '@shared/constants';
import { Logo } from '@shared/components/ui';
import { useAuth } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';
import { canAccessRecruitment } from '@modules/candidates';
import { canAccessMedical } from '@modules/onboarding';
import { canAccessInsights } from '@modules/insights';
import { NAVIGATION } from '@app/config/navigation';

interface SidebarProps {
  /** Mobile drawer open state. */
  open: boolean;
  /** Desktop collapsed state. Mobile drawer always stays expanded. */
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const { user } = useAuth();
  const role = user?.role;
  const { data: perms } = useMyPermissions();
  const canSeeRecruitment = canAccessRecruitment(perms);
  const canSeeMedical = canAccessMedical(perms);
  const canSeeInsights = canAccessInsights(perms, role);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 animate-fade-in bg-slate-900/35 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white shadow-xl transition-all duration-300 ease-out lg:static lg:translate-x-0 lg:bg-transparent lg:shadow-none',
          collapsed ? 'lg:w-20' : 'lg:w-72',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div
          className={cn(
            'relative px-5 py-6 transition-all duration-300',
            collapsed && 'lg:px-3 lg:py-5'
          )}
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-xl p-1 transition hover:bg-slate-50 focus-visible:ring-offset-white"
              aria-label={
                collapsed ? 'Expand navigation' : 'Collapse navigation'
              }
              aria-expanded={!collapsed}
            >
              <Logo
                withLabel={false}
                size="2xl"
                className={cn(
                  'transition-transform duration-300 hover:scale-105',
                  collapsed && 'lg:hidden'
                )}
              />
              <Logo
                withLabel={false}
                size="lg"
                className={cn(
                  'hidden transition-transform duration-300 hover:scale-105',
                  collapsed && 'lg:flex'
                )}
              />
            </button>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p
            className={cn(
              'mt-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-all duration-200',
              collapsed &&
                'lg:pointer-events-none lg:h-0 lg:overflow-hidden lg:opacity-0'
            )}
          >
            DBL HRM · Recruitment Suite
          </p>
        </div>

        <nav
          className={cn(
            'scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5 transition-all duration-300',
            collapsed && 'lg:space-y-3 lg:px-2'
          )}
        >
          {NAVIGATION.map((section) => {
            const items = section.items.filter(
              (item) =>
                (!item.roles || (role && item.roles.includes(role))) &&
                (!item.requiresRecruitment || canSeeRecruitment) &&
                (!item.requiresMedical || canSeeMedical) &&
                (!item.requiresInsights || canSeeInsights)
            );
            if (items.length === 0) return null;

            return (
              <div key={section.heading}>
                <p
                  className={cn(
                    'px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition-all duration-200',
                    collapsed &&
                      'lg:pointer-events-none lg:h-0 lg:overflow-hidden lg:p-0 lg:opacity-0'
                  )}
                >
                  {section.heading}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group flex min-h-10 items-center gap-3 rounded-full px-3.5 py-2 text-sm transition-all duration-200',
                          collapsed && 'lg:justify-center lg:gap-0 lg:px-2',
                          isActive
                            ? 'bg-brand-100 font-semibold text-brand-800 shadow-sm ring-1 ring-brand-200'
                            : 'font-medium text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cn(
                              'h-5 w-5 shrink-0 transition-colors',
                              isActive
                                ? 'text-brand-700'
                                : 'text-slate-500 group-hover:text-slate-700'
                            )}
                          />
                          <span
                            className={cn(
                              'flex-1 truncate transition-all duration-200',
                              collapsed &&
                                'lg:pointer-events-none lg:w-0 lg:flex-none lg:opacity-0'
                            )}
                          >
                            {item.label}
                          </span>
                          {item.badge && (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                collapsed && 'lg:hidden',
                                isActive
                                  ? 'bg-brand-100 text-brand-700'
                                  : 'bg-accent-100 text-accent-700'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div
          className={cn(
            'p-4 transition-all duration-300',
            collapsed && 'lg:px-2'
          )}
        >
          {collapsed ? (
            <>
              <p className="text-[11px] font-medium text-slate-400 lg:hidden">
                v1.0.0 · {APP_META.company}
              </p>
              <p className="hidden text-center text-[11px] font-medium text-slate-400 lg:block">
                v1
              </p>
            </>
          ) : (
            <p className="text-[11px] font-medium text-slate-400">
              v1.0.0 · {APP_META.company}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
