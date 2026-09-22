import { X } from 'lucide-react';
import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type TagsInputProps = {
  id?: string;
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
};

function splitDraft(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,،]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

export function TagsInput({
  id,
  label,
  values,
  onChange,
  placeholder,
  hint,
  className,
}: TagsInputProps) {
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const next = splitDraft(raw);
    if (!next.length) {
      setDraft('');
      return;
    }
    const merged = [...values];
    for (const value of next) {
      if (!merged.includes(value)) merged.push(value);
    }
    onChange(merged);
    setDraft('');
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      {label && id ? <Label htmlFor={id}>{label}</Label> : null}
      <div
        className={cn(
          'border-border bg-input focus-within:border-brand focus-within:ring-brand/20 flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-xl border px-2.5 py-2 transition focus-within:ring-2',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="border-border bg-surface text-ink inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium"
          >
            <span className="truncate leading-normal">{value}</span>
       
            <button
              type="button"
              className="text-muted hover:text-danger shrink-0 rounded p-0.5 transition"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(index);
              }}
              aria-label={value}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
              e.preventDefault();
              commit(draft);
              return;
            }
            if (e.key === 'Backspace' && !draft && values.length) {
              e.preventDefault();
              removeAt(values.length - 1);
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          placeholder={values.length ? undefined : placeholder}
          className="text-ink placeholder:text-muted min-w-28 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none"
        />
      </div>
      {hint ? <p className="text-muted mt-1 text-[11px]">{hint}</p> : null}
    </div>
  );
}
