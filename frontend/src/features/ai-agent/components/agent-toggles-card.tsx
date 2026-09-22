import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';

type AgentTogglesCardProps = {
  isActive?: boolean;
  handoffEnabled?: boolean;
  onToggleActive: () => void;
  onToggleHandoff: () => void;
};

export function AgentTogglesCard({
  isActive,
  handoffEnabled,
  onToggleActive,
  onToggleHandoff,
}: AgentTogglesCardProps) {
  const { t } = useLocale();
  const handoffOn = handoffEnabled !== false;

  return (
    <div className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-ink font-semibold">{t('aiActive')}</p>
          <p className="text-muted text-xs">{t('aiActiveHint')}</p>
        </div>
        <Button
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          onClick={onToggleActive}
        >
          {isActive ? t('on') : t('off')}
        </Button>
      </div>

      <div className="border-border flex items-center justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-ink font-semibold">{t('aiHandoff')}</p>
          <p className="text-muted text-xs">{t('aiHandoffHint')}</p>
        </div>
        <Button
          size="sm"
          variant={handoffOn ? 'default' : 'outline'}
          onClick={onToggleHandoff}
        >
          {handoffOn ? t('on') : t('off')}
        </Button>
      </div>
    </div>
  );
}
