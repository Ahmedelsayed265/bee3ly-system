# bee3ly

منصة **مبيعات اجتماعية بالذكاء الاصطناعي** للبيزنسات المصرية — **من أول رسالة لأول أوردر**.

| الجمهور | ابدأ من هنا |
|---------|-------------|
| **مستثمر / شريك** | **[docs/bee3ly-investor-brief-ar.pdf](./docs/bee3ly-investor-brief-ar.pdf)** (PDF) · [investor-presentation.md](./docs/investor-presentation.md) |
| **خارطة الطريق** | [docs/roadmap.md](./docs/roadmap.md) |
| **فهرس الوثائق** | [docs/README.md](./docs/README.md) |
| **مطور** | التشغيل المحلي ↓ + [architecture-modules.md](./docs/architecture-modules.md) |

---

## الرؤية في سطر

**Bee3ly = نظام تشغيل التاجر** (inbox، منتجات، أوردرات، قنوات، حملات).  
**AI Service** (`ai-services/`) = **الدماغ** (Gemini + أدوات على بيانات التاجر) — يُشغَّل منفصلًا ويُربط عبر `AI_SERVICE_URL`.

```text
Onboarding → Products + Shipping/Knowledge → Connect channel (or Simulation)
→ Inbound message → AI (+ tools) → Order/Lead → Notification → Dashboard metrics
```

---

## Stack

| طبقة | التقنية |
|------|---------|
| Frontend | React (Vite) + TypeScript + TanStack Query + Tailwind + shadcn/Radix |
| Backend | NestJS + Prisma + PostgreSQL + JWT + Socket.io realtime |
| AI | Python FastAPI + Gemini (`ai-services/`)؛ fallback rules في Backend للتطوير |
| DB | Docker Postgres (`docker-compose.yml`) أو `npm run db:local` |

---

## هيكل الريبو

```text
bee3ly-system/
├── backend/          # NestJS API + Prisma
├── frontend/         # Vite React SPA
├── ai-services/      # FastAPI + Gemini (محرك AI خارجي)
├── docs/             # عرض مستثمر، roadmap، معمارية، TikTok، AI setup
├── docker-compose.yml
└── README.md
```

---

## التشغيل المحلي

### أمر واحد (Docker Postgres + Backend + Frontend)

```bash
cd backend && cp .env.example .env   # مرة واحدة
cd backend && npm install
cd frontend && npm install
cd .. && npm run dev
```

- API: `http://localhost:5000`
- UI: `http://localhost:5173`
- إيقاف Postgres container: `npm run dev:stop`

`DATABASE_URL` الافتراضي في `backend/.env.example` يطابق `docker-compose.yml`.

### محرك AI (اختياري للديمو الكامل)

```bash
cd ai-services && cp .env.example .env   # إن وُجد؛ أو أنشئ .env يدويًا
# GEMINI_API_KEY + REDIS_URL — انظر docs/ai-services-setup.md
source .venv/Scripts/activate
python -m app.main
```

في `backend/.env`: `AI_SERVICE_URL=http://127.0.0.1:8000`

> `npm run dev` **لا** يشغّل `ai-services` تلقائيًا.

### بدون Docker

```bash
cd backend && npm run db:local
```

ثم `npm run start:dev` (backend) و `cd frontend && npm run dev`.

---

## حالة المنتج (ملخص)

**جاهز:** Auth، Onboarding، Products (variants)، Inbox + realtime + simulate، Orders، Notifications، AI agent settings، Settings (channels/shipping/knowledge)، Campaigns (create + assisted/simulated launch)، Dashboard metrics من API، Privacy/Terms.

**جزئي:** Meta/WhatsApp production، Billing (بدون دفع)، Leads (عرض)، AI merchant chat (API فقط). تحليلات الحملات داخل **الحملات** + `/analytics/overview` للوحة الرئيسية.

**مخطط:** TikTok، Stripe/limits، Team invites — [roadmap.md](./docs/roadmap.md).

التفاصيل الكاملة: **[investor-presentation.md](./docs/investor-presentation.md)**.

---

## بيانات ديمو

```bash
cd backend
npm run db:seed:demo
```

يملأ حساب `ahmedelsayed2102@icloud.com` بمنتجات ومحادثات وleads وأوردرات.

---

## Env (مرجع سريع)

**Backend** — `backend/.env.example`: `DATABASE_URL`, `JWT_*`, `META_*`, `AI_SERVICE_URL`, `AI_ENGINE_DEV_FALLBACK`, …

**Frontend** — `VITE_API_URL` (على Vercel: URL الـ API العام HTTPS)

**AI** — `GEMINI_API_KEY`, `REDIS_URL`, `BEE3LY_API_URL` — [ai-services-setup.md](./docs/ai-services-setup.md)

---

## Brand

| Token | Hex |
|-------|-----|
| Primary | `#6366F1` |
| Text | `#0F172A` |
| Background | `#F8FAFC` |

---

## مسار تجريبي (Happy path)

```text
1. Register → Onboarding
2. Products (3+) → Settings (shipping + business knowledge)
3. AI → goal = orders
4. Inbox → simulate until Order appears
5. Orders + notifications + Dashboard
```
