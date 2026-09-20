import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { useAuth } from '@/features/auth/auth-context'
import {
  connectSocialDemo,
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
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('meta') === 'connected') {
      setNotice(t('metaConnectedOk'))
    }
  }, [searchParams, t])

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
      setSaved(true)
    },
  })

  const connectMut = useMutation({
    mutationFn: connectSocialDemo,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] })
    },
  })

  const disconnectMut = useMutation({
    mutationFn: disconnectSocial,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] })
    },
  })

  const metaConnectMut = useMutation({
    mutationFn: startMetaConnect,
    onSuccess: (data) => {
      window.location.href = data.oauthUrl
    },
  })

  const selectPageMut = useMutation({
    mutationFn: ({ pageId }: { pageId: string }) =>
      selectMetaPage(pendingId!, pageId),
    onSuccess: async (data) => {
      setNotice(data.notice)
      setSearchParams({})
      await qc.invalidateQueries({ queryKey: ['social'] })
    },
  })

  const tabs: Array<{ id: Tab; labelKey: MessageKey }> = [
    { id: 'social', labelKey: 'socialAccounts' },
    { id: 'knowledge', labelKey: 'businessKnowledge' },
  ]

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
        <section className="grid w-full gap-4 rounded-2xl border border-border bg-surface p-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink">
              {t('connectFacebookInstagram')}
            </p>
            <p className="text-sm text-muted">{t('socialAccountsHint')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={
                  metaConnectMut.isPending || !socialQuery.data?.metaConfigured
                }
                onClick={() => metaConnectMut.mutate()}
              >
                {t('connectRealMeta')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => connectMut.mutate('FACEBOOK')}
              >
                {t('connectFacebook')} · {t('connectionSimulation')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => connectMut.mutate('INSTAGRAM')}
              >
                {t('connectInstagram')} · {t('connectionSimulation')}
              </Button>
            </div>
            {!socialQuery.data?.metaConfigured ? (
              <p className="text-xs text-muted">{t('metaNotConfigured')}</p>
            ) : (
              <p className="text-xs text-muted">{t('metaConnectHint')}</p>
            )}
            {notice ? (
              <p className="rounded-xl bg-trust/10 px-3 py-2 text-sm text-trust">
                {notice}
              </p>
            ) : null}

            {pendingId ? (
              <div className="space-y-2 rounded-xl border border-brand/30 bg-brand/5 p-4">
                <p className="text-sm font-semibold text-ink">
                  {t('selectFacebookPage')}
                </p>
                <p className="text-xs text-muted">{t('selectFacebookPageHint')}</p>
                {(pendingQuery.data?.pages ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={selectPageMut.isPending}
                    onClick={() => selectPageMut.mutate({ pageId: p.id })}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-start text-sm hover:bg-lavender"
                  >
                    <span className="font-semibold text-ink">{p.name}</span>
                    <span className="text-[11px] text-muted">
                      {p.hasInstagram
                        ? t('pageHasInstagram')
                        : t('pageNoInstagram')}
                    </span>
                  </button>
                ))}
                {pendingQuery.isError ? (
                  <p className="text-sm text-danger">{t('metaPendingExpired')}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <ul className="space-y-2 text-sm">
            {(socialQuery.data?.accounts ?? []).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-page px-4 py-3"
              >
                <span>
                  {a.platform} · {a.displayName}
                  {a.webhookSubscribedAt ? (
                    <span className="ms-2 text-[10px] text-trust">
                      webhook
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      a.status === 'CONNECTED'
                        ? 'bg-trust/15 text-trust'
                        : a.status === 'SIMULATION'
                          ? 'bg-alert/20 text-ink'
                          : a.status === 'CONNECTING'
                            ? 'bg-brand/10 text-brand'
                            : 'bg-lavender text-muted',
                    )}
                  >
                    {statusLabel(a.status, t)}
                  </span>
                  {a.status !== 'DISCONNECTED' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-danger"
                      onClick={() =>
                        disconnectMut.mutate(
                          a.platform as 'FACEBOOK' | 'INSTAGRAM',
                        )
                      }
                    >
                      {t('disconnectAccount')}
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
            {(socialQuery.data?.accounts.length ?? 0) === 0 ? (
              <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                {t('socialAccountsHint')}
              </li>
            ) : null}
          </ul>
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
            {saved ? (
              <p className="text-sm text-trust">{t('profileSaved')}</p>
            ) : null}
          </div>
        </section>
      )}
    </PageLayout>
  )
}
