export type InboundAttachment = {
  type: string;
  url: string;
};

/** Text stored + sent to AI when Meta delivers images without caption. */
export const IMAGE_ATTACHMENT_AI_HINT =
  '[IMAGE_ATTACHMENT: customer sent an image — treat as transfer/payment screenshot if checkout asked for one; use transferToHuman PAYMENT_REVIEW when prepaid flow applies]';

export function isImageAttachmentMessage(text: string): boolean {
  return text.includes('[IMAGE_ATTACHMENT:');
}

export function buildInboundText(
  text: string,
  attachments: InboundAttachment[],
): string {
  const trimmed = text.trim();
  const hasImage = attachments.some((a) => a.type === 'image');
  if (hasImage) {
    return trimmed ? `${trimmed}\n${IMAGE_ATTACHMENT_AI_HINT}` : IMAGE_ATTACHMENT_AI_HINT;
  }
  if (trimmed) return trimmed;
  if (attachments.length) return '[ATTACHMENT: file without text]';
  return '';
}

export function parseMetaMessageAttachments(
  message: Record<string, unknown> | undefined,
): InboundAttachment[] {
  if (!message) return [];
  const raw = message.attachments;
  if (!Array.isArray(raw)) return [];
  const out: InboundAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const type = typeof row.type === 'string' ? row.type : 'file';
    const payload = row.payload as Record<string, unknown> | undefined;
    const url = typeof payload?.url === 'string' ? payload.url : '';
    if (url) out.push({ type, url });
  }
  return out;
}
