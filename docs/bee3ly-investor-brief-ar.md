---
title: bee3ly
---

<div class="cover">

# bee3ly

**منصة مبيعات اجتماعية بالذكاء الاصطناعي للبيزنسات المصرية**

<div class="tagline">من أول رسالة → لأول أوردر</div>

<div class="meta">وثيقة نظرة عامة للمستثمر والشركاء · سبتمبر 2026<br/>مبنية على الكود الفعلي في المشروع (NestJS · React · Python/Gemini)</div>

</div>

## 1. أهداف المشروع

### الرؤية

bee3ly تهدف إلى تمكين **التاجر المصري** — في الملابس، المطاعم، العطور، والتجارة الإلكترونية — من **إدارة كل محادثات العملاء على السوشيال ميديا** و**تحويلها إلى مبيعات حقيقية** دون الحاجة لفريق دعم كبير. الفكرة ليست «شات بوت يجيب كلام عام»، بل **وكيل مبيعات ذكي** يفهم العربية والإنجليزية، يعرف منتجات التاجر وأسعارها ومخزونها ومناطق الشحن، ويستطيع **إنشاء طلب (Order)** وإبلاغ التاجر فورًا.

### الأهداف الاستراتيجية الخمسة

| # | الهدف | الشرح |
|---|--------|--------|
| 1 | **صندوق وارد موحّد (Unified Inbox)** | جمع Facebook و Instagram و WhatsApp (و TikTok لاحقًا) في واجهة واحدة حتى لا يضيع العميل بين التطبيقات. |
| 2 | **وكيل مبيعات بالذكاء الاصطناعي** | الرد على الأسئلة المتكررة (سعر، مقاس، توصيل، طرق الدفع) بسرعة، مع أدوات حقيقية على بيانات التاجر (مخزون، أوردر). |
| 3 | **نظام تشغيل للبيزنس (Business OS)** | منتجات، leads، orders، إشعارات، حملات، وتحليلات **مرتبطة بالمحادثة** — ليس chatbot منفصل عن العمليات. |
| 4 | **مصر أولًا (Egypt-first)** | جنيه مصري، محافظات الشحن، أرقام 01x، InstaPay/Vodafone Cash، واجهة عربية افتراضية مع RTL ودعم إنجليزي. |
| 5 | **فصل المنصة عن «الدماغ»** | bee3ly = قنوات + بيانات + أدوات + واجهة التاجر؛ **AI Service** منفصل (Gemini) = الذكاء — لسهولة التوسع واستبدال النموذج والامتثال. |

### الهدف التشغيلي الحالي (MVP)

<div class="flow">تسجيل → Onboarding → منتجات + معرفة البيزنس → (ربط قناة أو محاكاة Inbox)
→ رسالة عميل → AI + أدوات → Lead/Order → إشعار التاجر → مقاييس على الداشبورد</div>

هذا المسار **قابل للتجربة من البداية للنهاية اليوم** عبر محاكاة الرسائل في Inbox، وعند تفعيل Meta يمكن استقبال رسائل حقيقية عبر نفس المسار التقني.

---

## 2. المشاكل التي يحلها bee3ly

**فجوة الرد (Response gap):** العميل يرسل DM أو تعليقًا؛ إذا تأخر الرد دقائق أو ساعات، ينتقل للم competitor. bee3ly ترد فورًا عبر AI مع إمكانية تحويل لموظف بشري عند الحاجة.

**تشتت القنوات:** التاجر يفتح Messenger و Instagram و WhatsApp منفصلين. bee3ly تجمع المحادثات في **Inbox واحد** مع تحديث **Realtime** (Socket.io).

**تكرار الأسئمة:** «السعر؟» «المقاس متوفر؟» «الشحن للإسكندرية؟» — تستهلك وقت المالك. الوكيل يجيب من **قاعدة البيانات** (منتجات، shipping zones، FAQs) وليس من تخمين.

**فصل المحادثة عن الطلب:** كثير من التجار يدونون الطلبات يدويًا على WhatsApp أو Excel. bee3ly تربط المحادثة بـ **Order** في النظام + **Notification** للمالك.

**الدفع المحلي (Prepaid):** للتحويلات (InstaPay / Vodafone Cash) النظام يدعم **مراجعة screenshot** وتأكيد التاجر قبل إتمام الأوردر — لتقليل الاحتيال والأخطاء.

**الحملات بدون ربط:** bee3ly تبني **Campaigns** مع **attribution** (ربط محادثات/leads/orders بالحملة) على مستوى البيانات؛ الإطلاق على Meta Ads حاليًا **بمساعدة الفريق** وليس نشرًا تلقائيًا 100%.

**منتجات عالمية لا تناسب مصر:** bee3ly مصممة للسياق المحلي (محافظات، EGP، RTL، أسلوب كلام تجاري مصري/إنجليزي).

---

## 3. كيف يعمل الحل (باختصار تقني مفهوم)

<div class="flow">قنوات العميل (FB / IG / WA / محاكاة)
    ↓ Webhooks أو Simulate
Bee3ly Backend: محادثة + رسالة + JWT للتاجر
    ↓
AI Service (Gemini): فهم النية + استدعاء أدوات (checkStock, createOrder, getDeliveryInfo…)
    ↓
Bee3ly Backend: حفظ رد AI + Order/Lead + إشعار
    ↓
Realtime → Inbox و Dashboard للتاجر</div>

**مبدأ مهم للمستثمر:** الذكاء الاصطناعي **لا يخترع الأسعار**. الأدوات تقرأ من PostgreSQL. هذا يقلل الأخطاء ويبني ثقة التاجر.

**التقنيات:** Frontend (React + Vite)، Backend (NestJS + Prisma + PostgreSQL)، AI (Python FastAPI + Google Gemini)، قنوات Meta (OAuth، Webhooks، WhatsApp Embedded Signup — حسب الإعداد).

---

## 4. ما تم تنفيذه فعليًا

<div class="legend"><span class="badge-ok">✅ جاهز</span> · <span class="badge-partial">🟡 جزئي/تجريبي</span> · <span class="badge-planned">⏳ مخطط</span></div>

### 4.1 واجهة التاجر (Frontend)

| الميزة | الحالة | تفاصيل |
|--------|--------|--------|
| صفحة ترحيب + تسجيل/دخول | ✅ | عربي/إنجليزي، RTL |
| Onboarding | ✅ | نوع البيزنس، الأهداف، القنوات |
| Dashboard الرئيسي | ✅ | مقاييس حقيقية من API |
| Inbox | ✅ | محادثات، realtime، محاكاة رسائل |
| تأكيد تحويل prepaid | ✅ | مراجعة صورة + تأكيد التاجر |
| المنتجات | ✅ | إضافة/تعديل، variants، attributes |
| الطلبات | ✅ | قائمة، حالات، تفاصيل |
| Leads | 🟡 | عرض؛ تحديث الحالة محدود من UI |
| إعدادات AI Agent | ✅ | تفعيل، هدف الوكيل |
| الإعدادات | ✅ | قنوات، مناطق شحن، معرفة البيزنس |
| الحملات Campaigns | ✅ | إنشاء، توصيات، launch بمساعدة/محاكاة |
| صفحة Analytics | 🟡 | تصميم جاهز؛ جزء من البيانات preview |
| الباقات Billing | 🟡 | اختيار tier في DB بدون دفع إلكتروني |
| Privacy & Terms | ✅ | مطلوب لـ Meta App |

### 4.2 الخادم (Backend)

| الوحدة | الحالة |
|--------|--------|
| Auth (JWT + refresh cookie) | ✅ |
| Businesses | 🟡 (دعوات الفريق ⏳) |
| Products, Conversations, Orders | ✅ |
| Notifications + Realtime | ✅ |
| AI (محاكاة + agent) | ✅ |
| Analytics overview + attribution | ✅ |
| Campaigns API | ✅ |
| Social Meta (OAuth, webhook, WA embedded) | 🟡 |
| TikTok | ⏳ (خطة موثّقة) |

### 4.3 الذكاء الاصطناعي

| المكوّن | الحالة |
|---------|--------|
| AI Service (Gemini + tools) | ✅ |
| ربط Backend عبر AI_SERVICE_URL | ✅ |
| Fallback rules للتطوير | ✅ |
| حماية prepaid (لا order قبل تأكيد التاجر) | ✅ |
| استشاري التاجر (API) | 🟡 UI محدود |

### 4.4 البنية والتشغيل

| البند | الحالة |
|-------|--------|
| Postgres + Docker compose | ✅ |
| تشغيل dev واحد (backend + frontend) | ✅ |
| Deploy AI Service إنتاج | ⏳ |
| Frontend على Vercel (اختياري) | 🟡 |

### 4.5 ما يمكن عرضه في Demo (15 دقيقة)

1. تسجيل وتكميل Onboarding  
2. إضافة منتجات + مناطق شحن + معرفة البيزنس  
3. تفعيل AI  
4. Inbox → محاكاة حتى يظهر Order  
5. Orders + الإشعارات + Dashboard  
6. (اختياري) تشغيل ai-services لعرض Gemini  

---

## 5. التحديثات القادمة (Roadmap)

### قريبًا — Soon (0–8 أسابيع): إغلاق loop البيتا

| البند | النتيجة المتوقعة |
|--------|-------------------|
| أول تاجر بيتا على Meta (FB/IG/WA) | رسائل حقيقية → AI → orders |
| Deploy AI Service (staging/prod) | Gemini مستقر + Redis للجلسات |
| صفحة Analytics من API بالكامل | إزالة البيانات التجريبية |
| UX فصل/إعادة ربط القنوات | تقليل الدعم اليدوي |
| Leads workflow كامل | تحديث حالة من UI |
| إيميل transactional | reset password و invites |
| Inbox على الموبايل | drawer للتنقل |
| Playbook أول بيزنس | checklist تشغيل (موجود في docs) |

### التالي — Next (2–4 أشهر): إيرادات وتوسع

| البند | النتيجة |
|--------|---------|
| Stripe أو Paymob + حدود الباقات | تحصيل اشتراكات |
| Meta Ads API أو partner launch | من assisted إلى published |
| TikTok (OAuth + webhook + outbound) | قناة جديدة |
| Team invites | موظفين للتاجر |
| واجهة استشاري AI للتاجر | merchant chat |
| Observability | logs، latency AI، فشل webhooks |
| Feature flags | rollout تدريجي |

### لاحقًا — Later (6+ أشهر): منصة

- فروع متعددة / franchise  
- تكامل Shopify وغيره  
- Voice / مكالمات WhatsApp  
- Attribution متقدم (Meta CAPI…)  
- White-label / وكالات  

### ما لن نفعله قريبًا (بشفافية)

- ادّعاء نشر إعلان Meta تلقائي 100% بدون Ads API — النظام يمنع ذلك عمدًا.  
- LLM يختلق أسعار — الأدوات على DB فقط.  
- تخزين secrets في الكود — كل المفاتيح في environment variables.  

---

## 6. نموذج العمل (الوضع الحالي والمستقبل)

**اليوم:** ثلاث باقات في النظام (FREE / STARTER / GROWTH) تُخزَّن على البيزنس **بدون** بوابة دفع أو فرض حدود features.

**المستقبل القريب (Roadmap):** اشتراك شهري + حدود (محادثات AI، عدد القنوات، مقاعد الفريق) عبر Paymob/Stripe.

---

## 7. لماذا bee3ly الآن؟

- **Social commerce** في مصر يحدث already في DM — المنتج يلتقط workflow موجود وينظمه.  
- **تكلفة AI** انخفضت (Gemini) لكن **القيمة** في الربط بالمخزون والشحن والأوردر — وهذا مُنفَّذ في المعمارية.  
- **MVP ليس عرض PowerPoint:** كود modular (adapter، AI منفصل، webhooks، realtime) جاهز للبيتا والتوسع.

---

<div class="footer-note">

**bee3ly** · bee3ly-system · github.com/Ahmedelsayed265/bee3ly-system  
للتفاصيل التقنية: docs/investor-presentation.md · docs/roadmap.md · README.md

</div>
