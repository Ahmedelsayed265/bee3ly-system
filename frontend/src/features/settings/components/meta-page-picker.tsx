import { useLocale } from '@/features/i18n/locale-context';

type MetaPage = {
  id: string;
  name: string;
  hasInstagram: boolean;
};

type MetaPagePickerProps = {
  pages: MetaPage[];
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  onSelect: (pageId: string) => void;
};

export function MetaPagePicker({
  pages,
  isLoading,
  isError,
  isPending,
  onSelect,
}: MetaPagePickerProps) {
  const { t } = useLocale();

  return (
    <div className="border-border space-y-2 border-t pt-3">
      {pages.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={isPending}
          onClick={() => onSelect(p.id)}
          className="border-border bg-page hover:border-brand/40 hover:bg-lavender flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-start text-sm transition"
        >
          <span className="text-ink font-semibold">{p.name}</span>
          <span className="text-muted text-[11px]">
            {p.hasInstagram ? t('pageHasInstagram') : t('pageNoInstagram')}
          </span>
        </button>
      ))}
      {isLoading ? (
        <p className="text-muted text-xs">{t('connectionConnecting')}…</p>
      ) : null}
      {isError ? (
        <p className="text-danger text-sm">{t('metaPendingExpired')}</p>
      ) : null}
    </div>
  );
}
