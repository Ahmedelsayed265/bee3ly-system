import { LayoutTemplate, Smile, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/features/inbox/components/emoji-picker';
import { useLocale } from '@/features/i18n/locale-context';
import {
  buildQuickSends,
  buildTemplates,
  type QuickReply,
  type ReplyContext,
} from '@/features/inbox/reply-kit';
import { cn } from '@/lib/utils';

type MessageComposerProps = {
  draft: string;
  isHumanMode: boolean;
  isPending: boolean;
  replyContext: ReplyContext;
  onDraftChange: (value: string) => void;
  onSend: (content: string, quickReplies?: QuickReply[]) => void;
};

export function MessageComposer({
  draft,
  isHumanMode,
  isPending,
  replyContext,
  onDraftChange,
  onSend,
}: MessageComposerProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const templateBtnRef = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<'emoji' | 'templates' | null>(null);
  const [panelStyle, setPanelStyle] = useState<{
    left: number;
    bottom: number;
  } | null>(null);
  const [attached, setAttached] = useState<QuickReply[]>([]);

  const quickSends = buildQuickSends(t);
  const templates = buildTemplates(t, replyContext);

  useEffect(() => {
    if (!draft) setAttached([]);
  }, [draft]);

  useLayoutEffect(() => {
    if (!panel) return;
    const anchor =
      panel === 'emoji' ? emojiBtnRef.current : templateBtnRef.current;
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const width = panel === 'emoji' ? 320 : 288;
      let left = rect.right - width;
      left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
      setPanelStyle({
        left,
        bottom: window.innerHeight - rect.top + 8,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [panel]);

  useEffect(() => {
    if (!panel) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setPanel(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [panel]);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    onDraftChange(draft.slice(0, start) + emoji + draft.slice(end));
    setPanel(null);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const send = (content: string, quickReplies?: QuickReply[]) => {
    const text = content.trim();
    if (!text || !isHumanMode || isPending) return;
    onSend(text, quickReplies?.length ? quickReplies : undefined);
    setAttached([]);
    setPanel(null);
  };

  return (
    <div ref={rootRef} className="border-border relative shrink-0 border-t p-3">
      {panel && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-50"
              style={{ left: panelStyle.left, bottom: panelStyle.bottom }}
            >
              {panel === 'emoji' ? <EmojiPicker onPick={insertEmoji} /> : null}
              {panel === 'templates' ? (
                <div className="border-border bg-surface w-72 rounded-2xl border p-2 shadow-lg">
                  <p className="text-muted px-2 py-1 text-[11px] font-semibold">
                    {t('composerTemplates')}
                  </p>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="hover:bg-lavender w-full rounded-xl px-2 py-2 text-start"
                      onClick={() => {
                        onDraftChange(template.body);
                        setAttached(template.quickReplies);
                        setPanel(null);
                        inputRef.current?.focus();
                      }}
                    >
                      <span className="text-ink block text-sm font-semibold">
                        {template.title}
                      </span>
                      <span className="text-muted line-clamp-1 text-xs">
                        {template.body}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {isHumanMode ? (
        <div className="mb-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-muted shrink-0 text-[11px] font-semibold">
            {t('composerQuickReplies')}
          </span>
          {quickSends.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={isPending}
              onClick={() => send(item.body)}
              className="border-border text-ink hover:border-brand/40 hover:bg-lavender shrink-0 rounded-full border px-3 py-1 text-xs font-semibold"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {attached.length ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-muted text-[11px] font-semibold">
            {t('composerButtonsHint')}
          </span>
          {attached.map((item) => (
            <span
              key={item.payload}
              className="bg-brand/10 text-brand rounded-full px-2.5 py-1 text-[11px] font-semibold"
            >
              {item.title}
            </span>
          ))}
          <button
            type="button"
            className="text-muted hover:text-ink inline-flex items-center gap-1 text-[11px] font-semibold"
            onClick={() => setAttached([])}
          >
            <X className="h-3 w-3" />
            {t('composerClearButtons')}
          </button>
        </div>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft, attached);
        }}
      >
        <div className="border-border bg-page focus-within:border-brand/40 flex min-h-11 flex-1 items-end gap-1 rounded-xl border px-2 py-1.5">
          <button
            ref={emojiBtnRef}
            type="button"
            aria-label={t('composerEmoji')}
            onClick={() =>
              setPanel((current) => (current === 'emoji' ? null : 'emoji'))
            }
            className={cn(
              'text-muted hover:text-ink mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              panel === 'emoji' && 'bg-brand/10 text-brand',
            )}
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            ref={templateBtnRef}
            type="button"
            aria-label={t('composerTemplates')}
            onClick={() =>
              setPanel((current) =>
                current === 'templates' ? null : 'templates',
              )
            }
            className={cn(
              'text-muted hover:text-ink mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              panel === 'templates' && 'bg-brand/10 text-brand',
            )}
          >
            <LayoutTemplate className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder={
              isHumanMode ? t('typeYourReply') : t('inboxTakeoverHint')
            }
            onChange={(e) => onDraftChange(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = '0px';
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft, attached);
              }
            }}
            className="text-ink placeholder:text-muted max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1 text-sm outline-none disabled:opacity-70"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending || !draft.trim() || !isHumanMode}
          className="h-11"
        >
          {t('send')}
        </Button>
      </form>
    </div>
  );
}
