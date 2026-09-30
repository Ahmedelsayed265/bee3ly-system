import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CampaignFilterBanner } from '@/features/campaigns/components/campaign-filter-banner';
import { useAuth } from '@/features/auth/auth-context';
import { ConversationList } from '@/features/inbox/components/conversation-list';
import { ConversationThread } from '@/features/inbox/components/conversation-thread';
import { useInbox } from '@/features/inbox/hooks/use-inbox';
import { useLocale } from '@/features/i18n/locale-context';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

export function InboxPageView() {
  const { t } = useLocale();
  const { business } = useAuth();
  const [params] = useSearchParams();
  const {
    conversations,
    selectedId,
    setSelectedId,
    conversation,
    latestOrder,
    messages,
    isHumanMode,
    paymentReviewPending,
    draft,
    setDraft,
    messagesEndRef,
    isListLoading,
    isDetailLoading,
    isSending,
    isModePending,
    isConfirmPaymentPending,
    confirmPayment,
    sendMessage,
    setMode,
    pendingDelete,
    setPendingDelete,
    isDeleting,
    confirmDelete,
  } = useInbox();
  const isWideInbox = useMediaQuery('(min-width: 1024px)');
  const mobileThreadOpen = !isWideInbox && Boolean(selectedId);

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-4 overflow-hidden',
        'max-lg:min-h-[calc(100dvh-7.5rem)] lg:h-full lg:min-h-0 lg:flex-1',
      )}
    >
      <div className="shrink-0 space-y-3">
        <div>
          <h1 className="text-ink text-2xl font-bold">{t('navInbox')}</h1>
          <p className="text-muted mt-1 text-sm">{t('inboxIntro')}</p>
        </div>
        <CampaignFilterBanner />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,320px)_1fr]">
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-col',
            mobileThreadOpen && 'hidden lg:flex',
          )}
        >
          <ConversationList
            className="min-h-0 flex-1"
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isListLoading}
            emptyLabel={
              params.get('campaignId') ? 'campaignFilteredEmpty' : undefined
            }
          />
        </div>

        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-col',
            !isWideInbox && !selectedId && 'hidden lg:flex',
          )}
        >
          <ConversationThread
            className="min-h-0 flex-1"
            conversation={conversation}
            isLoading={isDetailLoading}
            messages={messages}
            selectedId={selectedId}
            isHumanMode={Boolean(isHumanMode)}
            paymentReviewPending={Boolean(paymentReviewPending)}
            isModePending={isModePending}
            isConfirmPaymentPending={isConfirmPaymentPending}
            onConfirmPayment={confirmPayment}
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
            onBack={mobileThreadOpen ? () => setSelectedId(null) : undefined}
          />
        </div>
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
