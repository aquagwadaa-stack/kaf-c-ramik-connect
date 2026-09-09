const timeZone = "America/Guadeloupe";

export function giftExpiryFromPurchase(purchasedAt: Date | string, months: number) {
  const date = new Date(purchasedAt);
  if (!Number.isFinite(date.getTime()) || !Number.isInteger(months) || months < 1) {
    throw new Error("Invalid gift card validity");
  }
  const local = new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  const [year, month, day] = local.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  // Valid through the last local day, with month-end dates clamped (31 August -> 28 February).
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay) + 1, 4) - 1,
  ).toISOString();
}

export function formatGiftExpiry(expiresAt: string, longMonth = false) {
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime())) throw new Error("Missing gift card expiration date");
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: longMonth ? "long" : "2-digit",
    year: "numeric",
    timeZone,
  }).format(date);
}

export function giftIsValid(
  order: { status: string; expiresAt?: string | null },
  now = new Date(),
) {
  return (
    order.status === "paid" &&
    Boolean(order.expiresAt) &&
    new Date(order.expiresAt!).getTime() >= now.getTime()
  );
}
