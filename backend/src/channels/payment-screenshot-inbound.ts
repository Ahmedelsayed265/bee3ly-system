import { stripInboundAiHints } from './inbound-content';

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

function textPrefersEnglish(text: string): boolean {
  const sample = stripInboundAiHints(text);
  if (!sample) return false;
  const ar = (sample.match(new RegExp(ARABIC_RE.source, 'g')) ?? []).length;
  const lat = (sample.match(new RegExp(LATIN_RE.source, 'g')) ?? []).length;
  if (lat === 0) return false;
  if (ar === 0) return true;
  return lat > ar;
}

export function inboundPrefersEnglish(
  message: string,
  history: Array<{ role: string; content: string }>,
): boolean {
  if (textPrefersEnglish(message)) return true;
  for (let i = history.length - 1; i >= 0; i--) {
    if (
      history[i].role === 'CUSTOMER' &&
      textPrefersEnglish(history[i].content)
    ) {
      return true;
    }
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
