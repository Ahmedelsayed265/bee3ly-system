/**
 * Build a public comment acknowledgment that stays unique per comment.
 * Meta often hides back-to-back identical page replies as spam even when
 * the Graph API returns a successful reply id.
 */
export function buildPublicCommentAck(input: {
  businessName?: string | null;
  businessReply?: string | null;
  envReply?: string | null;
  /** Stable salt (usually commentId) so retries stay consistent. */
  salt: string;
}): string {
  const shop = input.businessName?.trim() || 'المتجر';
  const custom = input.businessReply?.trim() || input.envReply?.trim() || null;

  const variants = custom
    ? diversifyCustomReply(custom)
    : defaultAckVariants(shop);

  return variants[pickIndex(input.salt, variants.length)];
}

function defaultAckVariants(shop: string): string[] {
  return [
    `أهلاً بيك! تعليقك وصل لـ ${shop}. هنبعتلك التفاصيل في رسالة خاصة قريب 💬`,
    `مرحباً! شكرًا على تعليقك لـ ${shop}. التفاصيل هتوصلك في الخاص حالاً 📩`,
    `أهلًا وسهلًا! رسالتك وصلت لـ ${shop} وهنكلمك على الخاص بالتفاصيل ✨`,
    `تم استلام تعليقك عند ${shop} ✓ هنبعتلك التفاصيل في رسالة خاصة`,
    `يا مرحب! تعليقك عند ${shop} وصلنا. هتوصلك التفاصيل في الخاص قريب 💬`,
    `شكرًا لتواصلك مع ${shop}! هنبعتلك كل التفاصيل في رسالة خاصة دلوقتي 🙌`,
  ];
}

/** Keep merchant wording, but rotate light endings so Meta won't collapse duplicates. */
function diversifyCustomReply(base: string): string[] {
  const trimmed = base.trim();
  const endings = ['', ' 💬', ' ✨', ' 📩', ' ✓', ' 🙌'];
  return endings.map((ending) => {
    if (!ending) return trimmed;
    if (trimmed.endsWith(ending.trim())) return trimmed;
    return `${trimmed}${ending}`;
  });
}

function pickIndex(salt: string, modulo: number): number {
  if (modulo <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < salt.length; i += 1) {
    hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}
