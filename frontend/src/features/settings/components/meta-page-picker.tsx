import { MetaPagesSkeleton } from '@/components/ui/skeleton-blocks';
import { HelpLink } from '@/features/help/help-link';
import { useLocale } from '@/features/i18n/locale-context';

type MetaPage = {
  id: string;
  name: string;
  hasInstagram: boolean;
};

type AdAccount = { id: string; name: string; currency: string | null };

type MetaPagePickerProps = {
  pages: MetaPage[];
  adAccounts?: AdAccount[];
  adAccountId?: string;
  onAdAccountChange?: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  onSelect: (pageId: string) => void;
};

export function MetaPagePicker({
  pages,
  adAccounts = [],
  adAccountId,
  onAdAccountChange,
  isLoading,
  isError,
  isPending,
  onSelect,
}: MetaPagePickerProps) {
  const { t } = useLocale();

  return (
    <div className="border-border space-y-2 border-t pt-3">
      {!isLoading && !adAccounts.length ? (
        <div className="bg-page space-y-2 rounded-xl px-3 py-2 text-xs leading-6">
          <p>{t('noAdAccountHint')}</p>
          <p className="flex flex-wrap gap-3">
            <HelpLink slug="create-ad-account" labelKey="helpCreateAdAccount" />
            <HelpLink slug="ads-permissions" labelKey="helpAdsPermissions" />
          </p>
        </div>
      ) : null}
      {adAccounts.length ? (
        <label className="block text-xs">
          <span className="text-muted mb-1 block font-semibold">
            {t('selectAdAccount')}
          </span>
          <select
            className="border-border bg-page w-full rounded-xl border px-3 py-2 text-sm"
            value={adAccountId ?? ''}
            onChange={(event) => onAdAccountChange?.(event.target.value)}
          >
            <option value="">{t('selectAdAccount')}</option>
            {adAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.id}
                {account.currency ? ` · ${account.currency}` : ''})
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
      {isLoading ? <MetaPagesSkeleton /> : null}
      {isError ? (
        <p className="text-danger text-sm">{t('metaPendingExpired')}</p>
      ) : null}
    </div>
  );
}
