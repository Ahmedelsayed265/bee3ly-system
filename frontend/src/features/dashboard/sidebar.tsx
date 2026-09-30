import { DashboardSidebarPanel } from '@/features/dashboard/sidebar-panel';
import { cn } from '@/lib/utils';

export function DashboardSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'border-border bg-surface flex h-full w-65 shrink-0 flex-col border-e',
        className,
      )}
    >
      <DashboardSidebarPanel />
    </aside>
  );
}
