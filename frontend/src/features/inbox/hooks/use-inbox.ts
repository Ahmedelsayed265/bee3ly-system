import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deleteConversation,
  fetchConversation,
  fetchConversations,
  sendHumanMessage,
  setConversationMode,
} from '@/features/business/api';

export function useInbox() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const campaignId = params.get('campaignId') ?? '';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState(false);

  const listQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const conversations = (listQuery.data ?? []).filter((item) =>
    campaignId ? item.campaign?.id === campaignId : true,
  );
  const activeId =
    selectedId && conversations.some((item) => item.id === selectedId)
      ? selectedId
      : (conversations[0]?.id ?? null);

  const detailQuery = useQuery({
    queryKey: ['conversation', activeId],
    queryFn: () => fetchConversation(activeId!),
    enabled: Boolean(activeId),
  });

  const conversation = detailQuery.data?.conversation;
  const latestOrder = detailQuery.data?.orders?.[0] ?? null;
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
    mutationFn: async (input: {
      content: string;
      quickReplies?: Array<{ title: string; payload: string }>;
    }) => {
      if (!activeId || !isHumanMode) {
        throw new Error('HUMAN_MODE_REQUIRED');
      }
      await sendHumanMessage(activeId, input.content, input.quickReplies);
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
    conversations,
    selectedId: activeId,
    setSelectedId,
    conversation,
    latestOrder,
    messages,
    isHumanMode,
    draft,
    setDraft,
    messagesEndRef,
    isSending: sendMut.isPending,
    isModePending: modeMut.isPending,
    sendMessage: (
      content: string,
      quickReplies?: Array<{ title: string; payload: string }>,
    ) => sendMut.mutate({ content, quickReplies }),
    setMode: (mode: 'AI' | 'HUMAN') => modeMut.mutate(mode),
    pendingDelete,
    setPendingDelete,
    isDeleting: deleteMut.isPending,
    confirmDelete: () => {
      if (activeId) deleteMut.mutate();
    },
  };
}
