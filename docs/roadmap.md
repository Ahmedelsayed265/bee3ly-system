# خارطة الطريق — bee3ly

مرتبة حسب **الأثر على المنتج** و**جاهزية الكود الحالي**.  
عند إنجاز بند: انقله إلى [investor-presentation.md](./investor-presentation.md) واحذفه من هنا.

---

## Soon (0–8 أسابيع) — إغلاق loop البيتا

| # | البند | النتيجة المتوقعة | يعتمد على |
|---|--------|-------------------|-----------|
| S1 | **أول تاجر بيتا حقيقي** على Meta (WA/IG/FB) | رسائل حقيقية → inbox → AI → order | Meta App live، tokens، `AI_SERVICE_URL` deployed |
| S2 | **Deploy AI Service** (staging/prod) | Gemini stable، Redis sessions | `ai-services` + secrets + health checks |
| S3 | **Dashboard analytics page → API** | إزالة `preview-data` من `/app/analytics` | `GET /analytics/overview` + endpoints إضافية |
| S4 | **Disconnect + reconnect UX** في Settings | تقليل support manual | API موجود جزئيًا |
| S5 | **Leads workflow** | تغيير حالة من UI، تقليل duplicates | Backend + frontend |
| S6 | **إيميل transactional** | reset password + invites لاحقًا | SendGrid/SES |
| S7 | **Mobile inbox** | drawer navigation `< md` | Frontend فقط |
| S8 | **Playbook أول بيزنس** | doc عمليات + checklist | [beta-first-business.md](./beta-first-business.md) |

---

## Next (2–4 أشهر) — Revenue & scale

| # | البند | النتيجة |
|---|--------|---------|
| N1 | **Stripe (أو Paymob)** + فرض limits حسب `PlanTier` | Monetization |
| N2 | **Meta Ads API** أو partner flow لـ Campaign launch | من «assisted» إلى «published» |
| N3 | **TikTok OAuth + webhook + outbound** | [tiktok-integration.md](./tiktok-integration.md) |
| N4 | **Team invites** | OWNER يضيف staff + roles |
| N5 | **Merchant AI consultant UI** | يستخدم `/api/v1/merchant/chat` |
| N6 | **Observability** | structured logs، AI latency، webhook failures |
| N7 | **Feature flags** | rollout تدريجي للقنوات |

---

## Later (6+ أشهر) — Platform

| # | البند |
|---|--------|
| L1 | Multi-branch / franchise (فروع متعددة) |
| L2 | Marketplace integrations (Shopify sync…) |
| L3 | Voice / WhatsApp calls |
| L4 | Advanced attribution (Meta CAPI، offline conversions) |
| L5 | White-label / agency mode |

---

## Tech debt (مستمر)

- توحيد `AI_SERVICE_URL` vs `AI_ENGINE_URL` في التوثيق والـ env.
- تقليل mock في dashboard (`recentChats` في home — جزء mock).
- اختبارات E2E للمسار: simulate → order → notification.
- CI: backend + frontend + (optional) ai-services lint.

---

## ما **لن** نفعله في Soon (عمدًا)

- ادّعاء «نشر تلقائي 100%» على Meta Ads بدون Ads API — الكود يمنع `ACTIVE` وهمي.
- تخزين secrets في الريpo — كل keys في env.
- LLM يخترع أسعار — الأدوات على DB فقط.
