import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Search, UserCog } from 'lucide-react';

import { Avatar } from '@shared/components/ui';
import { useAuth } from '@modules/auth';
import { ROUTES } from '@app/router/paths';

interface HeaderProps {
  onMenuClick: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  hr_manager: 'HR Manager',
  employee: 'Employee',
};

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search employees, requests…"
            className="h-9 w-64 rounded-lg border border-slate-200 bg-surface-muted pl-9 pr-3 text-sm focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
          >
            <Avatar name={user?.name ?? 'User'} src={user?.avatarUrl} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-slate-800">
                {user?.name}
              </span>
              <span className="block text-xs text-slate-400">
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
              <div className="absolute right-0 z-20 mt-2 w-56 animate-fade-in rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(ROUTES.settings);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <UserCog className="h-4 w-4" />
                  Account settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
