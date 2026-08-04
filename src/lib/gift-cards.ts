import { useCallback, useEffect, useState } from "react";
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

export function useAdminGiftCardOrders() {
  const [orders, setOrders] = useState<GiftCardOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await selectRows<GiftCardOrderRow>(
        "kafe_gift_card_orders",
        "?select=id,code,value,status,paid_at,expires_at,pdf_email_sent_at,created_at&order=created_at.desc&limit=100",
        true,
      );
      setOrders(rows.map(fromRow));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { orders, loading, refresh };
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
