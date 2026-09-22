import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

type AgentInstructionsCardProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function AgentInstructionsCard({
  value,
  onChange,
  onSave,
}: AgentInstructionsCardProps) {
  const { t } = useLocale();

  return (
    <div className="border-border bg-surface space-y-3 rounded-2xl border p-5">
      <p className="text-ink text-sm font-medium">{t('aiInstructions')}</p>
      <p className="text-muted text-xs">{t('aiInstructionsHint')}</p>
      <textarea
        className="border-border bg-page focus:border-brand/40 min-h-24 w-full rounded-xl border px-3 py-2 text-sm outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button size="sm" variant="outline" onClick={onSave}>
        {t('saveProfile')}
      </Button>
      <p className="text-muted text-xs">
        <Link to={paths.products} className="text-brand">
          {t('navProducts')}
        </Link>
        {' · '}
        <Link to={paths.settings} className="text-brand">
          {t('businessKnowledge')}
        </Link>
      </p>
    </div>
  );
}
