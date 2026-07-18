const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReservationValue = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience?: string;
  people: number;
  date: string;
  slot: string;
  status: string;
  isGroupRequest?: boolean;
  depositRequired?: boolean;
  depositPaid?: boolean;
  depositAmount?: number;
  decisionMessage?: string;
  reservationCreatedEmailSentAt?: string;
  adminAlertEmailSentAt?: string;
  cancellationEmailSentAt?: string;
  adminCancellationAlertEmailSentAt?: string;
  decisionEmailSentAt?: string;
  reminderEmailSentAt?: string;
  managementToken?: string;
};

type ReservationRow = {
  id: string;
  value: ReservationValue;
  date: string;
  slot: string;
  people: number;
  status: string;
};

type SettingsValue = {
  contactEmail?: string;
  adminNotificationEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  depositFixedAmount?: number;
  manualConfirmationThreshold?: number;
  kitchenClosingTime?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const emailFrom = Deno.env.get("KAFE_EMAIL_FROM") ?? "";
const replyTo = Deno.env.get("KAFE_REPLY_TO") ?? "";
const cronSecret = Deno.env.get("KAFE_CRON_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function apiHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { ...apiHeaders(), ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function readReservation(id: string) {
  const rows = await api<ReservationRow[]>(
    `/rest/v1/kafe_reservations?select=id,value,date,slot,people,status&id=eq.${encodeURIComponent(id)}`,
  );
  return rows[0] ?? null;
}

async function readSettings() {
  const rows = await api<{ value: SettingsValue }[]>(
    "/rest/v1/kafe_settings?select=value&id=eq.main",
  );
  return rows[0]?.value ?? {};
}

async function adminRecipients(settings: SettingsValue) {
  const profiles = await api<{ email: string | null }[]>(
    "/rest/v1/kafe_admin_profiles?select=email&email=not.is.null",
  );
  const contactEmails = (settings.contactEmail ?? "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);
  const notificationEmails = (settings.adminNotificationEmail ?? "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);
  if (notificationEmails.length > 0) return [...new Set(notificationEmails)];
  if (contactEmails.length > 0) return [...new Set(contactEmails)];
  return [...new Set(profiles.map((profile) => profile.email ?? "").filter(Boolean))];
}

async function sendEmail(to: string[], subject: string, html: string) {
  if (!resendApiKey || !emailFrom || to.length === 0) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!response.ok) {
    console.error("Resend error", response.status, await response.text());
    return false;
  }
  return true;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Guadeloupe",
  }).format(new Date(`${date}T12:00:00-04:00`));
}

function shell(title: string, content: string) {
  return `<!doctype html>
  <html lang="fr"><body style="margin:0;background:#f6e7e7;font-family:Arial,sans-serif;color:#302525">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px">
      <tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff8ef;border:1px solid #dfc7c4;border-radius:20px;overflow:hidden">
        <tr><td style="background:#efcfd3;padding:26px 30px"><div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#8c4939">Kafé Céramik</div><h1 style="margin:8px 0 0;font-size:28px">${escapeHtml(title)}</h1></td></tr>
        <tr><td style="padding:28px 30px;line-height:1.6">${content}</td></tr>
      </table></td></tr>
    </table>
  </body></html>`;
}

function details(row: ReservationRow, settings: SettingsValue, siteUrl: string) {
  const guideReminder =
    row.value.experience === "brunch_atelier"
      ? ""
      : `<p><strong>Avant de venir :</strong> prends quelques minutes pour relire le <a href="${escapeHtml(siteUrl)}/guide" style="color:#914735">guide de peinture</a>. Ses consignes sont importantes pour la cuisson et la récupération de ta création.</p>`;
  const reservationPortal = row.value.managementToken
    ? `<p style="margin:22px 0"><a href="${escapeHtml(siteUrl)}/reservation?token=${encodeURIComponent(row.value.managementToken)}" style="display:inline-block;background:#914735;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Accéder à ma réservation</a></p>`
    : "";
  return `
    <div style="margin:20px 0;padding:18px;background:#f4dddd;border-radius:14px">
      <strong>${escapeHtml(formatDate(row.date))} à ${escapeHtml(row.slot)}</strong><br>
      ${row.people} personne${row.people > 1 ? "s" : ""}<br>
      ${escapeHtml(settings.contactAddress ?? "Lieu dit Loyette, 97118 Saint-François")}<br>
      Contact : ${escapeHtml(settings.contactPhone ?? "0690 28 47 88")}
    </div>
    ${guideReminder}
    ${reservationPortal}`;
}

async function markReservation(row: ReservationRow, patch: Partial<ReservationValue>) {
  const value = { ...row.value, ...patch };
  await api<void>(`/rest/v1/kafe_reservations?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ value, updated_at: new Date().toISOString() }),
  });
  row.value = value;
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return false;
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) return false;
  const profiles = await api<{ user_id: string }[]>(
    `/rest/v1/kafe_admin_profiles?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`,
  );
  return profiles.length > 0;
}

async function reservationCreated(row: ReservationRow, settings: SettingsValue, siteUrl: string) {
  const isGroup =
    row.value.experience !== "brunch_atelier" &&
    (row.value.isGroupRequest ||
      row.people >= (settings.manualConfirmationThreshold ?? 8) ||
      row.status === "pending");
  let customerDelivered = Boolean(row.value.reservationCreatedEmailSentAt);
  let adminDelivered = Boolean(row.value.adminAlertEmailSentAt);

  if (!customerDelivered) {
    const title = isGroup ? "Demande de groupe bien reçue" : "Ta réservation est confirmée";
    const intro = isGroup
      ? row.value.depositPaid
        ? `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Ton acompte de <strong>${escapeHtml(row.value.depositAmount ?? settings.depositFixedAmount ?? 100)} €</strong> est bien reçu. Ta demande a été transmise à l'équipe et ton créneau sera confirmé après validation.</p>`
        : `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Ta demande a bien été transmise à l'équipe. Ton créneau sera confirmé après validation.</p><p>Pour ce groupe, un acompte fixe de <strong>${escapeHtml(row.value.depositAmount ?? settings.depositFixedAmount ?? 100)} €</strong> est nécessaire avant la validation définitive.</p>`
      : `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Ta réservation est bien enregistrée. Nous avons hâte de t'accueillir ${row.value.experience === "brunch_atelier" ? "autour d'un brunch" : "pour ce moment créatif"}.</p>`;
    customerDelivered = await sendEmail(
      [row.value.email],
      isGroup ? "Ta demande de groupe – Kafé Céramik" : "Ta réservation – Kafé Céramik",
      shell(title, `${intro}${details(row, settings, siteUrl)}`),
    );
    if (customerDelivered) {
      await markReservation(row, { reservationCreatedEmailSentAt: new Date().toISOString() });
    }
  }

  if (!adminDelivered) {
    const recipients = await adminRecipients(settings);
    adminDelivered = await sendEmail(
      recipients,
      isGroup
        ? `Nouvelle demande de groupe – ${row.people} personnes`
        : `Nouvelle réservation – ${row.people} personne${row.people > 1 ? "s" : ""}`,
      shell(
        isGroup ? "Nouvelle demande à valider" : "Nouvelle réservation",
        `<p><strong>${escapeHtml(row.value.firstName)} ${escapeHtml(row.value.lastName)}</strong> souhaite réserver pour ${row.people} personnes.</p>${details(row, settings, siteUrl)}${isGroup ? "<p>Ouvrez l'espace équipe pour accepter ou refuser la demande.</p>" : "<p>Aucune validation n'est nécessaire.</p>"}`,
      ),
    );
    if (adminDelivered) {
      await markReservation(row, { adminAlertEmailSentAt: new Date().toISOString() });
    }
  }

  return customerDelivered && adminDelivered;
}

async function groupDecision(
  row: ReservationRow,
  settings: SettingsValue,
  siteUrl: string,
  approved: boolean,
  message: string,
) {
  if (row.value.decisionEmailSentAt) return true;
  const reason = message.trim() || row.value.decisionMessage?.trim() || "";
  const content = approved
    ? `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Bonne nouvelle : ta demande de groupe est <strong>validée</strong>.</p><p>Ton acompte de <strong>${escapeHtml(row.value.depositAmount ?? settings.depositFixedAmount ?? 100)} €</strong> est bien rattaché à cette réservation.</p>${details(row, settings, siteUrl)}`
    : `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>L'équipe ne peut malheureusement pas confirmer ta demande pour ce créneau.</p>${reason ? `<div style="margin:18px 0;padding:16px;background:#f4dddd;border-radius:14px"><strong>Précision de l'équipe :</strong><br>${escapeHtml(reason)}</div>` : ""}<p>Tu peux contacter le Kafé au ${escapeHtml(settings.contactPhone ?? "0690 28 47 88")} pour chercher une autre possibilité.</p>`;
  const delivered = await sendEmail(
    [row.value.email],
    approved ? "Ta demande de groupe est validée" : "Réponse à ta demande de groupe",
    shell(approved ? "Demande validée" : "Demande non retenue", content),
  );
  if (delivered) await markReservation(row, { decisionEmailSentAt: new Date().toISOString() });
  return delivered;
}

async function reservationCancelled(row: ReservationRow, settings: SettingsValue, siteUrl: string) {
  let customerDelivered = Boolean(row.value.cancellationEmailSentAt);
  let adminDelivered = Boolean(row.value.adminCancellationAlertEmailSentAt);

  if (!customerDelivered && row.value.email) {
    customerDelivered = await sendEmail(
      [row.value.email],
      "Annulation de ta réservation – Kafé Céramik",
      shell(
        "Réservation annulée",
        `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Ta réservation au Kafé Céramik a bien été annulée.</p>${details(row, settings, siteUrl)}<p>Pour toute question, tu peux contacter le Kafé au ${escapeHtml(settings.contactPhone ?? "0690 28 47 88")}.</p>`,
      ),
    );
    if (customerDelivered) {
      await markReservation(row, { cancellationEmailSentAt: new Date().toISOString() });
    }
  }

  if (!adminDelivered) {
    const recipients = await adminRecipients(settings);
    adminDelivered = await sendEmail(
      recipients,
      `Réservation annulée – ${row.people} personne${row.people > 1 ? "s" : ""}`,
      shell(
        "Réservation annulée",
        `<p>La réservation de <strong>${escapeHtml(row.value.firstName)} ${escapeHtml(row.value.lastName)}</strong> est annulée.</p>${details(row, settings, siteUrl)}`,
      ),
    );
    if (adminDelivered) {
      await markReservation(row, { adminCancellationAlertEmailSentAt: new Date().toISOString() });
    }
  }

  return customerDelivered && adminDelivered;
}

async function processReminders(settings: SettingsValue, siteUrl: string) {
  const today = new Date();
  const end = new Date(today.getTime() + 48 * 60 * 60 * 1000);
  const fromDate = today.toISOString().slice(0, 10);
  const toDate = end.toISOString().slice(0, 10);
  const rows = await api<ReservationRow[]>(
    `/rest/v1/kafe_reservations?select=id,value,date,slot,people,status&status=in.(confirmed,deposit_paid)&date=gte.${fromDate}&date=lte.${toDate}`,
  );
  let sent = 0;
  for (const row of rows) {
    if (row.value.reminderEmailSentAt || !row.value.email) continue;
    const slotDate = new Date(`${row.date}T${row.slot}:00-04:00`);
    const hoursUntil = (slotDate.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntil <= 0 || hoursUntil > 24) continue;
    const isBrunch = row.value.experience === "brunch_atelier";
    const delivered = await sendEmail(
      [row.value.email],
      `Rappel : ${isBrunch ? "ton brunch" : "ton atelier"} demain – Kafé Céramik`,
      shell(
        `${isBrunch ? "Ton brunch" : "Ton atelier"}, c'est demain`,
        `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Petit rappel pour ${isBrunch ? "ton brunch" : "ton atelier"} au Kafé Céramik.</p>${details(row, settings, siteUrl)}<p>À très vite !</p>`,
      ),
    );
    if (delivered) {
      sent += 1;
      await markReservation(row, { reminderEmailSentAt: new Date().toISOString() });
    }
  }
  return sent;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await request.json()) as {
      action?: string;
      reservationId?: string;
      managementToken?: string;
      message?: string;
      siteUrl?: string;
    };
    const action = body.action ?? "";
    const siteUrl = (body.siteUrl ?? "https://demo-kafe-ceramik.lovable.app").replace(/\/$/, "");
    const settings = await readSettings();

    if (action === "process-reminders") {
      const cronAllowed =
        Boolean(cronSecret) && request.headers.get("x-cron-secret") === cronSecret;
      if (!cronAllowed && !(await requireAdmin(request)))
        return json({ error: "Unauthorized" }, 401);
      const sent = await processReminders(settings, siteUrl);
      return json({ ok: true, delivered: true, sent });
    }

    if (!body.reservationId) return json({ error: "Missing reservationId" }, 400);
    const row = await readReservation(body.reservationId);
    if (!row) return json({ error: "Reservation not found" }, 404);

    if (action === "reservation-created") {
      if (
        !body.managementToken ||
        !row.value.managementToken ||
        body.managementToken !== row.value.managementToken
      ) {
        return json({ error: "Unauthorized" }, 401);
      }
      const delivered = await reservationCreated(row, settings, siteUrl);
      return json({
        ok: true,
        delivered,
        reason: delivered
          ? undefined
          : "Le fournisseur email ou un destinataire reste à configurer.",
      });
    }

    if (action === "group-approved" || action === "group-rejected") {
      if (!(await requireAdmin(request))) return json({ error: "Unauthorized" }, 401);
      const approved = action === "group-approved";
      const delivered = await groupDecision(row, settings, siteUrl, approved, body.message ?? "");
      return json({
        ok: true,
        delivered,
        reason: delivered ? undefined : "Le fournisseur email reste à configurer.",
      });
    }

    if (action === "reservation-cancelled") {
      if (!(await requireAdmin(request))) return json({ error: "Unauthorized" }, 401);
      const delivered = await reservationCancelled(row, settings, siteUrl);
      return json({
        ok: true,
        delivered,
        reason: delivered ? undefined : "Le fournisseur email reste à configurer.",
      });
    }

    if (action === "customer-cancelled") {
      if (
        !body.managementToken ||
        !row.value.managementToken ||
        body.managementToken !== row.value.managementToken ||
        row.status !== "cancelled"
      ) {
        return json({ error: "Unauthorized" }, 401);
      }
      const delivered = await reservationCancelled(row, settings, siteUrl);
      return json({
        ok: true,
        delivered,
        reason: delivered ? undefined : "Le fournisseur email reste à configurer.",
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
