import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  fetchOrders,
  updateOrderStatus,
  type OrderRow,
} from "@/features/business/api";
import { useLocale } from "@/features/i18n/locale-context";
import type { MessageKey } from "@/features/i18n/messages";

const PAGE_SIZE = 10;

export function OrdersPage() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pendingConfirm, setPendingConfirm] = useState<OrderRow | null>(null);

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
      setPendingConfirm(null);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

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
                      {o.totalEgp.toLocaleString()} ج.م
                    </td>
                    <td className="px-4 py-3 text-start">
                      <span className="inline-flex rounded-full bg-lavender px-2.5 py-1 text-xs font-semibold text-ink">
                        {t(`orderStatus_${o.status}` as MessageKey)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-start">
                      {o.status === "PENDING" ? (
                        <Button size="sm" onClick={() => setPendingConfirm(o)}>
                          {t("confirmOrder")}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
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

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={t("confirmOrderTitle")}
        description={
          pendingConfirm
            ? t("confirmOrderBody", {
                number: String(pendingConfirm.orderNumber),
                customer: pendingConfirm.customerName ?? t("unknownCustomer"),
              })
            : ""
        }
        confirmLabel={t("confirmOrder")}
        cancelLabel={t("cancel")}
        pending={statusMut.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
        onConfirm={() => {
          if (!pendingConfirm) return;
          statusMut.mutate({
            id: pendingConfirm.id,
            status: "CONFIRMED",
          });
        }}
      />
    </PageLayout>
  );
}
