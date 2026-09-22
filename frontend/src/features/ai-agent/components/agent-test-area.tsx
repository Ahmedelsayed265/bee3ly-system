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
    <div className="border-border bg-surface space-y-3 rounded-2xl border p-5 xl:col-span-2">
      <p className="text-ink text-sm font-medium">{t('aiTestArea')}</p>
      <div className="flex flex-wrap gap-2">
        <input
          className="border-border bg-page h-10 min-w-[220px] flex-1 rounded-xl border px-3 text-sm"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
        />
        <Button
          size="sm"
          disabled={isPending || !draft.trim()}
          onClick={onSend}
        >
          {t('send')}
        </Button>
      </div>
      {reply ? (
        <div className="bg-lavender/70 text-ink rounded-xl px-3 py-2 text-sm">
          {reply}
        </div>
      ) : null}
    </div>
  );
}
