import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';

type MessageComposerProps = {
  draft: string;
  isHumanMode: boolean;
  isPending: boolean;
  onDraftChange: (value: string) => void;
  onSend: (content: string) => void;
};

export function MessageComposer({
  draft,
  isHumanMode,
  isPending,
  onDraftChange,
  onSend,
}: MessageComposerProps) {
  const { t } = useLocale();

  return (
    <form
      className="border-border flex shrink-0 gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.trim() || !isHumanMode) return;
        onSend(draft.trim());
      }}
    >
      <input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        disabled={!isHumanMode}
        placeholder={isHumanMode ? t('typeYourReply') : t('inboxTakeoverHint')}
        className="border-border bg-page focus:border-brand/40 h-11 flex-1 rounded-xl border px-3 text-sm outline-none disabled:opacity-70"
      />
      <Button
        type="submit"
        disabled={isPending || !draft.trim() || !isHumanMode}
      >
        {t('send')}
      </Button>
    </form>
  );
}
