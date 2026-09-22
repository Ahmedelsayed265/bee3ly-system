import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { SelectField } from '@/components/ui/select-field';
import type { BusinessType } from '@/features/business/api';
import type { MessageKey } from '@/features/i18n/messages';

type ProfileAccountSectionProps = {
  name: string;
  email: string;
  businessName: string;
  businessType: BusinessType;
  businessTypeOptions: Array<{ value: string; label: string }>;
  isPending: boolean;
  onNameChange: (value: string) => void;
  onBusinessNameChange: (value: string) => void;
  onBusinessTypeChange: (value: BusinessType) => void;
  onSave: () => void;
  t: (key: MessageKey) => string;
};

export function ProfileAccountSection({
  name,
  email,
  businessName,
  businessType,
  businessTypeOptions,
  isPending,
  onNameChange,
  onBusinessNameChange,
  onBusinessTypeChange,
  onSave,
  t,
}: ProfileAccountSectionProps) {
  return (
    <section className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <h2 className="text-ink font-semibold">{t('accountSection')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id="profileName"
          label={t('name')}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <InputField
          id="profileEmail"
          label={t('email')}
          value={email}
          disabled
        />
        <InputField
          id="bizName"
          label={t('businessName')}
          value={businessName}
          onChange={(e) => onBusinessNameChange(e.target.value)}
        />
        <SelectField
          id="bizType"
          label={t('businessType')}
          value={businessType}
          onValueChange={(v) => onBusinessTypeChange(v as BusinessType)}
          options={businessTypeOptions}
        />
      </div>
      <Button onClick={onSave} disabled={isPending || name.trim().length < 2}>
        {isPending ? t('saving') : t('saveProfile')}
      </Button>
    </section>
  );
}
