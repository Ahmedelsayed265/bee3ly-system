import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SelectField } from '@/components/ui/select-field';
import {
  fetchMetaAdAccounts,
  selectMetaAdAccount,
} from '@/features/business/api';
import { HelpLink } from '@/features/help/help-link';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export function CampaignAdAccount() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['meta-ad-accounts'],
    queryFn: fetchMetaAdAccounts,
    staleTime: 5 * 60 * 1000,
  });
  const save = useMutation({
    mutationFn: selectMetaAdAccount,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['meta-ad-accounts'] });
      await qc.invalidateQueries({ queryKey: ['social'] });
    },
  });

  const accounts = query.data?.accounts ?? [];
  const selectedId = query.data?.selectedId ?? '';

  return (
    <section className="border-border bg-surface rounded-2xl border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-ink text-sm font-bold">{t('selectAdAccount')}</h2>
          <p className="text-muted mt-1 text-xs leading-5">
            {t('campaignAdAccountHint')}
          </p>
        </div>
        <HelpLink slug="create-ad-account" labelKey="helpCreateAdAccount" />
      </div>
      {query.data?.needsReconnect ? (
        <p className="text-muted text-sm leading-6">
          {t('reconnectMetaAds')}{' '}
          <Link to={paths.settings} className="text-brand font-semibold">
            {t('navSettings')}
          </Link>
        </p>
      ) : accounts.length ? (
        <SelectField
          id="campaign-ad-account"
          value={selectedId}
          disabled={save.isPending || query.isLoading}
          placeholder={t('selectAdAccount')}
          onValueChange={(value) => save.mutate(value)}
          options={accounts.map((account) => ({
            value: account.id,
            label: `${account.name} (${account.id}${account.currency ? ` · ${account.currency}` : ''})`,
          }))}
        />
      ) : (
        <div className="space-y-2 text-sm leading-6">
          <p className="text-muted">{t('noAdAccountHint')}</p>
          <p className="flex flex-wrap gap-3">
            <HelpLink slug="create-ad-account" labelKey="helpCreateAdAccount" />
            <HelpLink slug="ads-permissions" labelKey="helpAdsPermissions" />
          </p>
        </div>
      )}
    </section>
  );
}
