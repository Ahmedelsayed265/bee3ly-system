import type { HelpArticle } from './types';

export function filterArticles(articles: HelpArticle[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return articles;
  return articles.filter((article) => {
    const haystack = [article.title, article.intro, ...article.keywords]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}
