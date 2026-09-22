import { PageLayout } from '@/components/layout/page-layout';
import { AgentGoalPicker } from '@/features/ai-agent/components/agent-goal-picker';
import { AgentInstructionsCard } from '@/features/ai-agent/components/agent-instructions-card';
import { AgentTestArea } from '@/features/ai-agent/components/agent-test-area';
import { AgentTonePicker } from '@/features/ai-agent/components/agent-tone-picker';
import { AgentTogglesCard } from '@/features/ai-agent/components/agent-toggles-card';
import { useAiAgent } from '@/features/ai-agent/hooks/use-ai-agent';
import { useAiTest } from '@/features/ai-agent/hooks/use-ai-test';
import { useLocale } from '@/features/i18n/locale-context';

export function AiAgentPageView() {
  const { t } = useLocale();
  const {
    agent,
    instructionValue,
    setInstructionsDraft,
    updateAgent,
    saveInstructions,
  } = useAiAgent();
  const test = useAiTest();

  return (
    <PageLayout title={t('navAi')} description={t('aiIntro')}>
      <div className="grid w-full gap-4 xl:grid-cols-2">
        <AgentTogglesCard
          isActive={agent?.isActive}
          handoffEnabled={agent?.handoffEnabled}
          onToggleActive={() => updateAgent({ isActive: !agent?.isActive })}
          onToggleHandoff={() =>
            updateAgent({
              handoffEnabled: !(agent?.handoffEnabled !== false),
            })
          }
        />

        <AgentGoalPicker
          selected={agent?.primaryGoal}
          onSelect={(primaryGoal) => updateAgent({ primaryGoal })}
        />

        <AgentTonePicker
          selected={agent?.tone}
          onSelect={(tone) => updateAgent({ tone })}
        />

        <AgentInstructionsCard
          value={instructionValue}
          onChange={setInstructionsDraft}
          onSave={saveInstructions}
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
