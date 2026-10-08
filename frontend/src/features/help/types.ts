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

export type HelpArticleCopy = {
  title: string;
  keywords: string[];
  /** Short "what you will do and how long". */
  intro: string;
  duration: string;
  before: string[];
  success: string;
  steps: HelpStep[];
  problems: HelpProblem[];
};

export type HelpArticle = HelpArticleCopy & {
  slug: string;
  category: HelpCategory;
  /** ISO date. Review when Meta changes its screens. */
  lastUpdated: string;
  /** English copy. Arabic stays on the article itself. */
  en?: HelpArticleCopy;
};

export const HELP_CATEGORIES: Array<{
  id: HelpCategory;
  title: string;
  titleEn: string;
}> = [
  { id: 'start', title: 'ابدأ من هنا', titleEn: 'Start here' },
  {
    id: 'channels',
    title: 'ربط الصفحات والمحادثات',
    titleEn: 'Pages and conversations',
  },
  { id: 'ads', title: 'حساب الإعلانات', titleEn: 'Ad account' },
  { id: 'problems', title: 'لو حاجة وقفت', titleEn: 'When something stops' },
];
