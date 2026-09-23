type ChainStripProps = {
  items: Array<{ label: string; value: string }>;
  inset?: boolean;
};

export function ChainStrip({ items, inset = false }: ChainStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={
            inset
              ? 'bg-page rounded-2xl px-4 py-4'
              : 'border-border bg-surface rounded-2xl border px-4 py-4'
          }
        >
          <p className="text-ink text-2xl font-bold tracking-tight">
            {item.value}
          </p>
          <p className="text-muted mt-1 text-xs">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
