import { PrefsControls } from '@/components/preferences';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/business/api';
import { topBarIconButtonClass } from '@/features/dashboard/top-bar-icon-button';
import { useLocale } from '@/features/i18n/locale-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bee3lyLogo } from '@/components/brand/bee3ly-logo';
import { Bell, Menu, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

type DashboardTopBarProps = {
  onMenuOpen?: () => void;
};

function panelGeometry(trigger: DOMRect, dir: 'rtl' | 'ltr') {
  const margin = 8;
  const panelWidth = Math.min(320, window.innerWidth - margin * 2);
  let left = dir === 'rtl' ? trigger.left : trigger.right - panelWidth;
  left = Math.max(
    margin,
    Math.min(left, window.innerWidth - panelWidth - margin),
  );
  return {
    top: trigger.bottom + margin,
    left,
    width: panelWidth,
  };
}

export function DashboardTopBar({ onMenuOpen }: DashboardTopBarProps) {
  const { t, dir } = useLocale();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({
    top: 72,
    left: 8,
    width: 320,
  });
  const navigate = useNavigate();

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      setMenuPos(panelGeometry(el.getBoundingClientRect(), dir));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, dir]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const unread = notifQuery.data?.unreadCount ?? 0;

  const notificationsPanel =
    open && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className="bg-ink/25 fixed inset-0 z-[99] touch-manipulation sm:bg-transparent"
              aria-label={t('closeMenu')}
              onClick={() => setOpen(false)}
            />
            <div
              ref={menuRef}
              className="border-border bg-surface fixed z-[100] max-w-[calc(100vw-1rem)] rounded-2xl border p-2 shadow-lg"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }}
              role="dialog"
              aria-label={t('notifications')}
            >
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-sm font-semibold">{t('notifications')}</p>
                <button
                  type="button"
                  className="text-brand min-h-9 touch-manipulation px-2 text-xs"
                  onClick={() => markAllMut.mutate()}
                >
                  {t('markAllRead')}
                </button>
              </div>
              <div className="max-h-[min(18rem,50dvh)] space-y-1 overflow-y-auto overscroll-contain">
                {(notifQuery.data?.notifications ?? []).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      'w-full touch-manipulation rounded-xl px-3 py-2.5 text-start',
                      n.readAt ? 'opacity-70' : 'bg-lavender/60',
                    )}
                    onClick={() => {
                      if (!n.readAt) markReadMut.mutate(n.id);
                      const conversationId = n.data?.conversationId;
                      if (conversationId) {
                        navigate(
                          `${paths.inbox}?conversationId=${encodeURIComponent(conversationId)}`,
                        );
                        setOpen(false);
                      }
                    }}
                  >
                    <p className="text-ink line-clamp-2 text-sm font-semibold">
                      {n.title}
                    </p>
                    <p className="text-muted line-clamp-3 text-xs">{n.body}</p>
                  </button>
                ))}
                {(notifQuery.data?.notifications.length ?? 0) === 0 ? (
                  <p className="text-muted px-3 py-4 text-sm">
                    {t('noNotifications')}
                  </p>
                ) : null}
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <header className="border-border bg-surface relative z-40 flex h-16 min-w-0 shrink-0 items-center gap-1.5 border-b px-3 sm:gap-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-1.5 md:gap-0">
        <button
          type="button"
          className={cn(topBarIconButtonClass, 'md:hidden')}
          aria-label={t('openMenu')}
          onClick={() => onMenuOpen?.()}
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link
          to={paths.app}
          className="flex shrink-0 md:hidden"
          aria-label={t('navHome')}
        >
          <Bee3lyLogo markClassName="h-8 w-8" withWordmark={false} />
        </Link>
      </div>
      <label className="relative hidden min-w-0 flex-1 sm:block sm:max-w-xl">
        <Search className="text-muted pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          className="border-border bg-page text-ink placeholder:text-muted focus:border-brand/40 focus:ring-brand/20 h-10 w-full rounded-xl border ps-10 pe-4 text-sm outline-none focus:ring-2"
        />
      </label>

      <div className="ms-auto flex h-9 min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        <PrefsControls
          className="max-sm:gap-1"
          compactOnMobile
          iconButtonClass={topBarIconButtonClass}
        />

        <button
          ref={triggerRef}
          type="button"
          className={cn(topBarIconButtonClass, 'relative')}
          aria-label={t('notifications')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="bg-danger absolute -inset-e-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </button>
        {notificationsPanel}
      </div>
    </header>
  );
}
