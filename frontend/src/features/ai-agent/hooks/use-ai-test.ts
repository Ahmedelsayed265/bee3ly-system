import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { simulateMessage } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

export function useAiTest() {
  const { t } = useLocale();
  const [draft, setDraft] = useState('بكام؟');
  const [reply, setReply] = useState<string | null>(null);

  const testMut = useMutation({
    mutationFn: () => simulateMessage(draft),
    onSuccess: (data) => {
      setReply(
        data.paused ? t('aiPausedNotice') : (data.reply ?? t('aiPausedNotice')),
      );
    },
  });

  return {
    draft,
    setDraft,
    reply,
    isPending: testMut.isPending,
    send: () => testMut.mutate(),
  };
}
