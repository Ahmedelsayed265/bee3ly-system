import { AI_GOALS, type AiGoal } from '@/features/ai-agent/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type AgentGoalPickerProps = {
  selected?: string;
  onSelect: (goal: AiGoal) => void;
};

export function AgentGoalPicker({ selected, onSelect }: AgentGoalPickerProps) {
  const { t } = useLocale();

  return (
    <div className="border-border bg-surface space-y-3 rounded-2xl border p-5">
      <p className="text-ink text-sm font-medium">{t('aiPrimaryGoal')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {AI_GOALS.map((goal) => (
          <button
            key={goal}
            type="button"
            onClick={() => onSelect(goal)}
            className={cn(
              'rounded-xl border px-3 py-3 text-start text-sm transition',
              selected === goal
                ? 'border-brand bg-brand/10'
                : 'border-border hover:bg-lavender',
            )}
          >
            {t(`aiGoal_${goal}` as MessageKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
