import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from '@/components/brand/channel-icons'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { useAuth } from '@/features/auth/auth-context'
import {
  disconnectSocial,
  fetchMetaPending,
  fetchSocial,
  selectMetaPage,
  startMetaConnect,
  updateBusiness,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'
import { cn } from '@/lib/utils'

type Tab = 'social' | 'knowledge'
type ChannelId = 'FACEBOOK' | 'INSTAGRAM' | 'WHATSAPP'

type SocialAccount = {
  id: string
  platform: string
  displayName: string | null
  status?: string
  webhookSubscribedAt?: string | null
}

function statusLabel(
  status: string | undefined,
  t: (k: MessageKey) => string,
) {
  switch (status) {
    case 'CONNECTED':
      return t('connectionConnected')
    case 'SIMULATION':
      return t('connectionSimulation')
    case 'CONNECTING':
      return t('connectionConnecting')
    case 'REAUTH_REQUIRED':
      return t('connectionReauth')
    case 'ERROR':
      return t('connectionError')
    default:
      return t('connectionDisconnected')
  }
}

function statusTone(status: string | undefined) {
  switch (status) {
    case 'CONNECTED':
      return 'bg-trust/15 text-trust'
    case 'CONNECTING':
      return 'bg-brand/10 text-brand'
    case 'ERROR':
    case 'REAUTH_REQUIRED':
      return 'bg-danger/10 text-danger'
    default:
      return 'bg-lavender text-muted'
  }
}

function ChannelCard({
  icon,
  iconClassName,
  title,
  description,
  account,
  action,
  footer,
}: {
  icon: ReactNode
  iconClassName: string
  title: string
  description: string
  account?: SocialAccount | null
  action: ReactNode
  footer?: ReactNode
}) {
  const { t } = useLocale()
  const connected =
    account?.status === 'CONNECTED' || account?.status === 'CONNECTING'

  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              iconClassName,
            )}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            statusTone(account?.status),
          )}
        >
          {account ? statusLabel(account.status, t) : t('channelNotLinked')}
        </span>
      </div>

      {connected && account?.displayName ? (
        <div className="rounded-xl bg-page px-3 py-2.5 text-sm">
          <p className="font-semibold text-ink">{account.displayName}</p>
          {account.webhookSubscribedAt ? (
            <p className="mt-0.5 text-[11px] text-trust">webhook</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2">{action}</div>
      {footer}
    </article>
  )
}

export function SettingsPage() {
  const { t } = useLocale()
  const { business, refreshMe } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('social')
  const socialQuery = useQuery({ queryKey: ['social'], queryFn: fetchSocial })

  const pendingId = searchParams.get('metaPending')
  const pendingQuery = useQuery({
    queryKey: ['meta-pending', pendingId],
    queryFn: () => fetchMetaPending(pendingId!),
    enabled: Boolean(pendingId),
  })

  const [faqs, setFaqs] = useState(business?.faqs ?? '')
  const [deliveryInfo, setDeliveryInfo] = useState(business?.deliveryInfo ?? '')
  const [workingHours, setWorkingHours] = useState(business?.workingHours ?? '')
  const [paymentInfo, setPaymentInfo] = useState(business?.paymentInfo ?? '')

  useEffect(() => {
    if (searchParams.get('meta') === 'connected') {
      toast.success(t('metaConnectedOk'))
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, t])

  const saveMut = useMutation({
    mutationFn: () =>
      updateBusiness({
        faqs,
        deliveryInfo,
        workingHours,
        paymentInfo,
      }),
    onSuccess: async () => {
      await refreshMe()
      toast.success(t('profileSaved'))
    },
    onError: () => {
      toast.error(t('saveFailed'))
    },
  })

  const disconnectMut = useMutation({
    mutationFn: disconnectSocial,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] })
      toast.success(t('connectionDisconnected'))
    },
    onError: () => {
      toast.error(t('connectionError'))
    },
  })

  const metaConnectMut = useMutation({
    mutationFn: startMetaConnect,
    onSuccess: (data) => {
      window.location.href = data.oauthUrl
    },
    onError: () => {
      toast.error(t('connectionError'))
    },
  })

  const selectPageMut = useMutation({
    mutationFn: ({ pageId }: { pageId: string }) =>
      selectMetaPage(pendingId!, pageId),
    onSuccess: async (data) => {
      toast.success(
        data.instagram ? t('metaConnectedFbIg') : t('metaConnectedFbOnly'),
      )
      setSearchParams({})
      await qc.invalidateQueries({ queryKey: ['social'] })
    },
    onError: () => {
      toast.error(t('metaPendingExpired'))
    },
  })

  const tabs: Array<{ id: Tab; labelKey: MessageKey }> = [
    { id: 'social', labelKey: 'socialAccounts' },
    { id: 'knowledge', labelKey: 'businessKnowledge' },
  ]

  const accountsByPlatform = useMemo(() => {
    const map = new Map<string, SocialAccount>()
    for (const account of socialQuery.data?.accounts ?? []) {
      if (account.status === 'SIMULATION') continue
      map.set(account.platform, account)
    }
    return map
  }, [socialQuery.data?.accounts])

  const facebook = accountsByPlatform.get('FACEBOOK')
  const instagram = accountsByPlatform.get('INSTAGRAM')
  const metaReady = Boolean(socialQuery.data?.metaConfigured)
  const metaBusy = metaConnectMut.isPending

  const connectMeta = () => metaConnectMut.mutate()
  const disconnect = (platform: ChannelId) => {
    if (platform === 'WHATSAPP') return
    disconnectMut.mutate(platform)
  }

  return (
    <PageLayout
      title={t('navSettings')}
      description={t('settingsIntro')}
      actions={
        <>
          <Link
            to="/app/profile"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold hover:bg-lavender"
          >
            {t('navProfile')}
          </Link>
          <Link
            to="/app/billing"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-brand hover:bg-lavender"
          >
            {t('navBilling')}
          </Link>
        </>
      }
    >
      <div className="flex w-full gap-1 rounded-xl border border-border bg-surface p-1 sm:max-w-md">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
              tab === item.id
                ? 'bg-brand text-white'
                : 'text-muted hover:bg-lavender hover:text-ink',
            )}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'social' ? (
        <section className="w-full space-y-4">
          <div>
            <h2 className="text-base font-bold text-ink">{t('channelsTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('socialAccountsHint')}</p>
            {!metaReady ? (
              <p className="mt-2 text-xs text-muted">{t('metaNotConfigured')}</p>
            ) : (
              <p className="mt-2 text-xs text-muted">{t('metaConnectHint')}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ChannelCard
              icon={<FacebookIcon className="h-5 w-5" />}
              iconClassName="bg-[#1877F2]/10 text-[#1877F2]"
              title={t('channelFacebook')}
              description={
                pendingId
                  ? t('selectFacebookPageHint')
                  : t('channelFacebookHint')
              }
              account={pendingId ? undefined : facebook}
              action={
                pendingId ? (
                  <p className="text-xs font-semibold text-brand">
                    {t('selectFacebookPage')}
                  </p>
                ) : (
                  <>
                    <Button
                      size="sm"
                      disabled={metaBusy || !metaReady}
                      onClick={connectMeta}
                    >
                      {facebook?.status === 'CONNECTED'
                        ? t('channelReconnect')
                        : t('channelConnect')}
                    </Button>
                    {facebook && facebook.status !== 'DISCONNECTED' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        disabled={disconnectMut.isPending}
                        onClick={() => disconnect('FACEBOOK')}
                      >
                        {t('disconnectAccount')}
                      </Button>
                    ) : null}
                  </>
                )
              }
              footer={
                pendingId ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    {(pendingQuery.data?.pages ?? []).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={selectPageMut.isPending}
                        onClick={() =>
                          selectPageMut.mutate({ pageId: p.id })
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-page px-3 py-2.5 text-start text-sm transition hover:border-brand/40 hover:bg-lavender"
                      >
                        <span className="font-semibold text-ink">{p.name}</span>
                        <span className="text-[11px] text-muted">
                          {p.hasInstagram
                            ? t('pageHasInstagram')
                            : t('pageNoInstagram')}
                        </span>
                      </button>
                    ))}
                    {pendingQuery.isLoading ? (
                      <p className="text-xs text-muted">
                        {t('connectionConnecting')}…
                      </p>
                    ) : null}
                    {pendingQuery.isError ? (
                      <p className="text-sm text-danger">
                        {t('metaPendingExpired')}
                      </p>
                    ) : null}
                  </div>
                ) : null
              }
            />

            <ChannelCard
              icon={<InstagramIcon className="h-5 w-5" />}
              iconClassName="bg-[#E1306C]/10 text-[#E1306C]"
              title={t('channelInstagram')}
              description={t('channelInstagramHint')}
              account={instagram}
              action={
                <>
                  <Button
                    size="sm"
                    variant={
                      instagram?.status === 'CONNECTED' ? 'outline' : 'default'
                    }
                    disabled={metaBusy || !metaReady || Boolean(pendingId)}
                    onClick={connectMeta}
                  >
                    {instagram?.status === 'CONNECTED'
                      ? t('channelReconnect')
                      : t('channelConnect')}
                  </Button>
                  {instagram && instagram.status !== 'DISCONNECTED' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10 hover:text-danger"
                      disabled={disconnectMut.isPending}
                      onClick={() => disconnect('INSTAGRAM')}
                    >
                      {t('disconnectAccount')}
                    </Button>
                  ) : null}
                </>
              }
            />

            <ChannelCard
              icon={<WhatsAppIcon className="h-5 w-5" />}
              iconClassName="bg-[#25D366]/10 text-[#25D366]"
              title={t('channelWhatsApp')}
              description={t('channelWhatsAppHint')}
              action={
                <Button size="sm" variant="outline" disabled>
                  {t('channelComingSoon')}
                </Button>
              }
            />
          </div>
        </section>
      ) : (
        <section className="w-full rounded-2xl border border-border bg-surface p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InputField
              id="hours"
              label={t('workingHours')}
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
            />
            <InputField
              id="delivery"
              label={t('deliveryInfo')}
              value={deliveryInfo}
              onChange={(e) => setDeliveryInfo(e.target.value)}
            />
            <InputField
              id="payment"
              label={t('paymentInfo')}
              value={paymentInfo}
              onChange={(e) => setPaymentInfo(e.target.value)}
            />
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <label className="text-sm font-semibold text-ink">{t('faqs')}</label>
              <textarea
                className="min-h-36 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                value={faqs}
                onChange={(e) => setFaqs(e.target.value)}
                placeholder={t('faqsPlaceholder')}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </section>
      )}
    </PageLayout>
  )
}
