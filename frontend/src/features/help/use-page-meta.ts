import { useEffect } from 'react';

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const root = document.documentElement;
    const previousTitle = document.title;
    root.dataset.pageTitle = title;
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content') ?? '';
    meta?.setAttribute('content', description);
    return () => {
      delete root.dataset.pageTitle;
      document.title = previousTitle;
      meta?.setAttribute('content', previousDescription);
    };
  }, [title, description]);
}
