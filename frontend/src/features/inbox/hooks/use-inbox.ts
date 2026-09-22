import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  deleteConversation,
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
  const [pendingDelete, setPendingDelete] = useState(false);

  const listQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const activeId = selectedId ?? listQuery.data?.[0]?.id ?? null;

  const detailQuery = useQuery({
    queryKey: ['conversation', activeId],
    queryFn: () => fetchConversation(activeId!),
    enabled: Boolean(activeId),
  });

  const conversation = detailQuery.data?.conversation;
  const isHumanMode =
    conversation?.mode === 'HUMAN' || conversation?.needsHuman;
  const messages = conversation?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeId, messages.length]);

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
      if (!activeId || !isHumanMode) {
        throw new Error('HUMAN_MODE_REQUIRED');
      }
      await sendHumanMessage(activeId, content);
      return { conversationId: activeId };
    },
    onSuccess: async (data) => {
      setDraft('');
      await invalidateAll(data.conversationId);
    },
  });

  const modeMut = useMutation({
    mutationFn: (mode: 'AI' | 'HUMAN') => setConversationMode(activeId!, mode),
    onSuccess: async () => {
      await invalidateAll(activeId ?? undefined);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteConversation(activeId!),
    onSuccess: async () => {
      const deletedId = activeId;
      setPendingDelete(false);
      setSelectedId(null);
      setDraft('');
      if (deletedId) {
        qc.removeQueries({ queryKey: ['conversation', deletedId] });
      }
      await invalidateAll();
    },
  });

  return {
    conversations: listQuery.data ?? [],
    selectedId: activeId,
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
    pendingDelete,
    setPendingDelete,
    isDeleting: deleteMut.isPending,
    confirmDelete: () => {
      if (activeId) deleteMut.mutate();
    },
  };
}
