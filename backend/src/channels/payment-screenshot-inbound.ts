const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

export function inboundPrefersEnglish(
  message: string,
  history: Array<{ role: string; content: string }>,
): boolean {
  const score = (text: string) => {
    const ar = (text.match(new RegExp(ARABIC_RE.source, 'g')) ?? []).length;
    const lat = (text.match(new RegExp(LATIN_RE.source, 'g')) ?? []).length;
    if (lat === 0) return false;
    if (ar === 0) return true;
    return lat > ar;
  };
  if (score(message)) return true;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'CUSTOMER' && score(history[i].content)) return true;
  }
  return false;
}

export function paymentScreenshotAckReply(english: boolean): string {
  if (english) {
    return (
      'Receipt received ✅ It will be reviewed and your order will be created ' +
      'after the store owner confirms the transfer. We will message you once it is approved.'
    );
  }
  return (
    'تم استلام الإيصال ✅ ' +
    'سيتم مراجعته وإنشاء الطلب بعد تأكيد صاحب المتجر للتحويل. ' +
    'هنبعتلك رسالة أول ما يتم التأكيد.'
  );
}
