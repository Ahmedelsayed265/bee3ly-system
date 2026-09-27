import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-lavender/80 animate-pulse rounded-lg', className)}
      {...props}
    />
  );
}

export { Skeleton };
