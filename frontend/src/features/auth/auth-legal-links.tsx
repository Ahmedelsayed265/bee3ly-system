import { Link } from 'react-router-dom';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export function AuthLegalLinks() {
  const { t } = useLocale();

  return (
    <p className="text-muted relative z-10 mx-auto mt-4 max-w-128 text-center text-xs">
      <Link
        to={paths.privacyPolicy}
        className="hover:text-brand underline-offset-2 hover:underline"
      >
        {t('navPrivacyPolicy')}
      </Link>
      <span className="mx-2">·</span>
      <Link
        to={paths.terms}
        className="hover:text-brand underline-offset-2 hover:underline"
      >
        {t('navTermsConditions')}
      </Link>
    </p>
  );
}
