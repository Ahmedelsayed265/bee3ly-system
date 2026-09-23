import Picker, { Theme } from 'emoji-picker-react';
import { useLocale } from '@/features/i18n/locale-context';
import { useTheme } from '@/features/theme/theme-context';

type EmojiPickerProps = {
  onPick: (emoji: string) => void;
};

export function EmojiPicker({ onPick }: EmojiPickerProps) {
  const { t } = useLocale();
  const { theme } = useTheme();

  return (
    <Picker
      width={320}
      height={420}
      theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
      searchPlaceHolder={t('emojiSearch')}
      lazyLoadEmojis
      onEmojiClick={(emoji) => onPick(emoji.emoji)}
    />
  );
}
