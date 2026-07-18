const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const sumupApiKey = Deno.env.get("SUMUP_API_KEY") ?? "";
const sumupMerchantCode = Deno.env.get("SUMUP_MERCHANT_CODE") ?? "";

type ReservationRow = {
  id: string;
  value: Record<string, unknown>;
  status: string;
};

type PaymentRow = {
  reservation_id: string;
  provider_checkout_id: string | null;
  checkout_reference: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  hosted_checkout_url: string | null;
};

type SumUpCheckout = {
  id: string;
  checkout_reference: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  hosted_checkout_url?: string;
  amount: number;
  currency: string;
  [key: string]: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function apiHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function db<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { ...apiHeaders(), ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function sumup<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.sumup.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${sumupApiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`SUMUP_${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

async function readReservationByToken(token: string) {
  const rows = await db<ReservationRow[]>(
    `/rest/v1/kafe_reservations?select=id,value,status&value-%3E%3EmanagementToken=eq.${encodeURIComponent(token)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function readPaymentByReservation(reservationId: string) {
  const rows = await db<PaymentRow[]>(
    `/rest/v1/kafe_payments?select=reservation_id,provider_checkout_id,checkout_reference,status,hosted_checkout_url&reservation_id=eq.${encodeURIComponent(reservationId)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function createCheckout(token: string, siteUrl: string) {
  if (!sumupApiKey || !sumupMerchantCode) {
    return json({ ok: true, configured: false });
  }

  const reservation = await readReservationByToken(token);
  if (!reservation) return json({ error: "Reservation not found" }, 404);
  if (!reservation.value.depositRequired) return json({ error: "Deposit not required" }, 400);
  if (reservation.value.depositPaid) return json({ ok: true, configured: true, paid: true });
  if (reservation.status === "cancelled") return json({ error: "Reservation cancelled" }, 409);

  const existing = await readPaymentByReservation(reservation.id);
  if (existing?.status === "PENDING" && existing.hosted_checkout_url) {
    return json({
      ok: true,
      configured: true,
      checkoutUrl: existing.hosted_checkout_url,
      status: existing.status,
    });
  }

  const amount = Number(reservation.value.depositAmount ?? 100);
  const reference = `KAFE-${reservation.id}-${crypto.randomUUID()}`.slice(0, 90);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  const webhookUrl = `${supabaseUrl}/functions/v1/sumup-checkout`;
  const checkout = await sumup<SumUpCheckout>("/v0.1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      checkout_reference: reference,
      amount,
      currency: "EUR",
      merchant_code: sumupMerchantCode,
      description: `Acompte atelier Kafé Céramik - ${reservation.id}`,
      return_url: webhookUrl,
      redirect_url: `${cleanSiteUrl}/reservation?token=${encodeURIComponent(token)}&payment=return`,
      hosted_checkout: { enabled: true },
    }),
  });
  if (!checkout.hosted_checkout_url) throw new Error("SUMUP_HOSTED_CHECKOUT_URL_MISSING");

  await db<void>("/rest/v1/kafe_payments?on_conflict=reservation_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      reservation_id: reservation.id,
      provider: "sumup",
      provider_checkout_id: checkout.id,
      checkout_reference: reference,
      amount,
      currency: "EUR",
      status: checkout.status,
      hosted_checkout_url: checkout.hosted_checkout_url,
      provider_payload: checkout,
      updated_at: new Date().toISOString(),
    }),
  });

  return json({
    ok: true,
    configured: true,
    checkoutUrl: checkout.hosted_checkout_url,
    status: checkout.status,
  });
}

async function handleWebhook(checkoutId: string) {
  if (!sumupApiKey) return json({ error: "SumUp is not configured" }, 503);
  const checkout = await sumup<SumUpCheckout>(`/v0.1/checkouts/${encodeURIComponent(checkoutId)}`);
  const payments = await db<PaymentRow[]>(
    `/rest/v1/kafe_payments?select=reservation_id,provider_checkout_id,checkout_reference,status,hosted_checkout_url&provider_checkout_id=eq.${encodeURIComponent(checkout.id)}&limit=1`,
  );
  const payment = payments[0];
  if (!payment) return json({ ok: true, ignored: true });

  await db<void>(
    `/rest/v1/kafe_payments?provider_checkout_id=eq.${encodeURIComponent(checkout.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: checkout.status,
        provider_payload: checkout,
        updated_at: new Date().toISOString(),
        ...(checkout.status === "PAID" ? { paid_at: new Date().toISOString() } : {}),
      }),
    },
  );

  const reservations = await db<ReservationRow[]>(
    `/rest/v1/kafe_reservations?select=id,value,status&id=eq.${encodeURIComponent(payment.reservation_id)}&limit=1`,
  );
  const reservation = reservations[0];
  if (!reservation) return json({ ok: true, ignored: true });

  if (checkout.status === "PAID" && !reservation.value.depositPaid) {
    const nextValue = {
      ...reservation.value,
      depositPaid: true,
      depositPaidAt: new Date().toISOString(),
      sumupCheckoutId: checkout.id,
      status: "deposit_paid",
    };
    await db<void>(`/rest/v1/kafe_reservations?id=eq.${encodeURIComponent(reservation.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "deposit_paid",
        value: nextValue,
        updated_at: new Date().toISOString(),
      }),
    });
    await db<void>("/rest/v1/kafe_admin_notifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        kind: "deposit_paid",
        title: "Acompte reçu",
        body: `${reservation.value.firstName ?? ""} ${reservation.value.lastName ?? ""} · ${checkout.amount} €`,
        reservation_id: reservation.id,
      }),
    });
    await fetch(`${supabaseUrl}/functions/v1/kafe-emails`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({
        action: "reservation-created",
        reservationId: reservation.id,
        managementToken: reservation.value.managementToken,
      }),
    }).catch((error) => console.error("Post-payment email error", error));
  }

  if (checkout.status === "EXPIRED" && reservation.status === "pending") {
    await db<void>(`/rest/v1/kafe_reservations?id=eq.${encodeURIComponent(reservation.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "cancelled",
        value: {
          ...reservation.value,
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
          cancelledBy: "payment_timeout",
        },
        updated_at: new Date().toISOString(),
      }),
    });
  }

  return json({ ok: true });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = (await request.json()) as {
      action?: string;
      managementToken?: string;
      siteUrl?: string;
      event_type?: string;
      id?: string;
    };
    if (body.event_type === "CHECKOUT_STATUS_CHANGED" && body.id) {
      return await handleWebhook(body.id);
    }
    if (body.action === "create") {
      if (!body.managementToken) return json({ error: "Missing management token" }, 400);
      return await createCheckout(
        body.managementToken,
        body.siteUrl ?? "https://demo-kafe-ceramik.lovable.app",
      );
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
