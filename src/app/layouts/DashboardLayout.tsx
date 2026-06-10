import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';

/** Authenticated shell: persistent sidebar + header with a routed outlet. */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-800">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {/* Content floats in one big rounded white panel on the grey canvas. */}
        <main className="min-h-0 flex-1 px-2 pb-2 pt-0.5 sm:px-3 sm:pb-3 lg:pl-0">
          <div className="scrollbar-thin h-full overflow-y-auto rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/70">
            <div className="mx-auto w-full max-w-[1560px] space-y-4 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav onMore={() => setSidebarOpen(true)} />
    </div>
  );
}
