import { useEffect, useState } from "react";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: Listener) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)?.add(listener);
  return () => listeners.get(key)?.delete(listener);
}

function readStore<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function writeStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  notify(key);
}

export function useStoredList<T>(key: string, seed: T[]) {
  const [list, setList] = useState<T[]>(() => (typeof window === "undefined" ? seed : []));

  useEffect(() => {
    const update = () => setList(readStore(key, seed));
    update();
    return subscribe(key, update);
  }, [key, seed]);

  const save = (next: T[]) => writeStore(key, next);
  return [list, save] as const;
}

export interface CeramicObject {
  id: string;
  name: string;
  category: "Tasses" | "Bols" | "Assiettes" | "Figurines" | "Deco" | "Vases" | "Petites pieces";
  price: number;
  availability: "available" | "limited" | "unavailable";
  note?: string;
}

export const ceramicObjectsSeed: CeramicObject[] = [
  {
    id: "obj-tasse-design",
    name: "Tasse design",
    category: "Tasses",
    price: 36,
    availability: "available",
  },
  {
    id: "obj-tasse-chat",
    name: "Tasse chat",
    category: "Tasses",
    price: 38,
    availability: "limited",
  },
  {
    id: "obj-bol-matcha",
    name: "Bol matcha",
    category: "Bols",
    price: 38,
    availability: "available",
  },
  {
    id: "obj-assiette-plate",
    name: "Assiette plate",
    category: "Assiettes",
    price: 44,
    availability: "available",
  },
  { id: "obj-dragon", name: "Dragon", category: "Figurines", price: 32, availability: "limited" },
  {
    id: "obj-licorne",
    name: "Licorne / dauphin",
    category: "Figurines",
    price: 28,
    availability: "available",
  },
  {
    id: "obj-monstre",
    name: "Monstre XXL",
    category: "Figurines",
    price: 48,
    availability: "available",
  },
  {
    id: "obj-vase-boule",
    name: "Vase boule",
    category: "Vases",
    price: 42,
    availability: "available",
  },
  {
    id: "obj-porte-savon",
    name: "Porte-savon",
    category: "Petites pieces",
    price: 24,
    availability: "available",
  },
  {
    id: "obj-cloche",
    name: "Cloche guirlande",
    category: "Deco",
    price: 16,
    availability: "limited",
  },
];

export interface ContentDocument {
  id: "guide" | "waiver";
  title: string;
  version: string;
  updatedAt: string;
  body: string;
}

export const contentDocumentsSeed: ContentDocument[] = [
  {
    id: "guide",
    title: "Guide de peinture",
    version: "v1-demo",
    updatedAt: new Date().toISOString(),
    body: "Guide provisoire. Le texte officiel sera fourni par Mala Madre : preparation de la piece, consignes de peinture, delais de cuisson et recuperation.",
  },
  {
    id: "waiver",
    title: "Decharge atelier",
    version: "v1-demo",
    updatedAt: new Date().toISOString(),
    body: "Decharge provisoire. Le texte officiel sera fourni par Mala Madre et valide par le client avant publication.",
  },
];

export interface WaiverSignature {
  id: string;
  firstName: string;
  lastName: string;
  reservationRef?: string;
  documentVersion: string;
  signedAt: string;
  signatureDataUrl?: string;
  guideAccepted: boolean;
}

export const waiverSignaturesSeed: WaiverSignature[] = [
  {
    id: "sig-demo-1",
    firstName: "Camille",
    lastName: "Marie-Jeanne",
    reservationRef: "r2",
    documentVersion: "v1-demo",
    signedAt: new Date().toISOString(),
    guideAccepted: true,
  },
];

export interface KafeSettings {
  depositThreshold: number;
  depositPerPerson: number;
  defaultCapacity: number;
  signatureRequiredOnArrival: boolean;
  walkInCafeEnabled: boolean;
}

export const settingsSeed: KafeSettings = {
  depositThreshold: 8,
  depositPerPerson: 10,
  defaultCapacity: 12,
  signatureRequiredOnArrival: true,
  walkInCafeEnabled: true,
};

export function useCeramicObjects() {
  return useStoredList<CeramicObject>("kafe-ceramik-objects", ceramicObjectsSeed);
}

export function useContentDocuments() {
  return useStoredList<ContentDocument>("kafe-ceramik-documents", contentDocumentsSeed);
}

export function useWaiverSignatures() {
  return useStoredList<WaiverSignature>("kafe-ceramik-waiver-signatures", waiverSignaturesSeed);
}

export function useKafeSettings() {
  const [settings, setSettings] = useState<KafeSettings>(() =>
    typeof window === "undefined" ? settingsSeed : settingsSeed,
  );

  useEffect(() => {
    const update = () => setSettings(readStore("kafe-ceramik-settings", settingsSeed));
    update();
    return subscribe("kafe-ceramik-settings", update);
  }, []);

  const save = (next: KafeSettings) => writeStore("kafe-ceramik-settings", next);
  return [settings, save] as const;
}
