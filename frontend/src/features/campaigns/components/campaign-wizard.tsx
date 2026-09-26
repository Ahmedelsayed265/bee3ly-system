import { CampaignAudienceStep } from '@/features/campaigns/components/campaign-audience-step';
import { CampaignBudgetStep } from '@/features/campaigns/components/campaign-budget-step';
import { CampaignGoalStep } from '@/features/campaigns/components/campaign-goal-step';
import { CampaignOfferStep } from '@/features/campaigns/components/campaign-offer-step';
import { CampaignReadyStep } from '@/features/campaigns/components/campaign-ready-step';
import { CampaignValueStep } from '@/features/campaigns/components/campaign-value-step';
import type { CampaignObjective } from '@/features/campaigns/constants';
import type { Campaign } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';

const STEP_COUNT = 6;

type CampaignWizardProps = {
  step: number;
  onStepChange: (step: number) => void;
  offer: string;
  onOfferChange: (value: string) => void;
  productId: string;
  onProductChange: (value: string) => void;
  adCopy: string;
  onAdCopyChange: (value: string) => void;
  objective: CampaignObjective;
  onObjectiveChange: (value: CampaignObjective) => void;
  audience: string;
  onAudienceChange: (value: string) => void;
  budget: string;
  onBudgetChange: (value: string) => void;
  valueProp: string;
  onValuePropChange: (value: string) => void;
  created: Campaign | null;
  notice: string | null;
  isCreating: boolean;
  isLaunching: boolean;
  onGenerate: () => void;
  onRequestLaunch: (status: 'ASSISTED_LAUNCH' | 'SIMULATED') => void;
  onReset: () => void;
};

export function CampaignWizard({
  step,
  onStepChange,
  offer,
  onOfferChange,
  productId,
  onProductChange,
  adCopy,
  onAdCopyChange,
  objective,
  onObjectiveChange,
  audience,
  onAudienceChange,
  budget,
  onBudgetChange,
  valueProp,
  onValuePropChange,
  created,
  notice,
  isCreating,
  isLaunching,
  onGenerate,
  onRequestLaunch,
  onReset,
}: CampaignWizardProps) {
  const { t } = useLocale();

  return (
    <section className="border-border bg-surface w-full rounded-2xl border p-5 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                index <= step ? 'bg-brand' : 'bg-border',
              )}
            />
          ))}
        </div>
        <p className="text-muted shrink-0 text-xs">
          {t('campaignStepCount', {
            step: String(step + 1),
            total: String(STEP_COUNT),
          })}
        </p>
      </div>

      {step === 0 ? (
        <CampaignOfferStep
          offer={offer}
          onOfferChange={onOfferChange}
          productId={productId}
          onProductChange={onProductChange}
          adCopy={adCopy}
          onAdCopyChange={onAdCopyChange}
          onNext={() => onStepChange(1)}
        />
      ) : null}

      {step === 1 ? (
        <CampaignGoalStep
          objective={objective}
          onObjectiveChange={onObjectiveChange}
          onBack={() => onStepChange(0)}
          onNext={() => onStepChange(2)}
        />
      ) : null}

      {step === 2 ? (
        <CampaignAudienceStep
          audience={audience}
          onAudienceChange={onAudienceChange}
          onBack={() => onStepChange(1)}
          onNext={() => onStepChange(3)}
        />
      ) : null}

      {step === 3 ? (
        <CampaignBudgetStep
          budget={budget}
          onBudgetChange={onBudgetChange}
          onBack={() => onStepChange(2)}
          onNext={() => onStepChange(4)}
        />
      ) : null}

      {step === 4 ? (
        <CampaignValueStep
          valueProp={valueProp}
          onValuePropChange={onValuePropChange}
          isPending={isCreating}
          onBack={() => onStepChange(3)}
          onGenerate={onGenerate}
        />
      ) : null}

      {step === 5 && created ? (
        <CampaignReadyStep
          campaign={created}
          notice={notice}
          isLaunching={isLaunching}
          onRequestLaunch={onRequestLaunch}
          onReset={onReset}
        />
      ) : null}
    </section>
  );
}
