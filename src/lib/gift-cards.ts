import { useCallback, useEffect, useRef, useState } from "react";
import { invokeEdgeFunction, isSupabaseConfigured, selectRows } from "./supabase-rest";
import type { GiftCardVisual } from "./admin-data";

export type GiftCardOrderStatus = "pending" | "paid" | "failed" | "expired";

export interface GiftCardOrder {
  id: string;
  code: string;
  amount: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  message: string;
  visual: GiftCardVisual;
  status: GiftCardOrderStatus;
  paidAt?: string;
  expiresAt?: string;
  pdfEmailSentAt?: string;
  createdAt: string;
}

type GiftCardOrderRow = {
  id: string;
  code: string;
  value: GiftCardOrder;
  status: GiftCardOrderStatus;
  paid_at: string | null;
  expires_at: string | null;
  pdf_email_sent_at: string | null;
  created_at: string;
};

function fromRow(row: GiftCardOrderRow): GiftCardOrder {
  return {
    ...row.value,
    id: row.id,
    code: row.code,
    status: row.status,
    paidAt: row.paid_at ?? row.value.paidAt,
    expiresAt: row.expires_at ?? row.value.expiresAt,
    pdfEmailSentAt: row.pdf_email_sent_at ?? row.value.pdfEmailSentAt,
    createdAt: row.created_at ?? row.value.createdAt,
  };
}

export function giftOrdersQuery(activeOnly: boolean, search: string, offset = 0, now = new Date()) {
  const query = new URLSearchParams({
    select: "id,code,value,status,paid_at,expires_at,pdf_email_sent_at,created_at",
    order: activeOnly ? "expires_at.asc,id.asc" : "created_at.desc,id.asc",
    limit: "100",
    offset: String(offset),
  });
  if (activeOnly) {
    query.set("status", "eq.paid");
    query.set("expires_at", `gte.${now.toISOString()}`);
  }
  const term = search
    .replace(/[*,()%"\\]/g, " ")
    .trim()
    .slice(0, 100);
  if (term)
    query.set(
      "or",
      `(value->>recipientName.ilike.*${term}*,value->>senderName.ilike.*${term}*,value->>recipientEmail.ilike.*${term}*)`,
    );
  return `?${query.toString()}`;
}

export function useAdminGiftCardOrders(activeOnly = true, search = "") {
  const [orders, setOrders] = useState<GiftCardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState(search);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (offset = 0) => {
      const id = ++requestId.current;
      if (!isSupabaseConfigured()) {
        setOrders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const rows = await selectRows<GiftCardOrderRow>(
          "kafe_gift_card_orders",
          giftOrdersQuery(activeOnly, searchTerm, offset),
          true,
        );
        if (id !== requestId.current) return;
        setOrders((previous) => (offset ? [...previous, ...rows.map(fromRow)] : rows.map(fromRow)));
        setHasMore(rows.length === 100);
      } catch (cause) {
        if (id !== requestId.current) return;
        setError(
          cause instanceof Error ? cause.message : "Impossible de charger les cartes cadeaux.",
        );
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [activeOnly, searchTerm],
  );
  const refresh = useCallback(() => fetchPage(), [fetchPage]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  return { orders, loading, error, hasMore, refresh, loadMore: () => fetchPage(orders.length) };
}

export async function createGiftCardCheckout(input: {
  amount: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  message: string;
  visual: GiftCardVisual;
  siteUrl: string;
}) {
  return invokeEdgeFunction<{
    ok: boolean;
    configured: boolean;
    checkoutUrl?: string;
    orderId?: string;
    managementToken?: string;
    reason?: string;
  }>("sumup-checkout", { action: "create-gift", ...input });
}

export async function readGiftCardStatus(managementToken: string) {
  return invokeEdgeFunction<{
    ok: boolean;
    order?: Pick<
      GiftCardOrder,
      "code" | "amount" | "recipientName" | "recipientEmail" | "status" | "expiresAt"
    >;
  }>("sumup-checkout", { action: "gift-status", managementToken });
}

export async function resendGiftCardPdf(orderId: string) {
  return invokeEdgeFunction<{ ok: boolean; delivered: boolean; reason?: string }>(
    "kafe-emails",
    { action: "gift-card-paid", giftOrderId: orderId },
    true,
  );
}
