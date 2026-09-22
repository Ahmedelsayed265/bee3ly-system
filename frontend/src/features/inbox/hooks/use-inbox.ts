import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  fetchConversation,
  fetchConversations,
  sendHumanMessage,
  setConversationMode,
} from '@/features/business/api';

export function useInbox() {
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const listQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  useEffect(() => {
    if (!selectedId && listQuery.data?.[0]?.id) {
      setSelectedId(listQuery.data[0].id);
    }
  }, [listQuery.data, selectedId]);

  const detailQuery = useQuery({
    queryKey: ['conversation', selectedId],
    queryFn: () => fetchConversation(selectedId!),
    enabled: Boolean(selectedId),
  });

  const conversation = detailQuery.data?.conversation;
  const isHumanMode =
    conversation?.mode === 'HUMAN' || conversation?.needsHuman;
  const messages = conversation?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [selectedId, messages.length]);

  const invalidateAll = async (conversationId?: string) => {
    await qc.invalidateQueries({ queryKey: ['conversations'] });
    if (conversationId) {
      await qc.invalidateQueries({
        queryKey: ['conversation', conversationId],
      });
    }
    await qc.invalidateQueries({ queryKey: ['orders'] });
    await qc.invalidateQueries({ queryKey: ['notifications'] });
    await qc.invalidateQueries({ queryKey: ['overview'] });
    await qc.invalidateQueries({ queryKey: ['leads'] });
  };

  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedId || !isHumanMode) {
        throw new Error('HUMAN_MODE_REQUIRED');
      }
      await sendHumanMessage(selectedId, content);
      return { conversationId: selectedId };
    },
    onSuccess: async (data) => {
      setDraft('');
      await invalidateAll(data.conversationId);
    },
  });

  const modeMut = useMutation({
    mutationFn: (mode: 'AI' | 'HUMAN') =>
      setConversationMode(selectedId!, mode),
    onSuccess: async () => {
      await invalidateAll(selectedId ?? undefined);
    },
  });

  return {
    conversations: listQuery.data ?? [],
    selectedId,
    setSelectedId,
    conversation,
    messages,
    isHumanMode,
    draft,
    setDraft,
    messagesEndRef,
    isSending: sendMut.isPending,
    isModePending: modeMut.isPending,
    sendMessage: (content: string) => sendMut.mutate(content),
    setMode: (mode: 'AI' | 'HUMAN') => modeMut.mutate(mode),
  };
}
