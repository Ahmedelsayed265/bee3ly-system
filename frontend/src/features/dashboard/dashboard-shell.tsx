import { DashboardSidebar } from '@/features/dashboard/sidebar';
import { DashboardTopBar } from '@/features/dashboard/top-bar';
import { Outlet } from 'react-router-dom';

export function DashboardShell() {
  return (
    <div className="bg-page text-ink flex h-svh overflow-hidden">
      <DashboardSidebar className="hidden md:flex" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTopBar />
        <main className="min-h-0 w-full flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
