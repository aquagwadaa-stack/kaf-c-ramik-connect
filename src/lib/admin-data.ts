import { useEffect, useState } from "react";
import { isSupabaseConfigured, selectRows, upsertRows } from "./supabase-rest";

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
    return { ...seed, ...(JSON.parse(raw) as T) };
  } catch {
    return seed;
  }
}

function readList<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function writeStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  notify(key);
}

type RemoteJsonRow<T> = {
  id: string;
  value: T;
  sort_order?: number;
  updated_at?: string;
};

type RemoteListOptions<T> = {
  table: string;
  authLoad?: boolean;
  hasSortOrder?: boolean;
  toRow?: (item: T, index: number) => RemoteJsonRow<T>;
};

async function loadRemoteList<T>(table: string, authLoad = false, hasSortOrder = true) {
  const query = hasSortOrder
    ? "?select=id,value,sort_order,updated_at&order=sort_order.asc.nullslast,updated_at.desc"
    : "?select=id,value,updated_at&order=updated_at.desc";
  const rows = await selectRows<RemoteJsonRow<T>>(table, query, authLoad);
  return rows.map((row) => row.value);
}

async function saveRemoteList<T extends { id: string }>(
  table: string,
  list: T[],
  toRow: (item: T, index: number) => RemoteJsonRow<T>,
) {
  await upsertRows(table, list.map(toRow), true);
}

export function useStoredList<T extends { id: string }>(
  key: string,
  seed: T[],
  remote?: RemoteListOptions<T>,
) {
  const [list, setList] = useState<T[]>(() => (typeof window === "undefined" ? seed : []));
  const remoteTable = remote?.table;
  const remoteAuthLoad = remote?.authLoad;
  const remoteHasSortOrder = remote?.hasSortOrder;

  useEffect(() => {
    let alive = true;
    const update = () => setList(readList(key, seed));
    update();
    const unsubscribe = subscribe(key, update);

    if (remoteTable && isSupabaseConfigured()) {
      loadRemoteList<T>(remoteTable, remoteAuthLoad, remoteHasSortOrder !== false)
        .then((remoteList) => {
          if (!alive || (remoteList.length === 0 && !remoteAuthLoad)) return;
          writeStore(key, remoteList);
          setList(remoteList);
        })
        .catch((error) => {
          console.warn(`Remote load skipped for ${remoteTable}:`, error);
        });
    }

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [key, remoteAuthLoad, remoteHasSortOrder, remoteTable, seed]);

  const save = (next: T[]) => {
    writeStore(key, next);
    if (remote && isSupabaseConfigured()) {
      const toRow =
        remote.toRow ??
        ((item: T, index: number) => ({
          id: item.id,
          value: item,
          sort_order: index,
          updated_at: new Date().toISOString(),
        }));
      saveRemoteList(remote.table, next, toRow).catch((error) => {
        console.warn(`Remote save skipped for ${remote.table}:`, error);
      });
    }
  };
  return [list, save] as const;
}

export interface CeramicObject {
  id: string;
  name: string;
  category: "Tasses" | "Bols" | "Assiettes" | "Figurines" | "Deco" | "Vases" | "Petites pieces";
  price: number;
  availability: "available" | "limited" | "unavailable";
  imageDataUrl?: string;
  imageName?: string;
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
  attachmentDataUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

export const contentDocumentsSeed: ContentDocument[] = [
  {
    id: "guide",
    title: "Guide de peinture",
    version: "v1-demo",
    updatedAt: new Date().toISOString(),
    body: "Guide provisoire. Le texte officiel sera fourni par Mala Madre : préparation de la pièce, consignes de peinture, délais de cuisson et récupération.",
  },
  {
    id: "waiver",
    title: "Décharge atelier",
    version: "v1-demo",
    updatedAt: new Date().toISOString(),
    body: "Décharge provisoire. Le texte officiel sera fourni par Mala Madre et validé par le client avant publication.",
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

export const waiverSignaturesSeed: WaiverSignature[] = [];

export interface ScheduleRule {
  id: string;
  label: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  validFrom: string;
  validUntil: string;
}

export interface KafeSettings {
  depositThreshold: number;
  depositPerPerson: number;
  defaultCapacity: number;
  slotDurationMinutes: number;
  slots: string[];
  scheduleRules: ScheduleRule[];
  closedWeekdays: number[];
  manualConfirmationForGroups: boolean;
  manualConfirmationThreshold: number;
  signatureRequiredOnArrival: boolean;
  walkInCafeEnabled: boolean;
  walkInNoticeText: string;
  reservationConditionsText: string;
  guideAcceptanceText: string;
  confirmationEmailText: string;
}

export const settingsSeed: KafeSettings = {
  depositThreshold: 8,
  depositPerPerson: 10,
  defaultCapacity: 12,
  slotDurationMinutes: 90,
  slots: ["09:30", "10:30", "11:30", "13:30", "14:30", "15:30", "16:30"],
  scheduleRules: [
    {
      id: "rule-standard",
      label: "Semaine type",
      weekdays: [2, 3, 4, 5, 6, 0],
      startTime: "09:30",
      endTime: "18:00",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
    },
  ],
  closedWeekdays: [1],
  manualConfirmationForGroups: true,
  manualConfirmationThreshold: 8,
  signatureRequiredOnArrival: true,
  walkInCafeEnabled: true,
  walkInNoticeText:
    "Pas besoin de réserver pour boire un café, manger un bagel ou bruncher. Pour peindre, l'atelier se fait avec une consommation sur place et les personnes ayant réservé sont prioritaires.",
  reservationConditionsText:
    "Pour toute annulation, retard ou modification, merci de prévenir le Kafé dès que possible. Les règles définitives seront précisées par Mala Madre.",
  guideAcceptanceText:
    "J'ai pris connaissance des informations importantes de l'atelier et je m'engage à respecter le guide transmis par le Kafé Céramik.",
  confirmationEmailText:
    "Votre réservation est enregistrée. Le guide et les informations pratiques vous seront envoyés avant votre venue.",
};

export function useCeramicObjects() {
  return useStoredList<CeramicObject>("kafe-ceramik-objects", ceramicObjectsSeed, {
    table: "kafe_ceramic_objects",
  });
}

export function useContentDocuments() {
  return useStoredList<ContentDocument>("kafe-ceramik-documents", contentDocumentsSeed, {
    table: "kafe_content_documents",
  });
}

export function useWaiverSignatures() {
  return useStoredList<WaiverSignature>("kafe-ceramik-waiver-signatures", waiverSignaturesSeed, {
    table: "kafe_waiver_signatures",
    authLoad: true,
    hasSortOrder: false,
    toRow: (signature) => ({
      id: signature.id,
      value: signature,
      updated_at: new Date().toISOString(),
    }),
  });
}

export function useKafeSettings() {
  const [settings, setSettings] = useState<KafeSettings>(() =>
    typeof window === "undefined" ? settingsSeed : settingsSeed,
  );

  useEffect(() => {
    let alive = true;
    const update = () => setSettings(readStore("kafe-ceramik-settings", settingsSeed));
    update();
    const unsubscribe = subscribe("kafe-ceramik-settings", update);

    if (isSupabaseConfigured()) {
      selectRows<{ id: string; value: KafeSettings }>(
        "kafe_settings",
        "?id=eq.main&select=id,value&limit=1",
      )
        .then((rows) => {
          if (!alive || !rows[0]?.value) return;
          const next = { ...settingsSeed, ...rows[0].value };
          writeStore("kafe-ceramik-settings", next);
          setSettings(next);
        })
        .catch((error) => {
          console.warn("Remote settings load skipped:", error);
        });
    }

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const save = (next: KafeSettings) => {
    writeStore("kafe-ceramik-settings", next);
    if (isSupabaseConfigured()) {
      upsertRows(
        "kafe_settings",
        [{ id: "main", value: next, updated_at: new Date().toISOString() }],
        true,
      ).catch((error) => {
        console.warn("Remote settings save skipped:", error);
      });
    }
  };
  return [settings, save] as const;
}
