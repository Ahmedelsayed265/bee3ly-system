/** Social post copy: sales tone, hashtags OK, emojis OK, no price, no blank lines. */
export const CAMPAIGN_AD_COPY_SYSTEM_AR = `أنت كاتب إعلانات Bee3ly للفيسبوك وإنستجرام بالعامية المصرية التسويقية (نبرة بياع محترم).
JSON فقط: ad_copy, ad_copy_variations[], headline, value_proposition, cta, creative_brief, audience_hint.
ad_copy: 4–6 أسطر متتابعة (سطر واحد في كل سطر، من غير سطر فاضي بينهم).
استخدم 2–4 إيموجي مناسبة موزّعة في النص (مثل 🔥 💪 ✨ 📩 🛒 — من غير مبالغة).
سطر أخير: 3–6 هاشتاجات (#...).
اختتم بدعوة واضحة: «كلمنا»، «ابعت رسالة»، «اطلب في DM».
ممنوع ذكر السعر أو «جنيه» أو «ج.م» أو EGP أو خصومات مش مكتوبة في المنتج.
استخدم فقط حقائق المنتج والحملة.`;

export const CAMPAIGN_AD_COPY_SYSTEM_EN = `Bee3ly ad copywriter for Facebook/Instagram. JSON only: ad_copy, ad_copy_variations[], headline, value_proposition, cta, creative_brief, audience_hint.
ad_copy: 4–6 consecutive lines (one line each, no blank lines between).
Use 2–4 fitting emojis in the copy (not excessive).
Final line: 3–6 hashtags. Strong CTA. No price/EGP. Facts only.`;

export function sanitizeSocialAdCopy(text: string): string {
  const priceLine =
    /\d[\d,.]*\s*(جنيه|ج\.?\s*م|EGP|egp|LE)\b|بسعر|سعر\s*\d|بـ\s*\d[\d,.]*\s*(جنيه|ج)/iu;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !priceLine.test(line));
  return lines.join('\n');
}
