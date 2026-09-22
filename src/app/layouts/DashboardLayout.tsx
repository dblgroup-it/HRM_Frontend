import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';

/** Authenticated shell: persistent sidebar + header with a routed outlet. */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * A new page starts at the top.
   *
   * The scroller is this panel, not the window, so a route change used to
   * keep whatever scroll position the previous page was left at — arriving
   * halfway down a page you have never seen. Paired with the entrance
   * animation below, which is keyed on the path so it replays per page.
   */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

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
          <div
            ref={scrollRef}
            className="scrollbar-thin h-full overflow-y-auto rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/70"
          >
            {/* Keyed on the path so the entrance replays on every route
                change — pages used to swap in hard, which made navigation
                read as a reload rather than as movement inside one app.
                `motion-reduce` drops it for anyone who has asked for less. */}
            <div
              key={pathname}
              className="animate-page-in motion-reduce:animate-none mx-auto w-full max-w-[1560px] space-y-4 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-6"
            >
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
