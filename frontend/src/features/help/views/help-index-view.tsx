import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { helpArticles } from '@/features/help/articles';
import { filterArticles } from '@/features/help/filter-articles';
import { HelpShell } from '@/features/help/help-shell';
import { HELP_CATEGORIES } from '@/features/help/types';
import { usePageMeta } from '@/features/help/use-page-meta';
import { useLocale } from '@/features/i18n/locale-context';

export function HelpIndexView() {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterArticles(helpArticles, query), [query]);
  usePageMeta(
    'مركز المساعدة — Bee3ly',
    'إزاي تربط فيسبوك وإنستجرام وواتساب وحساب الإعلانات في Bee3ly.',
  );

  return (
    <HelpShell>
      <h1 className="text-ink text-3xl font-bold">مركز المساعدة</h1>
      <p className="text-muted mt-2 text-sm leading-7">
        خطوات قصيرة بالعربي عشان تربط صفحاتك وحساب الإعلانات.
      </p>
      <label className="mt-6 block">
        <span className="sr-only">{t('helpSearch')}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('helpSearch')}
          className="border-border bg-surface text-ink w-full rounded-2xl border px-4 py-3 text-sm"
        />
      </label>
      {visible.length === 0 ? (
        <p className="text-muted mt-6 text-sm">{t('helpEmptySearch')}</p>
      ) : (
        HELP_CATEGORIES.map((category) => {
          const items = visible.filter(
            (article) => article.category === category.id,
          );
          if (!items.length) return null;
          return (
            <section key={category.id} className="mt-8">
              <h2 className="text-ink text-base font-bold">{category.title}</h2>
              <ul className="mt-3 space-y-3">
                {items.map((article) => (
                  <li key={article.slug}>
                    <Link
                      to={`/help/${article.slug}`}
                      className="border-border bg-surface hover:border-brand/40 block rounded-2xl border p-4"
                    >
                      <span className="text-ink font-semibold">
                        {article.title}
                      </span>
                      <span className="text-muted mt-1 block text-sm leading-6">
                        {article.intro}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </HelpShell>
  );
}
