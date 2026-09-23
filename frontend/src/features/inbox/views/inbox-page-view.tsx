import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/features/auth/auth-context';
import { ConversationList } from '@/features/inbox/components/conversation-list';
import { ConversationThread } from '@/features/inbox/components/conversation-thread';
import { useInbox } from '@/features/inbox/hooks/use-inbox';
import { useLocale } from '@/features/i18n/locale-context';

export function InboxPageView() {
  const { t } = useLocale();
  const { business } = useAuth();
  const {
    conversations,
    selectedId,
    setSelectedId,
    conversation,
    latestOrder,
    messages,
    isHumanMode,
    draft,
    setDraft,
    messagesEndRef,
    isSending,
    isModePending,
    sendMessage,
    setMode,
    pendingDelete,
    setPendingDelete,
    isDeleting,
    confirmDelete,
  } = useInbox();

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-ink text-2xl font-bold">{t('navInbox')}</h1>
        <p className="text-muted mt-1 text-sm">{t('inboxIntro')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(10rem,32%)_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[320px_1fr] lg:grid-rows-none">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <ConversationThread
          conversation={conversation}
          messages={messages}
          selectedId={selectedId}
          isHumanMode={Boolean(isHumanMode)}
          isModePending={isModePending}
          draft={draft}
          isSending={isSending}
          messagesEndRef={messagesEndRef}
          replyContext={{
            businessName: business?.name ?? '',
            customerName: conversation?.customer.name ?? null,
            customerPhone: conversation?.customer.phone ?? null,
            order: latestOrder,
          }}
          onDraftChange={setDraft}
          onSend={sendMessage}
          onSetMode={setMode}
          onDeleteRequest={() => setPendingDelete(true)}
        />
      </div>

      <ConfirmDialog
        open={pendingDelete}
        title={t('confirmDeleteConversationTitle')}
        description={t('confirmDeleteConversationBody', {
          name: conversation?.customer.name ?? t('unknownCustomer'),
        })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        pending={isDeleting}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(false);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
