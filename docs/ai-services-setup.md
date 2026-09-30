# تشغيل محرك الذكاء الاصطناعي (`ai-services`)

Bee3ly (NestJS) = **نظام التشغيل للتاجر** (قنوات، inbox، أوردرات، سياق).  
`ai-services` = **الدماغ** (Gemini + أدوات على كatalog التاجر عبر API).

---

## المتطلبات

- Python 3.11+ (موصى به)
- `GEMINI_API_KEY` من Google AI Studio
- Backend شغّال على `http://127.0.0.1:5000`
- `REDIS_URL` في `.env` (Redis اختياري عمليًا — يوجد fallback in-memory عند فشل الاتصال)

---

## إعداد

```bash
cd ai-services
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
```

أنشئ `ai-services/.env`:

```env
GEMINI_API_KEY=...
REDIS_URL=redis://127.0.0.1:6379/0
PORT=8000
BEE3LY_API_URL=http://127.0.0.1:5000
```

---

## التشغيل

```bash
cd ai-services
source .venv/Scripts/activate
python -m app.main
```

- Health: `GET http://127.0.0.1:8000/health`
- عقد الـ API: `POST /api/v1/chat` (عميل)، `POST /api/v1/merchant/chat` (استشاري التاجر — endpoint جاهز)

---

## ربط Backend

في `backend/.env`:

```env
AI_SERVICE_URL=http://127.0.0.1:8000
```

بدون `AI_SERVICE_URL`: إذا `AI_ENGINE_DEV_FALLBACK=true` يُستخدم محرك **قواعد** محلي للتطوير؛ وإلا رد آمن عام.

---

## أمان

- الـ Backend يصدر **JWT scoped للتاجر** (`MerchantTokenService`) ويرسله Bearer للـ AI Service.
- عند فشل AI أو timeout: رد fallback **لا يقرأ كatalog منتجات** (منع تسريب بين تجار).
