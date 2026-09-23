import { BookOpen, MessagesSquare } from 'lucide-react';
import type { MessageKey } from '@/features/i18n/messages';
import { useLocale } from '@/features/i18n/locale-context';
import type { SettingsTab } from '@/features/settings/types';
import { cn } from '@/lib/utils';

const TABS: Array<{
  id: SettingsTab;
  labelKey: MessageKey;
  icon: typeof MessagesSquare;
}> = [
  { id: 'social', labelKey: 'socialAccounts', icon: MessagesSquare },
  { id: 'knowledge', labelKey: 'businessKnowledge', icon: BookOpen },
];

type SettingsTabsProps = {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ tab, onTabChange }: SettingsTabsProps) {
  const { t } = useLocale();

  return (
    <div className="border-border flex w-full gap-6 border-b">
      {TABS.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition',
              active
                ? 'border-brand text-brand'
                : 'text-muted hover:text-ink border-transparent',
            )}
          >
            <Icon className="h-4 w-4" />
            {t(item.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
