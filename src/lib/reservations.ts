import { useEffect, useState } from "react";
import { settingsSeed, type KafeSettings } from "./admin-data";
import {
  callRpc,
  deleteRow,
  insertRow,
  isSupabaseConfigured,
  patchRow,
  readAdminSession,
  selectRows,
} from "./supabase-rest";

export type ReservationStatus = "pending" | "deposit_paid" | "confirmed" | "arrived" | "cancelled";
export type ExperienceType = "atelier" | "cafe_atelier" | "brunch_atelier" | "groupe";

export interface Reservation {
  id: string;
  createdAt: string;
  experience: ExperienceType;
  people: number;
  date: string;
  slot: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  childrenAges: string;
  guideAccepted: boolean;
  message?: string;
  depositPaid: boolean;
  depositRequired?: boolean;
  depositAmount?: number;
  status: ReservationStatus;
  notes?: string;
  isGroupRequest?: boolean;
  eventType?: string;
  budget?: string;
  seatingUnitId?: string;
}

const KEY = "kafe-ceramik-reservations";

const seed: Reservation[] = [
  {
    id: "r1",
    createdAt: new Date().toISOString(),
    experience: "cafe_atelier",
    people: 2,
    date: nextWeekday(5),
    slot: "10:30",
    firstName: "Anaïs",
    lastName: "Bertrand",
    phone: "0690 11 22 33",
    email: "anais@example.com",
    childrenAges: "Aucun enfant",
    guideAccepted: true,
    depositPaid: false,
    depositRequired: false,
    depositAmount: 0,
    status: "confirmed",
  },
  {
    id: "r2",
    createdAt: new Date().toISOString(),
    experience: "brunch_atelier",
    people: 4,
    date: nextWeekday(6),
    slot: "14:30",
    firstName: "Camille",
    lastName: "Marie-Jeanne",
    phone: "0690 44 55 66",
    email: "camille@example.com",
    childrenAges: "2 enfants : 6 et 9 ans",
    guideAccepted: true,
    depositPaid: false,
    depositRequired: false,
    depositAmount: 0,
    status: "confirmed",
  },
  {
    id: "r3",
    createdAt: new Date().toISOString(),
    experience: "groupe",
    people: 8,
    date: nextWeekday(6, 14),
    slot: "16:30",
    firstName: "Laura",
    lastName: "Petit",
    phone: "0690 77 88 99",
    email: "laura@example.com",
    childrenAges: "Aucun enfant",
    guideAccepted: true,
    depositPaid: false,
    depositRequired: true,
    depositAmount: 80,
    status: "pending",
    isGroupRequest: true,
    eventType: "Groupe",
    budget: "300-500 EUR",
    message: "Table de 8 personnes, besoin de confirmer l'organisation.",
  },
];

function nextWeekday(target: number, offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const listeners = new Set<() => void>();

type ReservationRow = {
  id: string;
  value: Reservation;
  created_at: string;
  date: string;
  slot: string;
  people: number;
  status: ReservationStatus;
  seating_unit_id?: string | null;
  updated_at?: string;
};

export type SlotOccupancy = {
  reservation_id: string;
  date: string;
  slot: string;
  people: number;
  seating_unit_id: string | null;
};

type LegacySlotCapacity = {
  date: string;
  slot: string;
  reserved_people: number;
};

function toReservationRow(reservation: Reservation): ReservationRow {
  const row: ReservationRow = {
    id: reservation.id,
    value: reservation,
    created_at: reservation.createdAt,
    date: reservation.date,
    slot: reservation.slot,
    people: reservation.people,
    status: reservation.status,
    updated_at: new Date().toISOString(),
  };
  if (reservation.seatingUnitId) row.seating_unit_id = reservation.seatingUnitId;
  return row;
}

async function loadRemoteReservations() {
  await callRpc<number>("expire_kafe_no_shows", {}, true).catch((error) => {
    console.warn("No-show expiration skipped:", error);
  });
  const rows = await selectRows<ReservationRow>(
    "kafe_reservations",
    "?select=id,value,created_at,date,slot,people,status,updated_at&order=date.asc,slot.asc",
    true,
  );
  return rows.map((row) => row.value);
}

async function insertRemoteReservation(reservation: Reservation) {
  await insertRow("kafe_reservations", toReservationRow(reservation), false);
}

async function updateRemoteReservationStatus(reservation: Reservation) {
  await patchRow("kafe_reservations", reservation.id, toReservationRow(reservation), true);
}

function read(): Reservation[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = isSupabaseConfigured() ? [] : seed;
      localStorage.setItem(KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return isSupabaseConfigured() ? [] : seed;
  }
}

function write(list: Reservation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  listeners.forEach((listener) => listener());
}

export function useReservations() {
  const [list, setList] = useState<Reservation[]>(() =>
    typeof window === "undefined" ? seed : [],
  );
  useEffect(() => {
    let alive = true;
    setList(read());
    const update = () => setList(read());
    listeners.add(update);

    if (isSupabaseConfigured() && readAdminSession()) {
      loadRemoteReservations()
        .then((remoteList) => {
          if (!alive) return;
          write(remoteList);
          setList(remoteList);
        })
        .catch((error) => {
          console.warn("Remote reservations load skipped:", error);
        });
    }

    return () => {
      alive = false;
      listeners.delete(update);
    };
  }, []);
  return list;
}

export function useReservationOccupancies() {
  const [occupancies, setOccupancies] = useState<SlotOccupancy[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    const today = new Date();
    const until = new Date();
    until.setDate(until.getDate() + 90);
    callRpc<SlotOccupancy[]>("get_kafe_slot_occupancy", {
      from_date: today.toISOString().slice(0, 10),
      to_date: until.toISOString().slice(0, 10),
    })
      .then((rows) => {
        if (alive) setOccupancies(rows);
      })
      .catch(async (error) => {
        console.warn("Detailed occupancy load skipped, using aggregate fallback:", error);
        try {
          const rows = await callRpc<LegacySlotCapacity[]>("get_kafe_slot_capacity", {
            from_date: today.toISOString().slice(0, 10),
            to_date: until.toISOString().slice(0, 10),
          });
          if (!alive) return;
          setOccupancies(
            rows.map((row) => ({
              reservation_id: `legacy-${row.date}-${row.slot}`,
              date: row.date,
              slot: row.slot,
              people: row.reserved_people,
              seating_unit_id: null,
            })),
          );
        } catch (fallbackError) {
          console.warn("Remote occupancy load skipped:", fallbackError);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  return occupancies;
}

function isMissingReservationRpc(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("create_kafe_reservation") && message.includes("schema cache");
}

export async function addReservation(
  r: Omit<Reservation, "id" | "createdAt">,
): Promise<Reservation> {
  let full: Reservation = {
    ...r,
    id: `r${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const rows = await callRpc<{ id: string; seating_unit_id: string }[]>(
        "create_kafe_reservation",
        {
          p_value: full,
          p_date: full.date,
          p_slot: full.slot,
          p_people: full.people,
        },
      );
      if (!rows[0]?.id) throw new Error("La réservation n'a pas pu être enregistrée.");
      full = {
        ...full,
        id: rows[0].id,
        seatingUnitId: rows[0].seating_unit_id,
      };
    } catch (error) {
      if (!isMissingReservationRpc(error)) throw error;
      console.warn("Atomic reservation RPC unavailable, using legacy insert:", error);
      await insertRemoteReservation(full);
    }
  }

  const list = read();
  write([full, ...list]);
  return full;
}

export function shouldRequireDeposit(people: number, settings: KafeSettings = settingsSeed) {
  return people >= settings.depositThreshold;
}

export function getDepositAmount(people: number, settings: KafeSettings = settingsSeed) {
  return shouldRequireDeposit(people, settings) ? people * settings.depositPerPerson : 0;
}

export function shouldWaitForManualConfirmation(
  people: number,
  experience: ExperienceType,
  settings: KafeSettings = settingsSeed,
) {
  return (
    settings.manualConfirmationForGroups &&
    (experience === "groupe" || people >= settings.manualConfirmationThreshold)
  );
}

export function getReservedPeopleForSlot(reservations: Reservation[], date: string, slot: string) {
  return reservations
    .filter((reservation) => {
      if (reservation.date !== date || reservation.slot !== slot) return false;
      return reservation.status !== "cancelled";
    })
    .reduce((total, reservation) => total + reservation.people, 0);
}

export function getRemainingCapacity(
  reservations: Reservation[],
  date: string,
  slot: string,
  settings: KafeSettings,
  capacities?: LegacySlotCapacity[],
) {
  const remoteCapacity = capacities?.find(
    (capacity) => capacity.date === date && capacity.slot === slot,
  );
  if (remoteCapacity) return Math.max(0, settings.defaultCapacity - remoteCapacity.reserved_people);
  return Math.max(0, settings.defaultCapacity - getReservedPeopleForSlot(reservations, date, slot));
}

export interface SeatingUnitAvailability {
  id: string;
  label: string;
  capacity: number;
  remaining: number;
}

export interface SlotPlacement {
  unitId: string | null;
  unitLabel: string | null;
  maxGroupSize: number;
  totalRemaining: number;
}

function expandSeatingUnits(settings: KafeSettings): SeatingUnitAvailability[] {
  const areas = settings.seatingAreas?.length
    ? settings.seatingAreas
    : [{ id: "atelier", label: "Atelier", capacity: settings.defaultCapacity, quantity: 1 }];

  return areas.flatMap((area) =>
    Array.from({ length: Math.max(0, area.quantity) }, (_, index) => ({
      id: `${area.id}-${index + 1}`,
      label: area.quantity > 1 ? `${area.label} ${index + 1}` : area.label,
      capacity: Math.max(0, area.capacity),
      remaining: Math.max(0, area.capacity),
    })),
  );
}

function overlaps(slotA: string, slotB: string, durationMinutes: number) {
  const startA = timeToMinutes(slotA);
  const startB = timeToMinutes(slotB);
  return startA < startB + durationMinutes && startB < startA + durationMinutes;
}

function findBestFitUnit(units: SeatingUnitAvailability[], people: number) {
  return units
    .filter((unit) => unit.remaining >= people)
    .sort((a, b) => a.remaining - people - (b.remaining - people) || a.capacity - b.capacity)[0];
}

export function getSlotPlacement(
  reservations: Reservation[],
  occupancies: SlotOccupancy[],
  date: string,
  slot: string,
  people: number,
  settings: KafeSettings,
): SlotPlacement {
  const units = expandSeatingUnits(settings);
  const duration = Math.max(15, settings.slotDurationMinutes || 120);
  const remoteIds = new Set(occupancies.map((occupancy) => occupancy.reservation_id));
  const active = [
    ...occupancies
      .filter((occupancy) => occupancy.date === date && overlaps(occupancy.slot, slot, duration))
      .map((occupancy) => ({
        id: occupancy.reservation_id,
        people: occupancy.people,
        seatingUnitId: occupancy.seating_unit_id ?? undefined,
      })),
    ...reservations
      .filter(
        (reservation) =>
          !remoteIds.has(reservation.id) &&
          reservation.status !== "cancelled" &&
          reservation.date === date &&
          overlaps(reservation.slot, slot, duration),
      )
      .map((reservation) => ({
        id: reservation.id,
        people: reservation.people,
        seatingUnitId: reservation.seatingUnitId,
      })),
  ];

  const unassigned: typeof active = [];
  active.forEach((reservation) => {
    const assigned = units.find((unit) => unit.id === reservation.seatingUnitId);
    if (!assigned) {
      unassigned.push(reservation);
      return;
    }
    assigned.remaining = Math.max(0, assigned.remaining - reservation.people);
  });

  for (const reservation of unassigned.sort((a, b) => b.people - a.people)) {
    const assigned = findBestFitUnit(units, reservation.people);
    if (!assigned) {
      return { unitId: null, unitLabel: null, maxGroupSize: 0, totalRemaining: 0 };
    }
    assigned.remaining -= reservation.people;
  }

  const chosen = findBestFitUnit(units, people);
  return {
    unitId: chosen?.id ?? null,
    unitLabel: chosen?.label ?? null,
    maxGroupSize: Math.max(0, ...units.map((unit) => unit.remaining)),
    totalRemaining: units.reduce((total, unit) => total + unit.remaining, 0),
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function dateMatchesRule(
  isoDate: string,
  weekday: number,
  settings: KafeSettings,
  ruleIndex: number,
) {
  const rule = settings.scheduleRules?.[ruleIndex];
  if (!rule) return false;
  if (!rule.weekdays.includes(weekday)) return false;
  if (rule.validFrom && isoDate < rule.validFrom) return false;
  if (rule.validUntil && isoDate > rule.validUntil) return false;
  return true;
}

export function getSlotsForDate(isoDate: string, settings: KafeSettings) {
  const weekday = new Date(`${isoDate}T00:00:00`).getDay();
  const interval = Math.max(15, settings.slotIntervalMinutes || 60);

  if (!settings.scheduleRules?.length) {
    return settings.closedWeekdays.includes(weekday) ? [] : settings.slots;
  }

  const slots = new Set<string>();
  settings.scheduleRules.forEach((rule, index) => {
    if (!dateMatchesRule(isoDate, weekday, settings, index)) return;
    const start = timeToMinutes(rule.startTime);
    const end = timeToMinutes(rule.endTime);
    if (end <= start) return;
    for (let minute = start; minute <= end; minute += interval) {
      slots.add(minutesToTime(minute));
    }
  });

  return [...slots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "la duree prevue";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

export function updateStatus(id: string, status: ReservationStatus) {
  const list = read().map((reservation) =>
    reservation.id === id ? { ...reservation, status } : reservation,
  );
  write(list);
  const updated = list.find((reservation) => reservation.id === id);
  if (isSupabaseConfigured()) {
    if (!updated) return;
    updateRemoteReservationStatus(updated).catch((error) => {
      console.warn("Remote reservation status save skipped:", error);
    });
  }
}

export function removeReservation(id: string) {
  write(read().filter((reservation) => reservation.id !== id));
  if (isSupabaseConfigured() && readAdminSession()) {
    deleteRow("kafe_reservations", id, true).catch((error) => {
      console.warn("Remote reservation delete skipped:", error);
    });
  }
}

export function experienceLabel(experience: ExperienceType): string {
  return {
    atelier: "Atelier céramique",
    cafe_atelier: "Kafé + atelier",
    brunch_atelier: "Brunch + atelier",
    groupe: "Groupe",
  }[experience];
}

export function statusLabel(status: ReservationStatus) {
  return {
    pending: "En attente",
    deposit_paid: "Acompte payé",
    confirmed: "Confirmé",
    arrived: "Arrivé",
    cancelled: "Annulé",
  }[status];
}

export function formatReservationDate(iso: string) {
  if (!iso) return "-";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
