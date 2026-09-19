import { PrefsControls } from "@/components/preferences";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/business/api";
import { useLocale } from "@/features/i18n/locale-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function DashboardTopBar() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const notifQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 15_000,
  });

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = panelRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unread = notifQuery.data?.unreadCount ?? 0;

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
      <label className="relative mx-auto hidden w-full max-w-xl sm:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full rounded-xl border border-border bg-page pe-4 ps-10 text-sm text-ink outline-none placeholder:text-muted focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <div className="ms-auto flex items-center gap-2 sm:ms-0">
        <PrefsControls className="hidden lg:flex" />

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-page text-ink hover:bg-lavender"
            aria-label={t("notifications")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -inset-e-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute end-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-surface p-2 shadow-lg">
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-sm font-semibold">{t("notifications")}</p>
                <button
                  type="button"
                  className="text-xs text-brand"
                  onClick={() => markAllMut.mutate()}
                >
                  {t("markAllRead")}
                </button>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {(notifQuery.data?.notifications ?? []).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`w-full rounded-xl px-3 py-2 text-start ${
                      n.readAt ? "opacity-70" : "bg-lavender/60"
                    }`}
                    onClick={() => {
                      if (!n.readAt) markReadMut.mutate(n.id);
                    }}
                  >
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <p className="text-xs text-muted">{n.body}</p>
                  </button>
                ))}
                {(notifQuery.data?.notifications.length ?? 0) === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted">
                    {t("noNotifications")}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
