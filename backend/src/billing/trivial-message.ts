export type TrivialKind = 'hi' | 'thanks' | 'ok';

const PATTERNS: Array<[RegExp, TrivialKind]> = [
  [/^(hi|hello|hey)[.!\s]*$/i, 'hi'],
  [/^(thanks|thank you|thx|ty)[.!\s]*$/i, 'thanks'],
  [/^(ok|okay|k)[.!\s]*$/i, 'ok'],
  [
    /^(السلام عليكم|سلام عليكم|سلام|مرحبا|مرحبًا|اهلا|أهلا|اهلاً|أهلًا|هاي)[.!\s]*$/u,
    'hi',
  ],
  [/^(شكرا|شكرًا|شكراً|متشكر|متشكرة|تسلم|تسلمي)[.!\s]*$/u, 'thanks'],
  [/^(تمام|اوك|أوك|أوكي|اوكي|ماشي|حاضر)[.!\s]*$/u, 'ok'],
];

export function trivialKind(text: string): TrivialKind | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 40) return null;
  for (const [pattern, kind] of PATTERNS) {
    if (pattern.test(trimmed)) return kind;
  }
  return null;
}

export function trivialReply(text: string): string | null {
  const kind = trivialKind(text);
  if (!kind) return null;
  const arabic = /[\u0600-\u06FF]/.test(text);
  if (arabic) {
    if (kind === 'thanks') return 'على الرحب والسعة.';
    if (kind === 'ok') return 'تمام.';
    return 'أهلاً بيك. قولي عايز إيه وأساعدك.';
  }
  if (kind === 'thanks') return "You're welcome.";
  if (kind === 'ok') return 'Got it.';
  return "Hi. Tell me what you need and I'll help.";
}
