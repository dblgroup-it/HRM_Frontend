import { useId, useLayoutEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';

import { cn } from '@shared/lib';
import { APP_META } from '@shared/constants';
import { Logo } from '@shared/components/ui';
import { useAuth } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';
import {
  canAccessRecruitment,
  isTalentAcquisitionHead,
  canViewCandidatePipeline,
} from '@modules/candidates';
import { canAccessMedical,
  canApproveMedical,
  isMedicalOnly,
} from '@modules/onboarding';
import { canAccessInsights } from '@modules/insights';
import { canAccessUnitConfig } from '@modules/units';
import { canAccessAiSettings } from '@modules/settings';
import { canConfigureApprovalPaths } from '@modules/approval-paths';
import {
  canApproveFirstInterviews,
  useMyDelegatedCandidates,
} from '@modules/assessment';
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
  const canSeePipeline = canViewCandidatePipeline(perms);
  // Access Control follows the super_user role as well as the static ADMIN
  // login, so system administration doesn't require the admin account.
  const canSeeAccessControl = role === 'admin' || Boolean(perms?.isSuperUser);
  const canSeeMedical = canAccessMedical(perms);
  const canApproveMedicals = canApproveMedical(perms);
  // Medical-only staff get a navigation built around their work, not a tour of
  // everyone else's — see isMedicalOnly.
  const medicalOnly = isMedicalOnly(perms);
  const canSeeInsights = canAccessInsights(perms, role);
  const canSeeUnitConfig = canAccessUnitConfig(perms);
  const canSeeAiSettings = canAccessAiSettings(perms);
  const canSeeApprovalPaths = canConfigureApprovalPaths(perms);
  const isTalentHead = isTalentAcquisitionHead(perms);
  // "Assigned Candidates" isn't a permission — it's whether anyone has actually
  // handed this person candidates to interview, so it comes from the data.
  const { data: delegated } = useMyDelegatedCandidates();
  const hasDelegations = (delegated?.length ?? 0) > 0;
  const canApproveFinalists = canApproveFirstInterviews(perms);

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
                (!item.requiresPipeline || canSeePipeline) &&
                (!item.requiresMedical || canSeeMedical) &&
                (!item.requiresMedicalApproval || canApproveMedicals) &&
                (!item.hideForMedicalOnly || !medicalOnly) &&
                (!item.requiresDelegations || hasDelegations) &&
                (!item.requiresFirstInterviewApproval || canApproveFinalists) &&
                (!item.requiresInsights || canSeeInsights) &&
                (!item.requiresUnitConfig || canSeeUnitConfig) &&
                (!item.requiresAiSettings || canSeeAiSettings) &&
                (!item.requiresApprovalPaths || canSeeApprovalPaths) &&
                (!item.requiresAccessControl || canSeeAccessControl) &&
                (!item.requiresTalentHead || isTalentHead)
            );
            if (items.length === 0) return null;

            return (
              <div key={section.heading}>
                <p
                  className={cn(
                    'px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-slate-400 transition-all duration-200',
                    collapsed &&
                    'lg:pointer-events-none lg:h-0 lg:overflow-hidden lg:p-0 lg:opacity-0'
                  )}
                >
                  {section.heading}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) =>
                    item.external ? (
                      <a
                        key={item.to}
                        href={item.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'group flex min-h-10 items-center gap-3 rounded-full px-3.5 py-2 text-sm transition-all duration-200',
                          collapsed && 'lg:justify-center lg:gap-0 lg:px-2',
                          'font-medium text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0 text-slate-500 transition-colors group-hover:text-slate-700" />
                        <span
                          className={cn(
                            'flex-1 truncate transition-all duration-200',
                            collapsed && 'lg:pointer-events-none lg:w-0 lg:flex-none lg:opacity-0'
                          )}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold bg-accent-100 text-accent-700',
                              collapsed && 'lg:hidden'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </a>
                    ) : (
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
                                'rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold',
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
            'p-3 transition-all duration-300',
            collapsed && 'lg:px-2'
          )}
        >
          <DevCredit
            className={cn(collapsed && 'lg:hidden')}
            lines={[
              {
                text: 'Developed by',
                className:
                  'text-[0.59375rem] font-semibold uppercase tracking-[0.14em] text-slate-400',
              },
              {
                text: `IT Team · ${APP_META.company}`,
                className: 'dev-credit-name text-[0.8125rem] font-bold tracking-tight',
              },
            ]}
          />
          {collapsed && (
            <DevCredit
              className="hidden lg:block"
              title={`Developed by IT Team · ${APP_META.company}`}
              lines={[{ text: 'IT', className: 'dev-credit-name text-xs font-bold' }]}
            />
          )}
        </div>
      </aside>
    </>
  );
}

interface CreditLine {
  text: string;
  className: string;
}

/** Gap between the text and the path the light runs along, in px. */
const ORBIT_PAD = 5;
const ORBIT_RADIUS = 6;

/**
 * Outline that hugs each line of text: a narrow box around the short top
 * line stepping out to a wider box around the name, so two lines trace an
 * upside-down T. Corners are rounded, concave ones included.
 */
function outlinePath(boxes: DOMRect[], origin: DOMRect): string {
  const rows = boxes.map((b) => ({
    l: b.left - origin.left - ORBIT_PAD,
    r: b.right - origin.left + ORBIT_PAD,
    t: b.top - origin.top,
    b: b.bottom - origin.top,
  }));
  if (rows.length === 0) return '';
  rows[0].t -= ORBIT_PAD;
  rows[rows.length - 1].b += ORBIT_PAD;
  for (let i = 1; i < rows.length; i++) {
    const mid = (rows[i - 1].b + rows[i].t) / 2;
    rows[i - 1].b = mid;
    rows[i].t = mid;
  }
  // Clockwise: down the right edge row by row, back up the left.
  const pts: [number, number][] = [];
  rows.forEach((row) => pts.push([row.r, row.t], [row.r, row.b]));
  [...rows].reverse().forEach((row) => pts.push([row.l, row.b], [row.l, row.t]));
  const clean = pts.filter(
    (p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.abs(p[0] - q[0]) > 0.5 || Math.abs(p[1] - q[1]) > 0.5;
    }
  );
  const n = clean.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [px, py] = clean[(i - 1 + n) % n];
    const [cx, cy] = clean[i];
    const [nx, ny] = clean[(i + 1) % n];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(ORBIT_RADIUS, inLen / 2, outLen / 2);
    const ax = cx - ((cx - px) / inLen) * r;
    const ay = cy - ((cy - py) / inLen) * r;
    const bx = cx + ((nx - cx) / outLen) * r;
    const by = cy + ((ny - cy) / outLen) * r;
    d += `${i === 0 ? 'M' : 'L'}${ax.toFixed(1)},${ay.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} `;
  }
  return d + 'Z';
}

/**
 * The "Developed by" credit: text only, with one short streak of brand light
 * running around the outline of the words themselves. Only the streak is
 * stroked, so the text never sits in a box.
 */
function DevCredit({
  lines,
  className,
  title,
}: {
  lines: CreditLine[];
  className?: string;
  title?: string;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [d, setD] = useState('');

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const boxes = lineRefs.current
        .filter((el): el is HTMLSpanElement => !!el && el.offsetWidth > 0)
        .map((el) => el.getBoundingClientRect());
      setD(boxes.length ? outlinePath(boxes, wrap.getBoundingClientRect()) : '');
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [lines.length]);

  return (
    <div
      ref={wrapRef}
      className={cn('relative px-3 py-2 text-center', className)}
      title={title}
    >
      {d && (
        <svg className="dev-credit-orbit" aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1877c0" />
              <stop offset="100%" stopColor="#8cc63f" />
            </linearGradient>
          </defs>
          <path d={d} pathLength={100} stroke={`url(#${id})`} />
        </svg>
      )}
      {lines.map((line, i) => (
        <p key={line.text} className="leading-tight">
          <span
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={cn('inline-block max-w-full truncate align-top', line.className)}
          >
            {line.text}
          </span>
        </p>
      ))}
    </div>
  );
}
