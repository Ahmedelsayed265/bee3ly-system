# بلاي بوك — أول تاجر بيتا

Checklist لتشغيل **أول بيزنس حقيقي** على bee3ly (Meta + AI + orders).

---

## قبل اليوم صفر

- [ ] Backend deployed + `FRONTEND_URL` صحيح
- [ ] `AI_SERVICE_URL` → AI Service deployed + `GEMINI_API_KEY`
- [ ] Meta App: Privacy/Terms URLs (`/privacy`, `/terms`)
- [ ] Webhook URL عام HTTPS → `/social/meta/webhook`
- [ ] حساب تاجر: onboarding مكتمل

---

## إعداد التاجر (30–45 دقيقة)

1. **Products** — أسعار، مخزون، variants (مقاس/لون).
2. **Settings → Shipping** — محافظات مصر + رسوم.
3. **Settings → Knowledge** — مواعيد، FAQs، InstaPay/Vodafone/bank.
4. **AI** — تفعيل + هدف (More orders).
5. **Settings → Channels** — OAuth Meta أو WhatsApp Embedded (حسب القناة).
6. **Inbox** — رسالة test من القناة؛ تأكد realtime + رد AI.

---

## قواعد التشغيل

- **Prepaid:** لا أوردر نهائي قبل تأكيد التاجر على screenshot التحويل (inbox).
- **Handoff:** إذا `needsHuman` — التاجر يرد يدويًا من نفس المحادثة.
- **Campaigns:** launch = assisted/simulated حتى Ads API — لا تعد التاجر أن الإعلان live على Meta تلقائيًا.

---

## مقاييس نجاح البيتا (4 أسابيع)

| Metric | هدف أولي |
|--------|-----------|
| وقت أول رد AI | < 30s |
| % محادثات → lead/order | baseline + track |
| أوردرات مؤكدة/أسبوع | ≥ 1 (vertical صغير) |
| Incidents (token/webhook) | 0 critical |

---

## Escalation

- Webhook failures → logs Backend + Meta App dashboard
- AI timeout → زيادة `AI_SERVICE_TIMEOUT_MS` أو fallback message
- 401 AI → merchant JWT / `AI_SERVICE_URL` path

راجع [investor-presentation.md](./investor-presentation.md) و [roadmap.md](./roadmap.md).
