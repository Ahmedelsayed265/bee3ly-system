import { DashboardMobileNav } from '@/features/dashboard/mobile-nav';
import { DashboardSidebar } from '@/features/dashboard/sidebar';
import { DashboardTopBar } from '@/features/dashboard/top-bar';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

export function DashboardShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="bg-page text-ink flex h-dvh overflow-hidden">
      <DashboardSidebar className="hidden md:flex" />
      <DashboardMobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTopBar onMenuOpen={() => setMobileNavOpen(true)} />
        <main className="min-h-0 w-full flex-1 overflow-hidden">
          <div className="flex h-full min-w-0 flex-col overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
