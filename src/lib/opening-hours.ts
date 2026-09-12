import type { KafeSettings, ScheduleRule } from "./admin-data";
import { getKafeDate } from "./kafe-time";

const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function formatTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, "0")}`;
}

export function formatPublicTime(value: string) {
  return formatTime(toMinutes(value));
}

function formatWeekdays(weekdays: number[]) {
  const ordered = [1, 2, 3, 4, 5, 6, 0].filter((day) => weekdays.includes(day));
  if (ordered.length === 7) return "Tous les jours";
  if (ordered.length > 1) {
    const firstIndex = [1, 2, 3, 4, 5, 6, 0].indexOf(ordered[0]);
    const contiguous = ordered.every(
      (day, index) => [1, 2, 3, 4, 5, 6, 0][firstIndex + index] === day,
    );
    if (contiguous) return `${dayNames[ordered[0]]} – ${dayNames[ordered.at(-1)!]}`;
  }
  return ordered.map((day) => dayNames[day]).join(", ");
}

function selectCurrentRules(rules: ScheduleRule[], now: Date) {
  const today = getKafeDate(now);
  return rules.filter(
    (rule) =>
      (!rule.validFrom || rule.validFrom <= today) &&
      (!rule.validUntil || rule.validUntil >= today) &&
      rule.weekdays.length > 0,
  );
}

export function getPublicSchedule(settings: KafeSettings, now = new Date()) {
  const rules = selectCurrentRules(settings.scheduleRules ?? [], now);
  if (!rules.length) {
    return {
      days: "Horaires à confirmer",
      hours: "",
      inline: "Horaires à confirmer",
    };
  }

  const closing = toMinutes(settings.cafeClosingTime || "18:30");
  const days = formatWeekdays(rules.flatMap((rule) => rule.weekdays));
  const opening = Math.min(...rules.map((rule) => toMinutes(rule.startTime)));
  const hours = `${formatTime(opening)} – ${formatTime(closing)}`;
  return { days, hours, inline: `${days} · ${hours}` };
}
