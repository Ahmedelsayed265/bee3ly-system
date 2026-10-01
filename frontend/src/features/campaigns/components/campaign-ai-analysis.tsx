import { useQuery } from '@tanstack/react-query';
import { Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchCampaignAnalysis,
  type CampaignAnalysis,
  type CampaignAnalysisVerdict,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

const VERDICT_TONE: Record<
  CampaignAnalysisVerdict,
  'brand' | 'trust' | 'warn' | 'danger' | 'muted'
> = {
  SCALE: 'brand',
  HOLD: 'trust',
  REDUCE_SPEND: 'warn',
  PAUSE: 'warn',
  STOP: 'danger',
  NEEDS_DATA: 'muted',
};

type CampaignAiAnalysisProps = {
  campaignId: string;
  onSuggestedStatus?: (status: 'PAUSED' | 'ARCHIVED') => void;
  isBusy?: boolean;
};

export function CampaignAiAnalysis({
  campaignId,
  onSuggestedStatus,
  isBusy,
}: CampaignAiAnalysisProps) {
  const { locale, t } = useLocale();
  const analysisQuery = useQuery({
    queryKey: ['campaign-analysis', campaignId, locale],
    queryFn: () => fetchCampaignAnalysis(campaignId, locale),
  });

  const analysis = analysisQuery.data?.analysis;

  return (
    <section className="border-border bg-page/80 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-brand h-5 w-5 shrink-0" />
          <div>
            <h3 className="text-ink text-sm font-semibold">
              {t('campaignAiTitle')}
            </h3>
            <p className="text-muted text-xs">{t('campaignAiSubtitle')}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          disabled={analysisQuery.isFetching}
          onClick={() => void analysisQuery.refetch()}
        >
          {analysisQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t('campaignAiRefresh')}
        </Button>
      </div>

      {analysisQuery.isLoading ? (
        <p className="text-muted mt-4 text-sm">{t('campaignAiLoading')}</p>
      ) : analysisQuery.isError ? (
        <p className="text-danger mt-4 text-sm">{t('campaignAiError')}</p>
      ) : analysis ? (
        <AnalysisBody
          analysis={analysis}
          isBusy={isBusy}
          onSuggestedStatus={onSuggestedStatus}
        />
      ) : null}
    </section>
  );
}

function AnalysisBody({
  analysis,
  onSuggestedStatus,
  isBusy,
}: {
  analysis: CampaignAnalysis;
  onSuggestedStatus?: (status: 'PAUSED' | 'ARCHIVED') => void;
  isBusy?: boolean;
}) {
  const { t } = useLocale();
  const tone = VERDICT_TONE[analysis.verdict];

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
            tone === 'brand' && 'bg-brand/15 text-brand',
            tone === 'trust' && 'bg-trust/15 text-trust',
            tone === 'warn' &&
              'bg-amber-500/15 text-amber-800 dark:text-amber-200',
            tone === 'danger' && 'bg-danger/15 text-danger',
            tone === 'muted' && 'bg-border text-muted',
          )}
        >
          {t(`campaignAiVerdict_${analysis.verdict}` as MessageKey)}
        </span>
        <span className="text-muted text-[11px]">
          {t(`campaignAiConfidence_${analysis.confidence}` as MessageKey)}
        </span>
      </div>

      <p className="text-ink text-sm leading-relaxed">{analysis.summary}</p>

      {analysis.bullets.length > 0 ? (
        <ul className="text-muted list-disc space-y-1 ps-5 text-sm">
          {analysis.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {analysis.risks.length > 0 ? (
        <div className="border-border/60 rounded-lg border px-3 py-2">
          <p className="text-muted text-[11px] font-medium">
            {t('campaignAiRisks')}
          </p>
          <ul className="text-muted mt-1 space-y-1 text-xs leading-relaxed">
            {analysis.risks.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        {analysis.actions.map((action) => {
          const labelKey = `campaignAiAction_${action.id}` as MessageKey;
          if (
            action.suggestedStatus &&
            onSuggestedStatus &&
            (action.id === 'pause_campaign' || action.id === 'stop_campaign')
          ) {
            return (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant={
                  action.suggestedStatus === 'ARCHIVED' ? 'outline' : 'default'
                }
                disabled={isBusy}
                onClick={() => onSuggestedStatus(action.suggestedStatus!)}
              >
                {t(labelKey)}
              </Button>
            );
          }
          return (
            <span
              key={action.id}
              className="bg-surface text-muted inline-flex items-center justify-center rounded-full px-3 py-1 text-xs"
            >
              {t(labelKey)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
