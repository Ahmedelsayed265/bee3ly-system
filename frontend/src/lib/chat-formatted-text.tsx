import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Renders `**bold**` segments as <strong>; keeps newlines via whitespace-pre-wrap on parent. */
function chatTextWithBold(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={`t-${key++}`}>{text.slice(last, match.index)}</Fragment>,
      );
    }
    nodes.push(
      <strong key={`b-${key++}`} className="font-bold">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={`t-${key++}`}>{text.slice(last)}</Fragment>);
  }
  return nodes.length ? nodes : [text];
}

type ChatFormattedTextProps = {
  text: string;
  className?: string;
};

export function ChatFormattedText({ text, className }: ChatFormattedTextProps) {
  return (
    <p className={cn('whitespace-pre-wrap', className)}>
      {chatTextWithBold(text)}
    </p>
  );
}
