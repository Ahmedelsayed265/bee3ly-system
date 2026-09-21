import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  fetchOrders,
  updateOrderStatus,
  type OrderRow,
} from "@/features/business/api";
import { useLocale } from "@/features/i18n/locale-context";
import type { MessageKey } from "@/features/i18n/messages";

const PAGE_SIZE = 10;

function canConfirm(status: string) {
  return status === "PENDING";
}

function canCancel(status: string) {
  return status === "PENDING" || status === "CONFIRMED";
}

export function OrdersPage() {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<OrderRow | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    order: OrderRow;
    status: "CONFIRMED" | "CANCELLED";
  } | null>(null);

  const ordersQuery = useQuery({
    queryKey: ["orders", page, PAGE_SIZE],
    queryFn: () => fetchOrders(page, PAGE_SIZE),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = ordersQuery.data?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: async () => {
      setPendingAction(null);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const money = (value: number) =>
    `${value.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} ج.م`;

  const ask = (order: OrderRow, status: "CONFIRMED" | "CANCELLED") => {
    setViewing(null);
    setPendingAction({ order, status });
  };

  return (
    <PageLayout title={t("navOrders")} description={t("ordersIntro")}>
      {total === 0 && !ordersQuery.isLoading ? (
        <p className="text-sm text-muted">{t("noOrders")}</p>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-180 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas/60 text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 text-start">
                    {t("orderColNumber")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("orderColCustomer")}
                  </th>
                  <th className="px-4 py-3 text-start">{t("orderColPhone")}</th>
                  <th className="px-4 py-3 text-start">{t("orderColItems")}</th>
                  <th className="px-4 py-3 text-start">{t("orderColTotal")}</th>
                  <th className="px-4 py-3 text-start">
                    {t("orderColStatus")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("orderColActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border last:border-b-0 hover:bg-canvas/40"
                  >
                    <td className="px-4 py-3 text-start font-semibold text-ink">
                      #{o.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-start text-ink">
                      {o.customerName ?? t("unknownCustomer")}
                    </td>
                    <td className="px-4 py-3 text-start tabular-nums text-muted">
                      {o.customerPhone ?? "—"}
                    </td>
                    <td className="max-w-70 px-4 py-3 text-start text-ink">
                      {o.items
                        .map(
                          (item) =>
                            `${item.name}${item.size ? ` (${item.size})` : ""} × ${item.quantity}`,
                        )
                        .join(" · ")}
                    </td>
                    <td className="px-4 py-3 text-start font-medium tabular-nums text-ink">
                      {money(o.totalEgp)}
                    </td>
                    <td className="px-4 py-3 text-start">
                      <span className="inline-flex rounded-full bg-lavender px-2.5 py-1 text-xs font-semibold text-ink">
                        {t(`orderStatus_${o.status}` as MessageKey)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-start">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => setViewing(o)}
                        >
                          {t("viewOrder")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs"
                          disabled={!canCancel(o.status) || statusMut.isPending}
                          onClick={() => ask(o, "CANCELLED")}
                        >
                          {t("cancelOrder")}
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          disabled={!canConfirm(o.status) || statusMut.isPending}
                          onClick={() => ask(o, "CONFIRMED")}
                        >
                          {t("confirmOrderShort")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            fetching={ordersQuery.isFetching}
            previousLabel={t("previous")}
            nextLabel={t("next")}
            pageLabel={t("pageOf", {
              page: String(page),
              total: String(totalPages),
            })}
            onPage={setPage}
          />
        </div>
      )}

      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {viewing ? `#${viewing.orderNumber}` : t("viewOrder")}
            </DialogTitle>
            <DialogDescription>{t("orderDetailsHint")}</DialogDescription>
          </DialogHeader>
          {viewing ? (
            <>
              <DialogBody className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted">{t("orderColCustomer")}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {viewing.customerName ?? t("unknownCustomer")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{t("orderColPhone")}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
                      {viewing.customerPhone ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{t("orderColDate")}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {new Date(viewing.createdAt).toLocaleString(
                        locale === "ar" ? "ar-EG" : "en-US",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{t("orderColStatus")}</p>
                    <p className="mt-1">
                      <span className="inline-flex rounded-full bg-lavender px-2.5 py-1 text-xs font-semibold text-ink">
                        {t(`orderStatus_${viewing.status}` as MessageKey)}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted">{t("orderColItems")}</p>
                  <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {viewing.items.map((item, index) => (
                      <li
                        key={`${item.name}-${index}`}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <span className="text-ink">
                          {item.name}
                          {item.size ? ` (${item.size})` : ""} × {item.quantity}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-ink">
                          {money(item.priceEgp * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-page px-3 py-2.5">
                  <span className="text-sm text-muted">{t("orderColTotal")}</span>
                  <span className="text-base font-bold tabular-nums text-ink">
                    {money(viewing.totalEgp)}
                  </span>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canCancel(viewing.status) || statusMut.isPending}
                  onClick={() => ask(viewing, "CANCELLED")}
                >
                  {t("cancelOrder")}
                </Button>
                <Button
                  type="button"
                  disabled={!canConfirm(viewing.status) || statusMut.isPending}
                  onClick={() => ask(viewing, "CONFIRMED")}
                >
                  {t("confirmOrderShort")}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.status === "CANCELLED"
            ? t("cancelOrderTitle")
            : t("confirmOrderTitle")
        }
        description={
          pendingAction
            ? t(
                pendingAction.status === "CANCELLED"
                  ? "cancelOrderBody"
                  : "confirmOrderBody",
                {
                  number: String(pendingAction.order.orderNumber),
                  customer:
                    pendingAction.order.customerName ?? t("unknownCustomer"),
                },
              )
            : ""
        }
        confirmLabel={
          pendingAction?.status === "CANCELLED"
            ? t("cancelOrder")
            : t("confirmOrder")
        }
        cancelLabel={t("back")}
        pending={statusMut.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        onConfirm={() => {
          if (!pendingAction) return;
          statusMut.mutate({
            id: pendingAction.order.id,
            status: pendingAction.status,
          });
        }}
      />
    </PageLayout>
  );
}
