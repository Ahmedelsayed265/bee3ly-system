export type HelpCategory = 'start' | 'channels' | 'ads' | 'problems';

export type HelpStep = {
  title: string;
  body: string;
  /** Editor note for a future screenshot. Not a live image. */
  screenshot?: string;
};

export type HelpProblem = {
  title: string;
  body: string;
};

export type HelpArticle = {
  slug: string;
  category: HelpCategory;
  title: string;
  keywords: string[];
  /** Short "what you will do and how long". */
  intro: string;
  duration: string;
  before: string[];
  success: string;
  steps: HelpStep[];
  problems: HelpProblem[];
  /** ISO date. Review when Meta changes its screens. */
  lastUpdated: string;
};

export const HELP_CATEGORIES: Array<{ id: HelpCategory; title: string }> = [
  { id: 'start', title: 'ابدأ من هنا' },
  { id: 'channels', title: 'ربط الصفحات والمحادثات' },
  { id: 'ads', title: 'حساب الإعلانات' },
  { id: 'problems', title: 'لو حاجة وقفت' },
];
