import { useState } from 'react';

export function clampPage(page: number, totalPages: number) {
  const max = Math.max(1, totalPages);
  return Math.min(Math.max(1, page), max);
}

/** Keeps page at 1 when `scopeKey` changes (filters, campaign, debounced search, etc.). */
export function useScopedListPage(scopeKey: string) {
  const [page, setPage] = useState(1);
  const [scopeSeen, setScopeSeen] = useState(scopeKey);
  if (scopeKey !== scopeSeen) {
    setScopeSeen(scopeKey);
    setPage(1);
  }
  return [page, setPage] as const;
}

/** Clamps page when the server reports fewer total pages than the current index. */
export function adjustPageToTotal(
  page: number,
  setPage: (next: number) => void,
  totalPages: number,
  ready: boolean,
) {
  const max = Math.max(1, totalPages);
  if (ready && page > max) {
    setPage(max);
  }
}
