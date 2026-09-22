import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import type { MessageKey } from '@/features/i18n/messages';

type ProfileSecuritySectionProps = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isPending: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
  t: (key: MessageKey) => string;
};

export function ProfileSecuritySection({
  currentPassword,
  newPassword,
  confirmPassword,
  isPending,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  t,
}: ProfileSecuritySectionProps) {
  return (
    <section className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <h2 className="text-ink font-semibold">{t('securitySection')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id="currentPassword"
          type="password"
          label={t('currentPassword')}
          value={currentPassword}
          onChange={(e) => onCurrentPasswordChange(e.target.value)}
          autoComplete="current-password"
          containerClassName="sm:col-span-2"
        />
        <InputField
          id="newPassword"
          type="password"
          label={t('newPassword')}
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          autoComplete="new-password"
        />
        <InputField
          id="confirmPassword"
          type="password"
          label={t('confirmPassword')}
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button variant="outline" onClick={onSubmit} disabled={isPending}>
        {isPending ? t('saving') : t('changePassword')}
      </Button>
    </section>
  );
}
