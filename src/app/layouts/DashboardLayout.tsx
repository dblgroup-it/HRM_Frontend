import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

/** Authenticated shell: persistent sidebar + header with a routed outlet. */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto bg-[#f8fafc]">
          <div className="mx-auto w-full max-w-[1560px] space-y-5 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
