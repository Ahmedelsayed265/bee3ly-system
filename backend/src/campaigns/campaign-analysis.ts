import type { CampaignObjective, CampaignStatus } from '@prisma/client';

export type CampaignAnalysisVerdict =
  | 'SCALE'
  | 'HOLD'
  | 'REDUCE_SPEND'
  | 'PAUSE'
  | 'STOP'
  | 'NEEDS_DATA';

export type CampaignAnalysisActionId =
  | 'increase_budget'
  | 'keep_running'
  | 'trim_budget'
  | 'pause_campaign'
  | 'stop_campaign'
  | 'complete_costs'
  | 'launch_or_simulate'
  | 'wait_for_data';

export type CampaignAnalysisResult = {
  verdict: CampaignAnalysisVerdict;
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  bullets: string[];
  actions: Array<{
    id: CampaignAnalysisActionId;
    suggestedStatus?: 'PAUSED' | 'ARCHIVED';
  }>;
  risks: string[];
  figures: {
    adCostEgp: number;
    revenueEgp: number;
    roas: number | null;
    profitEgp: number | null;
    conversations: number;
    leads: number;
    orders: number;
    hasRealSpend: boolean;
    costsComplete: boolean;
  };
};

type Locale = 'ar' | 'en';

type AnalysisInput = {
  locale: Locale;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  budget: number;
  conversations: number;
  leads: number;
  orders: number;
  revenueEgp: number;
  costOfGoodsEgp: number | null;
  shippingEgp: number | null;
  returnShippingEgp: number | null;
  spendEgp: number | null;
};

const RUNNING: CampaignStatus[] = [
  'ACTIVE',
  'ASSISTED_LAUNCH',
  'SIMULATED',
];

const DESIGN_CPM = 50;
const DESIGN_CTR = 0.02;

function adCost(budget: number, spendEgp: number | null): number {
  if (spendEgp != null && spendEgp > 0) return spendEgp;
  return budget;
}

function profitEgp(input: AnalysisInput, cost: number): number | null {
  if (
    input.costOfGoodsEgp == null ||
    input.shippingEgp == null ||
    input.returnShippingEgp == null
  ) {
    return null;
  }
  return (
    input.revenueEgp -
    cost -
    input.costOfGoodsEgp -
    input.shippingEgp -
    input.returnShippingEgp
  );
}

function roas(revenue: number, cost: number): number | null {
  if (cost <= 0) return null;
  return Math.round((revenue / cost) * 100) / 100;
}

function t(locale: Locale, ar: string, en: string) {
  return locale === 'ar' ? ar : en;
}

export function analyzeCampaignMetrics(
  input: AnalysisInput,
): CampaignAnalysisResult {
  const cost = adCost(input.budget, input.spendEgp);
  const hasRealSpend = input.spendEgp != null && input.spendEgp > 0;
  const costsComplete =
    input.costOfGoodsEgp != null &&
    input.shippingEgp != null &&
    input.returnShippingEgp != null;
  const profit = profitEgp(input, cost);
  const roasValue = roas(input.revenueEgp, cost);
  const running = RUNNING.includes(input.status);
  const notStarted = input.status === 'DRAFT' || input.status === 'READY';
  const paused = input.status === 'PAUSED';

  const figures = {
    adCostEgp: cost,
    revenueEgp: input.revenueEgp,
    roas: roasValue,
    profitEgp: profit,
    conversations: input.conversations,
    leads: input.leads,
    orders: input.orders,
    hasRealSpend,
    costsComplete,
  };

  const risks: string[] = [];
  if (!hasRealSpend) {
    risks.push(
      t(
        input.locale,
        'مصروف الإعلان مبني على الميزانية المخططة — لما Meta Ads يتربط هتظهر أرقام spend حقيقية.',
        'Ad spend uses planned budget until Meta Ads delivery is connected.',
      ),
    );
  }
  if (!costsComplete) {
    risks.push(
      t(
        input.locale,
        'ربح صافي غير مكتمل: أضف تكلفة المنتج ورسوم الشحن في الطلبات/المنتجات.',
        'Net profit is incomplete — add product cost and shipping on products/orders.',
      ),
    );
  }

  if (notStarted) {
    return {
      verdict: 'NEEDS_DATA',
      confidence: 'high',
      summary: t(
        input.locale,
        `حملة «${input.name}» لسه ما اتشغّلتش. شغّلها (مساعدة bee3ly أو محاكاة) وتابع المحادثات والطلبات.`,
        `Campaign "${input.name}" is not live yet. Launch (assisted or simulate) and track conversations and orders.`,
      ),
      bullets: [
        t(
          input.locale,
          'بعد الإطلاق، التحليل يعتمد على محادثات → leads → طلبات مربوطة بالحملة.',
          'After launch, analysis uses campaign-attributed conversations → leads → orders.',
        ),
      ],
      actions: [{ id: 'launch_or_simulate' }],
      risks,
      figures,
    };
  }

  if (paused || input.status === 'ARCHIVED') {
    return {
      verdict: 'HOLD',
      confidence: 'medium',
      summary: t(
        input.locale,
        input.status === 'ARCHIVED'
          ? `حملة «${input.name}» مؤرشفة. الأرقام التاريخية لسه متاحة للمراجعة.`
          : `حملة «${input.name}» متوقفة مؤقتًا.`,
        input.status === 'ARCHIVED'
          ? `Campaign "${input.name}" is archived. Historical numbers remain for review.`
          : `Campaign "${input.name}" is paused.`,
      ),
      bullets: [
        t(
          input.locale,
          running
            ? ''
            : `إجمالي إيراد مرتبط: ${input.revenueEgp} ج.م · طلبات: ${input.orders}`,
          `Attributed revenue: ${input.revenueEgp} EGP · orders: ${input.orders}`,
        ).trim() || t(input.locale, 'راجع الأرقام قبل إعادة التشغيل.', 'Review metrics before resuming.'),
      ].filter(Boolean),
      actions: [{ id: 'keep_running' }],
      risks,
      figures,
    };
  }

  const funnelEmpty =
    input.conversations === 0 && input.leads === 0 && input.orders === 0;

  if (running && funnelEmpty) {
    return {
      verdict: 'NEEDS_DATA',
      confidence: 'medium',
      summary: t(
        input.locale,
        `«${input.name}» شغّالة لكن مفيش محادثات/leads/طلبات مربوطة لسه. استنى شوية أو تأكد إن الرابط/الـ UTM بيربط بالحملة.`,
        `"${input.name}" is live but has no attributed conversations, leads, or orders yet.`,
      ),
      bullets: [
        t(
          input.locale,
          'لو عدّى وقت كافي من غير نتائج، قلّل الميزانية أو أوقف مؤقتًا وجرب نص أو جمهور مختلف.',
          'If enough time passed with no results, trim budget or pause and test new copy or audience.',
        ),
      ],
      actions: [{ id: 'wait_for_data' }, { id: 'pause_campaign', suggestedStatus: 'PAUSED' }],
      risks,
      figures,
    };
  }

  const salesObjective =
    input.objective === 'MORE_ORDERS' || input.objective === 'RETARGETING';
  const leadObjective =
    input.objective === 'MORE_LEADS' ||
    input.objective === 'MORE_BOOKINGS' ||
    input.objective === 'MORE_MESSAGES';

  if (salesObjective && input.orders >= 1 && roasValue != null) {
    if (roasValue >= 2 && (profit == null || profit > 0)) {
      return buildVerdict(input, figures, risks, {
        verdict: 'SCALE',
        confidence: profit != null ? 'high' : 'medium',
        summary: t(
          input.locale,
          `أداء قوي: ROAS ≈ ${roasValue}${profit != null ? ` وربح ≈ ${Math.round(profit)} ج.م` : ''}. منطقي تزود ميزانية تدريجي (10–20%) وتراقب CPA.`,
          `Strong performance: ROAS ≈ ${roasValue}${profit != null ? `, profit ≈ ${Math.round(profit)} EGP` : ''}. Consider a gradual 10–20% budget increase and watch CPA.`,
        ),
        bullets: [
          t(
            input.locale,
            'زود الإنفاق خطوة بخطوة — مش مرة واحدة — عشان ما تبوّظش التوزيع.',
            'Increase spend gradually, not all at once, to protect delivery.',
          ),
        ],
        actions: [{ id: 'increase_budget' }, { id: 'keep_running' }],
      });
    }

    if (roasValue < 1 || (profit != null && profit < 0)) {
      const stop = roasValue < 0.5 && input.orders >= 2;
      return buildVerdict(input, figures, risks, {
        verdict: stop ? 'STOP' : roasValue < 1 ? 'PAUSE' : 'REDUCE_SPEND',
        confidence: 'high',
        summary: t(
          input.locale,
          stop
            ? `الحملة بتخسر: ROAS ${roasValue} وإيراد ${input.revenueEgp} ج.م مقابل ~${cost} ج.م إعلان.`
            : roasValue < 1
              ? `ROAS أقل من 1 (${roasValue}) — كل جنيه إعلان بيرجع أقل من جنيه مبيعات.`
              : `ربح سالب تقريبًا — راجع تكلفة المنتج والشحن قبل ما تكمل.`,
          stop
            ? `Campaign is losing money: ROAS ${roasValue}, revenue ${input.revenueEgp} EGP vs ~${cost} EGP ad cost.`
            : roasValue < 1
              ? `ROAS below 1 (${roasValue}) — ad spend exceeds attributed revenue.`
              : `Negative profit — verify COGS and shipping before continuing.`,
        ),
        bullets: [
          t(
            input.locale,
            'جرّب إيقاف مؤقت، عدّل النص أو الجمهور، أو انقل الميزانية لحملة أخرى.',
            'Pause, refresh copy/audience, or move budget to another campaign.',
          ),
        ],
        actions: stop
          ? [
              { id: 'stop_campaign', suggestedStatus: 'ARCHIVED' },
              { id: 'pause_campaign', suggestedStatus: 'PAUSED' },
            ]
          : [
              { id: 'pause_campaign', suggestedStatus: 'PAUSED' },
              { id: 'trim_budget' },
            ],
      });
    }
  }

  if (leadObjective && input.leads >= 3 && input.orders === 0) {
    const cpl = cost / input.leads;
    return buildVerdict(input, figures, risks, {
      verdict: 'HOLD',
      confidence: 'medium',
      summary: t(
        input.locale,
        `جمهور مهتم (${input.leads} lead) بمتوسط ~${Math.round(cpl)} ج.م/lead — لسه مفيش طلبات. راجع متابعة AI/التاجر.`,
        `${input.leads} leads at ~${Math.round(cpl)} EGP/lead — no orders yet. Review AI/human follow-up.`,
      ),
      bullets: [
        t(
          input.locale,
          'لو الـ leads جودتها ضعيفة، قلّل الاستهداف أو غيّر العرض.',
          'If lead quality is low, narrow targeting or change the offer.',
        ),
      ],
      actions: [{ id: 'keep_running' }, { id: 'trim_budget' }],
    });
  }

  if (running && input.orders >= 1 && roasValue != null && roasValue >= 1 && roasValue < 2) {
    return buildVerdict(input, figures, risks, {
      verdict: 'HOLD',
      confidence: 'medium',
      summary: t(
        input.locale,
        `ROAS ${roasValue} — مكسب modest. خلّيها شغّالة واختبر تحسينات صغيرة قبل ما تزود الميزانية.`,
        `ROAS ${roasValue} — modest return. Keep running and test small improvements before scaling.`,
      ),
      bullets: [],
      actions: [{ id: 'keep_running' }],
    });
  }

  return buildVerdict(input, figures, risks, {
    verdict: 'HOLD',
    confidence: 'low',
    summary: t(
      input.locale,
      `«${input.name}»: ${input.conversations} محادثة · ${input.leads} lead · ${input.orders} طلب. راقب الأسبوع الجاي.`,
      `"${input.name}": ${input.conversations} conversations · ${input.leads} leads · ${input.orders} orders. Watch the next week.`,
    ),
    bullets: [
      t(
        input.locale,
        'كمّل تسجيل تكاليف المنتج والشحن لو عايز توصية ربح دقيقة.',
        'Complete product and shipping costs for sharper profit guidance.',
      ),
    ],
    actions: [{ id: 'keep_running' }, { id: 'wait_for_data' }],
  });
}

function buildVerdict(
  input: AnalysisInput,
  figures: CampaignAnalysisResult['figures'],
  risks: string[],
  partial: {
    verdict: CampaignAnalysisVerdict;
    confidence: CampaignAnalysisResult['confidence'];
    summary: string;
    bullets: string[];
    actions: CampaignAnalysisResult['actions'];
  },
): CampaignAnalysisResult {
  return {
    ...partial,
    risks,
    figures,
  };
}

/** Estimated delivery when Meta spend is not synced (matches frontend buyerLedger). */
export function designDeliveryFromBudget(budget: number) {
  const adCost = budget;
  const impressions = Math.round((adCost / DESIGN_CPM) * 1000);
  const clicks = Math.round(impressions * DESIGN_CTR);
  return { adCost, impressions, clicks };
}
