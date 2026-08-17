const KAFE_TIME_ZONE = "America/Guadeloupe";

function kafeDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KAFE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getKafeDate(date = new Date()) {
  const parts = kafeDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getKafeTime(date = new Date()) {
  const parts = kafeDateTimeParts(date);
  return `${parts.hour}:${parts.minute}`;
}

export function addIsoDays(date: string, count: number) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + count);
  return next.toISOString().slice(0, 10);
}

export function kafeTodayAtLocalNoon(date = new Date()) {
  return new Date(`${getKafeDate(date)}T12:00:00`);
}
