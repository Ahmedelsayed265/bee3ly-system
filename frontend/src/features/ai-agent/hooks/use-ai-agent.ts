import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AiGoal, AiTone } from '@/features/ai-agent/constants';
import { fetchAiAgent, updateAiAgent } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

type AgentForm = {
  agentId: string | null;
  instructions: string;
  commentReply: string;
};

export function useAiAgent() {
  const { t } = useLocale();
  const qc = useQueryClient();

  const agentQuery = useQuery({
    queryKey: ['ai-agent'],
    queryFn: fetchAiAgent,
  });
  const agent = agentQuery.data;

  const [form, setForm] = useState<AgentForm>({
    agentId: null,
    instructions: '',
    commentReply: '',
  });

  const agentId = agent?.id ?? null;
  if (agent && agentId !== form.agentId) {
    setForm({
      agentId,
      instructions: agent.instructions ?? '',
      commentReply: agent.commentFixedReply ?? '',
    });
  }

  const updateMut = useMutation({
    mutationFn: updateAiAgent,
    onSuccess: async (updated) => {
      if (updated) {
        setForm({
          agentId: updated.id,
          instructions: updated.instructions ?? '',
          commentReply: updated.commentFixedReply ?? '',
        });
      }
      await qc.invalidateQueries({ queryKey: ['ai-agent'] });
      toast.success(t('profileSaved'));
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const instructions = form.instructions;
  const commentReply = form.commentReply;

  const textDirty =
    form.agentId === agent?.id &&
    ((instructions.trim() || null) !== (agent?.instructions ?? null) ||
      (commentReply.trim() || null) !== (agent?.commentFixedReply ?? null));

  return {
    agent,
    isLoading: agentQuery.isLoading,
    isUpdating: updateMut.isPending,
    instructions,
    setInstructions: (next: string) =>
      setForm((current) => ({ ...current, instructions: next })),
    commentReply,
    setCommentReply: (next: string) =>
      setForm((current) => ({ ...current, commentReply: next })),
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
