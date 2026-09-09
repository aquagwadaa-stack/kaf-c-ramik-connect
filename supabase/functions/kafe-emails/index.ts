import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import webpush from "npm:web-push@3.6.7";
import { formatGiftExpiry } from "../_shared/gift-validity.ts";

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
  groupCeramicRatePerPerson?: number;
  groupMealRatePerPerson?: number;
  groupQuoteTotal?: number;
  groupQuoteNumber?: string;
  decisionMessage?: string;
  reservationCreatedEmailSentAt?: string;
  depositReceiptEmailSentAt?: string;
  adminAlertEmailSentAt?: string;
  adminPushSentAt?: string;
  cancellationEmailSentAt?: string;
  adminCancellationAlertEmailSentAt?: string;
  adminCancellationPushSentAt?: string;
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
  giftCardValidityMonths?: number;
};

type GiftOrderValue = {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  message?: string;
  visual?: "rose" | "tropical" | "confetti";
};

type GiftOrderRow = {
  id: string;
  code: string;
  value: GiftOrderValue;
  amount: number;
  status: "pending" | "paid" | "failed" | "expired";
  paid_at: string | null;
  expires_at: string | null;
  pdf_email_sent_at: string | null;
};

type EmailAttachment = {
  filename: string;
  content: string;
};

type PreviewEmail = { to: string[]; subject: string; html: string; attachments: EmailAttachment[] };
type PreviewContext = { messages: PreviewEmail[] };

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const emailFrom = Deno.env.get("KAFE_EMAIL_FROM") ?? "";
const canonicalSiteUrl = (Deno.env.get("KAFE_SITE_URL") ?? "https://kafeceramik.fr").replace(
  /\/$/,
  "",
);
const replyTo = Deno.env.get("KAFE_REPLY_TO") ?? "";
const cronSecret = Deno.env.get("KAFE_CRON_SECRET") ?? "";
const vapidPublicKey = Deno.env.get("KAFE_VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("KAFE_VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = Deno.env.get("KAFE_VAPID_SUBJECT") ?? "mailto:gwada.web.studio@gmail.com";

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

async function readGiftOrder(id: string) {
  const rows = await api<GiftOrderRow[]>(
    `/rest/v1/kafe_gift_card_orders?select=id,code,value,amount,status,paid_at,expires_at,pdf_email_sent_at&id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function adminRecipients(settings: SettingsValue, preview?: PreviewContext) {
  if (preview) return ["equipe@example.invalid"];
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

async function sendAdminPush(
  payload: { title: string; body: string; url: string; tag: string },
  preview?: PreviewContext,
) {
  if (preview) return 0;
  if (!vapidPublicKey || !vapidPrivateKey) return 0;

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const subscriptions = await api<PushSubscriptionRow[]>(
    "/rest/v1/kafe_push_subscriptions?select=id,endpoint,p256dh,auth_key",
  );
  let delivered = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60, urgency: "high" },
      );
      delivered += 1;
    } catch (error) {
      const statusCode =
        typeof error === "object" && error && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await api<void>(
          `/rest/v1/kafe_push_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
          { method: "DELETE", headers: { Prefer: "return=minimal" } },
        );
      } else {
        console.error("Web push error", statusCode, error);
      }
    }
  }

  return delivered;
}

async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  attachments: EmailAttachment[] = [],
  preview?: PreviewContext,
  eventKey?: string,
) {
  if (preview) {
    preview.messages.push({ to, subject, html, attachments });
    return true;
  }
  const key = eventKey
    ? Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(eventKey))),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    : undefined;
  return Boolean(await deliverEmail({ to, subject, html, attachments }, key));
}

async function deliverEmail(mail: PreviewEmail, idempotencyKey?: string) {
  const { to, subject, html, attachments } = mail;
  if (!resendApiKey || !emailFrom || to.length === 0) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: emailFrom,
      to,
      subject,
      html,
      ...(attachments.length ? { attachments } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!response.ok) {
    console.error("Resend error", response.status, await response.text());
    return false;
  }
  return (await response.json()) as { id: string };
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

function formatMoney(value: number) {
  return `${value.toFixed(2).replace(".", ",")} EUR`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function pdfText(value: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  return Array.from(value.normalize("NFC"))
    .map((character) => {
      try {
        font.encodeText(character);
        return character;
      } catch {
        return "";
      }
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function fittedText(
  page: ReturnType<PDFDocument["addPage"]>,
  value: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  x: number,
  y: number,
  width: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const text = pdfText(value, font);
  const measured = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x,
    y,
    font,
    color,
    size: measured > width ? (size * width) / measured : size,
  });
}

async function createGroupQuote(row: ReservationRow) {
  const ceramicRate = Number(row.value.groupCeramicRatePerPerson ?? 0);
  const mealRate = Number(row.value.groupMealRatePerPerson ?? 0);
  if (ceramicRate <= 0 || mealRate <= 0 || row.people < 1) return null;

  const quoteNumber =
    row.value.groupQuoteNumber ??
    `KC-${row.date.replaceAll("-", "")}-${row.id
      .replace(/[^a-z0-9]/gi, "")
      .slice(-6)
      .toUpperCase()}`;
  const ceramicTotal = ceramicRate * row.people;
  const mealTotal = mealRate * row.people;
  const total = ceramicTotal + mealTotal;
  const pdf = await PDFDocument.create();
  // Stable PDF metadata keeps retries compatible with the email idempotency key.
  const documentDate = new Date(`${row.date}T12:00:00-04:00`);
  pdf.setCreationDate(documentDate);
  pdf.setModificationDate(documentDate);
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brown = rgb(0.55, 0.25, 0.19);
  const pink = rgb(0.94, 0.79, 0.81);
  const cream = rgb(1, 0.97, 0.91);
  const ink = rgb(0.18, 0.13, 0.13);
  const muted = rgb(0.4, 0.34, 0.34);

  page.drawRectangle({ x: 0, y: 742, width: 595.28, height: 100, color: pink });
  page.drawText("KAFE CERAMIK", { x: 44, y: 794, size: 22, font: bold, color: ink });
  page.drawText("Dejeunette & creation - Saint-Francois, Guadeloupe", {
    x: 44,
    y: 772,
    size: 10,
    font: regular,
    color: brown,
  });
  page.drawText("DEVIS ESTIMATIF DE GROUPE", {
    x: 320,
    y: 794,
    size: 14,
    font: bold,
    color: brown,
  });
  page.drawText(`Reference : ${quoteNumber}`, {
    x: 320,
    y: 774,
    size: 9,
    font: regular,
    color: ink,
  });

  page.drawText("MALA MADRE SARL - SIREN 918 088 097", {
    x: 44,
    y: 711,
    size: 10,
    font: bold,
    color: ink,
  });
  page.drawText("Lieu dit Loyette, 97118 Saint-Francois", {
    x: 44,
    y: 695,
    size: 9,
    font: regular,
    color: muted,
  });
  fittedText(
    page,
    `Client : ${row.value.firstName} ${row.value.lastName}`,
    bold,
    320,
    711,
    231,
    10,
    ink,
  );
  fittedText(
    page,
    `Venue : ${formatDate(row.date)} a ${row.slot}`,
    regular,
    320,
    695,
    231,
    9,
    muted,
  );
  page.drawText(`Participants : ${row.people}`, {
    x: 320,
    y: 679,
    size: 9,
    font: regular,
    color: muted,
  });

  const tableTop = 630;
  page.drawRectangle({ x: 44, y: tableTop, width: 507, height: 34, color: brown });
  page.drawText("PRESTATION", { x: 58, y: tableTop + 12, size: 9, font: bold, color: cream });
  page.drawText("QTE", { x: 330, y: tableTop + 12, size: 9, font: bold, color: cream });
  page.drawText("PRIX / PERS.", { x: 382, y: tableTop + 12, size: 9, font: bold, color: cream });
  page.drawText("TOTAL", { x: 490, y: tableTop + 12, size: 9, font: bold, color: cream });

  const rows = [
    ["Forfait ceramique", String(row.people), formatMoney(ceramicRate), formatMoney(ceramicTotal)],
    ["Forfait brunch", String(row.people), formatMoney(mealRate), formatMoney(mealTotal)],
  ];
  rows.forEach((values, index) => {
    const y = tableTop - 42 - index * 42;
    page.drawRectangle({
      x: 44,
      y,
      width: 507,
      height: 42,
      color: index % 2 === 0 ? cream : rgb(0.98, 0.91, 0.91),
    });
    page.drawText(values[0], { x: 58, y: y + 15, size: 10, font: regular, color: ink });
    page.drawText(values[1], { x: 338, y: y + 15, size: 10, font: regular, color: ink });
    page.drawText(values[2], { x: 390, y: y + 15, size: 10, font: regular, color: ink });
    page.drawText(values[3], { x: 490, y: y + 15, size: 10, font: regular, color: ink });
  });

  const totalY = tableTop - 126;
  page.drawRectangle({ x: 345, y: totalY, width: 206, height: 52, color: pink });
  page.drawText("TOTAL ESTIMATIF TTC", {
    x: 360,
    y: totalY + 29,
    size: 9,
    font: bold,
    color: brown,
  });
  page.drawText(formatMoney(total), { x: 455, y: totalY + 10, size: 14, font: bold, color: ink });

  page.drawText("Acompte de reservation : 100 EUR", {
    x: 44,
    y: 430,
    size: 11,
    font: bold,
    color: brown,
  });
  page.drawText("Ce devis est genere a partir des montants choisis lors de la demande.", {
    x: 44,
    y: 402,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText("La reservation et le devis restent soumis a la validation de l'equipe du Kafe.", {
    x: 44,
    y: 386,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText("Nourriture et boissons exterieures interdites au Kafe.", {
    x: 44,
    y: 370,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText("Kafe Ceramik - Mala Madre SARL", {
    x: 44,
    y: 58,
    size: 9,
    font: bold,
    color: brown,
  });

  const bytes = await pdf.save();
  return {
    quoteNumber,
    total,
    attachment: {
      filename: `devis-groupe-${quoteNumber}.pdf`,
      content: bytesToBase64(bytes),
    } satisfies EmailAttachment,
  };
}

function drawRoundedPanel(
  page: ReturnType<PDFDocument["addPage"]>,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    color: ReturnType<typeof rgb>;
  },
) {
  const { x, y, width, height, radius, color } = options;
  page.drawRectangle({ x: x + radius, y, width: width - radius * 2, height, color });
  page.drawRectangle({ x, y: y + radius, width, height: height - radius * 2, color });
  page.drawCircle({ x: x + radius, y: y + radius, size: radius, color });
  page.drawCircle({ x: x + width - radius, y: y + radius, size: radius, color });
  page.drawCircle({ x: x + radius, y: y + height - radius, size: radius, color });
  page.drawCircle({ x: x + width - radius, y: y + height - radius, size: radius, color });
}

async function createGiftCardPdf(order: GiftOrderRow) {
  const pdf = await PDFDocument.create();
  const documentDate = new Date(order.paid_at ?? order.expires_at ?? "");
  pdf.setCreationDate(documentDate);
  pdf.setModificationDate(documentDate);
  const page = pdf.addPage([841.89, 595.28]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const ink = rgb(0.19, 0.12, 0.11);
  const brown = rgb(0.56, 0.27, 0.21);
  const pink = rgb(0.95, 0.78, 0.82);
  const palePink = rgb(0.98, 0.9, 0.91);
  const cream = rgb(1, 0.97, 0.91);
  const green = rgb(0.37, 0.52, 0.35);
  const blue = rgb(0.49, 0.51, 0.91);
  const mustard = rgb(0.68, 0.52, 0.22);

  page.drawRectangle({ x: 0, y: 0, width: 841.89, height: 595.28, color: palePink });

  if (order.value.visual === "tropical") {
    page.drawCircle({ x: 76, y: 526, size: 108, color: green });
    page.drawCircle({ x: 786, y: 68, size: 102, color: mustard });
    page.drawCircle({ x: 820, y: 520, size: 70, color: blue });
  } else if (order.value.visual === "confetti") {
    const confetti = [brown, green, blue, mustard, pink];
    for (let index = 0; index < 34; index += 1) {
      const x = 22 + ((index * 97) % 790);
      const y = 20 + ((index * 61) % 550);
      page.drawCircle({ x, y, size: 4 + (index % 3), color: confetti[index % confetti.length] });
    }
  } else {
    const tile = 56;
    for (let row = 0; row < 11; row += 1) {
      for (let column = 0; column < 16; column += 1) {
        if ((row + column) % 2 === 0) {
          page.drawRectangle({
            x: column * tile,
            y: row * tile,
            width: tile,
            height: tile,
            color: pink,
            opacity: 0.52,
          });
        }
      }
    }
  }

  drawRoundedPanel(page, {
    x: 75,
    y: 64,
    width: 692,
    height: 468,
    radius: 25,
    color: cream,
  });

  page.drawText("KAFE CERAMIK", { x: 110, y: 482, size: 18, font: bold, color: brown });
  page.drawText("DEJEUNETTE & CREATION", {
    x: 110,
    y: 463,
    size: 8,
    font: regular,
    color: green,
  });
  page.drawText("CARTE CADEAU", { x: 110, y: 398, size: 42, font: serif, color: ink });
  fittedText(page, formatMoney(order.amount), serif, 565, 400, 162, 30, brown);

  page.drawText("POUR", { x: 112, y: 345, size: 9, font: bold, color: green });
  fittedText(page, order.value.recipientName, bold, 112, 315, 610, 22, ink);
  page.drawText("DE LA PART DE", { x: 112, y: 270, size: 9, font: bold, color: green });
  fittedText(page, order.value.senderName, regular, 112, 240, 610, 18, ink);

  if (order.value.message?.trim()) {
    const compactMessage = pdfText(order.value.message.trim().slice(0, 240), regular);
    const words = compactMessage.split(/\s+/);
    const lines = words.reduce<string[]>((result, word) => {
      const currentLine = result.at(-1) ?? "";
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (regular.widthOfTextAtSize(candidate, 11) <= 590) {
        if (result.length === 0) result.push(candidate);
        else result[result.length - 1] = candidate;
      } else {
        result.push(word);
      }

      return result;
    }, []);

    lines.slice(0, 3).forEach((line, index) => {
      fittedText(page, line, regular, 112, 192 - index * 15, 610, 11, ink);
    });
  }

  page.drawLine({ start: { x: 112, y: 145 }, end: { x: 728, y: 145 }, color: pink, thickness: 2 });
  page.drawText(`Valable jusqu'au ${formatGiftExpiry(order.expires_at || "")}`, {
    x: 112,
    y: 116,
    size: 12,
    font: bold,
    color: ink,
  });
  page.drawText("Montant utilisable librement au Kafe Ceramik ou chez Mala Madre.", {
    x: 112,
    y: 91,
    size: 8,
    font: regular,
    color: ink,
  });

  const bytes = await pdf.save();
  return {
    filename: `carte-cadeau-${order.code}.pdf`,
    content: bytesToBase64(bytes),
  } satisfies EmailAttachment;
}

async function sendGiftCard(order: GiftOrderRow, force = false, preview?: PreviewContext) {
  if (order.status !== "paid") return { delivered: false, reason: "Paiement non confirme." };
  if (order.pdf_email_sent_at && !force) return { delivered: true, alreadySent: true };

  const attachment = await createGiftCardPdf(order);
  const delivered = await sendEmail(
    [order.value.recipientEmail],
    `Ta carte cadeau Kafé Céramik - ${formatMoney(order.amount)}`,
    shell(
      "Une parenthèse créative t'attend",
      `<p>Bonjour ${escapeHtml(order.value.recipientName)},</p><p><strong>${escapeHtml(order.value.senderName)}</strong> t'offre une carte cadeau Kafé Céramik d'une valeur de <strong>${escapeHtml(formatMoney(order.amount))}</strong>.</p>${order.value.message?.trim() ? `<div style="margin:18px 0;padding:16px;background:#f4dddd;border-radius:14px">${escapeHtml(order.value.message)}</div>` : ""}<p>Ta carte personnalisée est jointe à cet e-mail au format PDF. Elle est valable jusqu'au <strong>${escapeHtml(formatGiftExpiry(order.expires_at || "", true))}</strong> et son montant peut être utilisé librement au Kafé Céramik ou chez Mala Madre.</p><p>Présente ta carte à l'équipe lors de ta venue.</p>`,
    ),
    [attachment],
    preview,
    `gift-${order.id}-${force ? crypto.randomUUID() : "paid"}`,
  );

  if (delivered && !preview) {
    await api<void>(`/rest/v1/kafe_gift_card_orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ pdf_email_sent_at: new Date().toISOString() }),
    });
  }
  return {
    delivered,
    reason: delivered ? undefined : "Le fournisseur email reste a configurer.",
  };
}

function shell(title: string, content: string) {
  return `<!doctype html>
  <html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f6e7e7;font-family:Arial,sans-serif;color:#302525">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px">
      <tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff8ef;border:1px solid #dfc7c4;border-radius:20px;overflow:hidden">
        <tr><td style="background:#efcfd3;padding:26px 30px"><div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#8c4939">Kafé Céramik</div><h1 style="margin:8px 0 0;font-size:28px">${escapeHtml(title)}</h1></td></tr>
        <tr><td style="padding:28px 30px;line-height:1.6">${content}</td></tr>
      </table></td></tr>
    </table>
  </body></html>`;
}

function details(
  row: ReservationRow,
  settings: SettingsValue,
  siteUrl: string,
  options: { includeGuideReminder?: boolean; audience?: "customer" | "admin" } = {},
) {
  const { includeGuideReminder = true } = options;
  const guideReminder =
    !includeGuideReminder ||
    options.audience === "admin" ||
    row.value.experience === "brunch_atelier"
      ? ""
      : `<p><strong>Avant de venir :</strong> prends quelques minutes pour relire le <a href="${escapeHtml(siteUrl)}/guide" style="color:#914735">guide de peinture</a>. Ses consignes sont importantes pour la cuisson et la récupération de ta création.</p>`;
  const reservationPortal =
    options.audience === "admin"
      ? `<p style="margin:22px 0"><a href="${escapeHtml(siteUrl)}/admin" style="display:inline-block;background:#914735;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Ouvrir les réservations</a></p>`
      : row.value.managementToken
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

async function markReservation(
  row: ReservationRow,
  patch: Partial<ReservationValue>,
  preview?: PreviewContext,
) {
  if (preview) {
    row.value = { ...row.value, ...patch };
    return;
  }
  const value = await api<ReservationValue | null>("/rest/v1/rpc/mark_kafe_reservation_email", {
    method: "POST",
    body: JSON.stringify({ p_id: row.id, p_patch: patch }),
  });
  if (value) row.value = value;
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

async function reservationCreated(
  row: ReservationRow,
  settings: SettingsValue,
  siteUrl: string,
  preview?: PreviewContext,
) {
  if (!["pending", "deposit_paid", "confirmed", "arrived"].includes(row.status)) return false;
  const isGroup =
    row.value.experience !== "brunch_atelier" &&
    (row.value.isGroupRequest ||
      row.people >= (settings.manualConfirmationThreshold ?? 8) ||
      row.status === "pending");
  const groupQuote = isGroup ? await createGroupQuote(row) : null;
  const attachments = groupQuote ? [groupQuote.attachment] : [];
  const quoteSummary = groupQuote
    ? `<div style="margin:18px 0;padding:16px;background:#f4dddd;border-radius:14px"><strong>Devis estimatif joint : ${escapeHtml(formatMoney(groupQuote.total))}</strong><br>Il reprend les forfaits choisis pour ${row.people} personnes.</div>`
    : "";
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
      shell(title, `${intro}${quoteSummary}${details(row, settings, siteUrl)}`),
      attachments,
      preview,
      `${row.id}-created-customer`,
    );
    if (customerDelivered) {
      await markReservation(
        row,
        {
          reservationCreatedEmailSentAt: new Date().toISOString(),
          ...(row.value.depositPaid ? { depositReceiptEmailSentAt: new Date().toISOString() } : {}),
          ...(groupQuote
            ? { groupQuoteNumber: groupQuote.quoteNumber, groupQuoteTotal: groupQuote.total }
            : {}),
        },
        preview,
      );
    }
  }

  if (
    isGroup &&
    customerDelivered &&
    row.value.depositPaid &&
    !row.value.depositReceiptEmailSentAt
  ) {
    const received = await sendEmail(
      [row.value.email],
      "Ton acompte est bien reçu – Kafé Céramik",
      shell(
        "Acompte reçu",
        `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Ton acompte de <strong>${escapeHtml(row.value.depositAmount ?? 100)} €</strong> est bien reçu.${row.status === "confirmed" || row.status === "arrived" ? " Ta réservation est confirmée." : " Ta demande reste en attente de validation par l'équipe."}</p>${details(row, settings, siteUrl)}`,
      ),
      [],
      preview,
      `${row.id}-deposit-receipt`,
    );
    if (received)
      await markReservation(row, { depositReceiptEmailSentAt: new Date().toISOString() }, preview);
  }

  if (!adminDelivered) {
    const recipients = await adminRecipients(settings, preview);
    adminDelivered = await sendEmail(
      recipients,
      isGroup
        ? `Nouvelle demande de groupe – ${row.people} personnes`
        : `Nouvelle réservation – ${row.people} personne${row.people > 1 ? "s" : ""}`,
      shell(
        isGroup ? "Nouvelle demande à valider" : "Nouvelle réservation",
        `<p><strong>${escapeHtml(row.value.firstName)} ${escapeHtml(row.value.lastName)}</strong> souhaite réserver pour ${row.people} personnes.</p>${quoteSummary}${details(row, settings, siteUrl, { audience: "admin" })}${isGroup ? `<p>Acompte : ${row.value.depositPaid ? "payé" : "en attente"}. Ouvrez l'espace équipe pour accepter ou refuser la demande.</p>` : "<p>Aucune validation n'est nécessaire.</p>"}`,
      ),
      attachments,
      preview,
      `${row.id}-created-admin`,
    );
    if (adminDelivered) {
      await markReservation(row, { adminAlertEmailSentAt: new Date().toISOString() }, preview);
    }
  }

  if (!row.value.adminPushSentAt) {
    const pushed = await sendAdminPush(
      {
        title: isGroup ? "Nouvelle demande de groupe" : "Nouvelle réservation",
        body: `${row.value.firstName} ${row.value.lastName} · ${row.people} pers. · ${formatDate(row.date)} à ${row.slot}`,
        url: `${siteUrl}/admin`,
        tag: `reservation-${row.id}`,
      },
      preview,
    );
    if (pushed > 0)
      await markReservation(row, { adminPushSentAt: new Date().toISOString() }, preview);
  }

  if (customerDelivered && row.status === "confirmed")
    await sendReminder(row, settings, siteUrl, new Date(), preview);
  return customerDelivered && adminDelivered;
}

async function groupDecision(
  row: ReservationRow,
  settings: SettingsValue,
  siteUrl: string,
  approved: boolean,
  message: string,
  preview?: PreviewContext,
) {
  if (approved ? row.status !== "confirmed" || !row.value.depositPaid : row.status !== "cancelled")
    return false;
  if (row.value.decisionEmailSentAt) return true;
  const reason = message.trim() || row.value.decisionMessage?.trim() || "";
  const content = approved
    ? `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Bonne nouvelle : ta demande de groupe est <strong>validée</strong>.</p><p>Ton acompte de <strong>${escapeHtml(row.value.depositAmount ?? settings.depositFixedAmount ?? 100)} €</strong> est bien rattaché à cette réservation.</p>${details(row, settings, siteUrl)}`
    : `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>L'équipe ne peut malheureusement pas confirmer ta demande pour ce créneau.</p>${reason ? `<div style="margin:18px 0;padding:16px;background:#f4dddd;border-radius:14px"><strong>Précision de l'équipe :</strong><br>${escapeHtml(reason)}</div>` : ""}<p>Tu peux contacter le Kafé au ${escapeHtml(settings.contactPhone ?? "0690 28 47 88")} pour chercher une autre possibilité.</p>`;
  const delivered = await sendEmail(
    [row.value.email],
    approved ? "Ta demande de groupe est validée" : "Réponse à ta demande de groupe",
    shell(approved ? "Demande validée" : "Demande non retenue", content),
    [],
    preview,
    `${row.id}-decision-${approved ? "approved" : "rejected"}`,
  );
  if (delivered) {
    await markReservation(row, { decisionEmailSentAt: new Date().toISOString() }, preview);
    if (approved) await sendReminder(row, settings, siteUrl, new Date(), preview);
  }
  return delivered;
}

async function reservationCancelled(
  row: ReservationRow,
  settings: SettingsValue,
  siteUrl: string,
  preview?: PreviewContext,
) {
  if (row.status !== "cancelled") return false;
  let customerDelivered = Boolean(row.value.cancellationEmailSentAt);
  let adminDelivered = Boolean(row.value.adminCancellationAlertEmailSentAt);

  if (!customerDelivered && row.value.email) {
    customerDelivered = await sendEmail(
      [row.value.email],
      "Annulation de ta réservation – Kafé Céramik",
      shell(
        "Réservation annulée",
        `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Ta réservation au Kafé Céramik a bien été annulée.</p>${details(row, settings, siteUrl, { includeGuideReminder: false })}<p>Pour toute question, tu peux contacter le Kafé au ${escapeHtml(settings.contactPhone ?? "0690 28 47 88")}.</p>`,
      ),
      [],
      preview,
      `${row.id}-cancelled-customer`,
    );
    if (customerDelivered) {
      await markReservation(row, { cancellationEmailSentAt: new Date().toISOString() }, preview);
    }
  }

  if (!adminDelivered) {
    const recipients = await adminRecipients(settings, preview);
    adminDelivered = await sendEmail(
      recipients,
      `Réservation annulée – ${row.people} personne${row.people > 1 ? "s" : ""}`,
      shell(
        "Réservation annulée",
        `<p>La réservation de <strong>${escapeHtml(row.value.firstName)} ${escapeHtml(row.value.lastName)}</strong> est annulée.</p>${details(row, settings, siteUrl, { includeGuideReminder: false, audience: "admin" })}`,
      ),
      [],
      preview,
      `${row.id}-cancelled-admin`,
    );
    if (adminDelivered) {
      await markReservation(
        row,
        { adminCancellationAlertEmailSentAt: new Date().toISOString() },
        preview,
      );
    }
  }

  if (!row.value.adminCancellationPushSentAt) {
    const pushed = await sendAdminPush(
      {
        title: "Réservation annulée",
        body: `${row.value.firstName} ${row.value.lastName} · ${row.people} pers. · ${formatDate(row.date)} à ${row.slot}`,
        url: `${siteUrl}/admin`,
        tag: `cancellation-${row.id}`,
      },
      preview,
    );
    if (pushed > 0) {
      await markReservation(
        row,
        { adminCancellationPushSentAt: new Date().toISOString() },
        preview,
      );
    }
  }

  return customerDelivered && adminDelivered;
}

async function processReminders(settings: SettingsValue, siteUrl: string) {
  const today = new Date();
  const end = new Date(today.getTime() + 48 * 60 * 60 * 1000);
  const fromDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guadeloupe" }).format(
    today,
  );
  const toDate = end.toISOString().slice(0, 10);
  const rows = await api<ReservationRow[]>(
    `/rest/v1/kafe_reservations?select=id,value,date,slot,people,status&status=eq.confirmed&date=gte.${fromDate}&date=lte.${toDate}`,
  );
  let sent = 0;
  for (const row of rows) {
    if (await sendReminder(row, settings, siteUrl, today)) sent += 1;
  }
  return sent;
}

async function sendReminder(
  row: ReservationRow,
  settings: SettingsValue,
  siteUrl: string,
  today = new Date(),
  preview?: PreviewContext,
) {
  if (row.status !== "confirmed" || row.value.reminderEmailSentAt || !row.value.email) return false;
  const slotDate = new Date(`${row.date}T${row.slot}:00-04:00`);
  const hoursUntil = (slotDate.getTime() - today.getTime()) / (60 * 60 * 1000);
  if (hoursUntil <= 0 || hoursUntil > 24) return false;
  const isBrunch = row.value.experience === "brunch_atelier";
  const localToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guadeloupe" }).format(
    today,
  );
  const dayLabel = row.date === localToday ? "aujourd'hui" : "demain";
  const delivered = await sendEmail(
    [row.value.email],
    `Rappel : ${isBrunch ? "ton brunch" : "ton atelier"} ${dayLabel} – Kafé Céramik`,
    shell(
      `${isBrunch ? "Ton brunch" : "Ton atelier"}, c'est ${dayLabel}`,
      `<p>Bonjour ${escapeHtml(row.value.firstName)},</p><p>Petit rappel pour ${isBrunch ? "ton brunch" : "ton atelier"} au Kafé Céramik.</p>${details(row, settings, siteUrl)}<p>À très vite !</p>`,
    ),
    [],
    preview,
    `${row.id}-reminder`,
  );
  if (delivered) {
    await markReservation(row, { reminderEmailSentAt: new Date().toISOString() }, preview);
  }
  return delivered;
}

async function buildEmailPreviewSuite(settings: SettingsValue) {
  const result: (PreviewEmail & { key: string })[] = [];
  const base = (
    patch: Partial<ReservationRow> = {},
    value: Partial<ReservationValue> = {},
  ): ReservationRow => ({
    id: "preview-only",
    date: "2026-10-15",
    slot: "10:30",
    people: 2,
    status: "confirmed",
    ...patch,
    value: {
      id: "preview-only",
      firstName: "Camille",
      lastName: "Exemple",
      email: "client@example.invalid",
      phone: "0000000000",
      experience: "cafe_atelier",
      people: patch.people ?? 2,
      date: "2026-10-15",
      slot: "10:30",
      status: patch.status ?? "confirmed",
      managementToken: "preview-no-reservation",
      ...value,
    },
  });
  const collect = async (keys: string[], run: (preview: PreviewContext) => Promise<unknown>) => {
    const preview: PreviewContext = { messages: [] };
    await run(preview);
    if (keys.length !== preview.messages.length)
      throw new Error("Unexpected preview template count");
    preview.messages.forEach((mail, index) => result.push({ ...mail, key: keys[index] }));
  };
  const site = canonicalSiteUrl;
  await collect(["client-confirmation-atelier", "equipe-reservation-atelier"], (p) =>
    reservationCreated(base(), settings, site, p),
  );
  await collect(["client-confirmation-brunch", "equipe-reservation-brunch"], (p) =>
    reservationCreated(base({}, { experience: "brunch_atelier" }), settings, site, p),
  );
  await collect(["client-groupe-en-attente", "equipe-groupe-a-valider"], (p) =>
    reservationCreated(
      base(
        { people: 8, status: "pending" },
        {
          isGroupRequest: true,
          depositRequired: true,
          depositAmount: 100,
          groupCeramicRatePerPerson: 35,
          groupMealRatePerPerson: 20,
        },
      ),
      settings,
      site,
      p,
    ),
  );
  await collect(["client-groupe-acompte-recu", "equipe-groupe-acompte-recu"], (p) =>
    reservationCreated(
      base(
        { people: 8, status: "deposit_paid" },
        { isGroupRequest: true, depositRequired: true, depositPaid: true, depositAmount: 100 },
      ),
      settings,
      site,
      p,
    ),
  );
  await collect(["client-recu-apres-paiement"], (p) =>
    reservationCreated(
      base(
        { people: 8, status: "deposit_paid" },
        {
          isGroupRequest: true,
          depositRequired: true,
          depositPaid: true,
          depositAmount: 100,
          reservationCreatedEmailSentAt: "2026-09-08",
          adminAlertEmailSentAt: "2026-09-08",
        },
      ),
      settings,
      site,
      p,
    ),
  );
  await collect(["client-groupe-accepte"], (p) =>
    groupDecision(base({ people: 8 }, { depositPaid: true }), settings, site, true, "", p),
  );
  await collect(["client-groupe-refuse"], (p) =>
    groupDecision(
      base({ people: 8, status: "cancelled" }, { depositPaid: true }),
      settings,
      site,
      false,
      "Nous ne pouvons pas accueillir ce groupe à l'horaire demandé. Appelle-nous pour choisir un autre créneau.",
      p,
    ),
  );
  await collect(["client-annulation", "equipe-annulation"], (p) =>
    reservationCancelled(base({ status: "cancelled" }), settings, site, p),
  );
  await collect(["client-rappel-atelier-24h"], (p) =>
    sendReminder(base(), settings, site, new Date("2026-10-14T10:30:00-04:00"), p),
  );
  await collect(["client-rappel-brunch-24h"], (p) =>
    sendReminder(
      base({}, { experience: "brunch_atelier" }),
      settings,
      site,
      new Date("2026-10-14T10:30:00-04:00"),
      p,
    ),
  );
  await collect(["client-rappel-jour-meme"], (p) =>
    sendReminder(base(), settings, site, new Date("2026-10-15T08:00:00-04:00"), p),
  );
  for (const visual of ["rose", "tropical", "confetti"] as const) {
    await collect([`beneficiaire-cadeau-${visual}`], (p) =>
      sendGiftCard(
        {
          id: `preview-${visual}`,
          code: "EXEMPLE-NON-VALABLE",
          value: {
            recipientName: "Camille Exemple",
            recipientEmail: "beneficiaire@example.invalid",
            senderName: "Louis Exemple",
            message:
              "Pour un joli moment créatif. Ceci est une carte de démonstration sans valeur.",
            visual,
          },
          amount: 60,
          status: "paid",
          paid_at: "2026-09-08T15:30:00Z",
          expires_at: "2027-03-09T03:59:59.999Z",
          pdf_email_sent_at: null,
        },
        false,
        p,
      ),
    );
  }
  return result;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await request.json()) as {
      action?: string;
      reservationId?: string;
      giftOrderId?: string;
      managementToken?: string;
      message?: string;
      siteUrl?: string;
      previewKey?: string;
    };
    const action = body.action ?? "";
    if (action === "preview-list" || action === "send-preview") {
      if (!serviceRoleKey || request.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`)
        return json({ error: "Unauthorized" }, 401);
      const previews = await buildEmailPreviewSuite(await readSettings());
      if (action === "preview-list")
        return json({
          previews: previews.map(({ key, subject, attachments }) => ({
            key,
            subject,
            attachments: attachments.map((a) => a.filename),
          })),
        });
      const mail = previews.find((item) => item.key === body.previewKey);
      if (!mail) return json({ error: "Unknown preview" }, 400);
      const recipient = "gwada.web.studio@gmail.com";
      const receipt = await deliverEmail(
        {
          ...mail,
          to: [recipient],
          subject: `[TEST Kafé · ${mail.key}] ${mail.subject}`,
          html: mail.html.replace(
            /<body([^>]*)>/,
            `<body$1><p style="padding:12px;font:14px Arial;color:#302525;background:#fff">TEST POUR LOUIS : données fictives, aucune réservation ni carte utilisable. Les liens de réservation de cet exemple ne correspondent pas à un dossier réel.</p>`,
          ),
        },
        `kafe-preview-20260908-v1-${mail.key}`,
      );
      return json({
        accepted: Boolean(receipt),
        id: receipt ? receipt.id : null,
        recipient,
        key: mail.key,
      });
    }
    const siteUrl = canonicalSiteUrl;
    const settings = await readSettings();

    if (action === "gift-card-paid") {
      if (!body.giftOrderId) return json({ error: "Missing giftOrderId" }, 400);
      const authorization = request.headers.get("Authorization") ?? "";
      const internalCall = authorization === `Bearer ${serviceRoleKey}`;
      if (!internalCall && !(await requireAdmin(request)))
        return json({ error: "Unauthorized" }, 401);
      const order = await readGiftOrder(body.giftOrderId);
      if (!order) return json({ error: "Gift card order not found" }, 404);
      const result = await sendGiftCard(order, !internalCall);
      return json({ ok: true, ...result });
    }

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
