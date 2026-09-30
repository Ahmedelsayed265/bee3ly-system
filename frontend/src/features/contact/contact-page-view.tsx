import { Clock, Copy, Mail, MessageCircle, Check } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bee3lyLogo } from '@/components/brand/bee3ly-logo';
import { PrefsControls } from '@/components/preferences';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { Label } from '@/components/ui/label';
import {
  SelectField,
  type SelectFieldOption,
} from '@/components/ui/select-field';
import { useAuth } from '@/features/auth/auth-context';
import { useLocale } from '@/features/i18n/locale-context';
import { SUPPORT_EMAIL } from '@/features/support/constants';
import { cn } from '@/lib/utils';
import { paths } from '@/routes/paths';

type ContactTopic = 'general' | 'billing' | 'technical' | 'privacy' | 'other';

const TOPIC_KEYS: Record<
  ContactTopic,
  | 'contactTopicGeneral'
  | 'contactTopicBilling'
  | 'contactTopicTechnical'
  | 'contactTopicPrivacy'
  | 'contactTopicOther'
> = {
  general: 'contactTopicGeneral',
  billing: 'contactTopicBilling',
  technical: 'contactTopicTechnical',
  privacy: 'contactTopicPrivacy',
  other: 'contactTopicOther',
};

export function ContactPageView() {
  const { t } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<ContactTopic>('general');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
  }, [user?.name, user?.email, name, email]);

  const topicOptions: SelectFieldOption[] = useMemo(
    () =>
      (Object.keys(TOPIC_KEYS) as ContactTopic[]).map((value) => ({
        value,
        label: t(TOPIC_KEYS[value]),
      })),
    [t],
  );

  const topicLabel = t(TOPIC_KEYS[topic]);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${SUPPORT_EMAIL}`;
    }
  }, []);

  const sendViaEmail = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(
      `[bee3ly] ${topicLabel}${name.trim() ? ` — ${name.trim()}` : ''}`,
    );
    const body = encodeURIComponent(
      [
        name.trim() ? `Name: ${name.trim()}` : null,
        email.trim() ? `Email: ${email.trim()}` : null,
        `Topic: ${topicLabel}`,
        '',
        message.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const backTo = isAuthenticated ? paths.profile : paths.login;
  const backLabel = isAuthenticated
    ? t('contactBackToProfile')
    : t('legalBackToLogin');

  return (
    <main className="bg-page min-h-dvh">
      <header className="border-border bg-surface/80 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link to={paths.home} className="inline-flex items-center gap-2">
            <Bee3lyLogo markClassName="h-9 w-9" />
          </Link>
          <PrefsControls />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 pb-16">
        <div className="max-w-2xl">
          <h1 className="font-display text-ink text-3xl font-bold tracking-tight">
            {t('contactPageTitle')}
          </h1>
          <p className="text-muted mt-2 text-[15px] leading-7">
            {t('contactPageIntro')}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <aside className="space-y-4">
            <div className="border-border bg-lavender/60 flex items-start gap-4 rounded-2xl border p-5">
              <span className="bg-brand/10 text-brand inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-semibold">
                  {t('contactEmailHeading')}
                </p>
                <p className="text-muted mt-1 text-sm leading-6">
                  {t('contactEmailBody')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-brand text-sm font-semibold hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-lg px-3 text-xs"
                    onClick={() => void copyEmail()}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? t('contactEmailCopied') : t('contactEmailCopy')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-border bg-surface flex items-start gap-4 rounded-2xl border p-5">
              <span className="bg-brand/10 text-brand inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-ink text-sm font-semibold">
                  {t('contactResponseHeading')}
                </p>
                <p className="text-muted mt-1 text-sm leading-6">
                  {t('contactResponseBody')}
                </p>
              </div>
            </div>

            <div className="border-border bg-surface rounded-2xl border p-5">
              <p className="text-ink text-sm font-semibold">
                {t('contactTipsHeading')}
              </p>
              <ul className="text-muted mt-3 list-inside list-disc space-y-2 text-sm leading-6">
                <li>{t('contactTipAccount')}</li>
                <li>{t('contactTipScreenshots')}</li>
                <li>{t('contactTipPrivacy')}</li>
              </ul>
            </div>
          </aside>

          <form
            onSubmit={sendViaEmail}
            className="border-border bg-surface space-y-4 rounded-2xl border p-5 shadow-sm"
          >
            <div className="border-border flex items-start gap-3 border-b pb-4">
              <span className="bg-brand/10 text-brand inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-ink text-sm font-semibold">
                  {t('contactFormHeading')}
                </p>
                <p className="text-muted mt-0.5 text-xs leading-5">
                  {t('contactFormHint')}
                </p>
              </div>
            </div>

            <InputField
              id="contact-name"
              label={t('contactFieldName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <InputField
              id="contact-email"
              label={t('contactFieldEmail')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <SelectField
              id="contact-topic"
              label={t('contactFieldTopic')}
              value={topic}
              onValueChange={(value) => setTopic(value as ContactTopic)}
              options={topicOptions}
            />
            <div>
              <Label htmlFor="contact-message">
                {t('contactFieldMessage')}
              </Label>
              <textarea
                id="contact-message"
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('contactFieldMessagePlaceholder')}
                className={cn(
                  'border-border bg-input text-ink placeholder:text-muted focus:border-brand focus:ring-brand/20 mt-0 w-full resize-y rounded-xl border px-4 py-3 text-sm transition outline-none focus:ring-2',
                )}
              />
            </div>
            <Button type="submit" className="w-full">
              {t('contactFormSubmit')}
            </Button>
          </form>
        </div>

        <footer className="border-border text-muted mt-12 border-t pt-8 text-sm">
          <Link
            to={backTo}
            className="text-brand font-semibold hover:underline"
          >
            {backLabel}
          </Link>
          <span className="mx-2">·</span>
          <Link
            to={paths.privacyPolicy}
            className="text-brand font-semibold hover:underline"
          >
            {t('navPrivacyPolicy')}
          </Link>
          <span className="mx-2">·</span>
          <Link
            to={paths.terms}
            className="text-brand font-semibold hover:underline"
          >
            {t('navTermsConditions')}
          </Link>
        </footer>
      </div>
    </main>
  );
}
