import { AI_TONES, type AiTone } from '@/features/ai-agent/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type AgentTonePickerProps = {
  selected?: string;
  onSelect: (tone: AiTone) => void;
};

export function AgentTonePicker({ selected, onSelect }: AgentTonePickerProps) {
  const { t } = useLocale();
  const current = selected ?? 'FRIENDLY';

  return (
    <div className="border-border bg-surface space-y-3 rounded-2xl border p-5">
      <p className="text-ink text-sm font-medium">{t('aiTone')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {AI_TONES.map((tone) => (
          <button
            key={tone}
            type="button"
            onClick={() => onSelect(tone)}
            className={cn(
              'rounded-xl border px-3 py-3 text-start text-sm',
              current === tone
                ? 'border-brand bg-brand/10'
                : 'border-border hover:bg-lavender',
            )}
          >
            {t(`aiTone_${tone}` as MessageKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
