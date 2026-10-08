import type { HelpArticle } from './types';

export function filterArticles(articles: HelpArticle[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return articles;
  return articles.filter((article) => {
    const copies = [article, article.en].filter((copy) => copy != null);
    const haystack = copies
      .flatMap((copy) => [
        copy.title,
        copy.intro,
        ...copy.keywords,
        ...copy.steps.map((step) => `${step.title} ${step.body}`),
        ...copy.problems.map((problem) => `${problem.title} ${problem.body}`),
      ])
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}
