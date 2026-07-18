const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PushSubscriptionInput = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const vapidPublicKey = Deno.env.get("KAFE_VAPID_PUBLIC_KEY") ?? "";

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

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { ...apiHeaders(), ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await response.text());
  return response;
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return null;

  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) return null;

  const profileResponse = await api(
    `/rest/v1/kafe_admin_profiles?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`,
  );
  const profiles = (await profileResponse.json()) as { user_id: string }[];
  return profiles.length > 0 ? user.id : null;
}

function validSubscription(subscription: PushSubscriptionInput) {
  return Boolean(
    subscription.endpoint?.startsWith("https://") &&
    subscription.keys?.p256dh &&
    subscription.keys.auth,
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const userId = await requireAdmin(request);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = (await request.json()) as {
      action?: string;
      subscription?: PushSubscriptionInput;
      endpoint?: string;
      userAgent?: string;
    };

    if (body.action === "config") {
      if (!vapidPublicKey) return json({ configured: false });
      return json({ configured: true, publicKey: vapidPublicKey });
    }

    if (body.action === "subscribe") {
      if (!body.subscription || !validSubscription(body.subscription)) {
        return json({ error: "Invalid subscription" }, 400);
      }

      await api("/rest/v1/kafe_push_subscriptions?on_conflict=endpoint", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: userId,
          endpoint: body.subscription.endpoint,
          p256dh: body.subscription.keys?.p256dh,
          auth_key: body.subscription.keys?.auth,
          user_agent: body.userAgent?.slice(0, 500) || null,
          last_seen_at: new Date().toISOString(),
        }),
      });
      return json({ ok: true });
    }

    if (body.action === "unsubscribe") {
      const endpoint = body.endpoint?.trim();
      if (!endpoint) return json({ error: "Missing endpoint" }, 400);
      await api(
        `/rest/v1/kafe_push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      );
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
