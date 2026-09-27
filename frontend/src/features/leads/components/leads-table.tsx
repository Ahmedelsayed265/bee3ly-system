import { Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InputField } from '@/components/ui/input-field';
import { PaginationBar } from '@/components/ui/pagination-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectField } from '@/components/ui/select-field';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  LEAD_STATUSES,
  type Lead,
  type LeadCounts,
  type LeadStatus,
} from '@/features/leads/constants';
import { cn } from '@/lib/utils';

type LeadsTableProps = {
  leads: Lead[];
  counts: LeadCounts;
  intents: string[];
  page: number;
  totalPages: number;
  isFetching: boolean;
  isBusy: boolean;
  empty: boolean;
  status: LeadStatus | '';
  intent: string;
  query: string;
  selectedIds: string[];
  onStatusFilter: (status: LeadStatus | '') => void;
  onIntentFilter: (intent: string) => void;
  onQuery: (query: string) => void;
  onClearFilters: () => void;
  onToggle: (id: string, on: boolean) => void;
  onTogglePage: (ids: string[], on: boolean) => void;
  onClearSelected: () => void;
  onStatusClick: (lead: Lead, status: LeadStatus) => void;
  onBulkStatus: (status: LeadStatus) => void;
  onDeleteSelected: () => void;
  onPage: (page: number) => void;
};

export function LeadsTable({
  leads,
  counts,
  intents,
  page,
  totalPages,
  isFetching,
  isBusy,
  empty,
  status,
  intent,
  query,
  selectedIds,
  onStatusFilter,
  onIntentFilter,
  onQuery,
  onClearFilters,
  onToggle,
  onTogglePage,
  onClearSelected,
  onStatusClick,
  onBulkStatus,
  onDeleteSelected,
  onPage,
}: LeadsTableProps) {
  const { locale, t } = useLocale();
  const pageIds = leads.map((lead) => lead.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id));
  const allOnPage =
    pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const someOnPage = selectedOnPage.length > 0 && !allOnPage;
  const hasFilters = Boolean(status || intent || query.trim());
  const allCount = LEAD_STATUSES.reduce((sum, key) => sum + counts[key], 0);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="border-border/70 bg-surface w-full overflow-hidden rounded-[1.75rem] border">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label={t('leadFilterAll')}
              count={allCount}
              active={status === ''}
              onClick={() => onStatusFilter('')}
            />
            {LEAD_STATUSES.map((item) => (
              <FilterChip
                key={item}
                label={t(`leadStatus_${item}` as MessageKey)}
                count={counts[item]}
                active={status === item}
                onClick={() => onStatusFilter(item)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InputField
              icon={Search}
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={t('leadSearchPlaceholder')}
              containerClassName="min-w-56 flex-1"
              aria-label={t('leadSearchPlaceholder')}
            />
            <div className="w-full sm:w-56">
              <SelectField
                value={intent || 'ALL'}
                onValueChange={(value) =>
                  onIntentFilter(value === 'ALL' ? '' : value)
                }
                options={[
                  { value: 'ALL', label: t('leadIntentAll') },
                  ...intents.map((item) => ({
                    value: item,
                    label: intentText(t, item),
                  })),
                ]}
              />
            </div>
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="h-12"
                onClick={onClearFilters}
              >
                {t('leadClearFilters')}
              </Button>
            ) : null}
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="border-border bg-brand/5 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-ink text-sm font-semibold">
              {t('leadSelectedCount', { count: String(selectedIds.length) })}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted me-1 text-xs">
                {t('leadBulkStatus')}
              </span>
              {LEAD_STATUSES.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs"
                  disabled={isBusy}
                  onClick={() => onBulkStatus(item)}
                >
                  {t(`leadStatus_${item}` as MessageKey)}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-danger hover:bg-danger/10 hover:text-danger border-danger/30 h-8 px-2.5 text-xs"
                disabled={isBusy}
                onClick={onDeleteSelected}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('leadDeleteSelected')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-xs"
                disabled={isBusy}
                onClick={onClearSelected}
              >
                {t('leadClearSelection')}
              </Button>
            </div>
          </div>
        ) : null}

        {empty ? (
          <p className="text-muted border-border border-t px-4 py-8 text-sm">
            {t('leadNoMatches')}
          </p>
        ) : (
          <div className="border-border overflow-x-auto border-t">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-muted text-xs font-semibold">
                  <th className="w-12 px-4 py-3 text-start">
                    <Checkbox
                      className="shadow-none"
                      aria-label={t('leadSelectAll')}
                      checked={
                        allOnPage ? true : someOnPage ? 'indeterminate' : false
                      }
                      disabled={isBusy || pageIds.length === 0}
                      onCheckedChange={(checked) =>
                        onTogglePage(pageIds, checked === true)
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t('leadColCustomer')}
                  </th>
                  <th className="px-4 py-3 text-start">{t('leadColPhone')}</th>
                  <th className="px-4 py-3 text-start">{t('leadColIntent')}</th>
                  <th className="px-4 py-3 text-start">
                    {t('leadColActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const name = lead.customer.name ?? t('unknownCustomer');
                  const meta = [
                    formatLeadDate(lead.createdAt, locale),
                    lead.campaign?.name,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  const picked = selectedIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        'border-border border-t',
                        picked ? 'bg-brand/5' : 'hover:bg-page',
                      )}
                    >
                      <td className="px-4 py-3 text-start">
                        <Checkbox
                          className="shadow-none"
                          aria-label={t('leadSelectOne', { name })}
                          checked={picked}
                          disabled={isBusy}
                          onCheckedChange={(checked) =>
                            onToggle(lead.id, checked === true)
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-start">
                        <p className="text-ink font-semibold">{name}</p>
                        {meta ? (
                          <p className="text-muted mt-0.5 text-xs">{meta}</p>
                        ) : null}
                      </td>
                      <td className="text-muted px-4 py-3 text-start tabular-nums">
                        {lead.customer.phone ? (
                          <span className="inline-block" dir="ltr">
                            {lead.customer.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-ink px-4 py-3 text-start">
                        {intentText(t, lead.intent)}
                      </td>
                      <td className="px-4 py-3 text-start">
                        <Select
                          value={lead.status}
                          disabled={isBusy}
                          onValueChange={(value) => {
                            if (value !== lead.status) {
                              onStatusClick(lead, value as LeadStatus);
                            }
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              'h-9 w-40 px-3 text-xs font-semibold',
                              statusTone(lead.status),
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_STATUSES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {t(`leadStatus_${item}` as MessageKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {empty ? null : (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          fetching={isFetching}
          previousLabel={t('previous')}
          nextLabel={t('next')}
          pageLabel={t('pageOf', {
            page: String(page),
            total: String(totalPages),
          })}
          onPage={onPage}
        />
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-border bg-surface text-muted hover:text-ink',
      )}
    >
      {label}
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

function statusTone(status: string) {
  if (status === 'NEW') return 'border-brand/30 bg-brand/10 text-brand';
  if (status === 'QUALIFIED')
    return 'border-transparent bg-lavender text-trust';
  if (status === 'CONVERTED') return 'border-trust/20 bg-trust/10 text-trust';
  return 'border-border bg-page text-muted';
}

function intentText(
  t: (key: MessageKey, params?: Record<string, string>) => string,
  intent: string | null,
) {
  if (!intent) return '—';
  const key = `leadIntent_${intent}` as MessageKey;
  const translated = t(key);
  return translated && translated !== key ? translated : intent;
}

function formatLeadDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}
