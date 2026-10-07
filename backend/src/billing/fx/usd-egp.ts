const RATE_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_MS = 15 * 60 * 1000;

let cached: { rate: number; at: number } | null = null;

export function egpFromUsd(usd: number, egpPerUsd: number) {
  return Math.max(1, Math.round(usd * egpPerUsd));
}

export async function usdToEgp(usd: number) {
  const rate = await egpPerUsd();
  return { egp: egpFromUsd(usd, rate), rate };
}

async function egpPerUsd() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.rate;
  const res = await fetch(RATE_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('fx');
  const data = (await res.json()) as {
    result?: string;
    rates?: { EGP?: number };
  };
  const rate = data.rates?.EGP;
  if (data.result !== 'success' || typeof rate !== 'number' || !(rate > 0)) {
    throw new Error('fx');
  }
  cached = { rate, at: Date.now() };
  return rate;
}
