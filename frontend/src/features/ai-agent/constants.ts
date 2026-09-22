export const AI_GOALS = [
  'GET_ORDERS',
  'ANSWER_QUESTIONS',
  'QUALIFY',
  'BOOK_APPOINTMENTS',
] as const;

export const AI_TONES = [
  'FRIENDLY',
  'PROFESSIONAL',
  'SHORT',
  'EGYPTIAN',
] as const;

export type AiGoal = (typeof AI_GOALS)[number];
export type AiTone = (typeof AI_TONES)[number];
