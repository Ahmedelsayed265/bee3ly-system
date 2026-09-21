# bee3ly — حالة المشروع الحالية (MVP)

منصة مبيعات اجتماعية بالذكاء الاصطناعي للبيزنسات المصرية: **من أول رسالة لأول أوردر**.

هذا الملف يوثّق **ما وصلنا له فعليًا في الكود** — عشان التعليمات الجاية تبنى عليه مباشرة.

---

## الهدف الحالي (Vertical slice)

```text
تسجيل → Onboarding → منتجات → رسالة (محاكاة) → رد AI → أوردر → إشعار للمالك
```

الـ loop ده شغال عبر **صندوق الوارد + محاكاة الرسائل** (مش Meta حقيقي بالكامل بعد).

---

## Stack

| طبقة | التقنية |
|------|---------|
| Frontend | React (Vite) + TypeScript + TanStack Query + Tailwind + UI بأسلوب shadcn/Radix |
| Backend | NestJS + Prisma + PostgreSQL + JWT (access) + refresh cookie |
| AI اليوم | محرك **قواعد (rules)** عربي/إنجليزي + tool calling داخلي — مش LLM حقيقي بعد |
| DB | Docker Postgres أو Postgres مدمج محليًا (`npm run db:local`) |

---

## هيكل الريبو

```text
bee3ly-system/
├── backend/          # NestJS API + Prisma
├── frontend/         # Vite React SPA
├── docs/
│   └── beta-first-business.md   # بلاي بوك أول بيزنس بيتا
├── docker-compose.yml
└── README.md         # هذا الملف
```

---

## التشغيل المحلي

### 1) قاعدة البيانات

**Docker:**

```bash
docker compose up -d
```

**أو بدون Docker (مدمج):**

```bash
cd backend
npm run db:local
```

سيب التيرمنال مفتوح.

> ملاحظة: `.env.example` بيستخدم `bay3ly` كـ user/db؛ تأكد إن `DATABASE_URL` يطابق طريقة التشغيل عندك.

### 2) Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

API: `http://localhost:3000`

### 3) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`

---

## ما يشتغل الآن (Done)

### Auth

- تسجيل حساب + إنشاء بيزنس + عضوية OWNER + AI agent افتراضي
- دخول / خروج / refresh (cookie على `/auth`)
- نسيت كلمة المرور + إعادة التعيين (في التطوير: اللينك/التوكن بيرجع من الـ API — مفيش إيميل حقيقي)
- `GET /auth/me` + تحديث الملف الشخصي + تغيير كلمة المرور
- بعد اللوجين: hydrate للـ session قبل الدخول على `/app`

### Onboarding

- ويزارد بعد أول دخول لو `onboardingCompletedAt` فاضي
- بيانات البيزنس (وصف، منطقة، هدف، قنوات…)

### Domain / Backend modules

| Module | Prefix تقريبًا | الحالة |
|--------|----------------|--------|
| Auth | `/auth` | جاهز |
| Businesses | `/businesses/me` | جاهز |
| Products | `/products` | CRUD جاهز |
| Conversations + Leads | `/conversations`, `/leads` | جاهز |
| Orders | `/orders` | قائمة + تحديث حالة |
| Notifications | `/notifications` | جاهز + polling في الهيدر |
| AI | `/ai/agent`, `/ai/simulate-message` | محاكاة جاهزة |
| Social | `/social`, webhook Meta | demo + webhook skeleton |
| Analytics | `/analytics/overview` | مقاييس حقيقية للداشبورد |

### Frontend pages (IA)

| Route | الصفحة | الحالة |
|-------|--------|--------|
| `/login` `/register` | Auth | جاهز (AR/EN + RTL) |
| `/forgot-password` `/reset-password` | استعادة كلمة المرور | جاهز (dev) |
| `/app/onboarding` | Onboarding | جاهز |
| `/app` | Overview / داشبورد | مقاييس من الـ API |
| `/app/inbox` | صندوق الوارد | محادثة + زر محاكاة |
| `/app/leads` | العملاء المحتملون | عرض |
| `/app/orders` | الطلبات | عرض + تغيير حالة |
| `/app/products` | المنتجات | إضافة / مخزون / حذف |
| `/app/ai` | الوكيل الذكي | تفعيل + هدف أساسي |
| `/app/profile` | حسابي | بيانات + أمان + مساعدة/تواصل |
| `/app/billing` | الباقات | اختيار باقة في الـ DB فقط (بدون دفع) |
| `/app/settings` | الإعدادات | ربط سوشيال تجريبي + معرفة البيزنس |
| `/app/campaigns` | الحملات | Placeholder |
| `/app/analytics` | التحليلات (صفحة) | Placeholder (الـ overview في الهوم شغال) |

### UI / UX الحالي

- لغة افتراضية **عربي** + إنجليزي؛ RTL عبر `DirectionProvider`
- ثيم فاتح/غامق من الهيدر
- صفحات التطبيق **عرض كامل** (`PageLayout` بدون `max-w` ضيق)
- سايدبار: تنقل + مستخدم + تسجيل خروج (من غير كارت ترقية الباقة)
- هيدر: بحث شكلي + إشعارات + لغة/ثيم
- shadcn **Select** مستخدم في التسجيل والبروفايل
- مساعدة + تواصل موجودين في صفحة الملف الشخصي

### AI simulation flow (اللي نختبر بيه الـ MVP)

1. أضف منتجات بأسعار وأحجام
2. افتح Inbox → ابدأ محاكاة
3. اسأل عن السعر / المقاس / التوصيل
4. اطلب → ابعت اسم وموبايل مصري (`أحمد - 010xxxxxxxx`)
5. يظهر Order + Notification للمالك

أدوات داخلية في الـ rules engine: `getProduct`, `checkStock`, `getDeliveryInfo`, `createOrder`, `transferToHuman`, `notifyOwner`.

### Social / Meta

- **ربط تجريبي** (`connect-demo`) شغال من الإعدادات
- Webhook verify/handle موجود على `/social/meta/webhook`
- OAuth URL بيتبنى لو `META_APP_ID` موجود — **مفيش callback route مكتمل**
- مفيش إرسال ردود حقيقية لـ Meta بعد

### Plans

- `PlanTier`: FREE / STARTER / GROWTH على `Business.plan`
- صفحة الباقات بتغيّر الحقل فقط — **مفيش Stripe ولا قيود features حسب الباقة**

### Docs

- `docs/beta-first-business.md` — بلاي بوك قياس أول بيزنس بيتا

---

## Domain models (Prisma)

`User`, `RefreshToken`, `PasswordResetToken`, `Business`, `TeamMember`, `Product`, `Customer`, `Conversation`, `Message`, `Lead`, `Order`, `OrderItem`, `SocialAccount`, `AIAgent`, `Notification`

Enums مهمة: `BusinessType`, `BusinessGoal`, `PlanTier`, `OrderStatus`, `LeadStatus`, `ConversationChannel` (يشمل `SIMULATION`).

---

## Auth API

| Method | Path | الوصف |
|--------|------|--------|
| POST | `/auth/register` | حساب + بيزنس |
| POST | `/auth/login` | دخول |
| POST | `/auth/refresh` | تجديد access |
| POST | `/auth/logout` | خروج |
| POST | `/auth/forgot-password` | طلب ريست |
| POST | `/auth/reset-password` | تعيين كلمة مرور |
| GET | `/auth/me` | المستخدم + البيزنس |
| PATCH | `/auth/profile` | تحديث الاسم |
| PATCH | `/auth/password` | تغيير كلمة المرور |

---

## Env vars

**Backend** (`backend/.env.example`):

`DATABASE_URL`, `JWT_*`, `PORT`, `FRONTEND_URL`, `NODE_ENV`, `TOKEN_ENCRYPTION_KEY`, `META_*`, `OPENAI_API_KEY`

For production (Vercel frontend + separate API host), set on the **backend**:

- `FRONTEND_URL=https://bee3ly-system.vercel.app` (comma-separated if you also need local / preview origins)
- `NODE_ENV=production`

Then restart or redeploy the API.

**Frontend** (`frontend/.env.example`):

`VITE_API_URL=http://localhost:3000`

On **Vercel**, set `VITE_API_URL` to the public HTTPS backend URL (not localhost), then redeploy so the build picks it up.

---

## Brand

| Token | Hex |
|-------|-----|
| Primary | `#6366F1` |
| Text | `#0F172A` |
| Background | `#F8FAFC` |
| Surface | `#FFFFFF` |
| Accent soft | `#EDE9FE` |

---

## مش جاهز بعد / Gaps معروفة

استخدم القائمة دي لما تكتب التعليمات الجاية:

1. **LLM حقيقي** — `OPENAI_API_KEY` موجود كـ env لكن التنفيذ الحالي rules فقط
2. **Meta OAuth كامل** — callback + تبادل توكن + إرسال رسائل للعميل
3. **إيميل** لاستعادة كلمة المرور (إنتاج)
4. **دفع / اشتراكات** وفرض حدود الباقات
5. **صفحات Campaigns / Analytics** (placeholder)
6. **موبايل سايدبار** — السايدبار مخفي تحت `md` بدون drawer
7. **بحث الهيدر** — UI فقط، مش مربوط
8. **فصل الـ AI** — `isActive` مش بيتتحقق في `simulateMessage`
9. **FAQs** محفوظة لكن مش داخلة في ردود الـ AI بنفس قوة delivery/hours
10. **Team invites** — الموديل موجود، مفيش API/UI
11. **Leads** — عرض فقط؛ مفيش تحديث حالة من الواجهة؛ ممكن تتكرر leads
12. **Disconnect سوشيال** — API موجود، UI ناقص

---

## بيانات ديمو (حساب أحمد)

```bash
cd backend
npm run db:seed:demo
```

بيملأ حساب `ahmedelsayed2102@icloud.com` بمنتجات ومحادثات وليدز وطلبات وإشعارات عشان الصفحات تبان مليانة.

### AI / Meta / Channels

**Bee3ly is the channel + business OS — not the AI brain.**

- External engine: `AI_ENGINE_URL` (+ optional `AI_ENGINE_API_KEY`)
- Temporary local rules for channel replies only if `AI_ENGINE_DEV_FALLBACK=true`
- `OPENAI_API_KEY` remains a temporary inbox-simulation aid — not the product architecture

**Meta channel foundation**

- `META_APP_ID` / `META_APP_SECRET` / `META_WEBHOOK_VERIFY_TOKEN` / `META_REDIRECT_URI`
- Flow: Connect → OAuth → **select Facebook Page** → store tokens → subscribe webhooks
- Instagram attaches via the Page’s Instagram Business account when present
- Connection statuses: `DISCONNECTED | CONNECTING | CONNECTED | REAUTH_REQUIRED | ERROR | SIMULATION`
- Webhooks: verify + signature + idempotent `webhook_events` + inbound message pipeline → AI Engine adapter

### مسار المنتج الحالي (MVP)

```text
Onboarding → Products → AI config → Campaign brief → Connect FB/IG (أو Simulation)
→ Inbox message → AI tools → Order/Lead → Notification → Analytics
```

---

## مسار تجريبي سريع (Happy path)

```text
1. Register (اسم + إيميل + بيزنس + نوع)
2. خلّص Onboarding
3. Products → أضف 3 منتجات
4. Settings → معرفة البيزنس (توصيل / مواعيد) + ربط تجريبي لو حابب
5. AI → هدف = جلب طلبات
6. Inbox → محاكاة الرسالة لحد ما يتخلق Order
7. شوف Orders + الجرس في الهيدر
```

---

## ملاحظات للتعليمات الجاية

- Immersion: غيّر/كمّل فوق الموجود — متبدأش من صفر إلا لو طلبت كده.
- UI: صفحات الـ app تفضل **full width**؛ الفورمز (login/register/onboarding) تقدر تفضل بعرض ضيق.
- Select: استخدم shadcn Select + DirectionProvider لأي قوائم منسدلة جديدة.
- الدفعات والـ Meta والـ LLM = أكبر فجوات للمنتج الحقيقي بعد الـ MVP slice.

**جاهز للتعليمات القادمة.**
