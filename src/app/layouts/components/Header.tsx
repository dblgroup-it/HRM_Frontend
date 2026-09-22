import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  UserCog,
} from 'lucide-react';

import { Avatar, HeaderPopover, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useAuth } from '@modules/auth';
import { useEmployees } from '@modules/employees';
import { NotificationBell } from '@modules/notifications';
import { AvailabilityPanel, useMyPresence } from '@modules/availability';
import { ROUTES } from '@app/router/paths';

interface HeaderProps {
  onMenuClick: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  hr_manager: 'HR Manager',
  management: 'Management',
  employee: 'Employee',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  /**
   * Whether this person carries cover, and whether they are on duty.
   *
   * Null for everybody else — their absence routes nothing, so they get no
   * dot and no leave control. The dot rides on the avatar rather than on a
   * control of its own: "am I at work" is a fact about the person, and the
   * avatar is already what the person is.
   */
  const presence = useMyPresence();
  const [dateOpen, setDateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchTerm = debouncedQuery.trim();
  const canSearch = searchTerm.length >= 2;
  const { data: searchResults, isFetching: isSearching } = useEmployees(
    { search: searchTerm, page: 1, pageSize: 6 },
    { enabled: canSearch }
  );
  const employeeMatches = canSearch ? (searchResults?.items ?? []) : [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(now),
    [now]
  );
  const timeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now),
    [now]
  );
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
      }).format(now),
    [now]
  );
  const calendarDays = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [now]);

  const today = now.getDate();

  const toggleDateWidget = () => {
    setMenuOpen(false);
    setDateOpen((value) => !value);
  };

  const toggleUserMenu = () => {
    setDateOpen(false);
    setMenuOpen((value) => !value);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const firstMatch = employeeMatches[0];
    if (firstMatch) {
      setSearchOpen(false);
      setQuery('');
      setDebouncedQuery('');
      navigate(ROUTES.employeeDetail(firstMatch.id));
    }
  };

  const openEmployee = (id: string) => {
    setSearchOpen(false);
    setQuery('');
    setDebouncedQuery('');
    navigate(ROUTES.employeeDetail(id));
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 bg-slate-100/80 px-3 backdrop-blur sm:px-4 lg:px-5">
      <div className="relative grid min-h-[64px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center">
          <button
            onClick={onMenuClick}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Centred on the screen, not in its column: the left cell holds a
            menu button and the right one holds a clock, a bell and a name,
            so a search centred between them sat noticeably off-centre. It
            is taken out of flow and pinned to the row's own middle, with a
            wide enough gutter that it never reaches either side. */}
        <form
          onSubmit={submitSearch}
          ref={searchRef}
          className="absolute left-1/2 hidden w-full min-w-0 max-w-md -translate-x-1/2 px-4 md:block"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search employees…"
            className="h-11 w-full rounded-full bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-slate-200/70 transition placeholder:text-slate-400 hover:ring-slate-300 focus:bg-white focus:ring-2 focus:ring-brand-500/40"
          />

          {searchOpen && query.trim().length > 0 && (
            <div className="absolute left-1/2 z-30 mt-2 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)]">
              {query.trim().length < 2 ? (
                <p className="px-4 py-3 text-sm text-slate-500">
                  Type at least 2 characters to search employees.
                </p>
              ) : isSearching ? (
                <div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                  Searching employees...
                </div>
              ) : employeeMatches.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500">
                  No employees found for "{searchTerm}".
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto py-1">
                  {employeeMatches.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => openEmployee(employee.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <Avatar
                        name={employee.name}
                        src={employee.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {employee.name}
                          </p>
                          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[0.625rem] font-medium text-brand-700">
                            {employee.employeeCode}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {employee.jobTitle}
                          {employee.department !== '—'
                            ? ` - ${employee.department}`
                            : ''}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {employee.location}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <div className="flex min-w-0 justify-end">
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-[1700px]:block">
              <button
                ref={dateRef}
                type="button"
                onClick={toggleDateWidget}
                className="flex max-w-[15rem] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/40 hover:text-slate-800"
                aria-label="Open calendar and clock"
                aria-expanded={dateOpen}
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="truncate">{dateLabel}</span>
              </button>

              {/* Portalled: the header lives inside the layout's
                  overflow-hidden column, which was clipping the last row of
                  the month. See HeaderPopover. */}
              <HeaderPopover
                open={dateOpen}
                onClose={() => setDateOpen(false)}
                triggerRef={dateRef}
                autoCloseMs={3000}
                label="Calendar and clock"
                className="w-80 p-4"
              >
                  <div>
                    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                        Today
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                        {timeLabel}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {dateLabel}
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="border-b border-slate-100 pb-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {monthLabel}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                        {WEEKDAYS.map((day) => (
                          <span
                            key={day}
                            className="py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400"
                          >
                            {day}
                          </span>
                        ))}

                        {calendarDays.map((day, index) =>
                          day ? (
                            <span
                              key={`${day}-${index}`}
                              className={
                                day === today
                                  ? 'grid h-8 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white shadow-sm'
                                  : 'grid h-8 place-items-center rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100'
                              }
                            >
                              {day}
                            </span>
                          ) : (
                            <span key={`empty-${index}`} className="h-8" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
              </HeaderPopover>
            </div>

            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                ref={profileRef}
                onClick={toggleUserMenu}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="relative shrink-0">
                  <Avatar
                    name={user?.name ?? 'User'}
                    src={user?.avatarUrl}
                    size="md"
                  />
                  {/* Emerald on duty, amber away — and only for the people
                      whose absence actually re-routes work. */}
                  {presence && (
                    <span
                      title={
                        presence.onLeave
                          ? `On leave${presence.until ? ` until ${formatDate(presence.until)}` : ''}`
                          : 'On duty'
                      }
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white',
                        presence.onLeave ? 'bg-amber-500' : 'bg-emerald-500',
                      )}
                    />
                  )}
                </span>
                <span className="hidden max-w-40 text-left sm:block">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {user?.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {ROLE_LABELS[user?.role ?? ''] ?? user?.jobTitle}
                  </span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>

              <HeaderPopover
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                triggerRef={profileRef}
                autoCloseMs={3000}
                label="Account menu"
                className="w-60"
              >
                  <div>
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {user?.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {user?.email}
                      </p>
                      {user?.unit && (
                        <p className="mt-2 w-fit rounded-full bg-brand-50 px-2 py-1 text-[0.6875rem] font-medium text-brand-700">
                          {user.unit}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      {/* Availability sits with the person, not beside the
                          bell: the bell is work arriving, this is whether
                          work should be arriving at all. */}
                      {presence && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setAvailabilityOpen(true);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          <CalendarClock className="h-4 w-4" />
                          <span className="flex-1 text-left">Availability</span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium',
                              presence.onLeave
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                presence.onLeave
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500',
                              )}
                            />
                            {presence.onLeave ? 'Away' : 'On duty'}
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(ROUTES.settings);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <UserCog className="h-4 w-4" />
                        Account settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
              </HeaderPopover>
            </div>
          </div>
        </div>
      </div>

      {/* A modal rather than a flyout inside the menu: the panel asks who
          covers each requisition, which is a decision, and the profile menu
          hides itself after three seconds of stillness. */}
      <Modal
        open={availabilityOpen}
        onClose={() => setAvailabilityOpen(false)}
        title="Availability"
      >
        <AvailabilityPanel onDone={() => setAvailabilityOpen(false)} />
      </Modal>
    </header>
  );
}
