import { Link, useParams } from 'react-router-dom';
import { findHelpArticle } from '@/features/help/articles';
import { HelpShell } from '@/features/help/help-shell';
import { usePageMeta } from '@/features/help/use-page-meta';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export function HelpArticleView() {
  const { slug } = useParams();
  const { t } = useLocale();
  const article = findHelpArticle(slug ?? '');
  usePageMeta(
    article ? `${article.title} — Bee3ly` : t('helpMissingArticle'),
    article?.intro ?? t('helpMissingArticle'),
  );

  if (!article) {
    return (
      <HelpShell>
        <h1 className="text-ink text-2xl font-bold">
          {t('helpMissingArticle')}
        </h1>
        <Link to={paths.help} className="text-brand mt-4 inline-block text-sm">
          {t('helpBack')}
        </Link>
      </HelpShell>
    );
  }

  return (
    <HelpShell>
      <Link to={paths.help} className="text-brand text-sm font-semibold">
        {t('helpBack')}
      </Link>
      <h1 className="text-ink mt-3 text-3xl font-bold">{article.title}</h1>
      <p className="text-muted mt-2 text-sm leading-7">{article.intro}</p>
      <p className="text-muted mt-1 text-xs">{article.duration}</p>

      <section className="mt-8">
        <h2 className="text-ink text-lg font-bold">{t('helpBefore')}</h2>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm leading-7">
          {article.before.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-lg font-bold">{t('helpSteps')}</h2>
        <ol className="mt-3 space-y-4">
          {article.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="bg-brand/10 text-brand inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {index + 1}
              </span>
              <div>
                <h3 className="text-ink font-semibold">{step.title}</h3>
                <p className="text-muted mt-1 text-sm leading-7">{step.body}</p>
                {step.screenshot ? (
                  <p className="text-muted border-border mt-2 rounded-xl border border-dashed px-3 py-2 text-xs">
                    {step.screenshot}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-border bg-surface mt-8 rounded-2xl border p-4">
        <h2 className="text-ink text-base font-bold">{t('helpWorked')}</h2>
        <p className="text-muted mt-2 text-sm leading-7">{article.success}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-lg font-bold">{t('helpProblems')}</h2>
        <ul className="mt-3 space-y-3">
          {article.problems.map((problem) => (
            <li key={problem.title}>
              <h3 className="text-ink font-semibold">{problem.title}</h3>
              <p className="text-muted mt-1 text-sm leading-7">
                {problem.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-muted mt-8 text-xs">
        {t('helpUpdated')}: {article.lastUpdated}
      </p>
      <p className="mt-4 text-sm">
        <Link to={paths.contact} className="text-brand font-semibold">
          {t('helpStillNeed')}
        </Link>
      </p>
    </HelpShell>
  );
}
