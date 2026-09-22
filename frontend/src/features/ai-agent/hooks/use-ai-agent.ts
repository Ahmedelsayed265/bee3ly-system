import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchAiAgent, updateAiAgent } from '@/features/business/api';

export function useAiAgent() {
  const qc = useQueryClient();
  const [instructionsDraft, setInstructionsDraft] = useState<string | null>(
    null,
  );

  const agentQuery = useQuery({
    queryKey: ['ai-agent'],
    queryFn: fetchAiAgent,
  });

  const updateMut = useMutation({
    mutationFn: updateAiAgent,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ai-agent'] });
    },
  });

  const agent = agentQuery.data;
  const instructionValue = instructionsDraft ?? agent?.instructions ?? '';

  return {
    agent,
    isLoading: agentQuery.isLoading,
    isUpdating: updateMut.isPending,
    instructionValue,
    setInstructionsDraft,
    updateAgent: updateMut.mutate,
    saveInstructions: () =>
      updateMut.mutate({
        instructions: instructionValue.trim() || null,
      }),
  };
}
