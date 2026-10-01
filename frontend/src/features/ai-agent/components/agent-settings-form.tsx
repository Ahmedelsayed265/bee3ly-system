import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AI_GOALS,
  AI_TONES,
  type AiGoal,
  type AiTone,
} from '@/features/ai-agent/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

type AgentSettingsFormProps = {
  isActive?: boolean;
  handoffEnabled?: boolean;
  primaryGoal?: string;
  tone?: string;
  instructions: string;
  commentReply: string;
  textDirty: boolean;
  isUpdating: boolean;
  onToggleActive: () => void;
  onToggleHandoff: () => void;
  onGoalChange: (goal: AiGoal) => void;
  onToneChange: (tone: AiTone) => void;
  onInstructionsChange: (value: string) => void;
  onCommentReplyChange: (value: string) => void;
  onSaveContent: () => void;
};

export function AgentSettingsForm({
  isActive,
  handoffEnabled,
  primaryGoal,
  tone,
  instructions,
  commentReply,
  textDirty,
  isUpdating,
  onToggleActive,
  onToggleHandoff,
  onGoalChange,
  onToneChange,
  onInstructionsChange,
  onCommentReplyChange,
  onSaveContent,
}: AgentSettingsFormProps) {
  const { t } = useLocale();
  const handoffOn = handoffEnabled !== false;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="border-border bg-surface space-y-5 rounded-2xl border p-5">
        <div>
          <h2 className="text-ink text-sm font-semibold">
            {t('aiSectionBehavior')}
          </h2>
          <p className="text-muted mt-1 text-xs">
            {t('aiSectionBehaviorHint')}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium">{t('aiActive')}</p>
              <p className="text-muted text-xs">{t('aiActiveHint')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(isActive)}
              onClick={onToggleActive}
              disabled={isUpdating}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition',
                isActive ? 'bg-brand' : 'bg-border',
              )}
            >
              <span
                className={cn(
                  'bg-surface absolute top-0.5 left-0.5 size-6 rounded-full transition',
                  isActive && 'translate-x-5',
                )}
              />
            </button>
          </div>

          <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium">{t('aiHandoff')}</p>
              <p className="text-muted text-xs">{t('aiHandoffHint')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={handoffOn}
              onClick={onToggleHandoff}
              disabled={isUpdating}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition',
                handoffOn ? 'bg-brand' : 'bg-border',
              )}
            >
              <span
                className={cn(
                  'bg-surface absolute top-0.5 left-0.5 size-6 rounded-full transition',
                  handoffOn && 'translate-x-5',
                )}
              />
            </button>
          </div>
        </div>

        <SingleSelectChecklist
          label={t('aiPrimaryGoal')}
          value={(primaryGoal ?? 'GET_ORDERS') as AiGoal}
          disabled={isUpdating}
          options={AI_GOALS.map((goal) => ({
            value: goal,
            label: t(`aiGoal_${goal}` as MessageKey),
          }))}
          onChange={onGoalChange}
        />

        <SingleSelectChecklist
          label={t('aiTone')}
          value={(tone ?? 'FRIENDLY') as AiTone}
          disabled={isUpdating}
          options={AI_TONES.map((item) => ({
            value: item,
            label: t(`aiTone_${item}` as MessageKey),
          }))}
          onChange={onToneChange}
        />
      </section>

      <section className="border-border bg-surface flex flex-col gap-5 rounded-2xl border p-5">
        <div>
          <h2 className="text-ink text-sm font-semibold">
            {t('aiSectionContent')}
          </h2>
          <p className="text-muted mt-1 text-xs">{t('aiSectionContentHint')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-ink text-sm font-medium">
            {t('aiInstructions')}
          </label>
          <p className="text-muted text-xs">{t('aiInstructionsHint')}</p>
          <textarea
            className="border-border bg-page focus:border-brand/40 min-h-28 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            value={instructions}
            onChange={(e) => onInstructionsChange(e.target.value)}
            placeholder={t('aiInstructionsPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label className="text-ink text-sm font-medium">
            {t('aiCommentReply')}
          </label>
          <p className="text-muted text-xs">{t('aiCommentReplyHint')}</p>
          <textarea
            className="border-border bg-page focus:border-brand/40 min-h-24 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            value={commentReply}
            onChange={(e) => onCommentReplyChange(e.target.value)}
            placeholder={t('aiCommentReplyPlaceholder')}
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-muted text-xs">
            <Link to={paths.settings} className="text-brand hover:underline">
              {t('businessKnowledge')}
            </Link>
            {' · '}
            <Link to={paths.products} className="text-brand hover:underline">
              {t('navProducts')}
            </Link>
          </p>
          <Button
            size="sm"
            disabled={!textDirty || isUpdating}
            onClick={onSaveContent}
          >
            {t('saveProfile')}
          </Button>
        </div>
      </section>
    </div>
  );
}

function SingleSelectChecklist<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const groupId = label.replace(/\s+/g, '-');

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-ink text-sm font-medium">{label}</legend>
      <ul className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const id = `${groupId}-${option.value}`;
          const checked = value === option.value;
          return (
            <li key={option.value} className="min-w-0">
              <label
                htmlFor={id}
                className={cn(
                  'border-border flex h-full min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition',
                  checked && 'border-brand/40 bg-brand/5',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(next) => {
                    if (next === true) onChange(option.value);
                  }}
                />
                <span className="text-ink font-normal">{option.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
