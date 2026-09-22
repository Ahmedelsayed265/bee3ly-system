import { PageLayout } from '@/components/layout/page-layout';
import { AgentSettingsForm } from '@/features/ai-agent/components/agent-settings-form';
import { AgentTestArea } from '@/features/ai-agent/components/agent-test-area';
import { useAiAgent } from '@/features/ai-agent/hooks/use-ai-agent';
import { useAiTest } from '@/features/ai-agent/hooks/use-ai-test';
import { useLocale } from '@/features/i18n/locale-context';

export function AiAgentPageView() {
  const { t } = useLocale();
  const agent = useAiAgent();
  const test = useAiTest();

  return (
    <PageLayout title={t('navAi')} description={t('aiIntro')}>
      <div className="flex w-full flex-col gap-4">
        <AgentSettingsForm
          isActive={agent.agent?.isActive}
          handoffEnabled={agent.agent?.handoffEnabled}
          primaryGoal={agent.agent?.primaryGoal}
          tone={agent.agent?.tone}
          instructions={agent.instructions}
          commentReply={agent.commentReply}
          textDirty={agent.textDirty}
          isUpdating={agent.isUpdating}
          onToggleActive={() =>
            agent.setActive(!(agent.agent?.isActive ?? true))
          }
          onToggleHandoff={() =>
            agent.setHandoff(!(agent.agent?.handoffEnabled !== false))
          }
          onGoalChange={agent.setGoal}
          onToneChange={agent.setTone}
          onInstructionsChange={agent.setInstructions}
          onCommentReplyChange={agent.setCommentReply}
          onSaveContent={agent.saveContent}
        />

        <AgentTestArea
          draft={test.draft}
          reply={test.reply}
          isPending={test.isPending}
          onDraftChange={test.setDraft}
          onSend={test.send}
        />
      </div>
    </PageLayout>
  );
}
