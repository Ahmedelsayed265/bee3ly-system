type ThreadMessage = {
  id: string;
  role: string;
  meta?: {
    attachments?: Array<{ type: string; url: string }>;
  } | null;
};

export function latestPaymentReceiptMessageId(
  messages: ThreadMessage[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'CUSTOMER') continue;
    const images = m.meta?.attachments?.filter(
      (a) => a.type === 'image' && a.url,
    );
    if (images?.length) return m.id;
  }
  return null;
}
