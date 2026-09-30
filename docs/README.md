# وثائق bee3ly

مركز الوثائق للفريق والمستثمرين والمطورين. المحتوى مبني على **الكود الحالي** في الريبو — وليس على خطط قديمة.

---

## للمستثمر / العرض التقديمي

| الملف | المحتوى |
|--------|---------|
| **[bee3ly-investor-brief-ar.pdf](./bee3ly-investor-brief-ar.pdf)** | **PDF جاهز للطباعة/الإرسال** — أهداف، مشاكل، منفّذ، قادم |
| **[bee3ly-investor-brief-ar.html](./bee3ly-investor-brief-ar.html)** | نفس المحتوى (مصدر الـ PDF) |
| **[investor-presentation.md](./investor-presentation.md)** | عرض تفصيلي + جداول حالة المنتج |
| **[roadmap.md](./roadmap.md)** | Soon / Next / Later — أولويات المنتج والتقنية |

إعادة توليد PDF: `cd docs && npm install && npm run pdf`

---

## للفريق التقني

| الملف | المحتوى |
|--------|---------|
| **[architecture-modules.md](./architecture-modules.md)** | مصادر الحقيقة، مسار رسالة → أوردر، إعدادات التاجر |
| **[tiktok-integration.md](./tiktok-integration.md)** | خطة ربط TikTok (parity مع Meta) |
| **[ai-services-setup.md](./ai-services-setup.md)** | تشغيل محرك الذكاء (Python + Gemini) وربطه بالـ Backend |
| **[beta-first-business.md](./beta-first-business.md)** | checklist أول تاجر بيتا على Meta + AI |

---

## للتشغيل السريع

التشغيل اليومي (Docker Postgres + Backend + Frontend) موثّق في **[README.md](../README.md)** في جذر الريبو.

**ملاحظة:** محرك الـ AI (`ai-services/`) **لا** يُشغَّل تلقائيًا مع `npm run dev` — يحتاج تيرمنال منفصل عند اختبار Gemini.

---

## تحديث الوثائق

عند إنجاز feature جديد:

1. حدّث **product status** في `investor-presentation.md` (قسم «ما تم تحقيقه»).
2. انقل البند من **roadmap.md** إذا أصبح جاهزًا.
3. عدّل **architecture-modules.md** إذا تغيّر مصدر حقيقة أو مسار البيانات.
