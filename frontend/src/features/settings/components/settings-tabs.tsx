import type { MessageKey } from '@/features/i18n/messages';
import { useLocale } from '@/features/i18n/locale-context';
import type { SettingsTab } from '@/features/settings/types';
import { cn } from '@/lib/utils';

const TABS: Array<{ id: SettingsTab; labelKey: MessageKey }> = [
  { id: 'social', labelKey: 'socialAccounts' },
  { id: 'knowledge', labelKey: 'businessKnowledge' },
];

type SettingsTabsProps = {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ tab, onTabChange }: SettingsTabsProps) {
  const { t } = useLocale();

  return (
    <div className="border-border bg-surface flex w-full gap-1 rounded-xl border p-1 sm:max-w-md">
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            tab === item.id
              ? 'bg-brand text-white'
              : 'text-muted hover:bg-lavender hover:text-ink',
          )}
        >
          {t(item.labelKey)}
        </button>
      ))}
    </div>
  );
}
