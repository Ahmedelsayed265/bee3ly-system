import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/page-layout';
import { ProfileAccountSection } from '@/features/profile/components/profile-account-section';
import { ProfileSecuritySection } from '@/features/profile/components/profile-security-section';
import { ProfileSupportSection } from '@/features/profile/components/profile-support-section';
import { usePasswordForm } from '@/features/profile/hooks/use-password-form';
import { useProfileForm } from '@/features/profile/hooks/use-profile-form';
import { paths } from '@/routes/paths';

export function ProfilePageView() {
  const {
    user,
    name,
    setName,
    businessName,
    setBusinessName,
    businessType,
    setBusinessType,
    businessTypeOptions,
    profileMut,
    t,
  } = useProfileForm();

  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordMut,
    submitPassword,
  } = usePasswordForm();

  return (
    <PageLayout
      title={t('navProfile')}
      description={t('profileIntro')}
      actions={
        <Link
          to={paths.billing}
          className="border-border bg-surface text-brand hover:bg-lavender rounded-xl border px-3 py-2 text-sm font-semibold"
        >
          {t('managePlan')}
        </Link>
      }
    >
      <div className="grid w-full gap-4 xl:grid-cols-2">
        <ProfileAccountSection
          name={name}
          email={user?.email ?? ''}
          businessName={businessName}
          businessType={businessType}
          businessTypeOptions={businessTypeOptions}
          isPending={profileMut.isPending}
          onNameChange={setName}
          onBusinessNameChange={setBusinessName}
          onBusinessTypeChange={setBusinessType}
          onSave={() => profileMut.mutate()}
          t={t}
        />

        <ProfileSecuritySection
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          isPending={passwordMut.isPending}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={submitPassword}
          t={t}
        />

        <ProfileSupportSection t={t} />
      </div>
    </PageLayout>
  );
}
