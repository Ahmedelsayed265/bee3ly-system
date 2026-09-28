import { cn } from '@/lib/utils';

type FilterChipProps = {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
};

export function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-border bg-page text-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active && 'border-brand/40 bg-brand/10 text-brand',
      )}
    >
      {label}
      {count != null ? <span className="tabular-nums">{count}</span> : null}
    </button>
  );
}
