import type { MessageKey } from '@/features/i18n/messages';

export type QuickReply = { title: string; payload: string };

export type ReplyContext = {
  businessName: string;
  customerName: string | null;
  customerPhone: string | null;
  order: {
    orderNumber: number;
    totalEgp: number;
    customerName: string | null;
    customerPhone: string | null;
    items?: Array<{ name: string; quantity: number }>;
  } | null;
};

type Translate = (key: MessageKey, params?: Record<string, string>) => string;

export function orderConfirmReplies(t: Translate): QuickReply[] {
  return [
    { title: t('replyConfirm'), payload: 'CONFIRM_ORDER' },
    { title: t('replySupport'), payload: 'CONTACT_SUPPORT' },
  ];
}

export function buildQuickSends(t: Translate) {
  return [
    { label: t('qrThanksLabel'), body: t('qrThanks') },
    { label: t('qrReceivedLabel'), body: t('qrReceived') },
    { label: t('qrPreparingLabel'), body: t('qrPreparing') },
    { label: t('qrNeedInfoLabel'), body: t('qrNeedInfo') },
  ];
}

export function buildTemplates(t: Translate, ctx: ReplyContext) {
  const name =
    ctx.order?.customerName?.trim() ||
    ctx.customerName?.trim() ||
    t('unknownCustomer');
  const phone =
    ctx.order?.customerPhone?.trim() || ctx.customerPhone?.trim() || '—';
  const items =
    ctx.order?.items?.map((item) => item.name).filter(Boolean) ?? [];
  const itemLabel = items.length ? ` ${items.join('، ')}` : '';
  const order = ctx.order ? String(ctx.order.orderNumber) : '—';
  const total = ctx.order ? String(ctx.order.totalEgp) : '—';
  const business = ctx.businessName || 'bee3ly';

  return [
    {
      id: 'order-confirm',
      title: t('tplOrderTitle'),
      body: t('tplOrderBody', {
        business,
        name,
        items: itemLabel,
        order,
        phone,
        total,
      }),
      quickReplies: orderConfirmReplies(t),
    },
    {
      id: 'order-ready',
      title: t('tplReadyTitle'),
      body: t('tplReadyBody', { name, order }),
      quickReplies: [] as QuickReply[],
    },
    {
      id: 'need-details',
      title: t('tplDetailsTitle'),
      body: t('tplDetailsBody', { name }),
      quickReplies: [] as QuickReply[],
    },
    {
      id: 'thanks',
      title: t('tplThanksTitle'),
      body: t('tplThanksBody', { name }),
      quickReplies: [] as QuickReply[],
    },
  ];
}
