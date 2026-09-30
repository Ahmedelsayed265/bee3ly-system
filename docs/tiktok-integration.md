# TikTok — خطة التكامل الكامل (parity مع Meta)

يوثّق هذا الملف **خطوات تنفيذ ربط TikTok** في bee3ly بحيث يحصل التاجر على نفس تجربة Meta الحالية قدر الإمكان:

- ربط حساب من الإعدادات (OAuth)
- استقبال رسائل DM عبر Webhook
- Inbox + Realtime + رد الـ AI
- إرسال الرد للعميل على TikTok
- (مرحلة لاحقة) تعليقات الفيديو + محاكاة للتطوير

> **مرجع التنفيذ في الكود:** Meta موجود تحت `backend/src/social/meta/` ويمر عبر `InboundMessageService` في `backend/src/channels/inbound-message.service.ts`. TikTok يُبنى بنفس الفكرة تحت `backend/src/social/tiktok/` مع **provider منفصل** — مش إعادة استخدام Graph API.

---

## 1. ما هو جاهز اليوم vs ما ينقص

| الجزء | Meta (موجود) | TikTok (حاليًا) |
|--------|----------------|------------------|
| `InboundMessageService` (AI + محادثة + أوردر) | ✅ | ✅ جاهز لو وصلنا `InboundMessageEvent` |
| `SocialPlatform` في Prisma | `FACEBOOK`, `INSTAGRAM`, `WHATSAPP` | ❌ لا يوجد `TIKTOK` على مستوى `SocialAccount` |
| `ConversationChannel` | FB / IG / WA / SIMULATION | `TIKTOK` موجود في الـ enum فقط |
| `channel.types.ts` | `META` provider | أنواع `TIKTOK` مُعرّفة مسبقًا |
| OAuth + callback | `MetaOauthService` | ❌ |
| Webhook | `GET/POST /social/meta/webhook` | ❌ |
| Outbound | `MetaOutboundService` فقط | ❌ |
| UI الإعدادات | Connect Meta + disconnect | بطاقة TikTok **Coming soon** |
| تعليقات + poller | `PageCommentsService` | ❌ (API TikTok مختلف) |

**الهدف:** إكمال العمود الفارغ بحيث أي رسالة TikTok تمر بنفس مسار Meta بعد نقطة الـ ingest.

---

## 2. نطاق الـ parity (مراحل)

### المرحلة A — MVP (إلزامي للإطلاق)

1. OAuth ربط حساب TikTok Business
2. Webhook: رسائل DM واردة
3. تحويل الـ payload → `InboundMessageEvent`
4. إرسال رد AI عبر TikTok Messaging API
5. شاشة الإعدادات: Connect / Disconnect / حالة الاتصال
6. `connect-demo` / simulation للتطوير بدون TikTok live (اختياري لكن مُستحسن)

### المرحلة B — قريب من Meta

7. تجديد التوكن (refresh) + حالة `REAUTH_REQUIRED`
8. إشعار التاجر عند فشل الإرسال
9. عرض اسم/معرّف المرسل في Inbox

### المرحلة C — خارج نطاق DM (مثل تعليقات Meta)

10. تعليقات على الفيديوهات (webhook أو polling حسب ما يوفره TikTok للحساب)
11. رد ثابت / AI على التعليق + DM خاص (إن دعمته المنصة)

> **ملاحظة:** راجع [TikTok for Developers](https://developers.tiktok.com/) وBusiness Messaging docs للحساب الذي ستستخدمونه — الصلاحيات والمنتجات تتغير؛ ثبّت القرارات في قسم **9. Checklist خارجي** قبل الكود.

---

## 3. متطلبات قبل الكود (حسابات ومنصة)

1. **TikTok Business Account** للتاجر (أو حساب اختبار).
2. **TikTok Developer App** على [developers.tiktok.com](https://developers.tiktok.com/):
   - Client Key / Client Secret
   - Redirect URI(s) للـ OAuth
   - Webhook URL عام (HTTPS) — ngrok في التطوير
3. تفعيل منتجات الـ API المطلوبة (مثلاً Business Messaging / Direct Message — حسب الاسم الرسمي وقت التنفيذ).
4. الموافقات (App review) إن كانت مطلوبة للـ scopes الإنتاجية.
5. **TOKEN_ENCRYPTION_KEY** موجود في bee3ly (نفس تشفير توكن Meta).

---

## 4. متغيرات البيئة (`.env`)

أضف إلى `backend/.env` و`backend/.env.example`:

```env
# TikTok for Developers
TIKTOK_CLIENT_KEY=""
TIKTOK_CLIENT_SECRET=""
TIKTOK_REDIRECT_URI="http://localhost:5000/social/tiktok/callback"
TIKTOK_WEBHOOK_VERIFY_TOKEN="bee3ly-tiktok-verify"
# Optional: fixed path if TikTok documents a specific verify header name
# TIKTOK_WEBHOOK_SECRET=""
```

**Production:**

- `TIKTOK_REDIRECT_URI=https://YOUR-API/social/tiktok/callback`
- Webhook: `https://YOUR-API/social/tiktok/webhook`
- أضف الـ URIs في لوحة TikTok Developer.

---

## 5. تغييرات قاعدة البيانات (Prisma)

### 5.1 `SocialPlatform`

في `backend/prisma/schema.prisma`:

```prisma
enum SocialPlatform {
  FACEBOOK
  INSTAGRAM
  WHATSAPP
  TIKTOK
}
```

Migration:

```bash
cd backend && npx prisma migrate dev --name add_tiktok_social_platform
```

### 5.2 `SocialAccount`

الجدول الحالي يكفي إذا:

- `provider`: `"TIKTOK"` (string على الحقل — أو وسّع enum إن وُجد)
- `platform`: `TIKTOK`
- `externalId`: معرّف حساب TikTok Business / open_id حسب الـ API
- `accessTokenEnc` / `refreshTokenEnc` / `tokenExpiresAt`: مثل Meta
- `metadata`: JSON (business_id، display name، sandbox flags)

**Unique:** `@@unique([businessId, platform])` — TikTok حساب واحد لكل بيزنس (مثل IG).

---

## 6. Backend — هيكل الملفات (مرآة Meta)

```text
backend/src/social/
├── social.module.ts          # سجّل TikTok providers
├── social.service.ts         # orchestration: list / connect / disconnect / webhook
├── social.controller.ts      # routes جديدة
├── tiktok/
│   ├── tiktok-oauth.service.ts      # build OAuth URL, callback, encrypt tokens
│   ├── tiktok-api.client.ts         # HTTP client للـ Business Messaging API
│   ├── tiktok-webhook.service.ts    # verify + parse events → inbound
│   └── tiktok-outbound.service.ts   # sendText(accountId, recipientId, text)
```

### 6.1 OAuth (`tiktok-oauth.service.ts`)

**Endpoints مقترحة (مثل Meta):**

| Method | Path | Guard | الوظيفة |
|--------|------|-------|---------|
| `POST` | `/social/tiktok/connect` | JWT | `{ oauthUrl }` |
| `GET` | `/social/tiktok/callback` | — | `code` + `state` → حفظ `SocialAccount` → redirect للفرونت |
| `GET` | `/social/tiktok/pending/:id` | JWT | (إن TikTok يحتاج خطوة اختيار حساب/صفحة) |
| `POST` | `/social/tiktok/select-account` | JWT | (إن لزم) |

**`state`:** JWT أو signed payload فيه `businessId` + `userId` (نفس أسلوب Meta).

**بعد الـ callback:**

1. Exchange `code` → access + refresh token
2. جلب معرّف الحساب + display name
3. `upsert` على `SocialAccount` مع `status: CONNECTED`
4. Redirect: `{FRONTEND_URL}/settings?tiktok=connected`

### 6.2 Webhook (`tiktok-webhook.service.ts`)

**Endpoints:**

| Method | Path | الوظيفة |
|--------|------|---------|
| `GET` | `/social/tiktok/webhook` | Challenge verification (حسب spec TikTok) |
| `POST` | `/social/tiktok/webhook` | أحداث الرسائل |

**في الـ controller:**

- استخدم `rawBody: true` على Nest (موجود للـ Meta signature) للتحقق من التوقيع إن وُجد.
- Log structured: `event type`, `business external id`.

**Mapping إلى `InboundMessageEvent`:**

```typescript
{
  provider: 'TIKTOK',
  channel: 'TIKTOK',
  externalAccountId: '<tiktok_business_or_app_scoped_id>',
  externalSenderId: '<user_open_id_or_conversation_participant>',
  externalMessageId: '<message_id>',
  senderName?: string,
  text: string,
  timestamp?: number,
  raw?: payload,
}
```

استدعِ:

```typescript
await this.inbound.ingest(event);
```

> **Idempotency:** `InboundMessageService` يتحقق من `externalMessageId` في `message.meta` — احترم نفس الحقل.

### 6.3 Outbound (`tiktok-outbound.service.ts`)

- `sendText(socialAccountId, recipientExternalId, text)` → TikTok API
- فك تشفير التوكن من `SocialAccount`
- Handle 401 → `status: REAUTH_REQUIRED` على الحساب

### 6.4 فك coupling عن Meta في Inbound

اليوم `InboundMessageService` يحقن `MetaOutboundService` فقط.

**خطوة مطلوبة:**

1. Interface مثل `ChannelOutboundPort` مع `sendText(...)`.
2. Implementation: `MetaOutboundService` + `TikTokOutboundService`.
3. Router يختار حسب `account.provider` أو `account.platform`.

بدون هذه الخطوة، TikTok ingest سيعمل لكن **الرد لن يُرسل**.

### 6.5 `SocialService` / `SocialController`

- `list()`: يُرجع حساب `TIKTOK` مع FB/IG/WA
- `disconnect(userId, TIKTOK)`
- `connectDemo(userId, TIKTOK)` — simulation للـ QA
- `startTikTokConnect()` — mirror `startConnect` لـ Meta

سجّل الخدمات في `social.module.ts`.

---

## 7. Frontend

### 7.1 API (`frontend/src/features/business/api.ts`)

- `startTikTokConnect()` → `POST /social/tiktok/connect`
- معالجة redirect query: `?tiktok=connected` / `?tiktok=error`

### 7.2 Hook (`use-social-settings.ts`)

- `tiktokConnectMut`, `tiktok` account من `list`
- `tiktokReady`: `TIKTOK_CLIENT_KEY` configured (flag من backend مثل `metaConfigured`)

### 7.3 UI (`social-channels-section.tsx`)

- إزالة `comingSoon` من بطاقة TikTok
- زر **Connect TikTok** / **Disconnect** (mirror Meta)
- Toasts: `tiktokConnectedOk`, `tiktokConnectFailed` في `en.json` / `ar.json`

### 7.4 Inbox

- `channel-icons.tsx` — أيقونة TikTok موجودة
- التأكد أن `ConversationChannel.TIKTOK` يظهر في الفلاتر والقائمة

---

## 8. مسار الرسالة (End-to-end)

```text
TikTok DM → POST /social/tiktok/webhook
         → TikTokWebhookService.parse()
         → InboundMessageService.ingest()
              → Customer + Conversation (channel TIKTOK)
              → Message CUSTOMER
              → AiEngineAdapter.handleInbound()
              → (reply) ChannelOutbound.sendText()  ← TikTokOutboundService
         → Realtime notifyConversationUpdated
Frontend Inbox ← WebSocket / refetch
```

---

## 9. Checklist خارجي (TikTok Developer Portal)

قبل merge للإنتاج، أكّد يدويًا:

- [ ] Redirect URI مطابق حرفيًا لـ `TIKTOK_REDIRECT_URI`
- [ ] Webhook URL + verify token
- [ ] Scopes: messaging / business (حسب الوثائق الحالية)
- [ ] App في وضع Live + business verification إن طُلب
- [ ] Rate limits وحدود حجم الرسالة
- [ ] سياسة الخصوصية / Terms URL في إعدادات التطبيق (متطلبات المتجر)

---

## 10. التطوير المحلي (ngrok)

1. Backend على `5000`: `npm run dev` (أو script المشروع).
2. ngrok مع CRL fix إن لزم: `npm run ngrok:http`
3. Webhook URL: `https://<ngrok>/social/tiktok/webhook`
4. `VITE_API_URL` = نفس الـ ngrok URL للفرونت
5. `FRONTEND_URL` = `http://localhost:5173`

---

## 11. الاختبار

### 11.1 Simulation (بدون TikTok)

```http
POST /social/connect-demo
Authorization: Bearer <token>
{ "platform": "TIKTOK", "displayName": "Demo Shop" }
```

ثم محاكاة ingest داخليًا (test controller أو script) بـ `InboundMessageEvent` — أو Inbox simulate الموجود.

### 11.2 Integration

1. Connect TikTok من الإعدادات
2. أرسل DM من حساب TikTok شخصي للحساب Business
3. تحقق: Inbox، رد AI، سجل `message.meta.provider === 'TIKTOK'`
4. Disconnect وأعد Connect

### 11.3 Regression Meta

- Webhook Meta + OAuth Meta + WhatsApp test number — بدون كسر بعد refactor الـ outbound.

---

## 12. الأمان

- تشفير التوكنات: `MetaOauthService.encrypt` pattern — أعد استخدام `TOKEN_ENCRYPTION_KEY`
- التحقق من توقيع Webhook (لا تتخطى في production)
- `state` في OAuth موقّع ومحدود زمنًا
- لا تسجّل `access_token` في logs
- Rate limit على `/social/tiktok/webhook` (Nest throttler) اختياري

---

## 13. ترتيب تنفيذ مقترح (Sprint)

| # | مهمة | مخرجات |
|---|------|--------|
| 1 | Prisma `TIKTOK` + migrate | DB |
| 2 | `tiktok-api.client` + env | client يعمل |
| 3 | OAuth connect + callback | `SocialAccount` CONNECTED |
| 4 | Webhook verify + parse DM | ingest يعمل |
| 5 | Outbound abstraction + TikTok send | رد كامل |
| 6 | Frontend settings | UX |
| 7 | Tests + Meta regression | PR |
| 8 | (اختياري) Comments phase C | doc منفصل |

---

## 14. مراجع داخل الريبو

| الموضوع | المسار |
|---------|--------|
| Meta OAuth | `backend/src/social/meta/meta-oauth.service.ts` |
| Meta Webhook | `backend/src/social/meta/meta-webhook.service.ts` |
| Ingest + AI | `backend/src/channels/inbound-message.service.ts` |
| أنواع القنوات | `backend/src/channels/channel.types.ts` |
| Social routes | `backend/src/social/social.controller.ts` |
| UI قنوات | `frontend/src/features/settings/components/social-channels-section.tsx` |

---

## 15. بعد الدمج

- تحديث `README.md` (قسم Integrations) بربط TikTok
- إضافة متغيرات TikTok في deploy (Vercel/Railway/etc.)
- مراقبة: log errors `CHANNEL_ACCOUNT_NOT_FOUND`, `REAUTH_REQUIRED`

---

*آخر تحديث: يعكس بنية bee3ly-system وقت كتابة هذا الملف — راجع TikTok Developer Docs قبل تثبيت أسماء الـ scopes والـ endpoints.*
