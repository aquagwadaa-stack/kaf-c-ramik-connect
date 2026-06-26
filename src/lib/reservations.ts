import { useEffect, useState } from "react";

export type ReservationStatus = "pending" | "deposit_paid" | "confirmed" | "cancelled";
export type ExperienceType = "atelier" | "cafe_atelier" | "brunch_atelier" | "groupe";

export interface Reservation {
  id: string;
  createdAt: string;
  experience: ExperienceType;
  people: number;
  date: string; // ISO yyyy-mm-dd
  slot: string; // "10:30"
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message?: string;
  depositPaid: boolean;
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
    experience: "atelier",
    people: 2,
    date: nextWeekday(5),
    slot: "10:30",
    firstName: "Anaïs",
    lastName: "Bertrand",
    phone: "0690 11 22 33",
    email: "anais@example.com",
    depositPaid: true,
    status: "deposit_paid",
  },
  {
    id: "r2",
    createdAt: new Date().toISOString(),
    experience: "brunch_atelier",
    people: 4,
    date: nextWeekday(6),
    slot: "14:00",
    firstName: "Camille",
    lastName: "Marie-Jeanne",
    phone: "0690 44 55 66",
    email: "camille@example.com",
    depositPaid: true,
    status: "confirmed",
  },
  {
    id: "r3",
    createdAt: new Date().toISOString(),
    experience: "groupe",
    people: 8,
    date: nextWeekday(6, 14),
    slot: "16:00",
    firstName: "Laura",
    lastName: "Petit",
    phone: "0690 77 88 99",
    email: "laura@example.com",
    depositPaid: false,
    status: "pending",
    isGroupRequest: true,
    eventType: "Anniversaire",
    budget: "300-500€",
    message: "Anniversaire surprise pour ma sœur, 8 personnes.",
  },
  {
    id: "r4",
    createdAt: new Date().toISOString(),
    experience: "atelier",
    people: 3,
    date: nextWeekday(0),
    slot: "11:00",
    firstName: "Sophie",
    lastName: "Lacroix",
    phone: "0690 12 34 56",
    email: "sophie@example.com",
    depositPaid: true,
    status: "confirmed",
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
  listeners.forEach((l) => l());
}

export function useReservations() {
  const [list, setList] = useState<Reservation[]>(() => (typeof window === "undefined" ? seed : []));
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

export function updateStatus(id: string, status: ReservationStatus) {
  const list = read().map((r) => (r.id === id ? { ...r, status } : r));
  write(list);
}

export function experienceLabel(e: ExperienceType): string {
  return {
    atelier: "Atelier céramique",
    cafe_atelier: "Café + atelier",
    brunch_atelier: "Brunch + atelier",
    groupe: "Groupe / Événement",
  }[e];
}

export function statusLabel(s: ReservationStatus) {
  return {
    pending: "En attente",
    deposit_paid: "Acompte payé",
    confirmed: "Confirmé",
    cancelled: "Annulé",
  }[s];
}
