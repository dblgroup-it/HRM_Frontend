import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  UserCog,
} from 'lucide-react';

import { Avatar } from '@shared/components/ui';
import { useAuth } from '@modules/auth';
import { useEmployees } from '@modules/employees';
import { NotificationBell } from '@modules/notifications';
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
  const [dateOpen, setDateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const dateAutoHideTimer = useRef<number | null>(null);
  const profileAutoHideTimer = useRef<number | null>(null);
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

  const clearDateAutoHide = useCallback(() => {
    if (dateAutoHideTimer.current) {
      window.clearTimeout(dateAutoHideTimer.current);
      dateAutoHideTimer.current = null;
    }
  }, []);

  const scheduleDateAutoHide = useCallback(() => {
    clearDateAutoHide();
    dateAutoHideTimer.current = window.setTimeout(() => {
      setDateOpen(false);
    }, 3000);
  }, [clearDateAutoHide]);

  const clearProfileAutoHide = useCallback(() => {
    if (profileAutoHideTimer.current) {
      window.clearTimeout(profileAutoHideTimer.current);
      profileAutoHideTimer.current = null;
    }
  }, []);

  const scheduleProfileAutoHide = useCallback(() => {
    clearProfileAutoHide();
    profileAutoHideTimer.current = window.setTimeout(() => {
      setMenuOpen(false);
    }, 3000);
  }, [clearProfileAutoHide]);

  useEffect(() => {
    if (!dateOpen) {
      clearDateAutoHide();
      return;
    }

    scheduleDateAutoHide();
    return clearDateAutoHide;
  }, [clearDateAutoHide, dateOpen, scheduleDateAutoHide]);

  useEffect(() => {
    if (!menuOpen) {
      clearProfileAutoHide();
      return;
    }

    scheduleProfileAutoHide();
    return clearProfileAutoHide;
  }, [clearProfileAutoHide, menuOpen, scheduleProfileAutoHide]);

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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:px-6">
      <div className="grid min-h-[64px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center">
          <button
            onClick={onMenuClick}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={submitSearch}
          ref={searchRef}
          className="relative mx-auto hidden w-full min-w-0 max-w-md md:block"
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
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
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
                          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
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
            <div className="relative hidden min-[1700px]:block">
              <button
                type="button"
                onClick={toggleDateWidget}
                className="flex max-w-[15rem] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/40 hover:text-slate-800"
                aria-label="Open calendar and clock"
                aria-expanded={dateOpen}
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="truncate">{dateLabel}</span>
              </button>

              {dateOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDateOpen(false)}
                    aria-hidden
                  />
                  <div
                    className="absolute right-0 z-20 mt-3 w-80 animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.55)]"
                    onFocus={scheduleDateAutoHide}
                    onMouseMove={scheduleDateAutoHide}
                  >
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
                            className="py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
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
                </>
              )}
            </div>

            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                onClick={toggleUserMenu}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Avatar
                  name={user?.name ?? 'User'}
                  src={user?.avatarUrl}
                  size="md"
                />
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

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden
                  />
                  <div
                    className="absolute right-0 z-20 mt-2 w-60 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                    onFocus={scheduleProfileAutoHide}
                    onMouseMove={scheduleProfileAutoHide}
                  >
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {user?.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {user?.email}
                      </p>
                      {user?.unit && (
                        <p className="mt-2 w-fit rounded-full bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700">
                          {user.unit}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
