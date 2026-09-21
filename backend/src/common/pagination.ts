export function pageWindow(page = 1, limit = 10) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 10));
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function pageMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
