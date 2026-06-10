import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

/** Authenticated shell: persistent sidebar + header with a routed outlet. */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto bg-slate-50">
          <div className="mx-auto w-full max-w-[1560px] space-y-4 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
