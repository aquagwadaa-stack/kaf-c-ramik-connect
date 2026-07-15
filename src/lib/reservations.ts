import { useEffect, useState } from "react";
import { settingsSeed, type KafeSettings } from "./admin-data";

export type ReservationStatus = "pending" | "deposit_paid" | "confirmed" | "cancelled";
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
  message?: string;
  depositPaid: boolean;
  depositRequired?: boolean;
  depositAmount?: number;
  status: ReservationStatus;
  notes?: string;
  isGroupRequest?: boolean;
  eventType?: string;
  budget?: string;
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

function read(): Reservation[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return seed;
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
    setList(read());
    const update = () => setList(read());
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return list;
}

export function addReservation(r: Omit<Reservation, "id" | "createdAt">): Reservation {
  const full: Reservation = {
    ...r,
    id: `r${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
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
) {
  return Math.max(0, settings.defaultCapacity - getReservedPeopleForSlot(reservations, date, slot));
}

export function updateStatus(id: string, status: ReservationStatus) {
  const list = read().map((reservation) =>
    reservation.id === id ? { ...reservation, status } : reservation,
  );
  write(list);
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
