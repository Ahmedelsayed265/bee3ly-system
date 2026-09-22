import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';

type AgentTestAreaProps = {
  draft: string;
  reply: string | null;
  isPending: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

export function AgentTestArea({
  draft,
  reply,
  isPending,
  onDraftChange,
  onSend,
}: AgentTestAreaProps) {
  const { t } = useLocale();

  return (
    <section className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <div>
        <h2 className="text-ink text-sm font-semibold">{t('aiTestArea')}</h2>
        <p className="text-muted mt-1 text-xs">{t('aiTestAreaHint')}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="border-border bg-page focus:border-brand/40 h-10 w-full flex-1 rounded-xl border px-3 text-sm outline-none"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t('aiTestPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim() && !isPending) onSend();
          }}
        />
        <Button
          size="sm"
          className="shrink-0"
          disabled={isPending || !draft.trim()}
          onClick={onSend}
        >
          {isPending ? t('aiTesting') : t('send')}
        </Button>
      </div>

      {reply ? (
        <div className="border-border bg-page rounded-xl border px-3 py-3 text-sm">
          <p className="text-muted mb-1 text-[11px] font-medium tracking-wide uppercase">
            {t('aiTestReply')}
          </p>
          <p className="text-ink whitespace-pre-wrap">{reply}</p>
        </div>
      ) : (
        <p className="text-muted text-xs">{t('aiTestEmpty')}</p>
      )}
    </section>
  );
}
