import { Bee3lyMark } from '@/components/brand/bee3ly-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';

/** Full-screen loader for auth bootstrap (session / me query). */
export function AuthLoadingSkeleton() {
  const { t } = useLocale();

  return (
    <div className="bg-page flex min-h-screen flex-col items-center justify-center gap-5 p-6">
      <div
        className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label={t('loading')}
      >
        <span
          className="border-brand/15 border-t-brand absolute inset-0 animate-spin rounded-[1.35rem] border-[3px]"
          aria-hidden
        />
        <Bee3lyMark className="relative h-14 w-14" tone="brand" />
      </div>
      <p className="text-muted text-sm font-medium">{t('loading')}</p>
    </div>
  );
}

export function ListRowsSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-page/80 flex items-center gap-3 rounded-2xl px-3 py-2.5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 max-w-48" />
            <Skeleton className="h-3 w-2/5 max-w-32" />
          </div>
          <Skeleton className="h-5 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="border-border border-t">
          {Array.from({ length: cols }).map((_, col) => (
            <td key={col} className="px-4 py-3">
              <Skeleton
                className={cn(
                  'h-4',
                  col === 0 ? 'w-36' : col === cols - 1 ? 'w-24' : 'w-20',
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CampaignListSkeleton() {
  return (
    <section className="flex w-full flex-col gap-4">
      <div className="border-border/70 bg-surface rounded-[1.75rem] border p-5">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border/70 bg-surface rounded-[1.75rem] border p-5"
          >
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-3 h-4 w-full max-w-md" />
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CampaignDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="border-border bg-surface rounded-2xl border p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export function InboxListSkeleton() {
  return (
    <div className="border-border bg-surface flex min-h-0 flex-col overflow-hidden rounded-2xl border">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InboxThreadSkeleton() {
  return (
    <div className="border-border bg-surface flex min-h-0 flex-col overflow-hidden rounded-2xl border">
      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              'h-12 rounded-2xl',
              i % 2 === 0 ? 'ms-auto w-3/5' : 'w-2/5',
            )}
          />
        ))}
      </div>
      <div className="border-border shrink-0 border-t p-3">
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function AgentFormSkeleton() {
  return (
    <div className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <Skeleton className="h-6 w-40" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function MetaPagesSkeleton() {
  return (
    <div className="border-border space-y-2 border-t pt-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  );
}
