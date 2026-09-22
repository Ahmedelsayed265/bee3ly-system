import { Button } from '@/components/ui/button';

type PaginationBarProps = {
  page: number;
  totalPages: number;
  fetching?: boolean;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
  onPage: (page: number) => void;
};

export function PaginationBar({
  page,
  totalPages,
  fetching,
  previousLabel,
  nextLabel,
  pageLabel,
  onPage,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted text-sm">{pageLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1 || fetching}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          {previousLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages || fetching}
          onClick={() => onPage(Math.min(totalPages, page + 1))}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
