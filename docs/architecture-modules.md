# ترابط موديولات bee3ly

## مصدر الحقيقة (Single source of truth)

| البيانات | أين تُخزَّن | من يستهلكها |
|----------|-------------|-------------|
| **منتج** (سعر، مخزون، متغيرات) | `Product`: `attributes` JSON + `variants` JSON + `priceEgp` / `stockQuantity` / `inStock` | Products UI، AI context، `createOrder` tool، Analytics COGS |
| **توصيل / شحن** | `Business.shippingZones` JSON (محافظات + سعر) | تبويب **التوصيل** في الإعدادات، `shippingPriceForGovernorate` عند إنشاء الأوردر، AI `getDeliveryInfo` |
| **ساعات الفرع / دفع / FAQs** | `workingHours` (أنشطة بفرع فقط)، `paymentInfo`, `faqs` | تبويب **معرفة البيزنس**، AI context |
| **قنوات** | `SocialAccount` + webhooks Meta | Inbox، AI رد خارجي |
| **محادثة → أوردر** | `Conversation` → `Order` + `OrderItem` | Orders، Campaigns attribution |

> **لا تكرار:** معلومات التوصيل (منطقة، رسوم، مجاني فوق…) **لا تُعدَّل** من معرفة البيزنس — فقط من **مناطق الشحن**. الحقل `deliveryInfo` على `Business` يبقى للبيانات القديمة فقط.

## مسار رسالة → أوردر

```text
Webhook Meta → InboundMessageService.ingest
  → Conversation + Message
  → AiEngine (rules / LLM) + tools (checkStock, createOrder, getDeliveryInfo)
  → Outbound Meta
Realtime → Frontend Inbox
```

`createOrder` يقرأ **المنتج** من DB، **الشحن** من `shippingZones` + محافظة العميل، ويخصم المخزون من `variants` أو `stockQuantity`.

## المنتجات بعد التنظيف

- **المتغيرات:** `variants.axes` + `variants.skus` (سعر ومخزون لكل تركيبة).
- **تفاصيل إضافية:** `attributes` (SKU، مادة، …) حسب نوع البيزنس.
- **مقاس/لون:** داخل `attributes` أو محاور المتغيرات — **لا أعمدة** `sizes` / `colors` منفصلة.

Helper موحّد في الباكند: `productSizeColorLists()` في `product-attributes.ts`.

## إعدادات التاجر

| تبويب | محتوى |
|-------|--------|
| القنوات | Meta OAuth، WhatsApp test، TikTok (قريبًا) |
| التوصيل | `ShippingZonesForm` → `shippingZones` |
| معرفة البيزنس | ساعات فرع (مطاعم/صالونات/…)، دفع، FAQs |
