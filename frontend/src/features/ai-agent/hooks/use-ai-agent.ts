import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AiGoal, AiTone } from '@/features/ai-agent/constants';
import { fetchAiAgent, updateAiAgent } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

export function useAiAgent() {
  const { t } = useLocale();
  const qc = useQueryClient();

  const agentQuery = useQuery({
    queryKey: ['ai-agent'],
    queryFn: fetchAiAgent,
  });
  const agent = agentQuery.data;

  const [instructions, setInstructions] = useState('');
  const [commentReply, setCommentReply] = useState('');
  const [hydratedForId, setHydratedForId] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) return;
    if (hydratedForId === agent.id) return;
    setInstructions(agent.instructions ?? '');
    setCommentReply(agent.commentFixedReply ?? '');
    setHydratedForId(agent.id);
  }, [agent, hydratedForId]);

  const updateMut = useMutation({
    mutationFn: updateAiAgent,
    onSuccess: async (updated) => {
      if (updated) {
        setInstructions(updated.instructions ?? '');
        setCommentReply(updated.commentFixedReply ?? '');
      }
      await qc.invalidateQueries({ queryKey: ['ai-agent'] });
      toast.success(t('profileSaved'));
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const textDirty =
    hydratedForId === agent?.id &&
    ((instructions.trim() || null) !== (agent?.instructions ?? null) ||
      (commentReply.trim() || null) !== (agent?.commentFixedReply ?? null));

  return {
    agent,
    isLoading: agentQuery.isLoading,
    isUpdating: updateMut.isPending,
    instructions,
    setInstructions,
    commentReply,
    setCommentReply,
    textDirty,
    setActive: (isActive: boolean) => updateMut.mutate({ isActive }),
    setHandoff: (handoffEnabled: boolean) =>
      updateMut.mutate({ handoffEnabled }),
    setGoal: (primaryGoal: AiGoal) => updateMut.mutate({ primaryGoal }),
    setTone: (tone: AiTone) => updateMut.mutate({ tone }),
    saveContent: () =>
      updateMut.mutate({
        instructions: instructions.trim() || null,
        commentFixedReply: commentReply.trim() || null,
      }),
  };
}
