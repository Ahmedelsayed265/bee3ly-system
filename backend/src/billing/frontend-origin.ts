export function billingReturnOrigin(
  raw: string | undefined,
  requestOrigin?: string | null,
) {
  const origins = (raw ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => /^https?:\/\//i.test(origin));
  const requested = requestOrigin?.trim().replace(/\/$/, '') ?? '';
  if (requested && origins.includes(requested)) return requested;
  return origins[0] ?? 'http://localhost:5173';
}
