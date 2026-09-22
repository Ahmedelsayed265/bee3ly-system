type AnalyticsMetricCardsProps = {
  cards: Array<{ label: string; value: number }>;
};

export function AnalyticsMetricCards({ cards }: AnalyticsMetricCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="border-border bg-surface rounded-2xl border p-4"
        >
          <p className="text-muted text-xs">{c.label}</p>
          <p className="text-ink mt-2 text-2xl font-bold">{c.value}</p>
        </div>
      ))}
    </section>
  );
}
